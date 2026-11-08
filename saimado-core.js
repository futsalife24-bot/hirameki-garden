/* 彩窓のルールと全解探索。描画・保存に依存させず、ヒントにも同じ条件を使う。 */
(function(root){
 'use strict';
 const bit=i=>1<<i;
 function edges(p){const a=[];for(let i=0;i<p.w*p.h;i++){if(i%p.w<p.w-1)a.push([i,i+1]);if(i+p.w<p.w*p.h)a.push([i,i+p.w])}return a}
 function neighbors(p,i){return [i%p.w?i-1:-1,i%p.w<p.w-1?i+1:-1,i>=p.w?i-p.w:-1,i+p.w<p.w*p.h?i+p.w:-1].filter(x=>x>=0)}
 function rectangle(p,cells){const xs=cells.map(i=>i%p.w),ys=cells.map(i=>Math.floor(i/p.w));return (Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1)===cells.length}
 function validRegion(p,cells){
  const lights=p.lights.filter(c=>cells.includes(c.at));
  return lights.length===1&&lights[0].size===cells.length&&(p.pairs||[]).every(pair=>pair.every(i=>cells.includes(i))||pair.every(i=>!cells.includes(i)))&&(!(p.rects||[]).some(i=>cells.includes(i))||rectangle(p,cells));
 }
 function groups(p,cuts){const E=edges(p),seen=new Set(),out=[];
  for(let i=0;i<p.w*p.h;i++){if(seen.has(i))continue;const cells=[i];seen.add(i);for(let k=0;k<cells.length;k++)E.forEach(([a,b],e)=>{const n=a===cells[k]?b:b===cells[k]?a:-1;if(n>=0&&!cuts[e]&&!seen.has(n)){seen.add(n);cells.push(n)}});out.push(cells)}return out;
 }
 function cutsFor(p,regions){const owner=[];regions.forEach((r,k)=>r.forEach(i=>owner[i]=k));return edges(p).map(([a,b])=>owner[a]!==owner[b]?1:0)}
 function check(p,cuts){const regions=groups(p,cuts),canonical=cutsFor(p,regions);return {regions,valid:regions.map(r=>validRegion(p,r)),solved:regions.every(r=>validRegion(p,r))&&canonical.every((v,i)=>v===cuts[i])}}
 function candidates(p){return p.lights.map(light=>{
  let sets=new Set([bit(light.at)]);const forbidden=p.lights.filter(c=>c!==light).reduce((m,c)=>m|bit(c.at),0);
  for(let n=1;n<light.size;n++){const next=new Set();for(const mask of sets)for(let i=0;i<p.w*p.h;i++)if(mask&bit(i))for(const j of neighbors(p,i))if(!(mask&bit(j))&&!(forbidden&bit(j)))next.add(mask|bit(j));sets=next}
  return [...sets].filter(mask=>validRegion(p,Array.from({length:p.w*p.h},(_,i)=>i).filter(i=>mask&bit(i))));
 })}
 function solve(p,limit=2){const C=candidates(p),solutions=[];let nodes=0;const full=(1<<(p.w*p.h))-1;
  function walk(used,left,chosen){nodes++;if(solutions.length>=limit)return;if(!left.length){if(used===full)solutions.push(chosen.map(mask=>Array.from({length:p.w*p.h},(_,i)=>i).filter(i=>mask&bit(i))));return}
   const choices=left.map(i=>[i,C[i].filter(m=>!(m&used))]).sort((a,b)=>a[1].length-b[1].length),[i,allowed]=choices[0];for(const m of allowed){walk(used|m,left.filter(j=>j!==i),[...chosen,m]);if(solutions.length>=limit)break}
  }walk(0,p.lights.map((_,i)=>i),[]);return {solutions,nodes,candidateCounts:C.map(c=>c.length)};
 }
 function hint(p,cuts){const found=solve(p,2);if(found.solutions.length!==1)return null;const answer=cutsFor(p,found.solutions[0]),edge=answer.findIndex((v,i)=>v!==cuts[i]);return edge<0?null:{edge,cut:!!answer[edge],cells:edges(p)[edge]};}
 const api={edges,neighbors,rectangle,validRegion,groups,cutsFor,check,candidates,solve,hint};root.SaimadoCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
