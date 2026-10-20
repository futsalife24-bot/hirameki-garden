/* PagesのHTML正規化を再現し、一時ブラウザだけでoffline応答を検証する。 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const dir=path.join(__dirname,'dist/new'),results=[];let browser;const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/migration.html'||p==='/index.html'){res.writeHead(308,{Location:p==='/index.html'?'/':'/migration'}).end();return}
 const rel=p==='/migration'?'/migration.html':p==='/'?'/index.html':p,f=path.resolve(dir,'.'+rel);if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});res.end(e?'見つかりません':b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{browser=await chromium.launch({headless:true,channel:'msedge'});const origin=process.env.PRODUCTION_REDIRECT_URL||'http://127.0.0.1:'+server.address().port;
  for(const target of ['/index.html','/migration.html','/migration']){const ctx=await browser.newContext({reducedMotion:'reduce'});await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());const page=await ctx.newPage();let cached;
   try{await page.goto(origin+'/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    cached=await page.evaluate(async()=>{const version=(await(await fetch('/sw.js')).text()).match(/const VERSION = '([^']+)'/)[1],c=await caches.open(version);return Promise.all(['./index.html','./migration.html'].map(async p=>{const r=await c.match(p);return {path:p,redirected:r?.redirected,url:r?.url,status:r?.status}}))});
    const selector=target==='/index.html'?'#garden':'#export';
    await ctx.setOffline(true);await page.goto(origin+target);assert.equal(await page.locator(selector).count(),1);
    await ctx.setOffline(false);await page.reload();await ctx.setOffline(true);await page.reload();assert.equal(await page.locator(selector).count(),1);
    results.push({target,status:'合格',cached,offlineAfterOnline:true});
   }catch(e){results.push({target,status:'不合格',error:e.message,cached})}finally{await ctx.close()}console.log(JSON.stringify(results.at(-1)));
  }
  const report={date:new Date().toISOString(),origin,results};fs.mkdirSync(path.join(__dirname,'docs/reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'docs/reports',process.env.REDIRECT_REPORT||'pages-redirect-results.json'),JSON.stringify(report,null,2));if(results.some(r=>r.status==='不合格'))process.exitCode=1;
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
