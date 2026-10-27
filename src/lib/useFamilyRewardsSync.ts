import { useEffect, useRef } from "react";

import { useAuth } from "@/features/supabase/AuthContext";
import { isSupabaseEnabled } from "@/features/supabase/client";
import { pushFamilyRewards, syncFamilyRewards } from "./familyRewardsSync";
import type { FamilyReward } from "./rewards";
import { useRewardsStore } from "./rewardsStore";

function relevantSignature(rewards: FamilyReward[], userId: string): string {
  return JSON.stringify(
    rewards
      .filter((reward) => reward.ownerId == null || reward.ownerId === userId)
      .map((reward) => ({ ...reward, ownerId: userId })),
  );
}

/**
 * Chạy đồng bộ family rewards theo phiên đăng nhập, cùng mẫu với
 * useProgressSync: một vòng kéo/merge/đẩy khi đăng nhập, sau đó các thay
 * đổi local được đẩy nền (debounce). Lỗi mạng chỉ log, không chặn app.
 */
export function useFamilyRewardsSync(hydrated: boolean): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const familyRewards = useRewardsStore((state) => state.familyRewards);
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
        const merged = await syncFamilyRewards(userId);
        if (cancelled) return;
        lastPushedSignatureRef.current = relevantSignature(merged, userId);
        initialDoneRef.current = true;
      } catch (error) {
        console.warn(
          "[piglingo] Đồng bộ phần thưởng gia đình chưa thành công, app vẫn dùng dữ liệu local:",
          error,
        );
        // Cho phép thử đẩy các thay đổi sau đó dù vòng kéo đầu tiên lỗi.
        initialDoneRef.current = true;
        lastPushedSignatureRef.current = relevantSignature(
          useRewardsStore.getState().familyRewards,
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
    const signature = relevantSignature(familyRewards, userId);
    if (!signature || signature === lastPushedSignatureRef.current) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          await pushFamilyRewards(userId, familyRewards);
          lastPushedSignatureRef.current = signature;
        } catch (error) {
          console.warn(
            "[piglingo] Chưa đẩy được thay đổi phần thưởng gia đình, bản local vẫn an toàn:",
            error,
          );
        }
      })();
    }, 700);

    return () => clearTimeout(timer);
  }, [familyRewards, hydrated, userId]);
}
