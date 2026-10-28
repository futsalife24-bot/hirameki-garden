// 本番を一時プロファイル・合成保存のみで確認。prepareは旧本番を保持する。
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const origin='https://hirameki-garden.pages.dev',tmp=path.join(__dirname,'test-results/riddle-production'),out=path.join(__dirname,'docs/reports/space-riddle-20261028');
fs.mkdirSync(tmp,{recursive:true});
(async()=>{const context=await chromium.launchPersistentContext(path.join(tmp,'profile'),{channel:'msedge',headless:true,viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{await context.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#kagee');await page.evaluate(()=>navigator.serviceWorker.ready);
  if(process.argv[2]==='prepare'){
   await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);assert.equal(await page.locator('#kg-title').textContent(),'影絵');
   const old=await page.evaluate(async()=>{localStorage.setItem('kagee-best','{"1":17}');localStorage.setItem('kagee-sound','0');await(await caches.open('synthetic-unrelated-app')).put('/synthetic-keep',new Response('keep'));return Object.fromEntries(['kagee-save-v1','kagee-best','kagee-sound'].map(k=>[k,localStorage.getItem(k)]))});
   fs.writeFileSync(path.join(tmp,'old.json'),JSON.stringify(old));console.log('旧本番v4を一時プロファイルへ保持。影絵の合成保存と他cacheを準備。');return;
  }
  if(await page.locator('#kg-title').textContent()!=='かくれ絵')await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await Promise.race([new Promise(async resolve=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});await r.update()}),new Promise((_,reject)=>setTimeout(()=>reject(Error('SW更新待ち期限')),30000))])});
  await page.reload();await page.locator('#kg-title').filter({hasText:'かくれ絵'}).waitFor();
  const old=JSON.parse(fs.readFileSync(path.join(tmp,'old.json'),'utf8'));
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(['kagee-save-v1','kagee-best','kagee-sound'].map(k=>[k,localStorage.getItem(k)]))),old);
  assert.equal(await page.evaluate(async()=>await(await(await caches.open('synthetic-unrelated-app')).match('/synthetic-keep')).text()),'keep');
  const files=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else files.push(p)}}const dist=path.join(__dirname,'dist/new');walk(dist);
  const hashes=[];for(const f of files){const rel=path.relative(dist,f).replaceAll('\\','/'),r=await context.request.get(origin+'/'+rel);assert(rel==='404.html'?[200,404].includes(r.status()):r.status()===200,rel);const hash=crypto.createHash('sha256').update(await r.body()).digest('hex');assert.equal(hash,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),rel);hashes.push({path:rel,sha256:hash,status:r.status()})}
  assert.equal(await page.evaluate(()=>RIDDLE_SHAPES.length),12);await page.locator('#kg-canvas').focus();for(let i=0;i<10;i++)await page.keyboard.press('ArrowLeft');await page.locator('#kg-done.show').waitFor();assert.match(await page.locator('#kg-done-note').innerText(),/きのこ/);
  await page.locator('#kg-next').click();await page.locator('#kg-canvas').press('ArrowLeft');const saved=await page.evaluate(()=>localStorage.getItem('kakuree-save-v1'));await page.reload();assert.equal(await page.evaluate(()=>localStorage.getItem('kakuree-save-v1')),saved);
  await page.locator('#kagee .game-nav a').click();await page.locator('#kg-play').waitFor();await page.locator('#kg-play').click();
  await page.screenshot({path:path.join(out,'production-mobile.png')});await context.setOffline(true);await page.reload();assert.equal(await page.locator('#kg-title').textContent(),'かくれ絵');assert.equal(await page.evaluate(()=>localStorage.getItem('kakuree-save-v1')),saved);await page.locator('#kg-canvas').press('ArrowLeft');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kakuree-save-v1')).moves),JSON.parse(saved).moves+1);
  await context.setOffline(false);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'production.json'),JSON.stringify({date:new Date().toISOString(),origin,sourceCommit:'b4f3a7c9ec30c568939b8cd81214ec9e36c9a580',browser:context.browser()?.version(),checks:['公開中v4からv5へ更新','旧影絵3キー保持','他cache保持','配信全資材SHA256一致','12問収録','第1問操作解答','次の問・保存・再読込','庭との往復','更新後offline操作'],errors,hashes,android:'実機未確認'},null,2));console.log(`本番確認合格：${hashes.length}資材一致、v4→v5、保存保持、完成、再開、offline、実行エラー0`);
 }finally{await context.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
