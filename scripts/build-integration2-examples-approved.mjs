/**
 * Coordinator approval pass for Tatoeba candidates (Integration 2).
 *
 * The coordinator personally read all 240 lines in
 * scripts/tatoeba-review-list.txt on 2026-11-09. This script removes the
 * 83 rejected targets below and marks the remaining 157 sentences as
 * human-reviewed. Rejection reasons, applied conservatively for a
 * children's app (age 7+):
 * - ungrammatical, tautological or visibly unnatural sentences;
 * - idioms / intensifiers / poetic phrasing where the target word's
 *   taught meaning is not the meaning actually used;
 * - crime, illness, injury, school-quitting or adult/social-media focus;
 * - the target occurs only incidentally inside an unrelated word
 *   (e.g. Japanese kana inside another word, Chinese 被 inside 被子-style
 *   compounds, or a traditional-character leak);
 * - fragments whose context is too unclear for a learner.
 *
 * Input:  src/content/examples-candidates.json (machine-filtered only)
 * Output: src/content/examples.json (human-reviewed subset + the explicit
 *         approvedSentenceIds list stored inside the data file itself)
 *         scripts/tatoeba-approved-list.txt (same approved set, readable)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = JSON.parse(
  readFileSync(join(root, "src/content/examples-candidates.json"), "utf8")
);

const REJECTED = {
  "en-vi": [
    "fish", "duck", "black", "grandpa", "baby", "water", "one", "two",
    "nine", "hand", "leg", "pants", "car", "hot", "was", "were", "can",
    "made", "asked", "that", "had", "stolen", "yet",
  ],
  "ja-vi": [
    "い", "う", "か", "き", "く", "け", "さ", "し", "せ", "そ", "た",
    "ち", "つ", "て", "と", "な", "イ", "ウ", "カ", "アイス", "ペン",
    "め", "バス", "本", "人", "大", "小", "火", "水", "木", "金", "学",
    "食べて", "見て", "来て", "見たい", "ても", "今", "電", "車", "ば",
  ],
  "zh-vi": [
    "二", "三", "五", "谢谢", "不", "九", "十", "奶酪", "头", "眼睛",
    "火车", "飞机", "远", "生病", "医生", "药", "学习", "工作", "被",
  ],
};

const courses = {};
const approvedSentenceIds = [];
const approvedLines = [];
let candidateCount = 0;

for (const [courseId, targets] of Object.entries(candidates)) {
  const rejected = new Set(REJECTED[courseId] ?? []);
  for (const key of rejected) {
    if (!(key in targets)) {
      throw new Error(`Rejected target not in candidates: ${courseId}/${key}`);
    }
  }
  courses[courseId] = {};
  for (const [target, sentences] of Object.entries(targets)) {
    candidateCount += sentences.length;
    if (rejected.has(target)) continue;
    if (sentences.length !== 1) {
      throw new Error(`Expected exactly 1 candidate for ${courseId}/${target}`);
    }
    const s = sentences[0];
    const approved = {
      id: s.id,
      text: s.text,
      author: s.author,
      license: s.license,
      reviewStatus: "human-reviewed",
      reviewed: true,
    };
    courses[courseId][target] = [approved];
    approvedSentenceIds.push(s.id);
    approvedLines.push(
      `[${courseId}] ${target} :: ${s.text} (${s.id}, ${s.author}, ${s.license})`
    );
  }
}

if (candidateCount !== 240) {
  throw new Error(`Expected 240 candidates, got ${candidateCount}`);
}
if (approvedLines.length !== 157) {
  throw new Error(`Expected 157 approved assignments, got ${approvedLines.length}`);
}
// Two approved sentences each serve two targets ("We have five cats."
// for five/have; "The soup got cold." for soup/cold), so the unique
// Tatoeba sentence-id list has 155 entries for 157 target assignments.
const uniqueApprovedIds = [...new Set(approvedSentenceIds)];
if (uniqueApprovedIds.length !== 155) {
  throw new Error(`Expected 155 unique approved ids, got ${uniqueApprovedIds.length}`);
}
approvedSentenceIds.length = 0;
approvedSentenceIds.push(...uniqueApprovedIds.sort((a, b) => a - b));

const out = {
  source: "Tatoeba (https://tatoeba.org)",
  review:
    "Coordinator personally read and approved every sentence in this file on 2026-11-09 (157 of 240 machine-filtered candidate assignments kept, representing 155 unique Tatoeba sentences; two sentences each serve two targets).",
  approvedSentenceIds,
  courses,
};

writeFileSync(
  join(root, "src/content/examples.json"),
  JSON.stringify(out, null, 2) + "\n"
);
writeFileSync(
  join(root, "scripts/tatoeba-approved-list.txt"),
  "# Tatoeba sentences APPROVED by the coordinator after reading all 240 candidates\n" +
    "# 157 kept / 83 rejected. Each line: [course] target :: text (id, author, license)\n" +
    approvedLines.join("\n") +
    "\n"
);

console.log(
  `Approved ${approvedLines.length}/${candidateCount} Tatoeba assignments (${approvedSentenceIds.length} unique sentences).`
);
