/* 秘密箱：寄木細工の箱の中の木片を滑らせ、鍵の木片を出口まで運ぶスライドパズル（箱入り娘）。
   一手 ＝ ひとつの木片を一方向へ滑らせること（同じ木片を同じ向きへ続けて動かしても一手）。
   問題は tools/himitsu-gen.cjs が作った himitsu-levels.js（最短手数つき、すべて解けることを確認済み）。 */
(function(){
  const LEVELS=window.HIMITSU_LEVELS||[];
  const KEY='himitsu-save-v1',BEST_KEY='himitsu-best',SOUND_KEY='himitsu-sound';
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('himitsu');if(!root||!LEVELS.length)return;
  const boardEl=$('hm-board'),piecesEl=$('hm-pieces');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const boxName=l=>`${kanji(l)}の箱`;
  let L=null,S=null,els=[],last=null;

  // ── 音（Web Audioで合成。木と木が当たる、コトッという音） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function knock(f,t,vol){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const s=ac.currentTime+t,o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter();o.type='triangle';o.frequency.setValueAtTime(f,s);o.frequency.exponentialRampToValueAtTime(f*.6,s+.08);
    fl.type='lowpass';fl.frequency.value=f*3;g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.004);g.gain.exponentialRampToValueAtTime(.0001,s+.12);o.connect(fl);fl.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+.15)}catch(e){}}
  const sfx={slide(n){knock(320+Math.random()*60,0,.12);if(n>1)knock(260,.02,.05)},done(){[0,.12,.24].forEach((t,k)=>knock(520+k*130,t,.1));knock(180,.4,.14)}};

  // ── 盤 ──
  const occ=(skip)=>{const g=new Int8Array(L.W*L.H).fill(-1);S.pos.forEach(([x,y],i)=>{if(i===skip)return;const [,,w,h]=L.pieces[i];for(let a=0;a<w;a++)for(let b=0;b<h;b++)g[(y+b)*L.W+x+a]=i});return g};
  // 木片 i が向き (dx,dy) へ何マスまで動けるか
  function room(i,dx,dy){const g=occ(i),[x,y]=S.pos[i],[,,w,h]=L.pieces[i];let k=0;
    while(true){const nx=x+dx*(k+1),ny=y+dy*(k+1);if(nx<0||ny<0||nx+w>L.W||ny+h>L.H)break;let free=true;
      for(let a=0;a<w&&free;a++)for(let b=0;b<h;b++)if(g[(ny+b)*L.W+nx+a]!==-1){free=false;break}if(!free)break;k++}return k}
  function build(){
    piecesEl.textContent='';boardEl.style.setProperty('--w',L.W);boardEl.style.setProperty('--h',L.H);$('hm-box').style.setProperty('--ar',((L.W+.6)/(L.H+.6)).toFixed(4));
    const ex=$('hm-exit');ex.style.setProperty('--gy',L.goal[1]);ex.style.setProperty('--gh',L.pieces[0][3]);
    els=L.pieces.map(([,,w,h],i)=>{const b=document.createElement('button');b.type='button';b.className='hm-piece'+(i===0?' key':'')+` p${(i*7)%5}`;b.dataset.i=i;
      b.style.setProperty('--pw',w);b.style.setProperty('--ph',h);b.setAttribute('aria-label',i===0?'鍵の木片':`木片 ${w}×${h}`);if(i===0){const s=document.createElement('span');s.textContent='鍵';b.appendChild(s)}
      piecesEl.appendChild(b);return b});
  }
  function place(i,x,y,anim=true){const b=els[i];b.style.transition=anim&&!reduce?'':'none';b.style.setProperty('--x',x);b.style.setProperty('--y',y)}
  function render(){
    S.pos.forEach(([x,y],i)=>place(i,x,y));
    $('hm-moves').textContent=S.moves;$('hm-min').textContent=L.min;$('hm-undo').disabled=!S.hist.length||S.solved;$('hm-reset').disabled=S.solved;
    $('hm-done').classList.toggle('show',S.solved);boardEl.classList.toggle('open',S.solved);
    els.forEach(b=>b.disabled=S.solved);
    if(S.solved){const b=bests()[S.level];$('hm-done-note').textContent=`${S.moves}手`+(S.moves===L.min?'・最短で開けました':`・最短は${L.min}手`)+(b!=null&&b<S.moves?`・ベスト ${b}手`:'')}
    coach();
  }

  // ── 動かす ──
  function commit(i,x,y){
    const [ox,oy]=S.pos[i];if(ox===x&&oy===y){place(i,x,y);return}
    const dir=[Math.sign(x-ox),Math.sign(y-oy)].join(),same=!!last&&last.i===i&&last.dir===dir;
    S.hist.push({i,from:[ox,oy],counted:!same});if(!same)S.moves++;last={i,dir};
    S.pos[i]=[x,y];sfx.slide(Math.abs(x-ox)+Math.abs(y-oy));
    if(i===0&&x===L.goal[0]&&y===L.goal[1]){S.solved=true;const b=bests();if(b[S.level]==null||S.moves<b[S.level]){b[S.level]=S.moves;store.set(BEST_KEY,JSON.stringify(b))}setTimeout(()=>sfx.done(),180);announce('箱が開きました')}
    render();save();
  }
  // ドラッグ：最初に動いた向きに沿って、ぶつかる所まで滑らせ、離すとマスにそろえる
  let drag=null;
  piecesEl.addEventListener('pointerdown',e=>{const b=e.target.closest('.hm-piece');if(!b||S.solved)return;const i=+b.dataset.i;
    drag={i,x0:e.clientX,y0:e.clientY,axis:null,cell:boardEl.getBoundingClientRect().width/L.W,id:e.pointerId,lim:null};try{b.setPointerCapture(e.pointerId)}catch(err){}});
  piecesEl.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=(e.clientX-drag.x0)/drag.cell,dy=(e.clientY-drag.y0)/drag.cell;
    if(!drag.axis){if(Math.hypot(dx,dy)<.12)return;drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';const i=drag.i;drag.lim=drag.axis==='x'?[-room(i,-1,0),room(i,1,0)]:[-room(i,0,-1),room(i,0,1)]}
    const v=Math.max(drag.lim[0],Math.min(drag.lim[1],drag.axis==='x'?dx:dy)),[x,y]=S.pos[drag.i];
    place(drag.i,drag.axis==='x'?x+v:x,drag.axis==='y'?y+v:y,false);drag.v=v});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(!d.axis){return}const v=Math.round(d.v||0),[x,y]=S.pos[d.i];commit(d.i,d.axis==='x'?x+v:x,d.axis==='y'?y+v:y)};
  piecesEl.addEventListener('pointerup',end);piecesEl.addEventListener('pointercancel',e=>{if(drag){const i=drag.i;drag=null;place(i,...S.pos[i])}});
  piecesEl.addEventListener('keydown',e=>{const b=e.target.closest('.hm-piece');if(!b||S.solved)return;const i=+b.dataset.i,d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();
    if(room(i,d[0],d[1])<1){announce('その向きには動きません');return}const [x,y]=S.pos[i];commit(i,x+d[0],y+d[1]);els[i].focus()});
  const live=$('hm-live');const announce=t=>{if(live)live.textContent=t};

  // ── 手ほどき（一の箱）：最短手順の上にいるあいだ、次に動かす木片と向きを示す ──
  function coach(){const box=$('hm-coach');els.forEach(b=>b.classList.remove('guide'));if(!box)return;if(S.level!==1||S.solved){box.hidden=true;return}
    const seq=[L.pieces.map(p=>[p[0],p[1]])];L.path.forEach(([i,x,y])=>{const s=seq[seq.length-1].map(p=>p.slice());s[i]=[x,y];seq.push(s)});
    const k=seq.findIndex(s=>s.every((p,j)=>p[0]===S.pos[j][0]&&p[1]===S.pos[j][1]));
    if(k>=0&&k<L.path.length){const [i,x,y]=L.path[k],[ox,oy]=seq[k][i];els[i].classList.add('guide');
      const way=x>ox?'右':x<ox?'左':y>oy?'下':'上';
      box.textContent=k===0?`はじめての箱。光っている木片を${way}へ滑らせてみましょう。指でなぞると、ぶつかる所まで動きます。`:`次は光っている木片を${way}へ。金の「鍵」の木片を、右の出口まで運べば箱が開きます。`}
    else box.textContent='手順から外れました。「一手戻す」か「最初から」で、光る案内に戻れます。';
    box.hidden=false}

  // ── 面・保存 ──
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,pos:S.pos,moves:S.moves,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  function valid(pos){if(!Array.isArray(pos)||pos.length!==L.pieces.length)return false;const g=new Int8Array(L.W*L.H);
    for(let i=0;i<pos.length;i++){const p=pos[i],[,,w,h]=L.pieces[i];if(!Array.isArray(p)||!Number.isInteger(p[0])||!Number.isInteger(p[1])||p[0]<0||p[1]<0||p[0]+w>L.W||p[1]+h>L.H)return false;
      for(let a=0;a<w;a++)for(let b=0;b<h;b++){const c=(p[1]+b)*L.W+p[0]+a;if(g[c])return false;g[c]=1}}return true}
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];last=null;
    const ok=saved&&saved.level===level&&valid(saved.pos);
    S={level,pos:ok?saved.pos.map(p=>p.slice()):L.pieces.map(p=>[p[0],p[1]]),moves:ok?saved.moves|0:0,hist:[],solved:false};
    if(ok&&S.pos[0][0]===L.goal[0]&&S.pos[0][1]===L.goal[1])S.solved=true;
    $('hm-lv').textContent=boxName(level);$('hm-size').textContent=`${L.W}×${L.H}・木片${L.pieces.length}`;
    build();S.pos.forEach(([x,y],i)=>place(i,x,y,false));render();save();
  }
  $('hm-undo').addEventListener('click',()=>{if(!S.hist.length||S.solved)return;const h=S.hist.pop();S.pos[h.i]=h.from;if(h.counted)S.moves=Math.max(0,S.moves-1);last=null;sfx.slide(1);render();save()});
  let armed=null;const resetBtn=$('hm-reset');
  resetBtn.addEventListener('click',()=>{if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.pos=L.pieces.map(p=>[p[0],p[1]]);S.moves=0;S.hist=[];last=null;render();save()});
  $('hm-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null);els[0].focus({preventScroll:true})});
  const soundBtn=$('hm-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.slide(1)});paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：寄木細工の秘密箱 ──
  function drawArt(){const c=$('hm-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    const bg=g.createRadialGradient(w/2,h*.4,20,w/2,h/2,w*.75);bg.addColorStop(0,'#5a3820');bg.addColorStop(1,'#20120a');g.fillStyle=bg;g.fillRect(0,0,w,h);
    // 箱を斜め上から
    const cx=w/2,cy=h*.5,s=w*.17;const P=(x,y,z)=>[cx+(x-y)*s*.95,cy+(x+y)*s*.5-z*s];
    const face=(pts,fill)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle='rgba(30,15,6,.6)';g.lineWidth=2;g.stroke()};
    const woods=['#e2c08d','#b07a45','#7a4a24','#d9a868','#5c3518'];
    face([P(-1.4,-1,0),P(1.4,-1,0),P(1.4,1,0),P(-1.4,1,0)].map(([x,y])=>[x,y+s*1.1]),'rgba(0,0,0,.35)');
    // 側面の寄木模様
    for(const side of [0,1]){for(let k=0;k<8;k++){const t0=k/8,t1=(k+1)/8;const pts=side?[P(1.4,-1+2*t0,0),P(1.4,-1+2*t1,0),P(1.4,-1+2*t1,.9),P(1.4,-1+2*t0,.9)]:[P(-1.4+2.8*t0,1,0),P(-1.4+2.8*t1,1,0),P(-1.4+2.8*t1,.9),P(-1.4+2.8*t0,1,.9)];
      face(side?pts:[P(-1.4+2.8*t0,1,0),P(-1.4+2.8*t1,1,0),P(-1.4+2.8*t1,1,.9),P(-1.4+2.8*t0,1,.9)],woods[(k+side*2)%5])}}
    // ふた：盤の木片を描く
    const lv=LEVELS[3]||LEVELS[0],u=2.8/lv.W,v=2/lv.H;
    face([P(-1.4,-1,.9),P(1.4,-1,.9),P(1.4,1,.9),P(-1.4,1,.9)],'#3a2010');
    lv.pieces.forEach(([px,py,pw,ph],i)=>{const x0=-1.4+px*u+.03,y0=-1+py*v+.03,x1=-1.4+(px+pw)*u-.03,y1=-1+(py+ph)*v-.03;face([P(x0,y0,.9),P(x1,y0,.9),P(x1,y1,.9),P(x0,y1,.9)],i===0?'#e9c46a':woods[(i*7)%5])});
    g.fillStyle='#3a2010';g.font=`700 ${s*.42}px 'Kiwi Maru',serif`;g.textAlign='center';g.textBaseline='middle';
    const kp=lv.pieces[0];const m=P(-1.4+(kp[0]+kp[2]/2)*u,-1+(kp[1]+kp[3]/2)*v,.9);g.fillText('鍵',m[0],m[1])}
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Himitsu={label(){const going=S.moves||S.level>1;return {play:going?'つづきの箱へ':'箱をあける',note:going?`${boxName(S.level)}・${S.moves}手から`:''}},levels:LEVELS.length};
})();
