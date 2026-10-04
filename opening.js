/* ひらめきの庭：オープニング
   アプリを開いてタイトル画面に入るときだけ流す（ゲームから庭へ戻るとき、ゲーム画面で開いたとき、
   動きを減らす設定のときは流さない）。「ひ・ら・め・き・の」を一文字ずつ別のパズルで組み上げ、
   最後に五色のかけらが「庭」にまとまって、選択中のゲームのタイトル画面の色へ明ける。
   映像はCanvas、音はWeb Audioでその場で合成し、画像・音声ファイルは使わない。 */
(()=>{
const TITLE_HASHES=['','#garden','#collection'];
if(!TITLE_HASHES.includes(location.hash))return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

// 書体：この映像で使う文字だけを取り寄せる（Google Fonts、すべてSIL Open Font License 1.1）
const LABEL_TEXT='ひらめきの庭塗る合わせる映す満たすひらくまとめて、。→集を音ありではじめるなしスキップ›';
const LATIN_TEXT='HIRAMEKIGARDENTITLESEQUNCFVPZOWFLAYCSTUDGNRBHJ0123456789:/—, ';
const fontCss=Promise.all([
  ['Reggae+One&family=Hachi+Maru+Pop&family=Kaisei+Decol:wght@700&family=Potta+One&family=Train+One&family=Zen+Antique+Soft','ひらめきの庭'],
  ['Zen+Kaku+Gothic+New:wght@500;900',LABEL_TEXT],
  ['Unbounded:wght@400;600;700',LATIN_TEXT],
].map(([fam,text])=>new Promise(done=>{const l=document.createElement('link');l.rel='stylesheet';l.href=`https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}&display=swap`;l.onload=l.onerror=done;document.head.appendChild(l)})));

const root=document.createElement('div');
root.id='opening';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','ひらめきの庭 オープニング');
root.innerHTML=`<canvas id="op-canvas" aria-hidden="true"></canvas>
<div class="op-layer op-frame" id="op-frame" aria-hidden="true"><i></i><i></i>
  <span class="op-cap op-tl">HIRAMEKI GARDEN</span><span class="op-cap op-tr">TITLE SEQUENCE — FIVE PUZZLES, ONE GARDEN</span>
  <span class="op-cap op-bl" id="op-tc">00:00:00</span><span class="op-cap op-br" id="op-idx">00 / 06</span>
</div>
<div class="op-layer" id="op-beats" aria-hidden="true"></div>
<div class="op-sub" id="op-sub" aria-hidden="true"><p class="op-en">HIRAMEKI GARDEN</p><div class="op-bar"></div><p class="op-tag">ひらめきを、集める庭。</p></div>
<div class="op-iris" id="op-iris"></div>
<div class="op-start" id="op-start"><p>HIRAMEKI GARDEN</p><button id="op-play-sound" class="op-primary" type="button">▶ 音ありではじめる</button><button id="op-play-mute" type="button">音なしではじめる</button><button id="op-start-skip" class="op-quiet" type="button">オープニングをスキップ</button></div>
<div class="op-ui"><button id="op-sound" type="button" aria-pressed="true">♪ 音 ON</button><button id="op-skip" type="button">スキップ ›</button></div>`;
document.documentElement.classList.add('op-lock');
(document.body||document.documentElement).appendChild(root);
// 白い光は、これから入るタイトル画面の地の色にそろえる
const pageBg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
if(pageBg)root.style.setProperty('--op-end',pageBg);

const DURATION=10;
const $=id=>document.getElementById('op-'+id);
const cv=$('canvas'),x=cv.getContext('2d');
const C={blue:'#4a6dff',coral:'#ff5d4f',sand:'#f2c14e',violet:'#a084ff',lime:'#c9f26b',cream:'#f4f1ea'};

// 補間
const clamp=v=>Math.max(0,Math.min(1,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const outExpo=v=>v>=1?1:1-Math.pow(2,-10*v);
const outBack=v=>{const c=1.7;return 1+(c+1)*Math.pow(v-1,3)+c*Math.pow(v-1,2)};
const inOut=v=>v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;
const inoutVis=(t,a,b,f=.3)=>Math.min(seg(t,a,a+f),1-seg(t,b-f,b));
const lerp=(a,b,k)=>a+(b-a)*k;
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;

let W=0,H=0,S=0,cx=0,cy=0,DPR=1;
function resize(){DPR=devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;S=Math.min(W,H);cx=W/2;cy=H/2-S*.02}

// 3D：Z→Y→Xの順に回し、透視投影する
function rot([px,py,pz],[ax,ay,az]){
  let c=Math.cos(az),s=Math.sin(az);[px,py]=[px*c-py*s,px*s+py*c];
  c=Math.cos(ay);s=Math.sin(ay);[px,pz]=[px*c+pz*s,-px*s+pz*c];
  c=Math.cos(ax);s=Math.sin(ax);[py,pz]=[py*c-pz*s,py*s+pz*c];
  return [px,py,pz];
}
const camD=()=>S*1.7;
const proj=([px,py,pz])=>{const k=camD()/(pz+camD());return [cx+px*k,cy+py*k]};

// ── 文字の型 ──
const T=512,CHARS=[...'ひらめきの庭'];
// 一文字ずつ書体を変える（すべてGoogle Fonts、SIL Open Font License 1.1）
const FONTS=[
  {family:'Reggae One',weight:400,label:'REGGAE ONE'},
  {family:'Hachi Maru Pop',weight:400,label:'HACHI MARU POP'},
  {family:'Kaisei Decol',weight:700,label:'KAISEI DECOL'},
  {family:'Potta One',weight:400,label:'POTTA ONE'},
  {family:'Train One',weight:400,label:'TRAIN ONE'},
  {family:'Zen Antique Soft',weight:400,label:'ZEN ANTIQUE SOFT'},
];
const mk=()=>{const c=document.createElement('canvas');c.width=c.height=T;return c};
let glyph=[];
// 書体ごとに字面の大きさと位置が違うので、実際の外形を測って中央にそろえる
function makeGlyphs(){glyph=CHARS.map((ch,k)=>{const c=mk(),g=c.getContext('2d'),f=FONTS[k];
  const font=sz=>`${f.weight} ${sz}px "${f.family}", "Zen Kaku Gothic New", sans-serif`;
  g.font=font(T*.8);const m=g.measureText(ch),w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
  const k2=Math.min(T*.76/w,T*.76/h);g.font=font(T*.8*k2);const m2=g.measureText(ch);
  g.fillStyle=C.cream;g.textAlign='left';g.textBaseline='alphabetic';
  g.fillText(ch,T/2-(m2.actualBoundingBoxRight-m2.actualBoundingBoxLeft)/2,T/2+(m2.actualBoundingBoxAscent-m2.actualBoundingBoxDescent)/2);return c})}
// 文字の墨がかかるマスを調べる
function inkCells(k,n){const d=glyph[k].getContext('2d').getImageData(0,0,T,T).data,s=T/n,out=[];
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=0,c=0;for(let y=j*s;y<(j+1)*s;y+=4)for(let xx=i*s;xx<(i+1)*s;xx+=4){a+=d[(Math.floor(y)*T+Math.floor(xx))*4+3];c++}if(a/c/255>.05)out.push([i,j])}return out}
let INK={};

// ── 盤面の描画（テクスチャ） ──
const tex=mk(),sil=mk(),mask=mk();
let glyphTint={};
function tinted(k,col){const key=k+col;if(glyphTint[key])return glyphTint[key];const c=mk(),g=c.getContext('2d');g.drawImage(glyph[k],0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,T,T);return glyphTint[key]=c}
function rr(g,px,py,w,h,r){g.beginPath();g.roundRect(px,py,w,h,r)}
const M=56,A=T-M*2; // 盤の内側

// 1 塗る → ひ：お絵かきロジック。白い方眼紙を、数字を手がかりに一行ずつ塗る
function runs(line){const r=[];let c=0;for(const v of line){if(v)c++;else if(c){r.push(c);c=0}}if(c)r.push(c);return r.length?r:[0]}
function pzHi(g,a,lift){
  g.clearRect(0,0,T,T);rr(g,6,6,T-12,T-12,18);const bg=g.createLinearGradient(0,0,0,T);bg.addColorStop(0,'#f7f3ea');bg.addColorStop(1,'#e6e0d2');g.fillStyle=bg;g.fill();
  const n=12,CL=78,gx=M+CL-30,gy=M+CL-30,G=T-gx-40,cs=G/n,on=NONO;
  g.strokeStyle='#1b234022';g.lineWidth=1;for(let i=0;i<=n;i++){g.lineWidth=i%4?1:2;g.beginPath();g.moveTo(gx+i*cs,gy);g.lineTo(gx+i*cs,gy+G);g.moveTo(gx,gy+i*cs);g.lineTo(gx+G,gy+i*cs);g.stroke()}
  const row=Math.floor(a*1.12*n),close=seg(a,.86,1);
  g.font='600 15px Unbounded, sans-serif';g.textBaseline='middle';
  for(let j=0;j<n;j++){g.fillStyle=j===row?C.blue:'#1b234088';g.textAlign='right';g.fillText(runs(on[j]).join('  '),gx-8,gy+(j+.5)*cs)}
  for(let i=0;i<n;i++){g.fillStyle='#1b234088';g.textAlign='center';runs(on.map(r=>r[i])).reverse().forEach((v,q)=>g.fillText(v,gx+(i+.5)*cs,gy-12-q*17))}
  if(lift)return;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){if(!on[j][i])continue;const v=seg(a*1.12*n,j+i/n*.8,j+i/n*.8+.6);if(!v)continue;
    g.globalAlpha=(1-close);g.fillStyle='#1b2340';const p=cs*.08+(1-v)*cs*.3;g.fillRect(gx+i*cs+p,gy+j*cs+p,cs-2*p,cs-2*p);g.globalAlpha=1}
  if(close>0){g.globalAlpha=close;g.drawImage(tinted(0,'#1b2340'),gx,gy,G,G);g.globalAlpha=1}
}
// 2 合わせる → ら：リング錠。輪を一つずつ回して、文字の模様をそろえる
const RINGS=[[0,.12],[.12,.2],[.2,.28],[.28,.36],[.36,.46]],RING0=[2.2,-2.7,1.6,-1.9,2.9];
function pzRa(g,a,lift){
  g.clearRect(0,0,T,T);const c=T/2;
  g.beginPath();g.arc(c,c,T*.47,0,7);g.fillStyle='#24121a';g.fill();g.lineWidth=5;g.strokeStyle='#ff5d4f88';g.stroke();
  for(let r=RINGS.length-1;r>=0;r--){const [r0,r1]=RINGS[r],e=outBack(seg(a,(RINGS.length-1-r)*.15,(RINGS.length-1-r)*.15+.32)),ang=RING0[r]*(1-e);
    g.save();g.beginPath();g.arc(c,c,r1*T,0,Math.PI*2);if(r0){g.moveTo(c+r0*T,c);g.arc(c,c,r0*T,0,Math.PI*2,true)}g.clip('evenodd');
    g.fillStyle=r%2?'#ff5d4f22':'#ff5d4f12';g.fillRect(0,0,T,T);
    g.translate(c,c);g.rotate(ang);g.translate(-c,-c);
    if(!lift)g.drawImage(glyph[1],T*.07,T*.07,T*.86,T*.86);
    // 目印の刻み
    g.fillStyle=C.coral;g.beginPath();g.arc(c,c-(r0+r1)/2*T,4,0,7);g.fill();
    g.restore();
    g.beginPath();g.arc(c,c,r1*T,0,7);g.lineWidth=2;g.strokeStyle='#ff5d4f55';g.stroke();
  }
  g.fillStyle='#fff';g.beginPath();g.moveTo(c-9,T*.02);g.lineTo(c+9,T*.02);g.lineTo(c,T*.05);g.fill();
}
// 3 映す → め：影絵。手前の立体を回すと、壁に落ちる影が文字になる
function pzMe(g,a,lift){
  g.clearRect(0,0,T,T);rr(g,6,6,T-12,T-12,24);const bg=g.createRadialGradient(T*.55,T*.45,T*.05,T/2,T/2,T*.75);bg.addColorStop(0,'#f6e7bf');bg.addColorStop(1,'#bfa56a');g.fillStyle=bg;g.fill();
  if(lift)return;const al=inOut(seg(a,0,.8)),blur=(1-al)*18;
  g.save();g.translate(T/2,T/2);g.rotate((1-al)*.9);g.transform(1,0,(1-al)*.6,1,0,0);g.scale(lerp(.3,1,al),lerp(.8,1,al));
  const sh=tinted(2,'#2a2110');for(let q=0;q<6;q++){const o=blur*(q/5-.5);g.globalAlpha=(.85/(blur>1?3:1))*(q?1:1);g.drawImage(sh,-T*.42+o,-T*.42-o*.6,T*.84,T*.84)}
  g.restore();g.globalAlpha=1;
}
// 4 満たす → き：ビー玉が次々に落ちて、文字の形を満たす
const outBounce=v=>{const n=7.5625,d=2.75;if(v<1/d)return n*v*v;if(v<2/d)return n*(v-=1.5/d)*v+.75;if(v<2.5/d)return n*(v-=2.25/d)*v+.9375;return n*(v-=2.625/d)*v+.984375};
function pzKi(g,a,lift){
  g.clearRect(0,0,T,T);rr(g,6,6,T-12,T-12,40);const bg=g.createLinearGradient(0,0,T,T);bg.addColorStop(0,'#251d3f');bg.addColorStop(1,'#120e20');g.fillStyle=bg;g.fill();g.strokeStyle='#a084ff66';g.lineWidth=4;g.stroke();
  if(lift)return;const close=seg(a,.86,1);
  g.globalAlpha=.1*(1-close);g.drawImage(glyph[3],0,0);g.globalAlpha=1;
  for(const b of BALLS){const v=seg(a,b.d,b.d+.2);if(!v)continue;const y=lerp(-30,b.y,outBounce(v)),r=b.r*(1-close*.9);
    g.beginPath();g.arc(b.x+b.dx*(1-v),y,r,0,7);g.fillStyle=b.col;g.fill();g.beginPath();g.arc(b.x+b.dx*(1-v)-r*.35,y-r*.35,r*.3,0,7);g.fillStyle='#ffffffaa';g.fill()}
  if(close>0){g.globalAlpha=close;g.drawImage(glyph[3],0,0);g.globalAlpha=1}
}
// 5 ひらく → の：四隅を折りたたんだ紙を、一枚ずつ開く
function pzNo(g,a,lift){
  g.clearRect(0,0,T,T);const P0=M,P=A,mid=P0+P/2,close=seg(a,.86,1);
  const front=(gg)=>{const gr=gg.createLinearGradient(P0,P0,P0+P,P0+P);gr.addColorStop(0,'#d8f78a');gr.addColorStop(1,'#a9d34a');gg.fillStyle=gr;gg.fillRect(P0,P0,P,P);if(!lift)gg.drawImage(tinted(4,'#24330d'),P0+P*.06,P0+P*.06,P*.88,P*.88)};
  g.globalAlpha=1-close*(lift?0:1);
  // 中央のひし形（常に表）
  g.save();g.beginPath();g.moveTo(mid,P0);g.lineTo(P0+P,mid);g.lineTo(mid,P0+P);g.lineTo(P0,mid);g.closePath();g.clip();front(g);g.restore();
  const flaps=[[[P0,P0],[mid,P0],[P0,mid]],[[P0+P,P0],[P0+P,mid],[mid,P0]],[[P0+P,P0+P],[mid,P0+P],[P0+P,mid]],[[P0,P0+P],[P0,mid],[mid,P0+P]]];
  const order=flaps.map((f,q)=>{const e=inOut(seg(a,q*.18,q*.18+.3));return {f,c:Math.cos(Math.PI*(1-e))}}).sort((p,q)=>q.c-p.c);
  for(const {f:[corner,p1,p2],c} of order){
    let nx=-(p2[1]-p1[1]),ny=p2[0]-p1[0];const l=Math.hypot(nx,ny);nx/=l;ny/=l;if((corner[0]-p1[0])*nx+(corner[1]-p1[1])*ny<0){nx=-nx;ny=-ny}
    const k=1-c,d=p1[0]*nx+p1[1]*ny;
    g.save();g.transform(1-k*nx*nx,-k*nx*ny,-k*nx*ny,1-k*ny*ny,k*d*nx,k*d*ny);
    g.beginPath();g.moveTo(...corner);g.lineTo(...p1);g.lineTo(...p2);g.closePath();g.clip();
    if(c>=0)front(g);else{g.fillStyle='#eef9c8';g.fillRect(P0,P0,P,P)}
    g.fillStyle=`rgba(20,30,5,${.3*(1-Math.abs(c))})`;g.fillRect(P0,P0,P,P);g.restore();
  }
  g.strokeStyle='#24330d33';g.lineWidth=1.5;g.beginPath();g.moveTo(mid,P0);g.lineTo(P0+P,mid);g.lineTo(mid,P0+P);g.lineTo(P0,mid);g.closePath();g.stroke();
  g.globalAlpha=1;if(close>0&&!lift){g.globalAlpha=close;g.drawImage(glyph[4],P0+P*.06,P0+P*.06,P*.88,P*.88);g.globalAlpha=1}
}
const PUZZLES=[pzHi,pzRa,pzMe,pzKi,pzNo];
const SCENE=[{col:C.blue,bg:'#101633',w:'塗る',en:'FILL'},{col:C.coral,bg:'#2a1012',w:'合わせる',en:'ALIGN'},{col:C.sand,bg:'#241f10',w:'映す',en:'CAST'},{col:C.violet,bg:'#1a1430',w:'満たす',en:'POUR'},{col:C.lime,bg:'#141f10',w:'ひらく',en:'UNFOLD'}];
const S0=k=>.6+k*1.25,GARDEN=6.85,PING=7.92;
let NONO=[],BALLS=[];
function puzzleData(){
  const cells=inkCells(0,12);NONO=[...Array(12)].map(()=>Array(12).fill(0));cells.forEach(([i,j])=>NONO[j][i]=1);
  const d=glyph[3].getContext('2d').getImageData(0,0,T,T).data,r=rng(17),pts=[],sp=T*.042;
  for(let y=sp/2;y<T;y+=sp)for(let xx=sp/2;xx<T;xx+=sp){const jx=xx+(r()-.5)*sp*.5,jy=y+(r()-.5)*sp*.5;if(d[(Math.floor(jy)*T+Math.floor(jx))*4+3]>140)pts.push([jx,jy])}
  pts.sort((p,q)=>q[1]-p[1]);const cols=['#a084ff','#c9b8ff','#f4f1ea','#7d63e8'];
  BALLS=pts.map(([px,py],q)=>({x:px,y:py,r:sp*.55,d:q/pts.length*.68,dx:(r()-.5)*60,col:cols[q%4]}));
}

// 影絵の立体（小さな立方体の集まり）
const FACES=[[[1,0,0],[1,2,6,5]],[[-1,0,0],[0,4,7,3]],[[0,1,0],[3,7,6,2]],[[0,-1,0],[0,1,5,4]],[[0,0,1],[4,5,6,7]],[[0,0,-1],[0,3,2,1]]];
const VERTS=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const LIGHT=(()=>{const v=[-.4,-.65,-.7],l=Math.hypot(...v);return v.map(n=>n/l)})();
const CLUSTER=[[0,0,0],[1,0,0],[0,1,0],[0,-1,0],[-1,0,1],[0,0,-1],[1,1,1],[-1,-1,0]];
function drawCluster(pos,ang,h,alpha){
  const list=[];for(const cc of CLUSTER){const place=v=>{const r=rot(v,ang);return [r[0]+pos[0],r[1]+pos[1],r[2]+pos[2]]};const ctr=cc.map(v=>v*h*2.05);
    const vs=VERTS.map(v=>place([ctr[0]+v[0]*h,ctr[1]+v[1]*h,ctr[2]+v[2]*h])),faces=[];
    for(const [nn,idx] of FACES){const nr=rot(nn,ang),fc=idx.reduce((s,q)=>[s[0]+vs[q][0]/4,s[1]+vs[q][1]/4,s[2]+vs[q][2]/4],[0,0,0]);if(nr[0]*fc[0]+nr[1]*fc[1]+nr[2]*(fc[2]+camD())>=0)continue;
      const lit=.4+.6*Math.max(0,nr[0]*LIGHT[0]+nr[1]*LIGHT[1]+nr[2]*LIGHT[2]);faces.push({pts:idx.map(q=>proj(vs[q])),fill:`rgba(${[242,193,78].map(v=>Math.round(v*lit)).join(',')},${alpha})`})}
    list.push({z:place(ctr)[2],faces})}
  list.sort((p,q)=>q.z-p.z);for(const f of list.flatMap(c=>c.faces)){x.beginPath();f.pts.forEach(([u,v],q)=>q?x.lineTo(u,v):x.moveTo(u,v));x.closePath();x.fillStyle=f.fill;x.fill();x.strokeStyle=`rgba(255,240,200,${.25*alpha})`;x.lineWidth=1;x.stroke()}
}

// 盤を厚みつきの板として3Dで描く
function drawSlab(pos,ang,s,alpha){
  const g=sil.getContext('2d');g.globalCompositeOperation='copy';g.drawImage(tex,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#07080c';g.fillRect(0,0,T,T);g.globalCompositeOperation='source-over';
  const d=s*.07,layers=8,n=rot([0,0,-1],ang),front=n[2]<0?-1:1;
  const face=w=>{const c=(u,v)=>{const r=rot([u*s,v*s,w],ang);return proj([r[0]+pos[0],r[1]+pos[1],r[2]+pos[2]])};const p00=c(-1,-1),p10=c(1,-1),p01=c(-1,1);x.setTransform((p10[0]-p00[0])/T*DPR,(p10[1]-p00[1])/T*DPR,(p01[0]-p00[0])/T*DPR,(p01[1]-p00[1])/T*DPR,p00[0]*DPR,p00[1]*DPR)};
  x.globalAlpha=alpha;
  for(let l=0;l<layers;l++){face(-front*d+front*2*d*l/layers);x.drawImage(sil,0,0)}
  face(front*d);x.drawImage(tex,0,0);
  x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;
}
function boardPose(k,t){
  const u=t-S0(k),sign=k%2?1:-1,inn=outExpo(seg(u,0,.5)),ex=inOut(seg(u,1.0,1.3)),flo=Math.sin(t*2+k)*S*.006;
  return {pos:[lerp(-sign*S*.5,0,inn)+ex*sign*S*.7,lerp(S*.15,0,inn)+flo,lerp(S*1.2,0,inn)+ex*S*.5],
    ang:[lerp(.9,.1,inn)+Math.sin(t*1.3)*.03,lerp(-sign*1.4,sign*.16,inn)+ex*sign*1.4,lerp(sign*.4,0,inn)],s:boardS(),alpha:Math.min(1,u*5)*(1-ex)};
}

// 文字の置き場所（縦長の画面では盤と庭を大きく）
const boardS=()=>S*(W<H?.3:.22),niwaZ=()=>S*(W<H?.62:.5);
const chipY=()=>cy+Math.min(S*.4,H*.5-96),chipX=i=>cx+(i-2.5)*S*.085,chipSize=()=>S*.072;
// ロゴでは「庭」だけ一回り大きく。その分だけ右へ寄せ、列全体を少し左へずらして中央を保つ
const L=()=>Math.min(S*.15,W*.13),NIWA_K=1.32;
const logoX=i=>cx+(i-2.5)*L()-L()*.1+(i===5?L()*.2:0),logoY=()=>cy-S*.04,logoSize=i=>L()*.95*(i===5?NIWA_K:1);
const waitY=()=>cy-S*.34;

const BEATS=SCENE.map((_,k)=>[S0(k)+.12,S0(k)+1.2,.15]).concat([[GARDEN+.05,PING-.1,.2]]);
const beatEls=SCENE.map((sc,k)=>[sc.col,`0${k+1}`,`${sc.w} → ${CHARS[k]}`,sc.en]).concat([[C.cream,'06','まとめて、庭。','GARDEN']]).map((r,k)=>[r[0],r[1],r[2],`${r[3]} / ${FONTS[k].label}`]).map(([c,n,w,en])=>{const p=document.createElement('p');p.className='op-beat';p.style.setProperty('--c',c);p.innerHTML=`<b>${n}</b><span>${w}</span><em>${en}</em>`;$('beats').appendChild(p);return p});

// 「庭」のタイル：五つのパズルの色が集まってくる
let NIWA=[];
function niwaTiles(){const r=rng(33),cols=[C.blue,C.coral,C.sand,C.violet,C.lime];NIWA=INK['5_6'].flatMap(([i,j],q)=>[0,1].map(h=>({i,j,h,diag:(i+j)%2,from:(q*2+h)%5,ang:r()*Math.PI*2,rad:.5+r()*.5,spin:(r()-.5)*7,d:r()*.32,col:cols[(q*2+h)%5]})))}
// 三角のかけら：マスを対角線で二つに割る
function triPath(cs,tl){const a=-cs/2,b=cs/2;x.beginPath();const P=tl.diag?(tl.h?[[a,a],[b,a],[a,b]]:[[b,a],[b,b],[a,b]]):(tl.h?[[a,a],[b,a],[b,b]]:[[a,a],[b,b],[a,b]]);P.forEach(([u,v],q)=>q?x.lineTo(u,v):x.moveTo(u,v));x.closePath()}

const sparks=(r=>Array.from({length:44},(_,i)=>({dir:r()*Math.PI*2,fly:.35+.45*r(),size:.6+r()*.9,col:[C.blue,C.coral,C.sand,C.violet,C.lime][i%5]})))(rng(7));

function drawGlyph(k,px,py,size,alpha=1){if(alpha<=0)return;x.globalAlpha=alpha;x.drawImage(glyph[k],px-size/2,py-size/2,size,size);x.globalAlpha=1}

function render(t){
  x.setTransform(DPR,0,0,DPR,0,0);x.globalAlpha=1;x.shadowBlur=0;x.lineCap='round';
  // 背景：場面ごとの色が斜めのワイプで切り替わる
  let prev='#0b0b10',cur='#0b0b10',edge=1,accent=null;
  const cuts=SCENE.map((sc,k)=>[S0(k)-.05,sc.bg,sc.col]).concat([[GARDEN-.05,'#0b0b10',C.cream]]);
  for(let q=0;q<cuts.length;q++){if(t>=cuts[q][0]){prev=q?cuts[q-1][1]:'#0b0b10';cur=cuts[q][1];accent=cuts[q][2];edge=outExpo(seg(t,cuts[q][0],cuts[q][0]+.4))}}
  x.fillStyle=edge<1?prev:cur;x.fillRect(0,0,W,H);
  if(edge<1){const ex=lerp(-H*.5,W+H*.5,edge);x.beginPath();x.moveTo(-10,0);x.lineTo(ex+H*.25,0);x.lineTo(ex-H*.25,H);x.lineTo(-10,H);x.closePath();x.fillStyle=cur;x.fill();
    x.strokeStyle=accent;x.lineWidth=S*.012;x.beginPath();x.moveTo(ex+H*.25,0);x.lineTo(ex-H*.25,H);x.stroke()}
  const vg=x.createRadialGradient(cx,cy,S*.2,cx,cy,Math.hypot(W,H)*.6);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=vg;x.fillRect(0,0,W,H);

  // 始まり：細い線と点
  const op=seg(t,0,.35)*(1-seg(t,.5,.7));
  if(op>0){x.fillStyle=`rgba(244,241,234,${op})`;const w=W*outExpo(seg(t,0,.45));x.fillRect(cx-w/2,cy-.5,w,1);x.beginPath();x.arc(cx,cy,S*.006,0,7);x.fill()}

  // 場面ごとの大きな文字の影（モーションリール風）
  for(let k=0;k<5;k++){const u=t-S0(k);if(u<0||u>1.3)continue;const a=inoutVis(t,S0(k),S0(k)+1.3,.25)*.07,sz=Math.max(W,H)*1.1;x.globalAlpha=a;x.drawImage(glyph[k],cx-sz/2+(k%2?-1:1)*(u-.65)*S*.25,cy-sz/2,sz,sz);x.globalAlpha=1}

  // パズルの盤
  for(let k=0;k<5;k++){const u=t-S0(k);if(u<0||u>1.3)continue;
    PUZZLES[k](tex.getContext('2d'),seg(u,.28,1.0),u>1.0);const p=boardPose(k,t);if(k===2)p.pos[0]+=S*.09;drawSlab(p.pos,p.ang,p.s,p.alpha);
    // 影絵の立体：回りながら、正面を向いた瞬間に影が文字になる
    if(k===2){const al=inOut(seg(seg(u,.28,1.0),0,.8));drawCluster([p.pos[0]-p.s*1.55,p.pos[1]-p.s*.1,p.pos[2]-S*.18],[lerp(1.3,.25,al)+u*.2,lerp(2.8,.45,al),lerp(.9,.1,al)],p.s*.085,p.alpha*(1-seg(u,1.0,1.2)))}}

  // 完成した文字が盤から抜け出して、下の列へ並ぶ
  for(let k=0;k<5;k++){const u=t-S0(k);if(u<1.0)continue;
    const fly=inOut(seg(u,1.0,1.4)),toWait=inOut(seg(t,GARDEN,GARDEN+.45)),toLogo=inOut(seg(t,PING,PING+.55));
    const bs=boardS()*2,sx=lerp(cx,chipX(k),fly),sy=lerp(cy,chipY(),fly)-Math.sin(fly*Math.PI)*S*.08,ss=lerp(bs*.98,chipSize(),fly);
    let px=lerp(sx,chipX(k)*0+cx+(k-2)*L()*.62,toWait),py=lerp(sy,waitY(),toWait),ps=lerp(ss,L()*.55,toWait);
    px=lerp(px,logoX(k),toLogo);py=lerp(py,logoY(),toLogo);ps=lerp(ps,logoSize(k),toLogo);
    const pop=1+.12*Math.sin(seg(u,1.35,1.55)*Math.PI);drawGlyph(k,px,py,ps*pop,1-seg(t,9.05,9.35));
  }

  // 庭：五色のタイルが集まって、大きな「庭」になる
  if(t>=GARDEN){
    const Z=niwaZ(),n=6,cs=Z/n,ox=cx-Z/2,oy=cy+S*.02-Z/2,close=seg(t,7.6,7.8),toLogo=inOut(seg(t,PING,PING+.55));
    if(toLogo<1){
      x.save();const lx=logoX(5),ly=logoY(),k2=lerp(1,logoSize(5)/Z,toLogo);x.translate(lerp(cx,lx,toLogo),lerp(cy+S*.02,ly,toLogo));x.scale(k2,k2);x.translate(-cx,-(cy+S*.02));
      for(const tl of NIWA){
        const v=outExpo(seg(t,GARDEN+.15+tl.d,GARDEN+.75+tl.d));if(!v)continue;
        const fx=chipX(tl.from)-cx,fy=(waitY()-cy),sx=cx+lerp(fx+Math.cos(tl.ang)*S*tl.rad*.6,0,0),hx=ox+tl.i*cs,hy=oy+tl.j*cs;
        const px=lerp(cx+(tl.from-2)*L()*.62+Math.cos(tl.ang)*S*.15,hx,v),py=lerp(waitY()+Math.sin(tl.ang)*S*.1,hy,v);
        x.save();x.translate(px+cs/2,py+cs/2);x.rotate(tl.spin*(1-v));x.scale(lerp(.3,1,v),lerp(.3,1,v));
        const gap=cs*.08*(1-close);
        x.scale(1-gap/cs*2,1-gap/cs*2);triPath(cs,tl);x.fillStyle=tl.col;x.globalAlpha=.85*(1-close);x.fill();x.globalAlpha=1;
        triPath(cs,tl);x.clip();x.drawImage(glyph[5],tl.i*T/n,tl.j*T/n,T/n,T/n,-cs/2,-cs/2,cs,cs);x.restore();
      }
      x.restore();
    }else drawGlyph(5,logoX(5),logoY(),logoSize(5),1-seg(t,9.05,9.35));
    // 芯の光
    const glow=seg(t,7.55,7.9)*(1-seg(t,PING,PING+.3));if(glow>0){const g=x.createRadialGradient(cx,cy,0,cx,cy,S*.45);g.addColorStop(0,`rgba(255,244,214,${.35*glow})`);g.addColorStop(1,'rgba(255,244,214,0)');x.fillStyle=g;x.fillRect(0,0,W,H)}
  }
  // ひらめきの瞬間：輪と火花
  const sw=seg(t,PING,PING+.9);
  if(sw>0&&sw<1){x.strokeStyle=`rgba(255,244,214,${.7*(1-sw)})`;x.lineWidth=S*.01*(1-sw)+1;x.beginPath();x.arc(cx,cy,S*(.2+.7*outExpo(sw)),0,7);x.stroke();
    for(const b of sparks){const d=S*(.26+b.fly*outExpo(sw)),d0=S*(.26+b.fly*outExpo(Math.max(0,sw-.08)));x.strokeStyle=b.col;x.globalAlpha=1-sw;x.lineWidth=S*.005*b.size;x.beginPath();x.moveTo(cx+Math.cos(b.dir)*d0,cy+Math.sin(b.dir)*d0);x.lineTo(cx+Math.cos(b.dir)*d,cy+Math.sin(b.dir)*d);x.stroke()}x.globalAlpha=1}
  const fl=(1-seg(t,PING,PING+.4))*(t>=PING?.45:0);if(fl>0){x.fillStyle=`rgba(255,248,228,${fl})`;x.fillRect(0,0,W,H)}

  // 文字のレイヤー
  const fr=seg(t,.2,.9);
  $('frame').style.opacity=1-seg(t,8.9,9.3);root.querySelectorAll('.op-frame i').forEach(i=>i.style.transform=`scaleX(${outExpo(fr)})`);
  root.querySelectorAll('.op-cap').forEach(c=>c.style.opacity=seg(t,.4,.9));
  const sec=Math.min(t,DURATION);$('tc').textContent=`00:${String(Math.floor(sec)).padStart(2,'0')}:${String(Math.floor(sec%1*24)).padStart(2,'0')}`;
  let curB=0;BEATS.forEach(([a],k)=>{if(t>=a)curB=k+1});$('idx').textContent=`0${curB} / 06`;
  BEATS.forEach(([a,b,f],k)=>{const el=beatEls[k],v=inoutVis(t,a,b,f),out=seg(t,b-f,b);el.style.opacity=v;el.style.transform=`translateX(${(1-seg(t,a,a+.3))*-24+out*16}px)`;el.style.filter=`blur(${(1-v)*5}px)`});
  const sub=$('sub');sub.style.top=`${logoY()+L()*.7}px`;sub.style.opacity=1-seg(t,9.05,9.35);
  sub.querySelector('.op-en').style.opacity=seg(t,8.35,8.85);sub.querySelector('.op-en').style.letterSpacing=`${.6+.4*(1-outExpo(seg(t,8.35,9.0)))}em`;
  sub.querySelector('.op-bar').style.transform=`scaleX(${inOut(seg(t,8.45,9.0))})`;sub.querySelector('.op-tag').style.opacity=seg(t,8.6,9.0);

  // 白い光が広がり、タイトル画面へ渡す
  const ir=inOut(seg(t,9.25,10)),iy=logoY();$('iris').style.clipPath=`circle(${ir*Math.hypot(W/2,Math.max(iy,H-iy))+(ir>0?2:0)}px at 50% ${iy}px)`;
}

// ── 音（すべてWeb Audioで合成。外部の音源ファイルは使わない） ──
let AC=null,master=null,verb=null,soundOn=true,live=[],NB=null;
function audioInit(){
  if(AC)return;AC=new (window.AudioContext||window.webkitAudioContext)();
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(AC.destination);
  master=AC.createGain();master.gain.value=0;master.connect(comp);
  verb=AC.createConvolver();const len=AC.sampleRate*3,ir=AC.createBuffer(2,len,AC.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  verb.buffer=ir;const vg=AC.createGain();vg.gain.value=.5;verb.connect(vg);vg.connect(master);
}
const noiseBuf=()=>{const b=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b};
const hz=m=>440*Math.pow(2,(m-69)/12);
function out(node,dry=1,wet=.4){const g=AC.createGain();g.gain.value=dry;node.connect(g);g.connect(master);if(wet){const w=AC.createGain();w.gain.value=wet;node.connect(w);w.connect(verb)}}
function env(g,t,a,peak,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function osc(type,f,t,dur){const o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+dur+.1);live.push(o);return o}
function noise(t,dur){const n=AC.createBufferSource();n.buffer=NB;n.start(t,Math.random());n.stop(t+dur);live.push(n);return n}
function pad(t,dur,notes,vol=.04,cut=900){
  const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(cut*.5,t);f.frequency.linearRampToValueAtTime(cut,t+dur*.7);f.Q.value=.6;
  const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(1,dur*.3));g.gain.setValueAtTime(vol,t+dur-.5);g.gain.linearRampToValueAtTime(.0001,t+dur);
  for(const m of notes)for(const det of [-7,6]){const o=osc('sawtooth',hz(m),t,dur);o.detune.value=det;o.connect(f)}
  f.connect(g);out(g,1,.5);
}
function pluck(t,m,vol=.16,decay=.9){const o=osc('triangle',hz(m),t,decay),o2=osc('sine',hz(m+12),t,decay*.5),g=AC.createGain(),g2=AC.createGain();env(g,t,.005,vol,decay);env(g2,t,.003,vol*.35,decay*.4);o.connect(g);o2.connect(g2);g2.connect(g);out(g,1,.45)}
function whoosh(t,dur,f0,f1,vol=.1,type='lowpass'){const n=noise(t,dur+.05),f=AC.createBiquadFilter();f.type=type;f.Q.value=.6;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(f);f.connect(g);out(g,1,.3)}
function tick(t,vol=.04){const n=noise(t,.05),f=AC.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const g=AC.createGain();env(g,t,.002,vol,.04);n.connect(f);f.connect(g);out(g,1,.05)}
function click(t,vol=.08,f0=2600){const n=noise(t,.04),f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=f0;f.Q.value=3;const g=AC.createGain();env(g,t,.001,vol,.03);n.connect(f);f.connect(g);out(g,1,.15)}
function thump(t,vol=.4){const o=osc('sine',120,t,.45);o.frequency.exponentialRampToValueAtTime(45,t+.3);const g=AC.createGain();env(g,t,.005,vol,.4);o.connect(g);out(g,1,.1)}
function bell(t,m,vol=.17){for(const [r,a,d] of [[1,1,3],[2.76,.45,1.8],[5.4,.25,1.1],[8.93,.12,.6]]){const o=osc('sine',hz(m)*r,t,d),g=AC.createGain();env(g,t,.004,vol*a,d);o.connect(g);out(g,1,.6)}}
function swell(t0,t1,vol,type,freq){const n=noise(t0,t1-t0+.05),f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=AC.createGain();g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(vol,t1-.03);g.gain.linearRampToValueAtTime(.0001,t1);n.connect(f);f.connect(g);out(g,1,.15)}

function scoreAudio(base){
  NB=NB||noiseBuf();const at=s=>base+s;
  master.gain.cancelScheduledValues(base);master.gain.setValueAtTime(.0001,base);master.gain.exponentialRampToValueAtTime(.9,base+.06);
  pluck(at(.05),96,.05,1.2);
  // 五つのパズルの章：一定の刻みの上で、場面ごとに音が積み重なる
  pad(at(.5),6.45,[45,52,57,59,64],.03,800);
  for(let s=.6;s<GARDEN;s+=.3125){tick(at(s),(Math.round((s-.6)/.3125)%4===2)?.06:.035)}
  const root=[69,72,74,76,79];
  for(let k=0;k<5;k++){const s0=S0(k);
    whoosh(at(s0-.05),.4,600,5000,.09);thump(at(s0),.32);
    // パズルごとに違う手ざわりの音（時刻は盤上の進み具合 a に合わせる）
    const A=v=>at(s0+.28+v*.72);
    if(k===0)for(let j=0;j<12;j++)if(NONO[j].some(Boolean))click(A((j+.3)/(1.12*12)),.05,3400);           // 鉛筆で塗る
    if(k===1)for(let r=0;r<5;r++){const d=r*.15;for(let q=0;q<3;q++)click(A(d+q*.06),.035,1400);thump(A(d+.25),.12)}  // 輪が回って止まる
    if(k===2){whoosh(A(0),.55,200,900,.08,'lowpass');pluck(A(.8),91,.05,1.4);pluck(A(.82),98,.03,1.2)}       // 影が合う
    if(k===3)BALLS.forEach((b,q)=>{if(q%5===0){const o=osc('sine',2600+(q*137)%1600,A(b.d+.14),.06),g=AC.createGain();env(g,A(b.d+.14),.002,.03,.05);o.connect(g);out(g,1,.2)}}); // ビー玉
    if(k===4)for(let q=0;q<4;q++)whoosh(A(q*.18+.05),.24,900,3200,.07,'bandpass');                         // 紙をひらく
    // 文字ができた瞬間
    pluck(at(s0+.98),root[k],.14,1.1);pluck(at(s0+.98),root[k]+7,.06,.8);
    whoosh(at(s0+1.0),.4,1500,400,.05);
  }
  // 庭：音程は動かさず、息のような音と低いうなりで高める
  whoosh(at(GARDEN-.05),.45,500,5000,.12);thump(at(GARDEN),.35);
  swell(at(7.0),at(7.7),.08,'highpass',3500);
  {const o=osc('sine',hz(33),at(7.0),.72),g=AC.createGain();g.gain.setValueAtTime(.0001,at(7.0));g.gain.linearRampToValueAtTime(.22,at(7.67));g.gain.linearRampToValueAtTime(.0001,at(7.7));o.connect(g);out(g,1,0)}
  NIWA.forEach(tl=>click(at(GARDEN+.5+tl.d),.035,2000+tl.i*300));
  // シン…：ひらめく直前に音が消える
  master.gain.setValueAtTime(.9,at(7.68));master.gain.exponentialRampToValueAtTime(.0001,at(7.72));master.gain.setValueAtTime(.0001,at(7.9));master.gain.linearRampToValueAtTime(.9,at(7.92));
  bell(at(PING),84);bell(at(PING),91,.07);thump(at(PING),.45);
  [96,100,103,108,103].forEach((m,i)=>pluck(at(PING+.08+i*.07),m,.045,.6));
  pad(at(8.0),1.25,[48,55,59,62,64],.045,1400);
  [72,76,79,83,84,88].forEach((m,i)=>pluck(at(8.0+i*.06),m,.05,1));
  // 静まってから、白い光の「シュアーッ」
  master.gain.setValueAtTime(.9,at(8.85));master.gain.exponentialRampToValueAtTime(.08,at(9.2));master.gain.linearRampToValueAtTime(.9,at(9.25));
  whoosh(at(9.2),1.35,400,9000,.2,'highpass');whoosh(at(9.25),1.2,900,12000,.07,'bandpass');
  [84,88,91,96].forEach((m,i)=>{const o=osc('sine',hz(m),at(9.3+i*.08),1.4),g=AC.createGain();g.gain.setValueAtTime(.0001,at(9.3+i*.08));g.gain.exponentialRampToValueAtTime(.0125,at(9.8));g.gain.exponentialRampToValueAtTime(.0001,at(10.7));o.connect(g);out(g,1,.8)});
  master.gain.setValueAtTime(.9,at(10.1));master.gain.linearRampToValueAtTime(.0001,at(11.2));
}
function stopAudio(){if(!AC)return;const n=AC.currentTime;master.gain.cancelScheduledValues(n);master.gain.setValueAtTime(master.gain.value,n);master.gain.linearRampToValueAtTime(.0001,n+.25);const old=live;live=[];setTimeout(()=>old.forEach(o=>{try{o.stop()}catch(e){}}),400)}


function prepare(){makeGlyphs();glyphTint={};INK={'5_6':inkCells(5,6)};puzzleData();niwaTiles()}
let start=0,fixed=null,raf=0,finished=false;
const now=()=>fixed??(performance.now()-start)/1000;
function loop(){const t=now();render(t);if(t>=DURATION){finish(false);return}raf=requestAnimationFrame(loop)}
function play(){
  cancelAnimationFrame(raf);fixed=null;stopAudio();
  if(soundOn&&AC){live=[];scoreAudio(AC.currentTime+.08);start=performance.now()+80}else start=performance.now();
  loop();
}
// 終わったら（またはスキップしたら）、そっと消えてタイトル画面へ
function finish(skipped){
  if(finished)return;finished=true;cancelAnimationFrame(raf);
  if(skipped)stopAudio();
  removeEventListener('keydown',onKey,true);removeEventListener('resize',onResize);
  root.classList.add('op-out');
  const garden=document.getElementById('garden');if(garden)garden.inert=false;
  document.documentElement.classList.remove('op-lock');
  const title=document.getElementById('garden-title');if(title&&location.hash!=='#kintsugi')title.focus({preventScroll:true});
  setTimeout(()=>root.remove(),700);
  if(AC)setTimeout(()=>{try{AC.close()}catch(e){}},skipped?600:2200);
}
function onKey(e){if(e.key==='Escape'){e.preventDefault();finish(true)}}
function onResize(){resize();render(now())}
// オープニング中にゲームへ移ったら（ブラウザの戻る・進むなど）、すぐに終える
addEventListener('hashchange',()=>{if(!TITLE_HASHES.includes(location.hash))finish(true)});
addEventListener('keydown',onKey,true);
addEventListener('resize',onResize);
// ページを読み終えたら、庭を操作できないようにして、最初のボタンへフォーカスを置く
document.addEventListener('DOMContentLoaded',()=>{const g=document.getElementById('garden');if(g&&!finished){g.inert=true;if(!$('start').hidden)$('play-sound').focus()}});

resize();prepare();render(0);
$('skip').onclick=()=>finish(true);
$('start-skip').onclick=()=>finish(true);
const setSound=v=>{soundOn=v;$('sound').textContent=v?'♪ 音 ON':'♪ 音 OFF';$('sound').setAttribute('aria-pressed',String(v))};
$('sound').onclick=()=>{setSound(!soundOn);if(!soundOn)stopAudio();else{audioInit();AC.resume();play()}};
// ブラウザは操作なしに音を鳴らせないので、最初のひと押しで始める
function begin(withSound){setSound(withSound);$('start').hidden=true;if(withSound){audioInit();AC.resume().then(play,play)}else play();$('skip').focus()}
$('play-sound').onclick=()=>begin(true);
$('play-mute').onclick=()=>begin(false);
// 書体がそろったら文字の型を作り直す（届く前に始めた場合も、届いた時点で差し替わる）
// 書体の指定（CSS）が届いてからでないと、ブラウザはその書体を知らないので先に待つ
const fontsLoaded=document.fonts?fontCss.then(()=>Promise.all(FONTS.map((f,k)=>document.fonts.load(`${f.weight} 64px "${f.family}"`,CHARS[k])))).then(()=>document.fonts.ready):Promise.resolve();
fontsLoaded.then(()=>{if(!finished){prepare();render(now())}},()=>{});
})();
