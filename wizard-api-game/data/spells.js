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
      'Restore a current that has slowed or stopped.',
    prerequisite: null,
    study_time_seconds: 300,
    one_shot: false,
    cooldown_seconds: 30,
    effect:
      'The riverbed drinks deeply once again.'
  },

  calm: {
    id: 'calm',
    name: 'Calm',
    description:
      'To relax a panicked creature.',
    prerequisite: 'flow',
    study_time_seconds: 600,
    one_shot: false,
    cooldown_seconds: 60,
    effect:
      'The roaches slow, then stop as their feet are frozen.' +
      ' They look angry.'
  },

  debug: {
    id: 'debug',
    name: 'Debug',
    description:
      'Clean things up so they look and work better.',
    prerequisite: 'calm',
    study_time_seconds: 900,
    one_shot: false,
    cooldown_seconds: 120,
    effect:
      'The roaches evaporate into nothingness with a thousand screeching hisses.'
  },

  heal: {
    id: 'heal',
    name: 'Heal',
    description:
      'You might not be able to raise the dead, but you can help.',
    prerequisite: 'debug',
    study_time_seconds: 1200,
    one_shot: false,
    cooldown_seconds: 60,
    effect:
      'The villager stands, health restored!'
  },

  grow: {
    id: 'grow',
    name: 'Grow',
    description:
      'Hasten and amplify the life of a deserving plant.',
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
      'Cast an orb of flame at an enemy.',
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
      'A tiny shove.',
    prerequisite: 'fireball',
    study_time_seconds: 3600,
    one_shot: true,
    cooldown_seconds: null,
    effect:
      'Grip flies off balance and tumbles into the void. ' +
      'The portal closes, swallowing him up ' +
      'and leaving nothing behind.'
  },

  thaw: {
    id: 'thaw',
    name: 'Thaw',
    description:
      'Unfreeze what is stuck.',
    prerequisite: 'push',
    study_time_seconds: 5400,
    one_shot: true,
    cooldown_seconds: null,
    effect:
      "Slowly, the villagers' legs start to move again " +
      'until they are dancing and cheering your name!'
  }
};
