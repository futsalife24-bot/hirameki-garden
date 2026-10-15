'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const root=__dirname,out=path.join(root,'docs/reports/furo-20261015');fs.mkdirSync(out,{recursive:true});
const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'furo-levels.js'),'utf8'),box);
const levels=JSON.parse(JSON.stringify(box.window.FURO_LEVELS));
const report={date:new Date().toISOString(),levels:[],layouts:[],checks:[],screenshots:[],limitations:['実機スマホ・音の聴取は未確認。自動表示検査は外部フォントを遮断したフォールバック書体。']};
// 生成器の関数を使わず、全符号を整数から列挙して別に検証する。
function all(l){const a=[];for(let k=0;k<l.symbols**l.size;k++){let t=k,v=[];for(let i=0;i<l.size;i++){v.unshift(t%l.symbols);t=Math.floor(t/l.symbols)}if(new Set(v).size===l.size)a.push(v)}return a}
function agrees(v,c){const right=v.filter((x,i)=>x===c.guess[i]).length;const anywhere=new Set([...v,...c.guess]).size;return right===c.exact&&2*v.length-anywhere-right===c.near}
assert.equal(levels.length,20);
const solutions=new Set(),signatures=new Set();
for(const [i,l] of levels.entries()){
  assert([3,4].includes(l.size)&&l.symbols>=4&&l.symbols<=7);assert(l.clues.length>=2&&l.clues.length<=5);
  assert.equal(l.solution.length,l.size);assert.equal(new Set(l.solution).size,l.size);
  for(const c of l.clues){assert.equal(c.guess.length,l.size);assert.equal(new Set(c.guess).size,l.size);assert(c.guess.every(v=>Number.isInteger(v)&&v>=0&&v<l.symbols));assert(Number.isInteger(c.exact)&&Number.isInteger(c.near)&&c.exact>=0&&c.near>=0&&c.exact+c.near<=l.size)}
  const candidates=all(l),found=candidates.filter(v=>l.clues.every(c=>agrees(v,c)));
  assert.deepEqual(found,[l.solution],`第${i+1}通の唯一解`);
  for(let c=0;c<l.clues.length;c++)assert(candidates.filter(v=>l.clues.every((cl,j)=>c===j||agrees(v,cl))).length>1,`第${i+1}通の手がかり${c+1}が必要`);
  assert(!solutions.has(l.solution.join(',')));solutions.add(l.solution.join(','));
  const signature=JSON.stringify([l.symbols,l.clues]);assert(!signatures.has(signature));signatures.add(signature);
  report.levels.push({level:i+1,candidates:candidates.length,solutions:found.length,clues:l.clues.length});
}
console.log('問題20通：全候補の独立列挙で唯一解・正解一致・手がかりの必要性を確認');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'text/plain','Cache-Control':'no-cache'});res.end(e?'':b)})});
let browser,ctx;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 try{
  browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_PATH?{executablePath:process.env.TEST_BROWSER_PATH}:{})});
  ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(10000);
  const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('furo-save-v1')));
  const load=async(level,v,extra={})=>{await p.evaluate(s=>localStorage.setItem('furo-save-v1',JSON.stringify(s)),{level,v:v||Array(levels[level-1].size).fill(-1),...extra});await p.reload();await p.locator('#fr-slots button').first().waitFor()};
  const fill=async values=>{for(const [i,v] of values.entries()){await p.locator(`[data-slot="${i}"]`).tap();await p.locator(`.fr-key[data-value="${v}"]`).tap()}};
  const shot=async name=>{await p.screenshot({path:path.join(out,name)});report.screenshots.push(name)};
  const layout=async(label)=>{const bad=await p.evaluate(()=>{
    const selectors=['#furo','#fr-title','#fr-lv','#fr-size','.fr-paper','.fr-clue','#fr-entry','.fr-slot','.fr-key','#fr-message','#fr-check','#fr-next','#fr-sound','[data-help="fr-help"]'];const list=[];
    for(const sel of selectors)for(const e of document.querySelectorAll(sel)){if(!e.checkVisibility())continue;const r=e.getBoundingClientRect();if(r.width<1||r.height<1||r.top<-.5||r.left<-.5||r.bottom>innerHeight+.5||r.right>innerWidth+.5)list.push({sel,rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:[innerWidth,innerHeight]})}
    const paper=document.querySelector('.fr-paper').getBoundingClientRect(),rows=[...document.querySelectorAll('.fr-clue')];for(const row of rows){const r=row.getBoundingClientRect();if(r.top<paper.top||r.bottom>paper.bottom)list.push({sel:'手がかりが便箋の外',top:r.top,bottom:r.bottom,paper:[paper.top,paper.bottom]})}
    const level=document.querySelector('#fr-lv').getBoundingClientRect();if(level.bottom>paper.top&&level.right>paper.left)list.push({sel:'面名と便箋の重なり'});
    for(const b of document.querySelectorAll('.fr-slot,.fr-key')){const r=b.getBoundingClientRect();if(r.width<43.5||r.height<43.5)list.push({sel:'印のタッチ範囲44px未満',width:r.width,height:r.height})}
    if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)list.push({sel:'画面全体のはみ出し'});return list;
  });if(bad.length){await shot('layout-failure.png');throw new Error(`${label}: ${JSON.stringify(bad)}`)}report.layouts.push(label)};
  if(process.env.FURO_LAYOUT_ONLY==='1'){
    await p.goto(url+'#furo');for(const [width,height] of [[568,320],[844,390]]){await p.setViewportSize({width,height});for(let i=0;i<levels.length;i++){await load(i+1);await layout(`${width}x${height} 第${i+1}通`)}await shot(`game-landscape-${width}.png`)}
    fs.writeFileSync(path.join(out,'landscape-final.json'),JSON.stringify(report,null,2)+'\n');console.log('横向き40条件：面名・盤面の重なりなし、印のタッチ範囲44px以上');return;
  }
  await p.goto(url+'#garden');await p.locator('.slide-dot[data-world="furo"]').tap();await p.locator('#fr-play').waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.world),'furo');assert.equal(await p.locator('.game-card').count(),9);await shot('title-mobile.png');
  await p.locator('#fr-play').tap();await p.waitForURL('**/#furo');await p.locator('#furo').waitFor();assert.equal(await p.title(),'封蝋 — ひらめきの庭');await layout('390x844 第1通');await shot('game-first-mobile.png');
  // 未入力・重複・誤答・戻す・やり直し・保存・キーボード。
  await p.locator('#fr-check').tap();assert.equal((await state()).attempts,0);assert.match(await p.locator('#fr-message').textContent(),/空いて/);
  await fill([0,0,0]);await p.locator('#fr-check').tap();assert.equal((await state()).attempts,0);assert.match(await p.locator('#fr-message').textContent(),/一度だけ/);
  await p.locator('#fr-undo').tap();assert.equal((await state()).v[2],-1);
  await p.locator('#fr-reset').tap();assert.equal((await state()).v[0],0);await p.locator('#fr-reset').tap();assert.deepEqual((await state()).v,[-1,-1,-1]);
  await p.locator('[data-slot="0"]').focus();await p.keyboard.press('1');await p.keyboard.press('ArrowRight');await p.keyboard.press('2');await p.keyboard.press('Delete');assert.deepEqual((await state()).v,[0,-1,-1]);await p.locator('#fr-undo').tap();assert.deepEqual((await state()).v,[0,1,-1]);
  await p.reload();assert.deepEqual((await state()).v,[0,1,-1]);await p.locator('[data-help="fr-help"]').tap();assert(await p.locator('#fr-help').isVisible());await p.keyboard.press('Escape');assert(!(await p.locator('#fr-help').isVisible()));
  const sound=await p.locator('#fr-sound').getAttribute('aria-pressed');await p.locator('#fr-sound').tap();await p.reload();assert.notEqual(await p.locator('#fr-sound').getAttribute('aria-pressed'),sound);
  report.checks.push('未入力・重複は試行に数えない／戻す／二段階初期化／キーボード／保存再開／遊び方とEsc／音設定保持');
  // 全20問を誤答一つ→正解の順に、画面のタップだけで操作する。
  for(const [i,l] of levels.entries()){
    await load(i+1);const wrong=all(l).find(v=>v.join(',')!==l.solution.join(','));await fill(wrong);await p.locator('#fr-check').tap();assert.equal((await state()).solved,false);assert.equal((await state()).attempts,1);
    await fill(l.solution);await p.locator('#fr-check').tap();assert.equal((await state()).solved,true);assert.equal((await state()).attempts,2);assert(await p.locator('#fr-done').isVisible());
    if(i===19)await shot('completed-mobile.png');await p.reload();assert.equal((await state()).solved,true);await p.locator('#fr-next').tap();assert.equal((await state()).level,i===19?1:i+2);
  }
  report.checks.push('20問の誤答拒否・正解受理・完成後再読込・次の通・20→1を実タップ');console.log('全20通の誤答・正解・完成・次の通：合格');
  // 全問題の表示を5画面サイズで検査。新規ゲーム内だけにCSSが効いているかは既定テストでも確認。
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1280,720],[568,320]]){
    await p.setViewportSize({width,height});for(let i=0;i<levels.length;i++){await load(i+1);await layout(`${width}x${height} 第${i+1}通`)}
    if(width===320)await shot('game-last-small.png');if(width===1280)await shot('game-desktop.png');if(height===320)await shot('game-landscape.png');
  }
  console.log('全20通×5画面サイズ：はみ出しなし');
  await p.setViewportSize({width:390,height:844});await p.emulateMedia({colorScheme:'dark'});await load(20);await layout('dark 第20通');
  const palette=await p.evaluate(()=>({bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),paper:getComputedStyle(document.querySelector('.fr-paper')).backgroundColor}));assert.equal(palette.bg,'#302b3d');assert.equal(palette.paper,'rgb(241, 230, 210)');
  for(const raw of ['null','[]','{"level":99,"v":[9]}','{"level":"2","v":[0,1,2]}','{"level":1,"v":[0,0,0],"solved":true}','{broken']){
    await p.evaluate(v=>localStorage.setItem('furo-save-v1',v),raw);await p.reload();const s=await state();assert(s.level>=1&&s.level<=20);assert.equal(s.v.length,levels[s.level-1].size);assert.equal(s.solved,false);
  }
  // 他作品の保存キーは新作を操作しても変わらない。
  const other=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^(kintsugi|hoshizu|kagee|katsuji|chomen|himitsu|somewake|sangaku)-/.test(k)).map(k=>[k,localStorage.getItem(k)])));
  await load(1);await fill([0,1,2]);await p.locator('#fr-check').tap();await p.locator('#fr-next').tap();
  const after=await p.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(other));assert.deepEqual(after,other);
  const best=await p.evaluate(()=>JSON.parse(localStorage.getItem('furo-best')));assert.equal(best[1],1);assert.equal(best[20],2);
  await p.locator('#furo .game-nav a').tap();await p.locator('#garden').waitFor();assert.match(await p.locator('#fr-resume-note').textContent(),/第2通/);await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.world),'furo');
  await p.locator('#slide-next').tap();assert.equal(await p.evaluate(()=>document.documentElement.dataset.world),'kintsugi');await p.locator('#slide-prev').tap();assert.equal(await p.evaluate(()=>document.documentElement.dataset.world),'furo');
  report.checks.push('暗色設定／壊れた保存6種／自己ベスト更新・保持／既存8作品の保存保持／庭へ戻る・再開表示・9→1循環');
  await p.locator('#fr-play').tap();await p.locator('#furo').waitFor();await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller);
  const cached=await p.evaluate(async()=>({keys:await caches.keys(),files:await Promise.all(['./furo.js','./furo.css','./furo-levels.js'].map(async f=>!!await caches.match(f)))}));assert(cached.keys.includes('hirameki-v18'));assert(cached.files.every(Boolean));
  await ctx.setOffline(true);await p.reload();assert.equal(await p.locator('.fr-clue').count(),levels[1].clues.length);await fill(levels[1].solution);await p.locator('#fr-check').tap();assert.equal((await state()).solved,true);await p.reload();assert.equal((await state()).solved,true);await ctx.setOffline(false);
  report.checks.push('SW v18の3資産キャッシュ／オフライン再読込・正解判定・完成状態保持');assert.deepEqual(errors,[]);report.pageErrors=errors;
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('保存・互換・オフライン：合格');
 }finally{
  if(ctx)await ctx.close();if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));
 }
 console.log('封蝋：全検証とブラウザ終了が正常完了');
})().catch(e=>{console.error(e);server.closeAllConnections();server.close();process.exitCode=1});
