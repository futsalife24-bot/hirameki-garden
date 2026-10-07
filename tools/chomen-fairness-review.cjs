// 読み取り評価専用。本番データ・生成器・ゲーム・保存には書き込まない。
// node tools/chomen-fairness-review.cjs [--check]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const notes = require('./chomen-fairness-notes.cjs');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'reports', 'chomen-fairness-20261007');
// GitのWindows checkoutによるCRLF差を内容変更と混同しない。ハッシュはLF正規化。
const normalizeLF = data => String(data).replace(/\r\n/g, '\n');
const sha = data => crypto.createHash('sha256').update(normalizeLF(data)).digest('hex');
const source = fs.readFileSync(path.join(root, 'chomen-levels.js'), 'utf8');
// 自然言語の評価を旧ヒントへ誤適用しない。更新時はレビューしてからこの固定値も更新する。
assert.equal(sha(source), '616cf078907530b8d13e96b5e320ad74292fb07444adf7cad49a7e238914b05b', '評価対象が変わっています。語義レビューが必要です');
const context = { window: {} };
vm.runInNewContext(source, context, { timeout: 1000 });
const levels = JSON.parse(JSON.stringify(context.window.CHOMEN_LEVELS));
const entries = [];
const pages = [];
const seen = new Set();
const cells = entry => [...entry.a].map((letter, i) => ({
  x: entry.x + (entry.d === 'a' ? i : 0), y: entry.y + (entry.d === 'd' ? i : 0), letter, position: i + 1
}));
for (const [pageIndex, level] of levels.entries()) {
  const page = pageIndex + 1;
  const idOf = entry => `P${String(page).padStart(2, '0')}-${entry.d}${entry.n}`;
  const allCells = level.entries.map(cells);
  const owners = new Map();
  allCells.forEach((cs, i) => cs.forEach(c => {
    assert.equal(level.rows[c.y][c.x], c.letter, `盤と答えの不一致: ${idOf(level.entries[i])}`);
    const key = `${c.x},${c.y}`;
    owners.set(key, [...(owners.get(key) || []), { entryIndex: i, ...c }]);
  }));
  for (const owned of owners.values()) {
    assert(owned.length <= 2);
    if (owned.length === 2) {
      assert.notEqual(level.entries[owned[0].entryIndex].d, level.entries[owned[1].entryIndex].d);
      assert.equal(owned[0].letter, owned[1].letter);
    }
  }
  const pageEntries = level.entries.map((entry, entryIndex) => {
    const annotation = notes[entry.a];
    assert(annotation, `語義レビューがありません: ${entry.a}`);
    const intersections = allCells[entryIndex].flatMap(cell => owners.get(`${cell.x},${cell.y}`)
      .filter(owner => owner.entryIndex !== entryIndex)
      .map(owner => ({ position: cell.position, letter: cell.letter, peer_id: idOf(level.entries[owner.entryIndex]), peer_answer: level.entries[owner.entryIndex].a, peer_position: owner.position, peer_knowledge: notes[level.entries[owner.entryIndex].a].knowledge })));
    const length = [...entry.a].length;
    const positions = new Set(intersections.map(i => i.position));
    const pattern = [...entry.a].map((c, i) => positions.has(i + 1) ? c : '○').join('');
    const alternatives = annotation.alternatives.map(alt => ({
      ...alt,
      length: [...alt.answer].length,
      same_length: [...alt.answer].length === length,
      survives_all_crossings: [...alt.answer].length === length && intersections.every(i => [...alt.answer][i.position - 1] === i.letter),
      excluded_by_positions: [...alt.answer].length === length ? intersections.filter(i => [...alt.answer][i.position - 1] !== i.letter).map(i => i.position) : [],
      // ゲームは文字数違いを案内し、同じ文字数の非一致を書き損じに数える（chomen.js write）。
      current_input_result: [...alt.answer].length === length ? '書き損じ +1（正解文字列と不一致）' : '文字数の案内（書き損じに加算なし）'
    }));
    const unresolved = alternatives.filter(a => a.plausibility === '自然な別解' && a.survives_all_crossings);
    const sameLength = alternatives.filter(a => a.plausibility === '自然な別解' && a.same_length);
    return {
      id: idOf(entry), page, theme: level.theme, entry_index: entryIndex, clue_number: entry.n,
      direction: entry.d === 'a' ? 'ヨコ' : 'タテ', x: entry.x, y: entry.y,
      answer: entry.a, clue: entry.c, length, intersection_count: intersections.length,
      intersection_ratio: Number((intersections.length / length).toFixed(4)),
      maximum_crossing_pattern: pattern, intersections,
      previous_pages: entries.filter(e => e.answer === entry.a).map(e => e.page),
      first_occurrence: !seen.has(entry.a),
      knowledge: annotation.knowledge, clue_specificity: annotation.specificity,
      semantic_reason: annotation.reason, alternatives,
      ambiguity_assessment: unresolved.length ? '自然な別解が全交差後も残る' : sameLength.length ? '自然な同文字数別解あり・全交差で除外可能' : '登録した候補内では同文字数の自然な別解なし',
      rescue_assessment: intersections.length === length ? '他の交差語を解けば全文字が得られる' : intersections.length === 1 ? '最大でも1文字。用語未想起の救済は限定的' : `最大${intersections.length}文字。解ける交差語に依存`,
      proposal_priority: annotation.priority || null,
      empirical_difficulty: '未測定（本人プレイなし）'
    };
  });
  entries.push(...pageEntries);
  pageEntries.forEach(e => seen.add(e.answer));
  const wordPositions = pageEntries.reduce((n, e) => n + e.length, 0);
  pages.push({ page, theme: level.theme, width: level.rows[0].length, height: level.rows.length,
    entries: pageEntries.length, new_answers: pageEntries.filter(e => e.first_occurrence).length,
    repeated_answers: pageEntries.filter(e => !e.first_occurrence).length,
    one_crossing: pageEntries.filter(e => e.intersection_count === 1).length,
    full_crossing: pageEntries.filter(e => e.intersection_count === e.length).length,
    word_positions: wordPositions, crossed_word_positions: pageEntries.reduce((n, e) => n + e.intersection_count, 0),
    knowledge_counts: Object.fromEntries(['日常語', '生活・文化知識', '教科・用語知識'].map(k => [k, pageEntries.filter(e => e.knowledge === k).length]))
  });
}
assert.equal(levels.length, 28);
assert.equal(entries.length, 275);
assert.equal(seen.size, 180);
assert.deepEqual([...seen].sort(), Object.keys(notes).sort(), '未使用/未評価の語があります');
assert.equal(new Set(entries.map(e => e.id)).size, 275);
assert(entries.every(e => e.intersection_count >= 1));
assert.equal(entries.filter(e => e.page > 20 && e.intersection_count === 1).length, 32);
assert.equal(entries.find(e => e.id === 'P28-d1').maximum_crossing_pattern, '○○○○○○ん');
const first = entries.find(e => e.id === 'P21-a1');
assert(first.alternatives.filter(a => a.answer !== 'はんたいご').every(a => a.survives_all_crossings));
// 座標所有者方式とは別に、語のペアの範囲が交わる位置を列挙して全275欄を照合する。
for (const level of levels) {
  for (const a of level.entries) {
    let pairwise = 0;
    for (const b of level.entries) {
      if (a.d === b.d) continue;
      const h = a.d === 'a' ? a : b, v = a.d === 'd' ? a : b;
      if (v.x >= h.x && v.x < h.x + h.a.length && h.y >= v.y && h.y < v.y + v.a.length) pairwise++;
    }
    const page = levels.indexOf(level) + 1;
    assert.equal(entries.find(e => e.page === page && e.direction === (a.d === 'a' ? 'ヨコ' : 'タテ') && e.clue_number === a.n).intersection_count, pairwise);
  }
}
const groups = [entries.filter(e => e.page <= 20), entries.filter(e => e.page > 20)];
const summary = {
  evaluated_on: '2026-10-07', base_commit: '6260027eca22336d688804d43e7075f59658737b',
  hash_format: 'UTF-8 / LF正規化', source_sha256: sha(source), annotations_sha256: sha(fs.readFileSync(path.join(__dirname, 'chomen-fairness-notes.cjs'))),
  evaluator_sha256: sha(fs.readFileSync(__filename)),
  limits: ['語義は主担当レビュー。独立監査・プレイテストではない。', '別解は人が登録した候補のみ。自然言語の一意性証明ではない。', '交差パターンは対象語以外をすべて解いた場合の上限で、実際の解答順を表さない。', 'knowledgeは内容の分類で、年齢・学年・正答率の分類ではない。'],
  counts: { pages: pages.length, entries: entries.length, distinct_answers: seen.size },
  sections: groups.map((es, i) => ({ section: i === 0 ? '既存1〜20面' : '発展21〜28面', entries: es.length, distinct_answers: new Set(es.map(e => e.answer)).size, one_crossing: es.filter(e => e.intersection_count === 1).length, full_crossing: es.filter(e => e.intersection_count === e.length).length, word_positions: es.reduce((n, e) => n + e.length, 0), crossed_word_positions: es.reduce((n, e) => n + e.intersection_count, 0) })),
  unresolved_natural_alternatives: entries.filter(e => e.alternatives.some(a => a.plausibility === '自然な別解' && a.survives_all_crossings)).map(e => ({ id: e.id, answer: e.answer, alternatives: e.alternatives.filter(a => a.plausibility === '自然な別解' && a.survives_all_crossings).map(a => a.answer) })),
  validation: { source_pinned: true, every_answer_reviewed: true, crossings_checked_by_two_methods: true, source_unchanged: true }, pages
};
assert.equal(fs.readFileSync(path.join(root, 'chomen-levels.js'), 'utf8'), source);
const csvEscape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const csvRows = entries.map(e => ({
  '欄ID': e.id, 'ページ': e.page, 'テーマ': e.theme, '向き': e.direction, '番号': e.clue_number,
  '解答': e.answer, '現ヒント': e.clue, '文字数': e.length, '交差数': e.intersection_count,
  '交差率': e.intersection_ratio, '全交差時の最大手掛かり': e.maximum_crossing_pattern,
  '交差相手': e.intersections.map(i => `${i.position}:${i.peer_id}:${i.peer_answer}`).join(' / '),
  '既出ページ': e.previous_pages.join(' / '), '知識の種類': e.knowledge,
  '特定しやすさ': e.clue_specificity, '主担当の判断理由': e.semantic_reason,
  '想定別解と類似候補': e.alternatives.map(a => `${a.answer}（${a.plausibility}・${a.same_length ? '同文字数' : '異文字数'}・${a.survives_all_crossings ? '全交差一致' : '全交差一致なし'}）${a.reason}`).join(' / '),
  '曖昧さの評価': e.ambiguity_assessment, '救済の上限': e.rescue_assessment,
  '改訂案優先順位': e.proposal_priority, '実プレイ難度': e.empirical_difficulty
}));
const fields = Object.keys(csvRows[0]);
const csv = '\uFEFF' + [fields.map(csvEscape).join(','), ...csvRows.map(r => fields.map(f => csvEscape(r[f])).join(','))].join('\r\n') + '\r\n';
const outputs = { 'entries.json': JSON.stringify(entries, null, 2) + '\n', 'summary.json': JSON.stringify(summary, null, 2) + '\n', 'entries.csv': csv };
if (process.argv.includes('--check')) {
  for (const [file, content] of Object.entries(outputs)) assert.equal(normalizeLF(fs.readFileSync(path.join(outputDir, file), 'utf8')), normalizeLF(content), `再生成差分: ${file}`);
} else {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [file, content] of Object.entries(outputs)) fs.writeFileSync(path.join(outputDir, file), content);
}
console.log(JSON.stringify({ mode: process.argv.includes('--check') ? '照合' : '出力', counts: summary.counts, sections: summary.sections, unresolved_natural_alternatives: summary.unresolved_natural_alternatives }, null, 2));
