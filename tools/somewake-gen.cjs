// 染め分け（色を注ぎ分けるパズル）の問題を作る道具。somewake-levels.js に書き出す。
//   node tools/somewake-gen.cjs
// 瓶の容量は4。注げるのは、注ぐ先が空か、いちばん上が同じ色のときだけ。同じ色の層はまとめて注ぐ（入るだけ）。
// すべての瓶が「空」か「一色で満杯」になれば完成。解けることと最短手数を幅優先探索で確かめる。
const fs=require('fs'),path=require('path');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const CAP=4;
const top=b=>b[b.length-1];
function pour(st,a,b){const A=st[a],B=st[b];if(!A.length||a===b||B.length>=CAP)return null;const c=top(A);if(B.length&&top(B)!==c)return null;
  let run=0;for(let i=A.length-1;i>=0&&A[i]===c;i--)run++;const n=Math.min(run,CAP-B.length);
  // 一色で満杯の瓶から、空の瓶へ移すのは意味がない
  if(!B.length&&run===A.length)return null;
  const s=st.slice();s[a]=A.slice(0,A.length-n);s[b]=B+c.repeat(n);return s}
const solved=st=>st.every(b=>!b.length||(b.length===CAP&&[...b].every(c=>c===b[0])));
const key=st=>st.slice().sort().join('|');
function bfs(start,limit=600000){const seen=new Map([[key(start),null]]);let fr=[[start,null]];const par=new Map();let depth=0;
  if(solved(start))return {moves:0,path:[]};
  while(fr.length&&seen.size<limit){depth++;const nx=[];
    for(const [st] of fr){for(let a=0;a<st.length;a++)for(let b=0;b<st.length;b++){const s=pour(st,a,b);if(!s)continue;const k=key(s);if(seen.has(k))continue;seen.set(k,1);par.set(k,[key(st),a,b,st]);
      if(solved(s)){const p=[];let cur=k;while(par.has(cur)){const [pk,pa,pb]=par.get(cur);p.unshift([pa,pb]);cur=pk}return {moves:depth,path:p}}nx.push([s])}}
    fr=nx}
  return null}
// [色の数, 空き瓶の数, 最短手数の下限]
const PLAN=[[2,1,2],[3,2,4],[3,1,5],[4,2,7],[4,2,8],[5,2,10],[5,2,11],[6,2,13],[6,2,14],[7,2,16],[7,2,17],[8,2,19],[8,2,20],[9,2,22],[9,2,23],[10,2,25],[10,2,26],[11,2,28],[11,2,29],[12,2,31]];
const COLORS='ABCDEFGHIJKL';
const levels=[];let seed=777;
for(const [n,empty,lo] of PLAN){let best=null;
  for(let t=0;t<400;t++){const r=rng(seed++),units=[];for(let i=0;i<n;i++)for(let k=0;k<CAP;k++)units.push(COLORS[i]);units.sort(()=>r()-.5);
    const st=[];for(let i=0;i<n;i++)st.push(units.slice(i*CAP,i*CAP+CAP).join(''));for(let i=0;i<empty;i++)st.push('');
    if(st.some(b=>b.length&&[...b].every(c=>c===b[0])))continue;
    const res=bfs(st,n<=6?600000:250000);if(!res)continue;
    if(!best||res.moves>best.min){best={bottles:st,min:res.moves,path:res.path}}
    if(res.moves>=lo)break}
  if(!best){throw new Error('no level for '+n)}
  levels.push(best);process.stderr.write(`${levels.length}: ${n}色 瓶${n+empty} 最短${best.min}手\n`)}
levels.sort((a,b)=>a.min-b.min); // 最短手数の少ない順に並べる（一の甕は手ほどき）
const out='// tools/somewake-gen.cjs が生成。手で編集しない。\n// bottles: 瓶ごとの色（下から上、A〜L）、min: 最短手数、path: 最短手順 [注ぐ瓶,注がれる瓶]\nwindow.SOMEWAKE_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','somewake-levels.js'),out);console.log('levels',levels.length,'bytes',out.length);
