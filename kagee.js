/* 影絵：立体の人形を回して、幕に落ちる影を点線の形に重ねるパズル。
   人形は、影の形（ドット絵）の各マスに奥行きのばらばらな積み木を積んで作る。
   真正面から光を当てたときだけ影がその形になるので、答えは必ずある。
   重なり（影と点線の面積の一致度）が90%を超えれば幕が上がる。 */
(function(){
  const KEY='kagee-save-v1',BEST_KEY='kagee-best',SOUND_KEY='kagee-sound';
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('kagee');if(!root)return;
  const cv=$('kg-canvas'),x=cv.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SOLVE=.9;

  // ── 影の形（# が影になるマス）。やさしい順 ──
  const SHAPES=[
    ['きのこ',['..###..','.#####.','#######','#######','..###..','..###..','.#####.']],
    ['つき',['..####.','.##....','##.....','##.....','##.....','.##....','..####.']],
    ['ハート',['.##...##.','####.####','#########','#########','.#######.','..#####..','...###...','....#....']],
    ['さかな',['...###....','..#####..#','.#######.#','##.#######','#########.','.#######.#','..#####..#','...###....']],
    ['うさぎ',['.##..##.','.##..##.','.##..##.','.######.','########','##.##.##','########','.######.','..#..#..']],
    ['ろうそく',['...#...','..###..','...#...','..###..','..###..','..###..','..###..','.#####.','#######']],
    ['き',['...###...','..#####..','.#######.','#########','.#######.','#########','....#....','....#....','...###...']],
    ['いえ',['....#....','...###...','..#####..','.#######.','#########','.##...##.','.##.#.##.','.##.#.##.','.#######.']],
    ['ほし',['....#....','....#....','...###...','#########','.#######.','..#####..','.###.###.','.##...##.']],
    ['かさ',['....#....','..#####..','.#######.','#########','#.#.#.#.#','....#....','....#....','....#.#..','.....#...']],
    ['ねこ',['#.....#.','##...##.','#######.','#.##.##.','#######.','.#####..','.######.','.#######','.######.']],
    ['とり',['...##.....','..####....','.##.#####.','##########','....######','....#####.','.....###..','.....#.#..']],
    ['ペンギン',['..###..','.#####.','.##.##.','#######','#.###.#','#.###.#','#.###.#','.#####.','.##.##.']],
    ['ちょう',['##.....##','###...###','####.####','#########','.#######.','.#######.','###.#.###','##..#..##']],
    ['かめ',['...####....','..######...','.########.#','##########.','.##.##.##..']],
    ['かぎ',['.###.......','#...#......','#...#######','#...#.#.#..','.###..#.#..']],
    ['ふね',['....#.....','....##....','....###...','....####..','....#.....','##########','.########.','..######..']],
    ['かえる',['.##...##.','####.####','#########','##.###.##','#########','.#######.','##.....##']],
    ['いぬ',['##.......','###......','#####....','.#########','..########','..########','..##...##.','..##...##.']],
    ['くじら',['.#.#........','..#.........','..#..#####..','...########.','.##########.','############','.##########.','...#######..']],
  ];
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const actName=l=>`第${kanji(l)}幕`;

  // ── 3Dの小道具 ──
  const mul=(A,B)=>A.map((r,i)=>[0,1,2].map(j=>r[0]*B[0][j]+r[1]*B[1][j]+r[2]*B[2][j]));
  const rotX=a=>{const c=Math.cos(a),s=Math.sin(a);return [[1,0,0],[0,c,-s],[0,s,c]]};
  const rotY=a=>{const c=Math.cos(a),s=Math.sin(a);return [[c,0,s],[0,1,0],[-s,0,c]]};
  const apply=(R,v)=>[R[0][0]*v[0]+R[0][1]*v[1]+R[0][2]*v[2],R[1][0]*v[0]+R[1][1]*v[1]+R[1][2]*v[2],R[2][0]*v[0]+R[2][1]*v[1]+R[2][2]*v[2]];
  const I3=()=>[[1,0,0],[0,1,0],[0,0,1]];
  function orthonormal(R){const a=R[0],n=Math.hypot(...a),r0=a.map(v=>v/n);let b=R[1];const d=b[0]*r0[0]+b[1]*r0[1]+b[2]*r0[2];b=b.map((v,i)=>v-d*r0[i]);const m=Math.hypot(...b),r1=b.map(v=>v/m);const r2=[r0[1]*r1[2]-r0[2]*r1[1],r0[2]*r1[0]-r0[0]*r1[2],r0[0]*r1[1]-r0[1]*r1[0]];return [r0,r1,r2]}
  const angleFromI=R=>Math.acos(Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2)));
  function hull(P){P=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
    for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
    for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
    return lo.slice(0,-1).concat(up.slice(0,-1))}
  function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const CORNERS=[];for(const a of [-.5,.5])for(const b of [-.5,.5])for(const c of [-.5,.5])CORNERS.push([a,b,c]);
  const FACES=[[[1,0,0],[1,3,7,5]],[[-1,0,0],[0,4,6,2]],[[0,1,0],[2,6,7,3]],[[0,-1,0],[0,1,5,4]],[[0,0,1],[1,5,7,3]],[[0,0,-1],[0,2,6,4]]];

  // 面を組み立てる：形の各マスに、奥行きのばらばらな積み木を積む
  function build(level){
    const [name,rows]=SHAPES[(level-1)%SHAPES.length],r=rng(level*977+31);
    const h=rows.length,w=Math.max(...rows.map(s=>s.length)),cells=[];
    rows.forEach((row,y)=>[...row].forEach((ch,xx)=>{if(ch==='#')cells.push([xx-(w-1)/2,y-(h-1)/2])}));
    const dmax=level<=2?2:level<=6?3:level<=12?4:5,zr=level<=2?1:2;
    const vox=[];
    for(const [cx,cy] of cells){const d=1+Math.floor(r()*dmax),z0=-zr+Math.floor(r()*(zr*2+2-d));for(let k=0;k<d;k++)vox.push([cx,cy,z0+k])}
    // 重心を中心にする（影の位置がずれないよう、x・yはそのまま）
    const mz=vox.reduce((s,v)=>s+v[2],0)/vox.length;vox.forEach(v=>v[2]-=mz);
    const reach=Math.max(...vox.map(v=>Math.hypot(...v)))+.9;
    // 始まりの向き：第一幕は左右だけ、第二幕は上下だけ、以降は両方
    const s=r()<.5?-1:1,cands=[];
    if(level===1)for(const a of [1.15,1.3,1.45,1.57,1.7,1.0])cands.push(rotY(s*a));
    else if(level===2)for(const a of [1.1,1.3,.95,1.45,1.57,1.7])cands.push(rotX(s*a));
    else for(let k=0;k<14;k++)cands.push(mul(rotX((r()<.5?-1:1)*(.6+r()*1.6)),rotY((r()<.5?-1:1)*(.7+r()*1.8))));
    return {name,rows,w,h,cells,vox,reach,cands};
  }

  // ── 影の重なりを測る（小さな画像に影と答えを塗って比べる） ──
  const M=84,off=document.createElement('canvas');off.width=off.height=M;const ox=off.getContext('2d',{willReadFrequently:true});
  let target=null,range=9;
  function paintShadow(g,R,size,color){
    const k=size/(range*2);g.fillStyle=color;
    for(const v of P.vox){const c=apply(R,v);const pts=CORNERS.map(o=>{const q=apply(R,o);return [(c[0]+q[0]+range)*k,(c[1]+q[1]+range)*k]});const hpts=hull(pts);g.beginPath();hpts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill()}
  }
  function mask(R){ox.clearRect(0,0,M,M);paintShadow(ox,R,M,'#000');const d=ox.getImageData(0,0,M,M).data,m=new Uint8Array(M*M);for(let i=0;i<M*M;i++)m[i]=d[i*4+3]>127?1:0;return m}
  function overlap(R){const m=mask(R);let a=0,u=0;for(let i=0;i<M*M;i++){const t=target[i],s=m[i];if(t&&s)a++;if(t||s)u++}return u?a/u:0}

  // ── 状態 ──
  let P=null,S=null,score=0,anim=null;
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,R:S.R,moves:S.moves,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  function start(level,saved){
    level=Math.max(1,Math.min(SHAPES.length,level|0||1));P=build(level);
    range=Math.max(P.w,P.h)/2+2.5;target=mask(I3());
    if(!P.start){const scored=P.cands.map(R=>[R,overlap(R)]);const fit=scored.filter(([,v])=>v>=.18&&v<=.45);
      P.start=(fit.length?fit:scored.sort((a,b)=>Math.abs(a[1]-.3)-Math.abs(b[1]-.3)))[0][0]}
    const ok=saved&&saved.level===level&&Array.isArray(saved.R)&&saved.R.length===3&&saved.R.every(r=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite));
    S={level,R:ok?orthonormal(saved.R):P.start.map(r=>r.slice()),moves:ok?saved.moves|0:0,solved:false};
    score=overlap(S.R);if(ok&&saved.solved&&score>=SOLVE)S.solved=true;
    $('kg-lv').textContent=actName(level);$('kg-size').textContent=`積み木 ${P.vox.length}`;
    resize();ui();save();
  }

  // ── 描画 ──
  let W=0,H=0,DPR=1,layout=null;
  function resize(){
    const r=cv.parentElement.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);
    W=Math.max(10,Math.floor(r.width));H=Math.max(10,Math.floor(r.height));cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
    const wide=W>H*1.15,g=Math.min(W,H)*.04;
    // 縦長：上に幕・下に人形。横長：右に幕・左に人形
    layout=wide?{screen:[W*.48,g,W*.52-g,H-g*2],stage:[g,g,W*.48-g*1.5,H-g*2]}:{screen:[g,g,W-g*2,H*.52-g],stage:[g,H*.52+g*.4,W-g*2,H*.48-g*1.4]};
    draw();
  }
  const VIEW=mul(rotX(-.42),rotY(.62)); // 人形を見る角度（光の向きとはずらす）
  function draw(){
    if(!P)return;x.setTransform(DPR,0,0,DPR,0,0);x.clearRect(0,0,W,H);
    const [sx,sy,sw,sh]=layout.screen,[tx,ty,tw,th]=layout.stage;
    // 光の筋：人形から幕へ
    const beam=x.createLinearGradient(tx+tw/2,ty+th/2,sx+sw/2,sy+sh/2);beam.addColorStop(0,'rgba(255,214,150,.0)');beam.addColorStop(1,'rgba(255,214,150,.12)');
    x.fillStyle=beam;x.beginPath();x.moveTo(tx+tw*.35,ty+th*.5);x.lineTo(sx,sy+sh);x.lineTo(sx+sw,sy);x.lineTo(tx+tw*.65,ty+th*.5);x.closePath();x.fill();
    // 幕（スクリーン）
    const r=Math.min(sw,sh)*.04;x.save();x.beginPath();x.roundRect(sx,sy,sw,sh,r);x.clip();
    const scr=x.createRadialGradient(sx+sw/2,sy+sh*.45,Math.min(sw,sh)*.05,sx+sw/2,sy+sh/2,Math.max(sw,sh)*.75);scr.addColorStop(0,'#fff6e3');scr.addColorStop(.6,'#f1e2c4');scr.addColorStop(1,'#cdb38c');x.fillStyle=scr;x.fillRect(sx,sy,sw,sh);
    const side=Math.min(sw,sh),k=side*.92/(range*2),ox0=sx+sw/2-range*k,oy0=sy+sh/2-range*k;
    // 影
    x.save();x.translate(ox0,oy0);paintShadow(x,S.R,range*2*k,S.solved?'#2a1410':'rgba(52,26,20,.88)');x.restore();
    // 答えの点線（形のマスの外周）
    const filled=new Set(P.cells.map(([a,b])=>a+','+b));x.beginPath();
    for(const [a,b] of P.cells){const X0=ox0+(a-.5+range)*k,Y0=oy0+(b-.5+range)*k;
      if(!filled.has(a+','+(b-1))){x.moveTo(X0,Y0);x.lineTo(X0+k,Y0)}if(!filled.has(a+','+(b+1))){x.moveTo(X0,Y0+k);x.lineTo(X0+k,Y0+k)}
      if(!filled.has((a-1)+','+b)){x.moveTo(X0,Y0);x.lineTo(X0,Y0+k)}if(!filled.has((a+1)+','+b)){x.moveTo(X0+k,Y0);x.lineTo(X0+k,Y0+k)}}
    x.setLineDash(S.solved?[]:[k*.32,k*.22]);x.lineWidth=Math.max(1.5,k*.09);x.strokeStyle=S.solved?'#d9a441':'#9c2b2b';x.lineCap='round';x.stroke();x.setLineDash([]);
    if(S.solved){x.fillStyle='#5a2a1a';x.font=`700 ${Math.max(14,side*.07)}px 'Zen Kaku Gothic New',sans-serif`;x.textAlign='center';x.fillText(P.name,sx+sw/2,sy+sh-side*.05)}
    x.restore();
    x.strokeStyle='rgba(217,164,65,.55)';x.lineWidth=2;x.beginPath();x.roundRect(sx,sy,sw,sh,r);x.stroke();
    // 舞台と人形
    const base=x.createRadialGradient(tx+tw/2,ty+th*.82,4,tx+tw/2,ty+th*.82,Math.min(tw,th)*.6);base.addColorStop(0,'rgba(255,214,150,.30)');base.addColorStop(1,'rgba(255,214,150,0)');x.fillStyle=base;x.fillRect(tx,ty,tw,th);
    const sc=Math.min(tw,th)*.46/P.reach,cx=tx+tw/2,cy=ty+th/2,R=mul(VIEW,S.R);
    const L=(()=>{const v=[-.45,-.7,-.55],n=Math.hypot(...v);return v.map(a=>a/n)})();
    const list=P.vox.map(v=>{const c=apply(R,v);return {c,z:c[2]}}).sort((a,b)=>b.z-a.z);
    const faceN=FACES.map(([n,idx])=>[apply(R,n),idx]),corner=CORNERS.map(o=>apply(R,o));
    x.lineJoin='round';
    for(const {c} of list){for(const [n,idx] of faceN){if(n[2]>=0)continue;const lit=.42+.58*Math.max(0,n[0]*L[0]+n[1]*L[1]+n[2]*L[2]);
      x.beginPath();idx.forEach((q,i)=>{const p=corner[q],X=cx+(c[0]+p[0])*sc,Y=cy+(c[1]+p[1])*sc;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.closePath();
      x.fillStyle=`rgb(${Math.round(222*lit)},${Math.round(180*lit)},${Math.round(122*lit)})`;x.fill();x.strokeStyle='rgba(60,30,18,.35)';x.lineWidth=1;x.stroke()}}
    // 手ほどき：回す向きの矢印
    if(S.level<=2&&!S.solved&&hintDir){x.save();x.translate(cx,cy+(S.level===1?th*.42:0));x.strokeStyle='rgba(255,226,160,.9)';x.fillStyle='rgba(255,226,160,.9)';x.lineWidth=3;x.lineCap='round';
      const len=Math.min(tw,th)*.22,horiz=S.level===1,s=hintDir;x.beginPath();if(horiz){x.moveTo(-len*s,0);x.lineTo(len*s,0)}else{x.translate(tw*.42,0);x.moveTo(0,-len*s);x.lineTo(0,len*s)}x.stroke();
      x.beginPath();if(horiz){x.moveTo(len*s,0);x.lineTo(len*s-10*s,-7);x.lineTo(len*s-10*s,7)}else{x.moveTo(0,len*s);x.lineTo(-7,len*s-10*s);x.lineTo(7,len*s-10*s)}x.closePath();x.fill();x.restore()}
  }

  // ── 画面の文字 ──
  let hintDir=0;
  function ui(){
    const pct=Math.round(score*100);$('kg-match').textContent=`${pct}%`;$('kg-moves').textContent=S.moves;
    $('kg-done').classList.toggle('show',S.solved);$('kg-reset').disabled=S.solved;
    if(S.solved){const b=bests()[S.level];$('kg-done-note').textContent=`${P.name}の影・${S.moves}回`+(b!=null&&b<S.moves?`・ベスト ${b}回`:'')}
    coach();draw();
  }
  function coach(){
    const box=$('kg-coach');hintDir=0;if(!box)return;
    if(S.level>2||S.solved){box.hidden=true;return}
    // 答えの向きへ戻る回し方（第一幕は左右、第二幕は上下）
    if(S.level===1){const a=Math.atan2(S.R[0][2],S.R[0][0]);hintDir=a>0?-1:1}else{const a=Math.atan2(S.R[2][1],S.R[1][1]);hintDir=a>0?-1:1}
    const way=S.level===1?(hintDir<0?'左':'右'):(hintDir<0?'上':'下');
    box.textContent=score>=.7?'もう少し。影と点線がぴったり重なる向きを探しましょう。'
      :S.level===1?(S.moves===0?`はじめての幕。人形を${way}へドラッグして回すと、幕の影が変わります。点線の形に重ねましょう。`:`影が点線に近づくほど、重なりの数字が上がります。${way}へ回してみましょう。`)
      :`今度は上下です。人形を${way}へドラッグして、影を点線に重ねましょう。`;
    box.hidden=false;
  }

  // ── 音（Web Audioで合成。木の駒と、オルゴールの響き） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function tone(f,t,dur,vol,type='sine'){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.006);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const sfx={tick(p){tone(420+p*500,0,.07,.035,'triangle')},done(){[0,4,7,12,16].forEach((s,k)=>{tone(587.33*Math.pow(2,s/12),k*.11,1.8,.05);tone(1174.66*Math.pow(2,s/12),k*.11+.01,.7,.018)})}};

  // ── 操作：ドラッグ・キーボード ──
  let drag=null,lastTick=0;
  function turn(ax,ay){if(S.solved)return;S.R=orthonormal(mul(mul(rotY(ay),rotX(ax)),S.R));const prev=score;score=overlap(S.R);
    const now=performance.now();if(now-lastTick>70){sfx.tick(score);lastTick=now}
    if(score>=SOLVE)solve();else ui();if(prev<.7&&score>=.7)announce(`重なり ${Math.round(score*100)}%`)}
  function solve(){
    S.solved=true;const b=bests();if(b[S.level]==null||S.moves<b[S.level]){b[S.level]=S.moves;store.set(BEST_KEY,JSON.stringify(b))}
    // 答えの向きが近ければ、ぴたりと合わせる
    const from=S.R,ang=angleFromI(from);
    if(ang<.6&&!reduce){const t0=performance.now();cancelAnimationFrame(anim);const step=t=>{const u=Math.min(1,(t-t0)/450),e=1-Math.pow(1-u,3);
        S.R=orthonormal(from.map((r,i)=>r.map((v,j)=>v+((i===j?1:0)-v)*e)));score=overlap(S.R);draw();if(u<1)anim=requestAnimationFrame(step);else{S.R=I3();score=1;ui();save()}};anim=requestAnimationFrame(step)}
    else if(ang<.6){S.R=I3();score=1}
    sfx.done();announce(`幕が上がりました。${P.name}の影です。`);ui();save();
  }
  const live=$('kg-live');const announce=t=>{if(live)live.textContent=t};
  cv.addEventListener('pointerdown',e=>{if(S.solved)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false};try{cv.setPointerCapture(e.pointerId)}catch(err){}});
  cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!dx&&!dy)return;drag.x=e.clientX;drag.y=e.clientY;
    const k=3.4/Math.max(240,Math.min(W,H));drag.moved=true;turn(dy*k,dx*k)});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;if(drag.moved&&!S.solved){S.moves++;ui();save()}else if(drag.moved){save()}drag=null};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('keydown',e=>{const step=Math.PI/12,m={ArrowLeft:[0,-step],ArrowRight:[0,step],ArrowUp:[-step,0],ArrowDown:[step,0]}[e.key];if(!m)return;e.preventDefault();if(S.solved)return;
    S.moves++;turn(m[0],m[1]);if(!S.solved)announce(`重なり ${Math.round(score*100)}%`);ui();save()});

  // ── ボタン ──
  let armed=null;const resetBtn=$('kg-reset');
  resetBtn.addEventListener('click',()=>{
    if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.R=P.start.map(r=>r.slice());S.moves=0;S.solved=false;score=overlap(S.R);ui();save();
  });
  $('kg-next').addEventListener('click',()=>{start(S.level>=SHAPES.length?1:S.level+1,null);cv.focus({preventScroll:true})});
  const soundBtn=$('kg-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.tick(.5)});paintSound();
  if('ResizeObserver' in window)new ResizeObserver(()=>{if(!root.hidden)resize()}).observe(cv.parentElement);else addEventListener('resize',resize);

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：劇場の幕と、うさぎの影 ──
  function drawArt(){
    const c=$('kg-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    const bg=g.createRadialGradient(w/2,h*.42,20,w/2,h/2,w*.7);bg.addColorStop(0,'#5a1a22');bg.addColorStop(1,'#1d070b');g.fillStyle=bg;g.fillRect(0,0,w,h);
    const scr=[w*.24,h*.14,w*.52,h*.5];const sg=g.createRadialGradient(w/2,h*.36,10,w/2,h*.38,w*.4);sg.addColorStop(0,'#fff4dc');sg.addColorStop(1,'#d8bd92');g.fillStyle=sg;g.beginPath();g.roundRect(...scr,14);g.fill();
    g.strokeStyle='rgba(217,164,65,.8)';g.lineWidth=4;g.stroke();
    const rab=SHAPES[4][1],cs=Math.min(scr[2],scr[3])*.09,rw=rab[0].length*cs,rh=rab.length*cs,x0=w/2-rw/2,y0=scr[1]+scr[3]/2-rh/2;
    g.fillStyle='#3a1a14';rab.forEach((row,y)=>[...row].forEach((ch,xx)=>{if(ch==='#')g.fillRect(x0+xx*cs,y0+y*cs,cs+.5,cs+.5)}));
    // 幕
    for(const s of [-1,1]){const gx=s<0?0:w,cw=w*.24;const cg=g.createLinearGradient(gx,0,gx-s*cw,0);cg.addColorStop(0,'#7d1c27');cg.addColorStop(1,'#3c0b12');g.fillStyle=cg;g.beginPath();g.moveTo(gx,0);g.lineTo(gx-s*cw,0);g.quadraticCurveTo(gx-s*cw*.55,h*.55,gx-s*cw*.75,h);g.lineTo(gx,h);g.closePath();g.fill();
      g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=3;for(let k=1;k<5;k++){g.beginPath();g.moveTo(gx-s*cw*k/5,0);g.quadraticCurveTo(gx-s*cw*k/5*.6,h*.55,gx-s*cw*k/5*.8,h);g.stroke()}}
    const val=g.createLinearGradient(0,0,0,h*.1);val.addColorStop(0,'#5e1019');val.addColorStop(1,'#8a2230');g.fillStyle=val;g.fillRect(0,0,w,h*.08);
    // 積み木の人形（斜めから）
    const vx=w/2,vy=h*.82,u=w*.028;const iso=(a,b,cz)=>[vx+(a-cz)*u*.87,vy+(a+cz)*u*.5-b*u];
    const blocks=[[0,0,0],[1,0,0],[0,1,0],[0,0,1],[-1,1,1],[1,2,0],[0,2,1],[-1,0,-1]].sort((p,q)=>(p[0]+p[2]-p[1])-(q[0]+q[2]-q[1]));
    for(const [a,b,cz] of blocks){const top=[iso(a,b+1,cz),iso(a+1,b+1,cz),iso(a+1,b+1,cz+1),iso(a,b+1,cz+1)],left=[iso(a,b,cz+1),iso(a,b+1,cz+1),iso(a+1,b+1,cz+1),iso(a+1,b,cz+1)],right=[iso(a+1,b,cz),iso(a+1,b+1,cz),iso(a+1,b+1,cz+1),iso(a+1,b,cz+1)];
      for(const [pts,col] of [[left,'#b7894f'],[right,'#8e6436'],[top,'#e3bd84']]){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=col;g.fill();g.strokeStyle='rgba(50,24,12,.4)';g.lineWidth=1.5;g.stroke()}}
  }
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Kagee={label(){const going=S.moves||S.level>1;return {play:going?'つづきの幕へ':'影をつくる',note:going?`${actName(S.level)}・${S.moves}回から`:''}},resize,levels:SHAPES.length};
})();
