// 活字（はめ込みクロスワード）の問題を作る道具。答えがひとつに決まる面だけを katsuji-levels.js に書き出す。
//   node tools/katsuji-gen.cjs
// 言葉はすべてひらがな（小さい文字も1マス）。二重マスの文字を番号順に読むと「合言葉」になる。
const fs=require('fs'),path=require('path');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const POOLS={
  'くだもの':'りんご みかん ぶどう もも なし かき いちご すいか びわ うめ ゆず くり あんず さくらんぼ いちじく ざくろ すもも きんかん なつみかん かぼす すだち',
  'どうぶつ':'いぬ ねこ うさぎ きつね たぬき くま しか さる うま うし ひつじ やぎ ぶた ねずみ りす とら ぞう きりん かば いのしし もぐら かえる かめ へび とかげ くじら いるか あざらし むささび いたち',
  'とり':'からす すずめ つばめ はと わし たか ふくろう にわとり あひる かも つる さぎ うぐいす めじろ ひばり かもめ きじ とき うずら おしどり かわせみ',
  'たべもの':'ごはん みそしる おにぎり すし そば うどん てんぷら とうふ なっとう たまご もち だんご せんべい おでん やきとり さしみ みそ さとう しお こめ まめ おかゆ つけもの うめぼし のり かまぼこ',
  'しぜん':'やま かわ うみ そら くも あめ ゆき かぜ にじ ほし つき たいよう もり はやし いけ みずうみ たき しま いわ すな なみ かみなり きり しも つゆ はな くさ こけ いずみ おか たに のはら',
  'いえ':'つくえ いす まど とびら たたみ ふとん まくら かがみ とけい はし さら なべ やかん ほうき ちゃわん こたつ ふすま かさ くつ ぼうし かばん えんぴつ ほん はさみ ろうそく おけ たんす',
  'まち':'でんしゃ ふね くるま じてんしゃ ひこうき えき みち こうえん がっこう ゆうびん ぎんこう みせ しんごう ほどう ちかてつ みなと くうこう とうだい かいだん やね にわ はし としょかん',
  'きせつ':'はる なつ あき ふゆ さくら はなみ たなばた つきみ もみじ ゆきだるま ひなまつり ほたる せみ とんぼ すすき ふうりん はなび ゆかた こいのぼり かきごおり おまつり まめまき こたつ',
  'からだ':'あたま かお みみ くち あし ゆび かた ひざ せなか おなか くび ひたい まゆげ ほほ あご てくび ひじ かかと つめ',
  'いろ':'あか あお きいろ みどり しろ くろ むらさき ちゃいろ ももいろ はいいろ こん あい べに きん ぎん すみ そらいろ くさいろ',
};
const PASSWORDS='ひらめき さくら ほしぞら はなび こもれび にじ あおぞら ゆうやけ かざぐるま つきよ はるかぜ ことり ひだまり わかば みずいろ たんぽぽ やまびこ しゃぼんだま あさひ ゆうなぎ なのはな ほたる かすみ せせらぎ うた こころ ゆめ たから ひかり えがお まなつ あした しあわせ なかま おもいで きぼう はなたば いのり かがやき まほう やすらぎ ともだち ふしぎ たのしみ さんぽ ひるね おやつ のどか'.split(' ');
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

// 解の数（2つで打ち切り）。givens は最初から置いてある置き場の番号
function countSolutions(rows,slots,words,givens){
  const grid=rows.map(r=>r.map(()=>'')),used=new Array(words.length).fill(false);
  const write=(s,w)=>{const prev=[];cellsOf(s).forEach(([x,y],i)=>{prev.push(grid[y][x]);grid[y][x]=w[i]});return prev},erase=(s,prev)=>cellsOf(s).forEach(([x,y],i)=>grid[y][x]=prev[i]);
  const fits=(s,w)=>w.length===s.len&&cellsOf(s).every(([x,y],i)=>!grid[y][x]||grid[y][x]===w[i]);
  const done=new Array(slots.length).fill(false);
  for(const g of givens){const s=slots[g],w=word(rows[s.y][s.x]?cellsOf(s).map(([x,y])=>rows[y][x]).join(''):'');write(s,w);done[g]=true;const wi=words.findIndex((ww,i)=>!used[i]&&ww===w.join(''));used[wi]=true}
  let found=0;
  (function dfs(){if(found>1)return;let best=-1,cands=null;
    for(let i=0;i<slots.length;i++){if(done[i])continue;const c=[];const seen=new Set();words.forEach((w,k)=>{if(!used[k]&&!seen.has(w)&&fits(slots[i],word(w))){seen.add(w);c.push(k)}});if(!cands||c.length<cands.length){best=i;cands=c}if(!c.length)return}
    if(best<0){found++;return}
    for(const k of cands){used[k]=true;done[best]=true;const prev=write(slots[best],word(words[k]));dfs();erase(slots[best],prev);done[best]=false;used[k]=false;if(found>1)return}
  })();
  return found;
}

const PLAN=[ // [言葉の数, 最大幅, 最大高さ, テーマ]
  [5,6,6,'くだもの'],[6,6,6,'どうぶつ'],[7,7,7,'たべもの'],[7,7,7,'しぜん'],[8,7,7,'いえ'],[8,8,8,'とり'],
  [9,8,8,'まち'],[9,8,8,'きせつ'],[10,8,8,'からだといろ'],[10,9,9,'とり'],[11,9,9,'くだもの'],[11,9,9,'どうぶつ'],
  [12,9,9,'たべもの'],[12,9,10,'しぜん'],[13,10,10,'いえ'],[13,10,10,'まち'],[14,10,10,'きせつ'],[14,10,10,'とり'],
  [15,10,11,'どうぶつ'],[15,10,11,'たべもの'],[16,11,11,'しぜん'],[16,11,11,'いえ'],[17,11,11,'まち'],[18,11,11,'きせつ']];
const levels=[],usedPw=new Set();let seed=20261004;
for(const [n,mw,mh,theme] of PLAN){
  const pool=(theme==='からだといろ'?POOLS['からだ']+' '+POOLS['いろ']:POOLS[theme]).split(' ').filter(w=>w.length>=2);
  let want=n;
  for(let attempt=1;;attempt++){
    if(attempt%4000===0&&want>5)want--; // 作りにくいテーマは言葉を一つ減らす
    const r=rng(seed++),ws=pool.slice().map(w=>[w,r()+w.length*.12]).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
    const L=layout(ws,mw+1,mh+1,r);
    if(L.slots.length<want)continue;
    // 置けた言葉のうち先頭 n 語だけで盤を作り直す
    const keep=L.slots.slice(0,want),rows=Array.from({length:L.H},()=>Array(L.W).fill(''));
    keep.forEach(s=>cellsOf(s).forEach(([x,y],i)=>rows[y][x]=word(s.s)[i]));
    // 余白を詰める
    const ys=rows.map((r,i)=>r.some(Boolean)?i:-1).filter(i=>i>=0),xs=[...Array(L.W).keys()].filter(x=>rows.some(r=>r[x]));
    const R=rows.slice(ys[0],ys[ys.length-1]+1).map(r=>r.slice(xs[0],xs[xs.length-1]+1));
    const slots=slotsOf(R);
    const words=slots.map(s=>cellsOf(s).map(([x,y])=>R[y][x]).join(''));
    if(slots.length!==want||new Set(words).size!==words.length||!words.every(w=>pool.includes(w)))continue;
    // ひとつながりか
    const cells=[];R.forEach((row,y)=>row.forEach((c,x)=>{if(c)cells.push(x+','+y)}));const seen=new Set([cells[0]]),st=[cells[0]];
    while(st.length){const [x,y]=st.pop().split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(cells.includes(k)&&!seen.has(k)){seen.add(k);st.push(k)}}}
    if(seen.size!==cells.length)continue;
    // 答えがひとつになるまで、最初から置く言葉を足す（最大2つ）
    let givens=[];const order=slots.map((s,i)=>i).sort((a,b)=>slots[b].len-slots[a].len);
    let cnt=countSolutions(R,slots,words,givens);
    for(const g of order){if(cnt===1||givens.length>=2)break;const c2=countSolutions(R,slots,words,[...givens,g]);if(c2<cnt||c2===1){givens.push(g);cnt=c2}}
    if(cnt!==1)continue;
    if(levels.length===0&&givens.length===0)givens=[order[order.length-1]];
    // 合言葉：盤の文字で作れるもの
    const all=[];R.forEach((row,y)=>row.forEach((c,x)=>{if(c)all.push([x,y,c])}));
    const pw=PASSWORDS.filter(p=>!words.includes(p)&&p.length>=2&&p.length<=Math.max(3,Math.min(6,Math.floor(want/2)+1))).sort(()=>r()-.5).sort((a,b)=>usedPw.has(a)-usedPw.has(b)).find(p=>{const pool=all.slice();return word(p).every(ch=>{const i=pool.findIndex(c=>c[2]===ch);if(i<0)return false;pool.splice(i,1);return true})});
    if(!pw)continue;
    const pool2=all.slice().sort(()=>r()-.5),marks=word(pw).map(ch=>{const i=pool2.findIndex(c=>c[2]===ch);const c=pool2.splice(i,1)[0];return [c[0],c[1]]});
    usedPw.add(pw);
    levels.push({theme,rows:R.map(r=>r.map(c=>c||'.').join('')),slots:slots.map(s=>[s.x,s.y,s.dir,s.len]),words,givens,pw,marks});
    process.stderr.write(`${levels.length}:${theme} ${R[0].length}x${R.length} 言葉${want} 置き済み${givens.length} 合言葉=${pw} (試行${attempt})\n`);break;
  }
}
const out='// tools/katsuji-gen.cjs が生成。手で編集しない。\n// rows: 盤（. は黒マス）、slots: [列,行,向き a横/d縦,長さ]、words: 置き場ごとの答え、givens: 最初から置く置き場、pw: 合言葉、marks: 二重マス（合言葉の順）\nwindow.KATSUJI_LEVELS='+JSON.stringify(levels)+';\n';
fs.writeFileSync(path.join(__dirname,'..','katsuji-levels.js'),out);
console.log('levels',levels.length,'bytes',out.length);
