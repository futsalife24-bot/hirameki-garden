/* 彩窓。境界を切る／つなぐ操作だけで区画を組み立てる。色は区画の装飾。 */
(()=>{'use strict';
 const $=id=>document.getElementById(id),root=$('saimado');if(!root)return;
 const C=SaimadoCore,L=SAIMADO_LEVELS,store=HiramekiStorage,KEY='saimado-save-v1',BEST='saimado-best',SOUND='saimado-sound';
 let S,best={},history=[],hint=null,stage=0,sound=true,ac;
 const get=k=>{try{return store.get(k)}catch{return null}};
 try{const saved=JSON.parse(get(BEST));if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const [k,v]of Object.entries(saved))if(/^[1-9]\d*$/.test(k)&&+k<=L.length&&Number.isInteger(v)&&v>=0&&v<=2147483647)best[k]=v;sound=get(SOUND)!=='0'}catch{}
 const level=()=>L[S.level-1],say=t=>{$('sm-live').textContent=t};
 function tone(done){if(!sound)return;try{ac||=new(window.AudioContext||window.webkitAudioContext)();ac.resume();(done?[0,4,7]:[0]).forEach((n,i)=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.12;o.type='sine';o.frequency.value=523.25*2**(n/12);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.035,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.55)})}catch{}}
 function save(){try{store.set(KEY,JSON.stringify(S));store.set(BEST,JSON.stringify(best));$('sm-save-warning').hidden=true}catch{$('sm-save-warning').hidden=false;say('保存できません。画面を閉じずに保存先を確認してください。')}}
 function read(){try{const s=JSON.parse(get(KEY));if(!s||!Number.isInteger(s.level)||s.level<1||s.level>L.length||!Number.isInteger(s.moves)||s.moves<0||s.moves>2147483647||typeof s.solved!=='boolean'||typeof s.hinted!=='boolean'||!Array.isArray(s.cuts)||s.cuts.length!==C.edges(L[s.level-1]).length||!s.cuts.every(x=>x===0||x===1))return null;return {...s,solved:C.check(L[s.level-1],s.cuts).solved}}catch{return null}}
 const pos=i=>`${Math.floor(i/level().w)+1}行${i%level().w+1}列`;
 function resize(){const box=$('sm-space').getBoundingClientRect();if(!box.width||!box.height)return;const p=level(),cell=Math.floor(Math.min((box.width-20)/p.w,(box.height-20)/p.h,100));$('sm-board').style.cssText=`--cell:${cell}px;--hit:${Math.min(44,Math.floor(cell*.67))}px;width:${p.w*cell}px;height:${p.h*cell}px`;}
 function render(focusEdge){
  const p=level(),check=C.check(p,S.cuts),owner=[];check.regions.forEach((r,n)=>r.forEach(i=>owner[i]=n));
  const board=$('sm-board');board.replaceChildren();board.setAttribute('aria-label',`窓の境界。${p.lights.map(c=>`${pos(c.at)}の数字${c.size}`).join('、')}。${p.pairs.map((r,i)=>`${['菱','星'][i]}の対は${r.map(pos).join('と')}`).join('。')}。${p.rects.map(i=>`${pos(i)}に長方形の印`).join('。')}`);
  for(let i=0;i<p.w*p.h;i++){
   const tile=document.createElement('div');tile.className='sm-glass';tile.style.cssText=`left:calc(var(--cell)*${i%p.w});top:calc(var(--cell)*${Math.floor(i/p.w)});--tint:${owner[i]%6}`;
   tile.dataset.tone=String(owner[i]%6);const light=p.lights.find(c=>c.at===i),pair=(p.pairs||[]).findIndex(a=>a.includes(i)),rect=p.rects.includes(i);
   if(light){const n=document.createElement('strong');n.textContent=String(light.size);tile.append(n)}
   if(pair>=0){const mark=document.createElement('span');mark.className='sm-mark';mark.textContent=['◆','✦'][pair];tile.append(mark)}
   if(rect){const mark=document.createElement('span');mark.className='sm-rect';mark.textContent='□';tile.append(mark)}
   tile.setAttribute('aria-hidden','true');board.append(tile);
  }
  const tutorial=S.level===1&&!S.solved&&!hint?[0,1].find(i=>!S.cuts[i]):-1;
  C.edges(p).forEach(([a,b],i)=>{const vertical=b===a+1,button=document.createElement('button');button.type='button';button.className='sm-edge'+(S.cuts[i]?' cut':'')+(hint?.edge===i&&stage>=2?' suggested':'')+(tutorial===i?' tutorial':'');button.dataset.edge=i;button.style.cssText=`left:calc(var(--cell)*${a%p.w+(vertical?1:.5)});top:calc(var(--cell)*${Math.floor(a/p.w)+(vertical?.5:1)})`;button.dataset.direction=vertical?'v':'h';button.setAttribute('aria-pressed',String(!!S.cuts[i]));button.setAttribute('aria-label',`${pos(a)}と${pos(b)}の境界：${S.cuts[i]?'切断中。つなぐ':'接続中。切る'}`);button.disabled=S.solved;button.onclick=()=>move(i);board.append(button)});
  $('sm-title').textContent=`彩窓 ─ ${S.level} / ${L.length}`;$('sm-caption').textContent=p.name;$('sm-moves').textContent=`${S.moves}手`;$('sm-undo').disabled=!history.length;
  $('sm-next').hidden=!S.solved;$('sm-hint').disabled=S.solved;$('sm-done').hidden=!S.solved;$('sm-moves').hidden=S.solved;
  $('sm-done').textContent=`窓ができました · ${S.moves}手${S.hinted?' · ヒントあり':''}`;
  if(!hint)$('sm-coach').textContent=S.level===1&&!S.solved?'「1」の光は一枚だけ。隣の二辺を切ってみましょう。':'';
  $('sm-reset').textContent='やり直す';resize();if(focusEdge!==undefined)board.querySelector(`[data-edge="${focusEdge}"]`)?.focus({preventScroll:true});
 }
 function move(i){if(S.solved)return;history.push(JSON.stringify(S));if(history.length>250)history.shift();S.cuts[i]^=1;S.moves++;hint=null;stage=0;S.solved=C.check(level(),S.cuts).solved;if(S.solved){best[S.level]=Math.min(best[S.level]??Infinity,S.moves);say('窓が完成しました。');tone(true)}else tone(false);render(i);save();}
 function start(n,saved){S=saved||{level:n,cuts:C.edges(L[n-1]).map(()=>0),moves:0,solved:false,hinted:false};history=[];hint=null;stage=0;render();save()}
 $('sm-undo').onclick=()=>{if(!history.length)return;S=JSON.parse(history.pop());hint=null;stage=0;render();save();say('一手戻しました。')};
 $('sm-reset').onclick=()=>{if(!confirm('この窓を最初からやり直しますか？ 自己ベストは残ります。'))return;start(S.level)};
 $('sm-next').onclick=()=>start(S.level%L.length+1);
 $('sm-hint').onclick=()=>{hint||=C.hint(level(),S.cuts);if(!hint)return;stage=Math.min(3,stage+1);S.hinted=true;const p=level(),rule=p.rects.length?'□を含む区画は長方形。':p.pairs.length?'同じ印は同じ区画。':'区画には数字を一つ、枚数はその数字と同じ。';$('sm-coach').textContent=stage===1?`${rule} 残りの区画の形も合わせて考えましょう。`:stage===2?`${pos(hint.cells[0])}と${pos(hint.cells[1])}の間を考えましょう。すべての条件から境界が決まります。`:`ここは「${hint.cut?'切る':'つなぐ'}」。全条件を満たす区画分けでは、この二枚は${hint.cut?'別々の区画':'同じ区画'}です。`;const message=$('sm-coach').textContent;render();$('sm-coach').textContent=message;save();};
 const paintSound=()=>{$('sm-sound').textContent=sound?'音あり':'音なし';$('sm-sound').setAttribute('aria-pressed',String(sound))};
 $('sm-sound').onclick=()=>{sound=!sound;paintSound();try{store.set(SOUND,sound?'1':'0')}catch{say('音設定を保存できません。')}tone(false)};
 $('sm-board').addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;const buttons=[...$('sm-board').querySelectorAll('button')],i=buttons.indexOf(document.activeElement),d=e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1;e.preventDefault();buttons[(i+d+buttons.length)%buttons.length]?.focus()});
 window.Saimado={resize,label(){return {play:S.moves||S.level>1?'つづきの窓へ':'窓を仕立てる',note:S.moves||S.level>1?`第${S.level}の窓・${S.moves}手から`:''}}};
 start(1,read());paintSound();new ResizeObserver(resize).observe($('sm-space'));addEventListener('resize',resize);
})();
