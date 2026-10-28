// 更新を配信するときは VERSION の数字を上げてください
const VERSION = 'hirameki-pages-v6';
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
  './riddle.css',
  './riddle.js',
  './riddle-shapes.js',
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

function navigationKey(url) {
  const base = new URL(self.registration.scope);
  const home = new URL('index.html', base);
  const migration = new URL('migration.html', base);
  if (url.origin !== base.origin) return null;
  if (url.pathname === base.pathname || url.pathname === home.pathname) return home.href;
  if (url.pathname === migration.pathname || url.pathname === new URL('migration', base).pathname) return migration.href;
  return null;
}

// 元のURLと応答型を、属性を失うResponse複製より前に検証する。
function trustedAppResponse(response, requestURL) {
  if (!response || response.type !== 'basic' || typeof requestURL !== 'string' || !response.url) return false;
  try {
    const base = new URL(self.registration.scope);
    const requested = new URL(requestURL);
    const final = new URL(response.url);
    if ([requested, final].some(u => u.origin !== base.origin || !u.pathname.startsWith(base.pathname) || u.username || u.password || u.hash)) return false;
    if (requested.search !== final.search) return false;
    const requestedPage = navigationKey(requested);
    return requestedPage ? navigationKey(final) === requestedPage : final.pathname === requested.pathname;
  } catch (err) {
    return false;
  }
}

// Pagesの同一オリジン・正確な別名だけを、オフラインで返せる通常応答として保存する。
function cacheCopy(response, requestURL) {
  if (!trustedAppResponse(response, requestURL) || !response.ok || response.status < 200 || response.status >= 300) throw new Error('許可していないアプリ応答です。');
  const copy = response.clone();
  return response.redirected ? new Response(copy.body, {
    status: copy.status, statusText: copy.statusText, headers: copy.headers
  }) : copy;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    // 全取得・検証が済むまでキャッシュを書かず、異常なら既存SWを維持する。
    const entries = await Promise.all(SHELL.map(async path => {
      const url = new URL(path, self.registration.scope).href;
      const response = await fetch(url, {mode: 'same-origin', redirect: 'follow', cache: 'reload'});
      return [url, cacheCopy(response, url)];
    }));
    const cache = await caches.open(VERSION);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
  })().then(() => self.skipWaiting()));
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
    const key = navigationKey(url);
    const response = caches.open(VERSION).then(async cache => {
      try {
        const res = await fetch(req, {mode: 'same-origin', redirect: 'follow'});
        if (!trustedAppResponse(res, req.url)) throw new Error('許可していない移動先です。');
        if (res.ok && !key) return new Response('ページが見つかりません。', {status: 404});
        if (res.ok) {
          const safe = cacheCopy(res, req.url);
          await cache.put(key, safe.clone());
          return safe;
        }
        if (res.redirected) return new Response('移動先から正常な応答を取得できません。', {status: 503});
        return res;
      } catch (err) {
        return (key && await cache.match(key)) || new Response('オフラインではこの画面を開けません。', {
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
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const response = await fetch(req, {mode: 'same-origin', redirect: 'follow'});
      return trustedAppResponse(response, req.url) ? response : new Response('許可していない応答です。', {status: 503});
    }).catch(() => new Response('応答を取得できません。', {status: 503})));
  }
});
