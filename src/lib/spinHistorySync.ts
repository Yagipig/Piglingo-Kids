import { isSupabaseEnabled, supabase } from "@/features/supabase/client";
import {
  mergeSpinHistory,
  sanitizeSpinHistoryEntry,
  type SpinHistoryEntry,
} from "./spin";
import { useProgress } from "./store";

/**
 * Đồng bộ LỊCH SỬ QUAY (bảng spin_history) theo đúng khuôn của
 * familyRewardsSync: local trong store chính luôn là nguồn dùng được
 * ngay; Supabase chỉ là lớp chia sẻ theo tài khoản khi đã đăng nhập.
 *
 * Cần bảng spin_history — xem src/features/supabase/spin-schema.sql.
 * CHƯA chạy SQL đó thì các hàm này ném lỗi "bảng chưa có" và hook gọi
 * chúng nuốt lỗi an toàn: vòng quay vẫn dùng đầy đủ trên một máy.
 *
 * Quyền riêng tư: RLS owner-only của bảng spin_history. Client còn tự
 * lọc: chỉ đồng bộ bản ghi ownerId = null (sẽ nhận chủ khi đăng nhập)
 * hoặc ownerId đúng bằng user hiện tại.
 */

interface SpinHistoryRow {
  id: string;
  owner_id: string;
  payload: unknown;
  created_at?: string;
  updated_at?: string;
}

function relevantEntries(
  history: SpinHistoryEntry[],
  userId: string
): SpinHistoryEntry[] {
  return history.filter(
    (entry) => entry.ownerId == null || entry.ownerId === userId
  );
}

function withOwner(entry: SpinHistoryEntry, userId: string): SpinHistoryEntry {
  return { ...entry, ownerId: userId };
}

export async function pullSpinHistory(userId: string): Promise<SpinHistoryEntry[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data, error } = await supabase
    .from("spin_history")
    .select("id, owner_id, payload, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Không tải được lịch sử quay: ${error.message}`);
  }
  const entries: SpinHistoryEntry[] = [];
  for (const row of (data ?? []) as SpinHistoryRow[]) {
    const entry = sanitizeSpinHistoryEntry(row.payload);
    if (entry) {
      // owner_id ở cột rời là nguồn RLS đáng tin cậy hơn payload.
      entries.push({ ...entry, id: row.id, ownerId: row.owner_id });
    }
  }
  return entries;
}

export async function pushSpinHistory(
  userId: string,
  history: SpinHistoryEntry[]
): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;
  const owned = relevantEntries(history, userId).map((entry) =>
    withOwner(entry, userId)
  );
  if (owned.length === 0) return;

  const rows = owned.map((entry) => ({
    id: entry.id,
    owner_id: userId,
    payload: entry,
    created_at: new Date(entry.at).toISOString(),
    updated_at: new Date(entry.updatedAt).toISOString(),
  }));

  const { error } = await supabase
    .from("spin_history")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`Không đẩy được lịch sử quay: ${error.message}`);
  }
}

/**
 * Một vòng đồng bộ đầy đủ: kéo server → merge theo id/updatedAt →
 * ghi lại store → đẩy danh sách đã hợp nhất lên server.
 */
export async function syncSpinHistory(userId: string): Promise<SpinHistoryEntry[]> {
  if (!isSupabaseEnabled || !supabase) {
    return useProgress.getState().spinHistory ?? [];
  }

  const local = useProgress.getState().spinHistory ?? [];
  const otherOwnerEntries = local.filter(
    (entry) => entry.ownerId != null && entry.ownerId !== userId
  );
  const localRelevant = relevantEntries(local, userId).map((entry) =>
    withOwner(entry, userId)
  );
  const remote = await pullSpinHistory(userId);
  const mergedRelevant = mergeSpinHistory(localRelevant, remote);
  const mergedAll = mergeSpinHistory(otherOwnerEntries, mergedRelevant);

  useProgress.getState().replaceSpinHistory(mergedAll);
  await pushSpinHistory(userId, mergedRelevant);
  return mergedAll;
}
