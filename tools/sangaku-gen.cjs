// 算額の問題を作る（node tools/sangaku-gen.cjs）。
// N×N の盤の各行・各列に 1〜N を一つずつ。太枠の区画には「答えと演算」（足す・引く・掛ける・割る）。
// 解がちょうど一つになる問題だけを収録し、探索の手間で難しさを測る。
const fs=require('fs'),path=require('path');
function rng(s){return()=>(s=(s*16807)%2147483647)/2147483647}
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function latin(n,r){const base=[...Array(n)].map((_,y)=>[...Array(n)].map((_,x)=>(x+y)%n+1));const rows=shuffle([...Array(n).keys()],r),cols=shuffle([...Array(n).keys()],r),sym=shuffle([...Array(n)].map((_,i)=>i+1),r);
  return rows.map(y=>cols.map(x=>sym[base[y][x]-1]))}
// 区画分け：ランダムに伸ばす。大きさは 1〜maxSize
function cages(n,r,maxSize,single){const id=[...Array(n*n)].fill(-1),out=[];const order=shuffle([...Array(n*n).keys()],r);
  for(const s of order){if(id[s]>=0)continue;const want=r()<single?1:2+Math.floor(r()*(maxSize-1));const cells=[s];id[s]=out.length;
    while(cells.length<want){const nb=[];for(const c of cells){const x=c%n,y=(c/n)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<n&&Y<n&&id[Y*n+X]<0)nb.push(Y*n+X)}}
      if(!nb.length)break;const c=nb[Math.floor(r()*nb.length)];id[c]=out.length;cells.push(c)}
    out.push(cells)}
  return out}
function label(cells,sol,r){const v=cells.map(c=>sol[c]);if(v.length===1)return {op:'',t:v[0]};
  if(v.length===2){const [a,b]=[Math.max(...v),Math.min(...v)];const ops=[];if(a%b===0&&r()<.6)ops.push({op:'÷',t:a/b});if(r()<.5)ops.push({op:'−',t:a-b});if(r()<.5)ops.push({op:'×',t:a*b});ops.push({op:'+',t:a+b});return ops[0]}
  if(r()<.5)return {op:'×',t:v.reduce((a,b)=>a*b,1)};return {op:'+',t:v.reduce((a,b)=>a+b,0)}}
// 区画の数字の組がその答えと演算に合うか（部分的に埋まっているときは、まだ合いうるか）
function fits(op,t,vals,size,n){
  if(vals.length<size){if(op==='+'){const s=vals.reduce((a,b)=>a+b,0);return s+(size-vals.length)<=t&&s+(size-vals.length)*n>=t}if(op==='×'){const p=vals.reduce((a,b)=>a*b,1);return t%p===0}return true}
  if(op==='')return vals[0]===t;if(op==='+')return vals.reduce((a,b)=>a+b,0)===t;if(op==='×')return vals.reduce((a,b)=>a*b,1)===t;
  const [a,b]=[Math.max(...vals),Math.min(...vals)];return op==='−'?a-b===t:a===b*t}
function solve(n,cg,limit){const cageOf=[],g=new Array(n*n).fill(0);cg.forEach((c,i)=>c.cells.forEach(s=>cageOf[s]=i));let count=0,nodes=0;
  const ok=(s,v)=>{const x=s%n,y=(s/n)|0;for(let k=0;k<n;k++){if(g[y*n+k]===v||g[k*n+x]===v)return false}const c=cg[cageOf[s]];g[s]=v;const vals=c.cells.map(q=>g[q]).filter(Boolean);const f=fits(c.op,c.t,vals,c.cells.length,n);g[s]=0;return f};
  function rec(){if(count>=limit)return;nodes++;let best=-1,bc=null;
    for(let s=0;s<n*n;s++){if(g[s])continue;const cand=[];for(let v=1;v<=n;v++)if(ok(s,v))cand.push(v);if(!cand.length)return;if(!bc||cand.length<bc.length){best=s;bc=cand;if(cand.length===1)break}}
    if(best<0){count++;return}for(const v of bc){g[best]=v;rec();g[best]=0;if(count>=limit)return}}
  rec();return {count,nodes}}
// 面の計画：[盤の大きさ, 区画の最大, 一マス区画の割合, 本数]
const PLAN=[[3,2,.35,1],[3,3,.2,2],[4,3,.15,3],[4,4,.1,2],[5,3,.1,3],[5,4,.06,3],[6,3,.08,3],[6,4,.04,3]];
const levels=[];let seed=20261006;
for(const [n,maxSize,single,count] of PLAN){const found=[];
  for(let t=0;found.length<count*4&&t<4000;t++){const r=rng(seed++);const sol=latin(n,r).flat();const cs=cages(n,r,maxSize,single).map(cells=>({cells,...label(cells,sol,r)}));
    if(cs.filter(c=>c.cells.length===1).length>Math.max(1,n-2))continue;
    const res=solve(n,cs,2);if(res.count!==1)continue;found.push({n,cages:cs.map(c=>[c.op,c.t,c.cells]),sol:sol.join(''),nodes:res.nodes})}
  found.sort((a,b)=>a.nodes-b.nodes);
  // 同じ大きさの中から、やさしい方から難しい方へ等間隔に選ぶ
  for(let k=0;k<count;k++)levels.push(found[Math.min(found.length-1,Math.round((k+.5)/count*found.length*.999))]);
  process.stderr.write(`${n}x${n} 候補${found.length} 手間${found.map(f=>f.nodes).join(',').slice(0,80)}\n`)}
// 小さい盤から大きい盤へ、同じ大きさの中では手間の少ない順（一の額＝いちばんやさしい 3×3 が手ほどき）
levels.sort((a,b)=>a.n-b.n||a.nodes-b.nodes);
const out='// tools/sangaku-gen.cjs が生成。手で編集しない。\n// n: 盤の大きさ、cages: [演算, 答え, マス番号の列]（マス番号は 行×n+列）、sol: 答え（左上から）、nodes: 探索の手間\nwindow.SANGAKU_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','sangaku-levels.js'),out);console.log('levels',levels.length,levels.map(l=>l.n+':'+l.nodes).join(' '));
