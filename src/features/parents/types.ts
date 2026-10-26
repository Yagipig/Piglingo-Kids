import type { SpeakingLanguage } from '../speaking/types';

/**
 * Ảnh chụp (snapshot) tiến độ học tại một thời điểm.
 *
 * Đây là HỢP ĐỒNG TRUNG GIAN giữa khu vực phụ huynh (và Supabase sync) với
 * store tiến độ hiện có của Piglingo Kids: dashboard chỉ đọc dữ liệu qua
 * interface này, không phụ thuộc vào cấu trúc thật của zustand store.
 * Việc nối store thật vào đây do một "adapter" đảm nhiệm (xem progressAdapter.ts).
 */
export interface LanguageProgress {
  xp: number;
  lessonsCompleted: number;
  /** Tổng số bài của khóa, nếu content pack cung cấp được. */
  lessonsTotal?: number;
}

export interface ProgressSnapshot {
  totalXp: number;
  streakDays: number;
  /** Ngày học gần nhất, định dạng 'YYYY-MM-DD' (giờ địa phương), nếu có. */
  lastStudyDate?: string;
  lessonsCompleted: number;
  lessonsTotal?: number;
  perLanguage: Partial<Record<SpeakingLanguage, LanguageProgress>>;
  /** Số thẻ SRS đến hạn ôn hôm nay. */
  srsDueCount: number;
  /** Số lượt luyện nói đã chấm (nếu store có ghi). */
  speakingAttempts?: number;
  /** Mốc thời gian cập nhật, epoch milliseconds. Dùng để so sánh khi đồng bộ Supabase. */
  updatedAt: number;
}

/** Cài đặt phụ huynh lưu trên máy. */
export interface ParentSettings {
  /**
   * Giới hạn thời gian dùng app mỗi ngày, tính bằng phút.
   * null = không giới hạn.
   */
  dailyLimitMinutes: number | null;
  updatedAt: number;
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  dailyLimitMinutes: 30,
  updatedAt: 0,
};

/** Số liệu dùng app trong một ngày, lưu theo ngày địa phương. */
export interface DailyUsage {
  /** 'YYYY-MM-DD' theo giờ địa phương của máy. */
  date: string;
  usedSeconds: number;
  /** Số phút phụ huynh đã gia hạn thêm cho riêng ngày này. */
  extraMinutes: number;
}

/** Khóa AsyncStorage dùng trong module phụ huynh. */
export const PARENT_STORAGE_KEYS = {
  settings: 'piglingo.parents.settings.v1',
  usage: 'piglingo.parents.usage.v1',
  session: 'piglingo.parents.session.v1',
} as const;

/** Ngày hôm nay theo giờ địa phương, dạng 'YYYY-MM-DD'. */
export function todayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
