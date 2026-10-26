import { useEffect, useRef } from "react";

import { useAuth } from "@/features/supabase/AuthContext";
import { isSupabaseEnabled } from "@/features/supabase/client";
import { syncProgress } from "@/features/supabase/progressSync";
import { parentProgressSource } from "./parentProgress";

/**
 * Nối đồng bộ tiến độ Supabase vào điểm khởi động / phiên đăng nhập.
 *
 * Cách chạy:
 * - Chỉ chạy khi store local đã hydrate XONG (tham số `hydrated`) VÀ đã có
 *   phiên đăng nhập Supabase (user != null). Chưa đăng nhập hoặc Supabase
 *   đang tắt (không có .env) thì hook này no-op: app chạy offline như cũ,
 *   không lỗi, không chờ mạng ở màn hình khởi động (sync chạy nền).
 * - Đúng MỘT lần cho mỗi phiên đăng nhập: cờ `syncedUserIdRef` ghi nhớ
 *   user id đã sync; đăng xuất (user thành null) thì cờ được xóa, lần
 *   đăng nhập tiếp theo sẽ sync lại.
 * - Mọi lỗi mạng/server chỉ `console.warn` rồi bỏ qua — tiến độ local vẫn
 *   là nguồn chính và không bị mất.
 *
 * Hướng dữ liệu (theo đúng hợp đồng SyncOutcome của progressSync.ts):
 * - 'pushed': local mới hơn (hoặc server chưa có) → đã đẩy snapshot lên.
 * - 'pulled': server mới hơn → syncProgress trả snapshot của server, NHƯNG
 *   không ghi đè vào store local. Lý do: ProgressSnapshot chỉ là bản tóm
 *   tắt cho dashboard (tổng XP, số bài từng ngôn ngữ, streak, số thẻ SRS
 *   đến hạn), không chứa chi tiết mà store cần (danh sách bài đã học, thẻ
 *   SRS từng từ, thống kê từ, lỗi sai...), nên không thể khôi phục store
 *   1-1 từ snapshot này. Trường hợp này chỉ ghi log cảnh báo; muốn khôi
 *   phục thật phải mở rộng payload đồng bộ sang toàn bộ state của store
 *   (việc riêng, chưa làm).
 */
export function useProgressSync(hydrated: boolean): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      // Đăng xuất: quên phiên đã sync để lần đăng nhập sau sync lại.
      syncedUserIdRef.current = null;
      return;
    }
    if (!hydrated || !isSupabaseEnabled) return;
    if (syncedUserIdRef.current === userId) return;
    syncedUserIdRef.current = userId;

    let cancelled = false;
    void (async () => {
      try {
        const outcome = await syncProgress(parentProgressSource.getSnapshot());
        if (cancelled) return;
        if (outcome.direction === "pulled") {
          console.warn(
            "[piglingo] Tiến độ trên Supabase mới hơn máy này, nhưng chưa áp " +
              "xuống store local: snapshot đồng bộ là bản tóm tắt, không đủ " +
              "chi tiết để khôi phục toàn bộ tiến độ trên máy.",
          );
        }
      } catch (error) {
        // Offline-first: lỗi đồng bộ không được làm phiền việc học.
        console.warn("[piglingo] Đồng bộ Supabase không thành công, app vẫn chạy offline:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);
}
