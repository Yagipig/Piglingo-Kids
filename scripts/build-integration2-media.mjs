#!/usr/bin/env node
/**
 * build-integration2-media.mjs — Đợt 2 tích hợp nguồn mở, TUYẾN MEDIA.
 *
 * A. Twemoji (jdecked/twemoji, pinned 17.0.3)
 *    - Chỉ tải PNG 72x72 cho các emoji THẬT SỰ xuất hiện trong
 *      `Word.emoji` của 3 packs (en-vi / ja-vi / zh-vi). Không tải cả repo.
 *    - Tên file Twemoji: codepoint hex (không đệm 0, không chữ hoa) nối
 *      bằng "-", BỎ U+FE0F (variation selector) — đã kiểm chứng thực tế
 *      trên CDN (2764.png, 31-20e3.png cho keycap). Script vẫn thử lần
 *      lượt các biến thể (giữ FE0F / đệm 4 ký tự) khi biến thể chính 404.
 *    - Ra: assets/twemoji/<codepoint>.png + src/content/twemoji-assets.ts
 *      (require tĩnh từng PNG, manifest emoji -> asset key).
 *    - Giấy phép: graphics CC BY 4.0 (LICENSE-GRAPHICS), code MIT.
 *    - OpenMoji: KHÔNG dùng (dự phòng chưa dùng) — Twemoji phủ đủ các
 *      emoji minh họa quan trọng; các emoji thiếu asset đều là số
 *      khoanh tròn không thuộc bộ emoji chuẩn.
 *
 * B. Lingua Libre (qua Wikimedia Commons API chính thức)
 *    - Với MỖI từ (Word.target) của 3 packs, truy vấn Commons API
 *      (generator=search, namespace File) theo mẫu tên file Lingua Libre
 *      `LL-Q<qid> (<iso>)-<speaker>-<text>.<ext>`.
 *    - Chỉ nhận file mà đoạn <text> của tên file khớp ĐÚNG target
 *      (en: không phân biệt hoa/thường; ja/zh: khớp chính xác) — không
 *      lấy câu dài / từ ghép khác.
 *    - Kiểm giấy phép TỪNG FILE từ extmetadata của chính file đó trên
 *      Commons. CHỈ nhận: CC0 hoặc CC BY (mọi phiên bản tới 4.0).
 *      LOẠI: CC BY-SA, CC BY-NC, CC BY-ND, GFDL, không rõ — dù là file
 *      Lingua Libre (rất nhiều bản ghi Lingua Libre là CC BY-SA 4.0 và
 *      bị loại theo quy tắc này).
 *    - Chọn 1 bản/từ: ưu tiên CC0 trước, rồi file gốc nhỏ nhất (proxy
 *      bản ghi ngắn nhất). Tiêu chí ghi vào metadata từng mục.
 *    - Tải file gốc, chuyển MP3 mono 22050 Hz / 48 kbps bằng ffmpeg.
 *    - Ra: assets/audio/lingua/<targetCode>/<safe-name>.mp3,
 *      src/content/real-audio-manifest.ts (manifest RIÊNG cho nút
 *      "Nghe giọng thật" — KHÔNG đụng src/content/audio-manifest.ts,
 *      TTS thường giữ nguyên), src/content/lingua-libre.json.
 *
 * Tái chạy: cache phản hồi Commons API ở $INTEGRATION2_CACHE
 * (mặc định /tmp/piglingo-integration2-cache); từ đã có MP3 + mục trong
 * lingua-libre.json từ lần chạy trước sẽ được giữ lại, không truy vấn
 * lại (xóa file/mục tương ứng hoặc đặt INTEGRATION2_FORCE=1 để làm lại).
 *
 * Cách chạy: node scripts/build-integration2-media.mjs [--only-twemoji|--only-lingua]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR =
  process.env.INTEGRATION2_CACHE || "/tmp/piglingo-integration2-cache";
const FORCE = process.env.INTEGRATION2_FORCE === "1";
/** OFFLINE=1: chỉ dùng cache đã tải (không gọi mạng) — dùng để chốt lại
 * output từ dữ liệu đã thu sau khi nhà cung cấp trả 429. */
const OFFLINE = process.env.INTEGRATION2_OFFLINE === "1";
/** Đặt true khi Wikimedia trả 429: dừng MỀM toàn bộ phần Lingua Libre
 * (429 là hard stop cho provider này), vẫn ghi output từ phần đã lấy. */
let RATE_LIMITED = false;
const UA = { "User-Agent": "PiglingoIntegration2/1.0 (media build script)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PACK_FILES = ["en-vi", "ja-vi", "zh-vi"];
function loadPacks() {
  const packs = {};
  for (const id of PACK_FILES) {
    packs[id] = JSON.parse(
      fs.readFileSync(path.join(ROOT, "src/content/packs", `${id}.json`), "utf8"),
    );
  }
  return packs;
}
function packWords(pack) {
  const out = [];
  for (const s of pack.sections || [])
    for (const u of s.units || []) for (const w of u.words || []) out.push(w);
  return out;
}

/* ------------------------------- Twemoji ------------------------------- */
const TWEMOJI_VERSION = "17.0.3";
const TWEMOJI_CDN = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/72x72`;

function twemojiCandidates(emoji) {
  const cps = [...emoji].map((ch) => ch.codePointAt(0));
  const hex = (cp, pad) =>
    pad ? cp.toString(16).padStart(4, "0") : cp.toString(16);
  const variants = [
    cps.filter((cp) => cp !== 0xfe0f),
    cps,
  ];
  const names = [];
  for (const v of variants)
    for (const pad of [false, true]) {
      const n = v.map((cp) => hex(cp, pad)).join("-");
      if (!names.includes(n)) names.push(n);
    }
  return names; // names[0] = quy ước chính (bỏ FE0F, không đệm)
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // PNG magic
  if (buf.length < 8 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return buf;
}

async function buildTwemoji(packs) {
  const emojiCount = new Map();
  for (const id of PACK_FILES)
    for (const w of packWords(packs[id]))
      if (w.emoji) emojiCount.set(w.emoji, (emojiCount.get(w.emoji) || 0) + 1);
  const emojis = [...emojiCount.keys()];
  const outDir = path.join(ROOT, "assets/twemoji");
  fs.mkdirSync(outDir, { recursive: true });

  const found = new Map(); // emoji -> {file, bytes, fetchedAs}
  const missing = [];
  let idx = 0;
  const queue = [...emojis];
  async function worker() {
    while (queue.length) {
      const emoji = queue.shift();
      idx += 1;
      const candidates = twemojiCandidates(emoji);
      const canonical = candidates[0];
      const dest = path.join(outDir, `${canonical}.png`);
      if (!FORCE && fs.existsSync(dest)) {
        found.set(emoji, {
          file: canonical,
          bytes: fs.statSync(dest).size,
          fetchedAs: canonical,
          cached: true,
        });
        continue;
      }
      let got = null;
      for (const cand of candidates) {
        got = await fetchBuffer(`${TWEMOJI_CDN}/${cand}.png`);
        if (got) {
          fs.writeFileSync(dest, got);
          found.set(emoji, {
            file: canonical,
            bytes: got.length,
            fetchedAs: cand,
            cached: false,
          });
          break;
        }
      }
      if (!got) missing.push(emoji);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  // Sinh src/content/twemoji-assets.ts — require tĩnh từng PNG.
  const lines = [
    "// Generated by scripts/build-integration2-media.mjs — do not edit.",
    `// Twemoji ${TWEMOJI_VERSION} (jdecked/twemoji): graphics CC BY 4.0, code MIT.`,
    "// Chỉ chứa các emoji thật sự dùng trong Word.emoji của 3 packs.",
    "// Emoji không có ở đây -> TwemojiImage fallback về emoji hệ thống (Text).",
    "",
    "/** emoji -> require(PNG Twemoji local). */",
    "export const TWEMOJI_ASSETS: Record<string, number> = {",
  ];
  const sorted = [...found.entries()].sort((a, b) =>
    a[1].file.localeCompare(b[1].file),
  );
  for (const [emoji, info] of sorted)
    lines.push(
      `  ${JSON.stringify(emoji)}: require("../../assets/twemoji/${info.file}.png"),`,
    );
  lines.push("};", "");
  lines.push("/** emoji -> asset key (tên file PNG không có đuôi, theo codepoint). */");
  lines.push("export const TWEMOJI_CODEPOINTS: Record<string, string> = {");
  for (const [emoji, info] of sorted)
    lines.push(`  ${JSON.stringify(emoji)}: ${JSON.stringify(info.file)},`);
  lines.push("};", "");
  fs.writeFileSync(
    path.join(ROOT, "src/content/twemoji-assets.ts"),
    lines.join("\n"),
  );

  const totalBytes = [...found.values()].reduce((a, b) => a + b.bytes, 0);
  return {
    used: emojis.length,
    covered: found.size,
    missing,
    totalBytes,
    found,
  };
}

/* ----------------------------- Lingua Libre ---------------------------- */
const LINGUA_LANGS = {
  "en-vi": { qid: "Q1860", iso: "eng", label: "English" },
  "ja-vi": { qid: "Q5287", iso: "jpn", label: "Japanese" },
  "zh-vi": { qid: "Q9192", iso: "cmn", label: "Mandarin Chinese" },
};
const ALLOWED_LICENSE =
  /^(CC0|CC BY( \d+(\.\d+)?)?)$/i;

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
function safeName(courseId, target) {
  if (courseId === "en-vi") {
    const slug = target
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (slug) return slug;
  }
  return [...target].map((ch) => ch.codePointAt(0).toString(16)).join("-");
}

async function commonsSearch(courseId, target) {
  const lang = LINGUA_LANGS[courseId];
  const cacheKey = createHash("sha1")
    .update(`${courseId}:${target}`)
    .digest("hex");
  const cacheFile = path.join(CACHE_DIR, "commons", `${cacheKey}.json`);
  if (!FORCE && fs.existsSync(cacheFile))
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  if (OFFLINE) return null;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `LL-${lang.qid} (${lang.iso}) ${target}`,
    gsrlimit: "50",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: UA,
  });
  if (res.status === 429) {
    RATE_LIMITED = true;
    return null;
  }
  if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`);
  const json = await res.json();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(json));
  await sleep(120);
  return json;
}

/** Trích speaker + text từ title "File:LL-Q1860 (eng)-Speaker-text.wav". */
function parseLinguaTitle(title, lang, target, courseId) {
  const m = String(title).match(
    new RegExp(
      `^File:LL-${lang.qid} \\(${lang.iso}\\)-(.+)-(.+)\\.(wav|ogg|oga|mp3|flac)$`,
      "i",
    ),
  );
  if (!m) return null;
  const textInFile = m[2].replace(/_/g, " ").trim();
  const want = target.trim();
  const same =
    courseId === "en-vi"
      ? textInFile.toLowerCase() === want.toLowerCase()
      : textInFile === want;
  if (!same) return null;
  return { speakerInName: m[1], textInFile, ext: m[3].toLowerCase() };
}

function ffprobeDuration(file) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
      { encoding: "utf8" },
    );
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? Math.round(d * 100) / 100 : null;
  } catch {
    return null;
  }
}

async function buildLingua(packs) {
  const metaPath = path.join(ROOT, "src/content/lingua-libre.json");
  const prevMeta =
    !FORCE && fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, "utf8"))
      : {};
  const metadata = {};
  const manifestEntries = []; // [key, requirePath]
  const stats = {};

  for (const courseId of PACK_FILES) {
    if (RATE_LIMITED) {
      stats[courseId] = {
        total: [...new Set(packWords(packs[courseId]).map((w) => w.target))].length,
        kept: 0, exactMatches: 0, rejectedLicense: 0, rejectedTitles: [], bytes: 0,
        notQueried: true,
      };
      continue;
    }
    const lang = LINGUA_LANGS[courseId];
    const targets = [...new Set(packWords(packs[courseId]).map((w) => w.target))];
    const code = packs[courseId].targetCode; // en | ja | zh
    const dir = path.join(ROOT, "assets/audio/lingua", code);
    fs.mkdirSync(dir, { recursive: true });
    const st = {
      total: targets.length,
      kept: 0,
      exactMatches: 0,
      rejectedLicense: 0,
      rejectedTitles: [],
      bytes: 0,
    };
    stats[courseId] = st;

    for (const target of targets) {
      const key = `${courseId}:${target}`;
      const name = safeName(courseId, target);
      const dest = path.join(dir, `${name}.mp3`);
      const rel = `assets/audio/lingua/${code}/${name}.mp3`;
      if (!FORCE && prevMeta[key] && fs.existsSync(dest)) {
        metadata[key] = prevMeta[key];
        manifestEntries.push([key, rel]);
        st.kept += 1;
        st.bytes += fs.statSync(dest).size;
        continue;
      }
      if (RATE_LIMITED) break;
      let data;
      try {
        data = await commonsSearch(courseId, target);
      } catch (e) {
        console.warn(`[lingua] ${key}: API error ${e.message}`);
        continue;
      }
      if (!data) continue; // offline chưa có cache, hoặc vừa bị 429 (vòng lặp sau sẽ dừng hẳn)
      const pages = Object.values(data?.query?.pages || {});
      const candidates = [];
      for (const page of pages) {
        const parsed = parseLinguaTitle(page.title, lang, target, courseId);
        if (!parsed) continue;
        st.exactMatches += 1;
        const ii = page.imageinfo?.[0] || {};
        const em = ii.extmetadata || {};
        const licenseShort = stripHtml(em.LicenseShortName?.value || "");
        if (!ALLOWED_LICENSE.test(licenseShort)) {
          st.rejectedLicense += 1;
          st.rejectedTitles.push(
            `${page.title} [${licenseShort || "no license metadata"}]`,
          );
          continue;
        }
        candidates.push({ page, parsed, ii, em, licenseShort });
      }
      if (!candidates.length) continue;
      // Ưu tiên CC0, rồi file gốc nhỏ nhất (proxy bản ghi ngắn/rõ nhất có thể đo tự động).
      candidates.sort((a, b) => {
        const rank = (c) => (/^CC0/i.test(c.licenseShort) ? 0 : 1);
        return rank(a) - rank(b) || (a.ii.size || 1e12) - (b.ii.size || 1e12);
      });
      const chosen = candidates[0];
      const originalUrl = String(chosen.ii.url || "").split("?")[0];
      const tmpFile = path.join(
        CACHE_DIR,
        "downloads",
        `${createHash("sha1").update(originalUrl).digest("hex")}.${chosen.parsed.ext}`,
      );
      fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
      if (!fs.existsSync(tmpFile)) {
        if (OFFLINE) continue;
        const res = await fetch(originalUrl, { headers: UA });
        if (res.status === 429) {
          RATE_LIMITED = true;
          break;
        }
        if (!res.ok) {
          console.warn(`[lingua] ${key}: download HTTP ${res.status}`);
          continue;
        }
        fs.writeFileSync(tmpFile, Buffer.from(await res.arrayBuffer()));
      }
      // Chuyển MP3 mono gọn bằng ffmpeg (công cụ có sẵn trên máy build).
      try {
        execFileSync(
          "ffmpeg",
          ["-y", "-v", "error", "-i", tmpFile, "-vn", "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "48k", dest],
          { stdio: "pipe" },
        );
      } catch (e) {
        console.warn(`[lingua] ${key}: ffmpeg failed, skipped`);
        continue;
      }
      const artistText = stripHtml(chosen.em.Artist?.value || "");
      const speaker =
        artistText.replace(/^Speaker:\s*/i, "").split("Recorder:")[0].trim() ||
        chosen.parsed.speakerInName;
      const bytes = fs.statSync(dest).size;
      metadata[key] = {
        courseId,
        target,
        targetText: chosen.parsed.textInFile,
        language: `${lang.label} (${lang.iso}, Lingua Libre ${lang.qid})`,
        commonsFileTitle: chosen.page.title.replace(/^File:/, ""),
        commonsFilePage: String(chosen.ii.descriptionurl || "").split("?")[0],
        originalFileUrl: originalUrl,
        speaker,
        artistMetadata: artistText,
        licenseShortName: chosen.licenseShort,
        licenseFullName: stripHtml(chosen.em.UsageTerms?.value || ""),
        licenseUrl: stripHtml(chosen.em.LicenseUrl?.value || ""),
        licenseMetadataSource:
          "Wikimedia Commons API imageinfo/extmetadata of this exact file (queried at build time)",
        localFile: rel,
        originalFormat: chosen.parsed.ext,
        originalBytes: chosen.ii.size ?? null,
        bytes,
        durationSec: ffprobeDuration(dest),
        selection:
          "Exact target-text match in Lingua Libre filename; license verified per-file on Commons (CC0 or CC BY only); among exact matches: CC0 first, then smallest original file (shortest-recording proxy).",
        candidatesExact: candidates.length,
      };
      manifestEntries.push([key, rel]);
      st.kept += 1;
      st.bytes += bytes;
      console.log(`[lingua] ${key} -> ${rel} (${chosen.licenseShort})`);
    }
  }

  // BẢO TOÀN MỤC CŨ (sửa lỗi phiên bổ sung 10/11/2026): nếu vòng lặp bị
  // dừng giữa chừng vì 429 (RATE_LIMITED) hoặc chạy OFFLINE, các target
  // nằm SAU điểm dừng chưa được duyệt tới — tuyệt đối không được làm mất
  // các mục đã có từ lần chạy trước mà file MP3 vẫn còn trên đĩa. Quét
  // lại toàn bộ prevMeta: mục nào chưa có trong metadata mới và file
  // local vẫn tồn tại thì giữ nguyên vào output (chỉ thêm mới, không mất cũ).
  for (const [key, rec] of Object.entries(prevMeta)) {
    if (metadata[key]) continue;
    const destAbs = path.join(ROOT, rec.localFile || "");
    if (!rec.localFile || !fs.existsSync(destAbs)) continue;
    metadata[key] = rec;
    manifestEntries.push([key, rec.localFile]);
    const st = stats[rec.courseId];
    if (st) {
      st.kept += 1;
      st.bytes += fs.statSync(destAbs).size;
    }
    console.log(`[lingua] ${key} -> preserved from previous run`);
  }

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
  const lines = [
    "// Generated by scripts/build-integration2-media.mjs — do not edit.",
    "// Audio giọng người thật (Lingua Libre / Wikimedia Commons, giấy phép",
    "// TỪNG FILE đã kiểm chứng: chỉ CC0 hoặc CC BY — xem",
    "// src/content/lingua-libre.json). Manifest RIÊNG cho nút/nghe giọng",
    "// thật: KHÔNG thay TTS mặc định (src/content/audio-manifest.ts giữ nguyên).",
    "// Key: `${courseId}:${target}` — cùng quy ước với audio.ts.",
    "",
    "export const realAudioManifest: Record<string, number> = {",
  ];
  manifestEntries.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [key, rel] of manifestEntries)
    lines.push(`  ${JSON.stringify(key)}: require("../../${rel}"),`);
  lines.push("};", "");
  fs.writeFileSync(
    path.join(ROOT, "src/content/real-audio-manifest.ts"),
    lines.join("\n"),
  );
  return { stats, metadata, manifestEntries };
}

/* --------------------------------- main -------------------------------- */
const onlyTwemoji = process.argv.includes("--only-twemoji");
const onlyLingua = process.argv.includes("--only-lingua");
const packs = loadPacks();
let tw = null;
let lg = null;
if (!onlyLingua) tw = await buildTwemoji(packs);
if (!onlyTwemoji) lg = await buildLingua(packs);

// Khi chạy từng phần (--only-*), khôi phục số liệu của phần còn lại từ
// output đã có trong repo để file provenance không mất thông tin.
if (!tw && fs.existsSync(path.join(ROOT, "src/content/twemoji-assets.ts"))) {
  const ts = fs.readFileSync(path.join(ROOT, "src/content/twemoji-assets.ts"), "utf8");
  const block = ts.split("TWEMOJI_CODEPOINTS")[0];
  const coveredEmojis = [...block.matchAll(/^\s{2}("(?:[^"\\]|\\.)*"):/gm)].map((m) =>
    JSON.parse(m[1]),
  );
  const union = new Set();
  for (const id of PACK_FILES)
    for (const w of packWords(packs[id])) if (w.emoji) union.add(w.emoji);
  let bytes = 0;
  for (const f of fs.readdirSync(path.join(ROOT, "assets/twemoji")))
    bytes += fs.statSync(path.join(ROOT, "assets/twemoji", f)).size;
  tw = {
    used: union.size,
    covered: coveredEmojis.length,
    missing: [...union].filter((e) => !coveredEmojis.includes(e)),
    totalBytes: bytes,
    found: new Map(),
    restored: true,
  };
}
if (!lg && fs.existsSync(path.join(ROOT, "src/content/lingua-libre.json"))) {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/content/lingua-libre.json"), "utf8"),
  );
  const stats = {};
  for (const id of PACK_FILES) {
    const total = [...new Set(packWords(packs[id]).map((w) => w.target))].length;
    const kept = Object.values(metadata).filter((m) => m.courseId === id);
    stats[id] = {
      total,
      kept: kept.length,
      exactMatches: null,
      rejectedLicense: null,
      rejectedTitles: [],
      bytes: kept.reduce((a, m) => a + (m.bytes || 0), 0),
      restored: true,
    };
  }
  lg = { stats, metadata, manifestEntries: [], restored: true };
}

const prov = [];
prov.push("# Nguồn dữ liệu tuyến Media — Đợt 2 (Twemoji + Lingua Libre)");
prov.push("");
prov.push("Sinh bởi `scripts/build-integration2-media.mjs`. Mọi số liệu dưới đây");
prov.push("lấy từ lần chạy sinh ra các file hiện tại trong repo.");
prov.push("");
prov.push("## Twemoji");
prov.push("");
prov.push(`- Nguồn: jdecked/twemoji (bản duy trì chính thức của Twemoji), pinned **${TWEMOJI_VERSION}**.`);
prov.push(`- URL tải từng PNG: \`${TWEMOJI_CDN}/<codepoint>.png\` (jsDelivr GitHub mirror của repo chính thức).`);
prov.push("- Repo: https://github.com/jdecked/twemoji");
prov.push("- Giấy phép: **graphics CC BY 4.0** (https://github.com/jdecked/twemoji/blob/main/LICENSE-GRAPHICS — https://creativecommons.org/licenses/by/4.0), code MIT (LICENSE).");
prov.push("- Quy ước tên file: codepoint hex nối bằng `-`, bỏ U+FE0F; script thử thêm biến thể giữ FE0F/đệm 4 ký tự khi cần (keycap dùng dạng `31-20e3`).");
if (tw) {
  prov.push(`- Emoji dùng trong Word.emoji của 3 packs (hợp nhất): **${tw.used}**; có asset Twemoji: **${tw.covered}**; không có asset: **${tw.missing.length}** (${tw.missing.join(" ") || "—"} — các số khoanh tròn, không thuộc bộ emoji chuẩn của Twemoji; component fallback emoji hệ thống).`);
  prov.push(`- Tổng dung lượng PNG: **${tw.totalBytes} bytes**.`);
}
prov.push("- OpenMoji: **dự phòng, CHƯA dùng** — Twemoji phủ đủ mọi emoji minh họa quan trọng còn thiếu chỉ là số khoanh tròn; không phát sinh dữ liệu CC BY-SA nào từ OpenMoji.");
prov.push("");
prov.push("## Lingua Libre (Wikimedia Commons)");
prov.push("");
prov.push("- API chính thức: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|size` với truy vấn `LL-Q<qid> (<iso>) <target>` (en Q1860/eng, ja Q5287/jpn, zh Q9192/cmn).");
prov.push("- Trang dự án: https://lingualibre.org — bản ghi nằm trên Wikimedia Commons, tên file `LL-Qxxxx (yyy)-<speaker>-<text>.<ext>`.");
prov.push("- Quy tắc giấy phép CỨNG của đợt này: chỉ lấy file mà extmetadata của CHÍNH file đó ghi **CC0** hoặc **CC BY** (tối đa CC BY). CC BY-SA / NC / ND / không rõ đều bị loại, kể cả khi là bản ghi Lingua Libre.");
prov.push("- Chỉ lấy file có đoạn text trong tên file khớp đúng `Word.target`; chuyển MP3 mono 22050 Hz/48 kbps bằng ffmpeg.");
prov.push("- Manifest giọng thật nằm RIÊNG ở `src/content/real-audio-manifest.ts`; `src/content/audio-manifest.ts` (TTS) không đổi.");
if (lg) {
  if (RATE_LIMITED || OFFLINE || lg.restored || Object.values(lg.stats).some((s) => s.notQueried))
    prov.push("- ⚠️ Trong quá trình thu thập, Wikimedia Commons đã trả **HTTP 429 (rate limit)** — theo quy tắc hard-stop, việc truy vấn provider này đã dừng và output được chốt từ phần đã lấy được (các MP3 + phản hồi API đã cache). Độ phủ dưới đây là PHỦ MỘT PHẦN vì lý do này, không phải độ phủ thật của Lingua Libre. Chạy lại script ở một phiên sau (khi hết giới hạn) sẽ bổ sung tiếp nhờ cache + cơ chế giữ mục cũ.");
  for (const [cid, st] of Object.entries(lg.stats))
    prov.push(`- ${cid}: phủ **${st.kept}/${st.total}** từ${st.exactMatches == null ? "" : `; khớp đúng text: ${st.exactMatches} file; bị loại vì giấy phép: ${st.rejectedLicense} file`}; tổng MP3: ${st.bytes} bytes.${st.notQueried ? " (chưa truy vấn được trong lần chạy này — đã dừng vì 429 ở khóa trước)" : ""}${st.restored ? " (số liệu khôi phục từ output của lần chạy trước)" : ""}`);
  prov.push("");
  prov.push("### Từng file đã lấy (bằng chứng giấy phép theo file)");
  prov.push("");
  prov.push("| Key | File Commons | Speaker | Giấy phép | Trang file |");
  prov.push("|---|---|---|---|---|");
  for (const [key, m] of Object.entries(lg.metadata).sort())
    prov.push(`| ${key} | ${m.commonsFileTitle} | ${m.speaker} | ${m.licenseShortName} (${m.licenseUrl}) | ${m.commonsFilePage} |`);
  prov.push("");
  prov.push("### File khớp đúng text nhưng bị loại vì giấy phép (mẫu bằng chứng quy tắc lọc)");
  prov.push("");
  let anyRej = false;
  for (const [cid, st] of Object.entries(lg.stats))
    for (const t of st.rejectedTitles.slice(0, 40)) {
      prov.push(`- ${cid}: ${t}`);
      anyRej = true;
    }
  if (!anyRej) prov.push("- (không có)");
}
prov.push("");
fs.writeFileSync(
  path.join(ROOT, "scripts/integration2-media-sources.md"),
  prov.join("\n"),
);

console.log(JSON.stringify({
  twemoji: tw && { used: tw.used, covered: tw.covered, missing: tw.missing, totalBytes: tw.totalBytes },
  lingua: lg && Object.fromEntries(Object.entries(lg.stats).map(([k, s]) => [k, { kept: s.kept, total: s.total, exactMatches: s.exactMatches, rejectedLicense: s.rejectedLicense, bytes: s.bytes }])),
}, null, 2));
