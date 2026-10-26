import type { ProgressSnapshot } from '../parents/types';

/**
 * Hình dạng một dòng trong bảng `public.user_progress` (xem schema.sql).
 * Cột `payload` giữ nguyên toàn bộ ProgressSnapshot dạng JSONB để kéo về
 * không mất trường nào, các cột rời (total_xp, streak_days...) phục vụ
 * truy vấn/thống kê phía phụ huynh và sắp xếp.
 */
export interface UserProgressRow {
  user_id: string;
  total_xp: number;
  streak_days: number;
  lessons_completed: number;
  srs_due_count: number;
  per_language: ProgressSnapshot['perLanguage'];
  payload: ProgressSnapshot;
  updated_at: string; // ISO 8601 do Postgres trả về
}

/** Hình dạng một dòng trong bảng `public.profiles`. */
export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Kết quả một lần đồng bộ hai chiều. */
export interface SyncOutcome {
  /** 'pushed' = local mới hơn nên đã đẩy lên; 'pulled' = server mới hơn nên đã kéo về; 'disabled' = Supabase đang tắt; 'signed-out' = chưa đăng nhập. */
  direction: 'pushed' | 'pulled' | 'disabled' | 'signed-out';
  /** Snapshot thắng (mới nhất) sau khi đồng bộ; null khi không đồng bộ được. */
  snapshot: ProgressSnapshot | null;
}
