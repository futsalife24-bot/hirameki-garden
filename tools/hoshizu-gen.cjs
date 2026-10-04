// 星図の問題を作る道具。答えがひとつに決まる面だけを選び、hoshizu-levels.js に書き出す。
//   node tools/hoshizu-gen.cjs
// ルール（橋をかけろ）：数字は、その星から出る線の本数。線は縦横だけ、二本まで重ねられ、交差しない。
// すべての星がひとつながりになれば完成。
const fs=require('fs'),path=require('path');

function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// 盤面から「結べる組」（同じ行・列でいちばん近い星どうし）を作る
function edgesOf(w,h,stars){
  const at=new Map(stars.map((s,i)=>[s[0]+','+s[1],i])),E=[];
  stars.forEach(([x,y],i)=>{
    for(const [dx,dy] of [[1,0],[0,1]]){let nx=x+dx,ny=y+dy;while(nx<w&&ny<h){const j=at.get(nx+','+ny);if(j!==undefined){E.push({a:i,b:j,h:dy===0});break}nx+=dx;ny+=dy}}
  });
  // 交差する組
  E.forEach(e=>e.cross=[]);
  for(let p=0;p<E.length;p++)for(let q=p+1;q<E.length;q++){const A=E[p],B=E[q];if(A.h===B.h)continue;const H=A.h?A:B,V=A.h?B:A;
    const [hx1,hy]=stars[H.a],hx2=stars[H.b][0],[vx,vy1]=stars[V.a],vy2=stars[V.b][1];
    if(vx>Math.min(hx1,hx2)&&vx<Math.max(hx1,hx2)&&hy>Math.min(vy1,vy2)&&hy<Math.max(vy1,vy2)){A.cross.push(q);B.cross.push(p)}}
  return E;
}

// 解の数を数える（2つ見つかったら打ち切り）
function countSolutions(w,h,stars,limit=2){
  const E=edgesOf(w,h,stars),n=stars.length,need=stars.map(s=>s[2]);
  const inc=stars.map(()=>[]);E.forEach((e,k)=>{inc[e.a].push(k);inc[e.b].push(k)});
  const val=new Array(E.length).fill(-1),deg=new Array(n).fill(0);let found=0,sol=null;
  // 星ごとの、まだ決めていない組で足せる最大数
  const room=i=>inc[i].reduce((s,k)=>s+(val[k]<0?2:0),0);
  const ok=i=>deg[i]<=need[i]&&deg[i]+room(i)>=need[i];
  function connected(){const seen=new Array(n).fill(false),st=[0];seen[0]=true;let c=1;while(st.length){const i=st.pop();for(const k of inc[i])if(val[k]>0){const j=E[k].a===i?E[k].b:E[k].a;if(!seen[j]){seen[j]=true;c++;st.push(j)}}}return c===n}
  function choose(){let best=-1,bs=99;for(let k=0;k<E.length;k++)if(val[k]<0){const s=Math.min(need[E[k].a]-deg[E[k].a],need[E[k].b]-deg[E[k].b]);if(s<bs){bs=s;best=k}}return best}
  function dfs(){
    if(found>=limit)return;
    const k=choose();
    if(k<0){if(need.every((v,i)=>deg[i]===v)&&connected()){found++;sol=val.slice()}return}
    const e=E[k];
    for(let v=2;v>=0;v--){
      if(v>0&&e.cross.some(q=>val[q]>0))continue;
      val[k]=v;deg[e.a]+=v;deg[e.b]+=v;
      if(ok(e.a)&&ok(e.b))dfs();
      deg[e.a]-=v;deg[e.b]-=v;val[k]=-1;
      if(found>=limit)return;
    }
  }
  dfs();
  return {found,sol:sol&&E.map((e,k)=>[e.a,e.b,sol[k]]).filter(x=>x[2]>0)};
}

// 星を一つずつ増やしながら、答えになる線を同時に作る
function grow(w,h,target,r){
  const grid=Array.from({length:h},()=>new Array(w).fill(0)); // 0空き 1星 2線
  const stars=[],bridges=[];
  const sx=Math.floor(r()*w),sy=Math.floor(r()*h);stars.push([sx,sy]);grid[sy][sx]=1;
  let tries=0;
  while(stars.length<target&&tries++<4000){
    const i=Math.floor(r()*stars.length),[x,y]=stars[i];
    const [dx,dy]=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(r()*4)];
    const len=2+Math.floor(r()*Math.max(1,Math.min(4,(dx?w:h)-2)));
    const nx=x+dx*len,ny=y+dy*len;
    if(nx<0||ny<0||nx>=w||ny>=h||grid[ny][nx])continue;
    let clear=true;for(let s=1;s<len;s++)if(grid[y+dy*s][x+dx*s]){clear=false;break}
    if(!clear)continue;
    // 隣り合う星を作らない（読みやすさのため）
    let adj=false;for(const [ax,ay] of [[1,0],[-1,0],[0,1],[0,-1]]){const px=nx+ax,py=ny+ay;if(px>=0&&py>=0&&px<w&&py<h&&grid[py][px]===1&&!(px===x+dx*(len-1)&&py===y+dy*(len-1)))adj=true}
    if(adj)continue;
    for(let s=1;s<len;s++)grid[y+dy*s][x+dx*s]=2;
    grid[ny][nx]=1;stars.push([nx,ny]);bridges.push([i,stars.length-1,r()<.45?2:1]);
  }
  if(stars.length<target)return null;
  // ついでに結べる組に線を足して、数字を多様にする
  const E=edgesOf(w,h,stars.map(s=>[s[0],s[1],0]));
  const key=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b),have=new Map(bridges.map(b=>[key(b[0],b[1]),b]));
  const used=new Set();bridges.forEach(b=>{const e=E.findIndex(e=>key(e.a,e.b)===key(b[0],b[1]));if(e>=0)used.add(e)});
  E.forEach((e,k)=>{if(used.has(k)||r()>.35)return;if(e.cross.some(q=>used.has(q)))return;used.add(k);have.set(key(e.a,e.b),[e.a,e.b,r()<.4?2:1])});
  const deg=stars.map(()=>0);for(const [a,b,c] of have.values()){deg[a]+=c;deg[b]+=c}
  return stars.map((s,i)=>[s[0],s[1],deg[i]]);
}

const PLAN=[ // [幅, 高さ, 星の数]
  ...Array(4).fill([5,5,7]),...Array(4).fill([6,6,10]),...Array(6).fill([7,7,13]),
  ...Array(6).fill([8,8,17]),...Array(5).fill([9,9,21]),...Array(5).fill([9,10,25])];
const levels=[];let seed=20261004;
for(const [w,h,n] of PLAN){
  for(let attempt=0;;attempt++){
    const r=rng(seed++),stars=grow(w,h,n,r);if(!stars)continue;
    if(stars.some(s=>s[2]>8||s[2]<1))continue;
    const {found,sol}=countSolutions(w,h,stars);
    if(found===1){levels.push({w,h,stars,sol});process.stderr.write(`${levels.length}:${w}x${h} n=${n} (試行${attempt+1})\n`);break}
  }
}
const out='// tools/hoshizu-gen.cjs が生成。手で編集しない。\n// stars: [列, 行, 数字]、sol: 答え [星a, 星b, 本数]（完成の判定には使わない）\nwindow.HOSHIZU_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','hoshizu-levels.js'),out);
console.log('levels',levels.length,'bytes',out.length);
