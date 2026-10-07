// 架空セーブだけの比較用。ブラウザ・localStorage・本番ファイルにアクセスしない。
// node tools/hoshizu-save-order-review.cjs [--check]
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), outDir = path.join(root, 'docs/reports/hoshizu-save-order-20261007');
const lf = v => String(v).replace(/\r\n/g, '\n');
const hash = v => crypto.createHash('sha256').update(lf(v)).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = lf(read('hoshizu.js')), levelSource = lf(read('hoshizu-levels.js'));
assert.equal(hash(levelSource), '6d8cec612f357044f09eff359cf8e59cd7d99e50ff62a246febfe1fcdfd249b9');
const lc = { window: {} }; vm.runInNewContext(levelSource, lc, { timeout: 1000 });
const levels = JSON.parse(JSON.stringify(lc.window.HOSHIZU_LEVELS));
const originalOrder = levels.map((_, i) => i + 1);
const proposalOrder = [1, 3, 4, 2, ...originalOrder.slice(4)];
// 原コードの関数を最上位インデント境界で抽出。再実装した復元ロジックは使わない。
function getFunction(name) {
  const start = source.indexOf(`  function ${name}(`); assert(start >= 0, `関数なし: ${name}`);
  const lineEnd = source.indexOf('\n', start);
  const first = source.slice(start, lineEnd);
  if (first.trimEnd().endsWith('}')) return first;
  const end = source.indexOf('\n  }', lineEnd); assert(end >= 0);
  return source.slice(start, end + 4);
}
function declaration(prefix) {
  const line = source.split('\n').find(l => l.trimStart().startsWith(prefix)); assert(line, prefix); return line;
}
const extracted = ['geometry', 'connected', 'check', 'bests', 'save', 'load', 'start'].map(getFunction).join('\n');
const declarations = ['const KEY=', 'const key=', 'const degree=', 'const NS=', 'const KANJI=', 'const kanji=', 'const nightName='].map(declaration).join('\n');
const nextLine = source.split('\n').find(l => l.includes("$('hz-next').addEventListener('click',")); assert(nextLine);
const jsonCopy = v => JSON.parse(JSON.stringify(v));
function run(order, fixture, advance = false) {
  const box = { LEVELS: order.map(n => jsonCopy(levels[n - 1])), initialSave: fixture.save ? JSON.stringify(fixture.save) : null, initialBest: JSON.stringify(fixture.best) };
  vm.runInNewContext(`
    ${declarations}
    let L=null,S=null,G=null,selected=null;
    const memory = new Map([[KEY, initialSave], [BEST_KEY, initialBest]]), writes=[];
    const store={get:k=>memory.get(k)??null,set(k,v){writes.push({key:k,value:v});memory.set(k,v)}};
    const elements=new Map(),handlers=new Map();
    const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',addEventListener(event,fn){handlers.set(id+':'+event,fn)}});return elements.get(id)};
    const build=()=>{},render=()=>{},sfx={done(){}},starEls=[];
    ${extracted}
    ${nextLine}
    const saved=load();start(saved&&saved.level?saved.level:1,saved);
    const nextAvailableBeforeAdvance=S.solved;
    if(${advance}){if(!nextAvailableBeforeAdvance)throw Error('未完成から次へは今回の比較対象外');handlers.get('hz-next:click')()}
    globalThis.result={save:JSON.parse(memory.get(KEY)),best:JSON.parse(memory.get(BEST_KEY)),undo_history_length:S.hist.length,next_available:S.solved,nextAvailableBeforeAdvance,writes:writes.map(w=>w.key)};
  `, box, { timeout: 1000 });
  const result = jsonCopy(box.result);
  result.problem_old_number = order[result.save.level - 1];
  result.known_completed_old_problems = Object.keys(result.best).map(Number).map(n => order[n - 1]).sort((a, b) => a - b);
  return result;
}
const key = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const savedBoard = (number, complete = false, count = 2) => {
  const lines = complete ? levels[number - 1].sol : levels[number - 1].sol.slice(0, count);
  return { level: number, b: Object.fromEntries(lines.map(([a,b,n])=>[key(a,b),n])), moves: lines.reduce((s,b)=>s+b[2],0), solved: complete };
};
const finishedBest = numbers => Object.fromEntries(numbers.map(n => [n, levels[n - 1].sol.reduce((s,b)=>s+b[2],0)]));
const empty = level => ({ level, b: {}, moves: 0, solved: false });
const fixtures = [
  { id: 'new', label: '保存なし・未着手', save: null, best: {} },
  { id: 'night2-empty', label: '第一夜クリア後・第二夜未着手', save: empty(2), best: finishedBest([1]) },
  { id: 'night2-partial', label: '第二夜途中・正解の最初の2組だけ', save: savedBoard(2), best: finishedBest([1]) },
  { id: 'night2-clear', label: '第二夜クリア直後', save: savedBoard(2, true), best: finishedBest([1,2]) },
  { id: 'night3-partial', label: '第三夜途中・第二夜までクリア', save: savedBoard(3), best: finishedBest([1,2]) },
  { id: 'night4-clear', label: '第四夜クリア直後・第一〜四夜クリア', save: savedBoard(4, true), best: finishedBest([1,2,3,4]) },
  { id: 'night5-empty', label: '第一〜四夜クリア後・第五夜未着手', save: empty(5), best: finishedBest([1,2,3,4]) },
  { id: 'night30-clear', label: '全30夜クリア直後', save: savedBoard(30, true), best: finishedBest(originalOrder) },
  { id: 'second-lap', label: '全30夜クリア後の第一夜途中', save: savedBoard(1), best: finishedBest(originalOrder) }
];
const rows = [];
for (const fixture of fixtures) {
  const before = run(originalOrder, fixture), raw = run(proposalOrder, fixture);
  // 復元可能性の上限を見る、出自が旧順と既知の場合だけの一時入力。
  // 変換器として公開せず、既存保存へ書き戻す経路もない。
  const hypothetical = jsonCopy(fixture);
  if (hypothetical.save) hypothetical.save.level = proposalOrder.indexOf(hypothetical.save.level) + 1;
  hypothetical.best = Object.fromEntries(Object.entries(hypothetical.best).map(([old, value]) => [proposalOrder.indexOf(Number(old)) + 1, value]));
  const knownOld = run(proposalOrder, hypothetical);
  const dropped = fixture.save ? Object.keys(fixture.save.b).filter(k => !(k in raw.save.b)) : [];
  const changedGeometry = Object.keys(raw.save.b).filter(k => {
    const [a,b] = k.split('-').map(Number), oldLevel = levels[before.problem_old_number - 1], newLevel = levels[raw.problem_old_number - 1];
    return JSON.stringify([oldLevel.stars[a]?.slice(0,2),oldLevel.stars[b]?.slice(0,2)]) !== JSON.stringify([newLevel.stars[a]?.slice(0,2),newLevel.stars[b]?.slice(0,2)]);
  });
  assert.equal(before.problem_old_number, knownOld.problem_old_number);
  assert.deepEqual(before.save.b, knownOld.save.b); assert.equal(before.save.moves, knownOld.save.moves); assert.equal(before.save.solved, knownOld.save.solved);
  assert.deepEqual(before.known_completed_old_problems, knownOld.known_completed_old_problems);
  assert.deepEqual(before.best, Object.fromEntries(Object.entries(knownOld.best).map(([n, value]) => [proposalOrder[Number(n) - 1], value])), '元問題ごとのベスト値が変化');
  const beforeNext = before.next_available ? run(originalOrder, fixture, true) : null;
  const knownOldNext = knownOld.next_available ? run(proposalOrder, hypothetical, true) : null;
  rows.push({ id: fixture.id, label: fixture.label, input: fixture, before, reorder_without_mapping: raw, known_old_source_only: knownOld,
    raw_dropped_edge_keys: dropped, raw_retained_edges_with_changed_coordinates: changedGeometry,
    next_before: beforeNext, next_known_old: knownOldNext });
}
// 同じv1保存が旧順と候補順の双方から自然に生成され、違う問題を指す反例。
const common = { save: empty(2), best: finishedBest([1]) };
const collision = { identical_input: common, old_order: run(originalOrder, common), proposal_order: run(proposalOrder, common), reason: '第一夜をクリアして次へ進むと双方で全く同じlevel=2・空盤・第一夜bestになる。問題ID/順序版がないため保存単体では旧第二夜と旧第三夜を識別できない。' };
assert.notEqual(collision.old_order.problem_old_number, collision.proposal_order.problem_old_number);
assert.deepEqual(collision.old_order.save, collision.proposal_order.save);
assert.deepEqual(collision.old_order.best, collision.proposal_order.best);
const duplicateAdvance = rows.find(r => r.id === 'night2-clear');
assert.equal(duplicateAdvance.next_before.problem_old_number, 3);
assert.equal(duplicateAdvance.next_known_old.problem_old_number, 5);
const sourceHashes = { 'hoshizu.js': hash(source), 'hoshizu-levels.js': hash(levelSource), 'index.html': hash(read('index.html')), 'hoshizu.css': hash(read('hoshizu.css')) };
for (const [file, value] of Object.entries(sourceHashes)) assert.equal(hash(read(file)), value);
const result = { date: '2026-10-07', base: '6260027eca22336d688804d43e7075f59658737b', proposed_old_numbers: proposalOrder,
  extracted_functions: ['geometry','connected','check','bests','save','load','start','次へclickハンドラ'],
  source_hashes_lf: sourceHashes, tool_sha256_lf: hash(fs.readFileSync(__filename)),
  limitations: ['架空のv1保存だけをメモリ内で比較。実ユーザー保存は未取得。', '出自既知の番号読み替えは比較用の一時入力。製品移行コード・新schemaは未実装。', 'DOM・音・描画は無操作スタブ。ブラウザ/GPU/実localStorageは使わない。'], rows, collision };
const summary = rows.map(r => ({
  '状態': r.label, '変更前の元問題': r.before.problem_old_number, '無変換後の元問題': r.reorder_without_mapping.problem_old_number,
  '無変換で消える線キー': r.raw_dropped_edge_keys.join(' / '), '同キーで座標が変わる線': r.raw_retained_edges_with_changed_coordinates.join(' / '),
  '変更前完成': r.before.save.solved, '無変換後完成': r.reorder_without_mapping.save.solved,
  '旧順既知で対応させた新面番号': r.known_old_source_only.save.level,
  '次へ変更前の元問題': r.next_before?.problem_old_number ?? '', '次へ対応後の元問題': r.next_known_old?.problem_old_number ?? '',
  '既存ベスト': JSON.stringify(r.before.best), '旧順既知で対応させたベスト': JSON.stringify(r.known_old_source_only.best)
}));
const quote = v => '"'+String(v).replace(/"/g,'""')+'"', columns=Object.keys(summary[0]);
const csv='\uFEFF'+[columns,...summary.map(r=>columns.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';
const outputs={'results.json':JSON.stringify(result,null,2)+'\n','comparison.csv':csv};
if(process.argv.includes('--check'))for(const[file,value]of Object.entries(outputs))assert.equal(lf(fs.readFileSync(path.join(outDir,file),'utf8')),lf(value));
else{fs.mkdirSync(outDir,{recursive:true});for(const[file,value]of Object.entries(outputs))fs.writeFileSync(path.join(outDir,file),value)}
console.log(JSON.stringify({cases:rows.length,summary,collision:{old_problem:collision.old_order.problem_old_number,new_problem:collision.proposal_order.problem_old_number}},null,2));
