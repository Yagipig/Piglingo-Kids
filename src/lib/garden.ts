import {
  allCourseRewardProgress,
  evaluateCondition,
  scopedFamilyRewards,
  visibleFamilyRewards,
  type FamilyReward,
  type GlobalReward,
  type RewardProgressState,
} from "./rewards";
import { catalog, difficultyLabel, getPack, type LessonRef } from "./content";
import { kingdomForCourse } from "./kingdoms";

/**
 * Trạng thái "vườn thần tiên" suy ra THUẦN từ tiến độ học thật (derived
 * view state): không lưu thêm field nào, không sửa store. Mọi hàm ở đây
 * không đọc store trực tiếp — nơi gọi truyền snapshot tiến độ hiện có,
 * theo đúng mẫu của src/lib/rewards.ts.
 */

export interface GardenDayActivity {
  xp: number;
  lessons: number;
  perfect: number;
}

export interface GardenProgressState extends RewardProgressState {
  courses?: Record<
    string,
    { xp?: number; completedLessons?: Record<string, true> } | undefined
  >;
  dailyGoal?: number;
  dailyXp?: number;
  dailyXpDay?: string | null;
  activeDays?: Record<string, GardenDayActivity>;
}

function dayString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Tổng XP của cả ba khóa — căn cứ cho cấp vườn và giai đoạn cây thần. */
export function totalGardenXp(progress: GardenProgressState): number {
  let total = 0;
  for (const course of catalog.courses) {
    total += progress.courses?.[course.id]?.xp ?? 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Cấp độ vườn (chỉ là nhãn hiển thị suy từ tổng XP — không phải cấp độ học)
// ---------------------------------------------------------------------------

export interface GardenLevel {
  level: number;
  name: string;
  minXp: number;
}

export const GARDEN_LEVELS: GardenLevel[] = [
  { level: 1, name: "Người bạn hạt mầm", minXp: 0 },
  { level: 2, name: "Người chăm mầm", minXp: 50 },
  { level: 3, name: "Người bạn của hoa", minXp: 150 },
  { level: 4, name: "Người khám phá vườn", minXp: 300 },
  { level: 5, name: "Người giữ cây thần", minXp: 500 },
  { level: 6, name: "Người làm vườn thần tiên", minXp: 800 },
  { level: 7, name: "Đại pháp sư khu vườn", minXp: 1200 },
];

export interface GardenLevelState {
  current: GardenLevel;
  next: GardenLevel | null;
  /** XP còn thiếu tới cấp tiếp theo; null khi đã ở cấp cao nhất. */
  xpToNext: number | null;
}

export function gardenLevelForXp(totalXp: number): GardenLevelState {
  let current = GARDEN_LEVELS[0];
  for (const level of GARDEN_LEVELS) {
    if (totalXp >= level.minXp) current = level;
  }
  const next =
    GARDEN_LEVELS.find((level) => level.level === current.level + 1) ?? null;
  return {
    current,
    next,
    xpToNext: next ? Math.max(0, next.minXp - totalXp) : null,
  };
}

// ---------------------------------------------------------------------------
// Cây thần lớn dần theo tổng XP
// ---------------------------------------------------------------------------

export interface TreeStage {
  stage: number;
  minXp: number;
  label: string;
  /** Quy mô hiển thị của ảnh cây (% so với kích thước đầy). */
  scalePct: number;
  decoFlowers: number;
  decoStars: number;
  glow: boolean;
}

export const TREE_STAGES: TreeStage[] = [
  { stage: 0, minXp: 0, label: "Mầm cây thần", scalePct: 62, decoFlowers: 0, decoStars: 0, glow: false },
  { stage: 1, minXp: 50, label: "Cây non", scalePct: 70, decoFlowers: 0, decoStars: 2, glow: false },
  { stage: 2, minXp: 150, label: "Cây trẻ", scalePct: 78, decoFlowers: 4, decoStars: 0, glow: false },
  { stage: 3, minXp: 300, label: "Cây nở hoa", scalePct: 86, decoFlowers: 8, decoStars: 3, glow: false },
  { stage: 4, minXp: 500, label: "Cây thần vững chãi", scalePct: 93, decoFlowers: 10, decoStars: 4, glow: false },
  { stage: 5, minXp: 800, label: "Cây thần rực rỡ", scalePct: 100, decoFlowers: 10, decoStars: 5, glow: true },
  { stage: 6, minXp: 1200, label: "Cây thần huyền thoại", scalePct: 104, decoFlowers: 12, decoStars: 6, glow: true },
];

export function treeStageForXp(totalXp: number): TreeStage {
  let stage = TREE_STAGES[0];
  for (const candidate of TREE_STAGES) {
    if (totalXp >= candidate.minXp) stage = candidate;
  }
  return stage;
}

// ---------------------------------------------------------------------------
// Hoa theo từng unit (32 vị trí cố định theo thứ tự catalog → section → unit)
// ---------------------------------------------------------------------------

export type UnitFlowerState = "seed" | "growing" | "bloomed";

export interface UnitFlower {
  courseId: string;
  unitId: string;
  unitTitle: string;
  /** 0..1 — tỉ lệ bài đã hoàn thành trong unit. */
  ratio: number;
  state: UnitFlowerState;
  flowerEmoji: string;
}

export function gardenFlowers(progress: GardenProgressState): UnitFlower[] {
  const flowers: UnitFlower[] = [];
  for (const course of catalog.courses) {
    const pack = getPack(course.id);
    const completedIds = new Set(
      Object.keys(progress.courses?.[course.id]?.completedLessons ?? {}),
    );
    const kingdom = kingdomForCourse(course.id);
    for (const section of pack.sections) {
      for (const unit of section.units) {
        const total = unit.lessons.length;
        const done = unit.lessons.filter((lesson) => completedIds.has(lesson.id)).length;
        const ratio = total > 0 ? done / total : 0;
        flowers.push({
          courseId: course.id,
          unitId: unit.id,
          unitTitle: unit.title,
          ratio,
          state: ratio >= 1 ? "bloomed" : ratio > 0 ? "growing" : "seed",
          flowerEmoji: kingdom?.flowerEmoji ?? "🌼",
        });
      }
    }
  }
  return flowers;
}

/** Số unit đã hoàn thành trọn vẹn, theo từng khóa. */
export function completedUnitsByCourse(
  progress: GardenProgressState,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const course of catalog.courses) {
    const pack = getPack(course.id);
    const completedIds = new Set(
      Object.keys(progress.courses?.[course.id]?.completedLessons ?? {}),
    );
    let count = 0;
    for (const section of pack.sections) {
      for (const unit of section.units) {
        if (
          unit.lessons.length > 0 &&
          unit.lessons.every((lesson) => completedIds.has(lesson.id))
        ) {
          count += 1;
        }
      }
    }
    result[course.id] = count;
  }
  return result;
}

/** Tổng số bài đã hoàn thành (chỉ đếm lesson có thật trong pack). */
export function totalCompletedLessons(progress: GardenProgressState): number {
  return allCourseRewardProgress(progress).reduce(
    (sum, course) => sum + course.completed,
    0,
  );
}

// ---------------------------------------------------------------------------
// Mục tiêu ngày → bướm; hoạt động tuần hiện tại (thứ Hai – Chủ nhật)
// ---------------------------------------------------------------------------

/** Tương đương dailyXpToday() của store, giữ thuần để test độc lập. */
export function gardenDailyXpToday(
  progress: GardenProgressState,
  now = new Date(),
): number {
  return progress.dailyXpDay === dayString(now) ? (progress.dailyXp ?? 0) : 0;
}

/** Bướm chỉ bay khi XP hôm nay đạt mục tiêu ngày. */
export function butterfliesReleased(
  progress: GardenProgressState,
  now = new Date(),
): boolean {
  const goal = progress.dailyGoal ?? 0;
  return goal > 0 && gardenDailyXpToday(progress, now) >= goal;
}

/** 7 khóa ngày của tuần hiện tại theo lịch địa phương, thứ Hai → Chủ nhật. */
export function currentWeekDayKeys(now = new Date()): string[] {
  const mondayOffset = (now.getDay() + 6) % 7; // CN=0 → lùi 6; T2=1 → lùi 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(
      dayString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    );
  }
  return keys;
}

export interface WeeklyChallenge {
  xp: { value: number; target: number; done: boolean };
  lessons: { value: number; target: number; done: boolean };
}

/**
 * Thử thách tuần từ activeDays thật. XP ở đây gồm cả XP bài học và XP
 * bonus từ game (nhãn UI phải là "XP hoạt động"). Không có trạng thái
 * thất bại và không lưu "đã nhận thử thách".
 */
export function weeklyChallenge(
  progress: GardenProgressState,
  now = new Date(),
): WeeklyChallenge {
  const days = progress.activeDays ?? {};
  let xp = 0;
  let lessons = 0;
  for (const key of currentWeekDayKeys(now)) {
    xp += days[key]?.xp ?? 0;
    lessons += days[key]?.lessons ?? 0;
  }
  const dailyGoal = progress.dailyGoal && progress.dailyGoal > 0 ? progress.dailyGoal : 20;
  const xpTarget = Math.max(50, dailyGoal * 5);
  const lessonsTarget = 5;
  return {
    xp: { value: xp, target: xpTarget, done: xp >= xpTarget },
    lessons: { value: lessons, target: lessonsTarget, done: lessons >= lessonsTarget },
  };
}

// ---------------------------------------------------------------------------
// Thú đồng hành — mở khóa theo mốc tích lũy/lịch sử, không theo streak hiện tại
// ---------------------------------------------------------------------------

export interface Companion {
  id: string;
  emoji: string;
  name: string;
  /** Điều kiện mở khóa, hiển thị cho trẻ/phụ huynh. */
  conditionLabel: string;
  unlocked: boolean;
}

export function gardenCompanions(progress: GardenProgressState): Companion[] {
  const unitsByCourse = completedUnitsByCourse(progress);
  const totalUnits = Object.values(unitsByCourse).reduce((a, b) => a + b, 0);
  const totalLessons = totalCompletedLessons(progress);
  const anyCourseComplete = allCourseRewardProgress(progress).some((c) => c.complete);
  const maxLessonsInDay = Math.max(
    0,
    ...Object.values(progress.activeDays ?? {}).map((day) => day.lessons ?? 0),
  );

  const defs: (Omit<Companion, "unlocked"> & { unlocked: boolean })[] = [
    { id: "piggy", emoji: "🐷", name: "Bé Heo", conditionLabel: "Bạn đồng hành đầu tiên của vườn", unlocked: true },
    { id: "rabbit", emoji: "🐰", name: "Thỏ Bông", conditionLabel: "Hoàn thành bài học đầu tiên", unlocked: totalLessons >= 1 },
    { id: "cat", emoji: "🐱", name: "Mèo Miu", conditionLabel: "Hoàn thành trọn 1 vùng đất bất kỳ", unlocked: totalUnits >= 1 },
    { id: "owl", emoji: "🦉", name: "Cú Sách", conditionLabel: "Hoàn thành trọn 1 vùng đất Tiếng Anh", unlocked: (unitsByCourse["en-vi"] ?? 0) >= 1 },
    { id: "fox", emoji: "🦊", name: "Cáo Hoa Đào", conditionLabel: "Hoàn thành trọn 1 vùng đất Tiếng Nhật", unlocked: (unitsByCourse["ja-vi"] ?? 0) >= 1 },
    { id: "panda", emoji: "🐼", name: "Gấu Trúc", conditionLabel: "Hoàn thành trọn 1 vùng đất Tiếng Trung", unlocked: (unitsByCourse["zh-vi"] ?? 0) >= 1 },
    { id: "bird", emoji: "🐦", name: "Chim Sẻ", conditionLabel: "Có một ngày hoàn thành ít nhất 3 bài", unlocked: maxLessonsInDay >= 3 },
    { id: "lion", emoji: "🦁", name: "Sư Tử Dũng Cảm", conditionLabel: "Hoàn thành trọn 1 khóa ngôn ngữ", unlocked: anyCourseComplete },
  ];
  return defs;
}

// ---------------------------------------------------------------------------
// Phần thưởng nổi bật cho dashboard/scene — nói đúng nguồn, không bịa thời gian
// ---------------------------------------------------------------------------

/**
 * Phần thưởng chung ĐÃ ĐẠT (enabled, không phải parent-tip), sắp xếp theo
 * sortOrder giảm dần để mục đầu là mốc cao nhất theo cấu hình. Global
 * reward không có timestamp đạt — UI không được ghi ngày/giờ cho nhóm này.
 */
export function achievedGlobalRewards(
  globalRewards: GlobalReward[],
  progress: GardenProgressState,
): GlobalReward[] {
  return globalRewards
    .filter((reward) => reward.enabled && reward.kind !== "parent-tip")
    .filter((reward) => evaluateCondition(reward.condition, progress).done)
    .sort((a, b) => b.sortOrder - a.sortOrder);
}

export interface RewardHighlights {
  /** Tối đa 2 phần thưởng chung đã đạt (mốc cao nhất theo sortOrder). */
  globalTop: GlobalReward[];
  /** Quà gia đình đã trao gần nhất theo givenAt; null nếu chưa có. */
  latestGivenFamily: FamilyReward | null;
}

export function recentRewardHighlights(
  globalRewards: GlobalReward[],
  progress: GardenProgressState,
  familyRewards: FamilyReward[],
  currentUserId: string | null | undefined,
): RewardHighlights {
  const given = scopedFamilyRewards(visibleFamilyRewards(familyRewards), currentUserId)
    .filter((reward) => reward.givenAt != null)
    .sort((a, b) => (b.givenAt ?? 0) - (a.givenAt ?? 0));
  return {
    globalTop: achievedGlobalRewards(globalRewards, progress).slice(0, 2),
    latestGivenFamily: given[0] ?? null,
  };
}

/** Tối đa 4 huy hiệu đã đạt để treo trang trí quanh cây thần trong scene. */
export function gardenBadgeDecor(
  globalRewards: GlobalReward[],
  progress: GardenProgressState,
): GlobalReward[] {
  return achievedGlobalRewards(globalRewards, progress).slice(0, 4);
}

// ---------------------------------------------------------------------------
// Mission panel — view model thuần cho một bài học
// ---------------------------------------------------------------------------

/** Ước tính thời lượng: ~30 giây/exercise, tối thiểu 1 phút. */
export function estimateMinutes(exerciseCount: number): number {
  return Math.max(1, Math.round(exerciseCount * 0.5));
}

/** Công thức khóa DUY NHẤT của app — giữ nguyên như bản đồ hiện tại. */
export function missionLocked(
  unlockedAll: boolean,
  globalIndex: number,
  currentIndex: number,
): boolean {
  return !unlockedAll && globalIndex > currentIndex;
}

/** Chip loại hoạt động suy từ type/mode thật của exercises, tối đa 4 chip. */
export function exerciseChips(ref: LessonRef): string[] {
  const chips: string[] = [];
  const push = (label: string) => {
    if (!chips.includes(label) && chips.length < 4) chips.push(label);
  };
  for (const exercise of ref.lesson.exercises) {
    switch (exercise.type) {
      case "select":
        push(exercise.mode === "listen" ? "Nghe & chọn" : "Chọn nghĩa");
        break;
      case "match":
        push("Ghép cặp");
        break;
      case "wordBank":
        push("Xếp câu");
        break;
      case "fillBlank":
        push("Điền vào câu");
        break;
      case "typeAnswer":
        push(exercise.mode === "listen" ? "Nghe & gõ" : "Dịch & gõ");
        break;
    }
  }
  return chips;
}

export type MissionCta = "review" | "start" | "locked";

export interface MissionView {
  lessonId: string;
  title: string;
  unitTitle: string;
  lessonTitle: string;
  difficulty: string;
  exerciseCount: number;
  minutes: number;
  chips: string[];
  unitDone: number;
  unitTotal: number;
  completed: boolean;
  current: boolean;
  locked: boolean;
  cta: MissionCta;
}

export function missionView(
  ref: LessonRef,
  opts: {
    completedLessons: Record<string, true>;
    currentIndex: number;
    unlockedAll: boolean;
    totalLessons: number;
  },
): MissionView {
  const completed = !!opts.completedLessons[ref.lesson.id];
  const locked = missionLocked(opts.unlockedAll, ref.globalIndex, opts.currentIndex);
  const unitDone = ref.unit.lessons.filter(
    (lesson) => opts.completedLessons[lesson.id],
  ).length;
  return {
    lessonId: ref.lesson.id,
    title: `${ref.unit.title} — ${ref.lesson.title}`,
    unitTitle: ref.unit.title,
    lessonTitle: ref.lesson.title,
    difficulty: difficultyLabel(ref.globalIndex, opts.totalLessons),
    exerciseCount: ref.lesson.exercises.length,
    minutes: estimateMinutes(ref.lesson.exercises.length),
    chips: exerciseChips(ref),
    unitDone,
    unitTotal: ref.unit.lessons.length,
    completed,
    current: !completed && ref.globalIndex === opts.currentIndex,
    locked,
    cta: locked ? "locked" : completed ? "review" : "start",
  };
}
