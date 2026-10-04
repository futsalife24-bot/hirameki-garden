/* 活字：はめ込みクロスワード。言葉の活字を、版（盤）の空いたマスにはめていく。
   マスの並びを選び、同じ長さの活字を選ぶと置ける。交わるマスの文字が食い違う置き方はできない。
   すべての置き場が埋まれば完成。二重マスの文字を番号順に読むと合言葉になる。
   問題は tools/katsuji-gen.cjs が作った katsuji-levels.js（答えがひとつに決まる面だけ）。 */
(function(){
  const LEVELS=window.KATSUJI_LEVELS||[];
  const KEY='katsuji-save-v1',BEST_KEY='katsuji-best',SOUND_KEY='katsuji-sound';
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('katsuji');if(!root||!LEVELS.length)return;
  const gridEl=$('kj-grid'),trayEl=$('kj-tray');
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const editionName=l=>`第${kanji(l)}版`;
  const MARKS='①②③④⑤⑥⑦⑧⑨⑩';

  let L=null,S=null,cells=[],chips=[],sel=null,focusCell=null;
  // S.p：置き場ごとに置いた言葉の番号（-1 は空き）。最初から置いてある置き場は固定
  const cellsOf=([x,y,d,len])=>Array.from({length:len},(_,i)=>d==='a'?[x+i,y]:[x,y+i]);
  const W=()=>L.rows[0].length,H=()=>L.rows.length;

  // ── 音（Web Audioで合成。活字を組む、金属の小さな音） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function tone(f,t,dur,vol,type='square'){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter(),s=ac.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,s);fl.type='bandpass';fl.frequency.value=f*1.5;fl.Q.value=4;
    g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.003);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(fl);fl.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const sfx={set(n){for(let i=0;i<n;i++)tone(1700+i*90,i*.035,.06,.05)},lift(){tone(900,0,.08,.04,'triangle')},no(){tone(220,0,.16,.05,'triangle');tone(200,.09,.16,.04,'triangle')},
    done(){[0,4,7,12].forEach((s,k)=>tone(880*Math.pow(2,s/12),k*.1,.5,.05,'triangle'));tone(110,.0,.6,.08,'sine')}};

  // ── 盤の組み立て ──
  function build(){
    gridEl.textContent='';gridEl.style.gridTemplateColumns=`repeat(${W()},1fr)`;gridEl.style.aspectRatio=`${W()} / ${H()}`;
    $('kj-board').style.setProperty('--ar',(W()/H()).toFixed(4));
    const markAt=new Map(L.marks.map(([x,y],i)=>[x+','+y,i]));
    cells=L.rows.map((row,y)=>[...row].map((ch,x)=>{
      const d=document.createElement(ch==='.'?'div':'button');
      if(ch==='.'){d.className='kj-block';d.setAttribute('aria-hidden','true')}
      else{d.type='button';d.className='kj-cell';d.dataset.x=x;d.dataset.y=y;d.tabIndex=-1;
        const m=markAt.get(x+','+y);if(m!==undefined){d.classList.add('mark');const t=document.createElement('i');t.textContent=MARKS[m];d.appendChild(t)}
        const s=document.createElement('span');d.appendChild(s)}
      gridEl.appendChild(d);return ch==='.'?null:d}));
    const first=cells.flat().find(Boolean);if(first)first.tabIndex=0;
    // 活字の一覧：長さ順、同じ長さは五十音順
    trayEl.textContent='';
    const order=L.words.map((w,i)=>i).sort((a,b)=>L.words[a].length-L.words[b].length||L.words[a].localeCompare(L.words[b],'ja'));
    chips=[];
    for(const i of order){const b=document.createElement('button');b.type='button';b.className='kj-chip';b.dataset.i=i;b.textContent=L.words[i];b.setAttribute('aria-label',`${L.words[i]}（${L.words[i].length}文字）`);
      b.addEventListener('click',()=>pickWord(i));trayEl.appendChild(b);chips[i]=b}
  }

  // ── 状態から盤を描く ──
  function letters(){const g=L.rows.map(r=>[...r].map(()=>''));
    S.p.forEach((wi,si)=>{if(wi<0)return;cellsOf(L.slots[si]).forEach(([x,y],k)=>g[y][x]=[...L.words[wi]][k])});return g}
  function render(){
    const g=letters(),inSel=new Set(sel!=null?cellsOf(L.slots[sel]).map(([x,y])=>x+','+y):[]);
    const fixed=new Set();L.givens.forEach(si=>cellsOf(L.slots[si]).forEach(([x,y])=>fixed.add(x+','+y)));
    cells.forEach((row,y)=>row.forEach((c,x)=>{if(!c)return;const ch=g[y][x];c.querySelector('span').textContent=ch;c.classList.toggle('filled',!!ch);c.classList.toggle('given',fixed.has(x+','+y));c.classList.toggle('sel',inSel.has(x+','+y));
      c.setAttribute('aria-label',`${y+1}行${x+1}列 ${ch||'空き'}${c.classList.contains('mark')?'・二重マス':''}`)}));
    const used=new Set(S.p.filter(v=>v>=0)),need=sel!=null?L.slots[sel][3]:0;
    chips.forEach((b,i)=>{b.classList.toggle('used',used.has(i));b.classList.toggle('fit',!!need&&!used.has(i)&&L.words[i].length===need);b.classList.toggle('dim',!!need&&L.words[i].length!==need);b.disabled=S.solved||L.givens.some(si=>S.p[si]===i)});
    $('kj-moves').textContent=S.moves;$('kj-undo').disabled=!S.hist.length||S.solved;
    const left=S.p.filter(v=>v<0).length;$('kj-left').textContent=left;
    $('kj-done').classList.toggle('show',S.solved);gridEl.classList.toggle('solved',S.solved);
    if(S.solved){const b=bests()[S.level];$('kj-done-pw').textContent=L.pw;$('kj-done-note').textContent=`・${S.moves}手`+(b!=null&&b<S.moves?`・ベスト ${b}手`:'')}
    coach();
  }

  // ── 置く・外す ──
  function fits(si,wi){const g=letters();if(S.p[si]>=0)cellsOf(L.slots[si]).forEach(([x,y])=>g[y][x]='');
    // 交わる置き場の文字だけを見る（自分の置き場の古い文字は消して考える）
    const own=new Set(cellsOf(L.slots[si]).map(([x,y])=>x+','+y));
    S.p.forEach((w,sj)=>{if(sj===si||w<0)return;cellsOf(L.slots[sj]).forEach(([x,y],k)=>{if(own.has(x+','+y))g[y][x]=[...L.words[w]][k]})});
    const w=[...L.words[wi]];return w.length===L.slots[si][3]&&cellsOf(L.slots[si]).every(([x,y],k)=>!g[y][x]||g[y][x]===w[k])}
  function pickWord(wi){
    if(S.solved)return;
    const at=S.p.indexOf(wi);
    // 置いてある活字を押すと、盤から外す
    if(at>=0){if(L.givens.includes(at))return;S.hist.push([at,wi]);S.p[at]=-1;S.moves++;sel=at;sfx.lift();announce(`${L.words[wi]}を外しました`);render();save();return}
    if(sel==null){sel=L.slots.findIndex((s,si)=>S.p[si]<0&&s[3]===L.words[wi].length&&fits(si,wi));if(sel<0){sel=null;deny(wi,'はめられる場所がありません');return}}
    if(L.givens.includes(sel)){deny(wi,'この列は最初から組まれています');return}
    if(L.words[wi].length!==L.slots[sel][3]){deny(wi,`${L.slots[sel][3]}文字の活字を選びましょう`);return}
    if(!fits(sel,wi)){deny(wi,'交わるマスの文字が合いません');return}
    S.hist.push([sel,S.p[sel]]);S.p[sel]=wi;S.moves++;sfx.set(L.words[wi].length);announce(`${L.words[wi]}をはめました`);
    if(S.p.every(v=>v>=0))solve();else sel=nextEmpty(sel);
    render();save();
  }
  function nextEmpty(from){for(let k=1;k<=L.slots.length;k++){const i=(from+k)%L.slots.length;if(S.p[i]<0)return i}return null}
  function deny(wi,msg){const b=chips[wi];b.classList.remove('no');void b.offsetWidth;b.classList.add('no');sfx.no();announce(msg);const t=$('kj-toast');t.textContent=msg;t.classList.add('show');clearTimeout(deny.t);deny.t=setTimeout(()=>t.classList.remove('show'),1600)}
  function solve(){S.solved=true;sel=null;const b=bests();if(b[S.level]==null||S.moves<b[S.level]){b[S.level]=S.moves;store.set(BEST_KEY,JSON.stringify(b))}sfx.done();announce(`組み上がりました。合言葉は「${L.pw}」です。`)}
  const live=$('kj-live');const announce=t=>{if(live)live.textContent=t};

  // ── マスの選択とキーボード ──
  function slotsAt(x,y){return L.slots.map((s,i)=>[s,i]).filter(([s])=>cellsOf(s).some(([a,b])=>a===x&&b===y)).map(([,i])=>i)}
  function choose(x,y){const opts=slotsAt(x,y);if(!opts.length)return;
    // 同じマスをもう一度押すと、縦と横を切り替える
    sel=opts.length>1&&opts.includes(sel)?opts[(opts.indexOf(sel)+1)%opts.length]:(opts.find(i=>S.p[i]<0&&!L.givens.includes(i))??opts[0]);
    focus(x,y);render()}
  function focus(x,y){cells.flat().forEach(c=>c&&(c.tabIndex=-1));const c=cells[y][x];c.tabIndex=0;c.focus({preventScroll:true});focusCell=[x,y]}
  gridEl.addEventListener('click',e=>{const c=e.target.closest('.kj-cell');if(!c||S.solved)return;choose(+c.dataset.x,+c.dataset.y)});
  gridEl.addEventListener('keydown',e=>{const c=e.target.closest('.kj-cell');if(!c)return;const x=+c.dataset.x,y=+c.dataset.y;
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(d){e.preventDefault();let nx=x+d[0],ny=y+d[1];while(nx>=0&&ny>=0&&nx<W()&&ny<H()){if(cells[ny][nx]){focus(nx,ny);return}nx+=d[0];ny+=d[1]}return}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(x,y);const first=trayEl.querySelector('.kj-chip.fit');if(first&&e.key==='Enter')first.focus()}
    if(e.key==='Escape'){sel=null;render()}});

  // ── 手ほどき（第一版） ──
  function coach(){const box=$('kj-coach');cells.flat().forEach(c=>c&&c.classList.remove('guide'));chips.forEach(b=>b&&b.classList.remove('guide'));
    if(!box)return;if(S.level!==1||S.solved){box.hidden=true;return}
    // 答えの言葉が一つしか入らない置き場（長さがほかと違う）から案内する
    const empty=L.slots.map((s,i)=>i).filter(i=>S.p[i]<0);
    const wrong=S.p.findIndex((w,si)=>w>=0&&L.words[w]!==L.words[si]);
    let text;
    if(wrong>=0){text='その活字は、ほかの場所に入りそうです。置いた活字をもう一度押すと外せます。';chips[S.p[wrong]].classList.add('guide')}
    else{const target=empty.sort((a,b)=>L.words.filter(w=>w.length===L.slots[a][3]).length-L.words.filter(w=>w.length===L.slots[b][3]).length)[0];
      if(target!=null){cellsOf(L.slots[target]).forEach(([x,y])=>cells[y][x].classList.add('guide'));
        if(sel===target)chips[target].classList.add('guide');
        const len=L.slots[target][3],same=L.words.filter(w=>w.length===len).length;
        text=S.moves===0&&sel==null?`はじめての版。光っているマスの並びをタップして選びましょう。${len}文字の活字は${same===1?'ひとつだけ':same+'つ'}です。`
          :sel===target?`下の活字から、${len}文字のものを選んではめましょう。交わるマスの文字が合うものだけが入ります。`
          :empty.length<=2?'あと少し。すべての列が埋まれば組み上がりです。':'次は光っている並びです。交わるマスの文字が手がかりになります。'}}
    box.textContent=text;box.hidden=false}

  // ── 面の切り替え・保存 ──
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,p:S.p,moves:S.moves,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];sel=null;
    const n=L.slots.length,ok=saved&&saved.level===level&&Array.isArray(saved.p)&&saved.p.length===n&&saved.p.every(v=>Number.isInteger(v)&&v>=-1&&v<n);
    S={level,p:ok?saved.p.slice():new Array(n).fill(-1),moves:ok?saved.moves|0:0,hist:[],solved:false};
    L.givens.forEach(si=>S.p[si]=si);
    // 保存から戻した置き方が食い違っていたら、空きに戻す
    const dup=new Set();S.p=S.p.map((w,si)=>{if(w<0)return w;if(dup.has(w)||L.words[w].length!==L.slots[si][3])return -1;dup.add(w);return w});
    if(ok&&saved.solved&&S.p.every(v=>v>=0))S.solved=true;
    $('kj-lv').textContent=editionName(level);$('kj-size').textContent=`${L.theme}・活字${n}`;
    build();render();save();
  }
  $('kj-undo').addEventListener('click',()=>{if(!S.hist.length||S.solved)return;const [si,prev]=S.hist.pop();S.p[si]=prev;S.moves++;sel=si;sfx.lift();render();save()});
  let armed=null;const resetBtn=$('kj-reset');
  resetBtn.addEventListener('click',()=>{
    if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.p=S.p.map((v,si)=>L.givens.includes(si)?v:-1);S.moves=0;S.hist=[];S.solved=false;sel=null;render();save()});
  $('kj-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null);const f=cells.flat().find(Boolean);if(f)f.focus({preventScroll:true})});
  const soundBtn=$('kj-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.set(2)});paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：組版台の上の活字 ──
  function drawArt(){const c=$('kj-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#2a2622');bg.addColorStop(1,'#141210');g.fillStyle=bg;g.fillRect(0,0,w,h);
    // 木の活字ケース（棚）
    g.strokeStyle='rgba(200,170,120,.18)';g.lineWidth=2;for(let i=1;i<6;i++){g.beginPath();g.moveTo(0,h*i/6);g.lineTo(w,h*i/6);g.stroke()}
    const lv=LEVELS[2]||LEVELS[0],cs=Math.min(w*.66/lv.rows[0].length,h*.56/lv.rows.length),ox=w/2-cs*lv.rows[0].length/2,oy=h*.52-cs*lv.rows.length/2;
    // 版（紙）
    g.fillStyle='#f3ead8';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=30;g.fillRect(ox-cs*.4,oy-cs*.4,cs*(lv.rows[0].length+.8),cs*(lv.rows.length+.8));g.shadowBlur=0;
    lv.rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='.')return;g.strokeStyle='rgba(30,26,22,.35)';g.lineWidth=1.5;g.strokeRect(ox+x*cs,oy+y*cs,cs,cs);
      g.fillStyle='#1b1714';g.font=`700 ${cs*.62}px 'Shippori Antique B1','Hiragino Mincho ProN',serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,ox+(x+.5)*cs,oy+(y+.55)*cs)}));
    lv.marks.forEach(([x,y])=>{g.strokeStyle='#c0392b';g.lineWidth=3;g.strokeRect(ox+x*cs+4,oy+y*cs+4,cs-8,cs-8)});
    // 鉛の活字の駒
    const pieces='ひらめき'.split('');pieces.forEach((ch,i)=>{const px=w*.1+i*cs*1.05,py=h*.08+cs*.4,pw=cs*.8;const lg=g.createLinearGradient(px,py,px+pw,py+pw);lg.addColorStop(0,'#c9c6c0');lg.addColorStop(1,'#77736c');g.fillStyle=lg;g.fillRect(px,py-pw/2,pw,pw);
      g.fillStyle='#2d2a26';g.font=`700 ${pw*.6}px 'Shippori Antique B1',serif`;g.save();g.translate(px+pw/2,py);g.scale(-1,1);g.fillText(ch,0,2);g.restore()});
    g.fillStyle='#c0392b';g.beginPath();g.arc(w*.88,h*.1+cs*.4,cs*.5,0,7);g.fill();g.fillStyle='#f3ead8';g.font=`700 ${cs*.46}px 'Shippori Antique B1',serif`;g.fillText('校',w*.88,h*.1+cs*.44)}
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Katsuji={label(){const going=S.moves||S.level>1;return {play:going?'つづきの版へ':'活字を組む',note:going?`${editionName(S.level)}・${S.moves}手から`:''}},levels:LEVELS.length};
})();
