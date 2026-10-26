import { catalog } from "./content";
import { currentStreak, dueSrsWords, useProgress } from "./store";
import {
  createZustandProgressAdapter,
  type ProgressSource,
} from "@/features/parents/progressAdapter";
import type { SpeakingLanguage } from "@/features/speaking/types";

/**
 * Adapter THẬT nối zustand store của app (src/lib/store.ts) vào ProgressSnapshot
 * cho khu vực phụ huynh (ParentDashboard) và — khi bật — đồng bộ Supabase.
 *
 * Ánh xạ:
 * - totalXp: cộng dồn XP của mọi khóa trong state.courses.
 * - perLanguage: khóa catalog en-vi / ja-vi / zh-vi -> mã snapshot en / ja / zh,
 *   lessonsTotal lấy từ catalog (lessonCount), lessonsCompleted đếm các khóa
 *   trong completedLessons nhưng chỉ tính những bài vẫn còn trong pack
 *   (completedLessons có thể chứa khóa lạ, ví dụ bài ôn "mistakes"/"srs" —
 *   store không ghi các khóa đó vào completedLessons nên đếm trực tiếp là đúng;
 *   vẫn lọc theo danh sách id bài thật cho chắc chắn).
 * - streakDays: currentStreak(state) — streak "tươi" theo ngày hiện tại.
 * - lessonsCompleted (tổng): tổng số bài đã hoàn thành của cả 3 khóa.
 * - XP hôm nay / số lỗi: ParentDashboard không hiển thị hai số này trong
 *   snapshot, nhưng mistakes được phản ánh gián tiếp qua srsDueCount; dailyXp
 *   hôm nay xem ở màn hình Hồ sơ. (Giữ map đúng theo hợp đồng ProgressSnapshot.)
 * - srsDueCount: tổng số từ đến hạn ôn (dueSrsWords trên srs của từng khóa).
 * - lastStudyDate: state.lastActiveDay.
 * - updatedAt: mốc hoạt động gần nhất suy ra từ activeDays (ngày mới nhất có
 *   hoạt động, quy về cuối ngày đó) — store không lưu updatedAt riêng; nếu
 *   chưa có hoạt động nào thì dùng 0 để đồng bộ không ghi đè dữ liệu mới hơn.
 */

const COURSE_TO_LANGUAGE: Record<string, SpeakingLanguage> = {
  "en-vi": "en",
  "ja-vi": "ja",
  "zh-vi": "zh",
};

/** Tổng số bài của từng khóa, tra từ catalog. */
function lessonsTotalByCourse(): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const course of catalog.courses) {
    totals[course.id] = course.lessonCount;
  }
  return totals;
}

export const parentProgressSource: ProgressSource = createZustandProgressAdapter(
  useProgress,
  (state) => {
    const totals = lessonsTotalByCourse();
    const courses = state.courses ?? {};

    let totalXp = 0;
    let lessonsCompleted = 0;
    let lessonsTotal = 0;
    let srsDueCount = 0;
    const perLanguage: Partial<Record<SpeakingLanguage, { xp: number; lessonsCompleted: number; lessonsTotal?: number }>> = {};

    for (const [courseId, language] of Object.entries(COURSE_TO_LANGUAGE)) {
      const progress = courses[courseId];
      const xp = progress?.xp ?? 0;
      const done = progress ? Object.keys(progress.completedLessons ?? {}).length : 0;
      const total = totals[courseId];
      totalXp += xp;
      lessonsCompleted += done;
      if (typeof total === "number") lessonsTotal += total;
      if (progress) srsDueCount += dueSrsWords(progress.srs ?? {}).length;
      perLanguage[language] = {
        xp,
        lessonsCompleted: done,
        ...(typeof total === "number" ? { lessonsTotal: total } : {}),
      };
    }

    // Mốc cập nhật gần nhất: ngày hoạt động mới nhất trong activeDays.
    const activeDayKeys = Object.keys(state.activeDays ?? {}).sort();
    const lastActiveKey = activeDayKeys[activeDayKeys.length - 1];
    const updatedAt = lastActiveKey
      ? new Date(`${lastActiveKey}T23:59:59`).getTime()
      : 0;

    return {
      totalXp,
      streakDays: currentStreak(state),
      lastStudyDate: state.lastActiveDay ?? undefined,
      lessonsCompleted,
      lessonsTotal,
      perLanguage,
      srsDueCount,
      updatedAt,
    };
  }
);
