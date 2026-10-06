/* 染め分け：ガラス瓶の染料を注ぎ分け、どの瓶も一色にそろえるパズル。
   瓶を選んでから注ぐ先の瓶を選ぶ。注げるのは、注ぐ先が空か、いちばん上が同じ色のときだけ（同じ色はまとめて入るだけ注ぐ）。
   色の見分けが難しくても遊べるよう、どの染料にも模様の印をつける。
   問題は tools/somewake-gen.cjs が作った somewake-levels.js（最短手数つき、すべて解けることを確認済み）。 */
(function(){
  const LEVELS=window.SOMEWAKE_LEVELS||[];
  const KEY='somewake-save-v1',BEST_KEY='somewake-best',SOUND_KEY='somewake-sound',CAP=4;
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const $=id=>document.getElementById(id);
  const root=$('somewake');if(!root||!LEVELS.length)return;
  const rack=$('sw-rack');
  // 植物染料の色と名前、模様の印
  const DYES={A:['藍','#2b4c9b','●'],B:['茜','#c0392b','▲'],C:['刈安','#e2b53a','■'],D:['若竹','#3f9a5f','◆'],E:['紫根','#7b4aa0','★'],F:['墨','#3b3b3b','✚'],
    G:['桜','#ec9bb5','❤'],H:['柿渋','#c9682e','◐'],I:['浅葱','#2fa3b5','≋'],J:['胡桃','#8a5a3c','✿'],K:['萌黄','#a8c94a','▼'],L:['銀鼠','#9aa0a6','◯']};
  const KANJI=['〇','一','二','三','四','五','六','七','八','九','十'];
  const kanji=n=>n<=10?KANJI[n]:n<20?'十'+KANJI[n-10]:KANJI[Math.floor(n/10)]+'十'+(n%10?KANJI[n%10]:'');
  const vatName=l=>`${kanji(l)}の甕`;
  let L=null,S=null,pick=null;

  // ── 音（Web Audioで合成。とくとくと注ぐ音） ──
  let ac=null,soundOn=store.get(SOUND_KEY)!=='0';
  function blip(f,t,dur,vol){if(!soundOn)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A()}if(ac.state==='suspended')ac.resume();
    const s=ac.currentTime+t,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(f,s);o.frequency.exponentialRampToValueAtTime(f*1.35,s+dur);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(vol,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+dur);o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+dur+.05)}catch(e){}}
  const sfx={pour(n,h){for(let i=0;i<n;i++)blip(380+(h+i)*70,i*.09,.12,.06)},lift(){blip(600,0,.06,.03)},no(){blip(200,0,.15,.05)},done(){[0,4,7,12,16].forEach((s,k)=>blip(523*Math.pow(2,s/12),k*.1,.4,.05))}};

  // ── 規則 ──
  const topOf=b=>b[b.length-1];
  function runOf(b){if(!b.length)return 0;let n=0;for(let i=b.length-1;i>=0&&b[i]===topOf(b);i--)n++;return n}
  function canPour(a,b){const A=S.b[a],B=S.b[b];return a!==b&&A.length>0&&B.length<CAP&&(!B.length||topOf(B)===topOf(A))}
  const full=b=>b.length===CAP&&[...b].every(c=>c===b[0]);
  const isSolved=()=>S.b.every(b=>!b.length||full(b));

  // ── 描画 ──
  function build(){rack.textContent='';const n=L.bottles.length,cols=n>7?Math.ceil(n/2):n;
    // 瓶が8本以上なら二段の棚に並べる
    [rack,$('sw-shelf')].forEach(e=>{e.style.setProperty('--n',n);e.style.setProperty('--cols',cols);e.style.setProperty('--rows',Math.ceil(n/cols))});
    L.bottles.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='sw-bottle';b.dataset.i=i;
      b.innerHTML='<span class="sw-glass"><span class="sw-liquid"></span></span>';rack.appendChild(b)})}
  function render(){
    [...rack.children].forEach((el,i)=>{const b=S.b[i],liq=el.querySelector('.sw-liquid');liq.textContent='';
      [...b].forEach((c,k)=>{const d=document.createElement('i');d.style.background=DYES[c][1];d.textContent=DYES[c][2];if('CGKL'.includes(c))d.className='sw-pale';d.style.setProperty('--k',k);liq.appendChild(d)});
      el.classList.toggle('lift',pick===i);el.classList.toggle('full',full(b));el.classList.toggle('can',pick!=null&&pick!==i&&canPour(pick,i));
      el.disabled=S.solved;el.setAttribute('aria-label',`瓶${i+1}：${b.length?[...b].reverse().map(c=>DYES[c][0]).join('、')+'（上から）':'空'}${full(b)?'・そろった':''}${pick===i?'・選択中':''}`)});
    $('sw-moves').textContent=S.moves;$('sw-min').textContent=L.min;$('sw-undo').disabled=!S.hist.length||S.solved;$('sw-reset').disabled=S.solved;
    $('sw-done').classList.toggle('show',S.solved);rack.classList.toggle('solved',S.solved);
    if(S.solved){const b=bests()[S.level];$('sw-done-note').textContent=`${S.moves}手`+(S.moves===L.min?'・最短で染め分けました':`・最短は${L.min}手`)+(b!=null&&b<S.moves?`・ベスト ${b}手`:'')}
    coach();
  }

  // ── 操作 ──
  function tap(i){
    if(S.solved)return;
    if(pick==null){if(!S.b[i].length){announce('空の瓶です');return}pick=i;sfx.lift();render();return}
    if(pick===i){pick=null;render();return}
    if(!canPour(pick,i)){const el=rack.children[i];el.classList.remove('no');void el.offsetWidth;el.classList.add('no');sfx.no();
      announce(S.b[i].length>=CAP?'その瓶はいっぱいです':'いちばん上の色が違います');if(S.b[i].length){pick=i;render()}return}
    const A=S.b[pick],B=S.b[i],n=Math.min(runOf(A),CAP-B.length),c=topOf(A);
    S.hist.push(S.b.slice());S.b[pick]=A.slice(0,A.length-n);S.b[i]=B+c.repeat(n);S.moves++;sfx.pour(n,B.length);
    announce(`${DYES[c][0]}を${n}つ注ぎました`);const from=pick;pick=null;
    const el=rack.children[from];el.classList.remove('pour');void el.offsetWidth;el.classList.add('pour');
    if(isSolved()){S.solved=true;const b=bests();if(b[S.level]==null||S.moves<b[S.level]){b[S.level]=S.moves;store.set(BEST_KEY,JSON.stringify(b))}setTimeout(()=>sfx.done(),250);announce('すべての瓶がそろいました')}
    render();save();
  }
  rack.addEventListener('click',e=>{const b=e.target.closest('.sw-bottle');if(b)tap(+b.dataset.i)});
  rack.addEventListener('keydown',e=>{const b=e.target.closest('.sw-bottle');if(!b)return;const i=+b.dataset.i;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=rack.children.length,j=(i+(e.key==='ArrowRight'?1:-1)+n)%n;rack.children[j].focus()}
    if(e.key==='Escape'&&pick!=null){pick=null;render()}});
  const live=$('sw-live');const announce=t=>{if(live)live.textContent=t};

  // ── 手ほどき（一の甕）：最短手順の上にいるあいだ、注ぐ瓶と注ぐ先を光らせる ──
  function coach(){const box=$('sw-coach');[...rack.children].forEach(e=>e.classList.remove('guide'));if(!box)return;if(S.level!==1||S.solved){box.hidden=true;return}
    const seq=[L.bottles.slice()];L.path.forEach(([a,b])=>{const s=seq[seq.length-1].slice(),A=s[a],B=s[b],n=Math.min(runOf(A),CAP-B.length);s[b]=B+topOf(A).repeat(n);s[a]=A.slice(0,A.length-n);seq.push(s)});
    const k=seq.findIndex(s=>s.every((v,j)=>v===S.b[j]));
    if(k>=0&&k<L.path.length){const [a,b]=L.path[k];rack.children[pick===a?b:a].classList.add('guide');
      box.textContent=pick===a?'注ぐ先の、光っている瓶を選びましょう。いちばん上が同じ色か、空の瓶にだけ注げます。'
        :k===0?'はじめての甕。光っている瓶をタップして持ち上げ、それから注ぐ先の瓶をタップします。':'その調子。どの瓶も一色になれば染め分けの完成です。'}
    else box.textContent='手順から外れました。「一手戻す」か「最初から」で、光る案内に戻れます。';
    box.hidden=false}

  // ── 面・保存 ──
  function bests(){try{return JSON.parse(store.get(BEST_KEY)||'{}')}catch(e){return{}}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,b:S.b,moves:S.moves,solved:S.solved}))}
  function load(){try{const r=store.get(KEY);return r?JSON.parse(r):null}catch(e){return null}}
  // 保存された中身が、その面の色の数と合っているか
  function valid(b){if(!Array.isArray(b)||b.length!==L.bottles.length||b.some(v=>typeof v!=='string'||v.length>CAP))return false;const cnt=s=>[...s.join('')].sort().join('');return cnt(b)===cnt(L.bottles)}
  function start(level,saved){
    level=Math.max(1,Math.min(LEVELS.length,level|0||1));L=LEVELS[level-1];pick=null;
    const ok=saved&&saved.level===level&&valid(saved.b);
    S={level,b:ok?saved.b.slice():L.bottles.slice(),moves:ok?saved.moves|0:0,hist:[],solved:false};if(ok&&isSolved())S.solved=true;
    const colors=new Set(L.bottles.join(''));$('sw-lv').textContent=vatName(level);$('sw-size').textContent=`染料${colors.size}色・瓶${L.bottles.length}`;
    build();render();save();
  }
  $('sw-undo').addEventListener('click',()=>{if(!S.hist.length||S.solved)return;S.b=S.hist.pop();S.moves=Math.max(0,S.moves-1);pick=null;sfx.lift();render();save()});
  let armed=null;const resetBtn=$('sw-reset');
  resetBtn.addEventListener('click',()=>{if(!armed){resetBtn.textContent='もう一度押すと戻ります';armed=setTimeout(()=>{armed=null;resetBtn.textContent='最初から'},2600);return}
    clearTimeout(armed);armed=null;resetBtn.textContent='最初から';S.b=L.bottles.slice();S.moves=0;S.hist=[];pick=null;render();save()});
  $('sw-next').addEventListener('click',()=>{start(S.level>=LEVELS.length?1:S.level+1,null);rack.children[0].focus({preventScroll:true})});
  const soundBtn=$('sw-sound');const paintSound=()=>{soundBtn.textContent=soundOn?'音あり':'音なし';soundBtn.setAttribute('aria-pressed',String(soundOn))};
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND_KEY,soundOn?'1':'0');paintSound();if(soundOn)sfx.pour(1,0)});paintSound();

  const saved=load();start(saved&&saved.level?saved.level:1,saved);

  // ── 庭の遊び帖の絵：染め場の棚と瓶、干した布 ──
  function drawArt(){const c=$('sw-art');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
    g.fillStyle='#1d3157';g.fillRect(0,0,w,h);
    // 絞りの白い点
    g.fillStyle='rgba(255,255,255,.16)';for(let y=20;y<h;y+=46)for(let x=(y/46%2)*23+12;x<w;x+=46){g.beginPath();g.arc(x,y,5,0,7);g.fill()}
    // 干した布（藍・茜・刈安）
    [['#2b4c9b',.08],['#c0392b',.3],['#e2b53a',.52],['#3f9a5f',.74]].forEach(([col,x])=>{g.fillStyle=col;g.beginPath();g.moveTo(w*x,h*.06);g.lineTo(w*(x+.17),h*.06);g.quadraticCurveTo(w*(x+.15),h*.3,w*(x+.17),h*.42);g.lineTo(w*x,h*.42);g.quadraticCurveTo(w*(x+.02),h*.25,w*x,h*.06);g.fill()});
    g.strokeStyle='#c8a46a';g.lineWidth=6;g.beginPath();g.moveTo(0,h*.06);g.lineTo(w,h*.06);g.stroke();
    // 棚と瓶
    g.fillStyle='#8a5a3c';g.fillRect(w*.06,h*.86,w*.88,h*.035);
    const set=['ABCA','BCAB','CABC','',''];set.forEach((b,i)=>{const x=w*(.14+i*.17),bw=w*.1,bh=h*.34,y=h*.86-bh;
      g.save();g.beginPath();g.roundRect(x,y,bw,bh,[8,8,18,18]);g.clip();g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,y,bw,bh);
      [...b].forEach((col,k)=>{g.fillStyle=DYES[col][1];g.fillRect(x,y+bh-(k+1)*bh*.22,bw,bh*.22)});g.restore();
      g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=3;g.beginPath();g.roundRect(x,y,bw,bh,[8,8,18,18]);g.stroke();
      g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+bw*.14,y+10,bw*.1,bh*.7)})}
  drawArt();if(document.fonts)document.fonts.ready.then(drawArt);

  window.Somewake={label(){const going=S.moves||S.level>1;return {play:going?'つづきの甕へ':'染めはじめる',note:going?`${vatName(S.level)}・${S.moves}手から`:''}},levels:LEVELS.length};
})();
