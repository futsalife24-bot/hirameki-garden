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
  await page.locator('#game .game-nav a').click();await page.waitForFunction(()=>location.hash==='#garden'&&!document.getElementById('garden').hidden);assert.match(await page.locator('#resume-note').innerText(),/2手/);
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
  await page.locator('#game .game-nav a').click();await page.locator('#garden').waitFor();assert(await page.locator('#garden').isVisible());
  assert.equal(await page.evaluate(()=>typeof drawCeramic),'function');
  assert.equal(await page.locator('#play-game').evaluate(e=>getComputedStyle(e).display),'flex');
  // 星図：庭のスライドで選ぶと世界観ごと切り替わり、選択は次に開いたときも残る。
  const hzContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await hzContext.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const hz=await hzContext.newPage();hz.on('pageerror',e=>errors.push(e.message));
  await hz.goto(url);assert.equal(await hz.evaluate(()=>document.documentElement.dataset.world),'kintsugi');
  const kintsugiBefore=await hz.evaluate(()=>localStorage.getItem('kintsugi-save-v1'));
  assert(await hz.locator('#hz-play').isHidden());
  await hz.locator('#slide-next').click();
  assert.equal(await hz.evaluate(()=>document.documentElement.dataset.world),'hoshizu');
  assert(await hz.locator('#hz-play').isVisible());assert(await hz.locator('#play-game').isHidden());
  await hz.reload();assert.equal(await hz.evaluate(()=>document.documentElement.dataset.world),'hoshizu');assert(await hz.locator('#hz-play').isVisible());
  const hzFits=()=>hz.evaluate(()=>{const b=document.getElementById('hz-play').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight&&b.top>=0});
  assert.equal(await hzFits(),true);
  await hz.locator('#hz-play').click();await hz.waitForFunction(()=>location.hash==='#hoshizu'&&!document.getElementById('hoshizu').hidden);
  assert(await hz.locator('#garden').isHidden());assert(await hz.locator('#game').isHidden());
  const hzState=()=>hz.evaluate(()=>JSON.parse(localStorage.getItem('hoshizu-save-v1')));
  const sol=await hz.evaluate(()=>HOSHIZU_LEVELS[0].sol);
  // タップ2回で結ぶ → 一手戻す
  const [a0,b0]=sol[0];
  await hz.locator(`.hz-star[data-i="${a0}"]`).click();await hz.locator(`.hz-star[data-i="${b0}"]`).click();
  assert.equal((await hzState()).b[`${Math.min(a0,b0)}-${Math.max(a0,b0)}`],1);
  await hz.locator('#hz-undo').click();assert.equal((await hzState()).b[`${Math.min(a0,b0)}-${Math.max(a0,b0)}`],undefined);
  // 線をタップすると本数が進む
  await hz.locator(`.hz-star[data-i="${a0}"]`).click();await hz.locator(`.hz-star[data-i="${b0}"]`).click();
  await hz.locator('.hz-bridge .hz-bhit').first().click();assert.equal((await hzState()).b[`${Math.min(a0,b0)}-${Math.max(a0,b0)}`],2);
  await hz.locator('.hz-bridge .hz-bhit').first().click();assert.equal((await hzState()).b[`${Math.min(a0,b0)}-${Math.max(a0,b0)}`],undefined);
  // キーボード：Shift＋矢印で結ぶ
  const dirKey=await hz.evaluate(([a,b])=>{const s=HOSHIZU_LEVELS[0].stars;return s[a][0]===s[b][0]?(s[b][1]>s[a][1]?'ArrowDown':'ArrowUp'):(s[b][0]>s[a][0]?'ArrowRight':'ArrowLeft')},[a0,b0]);
  await hz.locator(`.hz-star[data-i="${a0}"]`).focus();await hz.keyboard.press('Shift+'+dirKey);
  assert.equal((await hzState()).b[`${Math.min(a0,b0)}-${Math.max(a0,b0)}`],1);
  await hz.keyboard.press('Shift+'+dirKey);await hz.keyboard.press('Shift+'+dirKey);
  // 答えどおりに結ぶと完成し、再読込しても完成のまま
  for(const [a,b,n] of sol)for(let k=0;k<n;k++){await hz.locator(`.hz-star[data-i="${a}"]`).click();await hz.locator(`.hz-star[data-i="${b}"]`).click()}
  await hz.locator('#hz-done.show').waitFor();assert.equal((await hzState()).solved,true);
  await hz.reload();await hz.locator('#hz-done.show').waitFor();
  await hz.locator('#hz-next').click();assert.equal((await hzState()).level,2);
  await hz.locator('.hz .game-nav a').click();await hz.waitForFunction(()=>!document.getElementById('garden').hidden);
  assert.equal(await hz.evaluate(()=>document.documentElement.dataset.world),'hoshizu');
  assert.match(await hz.locator('#hz-resume-note').innerText(),/第二夜/);
  // 星図を遊んでも、金継ぎの保存データは変わらない
  assert.equal(await hz.evaluate(()=>localStorage.getItem('kintsugi-save-v1')),kintsugiBefore);
  for(const width of [320,390,768,1440]){await hz.setViewportSize({width,height:900});
   await hz.goto(url+'#garden');assert.equal(await hzFits(),true,`hoshizu one screen ${width}`);
   await hz.goto(url+'#hoshizu');assert.equal(await hz.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`hoshizu ${width}`)}
  await hz.setViewportSize({width:320,height:780});await hz.evaluate(()=>localStorage.setItem('hoshizu-save-v1',JSON.stringify({level:30})));await hz.reload();
  assert.equal(await hz.locator('.hz-star').count(),25);assert.equal(await hz.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await hz.locator('#slide-prev').count();
  await hz.goto(url+'#garden');await hz.locator('#slide-prev').click();assert.equal(await hz.evaluate(()=>document.documentElement.dataset.world),'kintsugi');
  await hzContext.close();
  // ゲーム画面はどちらもスクロールせず一画面に収まり、盤面と操作ボタンが画面内にある
  {const gc=await browser.newContext({reducedMotion:'reduce'});await gc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const gp=await gc.newPage();gp.on('pageerror',e=>errors.push(e.message));
   const oneScreen=sel=>gp.evaluate(sel=>{const inView=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1};
     return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&sel.every(q=>inView(document.querySelector(q)))},sel);
   for(const [w,h] of [[320,568],[360,640],[390,844],[768,1024],[1280,720],[1440,900]]){await gp.setViewportSize({width:w,height:h});
    for(const [save,lv] of [['kintsugi-save-v1',JSON.stringify({level:1})],['kintsugi-save-v1',JSON.stringify({level:100})]]){await gp.goto(url);await gp.evaluate(([k,v])=>localStorage.setItem(k,v),[save,lv]);await gp.goto('about:blank');await gp.goto(url+'#kintsugi');
     assert.equal(await oneScreen(['#board','#undo','#reset','#game-title']),true,`kintsugi one screen ${w}x${h} ${lv}`)}
    for(const lv of [1,30]){await gp.goto(url);await gp.evaluate(l=>localStorage.setItem('hoshizu-save-v1',JSON.stringify({level:l})),lv);await gp.goto('about:blank');await gp.goto(url+'#hoshizu');
     assert.equal(await oneScreen(['#hz-board','#hz-undo','#hz-reset','#hz-title']),true,`hoshizu one screen ${w}x${h} level ${lv}`)}}
   // 遊び方は案内に入り、画面には出ていない
   await gp.setViewportSize({width:390,height:844});
   assert.equal(await gp.locator('#hz-help').isVisible(),false);await gp.locator('[data-help="hz-help"]').click();assert(await gp.locator('#hz-help').isVisible());
   await gp.locator('#hz-help [data-close]').click();assert.equal(await gp.locator('#hz-help').isVisible(),false);
   // 手ほどきは最初の面だけ。星図は次に結ぶ星を光らせる
   assert.equal(await gp.locator('#hz-coach').isVisible(),false);
   await gp.evaluate(()=>localStorage.setItem('hoshizu-save-v1',JSON.stringify({level:1})));await gp.reload();
   assert(await gp.locator('#hz-coach').isVisible());
   const firstSol=await gp.evaluate(()=>HOSHIZU_LEVELS[0].sol[0]);
   assert.deepEqual(await gp.evaluate(()=>[...document.querySelectorAll('.hz-star.guide')].map(e=>+e.dataset.i).sort((a,b)=>a-b)),[firstSol[0],firstSol[1]].sort((a,b)=>a-b));
   await gp.goto('about:blank');await gp.goto(url+'#kintsugi');await gp.evaluate(()=>localStorage.setItem('kintsugi-save-v1',JSON.stringify({level:1})));await gp.reload();
   assert(await gp.locator('#kin-coach').isVisible());assert.equal(await gp.locator('.tile.hint').count(),1);
   await gp.locator('[data-help="kin-help"]').click();assert(await gp.locator('#kin-help').isVisible());await gp.keyboard.press('Escape');assert.equal(await gp.locator('#kin-help').isVisible(),false);
   await gp.evaluate(()=>localStorage.setItem('kintsugi-save-v1',JSON.stringify({level:2})));await gp.reload();assert.equal(await gp.locator('#kin-coach').isVisible(),false);
   await gc.close();}
  // 文字が背景に溶けない：ライト・ダークどちらの端末設定でも、主な文字と背景のコントラスト比が4.5以上
  const contrastOf=(pg,sels)=>pg.evaluate(sels=>{
    const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=c=>{const v=rgb(c).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const probe=document.createElement('i');probe.style.color='var(--bg)';document.body.appendChild(probe);const bg=getComputedStyle(probe).color;probe.remove();
    return sels.map(sel=>{const e=document.querySelector(sel);const a=lum(getComputedStyle(e).color),b=lum(bg);return [sel,+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)]})},sels);
  for(const colorScheme of ['light','dark']){
   const cc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',colorScheme});await cc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   const cp=await cc.newPage();cp.on('pageerror',e=>errors.push(e.message));
   await cp.goto(url+'#hoshizu');assert.equal(await cp.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#0b1026',`hoshizu bg ${colorScheme}`);
   for(const [sel,ratio] of await contrastOf(cp,['#hz-title','.hz-level b','.hz-level span','#hz-coach','.hz-moves','#hz-reset']))assert(ratio>=4.5,`${colorScheme} ${sel} ${ratio}`);
   await cp.goto('about:blank');await cp.evaluate(()=>{});await cp.goto(url+'#garden');await cp.evaluate(()=>{localStorage.setItem('hirameki-world','hoshizu')});await cp.goto('about:blank');await cp.goto(url);
   for(const [sel,ratio] of await contrastOf(cp,['#garden-title','.garden-copy','#hz-collection-title','[data-world="hoshizu"] .game-subtitle','[data-world="hoshizu"] .story-copy','#hz-play-label','.slide-dot[aria-current="true"]']))assert(ratio>=4.5,`${colorScheme} garden ${sel} ${ratio}`);
   await cc.close();
  }
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
  await op.locator('#play-game').click();await op.locator('#game .game-nav a').click();
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
  console.log('合格：タイトル遷移、回転、戻す、固定、保存復元、旧形式保存、完成、次の器、初期化確認、4画面幅、最大盤面、オフライン、オープニング（開いた時だけ・スキップ・Esc・画面幅）、星図（スライド切替・世界観・結ぶ・戻す・線タップ・キーボード・完成・保存・最大盤面・画面幅・ライト/ダークでの文字の見やすさ）、ゲーム画面の一画面表示（6画面サイズ・最大盤面）、遊び方の案内、最初の面の手ほどき、実行エラーなし');
 } finally {if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
