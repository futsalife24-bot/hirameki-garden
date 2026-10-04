// 帳面（ヒント付きクロスワード）の問題を作る道具。chomen-levels.js に書き出す。
//   node tools/chomen-gen.cjs
// 言葉とヒントは tools/chomen-clues.cjs。盤の組み方は活字（tools/katsuji-gen.cjs）と同じ。
const fs=require('fs'),path=require('path');
const CLUES=require('./chomen-clues.cjs');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const word=s=>[...s];

// 言葉を交差させながら置いていく
function layout(words,maxW,maxH,r){
  const G=new Map(),key=(x,y)=>x+','+y,placed=[];
  const ok=(w,x,y,dx,dy)=>{let cross=0;
    if(G.has(key(x-dx,y-dy))||G.has(key(x+dx*w.length,y+dy*w.length)))return -1;
    for(let i=0;i<w.length;i++){const cx=x+dx*i,cy=y+dy*i,c=G.get(key(cx,cy));
      if(c){if(c.ch!==w[i]||c[dx?'h':'v'])return -1;cross++}
      else if(G.has(key(cx+dy,cy+dx))||G.has(key(cx-dy,cy-dx)))return -1}
    // 盤の大きさ
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const k of G.keys()){const [a,b]=k.split(',').map(Number);x0=Math.min(x0,a);y0=Math.min(y0,b);x1=Math.max(x1,a);y1=Math.max(y1,b)}
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+dx*(w.length-1));y1=Math.max(y1,y+dy*(w.length-1));
    if(x1-x0+1>maxW||y1-y0+1>maxH)return -1;
    return cross};
  const put=(w,x,y,dx,dy,s)=>{for(let i=0;i<w.length;i++){const k=key(x+dx*i,y+dy*i),c=G.get(k)||{ch:w[i]};c[dx?'h':'v']=true;G.set(k,c)}placed.push({s,x,y,dir:dx?'a':'d',len:w.length})};
  const first=words[0];put(word(first),0,0,1,0,first);
  // 置けなかった言葉は、盤が育ったあとにもう一度試す
  let rest=words.slice(1);
  for(let pass=0;pass<4&&rest.length;pass++){const left=[];
    for(const s of rest){const w=word(s),opts=[];
      for(const [k,c] of G)for(let i=0;i<w.length;i++){if(w[i]!==c.ch)continue;const [cx,cy]=k.split(',').map(Number);
        for(const [dx,dy] of [[1,0],[0,1]]){const x=cx-dx*i,y=cy-dy*i,v=ok(w,x,y,dx,dy);if(v>0)opts.push([v+r()*.5,x,y,dx,dy])}}
      if(!opts.length){left.push(s);continue}opts.sort((a,b)=>b[0]-a[0]);const o=opts[Math.floor(r()*Math.min(3,opts.length))];put(w,o[1],o[2],o[3],o[4],s)}
    rest=left}
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const k of G.keys()){const [a,b]=k.split(',').map(Number);x0=Math.min(x0,a);y0=Math.min(y0,b);x1=Math.max(x1,a);y1=Math.max(y1,b)}
  const W=x1-x0+1,H=y1-y0+1,rows=Array.from({length:H},()=>Array(W).fill(''));
  for(const [k,c] of G){const [a,b]=k.split(',').map(Number);rows[b-y0][a-x0]=c.ch}
  placed.forEach(p=>{p.x-=x0;p.y-=y0});
  return {W,H,rows,slots:placed};
}

// 盤のマスの並び（2マス以上の連続）を、言葉の置き場として取り出す
function slotsOf(rows){const H=rows.length,W=rows[0].length,out=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!rows[y][x])continue;
    if((x===0||!rows[y][x-1])&&x+1<W&&rows[y][x+1]){let l=0;while(x+l<W&&rows[y][x+l])l++;out.push({x,y,dir:'a',len:l})}
    if((y===0||!rows[y-1][x])&&y+1<H&&rows[y+1][x]){let l=0;while(y+l<H&&rows[y+l][x])l++;out.push({x,y,dir:'d',len:l})}}
  return out}
const cellsOf=s=>Array.from({length:s.len},(_,i)=>s.dir==='a'?[s.x+i,s.y]:[s.x,s.y+i]);


const PLAN=[[5,6,6,'くだもの'],[6,6,6,'どうぶつ'],[6,7,7,'しぜん'],[7,7,7,'たべもの'],[7,7,7,'いえ'],[8,8,8,'きせつ'],[8,8,8,'まち'],
  [9,8,8,'どうぶつ'],[9,8,8,'くだもの'],[10,9,9,'しぜん'],[10,9,9,'たべもの'],[11,9,9,'いえ'],[11,9,9,'きせつ'],[12,10,10,'まち'],
  [12,10,10,'どうぶつ'],[13,10,10,'しぜん'],[13,10,10,'たべもの'],[14,11,11,'いえ'],[14,11,11,'きせつ'],[14,11,11,'どうぶつ']];
const levels=[];let seed=31415;
for(const [n,mw,mh,theme] of PLAN){
  const pool=Object.keys(CLUES[theme]).filter(w=>w.length>=2);let want=n;
  for(let attempt=1;;attempt++){
    if(attempt%3000===0&&want>5)want--;
    const r=rng(seed++),ws=pool.slice().map(w=>[w,r()+w.length*.12]).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
    const L=layout(ws,mw+1,mh+1,r);if(L.slots.length<want)continue;
    const keep=L.slots.slice(0,want),rows=Array.from({length:L.H},()=>Array(L.W).fill(''));
    keep.forEach(s=>cellsOf(s).forEach(([x,y],i)=>rows[y][x]=word(s.s)[i]));
    const ys=rows.map((r,i)=>r.some(Boolean)?i:-1).filter(i=>i>=0),xs=[...Array(L.W).keys()].filter(x=>rows.some(r=>r[x]));
    const R=rows.slice(ys[0],ys[ys.length-1]+1).map(r=>r.slice(xs[0],xs[xs.length-1]+1));
    const slots=slotsOf(R),words=slots.map(s=>cellsOf(s).map(([x,y])=>R[y][x]).join(''));
    if(slots.length!==want||new Set(words).size!==words.length||!words.every(w=>pool.includes(w)))continue;
    const cells=[];R.forEach((row,y)=>row.forEach((c,x)=>{if(c)cells.push(x+','+y)}));const seen=new Set([cells[0]]),st=[cells[0]];
    while(st.length){const [x,y]=st.pop().split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(cells.includes(k)&&!seen.has(k)){seen.add(k);st.push(k)}}}
    if(seen.size!==cells.length)continue;
    // 番号：左上から順に、言葉の始まるマスへ振る
    const starts=[...new Set(slots.map(s=>s.y*100+s.x))].sort((a,b)=>a-b);
    const entries=slots.map((s,i)=>({n:starts.indexOf(s.y*100+s.x)+1,x:s.x,y:s.y,d:s.dir,a:words[i],c:CLUES[theme][words[i]]})).sort((a,b)=>(a.d===b.d?0:a.d==='a'?-1:1)||a.n-b.n);
    levels.push({theme,rows:R.map(r=>r.map(c=>c||'.').join('')),entries});
    process.stderr.write(`${levels.length}:${theme} ${R[0].length}x${R.length} 言葉${want} (試行${attempt})\n`);break;
  }
}
const out='// tools/chomen-gen.cjs が生成。手で編集しない。\n// rows: 盤（. は黒マス）、entries: n 番号、x,y 始まり、d 向き（a ヨコ / d タテ）、a 答え、c ヒント\nwindow.CHOMEN_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','chomen-levels.js'),out);
console.log('levels',levels.length,'bytes',out.length);
