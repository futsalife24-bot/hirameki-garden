// 封蝋の固定問題を再生成し、全候補の総当たりで唯一解を検証する。
// node tools/furo-gen.cjs         : 再生成
// node tools/furo-gen.cjs --check : 収録データと生成結果の一致を確認
// node tools/furo-gen.cjs --verify: 収録データ単体を検証
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const OUTPUT = path.join(__dirname, '..', 'furo-levels.js');

// 印ID: 0 月、1 星、2 花、3 鍵、4 波、5 葉、6 鳥。
// 難易度は候補の総数 (24→60→120→360→840)、枠数、手がかりの本数で段階化する。
// 解とシードを固定しているため、再生成結果は毎回同じになる。
const SPECS = [
  { title: 'はじめの封', size: 3, symbols: 4, solution: [0, 1, 2], clues: 2, seed: 1101 },
  { title: '白い封筒', size: 3, symbols: 5, solution: [2, 4, 0], clues: 2, seed: 1102 },
  { title: '夜の便箋', size: 3, symbols: 5, solution: [4, 1, 3], clues: 3, seed: 1103 },
  { title: '古い宛名', size: 3, symbols: 5, solution: [1, 3, 0], clues: 3, seed: 1104 },
  { title: '雨の消印', size: 3, symbols: 6, solution: [5, 0, 2], clues: 3, seed: 1105, noMatch: true },
  { title: '机の引出し', size: 3, symbols: 6, solution: [3, 1, 5], clues: 3, seed: 1106 },
  { title: '緑の封', size: 3, symbols: 6, solution: [2, 5, 4], clues: 3, seed: 1107, noMatch: true },
  { title: '二重の鍵', size: 3, symbols: 6, solution: [4, 0, 3], clues: 4, seed: 1108 },
  { title: '遠い手紙', size: 3, symbols: 6, solution: [1, 4, 5], clues: 4, seed: 1109 },
  { title: '月明かり', size: 3, symbols: 6, solution: [5, 3, 0], clues: 4, seed: 1110 },
  { title: '三枚の便箋', size: 4, symbols: 6, solution: [3, 0, 5, 1], clues: 4, seed: 1111 },
  { title: '消えた署名', size: 4, symbols: 6, solution: [1, 4, 0, 2], clues: 4, seed: 1112 },
  { title: '暗号の封', size: 4, symbols: 6, solution: [5, 2, 3, 4], clues: 4, seed: 1113 },
  { title: '書庫の奥', size: 4, symbols: 6, solution: [2, 5, 1, 0], clues: 4, seed: 1114 },
  { title: '星の標', size: 4, symbols: 7, solution: [6, 1, 4, 0], clues: 5, seed: 1115 },
  { title: '閉じた日記', size: 4, symbols: 7, solution: [2, 6, 0, 5], clues: 5, seed: 1116 },
  { title: '銀の封蝋', size: 4, symbols: 7, solution: [4, 0, 6, 3], clues: 5, seed: 1117 },
  { title: '忘れた約束', size: 4, symbols: 7, solution: [5, 3, 1, 6], clues: 5, seed: 1118 },
  { title: '最後の手紙', size: 4, symbols: 7, solution: [0, 4, 2, 5], clues: 5, seed: 1119 },
  { title: '夜明けの封', size: 4, symbols: 7, solution: [6, 5, 3, 2], clues: 5, seed: 1120 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function permutations(symbols, size) {
  const result = [];
  function extend(prefix, mask) {
    if (prefix.length === size) {
      result.push(prefix);
      return;
    }
    for (let symbol = 0; symbol < symbols; symbol++) {
      if (!(mask & (1 << symbol))) extend([...prefix, symbol], mask | (1 << symbol));
    }
  }
  extend([], 0);
  return result;
}

function feedback(guess, answer) {
  let exact = 0;
  let common = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) exact++;
    if (answer.includes(guess[i])) common++;
  }
  return { exact, near: common - exact };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function matrixFor(candidates, size) {
  const count = candidates.length;
  const matrix = new Uint8Array(count * count);
  for (let guess = 0; guess < count; guess++) {
    for (let answer = 0; answer < count; answer++) {
      const { exact, near } = feedback(candidates[guess], candidates[answer]);
      matrix[guess * count + answer] = exact * (size + 1) + near;
    }
  }
  return matrix;
}

const universes = new Map();
function universeFor(symbols, size) {
  const key = `${symbols}/${size}`;
  if (!universes.has(key)) {
    const candidates = permutations(symbols, size);
    universes.set(key, { candidates, matrix: matrixFor(candidates, size) });
  }
  return universes.get(key);
}

function survivors(guesses, answer, matrix, count, limit = Infinity) {
  let total = 0;
  for (let candidate = 0; candidate < count; candidate++) {
    if (guesses.every(guess => matrix[guess * count + candidate] === matrix[guess * count + answer])) {
      total++;
      if (total >= limit) return total;
    }
  }
  return total;
}

function makeLevel(spec) {
  const { candidates, matrix } = universeFor(spec.symbols, spec.size);
  const count = candidates.length;
  const answer = candidates.findIndex(candidate => candidate.join(',') === spec.solution.join(','));
  assert(answer >= 0, `${spec.title}: 解が候補にない`);
  const random = seededRandom(spec.seed);
  const options = [];
  for (let guess = 0; guess < count; guess++) {
    if (guess === answer) continue;
    const { exact, near } = feedback(candidates[guess], spec.solution);
    // 後半で三つ以上の位置を直接教える手がかりは採用しない。
    if (spec.size === 4 && exact > 2) continue;
    options.push({ guess, exact, near });
  }

  const MAX_TRIES = 200000;
  for (let trial = 0; trial < MAX_TRIES; trial++) {
    const chosen = [];
    const picked = new Set();
    while (chosen.length < spec.clues) {
      const item = options[Math.floor(random() * options.length)];
      if (picked.has(item.guess)) continue;
      picked.add(item.guess);
      chosen.push(item);
    }
    if (!chosen.some(item => item.exact > 0) || !chosen.some(item => item.near > 0)) continue;
    if (!chosen.some(item => item.exact === 0)) continue;
    if (spec.noMatch && !chosen.some(item => item.exact === 0 && item.near === 0)) continue;
    if (spec.size === 4 && chosen.filter(item => item.exact > 0).length < 2) continue;
    const kinds = new Map();
    for (const item of chosen) {
      const kind = `${item.exact}/${item.near}`;
      kinds.set(kind, (kinds.get(kind) || 0) + 1);
    }
    if (Math.max(...kinds.values()) > 2) continue;
    if (kinds.size < Math.min(3, spec.clues)) continue;
    const guesses = chosen.map(item => item.guess);
    if (survivors(guesses, answer, matrix, count, 2) !== 1) continue;
    if (guesses.some((_, index) => survivors(guesses.filter((__, i) => i !== index), answer, matrix, count, 2) < 2)) continue;

    // 先に広い手がかりを見せ、徐々に候補を絞る。
    chosen.sort((a, b) => {
      const aCount = survivors([a.guess], answer, matrix, count);
      const bCount = survivors([b.guess], answer, matrix, count);
      return bCount - aCount || a.guess - b.guess;
    });
    return {
      title: spec.title,
      size: spec.size,
      symbols: spec.symbols,
      clues: chosen.map(item => ({ guess: candidates[item.guess], exact: item.exact, near: item.near })),
      solution: spec.solution,
    };
  }
  throw new Error(`${spec.title}: 条件を満たす問題が ${MAX_TRIES} 回で見つからない`);
}

function validate(levels) {
  assert(Array.isArray(levels) && levels.length === 20, '問題数は20');
  const solutions = new Set();
  const puzzles = new Set();
  const distribution = { noMatch: 0, exact: 0, near: 0 };
  const report = [];
  levels.forEach((level, index) => {
    const label = `${index + 1}: ${level.title}`;
    assert(typeof level.title === 'string' && level.title.length > 0, `${label}: 題名`);
    assert(level.size === (index < 10 ? 3 : 4), `${label}: 枠数`);
    assert(level.symbols >= 4 && level.symbols <= 7, `${label}: 印の種類数`);
    assert(index !== 0 || level.symbols === 4, `${label}: 初級の印数`);
    assert(index === 0 || index > 9 || level.symbols >= 5, `${label}: 前半の印数`);
    assert(index < 10 || level.symbols >= 6, `${label}: 後半の印数`);
    assert(Array.isArray(level.clues) && level.clues.length >= 2 && level.clues.length <= 5, `${label}: 手がかり数`);
    if (index > 0) {
      assert(level.symbols >= levels[index - 1].symbols, `${label}: 印数の段階`);
      assert(level.clues.length >= levels[index - 1].clues.length, `${label}: 手がかり数の段階`);
    }
    assert(Array.isArray(level.solution) && level.solution.length === level.size, `${label}: 解の長さ`);
    assert(new Set(level.solution).size === level.size && level.solution.every(id => Number.isInteger(id) && id >= 0 && id < level.symbols), `${label}: 解のID`);
    const solutionKey = level.solution.join(',');
    assert(!solutions.has(solutionKey), `${label}: 解の重複`);
    solutions.add(solutionKey);
    const puzzleKey = JSON.stringify([level.size, level.symbols, level.clues]);
    assert(!puzzles.has(puzzleKey), `${label}: 同一問題`);
    puzzles.add(puzzleKey);

    const all = permutations(level.symbols, level.size);
    const seen = new Set();
    const kinds = new Map();
    for (const clue of level.clues) {
      assert(Array.isArray(clue.guess) && clue.guess.length === level.size, `${label}: 試し押しの長さ`);
      assert(new Set(clue.guess).size === level.size && clue.guess.every(id => Number.isInteger(id) && id >= 0 && id < level.symbols), `${label}: 試し押しのID`);
      assert(clue.guess.join(',') !== solutionKey, `${label}: 解そのものを表示`);
      assert(!seen.has(clue.guess.join(',')), `${label}: 試し押しの重複`);
      seen.add(clue.guess.join(','));
      const result = feedback(clue.guess, level.solution);
      assert(clue.exact === result.exact && clue.near === result.near, `${label}: 手がかりの計算`);
      const kind = `${clue.exact}/${clue.near}`;
      kinds.set(kind, (kinds.get(kind) || 0) + 1);
      if (clue.exact === 0 && clue.near === 0) distribution.noMatch++;
      if (clue.exact > 0) distribution.exact++;
      if (clue.near > 0) distribution.near++;
    }
    assert(level.clues.some(clue => clue.exact === 0), `${label}: 場所一致なしの手がかり`);
    assert(level.clues.some(clue => clue.exact > 0), `${label}: 場所一致の手がかり`);
    assert(level.clues.some(clue => clue.near > 0), `${label}: 場所違いの手がかり`);
    assert(Math.max(...kinds.values()) <= 2 && kinds.size >= Math.min(3, level.clues.length), `${label}: 手がかりの種類`);
    if (level.size === 4) assert(level.clues.filter(clue => clue.exact > 0).length >= 2, `${label}: 後半の場所一致`);
    if (SPECS[index].noMatch) assert(level.clues.some(clue => clue.exact === 0 && clue.near === 0), `${label}: 無一致の手がかり`);
    const matching = subset => all.filter(candidate => subset.every(clue => {
      const actual = feedback(clue.guess, candidate);
      return actual.exact === clue.exact && actual.near === clue.near;
    }));
    const matches = matching(level.clues);
    assert(matches.length === 1 && matches[0].join(',') === solutionKey, `${label}: 唯一解`);
    for (let i = 0; i < level.clues.length; i++) {
      assert(matching(level.clues.filter((_, j) => j !== i)).length > 1, `${label}: 冗長な手がかり ${i + 1}`);
    }
    const remaining = [];
    for (let i = 0; i <= level.clues.length; i++) remaining.push(matching(level.clues.slice(0, i)).length);
    report.push({ number: index + 1, size: level.size, symbols: level.symbols, clues: level.clues.length, remaining });
  });
  assert(distribution.noMatch >= 2, '無一致の手がかりが不足');
  assert(distribution.exact >= 20 && distribution.near >= 20, '一致・場所違いの手がかりが不足');
  return { report, distribution };
}

function sourceFor(levels) {
  return '// tools/furo-gen.cjs が生成。手で編集しない。\n'
    + '// 印ID: 0 月、1 星、2 花、3 鍵、4 波、5 葉、6 鳥。\n'
    + '// exact: 同位置同印。near: 印はあるが場所違い（exactを含まない）。\n'
    + `window.FURO_LEVELS=${JSON.stringify(levels)};\n`;
}

function readLevels() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(OUTPUT, 'utf8'), context, { filename: OUTPUT });
  return context.window.FURO_LEVELS;
}

function main() {
  const mode = process.argv[2] || '--write';
  assert(['--write', '--check', '--verify'].includes(mode), '使い方: node tools/furo-gen.cjs [--write|--check|--verify]');
  let levels;
  if (mode === '--verify') {
    levels = readLevels();
  } else {
    levels = SPECS.map(makeLevel);
  }
  const { report, distribution } = validate(levels);
  if (mode !== '--verify') {
    const source = sourceFor(levels);
    if (mode === '--write') fs.writeFileSync(OUTPUT, source, 'utf8');
    if (mode === '--check') assert(fs.readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n') === source, '収録データが生成結果と異なる');
  }
  for (const row of report) {
    console.log(`${String(row.number).padStart(2, '0')} 印${row.symbols} 枠${row.size} 手がかり${row.clues}: ${row.remaining.join(' → ')}`);
  }
  console.log(`全20問: 唯一解・非冗長を確認。無一致${distribution.noMatch}、場所一致${distribution.exact}、場所違い${distribution.near}件。`);
}

main();
