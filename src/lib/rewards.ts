import { catalog, getPack } from "./content";

/**
 * Logic phần thưởng THUẦN (không UI, không tự lưu trạng thái "đã đạt").
 *
 * Trạng thái đạt luôn được suy ra tại thời điểm hiển thị từ tiến độ học
 * hiện có trong store chính. Cách tính phần trăm dùng đúng mẫu của
 * src/lib/parentProgress.ts: chỉ đếm các lesson id có thật trong pack,
 * tránh khóa lạ lọt vào completedLessons làm sai tỉ lệ.
 */

export type GlobalRewardKind = "badge" | "title" | "chest" | "parent-tip";

export type RewardCondition =
  | { type: "course-percent"; courseId: string; percent: number }
  | { type: "units-completed"; count: number }
  | { type: "course-complete"; courseId: string }
  | { type: "all-courses-complete" };

export interface GlobalReward {
  id: string;
  kind: GlobalRewardKind;
  name: string;
  description: string;
  emoji: string;
  condition: RewardCondition;
  congratsMessage: string;
  sortOrder: number;
  enabled: boolean;
}

export type StoredFamilyRewardStatus = "pending" | "given";
export type FamilyRewardDisplayStatus = "pending" | "achieved" | "given";

export interface FamilyReward {
  id: string;
  /** auth.users.id của phụ huynh; null khi tạo lúc chưa đăng nhập (chỉ local). */
  ownerId: string | null;
  /** Nhãn hồ sơ trẻ do phụ huynh tự nhập (app hiện có một hồ sơ/máy). */
  childName: string;
  title: string;
  message: string;
  emoji: string;
  /** Ngân sách tự do dạng text, ví dụ "tối đa 5.000 yên" hoặc "500.000đ". */
  budgetText?: string | null;
  condition: RewardCondition;
  secretUntilDone: boolean;
  /** Chỉ phụ huynh mới được đặt; logic đạt điều kiện không bao giờ tự đặt. */
  givenAt: number | null;
  createdAt: number;
  updatedAt: number;
  /** Xóa mềm để bản đã xóa không hồi sinh khi đồng bộ. */
  deletedAt: number | null;
}

/** Hình dạng tối thiểu của store học mà module này cần đọc. */
export interface RewardProgressState {
  courses?: Record<
    string,
    { completedLessons?: Record<string, true> } | undefined
  >;
}

export interface CourseRewardProgress {
  courseId: string;
  targetLanguage: string;
  completed: number;
  total: number;
  percent: number;
  complete: boolean;
}

export interface ConditionEvaluation {
  done: boolean;
  /** Tiến độ hướng tới điều kiện, đã giới hạn 0–100. */
  percent: number;
  label: string;
  completed: number;
  total: number;
}

export function createRewardId(prefix = "reward"): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

function courseName(courseId: string): string {
  return catalog.courses.find((course) => course.id === courseId)?.targetLanguage ?? courseId;
}

export function courseRewardProgress(
  courseId: string,
  progress: RewardProgressState,
): CourseRewardProgress {
  const course = catalog.courses.find((item) => item.id === courseId);
  if (!course) {
    return {
      courseId,
      targetLanguage: courseId,
      completed: 0,
      total: 0,
      percent: 0,
      complete: false,
    };
  }

  const pack = getPack(courseId);
  const completedIds = new Set(
    Object.keys(progress.courses?.[courseId]?.completedLessons ?? {}),
  );
  let completed = 0;
  let total = 0;
  for (const section of pack.sections) {
    for (const unit of section.units) {
      for (const lesson of unit.lessons) {
        total += 1;
        if (completedIds.has(lesson.id)) completed += 1;
      }
    }
  }

  return {
    courseId,
    targetLanguage: course.targetLanguage,
    completed,
    total,
    percent: total > 0 ? Math.floor((completed / total) * 100) : 0,
    complete: total > 0 && completed === total,
  };
}

export function allCourseRewardProgress(
  progress: RewardProgressState,
): CourseRewardProgress[] {
  return catalog.courses.map((course) => courseRewardProgress(course.id, progress));
}

export function completedUnitsCount(progress: RewardProgressState): {
  completed: number;
  total: number;
} {
  let completed = 0;
  let total = 0;
  for (const course of catalog.courses) {
    const pack = getPack(course.id);
    const completedIds = new Set(
      Object.keys(progress.courses?.[course.id]?.completedLessons ?? {}),
    );
    for (const section of pack.sections) {
      for (const unit of section.units) {
        total += 1;
        if (
          unit.lessons.length > 0 &&
          unit.lessons.every((lesson) => completedIds.has(lesson.id))
        ) {
          completed += 1;
        }
      }
    }
  }
  return { completed, total };
}

export function conditionLabel(condition: RewardCondition): string {
  switch (condition.type) {
    case "course-percent":
      return `Đạt ${condition.percent}% khóa ${courseName(condition.courseId)}`;
    case "course-complete":
      return `Hoàn thành 100% khóa ${courseName(condition.courseId)}`;
    case "units-completed":
      return `Hoàn thành ${condition.count} vùng đất/chủ đề`;
    case "all-courses-complete":
      return "Hoàn thành 100% cả 3 khóa Anh – Nhật – Trung";
  }
}

/**
 * Đánh giá một điều kiện tại thời điểm hiện tại. Hàm không đọc store trực
 * tiếp và không ghi gì cả; nơi gọi truyền vào snapshot tiến độ hiện có.
 */
export function evaluateCondition(
  condition: RewardCondition,
  progress: RewardProgressState,
): ConditionEvaluation {
  const label = conditionLabel(condition);

  switch (condition.type) {
    case "course-percent": {
      const course = courseRewardProgress(condition.courseId, progress);
      const target = Math.min(100, Math.max(0, condition.percent));
      return {
        done: course.total > 0 && course.percent >= target,
        percent: target > 0 ? Math.min(100, Math.floor((course.percent / target) * 100)) : 100,
        label,
        completed: course.completed,
        total: course.total,
      };
    }
    case "course-complete": {
      const course = courseRewardProgress(condition.courseId, progress);
      return {
        done: course.complete,
        percent: course.percent,
        label,
        completed: course.completed,
        total: course.total,
      };
    }
    case "units-completed": {
      const units = completedUnitsCount(progress);
      const target = Math.max(0, condition.count);
      return {
        done: target > 0 && units.completed >= target,
        percent:
          target > 0 ? Math.min(100, Math.floor((units.completed / target) * 100)) : 0,
        label,
        completed: units.completed,
        total: target,
      };
    }
    case "all-courses-complete": {
      const courses = allCourseRewardProgress(progress);
      const completed = courses.reduce((sum, course) => sum + course.completed, 0);
      const total = courses.reduce((sum, course) => sum + course.total, 0);
      return {
        done: courses.length > 0 && courses.every((course) => course.complete),
        percent: total > 0 ? Math.floor((completed / total) * 100) : 0,
        label,
        completed,
        total,
      };
    }
  }
}

export function familyRewardStatus(
  reward: FamilyReward,
  progress: RewardProgressState,
): FamilyRewardDisplayStatus {
  if (reward.givenAt != null) return "given";
  return evaluateCondition(reward.condition, progress).done ? "achieved" : "pending";
}

function effectiveRewardTime(reward: FamilyReward): number {
  return Math.max(reward.updatedAt || 0, reward.deletedAt ?? 0);
}

/**
 * Hợp nhất hai danh sách family rewards theo id. Bản có mốc hiệu lực mới
 * hơn thắng; nếu hòa, bản xóa mềm thắng để tránh hồi sinh dữ liệu.
 */
export function mergeFamilyRewards(
  local: FamilyReward[],
  remote: FamilyReward[],
): FamilyReward[] {
  const byId = new Map<string, FamilyReward>();
  for (const reward of [...local, ...remote]) {
    const current = byId.get(reward.id);
    if (!current) {
      byId.set(reward.id, reward);
      continue;
    }
    const currentTime = effectiveRewardTime(current);
    const nextTime = effectiveRewardTime(reward);
    if (
      nextTime > currentTime ||
      (nextTime === currentTime && reward.deletedAt != null && current.deletedAt == null)
    ) {
      byId.set(reward.id, reward);
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.title.localeCompare(b.title),
  );
}

export function visibleFamilyRewards(rewards: FamilyReward[]): FamilyReward[] {
  return rewards.filter((reward) => reward.deletedAt == null);
}

/**
 * Phạm vi hiển thị theo tài khoản đang đăng nhập trên thiết bị:
 * - Chưa đăng nhập: chỉ thấy bản ghi local chưa gắn chủ (ownerId = null).
 * - Đã đăng nhập: thấy bản ghi local chưa gắn chủ + bản ghi của chính mình.
 * Bản ghi đã gắn với tài khoản khác vẫn được giữ trong store để không mất
 * dữ liệu khi đổi tài khoản, nhưng không hiển thị cho tài khoản hiện tại.
 */
export function scopedFamilyRewards(
  rewards: FamilyReward[],
  currentUserId: string | null | undefined,
): FamilyReward[] {
  return rewards.filter(
    (reward) => reward.ownerId == null || (currentUserId != null && reward.ownerId === currentUserId),
  );
}

export function isRewardCondition(value: unknown): value is RewardCondition {
  if (!value || typeof value !== "object") return false;
  const condition = value as Record<string, unknown>;
  switch (condition.type) {
    case "course-percent":
      return (
        typeof condition.courseId === "string" &&
        typeof condition.percent === "number" &&
        Number.isFinite(condition.percent)
      );
    case "course-complete":
      return typeof condition.courseId === "string";
    case "units-completed":
      return typeof condition.count === "number" && Number.isFinite(condition.count);
    case "all-courses-complete":
      return true;
    default:
      return false;
  }
}

export function sanitizeGlobalReward(value: unknown): GlobalReward | null {
  if (!value || typeof value !== "object") return null;
  const reward = value as Record<string, unknown>;
  if (
    typeof reward.id !== "string" ||
    typeof reward.name !== "string" ||
    typeof reward.description !== "string" ||
    typeof reward.emoji !== "string" ||
    typeof reward.congratsMessage !== "string" ||
    !isRewardCondition(reward.condition) ||
    !["badge", "title", "chest", "parent-tip"].includes(String(reward.kind))
  ) {
    return null;
  }
  return {
    id: reward.id,
    kind: reward.kind as GlobalRewardKind,
    name: reward.name,
    description: reward.description,
    emoji: reward.emoji,
    condition: reward.condition,
    congratsMessage: reward.congratsMessage,
    sortOrder:
      typeof reward.sortOrder === "number" && Number.isFinite(reward.sortOrder)
        ? reward.sortOrder
        : 0,
    enabled: reward.enabled !== false,
  };
}

export function sanitizeFamilyReward(value: unknown): FamilyReward | null {
  if (!value || typeof value !== "object") return null;
  const reward = value as Record<string, unknown>;
  if (
    typeof reward.id !== "string" ||
    typeof reward.title !== "string" ||
    !isRewardCondition(reward.condition)
  ) {
    return null;
  }
  return {
    id: reward.id,
    ownerId: typeof reward.ownerId === "string" ? reward.ownerId : null,
    childName: typeof reward.childName === "string" ? reward.childName : "Con",
    title: reward.title,
    message: typeof reward.message === "string" ? reward.message : "",
    emoji: typeof reward.emoji === "string" ? reward.emoji : "🎁",
    budgetText: typeof reward.budgetText === "string" ? reward.budgetText : null,
    condition: reward.condition,
    secretUntilDone: reward.secretUntilDone === true,
    givenAt: typeof reward.givenAt === "number" ? reward.givenAt : null,
    createdAt: typeof reward.createdAt === "number" ? reward.createdAt : Date.now(),
    updatedAt: typeof reward.updatedAt === "number" ? reward.updatedAt : Date.now(),
    deletedAt: typeof reward.deletedAt === "number" ? reward.deletedAt : null,
  };
}
