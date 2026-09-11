// Bump CACHE_VERSION whenever index.html or any asset changes so clients pick up the update.
const CACHE_VERSION = 'turfwar-v6-95-135-assets4';

// Core shell — must all be present or the app can't boot offline.
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
];

// Images live at repo root; sounds live in /sounds (matches SFX_PATH in-game).
// All sounds are .mp3 (wavs were converted to shrink repo size).
// Precached best-effort so a fresh install works fully offline. Filenames
// must exactly match the case of the files in the repo (GitHub Pages is
// case-sensitive, unlike most desktop filesystems).
const IMAGE_ASSETS = [
  './University.png',
  './aiden.png',
  './airport.png',
  './arthur.png',
  './auntiewu.jpg',
  './blackjackdealer.png',
  './breakroom.jpg',
  './bribe_success.png',
  './burglary_spotted.png',
  './burglary_success.png',
  './casino.png',
  './cemetery.png',
  './chet.jpg',
  './chinatown.png',
  './communitycenter.png',
  './contractboard.jpg',
  './crashclub.jpg',
  './crew.jpg',
  './crossfaders.jpg',
  './declan.png',
  './diner.jpg',
  './docks.png',
  './downtown.png',
  './fanta.jpg',
  './financial.png',
  './foodcourt.png',
  './franklin.png',
  './gameover.png',
  './gibson.jpg',
  './gino.jpg',
  './giorgi.png',
  './goblins.jpg',
  './goths.jpg',
  './gus.png',
  './hammer.png',
  './hideout.png',
  './hideout_level1.jpg',
  './hideout_level2.jpg',
  './hideout_level3.jpg',
  './hideout_level4.jpg',
  './hideout_level5.jpg',
  './hitman.png',
  './industrial.png',
  './informant.jpg',
  './ironsidefirearms.jpg',
  './isla.png',
  './jason.png',
  './kipling.png',
  './laylow.jpg',
  './lenny.jpg',
  './lezli.jpg',
  './library.jpg',
  './link.jpg',
  './location.jpg',
  './lorelei.jpg',
  './mall.png',
  './mallkids.jpg',
  './mausoleum.jpg',
  './mei.jpg',
  './memorial.png',
  './metroburger.jpg',
  './moe.jpg',
  './motelclerk.jpg',
  './murphy.png',
  './nigel.png',
  './oldtown.png',
  './omnicorphq.jpg',
  './omnimart.jpg',
  './omnimartclinic.jpg',
  './opie.jpg',
  './oscar.png',
  './pokerdealer.jpg',
  './priya.jpg',
  './projects.png',
  './redlight.png',
  './rocco.jpg',
  './route.jpg',
  './sacredskin.jpg',
  './sharpe.jpg',
  './siege.png',
  './siege_victory.png',
  './silverspoon.png',
  './slate.png',
  './stabby.png',
  './stadium.png',
  './sterling.jpg',
  './suburbs.png',
  './tammy.png',
  './techpark.png',
  './techshop2.jpg',
  './terminal.png',
  './terrance.png',
  './theo.png',
  './trainyard.png',
  './trevor.jpg',
  './vacantbuilding.png',
  './vaultjewelers.jpg',
  './waterfront.png',
  './xandrick.png'
];

const SOUND_ASSETS = [
  './sounds/AIRPORT.mp3',
  './sounds/CASINO.mp3',
  './sounds/CEMETERY.mp3',
  './sounds/CHINATOWN.mp3',
  './sounds/DOCKS.mp3',
  './sounds/DOWNTOWN.mp3',
  './sounds/FINANCIAL.mp3',
  './sounds/INDUSTRIAL.mp3',
  './sounds/MALL.mp3',
  './sounds/OLDTOWN.mp3',
  './sounds/PROJECTS.mp3',
  './sounds/REDLIGHT.mp3',
  './sounds/STADIUM.mp3',
  './sounds/SUBURBS.mp3',
  './sounds/TECHPARK.mp3',
  './sounds/TRAINYARD.mp3',
  './sounds/UNIVERSITY.mp3',
  './sounds/WATERFRONT.mp3',
  './sounds/WasntMeanttoBe.mp3',
  './sounds/background-music1.mp3',
  './sounds/breep.mp3',
  './sounds/crashclub.mp3',
  './sounds/deal.mp3',
  './sounds/death.mp3',
  './sounds/dialog.mp3',
  './sounds/door.mp3',
  './sounds/drone.mp3',
  './sounds/engage-hit-sound1.mp3',
  './sounds/engage-hit-sound2.mp3',
  './sounds/engage-hit-sound3.mp3',
  './sounds/equip.mp3',
  './sounds/gameover.mp3',
  './sounds/goblins.mp3',
  './sounds/gunslide.mp3',
  './sounds/happyclick.mp3',
  './sounds/heal.mp3',
  './sounds/hurt.mp3',
  './sounds/mechdoor.mp3',
  './sounds/nailgun.mp3',
  './sounds/phew.mp3',
  './sounds/pistolShoot.mp3',
  './sounds/player_hurt.mp3',
  './sounds/pow.mp3',
  './sounds/rain.mp3',
  './sounds/reload-sound.mp3',
  './sounds/respite.mp3',
  './sounds/rifleShoot.mp3',
  './sounds/scan.mp3',
  './sounds/shotgun-sound.mp3',
  './sounds/sidewalk.mp3',
  './sounds/smgShoot.mp3',
  './sounds/steps.mp3',
  './sounds/takeover.mp3',
  './sounds/taxi.mp3',
  './sounds/tiny_beep.mp3',
  './sounds/upgrade.mp3',
  './sounds/victory-sound.mp3'
];

const MEDIA_ASSETS = [...IMAGE_ASSETS, ...SOUND_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(SHELL_ASSETS);
      const results = await Promise.allSettled(
        MEDIA_ASSETS.map((url) => cache.add(url))
      );
      const failed = results
        .map((r, i) => (r.status === 'rejected' ? MEDIA_ASSETS[i] : null))
        .filter(Boolean);
      if (failed.length) {
        console.warn('SW: failed to precache (check filename/case/folder):', failed);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for everything so you get the latest version when online;
// falls back to the cached copy when offline (images/sounds included).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
