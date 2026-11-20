// Catur Petang service worker: keeps the app and Stockfish cached so it opens offline.
// Maia's files (about 45 MB) are cached the first time Maia is used, not at install.
var CACHE = 'catur-petang-v3';
var FONTS = 'catur-petang-fonts-v1';
var CORE = [
  './',
  'index.html',
  'chess.js',
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
  'stockfish.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE && k !== FONTS; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin){
    // The page: answer from cache straight away, refresh the cached copy in the background.
    if (req.mode === 'navigate'){
      e.respondWith(caches.open(CACHE).then(function(c){
        return c.match('index.html').then(function(hit){
          var fresh = fetch(req).then(function(r){ if (r.ok) c.put('index.html', r.clone()); return r; }).catch(function(){ return hit; });
          if (hit){ try { e.waitUntil(fresh); } catch(_){} return hit; }
          return fresh;
        });
      }));
      return;
    }
    // Everything else (engine, chess rules, icons): cache first.
    e.respondWith(caches.match(req, {ignoreSearch:true}).then(function(hit){
      return hit || fetch(req).then(function(r){
        if (r.ok){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return r;
      });
    }));
    return;
  }

  // Google Fonts: keep a copy so the type still looks right offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(function(c){
      return c.match(req).then(function(hit){
        return hit || fetch(req).then(function(r){ if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; });
      });
    }));
  }
});
