#!/usr/bin/env node
// build-integration2-ja.mjs — Build Piglingo Japanese lexicon enrichment (Đợt 2).
//
// Adds lookup metadata for the app's EXISTING Japanese vocabulary
// (src/content/packs/ja-vi.json — 214 unique targets, read live from the
// pack; nothing is hard-coded) from three open sources downloaded to
// /tmp/lex-ja2/ (raw source files are NEVER committed to the repo):
//
//   1. JMdict (JMdict_e, English edition) — EDRDG, CC BY-SA 4.0
//      http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
//      → jmReading (kana reading, only when different from the target),
//        jmGloss (max 2 short English glosses, secondary lookup only —
//        the app's own Vietnamese meaning is always primary).
//   2. KANJIDIC2 — EDRDG, CC BY-SA 4.0
//      http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz
//      → src/content/lexicon/kanjidic-ja.json (on/kun/gloss/strokes for
//        exactly the kanji that occur in the app's ja vocabulary).
//        Separate from chars-ja.json (Unihan, Đợt 1) — never mixed.
//   3. kanjium accents.txt — CC BY-SA 4.0 (pitch data by Uros O.)
//      https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt
//      → pitch (mora of the accent fall) + pitchReading (the kana the
//        pitch was matched on). A pitch is ONLY taken when the exact
//        (written form, kana reading) pair is attested — by the chosen
//        JMdict entry, or by a kana-only target attested as a kana-form
//        line in accents.txt. Never inferred.
//
// JMdict matching (conservative — no match is better than a wrong match):
//   Candidates are (keb, reb) pairs that honour <re_restr> restrictions:
//   a pair matches when keb === target (written-form match) or
//   reb === target (reading match). Each candidate is scored by:
//     - match class (exact keb > kana headword entry > reb of kanji entry)
//     - JMdict priority codes of the pair (nfXX frequency band first,
//       then news1/ichi1/spec1/gai1 "(P)" markers)
//     - the app's own romanization: for keb-only matches the candidate
//       reading (converted to Hepburn) must agree with one of the app's
//       romanization alternatives, otherwise it is penalised
//       (disambiguates the multiple reading-entries of single-kanji
//       targets like 人/金); for reb matches the reading IS the target,
//       so it always agrees
//     - the app's own Vietnamese meaning, bridged to English by the
//       small keyword table below (VI_NATIVE_KEYWORDS): a candidate
//       whose glosses contain the expected English keyword(s) scores
//       strongly (髪 "hair" beats 紙/神 for かみ "tóc"; 雨 "rain" beats
//       飴 for あめ "mưa")
//     - a cross-link bonus when a kana target shares its Vietnamese
//       meaning with a kanji target of the pack whose written form is
//       the candidate's keb （あめ "mưa" ↔ 雨 "mưa")
//   The best candidate is accepted only when it scores >= 90 AND leads
//   the runner-up by >= 25 points; otherwise the word gets NO JMdict
//   fields (e.g. 金 — かね "money" and きん "gold" tie, so it stays
//   empty). jmGloss prefers glosses that contain a matched keyword
//   (so grammar uses like ところ surface "just (about to)" instead of
//   the unrelated first sense "place"), otherwise the first senses.
//   Single-kana targets whose app "meaning" is just the syllable name
//   (あ = "a", カ = "ka", …) are alphabet lessons, not words: they are
//   skipped entirely. Conjugated forms （食べた, 行きたい, …) have no
//   JMdict headword and correctly stay empty — no stemming, no guessing.
//
// Existing fields in ja.json (jlpt from Tanos, zipf from wordfreq) are
// preserved untouched; this script only ADDS fields to existing
// entries and never creates new word keys.
//
// Usage:
//   mkdir -p /tmp/lex-ja2
//   curl -L -o /tmp/lex-ja2/JMdict_e.gz    http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
//   curl -L -o /tmp/lex-ja2/kanjidic2.xml.gz http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz
//   curl -L -o /tmp/lex-ja2/accents.txt https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt
//   node scripts/build-integration2-ja.mjs

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "/tmp/lex-ja2";
const OUT_DIR = join(REPO, "src/content/lexicon");

// ---------------------------------------------------------------- vocab ----
function loadPack() {
  const pack = JSON.parse(readFileSync(join(REPO, "src/content/packs/ja-vi.json"), "utf8"));
  const words = new Map(); // target -> {native, romanization} (first occurrence wins)
  for (const section of pack.sections ?? [])
    for (const unit of section.units ?? [])
      for (const word of unit.words ?? [])
        if (!words.has(word.target))
          words.set(word.target, {
            native: word.native ?? "",
            romanization: word.romanization ?? "",
          });
  return words;
}
const vocab = loadPack();

// ------------------------------------------------------- kana → romaji ----
// Hepburn, following the app's own conventions (long ō = "ou", long ū =
// "uu", ー repeats the previous vowel, ん = "n").
const KANA_ROMAJI = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
  ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa", ゐ: "wi", ゑ: "we",
};
const DIGRAPH = { ゃ: "ya", ゅ: "yu", ょ: "yo" };
function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function kanaToRomaji(kana) {
  const s = kataToHira(kana);
  let out = "";
  let geminate = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "っ" || c === "ッ") { geminate = true; continue; }
    if (c === "ー") {
      const m = out.match(/[aiueo][^aiueo]*$/);
      if (m) out += m[0][0];
      continue;
    }
    let roma;
    const next = s[i + 1];
    if (next && DIGRAPH[next] && KANA_ROMAJI[c]) {
      if (c === "し") roma = "sh" + DIGRAPH[next].slice(1);
      else if (c === "ち") roma = "ch" + DIGRAPH[next].slice(1);
      else if (c === "じ" || c === "ぢ") roma = "j" + DIGRAPH[next].slice(1);
      else roma = KANA_ROMAJI[c].slice(0, -1) + DIGRAPH[next];
      i++; // consume the small kana
    } else {
      roma = KANA_ROMAJI[c];
      if (roma === undefined) return null; // non-kana character present
    }
    if (geminate && roma) {
      roma = roma.startsWith("ch") ? "t" + roma : roma[0] + roma;
      geminate = false;
    }
    out += roma;
  }
  return out;
}

// ------------------------------------------- Vietnamese → English bridge ----
// The app's meanings are Vietnamese; JMdict glosses are English. This
// table bridges ONLY the meaning words that actually occur in the
// pack's native glosses, so homophones can be told apart by meaning
// (the same role the app's romanization played for CC-CEDICT in Đợt 1).
// Sorted longest-first at use time so phrases win over single words.
const VI_NATIVE_KEYWORDS = {
  "xanh dương": ["blue"], "xanh lá": ["green"], "đỏ": ["red"],
  "đen": ["black"], "trắng": ["white"], "hồng": ["pink"],
  "vàng": ["yellow", "gold"], "cam": ["orange"],
  "một": ["one"], "hai": ["two"], "ba": ["three"], "bốn": ["four"],
  "năm": ["five", "year"], "sáu": ["six"], "bảy": ["seven"],
  "tám": ["eight"], "chín": ["nine"],
  "em bé": ["baby"], "chân": ["foot", "leg"], "đầu": ["head"],
  "tóc": ["hair"], "mắt": ["eye"], "tai": ["ear"], "miệng": ["mouth"],
  "mũi": ["nose"],
  "nóng": ["hot", "warm"], "lạnh": ["cold"], "mưa": ["rain"],
  "gió": ["wind"], "mây": ["cloud"], "tuyết": ["snow"],
  "mặt trời": ["sun"], "mặt trăng": ["moon"], "cầu vồng": ["rainbow"],
  "lửa": ["fire"], "nước": ["water"],
  "đất": ["earth", "soil", "ground"], "núi": ["mountain"],
  "sông": ["river"],
  "con chó": ["dog"], "con mèo": ["cat"], "con cá": ["fish"],
  "quả táo": ["apple"], "chuối": ["banana"], "dưa hấu": ["watermelon"],
  "quýt": ["mandarin", "tangerine"], "trứng": ["egg"], "sữa": ["milk"],
  "bánh mì": ["bread"], "kem": ["ice cream"],
  "bánh kẹo": ["sweets", "candy"],
  "quyển sách": ["book"], "bút chì": ["pencil"], "bút": ["pen"],
  "vở": ["notebook"], "cục tẩy": ["eraser"],
  "cặp sách": ["bag", "schoolbag"], "sách": ["book"],
  "đồng hồ": ["clock", "watch"],
  "trường học": ["school"], "trường": ["school"], "nhà ga": ["station"],
  "ngôi nhà": ["house", "home"],
  "xe hơi": ["car"], "xe đạp": ["bicycle"],
  "xe máy": ["motorcycle", "motorbike"], "xe buýt": ["bus"],
  "xe tải": ["truck"], "tàu điện": ["train"],
  "tàu siêu tốc": ["shinkansen", "bullet train"],
  "máy bay": ["airplane", "plane", "aircraft"],
  "thuyền": ["boat", "ship"], "xe": ["car", "vehicle"],
  "mũ": ["hat", "cap"], "áo sơ mi": ["shirt"],
  "áo khoác": ["coat", "jacket"], "quần dài": ["trousers", "pants"],
  "váy": ["dress", "skirt"], "giày": ["shoes", "shoe"],
  "tất": ["socks", "sock"], "khăn quàng": ["scarf", "muffler"],
  "bạn": ["friend"], "giáo viên": ["teacher"], "mẹ": ["mother"],
  "bố": ["father"], "ông": ["grandfather"], "bà": ["grandmother"],
  "anh trai": ["older brother", "elder brother"],
  "chị gái": ["older sister", "elder sister"],
  "người": ["person", "people", "man", "human"],
  "vé": ["ticket"], "tiền": ["money"], "ngày": ["day"],
  "giờ": ["hour", "time"], "bây giờ": ["now"],
  "trước": ["front", "before"],
  "giúp đỡ": ["help", "assist"], "gặp": ["meet"],
  "học": ["learn", "study"], "to": ["big", "large"],
  "lớn": ["big", "large"], "nhỏ": ["small", "little"],
  "đồ bỏ quên": ["left behind", "forgotten", "lost"],
  "quầy": ["counter", "window"], "công ty": ["company"],
  "ruộng": ["rice field", "field"], "ngôn ngữ": ["language"],
  "đặt trước": ["reservation", "booking"],
  "hướng dẫn": ["information", "guide", "guidance"],
  "cảm ơn": ["thank"], "không": ["no", "not"], "vâng": ["yes"],
  "tạm biệt": ["goodbye", "good-bye"], "xin chào": ["hello"],
  "chào buổi sáng": ["good morning", "morning"],
  "chào buổi tối": ["good evening", "evening"],
  "chúc ngủ ngon": ["good night"],
  "có lẽ": ["perhaps", "maybe"], "lý do": ["reason"],
  "chắc chắn": ["should", "must", "certainly"], "mặc dù": ["although"],
  "nếu": ["if"], "khoảng": ["about", "approximately", "interval", "between"],
  "giữa": ["between", "middle"], "muộn": ["late"],
  "sáng": ["bright", "light"], "sinh": ["birth", "life"],
  "sống": ["live", "life"], "điện": ["electricity", "electric"],
  "gặp khó khăn": ["trouble", "difficulty", "distress"],
  "bị mắng": ["scolded", "rebuked"], "đi": ["go"], "đến": ["come"],
  "nhận": ["receive", "accept"], "nói": ["say", "speak", "tell"],
  "làm": ["do"], "quá": ["too", "exceed"], "để": ["for", "in order to"],
  "chỉ": ["only", "merely"], "vừa mới": ["just"],
};
const VI_PHRASES = Object.entries(VI_NATIVE_KEYWORDS)
  .sort((a, b) => b[0].length - a[0].length);
function keywordsFor(native) {
  const clean = (native ?? "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/~/g, " ");
  const found = new Set();
  for (const [phrase, kws] of VI_PHRASES)
    if (clean.includes(phrase)) for (const k of kws) found.add(k);
  return [...found];
}
function glossHasKeyword(glossText, keyword) {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, "i").test(glossText);
}

// ----------------------------------------------------------------- XML ----
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}
const allText = (block, tag) =>
  [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g"))]
    .map((m) => decodeEntities(m[1].trim()));

// -------------------------------------------------------------- JMdict ----
function loadJmdict() {
  const xml = gunzipSync(readFileSync(join(SRC, "JMdict_e.gz"))).toString("utf8");
  const blocks = xml.split("<entry>").slice(1);
  const byKeb = new Map(); // keb -> [entryIdx]
  const byReb = new Map(); // reb -> [entryIdx]
  const entries = [];
  for (const rawBlock of blocks) {
    const block = rawBlock.split("</entry>")[0];
    const kebs = allText(block, "keb");
    const kePri = [...block.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)]
      .map((m) => allText(m[1], "ke_pri"));
    const readings = [...block.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)].map((m) => {
      const rb = m[1];
      return {
        reb: allText(rb, "reb")[0],
        restr: allText(rb, "re_restr"),
        pri: allText(rb, "re_pri"),
        nokanji: /<re_nokanji\s*\/>/.test(rb),
      };
    }).filter((r) => r.reb);
    const glosses = allText(block, "gloss").filter(Boolean);
    const senses = [...block.matchAll(/<sense>([\s\S]*?)<\/sense>/g)]
      .map((m) => allText(m[1], "gloss").filter(Boolean)).filter((g) => g.length);
    const idx = entries.length;
    entries.push({ kebs, kePri, readings, glosses, senses: senses.length ? senses : [glosses] });
    for (const k of kebs) {
      if (!byKeb.has(k)) byKeb.set(k, []);
      byKeb.get(k).push(idx);
    }
    for (const r of readings) {
      if (!byReb.has(r.reb)) byReb.set(r.reb, []);
      if (!byReb.get(r.reb).includes(idx)) byReb.get(r.reb).push(idx);
    }
  }
  return { entries, byKeb, byReb, total: entries.length };
}

// Score one (entry, keb, reb) candidate pair for target T.
function priScore(priCodes) {
  let score = 0;
  const nfs = priCodes.filter((p) => /^nf\d+$/.test(p)).map((p) => Number(p.slice(2)));
  if (nfs.length) score += 50 - Math.min(...nfs); // nf01 (top 500) -> +49
  if (priCodes.some((p) => ["news1", "ichi1", "spec1", "gai1"].includes(p))) score += 25;
  else if (priCodes.some((p) => ["news2", "ichi2", "spec2", "gai2"].includes(p))) score += 8;
  return score;
}

function pickJmdict(target, info, jm) {
  const candIdx = new Set([...(jm.byKeb.get(target) ?? []), ...(jm.byReb.get(target) ?? [])]);
  if (!candIdx.size) return null;
  const keywords = keywordsFor(info.native);
  const romajiAlts = info.romanization
    ? info.romanization.toLowerCase().split("/").map((s) => s.trim()).filter(Boolean)
    : [];
  const scored = [];
  for (const idx of candIdx) {
    const e = jm.entries[idx];
    for (const r of e.readings) {
      const applicableKebs = r.restr.length ? r.restr : e.kebs;
      const kebOptions = e.kebs.length ? applicableKebs : [null];
      for (const keb of kebOptions) {
        const kebMatch = keb === target;
        const rebMatch = r.reb === target;
        if (!kebMatch && !rebMatch) continue;
        if (r.nokanji && !rebMatch) continue; // not a true reading of the keb
        let score = 0;
        if (kebMatch) score += 100;
        if (rebMatch) score += keb ? 40 : 70;
        const pri = [...(keb ? e.kePri[e.kebs.indexOf(keb)] ?? [] : []), ...r.pri];
        score += priScore(pri);
        if (keb && e.kebs[0] === keb) score += 6;
        if (e.readings[0] === r) score += 6;
        if (rebMatch) score += 60; // reading IS the target: always agrees
        else if (romajiAlts.length) {
          // The app lists its primary reading first ("hito / jin"):
          // agreeing with the first alternative scores full, with a
          // later alternative half. A reading that contradicts the
          // app's romanization entirely REJECTS the candidate — e.g.
          // 電 only occurs in JMdict as an ateji variant of 稲妻
          // (いなずま "lightning"), which is not the character the app
          // teaches (でん "electricity"), so 電 gets no JMdict data.
          const roma = kanaToRomaji(r.reb);
          if (!roma || !romajiAlts.includes(roma)) continue;
          score += roma === romajiAlts[0] ? 60 : 30;
        }
        const glossText = e.glosses.join("; ");
        const matched = keywords.filter((k) => glossHasKeyword(glossText, k));
        score += Math.min(140, matched.length * 70);
        // Cross-link: kana target sharing its Vietnamese meaning with a
        // kanji target of the pack written exactly as this candidate keb.
        if (rebMatch && keb && vocab.has(keb) && vocab.get(keb).native === info.native) score += 80;
        scored.push({ entry: e, keb, reb: r.reb, score, matched });
      }
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  if (process.env.DEBUG_TARGET === target)
    for (const s of scored.slice(0, 8))
      console.log(`    CAND ${target}: keb=${s.keb} reb=${s.reb} score=${s.score} matched=${s.matched} gloss1=${s.entry.glosses[0]}`);
  const best = scored[0];
  const second = scored.find((s) => s !== best &&
    !(s.entry === best.entry && s.entry.glosses[0] === best.entry.glosses[0]));
  if (best.score < 90) return null;
  if (second && best.score - second.score < 25) {
    // Genuinely ambiguous — unless the rivals agree on reading AND first
    // gloss (then the pick is certain), or at least agree on a matched
    // meaning keyword (then the MEANING is certain even though the
    // reading is not: gloss only, no jmReading, no pitch — e.g. 小,
    // where しょう "smallness" and こ "small" tie).
    if (second.reb === best.reb && second.entry.glosses[0] === best.entry.glosses[0])
      return best;
    if (best.matched?.length && second.matched?.some((k) => best.matched.includes(k)))
      return { ...best, glossOnly: true };
    return null;
  }
  return best;
}

function glossOf(pick) {
  const kws = pick.matched ?? [];
  const senses = pick.entry.senses ?? [pick.entry.glosses];
  const usable = (arr) => arr.filter((g) => g.length <= 80);
  let pool = usable(senses[0] ?? []);
  const sense1Hits = kws.length
    ? pool.filter((g) => kws.some((k) => glossHasKeyword(g, k))) : pool;
  if (kws.length && !sense1Hits.length) {
    // Sense 1 is about something else (e.g. ところ "place" while the app
    // teaches the grammar sense): use the earliest sense that does
    // contain a matched keyword, if one exists.
    for (const s of senses.slice(1)) {
      const hit = usable(s).filter((g) => kws.some((k) => glossHasKeyword(g, k)));
      if (hit.length) { pool = hit; break; }
    }
  }
  return pool.slice(0, 2).join("; ");
}

// ------------------------------------------------------------- kanjium ----
function loadKanjium() {
  const text = readFileSync(join(SRC, "accents.txt"), "utf8");
  const map = new Map(); // "form\treading" -> first pitch value (int)
  let lines = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    lines++;
    const [form, readingRaw, pitchRaw] = line.split("\t");
    if (!form || pitchRaw === undefined) continue;
    const reading = readingRaw || form; // kana-form lines leave reading empty
    const first = Number(String(pitchRaw).split(",")[0]);
    if (!Number.isFinite(first)) continue;
    const key = `${form}\t${reading}`;
    if (!map.has(key)) map.set(key, first);
  }
  return { map, lines };
}
function pitchFor(pick, target, kanjium) {
  if (!pick) return null;
  const forms = [];
  if (pick.entry.kebs.length) forms.push(...pick.entry.kebs);
  if (!forms.includes(target)) forms.push(target);
  if (!pick.entry.kebs.length) forms.push(pick.reb);
  for (const form of forms) {
    const v = kanjium.map.get(`${form}\t${pick.reb}`);
    if (v !== undefined) return { pitch: v, pitchReading: pick.reb };
  }
  return null;
}

// ----------------------------------------------------------- KANJIDIC2 ----
function loadKanjidic2(wantedChars) {
  const xml = gunzipSync(readFileSync(join(SRC, "kanjidic2.xml.gz"))).toString("utf8");
  const header = xml.match(/<header>([\s\S]*?)<\/header>/)?.[1] ?? "";
  const meta = {
    databaseVersion: allText(header, "database_version")[0] ?? null,
    dateOfCreation: allText(header, "date_of_creation")[0] ?? null,
  };
  const out = {};
  for (const rawBlock of xml.split("<character>").slice(1)) {
    const block = rawBlock.split("</character>")[0];
    const literal = allText(block, "literal")[0];
    if (!literal || !wantedChars.has(literal)) continue;
    const entry = {};
    const on = [...block.matchAll(/<reading\s+r_type="ja_on"[^>]*>([^<]*)<\/reading>/g)]
      .map((m) => decodeEntities(m[1].trim())).filter(Boolean);
    const kun = [...block.matchAll(/<reading\s+r_type="ja_kun"[^>]*>([^<]*)<\/reading>/g)]
      .map((m) => decodeEntities(m[1].trim()).replace(/^-+|-+$/g, "")).filter(Boolean);
    const meanings = [...block.matchAll(/<meaning(?:\s+m_lang="en")?>([^<]*)<\/meaning>/g)]
      .map((m) => decodeEntities(m[1].trim())).filter(Boolean);
    const strokes = Number(allText(block, "stroke_count")[0]);
    if (on.length) entry.on = [...new Set(on)];
    if (kun.length) entry.kun = [...new Set(kun)];
    if (meanings.length) entry.gloss = meanings.slice(0, 3).join("; ");
    if (Number.isFinite(strokes) && strokes > 0) entry.strokes = strokes;
    if (Object.keys(entry).length) out[literal] = entry;
  }
  return { out, meta };
}

// ---------------------------------------------------------------- build ----
for (const f of ["JMdict_e.gz", "kanjidic2.xml.gz", "accents.txt"])
  if (!existsSync(join(SRC, f))) {
    console.error(`Missing /tmp/lex-ja2/${f} — see the download commands in the header of this script.`);
    process.exit(1);
  }

const jm = loadJmdict();
const kanjium = loadKanjium();

// Kanji that really occur in the ja vocabulary (CJK unified ideographs).
const kanjiChars = new Set();
for (const t of vocab.keys()) for (const ch of t) if (/[\u4e00-\u9fff]/.test(ch)) kanjiChars.add(ch);
const kanjidic = loadKanjidic2(kanjiChars);

// An "alphabet lesson" target: a single kana whose app meaning is just
// its syllable name (あ = "a"). Not a word — no JMdict/pitch data.
function isAlphabetLesson(target, info) {
  if ([...target].length !== 1) return false;
  const roma = kanaToRomaji(target);
  return roma !== null && (info.native ?? "").trim().toLowerCase() === roma;
}
const isAllKana = (s) => /^[\u3040-\u30ffー]+$/.test(s);

// Start from the existing ja.json: jlpt/zipf are preserved verbatim and
// no new word keys are created — fields are only ADDED to entries.
if (process.argv.includes("--debug")) {
  for (const [target, info] of vocab) {
    if (isAlphabetLesson(target, info)) { console.log(`SKIP-ALPHABET ${target}`); continue; }
    const pick = pickJmdict(target, info, jm);
    console.log(pick
      ? `PICK ${target} -> keb=${pick.keb} reb=${pick.reb} score=${pick.score} gloss=${glossOf(pick)}`
      : `NONE ${target} (native=${info.native} rom=${info.romanization})`);
  }
  process.exit(0);
}
const jaPath = join(OUT_DIR, "ja.json");
const jaOut = JSON.parse(readFileSync(jaPath, "utf8"));
const picks = new Map();
let jmCount = 0, pitchCount = 0;
for (const [target, info] of vocab) {
  const existing = jaOut[target];
  const pick = isAlphabetLesson(target, info) ? null : pickJmdict(target, info, jm);
  if (pick) picks.set(target, pick);
  let pitchHit = pick && !pick.glossOnly ? pitchFor(pick, target, kanjium) : null;
  if (!pitchHit && !pick && !isAlphabetLesson(target, info) && isAllKana(target)) {
    // Kana-only word attested directly as a kana-form line in kanjium.
    const v = kanjium.map.get(`${target}\t${target}`);
    if (v !== undefined) pitchHit = { pitch: v, pitchReading: target };
  }
  if (!existing) continue; // never create new keys (食べさせる has no data anyway)
  if (pick) {
    jmCount++;
    const gloss = glossOf(pick);
    if (!pick.glossOnly && pick.reb !== target) existing.jmReading = pick.reb;
    if (gloss) existing.jmGloss = gloss;
  }
  if (pitchHit) {
    pitchCount++;
    existing.pitch = pitchHit.pitch;
    existing.pitchReading = pitchHit.pitchReading;
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const sorted = (obj) => Object.fromEntries(
  Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const jaSorted = sorted(jaOut);
writeFileSync(jaPath, JSON.stringify(jaSorted, null, 2) + "\n", "utf8");
const kdPath = join(OUT_DIR, "kanjidic-ja.json");
const kdSorted = sorted(kanjidic.out);
writeFileSync(kdPath, JSON.stringify(kdSorted, null, 2) + "\n", "utf8");

// ------------------------------------------------------------- report ----
const pct = (n, d) => `${n}/${d} (${((100 * n) / d).toFixed(1)}%)`;
const count = (obj, field) => Object.values(obj).filter((v) => v[field] !== undefined).length;
console.log(`JMdict entries parsed: ${jm.total}`);
console.log(`kanjium accent lines: ${kanjium.lines}`);
console.log(`KANJIDIC2 database_version: ${kanjidic.meta.databaseVersion}, date_of_creation: ${kanjidic.meta.dateOfCreation}`);
console.log(`vocab targets: ${vocab.size}`);
console.log(`  jmGloss: ${pct(count(jaOut, "jmGloss"), vocab.size)}  jmReading: ${count(jaOut, "jmReading")}  pitch: ${pct(count(jaOut, "pitch"), vocab.size)}`);
console.log(`  kanjidic-ja: ${Object.keys(kdSorted).length}/${kanjiChars.size} kanji`);
console.log(`  bytes: ja.json ${statSync(jaPath).size}, kanjidic-ja.json ${statSync(kdPath).size}`);
console.log("\nSpot checks:");
for (const w of ["ねこ", "あめ", "かみ", "あつい", "はい", "さん", "人", "金", "水", "車", "ありがとう", "こんにちは", "食べた", "予約", "駅"])
  console.log(`  ${w}:`, JSON.stringify(jaOut[w]));
for (const ch of ["水", "人", "駅", "電"])
  console.log(`  kanjidic ${ch}:`, JSON.stringify(kdSorted[ch]));
const stray = Object.keys(jaOut).filter((k) => !vocab.has(k));
const strayKd = Object.keys(kdSorted).filter((k) => !kanjiChars.has(k));
console.log(`\nInvariant: ja.json keys outside vocab: ${stray.length}; kanjidic keys outside vocab kanji: ${strayKd.length}`);
