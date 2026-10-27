import { useEffect, useRef } from "react";

import { isSupabaseEnabled, supabase } from "@/features/supabase/client";
import {
  sanitizeGlobalReward,
  type GlobalReward,
} from "./rewards";
import { useRewardsStore } from "./rewardsStore";

export const GLOBAL_REWARDS_CONFIG_KEY = "global_rewards";

export interface GlobalRewardsConfigValue {
  version: 1;
  rewards: GlobalReward[];
}

function parseGlobalRewardsConfig(value: unknown): GlobalReward[] | null {
  if (!value || typeof value !== "object") return null;
  const rawRewards = (value as { rewards?: unknown }).rewards;
  if (!Array.isArray(rawRewards)) return null;
  const rewards = rawRewards
    .map((item) => sanitizeGlobalReward(item))
    .filter((item): item is GlobalReward => item != null);
  // Danh sách rỗng là lựa chọn hợp lệ của admin (ẩn toàn bộ thưởng chung),
  // nhưng payload không có mảng rewards thì không được coi là hợp lệ.
  return rewards;
}

/** Đọc cấu hình thưởng chung từ app_config. Null = chưa có dòng cấu hình. */
export async function fetchGlobalRewardsFromSupabase(): Promise<GlobalReward[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", GLOBAL_REWARDS_CONFIG_KEY)
    .maybeSingle<{ value: unknown }>();
  if (error) {
    throw new Error(`Không tải được cấu hình phần thưởng chung: ${error.message}`);
  }
  if (!data) return null;
  const rewards = parseGlobalRewardsConfig(data.value);
  if (!rewards) {
    throw new Error("Cấu hình phần thưởng chung trên Supabase không đúng định dạng.");
  }
  return rewards;
}

/**
 * Công bố cấu hình của admin. Quyền ghi thật nằm ở RLS của app_config:
 * client hiện form không có nghĩa là tài khoản thường ghi được.
 */
export async function publishGlobalRewards(
  rewards: GlobalReward[],
  updatedBy?: string | null,
): Promise<void> {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      "Supabase đang tắt trên bản app này nên chưa thể công bố. Cấu hình vẫn được giữ làm bản nháp trên máy.",
    );
  }
  const value: GlobalRewardsConfigValue = { version: 1, rewards };
  const { error } = await supabase.from("app_config").upsert(
    {
      key: GLOBAL_REWARDS_CONFIG_KEY,
      value,
      updated_by: updatedBy ?? null,
    },
    { onConflict: "key" },
  );
  if (error) {
    const isPermissionError =
      error.code === "42501" ||
      error.message.toLowerCase().includes("row-level security") ||
      error.message.toLowerCase().includes("permission");
    throw new Error(
      isPermissionError
        ? "Supabase đã từ chối quyền ghi. Hãy đăng nhập đúng tài khoản admin và bảo đảm rewards-schema.sql đã được chạy."
        : `Không công bố được phần thưởng chung: ${error.message}`,
    );
  }
}

/** Tải cấu hình chung vào cache local; lỗi mạng được nuốt an toàn. */
export async function refreshGlobalRewardsCache(): Promise<boolean> {
  try {
    const rewards = await fetchGlobalRewardsFromSupabase();
    if (!rewards) return false;
    useRewardsStore
      .getState()
      .setGlobalConfigCache(rewards, "supabase", Date.now());
    return true;
  } catch (error) {
    console.warn(
      "[piglingo] Chưa tải được phần thưởng chung từ Supabase, app dùng cache/mặc định:",
      error,
    );
    return false;
  }
}

/** Hook nền: tải cấu hình chung một lần mỗi lần app/layout được mount. */
export function useGlobalRewardsSync(): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!isSupabaseEnabled) return;
    void refreshGlobalRewardsCache();
  }, []);
}
