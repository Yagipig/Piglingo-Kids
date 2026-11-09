/**
 * Tải dữ liệu THỨ TỰ NÉT THẬT cho khu Luyện Viết (Piglingo Kids):
 *
 * - Tiếng Trung: Hanzi Writer data (hanzi-writer-data@2.0 trên jsDelivr).
 *   Dữ liệu nét của Hanzi Writer được xây từ phông chữ Arphic — giấy phép
 *   Arphic Public License (mã dự án hanzi-writer là MIT). Chỉ lấy ĐÚNG
 *   các chữ xuất hiện trong từ vựng của khóa zh-vi, và chuẩn hoá toạ độ
 *   về hộp bao riêng của từng chữ (lật trục Y về hệ SVG) để app vẽ trực
 *   tiếp bằng react-native-svg.
 * - Tiếng Nhật: KanjiVG (https://kanjivg.tagaini.net) — giấy phép
 *   Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0),
 *   © Ulrich Apel và các cộng tác viên KanjiVG. Chỉ lấy ĐÚNG các chữ
 *   (kana + kanji) xuất hiện trong từ vựng của khóa ja-vi; giữ nguyên
 *   toạ độ gốc 109x109 của KanjiVG, trích các path nét theo đúng thứ
 *   tự s1, s2, ...
 *
 * Chạy: node scripts/build-strokes.mjs
 * Kết quả: src/content/strokes-zh.json, src/content/strokes-ja.json
 * Cấu trúc mỗi file: { "<chữ>": { "w": number, "h": number, "strokes": string[] } }
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function vocabChars(courseId) {
  const pack = JSON.parse(
    readFileSync(path.join(root, 'src/content/packs', `${courseId}.json`), 'utf8'),
  );
  const chars = new Set();
  for (const section of pack.sections) {
    for (const unit of section.units) {
      for (const word of unit.words) {
        for (const ch of word.target) {
          const cp = ch.codePointAt(0);
          const isCjk = cp >= 0x4e00 && cp <= 0x9fff;
          const isKana = cp >= 0x3040 && cp <= 0x30ff;
          if (isCjk || isKana) chars.add(ch);
        }
      }
    }
  }
  return [...chars];
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Dùng curl (ổn định trong môi trường này; Node fetch với jsDelivr bị
// HeadersTimeout). 404 -> null (chữ không có trong nguồn), lỗi khác -> thử lại.
async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const { stdout } = await execFileAsync(
        'curl',
        ['-sL', '--max-time', '25', '-w', '\n%{http_code}', url],
        { maxBuffer: 4 * 1024 * 1024 },
      );
      const nl = stdout.lastIndexOf('\n');
      const code = stdout.slice(nl + 1).trim();
      if (code === '404') return null;
      if (code !== '200') throw new Error(`HTTP ${code}`);
      return stdout.slice(0, nl);
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return null;
}

async function mapPool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

/* ---------- Hanzi Writer: chuẩn hoá paths (lật Y, dời về gốc hộp bao) ---------- */

function tokenizePath(d) {
  // Tách lệnh (chữ cái) và số; dữ liệu Hanzi Writer chỉ dùng M/Q/L/Z tuyệt đối.
  return d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
}

function normalizeHanziChar(strokes) {
  const parsed = strokes.map(tokenizePath);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const tokens of parsed) {
    let n = 0;
    for (const tok of tokens) {
      if (/^[A-Za-z]$/.test(tok)) continue;
      const v = Number(tok);
      if (n % 2 === 0) {
        minX = Math.min(minX, v);
        maxX = Math.max(maxX, v);
      } else {
        minY = Math.min(minY, v);
        maxY = Math.max(maxY, v);
      }
      n += 1;
    }
  }
  const out = parsed.map((tokens) => {
    let n = 0;
    return tokens
      .map((tok) => {
        if (/^[A-Za-z]$/.test(tok)) return tok;
        const v = Number(tok);
        const mapped = n % 2 === 0 ? Math.round(v - minX) : Math.round(maxY - v);
        n += 1;
        return String(mapped);
      })
      .join(' ');
  });
  return {
    w: Math.max(1, Math.round(maxX - minX)),
    h: Math.max(1, Math.round(maxY - minY)),
    strokes: out,
  };
}

/* ---------- KanjiVG: trích path nét theo thứ tự ---------- */

function parseKanjiVg(svg) {
  const found = [];
  const tagRe = /<path\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(svg)) !== null) {
    const tag = m[0];
    const id = /id="kvg:[^"]*-s(\d+)"/.exec(tag);
    // Chú ý: phải có khoảng trắng trước d= — nếu không sẽ bắt nhầm đuôi của id="..."
    const d = /\sd="([^"]+)"/.exec(tag);
    if (id && d) found.push({ n: Number(id[1]), d: d[1] });
  }
  found.sort((a, b) => a.n - b.n);
  return found.map((f) => f.d);
}

/* ---------- Chạy ---------- */

async function buildZh() {
  const chars = vocabChars('zh-vi');
  console.log(`zh-vi: ${chars.length} chữ cần dữ liệu nét`);
  const missing = [];
  const data = {};
  await mapPool(chars, 10, async (ch) => {
    const url = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(ch)}.json`;
    const text = await fetchText(url);
    if (!text) {
      missing.push(ch);
      return;
    }
    const json = JSON.parse(text);
    if (!Array.isArray(json.strokes) || json.strokes.length === 0) {
      missing.push(ch);
      return;
    }
    data[ch] = normalizeHanziChar(json.strokes);
  });
  const file = path.join(root, 'src/content/strokes-zh.json');
  writeFileSync(file, JSON.stringify(data));
  console.log(
    `zh-vi: lấy được ${Object.keys(data).length}/${chars.length} chữ -> ${file}` +
      (missing.length ? ` | thiếu: ${missing.join(' ')}` : ''),
  );
  return { total: chars.length, got: Object.keys(data).length, missing };
}

async function buildJa() {
  const chars = vocabChars('ja-vi');
  console.log(`ja-vi: ${chars.length} chữ cần dữ liệu nét`);
  const missing = [];
  const data = {};
  await mapPool(chars, 10, async (ch) => {
    const hex = ch.codePointAt(0).toString(16).padStart(5, '0');
    const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
    const text = await fetchText(url);
    if (!text) {
      missing.push(ch);
      return;
    }
    const strokes = parseKanjiVg(text);
    if (strokes.length === 0) {
      missing.push(ch);
      return;
    }
    data[ch] = { w: 109, h: 109, strokes };
  });
  const file = path.join(root, 'src/content/strokes-ja.json');
  writeFileSync(file, JSON.stringify(data));
  console.log(
    `ja-vi: lấy được ${Object.keys(data).length}/${chars.length} chữ -> ${file}` +
      (missing.length ? ` | thiếu: ${missing.join(' ')}` : ''),
  );
  return { total: chars.length, got: Object.keys(data).length, missing };
}

const zh = await buildZh();
const ja = await buildJa();
console.log('TỔNG KẾT', JSON.stringify({ zh, ja }));
