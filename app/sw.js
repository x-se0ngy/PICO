// PICO 앱 서비스워커 — 홈 화면에 설치하고, 한 번 연 화면은 인터넷이 없어도 열려요 (전시장 와이파이 대비).
// 화면(html·js·css)은 인터넷이 되면 새로 받아 오고(느리거나 끊기면 저장본), 그림·폰트는 저장해 둔 것을 먼저 써요. 처음 설치할 때 모든 화면을 미리 받아 둬요.
var CACHE = 'pico-app-v95';
var CORE = ["badge.html", "capture-1.html", "capture-2.html", "capture-3.html", "capture-4.html", "capture-5.html", "capture-card.html", "dogam-detail.html", "dogam.html", "friend.html", "friends.html", "friend-field.html", "badges.html", "badge-detail.html", "home.html", "index.html", "my.html", "onboard-1.html", "onboard-2.html", "onboard-3.html", "setup-done.html", "setup-explore.html", "setup-grade.html", "setup-name.html", "splash.html", "ai.js", "dex.js", "field.js", "grade.js", "onboard.js", "origami.js", "photo.js", "shared.js", "stickers.js", "base.css", "onboard.css", "fonts/HakgyoansimAllimjangTTF-R.woff2", "fonts/HakgyoansimAllimjangTTF-B.woff2", "fonts/SejongGeulggot.woff", "/favicon.svg", "/icons/icon-192.png"];

self.addEventListener('install', function (e) {
  // 하나가 실패해도 나머지는 다 받아 두게 하나씩
  // 와이파이가 느려 파일 하나가 멈춰도 설치가 끝없이 기다리지 않게, 15초 안에 못 받은 건 건너뛰고 새 버전으로 넘어가요 (설치가 멈추면 새 배포가 영영 안 보여요)
  var pre = caches.open(CACHE).then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })); });
  e.waitUntil(Promise.race([pre, new Promise(function (r) { setTimeout(r, 15000); })]).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    var old = keys.filter(function (k) { return k.indexOf('pico-app-') === 0 && k !== CACHE; });
    return Promise.all(old.map(function (k) { return caches.delete(k); })).then(function () { return self.clients.claim(); }).then(function () {
      // 배포로 서비스워커가 새 버전으로 바뀐 거라면, 이미 열려 있던 화면은 옛 js·css로 떠 있어서 새 css와 섞여 깨질 수 있어요 → 열린 화면을 한 번 새로 불러와요.
      if (!old.length) return;
      return self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} }); });
    });
  }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var isPage = req.mode === 'navigate' || /\.(html|js|css)$/.test(new URL(req.url).pathname);
  if (isPage) {
    // 화면(html·js·css)은 인터넷이 되면 항상 새로 받아 와요 — 예전엔 저장본을 먼저 보여 줘서, 배포 직후 html·js·css가 옛것과 새것으로 섞여
    // 화면이 깨지는 일이 있었어요. 인터넷이 없거나 2.5초 안에 못 받으면 저장해 둔 화면을 보여 줘요 (전시장 와이파이 대비).
    e.respondWith(caches.open(CACHE).then(function (c) {
      var fromCache = function () { return c.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match(req, { ignoreSearch: true }); }); };
      var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; });
      e.waitUntil(net.catch(function () {}));
      var slow = new Promise(function (resolve) { setTimeout(function () { fromCache().then(function (hit) { if (hit) resolve(hit); }); }, 2500); });
      return Promise.race([net, slow]).catch(function () { return fromCache().then(function (hit) { return hit || net; }); });
    }));
  } else {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
