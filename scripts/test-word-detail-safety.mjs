#!/usr/bin/env node
/**
 * Test an toàn ĐƯỜNG CHI TIẾT TỪ cho TOÀN BỘ từ vựng 3 ngôn ngữ.
 *
 * Bối cảnh sự cố 09/11/2026: mở chi tiết từ (Luyện Đọc / Sổ tay) làm
 * trắng toàn màn hình. Nguyên nhân gốc là import "treo" trên nhánh
 * (chốt chặn riêng ở test-import-exports.mjs). Test này bảo vệ LỚP
 * DỮ LIỆU: nó mô phỏng đúng những gì WordMeta (inline + detail),
 * RealVoiceButton, TwemojiImage và khối kanji của Sổ tay chạm vào cho
 * TỪNG từ của cả 3 khóa, và khẳng định:
 *   - không lookup nào throw;
 *   - mọi giá trị sẽ được render thành React child đều là
 *     string | number | undefined | null (không object/array lạ);
 *   - dữ liệu thiếu -> undefined/false an toàn (hiển thị trống),
 *     gồm cả từ bịa không có trong từ điển;
 *   - ba từ của ca sự cố (dog / horse / duck) đi trọn đường chi tiết.
 *
 * Chạy: node scripts/test-word-detail-safety.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

// ---------- Nạp dữ liệu (nạp JSON trực tiếp, cùng nguồn với lib/lexicon.ts) ----------
const packs = {};
for (const id of ['en-vi', 'ja-vi', 'zh-vi']) {
  packs[id] = readJson(`src/content/packs/${id}.json`);
}
const enLex = readJson('src/content/lexicon/en.json');
const zhLex = readJson('src/content/lexicon/zh.json');
const jaLex = readJson('src/content/lexicon/ja.json');
const charsZh = readJson('src/content/lexicon/chars-zh.json');
const charsJa = readJson('src/content/lexicon/chars-ja.json');
const kanjidicJa = readJson('src/content/lexicon/kanjidic-ja.json');
const tatoeba = readJson('src/content/examples.json');
const lingua = readJson('src/content/lingua-libre.json');
const manifestText = readText('src/content/real-audio-manifest.ts');
const twemojiText = readText('src/content/twemoji-assets.ts');

// ---------- Hàm mô phỏng lib/lexicon.ts + lib/audio.ts (web path) ----------
const manifestKeys = new Set(
  [...manifestText.matchAll(/"((?:en|ja|zh)-vi:[^"]+)":\s*require/g)].map((m) => m[1])
);
const hasRealVoice = (courseId, target) => manifestKeys.has(`${courseId}:${target}`);
const enrichEn = (w) => enLex[w.toLowerCase()];
const enrichZh = (w) => zhLex[w];
const enrichJa = (w) => jaLex[w];
const charInfo = (courseId, ch) => (courseId === 'zh-vi' ? charsZh[ch] : courseId === 'ja-vi' ? charsJa[ch] : undefined);
const kanjidicInfo = (ch) => kanjidicJa[ch];
function exampleSentence(courseId, target) {
  const key = courseId === 'en-vi' ? target.toLowerCase() : target;
  const list = tatoeba.courses[courseId]?.[key];
  if (!list || list.length === 0) return undefined;
  const byId = new Map();
  for (const c of Object.values(tatoeba.courses)) for (const arr of Object.values(c)) for (const s of arr) byId.set(s.id, s);
  for (const id of tatoeba.approvedSentenceIds) {
    const s = byId.get(id);
    if (s && list.includes(s)) return s;
  }
  return undefined;
}
const twemojiKeys = new Set([...twemojiText.matchAll(/"([^"]+)":\s*require\(/g)].map((m) => m[1]));

// Giá trị an toàn để làm React child (sau khi qua các toán tử ?? / || của component).
const isRenderable = (v) =>
  v === undefined || v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
function assertRenderableFields(obj, fields, label) {
  for (const f of fields) {
    assert.ok(isRenderable(obj[f]), `${label}: field ${f} có kiểu ${typeof obj[f]} — không an toàn để render`);
  }
}

function vocabOf(pack) {
  const map = new Map();
  for (const sec of pack.sections)
    for (const u of sec.units) for (const w of u.words) if (!map.has(w.target)) map.set(w.target, w);
  return map;
}

/** Chạy trọn đường chi tiết cho một từ; throw ở bất cứ bước nào là FAIL. */
function detailPath(courseId, word) {
  const t = word.target;
  // WordMeta inline + detail (meta + chip + gloss + ví dụ)
  if (courseId === 'en-vi') {
    const e = enrichEn(t);
    if (e) assertRenderableFields(e, ['ipa', 'cefr', 'dolch', 'ngslRank', 'frq', 'gloss'], `en ${t}`);
  } else if (courseId === 'zh-vi') {
    const e = enrichZh(t);
    if (e) assertRenderableFields(e, ['pinyin', 'hsk', 'gloss', 'trad', 'zipf'], `zh ${t}`);
    for (const ch of t) {
      const ci = charInfo(courseId, ch);
      if (ci) assertRenderableFields(ci, ['def', 'reading', 'strokes', 'radical'], `zh char ${ch}`);
    }
  } else {
    const e = enrichJa(t);
    if (e) assertRenderableFields(e, ['jlpt', 'jmReading', 'jmGloss', 'pitchReading', 'pitch', 'zipf'], `ja ${t}`);
    for (const ch of t) {
      const kd = kanjidicInfo(ch);
      if (kd) {
        assertRenderableFields(kd, ['gloss', 'strokes'], `kanjidic ${ch}`);
        // on/kun có thể VẮNG (kanji chỉ có một loại âm đọc) — component
        // dùng (k.on ?? []) nên vắng là an toàn; có mặt thì phải string[].
        for (const f of ['on', 'kun']) {
          if (kd[f] !== undefined) {
            assert.ok(
              Array.isArray(kd[f]) && kd[f].every((s) => typeof s === 'string'),
              `kanjidic ${ch}: ${f}[] phải là string[]`
            );
          }
        }
      }
      const ci = charInfo(courseId, ch);
      if (ci) assertRenderableFields(ci, ['def', 'reading', 'strokes', 'radical'], `ja char ${ch}`);
    }
  }
  const ex = exampleSentence(courseId, t);
  if (ex) assertRenderableFields(ex, ['id', 'text', 'author', 'license', 'reviewStatus', 'reviewed'], `example ${t}`);
  // RealVoiceButton: chỉ tra manifest, không require động
  assert.equal(typeof hasRealVoice(courseId, t), 'boolean');
  // TwemojiImage: emoji phải là string; có asset thì file phải tồn tại
  assert.equal(typeof word.emoji, 'string', `${courseId} ${t}: emoji không phải string`);
  const m = twemojiText.match(new RegExp(`"${word.emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*require\\("\\.\\./\\.\\./(assets/twemoji/[^"]+)"\\)`));
  if (m) assert.ok(existsSync(path.join(root, m[1])), `twemoji file thiếu: ${m[1]}`);
  // Bản thân Word của pack: các field render trực tiếp
  assertRenderableFields(word, ['target', 'native', 'romanization', 'emoji'], `word ${t}`);
}

// ---------- Các nhóm kiểm ----------
const vocabs = Object.fromEntries(Object.entries(packs).map(([id, p]) => [id, vocabOf(p)]));

ok('toàn bộ từ tiếng Anh đi trọn đường chi tiết không throw, field an toàn render', () => {
  let n = 0;
  for (const w of vocabs['en-vi'].values()) { detailPath('en-vi', w); n += 1; }
  assert.ok(n >= 216, `chỉ duyệt ${n} từ Anh`);
});

ok('toàn bộ từ tiếng Trung đi trọn đường chi tiết + từng ký tự không throw', () => {
  let n = 0;
  for (const w of vocabs['zh-vi'].values()) { detailPath('zh-vi', w); n += 1; }
  assert.ok(n >= 208, `chỉ duyệt ${n} từ Trung`);
});

ok('toàn bộ từ tiếng Nhật đi trọn đường chi tiết + kanjidic từng ký tự không throw', () => {
  let n = 0;
  for (const w of vocabs['ja-vi'].values()) { detailPath('ja-vi', w); n += 1; }
  assert.ok(n >= 214, `chỉ duyệt ${n} từ Nhật`);
});

ok('ca sự cố: dog (đủ dữ liệu) / horse (có giọng thật) / duck (thiếu cả hai) đều an toàn', () => {
  const en = vocabs['en-vi'];
  for (const t of ['dog', 'horse', 'duck']) {
    assert.ok(en.has(t), `pack Anh thiếu từ ${t}`);
    detailPath('en-vi', en.get(t));
  }
  assert.equal(hasRealVoice('en-vi', 'horse'), true);
  assert.equal(hasRealVoice('en-vi', 'dog'), true);
  assert.equal(hasRealVoice('en-vi', 'duck'), false);
  assert.ok(exampleSentence('en-vi', 'dog'), 'dog phải có câu ví dụ');
  assert.equal(exampleSentence('en-vi', 'duck'), undefined);
});

ok('manifest giọng thật: mọi key thuộc từ vựng thật, khớp lingua-libre.json, file mp3 tồn tại', () => {
  for (const key of manifestKeys) {
    const [courseId, target] = key.split(/:(.+)/).filter(Boolean);
    assert.ok(vocabs[courseId]?.has(target), `manifest key lạ: ${key}`);
    assert.ok(lingua[key], `manifest có ${key} nhưng lingua-libre.json thiếu metadata`);
  }
  assert.deepEqual([...manifestKeys].sort(), Object.keys(lingua).sort());
  for (const m of manifestText.matchAll(/require\("\.\.\/\.\.\/(assets\/audio\/[^"]+)"\)/g)) {
    assert.ok(existsSync(path.join(root, m[1])), `thiếu file audio: ${m[1]}`);
  }
});

ok('dữ liệu thiếu trả về an toàn: từ bịa ở cả 3 khóa không throw, lookup ra undefined/false', () => {
  for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
    assert.equal(exampleSentence(courseId, 'zzz-not-a-word'), undefined);
    assert.equal(hasRealVoice(courseId, 'zzz-not-a-word'), false);
    assert.equal(exampleSentence(courseId, ''), undefined);
  }
  assert.equal(enrichEn('zzz-not-a-word'), undefined);
  assert.equal(enrichZh('猫猫猫'), undefined);
  assert.equal(enrichJa('zzz'), undefined);
  assert.equal(kanjidicInfo('A'), undefined);
  assert.equal(charInfo('zh-vi', 'A'), undefined);
});

console.log(`\ntest-word-detail-safety: PASS ${groups} nhóm`);
