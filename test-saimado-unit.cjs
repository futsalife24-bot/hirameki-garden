/* 問題成立・独立判定・ヒント・引継ぎの境界を合成データで検証する。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('./saimado-core.js'),levels=require('./saimado-levels.js');
const results=[];
// ゲーム側の領域抽出・成立判定を呼ばない独立した検算。
function independent(p,cuts){const es=C.edges(p),labels=Array(p.w*p.h).fill(-1),regions=[];
 for(let at=0;at<labels.length;at++)if(labels[at]<0){const r=[at],n=regions.length;labels[at]=n;for(let i=0;i<r.length;i++)es.forEach(([a,b],j)=>{const next=a===r[i]?b:b===r[i]?a:-1;if(next>=0&&!cuts[j]&&labels[next]<0){labels[next]=n;r.push(next)}});regions.push(r)}
 if(es.some(([a,b],j)=>!!cuts[j]!== (labels[a]!==labels[b])))return false;
 for(const r of regions){const lamps=p.lights.filter(x=>r.includes(x.at));if(lamps.length!==1||lamps[0].size!==r.length)return false;for(const pair of p.pairs){if(pair.some(i=>r.includes(i))&&!pair.every(i=>r.includes(i)))return false}if(p.rects.some(i=>r.includes(i))){const xx=r.map(i=>i%p.w),yy=r.map(i=>Math.floor(i/p.w));if((Math.max(...xx)-Math.min(...xx)+1)*(Math.max(...yy)-Math.min(...yy)+1)!==r.length)return false}}
 return true;
}
assert.equal(levels.length,16);
assert.equal(new Set(levels.map(p=>JSON.stringify({w:p.w,h:p.h,lights:p.lights,pairs:p.pairs,rects:p.rects}))).size,16,'重複盤面なし');
for(const [i,p]of levels.entries()){
 assert(p.w*p.h<=20);assert.equal(p.lights.reduce((s,x)=>s+x.size,0),p.w*p.h);assert.equal(new Set(p.lights.map(x=>x.at)).size,p.lights.length);
 const s=C.solve(p),cuts=C.cutsFor(p,s.solutions[0]);assert.equal(s.solutions.length,1,p.name);assert(independent(p,cuts));assert(C.check(p,cuts).solved);
 if(i<3){let count=0;for(let bits=0;bits<2**cuts.length;bits++){const attempt=cuts.map((_,j)=>(bits>>>j)&1);const actual=independent(p,attempt);assert.equal(C.check(p,attempt).solved,actual);if(actual)count++}assert.equal(count,1)}
 if(p.pairs.length)assert.equal(C.solve({...p,pairs:[]}).solutions.length,2,'対の条件が必要');if(p.rects.length)assert.equal(C.solve({...p,rects:[]}).solutions.length,2,'長方形の条件が必要');
 for(let changed=0;changed<cuts.length;changed++){const attempt=[...cuts];attempt[changed]^=1;assert(!independent(p,attempt));const h=C.hint(p,attempt);assert.equal(h.edge,changed);assert.equal(+h.cut,cuts[changed])}
 const current=cuts.map(()=>0);for(let guard=0;guard<cuts.length;guard++){const h=C.hint(p,current);if(!h)break;current[h.edge]=+h.cut}assert.deepEqual(current,cuts);
 results.push({level:i+1,name:p.name,size:`${p.w}×${p.h}`,solutions:1,candidateCounts:s.candidateCounts,searchNodes:s.nodes,pairEssential:!!p.pairs.length,rectangleEssential:!!p.rects.length});
}
const box={};box.window=box;vm.createContext(box);for(const w of ['hoshizu','katsuji','chomen','himitsu','somewake','sangaku'])vm.runInContext(fs.readFileSync(w+'-levels.js','utf8'),box);box.SaimadoCore=C;box.SAIMADO_LEVELS=levels;delete box.window;vm.runInContext(fs.readFileSync('migration-data.js','utf8'),box);const B=box.HiramekiBackup;
const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},api=B.api(storage),v1=api.snapshot();assert.equal(v1.version,1);assert.equal(Object.keys(v1.data).length,25);
api.set('saimado-save-v1',JSON.stringify({level:1,cuts:[0,0,0,0],moves:0,solved:false,hinted:false}));api.set('saimado-best','{"1":8}');api.set('saimado-sound','0');api.set('kakuree-save-v1',JSON.stringify({level:2,yaw:.4,pitch:.2,moves:3,solved:false,hint:false,best:{}}));api.set('kakuree-sound','0');
const backup=api.snapshot();assert.equal(backup.version,2);assert.equal(Object.keys(backup.data).length,30);B.validate(backup);api.import(v1);for(const k of B.extraKeys)assert.equal(api.get(k),backup.data[k],'旧v1 importで新記録を保持');
const map2=new Map(),store2={getItem:k=>map2.get(k)??null,setItem:(k,v)=>map2.set(k,v)},a2=B.api(store2);a2.import(backup);assert.equal(a2.current(),JSON.stringify(backup.data));const before=map2.get(B.capsule);
for(const mutate of [b=>b.version=3,b=>b.data['saimado-save-v1']='{}',b=>b.data['saimado-best']='{"17":2}',b=>b.data['saimado-sound']='2',b=>b.data['kakuree-save-v1']='{}',b=>b.app='別アプリ',b=>b.data['未知キー']='秘密']){const b=structuredClone(backup);mutate(b);assert.throws(()=>a2.import(b));assert.equal(map2.get(B.capsule),before)}
const failed=B.api({getItem:store2.getItem,setItem(){throw Error('合成保存失敗')}});assert.throws(()=>failed.import(backup));assert.equal(map2.get(B.capsule),before);
fs.mkdirSync('test-results/saimado',{recursive:true});fs.writeFileSync('test-results/saimado/unit.json',JSON.stringify({results,migration:'v1互換・v2全30項目・不正拒否・保存失敗時保持を確認'},null,2));console.log('合格：独自16問、一意解、独立検算、全辺のヒント一致、追加条件の必要性、v1/v2引継ぎ境界');
