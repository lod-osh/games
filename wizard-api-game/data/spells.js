// The critical-path spell chain. Each spell's prerequisite must be
// KNOWN (not necessarily cast) for the spell to become visible.
// study_time_seconds is real wall-clock time. cooldown_seconds is null
// for one-shot spells, which can never be cast a second time even if
// forgotten and relearned (see cast_log check in routes/spells.js).

module.exports = {
  flow: {
    id: 'flow',
    name: 'Flow',
    description:
      "A river does not ask the ground's permission to move. It simply " +
      'does, and the ground remembers the shape of moving water long ' +
      'after the water is gone.',
    prerequisite: null,
    study_time_seconds: 300,
    one_shot: false,
    cooldown_seconds: 30,
    effect:
      'The riverbed drinks something invisible and gives it back as ' +
      "motion — water where there wasn't any, moving hard enough to " +
      'remember what it used to be.'
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    description:
      'To still a thing mid-motion is not to end it. It is a held ' +
      'breath, nothing more, and held breath always runs out.',
    prerequisite: 'flow',
    study_time_seconds: 600,
    one_shot: false,
    cooldown_seconds: 60,
    effect:
      "The roaches still, every leg caught mid-motion — the same way " +
      'the town itself was stilled, in miniature, in your own hands.'
  },
  debug: {
    id: 'debug',
    name: 'Debug',
    description:
      'Some things were never supposed to be here at all. Removing ' +
      'them is not violence — it is correction.',
    prerequisite: 'calm',
    study_time_seconds: 900,
    one_shot: false,
    cooldown_seconds: 120,
    effect: "The roaches are gone. Actually gone — not stilled, not paused."
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    description:
      'The least remarkable of your miracles, and the most human one.',
    prerequisite: 'debug',
    study_time_seconds: 1200,
    one_shot: false,
    cooldown_seconds: 60,
    effect: "Someone is standing who wasn't a moment ago."
  },
  grow: {
    id: 'grow',
    name: 'Grow',
    description:
      "What's planted only needs telling once. Asking twice wouldn't " +
      'make it grow any further — it would only be asking.',
    prerequisite: 'heal',
    study_time_seconds: 1800,
    one_shot: true,
    cooldown_seconds: null,
    effect:
      'A vine climbs faster than anything living should, thick enough ' +
      'to bear weight, up toward wherever the castle sits above the ' +
      'clouds.'
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description:
      "The obvious answer to a sorcerer. That's exactly the problem " +
      'with it.',
    prerequisite: 'grow',
    study_time_seconds: 2700,
    one_shot: false,
    cooldown_seconds: 180,
    effect:
      "Grip doesn't dodge. He barely moves — a flick of attention, and " +
      'the fire folds back on itself and goes out mid-air, like it ' +
      'forgot what it was for.'
  },
  push: {
    id: 'push',
    name: 'Push',
    description:
      "Not force. Just the smallest true statement about where someone's " +
      "weight already isn't.",
    prerequisite: 'fireball',
    study_time_seconds: 3600,
    one_shot: true,
    cooldown_seconds: null,
    effect:
      'Grip goes back, off his own center, into the void his own ' +
      'portal opened — and the portal folds shut behind him, sealed by ' +
      'the one thing he never accounted for.'
  },
  thaw: {
    id: 'thaw',
    name: 'Thaw',
    description:
      'What is forgotten does not return by asking again. What is only ' +
      'frozen does.',
    prerequisite: 'push',
    study_time_seconds: 5400,
    one_shot: true,
    cooldown_seconds: null,
    effect:
      'The stillness breaks — not violently, just all at once, like ice ' +
      'giving way to the water it forgot it was.'
  }
};
