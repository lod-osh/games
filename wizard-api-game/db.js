const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'game.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS wizards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    location_id TEXT NOT NULL DEFAULT 'town_square',
    focus_spell_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS known_spells (
    wizard_id TEXT NOT NULL,
    spell_id TEXT NOT NULL,
    learned_at TEXT NOT NULL,
    PRIMARY KEY (wizard_id, spell_id)
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    wizard_id TEXT PRIMARY KEY,
    spell_id TEXT NOT NULL,
    started_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cast_log (
    wizard_id TEXT NOT NULL,
    spell_id TEXT NOT NULL,
    cast_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS talk_log (
    wizard_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    turns INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (wizard_id, npc_id)
  );

  CREATE TABLE IF NOT EXISTS events (
    wizard_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL
  );
`);

module.exports = db;
