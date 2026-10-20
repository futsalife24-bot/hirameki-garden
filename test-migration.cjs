/* 一時ブラウザの合成データだけで検証する。 */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const results=[];const ok=s=>{results.push(s);console.log('合格：'+s)};
async function serve(mode){const dir=path.join(__dirname,'dist',mode),s=http.createServer((req,res)=>{
 if(req.url==='/other/sw.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));");return}
 let p=new URL(req.url,'http://localhost').pathname;if(mode==='legacy')p=p.replace(/^\/hirameki-garden/,'');
 const f=path.resolve(dir,'.'+p.replace(/\/$/,'/index.html'));if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':f.endsWith('.js')?'application/javascript':f.endsWith('.webmanifest')?'application/manifest+json':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});res.end(e?'':b)});
});await new Promise(r=>s.listen(0,'127.0.0.1',r));return {s,url:`http://127.0.0.1:${s.address().port}`}}
(async()=>{const old=await serve('legacy'),fresh=await serve('new');let browser;
 try{
 browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 const ctx=await browser.newContext({reducedMotion:'reduce',acceptDownloads:true,viewport:{width:390,height:844}});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(fresh.url+'/')).status(),200);await page.waitForFunction(()=>!!window.HiramekiGames);
 const fixture=await page.evaluate(()=>{
  for(const [i,w]of ['kintsugi','hoshizu','kagee','katsuji','chomen','himitsu','somewake','sangaku'].entries()){
   const k=w+'-save-v1',s=JSON.parse(localStorage.getItem(k));
   if('moves'in s)s.moves=7;if('miss'in s)s.miss=3;if('fix'in s)s.fix=2;
   if(w==='kintsugi'){s.rots[0]++;s.locks[1]=1;s.hist=[0]}
   if(w==='chomen')s.done[0]=true;
   if(w==='sangaku')s.v[0]=1;
   localStorage.setItem(k,JSON.stringify(s));localStorage.setItem(w+'-best',JSON.stringify({'1':7}));localStorage.setItem(w+'-sound',i%2?'1':'0');
  }
  localStorage.setItem('hirameki-world','chomen');return HiramekiStorage.snapshot()
 });
 assert.equal(Object.keys(fixture.data).length,25);ok('公開 main 八作品の25項目を合成データとして収集');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const manifest=await (await ctx.request.get(fresh.url+'/manifest.webmanifest')).json();assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
 assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),fresh.url+'/sw.js');
 for(const f of ['migration.html','migration-data.js','migration-ui.js','icons/icon-192.png'])assert.equal((await ctx.request.get(fresh.url+'/'+f)).status(),200);
 ok('新版 local root HTTP 200・manifest root・実SW制御');
 await page.goto(fresh.url+'/migration.html');await ctx.setOffline(true);await page.reload();assert.match(await page.title(),/データの引継ぎ/);await ctx.setOffline(false);ok('新版の引継ぎ画面をオフラインで再読込み');
 const legacy=await ctx.newPage();await legacy.goto(old.url+'/hirameki-garden/');
 await legacy.evaluate(data=>{for(const [k,v]of Object.entries(data))if(v!==null)localStorage.setItem(k,v);localStorage.setItem('他アプリの合成キー','保持');},fixture.data);
 await legacy.evaluate(async()=>{await (await caches.open('他アプリの合成cache')).put('/sentinel',new Response('保持'));await new Promise((resolve,reject)=>{const r=indexedDB.open('他アプリの合成DB',1);r.onupgradeneeded=()=>r.result.createObjectStore('確認');r.onsuccess=()=>{r.result.close();resolve()};r.onerror=()=>reject(r.error)});await navigator.serviceWorker.register('/other/sw.js',{scope:'/other/'});await navigator.serviceWorker.register('./sw.js',{scope:'./'});});
 const resources=()=>legacy.evaluate(async()=>({storage:{...localStorage},cache:await caches.keys(),cacheBody:await (await caches.match('/sentinel')).text(),db:(await indexedDB.databases()).map(d=>d.name),sw:(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope).sort()}));
 const oldBefore=await resources();assert.equal(oldBefore.sw.length,2);
 assert.equal(await legacy.locator('link[rel=manifest]').count(),0);
 const download=legacy.waitForEvent('download');await legacy.locator('#export').click();const d=await download;const exported=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.deepEqual(exported.data,fixture.data);ok('分離した旧originの実ダウンロードからJSONを読取り');
 async function file(b){await page.locator('#file').setInputFiles({name:'合成.json',mimeType:'application/json',buffer:Buffer.from(typeof b==='string'?b:JSON.stringify(b))});await page.waitForFunction(()=>document.getElementById('status').textContent!=='');}
 const before=await page.evaluate(()=>({...localStorage}));
 for(const bad of ['{', {...exported,app:'other'}, {...exported,version:0},{...exported,version:2},{...exported,data:{...exported.data,'kintsugi-sound':'9'}},{...exported,data:{...exported.data,'kintsugi-save-v1':JSON.stringify({level:-1})}},{...exported,data:{...exported.data,unknown:'x'}}]){
  await file(bad);assert(await page.locator('#import').isDisabled());assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
 }ok('不正JSON・異アプリ・旧/未知schema・不正値・未知キーを無変更で拒否');
 await file(exported);fs.mkdirSync(path.join(__dirname,'docs','reports'),{recursive:true});await page.screenshot({path:path.join(__dirname,'docs','reports','migration-preview.png'),fullPage:true});await page.locator('#agree').check();await page.locator('#cancel').click();assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);ok('内容確認キャンセルは無変更');
 await file(exported);await page.locator('#agree').check();page.once('dialog',d=>d.dismiss());await page.locator('#import').click();assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);ok('明示的上書き確認のキャンセルは無変更');
 await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===HiramekiBackup.capsule)throw new DOMException('合成容量不足','QuotaExceededError');return originalSet.call(this,k,v)}});
 page.once('dialog',d=>d.accept());await page.locator('#import').click();assert.match(await page.locator('#status').textContent(),/失敗/);assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);await page.evaluate(()=>{Storage.prototype.setItem=originalSet});ok('容量不足による保存失敗で既存全キーを保持');
 page.once('dialog',d=>d.accept());await page.locator('#import').click();assert.match(await page.locator('#status').textContent(),/完了/);assert.deepEqual(await page.evaluate(()=>HiramekiStorage.snapshot().data),exported.data);ok('既存データありの新版へ確認後に全25項目を原子的に取り込み');
 await page.goto(fresh.url+'/');await page.waitForFunction(()=>!!window.HiramekiGames);assert.equal(await page.evaluate(()=>HiramekiStorage.get('hirameki-world')),'chomen');
 await page.goto(fresh.url+'/#kintsugi');await page.locator('.tile').first().click();const moved=await page.evaluate(()=>JSON.parse(HiramekiStorage.get('kintsugi-save-v1')).moves);await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(HiramekiStorage.get('kintsugi-save-v1')).moves),moved);ok('取り込み後の通常ゲーム操作・保存・再読込み');
 await legacy.locator('#file').setInputFiles({name:'合成.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await legacy.waitForFunction(()=>document.getElementById('status').textContent!=='');assert(await legacy.locator('#agree').isDisabled());
 assert.deepEqual(await resources(),oldBefore);ok('旧移行版はexport・検証のみ。対象外SW/localStorage/cache本文/IndexedDB保持');
 assert.deepEqual(errors,[]);await ctx.close();
 fs.mkdirSync(path.join(__dirname,'docs','reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'docs','reports','migration-results.json'),JSON.stringify({date:new Date().toISOString(),type:'隔離したheadless Edgeのブラウザ自動検証',results,android:'未確認',public:'未公開'},null,2));
 }finally{if(browser)await browser.close();old.s.close();fresh.s.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
