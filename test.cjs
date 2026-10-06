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
  // 庭の上部に、意味のないリンクを置かない
  assert.equal(await page.locator('.garden-nav a').count(),0);
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
  // 影絵：三つ目のスライドで選べ、立体を回して影を点線に重ねる
  {const kc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await kc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   const kp=await kc.newPage();kp.on('pageerror',e=>errors.push(e.message));
   await kp.goto(url);await kp.locator('#slide-next').click();await kp.locator('#slide-next').click();
   assert.equal(await kp.evaluate(()=>document.documentElement.dataset.world),'kagee');assert(await kp.locator('#kg-play').isVisible());
   await kp.locator('#kg-play').click();await kp.waitForFunction(()=>location.hash==='#kagee'&&!document.getElementById('kagee').hidden);
   const kState=()=>kp.evaluate(()=>JSON.parse(localStorage.getItem('kagee-save-v1')));
   // 第一幕は手ほどき。ドラッグで回すと回数が増え、重なりが変わる
   assert(await kp.locator('#kg-coach').isVisible());
   const before=await kp.locator('#kg-match').innerText();const box=await kp.locator('#kg-canvas').boundingBox();
   await kp.mouse.move(box.x+box.width/2,box.y+box.height*.75);await kp.mouse.down();await kp.mouse.move(box.x+box.width/2+60,box.y+box.height*.75,{steps:8});await kp.mouse.up();
   assert.equal((await kState()).moves,1);assert.notEqual(await kp.locator('#kg-match').innerText(),before);
   // 答えの向きから15度ずれた状態で、矢印キー一回で幕が上がる
   const c=Math.cos(Math.PI/12),sn=Math.sin(Math.PI/12);
   await kp.evaluate(R=>localStorage.setItem('kagee-save-v1',JSON.stringify({level:3,R,moves:2})),[[c,0,sn],[0,1,0],[-sn,0,c]]);await kp.reload();
   assert.equal(await kp.locator('#kg-coach').isVisible(),false);
   await kp.locator('#kg-canvas').focus();await kp.keyboard.press('ArrowLeft');
   await kp.locator('#kg-done.show').waitFor();assert.equal((await kState()).solved,true);
   await kp.reload();await kp.locator('#kg-done.show').waitFor();
   await kp.locator('#kg-next').click();assert.equal((await kState()).level,4);
   await kp.locator('[data-help="kg-help"]').click();assert(await kp.locator('#kg-help').isVisible());await kp.keyboard.press('Escape');
   await kp.locator('#kagee .game-nav a').click();await kp.waitForFunction(()=>!document.getElementById('garden').hidden);
   assert.equal(await kp.evaluate(()=>document.documentElement.dataset.world),'kagee');assert.match(await kp.locator('#kg-resume-note').innerText(),/第四幕/);
   for(const [w,h] of [[320,568],[390,844],[768,1024],[1280,720]]){await kp.setViewportSize({width:w,height:h});
    for(const l of [1,20]){await kp.evaluate(l=>localStorage.setItem('kagee-save-v1',JSON.stringify({level:l})),l);await kp.goto('about:blank');await kp.goto(url+'#kagee');
     assert.equal(await kp.evaluate(()=>{const v=e=>{const r=document.querySelector(e).getBoundingClientRect();return r.width>0&&r.top>=-1&&r.bottom<=innerHeight+1};return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&['#kg-canvas','#kg-reset','#kg-title','#kg-match'].every(v)}),true,`kagee one screen ${w}x${h} ${l}`)}
    await kp.goto(url+'#garden');assert.equal(await kp.evaluate(()=>{const b=document.getElementById('kg-play').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight}),true,`kagee garden ${w}x${h}`)}
   await kc.close();}
  // 活字：四つ目のスライド。マスを選んで活字をはめ、食い違うものは入らない
  {const jc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await jc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   const jp=await jc.newPage();jp.on('pageerror',e=>errors.push(e.message));
   await jp.goto(url);for(let k=0;k<3;k++)await jp.locator('#slide-next').click();
   assert.equal(await jp.evaluate(()=>document.documentElement.dataset.world),'katsuji');
   await jp.locator('#kj-play').click();await jp.waitForFunction(()=>location.hash==='#katsuji'&&!document.getElementById('katsuji').hidden);
   const jState=()=>jp.evaluate(()=>JSON.parse(localStorage.getItem('katsuji-save-v1')));
   const lv=await jp.evaluate(()=>KATSUJI_LEVELS[0]);
   assert(await jp.locator('#kj-coach').isVisible());assert(await jp.locator('.kj-cell.guide').count()>0);
   const selectSlot=async si=>{const [x,y,d,len]=lv.slots[si];const want=Array.from({length:len},(_,i)=>d==='a'?(x+i)+','+y:x+','+(y+i)).sort().join();
     for(let k=0;k<2;k++){await jp.locator(`.kj-cell[data-x="${x}"][data-y="${y}"]`).click();const got=(await jp.evaluate(()=>[...document.querySelectorAll('.kj-cell.sel')].map(e=>e.dataset.x+','+e.dataset.y))).sort().join();if(got===want)return}
     throw new Error('slot not selected '+si)};
   const free=lv.slots.map((s,i)=>i).filter(i=>!lv.givens.includes(i));
   // 長さの違う活字は入らない
   const si0=free[0],wrongLen=lv.words.findIndex((w,i)=>w.length!==lv.slots[si0][3]&&!lv.givens.includes(i));
   await selectSlot(si0);await jp.locator(`.kj-chip[data-i="${wrongLen}"]`).click();assert.equal((await jState()).p[si0],-1);
   // 正しい活字をはめ、もう一度押すと外れ、一手戻すで戻る
   await jp.locator(`.kj-chip[data-i="${si0}"]`).click();assert.equal((await jState()).p[si0],si0);
   await jp.locator(`.kj-chip[data-i="${si0}"]`).click();assert.equal((await jState()).p[si0],-1);
   await jp.locator('#kj-undo').click();assert.equal((await jState()).p[si0],si0);
   for(const si of free.slice(1)){await selectSlot(si);await jp.locator(`.kj-chip[data-i="${si}"]`).click()}
   await jp.locator('#kj-done.show').waitFor();assert.equal(await jp.locator('#kj-done-pw').innerText(),lv.pw);assert.equal((await jState()).solved,true);
   await jp.reload();await jp.locator('#kj-done.show').waitFor();
   await jp.locator('#kj-next').click();assert.equal((await jState()).level,2);assert.equal(await jp.locator('#kj-coach').isVisible(),false);
   // 交わる文字が合わない活字は入らない：交わる二つの置き場と、交点の文字だけが違う同じ長さの言葉を探して試す
   const cx=await jp.evaluate(()=>{const cof=([x,y,d,l])=>Array.from({length:l},(_,i)=>d==='a'?[x+i,y]:[x,y+i]);
    for(let li=0;li<KATSUJI_LEVELS.length;li++){const lv=KATSUJI_LEVELS[li];for(let a=0;a<lv.slots.length;a++)for(let b=0;b<lv.slots.length;b++){if(a===b||lv.givens.includes(a)||lv.givens.includes(b))continue;
      const A=cof(lv.slots[a]),B=cof(lv.slots[b]);const ia=A.findIndex(([x,y])=>B.some(([u,v])=>u===x&&v===y));if(ia<0)continue;const ib=B.findIndex(([u,v])=>u===A[ia][0]&&v===A[ia][1]);
      const k=lv.words.findIndex((w,i)=>i!==b&&i!==a&&!lv.givens.includes(i)&&w.length===B.length&&[...w][ib]!==[...lv.words[a]][ia]);if(k>=0)return {li:li+1,a,b,k}}}return null});
   assert(cx,'crossing case');
   await jp.evaluate(l=>localStorage.setItem('katsuji-save-v1',JSON.stringify({level:l})),cx.li);await jp.goto('about:blank');await jp.goto(url+'#katsuji');
   Object.assign(lv,await jp.evaluate(l=>KATSUJI_LEVELS[l-1],cx.li));
   await selectSlot(cx.a);await jp.locator(`.kj-chip[data-i="${cx.a}"]`).click();
   await selectSlot(cx.b);await jp.locator(`.kj-chip[data-i="${cx.k}"]`).click();
   assert.equal((await jState()).p[cx.b],-1);assert.match(await jp.locator('#kj-toast').innerText(),/合いません/);
   await jp.evaluate(()=>localStorage.setItem('katsuji-save-v1',JSON.stringify({level:2})));await jp.reload();
   await jp.locator('[data-help="kj-help"]').click();assert(await jp.locator('#kj-help').isVisible());await jp.keyboard.press('Escape');
   await jp.locator('#katsuji .game-nav a').click();await jp.waitForFunction(()=>!document.getElementById('garden').hidden);assert.match(await jp.locator('#kj-resume-note').innerText(),/第二版/);
   for(const [w,h] of [[320,568],[390,844],[768,1024],[1280,720]]){await jp.setViewportSize({width:w,height:h});
    for(const l of [1,24]){await jp.evaluate(l=>localStorage.setItem('katsuji-save-v1',JSON.stringify({level:l})),l);await jp.goto('about:blank');await jp.goto(url+'#katsuji');
     assert.equal(await jp.evaluate(()=>{const v=e=>{const r=document.querySelector(e).getBoundingClientRect();return r.width>0&&r.top>=-1&&r.bottom<=innerHeight+1};return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&['#kj-grid','#kj-tray','#kj-reset','#kj-title'].every(v)}),true,`katsuji one screen ${w}x${h} ${l}`)}
    await jp.goto(url+'#garden');assert.equal(await jp.evaluate(()=>{const b=document.getElementById('kj-play').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight}),true,`katsuji garden ${w}x${h}`)}
   await jc.close();}
  // 帳面：五つ目のスライド。ヒントを見て答えを打ち込み、合っていればペンで書き込まれる
  {const nc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await nc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   const np=await nc.newPage();np.on('pageerror',e=>errors.push(e.message));
   await np.goto(url);for(let k=0;k<4;k++)await np.locator('#slide-next').click();
   assert.equal(await np.evaluate(()=>document.documentElement.dataset.world),'chomen');
   await np.locator('#cm-play').click();await np.waitForFunction(()=>location.hash==='#chomen'&&!document.getElementById('chomen').hidden);
   const nState=()=>np.evaluate(()=>JSON.parse(localStorage.getItem('chomen-save-v1')));
   const lv=await np.evaluate(()=>CHOMEN_LEVELS[0]);assert(await np.locator('#cm-coach').isVisible());
   const pick=async e=>{const want=(e.d==='a'?'ヨコ':'タテ')+' '+e.n;for(let k=0;k<2;k++){await np.locator(`.cm-cell[data-x="${e.x}"][data-y="${e.y}"]`).click();if(await np.locator('#cm-clue-no').innerText()===want)return}throw new Error('clue '+want)};
   const e0=lv.entries[0];await pick(e0);
   // 文字数が違うと、書き損じにはならず文字数を案内する
   await np.locator('#cm-input').fill('あ');await np.locator('#cm-write').click();assert.match(await np.locator('#cm-note').innerText(),/文字で/);assert.equal((await nState()).miss,0);
   // 違う答えは書き損じ
   const wrong=[...e0.a].map(()=>'あ').join('');await np.locator('#cm-input').fill(wrong===e0.a?[...e0.a].map(()=>'い').join(''):wrong);await np.locator('#cm-write').click();assert.equal((await nState()).miss,1);
   // カタカナで書いても正解になる
   const kata=e0.a.replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
   await np.locator('#cm-input').fill(kata);await np.locator('#cm-write').click();assert.equal((await nState()).done[0],true);
   for(const e of lv.entries.slice(1)){await pick(e);await np.locator('#cm-input').fill(e.a);await np.locator('#cm-write').click()}
   await np.locator('#cm-done.show').waitFor();assert.equal((await nState()).solved,true);assert.match(await np.locator('#cm-done-note').innerText(),/書き損じ 1回/);
   await np.reload();await np.locator('#cm-done.show').waitFor();
   await np.locator('#cm-next').click();assert.equal((await nState()).level,2);assert.equal(await np.locator('#cm-coach').isVisible(),false);
   await np.locator('[data-help="cm-help"]').click();assert(await np.locator('#cm-help').isVisible());await np.keyboard.press('Escape');
   await np.locator('#chomen .game-nav a').click();await np.waitForFunction(()=>!document.getElementById('garden').hidden);assert.match(await np.locator('#cm-resume-note').innerText(),/二ページ目/);
   for(const [w,h] of [[320,568],[390,844],[768,1024],[1280,720]]){await np.setViewportSize({width:w,height:h});
    for(const l of [1,20]){await np.evaluate(l=>localStorage.setItem('chomen-save-v1',JSON.stringify({level:l})),l);await np.goto('about:blank');await np.goto(url+'#chomen');
     assert.equal(await np.evaluate(()=>{const v=e=>{const r=document.querySelector(e).getBoundingClientRect();return r.width>0&&r.top>=-1&&r.bottom<=innerHeight+1};return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&['#cm-grid','#cm-input','#cm-write','#cm-reset','#cm-title'].every(v)}),true,`chomen one screen ${w}x${h} ${l}`)}
    await np.goto(url+'#garden');assert.equal(await np.evaluate(()=>{const b=document.getElementById('cm-play').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight}),true,`chomen garden ${w}x${h}`)}
   await nc.close();}
  // 新しい遊びに共通の確認：スライドで選べる・遊び方・続きの案内・一画面・ライト/ダークでの文字の見やすさ
  async function commonChecks({id,pre,bg,maxLevel,resume,play}){
   const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   const pg=await ctx.newPage();pg.on('pageerror',e=>errors.push(e.message));
   await pg.goto(url);const order=await pg.evaluate(()=>[...document.querySelectorAll('.slide-dot')].map(d=>d.dataset.world));
   for(let k=0;k<order.indexOf(id);k++)await pg.locator('#slide-next').click();
   assert.equal(await pg.evaluate(()=>document.documentElement.dataset.world),id);assert(await pg.locator(`#${pre}-play`).isVisible());
   assert(await pg.locator(`.slide-dot[data-world="${id}"]`).isVisible(),`${id} dot visible`);
   await play(pg);
   await pg.locator(`[data-help="${pre}-help"]`).click();assert(await pg.locator(`#${pre}-help`).isVisible());await pg.keyboard.press('Escape');
   await pg.locator(`#${id} .game-nav a`).click();await pg.waitForFunction(()=>!document.getElementById('garden').hidden);
   assert.match(await pg.locator(`#${pre}-resume-note`).innerText(),resume);
   for(const [w,h] of [[320,568],[390,844],[768,1024],[1280,720]]){await pg.setViewportSize({width:w,height:h});
    for(const l of [1,maxLevel]){await pg.evaluate(([k,l])=>localStorage.setItem(k,JSON.stringify({level:l})),[id+'-save-v1',l]);await pg.goto('about:blank');await pg.goto(url+'#'+id);
     assert.equal(await pg.evaluate(()=>{const scr=document.querySelector('.game-screen:not([hidden])');const v=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1};
       return document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1&&v(scr.querySelector('h1'))&&v(scr.querySelector('.stage'))&&(()=>{const btns=[...scr.querySelectorAll('.foot .g-btn')].filter(e=>e.getClientRects().length);return btns.length>0&&btns.every(v)})()}),true,`${id} one screen ${w}x${h} ${l}`)}
    await pg.goto(url+'#garden');assert.equal(await pg.evaluate(p=>{const b=document.getElementById(p+'-play').getBoundingClientRect();return document.documentElement.scrollHeight<=innerHeight+1&&b.bottom<=innerHeight},pre),true,`${id} garden ${w}x${h}`)}
   await ctx.close();
   for(const colorScheme of ['light','dark']){const cc=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',colorScheme});await cc.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    const cp=await cc.newPage();await cp.goto(url);await cp.evaluate(([w,k])=>{localStorage.setItem('hirameki-world',w);localStorage.setItem(k,JSON.stringify({level:1}))},[id,id+'-save-v1']);await cp.goto('about:blank');await cp.goto(url+'#'+id);
    assert.equal(await cp.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),bg,`${id} bg ${colorScheme}`);
    const ratios=await cp.evaluate(p=>{const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=c=>{const v=rgb(c).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
      const probe=document.createElement('i');probe.style.color='var(--bg)';document.body.appendChild(probe);const bg=getComputedStyle(probe).color;probe.remove();
      const scr=document.getElementById(p.id),els=[scr.querySelector('h1'),scr.querySelector('.g-level b'),scr.querySelector('.g-level span'),scr.querySelector('.coach'),scr.querySelector('.g-stat'),scr.querySelector('.foot .g-btn')];
      return els.map(e=>{const a=lum(getComputedStyle(e).color),b=lum(bg);return [e.className||e.tagName,+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)]})},{id});
    for(const [sel,r] of ratios)assert(r>=4.5,`${colorScheme} ${id} ${sel} ${r}`);
    await cp.goto('about:blank');await cp.goto(url);
    const gr=await cp.evaluate(p=>{const rgb=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=c=>{const v=rgb(c).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
      const probe=document.createElement('i');probe.style.color='var(--bg)';document.body.appendChild(probe);const bg=getComputedStyle(probe).color;probe.remove();
      return ['#garden-title','.garden-copy',`#${p}-collection-title`,`.game-card:not([hidden]) .game-subtitle`,'.slide-dot[aria-current="true"]'].map(q=>{const e=document.querySelector(q),a=lum(getComputedStyle(e).color),b=lum(bg);return [q,+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)]})},pre);
    for(const [sel,r] of gr)assert(r>=4.5,`${colorScheme} ${id} garden ${sel} ${r}`);
    await cc.close()}
  }
  // 秘密箱：最短手順どおりにキーボードで動かすと、最短手数で箱が開く
  await commonChecks({id:'himitsu',pre:'hm',bg:'#2b1a10',maxLevel:20,resume:/二の箱/,play:async pg=>{
   await pg.locator('#hm-play').click();await pg.waitForFunction(()=>location.hash==='#himitsu');
   const st=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('himitsu-save-v1')));
   const lv=await pg.evaluate(()=>HIMITSU_LEVELS[0]);assert(await pg.locator('#hm-coach').isVisible());assert.equal(await pg.locator('.hm-piece.guide').count(),1);
   // ドラッグで一手動かして、一手戻す
   const [gi,gx,gy]=lv.path[0],pb=await pg.locator(`.hm-piece[data-i="${gi}"]`).boundingBox(),cell=(await pg.locator('#hm-board').boundingBox()).width/lv.W;
   const [ox,oy]=[lv.pieces[gi][0],lv.pieces[gi][1]];await pg.mouse.move(pb.x+pb.width/2,pb.y+pb.height/2);await pg.mouse.down();
   await pg.mouse.move(pb.x+pb.width/2+(gx-ox)*cell,pb.y+pb.height/2+(gy-oy)*cell,{steps:8});await pg.mouse.up();
   assert.deepEqual((await st()).pos[gi],[gx,gy]);assert.equal((await st()).moves,1);
   await pg.locator('#hm-undo').click();assert.deepEqual((await st()).pos[gi],[ox,oy]);assert.equal((await st()).moves,0);
   // ぶつかる向きには動かない
   const pos=lv.pieces.map(p=>[p[0],p[1]]);
   for(const [i,x,y] of lv.path){const key={[String([1,0])]:'ArrowRight',[String([-1,0])]:'ArrowLeft',[String([0,1])]:'ArrowDown',[String([0,-1])]:'ArrowUp'}[String([Math.sign(x-pos[i][0]),Math.sign(y-pos[i][1])])];
     await pg.locator(`.hm-piece[data-i="${i}"]`).focus();for(let k=0;k<Math.abs(x-pos[i][0])+Math.abs(y-pos[i][1]);k++)await pg.keyboard.press(key);pos[i]=[x,y]}
   await pg.locator('#hm-done.show').waitFor();assert.equal((await st()).moves,lv.min);assert.match(await pg.locator('#hm-done-note').innerText(),/最短で開けました/);
   await pg.reload();await pg.locator('#hm-done.show').waitFor();
   await pg.locator('#hm-next').click();assert.equal((await st()).level,2);assert.equal(await pg.locator('#hm-coach').isVisible(),false);
   // 壊れた保存（重なる配置）は最初の配置に戻す
   await pg.evaluate(()=>localStorage.setItem('himitsu-save-v1',JSON.stringify({level:2,pos:[[0,0],[0,0]],moves:5})));await pg.reload();
   assert.equal((await st()).moves,0);
   await pg.evaluate(()=>localStorage.setItem('himitsu-save-v1',JSON.stringify({level:2})));await pg.reload();
  }});
  // 染め分け：注げない所は注がず、最短手順どおりに注ぐと最短手数でそろう
  await commonChecks({id:'somewake',pre:'sw',bg:'#233a63',maxLevel:20,resume:/二の甕/,play:async pg=>{
   await pg.locator('#sw-play').click();await pg.waitForFunction(()=>location.hash==='#somewake');
   const st=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('somewake-save-v1')));const bot=i=>pg.locator('.sw-bottle').nth(i);
   const lv=await pg.evaluate(()=>SOMEWAKE_LEVELS[0]);assert(await pg.locator('#sw-coach').isVisible());assert.equal(await pg.locator('.sw-bottle.guide').count(),1);
   // いっぱいの瓶には注げない
   await bot(0).click();assert.equal(await pg.locator('.sw-bottle.lift').count(),1);await bot(1).click();assert.equal((await st()).moves,0);assert.match(await pg.locator('#sw-live').innerText(),/いっぱい/);
   await bot(1).click();assert.equal(await pg.locator('.sw-bottle.lift').count(),0);
   // 一手注いで、一手戻す
   await bot(lv.path[0][0]).click();await bot(lv.path[0][1]).click();assert.equal((await st()).moves,1);assert.notDeepEqual((await st()).b,lv.bottles);
   await pg.locator('#sw-undo').click();assert.deepEqual((await st()).b,lv.bottles);
   for(const [a,b] of lv.path){await bot(a).click();await bot(b).click()}
   await pg.locator('#sw-done.show').waitFor();assert.equal((await st()).moves,lv.min);assert.match(await pg.locator('#sw-done-note').innerText(),/最短で染め分けました/);
   await pg.reload();await pg.locator('#sw-done.show').waitFor();
   await pg.locator('#sw-next').click();assert.equal((await st()).level,2);assert.equal(await pg.locator('#sw-coach').isVisible(),false);
   // 壊れた保存（色の数が合わない）は最初の配置に戻す
   await pg.evaluate(()=>localStorage.setItem('somewake-save-v1',JSON.stringify({level:2,b:['AAAA','',''],moves:5})));await pg.reload();
   assert.equal((await st()).moves,0);assert.deepEqual((await st()).b,await pg.evaluate(()=>SOMEWAKE_LEVELS[1].bottles));
  }});
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
   await cp.evaluate(()=>{localStorage.setItem('hirameki-world','kagee');localStorage.setItem('kagee-save-v1',JSON.stringify({level:1}))});await cp.goto('about:blank');await cp.goto(url+'#kagee');
   assert.equal(await cp.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#22080d',`kagee bg ${colorScheme}`);
   for(const [sel,ratio] of await contrastOf(cp,['#kg-title','.kg-level b','.kg-level span','#kg-coach','.kg-stat','#kg-reset']))assert(ratio>=4.5,`${colorScheme} kagee ${sel} ${ratio}`);
   await cp.evaluate(()=>{localStorage.setItem('hirameki-world','katsuji');localStorage.setItem('katsuji-save-v1',JSON.stringify({level:1}))});await cp.goto('about:blank');await cp.goto(url+'#katsuji');
   assert.equal(await cp.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#161412',`katsuji bg ${colorScheme}`);
   for(const [sel,ratio] of await contrastOf(cp,['#kj-title','.kj-level b','.kj-level span','#kj-coach','.kj-stat','#kj-reset']))assert(ratio>=4.5,`${colorScheme} katsuji ${sel} ${ratio}`);
   await cp.goto('about:blank');await cp.goto(url);
   for(const [sel,ratio] of await contrastOf(cp,['#garden-title','.garden-copy','#kj-collection-title','[data-world="katsuji"] .game-subtitle','[data-world="katsuji"] .story-copy','.slide-dot[aria-current="true"]']))assert(ratio>=4.5,`${colorScheme} katsuji garden ${sel} ${ratio}`);
   await cp.evaluate(()=>{localStorage.setItem('hirameki-world','chomen');localStorage.setItem('chomen-save-v1',JSON.stringify({level:1}))});await cp.goto('about:blank');await cp.goto(url+'#chomen');
   assert.equal(await cp.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()),'#f6f8fa',`chomen bg ${colorScheme}`);
   for(const [sel,ratio] of await contrastOf(cp,['#cm-title','.cm-level b','.cm-level span','#cm-coach','#cm-clue','.cm-stat','#cm-reset']))assert(ratio>=4.5,`${colorScheme} chomen ${sel} ${ratio}`);
   await cp.goto('about:blank');await cp.goto(url);
   for(const [sel,ratio] of await contrastOf(cp,['#garden-title','.garden-copy','#cm-collection-title','[data-world="chomen"] .game-subtitle','[data-world="chomen"] .story-copy','.slide-dot[aria-current="true"]']))assert(ratio>=4.5,`${colorScheme} chomen garden ${sel} ${ratio}`);
   await cp.evaluate(()=>localStorage.setItem('hirameki-world','kagee'));
   await cp.goto('about:blank');await cp.goto(url);
   for(const [sel,ratio] of await contrastOf(cp,['#garden-title','.garden-copy','#kg-collection-title','[data-world="kagee"] .game-subtitle','[data-world="kagee"] .story-copy','#kg-play-label','.slide-dot[aria-current="true"]']))assert(ratio>=4.5,`${colorScheme} kagee garden ${sel} ${ratio}`);
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
  console.log('合格：タイトル遷移、回転、戻す、固定、保存復元、旧形式保存、完成、次の器、初期化確認、4画面幅、最大盤面、オフライン、オープニング（開いた時だけ・スキップ・Esc・画面幅）、星図（スライド切替・世界観・結ぶ・戻す・線タップ・キーボード・完成・保存・最大盤面・画面幅・ライト/ダークでの文字の見やすさ）、ゲーム画面の一画面表示（6画面サイズ・最大盤面）、遊び方の案内、最初の面の手ほどき、影絵（スライド・ドラッグ・キーボード・完成・保存・次の幕・一画面・見やすさ）、活字（スライド・はめる・外す・戻す・食い違いの拒否・完成と合言葉・保存・次の版・一画面・見やすさ）、帳面（スライド・ヒント・文字数の案内・書き損じ・カタカナ入力・完成・保存・次のページ・一画面・見やすさ）、秘密箱（ドラッグ・戻す・最短手順で完成・保存・壊れた保存・次の箱・一画面・見やすさ）、染め分け（注げない瓶・注ぐ・戻す・最短手順・保存・壊れた保存・一画面・文字の見やすさ）、実行エラーなし');
 } finally {if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
