/* 帳面：ヒント付きのクロスワード。方眼ノートに、答えをペンで書き込んでいく。
   マスを選ぶとヒントが出る。答えを打ち込んで「書く」と、合っていればインクで書き込まれる。
   交わるマスの文字は、次の答えの手がかりになる。すべて書き込めば完成。
   問題は tools/chomen-gen.cjs が作った chomen-levels.js。 */
(function(){
  const LEVELS=window.CHOMEN_LEVELS||[];
  const KEY='chomen-save-v1',BEST_KEY='chomen-best',SOUND_KEY='chomen-sound';
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('chomen');if(!root||!LEVELS.length)return;
  const gridEl=$('cm-grid'),input=$('cm-input');
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const pageName=l=>`${kanji(l)}ページ目`;
  let L=null,S=null,cells=[],cur=0;
  const cellsOf=e=>Array.from({length:[...e.a].length},(_,i)=>e.d==='a'?[e.x+i,e.y]:[e.x,e.y+i]);
  const W=()=>L.rows[0].length,H=()=>L.rows.length;
  const dirName=d=>d==='a'?'ヨコ':'タテ';

  // ── 音（Web Audioで合成。ペン先が紙をすべる音） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function scratch(t,dur,vol){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const s=ac.currentTime+t,b=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/d.length);
    const n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=b;f.type='bandpass';f.frequency.value=3200;f.Q.value=.8;g.gain.value=vol;n.connect(f);f.connect(g);g.connect(ac.destination);n.start(s)}catch(e){}}
  function tone(fq,t,dur,vol){if(!soundOn||!ac)return;try{const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+t;o.type='sine';o.frequency.value=fq;g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const sfx={write(n){for(let i=0;i<n;i++)scratch(i*.07,.06,.12)},miss(){scratch(0,.18,.06);tone(220,.02,.2,.04)},done(){scratch(0,.12,.1);[0,4,7,12].forEach((s,k)=>tone(659.25*Math.pow(2,s/12),.1+k*.1,.7,.05))}};

  // ── 盤 ──
  function build(){
    gridEl.textContent='';gridEl.style.gridTemplateColumns=`repeat(${W()},1fr)`;$('cm-board').style.setProperty('--ar',(W()/H()).toFixed(4));
    const num=new Map();L.entries.forEach(e=>num.set(e.x+','+e.y,e.n));
    cells=L.rows.map((row,y)=>[...row].map((ch,x)=>{
      if(ch==='.'){const d=document.createElement('div');d.className='cm-block';d.setAttribute('aria-hidden','true');gridEl.appendChild(d);return null}
      const b=document.createElement('button');b.type='button';b.className='cm-cell';b.dataset.x=x;b.dataset.y=y;b.tabIndex=-1;
      if(num.has(x+','+y)){const i=document.createElement('i');i.textContent=num.get(x+','+y);b.appendChild(i)}
      b.appendChild(document.createElement('span'));gridEl.appendChild(b);return b}));
  }
  function letters(){const g=L.rows.map(r=>[...r].map(()=>''));L.entries.forEach((e,i)=>{if(S.done[i])cellsOf(e).forEach(([x,y],k)=>g[y][x]=[...e.a][k])});return g}
  function render(){
    const g=letters(),e=L.entries[cur],on=new Set(cellsOf(e).map(([x,y])=>x+','+y));
    cells.forEach((row,y)=>row.forEach((c,x)=>{if(!c)return;const ch=g[y][x];const sp=c.querySelector('span');if(sp.textContent!==ch){sp.textContent=ch;if(ch)c.classList.add('fresh')}
      c.classList.toggle('filled',!!ch);c.classList.toggle('sel',!S.solved&&on.has(x+','+y));c.setAttribute('aria-label',`${y+1}行${x+1}列 ${ch||'空き'}`)}));
    setTimeout(()=>cells.flat().forEach(c=>c&&c.classList.remove('fresh')),400);
    // いまのヒント
    const len=[...e.a].length,pat=cellsOf(e).map(([x,y])=>g[y][x]||'○').join('');
    $('cm-clue-no').textContent=`${dirName(e.d)} ${e.n}`;$('cm-clue').textContent=e.c;$('cm-len').textContent=`${len}文字`;
    input.placeholder=S.done[cur]?'書き込み済み':pat;input.disabled=S.solved||S.done[cur];$('cm-write').disabled=S.solved||S.done[cur];
    $('cm-left').textContent=S.done.filter(v=>!v).length;$('cm-miss').textContent=S.miss;
    $('cm-done').classList.toggle('show',S.solved);gridEl.classList.toggle('solved',S.solved);
    if(S.solved){const b=bests()[S.level];$('cm-done-note').textContent=`書き損じ ${S.miss}回`+(b!=null&&b<S.miss?`・ベスト ${b}回`:'')}
    coach();
  }

  // ── 書く ──
  const toHira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  function write(){
    if(S.solved||S.done[cur])return;const e=L.entries[cur],v=toHira(input.value.replace(/\s/g,''));if(!v){input.focus();return}
    const len=[...e.a].length;
    if([...v].length!==len){note(`${len}文字で書きましょう`);return}
    if(v!==e.a){S.miss++;note('違うようです。ヒントと、交わる文字をもう一度');shake();sfx.miss();save();render();return}
    S.done[cur]=true;input.value='';sfx.write(len);note('');announce(`${dirName(e.d)}${e.n}「${e.a}」を書きました`);
    if(S.done.every(Boolean)){S.solved=true;const b=bests();if(b[S.level]==null||S.miss<b[S.level]){b[S.level]=S.miss;store.set(BEST_KEY,JSON.stringify(b))}sfx.done();announce('ノートが埋まりました')}
    else cur=nextOpen(cur,1);
    save();render();if(!S.solved&&matchMedia('(pointer:fine)').matches)input.focus({preventScroll:true});
  }
  function nextOpen(from,dir){const n=L.entries.length;for(let k=1;k<=n;k++){const i=((from+dir*k)%n+n)%n;if(!S.done[i])return i}return from}
  function note(t){$('cm-note').textContent=t}
  function shake(){const p=$('cm-board');p.classList.remove('shake');void p.offsetWidth;p.classList.add('shake')}
  const live=$('cm-live');const announce=t=>{if(live)live.textContent=t};
  $('cm-form').addEventListener('submit',ev=>{ev.preventDefault();write()});
  $('cm-prev').addEventListener('click',()=>{cur=nextOpen(cur,-1);note('');render()});
  $('cm-next-clue').addEventListener('click',()=>{cur=nextOpen(cur,1);note('');render()});

  // ── マスの選択とキーボード ──
  function entriesAt(x,y){return L.entries.map((e,i)=>[e,i]).filter(([e])=>cellsOf(e).some(([a,b])=>a===x&&b===y)).map(([,i])=>i)}
  function choose(x,y){const o=entriesAt(x,y);if(!o.length)return;cur=o.length>1&&o.includes(cur)?o[(o.indexOf(cur)+1)%o.length]:(o.find(i=>!S.done[i])??o[0]);note('');render();
    cells.flat().forEach(c=>c&&(c.tabIndex=-1));cells[y][x].tabIndex=0;if(!S.done[cur])input.focus({preventScroll:true})}
  gridEl.addEventListener('click',ev=>{const c=ev.target.closest('.cm-cell');if(c&&!S.solved)choose(+c.dataset.x,+c.dataset.y)});
  gridEl.addEventListener('keydown',ev=>{const c=ev.target.closest('.cm-cell');if(!c)return;const x=+c.dataset.x,y=+c.dataset.y,d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];
    if(d){ev.preventDefault();let nx=x+d[0],ny=y+d[1];while(nx>=0&&ny>=0&&nx<W()&&ny<H()){if(cells[ny][nx]){cells.flat().forEach(q=>q&&(q.tabIndex=-1));cells[ny][nx].tabIndex=0;cells[ny][nx].focus();return}nx+=d[0];ny+=d[1]}return}
    if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(x,y)}});

  // ── 手ほどき（一ページ目） ──
  function coach(){const box=$('cm-coach');if(!box)return;if(S.level!==1||S.solved){box.hidden=true;return}
    const n=S.done.filter(Boolean).length;
    box.textContent=n===0?'はじめてのページ。上のヒントを読んで、答えをひらがなで打ち込み「書く」を押しましょう。マスをタップすると、ほかのヒントに移れます。'
      :n===1?'書き込んだ文字は、交わる言葉の手がかりになります。ヒントの下の「○」に、わかっている文字が入っています。'
      :'その調子。すべてのマスが埋まればページの完成です。';box.hidden=false}

  // ── 面・保存 ──
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,done:S.done,miss:S.miss,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];const n=L.entries.length;
    const ok=saved&&saved.level===level&&Array.isArray(saved.done)&&saved.done.length===n;
    S={level,done:ok?saved.done.map(Boolean):new Array(n).fill(false),miss:ok?saved.miss|0:0,solved:false};
    if(S.done.every(Boolean))S.solved=true;cur=nextOpen(-1,1);if(S.solved)cur=0;
    $('cm-lv').textContent=pageName(level);$('cm-size').textContent=`${L.theme}・言葉${n}`;input.value='';note('');
    build();render();save();
  }
  let armed=null;const resetBtn=$('cm-reset');
  resetBtn.addEventListener('click',()=>{if(!armed){resetBtn.textContent='もう一度押すと消します';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.done=S.done.map(()=>false);S.miss=0;S.solved=false;cur=0;note('');render();save()});
  $('cm-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null)});
  const soundBtn=$('cm-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.write(2)});paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：方眼ノートと万年筆 ──
  function drawArt(){const c=$('cm-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    g.fillStyle='#c9b48f';g.fillRect(0,0,w,h);// 机
    g.save();g.translate(w*.5,h*.5);g.rotate(-.05);
    const pw=w*.62,ph=h*.78;g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=24;g.shadowOffsetY=8;g.fillStyle='#fbfcfd';g.fillRect(-pw/2,-ph/2,pw,ph);g.shadowBlur=0;g.shadowOffsetY=0;
    const step=pw/16;g.strokeStyle='rgba(80,130,190,.28)';g.lineWidth=1;for(let x=-pw/2;x<=pw/2;x+=step){g.beginPath();g.moveTo(x,-ph/2);g.lineTo(x,ph/2);g.stroke()}for(let y=-ph/2;y<=ph/2;y+=step){g.beginPath();g.moveTo(-pw/2,y);g.lineTo(pw/2,y);g.stroke()}
    g.strokeStyle='rgba(220,70,70,.55)';g.lineWidth=2;g.beginPath();g.moveTo(-pw/2+step*2,-ph/2);g.lineTo(-pw/2+step*2,ph/2);g.stroke();
    // 穴とリング
    for(let i=0;i<9;i++){const y=-ph/2+ph*(i+.5)/9;g.fillStyle='#c9b48f';g.beginPath();g.arc(-pw/2+step*.7,y,step*.22,0,7);g.fill()}
    const lv=LEVELS[0],cs=step*1.6,ox=-pw/2+step*4,oy=-ph/2+step*2.5;
    lv.rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='.')return;g.strokeStyle='#28406e';g.lineWidth=1.6;g.strokeRect(ox+x*cs,oy+y*cs,cs,cs);
      g.fillStyle='#1f3a8a';g.font=`600 ${cs*.62}px 'Klee One','Hiragino Maru Gothic ProN',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,ox+(x+.5)*cs,oy+(y+.56)*cs)}));
    g.restore();
    // 万年筆
    g.save();g.translate(w*.78,h*.62);g.rotate(-.75);const L2=w*.36;g.fillStyle='#1d2433';g.beginPath();g.roundRect(-L2/2,-w*.022,L2*.82,w*.044,w*.022);g.fill();
    g.fillStyle='#c9a24a';g.fillRect(-L2/2+L2*.55,-w*.024,L2*.04,w*.048);g.fillStyle='#d8b869';g.beginPath();g.moveTo(L2*.32,-w*.02);g.lineTo(L2*.5,0);g.lineTo(L2*.32,w*.02);g.closePath();g.fill();g.restore();}
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Chomen={label(){const going=S.done.some(Boolean)||S.level>1;return {play:going?'つづきのページへ':'ノートをひらく',note:going?`${pageName(S.level)}・残り${S.done.filter(v=>!v).length}語`:''}},levels:LEVELS.length};
})();
