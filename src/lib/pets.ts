import {
  buildStages,
  isStageComplete,
  type AdventureStage,
} from "./adventure";
import type { LessonRef } from "./content";
import type { Exercise, Word } from "./types";

/**
 * HỆ THÚ CƯNG (Đợt B+C) — LOGIC THUẦN + DỮ LIỆU, không chứa trạng thái:
 *
 * - Mỗi thế giới một thú để sưu tập: Anh = Sư tử 🦁, Nhật = Cáo Hoa
 *   Đào 🦊, Trung = Gấu Trúc 🐼; hoàn thành trọn một thế giới mở Rồng
 *   Huyền Thoại 🐉 (`legendaryUnlocked` là hàm SUY, không lưu field).
 * - PET SKILL chỉ HỖ TRỢ học, tuyệt đối không làm bài thay bé: đọc mẫu
 *   (TTS), hiện cách đọc/pinyin của từ đích, nhắc từ hay sai — và có
 *   CHỐT CHẶN: nội dung skill trùng đáp án đúng của bài tập hiện tại
 *   thì chỉ hiện GỢI Ý MỘT PHẦN (xem `petSkillForExercise`).
 * - Học là cách nuôi pet: học bài → điểm phát triển; cho ăn → thêm
 *   điểm; phụ kiện mở theo số CHẶNG đã xong của thế giới đó.
 * - Pet KHÔNG BAO GIỜ đói/buồn/chết khi bé nghỉ học — module này không
 *   có bất kỳ trạng thái tiêu cực nào; hồ câu chỉ có động viên + khen.
 * - Quà chặng (`stageReward`) là bảng THUẦN theo số thứ tự chặng.
 */

/* ------------------------------------------------------------------ */
/* Roster thú cưng                                                     */
/* ------------------------------------------------------------------ */

export type PetSkillKind = "speak" | "reading" | "pinyin" | "reminder";

export type WorldPet = {
  courseId: string;
  name: string;
  emoji: string;
  skillName: string;
  skillKind: PetSkillKind;
  /** Mô tả skill cho trang Thú cưng — nhấn mạnh "hỗ trợ, không làm thay". */
  skillBlurb: string;
};

export const WORLD_PETS: Record<string, WorldPet> = {
  "en-vi": {
    courseId: "en-vi",
    name: "Sư tử",
    emoji: "🦁",
    skillName: "Đọc mẫu",
    skillKind: "speak",
    skillBlurb:
      "Sư tử đọc mẫu từ và câu tiếng Anh thật to, rõ ràng để bé nghe và đọc theo. Sư tử chỉ đọc mẫu thôi — bé vẫn tự chọn đáp án nhé!",
  },
  "ja-vi": {
    courseId: "ja-vi",
    name: "Cáo Hoa Đào",
    emoji: "🦊",
    skillName: "Cách đọc",
    skillKind: "reading",
    skillBlurb:
      "Cáo Hoa Đào hiện cách đọc kana/romaji của từ để bé đọc theo. Nếu bài đang hỏi đúng cách đọc đó, Cáo chỉ gợi ý một phần nhỏ thôi.",
  },
  "zh-vi": {
    courseId: "zh-vi",
    name: "Gấu Trúc",
    emoji: "🐼",
    skillName: "Pinyin & thanh điệu",
    skillKind: "pinyin",
    skillBlurb:
      "Gấu Trúc hiện pinyin kèm thanh điệu của từ để bé đọc đúng cao độ. Nếu bài đang hỏi đúng pinyin đó, Gấu Trúc chỉ gợi ý một phần nhỏ thôi.",
  },
};

export const LEGENDARY_PET = {
  id: "legendary",
  name: "Rồng Huyền Thoại",
  emoji: "🐉",
  skillName: "Nhắc bài cũ",
  skillKind: "reminder" as PetSkillKind,
  skillBlurb:
    "Rồng Huyền Thoại nhớ hết những từ bé hay trả lời sai và nhắc lại đúng lúc bé cần. Mở khóa khi bé hoàn thành trọn một thế giới.",
};

/** Thú của một thế giới; null nếu khóa không thuộc ba khóa thật. */
export function petForCourse(courseId: string): WorldPet | null {
  return WORLD_PETS[courseId] ?? null;
}

/** Thú đang đồng hành đã hợp nhất để UI dùng chung (thế giới / huyền thoại). */
export type CompanionPet = {
  name: string;
  emoji: string;
  skillName: string;
  skillKind: PetSkillKind;
  skillBlurb: string;
  legendary: boolean;
};

/**
 * Thú đồng hành trong bài học / trên bản đồ: mặc định là thú của thế
 * giới của bài học; khi bé đã mở Rồng và chọn Rồng đồng hành
 * (`activeCompanion === "legendary"`) thì Rồng đi theo ở mọi thế giới.
 */
export function companionPetFor(opts: {
  activeCompanion: "world" | "legendary";
  courseId: string;
  legendary: boolean;
}): CompanionPet | null {
  if (opts.activeCompanion === "legendary" && opts.legendary) {
    return { ...LEGENDARY_PET, legendary: true };
  }
  const pet = petForCourse(opts.courseId);
  return pet ? { ...pet, legendary: false } : null;
}

/**
 * Rồng Huyền Thoại mở khi có ÍT NHẤT một khóa hoàn thành 100% số bài.
 * Hàm suy thuần từ tiến độ — không lưu field riêng trong store.
 * `totalsByCourse`: tổng số bài thật của từng khóa (từ catalog).
 */
export function legendaryUnlocked(
  courses: Record<
    string,
    { completedLessons?: Record<string, true> } | undefined
  > = {},
  totalsByCourse: Record<string, number> = {}
): boolean {
  return Object.entries(totalsByCourse).some(([courseId, total]) => {
    if (!total || total <= 0) return false;
    const done = Object.keys(courses?.[courseId]?.completedLessons ?? {}).length;
    return done >= total;
  });
}

/* ------------------------------------------------------------------ */
/* Cấp pet theo điểm phát triển                                        */
/* ------------------------------------------------------------------ */

/** Ngưỡng điểm phát triển cho cấp 1..10 (mảng tăng dần, phần tử đầu = 0). */
export const PET_LEVEL_THRESHOLDS = [
  0, 50, 150, 300, 500, 800, 1200, 1800, 2600, 3600,
] as const;

export type PetLevel = {
  /** Cấp hiện tại, 1..10. */
  level: number;
  /** Điểm phát triển đã chuẩn hoá (≥ 0, nguyên). */
  growth: number;
  /** Ngưỡng của cấp hiện tại. */
  currentThreshold: number;
  /** Ngưỡng cấp kế; null khi đã cấp cao nhất. */
  nextThreshold: number | null;
  /** Điểm còn thiếu để lên cấp; null khi cấp cao nhất. */
  toNext: number | null;
  /** Tiến độ trong cấp hiện tại, 0..1 (1 khi cấp cao nhất). */
  progress01: number;
  isMax: boolean;
};

export function petLevelFor(growth: number): PetLevel {
  const g = Math.max(0, Math.floor(Number.isFinite(growth) ? growth : 0));
  let level = 1;
  for (let i = 0; i < PET_LEVEL_THRESHOLDS.length; i++) {
    if (g >= PET_LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const currentThreshold = PET_LEVEL_THRESHOLDS[level - 1];
  const nextThreshold =
    level < PET_LEVEL_THRESHOLDS.length
      ? PET_LEVEL_THRESHOLDS[level]
      : null;
  const progress01 =
    nextThreshold == null
      ? 1
      : Math.min(
          1,
          Math.max(0, (g - currentThreshold) / (nextThreshold - currentThreshold))
        );
  return {
    level,
    growth: g,
    currentThreshold,
    nextThreshold,
    toNext: nextThreshold == null ? null : nextThreshold - g,
    progress01,
    isMax: nextThreshold == null,
  };
}

/* ------------------------------------------------------------------ */
/* Quà chặng + phụ kiện                                                */
/* ------------------------------------------------------------------ */

export type StageReward = {
  xpBonus: number;
  food: number;
  stars: number;
  key: number;
};

/**
 * Bảng quà khi nhận rương một chặng — THUẦN theo số thứ tự chặng
 * (stageNumber tính từ 1): mọi chặng +10 XP, +1 thức ăn, +3 sao; cứ
 * mỗi 3 chặng (3, 6, 9, …) thêm 1 chìa khóa bí mật.
 */
export function stageReward(stageNumber: number): StageReward {
  const n = Math.max(1, Math.floor(Number.isFinite(stageNumber) ? stageNumber : 1));
  return { xpBonus: 10, food: 1, stars: 3, key: n % 3 === 0 ? 1 : 0 };
}

export type PetAccessory = {
  id: string;
  emoji: string;
  name: string;
  /** Số chặng đã xong của thế giới đó cần đạt để mở món này. */
  unlockStage: number;
};

/** Các mốc chặng mở phụ kiện, tăng dần theo thứ tự món trong tủ. */
export const ACCESSORY_UNLOCK_STAGES = [3, 6, 9, 12, 15, 18] as const;

export const PET_ACCESSORIES: Record<string, PetAccessory[]> = {
  "en-vi": [
    { id: "su-tu-khan-do", emoji: "🧣", name: "Khăn Choàng Đỏ", unlockStage: 3 },
    { id: "su-tu-mu-xanh", emoji: "🧢", name: "Mũ Lưỡi Trai Xanh", unlockStage: 6 },
    { id: "su-tu-chuong-vang", emoji: "🔔", name: "Chuông Vàng Nhỏ", unlockStage: 9 },
    { id: "su-tu-kinh-sao", emoji: "🕶️", name: "Kính Mát Ngôi Sao", unlockStage: 12 },
    { id: "su-tu-huy-hieu", emoji: "🏅", name: "Huy Hiệu Dũng Cảm", unlockStage: 15 },
    { id: "su-tu-vuong-mien", emoji: "👑", name: "Vương Miện Vàng", unlockStage: 18 },
  ],
  "ja-vi": [
    { id: "cao-no-hoa-dao", emoji: "🎀", name: "Nơ Hoa Đào", unlockStage: 3 },
    { id: "cao-khan-lua", emoji: "🧣", name: "Khăn Lụa Hồng", unlockStage: 6 },
    { id: "cao-tram-hoa", emoji: "🌸", name: "Trâm Hoa Anh Đào", unlockStage: 9 },
    { id: "cao-quat-giay", emoji: "🪭", name: "Quạt Giấy Hoa Đào", unlockStage: 12 },
    { id: "cao-huy-hieu", emoji: "🏅", name: "Huy Hiệu Hoa Đào", unlockStage: 15 },
    { id: "cao-vuong-mien", emoji: "👑", name: "Vương Miện Hoa", unlockStage: 18 },
  ],
  "zh-vi": [
    { id: "gau-no-tre", emoji: "🎀", name: "Nơ Tre Xanh", unlockStage: 3 },
    { id: "gau-khan-do", emoji: "🧣", name: "Khăn Đỏ Dũng Sĩ", unlockStage: 6 },
    { id: "gau-mu-la-tre", emoji: "🎋", name: "Mũ Lá Tre", unlockStage: 9 },
    { id: "gau-kinh-tron", emoji: "👓", name: "Kính Tròn Học Giả", unlockStage: 12 },
    { id: "gau-chuong-tre", emoji: "🔔", name: "Chuông Tre Nhỏ", unlockStage: 15 },
    { id: "gau-vuong-mien", emoji: "👑", name: "Vương Miện Tre Vàng", unlockStage: 18 },
  ],
};

/** Tủ phụ kiện của thú một thế giới (6 món, mốc chặng tăng dần). */
export function accessoriesFor(courseId: string): PetAccessory[] {
  return PET_ACCESSORIES[courseId] ?? [];
}

export function accessoryById(
  courseId: string,
  accessoryId: string
): PetAccessory | null {
  return accessoriesFor(courseId).find((item) => item.id === accessoryId) ?? null;
}

/** Món mở khi số chặng ĐÃ XONG của thế giới đó đạt mốc của món. */
export function isAccessoryUnlocked(
  item: PetAccessory,
  completedStages: number
): boolean {
  return completedStages >= item.unlockStage;
}

/** Số chặng đã hoàn thành toàn bộ trong một khóa (từ completedLessons thật). */
export function completedStageCount(
  allLessons: LessonRef[],
  completedLessons: Record<string, true> = {}
): number {
  return buildStages(allLessons).filter((stage) =>
    isStageComplete(stage, completedLessons)
  ).length;
}

export type StageClaimCheck =
  | { ok: true; reward: StageReward; stage: AdventureStage }
  | { ok: false };

/**
 * Điều kiện nhận quà rương chặng — THUẦN để store và test dùng chung:
 * chặng (theo stageNumber từ 1) phải tồn tại, đã hoàn thành THẬT theo
 * completedLessons, và chưa từng được nhận quà. Đủ cả ba mới `ok`.
 */
export function stageClaimCheck(opts: {
  allLessons: LessonRef[];
  completedLessons: Record<string, true>;
  claimedStages: number[];
  stageNumber: number;
}): StageClaimCheck {
  const stage = buildStages(opts.allLessons)[opts.stageNumber - 1];
  if (!stage) return { ok: false };
  if ((opts.claimedStages ?? []).includes(opts.stageNumber)) return { ok: false };
  if (!isStageComplete(stage, opts.completedLessons)) return { ok: false };
  return { ok: true, reward: stageReward(opts.stageNumber), stage };
}

/* ------------------------------------------------------------------ */
/* Hồ câu thoại của pet — CHỈ động viên và khen, không chê bai          */
/* ------------------------------------------------------------------ */

export const ENCOURAGEMENT_WRONG: string[] = [
  "Không sao đâu, sai là để nhớ lâu hơn đó! Thử tiếp nhé 💪",
  "Suýt đúng rồi! Mình cùng xem đáp án đúng để nhớ nhé.",
  "Câu này hơi khó, nhưng bé đã rất cố gắng rồi!",
  "Đừng buồn nhé — mỗi lần sai là một lần mình khôn ra.",
  "Hít thở sâu nào… câu tiếp theo mình làm được mà!",
  "Bé giỏi lắm khi dám thử! Xem đáp án đúng rồi mình đi tiếp nhé.",
  "Sai một chút thôi, không vấn đề gì đâu. Mình nhớ từ này nhé!",
  "Cố lên! Nhà thám hiểm giỏi nhất cũng có lúc lạc đường mà.",
];

export const PRAISE_RIGHT: string[] = [
  "Đúng rồi! Bé giỏi quá! 🎉",
  "Chính xác! Mình tự hào về bé lắm!",
  "Tuyệt vời, nhớ từ này chắc luôn rồi!",
  "Đúng phóc! Cứ thế phát huy nhé!",
  "Hay quá! Bé tiến bộ từng ngày luôn đó.",
  "Chuẩn không cần chỉnh! 🌟",
  "Giỏi! Từ khó thế mà bé cũng làm được.",
];

export const PERFECT_LINES: string[] = [
  "Không sai một câu nào — bé và mình là đội vô địch! 🏆",
  "Hoàn hảo! Mình vui tới mức muốn nhảy múa luôn!",
  "Xuất sắc tuyệt đối! Bé xứng đáng được vỗ tay thật to! 👏",
  "Một bài học hoàn hảo — mình tự hào về bé lắm lắm!",
];

/** Chọn ngẫu nhiên một câu trong hồ, tránh lặp lại câu vừa dùng (nếu truyền vào). */
export function pickLine(pool: string[], exclude?: string | null): string {
  if (pool.length === 0) return "";
  const candidates = pool.filter((line) => line !== exclude);
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/* ------------------------------------------------------------------ */
/* Từ hay sai nhất (cho skill Nhắc bài cũ của Rồng)                    */
/* ------------------------------------------------------------------ */

export type MissedWord = { target: string; wrong: number; correct: number };

/**
 * Từ bé hay sai nhất của một khóa, suy từ `wordStats` thật: số lần sai
 * cao nhất; hòa thì lấy từ gặp gần nhất. Chưa từng sai từ nào → null.
 */
export function mostMissedWord(course: {
  wordStats?: Record<
    string,
    { correct: number; wrong: number; lastSeen: number }
  >;
}): MissedWord | null {
  const stats = course?.wordStats ?? {};
  let best: (MissedWord & { lastSeen: number }) | null = null;
  for (const [target, s] of Object.entries(stats)) {
    if (!s || (s.wrong ?? 0) <= 0) continue;
    if (
      !best ||
      s.wrong > best.wrong ||
      (s.wrong === best.wrong && (s.lastSeen ?? 0) > best.lastSeen)
    ) {
      best = {
        target,
        wrong: s.wrong,
        correct: s.correct ?? 0,
        lastSeen: s.lastSeen ?? 0,
      };
    }
  }
  return best
    ? { target: best.target, wrong: best.wrong, correct: best.correct }
    : null;
}

/* ------------------------------------------------------------------ */
/* PET SKILL trong bài học — kèm CHỐT CHẶN không lộ đáp án             */
/* ------------------------------------------------------------------ */

export type PetSkillContent =
  | {
      kind: "speak";
      /** Văn bản sẽ phát TTS (đã qua chốt chặn: gợi ý một phần thì chỉ từ đầu). */
      speakText: string;
      /** Văn bản hiện kèm trong thẻ skill. */
      displayText: string;
      partial: boolean;
    }
  | {
      kind: "reading";
      wordTarget: string;
      /** Cách đọc/pinyin đầy đủ (chỉ để đối chiếu nội bộ). */
      reading: string;
      /** Nội dung được phép hiện (đã qua chốt chặn). */
      displayText: string;
      /** Thanh điệu của pinyin (chỉ với skill pinyin), ví dụ "thanh 3, thanh 2". */
      toneLabel: string;
      partial: boolean;
    };

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Các chuỗi được coi là "đáp án đúng" của bài tập — căn cứ cho chốt chặn. */
export function answerTextsForExercise(exercise: Exercise): string[] {
  switch (exercise.type) {
    case "select":
      return [exercise.options[exercise.correct]?.text ?? ""].filter(Boolean);
    case "fillBlank":
      return [exercise.options[exercise.correct] ?? ""].filter(Boolean);
    case "wordBank":
      return [exercise.answer.join(" ")];
    case "typeAnswer":
      return [exercise.answer, ...exercise.alternatives].filter(Boolean);
    case "match":
      return [];
  }
}

/** Bỏ phần ghi chú trong ngoặc ở cuối prompt (pack zh ghi "一 (yī)"). */
function stripPromptParens(prompt: string): string {
  return prompt.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * Từ đích (target) mà skill được phép xoay quanh — luôn là từ thuộc
 * PHẦN ĐỀ BÀI, không bao giờ là đáp án:
 * - select: prompt/audioTarget (trừ nativeToTarget — đáp án nằm trong
 *   các lựa chọn nên không có từ đích an toàn → null).
 * - fillBlank: từ đầu tiên của câu mẫu có trong sổ từ và KHÁC từ đáp án.
 * - wordBank (targetToNative): từ đầu tiên của câu đích có trong sổ từ.
 * - Còn lại (match, typeAnswer…) → null (skill đọc/pinyin ẩn).
 */
export function focusWordForExercise(
  exercise: Exercise,
  getWord: (target: string) => Word | undefined
): Word | null {
  const firstKnownToken = (text: string, skip?: string): Word | null => {
    for (const token of text.split(/\s+/)) {
      const clean = token.replace(/[.,!?。！？、]/g, "").trim();
      if (!clean || clean === skip) continue;
      const word = getWord(clean);
      if (word) return word;
    }
    return null;
  };
  switch (exercise.type) {
    case "select": {
      if (exercise.mode === "nativeToTarget") return null;
      const target = exercise.audioTarget ?? stripPromptParens(exercise.prompt);
      return getWord(target) ?? null;
    }
    case "fillBlank": {
      const sentence = exercise.audioTarget ?? exercise.sentence;
      return firstKnownToken(sentence, exercise.options[exercise.correct]);
    }
    case "wordBank": {
      if (exercise.direction !== "targetToNative") return null;
      const text = exercise.audioTarget ?? exercise.prompt.split("\n")[0];
      return text ? firstKnownToken(text) : null;
    }
    default:
      return null;
  }
}

/**
 * Cách đọc của một từ theo dữ liệu THẬT trong pack:
 * - Mọi khóa: ưu tiên field `romanization` (ja = romaji, zh = pinyin).
 * - Riêng ja: từ kana đơn lẻ không có romanization vì field `native`
 *   của chúng CHÍNH LÀ cách đọc romaji (dữ liệu pack) → dùng native.
 * Không có dữ liệu đọc thật → null (UI ẩn nút skill ở bài đó).
 */
export function readingForWord(word: Word, courseId: string): string | null {
  if (word.romanization && word.romanization.trim()) {
    return word.romanization.trim();
  }
  if (courseId === "ja-vi" && /^[\u3040-\u30ff]+$/.test(word.target)) {
    return word.native?.trim() || null;
  }
  return null;
}

const TONE_MARKS: Record<string, number> = {
  ā: 1, á: 2, ǎ: 3, à: 4,
  ē: 1, é: 2, ě: 3, è: 4,
  ī: 1, í: 2, ǐ: 3, ì: 4,
  ō: 1, ó: 2, ǒ: 3, ò: 4,
  ū: 1, ú: 2, ǔ: 3, ù: 4,
  ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4,
};

const TONE_NAMES: Record<number, string> = {
  1: "thanh 1 (cao và ngang)",
  2: "thanh 2 (đi lên)",
  3: "thanh 3 (xuống rồi lên)",
  4: "thanh 4 (đi xuống)",
};

/** Nhãn thanh điệu của một pinyin, theo thứ tự dấu thanh xuất hiện. */
export function toneLabelForPinyin(pinyin: string): string {
  const tones: number[] = [];
  for (const ch of pinyin) {
    const tone = TONE_MARKS[ch];
    if (tone && tones[tones.length - 1] !== tone) tones.push(tone);
  }
  if (tones.length === 0) return "thanh nhẹ (không dấu)";
  return tones.map((t) => TONE_NAMES[t]).join(", ");
}

/** Gợi ý MỘT PHẦN của cách đọc khi chốt chặn kích hoạt — không bao giờ là đáp án. */
function partialReadingDisplay(
  reading: string,
  skillKind: "reading" | "pinyin"
): string {
  if (skillKind === "pinyin") {
    return `${reading.charAt(0)}••• · ${toneLabelForPinyin(reading)}`;
  }
  if (reading.length <= 2) return `Cách đọc có ${reading.length} chữ cái`;
  return `${reading.charAt(0)}•••`;
}

/**
 * Nội dung skill cho bài tập hiện tại, đã qua CHỐT CHẶN:
 * - Skill chỉ xoay quanh TỪ ĐÍCH thuộc đề bài (`focusWordForExercise`).
 * - Nếu nội dung skill TRÙNG đáp án đúng của chính bài tập này (ví dụ
 *   bài hỏi cách đọc của từ kana mà đáp án là cách đọc đó) → chỉ còn
 *   GỢI Ý MỘT PHẦN: đọc mẫu chỉ phát từ đầu tiên; cách đọc/pinyin chỉ
 *   hiện chữ cái đầu + thanh điệu. UI ghi rõ "(gợi ý một phần)".
 * - Không xác định được nội dung an toàn → null (ẩn nút skill).
 */
export function petSkillForExercise(opts: {
  exercise: Exercise;
  courseId: string;
  skillKind: PetSkillKind;
  getWord: (target: string) => Word | undefined;
}): PetSkillContent | null {
  const { exercise, courseId, skillKind, getWord } = opts;
  if (skillKind === "reminder") return null; // Rồng dùng mostMissedWord riêng
  const answers = answerTextsForExercise(exercise).map(normalizeKey);
  const hitsAnswer = (text: string) =>
    text.length > 0 && answers.includes(normalizeKey(text));

  if (skillKind === "speak") {
    let text: string | null = null;
    switch (exercise.type) {
      case "select":
        if (exercise.mode === "nativeToTarget") return null;
        text = exercise.audioTarget ?? stripPromptParens(exercise.prompt);
        break;
      case "fillBlank":
        // Đọc CÂU CÒN KHUYẾT (phần đề bài), không đọc câu đã điền đáp án.
        text = exercise.sentence.replace(/___+/g, " … ");
        break;
      case "wordBank":
        if (exercise.direction !== "targetToNative") return null;
        text = exercise.audioTarget ?? exercise.prompt.split("\n")[0] ?? null;
        break;
      case "typeAnswer":
        if (exercise.mode !== "listen") return null;
        text = exercise.audioTarget ?? exercise.prompt;
        break;
      default:
        return null;
    }
    if (!text || !text.trim()) return null;
    const partial = hitsAnswer(text);
    const speakText = partial ? (text.trim().split(/\s+/)[0] ?? text) : text;
    return { kind: "speak", speakText, displayText: text, partial };
  }

  // skillKind "reading" | "pinyin"
  const word = focusWordForExercise(exercise, getWord);
  if (!word) return null;
  const reading = readingForWord(word, courseId);
  if (!reading) return null;
  const partial = hitsAnswer(reading);
  return {
    kind: "reading",
    wordTarget: word.target,
    reading,
    displayText: partial
      ? partialReadingDisplay(reading, skillKind)
      : reading,
    toneLabel: skillKind === "pinyin" ? toneLabelForPinyin(reading) : "",
    partial,
  };
}
