// 更新を配信するときは VERSION の数字を上げてください
const VERSION = 'hirameki-v16';
const SHELL = [
  './',
  './index.html',
  './garden.css',
  './ceramic.js',
  './opening.js',
  './opening.css',
  './garden.js',
  './hoshizu.css',
  './hoshizu.js',
  './hoshizu-levels.js',
  './kagee.css',
  './kagee.js',
  './katsuji.css',
  './katsuji.js',
  './katsuji-levels.js',
  './chomen.css',
  './chomen.js',
  './chomen-levels.js',
  './sangaku.css',
  './sangaku-levels.js',
  './sangaku.js',
  './somewake.css',
  './somewake-levels.js',
  './somewake.js',
  './himitsu.css',
  './himitsu-levels.js',
  './himitsu.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ページ本体：ネット優先（更新がすぐ届く）、オフライン時はキャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Google Fonts：キャッシュを返しつつ裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION + '-fonts').then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // 同じサイトのファイル：キャッシュ優先
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
