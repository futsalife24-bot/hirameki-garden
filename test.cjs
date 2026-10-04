const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

(async()=>{
 const root=__dirname;
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(err?'':data)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{}),...(process.env.TEST_BROWSER_PATH?{executablePath:process.env.TEST_BROWSER_PATH}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('#play-game').waitFor();
  assert(await page.locator('#game').isHidden());
  // 庭は一画面に収まり、スクロールしなくても遊び始めのボタンまで見える
  const fitsOneScreen=()=>page.evaluate(()=>{const b=document.getElementById('play-game').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight&&b.top>=0});
  assert.equal(await fitsOneScreen(),true);
  await page.locator('.garden-nav a').click();
  await page.waitForFunction(()=>location.hash==='#collection');assert.equal(await page.evaluate(()=>scrollY),0);
  await page.locator('#play-game').click();assert.equal(await page.locator('.tile').count(),16);
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kintsugi-save-v1')));
  const before=await state();
  await page.locator('.tile').first().click();const changed=await state();
  assert.equal(changed.moves,before.moves+1);assert.equal(changed.rots[0],before.rots[0]+1);
  await page.locator('#undo').click();assert.deepEqual((await state()).rots,before.rots);
  await page.locator('.tile').first().click({button:'right'});assert.equal((await state()).locks[0],1);
  const locked=await state();await page.locator('.tile').first().click();assert.deepEqual(await state(),locked);
  await page.locator('.game-nav a').click();await page.waitForFunction(()=>location.hash==='#garden'&&!document.getElementById('garden').hidden);assert.match(await page.locator('#resume-note').innerText(),/2手/);
  await page.reload();await page.locator('#play-game').click();assert.deepEqual(await state(),locked);
  // 旧版と同じ形式の保存データを使い、完成・次の器への遷移を確認。
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('kintsugi-save-v1'));s.rots.fill(0);s.solved=false;localStorage.setItem('kintsugi-save-v1',JSON.stringify(s))});
  await page.reload();await page.locator('#done.show').waitFor();assert.equal((await state()).solved,true);
  await page.locator('#next').click();assert.equal((await state()).level,2);
  await page.locator('.tile').first().click();await page.locator('#reset').click();assert.equal((await state()).moves,1);
  await page.locator('#reset').click();assert.equal((await state()).moves,0);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const hash of ['#garden','#kintsugi']){
    await page.goto(url+hash);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${hash}`);
    if(hash==='#garden')assert.equal(await fitsOneScreen(),true,`one screen ${width}`);
   }
  }
  // 最大盤面も小さい画面に収まる。
  await page.evaluate(()=>localStorage.setItem('kintsugi-save-v1',JSON.stringify({level:100})));
  await page.setViewportSize({width:320,height:780});await page.reload();assert.equal(await page.locator('.tile').count(),49);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();assert.equal(await page.locator('.tile').count(),49);
  await page.locator('.game-nav a').click();await page.locator('#garden').waitFor();assert(await page.locator('#garden').isVisible());
  assert.equal(await page.evaluate(()=>typeof drawCeramic),'function');
  assert.equal(await page.locator('.play-game').evaluate(e=>getComputedStyle(e).display),'flex');
  // オープニング：開いたときだけ流れ、ゲームから庭へ戻るときやゲーム画面で開いたときは流れない。
  // 外部の書体は取りに行かず、動きを減らす設定がない状態で確かめる。
  const opContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await opContext.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const op=await opContext.newPage();op.on('pageerror',e=>errors.push(e.message));
  await op.clock.install();
  await op.goto(url);
  assert(await op.locator('#opening').isVisible());
  assert.equal(await op.locator('#garden').evaluate(e=>e.inert),true);
  assert.equal(await op.evaluate(()=>document.activeElement.id),'op-play-sound');
  await op.locator('#op-play-mute').click();
  await op.clock.runFor(4000);assert(await op.locator('#opening').isVisible());
  await op.clock.runFor(6000);assert(await op.locator('#opening').isVisible());
  await op.clock.runFor(2500);await op.locator('#opening').waitFor({state:'detached'});
  assert.equal(await op.locator('#garden').evaluate(e=>e.inert),false);
  assert.equal(await op.evaluate(()=>document.activeElement.id),'garden-title');
  await op.locator('#play-game').click();await op.locator('.game-nav a').click();
  assert.equal(await op.locator('#opening').count(),0);
  await op.goto('about:blank');await op.goto(url+'#kintsugi');assert.equal(await op.locator('#opening').count(),0);
  // スキップはボタンでもEscキーでもできる
  await op.goto('about:blank');await op.goto(url+'#garden');await op.locator('#op-start-skip').click();await op.clock.runFor(800);
  await op.locator('#opening').waitFor({state:'detached'});
  await op.goto('about:blank');await op.goto(url);await op.locator('#op-play-mute').click();await op.keyboard.press('Escape');await op.clock.runFor(800);
  await op.locator('#opening').waitFor({state:'detached'});
  for(const width of [320,1440]){await op.setViewportSize({width,height:800});await op.goto('about:blank');await op.goto(url);await op.locator('#op-play-mute').click();await op.clock.runFor(5000);
   assert.equal(await op.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`opening ${width}`)}
  assert.deepEqual(errors,[]);
  console.log('合格：タイトル遷移、回転、戻す、固定、保存復元、旧形式保存、完成、次の器、初期化確認、4画面幅、最大盤面、オフライン、オープニング（開いた時だけ・スキップ・Esc・画面幅）、実行エラーなし');
 } finally {if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
