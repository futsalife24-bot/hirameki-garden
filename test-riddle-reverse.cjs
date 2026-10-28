// 反対向きで揃う既存不具合をv5で再現し、v6で判定・向き・保存を検証。
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
(async()=>{const root=__dirname,dist=path.join(root,'dist/new'),out=path.join(root,'test-results/riddle-reverse');fs.mkdirSync(out,{recursive:true});
 let old=true;const baseline=Object.fromEntries(['riddle.js','sw.js'].map(n=>[n,execFileSync('git',['show',`dc2b6b4e8f507ee74da815056c6cbd41330cec3f:${n}`])]));
 const server=http.createServer((req,res)=>{const file=path.resolve(dist,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(dist+path.sep))return res.writeHead(403).end();const send=(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'text/plain'});res.end(e?'':b)};if(old&&baseline[path.basename(file)])send(null,baseline[path.basename(file)]);else fs.readFile(file,send)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({headless:true,channel:'msedge'});const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}/#kagee`,key='kakuree-save-v1';
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const fixture=(level,yaw,pitch=0)=>({level,yaw,pitch,moves:4,solved:false,hint:false,best:{1:3}});
  const seed=async s=>{await page.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,s]);await page.reload()};
  await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await seed(fixture(2,Math.PI-.02));assert.equal((await state()).solved,false,'v5の反対向き不正解を再現');await page.screenshot({path:path.join(out,'v5-back-unsolved.png')});
  const oldSave=await page.evaluate(()=>{localStorage.setItem('kagee-best','{"2":5}');return localStorage.getItem('kagee-best')});
  old=false;await page.evaluate(async()=>{const changed=new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));await(await navigator.serviceWorker.getRegistration()).update();await changed});await page.reload();
  assert.equal((await state()).solved,true);assert.equal((await state()).moves,4);assert.equal((await state()).best[2],4);assert.equal((await state()).best[1],3);assert.equal((await state()).yaw,Math.PI);assert.equal(await page.evaluate(()=>localStorage.getItem('kagee-best')),oldSave);
  await page.locator('#kg-done.show').waitFor();await page.screenshot({path:path.join(out,'v6-back-solved.png')});
  const brightCenter=()=>page.evaluate(()=>{const c=document.getElementById('kg-canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let total=0,sum=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i]>200&&d[i+1]>200&&d[i+2]>200){sum+=x;total++}}return sum/total-c.width/2});
  assert(await brightCenter()>5,'月の完成絵は裏側の鏡像を保つ');await page.reload();assert.equal((await state()).solved,true);assert.equal((await state()).yaw,Math.PI);
  // 12問すべて、右回り・左回りの裏側を最後のキー操作で完成。
  for(let level=1;level<=12;level++)for(const sign of [-1,1]){
   await seed(fixture(level,sign*(Math.PI-.12)));assert.equal((await state()).solved,false);await page.locator('#kg-canvas').press(sign>0?'ArrowRight':'ArrowLeft');assert.equal((await state()).solved,true,`${level} ${sign}`);assert.equal((await state()).moves,5);assert.equal((await state()).yaw,sign*Math.PI);await page.reload();assert.equal((await state()).solved,true);console.log(`裏側確認 ${level} ${sign}`);
  }
  for(const [yaw,pitch]of [[Math.PI-.08,0],[-Math.PI+.08,0],[Math.PI,.08],[Math.PI,-.08],[0,.08],[.08,0]]){await seed(fixture(2,yaw,pitch));assert.equal((await state()).solved,false,'許容外は完成にしない')}
  for(const yaw of [0,Math.PI,-Math.PI]){await seed(fixture(2,yaw,.074));assert.equal((await state()).solved,true,'表裏とも同じ許容幅')}
  await seed(fixture(2,0));assert(await brightCenter()<-5,'表側は元の向き');
  // πの折返しと通常アニメーション。正面へ回り込まず裏のまま完成。
  await page.emulateMedia({reducedMotion:'no-preference'});await seed(fixture(2,Math.PI-.02,.09));await page.locator('#kg-canvas').press('ArrowRight');assert((await state()).yaw<0);assert.equal((await state()).solved,false);await page.locator('#kg-canvas').press('ArrowUp');assert.equal((await state()).solved,true);await page.waitForTimeout(400);assert(await brightCenter()>5);assert.equal((await state()).moves,6);
  const saved=await state();await context.setOffline(true);await page.reload();assert.deepEqual(await state(),saved);await page.locator('#kg-next').click();assert.equal((await state()).level,3);assert.equal((await state()).solved,false);await context.setOffline(false);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,baseline:'dc2b6b4e8f507ee74da815056c6cbd41330cec3f',checks:['v5の逆向き未完成を再現','v5→v6更新で4手のまま完成','12問×左右の裏側解答','表裏同じ許容幅・範囲外拒否','鏡像の向き維持','π境界と通常アニメーション','再読込・offline・次の問','旧影絵とベスト保持'],errors},null,2));console.log('合格：裏側24解答、旧版不具合再現・更新、向き保持、保存、境界、offline');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
