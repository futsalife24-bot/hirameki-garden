// 帳面の追加問題と保存互換を、独立したヘッドレスブラウザで確認する。
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm'),http=require('node:http'),crypto=require('node:crypto');
const ROOT=__dirname,OUT=path.join(ROOT,'test-results','chomen');
const readLevels=source=>{const context={window:{}};vm.runInNewContext(source,context);return JSON.parse(JSON.stringify(context.window.CHOMEN_LEVELS))};
const source=fs.readFileSync(path.join(ROOT,'chomen-levels.js'),'utf8'),levels=readLevels(source);
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// main c9bac0690d98f1b4991301f8468c8fbc14d93961 の既存20ページ。
assert.equal(digest(levels.slice(0,20)),'e56e8d17575f39336c02a1c96c470ffad3fc82c628cc0fb8cd075cd88019976e','既存20ページの内容・順序');
assert.equal(levels.length,28);
const clues=require('./tools/chomen-challenge-clues.cjs'),metrics=[];
const positions=e=>[...e.a].map((_,i)=>[e.x+(e.d==='a'?i:0),e.y+(e.d==='d'?i:0)]);
for(const [i,L] of levels.entries()){
  const width=L.rows[0].length,height=L.rows.length,coverage=new Map();
  assert(L.rows.every(row=>row.length===width));
  const starts=[...new Set(L.entries.map(e=>e.y*100+e.x))].sort((a,b)=>a-b);
  for(const e of L.entries){
    assert.match(e.a,/^[ぁ-ん]+$/);assert.equal(e.n,starts.indexOf(e.y*100+e.x)+1);
    positions(e).forEach(([x,y],k)=>{assert.equal(L.rows[y]?.[x],e.a[k],`ページ${i+1} ${e.a}`);const key=x+','+y;const old=coverage.get(key)||[];assert(!old.some(p=>p.d===e.d));old.push(e);coverage.set(key,old)});
    const dx=e.d==='a'?1:0,dy=e.d==='d'?1:0;
    assert([undefined,'.'].includes(L.rows[e.y-dy]?.[e.x-dx]),'語の前の境界');
    assert([undefined,'.'].includes(L.rows[e.y+dy*e.a.length]?.[e.x+dx*e.a.length]),'語の後の境界');
    if(i>=20)assert.equal(e.c,clues[L.theme][e.a]);
  }
  const white=[];L.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')white.push(x+','+y)}));
  assert.deepEqual([...coverage.keys()].sort(),white.sort(),'全白マスを語が覆う');
  const seen=new Set([white[0]]),queue=[white[0]];
  while(queue.length){const [x,y]=queue.pop().split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=(x+dx)+','+(y+dy);if(coverage.has(next)&&!seen.has(next)){seen.add(next);queue.push(next)}}}
  assert.equal(seen.size,white.length,'盤が一つにつながる');
  if(i>=20){
    assert(width<=11&&height<=11);assert.equal(L.entries.length,i<24?10:12);
    assert.equal(new Set(L.entries.map(e=>e.a)).size,L.entries.length);
    for(const e of L.entries)assert(positions(e).some(([x,y])=>coverage.get(x+','+y).length===2),'全ての語が交差');
    const earlier=levels.slice(20,i).filter(p=>p.theme===L.theme).flatMap(p=>p.entries.map(e=>e.a));
    const repeated=L.entries.filter(e=>earlier.includes(e.a)).length;assert(repeated<=4);
    metrics.push({page:i+1,theme:L.theme,width,height,words:L.entries.length,repeated,crossings:[...coverage.values()].filter(v=>v.length===2).length});
  }
}
fs.mkdirSync(OUT,{recursive:true});
let legacy=false;
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html');
  const file=path.resolve(ROOT,'.'+rel);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{
    if(!err&&legacy&&rel==='/chomen-levels.js')data='window.CHOMEN_LEVELS='+JSON.stringify(levels.slice(0,20))+';';
    if(!err&&legacy&&rel==='/sw.js')data=data.toString().replace('hirameki-v16','hirameki-v15');
    res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(err?'':data);
  });
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{}),...(process.env.TEST_BROWSER_PATH?{executablePath:process.env.TEST_BROWSER_PATH}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/`;
    const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('chomen-save-v1')));
    const load=async(number,saved={})=>{
      await page.evaluate(({number,saved})=>localStorage.setItem('chomen-save-v1',JSON.stringify({level:number,...saved})),{number,saved});
      await page.reload();await page.locator('#chomen:not([hidden])').waitFor();
    };
    const answer=async(L,k,kata=false)=>{
      const e=L.entries[k];assert.equal(await page.locator('#cm-clue-no').innerText(),`${e.d==='a'?'ヨコ':'タテ'} ${e.n}`);
      const value=kata?e.a.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)):e.a;
      await page.locator('#cm-input').fill(' '+value+'　');await page.locator('#cm-write').click();assert.equal((await state()).done[k],true);
    };
    // 旧版のSWと保存を持つ端末が、20ページ目の途中から更新しても失わない。
    legacy=true;await page.goto(url+'#garden');for(let k=0;k<4;k++)await page.locator('#slide-next').click();await page.locator('#cm-play').click();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready});
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(()=>CHOMEN_LEVELS.length),20);
    const oldDone=levels[19].entries.map((_,i)=>i<3),best={'1':2,'20':4};
    await page.evaluate(best=>localStorage.setItem('chomen-best',JSON.stringify(best)),best);
    await load(20,{done:oldDone,miss:2,solved:false});
    legacy=false;
    await page.evaluate(async()=>{const old=navigator.serviceWorker.controller;const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));const registration=await navigator.serviceWorker.getRegistration();await registration.update();if(navigator.serviceWorker.controller===old)await changed});
    await page.waitForFunction(async()=>(await caches.keys()).includes('hirameki-v16')&&!(await caches.keys()).includes('hirameki-v15'));
    await page.reload();await page.locator('#chomen:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>CHOMEN_LEVELS.length),28);assert.deepEqual((await state()).done,oldDone);assert.equal((await state()).miss,2);
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('chomen-best'))),best);
    console.log('旧20ページ・SW更新・保存互換を確認');
    for(let k=3;k<levels[19].entries.length;k++)await answer(levels[19],k);
    await page.locator('#cm-done.show').waitFor();await page.locator('#cm-next').click();assert.equal((await state()).level,21);
    for(let number=21;number<=28;number++){
      const L=levels[number-1];assert.equal((await state()).level,number);
      if(number===21){
        await page.locator('#cm-input').fill('あ');await page.locator('#cm-write').click();assert.equal((await state()).miss,0);assert.match(await page.locator('#cm-note').innerText(),/文字で/);
        await page.locator('#cm-input').fill('あ'.repeat(L.entries[0].a.length));await page.locator('#cm-write').click();assert.equal((await state()).miss,1);
      }
      for(let k=0;k<L.entries.length;k++){
        await answer(L,k,number===22);
        if(number===21&&k===2){
          const before=await state();await page.reload();await page.locator('#chomen:not([hidden])').waitFor();assert.deepEqual(await state(),before);
          await page.locator('#chomen .game-nav a').click();await page.locator('#cm-play').waitFor();assert.match(await page.locator('#cm-resume-note').innerText(),/二十一ページ目/);
          await page.locator('#cm-play').click();assert.deepEqual(await state(),before);
        }
      }
      await page.locator('#cm-done.show').waitFor();assert((await state()).solved);
      await page.reload();await page.locator('#cm-done.show').waitFor();assert((await state()).solved);
      await page.locator('#cm-next').click();assert.equal((await state()).level,number===28?1:number+1);
      console.log(`${number}ページ目の全解答・保存・次ページを確認`);
    }
    // 全発展ページの全ヒントを、狭いスマホを含む4サイズで表示する。
    let checks=0;
    for(const [width,height] of [[320,568],[390,844],[768,1024],[1280,720]]){
      await page.setViewportSize({width,height});
      for(let number=21;number<=28;number++){
        await load(number);
        for(let k=0;k<levels[number-1].entries.length;k++){
          const layout=await page.evaluate(()=>{
            const visible=s=>{const r=document.querySelector(s).getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1};
            const text=document.querySelector('.cm-clue-text');
            return {fits:document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1&&['#cm-title','#cm-clue','#cm-grid','#cm-input','#cm-write','#cm-reset'].every(visible),clueFits:text.scrollWidth<=text.clientWidth+1,cell:document.querySelector('.cm-cell').getBoundingClientRect().width};
          });
          assert(layout.fits&&layout.clueFits,`ページ${number} ヒント${k} ${width}x${height}: ${JSON.stringify(layout)}`);checks++;
          if(number===28&&k===0&&(width===320||width===1280))await page.screenshot({path:path.join(OUT,`page28-${width}.png`)});
          await page.locator('#cm-next-clue').click();
        }
      }
      console.log(`${width}x${height} 全追加ヒントの表示を確認`);
    }
    // 更新後の新ページと途中保存がオフラインでも読める。
    await load(28);await answer(levels[27],0);const beforeOffline=await state();
    await context.setOffline(true);await page.reload();await page.locator('#chomen:not([hidden])').waitFor();
    assert.equal(await page.evaluate(()=>CHOMEN_LEVELS.length),28);assert.deepEqual(await state(),beforeOffline);
    await answer(levels[27],1,true);await context.setOffline(false);
    assert.deepEqual(errors,[]);await context.close();
    const report={legacySha256:digest(levels.slice(0,20)),pages:levels.length,newPages:metrics,clueViewportChecks:checks,saveResume:true,oldServiceWorkerUpgrade:true,offline:true,javascriptErrors:errors};
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
