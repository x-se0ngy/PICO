// PICO 앱 서비스워커 — 홈 화면에 설치하고, 한 번 연 화면은 인터넷이 없어도 열려요 (전시장 와이파이 대비).
// 화면(html·js·css)은 저장본을 바로 보여 주고 뒤에서 새로 받아 둬요. 그림·폰트도 저장해 둔 것을 먼저 써요. 처음 설치할 때 모든 화면을 미리 받아 둬요.
var CACHE = 'pico-app-v42';
var CORE = ["badge.html", "capture-1.html", "capture-2.html", "capture-3.html", "capture-4.html", "capture-5.html", "capture-card.html", "dogam-detail.html", "dogam.html", "friend.html", "home.html", "index.html", "my.html", "onboard-1.html", "onboard-2.html", "onboard-3.html", "setup-done.html", "setup-explore.html", "setup-grade.html", "setup-name.html", "splash.html", "ai.js", "field.js", "grade.js", "onboard.js", "origami.js", "photo.js", "shared.js", "stickers.js", "base.css", "onboard.css", "fonts/HakgyoansimAllimjangTTF-R.woff2", "fonts/HakgyoansimAllimjangTTF-B.woff2", "fonts/SejongGeulggot.woff", "/favicon.svg", "/icons/icon-192.png"];

self.addEventListener('install', function (e) {
  // 하나가 실패해도 나머지는 다 받아 두게 하나씩
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
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
    // 저장해 둔 화면을 바로 보여 주고(화면 넘길 때 기다림 없이), 뒤에서 새 버전을 받아 다음에 열 때 써요.
    // 새로 배포하면 CACHE 이름이 바뀌어 옛 저장본이 지워지니, 그다음부터는 새 화면이 나와요.
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net.catch(function () { return caches.match(req, { ignoreSearch: true }); });
      });
    }));
  } else {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
