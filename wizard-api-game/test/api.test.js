// Automated tests for the wizard game's core state machine: spell
// prerequisites, one-shot enforcement, cooldowns, conditional GET,
// and study locking. Uses Node's built-in test runner and fetch, so
// no extra dependencies are needed.
//
// Run with: npm run test:suite
//
// This spawns the real server (not a mock) against an isolated
// in-memory database, with STUDY_TIME_SCALE compressing the real
// 5-90 minute study/cooldown durations down to a few seconds so the
// suite finishes quickly without lying about what's being tested.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
// 300s (the shortest real study time, for "flow") becomes 3s.
const SCALE = 0.01;

let serverProcess;

before(async () => {
  serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      DB_PATH: ':memory:',
      STUDY_TIME_SCALE: String(SCALE)
    }),
    stdio: 'pipe'
  });

  let output = '';
  serverProcess.stdout.on('data', (d) => (output += d));
  serverProcess.stderr.on('data', (d) => (output += d));

  // Poll until the server actually responds, rather than a fixed sleep.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return;
    } catch (e) {
      // not up yet
    }
    await sleep(100);
  }
  throw new Error('Server did not start in time:\n' + output);
});

after(() => {
  if (serverProcess) serverProcess.kill();
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createWizard(name) {
  const res = await fetch(BASE + '/wizard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || ('Test' + Math.random().toString(36).slice(2, 8)) })
  });
  const data = await res.json();
  return data.api_key;
}

function authed(apiKey) {
  return { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
}

// --- Auth ---

test('protected route without a key returns 401', async () => {
  const res = await fetch(BASE + '/wizard');
  assert.equal(res.status, 401);
});

test('protected route with a bogus key returns 401', async () => {
  const res = await fetch(BASE + '/wizard', { headers: { Authorization: 'Bearer not_a_real_key' } });
  assert.equal(res.status, 401);
});

test('creating a wizard with too short a name returns 400', async () => {
  const res = await fetch(BASE + '/wizard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A' })
  });
  assert.equal(res.status, 400);
});

// --- Prerequisite-gated visibility ---

test('a fresh wizard sees only the no-prerequisite starting spell', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells', { headers: authed(key) });
  const spells = await res.json();
  assert.equal(spells.length, 1);
  assert.equal(spells[0].id, 'flow');
  assert.equal(spells[0].known, false);
});

test('a spell whose prerequisite is not yet known is fully omitted, not shown as locked', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells', { headers: authed(key) });
  const spells = await res.json();
  const ids = spells.map((s) => s.id);
  assert.ok(!ids.includes('calm'), 'calm requires flow to be known first, and should not appear at all yet');
});

test('GET /spells/{id} on a not-yet-visible spell returns 404, same as a nonexistent one', async () => {
  const key = await createWizard();
  const hiddenRes = await fetch(BASE + '/spells/calm', { headers: authed(key) });
  const fakeRes = await fetch(BASE + '/spells/not_a_real_spell', { headers: authed(key) });
  assert.equal(hiddenRes.status, 404);
  assert.equal(fakeRes.status, 404);
  assert.deepEqual(await hiddenRes.json(), await fakeRes.json());
});

// --- Study lifecycle ---

test('studying begins correctly and reports the scaled duration honestly', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, 'studying');
  assert.equal(data.percent_complete, 0);
  // 300 real seconds * 0.01 scale = 3
  assert.equal(data.time_remaining_seconds, 3);
});

test('starting a second, different study while one is in progress returns 423 with Retry-After', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  // calm isn't visible yet either, but flow is already in progress,
  // and the lock check happens before the visibility check.
  const res = await fetch(BASE + '/spells/calm/study', { method: 'POST', headers: authed(key) });
  assert.equal(res.status, 423);
  assert.ok(res.headers.get('retry-after'), 'expected a Retry-After header');
});

test('studying the same spell twice returns 409 already_studying', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  const res = await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  const data = await res.json();
  assert.equal(res.status, 409);
  assert.equal(data.reason, 'already_studying');
});

test('conditional GET returns a 304 when nothing has changed since the given ETag', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });

  const first = await fetch(BASE + '/spells/flow/study', { headers: authed(key) });
  const etag = first.headers.get('etag');
  assert.ok(etag, 'expected an ETag header on the first check');

  const second = await fetch(BASE + '/spells/flow/study', {
    headers: Object.assign({}, authed(key), { 'If-None-Match': etag })
  });
  assert.equal(second.status, 304);
});

test('studying completes after the real (scaled) duration elapses, and the spell becomes known', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });

  // 3 scaled seconds to complete; poll for a bit longer to be safe.
  let completed = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const res = await fetch(BASE + '/spells/flow/study', { headers: authed(key) });
    const data = await res.json();
    if (data.status === 'complete') {
      completed = true;
      break;
    }
  }
  assert.ok(completed, 'expected studying to complete within the expected window');

  const known = await (await fetch(BASE + '/spells/known', { headers: authed(key) })).json();
  assert.ok(known.some((s) => s.id === 'flow'), 'flow should now be in the known spells list');
});

test('once known, the next spell in the chain becomes visible', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const data = await (await fetch(BASE + '/spells/flow/study', { headers: authed(key) })).json();
    if (data.status === 'complete') break;
  }
  const spells = await (await fetch(BASE + '/spells', { headers: authed(key) })).json();
  const ids = spells.map((s) => s.id);
  assert.ok(ids.includes('calm'), 'calm should become visible once flow is known');
});

test('abandoning a study session loses progress; restarting begins again from zero', async () => {
  const key = await createWizard();
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  await sleep(1000);

  const abandonRes = await fetch(BASE + '/spells/flow/study', { method: 'DELETE', headers: authed(key) });
  assert.equal(abandonRes.status, 200);

  const restart = await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  const data = await restart.json();
  assert.equal(data.percent_complete, 0);
});

test('abandoning when nothing is in progress returns 409', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells/flow/study', { method: 'DELETE', headers: authed(key) });
  assert.equal(res.status, 409);
});

// --- Casting ---

test('casting a spell that is not known returns 403', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells/flow/cast', { method: 'POST', headers: authed(key) });
  assert.equal(res.status, 403);
});

async function learnFlow(key) {
  await fetch(BASE + '/spells/flow/study', { method: 'POST', headers: authed(key) });
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const data = await (await fetch(BASE + '/spells/flow/study', { headers: authed(key) })).json();
    if (data.status === 'complete') return;
  }
  throw new Error('flow did not finish studying in time for a cast test');
}

test('casting a repeatable spell twice quickly returns 429 with Retry-After on the second attempt', async () => {
  const key = await createWizard();
  await learnFlow(key);

  const first = await fetch(BASE + '/spells/flow/cast', { method: 'POST', headers: authed(key) });
  assert.equal(first.status, 200);

  const second = await fetch(BASE + '/spells/flow/cast', { method: 'POST', headers: authed(key) });
  assert.equal(second.status, 429);
  assert.ok(second.headers.get('retry-after'), 'expected a Retry-After header on cooldown');
});

test('forgetting a known spell removes it from the known list', async () => {
  const key = await createWizard();
  await learnFlow(key);

  const del = await fetch(BASE + '/spells/flow', { method: 'DELETE', headers: authed(key) });
  assert.equal(del.status, 200);

  const known = await (await fetch(BASE + '/spells/known', { headers: authed(key) })).json();
  assert.ok(!known.some((s) => s.id === 'flow'), 'flow should no longer be known after forgetting it');
});

test('forgetting a spell that is not known returns 404', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/spells/flow', { method: 'DELETE', headers: authed(key) });
  assert.equal(res.status, 404);
});

// --- Location and NPCs ---

test('a fresh wizard starts in Town Square with a south exit', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/location', { headers: authed(key) });
  const data = await res.json();
  assert.equal(data.name, 'Town Square');
  assert.ok(data.exits.includes('south'));
});

test('moving in an invalid direction returns 400', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/location', {
    method: 'PUT',
    headers: authed(key),
    body: JSON.stringify({ to: 'nowhere' })
  });
  assert.equal(res.status, 400);
});

test('moving south reaches the Riverbank', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/location', {
    method: 'PUT',
    headers: authed(key),
    body: JSON.stringify({ to: 'south' })
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.name, 'Riverbank');
});

test('talking to an NPC that is not at your current location returns 404', async () => {
  const key = await createWizard();
  // fisherman is at the riverbank, wizard starts at town_square
  const res = await fetch(BASE + '/npc/fisherman/talk', { method: 'POST', headers: authed(key) });
  assert.equal(res.status, 404);
});

test('talking to an NPC at your current location returns a line', async () => {
  const key = await createWizard();
  const res = await fetch(BASE + '/npc/baker/talk', { method: 'POST', headers: authed(key) });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(typeof data.line, 'string');
  assert.ok(data.line.length > 0);
});
