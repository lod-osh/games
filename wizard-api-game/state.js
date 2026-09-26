const db = require('./db');
const spells = require('./data/spells');

const getKnownRows = db.prepare('SELECT spell_id FROM known_spells WHERE wizard_id = ?');
const getCastRows = db.prepare('SELECT spell_id, MAX(cast_at) as last_cast FROM cast_log WHERE wizard_id = ? GROUP BY spell_id');
const insertEvent = db.prepare('INSERT INTO events (wizard_id, timestamp, event) VALUES (?, ?, ?)');

function getKnownSet(wizardId) {
  return new Set(getKnownRows.all(wizardId).map((r) => r.spell_id));
}

function getCastMap(wizardId) {
  const map = {};
  for (const row of getCastRows.all(wizardId)) {
    map[row.spell_id] = row.last_cast;
  }
  return map;
}

// { flow: true, calm: false, ... } — has this wizard EVER cast each spell.
function getFlags(wizardId) {
  const castMap = getCastMap(wizardId);
  const flags = {};
  for (const id of Object.keys(spells)) {
    flags[id] = Boolean(castMap[id]);
  }
  return flags;
}

function hasCastFactory(wizardId) {
  const castMap = getCastMap(wizardId);
  return (spellId) => Boolean(castMap[spellId]);
}

function lastCastAt(wizardId, spellId) {
  const row = db
    .prepare('SELECT cast_at FROM cast_log WHERE wizard_id = ? AND spell_id = ? ORDER BY cast_at DESC LIMIT 1')
    .get(wizardId, spellId);
  return row ? row.cast_at : null;
}

function logEvent(wizardId, event) {
  insertEvent.run(wizardId, new Date().toISOString(), event);
}

module.exports = { getKnownSet, getCastMap, getFlags, hasCastFactory, lastCastAt, logEvent };
