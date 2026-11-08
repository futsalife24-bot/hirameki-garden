/* 固定seedから独自の候補を作る。解の一意性と追加ルールの必要性で選別する。 */
const fs=require('node:fs'),path=require('node:path'),C=require('../saimado-core.js');
let seed=11082026;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n},pick=a=>a[rnd(a.length)];
function partition(w,h){const p={w,h},remaining=new Set(Array.from({length:w*h},(_,i)=>i)),out=[];
 while(remaining.size){const cells=[pick([...remaining])];remaining.delete(cells[0]);const size=2+rnd(4);while(cells.length<size){const fringe=[...new Set(cells.flatMap(i=>C.neighbors(p,i)).filter(i=>remaining.has(i)))];if(!fringe.length)break;const j=pick(fringe);cells.push(j);remaining.delete(j)}out.push(cells)}return out;
}
const names=['一枚の光','角の小窓','曲がる境界','残りのかたち','離れた菱','ふたつの道','印をたどる','対の行き先','まっすぐな枠','角まで届く','四角の余白','長辺を読む','光の交点','二つの約束','窓辺の推理','彩りの工房'];
const levels=[{w:2,h:2,lights:[{at:0,size:1},{at:3,size:3}],pairs:[],rects:[],chapter:1,name:names[0]}];
for(let n=1;n<16;n++){
 const chapter=Math.floor(n/4)+1,w=n<3?3:n<8?4:5,h=n<2?2:n<12?3:4;
 let chosen;
 for(let attempt=0;attempt<40000&&!chosen;attempt++){
  const regions=partition(w,h);if(regions.length<3||regions.some(r=>r.length===1)&&n>3)continue;
  const p={w,h,lights:regions.map(r=>({at:pick(r),size:r.length})),pairs:[],rects:[],chapter,name:names[n]};
  const large=regions.filter(r=>r.length>=3);
  if(chapter===2||chapter===4){if(!large.length)continue;const r=pick(large),a=pick(r),b=pick(r.filter(i=>i!==a));p.pairs=[[a,b]];if(chapter===4&&large.length>1){const s=pick(large.filter(x=>x!==r));p.pairs.push([s[0],s[s.length-1]])}}
  if(chapter>=3){const rect=regions.filter(r=>r.length>=3&&C.rectangle(p,r));if(!rect.length)continue;p.rects=[pick(pick(rect))]}
  const found=C.solve(p);if(found.solutions.length!==1)continue;
  if(p.pairs.length&&C.solve({...p,pairs:[]}).solutions.length<2)continue;
  if(p.rects.length&&C.solve({...p,rects:[]}).solutions.length<2)continue;
  chosen=p;
 }
 if(!chosen)throw Error('条件に合う面が見つかりません: '+n);levels.push(chosen);console.log(n+1,chosen.name,C.solve(chosen).nodes);
}
fs.writeFileSync(path.join(__dirname,'../saimado-levels.js'),'/* 彩窓：独自制作の16窓。正解データは収録せず、ルールから検証する。 */\n(function(root){root.SAIMADO_LEVELS='+JSON.stringify(levels,null,2)+';if(typeof module!=="undefined")module.exports=root.SAIMADO_LEVELS;})(typeof window==="undefined"?globalThis:window);\n');
