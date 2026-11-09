#!/usr/bin/env node
// build-lexicon-cjk.mjs — Build Piglingo CJK lexicon subsets (Đợt 1).
//
// Extracts ONLY the entries matching the app's existing zh/ja vocabulary
// (src/content/packs/zh-vi.json, ja-vi.json) from open sources downloaded
// to /tmp/lex-cjk/ (raw source files are NEVER committed to the repo).
//
// Sources (see scripts/lexicon-sources-cjk.md for full provenance):
//   1. CC-CEDICT via MDBG (CC BY-SA 4.0)
//      https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
//   2. HSK mapping — drkameleon/complete-hsk-vocabulary (MIT; mapping layer only)
//      https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json
//      Priority: "newest-*" tiers (newest exam syllabus, repo commit
//      2026-02-10 "matching 2026 syllabus") → fallback "new-*" (GF0025-2021).
//   3. JLPT labels — Tanos / Jonathan Waller lists (CC BY) via mirror
//      jamsinclair/open-anki-jlpt-decks (decks based on tanos.co.uk)
//      https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n{5,4,3,2,1}.csv
//   4. Unihan (Unicode License v3), Unicode 18.0.0
//      https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
//      Fields are located BY FILE NAME + FIELD NAME (positions vary by version):
//        Unihan_Readings.txt    → kDefinition, kMandarin, kJapaneseOn, kJapaneseKun
//        Unihan_IRGSources.txt  → kTotalStrokes, kRSUnicode
//   5. wordfreq zipf (data CC BY-SA 4.0, code Apache-2.0) — produced by
//      scripts/build-lexicon-freq.py into /tmp/lex-cjk/freq.json; if that
//      file is missing, the zipf field is simply omitted.
//
// Expected layout in /tmp/lex-cjk/:
//   cedict_1_0_ts_utf-8_mdbg.txt.gz, complete.json, tanos/n{1..5}.csv,
//   unihan/Unihan_*.txt (extracted Unihan.zip), freq.json (optional)
//
// Outputs:
//   src/content/lexicon/zh.json, ja.json, chars-zh.json, chars-ja.json
//
// Usage: node scripts/build-lexicon-cjk.mjs

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "/tmp/lex-cjk";
const OUT_DIR = join(REPO, "src/content/lexicon");

// ---------------------------------------------------------------- vocab ----
function loadPack(file) {
  const pack = JSON.parse(readFileSync(join(REPO, "src/content/packs", file), "utf8"));
  const targets = []; // unique, first-seen order
  const romanization = new Map(); // zh only: target -> app's pinyin (tone marks)
  const have = new Set();
  for (const section of pack.sections ?? [])
    for (const unit of section.units ?? [])
      for (const word of unit.words ?? []) {
        if (!have.has(word.target)) {
          have.add(word.target);
          targets.push(word.target);
          if (word.romanization) romanization.set(word.target, word.romanization);
        }
      }
  return { targets, romanization };
}

const zh = loadPack("zh-vi.json");
const ja = loadPack("ja-vi.json");

// ------------------------------------------------- pinyin numeric → marks ----
const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function markSyllable(syllable) {
  const m = syllable.match(/^(.*?)([1-5])$/);
  if (!m) return syllable.replace(/u:/gi, "ü");
  let [, body, toneStr] = m;
  const tone = Number(toneStr);
  body = body.replace(/u:/gi, "ü").replace(/U:/g, "Ü");
  if (tone === 5) return body; // neutral tone: no mark
  const lower = body.toLowerCase();
  let idx = -1;
  if (lower.includes("a")) idx = lower.indexOf("a");
  else if (lower.includes("e")) idx = lower.indexOf("e");
  else if (lower.includes("ou")) idx = lower.indexOf("ou"); // mark the 'o'
  else {
    // last vowel wins (covers iu → u, ui → i)
    for (let i = lower.length - 1; i >= 0; i--) {
      if ("aeiouü".includes(lower[i])) { idx = i; break; }
    }
  }
  if (idx < 0) return body; // no vowel (e.g. syllabic consonant): strip digit only
  const vowel = lower[idx];
  const marked = TONE_MARKS[vowel]?.[tone - 1];
  if (!marked) return body;
  const replacement = body[idx] === body[idx].toUpperCase() && body[idx] !== body[idx].toLowerCase()
    ? marked.toUpperCase()
    : marked;
  return body.slice(0, idx) + replacement + body.slice(idx + 1);
}

function numericPinyinToMarks(numeric) {
  return numeric
    .split(/\s+/)
    .map((token) => token.split("'").map(markSyllable).join("'"))
    .join(" ");
}

const normPinyin = (s) => (s ?? "").toLowerCase().replace(/[\s']/g, "");

// ------------------------------------------------------------- CC-CEDICT ----
function loadCedict() {
  const raw = gunzipSync(readFileSync(join(SRC, "cedict_1_0_ts_utf-8_mdbg.txt.gz"))).toString("utf8");
  const bySimplified = new Map(); // simp -> [{trad, numeric, marks, defs}]
  let releaseDate = null;
  const lineRe = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/$/;
  for (const lineRaw of raw.split("\n")) {
    const line = lineRaw.replace(/\r$/, ""); // MDBG file uses CRLF
    if (line.startsWith("#")) {
      const dm = line.match(/^#! date=(\S+)/);
      if (dm) releaseDate = dm[1];
      continue;
    }
    const m = line.match(lineRe);
    if (!m) continue;
    const [, trad, simp, numeric, defsRaw] = m;
    const entry = {
      trad,
      numeric,
      marks: numericPinyinToMarks(numeric),
      defs: defsRaw.split("/").map((d) => d.trim()).filter(Boolean),
    };
    if (!bySimplified.has(simp)) bySimplified.set(simp, []);
    bySimplified.get(simp).push(entry);
  }
  return { bySimplified, releaseDate };
}

// Pick the CEDICT entry for a word: prefer the entry whose tone-mark pinyin
// equals the app's own romanization (disambiguates homographs like 便宜
// pian2yi5 "cheap" vs bian4yi2 "convenient"); among matches prefer an
// all-lowercase pinyin entry (common word over capitalised proper noun,
// e.g. 十一 shi2 yi1 "eleven" over Shi2 Yi1 "PRC National Day"); else first.
function pickCedict(entries, appRomanization) {
  if (!entries?.length) return null;
  const want = normPinyin(appRomanization);
  if (want) {
    const matches = entries.filter((e) => normPinyin(e.marks) === want);
    if (matches.length) return matches.find((e) => e.numeric === e.numeric.toLowerCase()) ?? matches[0];
  }
  return entries[0];
}

function glossOf(entry) {
  return entry.defs
    .filter((d) => !/^CL:/.test(d)) // classifier-only segments are not meanings
    .slice(0, 3)
    .map((d) => d.replace(/\s*\(CL:[^)]*\)/g, "").trim()) // drop "(CL:...)" annotations
    .filter(Boolean)
    .join("; ");
}

// ------------------------------------------------------------------ HSK ----
function loadHsk() {
  const data = JSON.parse(readFileSync(join(SRC, "complete.json"), "utf8"));
  const map = new Map(); // simplified -> minimum level (number)
  for (const entry of data) {
    const levels = entry.level ?? [];
    const pick = (family) =>
      levels
        .filter((l) => l.startsWith(family))
        .map((l) => Number(l.slice(family.length)))
        .filter((n) => Number.isFinite(n));
    const newest = pick("newest-"); // newest exam syllabus (2025/2026 revision)
    const gf0025 = pick("new-"); // GF0025-2021 (HSK 3.0)
    const best = newest.length ? Math.min(...newest) : gf0025.length ? Math.min(...gf0025) : null;
    if (best !== null) map.set(entry.simplified, best);
  }
  return map;
}

// ----------------------------------------------------------------- Tanos ----
// Minimal CSV parser (handles quoted fields, embedded commas, "" escapes).
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadJlpt() {
  const byExpression = new Map();
  const byReading = new Map();
  for (const n of [5, 4, 3, 2, 1]) { // easiest first: first hit wins
    const text = readFileSync(join(SRC, "tanos", `n${n}.csv`), "utf8");
    const rows = parseCsv(text);
    const header = rows[0];
    const ei = header.indexOf("expression"), ri = header.indexOf("reading");
    for (const r of rows.slice(1)) {
      const level = `N${n}`;
      if (r[ei] && !byExpression.has(r[ei])) byExpression.set(r[ei], level);
      if (r[ri] && !byReading.has(r[ri])) byReading.set(r[ri], level);
    }
  }
  return { byExpression, byReading };
}

// ---------------------------------------------------------------- Unihan ----
function loadUnihan(charsWanted) {
  let dir = join(SRC, "unihan");
  if (!existsSync(join(dir, "Unihan_Readings.txt"))) {
    execSync(`unzip -o -q ${join(SRC, "Unihan.zip")} -d ${dir}`);
  }
  const data = new Map(); // char -> {field: value}
  const wantedCp = new Set([...charsWanted].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")));
  const files = {
    "Unihan_Readings.txt": ["kDefinition", "kMandarin", "kJapaneseOn", "kJapaneseKun"],
    "Unihan_IRGSources.txt": ["kTotalStrokes", "kRSUnicode"],
  };
  for (const [file, fields] of Object.entries(files)) {
    for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const [cp, field, value] = line.split("\t");
      if (!wantedCp.has(cp) || !fields.includes(field)) continue;
      const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
      if (!data.has(ch)) data.set(ch, {});
      data.get(ch)[field] = value.trim();
    }
  }
  return data;
}

function charEntry(raw, lang) {
  if (!raw) return null;
  const out = {};
  if (raw.kDefinition) out.def = raw.kDefinition;
  if (raw.kTotalStrokes) {
    const n = Number(raw.kTotalStrokes.split(/\s+/)[0]);
    if (Number.isFinite(n)) out.strokes = n;
  }
  if (raw.kRSUnicode) {
    const rad = Number(raw.kRSUnicode.split(".")[0].replace(/[^0-9]/g, ""));
    if (Number.isFinite(rad)) out.radical = rad;
  }
  if (lang === "zh") {
    if (raw.kMandarin) out.reading = raw.kMandarin.split(/\s+/)[0]; // most common reading first
  } else {
    const parts = [raw.kJapaneseOn, raw.kJapaneseKun].filter(Boolean);
    if (parts.length) out.reading = parts.join(" ");
  }
  return Object.keys(out).length ? out : null;
}

// ------------------------------------------------------------------ freq ----
function loadFreq() {
  const p = join(SRC, "freq.json");
  if (!existsSync(p)) {
    console.warn("WARNING: /tmp/lex-cjk/freq.json missing — zipf fields omitted. Run scripts/build-lexicon-freq.py first.");
    return { zh: {}, ja: {} };
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

// ----------------------------------------------------------------- build ----
const cedict = loadCedict();
const hsk = loadHsk();
const jlpt = loadJlpt();
const freq = loadFreq();

const zhOut = {};
for (const target of zh.targets) {
  const out = {};
  const level = hsk.get(target);
  if (level !== undefined) out.hsk = level;
  const entry = pickCedict(cedict.bySimplified.get(target), zh.romanization.get(target));
  if (entry) {
    out.pinyin = entry.marks;
    const gloss = glossOf(entry);
    if (gloss) out.gloss = gloss;
    if (entry.trad !== target) out.trad = entry.trad;
  }
  const z = freq.zh[target];
  if (z !== undefined && z !== 0) out.zipf = z;
  if (Object.keys(out).length) zhOut[target] = out;
}

const jaOut = {};
for (const target of ja.targets) {
  const out = {};
  const level = jlpt.byExpression.get(target) ?? jlpt.byReading.get(target);
  if (level) out.jlpt = level;
  const z = freq.ja[target];
  if (z !== undefined && z !== 0) out.zipf = z;
  if (Object.keys(out).length) jaOut[target] = out;
}

// Character subsets: every distinct character in the vocab that Unihan covers.
const zhChars = [...new Set(zh.targets.join(""))].sort();
const jaChars = [...new Set(ja.targets.join(""))].sort();
const unihan = loadUnihan(new Set([...zhChars, ...jaChars]));

const charsZhOut = {};
for (const ch of zhChars) {
  const e = charEntry(unihan.get(ch), "zh");
  if (e) charsZhOut[ch] = e;
}
const charsJaOut = {};
for (const ch of jaChars) {
  const e = charEntry(unihan.get(ch), "ja");
  if (e) charsJaOut[ch] = e;
}

mkdirSync(OUT_DIR, { recursive: true });
const sorted = (obj) =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const write = (name, obj) => {
  writeFileSync(join(OUT_DIR, name), JSON.stringify(sorted(obj), null, 2) + "\n", "utf8");
  console.log(`wrote src/content/lexicon/${name}: ${Object.keys(obj).length} entries`);
};
write("zh.json", zhOut);
write("ja.json", jaOut);
write("chars-zh.json", charsZhOut);
write("chars-ja.json", charsJaOut);

// ------------------------------------------------------- coverage report ----
const pct = (n, d) => `${n}/${d} (${((100 * n) / d).toFixed(1)}%)`;
const count = (obj, field) => Object.values(obj).filter((v) => v[field] !== undefined).length;
console.log("\nCoverage:");
console.log(`  CC-CEDICT release (header #! date): ${cedict.releaseDate}`);
console.log(`  zh pinyin: ${pct(count(zhOut, "pinyin"), zh.targets.length)}  gloss: ${pct(count(zhOut, "gloss"), zh.targets.length)}  trad(!=simp): ${count(zhOut, "trad")}  hsk: ${pct(count(zhOut, "hsk"), zh.targets.length)}  zipf: ${pct(count(zhOut, "zipf"), zh.targets.length)}`);
console.log(`  ja jlpt: ${pct(count(jaOut, "jlpt"), ja.targets.length)}  zipf: ${pct(count(jaOut, "zipf"), ja.targets.length)}`);
console.log(`  chars-zh: ${Object.keys(charsZhOut).length}/${zhChars.length} distinct chars  chars-ja: ${Object.keys(charsJaOut).length}/${jaChars.length} distinct chars`);
console.log("\nSpot checks:");
for (const w of ["猫", "狗", "便宜", "十一"]) console.log(`  zh ${w}:`, JSON.stringify(zhOut[w]));
for (const w of ["ねこ", "あ", "ありがとう"]) console.log(`  ja ${w}:`, JSON.stringify(jaOut[w]));
console.log("  char 猫 zh:", JSON.stringify(charsZhOut["猫"]), " ja:", JSON.stringify(charsJaOut["猫"]));
