/* 引継ぎ専用。対象キー以外の保存領域には触れない。 */
(function(root){
  'use strict';
  const worlds=['kintsugi','hoshizu','kagee','katsuji','chomen','himitsu','somewake','sangaku'];
  const keys=['hirameki-world',...worlds.flatMap(w=>[w+'-save-v1',w+'-best',w+'-sound'])];
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
    if(b.app!=='hirameki-garden'||b.version!==1||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt)))fail();
    exact(b.data,keys);
    for(const k of keys){const v=b.data[k];if(v===null)continue;if(typeof v!=='string'||v.length>1000000)fail();
      if(k==='hirameki-world'){if(!worlds.includes(v))fail();continue}
      if(k.endsWith('-sound')){if(v!=='0'&&v!=='1')fail();continue}
      const w=k.split('-')[0];let s;try{s=JSON.parse(v)}catch(e){fail()}
      if(k.endsWith('-best')){if(!obj(s))fail();const max=w==='kintsugi'?1000000:w==='kagee'?20:root[w.toUpperCase()+'_LEVELS'].length;for(const [n,x]of Object.entries(s))if(!/^[1-9]\d*$/.test(n)||!int(+n,1,max)||!int(x))fail()}
      else state(w,s);
    }
    return b;
  }
  function api(storage){
    let seen=storage.getItem(capsule);
    function active(){const raw=storage.getItem(capsule);return raw===null?null:JSON.parse(raw).data}
    function get(k){if(!keys.includes(k))fail();const a=active();return a?a[k]:storage.getItem(k)}
    function snapshot(){return validate({app:'hirameki-garden',version:1,createdAt:new Date().toISOString(),data:Object.fromEntries(keys.map(k=>[k,get(k)]))})}
    return {get,set(k,v){if(!keys.includes(k))fail();if(storage.getItem(capsule)!==seen)throw Error('別の画面で保存が更新されました。再読込みしてください。');const a=active();if(a){const b={app:'hirameki-garden',version:1,createdAt:new Date().toISOString(),data:{...a,[k]:v}};const next=JSON.stringify(b);storage.setItem(capsule,next);seen=next}else storage.setItem(k,v)},snapshot,
      import(b){const safe=JSON.stringify(validate(b));storage.setItem(capsule,safe);seen=safe},
      current(){return JSON.stringify(snapshot().data)}};
  }
  root.HiramekiBackup={keys,capsule,validate,api};
  if(typeof window!=='undefined'){
    root.HiramekiStorage=api(localStorage);
    if(!location.pathname.endsWith('migration.html'))addEventListener('storage',e=>{if(e.key===capsule)location.reload()});
  }
})(typeof window!=='undefined'?window:globalThis);
