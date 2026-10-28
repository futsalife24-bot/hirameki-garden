/* かくれ絵。旧 #kagee の入口を保持し、旧影絵の保存には触れない。
   絵をVoronoi領域に分割し、奥行きへ離して平行投影する。 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),root=$('kagee');if(!root)return;
  const shapes=window.RIDDLE_SHAPES,KEY='kakuree-save-v1',SOUND='kakuree-sound';
  const cv=$('kg-canvas'),ctx=cv.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  // 平行投影では裏側（±π）も鏡像として同じ絵に揃う。表裏に同じ許容幅を使う。
  const yawDistance=y=>Math.min(Math.abs(y),Math.abs(Math.PI-Math.abs(y)));
  const aligned=(y,p,tolerance=.075)=>yawDistance(y)<tolerance&&Math.abs(p)<tolerance;
  const finishYaw=y=>Math.abs(y)>Math.PI/2?(y<0?-Math.PI:Math.PI):0;
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
  let W=1,H=1,DPR=1,S,P,drag=null,frame=0,resetTimer=0,ac=null,sound=true;
  try{sound=localStorage.getItem(SOUND)!=='0'}catch{}
  const announce=t=>{$('kg-live').textContent=t};
  const initial=level=>({yaw:level===1?.9:(level%2?-1:1)*(.8+(level%4)*.12),pitch:level===1?0:(level%2?-.55:.65)});
  function read(){try{
    const s=JSON.parse(localStorage.getItem(KEY));
    if(!s||!Number.isInteger(s.level)||s.level<1||s.level>shapes.length||!Number.isFinite(s.yaw)||Math.abs(s.yaw)>Math.PI||!Number.isFinite(s.pitch)||Math.abs(s.pitch)>1.35||!Number.isInteger(s.moves)||s.moves<0||s.moves>2147483647||typeof s.solved!=='boolean')return null;
    const best={};if(s.best&&typeof s.best==='object')for(const [k,v]of Object.entries(s.best))if(/^[1-9]\d*$/.test(k)&&+k<=shapes.length&&Number.isInteger(v)&&v>=0)best[k]=v;
    return {...s,best,hint:!!s.hint,solved:s.solved&&aligned(s.yaw,s.pitch)};
  }catch{return null}}
  function save(){let failed=false;try{localStorage.setItem(KEY,JSON.stringify(S))}catch{failed=true;announce('この端末に保存できません。画面を閉じると進み具合が失われます。')}$('kg-save-warning').hidden=!failed}
  function clip(poly,a,b,c){const out=[];for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;
    if(dp<=0)out.push(p);if((dp<0)!==(dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])}
  }return out}
  function build(level){
    const shape=shapes[level-1],path=new Path2D(shape.path),r=rng(4099*level),sites=[];
    // isPointInPathは現在の描画変換に依存させない。
    ctx.save();ctx.resetTransform();
    for(let tries=0;sites.length<shape.parts&&tries<20000;tries++){const p=[r()*190-95,r()*190-95];if(ctx.isPointInPath(path,...p,'evenodd')&&sites.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>22))sites.push(p)}
    ctx.restore();
    const pieces=sites.map((p,i)=>{let poly=[[-110,-110],[110,-110],[110,110],[-110,110]];
      for(const q of sites)if(p!==q)poly=clip(poly,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]**2+q[1]**2-p[0]**2-p[1]**2);
      const region=new Path2D();poly.forEach((v,j)=>j?region.lineTo(...v):region.moveTo(...v));region.closePath();
      return {region,z:(i%2?1:-1)*(30+r()*85),center:p};
    });return {shape,path,pieces};
  }
  function start(level,saved){cancelAnimationFrame(frame);drag=null;clearTimeout(resetTimer);resetTimer=0;$('kg-reset').textContent='最初から';
    S=saved||{level,...initial(level),moves:0,solved:false,hint:false,best:S?.best||{}};P=build(level);ui();resize();save();
    // 旧版で裏側に揃えたまま保存された進行も、手数を増やさず完成にする。
    if(!S.solved&&aligned(S.yaw,S.pitch))solve(false);
  }
  function tone(done=false){if(!sound)return;try{ac||=new(window.AudioContext||window.webkitAudioContext)();ac.resume();
    (done?[0,4,7,12]:[0]).forEach((n,i)=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.1;o.frequency.value=440*2**(n/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(done?.045:.015,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+(done?1:.08));o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+1.1)})
  }catch{}}
  function render(g,w,h,p,yaw,pitch,solved){
    g.clearRect(0,0,w,h);const bg=g.createRadialGradient(w*.5,h*.47,0,w*.5,h*.5,Math.max(w,h)*.7);
    bg.addColorStop(0,'#18202c');bg.addColorStop(.55,'#0b1018');bg.addColorStop(1,'#080b11');g.fillStyle=bg;g.fillRect(0,0,w,h);
    const size=Math.min(w,h),scale=size/365,cx=w/2,cy=h*.48;
    g.strokeStyle='rgba(163,189,212,.10)';g.lineWidth=1;g.beginPath();g.arc(cx,cy,size*.41,0,Math.PI*2);g.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beginPath();g.moveTo(cx+Math.cos(a)*size*.40,cy+Math.sin(a)*size*.40);g.lineTo(cx+Math.cos(a)*size*.42,cy+Math.sin(a)*size*.42);g.stroke()}
    const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const pieces=p.pieces.slice().sort((a,b)=>(sp*a.center[1]+cp*(-s*a.center[0]+c*a.z))-(sp*b.center[1]+cp*(-s*b.center[0]+c*b.z)));
    for(const piece of pieces)for(const back of [true,false]){
      const z=piece.z+(back?-3:0);g.save();g.translate(cx+s*z*scale,cy-sp*c*z*scale);g.transform(c*scale,sp*s*scale,0,cp*scale,0,0);g.clip(piece.region);
      if(back)g.fillStyle='#5d6b7b';else{const v=Math.round(240*(solved?1:.76+.24*Math.abs(c*cp))),grad=g.createLinearGradient(-80,-100,100,100);grad.addColorStop(0,`rgb(${v},${v+3},${Math.min(255,v+10)})`);grad.addColorStop(1,`rgb(${v-22},${v-14},${v-3})`);g.fillStyle=grad}g.fill(p.path,'evenodd');g.restore();
    }
    if(solved&&aligned(yaw,pitch,.001)){g.save();g.translate(cx,cy);g.scale(c<0?-scale:scale,scale);g.fillStyle='#f1f5fc';g.shadowColor='rgba(185,211,255,.25)';g.shadowBlur=12;g.fill(p.path,'evenodd');g.restore()}
    if(!solved){g.fillStyle='#a4b1c3';g.font='12px sans-serif';g.textAlign='center';g.fillText('•   •   •',cx,h-20)}
  }
  function draw(){if(!P)return;ctx.setTransform(DPR,0,0,DPR,0,0);render(ctx,W,H,P,S.yaw,S.pitch,S.solved)}
  function resize(){const b=cv.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;W=Math.floor(b.width);H=Math.floor(b.height);DPR=Math.min(devicePixelRatio||1,2);cv.width=W*DPR;cv.height=H*DPR;draw()}
  function ui(){
    $('kg-lv').textContent=`第${S.level}問`;$('kg-size').textContent=`全${shapes.length}問`;$('kg-match').textContent=P.pieces.length;$('kg-moves').textContent=S.moves;
    $('kg-done').classList.toggle('show',S.solved);$('kg-reset').disabled=S.solved;$('kg-hint').disabled=S.solved;
    $('kg-hint').setAttribute('aria-pressed',String(S.hint));$('kg-hint').textContent=S.hint?'ヒントを閉じる':'ヒント';
    $('kg-done-title').textContent=S.level===shapes.length?'すべての絵が見つかりました':'絵がつながりました';$('kg-done-note').textContent=`${P.shape.name} ・ ${S.moves}回`;
    $('kg-next').textContent=S.level===shapes.length?'もう一周':'次の絵へ';
    const coach=$('kg-coach');coach.hidden=S.solved||(!S.hint&&S.level>2);coach.textContent=S.hint?P.shape.hint:S.level===1?'左右にゆっくり回してみましょう。かけらが一枚の絵になる角度があります。':'今度は上下にも。絵に見える向きを探してみましょう。';draw();
  }
  function solve(celebrate=true){S.solved=true;S.best[S.level]=Math.min(S.best[S.level]??Infinity,S.moves);if(celebrate)tone(true);const y=S.yaw,p=S.pitch,target=finishYaw(y);S.yaw=target;S.pitch=0;save();ui();announce(`${P.shape.name}。絵がつながりました。${S.moves}回で完成です。`);
    if(celebrate&&!reduced){const at=performance.now();const tick=t=>{const u=clamp((t-at)/350,0,1),k=(1-u)**3;ctx.setTransform(DPR,0,0,DPR,0,0);render(ctx,W,H,P,target+(y-target)*k,p*k,true);if(u<1)frame=requestAnimationFrame(tick);else draw()};frame=requestAnimationFrame(tick)}
  }
  function turn(dx,dy){if(S.solved)return;S.yaw=wrap(S.yaw+dx);S.pitch=S.level===1?0:clamp(S.pitch+dy,-1.35,1.35);if(aligned(S.yaw,S.pitch))solve();else draw()}
  cv.addEventListener('pointerdown',e=>{if(S.solved||drag||e.button!==0)return;cv.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};try{cv.setPointerCapture(e.pointerId)}catch{}});
  cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||S.solved)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<3)return;if(!drag.moved){S.moves++;drag.moved=true;$('kg-moves').textContent=S.moves}drag.x=e.clientX;drag.y=e.clientY;turn(dx*3.2/Math.max(240,Math.min(W,H)),dy*3.2/Math.max(240,Math.min(W,H)))});
  function end(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved){save();tone()}drag=null}
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('lostpointercapture',end);
  cv.addEventListener('keydown',e=>{const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!v)return;e.preventDefault();if(S.solved||(S.level===1&&v[1]))return;S.moves++;const step=(e.shiftKey?1:5)*Math.PI/180;turn(v[0]*step,v[1]*step);ui();save();if(!S.solved)announce(`${S.moves}回。${aligned(S.yaw,S.pitch,.3)?'絵がつながりそうです。':'違う角度も探してみましょう。'}`)});
  $('kg-reset').addEventListener('click',()=>{if(!resetTimer){$('kg-reset').textContent='戻しますか';resetTimer=setTimeout(()=>{resetTimer=0;$('kg-reset').textContent='最初から'},2600);return}start(S.level)});
  $('kg-hint').addEventListener('click',()=>{S.hint=!S.hint;ui();resize();save()});
  $('kg-next').addEventListener('click',()=>{start(S.level%shapes.length+1);cv.focus({preventScroll:true})});
  function paintSound(){$('kg-sound').textContent=sound?'音あり':'音なし';$('kg-sound').setAttribute('aria-pressed',String(sound))}
  $('kg-sound').addEventListener('click',()=>{sound=!sound;try{localStorage.setItem(SOUND,sound?'1':'0')}catch{announce('音の設定を保存できません。')}paintSound();tone()});paintSound();
  addEventListener('pagehide',()=>{if(drag?.moved)save()});addEventListener('hashchange',()=>{if(drag?.moved)save();drag=null;cancelAnimationFrame(frame)});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(cv.parentElement);else addEventListener('resize',resize);
  const saved=read();start(saved?.level||1,saved);
  const art=$('kg-art');if(art)render(art.getContext('2d'),art.width,art.height,build(1),.38,-.16,false);
  window.Kagee={resize,levels:shapes.length,label(){return {play:S.moves||S.level>1||S.solved?'つづきの絵へ':'絵を見つける',note:S.moves||S.level>1||S.solved?`第${S.level}問 ・ ${S.solved?'完成':S.moves+'回から'}`:''}}};
})();
