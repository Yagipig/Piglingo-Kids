import catalogJson from "../content/catalog.json";
import { PACKS } from "../content/packs/index";

import type { Catalog, LessonPack, Pack, UnitPack, Word } from "./types";

export const catalog = catalogJson as Catalog;

/** Courses for pickers: deepest course first (Spanish), then alphabetical. */
export const orderedCourses = [...catalog.courses];

export function getPack(courseId: string): Pack {
  const pack = PACKS[courseId];
  if (!pack) throw new Error(`Unknown course: ${courseId}`);
  return pack;
}

export type LessonRef = {
  lesson: LessonPack;
  unit: UnitPack;
  globalIndex: number;
};

function buildLessonIndex(pack: Pack): { list: LessonRef[]; byId: Map<string, LessonRef> } {
  const list: LessonRef[] = [];
  const byId = new Map<string, LessonRef>();
  let index = 0;
  for (const section of pack.sections) {
    for (const unit of section.units) {
      for (const lesson of unit.lessons) {
        const ref = { lesson, unit, globalIndex: index++ };
        list.push(ref);
        byId.set(lesson.id, ref);
      }
    }
  }
  return { list, byId };
}

type CourseCacheEntry = {
  pack: Pack;
  list: LessonRef[];
  byId: Map<string, LessonRef>;
  unitById: Map<string, UnitPack>;
  allWords: Word[];
  wordByTarget: Map<string, Word>;
};

const courseCache = new Map<string, CourseCacheEntry>();

function getCourseCache(courseId: string): CourseCacheEntry {
  let cached = courseCache.get(courseId);
  if (!cached) {
    const pack = getPack(courseId);
    const { list, byId } = buildLessonIndex(pack);
    const unitById = new Map<string, UnitPack>();
    for (const section of pack.sections) {
      for (const unit of section.units) {
        unitById.set(unit.id, unit);
      }
    }
    const allWords = pack.sections.flatMap((s) => s.units.flatMap((u) => u.words));
    const wordByTarget = new Map<string, Word>();
    for (const w of allWords) {
      if (!wordByTarget.has(w.target)) {
        wordByTarget.set(w.target, w);
      }
    }
    cached = { pack, list, byId, unitById, allWords, wordByTarget };
    courseCache.set(courseId, cached);
  }
  return cached;
}

/** Tầng độ khó của bài học, suy từ vị trí toàn cục trong khóa. */
export type DifficultyTier = "co-ban" | "nang-cao" | "chuyen-sau";

export const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  "co-ban": "Cơ bản",
  "nang-cao": "Nâng cao",
  "chuyen-sau": "Chuyên sâu",
};

/**
 * Phân tầng theo vị trí toàn cục của bài trong toàn khóa:
 * <40% số bài = Cơ bản, <75% = Nâng cao, còn lại = Chuyên sâu.
 */
export function difficultyForIndex(globalIndex: number, total: number): DifficultyTier {
  if (total <= 0) return "co-ban";
  const ratio = globalIndex / total;
  if (ratio < 0.4) return "co-ban";
  if (ratio < 0.75) return "nang-cao";
  return "chuyen-sau";
}

export function difficultyLabel(globalIndex: number, total: number): string {
  return DIFFICULTY_LABELS[difficultyForIndex(globalIndex, total)];
}

/** Cấp độ người học nên bắt đầu ở tầng độ khó nào. */
export function tierForLearnerLevel(level: "moi" | "da-biet" | "chuyen-nghiep"): DifficultyTier {
  if (level === "da-biet") return "nang-cao";
  if (level === "chuyen-nghiep") return "chuyen-sau";
  return "co-ban";
}

/** Ba giá trị cấp độ người học (khớp `LearnerLevel` trong store.ts). */
export type LearnerLevelId = "moi" | "da-biet" | "chuyen-nghiep";

/**
 * Sàn bắt đầu theo cấp độ (Hướng 1 — cấp độ = điểm bắt đầu mở bài):
 * `globalIndex` của bài ĐẦU TIÊN thuộc tầng độ khó của cấp độ trong một
 * khóa có `total` bài. "moi" → 0 (học từ bài đầu tiên như cũ);
 * "da-biet" → bài đầu tiên của tầng Nâng cao; "chuyen-nghiep" → bài đầu
 * tiên của tầng Chuyên sâu. Tính bằng chính `difficultyForIndex` để sàn
 * luôn khớp cách chia tầng, không hard-code tỉ lệ lần thứ hai.
 */
export function floorIndexForLevel(level: LearnerLevelId, total: number): number {
  if (total <= 0) return 0;
  const tier = tierForLearnerLevel(level);
  for (let i = 0; i < total; i++) {
    if (difficultyForIndex(i, total) === tier) return i;
  }
  return 0;
}

/**
 * Biên hiệu lực — `globalIndex` của bài "đang học" (bài mở để học tiếp)
 * sau khi áp sàn cấp độ lên tiến độ thật:
 *
 * - Tiến độ thật (`currentLessonIndex`: bài chưa hoàn thành đầu tiên)
 *   đã ở/past sàn → dùng tiến độ thật (điểm bắt đầu không bao giờ lùi
 *   sau những gì bé đã học).
 * - Tiến độ thật còn trước sàn → bài chưa hoàn thành đầu tiên tính TỪ
 *   sàn trở đi (bé bắt đầu học tại tầng của cấp độ; học xong bài ở sàn
 *   thì biên tiến tiếp lên bài chưa xong tiếp theo, không kẹt lại).
 * - Nếu mọi bài từ sàn tới cuối khóa đã xong → quay về bài chưa hoàn
 *   thành đầu tiên của tiến độ thật (phần cơ bản còn thiếu), để bé học
 *   nốt; khi mọi bài đã xong → trả `total` (không còn bài hiện tại).
 *
 * Hàm thuần: không đổi `completedLessons`, không cộng XP — cấp độ chỉ
 * dời ĐIỂM BẮT ĐẦU, không đánh dấu hoàn thành hộ bài nào.
 */
export function effectiveFrontierIndex(
  completedLessons: Record<string, true> = {},
  lessonIds: string[] = [],
  level: LearnerLevelId = "moi"
): number {
  const total = lessonIds.length;
  if (total === 0) return 0;
  const firstIncomplete = lessonIds.findIndex((id) => !completedLessons[id]);
  const progressIndex = firstIncomplete === -1 ? total : firstIncomplete;
  if (progressIndex >= total) return total;
  const floor = floorIndexForLevel(level, total);
  if (progressIndex >= floor) return progressIndex;
  for (let i = floor; i < total; i++) {
    if (!completedLessons[lessonIds[i]]) return i;
  }
  return progressIndex;
}

/**
 * Công thức khóa bài DUY NHẤT sau khi có sàn cấp độ: một bài bị khóa khi
 * nó CHƯA hoàn thành, KHÔNG phải bài ở biên hiệu lực, và chưa mở khóa
 * toàn bộ (mã/admin). Hệ quả: bài đã hoàn thành không bao giờ bị khóa
 * lại (dù hạ cấp độ), bài ở biên luôn mở được thật, mọi bài khác khóa.
 */
export function isLockedAtFrontier(opts: {
  unlockedAll: boolean;
  completed: boolean;
  globalIndex: number;
  frontierIndex: number;
}): boolean {
  return !opts.unlockedAll && !opts.completed && opts.globalIndex !== opts.frontierIndex;
}

export function useCourseContent(courseId: string) {
  const cached = getCourseCache(courseId);
  return {
    pack: cached.pack,
    allLessons: cached.list,
    getLesson: (id: string) => cached.byId.get(id),
    getUnit: (unitId: string) => cached.unitById.get(unitId),
    allWords: () => cached.allWords,
    getWord: (target: string) => cached.wordByTarget.get(target),
  };
}
