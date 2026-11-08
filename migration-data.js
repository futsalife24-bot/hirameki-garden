/* 引継ぎ専用。対象キー以外の保存領域には触れない。 */
(function(root){
  'use strict';
  const worlds=['kintsugi','hoshizu','kagee','katsuji','chomen','himitsu','somewake','sangaku'];
  const keys=['hirameki-world',...worlds.flatMap(w=>[w+'-save-v1',w+'-best',w+'-sound'])];
  const extraKeys=['saimado-save-v1','saimado-best','saimado-sound','kakuree-save-v1','kakuree-sound'],allKeys=[...keys,...extraKeys];
  const capsule='hirameki-import-v1';
  const fail=()=>{throw Error('対応していない形式、作品、または不正な値です。保存内容は変更していません。')};
  const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const exact=(x,names)=>{if(!obj(x)||Object.keys(x).sort().join()!==names.slice().sort().join())fail()};
  const int=(x,min=0,max=2147483647)=>Number.isInteger(x)&&x>=min&&x<=max;
  const arr=(x,n,fn)=>Array.isArray(x)&&x.length===n&&x.every(fn);
  function state(w,s){
    const fields={kintsugi:['rots','locks','moves','hist'],hoshizu:['b','moves'],kagee:['R','moves'],katsuji:['p','moves'],chomen:['done','miss'],himitsu:['pos','moves'],somewake:['b','moves'],sangaku:['v','fix']};
    exact(s,['level','solved',...fields[w]]);
    const levels=root[w.toUpperCase()+'_LEVELS'];
    const max=w==='kintsugi'?1000000:w==='kagee'?20:levels.length;
    if(!int(s.level,1,max)||typeof s.solved!=='boolean'||!int(s.moves??s.miss??s.fix))fail();
    const l=levels&&levels[s.level-1];
    if(w==='kintsugi'){
      const n=(s.level<=3?4:s.level<=7?5:s.level<=14?6:7)**2;
      if(!arr(s.rots,n,x=>int(x))||!arr(s.locks,n,x=>x===0||x===1)||!Array.isArray(s.hist)||s.hist.length>500||!s.hist.every(x=>int(x,0,n-1)))fail();
    }
    if(w==='chomen'&&!arr(s.done,l.entries.length,x=>typeof x==='boolean'))fail();
    if(w==='sangaku'&&!arr(s.v,l.n*l.n,x=>int(x,0,l.n)))fail();
    if(w==='kagee'){
      if(!arr(s.R,3,r=>arr(r,3,x=>Number.isFinite(x)&&Math.abs(x)<=1.00001)))fail();
      for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(s.R[i].reduce((a,x,k)=>a+x*s.R[j][k],0)-(i===j?1:0))>.001)fail();
      // 反射は直交行列でも回転ではないため、行列式 +1 を確認する。
      const [a,b,c]=s.R;
      const det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
      if(Math.abs(det-1)>.001)fail();
    }
    if(w==='katsuji'){
      if(!arr(s.p,l.slots.length,x=>int(x,-1,l.words.length-1)))fail();
      const used=s.p.filter(x=>x>=0);if(new Set(used).size!==used.length)fail();
      s.p.forEach((x,i)=>{if(x>=0&&l.words[x].length!==l.slots[i][3])fail()});
    }
    if(w==='somewake'){
      if(!arr(s.b,l.bottles.length,x=>typeof x==='string'&&/^[A-L]{0,4}$/.test(x))||[...s.b.join('')].sort().join()!==[...l.bottles.join('')].sort().join())fail();
    }
    if(w==='himitsu'){
      if(!arr(s.pos,l.pieces.length,p=>arr(p,2,x=>int(x,0,100))))fail();
      const used=new Set();s.pos.forEach(([x,y],i)=>{const [,,a,b]=l.pieces[i];if(x+a>l.W||y+b>l.H)fail();for(let u=x;u<x+a;u++)for(let v=y;v<y+b;v++){const k=u+','+v;if(used.has(k))fail();used.add(k)}});
    }
    if(w==='hoshizu'){
      if(!obj(s.b))fail();
      for(const [k,v] of Object.entries(s.b)){
        if(!/^(0|[1-9]\d*)-(0|[1-9]\d*)$/.test(k)||(v!==1&&v!==2))fail();
        const [a,b]=k.split('-').map(Number),A=l.stars[a],B=l.stars[b];
        if(!A||!B||a>=b||!(A[0]===B[0]||A[1]===B[1]))fail();
        if(l.stars.some((C,i)=>i!==a&&i!==b&&((A[0]===B[0]&&C[0]===A[0]&&C[1]>Math.min(A[1],B[1])&&C[1]<Math.max(A[1],B[1]))||(A[1]===B[1]&&C[1]===A[1]&&C[0]>Math.min(A[0],B[0])&&C[0]<Math.max(A[0],B[0])))))fail();
      }
    }
  }
  function validate(b){
    exact(b,['app','version','createdAt','data']);
    if(b.app!=='hirameki-garden'||![1,2].includes(b.version)||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt)))fail();
    const target=b.version===1?keys:allKeys;exact(b.data,target);
    for(const k of target){const v=b.data[k];if(v===null)continue;if(typeof v!=='string'||v.length>1000000)fail();
      if(k==='hirameki-world'){if(![...worlds,...(b.version===2?['saimado']:[])].includes(v))fail();continue}
      if(k.endsWith('-sound')){if(v!=='0'&&v!=='1')fail();continue}
      if(extraKeys.includes(k)){extra(k,v);continue}
      const w=k.split('-')[0];let s;try{s=JSON.parse(v)}catch(e){fail()}
      if(k.endsWith('-best')){if(!obj(s))fail();const max=w==='kintsugi'?1000000:w==='kagee'?20:root[w.toUpperCase()+'_LEVELS'].length;for(const [n,x]of Object.entries(s))if(!/^[1-9]\d*$/.test(n)||!int(+n,1,max)||!int(x))fail()}
      else state(w,s);
    }
    return b;
  }
  function extra(k,v){
    let s;try{s=JSON.parse(v)}catch{fail()}
    if(k==='saimado-best'){if(!obj(s))fail();for(const [n,x]of Object.entries(s))if(!/^[1-9]\d*$/.test(n)||!int(+n,1,root.SAIMADO_LEVELS.length)||!int(x))fail();return}
    if(k==='saimado-save-v1'){
      exact(s,['level','cuts','moves','solved','hinted']);if(!int(s.level,1,root.SAIMADO_LEVELS.length)||!int(s.moves)||typeof s.solved!=='boolean'||typeof s.hinted!=='boolean')fail();
      const p=root.SAIMADO_LEVELS[s.level-1];if(!arr(s.cuts,root.SaimadoCore.edges(p).length,x=>x===0||x===1)||s.solved!==root.SaimadoCore.check(p,s.cuts).solved)fail();return;
    }
    exact(s,['level','yaw','pitch','moves','solved','hint','best']);
    if(!int(s.level,1,12)||!Number.isFinite(s.yaw)||Math.abs(s.yaw)>Math.PI||!Number.isFinite(s.pitch)||Math.abs(s.pitch)>1.35||!int(s.moves)||typeof s.solved!=='boolean'||typeof s.hint!=='boolean'||!obj(s.best))fail();
    for(const [n,x]of Object.entries(s.best))if(!/^[1-9]\d*$/.test(n)||!int(+n,1,12)||!int(x))fail();
    if(s.solved&&(Math.min(Math.abs(s.yaw),Math.abs(Math.PI-Math.abs(s.yaw)))>=.075||Math.abs(s.pitch)>=.075))fail();
  }
  function api(storage){
    let seen=storage.getItem(capsule);
    function active(){const raw=storage.getItem(capsule);return raw===null?null:JSON.parse(raw).data}
    function get(k){if(!allKeys.includes(k))fail();const a=active();return a&&Object.hasOwn(a,k)?a[k]:storage.getItem(k)}
    function pack(data){const extended=extraKeys.some(k=>data[k]!=null)||data['hirameki-world']==='saimado';return {app:'hirameki-garden',version:extended?2:1,createdAt:new Date().toISOString(),data:Object.fromEntries((extended?allKeys:keys).map(k=>[k,data[k]??null]))}}
    function snapshot(){return validate(pack(Object.fromEntries(allKeys.map(k=>[k,get(k)]))))}
    return {get,set(k,v){if(!allKeys.includes(k))fail();if(storage.getItem(capsule)!==seen)throw Error('別の画面で保存が更新されました。再読込みしてください。');const a=active();if(a){const b=pack({...Object.fromEntries(allKeys.map(n=>[n,get(n)])),[k]:v});const next=JSON.stringify(b);storage.setItem(capsule,next);seen=next}else storage.setItem(k,v)},snapshot,
      import(b){validate(b);const merged=b.version===1&&extraKeys.some(k=>get(k)!==null)?{...pack({...Object.fromEntries(extraKeys.map(k=>[k,get(k)])),...b.data}),createdAt:b.createdAt}:b;const safe=JSON.stringify(validate(merged));storage.setItem(capsule,safe);seen=safe},
      current(){return JSON.stringify(snapshot().data)}};
  }
  root.HiramekiBackup={keys,extraKeys,allKeys,capsule,validate,api};
  if(typeof window!=='undefined'){
    root.HiramekiStorage=api(localStorage);
    if(!location.pathname.endsWith('migration.html'))addEventListener('storage',e=>{if(e.key===capsule)location.reload()});
  }
})(typeof window!=='undefined'?window:globalThis);
