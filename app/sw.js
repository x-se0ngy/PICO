// PICO 앱 서비스워커 — 홈 화면에 설치하고, 한 번 연 화면은 인터넷이 없어도 열려요 (전시장 와이파이 대비).
// 화면(html)은 새 버전을 먼저 받아 보고, 안 되면 저장해 둔 것을 보여줘요. 그림·폰트는 저장해 둔 것을 먼저 써요.
var CACHE = 'pico-app-v10';
var CORE = ['splash.html', 'home.html', 'base.css', 'shared.js', 'photo.js', 'stickers.js', 'field.js',
  'fonts/HakgyoansimAllimjangTTF-R.woff2', 'fonts/HakgyoansimAllimjangTTF-B.woff2', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('pico-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var isPage = req.mode === 'navigate' || /\.(html|js|css)$/.test(new URL(req.url).pathname);
  if (isPage) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
  } else {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
