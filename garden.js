/* 庭（タイトル画面）：遊びのスライドと、選んだ遊びの世界観への切り替え。
   選んだ遊びは端末に覚え、次に開いたときもその世界観のタイトル画面から始める。
   <html data-world> と <body data-world> が現在の世界観。 */
(function(){
  const WORLDS=['kintsugi','hoshizu'],WKEY='hirameki-world';
  const THEME={kintsugi:'#eee9df',hoshizu:'#0b1026'};
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=id=>document.getElementById(id);
  const slides=[...document.querySelectorAll('.game-card[data-world]')];
  const dots=[...document.querySelectorAll('.slide-dot[data-world]')];
  let selected=WORLDS.includes(store.get(WKEY))?store.get(WKEY):'kintsugi';

  function setWorld(w){
    if(!WORLDS.includes(w))w='kintsugi';
    document.documentElement.setAttribute('data-world',w);document.body.setAttribute('data-world',w);
    document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',THEME[w]));
    if(w==='hoshizu')drawSky();
  }
  function select(w,dir){
    if(!WORLDS.includes(w))return;const changed=w!==selected;selected=w;store.set(WKEY,w);
    slides.forEach(s=>{const on=s.dataset.world===w;s.hidden=!on;s.classList.remove('enter-next','enter-prev');if(on&&changed&&!reduce&&dir){void s.offsetWidth;s.classList.add(dir>0?'enter-next':'enter-prev')}});
    dots.forEach(d=>{const on=d.dataset.world===w;d.setAttribute('aria-current',on?'true':'false')});
    const live=$('slide-status');if(live&&changed)live.textContent=`${slides.findIndex(s=>s.dataset.world===w)+1}つ目の遊び：${document.querySelector(`.game-card[data-world="${w}"] h2`).textContent}`;
    setWorld(w);
  }
  const step=d=>{const i=WORLDS.indexOf(selected);select(WORLDS[(i+d+WORLDS.length)%WORLDS.length],d)};
  const prev=$('slide-prev'),next=$('slide-next');
  if(prev)prev.addEventListener('click',()=>step(-1));
  if(next)next.addEventListener('click',()=>step(1));
  dots.forEach(d=>d.addEventListener('click',()=>{const i=WORLDS.indexOf(d.dataset.world),c=WORLDS.indexOf(selected);select(d.dataset.world,i>c?1:-1)}));
  // 横にスワイプしても切り替わる（縦のスクロールや、ボタン・リンクの操作は邪魔しない）
  const track=$('collection');
  if(track){
    let sx=null,sy=null;
    track.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('a,button'))return;sx=e.clientX;sy=e.clientY});
    track.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)step(dx<0?1:-1)});
    track.addEventListener('pointercancel',()=>{sx=null});
    track.addEventListener('keydown',e=>{if(e.target.closest('a,button')&&!e.target.closest('.slide-ctl'))return;if(e.key==='ArrowRight'){e.preventDefault();step(1)}if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}});
  }

  // ── 星図の世界：背景の星空と、遊び帖の絵 ──
  function rnd(seed){return()=>(seed=(seed*16807)%2147483647)/2147483647}
  let skyW=0,skyH=0;
  function drawSky(){
    const c=$('sky');if(!c)return;const dpr=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
    if(w===skyW&&h===skyH)return;skyW=w;skyH=h;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
    const r=rnd(1004);x.clearRect(0,0,w,h);
    // 天の川：斜めのかすかな帯
    x.save();x.translate(w*.55,h*.4);x.rotate(-.5);const band=x.createLinearGradient(0,-h*.35,0,h*.35);band.addColorStop(0,'rgba(120,140,220,0)');band.addColorStop(.5,'rgba(150,165,235,.10)');band.addColorStop(1,'rgba(120,140,220,0)');x.fillStyle=band;x.fillRect(-w*1.2,-h*.35,w*2.4,h*.7);x.restore();
    const n=Math.round(w*h/2600);
    for(let i=0;i<n;i++){const px=r()*w,py=r()*h,s=Math.pow(r(),3)*1.6+.25,a=.25+r()*.7,tint=r();
      x.fillStyle=tint<.12?`rgba(255,226,180,${a})`:tint<.24?`rgba(190,210,255,${a})`:`rgba(235,238,255,${a})`;x.beginPath();x.arc(px,py,s,0,7);x.fill();
      if(s>1.3){x.strokeStyle=`rgba(220,228,255,${a*.35})`;x.lineWidth=.5;x.beginPath();x.moveTo(px-s*3,py);x.lineTo(px+s*3,py);x.moveTo(px,py-s*3);x.lineTo(px,py+s*3);x.stroke()}}
  }
  addEventListener('resize',()=>{if(document.documentElement.getAttribute('data-world')==='hoshizu')drawSky()});

  // 遊び帖の絵：真鍮の星図盤に、第一夜の答えを星座として描く
  function drawArt(){
    const c=$('hz-art');if(!c||!window.HOSHIZU_LEVELS)return;const x=c.getContext('2d'),W=c.width,H=c.height,cx=W/2,cy=H/2-24,R=Math.min(W,H)*.37;
    x.clearRect(0,0,W,H);
    const plate=x.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R*1.05);plate.addColorStop(0,'#1d2a5e');plate.addColorStop(1,'#0a1030');
    x.beginPath();x.arc(cx,cy,R,0,7);x.fillStyle=plate;x.fill();
    const brass=x.createLinearGradient(cx-R,cy-R,cx+R,cy+R);brass.addColorStop(0,'#8a6a32');brass.addColorStop(.35,'#e6c886');brass.addColorStop(.6,'#9b7638');brass.addColorStop(1,'#d9b56e');
    x.lineWidth=R*.045;x.strokeStyle=brass;x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
    x.lineWidth=1.2;x.strokeStyle='rgba(217,181,110,.55)';x.beginPath();x.arc(cx,cy,R*.9,0,7);x.stroke();
    for(let k=0;k<72;k++){const a=k/72*Math.PI*2,l=k%6?R*.03:R*.06;x.beginPath();x.moveTo(cx+Math.cos(a)*R*.9,cy+Math.sin(a)*R*.9);x.lineTo(cx+Math.cos(a)*(R*.9-l),cy+Math.sin(a)*(R*.9-l));x.stroke()}
    x.strokeStyle='rgba(160,180,255,.14)';x.lineWidth=1;for(const f of [.3,.55,.75]){x.beginPath();x.arc(cx,cy,R*f,0,7);x.stroke()}
    for(let k=0;k<6;k++){const a=k/6*Math.PI;x.beginPath();x.moveTo(cx+Math.cos(a)*R*.88,cy+Math.sin(a)*R*.88);x.lineTo(cx-Math.cos(a)*R*.88,cy-Math.sin(a)*R*.88);x.stroke()}
    const r=rnd(77);for(let i=0;i<140;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*R*.86;x.fillStyle=`rgba(230,235,255,${.2+r()*.5})`;x.beginPath();x.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,r()*1.4+.3,0,7);x.fill()}
    const lv=window.HOSHIZU_LEVELS[2]||window.HOSHIZU_LEVELS[0],cell=R*1.25/Math.max(lv.w,lv.h),ox=cx-cell*lv.w/2,oy=cy-cell*lv.h/2,P=i=>[ox+(lv.stars[i][0]+.5)*cell,oy+(lv.stars[i][1]+.5)*cell];
    x.lineCap='round';
    for(const [a,b,n] of lv.sol){const [x1,y1]=P(a),[x2,y2]=P(b),h=y1===y2;for(const o of n===2?[-3.5,3.5]:[0]){x.strokeStyle='rgba(243,214,138,.9)';x.shadowColor='#f0c76a';x.shadowBlur=10;x.lineWidth=2.4;x.beginPath();x.moveTo(x1+(h?0:o),y1+(h?o:0));x.lineTo(x2+(h?0:o),y2+(h?o:0));x.stroke()}}
    x.shadowBlur=0;
    lv.stars.forEach((s,i)=>{const [px,py]=P(i),g=x.createRadialGradient(px,py,0,px,py,cell*.55);g.addColorStop(0,'rgba(255,240,200,.55)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,cell*.55,0,7);x.fill();x.fillStyle='#fffaf0';x.beginPath();x.arc(px,py,cell*.12,0,7);x.fill()});
  }

  // 遊び方の案内：data-help のボタンで開き、閉じるボタン・Esc・外側のタップで閉じる
  document.querySelectorAll('[data-help]').forEach(btn=>{
    const dlg=$(btn.dataset.help);if(!dlg)return;
    btn.addEventListener('click',()=>{if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','')});
    dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('[data-close]')){if(dlg.close)dlg.close();else dlg.removeAttribute('open')}});
  });
  window.Garden={selected:()=>selected,setWorld,select};
  slides.forEach(s=>{s.hidden=s.dataset.world!==selected});
  dots.forEach(d=>d.setAttribute('aria-current',d.dataset.world===selected?'true':'false'));
  drawArt();
  if(document.fonts)document.fonts.ready.then(drawArt);
})();
