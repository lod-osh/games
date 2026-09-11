// Bump CACHE_VERSION whenever index.html or any asset changes so clients pick up the update.
const CACHE_VERSION = 'turfwar-v6-95-135-assets2';

// Core shell — must all be present or the app can't boot offline.
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

// Images live at repo root; sounds live in /sounds (matches SFX_PATH in-game).
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
  './sounds/AIRPORT.wav',
  './sounds/CASINO.wav',
  './sounds/CEMETERY.wav',
  './sounds/CHINATOWN.wav',
  './sounds/DOCKS.wav',
  './sounds/DOWNTOWN.wav',
  './sounds/FINANCIAL.wav',
  './sounds/INDUSTRIAL.wav',
  './sounds/MALL.wav',
  './sounds/OLDTOWN.wav',
  './sounds/PROJECTS.wav',
  './sounds/REDLIGHT.wav',
  './sounds/STADIUM.wav',
  './sounds/SUBURBS.wav',
  './sounds/TECHPARK.wav',
  './sounds/TRAINYARD.wav',
  './sounds/UNIVERSITY.wav',
  './sounds/WATERFRONT.wav',
  './sounds/WasntMeanttoBe.wav',
  './sounds/background-music1.mp3',
  './sounds/breep.mp3',
  './sounds/crashclub.wav',
  './sounds/deal.mp3',
  './sounds/death.mp3',
  './sounds/dialog.mp3',
  './sounds/door.mp3',
  './sounds/drone.mp3',
  './sounds/engage-hit-sound1.mp3',
  './sounds/engage-hit-sound2.mp3',
  './sounds/engage-hit-sound3.mp3',
  './sounds/equip.mp3',
  './sounds/gameover.wav',
  './sounds/goblins.wav',
  './sounds/gunslide.wav',
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
  './sounds/respite.wav',
  './sounds/rifleShoot.mp3',
  './sounds/scan.mp3',
  './sounds/shotgun-sound.wav',
  './sounds/sidewalk.wav',
  './sounds/smgShoot.mp3',
  './sounds/steps.mp3',
  './sounds/takeover.wav',
  './sounds/taxi.wav',
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
