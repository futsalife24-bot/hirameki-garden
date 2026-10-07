// 星図・活字の最初の8面だけを、限定した推論規則で比較する読み取り専用評価。
// node tools/early-logic-review.cjs [--check]。本番生成器は実行・変更しない。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs/reports/early-logic-20261007');
const lf = value => String(value).replace(/\r\n/g, '\n');
const hash = value => crypto.createHash('sha256').update(lf(value)).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hashes = {}, data = {}, helpers = {};
const expected = { hoshizu: '6d8cec612f357044f09eff359cf8e59cd7d99e50ff62a246febfe1fcdfd249b9', katsuji: 'b1285eb94513fc6a4faec8eac35283e9bc4c5a6f3b05d6eb5c512326aa1c2975' };
for (const game of ['hoshizu', 'katsuji']) {
  const file = `${game}-levels.js`, source = read(file), ctx = { window: {} };
  hashes[file] = hash(source); assert.equal(hashes[file], expected[game], '評価対象の更新を確認してください');
  vm.runInNewContext(source, ctx, { timeout: 1000 });
  data[game] = JSON.parse(JSON.stringify(ctx.window[`${game.toUpperCase()}_LEVELS`]));
  const genFile = `tools/${game}-gen.cjs`, gen = read(genFile), marker = 'const PLAN=';
  assert(gen.includes(marker)); hashes[genFile] = hash(gen);
  hashes[`${game}.js`] = hash(read(`${game}.js`));
  // 書出しや生成ループより前の既存関数だけを読み込み、I/Oのrequireも許さない。
  const box = { module: { exports: {} }, require(name) { assert(['fs', 'path'].includes(name)); return Object.freeze({}); } };
  vm.runInNewContext(gen.slice(0, gen.indexOf(marker)) + '\nmodule.exports={countSolutions' + (game === 'hoshizu' ? ',edgesOf' : '') + '};', box, { timeout: 1000 });
  helpers[game] = box.module.exports;
}
const sample = [1, 2, 3, 4, 5, 6, 7, 8];
const min = a => Math.min(...a), max = a => Math.max(...a);
function reduce(domains, index, allowed, trace, reason) {
  const next = domains[index].filter(allowed);
  assert(next.length, `候補が空: ${index} ${reason}`);
  if (next.length === domains[index].length) return false;
  trace.push({ variable: index + 1, before: domains[index], after: next, reason });
  domains[index] = next; return true;
}
function hoshizu(level, connectivity) {
  const edges = JSON.parse(JSON.stringify(helpers.hoshizu.edgesOf(level.w, level.h, level.stars)));
  const domains = edges.map(() => [0, 1, 2]), trace = [];
  const inc = level.stars.map((_, i) => edges.flatMap((e, k) => e.a === i || e.b === i ? [k] : []));
  let changed = true, rounds = 0;
  while (changed) {
    assert(++rounds < 100); changed = false;
    inc.forEach((indices, i) => {
      for (const k of indices) {
        const others = indices.filter(j => j !== k), need = level.stars[i][2];
        const lo = others.reduce((s, j) => s + min(domains[j]), 0), hi = others.reduce((s, j) => s + max(domains[j]), 0);
        changed = reduce(domains, k, v => v + lo <= need && v + hi >= need, trace, `星${i + 1}の必要本数${need}・他辺の合計範囲${lo}〜${hi}`) || changed;
      }
    });
    edges.forEach((e, k) => {
      if (min(domains[k]) > 0) for (const j of e.cross) changed = reduce(domains, j, v => v === 0, trace, `辺${k + 1}と交差するので0本`) || changed;
    });
    if (connectivity) edges.forEach((e, excluded) => {
      if (max(domains[excluded]) === 0 || min(domains[excluded]) > 0) return;
      const seen = new Set([0]), stack = [0];
      while (stack.length) {
        const i = stack.pop();
        for (const k of inc[i]) if (k !== excluded && max(domains[k]) > 0) {
          const j = edges[k].a === i ? edges[k].b : edges[k].a;
          if (!seen.has(j)) { seen.add(j); stack.push(j); }
        }
      }
      if (seen.size < level.stars.length) changed = reduce(domains, excluded, v => v > 0, trace, `この辺を消すと候補グラフが分離するため最低1本`) || changed;
    });
  }
  // 正解は推論終了後の検証だけに利用する。推論の手掛かりには渡さない。
  const solution = edges.map(e => { const b = level.sol.find(b => b[0] === e.a && b[1] === e.b || b[0] === e.b && b[1] === e.a); return b ? b[2] : 0; });
  domains.forEach((d, i) => assert(d.includes(solution[i]), '正解を誤排除'));
  return { total: edges.length, fixed: domains.filter(d => d.length === 1).length, unresolved: domains.filter(d => d.length > 1).length, minimum_positive: domains.filter(d => min(d) > 0).length, rounds, domains, edges: edges.map(e => ({ a: e.a + 1, b: e.b + 1, cross: e.cross.map(k => k + 1) })), trace };
}
const slotCells = s => Array.from({ length: s[3] }, (_, i) => `${s[0] + (s[2] === 'a' ? i : 0)},${s[1] + (s[2] === 'd' ? i : 0)}`);
function katsuji(level, pairSupport, bank = level.words) {
  const cs = level.slots.map(slotCells), domains = level.slots.map(s => bank.filter(w => w.length === s[3]));
  const trace = [];
  level.givens.forEach(i => domains[i] = [level.words[i]]);
  const initialCounts = domains.map(d => d.length);
  const cross = cs.map((cells, i) => cs.flatMap((other, j) => i === j ? [] : cells.flatMap((c, a) => other.includes(c) ? [{ peer: j, position: a, peerPosition: other.indexOf(c) }] : [])));
  let changed = true, rounds = 0;
  while (changed) {
    assert(++rounds < 100); changed = false;
    for (let i = 0; i < domains.length; i++) {
      for (let j = 0; j < domains.length; j++) if (i !== j && domains[j].length === 1) {
        changed = reduce(domains, i, w => w !== domains[j][0], trace, `置き場${j + 1}に確定した語は再使用しない`) || changed;
      }
      for (const c of cross[i]) {
        if (!pairSupport && domains[c.peer].length !== 1) continue;
        changed = reduce(domains, i, w => domains[c.peer].some(v => w !== v && w[c.position] === v[c.peerPosition]), trace, `置き場${c.peer + 1}の${domains[c.peer].length === 1 ? '確定語' : '未確定候補'}と交差文字が合う必要`) || changed;
      }
      // 残りのある語が置ける場所が1か所しかなければ、その場所に確定。
      for (const w of domains[i]) if (!domains.some((d, j) => i !== j && d.includes(w))) {
        changed = reduce(domains, i, v => v === w, trace, `語「${w}」を置ける場所がここだけ`) || changed;
      }
    }
  }
  domains.forEach((d, i) => assert(d.includes(level.words[i]), '正解を誤排除'));
  return { total: domains.length, givens: level.givens.length, initial_singletons: initialCounts.filter(n => n === 1).length,
    initial_candidate_counts: initialCounts, fixed: domains.filter(d => d.length === 1).length,
    unresolved: domains.filter(d => d.length > 1).length, rounds, domains, trace };
}
const results = [];
for (const game of ['hoshizu', 'katsuji']) for (const page of sample) {
  const level = data[game][page - 1];
  const basic = game === 'hoshizu' ? hoshizu(level, false) : katsuji(level, false);
  const extended = game === 'hoshizu' ? hoshizu(level, true) : katsuji(level, true);
  // 活字の語バンク順に依存して正解配列を盗み見ていないことを確認。
  if (game === 'katsuji') for (const mode of [false, true]) {
    const shuffled = katsuji(level, mode, [...level.words].reverse());
    assert.deepEqual(shuffled.domains.map(d => [...d].sort()), (mode ? extended : basic).domains.map(d => [...d].sort()));
  }
  results.push({ game, page, theme: level.theme || null, dimensions: game === 'hoshizu' ? [level.w, level.h] : [level.rows[0].length, level.rows.length], items: game === 'hoshizu' ? level.stars.length : level.slots.length, coach: page === 1, basic, extended });
}
// 各ゲームで基本規則が最初に止まる代表1面だけ、既存の解数カウンタを再利用。
// 既存の全面一意解テストを重複実行しない。該当なしなら追加検算なし。
const spotChecks = [];
for (const game of ['hoshizu', 'katsuji']) {
  const stalled = results.find(r => r.game === game && r.basic.unresolved > 0);
  if (!stalled) continue;
  const l = data[game][stalled.page - 1];
  const found = game === 'hoshizu' ? helpers.hoshizu.countSolutions(l.w, l.h, l.stars).found : helpers.katsuji.countSolutions(l.rows.map(r => [...r].map(c => c === '.' ? '' : c)), l.slots.map(([x, y, dir, len]) => ({ x, y, dir, len })), l.words, l.givens);
  assert.equal(found, 1); spotChecks.push({ game, page: stalled.page, found, method: '既存生成器のcountSolutionsを当該1面だけ再利用' });
}
const inventory = ['hoshizu', 'katsuji'].flatMap(game => data[game].map((l, i) => ({ game, page: i + 1, dimensions: game === 'hoshizu' ? [l.w, l.h] : [l.rows[0].length, l.rows.length], items: game === 'hoshizu' ? l.stars.length : l.slots.length, givens: l.givens || [], coach: i === 0 })));
// 今回の具体的反例：第二夜の局所規則後に残った4辺、各2候補の16組だけ。
// 分断を見抜く人間の推論もあり得るため、これを「仮置き必須」の証明には使わない。
const night2 = results.find(r => r.game === 'hoshizu' && r.page === 2).basic;
const witnessLevel = data.hoshizu[1], assignments = [], partial = [];
const assignmentCount = night2.domains.reduce((n, d) => n * d.length, 1);
assert.equal(assignmentCount, 16);
function enumerateNight2(k) {
  if (k < night2.domains.length) {
    for (const value of night2.domains[k]) { partial[k] = value; enumerateNight2(k + 1); }
    return;
  }
  const degrees = witnessLevel.stars.map(() => 0), adj = witnessLevel.stars.map(() => []);
  for (const [i, edge] of night2.edges.entries()) {
    degrees[edge.a - 1] += partial[i]; degrees[edge.b - 1] += partial[i];
    if (partial[i] > 0) {
      if (edge.cross.some(j => partial[j - 1] > 0)) return;
      adj[edge.a - 1].push(edge.b - 1); adj[edge.b - 1].push(edge.a - 1);
    }
  }
  if (!degrees.every((n, i) => n === witnessLevel.stars[i][2])) return;
  const seen = new Set(), components = [];
  for (let i = 0; i < adj.length; i++) if (!seen.has(i)) {
    const stack = [i], component = []; seen.add(i);
    while (stack.length) { const n = stack.pop(); component.push(n + 1); for (const j of adj[n]) if (!seen.has(j)) { seen.add(j); stack.push(j); } }
    components.push(component.sort((a, b) => a - b));
  }
  assignments.push({ edge_values: partial.slice(), degrees, components, connected: components.length === 1 });
}
enumerateNight2(0);
assert.equal(assignments.length, 2); assert.equal(assignments.filter(a => a.connected).length, 1);
const witness = { game: 'hoshizu', page: 2, star_numbering: 'levelsのstars配列順＋1（画面の表示番号ではない）', stars: witnessLevel.stars, edge_numbering: night2.edges, assignmentCount, degree_and_crossing_valid: assignments };
for (const [file, value] of Object.entries(hashes)) assert.equal(hash(read(file)), value, '本番または生成器が変化');
const result = { date: '2026-10-07', base: '6260027eca22336d688804d43e7075f59658737b', sample, hash_format: 'UTF-8・LF正規化', source_hashes: hashes, evaluator_sha256: hash(fs.readFileSync(__filename)),
  limitation: '有限の局所推論規則の比較。人間の難度・最短手数・必要な仮置き回数の実測ではない。', inventory, spotChecks, witness, results };
const json = JSON.stringify(result, null, 2) + '\n';
const quote = v => '"' + String(v).replace(/"/g, '""') + '"';
const rows = [['ゲーム', '面', '幅', '高さ', '星または語数', '最初の置き済み語', '基本規則で確定', '基本規則の対象', '基本規則で未確定', '追加規則で確定', '追加規則で未確定'], ...results.map(r => [r.game === 'hoshizu' ? '星図' : '活字', r.page, ...r.dimensions, r.items, r.basic.givens || 0, r.basic.fixed, r.basic.total, r.basic.unresolved, r.extended.fixed, r.extended.unresolved])];
const csv = '\uFEFF' + rows.map(r => r.map(quote).join(',')).join('\r\n') + '\r\n';
const outputs = { 'results.json': json, 'comparison.csv': csv };
if (process.argv.includes('--check')) for (const [file, value] of Object.entries(outputs)) assert.equal(lf(fs.readFileSync(path.join(outDir, file), 'utf8')), lf(value));
else { fs.mkdirSync(outDir, { recursive: true }); for (const [file, value] of Object.entries(outputs)) fs.writeFileSync(path.join(outDir, file), value); }
console.log(JSON.stringify({ mode: process.argv.includes('--check') ? '照合' : '出力', spotChecks, rows }, null, 2));
