/**
 * KHU LUYỆN 4 KỸ NĂNG (Nghe / Nói / Đọc / Viết) — ĐỘNG CƠ NỘI DUNG THUẦN.
 *
 * Mọi nội dung luyện đều SINH TỰ ĐỘNG từ dữ liệu sẵn có của khóa đang
 * học (từ vựng theo unit + câu mẫu trích từ chính các bài tập
 * fillBlank / wordBank của các bài học) — không thêm dữ liệu nội dung,
 * không sửa baseline. Thứ tự ưu tiên của pool đúng spec:
 *   (a) bài ĐÃ HỌC xong -> (b) bài ở biên hiện tại + unit của nó ->
 *   (c) các bài tiếp theo.
 * Mỗi buổi luyện = 5 hoạt động, gieo hạt tất định theo
 * (ngày + khóa + kỹ năng + số buổi trong ngày) nên trong cùng một ngày
 * các buổi liên tiếp không lặp y hệt, và test sinh được kết quả cố định.
 *
 * Điểm: hoàn thành buổi -> +15 XP, đúng hết -> +5 nữa (bằng đúng công
 * thức bài học XP_PER_LESSON / XP_PERFECT_BONUS trong store.ts), cộng
 * qua action `completeSkillSession` của store. Buổi luyện TUYỆT ĐỐI
 * không cấp vé vòng quay — vé chỉ từ completeLesson / chặng.
 */
import { effectiveFrontierIndex, useCourseContent, type LearnerLevelId } from "./content";
import { strokeDataFor, type StrokeCharData } from "./strokes";
import type { LessonPack, UnitPack, Word } from "./types";

export type SkillKind = "listen" | "speak" | "read" | "write";

export const SKILL_SESSION_SIZE = 5;
/** XP của một buổi luyện — khớp XP_PER_LESSON / XP_PERFECT_BONUS của store. */
export const SKILL_XP = 15;
export const SKILL_XP_PERFECT_BONUS = 5;

export const SKILL_CARDS: {
  id: SkillKind;
  label: string;
  emoji: string;
  blurb: string;
  route: string;
}[] = [
  {
    id: "listen",
    label: "Nghe",
    emoji: "🎧",
    blurb: "Nghe từ và câu rồi chọn đáp án đúng",
    route: "/skills-listen",
  },
  {
    id: "speak",
    label: "Nói",
    emoji: "🎤",
    blurb: "Nghe mẫu, ghi âm đọc theo và nghe lại",
    route: "/skills-speak",
  },
  {
    id: "read",
    label: "Đọc",
    emoji: "📖",
    blurb: "Đọc đoạn ngắn và trả lời câu hỏi",
    route: "/skills-read",
  },
  {
    id: "write",
    label: "Viết",
    emoji: "✍️",
    blurb: "Xếp câu, điền chữ và tập thứ tự nét",
    route: "/skills-write",
  },
];

/* ============================== RNG gieo hạt ============================== */

/** RNG tất định mulberry32 (cùng thuật toán với lib/spin.ts). */
export function skillMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Băm chuỗi -> số hạt 32-bit (FNV-1a). */
export function skillSeedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Chuỗi ngày địa phương "YYYY-MM-DD" (cùng định dạng store dùng cho nhật ký ngày). */
export function skillDayString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * RNG của một buổi luyện: hạt = ngày + khóa + kỹ năng + số buổi (attempt,
 * tính từ 0). Cùng thông số -> cùng buổi (test tất định); attempt khác ->
 * buổi khác trong cùng ngày.
 */
export function skillRngFor(opts: {
  courseId: string;
  skill: SkillKind;
  attempt: number;
  day?: string;
}): () => number {
  const day = opts.day ?? skillDayString();
  return skillMulberry32(
    skillSeedFrom(`${day}|${opts.courseId}|${opts.skill}|${opts.attempt}`)
  );
}

export function shuffleWith<T>(rng: () => number, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ================================== Pool ================================== */

/** 0 = bài đã học xong · 1 = bài ở biên + unit của nó · 2 = các bài tiếp theo. */
export type PoolTier = 0 | 1 | 2;

export type SkillWordItem = {
  word: Word;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  tier: PoolTier;
};

export type SkillSentence = {
  /** Câu đích (ngoại ngữ), đã chuẩn hoá khoảng trắng. */
  target: string;
  /** Nghĩa tiếng Việt của câu. */
  native: string;
  /** Phiên âm (romaji/pinyin) nếu dữ liệu bài học có. */
  romanization?: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  tier: PoolTier;
  /** Từ bị khuyết trong bài fillBlank gốc (nếu câu trích từ fillBlank). */
  missingWord?: string;
};

export type SkillPool = {
  courseId: string;
  targetCode: string;
  words: SkillWordItem[];
  sentences: SkillSentence[];
  /** Từ vựng theo unit (cho Luyện Đọc tra nghĩa + nhiễu cùng unit). */
  unitWords: Record<string, Word[]>;
  frontierIndex: number;
  totalLessons: number;
};

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Tách câu đích thành các thẻ từ (dữ liệu ja/zh đã tách sẵn bằng dấu cách). */
export function tokenizeTarget(text: string): string[] {
  return normalizeSpaces(text)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Chuẩn hoá một thẻ từ để tra từ điển: bỏ dấu câu hai đầu + thường hoá. */
export function normalizeToken(token: string): string {
  return token
    .replace(/^[\s"'“”‘’([{]+/, "")
    .replace(/[\s"'“”‘’)\]}.,!?;:。、！？·…]+$/, "")
    .toLowerCase();
}

/** Trích câu mẫu từ các bài tập của một bài học (fillBlank + wordBank). */
function sentencesFromLesson(
  lesson: LessonPack,
  unit: UnitPack,
  tier: PoolTier
): SkillSentence[] {
  const out: SkillSentence[] = [];
  const base = { unitId: unit.id, unitTitle: unit.title, lessonId: lesson.id, tier };
  for (const ex of lesson.exercises) {
    if (ex.type === "fillBlank") {
      const target = ex.audioTarget
        ? normalizeSpaces(ex.audioTarget)
        : normalizeSpaces(ex.sentence.replace("___", ex.options[ex.correct] ?? ""));
      if (target && ex.translation) {
        out.push({
          ...base,
          target,
          native: ex.translation.trim(),
          missingWord: ex.options[ex.correct],
        });
      }
    } else if (ex.type === "wordBank") {
      if (ex.direction === "nativeToTarget") {
        const target = normalizeSpaces(ex.answer.join(" "));
        if (target && ex.prompt) {
          out.push({ ...base, target, native: ex.prompt.trim() });
        }
      } else {
        const promptLines = ex.prompt.split("\n").map((l) => l.trim());
        const target = ex.audioTarget
          ? normalizeSpaces(ex.audioTarget)
          : normalizeSpaces(promptLines[0] ?? "");
        const native = normalizeSpaces(ex.answer.join(" "));
        if (target && native) {
          out.push({
            ...base,
            target,
            native,
            romanization: promptLines[1] || undefined,
          });
        }
      }
    }
  }
  return out;
}

/**
 * Dựng pool nội dung của một khóa theo đúng thứ tự ưu tiên spec:
 * bài đã học xong -> bài ở biên hiện tại + unit của nó -> bài tiếp theo.
 * Hàm thuần theo (tiến độ, cấp độ) — chạy cho cả 3 khóa và mọi band vì
 * chỉ đi theo thứ tự bài học của khóa.
 */
export function buildSkillPool(
  courseId: string,
  completedLessons: Record<string, true> = {},
  level: LearnerLevelId = "moi"
): SkillPool {
  const { allLessons, pack } = useCourseContent(courseId);
  const ids = allLessons.map((r) => r.lesson.id);
  const frontierIndex = effectiveFrontierIndex(completedLessons, ids, level);
  const frontierUnitId =
    frontierIndex < allLessons.length ? allLessons[frontierIndex].unit.id : null;

  const tierOf = (globalIndex: number, lessonId: string, unitId: string): PoolTier => {
    if (completedLessons[lessonId]) return 0;
    if (globalIndex === frontierIndex || unitId === frontierUnitId) return 1;
    return 2;
  };

  const ordered = allLessons
    .map((ref) => ({
      ref,
      tier: tierOf(ref.globalIndex, ref.lesson.id, ref.unit.id),
    }))
    .sort((a, b) => a.tier - b.tier || a.ref.globalIndex - b.ref.globalIndex);

  const unitWords: Record<string, Word[]> = {};
  for (const ref of allLessons) {
    if (!unitWords[ref.unit.id]) unitWords[ref.unit.id] = ref.unit.words;
  }

  const words: SkillWordItem[] = [];
  const seenWords = new Set<string>();
  for (const { ref, tier } of ordered) {
    for (const word of ref.unit.words) {
      if (seenWords.has(word.target)) continue;
      seenWords.add(word.target);
      words.push({
        word,
        unitId: ref.unit.id,
        unitTitle: ref.unit.title,
        lessonId: ref.lesson.id,
        tier,
      });
      if (words.length >= 90) break;
    }
    if (words.length >= 90) break;
  }

  const sentences: SkillSentence[] = [];
  const seenSentences = new Set<string>();
  for (const { ref, tier } of ordered) {
    for (const s of sentencesFromLesson(ref.lesson, ref.unit, tier)) {
      const key = s.target.toLowerCase();
      if (seenSentences.has(key)) continue;
      seenSentences.add(key);
      sentences.push(s);
      if (sentences.length >= 60) break;
    }
    if (sentences.length >= 60) break;
  }

  return {
    courseId,
    targetCode: pack.targetCode,
    words,
    sentences,
    unitWords,
    frontierIndex,
    totalLessons: allLessons.length,
  };
}

/** Tra nghĩa của một từ trong đoạn đọc: khớp chính xác -> khớp đã chuẩn hoá. */
export function lookupWordInCourse(courseId: string, token: string): Word | undefined {
  const { getWord } = useCourseContent(courseId);
  const direct = getWord(token);
  if (direct) return direct;
  const normalized = normalizeToken(token);
  if (normalized && normalized !== token.toLowerCase()) {
    const byNormalized = getWord(normalized);
    if (byNormalized) return byNormalized;
  }
  // Quét toàn khóa theo dạng chuẩn hoá (từ trong câu có thể khác hoa/thường).
  const { allWords } = useCourseContent(courseId);
  return allWords().find((w) => normalizeToken(w.target) === normalized);
}

/* ============================ Chọn mẫu theo ưu tiên ============================ */

function tierWeight(tier: PoolTier): number {
  return tier === 0 ? 3 : tier === 1 ? 2 : 1;
}

/** Chọn không lặp `count` phần tử, thiên vị tier thấp (đã học > biên > tiếp theo). */
export function pickTiered<T>(
  rng: () => number,
  items: readonly T[],
  count: number,
  keyOf: (item: T) => string,
  tierOfItem: (item: T) => PoolTier
): T[] {
  const remaining = [...items];
  const picked: T[] = [];
  const used = new Set<string>();
  while (picked.length < count && remaining.length > 0) {
    let total = 0;
    for (const item of remaining) total += tierWeight(tierOfItem(item));
    let roll = rng() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= tierWeight(tierOfItem(remaining[i]));
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    const [item] = remaining.splice(idx, 1);
    const key = keyOf(item);
    if (used.has(key)) continue;
    used.add(key);
    picked.push(item);
  }
  return picked;
}

/** Nhiễu ưu tiên cùng unit trước, sau đó mới tới phần còn lại của pool. */
function distractorsFor<T>(
  rng: () => number,
  poolItems: readonly T[],
  answer: T,
  count: number,
  keyOf: (item: T) => string,
  unitOf: (item: T) => string,
  tierOfItem: (item: T) => PoolTier
): T[] {
  const answerKey = keyOf(answer);
  const sameUnit = poolItems.filter(
    (i) => keyOf(i) !== answerKey && unitOf(i) === unitOf(answer)
  );
  const others = poolItems.filter(
    (i) => keyOf(i) !== answerKey && unitOf(i) !== unitOf(answer)
  );
  const picked = pickTiered(rng, sameUnit, count, keyOf, tierOfItem);
  if (picked.length < count) {
    picked.push(
      ...pickTiered(rng, others, count - picked.length, keyOf, tierOfItem)
    );
  }
  return picked;
}

/* ================================= NGHE ================================= */

export type ListenActivity =
  | { kind: "listen-word"; answer: SkillWordItem; options: SkillWordItem[] }
  | {
      kind: "listen-meaning";
      sentence: SkillSentence;
      options: string[];
      correctIndex: number;
    }
  | {
      kind: "listen-gap";
      sentence: SkillSentence;
      /** Câu đích với từ khuyết thay bằng ＿＿＿. */
      blanked: string;
      options: string[];
      correctIndex: number;
    };

function buildListenWord(pool: SkillPool, rng: () => number): ListenActivity | null {
  const [answer] = pickTiered(rng, pool.words, 1, (w) => w.word.target, (w) => w.tier);
  if (!answer) return null;
  const distractors = distractorsFor(
    rng,
    pool.words,
    answer,
    3,
    (w) => w.word.target,
    (w) => w.unitId,
    (w) => w.tier
  );
  return {
    kind: "listen-word",
    answer,
    options: shuffleWith(rng, [answer, ...distractors]),
  };
}

function buildListenMeaning(pool: SkillPool, rng: () => number): ListenActivity | null {
  const [sentence] = pickTiered(rng, pool.sentences, 1, (s) => s.target, (s) => s.tier);
  if (!sentence) return null;
  const others = pool.sentences.filter(
    (s) => s.target !== sentence.target && s.native !== sentence.native
  );
  const distractors = pickTiered(rng, others, 3, (s) => s.native, (s) => s.tier).map(
    (s) => s.native
  );
  const options = shuffleWith(rng, [sentence.native, ...distractors]);
  return {
    kind: "listen-meaning",
    sentence,
    options,
    correctIndex: options.indexOf(sentence.native),
  };
}

function buildListenGap(pool: SkillPool, rng: () => number): ListenActivity | null {
  const wordTargets = new Set(pool.words.map((w) => w.word.target));
  const candidates = pool.sentences
    .map((sentence) => {
      const tokens = tokenizeTarget(sentence.target);
      let missing: string | undefined;
      if (sentence.missingWord && tokens.includes(sentence.missingWord)) {
        missing = sentence.missingWord;
      } else {
        missing = tokens.find((t) => wordTargets.has(t));
      }
      return missing ? { sentence, missing } : null;
    })
    .filter((c): c is { sentence: SkillSentence; missing: string } => c !== null);
  const [picked] = pickTiered(
    rng,
    candidates,
    1,
    (c) => c.sentence.target,
    (c) => c.sentence.tier
  );
  if (!picked) return null;
  const { sentence, missing } = picked;
  const answerItem = pool.words.find((w) => w.word.target === missing);
  const distractorWords = answerItem
    ? distractorsFor(rng, pool.words, answerItem, 3, (w) => w.word.target, (w) => w.unitId, (w) => w.tier).map((w) => w.word.target)
    : pickTiered(rng, pool.words.filter((w) => w.word.target !== missing), 3, (w) => w.word.target, (w) => w.tier).map((w) => w.word.target);
  const options = shuffleWith(rng, [missing, ...distractorWords.filter((d) => d !== missing)]);
  return {
    kind: "listen-gap",
    sentence,
    blanked: sentence.target.replace(missing, "＿＿＿"),
    options,
    correctIndex: options.indexOf(missing),
  };
}

/** Buổi Nghe: 5 hoạt động xoay vòng 3 dạng (từ / nghĩa câu / điền từ). */
export function buildListenSession(pool: SkillPool, rng: () => number): ListenActivity[] {
  const builders = [buildListenWord, buildListenMeaning, buildListenGap];
  const order = shuffleWith(rng, [0, 1, 2, 0, 1]);
  const usedKeys = new Set<string>();
  const out: ListenActivity[] = [];
  const keyOf = (a: ListenActivity): string =>
    a.kind === "listen-word" ? `w:${a.answer.word.target}` : `s:${a.sentence.target}:${a.kind}`;
  for (const builderIdx of order) {
    for (let tries = 0; tries < 4; tries++) {
      const activity = builders[builderIdx](pool, rng) ?? buildListenWord(pool, rng);
      if (!activity) break;
      const key = keyOf(activity);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      out.push(activity);
      break;
    }
    if (out.length >= SKILL_SESSION_SIZE) break;
  }
  // Đệm cho đủ 5 bằng dạng nghe từ nếu pool câu ít.
  let guard = 0;
  while (out.length < SKILL_SESSION_SIZE && guard++ < 12) {
    const activity = buildListenWord(pool, rng);
    if (!activity) break;
    const key = keyOf(activity);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    out.push(activity);
  }
  return out;
}

/* ================================= NÓI ================================= */

export type SpeakItem = {
  /** Từ/câu mẫu bé đọc theo. */
  text: string;
  /** Gợi ý hiển thị: phiên âm + nghĩa tiếng Việt. */
  hint: string;
  isSentence: boolean;
  unitTitle: string;
};

export type SpeakingLanguageCode = "en" | "ja" | "zh";

/** Mã ngôn ngữ cho module luyện nói sẵn có (khớp features/speaking/types). */
export function speakingLanguageForCourse(courseId: string): SpeakingLanguageCode {
  if (courseId.startsWith("ja")) return "ja";
  if (courseId.startsWith("zh")) return "zh";
  return "en";
}

/** Buổi Nói: 5 mục từ pool (ưu tiên 3 câu mẫu + 2 từ), thứ tự gieo hạt. */
export function buildSpeakSession(pool: SkillPool, rng: () => number): SpeakItem[] {
  const sentences = pickTiered(rng, pool.sentences, 3, (s) => s.target, (s) => s.tier);
  const words = pickTiered(rng, pool.words, SKILL_SESSION_SIZE - sentences.length, (w) => w.word.target, (w) => w.tier);
  const items: SpeakItem[] = [
    ...sentences.map((s) => ({
      text: s.target,
      hint: s.romanization ? `${s.romanization} · ${s.native}` : s.native,
      isSentence: true,
      unitTitle: s.unitTitle,
    })),
    ...words.map((w) => ({
      text: w.word.target,
      hint: w.word.romanization
        ? `${w.word.romanization} · ${w.word.native}`
        : w.word.native,
      isSentence: false,
      unitTitle: w.unitTitle,
    })),
  ];
  // Nếu thiếu câu/từ thì đệm thêm từ phần còn lại của pool cho đủ 5 mục.
  if (items.length < SKILL_SESSION_SIZE) {
    const usedTexts = new Set(items.map((i) => i.text));
    const extra = pickTiered(
      rng,
      pool.sentences.filter((s) => !usedTexts.has(s.target)),
      SKILL_SESSION_SIZE - items.length,
      (s) => s.target,
      (s) => s.tier
    );
    for (const s of extra) {
      items.push({
        text: s.target,
        hint: s.romanization ? `${s.romanization} · ${s.native}` : s.native,
        isSentence: true,
        unitTitle: s.unitTitle,
      });
    }
  }
  return shuffleWith(rng, items).slice(0, SKILL_SESSION_SIZE);
}

/* ================================= ĐỌC ================================= */

export type ReadQuestion =
  | { kind: "word-meaning"; word: Word; options: string[]; correctIndex: number }
  | {
      kind: "true-false";
      /** Câu hiển thị để bé phán đúng/sai so với đoạn. */
      statement: string;
      isTrue: boolean;
      /** Câu gốc trong đoạn (để hiện đối chiếu sau khi trả lời). */
      sourceTarget: string;
    }
  | { kind: "pick-sentence"; options: string[]; correctIndex: number };

export type ReadSession = {
  unitId: string;
  unitTitle: string;
  passage: SkillSentence[];
  questions: ReadQuestion[];
};

/** Hoán đổi một từ vựng trong câu bằng từ vựng khác cùng unit (để tạo câu sai/bẫy). */
function swapVocabToken(
  sentence: string,
  unitWords: Word[],
  rng: () => number
): string | null {
  const tokens = tokenizeTarget(sentence);
  const byNormalized = new Map(unitWords.map((w) => [normalizeToken(w.target), w]));
  const positions: number[] = [];
  tokens.forEach((token, i) => {
    if (byNormalized.has(normalizeToken(token))) positions.push(i);
  });
  if (positions.length === 0) return null;
  const pos = positions[Math.floor(rng() * positions.length)];
  const original = byNormalized.get(normalizeToken(tokens[pos]))!;
  const replacements = unitWords.filter((w) => w.target !== original.target);
  if (replacements.length === 0) return null;
  const replacement = replacements[Math.floor(rng() * replacements.length)];
  const next = [...tokens];
  next[pos] = replacement.target;
  return next.join(" ");
}

function buildWordMeaningQuestion(
  passage: SkillSentence[],
  unitWords: Word[],
  rng: () => number,
  excludeTargets: Set<string>
): ReadQuestion | null {
  const byNormalized = new Map(unitWords.map((w) => [normalizeToken(w.target), w]));
  const candidates: Word[] = [];
  for (const s of passage) {
    for (const token of tokenizeTarget(s.target)) {
      const word = byNormalized.get(normalizeToken(token));
      if (word && !excludeTargets.has(word.target) && !candidates.includes(word)) {
        candidates.push(word);
      }
    }
  }
  if (candidates.length === 0) return null;
  const word = candidates[Math.floor(rng() * candidates.length)];
  const distractors = shuffleWith(
    rng,
    unitWords.filter((w) => w.target !== word.target && w.native !== word.native)
  )
    .slice(0, 3)
    .map((w) => w.native);
  if (distractors.length < 1) return null;
  const options = shuffleWith(rng, [word.native, ...distractors]);
  return {
    kind: "word-meaning",
    word,
    options,
    correctIndex: options.indexOf(word.native),
  };
}

function buildTrueFalseQuestion(
  passage: SkillSentence[],
  unitWords: Word[],
  rng: () => number
): ReadQuestion | null {
  const sentence = passage[Math.floor(rng() * passage.length)];
  if (!sentence) return null;
  const swapped = rng() < 0.5 ? swapVocabToken(sentence.target, unitWords, rng) : null;
  if (swapped && swapped !== sentence.target) {
    return {
      kind: "true-false",
      statement: swapped,
      isTrue: false,
      sourceTarget: sentence.target,
    };
  }
  return {
    kind: "true-false",
    statement: sentence.target,
    isTrue: true,
    sourceTarget: sentence.target,
  };
}

function buildPickSentenceQuestion(
  pool: SkillPool,
  passage: SkillSentence[],
  unitWords: Word[],
  rng: () => number
): ReadQuestion | null {
  const correct = passage[Math.floor(rng() * passage.length)];
  if (!correct) return null;
  const inPassage = new Set(passage.map((s) => s.target));
  const distractors: string[] = [];
  for (const s of shuffleWith(rng, passage)) {
    if (distractors.length >= 2) break;
    const swapped = swapVocabToken(s.target, unitWords, rng);
    if (swapped && !inPassage.has(swapped) && !distractors.includes(swapped)) {
      distractors.push(swapped);
    }
  }
  if (distractors.length < 2) {
    for (const s of pool.sentences) {
      if (distractors.length >= 2) break;
      if (!inPassage.has(s.target) && !distractors.includes(s.target)) {
        distractors.push(s.target);
      }
    }
  }
  if (distractors.length < 2) return null;
  const options = shuffleWith(rng, [correct.target, ...distractors]);
  return {
    kind: "pick-sentence",
    options,
    correctIndex: options.indexOf(correct.target),
  };
}

/**
 * Buổi Đọc: đoạn 3–5 câu mẫu của MỘT unit trong pool + 4 câu hỏi suy
 * trực tiếp từ đoạn (nghĩa của từ trong đoạn / đúng-sai / chọn câu có
 * trong đoạn). Cộng bước đọc đoạn = 5 hoạt động của buổi.
 */
export function buildReadSession(pool: SkillPool, rng: () => number): ReadSession | null {
  const byUnit = new Map<string, SkillSentence[]>();
  for (const s of pool.sentences) {
    const list = byUnit.get(s.unitId) ?? [];
    list.push(s);
    byUnit.set(s.unitId, list);
  }
  const unitIds = [...byUnit.keys()].filter(
    (id) => (byUnit.get(id)?.length ?? 0) >= 3 && (pool.unitWords[id]?.length ?? 0) >= 4
  );
  if (unitIds.length === 0) return null;
  // Ưu tiên unit có tier thấp nhất (đã học trước), hòa thì gieo hạt chọn.
  const scored = unitIds.map((id) => ({
    id,
    tier: Math.min(...(byUnit.get(id) ?? []).map((s) => s.tier)),
  }));
  const bestTier = Math.min(...scored.map((s) => s.tier));
  const topUnits = scored.filter((s) => s.tier === bestTier).map((s) => s.id);
  const unitId = topUnits[Math.floor(rng() * topUnits.length)];
  const unitSentences = byUnit.get(unitId) ?? [];
  const unitWords = pool.unitWords[unitId] ?? [];
  const passageCount = Math.min(unitSentences.length, 3 + Math.floor(rng() * 3));
  const start = Math.floor(rng() * Math.max(1, unitSentences.length - passageCount + 1));
  const passage = unitSentences.slice(start, start + passageCount);

  const questions: ReadQuestion[] = [];
  const usedWords = new Set<string>();
  const q1 = buildWordMeaningQuestion(passage, unitWords, rng, usedWords);
  if (q1) {
    questions.push(q1);
    if (q1.kind === "word-meaning") usedWords.add(q1.word.target);
  }
  const q2 = buildTrueFalseQuestion(passage, unitWords, rng);
  if (q2) questions.push(q2);
  const q3 = buildPickSentenceQuestion(pool, passage, unitWords, rng);
  if (q3) questions.push(q3);
  const q4 =
    buildWordMeaningQuestion(passage, unitWords, rng, usedWords) ??
    buildTrueFalseQuestion(passage, unitWords, rng);
  if (q4) questions.push(q4);

  if (questions.length === 0) return null;
  return {
    unitId,
    unitTitle: passage[0]?.unitTitle ?? "",
    passage,
    questions,
  };
}

/* ================================= VIẾT ================================= */

export type WriteActivity =
  | { kind: "unscramble"; sentence: SkillSentence; tokens: string[]; shuffled: string[] }
  | {
      kind: "spell";
      word: SkillWordItem;
      /** Từng ký tự của từ: ký tự hiện sẵn hoặc null = ô trống phải điền. */
      display: (string | null)[];
      /** Các chữ cái bị giấu, theo thứ tự trái -> phải. */
      missing: string[];
      /** Ngân hàng chữ cái (chữ bị giấu + chữ nhiễu), đã xáo trộn. */
      bank: string[];
    }
  | {
      kind: "gap-char";
      word: SkillWordItem;
      charIndex: number;
      options: string[];
      correctIndex: number;
    }
  | {
      kind: "stroke";
      word: SkillWordItem;
      char: string;
      data: StrokeCharData;
    }
  | { kind: "char-order"; word: SkillWordItem; chars: string[]; shuffled: string[] };

function buildUnscramble(pool: SkillPool, rng: () => number): WriteActivity | null {
  const candidates = pool.sentences
    .map((sentence) => ({ sentence, tokens: tokenizeTarget(sentence.target) }))
    .filter((c) => c.tokens.length >= 3 && c.tokens.length <= 8);
  const [picked] = pickTiered(rng, candidates, 1, (c) => c.sentence.target, (c) => c.sentence.tier);
  if (!picked) return null;
  let shuffled = shuffleWith(rng, picked.tokens);
  if (shuffled.join(" ") === picked.tokens.join(" ") && picked.tokens.length > 1) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }
  return { kind: "unscramble", sentence: picked.sentence, tokens: picked.tokens, shuffled };
}

function buildSpell(pool: SkillPool, rng: () => number): WriteActivity | null {
  if (pool.targetCode !== "en") return null;
  const candidates = pool.words.filter(
    (w) => /^[a-z]+$/.test(w.word.target) && w.word.target.length >= 3 && w.word.target.length <= 10
  );
  const [word] = pickTiered(rng, candidates, 1, (w) => w.word.target, (w) => w.tier);
  if (!word) return null;
  const letters = word.word.target.split("");
  const blankCount = letters.length <= 4 ? 1 : letters.length <= 7 ? 2 : 3;
  const positions = new Set<number>();
  while (positions.size < blankCount) {
    positions.add(Math.floor(rng() * letters.length));
  }
  const sortedPositions = [...positions].sort((a, b) => a - b);
  const missing = sortedPositions.map((i) => letters[i]);
  const display = letters.map((ch, i) => (positions.has(i) ? null : ch));
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  // 2 chữ nhiễu ngẫu nhiên (trùng chữ bị giấu cũng vô hại: ngân hàng
  // chữ chỉ là các chip để bé chọn, đáp án so theo đúng chữ bị giấu).
  const distractors = [
    alphabet[Math.floor(rng() * alphabet.length)],
    alphabet[Math.floor(rng() * alphabet.length)],
  ];
  return {
    kind: "spell",
    word,
    display,
    missing,
    bank: shuffleWith(rng, [...missing, ...distractors]),
  };
}

function buildGapChar(pool: SkillPool, rng: () => number): WriteActivity | null {
  if (pool.targetCode === "en") return null;
  const [word] = pickTiered(rng, pool.words, 1, (w) => w.word.target, (w) => w.tier);
  if (!word) return null;
  const chars = [...word.word.target];
  if (chars.length === 0) return null;
  const charIndex = Math.floor(rng() * chars.length);
  const correct = chars[charIndex];
  const unitChars = new Set<string>();
  for (const w of pool.unitWords[word.unitId] ?? []) {
    for (const ch of w.target) unitChars.add(ch);
  }
  const distractors = shuffleWith(
    rng,
    [...unitChars].filter((ch) => ch !== correct)
  ).slice(0, 3);
  const options = shuffleWith(rng, [correct, ...distractors]);
  return {
    kind: "gap-char",
    word,
    charIndex,
    options,
    correctIndex: options.indexOf(correct),
  };
}

function buildStroke(pool: SkillPool, rng: () => number): WriteActivity | null {
  const candidates: { word: SkillWordItem; char: string; data: StrokeCharData }[] = [];
  for (const item of pool.words) {
    for (const ch of item.word.target) {
      const data = strokeDataFor(pool.courseId, ch);
      if (data && data.strokes.length >= 2 && data.strokes.length <= 14) {
        candidates.push({ word: item, char: ch, data });
      }
    }
    if (candidates.length >= 16) break;
  }
  if (candidates.length === 0) return null;
  const picked = candidates[Math.floor(rng() * candidates.length)];
  return { kind: "stroke", word: picked.word, char: picked.char, data: picked.data };
}

function buildCharOrder(pool: SkillPool, rng: () => number): WriteActivity | null {
  const candidates = pool.words.filter((w) => [...w.word.target].length >= 2);
  const [word] = pickTiered(rng, candidates, 1, (w) => w.word.target, (w) => w.tier);
  if (!word) return null;
  const chars = [...word.word.target];
  let shuffled = shuffleWith(rng, chars);
  if (shuffled.join("") === chars.join("") && chars.length > 1) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }
  return { kind: "char-order", word, chars, shuffled };
}

/**
 * Buổi Viết: 5 hoạt động — xếp câu + điền chữ/chính tả + tập nét thật
 * (zh/ja, dữ liệu Hanzi Writer / KanjiVG qua lib/strokes). Khóa không
 * có dữ liệu nét (Anh) dùng chính tả thay thế; nếu một khóa CJK thiếu
 * dữ liệu nét cho pool hiện tại thì lùi về dạng xếp thứ tự chữ.
 */
export function buildWriteSession(pool: SkillPool, rng: () => number): WriteActivity[] {
  const isCjk = pool.targetCode === "ja" || pool.targetCode === "zh";
  const plan: (string | null)[] = isCjk
    ? ["unscramble", "gap-char", "stroke", "unscramble", "gap-char"]
    : ["unscramble", "spell", "unscramble", "spell", "spell"];
  const builders: Record<string, (p: SkillPool, r: () => number) => WriteActivity | null> = {
    unscramble: buildUnscramble,
    spell: buildSpell,
    "gap-char": buildGapChar,
    stroke: buildStroke,
    "char-order": buildCharOrder,
  };
  const out: WriteActivity[] = [];
  const usedKeys = new Set<string>();
  const keyOf = (a: WriteActivity): string => {
    switch (a.kind) {
      case "unscramble":
        return `u:${a.sentence.target}`;
      case "spell":
        return `sp:${a.word.word.target}`;
      case "gap-char":
        return `g:${a.word.word.target}:${a.charIndex}`;
      case "stroke":
        return `st:${a.char}`;
      case "char-order":
        return `co:${a.word.word.target}`;
    }
  };
  const tryAdd = (kind: string): boolean => {
    for (let tries = 0; tries < 4; tries++) {
      const activity = builders[kind](pool, rng);
      if (!activity) return false;
      const key = keyOf(activity);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      out.push(activity);
      return true;
    }
    return false;
  };
  for (const kind of plan) {
    if (kind) tryAdd(kind);
    if (out.length >= SKILL_SESSION_SIZE) break;
  }
  // Đệm cho đủ 5 bằng các dạng còn khả thi.
  const fallbacks = isCjk
    ? ["char-order", "unscramble", "gap-char"]
    : ["unscramble", "spell"];
  let guard = 0;
  let consecutiveFailures = 0;
  while (out.length < SKILL_SESSION_SIZE && guard++ < 12 && consecutiveFailures < 3) {
    const kind = fallbacks[guard % fallbacks.length];
    if (tryAdd(kind)) consecutiveFailures = 0;
    else consecutiveFailures += 1;
  }
  return out;
}
