#!/usr/bin/env node
/**
 * Test Đợt 1 tích hợp nguồn mở — NỀN DỮ LIỆU (hợp nhất):
 * - FSRS: chuyển đổi từ SM-2 giữ nguyên số entry + dueAt từng thẻ trên
 *   record mẫu; review Good cho lịch ôn không nằm trong quá khứ
 *   (phần sâu hơn ở test-fsrs.mjs — ở đây khẳng định ở tầng hợp nhất).
 * - Subset CC-CEDICT khớp từ zh THẬT của app: khóa ⊆ từ vựng, 猫/狗 có
 *   pinyin dạng dấu + gloss; pinyin phủ tỉ lệ cao.
 * - Thẻ cấp độ: CEFR (Anh) / HSK (Trung) / JLPT (Nhật) gắn được cho tỉ
 *   lệ từ cao; từ không khớp thì VẮNG MẶT trong dữ liệu (không bịa);
 *   mọi giá trị cấp độ đều hợp lệ theo miền của nó.
 * - IPA có mặt cho từ Anh phổ biến (dog/cat/apple) và phủ tỉ lệ cao.
 * - Unihan: chars-zh phủ đúng tập ký tự Hán của từ vựng zh, có số nét;
 *   chars-ja chỉ chứa kanji thật của từ vựng ja.
 * - Nối dây tĩnh: lexicon.ts nạp 5 file dữ liệu; WordMeta được dùng ở
 *   Sổ tay + tab Ôn tập + thẻ từ của Luyện Đọc; practice sắp xếp theo
 *   freqScore; màn Nguồn dữ liệu có đủ ghi công bắt buộc và được đăng
 *   ký route + lối vào ở tab Hồ sơ.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise.
 * Chạy: node scripts/test-data-integration.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
const readText = (p) => readFileSync(path.join(root, p), 'utf8');

let groups = 0;
const ok = (name, fn) => {
  fn();
  groups += 1;
  console.log(`  ✓ ${name}`);
};

// ---------- Dữ liệu gốc của app ----------
const packs = {};
for (const id of ['en-vi', 'ja-vi', 'zh-vi']) {
  packs[id] = readJson(`src/content/packs/${id}.json`);
}
function vocab(pack) {
  const map = new Map();
  for (const sec of pack.sections)
    for (const u of sec.units) for (const w of u.words) if (!map.has(w.target)) map.set(w.target, w);
  return map;
}
const enVocab = vocab(packs['en-vi']);
const jaVocab = vocab(packs['ja-vi']);
const zhVocab = vocab(packs['zh-vi']);

ok('baseline nội dung 80 unit / 314 bài / 2488 câu', () => {
  let units = 0, lessons = 0, exercises = 0;
  for (const id of Object.keys(packs))
    for (const sec of packs[id].sections)
      for (const u of sec.units) {
        units += 1;
        for (const l of u.lessons) {
          lessons += 1;
          exercises += l.exercises.length;
        }
      }
  assert.equal(units, 80);
  assert.equal(lessons, 314);
  assert.equal(exercises, 2488);
});

// ---------- FSRS: chuyển đổi giữ lịch sử ----------
ok('FSRS: convertLegacyEntry giữ nguyên số entry + dueAt, Good không hẹn vào quá khứ', () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-integ-'));
  const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');
  execFileSync(
    tscBin,
    [
      '--ignoreConfig', 'src/lib/srs.ts',
      '--module', 'commonjs', '--target', 'ES2022',
      '--moduleResolution', 'node', '--ignoreDeprecations', '6.0',
      '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck',
      '--types', 'node', '--outDir', outDir,
    ],
    { cwd: root, stdio: 'pipe' }
  );
  symlinkSync(path.join(root, 'node_modules'), path.join(outDir, 'node_modules'), 'junction');
  const require = createRequire(path.join(outDir, 'srs.js'));
  const srs = require(path.join(outDir, 'srs.js'));
  assert.equal(typeof srs.convertLegacyEntry, 'function');
  assert.equal(typeof srs.reviewWord, 'function');

  const now = Date.now();
  const legacy = {
    dog: { interval: 12, ease: 2.5, dueAt: now + 3 * 86400000, streak: 5 },
    cat: { interval: 0, ease: 1.8, dueAt: now - 1000, streak: 1 },
    bird: { interval: 3, ease: 2.2, dueAt: now + 86400000, streak: 2 },
  };
  const stats = {
    dog: { correct: 7, wrong: 2, lastSeen: now - 9 * 86400000 },
    cat: { correct: 1, wrong: 4, lastSeen: now - 3600000 },
  };
  const converted = {};
  for (const [k, v] of Object.entries(legacy)) converted[k] = srs.convertLegacyEntry(v, stats[k]);
  assert.deepEqual(Object.keys(converted).sort(), Object.keys(legacy).sort(), 'mất entry khi chuyển đổi');
  for (const k of Object.keys(legacy))
    assert.equal(converted[k].dueAt, legacy[k].dueAt, `dueAt của ${k} bị dời`);
  assert.equal(converted.dog.reps, 7);
  assert.equal(converted.dog.lapses, 2);
  assert.equal(converted.bird.lapses, 0, 'thiếu wordStats thì lapses = 0');
  for (const k of Object.keys(converted)) {
    const next = srs.reviewWord(converted[k], 2, now);
    assert.ok(next.dueAt > now, `review Good của ${k} hẹn vào quá khứ`);
  }
});

// ---------- Tiếng Anh: IPA + CEFR + tần suất ----------
const en = readJson('src/content/lexicon/en.json');
ok('Anh: khóa của en.json chỉ gồm từ vựng thật của app', () => {
  const lower = new Set([...enVocab.keys()].map((t) => t.toLowerCase()));
  for (const k of Object.keys(en)) assert.ok(lower.has(k), `khóa lạ: ${k}`);
  assert.ok(Object.keys(en).length >= 200, 'quá ít mục');
});
ok('Anh: IPA có cho từ phổ biến và phủ ≥ 85%', () => {
  for (const w of ['dog', 'cat', 'apple']) assert.ok(en[w]?.ipa, `${w} thiếu IPA`);
  const withIpa = [...enVocab.keys()].filter((t) => en[t.toLowerCase()]?.ipa).length;
  assert.ok(withIpa / enVocab.size >= 0.85, `IPA chỉ phủ ${withIpa}/${enVocab.size}`);
});
ok('Anh: CEFR phủ ≥ 85%, giá trị thuộc {A1,A2,B1,B2}; từ bịa không xuất hiện', () => {
  const withCefr = [...enVocab.keys()].filter((t) => en[t.toLowerCase()]?.cefr).length;
  assert.ok(withCefr / enVocab.size >= 0.85, `CEFR chỉ phủ ${withCefr}/${enVocab.size}`);
  for (const e of Object.values(en))
    if (e.cefr) assert.ok(['A1', 'A2', 'B1', 'B2'].includes(e.cefr), `CEFR lạ: ${e.cefr}`);
  assert.equal(en['zzzznotaword'], undefined);
  assert.equal(en['flibbertigibbet'], undefined);
});

// ---------- Tiếng Trung: CC-CEDICT + HSK ----------
const zh = readJson('src/content/lexicon/zh.json');
ok('Trung: khóa của zh.json chỉ gồm từ vựng thật; 猫/狗 có pinyin dấu + gloss từ CC-CEDICT', () => {
  for (const k of Object.keys(zh)) assert.ok(zhVocab.has(k), `khóa lạ: ${k}`);
  assert.equal(zh['猫']?.pinyin, 'māo');
  assert.match(zh['猫']?.gloss ?? '', /cat/i);
  assert.equal(zh['狗']?.pinyin, 'gǒu');
  const withPinyin = [...zhVocab.keys()].filter((t) => zh[t]?.pinyin).length;
  assert.ok(withPinyin / zhVocab.size >= 0.9, `pinyin chỉ phủ ${withPinyin}/${zhVocab.size}`);
});
ok('Trung: HSK phủ ≥ 75%, giá trị 1..9; từ không khớp để trống', () => {
  const withHsk = [...zhVocab.keys()].filter((t) => zh[t]?.hsk).length;
  assert.ok(withHsk / zhVocab.size >= 0.75, `HSK chỉ phủ ${withHsk}/${zhVocab.size}`);
  for (const e of Object.values(zh))
    if (e.hsk) assert.ok(Number.isInteger(e.hsk) && e.hsk >= 1 && e.hsk <= 9);
  assert.equal(zh['猫']?.hsk, 1);
});

// ---------- Tiếng Nhật: JLPT (Tanos) ----------
const ja = readJson('src/content/lexicon/ja.json');
ok('Nhật: JLPT phủ ≥ 55%, giá trị thuộc {N1..N5}, ねこ = N5; từ không khớp để trống', () => {
  for (const k of Object.keys(ja)) assert.ok(jaVocab.has(k), `khóa lạ: ${k}`);
  const withJlpt = [...jaVocab.keys()].filter((t) => ja[t]?.jlpt).length;
  assert.ok(withJlpt / jaVocab.size >= 0.55, `JLPT chỉ phủ ${withJlpt}/${jaVocab.size}`);
  for (const e of Object.values(ja))
    if (e.jlpt) assert.ok(['N1', 'N2', 'N3', 'N4', 'N5'].includes(e.jlpt), `JLPT lạ: ${e.jlpt}`);
  assert.equal(ja['ねこ']?.jlpt, 'N5');
});

// ---------- Unihan: ký tự ----------
ok('Unihan: chars-zh phủ đúng tập ký tự Hán của từ vựng zh và có số nét', () => {
  const charsZh = readJson('src/content/lexicon/chars-zh.json');
  const expected = new Set();
  for (const t of zhVocab.keys())
    for (const ch of t) if (/[\u4e00-\u9fff]/.test(ch)) expected.add(ch);
  assert.deepEqual(Object.keys(charsZh).sort(), [...expected].sort());
  for (const info of Object.values(charsZh)) assert.ok(info.strokes >= 1, 'thiếu số nét');
});
ok('Unihan: chars-ja chỉ chứa kanji thật của từ vựng ja', () => {
  const charsJa = readJson('src/content/lexicon/chars-ja.json');
  const jaChars = new Set();
  for (const t of jaVocab.keys()) for (const ch of t) jaChars.add(ch);
  assert.ok(Object.keys(charsJa).length >= 50);
  for (const k of Object.keys(charsJa)) assert.ok(jaChars.has(k), `ký tự lạ: ${k}`);
});

// ---------- Nối dây ----------
ok('Nối dây: lexicon.ts nạp đủ 5 file dữ liệu và xuất các hàm tra cứu', () => {
  const src = readText('src/lib/lexicon.ts');
  for (const f of ['en.json', 'zh.json', 'ja.json', 'chars-zh.json', 'chars-ja.json'])
    assert.ok(src.includes(f), `lexicon.ts thiếu ${f}`);
  for (const fn of ['enrichWord', 'enrichEn', 'enrichZh', 'enrichJa', 'charInfo', 'freqScore'])
    assert.ok(src.includes(`function ${fn}`), `thiếu hàm ${fn}`);
});
ok('Nối dây UI: WordMeta ở Sổ tay + Ôn tập + Luyện Đọc; Ôn tập sắp xếp theo freqScore', () => {
  assert.ok(readText('src/app/guidebook/[unitId].tsx').includes('WordMeta'));
  assert.ok(readText('src/app/guidebook/[unitId].tsx').includes('JLPT_NOTE'));
  const practice = readText('src/app/(tabs)/practice.tsx');
  assert.ok(practice.includes('WordMeta'));
  assert.ok(practice.includes('freqScore'));
  assert.ok(readText('src/app/skills-read.tsx').includes('WordMeta'));
});
ok('Màn Nguồn dữ liệu: đủ ghi công bắt buộc + đăng ký route + lối vào ở Hồ sơ', () => {
  const screen = readText('src/app/data-sources.tsx');
  for (const s of [
    'Yukio Tono', 'Tanos', 'CC BY-SA', 'Arphic', 'Ulrich Apel',
    'Carnegie Mellon', 'Unicode', 'CC-CEDICT', 'ts-fsrs', 'wordfreq',
    'ước lượng', 'JLPT không công bố',
  ])
    assert.ok(screen.toLowerCase().includes(s.toLowerCase()), `màn Nguồn thiếu: ${s}`);
  assert.ok(readText('src/app/_layout.tsx').includes('name="data-sources"'));
  assert.ok(readText('src/app/(tabs)/profile.tsx').includes('/data-sources'));
});

console.log(`\nPASS test-data-integration: ${groups} nhóm kiểm tra đạt.`);
