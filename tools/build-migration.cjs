/* 配布先は分離し、旧サブパス用成果物へ新版の設定を混ぜない。 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const games=['hoshizu','kagee','katsuji','chomen','himitsu','somewake','sangaku'];
const levels=games.filter(w=>w!=='kagee').map(w=>w+'-levels.js');
const shared=['migration.html','migration-data.js','migration-ui.js',...levels];
const app=['index.html','404.html','garden.css','ceramic.js','opening.js','opening.css','garden.js','sw.js','manifest.webmanifest',...games.flatMap(w=>[w+'.js',w+'.css'])];
fs.mkdirSync(out,{recursive:true});
if(!fs.realpathSync(out).startsWith(fs.realpathSync(root)+path.sep))throw Error('出力先が作業場所の外です。');
for(const mode of ['new','legacy']){
 const dir=path.join(out,mode);
 // 前回の出力を削除せず同じdist内へ退避し、空の配布先から生成する。
 if(fs.existsSync(dir)){
  const saved=path.join(out,mode+'-previous-'+require('node:crypto').randomUUID());
  if(fs.lstatSync(dir).isSymbolicLink()||!fs.realpathSync(dir).startsWith(fs.realpathSync(out)+path.sep)||!path.resolve(saved).startsWith(path.resolve(out)+path.sep))throw Error('出力先の境界を確認できません。');
  fs.renameSync(dir,saved);
 }
 fs.mkdirSync(dir);
 for(const name of [...shared,...(mode==='new'?app:[])])fs.copyFileSync(path.join(root,name),path.join(dir,name));
 if(mode==='new'){
  fs.mkdirSync(path.join(dir,'icons'));
  for(const name of ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'])fs.copyFileSync(path.join(root,'icons',name),path.join(dir,'icons',name));
 }
 if(mode==='legacy'){
  let html=fs.readFileSync(path.join(root,'migration.html'),'utf8');
  html=html.replace('<html lang="ja">','<html lang="ja" data-migration-mode="export-only">').replace('旧版から JSON を書き出し、新版で読み込んでください。元の保存内容は消しません。','この旧版はデータ書き出し用です。元の保存内容を保持しています。');
  fs.writeFileSync(path.join(dir,'index.html'),html);
  fs.writeFileSync(path.join(dir,'migration.html'),html);
  // 旧SWに移行画面を渡す。登録解除・cache削除は一切しない。
  fs.writeFileSync(path.join(dir,'sw.js'),`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));\nself.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));\n`);
 }
}
console.log('新版 dist/new と旧移行版 dist/legacy を作成しました。未公開です。');
