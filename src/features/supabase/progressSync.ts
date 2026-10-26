import type { ProgressSnapshot } from '../parents/types';
import { getSupabaseClient, isSupabaseEnabled, supabase } from './client';
import type { SyncOutcome, UserProgressRow } from './types';

/**
 * Đồng bộ tiến độ học giữa máy (nguồn chính, offline-first) và Supabase.
 *
 * Nguyên tắc:
 *  - Local luôn là nơi app đọc/ghi khi học — mất mạng vẫn học bình thường.
 *  - `updatedAt` (epoch ms trong ProgressSnapshot) quyết định bên nào mới hơn.
 *  - Mọi hàm trong file này đều an toàn khi Supabase đang tắt hoặc chưa đăng nhập:
 *    trả về kết quả mô tả thay vì throw (trừ lỗi mạng/server thật khi đẩy dữ liệu).
 */

function snapshotToRow(userId: string, snapshot: ProgressSnapshot): Omit<UserProgressRow, 'updated_at'> {
  return {
    user_id: userId,
    total_xp: snapshot.totalXp,
    streak_days: snapshot.streakDays,
    lessons_completed: snapshot.lessonsCompleted,
    srs_due_count: snapshot.srsDueCount,
    per_language: snapshot.perLanguage,
    payload: snapshot,
  };
}

function rowToSnapshot(row: UserProgressRow): ProgressSnapshot {
  // payload giữ toàn bộ snapshot gốc; vẫn vá các trường bắt buộc từ cột rời
  // để dữ liệu cũ (nếu payload thiếu trường) không làm hỏng app.
  return {
    ...row.payload,
    totalXp: row.payload?.totalXp ?? row.total_xp,
    streakDays: row.payload?.streakDays ?? row.streak_days,
    lessonsCompleted: row.payload?.lessonsCompleted ?? row.lessons_completed,
    srsDueCount: row.payload?.srsDueCount ?? row.srs_due_count,
    perLanguage: row.payload?.perLanguage ?? row.per_language ?? {},
    updatedAt: row.payload?.updatedAt ?? Date.parse(row.updated_at),
  };
}

/** Đẩy snapshot local lên bảng user_progress (upsert theo user_id). */
export async function pushProgress(userId: string, snapshot: ProgressSnapshot): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('user_progress')
    .upsert(snapshotToRow(userId, snapshot), { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Đẩy tiến độ lên Supabase thất bại: ${error.message}`);
  }
}

/** Kéo snapshot của người dùng về. Trả null nếu chưa có dòng nào trên server. */
export async function pullProgress(userId: string): Promise<ProgressSnapshot | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserProgressRow>();
  if (error) {
    throw new Error(`Kéo tiến độ từ Supabase thất bại: ${error.message}`);
  }
  return data ? rowToSnapshot(data) : null;
}

/**
 * Đồng bộ hai chiều cho người dùng đang đăng nhập:
 *  - Server chưa có dữ liệu → đẩy local lên.
 *  - Local mới hơn server → đẩy local lên.
 *  - Server mới hơn local → kéo về và trả snapshot đó để nơi gọi ghi đè vào store local.
 *
 * Nơi gọi chịu trách nhiệm áp snapshot trả về vào store khi direction = 'pulled'
 * (xem ví dụ trong INTEGRATION.md).
 */
export async function syncProgress(localSnapshot: ProgressSnapshot): Promise<SyncOutcome> {
  if (!isSupabaseEnabled || !supabase) {
    return { direction: 'disabled', snapshot: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { direction: 'signed-out', snapshot: null };
  }

  const remote = await pullProgress(user.id);
  if (!remote || localSnapshot.updatedAt >= remote.updatedAt) {
    await pushProgress(user.id, localSnapshot);
    return { direction: 'pushed', snapshot: localSnapshot };
  }
  return { direction: 'pulled', snapshot: remote };
}
