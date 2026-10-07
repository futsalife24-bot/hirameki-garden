// 第9〜30夜のみ。既存評価の関数定義を再利用し、生成・保存・UIには触れない。
// node tools/hoshizu-late-logic-review.cjs [--check]
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/reports/hoshizu-late-logic-20261007');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const files = ['hoshizu-levels.js', 'hoshizu.js', 'tools/hoshizu-gen.cjs', 'tools/early-logic-review.cjs'];
const sources = Object.fromEntries(files.map(p => [p, read(p)]));
assert.equal(hash(sources['hoshizu-levels.js']), '6d8cec612f357044f09eff359cf8e59cd7d99e50ff62a246febfe1fcdfd249b9');
const data = { window: {} };
vm.runInNewContext(sources['hoshizu-levels.js'], data, { timeout: 1000 });
const gen = sources['tools/hoshizu-gen.cjs'], marker = 'const PLAN=';
assert(gen.includes(marker));
const box = { module: { exports: {} }, require(name) { assert(['fs', 'path'].includes(name)); return Object.freeze({}); } };
vm.runInNewContext(gen.slice(0, gen.indexOf(marker)) + '\nmodule.exports={edgesOf};', box, { timeout: 1000 });
const previous = sources['tools/early-logic-review.cjs'];
const begin = previous.indexOf('const min ='), end = previous.indexOf('const slotCells');
assert(begin >= 0 && end > begin);
const definitions = previous.slice(begin, end);
function evaluator(crossing) {
  const ctx = { assert, helpers: { hoshizu: { edgesOf(w, h, stars) {
    const edges = box.module.exports.edgesOf(w, h, stars);
    // 数字だけの対照条件でも同一の既存推論関数を使い、交差の関連だけ空にする。
    return crossing ? edges : edges.map(e => ({ ...e, cross: [] }));
  } } } };
  vm.runInNewContext(definitions + '\nglobalThis.evaluate=hoshizu;', ctx, { timeout: 1000 });
  return ctx.evaluate;
}
const digits = evaluator(false), normal = evaluator(true);
const results = [];
for (let night = 9; night <= 30; night++) {
  const level = JSON.parse(JSON.stringify(data.window.HOSHIZU_LEVELS[night - 1]));
  const digit = digits(level, false), basic = normal(level, false), connected = normal(level, true);
  // 同じ正解を残すだけでなく、強い規則ほど候補が増えないことも確認。
  for (let k = 0; k < basic.total; k++) {
    assert(basic.domains[k].every(v => digit.domains[k].includes(v)));
    assert(connected.domains[k].every(v => basic.domains[k].includes(v)));
  }
  const counts = r => ({ digit: r.trace.filter(t => t.reason.startsWith('星')).length,
    crossing: r.trace.filter(t => t.reason.includes('交差')).length,
    connectivity: r.trace.filter(t => t.reason.includes('分離')).length });
  results.push({ night, dimensions: [level.w, level.h], stars: level.stars,
    crossing_pairs: basic.edges.reduce((n, e) => n + e.cross.length, 0) / 2,
    digit, basic, connected, reductions: { digit: counts(digit), basic: counts(basic), connected: counts(connected) } });
}
assert.equal(results.length, 22);
// 停滞した代表2面だけ、伝播後の小さい直積を検算する。生成器の全探索は呼ばない。
function residualCheck(r) {
  const { edges, domains } = r.connected, size = domains.reduce((n, d) => n * d.length, 1);
  assert(size <= 4096, '代表面の有限検算上限を超えた');
  const summary = { combinations: size, visited: 0, digit_valid: 0, crossing_valid: 0, connected_valid: 0,
    crossing_rejections: [], disconnected: [], accepted: [] };
  const values = [];
  function visit(k) {
    if (k < domains.length) { for (const v of domains[k]) { values[k] = v; visit(k + 1); } return; }
    summary.visited++;
    const sums = r.stars.map(() => 0);
    edges.forEach((e, i) => { sums[e.a - 1] += values[i]; sums[e.b - 1] += values[i]; });
    if (!sums.every((n, i) => n === r.stars[i][2])) return;
    summary.digit_valid++;
    const crossing = edges.flatMap((e, i) => values[i] > 0 ? e.cross.filter(j => j > i + 1 && values[j - 1] > 0).map(j => [i + 1, j]) : []);
    if (crossing.length) { summary.crossing_rejections.push({ values: [...values], crossing }); return; }
    summary.crossing_valid++;
    const unseen = new Set(r.stars.map((_, i) => i + 1)), components = [];
    while (unseen.size) {
      const first = unseen.values().next().value, component = [first], queue = [first]; unseen.delete(first);
      while (queue.length) {
        const a = queue.pop();
        edges.forEach((e, i) => {
          if (!values[i] || e.a !== a && e.b !== a) return;
          const b = e.a === a ? e.b : e.a;
          if (unseen.delete(b)) { component.push(b); queue.push(b); }
        });
      }
      components.push(component.sort((a, b) => a - b));
    }
    if (components.length > 1) summary.disconnected.push({ values: [...values], components });
    else { summary.connected_valid++; summary.accepted.push([...values]); }
  }
  visit(0); assert.equal(summary.visited, size);
  const level = data.window.HOSHIZU_LEVELS[r.night - 1];
  const stored = edges.map(e => { const b = level.sol.find(b => b[0] + 1 === e.a && b[1] + 1 === e.b || b[0] + 1 === e.b && b[1] + 1 === e.a); return b ? b[2] : 0; });
  assert(summary.accepted.some(values => values.every((v, i) => v === stored[i])), '保存正解が検算結果にない');
  return summary;
}
const representative_checks = [18, 24].map(night => ({ night, ...residualCheck(results.find(r => r.night === night)) }));
const report = { scope: '第9〜30夜の制約伝播。代表18/24夜だけ伝播後256/4096組を検算。初期全探索・全面一意解再検証・人間実測なし',
  source_hashes_lf: Object.fromEntries(files.map(p => [p, hash(sources[p])])),
  reused_definition_hash_lf: hash(definitions), results, representative_checks };
const header = 'night,width,height,stars,edges,crossing_pairs,digit_fixed,basic_fixed,connected_fixed,connected_unresolved,basic_crossing_reductions,connected_bridge_reductions,digit_rounds,basic_rounds,connected_rounds';
const csv = [header, ...results.map(r => [r.night, ...r.dimensions, r.stars.length, r.basic.total, r.crossing_pairs,
  r.digit.fixed, r.basic.fixed, r.connected.fixed, r.connected.unresolved,
  r.reductions.basic.crossing, r.reductions.connected.connectivity,
  r.digit.rounds, r.basic.rounds, r.connected.rounds].join(','))].join('\n') + '\n';
const output = { 'results.json': JSON.stringify(report, null, 2) + '\n', 'comparison.csv': csv };
if (process.argv.includes('--check')) {
  for (const [p, content] of Object.entries(output)) assert.equal(fs.readFileSync(path.join(out, p), 'utf8').replace(/\r\n/g, '\n'), content, p);
} else {
  fs.mkdirSync(out, { recursive: true });
  for (const [p, content] of Object.entries(output)) fs.writeFileSync(path.join(out, p), content);
}
console.log(csv.trim());
console.log(process.argv.includes('--check') ? '保存結果との再現一致・22面の正解候補保持・段階間包含: OK' : '22面の結果を保存');
