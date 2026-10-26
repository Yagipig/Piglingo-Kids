import type { ProgressSnapshot } from './types';

/**
 * Adapter nối store tiến độ THẬT của Piglingo Kids vào `ProgressSnapshot`.
 *
 * Store gốc dùng zustand + AsyncStorage và "dùng chung tiến độ giữa 3 ngôn ngữ",
 * nhưng cấu trúc state nội bộ của nó không nằm trong gói bổ sung này, nên adapter
 * nhận một hàm `mapState` do người tích hợp viết theo store thật của mình.
 * Nhờ vậy dashboard phụ huynh và Supabase sync không hề biết store thật trông thế nào.
 */

/** Hình dạng tối thiểu của một zustand store: chỉ cần getState(). */
export interface ZustandLikeStore<TState> {
  getState: () => TState;
}

/** Nguồn tiến độ mà dashboard đọc được. */
export interface ProgressSource {
  getSnapshot: () => ProgressSnapshot;
}

/**
 * Tạo ProgressSource từ một zustand store bất kỳ.
 *
 * Ví dụ nối store thật (viết trong project gốc, không phải trong gói này):
 *
 * ```ts
 * const source = createZustandProgressAdapter(useProgressStore, (state) => ({
 *   totalXp: state.xp,
 *   streakDays: state.streak,
 *   lessonsCompleted: state.completedLessonIds.length,
 *   perLanguage: {
 *     en: { xp: state.xpByLang.en ?? 0, lessonsCompleted: state.doneByLang.en ?? 0 },
 *     ja: { xp: state.xpByLang.ja ?? 0, lessonsCompleted: state.doneByLang.ja ?? 0 },
 *     zh: { xp: state.xpByLang.zh ?? 0, lessonsCompleted: state.doneByLang.zh ?? 0 },
 *   },
 *   srsDueCount: state.srsDueIds.length,
 *   updatedAt: state.updatedAt ?? Date.now(),
 * }));
 * ```
 */
export function createZustandProgressAdapter<TState>(
  store: ZustandLikeStore<TState>,
  mapState: (state: TState) => ProgressSnapshot,
): ProgressSource {
  return {
    getSnapshot: () => mapState(store.getState()),
  };
}

/** Adapter tĩnh: dùng cho màn hình demo, test, hoặc khi store chưa sẵn sàng. */
export function createStaticProgressSource(snapshot: ProgressSnapshot): ProgressSource {
  return { getSnapshot: () => snapshot };
}

/**
 * Snapshot MẪU chỉ để chạy thử giao diện dashboard khi chưa nối store thật.
 * Không dùng số liệu này trong bản phát hành.
 */
export const DEV_SAMPLE_SNAPSHOT: ProgressSnapshot = {
  totalXp: 120,
  streakDays: 3,
  lastStudyDate: '2026-10-26',
  lessonsCompleted: 7,
  lessonsTotal: 62,
  perLanguage: {
    en: { xp: 70, lessonsCompleted: 4, lessonsTotal: 24 },
    ja: { xp: 30, lessonsCompleted: 2, lessonsTotal: 19 },
    zh: { xp: 20, lessonsCompleted: 1, lessonsTotal: 19 },
  },
  srsDueCount: 5,
  speakingAttempts: 4,
  updatedAt: 0,
};
