/* sw.js — 동네 밥집 노트 서비스워커
   앱 셸(정적 파일)만 캐시해 설치·오프라인 첫 화면을 지원합니다.
   식당 데이터(Supabase) 같은 외부/교차출처 요청은 가로채지 않고 항상 네트워크로 갑니다. */
const CACHE = "bapjip-shell-v2";
const SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./restaurant-data.js",
  "./config.js",
  "./api.js",
  "./shared.js",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // GET + 같은 출처만 처리 (Supabase/폰트 등 교차출처는 그대로 통과)
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // 앱 셸: 네트워크 우선, 실패 시 캐시 (최신 유지 + 오프라인 대비)
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
