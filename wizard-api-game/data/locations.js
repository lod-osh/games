// Each location's description/exits can be a plain value or a function
// of `flags` (an object of booleans keyed by spell id — true once that
// spell has ever been cast by this wizard). Movement (PUT /location)
// works even before any spell is known; it is not itself spell-gated,
// only the exits it can reach are.

module.exports = {
  town_square: {
    name: 'Town Square',
    description:
      "This place seems like it should be your home, but it's unfamiliar. " +
      " The townspeople appear to be frozen in place. " +
      "It's as if their feet are cemented to the ground. A baker " +
      "stands halfway in the doorway of his bakery. A child is holding a jump rope, stationary. " +
      "An old woman sits over her knitting. All three " +
      "take notice of you." +
      "can't do anything else.",
    exits: { south: 'riverbank' }
  },

  riverbank: {
    name: 'Riverbank',
    description: (flags) =>
      flags.flow
        ? "The river runs hard and full, the fisherman's boat finall afloat.'
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
        ? "Giant roaches are crawling every surface."
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
        : 'Grip waits, unhurried, a smile twisting on his face.',
    exits: { down: 'castle_base' }
  }
};
