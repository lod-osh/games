const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const spells = require('../data/spells');
const { getKnownSet, logEvent } = require('../state');

const router = express.Router();

const insertWizard = db.prepare(
  'INSERT INTO wizards (id, name, api_key, location_id, created_at) VALUES (?, ?, ?, ?, ?)'
);
const updateFocus = db.prepare('UPDATE wizards SET focus_spell_id = ? WHERE id = ?');
const getEvents = db.prepare('SELECT timestamp, event FROM events WHERE wizard_id = ? ORDER BY timestamp ASC');

// POST /wizard — no auth required. Permanent key, no recovery.
router.post('/wizard', (req, res) => {
  const name = (req.body && req.body.name || '').trim();
  if (!name || name.length < 2 || name.length > 32) {
    return res.status(400).json({ error: 'name must be 2-32 characters' });
  }

  const id = crypto.randomUUID();
  const apiKey = 'sk_wiz_' + crypto.randomBytes(24).toString('hex');
  const createdAt = new Date().toISOString();

  insertWizard.run(id, name, apiKey, 'town_square', createdAt);
  logEvent(id, `${name} woke with no memory of how they got here.`);

  res.status(201).json({ id, name, api_key: apiKey });
});

// GET /wizard — your own stats
router.get('/wizard', (req, res) => {
  const wizard = req.wizard;
  const known = getKnownSet(wizard.id);
  res.json({
    id: wizard.id,
    name: wizard.name,
    focus: wizard.focus_spell_id || null,
    spells_known: Array.from(known),
    spells_known_count: known.size,
    spells_known_capacity: 6
  });
});

// PUT /wizard/focus — idempotent
router.put('/wizard/focus', (req, res) => {
  const spellId = req.body && req.body.spell_id;
  if (!spellId || !spells[spellId]) {
    return res.status(404).json({ error: 'not_found' });
  }
  updateFocus.run(spellId, req.wizard.id);
  const known = getKnownSet(req.wizard.id);
  res.json({
    id: req.wizard.id,
    name: req.wizard.name,
    focus: spellId,
    spells_known: Array.from(known),
    spells_known_count: known.size,
    spells_known_capacity: 6
  });
});

// GET /wizard/log
router.get('/wizard/log', (req, res) => {
  const rows = getEvents.all(req.wizard.id);
  res.json(rows.map((r) => ({ timestamp: r.timestamp, event: r.event })));
});

module.exports = router;
