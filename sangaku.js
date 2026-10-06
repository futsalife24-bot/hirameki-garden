/* 算額：神社に奉納する数の額。N×N の盤の各行・各列に 1〜N を一つずつ入れる。
   太枠の区画には「答えと演算」が書かれ、区画の数をその演算で合わせると答えになる（引く・割るは二マスの区画だけ）。
   マスを選んで、下の数字の札で書き入れる。問題は tools/sangaku-gen.cjs が作った sangaku-levels.js（解がちょうど一つ）。 */
(function(){
  const LEVELS=window.SANGAKU_LEVELS||[];
  const KEY='sangaku-save-v1',BEST_KEY='sangaku-best',SOUND_KEY='sangaku-sound';
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('sangaku');if(!root||!LEVELS.length)return;
  const grid=$('sg-grid'),pad=$('sg-pad');
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const tabletName=l=>`${kanji(l)}の額`;
  const OPS={'+':'足す','−':'引く','×':'掛ける','÷':'割る','':''};
  let L=null,S=null,sel=0,cageOf=[];

  // ── 音（Web Audioで合成。筆を置く音と、拍子木） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function tone(f,t,dur,vol,type){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const s=ac.currentTime+t,o=ac.createOscillator(),g=ac.createGain();o.type=type||'triangle';o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.005);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const sfx={put(v){tone(520+v*40,0,.09,.05)},erase(){tone(300,0,.08,.04)},no(){tone(180,0,.18,.05,'sine')},done(){[0,.22,.44].forEach((t,k)=>tone(1180-k*90,t,.5,.06,'square'));[0,5,9,12].forEach((s,k)=>tone(440*Math.pow(2,s/12),.8+k*.12,.6,.04,'sine'))}};

  // ── 規則 ──
  const n=()=>L.n;
  function fits(op,t,vals,size){
    if(vals.length<size){if(op==='+'){const s=vals.reduce((a,b)=>a+b,0);return s+(size-vals.length)<=t}if(op==='×'){const p=vals.reduce((a,b)=>a*b,1);return t%p===0}return true}
    if(op==='')return vals[0]===t;if(op==='+')return vals.reduce((a,b)=>a+b,0)===t;if(op==='×')return vals.reduce((a,b)=>a*b,1)===t;
    const a=Math.max(...vals),b=Math.min(...vals);return op==='−'?a-b===t:a===b*t}
  function clashes(){const N=n(),bad=new Set();
    for(let s=0;s<N*N;s++){const v=S.v[s];if(!v)continue;const x=s%N,y=(s/N)|0;
      for(let k=0;k<N;k++){if(k!==x&&S.v[y*N+k]===v){bad.add(s);bad.add(y*N+k)}if(k!==y&&S.v[k*N+x]===v){bad.add(s);bad.add(k*N+x)}}}
    return bad}
  function cageBad(i){const [op,t,cells]=L.cages[i],vals=cells.map(c=>S.v[c]);return vals.every(Boolean)&&!fits(op,t,vals,cells.length)}
  const isSolved=()=>S.v.join('')===L.sol;
  function candidates(s){const N=n(),x=s%N,y=(s/N)|0,out=[];const [op,t,cells]=L.cages[cageOf[s]];
    for(let v=1;v<=N;v++){let ok=true;for(let k=0;k<N;k++)if(S.v[y*N+k]===v||S.v[k*N+x]===v){ok=false;break}
      if(ok){const vals=cells.map(c=>c===s?v:S.v[c]).filter(Boolean);ok=fits(op,t,vals,cells.length)}if(ok)out.push(v)}
    return out}

  // ── 描画 ──
  function build(){const N=n();grid.textContent='';grid.style.setProperty('--n',N);cageOf=[];L.cages.forEach((c,i)=>c[2].forEach(s=>cageOf[s]=i));
    for(let s=0;s<N*N;s++){const x=s%N,y=(s/N)|0,c=cageOf[s],b=document.createElement('button');b.type='button';b.className='sg-cell';b.dataset.s=s;
      if(y===0||cageOf[s-N]!==c)b.classList.add('bt');if(x===N-1||cageOf[s+1]!==c)b.classList.add('br');if(y===N-1||cageOf[s+N]!==c)b.classList.add('bb');if(x===0||cageOf[s-1]!==c)b.classList.add('bl');
      const [op,t,cells]=L.cages[c];if(Math.min(...cells)===s){const lab=document.createElement('i');lab.textContent=`${t}${op}`;b.appendChild(lab)}
      const sp=document.createElement('span');b.appendChild(sp);grid.appendChild(b)}
    pad.textContent='';pad.style.setProperty('--n',N+1);
    for(let v=1;v<=N;v++){const b=document.createElement('button');b.type='button';b.className='sg-key';b.dataset.v=v;b.textContent=v;b.setAttribute('aria-label',`${v}を書く`);pad.appendChild(b)}
    const e=document.createElement('button');e.type='button';e.className='sg-key erase';e.dataset.v=0;e.textContent='消す';pad.appendChild(e)}
  function cellLabel(s){const N=n(),[op,t,cells]=L.cages[cageOf[s]];return `${((s/N)|0)+1}行${s%N+1}列：${S.v[s]||'空'}。区画は${cells.length}マスで${op?`${OPS[op]}と${t}`:`${t}`}`}
  function render(fresh){const N=n(),bad=clashes(),badCage=new Set(L.cages.map((_,i)=>i).filter(cageBad));
    [...grid.children].forEach((el,s)=>{el.querySelector('span').textContent=S.v[s]||'';el.classList.toggle('sel',s===sel&&!S.solved);
      el.classList.toggle('clash',bad.has(s));el.classList.toggle('cagebad',badCage.has(cageOf[s]));el.classList.toggle('fresh',s===fresh);
      el.tabIndex=s===sel?0:-1;el.disabled=S.solved;el.setAttribute('aria-label',cellLabel(s))});
    const left=S.v.filter(v=>!v).length;$('sg-left').textContent=left;$('sg-fix').textContent=S.fix;
    $('sg-undo').disabled=!S.hist.length||S.solved;$('sg-reset').disabled=S.solved;[...pad.children].forEach(b=>b.disabled=S.solved);
    $('sg-done').classList.toggle('show',S.solved);grid.classList.toggle('solved',S.solved);
    if(S.solved){const b=bests()[S.level];$('sg-done-note').textContent=(S.fix?`書き直し${S.fix}回`:'書き直しなしで解きました')+(b!=null&&b<S.fix?`・ベスト 書き直し${b}回`:'')}
    coach()}

  // ── 操作 ──
  function put(v){if(S.solved)return;const s=sel,prev=S.v[s];if(prev===v)return;
    if(!v&&!prev)return;S.hist.push([s,prev]);if(prev)S.fix++;S.v[s]=v;
    if(v)sfx.put(v);else sfx.erase();
    const bad=v&&clashes().has(s);if(bad){sfx.no();announce(`${v}は同じ行か列にもう入っています`)}
    else if(v&&cageBad(cageOf[s]))announce('区画の答えに合いません');else announce(v?`${v}を書きました`:'消しました');
    if(isSolved()){S.solved=true;const b=bests();if(b[S.level]==null||S.fix<b[S.level]){b[S.level]=S.fix;store.set(BEST_KEY,JSON.stringify(b))}setTimeout(()=>sfx.done(),200);announce('算額が解けました')}
    render(v?s:-1);save()}
  function select(s,focus){sel=s;render();if(focus)grid.children[s].focus({preventScroll:true})}
  grid.addEventListener('click',e=>{const b=e.target.closest('.sg-cell');if(b)select(+b.dataset.s,true)});
  grid.addEventListener('keydown',e=>{const N=n(),x=sel%N,y=(sel/N)|0;
    const mv={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]}[e.key];
    if(mv){e.preventDefault();select(Math.min(N-1,Math.max(0,y+mv[1]))*N+Math.min(N-1,Math.max(0,x+mv[0])),true);return}
    if(/^[1-9]$/.test(e.key)&&+e.key<=N){e.preventDefault();put(+e.key);return}
    if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){e.preventDefault();put(0)}});
  pad.addEventListener('click',e=>{const b=e.target.closest('.sg-key');if(b)put(+b.dataset.v)});
  const live=$('sg-live');const announce=t=>{if(live)live.textContent=t};

  // ── 手ほどき（一の額）：入る数が一つに決まるマスを光らせる ──
  function coach(){const box=$('sg-coach');[...grid.children].forEach(e=>e.classList.remove('guide'));if(!box)return;if(S.level!==1||S.solved){box.hidden=true;return}
    const N=n(),wrong=S.v.some((v,s)=>v&&v!==+L.sol[s]);
    if(wrong){box.textContent='どこかに合わない数があります。同じ行・列に同じ数がないか、区画の答えに合うかを見直しましょう。'}
    else{let g=-1;for(let s=0;s<N*N;s++)if(!S.v[s]&&candidates(s).length===1){g=s;break}
      if(g<0)for(let s=0;s<N*N;s++)if(!S.v[s]){g=s;break}
      if(g>=0){grid.children[g].classList.add('guide');const [op,t,cells]=L.cages[cageOf[g]];
        box.textContent=S.v.every(v=>!v)?`はじめての額。各行・各列に1〜${N}を一つずつ。光るマスを選び、下の札で数を書きます。`
          :cells.length===1?`光るマスは一マスだけの区画。書いてある「${t}」がそのまま入ります。`
          :`光るマスの区画は「${t}${op}」。${OPS[op]}と${t}になる組み合わせと、同じ行・列の数から一つに決まります。`}}
    box.hidden=false}

  // ── 面・保存 ──
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,v:S.v,fix:S.fix,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  const valid=v=>Array.isArray(v)&&v.length===L.n*L.n&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=L.n);
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];sel=0;
    const ok=saved&&saved.level===level&&valid(saved.v);
    S={level,v:ok?saved.v.slice():new Array(L.n*L.n).fill(0),fix:ok?Math.max(0,saved.fix|0):0,hist:[],solved:false};if(ok&&isSolved())S.solved=true;
    $('sg-lv').textContent=tabletName(level);$('sg-size').textContent=`${L.n}×${L.n}・区画${L.cages.length}`;
    build();render();save()}
  $('sg-undo').addEventListener('click',()=>{if(!S.hist.length||S.solved)return;const [s,prev]=S.hist.pop();S.v[s]=prev;sel=s;sfx.erase();render();save()});
  let armed=null;const resetBtn=$('sg-reset');
  resetBtn.addEventListener('click',()=>{if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.v.fill(0);S.fix=0;S.hist=[];sel=0;render();save()});
  $('sg-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null);grid.children[0].focus({preventScroll:true})});
  const soundBtn=$('sg-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.put(3)});paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：朱の社殿にかかる算額 ──
  function drawArt(){const c=$('sg-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#5a1810');bg.addColorStop(1,'#3a0f0a');g.fillStyle=bg;g.fillRect(0,0,w,h);
    // 社殿の柱と貫
    g.fillStyle='#b8321f';g.fillRect(w*.08,h*.08,w*.06,h*.92);g.fillRect(w*.86,h*.08,w*.06,h*.92);g.fillRect(0,h*.1,w,h*.05);g.fillStyle='#2a0b07';g.fillRect(0,h*.05,w,h*.05);
    // 額：屋根つきの板
    const x0=w*.22,y0=h*.24,bw=w*.56,bh=h*.62;
    g.fillStyle='#2b201a';g.beginPath();g.moveTo(x0-w*.05,y0+h*.02);g.lineTo(x0+bw/2,y0-h*.1);g.lineTo(x0+bw+w*.05,y0+h*.02);g.closePath();g.fill();
    const wood=g.createLinearGradient(x0,0,x0+bw,0);wood.addColorStop(0,'#d9c49a');wood.addColorStop(.5,'#ecdcb6');wood.addColorStop(1,'#d2b98a');g.fillStyle=wood;g.fillRect(x0,y0+h*.02,bw,bh);
    g.strokeStyle='rgba(120,90,50,.18)';g.lineWidth=2;for(let k=0;k<14;k++){g.beginPath();g.moveTo(x0,y0+h*.05+k*bh/14);g.bezierCurveTo(x0+bw*.3,y0+h*.06+k*bh/14,x0+bw*.6,y0+h*.03+k*bh/14,x0+bw,y0+h*.05+k*bh/14);g.stroke()}
    // 盤：4×4 と区画
    const lv=LEVELS.find(l=>l.n===4)||LEVELS[0],N=lv.n,cs=bw*.7/N,gx=x0+bw*.15,gy=y0+h*.02+(bh-cs*N)/2,co=[];lv.cages.forEach((c,i)=>c[2].forEach(s=>co[s]=i));
    g.strokeStyle='rgba(40,25,15,.35)';g.lineWidth=1.5;for(let k=0;k<=N;k++){g.beginPath();g.moveTo(gx+k*cs,gy);g.lineTo(gx+k*cs,gy+N*cs);g.moveTo(gx,gy+k*cs);g.lineTo(gx+N*cs,gy+k*cs);g.stroke()}
    g.strokeStyle='#241812';g.lineWidth=5;g.lineCap='square';
    for(let s=0;s<N*N;s++){const x=s%N,y=(s/N)|0,X=gx+x*cs,Y=gy+y*cs;
      if(y===0||co[s-N]!==co[s]){g.beginPath();g.moveTo(X,Y);g.lineTo(X+cs,Y);g.stroke()}if(x===0||co[s-1]!==co[s]){g.beginPath();g.moveTo(X,Y);g.lineTo(X,Y+cs);g.stroke()}
      if(y===N-1){g.beginPath();g.moveTo(X,Y+cs);g.lineTo(X+cs,Y+cs);g.stroke()}if(x===N-1){g.beginPath();g.moveTo(X+cs,Y);g.lineTo(X+cs,Y+cs);g.stroke()}}
    g.textBaseline='top';g.fillStyle='#a8261a';g.font=`${cs*.24}px 'Yuji Syuku',serif`;lv.cages.forEach(([op,t,cells])=>{const s=Math.min(...cells);g.fillText(`${t}${op}`,gx+(s%N)*cs+cs*.08,gy+((s/N)|0)*cs+cs*.06)});
    g.fillStyle='#241812';g.font=`${cs*.5}px 'Yuji Syuku',serif`;g.textAlign='center';g.textBaseline='middle';[...lv.sol].forEach((v,s)=>{if(s%3===0)g.fillText(v,gx+(s%N+.5)*cs,gy+(((s/N)|0)+.58)*cs)});g.textAlign='left';
    // 紅白の紐
    g.strokeStyle='#f3ead6';g.lineWidth=4;g.beginPath();g.moveTo(x0+bw*.2,y0-h*.04);g.lineTo(x0+bw*.2,y0-h*.16);g.moveTo(x0+bw*.8,y0-h*.04);g.lineTo(x0+bw*.8,y0-h*.16);g.stroke()}
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Sangaku={label(){const going=S.v.some(Boolean)||S.level>1;return {play:going?'つづきの額へ':'額に向かう',note:going?`${tabletName(S.level)}・残り${S.v.filter(v=>!v).length}マス`:''}},levels:LEVELS.length};
})();
