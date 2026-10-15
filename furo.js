/* 封蝋：手がかりの印と二種類の一致数から、封印の並びを推理する。 */
(function(){
  'use strict';
  const LEVELS=window.FURO_LEVELS||[],KEY='furo-save-v1',BEST='furo-best',SOUND='furo-sound';
  const $=id=>document.getElementById(id),root=$('furo');
  if(!root||!LEVELS.length)return;
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const names=['月','星','花','鍵','波','葉','鳥'];
  const paths=[
    '<path d="M18 3A9 9 0 1 0 21 17 8 8 0 0 1 18 3Z"/>',
    '<path d="m12 2 3 7 7 .5-5.5 4.6 1.8 7-6.3-3.8-6.3 3.8 1.8-7L2 9.5 9 9Z"/>',
    '<path d="M12 8C5-3 0 10 8 12c-11 7 2 13 4 4 7 11 13-2 4-4 11-7-2-13-4-4Z"/><circle cx="12" cy="12" r="2"/>',
    '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-6-6 3-3m0 6 3-3"/>',
    '<path d="M2 7q5-6 10 0t10 0M2 12q5-6 10 0t10 0M2 17q5-6 10 0t10 0"/>',
    '<path d="M20 3C4 1 0 15 8 19c8 4 14-5 12-16ZM4 22 16 8"/>',
    '<path d="M3 15c5 1 6-5 9-6 3-2 6 0 6 3l4 1-4 2c-3 7-12 7-15 0Zm6 0 4-2"/><circle cx="16" cy="11" r=".6"/>'
  ];
  const symbol=(v,label=true)=>v<0?'<span class="fr-empty" aria-hidden="true">?</span>':`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[v]}</svg>${label?`<span>${names[v]}</span>`:''}`;
  const slots=$('fr-slots'),pad=$('fr-pad'),clues=$('fr-clues');
  let L,S,selected=0,armed=null,ac=null,soundOn=store.get(SOUND)!=='0';
  function tone(done=false){if(!soundOn)return;try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume().catch(()=>{});
    (done?[523,659,784]:[420]).forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.13;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.31)})}catch(e){}}
  function score(answer,guess){let exact=0,total=0;guess.forEach((v,i)=>{if(answer[i]===v)exact++;if(answer.includes(v))total++});return {exact,near:total-exact}}
  const complete=v=>v.every(x=>x>=0)&&new Set(v).size===L.size;
  const matches=v=>complete(v)&&L.clues.every(c=>{const r=score(v,c.guess);return r.exact===c.exact&&r.near===c.near});
  const valid=v=>Array.isArray(v)&&v.length===L.size&&v.every(x=>Number.isInteger(x)&&x>=-1&&x<L.symbols);
  function json(k){try{const v=JSON.parse(store.get(k));return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}}
  function save(){store.set(KEY,JSON.stringify({level:S.level,v:S.v,attempts:S.attempts,solved:S.solved}))}
  function say(t){$('fr-message').textContent=t}
  function disarm(){if(armed)clearTimeout(armed);armed=null;$('fr-reset').textContent='最初から'}
  function build(){
    root.querySelector('.fr-paper').style.setProperty('--clues',L.clues.length);
    clues.textContent='';
    L.clues.forEach((c,i)=>{const li=document.createElement('li');li.className='fr-clue';li.innerHTML=`<span class="fr-clue-no">${i+1}</span><div class="fr-sequence">${c.guess.map(v=>`<span class="fr-imprint">${symbol(v)}</span>`).join('')}</div><b>${c.exact}</b><b>${c.near}</b>`;
      li.setAttribute('aria-label',`手がかり${i+1}。${c.guess.map(v=>names[v]).join('、')}。場所も同じ${c.exact}個、場所ちがい${c.near}個`);clues.appendChild(li)});
    slots.textContent='';
    for(let i=0;i<L.size;i++){const b=document.createElement('button');b.type='button';b.className='fr-slot';b.dataset.slot=i;slots.appendChild(b)}
    pad.textContent='';pad.style.setProperty('--keys',L.symbols>5?4:L.symbols+1);
    for(let v=0;v<L.symbols;v++){const b=document.createElement('button');b.type='button';b.className='fr-key';b.dataset.value=v;b.innerHTML=symbol(v);b.setAttribute('aria-label',`${names[v]}を押す（${v+1}キー）`);pad.appendChild(b)}
    const erase=document.createElement('button');erase.type='button';erase.className='fr-key fr-erase';erase.dataset.value=-1;erase.textContent='消す';pad.appendChild(erase);
  }
  function render(){
    [...slots.children].forEach((b,i)=>{b.innerHTML=symbol(S.v[i]);b.classList.toggle('selected',i===selected);b.disabled=S.solved;b.tabIndex=i===selected?0:-1;b.setAttribute('aria-pressed',String(i===selected));b.setAttribute('aria-label',`${i+1}番目の印：${S.v[i]<0?'空欄':names[S.v[i]]}`)});
    [...pad.children].forEach(b=>{b.disabled=S.solved;b.classList.toggle('in-use',+b.dataset.value>=0&&S.v.includes(+b.dataset.value));b.classList.remove('guide')});
    $('fr-attempts').textContent=S.attempts;$('fr-undo').disabled=!S.history.length||S.solved;$('fr-reset').disabled=S.solved;$('fr-check').disabled=S.solved;
    $('fr-done').classList.toggle('show',S.solved);root.classList.toggle('fr-opened',S.solved);
    const coach=$('fr-coach');coach.hidden=S.level!==1||S.solved;
    if(!coach.hidden){if(S.v.every(v=>v<0)){coach.textContent='手がかりの数は、答えとの一致数。まず左の封印に「月」を押してみましょう。';pad.children[0].classList.add('guide')}
      else coach.textContent='「場所も同じ」と「場所ちがい」は別々の数。すべての手がかりに合う並びで封が開きます。'}
    if(S.solved){const best=(json(BEST)||{})[S.level];$('fr-done-note').textContent=`${S.attempts}回で開封${Number.isInteger(best)&&best<S.attempts?`・ベスト${best}回`:''}`;$('fr-next').textContent=S.level===LEVELS.length?'最初の手紙へ':'次の手紙へ'}
  }
  function select(i,focus=false){selected=i;render();if(focus)slots.children[i].focus({preventScroll:true})}
  function put(v){if(S.solved||S.v[selected]===v)return;disarm();S.history.push({v:S.v.slice(),selected});if(S.history.length>100)S.history.shift();S.v[selected]=v;
    say(v<0?'印を消しました':`${selected+1}番目に${names[v]}を押しました`);tone();render();save()}
  function check(){if(S.solved)return;
    if(S.v.some(v=>v<0)){say('空いている封印にも印を押しましょう。');select(S.v.indexOf(-1),true);return}
    if(new Set(S.v).size!==L.size){say('同じ印は一度だけ。重なっている印を変えましょう。');return}
    S.attempts++;const bad=L.clues.findIndex(c=>{const r=score(S.v,c.guess);return r.exact!==c.exact||r.near!==c.near});
    if(bad>=0){say(`手がかり${bad+1}の数と合いません。並びを見直しましょう。`);tone()}
    else{S.solved=true;const b=json(BEST)||{};if(!Number.isInteger(b[S.level])||S.attempts<b[S.level]){b[S.level]=S.attempts;store.set(BEST,JSON.stringify(b))}say('すべての手がかりがつながり、封が開きました。');tone(true)}
    render();save();if(S.solved)$('fr-next').focus({preventScroll:true})}
  function start(level,saved){disarm();level=Number.isInteger(level)?Math.max(1,Math.min(LEVELS.length,level)):1;L=LEVELS[level-1];selected=0;
    const ok=saved&&saved.level===level&&valid(saved.v);S={level,v:ok?saved.v.slice():Array(L.size).fill(-1),attempts:ok&&Number.isSafeInteger(saved.attempts)&&saved.attempts>=0?saved.attempts:0,solved:false,history:[]};S.solved=!!(ok&&saved.solved===true&&matches(S.v));
    $('fr-lv').textContent=`第${level}通・${L.title}`;$('fr-size').textContent=`${L.size}つの印／全${LEVELS.length}通`;
    say('同じ印は一度だけ。左から順に並べます。');build();render();save()}
  slots.addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)select(+b.dataset.slot,true)});
  pad.addEventListener('click',e=>{const b=e.target.closest('[data-value]');if(b)put(+b.dataset.value)});
  // ショートカットはゲームの入力欄内だけ。ダイアログや庭のキー操作を奪わない。
  $('fr-entry').addEventListener('keydown',e=>{if(S.solved)return;let handled=true;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')select((selected+(e.key==='ArrowLeft'?-1:1)+L.size)%L.size,true);
    else if(/^[1-7]$/.test(e.key)&&+e.key<=L.symbols)put(+e.key-1);
    else if(e.key==='Backspace'||e.key==='Delete')put(-1);
    else handled=false;if(handled)e.preventDefault()});
  $('fr-check').addEventListener('click',check);
  $('fr-undo').addEventListener('click',()=>{if(S.solved||!S.history.length)return;disarm();const h=S.history.pop();S.v=h.v;selected=h.selected;say('一手戻しました。');render();save()});
  $('fr-reset').addEventListener('click',()=>{if(S.solved)return;if(!armed){$('fr-reset').textContent='戻してよい？';armed=setTimeout(disarm,2600);return}start(S.level,null)});
  $('fr-next').addEventListener('click',()=>{start(S.level===LEVELS.length?1:S.level+1,null);slots.children[0].focus({preventScroll:true})});
  const sound=$('fr-sound');function paintSound(){sound.textContent=soundOn?'音あり':'音なし';sound.setAttribute('aria-pressed',String(soundOn))}
  sound.addEventListener('click',()=>{soundOn=!soundOn;store.set(SOUND,soundOn?'1':'0');paintSound();if(soundOn)tone()});paintSound();
  const saved=json(KEY);start(saved?saved.level:1,saved);
  window.Furo={levels:LEVELS.length,label(){const going=S.level>1||S.v.some(v=>v>=0);return {play:going?'つづきの手紙へ':'手紙をひらく',note:going?`第${S.level}通・${S.solved?'開封済み':'推理の途中'}`:''}}};
})();
