// 秘密箱（スライドパズル）の問題を作る道具。himitsu-levels.js に書き出す。
//   node tools/himitsu-gen.cjs
// 一手 ＝ ひとつの木片を、一方向へ好きなだけ滑らせること。最短手数は幅優先探索で求める。
// 鍵の木片（0番）を、右の縁の出口の位置まで動かせば箱が開く。
const fs=require('fs'),path=require('path');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// 状態は各木片の左上座標の並び。同じ大きさの木片は区別しない（探索を小さくする）
function solve(W,H,sizes,start,goal,maxNodes=400000){
  const n=sizes.length;
  const keyOf=p=>{const parts=[p[0]+','+p[1]];const groups={};for(let i=1;i<n;i++){const k=sizes[i].join('x');(groups[k]=groups[k]||[]).push(p[i*2]*16+p[i*2+1])}
    for(const k of Object.keys(groups).sort())parts.push(k+':'+groups[k].sort((a,b)=>a-b).join('.'));return parts.join('|')};
  const occ=p=>{const g=new Int8Array(W*H).fill(-1);for(let i=0;i<n;i++){const [w,h]=sizes[i],x=p[i*2],y=p[i*2+1];for(let a=0;a<w;a++)for(let b=0;b<h;b++)g[(y+b)*W+x+a]=i}return g};
  const done=p=>p[0]===goal[0]&&p[1]===goal[1];
  const s0=start.flat(),seen=new Map([[keyOf(s0),null]]);let frontier=[s0],depth=0;
  if(done(s0))return {moves:0,path:[]};
  const parent=new Map();
  while(frontier.length&&seen.size<maxNodes){depth++;const next=[];
    for(const p of frontier){const g=occ(p);
      for(let i=0;i<n;i++){const [w,h]=sizes[i];
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let k=1;
          while(true){const x=p[i*2]+dx*k,y=p[i*2+1]+dy*k;if(x<0||y<0||x+w>W||y+h>H)break;let free=true;
            for(let a=0;a<w&&free;a++)for(let b=0;b<h;b++){const c=g[(y+b)*W+x+a];if(c!==-1&&c!==i){free=false;break}}
            if(!free)break;const q=p.slice();q[i*2]=x;q[i*2+1]=y;const key=keyOf(q);
            if(!seen.has(key)){seen.set(key,1);parent.set(key,[keyOf(p),p,i,x,y]);if(done(q)){const path=[];let cur=key;while(parent.has(cur)){const [pk,pp,pi,px,py]=parent.get(cur);path.unshift([pi,px,py]);cur=pk}return {moves:depth,path}}next.push(q)}k++}}}}
    frontier=next}
  return null;
}

// でたらめに木片を詰めた箱を作る
function scatter(W,H,r,shapes,empty){
  const g=new Int8Array(W*H).fill(-1),pieces=[];
  const fits=(x,y,w,h)=>{if(x+w>W||y+h>H)return false;for(let a=0;a<w;a++)for(let b=0;b<h;b++)if(g[(y+b)*W+x+a]!==-1)return false;return true};
  const put=(x,y,w,h)=>{for(let a=0;a<w;a++)for(let b=0;b<h;b++)g[(y+b)*W+x+a]=pieces.length;pieces.push([x,y,w,h])};
  for(const [w,h] of shapes){let ok=false;for(let t=0;t<80&&!ok;t++){const x=Math.floor(r()*W),y=Math.floor(r()*H);if(fits(x,y,w,h)){put(x,y,w,h);ok=true}}if(!ok)return null}
  // 残りを小さな木片で埋め、空きを empty マス残す
  const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(g[y*W+x]===-1)cells.push([x,y]);
  cells.sort(()=>r()-.5);let free=cells.length;
  for(const [x,y] of cells){if(free<=empty)break;if(g[y*W+x]!==-1)continue;
    const opts=[[1,2],[2,1],[1,1]].filter(([w,h])=>fits(x,y,w,h)&&free-w*h>=empty);if(!opts.length)continue;const [w,h]=opts[Math.floor(r()*opts.length)];put(x,y,w,h);free-=w*h}
  if(free!==empty)return null;return pieces;
}

// [幅, 高さ, 鍵の大きさ, 大きな木片, 空き, 最短手数の範囲]
const PLAN=[[4,4,[2,2],[],2,[2,3]],[4,4,[2,2],[[1,2]],2,[3,5]],[4,4,[2,1],[[1,2],[2,1]],2,[4,6]],[4,5,[2,2],[[1,2]],2,[5,8]],
  [4,5,[2,2],[[1,2],[1,2]],2,[7,10]],[4,5,[2,2],[[2,1],[1,2]],2,[8,12]],[5,4,[2,2],[[1,2],[2,1]],2,[9,13]],[4,5,[2,2],[[1,2],[1,2],[2,1]],2,[10,15]],
  [5,5,[2,2],[[1,2],[2,1],[1,2]],3,[11,16]],[4,5,[2,2],[[1,2],[1,2],[1,2],[1,2]],2,[13,18]],[5,5,[2,2],[[2,1],[2,1],[1,2]],2,[14,20]],[4,6,[2,2],[[1,2],[1,2],[2,1]],2,[15,22]],
  [5,5,[2,2],[[1,2],[1,2],[2,1],[2,1]],2,[17,24]],[4,5,[2,2],[[1,2],[1,2],[1,2],[1,2],[2,1]],2,[18,28]],[5,6,[2,2],[[1,2],[2,1],[1,2],[2,1]],3,[19,28]],[5,5,[3,2],[[1,2],[1,2],[2,1]],2,[20,30]],
  [4,6,[2,2],[[1,2],[1,2],[1,2],[2,1],[2,1]],2,[22,32]],[5,6,[2,2],[[1,2],[1,2],[1,2],[2,1],[2,1]],2,[24,36]],[5,5,[2,2],[[1,2],[1,2],[1,2],[2,1],[2,1]],2,[25,38]],[4,6,[2,2],[[1,2],[1,2],[1,2],[1,2],[2,1]],2,[28,44]]];
const levels=[];let seed=4242;
for(const [W,H,key,big,empty,[lo,hi]] of PLAN){
  let best=null;
  for(let attempt=1;attempt<=6000;attempt++){
    const r=rng(seed++),pieces=scatter(W,H,r,[key,...big],empty);if(!pieces)continue;
    const gy=Math.floor(r()*(H-key[1]+1)),goal=[W-key[0],gy];
    if(pieces[0][0]===goal[0]&&pieces[0][1]===goal[1])continue;
    const sizes=pieces.map(p=>[p[2],p[3]]),start=pieces.map(p=>[p[0],p[1]]);
    const res=solve(W,H,sizes,start,goal);if(!res)continue;
    if(res.moves>=lo&&res.moves<=hi){best={W,H,goal,pieces,min:res.moves,path:res.path};break}
    if(res.moves<lo&&(!best||res.moves>best.min))best={W,H,goal,pieces,min:res.moves,path:res.path};
  }
  levels.push(best);process.stderr.write(`${levels.length}: ${W}x${H} 木片${best.pieces.length} 最短${best.min}手 (目標${lo}-${hi})\n`);
}
levels.sort((a,b)=>a.min-b.min||a.W*a.H-b.W*b.H); // 最短手数の少ない順に並べる
const out='// tools/himitsu-gen.cjs が生成。手で編集しない。\n// W,H 箱の大きさ、pieces: [x,y,幅,高さ]（0番が鍵）、goal: 鍵の左上の目標位置、min: 最短手数、path: 最短手順 [木片,x,y]\nwindow.HIMITSU_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','himitsu-levels.js'),out);console.log('levels',levels.length,'bytes',out.length);
