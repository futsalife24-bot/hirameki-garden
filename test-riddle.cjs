const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const dir=path.join(__dirname,'dist/new'),out=path.join(__dirname,'test-results/riddle');fs.mkdirSync(out,{recursive:true});
 let serveOld=false;
 const oldFiles=Object.fromEntries(['index.html','garden.js','sw.js','kagee.js','kagee.css'].map(n=>[n,require('node:child_process').execFileSync('git',['show',`543f942ad15aaf5bfaacb656bdb95e540b6fbd30:${n}`],{cwd:__dirname})]));
 const server=http.createServer((req,res)=>{const f=path.resolve(dir,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!f.startsWith(dir+path.sep))return res.writeHead(403).end();const send=(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(f)]||'text/plain'});res.end(e?'':b)};const old=serveOld&&oldFiles[path.relative(dir,f)];if(old)send(null,old);else fs.readFile(f,send)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/`,key='kakuree-save-v1';
  await page.goto(url+'#kagee');
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const old=JSON.stringify({level:17,R:[[1,0,0],[0,1,0],[0,0,1]],moves:28,solved:true});
  await page.evaluate(v=>{localStorage.setItem('kagee-save-v1',v);localStorage.setItem('kagee-best','{"17":28}');localStorage.setItem('kagee-sound','0')},old);
  await page.reload();assert.equal((await state()).level,1);assert(await page.locator('#kg-coach').isVisible());
  await page.locator('[data-help="kg-help"]').click();assert(await page.locator('#kg-help').isVisible());await page.keyboard.press('Escape');
  const box=await page.locator('#kg-canvas').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2,{steps:6});await page.mouse.up();assert.equal((await state()).moves,1);
  const moved=await state();await page.reload();assert.deepEqual(await state(),moved);
  await page.locator('#kg-reset').click();assert.equal((await state()).moves,1);await page.locator('#kg-reset').click();assert.equal((await state()).moves,0);
  await page.screenshot({path:path.join(out,'mobile-start.png')});
  // 全12問を開始状態からキーボード操作で解く。正解の保存を注入しない。
  for(let level=1;level<=12;level++){
   assert.equal((await state()).level,level);assert.equal((await state()).solved,false);
   await page.locator('#kg-hint').click();assert(await page.locator('#kg-coach').isVisible());await page.locator('#kg-hint').click();
   await page.locator('#kg-canvas').focus();
   for(let guard=0;guard<90;guard++){const s=await state();if(s.solved)break;await page.keyboard.press(Math.abs(s.yaw)>.07?(s.yaw>0?'ArrowLeft':'ArrowRight'):(s.pitch>0?'ArrowUp':'ArrowDown'))}
   assert.equal((await state()).solved,true,`第${level}問が解ける`);assert((await state()).moves>0);
   assert.equal((await state()).best[level],(await state()).moves);await page.locator('#kg-done.show').waitFor();
   await page.screenshot({path:path.join(out,`solved-${String(level).padStart(2,'0')}.png`)});
   if(level===1){await page.reload();assert.equal((await state()).solved,true)}
   await page.locator('#kg-next').click();
  }
  assert.equal((await state()).level,1);assert.equal(Object.keys((await state()).best).length,12);
  // タッチのpointer経路・途中キャンセル・1ドラッグのクリアも1手に数える。
  await page.locator('#kg-canvas').dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',button:0,clientX:200,clientY:300});
  await page.locator('#kg-canvas').dispatchEvent('pointermove',{pointerId:7,pointerType:'touch',clientX:150,clientY:300});
  await page.locator('#kg-canvas').dispatchEvent('pointercancel',{pointerId:7,pointerType:'touch'});
  assert.equal((await state()).moves,1);
  await page.locator('#kg-reset').click();await page.locator('#kg-reset').click();
  const b=await page.locator('#kg-canvas').boundingBox(),distance=.9*Math.max(240,Math.min(b.width,b.height))/3.2;
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-distance,b.y+b.height/2,{steps:20});await page.mouse.up();assert.equal((await state()).solved,true);assert.equal((await state()).moves,1);
  await page.locator('#kg-next').click();
  for(const [width,height]of [[320,568],[390,844],[844,390],[768,1024],[1280,720]]){
   await page.setViewportSize({width,height});
   await page.screenshot({path:path.join(out,`size-${width}.png`)});
   assert(await page.evaluate(()=>{const v=id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1};return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&['kg-canvas','kg-hint','kg-reset','kg-title'].every(v)}),`一画面 ${width}×${height}`);
   if(width===1280)await page.screenshot({path:path.join(out,'desktop-play.png')});
   await page.locator('#kagee .game-nav a').click();await page.locator('#kg-play').waitFor();assert.equal(await page.locator('#kg-collection-title').textContent(),'かくれ絵');
   await page.locator('#kg-play').click();assert.equal((await state()).level,2);
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#kagee .game-nav a').click();await page.screenshot({path:path.join(out,'mobile-garden.png')});await page.locator('#kg-play').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('kagee-save-v1')),old);assert.equal(await page.evaluate(()=>localStorage.getItem('kagee-best')),'{"17":28}');assert.equal(await page.evaluate(()=>localStorage.getItem('kagee-sound')),'0');
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
  const saved=await state();await context.setOffline(true);await page.reload();assert.deepEqual(await state(),saved);assert.equal(await page.evaluate(()=>RIDDLE_SHAPES.length),12);await page.locator('#kg-canvas').press('ArrowLeft');assert.equal((await state()).moves,saved.moves+1);await context.setOffline(false);
  // 壊れた保存からは安全な新規状態。旧データは保持。
  for(const value of ['{','null',JSON.stringify({level:999}),JSON.stringify({...saved,yaw:null})]){await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,value]);await page.goto('about:blank');await page.goto(url+'#kagee');assert.equal((await state()).level,1)}
  assert.equal(await page.evaluate(()=>localStorage.getItem('kagee-save-v1')),old);
  // 公開元v4の実SWから更新。旧保存カプセルと他アプリcacheを保持する。
  const uc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await uc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const up=await uc.newPage();up.on('pageerror',e=>errors.push(e.message));serveOld=true;
  await up.goto(url+'#kagee');await up.evaluate(()=>navigator.serviceWorker.ready);await up.reload();await up.waitForFunction(()=>navigator.serviceWorker.controller);assert.equal(await up.locator('#kg-title').textContent(),'影絵');
  const capsule=await up.evaluate(async()=>{const b=HiramekiBackup.api(localStorage).snapshot();HiramekiBackup.api(localStorage).import(b);await(await caches.open('unrelated-app')).put('/other',new Response('keep'));return localStorage.getItem('hirameki-import-v1')});
  serveOld=false;await up.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));await r.update();await changed});await up.reload();assert.equal(await up.locator('#kg-title').textContent(),'かくれ絵');
  assert.deepEqual(await up.evaluate(()=>JSON.parse(localStorage.getItem('hirameki-import-v1')).data),JSON.parse(capsule).data);assert.equal(await up.evaluate(async()=>await(await(await caches.open('unrelated-app')).match('/other')).text()),'keep');
  await uc.setOffline(true);await up.reload();assert.equal(await up.locator('#kg-title').textContent(),'かくれ絵');assert.equal(await up.evaluate(()=>RIDDLE_SHAPES.length),12);await uc.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,levels:12,viewports:5,errors,checks:['全問を操作で解答','ドラッグ・タッチ経路・キーボード','再開・リセット・周回','旧影絵保存保持','オフライン','不正保存回復','v4からv6更新・旧capsuleと他cache保持']},null,2));console.log('合格：かくれ絵12問、操作、保存、旧データ保持、5画面サイズ、オフライン、不正保存、v4→v6更新、実行エラー0');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
