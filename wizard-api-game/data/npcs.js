// Each NPC is tied to one location. `isPresent(ctx)` (optional, default
// always true) governs whether talking to them 404s — used for NPCs
// who only exist to talk to once the story has reached a certain
// point (or who are gone after it passes).
//
// ctx passed to isPresent/getLine:
//   known      — Set of spell ids the wizard currently knows
//   hasCast(id) — has this wizard ever cast this spell, ever
//   turnCount  — how many times this wizard has talked to this NPC
//                before this call (0 on the very first talk)

// For NPCs whose lines aren't gated by story state — just a short fixed
// sequence that advances one line per talk, then settles on a last line
// once exhausted. Every call is still a genuinely new turn (per POST's
// non-idempotent contract) even once the lines run out.
function cyclingLines(lines, settledLine) {
  return function getLine(ctx) {
    if (ctx.turnCount < lines.length) return lines[ctx.turnCount];
    return settledLine || lines[lines.length - 1];
  };
}

module.exports = {
  baker: {
    location: 'town_square',
    getLine: cyclingLines(
      [
        "Dough in the air and it's not coming down. I've been mid-toss " +
          "for... well. I don't actually know how long, do I.",
        "You're moving. Nobody moves. I'd ask how, but I have a feeling " +
          "I already know the answer, and I don't like it.",
        'Go on, wizard. Someone in this town ought to be doing something.'
      ],
      "The dough's still up there. So am I, near enough."
    )
  },

  child: {
    location: 'town_square',
    getLine: cyclingLines(
      [
        "I was jumping the puddle. I'm still jumping the puddle. Is " +
          "that funny? I can't tell if that's funny.",
        "Everyone says you're the wizard. You don't look like you " +
          'remember being the wizard.',
        'If you fix this, will I get to land?'
      ],
      'Still up here.'
    )
  },

  old_woman: {
    location: 'town_square',
    getLine: cyclingLines(
      [
        "Sit with me a while, dear — oh. You can't, can you. None of " +
          "us can do anything but talk, and even that's more than most " +
          'nights afford.',
        "Whatever's holding this town, it isn't clumsy. Clumsy things " +
          "break. This hasn't broken. It's just... paused us, like a " +
          'breath held on purpose.',
        "You'll want the river before you want anything else. That " +
          "much I remember, even if I can't remember why."
      ],
      "Go on, dear. I'll be here. I'm not going anywhere — quite " +
        'literally, at the moment.'
    )
  },

  fisherman: {
    location: 'riverbank',
    getLine(ctx) {
      if (ctx.turnCount === 0) {
        return (
          "You're... you're the wizard, aren't you? Something's wrong " +
          "with your eyes. Like you don't recognize any of this.\n\n" +
          'Doesn\'t matter. No time. That wall — wasn\'t there ' +
          "yesterday. River's bone dry underneath it. If you can get " +
          'water moving again, my boat and I can get you under that ' +
          'wall and into the city, where you\'re needed.'
        );
      }
      if (!ctx.known.has('flow')) {
        return (
          "Still nothing? The book in your hands isn't just for " +
          'looking at, you know. Try it on the river.'
        );
      }
      if (!ctx.hasCast('flow')) {
        return "That's it. That's the one. Go on, then — the river won't fill itself.";
      }
      return (
        "There we are. Get in — I'll get you under that wall. " +
        "Whatever's waiting for you on the other side, I hope you're " +
        'ready for it.'
      );
    }
  },

  villager: {
    location: 'city',
    getLine(ctx) {
      if (!ctx.hasCast('debug')) {
        if (!ctx.known.has('calm')) {
          return (
            "Don't get close — they swarm if you startle them. " +
            "There's an old ward for this, something to still them " +
            "before you can... deal with them properly. I don't " +
            "remember the words. You're the wizard, not me."
          );
        }
        if (!ctx.hasCast('calm')) {
          return "You remembered it? Then use it, quickly — before they notice us talking.";
        }
        return (
          "Good — they're not swarming anymore, but they're still " +
          "here. That's not a fix, wizard, that's a pause. There has " +
          'to be something that actually clears them out.'
        );
      }
      if (!ctx.hasCast('heal')) {
        return (
          "They're gone. Actually gone, not just quiet. I don't know " +
          "what you did, but do it everywhere else too, if you can.\n\n" +
          "There's a woman two doors down who hasn't stood since it " +
          "started. If you have something for that too, now's the time."
        );
      }
      return 'Thank you. Truly.';
    }
  },

  castle_echo: {
    location: 'sky_castle',
    isPresent: (ctx) => ctx.hasCast('fireball'),
    getLine(ctx) {
      if (!ctx.hasCast('push')) {
        return (
          'Fire? Against him? He\'s turned worse than fire back on ' +
          'people before now.\n\n' +
          "Funny thing about Grip — man's never had a lick of " +
          "balance. Always did overreach. Don't know why that's the " +
          "thing I remember about him and not his name before yours, " +
          'but there it is.'
        );
      }
      return 'The void has gone quiet. It has nothing left to say either.';
    }
  },

  grip: {
    location: 'sky_castle',
    isPresent: (ctx) => !ctx.hasCast('push'),
    getLine(ctx) {
      if (ctx.turnCount === 0) {
        return (
          "You found the vine, then. Good. I was starting to think " +
          "you'd stay down there being useful to people who can't do " +
          'anything for you.'
        );
      }
      return "Still here? I'd have thought you'd have tried something by now.";
    }
  }
};
