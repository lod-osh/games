# Wizard API Game — Server

A text RPG played entirely through HTTP requests. See `openapi.yaml`
(from the design doc) for the full endpoint reference.

## Setup

Requires Node.js 18 or later.

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Set `PORT`
to change it:

```bash
PORT=4000 npm start
```

## Browsing the API

Open `http://localhost:3000/docs` in a browser for a full interactive
reference — every endpoint, method, request/response shape, and what
each status code means. No API key required to view it.

A SQLite database file (`game.db`) is created automatically in this
folder on first run — that's where wizards, known spells, and study
progress live. Delete it to reset the whole game world.

## Playing on your phone

1. Start the server on a computer.
2. Find that computer's local network address (e.g. `192.168.1.23`) —
   on Mac/Linux, `ifconfig` or `ip addr`; on Windows, `ipconfig`.
3. Open `wizard-client.html` in your phone's browser (same Wi-Fi
   network), and set the server url to `http://<that address>:3000`.
4. Tap "Create new wizard" to begin.

CORS is enabled on the server, so the client works from any origin,
including a plain local HTML file.

## The critical path

Flow → Calm → Debug → Heal → Grow → Fireball → Push → Thaw.

Calm and Fireball are meant to be forgotten (`DELETE /spells/{id}`)
once they've served their purpose, freeing capacity for what comes
later — the game doesn't force this, but you'll hit `403
capacity_full` on `study` if you try to learn Thaw while still
holding a full six spells.

## What's here vs. what isn't

Implemented: full spell chain, prerequisite-gated visibility (full
omission), study timers with conditional GET (`ETag` /
`If-None-Match`), one-shot spell enforcement (`409 already_cast`,
persists even if forgotten and relearned), cooldowns (`429` with
`Retry-After`), study locking (`423` with `Retry-After`), the frozen
town / city / castle location graph, and dialogue for the fisherman,
the city villager, Grip, and the post-Fireball hint.

Not implemented / left as future work: deployment (this runs locally
only), additional NPCs or locations beyond the critical path, and any
persistent "world moves without you" background events — the event
log only records the player's own actions.
