const express = require('express');
const db = require('../db');
const locations = require('../data/locations');
const { getFlags, logEvent } = require('../state');

const router = express.Router();

const updateLocation = db.prepare('UPDATE wizards SET location_id = ? WHERE id = ?');

function resolve(value, flags) {
  return typeof value === 'function' ? value(flags) : value;
}

function describeLocation(locationId, flags) {
  const loc = locations[locationId];
  return {
    name: loc.name,
    description: resolve(loc.description, flags),
    exits: Object.keys(resolve(loc.exits, flags) || {})
  };
}

// GET /location — read-only, safe to repeat
router.get('/location', (req, res) => {
  const flags = getFlags(req.wizard.id);
  res.json(describeLocation(req.wizard.location_id, flags));
});

// PUT /location — idempotent: declaring where you stand, repeatedly,
// leaves you in exactly one place.
router.put('/location', (req, res) => {
  const to = req.body && req.body.to;
  if (!to) {
    return res.status(400).json({ error: 'missing "to" direction' });
  }

  const flags = getFlags(req.wizard.id);
  const loc = locations[req.wizard.location_id];
  const exits = resolve(loc.exits, flags) || {};
  const destination = exits[to];

  if (!destination) {
    return res.status(400).json({ error: "there's no going that way from here" });
  }

  updateLocation.run(destination, req.wizard.id);
  logEvent(req.wizard.id, `Moved ${to} to ${locations[destination].name}.`);

  const newFlags = getFlags(req.wizard.id);
  res.json(describeLocation(destination, newFlags));
});

module.exports = router;
