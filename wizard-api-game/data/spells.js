const express = require('express');
const db = require('../db');
const spellData = require('../data/spells');
const { getKnownSet, hasCastFactory, lastCastAt, logEvent } = require('../state');

const router = express.Router();

// Test-only: scales study/cooldown durations so automated tests don't
// have to wait through real 5-90 minute study times. Unset in
// production, so SCALE is always 1 there and behavior is unchanged.
const SCALE = Number(process.env.STUDY_TIME_SCALE) > 0 ? Number(process.env.STUDY_TIME_SCALE) : 1;
function scaledSeconds(seconds) {
  return seconds * SCALE;
}

const insertKnown = db.prepare('INSERT INTO known_spells (wizard_id, spell_id, learned_at) VALUES (?, ?, ?)');
const deleteKnown = db.prepare('DELETE FROM known_spells WHERE wizard_id = ? AND spell_id = ?');
const getSession = db.prepare('SELECT * FROM study_sessions WHERE wizard_id = ?');
const insertSession = db.prepare('INSERT INTO study_sessions (wizard_id, spell_id, started_at) VALUES (?, ?, ?)');
const deleteSession = db.prepare('DELETE FROM study_sessions WHERE wizard_id = ?');
const insertCast = db.prepare('INSERT INTO cast_log (wizard_id, spell_id, cast_at) VALUES (?, ?, ?)');

function knownShape(spell, hasCast) {
  return {
    id: spell.id,
    name: spell.name,
    description: spell.description,
    known: true,
    one_shot: spell.one_shot,
    cooldown_seconds: spell.one_shot ? null : scaledSeconds(spell.cooldown_seconds),
    already_cast: spell.one_shot ? hasCast(spell.id) : undefined
  };
}

function eligibleShape(spell) {
  return {
    id: spell.id,
    name: spell.name,
    description: spell.description,
    known: false,
    study_time_seconds: scaledSeconds(spell.study_time_seconds)
  };
}

function isEligible(spell, known) {
  return !spell.prerequisite || known.has(spell.prerequisite);
}

// GET /spells — known + currently-eligible only. Full omission of
// anything else: not shown as locked, not hinted at.
router.get('/spells', (req, res) => {
  const known = getKnownSet(req.wizard.id);
  const hasCast = hasCastFactory(req.wizard.id);
  const out = [];
  for (const spell of Object.values(spellData)) {
    if (known.has(spell.id)) {
      out.push(knownShape(spell, hasCast));
    } else if (isEligible(spell, known)) {
      out.push(eligibleShape(spell));
    }
  }
  res.json(out);
});

// GET /spells/known
router.get('/spells/known', (req, res) => {
  const known = getKnownSet(req.wizard.id);
  const hasCast = hasCastFactory(req.wizard.id);
  const out = Object.values(spellData)
    .filter((s) => known.has(s.id))
    .map((s) => knownShape(s, hasCast));
  res.json(out);
});

// GET /spells/{id} — 404 for both "doesn't exist" and "not visible",
// deliberately indistinguishable.
router.get('/spells/:id', (req, res) => {
  const spell = spellData[req.params.id];
  const known = getKnownSet(req.wizard.id);
  const hasCast = hasCastFactory(req.wizard.id);

  if (!spell) return res.status(404).json({ error: 'not_found' });

  if (known.has(spell.id)) return res.json(knownShape(spell, hasCast));
  if (isEligible(spell, known)) return res.json(eligibleShape(spell));
  return res.status(404).json({ error: 'not_found' });
});

// DELETE /spells/{id} — forget a known spell. Final.
router.delete('/spells/:id', (req, res) => {
  const known = getKnownSet(req.wizard.id);
  if (!known.has(req.params.id)) {
    return res.status(404).json({ error: 'not_found' });
  }
  deleteKnown.run(req.wizard.id, req.params.id);
  logEvent(req.wizard.id, `Forgot ${req.params.id}.`);
  res.json({ spell_id: req.params.id, forgotten: true });
});

// POST /spells/{id}/study — blocked at start, not completion.
router.post('/spells/:id/study', (req, res) => {
  const spell = spellData[req.params.id];
  if (!spell) return res.status(404).json({ error: 'not_found' });

  const known = getKnownSet(req.wizard.id);
  if (known.has(spell.id)) {
    return res.status(409).json({ error: 'conflict', reason: 'already_known' });
  }

  const session = getSession.get(req.wizard.id);
  if (session && session.spell_id !== spell.id) {
    const elapsedMs = Date.now() - new Date(session.started_at).getTime();
    const totalMs = scaledSeconds(spellData[session.spell_id].study_time_seconds) * 1000;
    const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
    res.set('Retry-After', String(remainingSec));
    return res.status(423).json({ error: 'locked' });
  }
  if (session && session.spell_id === spell.id) {
    return res.status(409).json({ error: 'conflict', reason: 'already_studying' });
  }

  if (!isEligible(spell, known)) {
    return res.status(403).json({ error: 'forbidden', reason: 'prerequisite_unmet' });
  }
  if (known.size >= 6) {
    return res.status(403).json({ error: 'forbidden', reason: 'capacity_full' });
  }

  const startedAt = new Date().toISOString();
  insertSession.run(req.wizard.id, spell.id, startedAt);
  logEvent(req.wizard.id, `Began studying ${spell.id}.`);

  res.json({
    spell_id: spell.id,
    status: 'studying',
    percent_complete: 0,
    time_remaining_seconds: scaledSeconds(spell.study_time_seconds),
    started_at: startedAt
  });
});

// GET /spells/{id}/study — conditional GET support.
router.get('/spells/:id/study', (req, res) => {
  const session = getSession.get(req.wizard.id);
  if (!session || session.spell_id !== req.params.id) {
    return res.status(404).json({ error: 'not_found' });
  }

  const spell = spellData[session.spell_id];
  const elapsedMs = Date.now() - new Date(session.started_at).getTime();
  const totalMs = scaledSeconds(spell.study_time_seconds) * 1000;
  const percent = Math.min(100, Math.floor((elapsedMs / totalMs) * 100));

  if (percent >= 100) {
    const known = getKnownSet(req.wizard.id);
    if (!known.has(spell.id)) {
      insertKnown.run(req.wizard.id, spell.id, new Date().toISOString());
      logEvent(req.wizard.id, `${spell.id} clicked into place.`);
    }
    deleteSession.run(req.wizard.id);
    return res.json({ spell_id: spell.id, status: 'complete' });
  }

  const etag = `"study-${spell.id}-${percent}"`;
  if (req.get('If-None-Match') === etag) {
    return res.status(304).end();
  }

  const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  res.set('ETag', etag);
  res.json({
    spell_id: spell.id,
    status: 'studying',
    percent_complete: percent,
    time_remaining_seconds: remainingSec,
    started_at: session.started_at
  });
});

// DELETE /spells/{id}/study — abandon. Final; progress is not saved.
router.delete('/spells/:id/study', (req, res) => {
  const session = getSession.get(req.wizard.id);
  if (!session || session.spell_id !== req.params.id) {
    return res.status(409).json({ error: 'conflict', reason: 'nothing_in_progress' });
  }
  deleteSession.run(req.wizard.id);
  logEvent(req.wizard.id, `Abandoned studying ${req.params.id}.`);
  res.json({ spell_id: req.params.id, abandoned: true });
});

// POST /spells/{id}/cast
router.post('/spells/:id/cast', (req, res) => {
  const spell = spellData[req.params.id];
  if (!spell) return res.status(404).json({ error: 'not_found' });

  const known = getKnownSet(req.wizard.id);
  if (!known.has(spell.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const hasCast = hasCastFactory(req.wizard.id);

  if (spell.one_shot) {
    if (hasCast(spell.id)) {
      return res.status(409).json({ error: 'conflict', reason: 'already_cast' });
    }
  } else {
    const last = lastCastAt(req.wizard.id, spell.id);
    if (last) {
      const elapsedMs = Date.now() - new Date(last).getTime();
      const cooldownMs = scaledSeconds(spell.cooldown_seconds) * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        res.set('Retry-After', String(remainingSec));
        return res.status(429).json({ error: 'cooldown' });
      }
    }
  }

  insertCast.run(req.wizard.id, spell.id, new Date().toISOString());
  logEvent(req.wizard.id, `Cast ${spell.id}.`);
  res.json({ spell_id: spell.id, effect: spell.effect });
});

module.exports = router;
