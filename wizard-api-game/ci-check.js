#!/usr/bin/env node
// Lightweight CI check for the wizard API game.
//
// This exists because real bugs already reached `main` once:
//   1. Syntax errors in data/locations.js and data/npcs.js (mismatched
//      quotes, missing commas) that would have crashed the server on
//      its next restart.
//   2. A better-sqlite3 version that didn't have a prebuilt binary for
//      the Node version Render actually runs, causing an intermittent
//      native crash — something no amount of static syntax checking
//      would ever catch.
//
// So this check does three things, in order of how much it actually
// proves: syntax-check every file, validate the OpenAPI spec parses,
// then actually boot the real server and hit its real endpoints.

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

let failed = false;
function fail(msg) {
  console.error('FAIL: ' + msg);
  failed = true;
}
function pass(msg) {
  console.log('PASS: ' + msg);
}

function findJsFiles(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findJsFiles(full, out);
    else if (entry.name.endsWith('.js') && entry.name !== 'ci-check.js') out.push(full);
  }
  return out;
}

function checkSyntax() {
  const jsFiles = findJsFiles(__dirname);
  for (const file of jsFiles) {
    try {
      execSync('node --check "' + file + '"', { stdio: 'pipe' });
      pass('syntax OK: ' + path.relative(__dirname, file));
    } catch (e) {
      fail('syntax error in ' + path.relative(__dirname, file) + ':\n' + e.stderr.toString());
    }
  }
}

function checkOpenApiSpec() {
  try {
    const yaml = require('js-yaml');
    const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      fail('openapi.yaml parsed but has no paths defined');
    } else {
      pass('openapi.yaml parses (' + Object.keys(spec.paths).length + ' paths)');
    }
  } catch (e) {
    fail('openapi.yaml failed to parse: ' + e.message);
  }
}

function httpGet(port, pathName) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: port, path: pathName }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body: body }));
    }).on('error', reject);
  });
}

function httpPost(port, pathName, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        host: 'localhost', port: port, path: pathName, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve({ status: res.statusCode, body: body }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function smokeTest() {
  return new Promise((resolve) => {
    const PORT = 4123;
    const server = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: Object.assign({}, process.env, { PORT: String(PORT), TRAIN_TIME_SCALE: '0.01' }),
      stdio: 'pipe'
    });

    let serverOutput = '';
    server.stdout.on('data', (d) => (serverOutput += d));
    server.stderr.on('data', (d) => (serverOutput += d));

    let exited = false;
    server.on('exit', () => { exited = true; });

    setTimeout(async () => {
      if (exited) {
        fail('server crashed on startup:\n' + serverOutput);
        resolve();
        return;
      }
      pass('server started without crashing');

      try {
        const root = await httpGet(PORT, '/');
        if (root.status === 200) pass('GET / returns 200');
        else fail('GET / returned ' + root.status);

        const docs = await httpGet(PORT, '/docs/');
        if (docs.status === 200) pass('GET /docs/ returns 200');
        else fail('GET /docs/ returned ' + docs.status);

        const created = await httpPost(PORT, '/wizard', { name: 'CiSmokeTest' });
        let parsedBody = null;
        try { parsedBody = JSON.parse(created.body); } catch (e) { /* leave null */ }
        if (created.status === 201 && parsedBody && parsedBody.api_key) {
          pass('POST /wizard creates a wizard and returns an api_key');
        } else {
          fail('POST /wizard returned ' + created.status + ': ' + created.body);
        }

        if (parsedBody && parsedBody.api_key) {
          const stats = await httpGet(PORT, '/wizard');
          // Deliberately unauthenticated — should be 401, proving auth
          // middleware is actually wired up, not just present in source.
          if (stats.status === 401) pass('GET /wizard without a key correctly returns 401');
          else fail('GET /wizard without a key returned ' + stats.status + ' (expected 401)');
        }
      } catch (e) {
        fail('smoke test request failed: ' + e.message);
      }

      server.kill();
      resolve();
    }, 2000);
  });
}

(async () => {
  checkSyntax();
  checkOpenApiSpec();
  await smokeTest();

  console.log('');
  if (failed) {
    console.error('CI CHECK FAILED');
    process.exit(1);
  } else {
    console.log('CI CHECK PASSED');
    process.exit(0);
  }
})();
