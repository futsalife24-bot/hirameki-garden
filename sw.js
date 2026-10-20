// 更新を配信するときは VERSION の数字を上げてください
const VERSION = 'hirameki-pages-v2';
const SHELL = [
  './',
  './index.html',
  './migration.html',
  './migration-data.js',
  './migration-ui.js',
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
    self.clients.claim()
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ページ本体：ネット優先（更新がすぐ届く）、オフライン時はキャッシュ
  if (req.mode === 'navigate') {
    const base = new URL('./', self.registration.scope);
    const home = new URL('index.html', base);
    // 庭の別名だけを統合し、引継ぎ画面や未知のパスは混同しない。
    const key = url.pathname === base.pathname || url.pathname === home.pathname
      ? home.href : new URL(url.pathname, base).href;
    const response = caches.open(VERSION).then(async cache => {
      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(key, res.clone());
        return res;
      } catch (err) {
        return await cache.match(key) || new Response('オフラインではこの画面を開けません。', {
          status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      }
    });
    e.respondWith(response);
    // キャッシュ書込みも fetch イベントの寿命内に完了させる。
    e.waitUntil(response.then(() => {}));
    return;
  }

  // Google Fonts：キャッシュを返しつつ裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    const load = caches.open(VERSION + '-fonts').then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(async res => { if (res.ok || res.type === 'opaque') await c.put(req, res.clone()); return res; }).catch(() => hit);
        return {hit, net};
      });
    e.respondWith(load.then(({hit, net}) => hit || net));
    e.waitUntil(load.then(({net}) => net).then(() => {}));
    return;
  }

  // 同じサイトのファイル：キャッシュ優先
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req)).then(hit => hit || fetch(req)));
  }
});
