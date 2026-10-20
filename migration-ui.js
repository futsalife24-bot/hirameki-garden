/* 専用画面はゲームを起動せず、確認完了まで保存しない。 */
(()=>{'use strict';const $=id=>document.getElementById(id),api=HiramekiStorage;
  const legacy=document.documentElement.dataset.migrationMode==='export-only'||location.pathname.startsWith('/hirameki-garden/');
  let pending=null,before=null,sequence=0;
  function reset(){pending=null;before=null;$('agree').checked=false;$('agree').disabled=true;$('import').disabled=true}
  $('export').onclick=()=>{try{const data=JSON.stringify(api.snapshot(),null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hirameki-garden-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='ファイルの保存先を確認し、読み込み欄で検証してください。'}catch(e){$('status').textContent=e.message}};
  $('file').onchange=async()=>{const ticket=++sequence;reset();$('status').textContent='';try{
    const f=$('file').files[0];if(!f)return;if(f.size>2000000)throw Error('ファイルが大きすぎます。');
    const text=await f.text();if(ticket!==sequence)return;
    const b=HiramekiBackup.validate(JSON.parse(text));before=api.current();pending=b;
    const names={kintsugi:'金継ぎ',hoshizu:'星図',kagee:'影絵',katsuji:'活字',chomen:'帳面',himitsu:'秘密箱',somewake:'染め分け',sangaku:'算額'};
    const lines=Object.entries(b.data).filter(([,v])=>v!==null).map(([k,v])=>{const w=k.split('-')[0];if(k.endsWith('-save-v1')){const s=JSON.parse(v);return `${names[w]}：第${s.level}面・${s.moves??s.miss??s.fix}手／書き直し・${s.solved?'完成':'途中'}`;}return `${names[w]||'選択作品'} ${k.endsWith('-best')?'自己ベスト':k.endsWith('-sound')?'音設定':'設定'}：${v}`});
    $('preview').textContent=`ひらめきの庭 / 形式 1\n保存日時：${b.createdAt}\n対象：25項目（未保存の項目も置換）\n${lines.join('\n')}\n現在の保存：${Object.values(JSON.parse(before)).filter(v=>v!==null).length}項目\n${legacy?'旧版では検証のみ。上書きできません。':'上書き前に現在のバックアップも保存してください。'}`;
    $('agree').disabled=legacy;$('status').textContent='バックアップの形式と値を検証しました。';
  }catch(e){if(ticket!==sequence)return;reset();$('preview').textContent='読み込みできません。';$('status').textContent=e.message}};
  $('agree').onchange=()=>{$('import').disabled=!pending||!$('agree').checked||legacy};
  $('cancel').onclick=()=>{sequence++;reset();$('file').value='';$('preview').textContent='読み込みをキャンセルしました。';$('status').textContent='保存内容は変更していません。'};
  $('import').onclick=()=>{try{if(legacy||!pending||!$('agree').checked)return;
    if(api.current()!==before)throw Error('確認中に保存内容が変わりました。ファイルを選び直してください。');
    if(!confirm('ひらめきの庭の現在の保存内容を、確認したバックアップで上書きしますか？'))return;
    if(api.current()!==before)throw Error('確認中に保存内容が変わりました。ファイルを選び直してください。');
    api.import(pending);reset();$('status').textContent='読み込みが完了しました。「庭へ戻る」で再開してください。';
  }catch(e){$('status').textContent='読み込みに失敗しました。元の保存は保持されています。 '+e.message}};
})();
