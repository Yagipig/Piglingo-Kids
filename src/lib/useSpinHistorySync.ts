import { useEffect, useRef } from "react";

import { useAuth } from "@/features/supabase/AuthContext";
import { isSupabaseEnabled } from "@/features/supabase/client";
import type { SpinHistoryEntry } from "./spin";
import { pushSpinHistory, syncSpinHistory } from "./spinHistorySync";
import { useProgress } from "./store";

function relevantSignature(history: SpinHistoryEntry[], userId: string): string {
  return JSON.stringify(
    history
      .filter((entry) => entry.ownerId == null || entry.ownerId === userId)
      .map((entry) => ({ ...entry, ownerId: userId })),
  );
}

/**
 * Chạy đồng bộ lịch sử quay theo phiên đăng nhập, cùng mẫu với
 * useFamilyRewardsSync: một vòng kéo/merge/đẩy khi đăng nhập, sau đó
 * các thay đổi local được đẩy nền (debounce). Lỗi mạng hoặc bảng
 * spin_history chưa được tạo (chưa chạy spin-schema.sql) chỉ log —
 * vòng quay vẫn dùng đầy đủ dữ liệu local trên máy bé.
 */
export function useSpinHistorySync(hydrated: boolean): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const spinHistory = useProgress((state) => state.spinHistory);
  const syncedUserRef = useRef<string | null>(null);
  const initialDoneRef = useRef(false);
  const lastPushedSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!userId) {
      syncedUserRef.current = null;
      initialDoneRef.current = false;
      lastPushedSignatureRef.current = "";
      return;
    }
    if (!hydrated || !isSupabaseEnabled) return;
    if (syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;

    let cancelled = false;
    void (async () => {
      try {
        const merged = await syncSpinHistory(userId);
        if (cancelled) return;
        lastPushedSignatureRef.current = relevantSignature(merged, userId);
        initialDoneRef.current = true;
      } catch (error) {
        console.warn(
          "[piglingo] Đồng bộ lịch sử quay chưa thành công (có thể chưa chạy spin-schema.sql), app vẫn dùng dữ liệu local:",
          error,
        );
        // Cho phép thử đẩy các thay đổi sau đó dù vòng kéo đầu tiên lỗi.
        initialDoneRef.current = true;
        lastPushedSignatureRef.current = relevantSignature(
          useProgress.getState().spinHistory ?? [],
          userId,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  useEffect(() => {
    if (!userId || !hydrated || !isSupabaseEnabled || !initialDoneRef.current) return;
    const history = spinHistory ?? [];
    const signature = relevantSignature(history, userId);
    if (!signature || signature === lastPushedSignatureRef.current) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          await pushSpinHistory(userId, history);
          lastPushedSignatureRef.current = signature;
        } catch (error) {
          console.warn(
            "[piglingo] Chưa đẩy được thay đổi lịch sử quay, bản local vẫn an toàn:",
            error,
          );
        }
      })();
    }, 700);

    return () => clearTimeout(timer);
  }, [spinHistory, hydrated, userId]);
}
