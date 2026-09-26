// Each location's description/exits can be a plain value or a function
// of `flags` (an object of booleans keyed by spell id — true once that
// spell has ever been cast by this wizard). Movement (PUT /location)
// works even before any spell is known; it is not itself spell-gated,
// only the exits it can reach are.

module.exports = {
  town_square: {
    name: 'Town Square',
    description:
      "Frozen mid-gesture, mid-breath. Nobody here is a statue, exactly " +
      "— they simply stopped, the way a held note stops, and nothing " +
      "in sight so much as flinches when you move past it. A baker " +
      "stands with dough hanging in the air. A child hangs mid-leap " +
      "over a puddle. An old woman sits over her knitting. All three " +
      "can still speak, if you're willing to listen to people who " +
      "can't do anything else.",
    exits: { south: 'riverbank' }
  },

  riverbank: {
    name: 'Riverbank',
    description: (flags) =>
      flags.flow
        ? "The river runs hard and full, the fisherman's boat straining " +
          'at its rope.'
        : 'A dry riverbed. A man sits in a boat that has nothing to float on.',
    exits: (flags) =>
      flags.flow
        ? { north: 'town_square', downstream: 'city' }
        : { north: 'town_square' }
  },

  city: {
    name: 'The City',
    description: (flags) =>
      !flags.debug
        ? "Roaches, wrong-sized, spill from every doorway faster than " +
          "anything should move."
        : 'The streets are quiet now. The wounded are finally visible.',
    exits: (flags) => (flags.grow ? { climb: 'castle_base' } : {})
  },

  castle_base: {
    name: 'Foot of the Vine',
    description:
      'A vine, thick enough to bear weight, disappears up into cloud.',
    exits: { down: 'city', climb: 'sky_castle' }
  },

  sky_castle: {
    name: "Grip's Sky Castle",
    description: (flags) =>
      flags.push
        ? 'The portal is sealed. Grip is gone. Only quiet remains.'
        : 'Grip waits, unhurried, entirely too pleased to see you.',
    exits: { down: 'castle_base' }
  }
};
