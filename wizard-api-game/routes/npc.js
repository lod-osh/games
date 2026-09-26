const express = require('express');
const db = require('../db');
const npcs = require('../data/npcs');
const { getKnownSet, hasCastFactory, logEvent } = require('../state');

const router = express.Router();

const getTalkLog = db.prepare('SELECT turns FROM talk_log WHERE wizard_id = ? AND npc_id = ?');
const insertTalkLog = db.prepare('INSERT INTO talk_log (wizard_id, npc_id, turns) VALUES (?, ?, 1)');
const bumpTalkLog = db.prepare('UPDATE talk_log SET turns = turns + 1 WHERE wizard_id = ? AND npc_id = ?');

// POST /npc/{id}/talk — non-idempotent: every call is a new turn.
router.post('/npc/:id/talk', (req, res) => {
  const npc = npcs[req.params.id];
  if (!npc || npc.location !== req.wizard.location_id) {
    return res.status(404).json({ error: 'not_found' });
  }

  const ctx = {
    known: getKnownSet(req.wizard.id),
    hasCast: hasCastFactory(req.wizard.id),
    turnCount: 0
  };

  if (npc.isPresent && !npc.isPresent(ctx)) {
    return res.status(404).json({ error: 'not_found' });
  }

  const existing = getTalkLog.get(req.wizard.id, req.params.id);
  ctx.turnCount = existing ? existing.turns : 0;

  const line = npc.getLine(ctx);

  if (existing) {
    bumpTalkLog.run(req.wizard.id, req.params.id);
  } else {
    insertTalkLog.run(req.wizard.id, req.params.id);
  }

  logEvent(req.wizard.id, `Talked to ${req.params.id}.`);
  res.json({ npc_id: req.params.id, line });
});

module.exports = router;
