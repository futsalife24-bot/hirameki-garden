/* 星図：星を光の線で結ぶパズル（橋をかけろ）
   数字はその星から出る線の本数。線は縦横だけ、二本まで重ねられ、交差しない。すべての星がひとつながりになれば完成。
   問題は tools/hoshizu-gen.cjs が作った hoshizu-levels.js（答えがひとつに決まる面だけ）。 */
(function(){
  const LEVELS=window.HOSHIZU_LEVELS||[];
  const KEY='hoshizu-save-v1',BEST_KEY='hoshizu-best',SOUND_KEY='hoshizu-sound';
  const NS='http://www.w3.org/2000/svg',C=10,DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('hoshizu');if(!root||!LEVELS.length)return;
  const board=$('hz-board');

  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const nightName=l=>`第${kanji(l)}夜`;

  let L=null,S=null,G=null,selected=null,drag=null;

  // ── 音（Web Audioで合成。星が澄んだ音で鳴る） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function tone(f,t,dur,vol,type='sine'){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const PENTA=[0,2,4,7,9,12,14,16];
  const sfx={
    link(n,i){const f=523.25*Math.pow(2,PENTA[i%PENTA.length]/12);tone(f,0,.9,.07);tone(f*2,0,.5,.025);if(n===2)tone(f*1.5,.06,.8,.05)},
    unlink(){tone(330,0,.25,.04,'triangle')},
    block(){tone(160,0,.18,.06,'triangle');tone(150,.08,.18,.05,'triangle')},
    done(){[0,4,7,12,16,19].forEach((s,k)=>{tone(523.25*Math.pow(2,s/12),k*.09,1.6,.06);tone(1046.5*Math.pow(2,s/12),k*.09+.02,.8,.02)})}
  };

  // ── 盤面の組み立て ──
  function geometry(lv){
    const at=new Map(lv.stars.map((s,i)=>[s[0]+','+s[1],i]));
    const nb=lv.stars.map(([x,y])=>DIRS.map(([dx,dy])=>{let nx=x+dx,ny=y+dy;while(nx>=0&&ny>=0&&nx<lv.w&&ny<lv.h){const j=at.get(nx+','+ny);if(j!==undefined)return j;nx+=dx;ny+=dy}return -1}));
    const edges=new Map();
    lv.stars.forEach((_,i)=>nb[i].forEach(j=>{if(j<0)return;const k=key(i,j);if(!edges.has(k))edges.set(k,{a:Math.min(i,j),b:Math.max(i,j),h:lv.stars[i][1]===lv.stars[j][1]})}));
    const list=[...edges.values()];
    list.forEach(e=>e.cross=[]);
    for(const A of list)for(const B of list){if(A.h||!B.h)continue;
      const [vx,vy1]=lv.stars[A.a],vy2=lv.stars[A.b][1],[hx1,hy]=lv.stars[B.a],hx2=lv.stars[B.b][0];
      if(vx>Math.min(hx1,hx2)&&vx<Math.max(hx1,hx2)&&hy>Math.min(vy1,vy2)&&hy<Math.max(vy1,vy2)){A.cross.push(key(B.a,B.b));B.cross.push(key(A.a,A.b))}}
    return {nb,edges};
  }
  const key=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b);
  const pos=i=>[(L.stars[i][0]+.5)*C,(L.stars[i][1]+.5)*C];
  const degree=i=>G.nb[i].reduce((s,j)=>s+(j<0?0:(S.b[key(i,j)]||0)),0);

  function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}

  let gBridges,gStars,gPreview,starEls=[];
  function build(){
    board.textContent='';const pad=4,W=L.w*C,H=L.h*C;
    board.setAttribute('viewBox',`${-pad} ${-pad} ${W+pad*2} ${H+pad*2}`);
    board.style.aspectRatio=`${W+pad*2} / ${H+pad*2}`;
    const defs=el('defs',{},board);
    const rg=el('radialGradient',{id:'hz-star-fill',cx:'40%',cy:'35%',r:'70%'},defs);el('stop',{offset:'0','stop-color':'#ffffff'},rg);el('stop',{offset:'.6','stop-color':'#e9ecff'},rg);el('stop',{offset:'1','stop-color':'#b9c4f2'},rg);
    const gg=el('radialGradient',{id:'hz-glow'},defs);el('stop',{offset:'0','stop-color':'#cfd9ff','stop-opacity':'.55'},gg);el('stop',{offset:'1','stop-color':'#cfd9ff','stop-opacity':'0'},gg);
    // 星図の罫線と、星の置ける点
    const grid=el('g',{class:'hz-grid'},board);
    for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++)el('circle',{cx:(x+.5)*C,cy:(y+.5)*C,r:.45},grid);
    el('rect',{x:-pad/2,y:-pad/2,width:W+pad,height:H+pad,rx:3,class:'hz-frame'},board);
    gBridges=el('g',{class:'hz-bridges'},board);
    gPreview=el('g',{class:'hz-preview'},board);
    gStars=el('g',{class:'hz-stars'},board);
    starEls=L.stars.map((s,i)=>{
      const [cx,cy]=pos(i),g=el('g',{class:'hz-star',tabindex:'0',role:'button','data-i':i,transform:`translate(${cx} ${cy})`},gStars);
      el('circle',{r:6.2,class:'hz-halo',fill:'url(#hz-glow)'},g);
      el('circle',{r:4.95,class:'hz-hit'},g);
      el('circle',{r:3.5,class:'hz-ring'},g);
      el('circle',{r:3.05,class:'hz-core',fill:'url(#hz-star-fill)'},g);
      const t=el('text',{class:'hz-num','text-anchor':'middle','dominant-baseline':'central',y:.15},g);t.textContent=s[2];
      return g;
    });
    // 星をまたぐ光：完成時に一つずつ灯る順番
    starEls.forEach((g,i)=>g.style.setProperty('--d',(i*.06).toFixed(2)+'s'));
  }

  function render(){
    gBridges.textContent='';
    for(const [k,n] of Object.entries(S.b)){if(!n)continue;const [a,b]=k.split('-').map(Number),[x1,y1]=pos(a),[x2,y2]=pos(b),h=y1===y2;
      const g=el('g',{class:'hz-bridge'+(n===2?' two':''),'data-k':k},gBridges);
      // 星の縁から縁まで引く
      const ux=h?Math.sign(x2-x1):0,uy=h?0:Math.sign(y2-y1),ax=x1+ux*3.4,ay=y1+uy*3.4,bx=x2-ux*3.4,by=y2-uy*3.4;
      // 細い線でも押しやすいよう、線の周りに透明な帯を敷く
      el('rect',{x:Math.min(ax,bx)-(h?0:2.2),y:Math.min(ay,by)-(h?2.2:0),width:Math.abs(bx-ax)+(h?0:4.4),height:Math.abs(by-ay)+(h?4.4:0),class:'hz-bhit'},g);
      const off=n===2?.85:0;
      for(const o of n===2?[-off,off]:[0])el('line',{x1:ax+(h?0:o),y1:ay+(h?o:0),x2:bx+(h?0:o),y2:by+(h?o:0),class:'hz-beam'},g);
    }
    starEls.forEach((g,i)=>{const d=degree(i),n=L.stars[i][2];g.classList.toggle('ok',d===n);g.classList.toggle('over',d>n);g.classList.toggle('sel',selected===i);
      g.setAttribute('aria-label',`星 ${n}（いま${d}本${d===n?'・そろった':d>n?'・多すぎ':''}）`)});
    $('hz-moves').textContent=S.moves;
    board.classList.toggle('solved',S.solved);
    $('hz-done').classList.toggle('show',S.solved);
    if(S.solved){const b=bests()[S.level];$('hz-done-note').textContent=`${nightName(S.level)}・${S.moves}手`+(b!=null?`（いちばん少ない手数 ${b}手）`:'')}
    $('hz-undo').disabled=!S.hist.length||S.solved;
  }

  function connected(){const seen=new Set([0]),st=[0];while(st.length){const i=st.pop();G.nb[i].forEach(j=>{if(j>=0&&S.b[key(i,j)]&&!seen.has(j)){seen.add(j);st.push(j)}})}return seen.size===L.stars.length}
  function check(){
    if(L.stars.every((s,i)=>degree(i)===s[2])&&connected()){
      S.solved=true;const b=bests();if(b[S.level]==null||S.moves<b[S.level]){b[S.level]=S.moves;store.set(BEST_KEY,JSON.stringify(b))}
      sfx.done();
    }
  }
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,b:S.b,moves:S.moves,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}

  // 線を一段階進める（なし→1本→2本→なし）。交差するときは引けない
  function cycle(a,b,fromKeyboard){
    if(S.solved||a<0||b<0)return false;const k=key(a,b),e=G.edges.get(k);if(!e)return false;
    const cur=S.b[k]||0,next=(cur+1)%3;
    if(cur===0&&e.cross.some(c=>S.b[c])){sfx.block();flash(a,b);return false}
    S.hist.push([k,cur]);if(next)S.b[k]=next;else delete S.b[k];S.moves++;
    if(next)sfx.link(next,Math.min(a,b)+Math.max(a,b));else sfx.unlink();
    check();render();save();
    if(S.solved&&!fromKeyboard)$('hz-next').focus({preventScroll:true});
    return true;
  }
  function flash(a,b){[a,b].forEach(i=>{const g=starEls[i];g.classList.remove('deny');void g.getBBox();g.classList.add('deny')})}

  // ── 操作：タップ・ドラッグ・線のタップ・キーボード ──
  const svgPoint=e=>{const p=board.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(board.getScreenCTM().inverse())};
  function preview(i,dir){gPreview.textContent='';if(i==null||dir<0)return;const j=G.nb[i][dir];if(j<0)return;const [x1,y1]=pos(i),[x2,y2]=pos(j);el('line',{x1,y1,x2,y2},gPreview)}
  board.addEventListener('pointerdown',e=>{
    const star=e.target.closest('.hz-star');if(!star||S.solved)return;
    const i=+star.dataset.i,p=svgPoint(e);drag={i,x:p.x,y:p.y,dir:-1,id:e.pointerId};
    try{board.setPointerCapture(e.pointerId)}catch(err){}
  });
  board.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;const p=svgPoint(e),dx=p.x-drag.x,dy=p.y-drag.y;
    const dir=Math.hypot(dx,dy)<C*.45?-1:Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);
    if(dir!==drag.dir){drag.dir=dir;preview(drag.i,dir)}
  });
  board.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;preview(null,-1);
    if(d.dir>=0){selected=null;if(!cycle(d.i,G.nb[d.i][d.dir]))render();return}
    tap(d.i);
  });
  board.addEventListener('pointercancel',()=>{drag=null;preview(null,-1)});
  board.addEventListener('click',e=>{const br=e.target.closest('.hz-bridge');if(!br||e.target.closest('.hz-star'))return;const [a,b]=br.dataset.k.split('-').map(Number);selected=null;cycle(a,b)});
  function tap(i){
    if(selected===null){selected=i}
    else if(selected===i){selected=null}
    else{const dir=G.nb[selected].indexOf(i);if(dir>=0){const a=selected;selected=null;if(cycle(a,i))return}else selected=i}
    render();
  }
  board.addEventListener('keydown',e=>{
    const star=e.target.closest('.hz-star');if(!star)return;const i=+star.dataset.i;
    const dir={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[e.key];
    if(dir!==undefined){e.preventDefault();const j=G.nb[i][dir];if(j<0)return;
      if(e.shiftKey){selected=null;cycle(i,j,true);starEls[i].focus()}else starEls[j].focus();return}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();tap(i);starEls[i].focus()}
    if(e.key==='Escape'&&selected!==null){selected=null;render()}
  });

  // ── 面の切り替え・ボタン ──
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];G=geometry(L);selected=null;
    const ok=saved&&saved.level===level&&saved.b&&typeof saved.b==='object';
    S={level,b:ok?Object.fromEntries(Object.entries(saved.b).filter(([k,n])=>G.edges.has(k)&&(n===1||n===2))):{},moves:ok?saved.moves|0:0,hist:[],solved:false};
    if(ok)check();
    $('hz-lv').textContent=nightName(level);$('hz-size').textContent=`${L.w}×${L.h}・星${L.stars.length}`;
    build();render();save();
  }
  $('hz-undo').addEventListener('click',()=>{if(!S.hist.length||S.solved)return;const [k,prev]=S.hist.pop();if(prev)S.b[k]=prev;else delete S.b[k];S.moves++;selected=null;sfx.unlink();render();save()});
  let armed=null;const resetBtn=$('hz-reset');
  resetBtn.addEventListener('click',()=>{
    if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.b={};S.moves=0;S.hist=[];S.solved=false;selected=null;render();save();
  });
  $('hz-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null);const f=starEls[0];if(f)f.focus({preventScroll:true})});
  const soundBtn=$('hz-sound');
  const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.link(1,2)});
  paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // タイトルのスライドに出す、続きの案内
  window.Hoshizu={
    label(){const going=S.moves||S.level>1;return {play:going?'つづきの夜へ':'星を結ぶ',note:going?`${nightName(S.level)}・${S.moves}手から`:''}},
    levels:LEVELS.length
  };
})();
