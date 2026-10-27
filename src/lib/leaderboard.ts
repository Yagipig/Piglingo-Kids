import { isSupabaseEnabled, supabase } from "@/features/supabase/client";

/**
 * Bảng xếp hạng nhà thám hiểm — đọc qua RPC ẩn danh trên Supabase
 * (xem src/features/supabase/leaderboard-schema.sql).
 *
 * Nguyên tắc an toàn:
 *  - App KHÔNG BAO GIỜ đọc thẳng bảng user_progress của người khác
 *    (RLS owner-only giữ nguyên); chỉ gọi hai RPC get_leaderboard /
 *    get_my_rank vốn chỉ trả hạng + bí danh ẩn danh + tổng XP.
 *  - Không có email, tên thật hay user_id nào đi qua file này.
 *  - Mọi lỗi đều được map về trạng thái thân thiện; màn hình không
 *    bao giờ hiển thị lỗi kỹ thuật cho bé.
 */

export interface LeaderboardEntry {
  rank: number;
  anonCode: string;
  totalXp: number;
}

export interface MyRankInfo {
  rank: number;
  anonCode: string;
  totalXp: number;
}

export type LeaderboardResult =
  | { status: "ready"; entries: LeaderboardEntry[]; mine: MyRankInfo | null }
  /** SQL leaderboard-schema.sql chưa được chạy trên Supabase. */
  | { status: "not_ready" }
  /** Mất mạng / lỗi máy chủ / Supabase đang tắt. */
  | { status: "error" };

type LeaderboardRow = {
  rank: number;
  anon_code: string;
  total_xp: number;
};

/** Mã lỗi PostgREST/Postgres khi hàm RPC chưa tồn tại trên server. */
const NOT_READY_CODES = new Set(["PGRST202", "42883"]);

function isNotReadyError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code && NOT_READY_CODES.has(error.code)) return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("get_leaderboard") ||
    message.includes("get_my_rank") ||
    (message.includes("function") && message.includes("does not exist")) ||
    message.includes("could not find the function")
  );
}

function toEntry(row: LeaderboardRow): LeaderboardEntry {
  return { rank: row.rank, anonCode: row.anon_code, totalXp: row.total_xp };
}

/**
 * Tải top `limit` nhà thám hiểm + hạng của tài khoản đang đăng nhập.
 * Nơi gọi phải đảm bảo đã có người dùng đăng nhập (useAuth) trước.
 */
export async function fetchLeaderboard(limit = 20): Promise<LeaderboardResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { status: "error" };
  }
  const [boardResponse, mineResponse] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_limit: limit }),
    supabase.rpc("get_my_rank"),
  ]);

  const error = boardResponse.error ?? mineResponse.error;
  if (error) {
    return isNotReadyError(error) ? { status: "not_ready" } : { status: "error" };
  }

  const entries = ((boardResponse.data ?? []) as LeaderboardRow[]).map(toEntry);
  const mineRows = (mineResponse.data ?? []) as LeaderboardRow[];
  const mine = mineRows.length > 0 ? toEntry(mineRows[0]) : null;
  return { status: "ready", entries, mine };
}
