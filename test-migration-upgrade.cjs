/* 実ユーザーと無関係な一時プロファイルで、元の公開相当SWから更新する。 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base='6260027eca22336d688804d43e7075f59658737b',tmp=path.join(__dirname,'test-results','migration-before');fs.mkdirSync(tmp,{recursive:true});
 const zip=path.join(tmp,'baseline.zip');cp.execFileSync('git',['archive','--format=zip','--output='+zip,base],{cwd:__dirname});
 cp.execFileSync('python',['-c','import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',zip,tmp]);
 let upgraded=false;const server=http.createServer((req,res)=>{
  if(req.url==='/other/sw.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));");return}
  const dir=upgraded?path.join(__dirname,'dist','legacy'):tmp,p=new URL(req.url,'http://localhost').pathname.replace(/^\/hirameki-garden/,'');
  const f=path.resolve(dir,'.'+p.replace(/\/$/,'/index.html'));if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}
  fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.webmanifest')?'application/manifest+json':'application/octet-stream'});res.end(e?'':b)});
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext({reducedMotion:'reduce',acceptDownloads:true});await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const page=await ctx.newPage(),url=`http://127.0.0.1:${server.address().port}/hirameki-garden/`;
  await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),url+'sw.js');
  assert.equal(await page.locator('link[rel=manifest]').count(),1);
  const cached=await page.evaluate(async()=>{const c=await caches.open('hirameki-v16');return {shell:!!await c.match('./index.html'),manifest:!!await c.match('./manifest.webmanifest')}});assert.deepEqual(cached,{shell:true,manifest:true});
  await page.evaluate(async()=>{localStorage.setItem('kintsugi-sound','0');localStorage.setItem('対象外の合成キー','保持');await (await caches.open('対象外の合成cache')).put('/sentinel',new Response('保持'));await navigator.serviceWorker.register('/other/sw.js',{scope:'/other/'});});
  const before=await page.evaluate(()=>({...localStorage}));upgraded=true;
  await ctx.setOffline(true);await page.reload();assert.equal(await page.locator('link[rel=manifest]').count(),1);
  const limitation='移行版へ一度もオンライン更新していない旧SW制御端末は、オフラインで旧manifest付きapp shellを返す。全旧端末のinstall不可は未達。';console.log('確認した制限：'+limitation);
  await ctx.setOffline(false);await page.reload();await page.locator('#export').waitFor();assert.equal(await page.locator('link[rel=manifest]').count(),0);
  const current=await page.evaluate(async()=>{const expected=new URL('./',location.href).href,r=await navigator.serviceWorker.getRegistration(expected);if(!r||r.scope!==expected||r.active.scriptURL!==new URL('./sw.js',location.href).href)throw Error('scope不一致');await r.update();return r.scope});assert.equal(current,url);
  // 更新完了後の実SW本文が移行用であることをブラウザから確認する。
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration(new URL('./',location.href).href);return r&&!r.installing&&!r.waiting&&r.active&&r.active.state==='activated'});
  await page.reload();assert.equal(await page.locator('link[rel=manifest]').count(),0);
  const download=page.waitForEvent('download');await page.locator('#export').click();const d=await download,b=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(b.data['kintsugi-sound'],'0');
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
  assert.deepEqual(await page.evaluate(async()=>({cache:await(await caches.match('/sentinel')).text(),other:(await navigator.serviceWorker.getRegistrations()).some(r=>r.scope===new URL('/other/',location.href).href),oldManifest:!!await(await caches.open('hirameki-v16')).match('./manifest.webmanifest')})),{cache:'保持',other:true,oldManifest:true});
  fs.mkdirSync(path.join(__dirname,'docs','reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'docs','reports','migration-upgrade-results.json'),JSON.stringify({base,date:new Date().toISOString(),browser:'隔離headless Edge',originalSW:'hirameki-v16、元commitそのまま',cached,online:'旧SW制御から移行HTMLを取得しmanifest linkなし、対象scopeだけ更新、export成功、元localStorageと他SW/cache保持',limitation,android:'未確認'},null,2));
  console.log('合格：元SW・旧app shell・旧manifestのcacheからオンライン移行、正確なscope更新、exportと他アプリ保持');await ctx.close();
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
