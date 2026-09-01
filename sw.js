// 최소한의 서비스워커 — 오프라인 캐싱 없이 '홈 화면에 추가' 요건만 충족시킵니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', () => {});
