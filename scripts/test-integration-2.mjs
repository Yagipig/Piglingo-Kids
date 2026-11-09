#!/usr/bin/env node
/**
 * Test Đợt 2 tích hợp nguồn mở — TÍNH NĂNG:
 * - JMdict (EDRDG): subset khớp từ ja THẬT, có jmGloss cho từ phổ biến.
 * - kanjium: pitch accent có mặt cho từ phổ biến, VẮNG cho từ bịa.
 * - KANJIDIC2: chỉ/đúng tập kanji thật của từ vựng ja.
 * - Tatoeba: mọi câu đã nhúng đều (a) thuộc từ vựng thật, (b) chứa đúng
 *   từ đích, (c) nằm trong approvedSentenceIds lưu NGAY trong file dữ
 *   liệu và mang cờ reviewed của vòng duyệt tay, (d) khớp 1-1 với ứng
 *   viên gốc (id/text/author/license không bị sửa), (e) đạt giới hạn độ
 *   dài của pipeline, (f) có danh sách duyệt dạng text khớp cùng tập id.
 * - Lingua Libre: mọi bản ghi trong gói đều có licenseShortName thuộc
 *   danh sách cho phép của đợt này (CC0 / CC BY), file local tồn tại và
 *   đúng dung lượng khai trong metadata, manifest khớp metadata.
 * - Twemoji: subset asset khớp đúng tập emoji đang dùng trừ đúng 7 ký
 *   tự số khoanh tròn không thuộc Twemoji (fallback hệ thống).
 * - Nối dây tĩnh: hiển thị ở Sổ tay/Luyện Đọc/Luyện Nghe; màn
 *   /data-sources có đủ ghi công EDRDG, Uros O. (nguyên văn), Tatoeba,
 *   Twemoji CC BY 4.0, Lingua Libre.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise.
 * Chạy: node scripts/test-integration-2.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
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
    for (const u of sec.units)
      for (const w of u.words) if (!map.has(w.target)) map.set(w.target, w);
  return map;
}
const enVocab = vocab(packs['en-vi']);
const jaVocab = vocab(packs['ja-vi']);
const zhVocab = vocab(packs['zh-vi']);
const VOCABS = { 'en-vi': enVocab, 'ja-vi': jaVocab, 'zh-vi': zhVocab };

// ---------- 1-3. Tiếng Nhật: JMdict / pitch / KANJIDIC2 ----------
const ja = readJson('src/content/lexicon/ja.json');
ok('JMdict: khóa ja.json chỉ gồm từ ja thật; jmGloss phủ đúng 146 từ, có cho từ phổ biến', () => {
  for (const k of Object.keys(ja)) assert.ok(jaVocab.has(k), `khóa lạ: ${k}`);
  const withGloss = Object.values(ja).filter((e) => e.jmGloss).length;
  assert.equal(withGloss, 146);
  for (const w of ['ねこ', 'いぬ', 'りんご'])
    assert.ok(ja[w]?.jmGloss, `${w} thiếu jmGloss`);
  assert.equal(ja['ずずずダミー'], undefined);
});
ok('kanjium pitch: có cho từ phổ biến (kể cả pitch 0), vắng cho từ bịa; phủ đúng 137 từ', () => {
  assert.equal(ja['ねこ']?.pitch, 1);
  assert.equal(ja['いぬ']?.pitch, 2);
  assert.equal(ja['りんご']?.pitch, 0, 'pitch 0 (heiban) là giá trị hợp lệ');
  assert.equal(ja['りんご']?.pitchReading, 'りんご');
  const withPitch = Object.values(ja).filter((e) => e.pitch != null).length;
  assert.equal(withPitch, 137);
  for (const e of Object.values(ja))
    if (e.pitch != null) {
      assert.ok(Number.isInteger(e.pitch) && e.pitch >= 0, 'pitch không hợp lệ');
      assert.ok(e.pitchReading, 'có pitch mà thiếu pitchReading');
    }
  assert.equal(ja['flibberty']?.pitch, undefined);
  assert.equal(ja['ねこねこダミー']?.pitch, undefined);
});
ok('KANJIDIC2: đúng 58 kanji thật của từ vựng ja, mỗi mục có gloss + số nét', () => {
  const kd = readJson('src/content/lexicon/kanjidic-ja.json');
  const expected = new Set();
  for (const t of jaVocab.keys())
    for (const ch of t) if (/[\u4e00-\u9fff]/.test(ch)) expected.add(ch);
  assert.deepEqual(Object.keys(kd).sort(), [...expected].sort());
  assert.equal(Object.keys(kd).length, 58);
  for (const [ch, info] of Object.entries(kd)) {
    assert.ok(info.gloss, `${ch} thiếu gloss`);
    assert.ok(info.strokes >= 1, `${ch} thiếu số nét`);
  }
});

// ---------- 4-6. Tatoeba ----------
const examples = readJson('src/content/examples.json');
const candidates = readJson('src/content/examples-candidates.json');
ok('Tatoeba: 157 câu đã duyệt — khóa ⊆ từ vựng thật, id nằm trong approvedSentenceIds của chính file dữ liệu, đủ cờ duyệt + tác giả + giấy phép', () => {
  assert.ok(Array.isArray(examples.approvedSentenceIds));
  const approvedIds = new Set(examples.approvedSentenceIds);
  assert.equal(approvedIds.size, examples.approvedSentenceIds.length, 'id duyệt bị trùng');
  let total = 0;
  for (const [courseId, targets] of Object.entries(examples.courses)) {
    for (const [target, sentences] of Object.entries(targets)) {
      assert.ok(VOCABS[courseId].has(target), `target lạ: ${courseId}/${target}`);
      assert.equal(sentences.length, 1, 'mỗi target đúng 1 câu');
      const s = sentences[0];
      total += 1;
      assert.ok(approvedIds.has(s.id), `câu ${s.id} không nằm trong danh sách đã duyệt`);
      assert.equal(s.reviewed, true);
      assert.equal(s.reviewStatus, 'human-reviewed');
      assert.ok(s.author, `câu ${s.id} thiếu tác giả`);
      assert.ok(['CC BY 2.0 FR', 'CC0 1.0'].includes(s.license), `giấy phép lạ: ${s.license}`);
      assert.ok(!('audio' in s) && !('audioUrl' in s), 'không được dùng audio Tatoeba');
    }
  }
  assert.equal(total, 157, '157 cặp target–câu đã duyệt');
  assert.equal(
    approvedIds.size,
    155,
    '155 câu Tatoeba duy nhất (2 câu phục vụ 2 target: five/have và soup/cold)'
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(examples.courses).map(([c, t]) => [c, Object.keys(t).length])
    ),
    { 'en-vi': 57, 'ja-vi': 39, 'zh-vi': 61 }
  );
});
ok('Tatoeba: mọi câu chứa đúng từ đích, đạt giới hạn độ dài, và khớp 1-1 ứng viên gốc', () => {
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [courseId, targets] of Object.entries(examples.courses)) {
    for (const [target, sentences] of Object.entries(targets)) {
      const s = sentences[0];
      if (courseId === 'en-vi') {
        assert.ok(
          new RegExp(`\\b${escapeRe(target)}\\b`, 'i').test(s.text),
          `${target} không xuất hiện theo biên từ trong: ${s.text}`
        );
        assert.ok(s.text.split(/\s+/).length <= 8, `câu Anh quá dài: ${s.text}`);
        assert.ok(s.text.length <= 48, `câu Anh quá 48 ký tự: ${s.text}`);
      } else if (courseId === 'ja-vi') {
        assert.ok(s.text.includes(target), `${target} không có trong: ${s.text}`);
        assert.ok(s.text.length <= 18, `câu Nhật quá 18 ký tự: ${s.text}`);
      } else {
        assert.ok(s.text.includes(target), `${target} không có trong: ${s.text}`);
        assert.ok(s.text.length <= 12, `câu Trung quá 12 ký tự: ${s.text}`);
      }
      const c = candidates[courseId]?.[target]?.[0];
      assert.ok(c, `không tìm thấy ứng viên gốc cho ${courseId}/${target}`);
      assert.equal(s.id, c.id);
      assert.equal(s.text, c.text);
      assert.equal(s.author, c.author);
      assert.equal(s.license, c.license);
      assert.equal(c.reviewStatus, 'machine-filtered', 'ứng viên gốc phải giữ nhãn lọc máy');
    }
  }
});
ok('Tatoeba: danh sách duyệt dạng text khớp đúng tập id đã nhúng', () => {
  const list = readText('scripts/tatoeba-approved-list.txt');
  const ids = [...list.matchAll(/\((\d+), /g)].map((m) => Number(m[1]));
  assert.equal(ids.length, 157, '157 dòng gán target–câu');
  assert.deepEqual(new Set(ids), new Set(examples.approvedSentenceIds));
});

// ---------- 7-8. Lingua Libre ----------
const lingua = readJson('src/content/lingua-libre.json');
ok('Lingua Libre: mọi bản ghi có giấy phép thuộc danh sách cho phép (CC0/CC BY), target là từ thật, file local đúng dung lượng', () => {
  const allowed = ['CC0', 'CC BY', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0'];
  const entries = Object.entries(lingua);
  assert.equal(entries.length, 4);
  let bytes = 0;
  for (const [key, rec] of entries) {
    assert.ok(allowed.includes(rec.licenseShortName), `giấy phép không được phép: ${rec.licenseShortName}`);
    assert.equal(key, `${rec.courseId}:${rec.target}`);
    assert.ok(VOCABS[rec.courseId].has(rec.target), `target lạ: ${key}`);
    assert.ok(rec.speaker && rec.commonsFilePage.includes('commons.wikimedia.org'));
    const file = path.join(root, rec.localFile);
    assert.ok(existsSync(file), `thiếu file ${rec.localFile}`);
    assert.equal(statSync(file).size, rec.bytes, `${rec.localFile} sai dung lượng`);
    bytes += rec.bytes;
  }
  assert.equal(bytes, 17520);
});
ok('Lingua Libre: manifest giọng thật khớp metadata và tách riêng khỏi TTS mặc định', () => {
  const manifest = readText('src/content/real-audio-manifest.ts');
  for (const key of Object.keys(lingua)) assert.ok(manifest.includes(`"${key}"`), `manifest thiếu ${key}`);
  const audio = readText('src/lib/audio.ts');
  assert.ok(audio.includes('hasRealVoice') && audio.includes('speakRealVoice'));
  assert.ok(audio.includes('real-audio-manifest'), 'audio.ts phải nạp manifest giọng thật riêng');
});

// ---------- 9. Twemoji ----------
ok('Twemoji: subset asset = đúng tập emoji đang dùng trừ 7 số khoanh tròn không thuộc Twemoji; file PNG tồn tại', () => {
  const src = readText('src/content/twemoji-assets.ts');
  const assetsSection = src.split('export const TWEMOJI_ASSETS')[1].split('export const TWEMOJI_CODEPOINTS')[0];
  const assetKeys = [...assetsSection.matchAll(/"([^"]+)":\s*require/g)].map((m) => m[1]);
  const used = new Set();
  for (const pack of Object.values(packs))
    for (const sec of pack.sections)
      for (const u of sec.units) for (const w of u.words) if (w.emoji) used.add(w.emoji);
  assert.equal(used.size, 299);
  const missing = [...used].filter((e) => !assetKeys.includes(e)).sort();
  assert.deepEqual(missing, ['⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑳'].sort());
  assert.equal(assetKeys.length, 292);
  const cpSection = src.split('export const TWEMOJI_CODEPOINTS')[1];
  for (const emoji of assetKeys) {
    const cp = cpSection.match(new RegExp(`"${emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*"([0-9a-f-]+)"`))?.[1];
    assert.ok(cp, `thiếu codepoint cho ${emoji}`);
    assert.ok(existsSync(path.join(root, 'assets/twemoji', `${cp}.png`)), `thiếu PNG ${cp}.png`);
  }
});

// ---------- 10-11. Nối dây + ghi công ----------
ok('Nối dây Đợt 2: WordMeta hiện pitch/JMdict/KANJIDIC2 + câu ví dụ; Sổ tay dùng Twemoji + nút giọng thật; Nghe/Đọc có nút giọng thật', () => {
  const wm = readText('src/components/word-meta.tsx');
  for (const s of ['Trọng âm:', 'Tham khảo JMdict', 'Kanji ', 'exampleSentence', 'Ví dụ:'])
    assert.ok(wm.includes(s), `word-meta thiếu: ${s}`);
  const guide = readText('src/app/guidebook/[unitId].tsx');
  assert.ok(guide.includes('TwemojiImage') && guide.includes('RealVoiceButton'));
  assert.ok(readText('src/app/skills-listen.tsx').includes('RealVoiceButton'));
  assert.ok(readText('src/app/skills-read.tsx').includes('RealVoiceButton'));
  const lex = readText('src/lib/lexicon.ts');
  assert.ok(lex.includes('kanjidic-ja.json') && lex.includes('examples.json'));
});
ok('Màn Nguồn dữ liệu: đủ ghi công EDRDG + Uros O. nguyên văn + Tatoeba + Twemoji + Lingua Libre', () => {
  const screen = readText('src/app/data-sources.tsx');
  for (const s of [
    'Electronic Dictionary Research and Development Group (EDRDG)',
    'https://www.edrdg.org/edrdg/licence.html',
    'The pitch accent notation, verb particle data, phonetics, homonyms and other additions or modifications to EDICT, KANJIDIC or KRADFILE were provided by Uros O. through his free database.',
    'Tatoeba',
    'CC BY 2.0 FR',
    'Twemoji',
    'CC BY 4.0',
    'Lingua Libre',
    'CC0',
  ])
    assert.ok(screen.includes(s), `màn Nguồn thiếu: ${s}`);
});

// ---------- 12. Baseline ----------
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

console.log(`\nPASS test-integration-2: ${groups} nhóm kiểm tra đạt.`);
