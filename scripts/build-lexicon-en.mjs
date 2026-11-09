#!/usr/bin/env node
/**
 * build-lexicon-en.mjs — Trích SUBSET dữ liệu tiếng Anh cho đúng 216 từ vựng
 * hiện có của Piglingo Kids (src/content/packs/en-vi.json, trường `target`
 * trong pack.sections[].units[].words[]; khớp không phân biệt hoa thường,
 * khóa lưu theo dạng thường).
 *
 * Script KHÔNG tải mạng: nó đọc các file nguồn ĐÃ TẢI SẴN trong thư mục
 * nguồn (mặc định /tmp/lex-en, đổi bằng biến môi trường LEX_EN_DIR) và sinh
 * ra src/content/lexicon/en.json. File thô của nguồn KHÔNG nằm trong repo.
 *
 * NGUỒN (URL chính thức đã dùng ngày 2026-11-09 — xem thêm
 * scripts/lexicon-sources-en.md):
 *
 * 1. ipa-dict — en_US (MIT) — CHỈ dùng en_US; TUYỆT ĐỐI không dùng en_UK (GPL).
 *    https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt
 *    -> /tmp/lex-en/en_US.txt   (cột: word <TAB> /IPA/ [, /biến thể/ ...])
 *    Lấy biến thể phát âm ĐẦU TIÊN cho mỗi từ.
 *
 * 2. ECDICT (MIT, skywind3000/ECDICT)
 *    https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
 *    -> /tmp/lex-en/ecdict.csv
 *    Lấy: phonetic (CHỈ dự phòng khi ipa-dict thiếu; bọc trong /.../ cho đồng
 *    dạng với ipa-dict nếu nguồn chưa có), frq = hạng tần suất COCA
 *    (frq = 0 trong ECDICT nghĩa là "không có hạng" -> bỏ qua, không ghi 0),
 *    gloss = dòng ĐẦU TIÊN của trường definition (ECDICT ngăn dòng bằng
 *    ký tự "\n" literal). Trường exchange (mục "0:<lemma>") được dùng để
 *    truy lemma khi tra CEFR-J cho các dạng biến đổi (asked -> ask).
 *    Chỉ lấy dòng ECDICT khớp TRỰC TIẾP với từ đích cho phonetic/frq/gloss.
 *
 * 3. CEFR-J Wordlist Version 1.6 (Tono Laboratory, Tokyo University of
 *    Foreign Studies — dùng nghiên cứu + thương mại kèm ghi công)
 *    Trang tải chính thức: https://www.cefr-j.org/download_eng.html
 *    File: https://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip
 *    -> /tmp/lex-en/CEFRJ_wordlist_ver1.6.zip (bên trong: "CEFR-J Wordlist
 *       Ver1.6.xlsx", sheet "ALL_sep": headword | pos | CEFR)
 *    Chuẩn hóa cấp độ về A1/A2/B1/B2 theo chữ+số chính (A1.1 -> A1 ...).
 *    Một headword có nhiều cấp theo từ loại -> lấy cấp THẤP NHẤT.
 *    Từ đích không có headword trực tiếp (dạng quá khứ/phân từ/danh từ số
 *    nhiều...) -> tra tiếp lemma theo trường exchange của ECDICT (1 bước).
 *
 * 4. NGSL 1.2 + New Dolch List 1.1 (Browne, Culligan & Phillips,
 *    CC BY-SA 4.0) — trang chính thức newgeneralservicelist.com:
 *    NGSL: https://www.newgeneralservicelist.com/new-general-service-list
 *      https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv
 *        -> /tmp/lex-en/NGSL_12_stats.csv (Lemma, SFI Rank -> ngslRank)
 *      https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv
 *        -> /tmp/lex-en/NGSL_12_lemmatized_for_teaching.csv
 *        (mỗi dòng: headword + mọi dạng biến đổi chính thức của nó; dùng để
 *        ánh xạ dạng biến đổi -> headword rồi lấy rank của headword)
 *    NDL:  https://www.newgeneralservicelist.com/new-dolch-list
 *      https://www.newgeneralservicelist.com/s/NDL_11_stats.csv
 *        -> /tmp/lex-en/NDL_11_stats.csv (874 headword)
 *      https://www.newgeneralservicelist.com/s/NDL_11_lemmatized_for_teaching.txt
 *        -> /tmp/lex-en/NDL_11_lemmatized_for_teaching.txt
 *        (dolch = true nếu từ đích là headword NDL hoặc là một dạng biến đổi
 *        được liệt kê chính thức của headword NDL)
 *
 * ĐẦU RA: src/content/lexicon/en.json
 *   { "<từ thường>": { "ipa"?, "cefr"?: "A1"|"A2"|"B1"|"B2", "dolch"?: true,
 *                       "ngslRank"?: number, "frq"?: number, "gloss"?: string } }
 *   Chỉ ghi field có dữ liệu thật từ nguồn; từ không khớp nguồn nào thì
 *   không tạo mục. Cụm nhiều từ chỉ khớp nguyên cụm, không tách từ.
 *
 * Chạy: node scripts/build-lexicon-en.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = process.env.LEX_EN_DIR || '/tmp/lex-en';
const PACK_PATH = path.join(REPO_ROOT, 'src/content/packs/en-vi.json');
const OUT_PATH = path.join(REPO_ROOT, 'src/content/lexicon/en.json');

function needFile(name, hint) {
  const p = path.join(SRC_DIR, name);
  if (!fs.existsSync(p)) {
    throw new Error(`Thiếu file nguồn ${p}\n  Tải tại: ${hint}`);
  }
  return p;
}

/* ---------------- Từ đích ---------------- */
function loadTargets() {
  const raw = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
  const pack = raw.pack ?? raw;
  const set = new Set();
  for (const sec of pack.sections ?? []) {
    for (const unit of sec.units ?? []) {
      for (const w of unit.words ?? []) {
        if (w && typeof w.target === 'string' && w.target.trim()) {
          set.add(w.target.trim().toLowerCase());
        }
      }
    }
  }
  return [...set].sort();
}

/* ---------------- CSV parser (hỗ trợ quote, dấu phẩy/xuống dòng trong field) ---------------- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ---------------- ZIP reader tối thiểu (stored + deflate) ---------------- */
function readZip(buf) {
  // Tìm End Of Central Directory
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Không tìm thấy EOCD trong file zip');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Central directory hỏng');
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    entries.set(name, method === 8 ? zlib.inflateRawSync(comp) : Buffer.from(comp));
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function xmlUnescape(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/* Đọc sheet ALL_sep của CEFR-J xlsx (Buffer) -> Map headwordLower -> level */
function parseCefrXlsx(xlsxBuf) {
  const files = readZip(xlsxBuf);
  // shared strings
  const shared = [];
  const ssXml = files.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let txt = '';
    for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) txt += xmlUnescape(t[1]);
    shared.push(txt);
  }
  // tìm sheet ALL_sep qua workbook.xml + rels
  const wbXml = files.get('xl/workbook.xml').toString('utf8');
  let rid = null;
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const tag = m[0];
    if (/name="ALL_sep"/.test(tag)) {
      rid = tag.match(/r:id="(rId\d+)"/)?.[1];
      break;
    }
  }
  if (!rid) throw new Error('Không thấy sheet ALL_sep trong CEFR-J xlsx');
  const relsXml = files.get('xl/_rels/workbook.xml.rels').toString('utf8');
  let sheetPath = null;
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (tag.includes(`Id="${rid}"`)) {
      sheetPath = 'xl/' + tag.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//, '');
      break;
    }
  }
  const sheetXml = files.get(sheetPath)?.toString('utf8');
  if (!sheetXml) throw new Error(`Không đọc được ${sheetPath} trong CEFR-J xlsx`);

  const ORDER = { A1: 1, A2: 2, B1: 3, B2: 4 };
  const map = new Map();
  for (const rowM of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cM of rowM[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cM[1], inner = cM[2] ?? '';
      const col = attrs.match(/r="([A-Z]+)\d+"/)?.[1];
      if (!col) continue;
      let val = null;
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (/t="s"/.test(attrs) && v != null) val = shared[parseInt(v, 10)];
      else if (/t="inlineStr"/.test(attrs)) {
        let txt = '';
        for (const t of inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) txt += xmlUnescape(t[1]);
        val = txt;
      } else if (v != null) val = xmlUnescape(v);
      if (val != null) cells[col] = val;
    }
    const head = (cells.A ?? '').trim().toLowerCase();
    const lvlRaw = (cells.C ?? '').trim();
    const lvl = lvlRaw.match(/^([AB][12])/)?.[1]; // chuẩn hóa A1.1 -> A1, B2.x -> B2
    if (!head || !lvl || head === 'headword') continue;
    if (!map.has(head) || ORDER[lvl] < ORDER[map.get(head)]) map.set(head, lvl);
  }
  return map;
}

/* ---------------- 1) ipa-dict en_US ---------------- */
function loadIpaDict() {
  const p = needFile('en_US.txt', 'https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt');
  const map = new Map();
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const word = line.slice(0, tab).trim().toLowerCase();
    const ipaAll = line.slice(tab + 1).trim();
    if (!word || !ipaAll || map.has(word)) continue;
    map.set(word, ipaAll.split(',')[0].trim()); // biến thể đầu tiên
  }
  return map;
}

/* ---------------- 2) ECDICT ---------------- */
function firstGlossLine(definition) {
  if (!definition) return '';
  // ECDICT ngăn các nghĩa bằng ký tự "\n" literal (2 ký tự) hoặc newline thật
  const first = definition.split(/\\n|\r?\n/).map(s => s.trim()).find(s => s);
  return first ?? '';
}
function exchangeLemma(exchange) {
  // dạng: "0:advise/1:dp/p:advised/d:advised" -> "advise"
  if (!exchange) return null;
  const m = exchange.match(/(?:^|\/)0:([^/]+)/) || exchange.match(/^0:([^/]+)/);
  return m ? m[1].trim().toLowerCase() : null;
}
function loadEcdict(targetSet) {
  const p = needFile('ecdict.csv', 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv');
  const rows = parseCsv(fs.readFileSync(p, 'utf8'));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const word = (r[idx.word] ?? '').trim().toLowerCase();
    if (!word || !targetSet.has(word) || map.has(word)) continue;
    const frqNum = parseInt((r[idx.frq] ?? '').trim(), 10);
    map.set(word, {
      phonetic: (r[idx.phonetic] ?? '').trim(),
      frq: Number.isFinite(frqNum) && frqNum > 0 ? frqNum : null, // 0 = không có hạng
      gloss: firstGlossLine(r[idx.definition] ?? ''),
      lemma: exchangeLemma(r[idx.exchange] ?? ''),
    });
  }
  return map;
}

/* ---------------- 3) CEFR-J ---------------- */
function loadCefr() {
  const zipPath = path.join(SRC_DIR, 'CEFRJ_wordlist_ver1.6.zip');
  const xlsxPath = path.join(SRC_DIR, 'CEFR-J Wordlist Ver1.6.xlsx');
  if (fs.existsSync(zipPath)) {
    const entries = readZip(fs.readFileSync(zipPath));
    for (const [name, buf] of entries) {
      if (name.toLowerCase().endsWith('.xlsx')) return parseCefrXlsx(buf);
    }
    throw new Error('Trong CEFRJ_wordlist_ver1.6.zip không có file .xlsx');
  }
  if (fs.existsSync(xlsxPath)) return parseCefrXlsx(fs.readFileSync(xlsxPath));
  throw new Error(`Thiếu CEFR-J: cần ${zipPath} (tải: https://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip)`);
}

/* ---------------- 4) NGSL + NDL ---------------- */
function loadNgsl() {
  const statsP = needFile('NGSL_12_stats.csv', 'https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv');
  const teachP = needFile('NGSL_12_lemmatized_for_teaching.csv', 'https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv');
  const rank = new Map();
  const statsText = fs.readFileSync(statsP, 'utf8').replace(/^﻿/, '');
  for (const row of parseCsv(statsText)) {
    if (!row[0] || row[0].startsWith('##') || row[0] === 'Lemma') continue;
    const n = parseInt(row[1], 10);
    if (Number.isFinite(n)) rank.set(row[0].trim().toLowerCase(), n);
  }
  const form2lemma = new Map();
  for (const line of fs.readFileSync(teachP, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('##')) continue;
    const forms = s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!forms.length) continue;
    for (const f of forms) if (!form2lemma.has(f)) form2lemma.set(f, forms[0]);
  }
  return { rank, form2lemma };
}
function loadNdl() {
  const statsP = needFile('NDL_11_stats.csv', 'https://www.newgeneralservicelist.com/s/NDL_11_stats.csv');
  const teachP = needFile('NDL_11_lemmatized_for_teaching.txt', 'https://www.newgeneralservicelist.com/s/NDL_11_lemmatized_for_teaching.txt');
  const heads = new Set();
  const statsText = fs.readFileSync(statsP, 'utf8').replace(/^﻿/, '');
  for (const row of parseCsv(statsText)) {
    if (!row[1] || row[1] === 'Word') continue;
    heads.add(row[1].trim().toLowerCase());
  }
  const form2head = new Map();
  for (const line of fs.readFileSync(teachP, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('##')) continue;
    const forms = s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!forms.length) continue;
    for (const f of forms) if (!form2head.has(f)) form2head.set(f, forms[0]);
  }
  return { heads, form2head };
}

/* ---------------- Ghép dữ liệu ---------------- */
function main() {
  const targets = loadTargets();
  const targetSet = new Set(targets);
  const ipaDict = loadIpaDict();
  const ecdict = loadEcdict(targetSet);
  const cefr = loadCefr();
  const ngsl = loadNgsl();
  const ndl = loadNdl();

  const out = {};
  const counts = { ipa: 0, cefr: 0, dolch: 0, ngslRank: 0, frq: 0, gloss: 0, entries: 0 };

  for (const w of targets) {
    const entry = {};
    const ec = ecdict.get(w);

    // ipa: ipa-dict en_US trước; thiếu thì dự phòng phonetic của ECDICT
    if (ipaDict.has(w)) entry.ipa = ipaDict.get(w);
    else if (ec?.phonetic) entry.ipa = ec.phonetic.startsWith('/') ? ec.phonetic : `/${ec.phonetic}/`;

    // cefr: headword trực tiếp; không có thì qua lemma (ECDICT exchange)
    if (cefr.has(w)) entry.cefr = cefr.get(w);
    else if (ec?.lemma && cefr.has(ec.lemma)) entry.cefr = cefr.get(ec.lemma);

    // dolch: headword NDL hoặc dạng biến đổi chính thức của headword NDL
    if (ndl.heads.has(w) || (ndl.form2head.has(w) && ndl.heads.has(ndl.form2head.get(w)))) {
      entry.dolch = true;
    }

    // ngslRank: lemma trực tiếp hoặc qua bảng dạng biến đổi chính thức
    if (ngsl.rank.has(w)) entry.ngslRank = ngsl.rank.get(w);
    else if (ngsl.form2lemma.has(w) && ngsl.rank.has(ngsl.form2lemma.get(w))) {
      entry.ngslRank = ngsl.rank.get(ngsl.form2lemma.get(w));
    }

    // frq + gloss: chỉ từ dòng ECDICT khớp trực tiếp
    if (ec?.frq) entry.frq = ec.frq;
    if (ec?.gloss) entry.gloss = ec.gloss;

    if (Object.keys(entry).length === 0) continue; // không bịa mục rỗng
    out[w] = entry;
    counts.entries++;
    for (const k of Object.keys(counts)) if (k !== 'entries' && entry[k] !== undefined) counts[k]++;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const total = targets.length;
  const pct = n => `${n}/${total} (${(100 * n / total).toFixed(1)}%)`;
  console.log(`Từ đích duy nhất (target, dạng thường): ${total}`);
  console.log(`Mục được ghi vào en.json:              ${counts.entries}/${total}`);
  console.log(`  ipa:      ${pct(counts.ipa)}`);
  console.log(`  cefr:     ${pct(counts.cefr)}`);
  console.log(`  dolch:    ${pct(counts.dolch)}`);
  console.log(`  ngslRank: ${pct(counts.ngslRank)}`);
  console.log(`  frq:      ${pct(counts.frq)}`);
  console.log(`  gloss:    ${pct(counts.gloss)}`);
  console.log(`Đã ghi: ${OUT_PATH}`);
  console.log('\nKiểm tra tay vài từ phổ biến:');
  for (const w of ['dog', 'cat', 'apple', 'beautiful']) {
    console.log(`  ${w}: ${out[w] ? JSON.stringify(out[w]) : '(không có trong 216 từ đích hoặc không khớp nguồn nào)'}`);
  }
}

main();
