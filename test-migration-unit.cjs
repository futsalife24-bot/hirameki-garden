/* 保存の境界を、メモリー上の合成データだけで検証する。 */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const box={window:null};box.window=box;vm.createContext(box);
for(const w of ['hoshizu','katsuji','chomen','himitsu','somewake','sangaku'])vm.runInContext(fs.readFileSync(w+'-levels.js','utf8'),box);
delete box.window;vm.runInContext(fs.readFileSync('migration-data.js','utf8'),box);
const B=box.HiramekiBackup,map=new Map(),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
const a=B.api(store),empty=a.snapshot();assert.equal(Object.keys(empty.data).length,25);
for(const k of B.keys){const bad=structuredClone(empty);bad.data[k]='不正';assert.throws(()=>B.validate(bad))}
assert.equal(map.size,0);a.import(empty);assert.equal(map.size,1);
const previous=map.get(B.capsule);const broken=B.api({getItem:store.getItem,setItem(){throw Error('合成保存失敗')}});assert.throws(()=>broken.import(empty));assert.equal(map.get(B.capsule),previous);
const stale=B.api(store);a.import({...empty,createdAt:'2026-10-20T00:00:00Z'});assert.throws(()=>stale.set('kintsugi-sound','0'));assert.equal(map.size,1);
const unknown=structuredClone(empty);unknown.data['furo-save-v1']='{}';assert.throws(()=>B.validate(unknown));
console.log('合格：全25項目の不正値拒否、空保存、既存capsuleの保存失敗時保持、別画面の古い保存拒否、未公開作品の混入拒否');
