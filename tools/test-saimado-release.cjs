/* 公開前の全関連回帰を実行し、製品のハッシュと終了コードを固定する。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/evidence/saimado-publication-20261108');fs.mkdirSync(out,{recursive:true});
const runtime=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/saimado-20261108/final-execution.json'),'utf8')).hashes;
for(const x of runtime)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x.path))).digest('hex')!==x.sha256)throw Error('承認時点との不一致: '+x.path);
const results=[];
function run(file){return new Promise(resolve=>{const started=new Date().toISOString(),log=fs.createWriteStream(path.join(out,file.replaceAll('/','-')+'.log')),child=spawn(process.execPath,[file],{cwd:root,env:{...process.env,TEST_BROWSER_CHANNEL:'msedge'},stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('close',code=>{log.end();results.push({command:'node '+file,exitCode:code,started,finished:new Date().toISOString()});console.log(file,code);resolve(code)});child.on('error',e=>{log.write(e.message);resolve(-1)})})}
(async()=>{if(await run('tools/build-migration.cjs')!==0)throw Error('ビルド失敗');
 const groups=[['test-saimado-unit.cjs','test-migration-unit.cjs','test-saimado.cjs','test-saimado-upgrade.cjs','test-migration.cjs'],['test.cjs','test-riddle.cjs','test-riddle-reverse.cjs','test-chomen.cjs'],['test-migration-audit.cjs','test-sw-response-boundary.cjs']];
 await Promise.all(groups.map(async files=>{for(const file of files)if(await run(file)!==0)break}));
 for(const x of runtime)if(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x.path))).digest('hex')!==x.sha256)throw Error('検証中の製品変更: '+x.path);
 const report={date:new Date().toISOString(),branch:'feat/saimado-region-20261108',base:'ba4a28466f2176f57f1f4036bcad0027add252e2',approval:'2026-11-08T12:56:30Z 利用者「公開して」',results,hashes:runtime,android:'未確認',profile:'一時Edge・合成データのみ'};
 fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify(report,null,2));if(results.length!==12||results.some(r=>r.exitCode!==0))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
