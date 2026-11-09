import { useEffect, useRef } from "react";

import { isSupabaseEnabled, supabase } from "@/features/supabase/client";
import { useRewardsStore } from "./rewardsStore";
import { sanitizeSpinConfig, type SpinConfig } from "./spin";

/**
 * Đồng bộ CẤU HÌNH VÒNG QUAY qua bảng app_config — đúng khuôn của
 * globalRewardsSync (key riêng "spin_config"):
 * - ĐỌC công khai: mọi máy tải cấu hình Admin đã công bố khi mở app.
 * - GHI chỉ Admin: RLS của app_config chỉ cho JWT có email admin ghi.
 * Chưa chạy SQL / chưa đăng nhập / mất mạng → app dùng cache local
 * hoặc DEFAULT_SPIN_CONFIG, vòng quay vẫn chạy đầy đủ trên một máy.
 */

export const SPIN_CONFIG_KEY = "spin_config";

/** Đọc cấu hình vòng quay từ app_config. Null = chưa có dòng cấu hình. */
export async function fetchSpinConfigFromSupabase(): Promise<SpinConfig | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", SPIN_CONFIG_KEY)
    .maybeSingle<{ value: unknown }>();
  if (error) {
    throw new Error(`Không tải được cấu hình vòng quay: ${error.message}`);
  }
  if (!data) return null;
  const config = sanitizeSpinConfig(data.value);
  if (!config) {
    throw new Error("Cấu hình vòng quay trên Supabase không đúng định dạng.");
  }
  return config;
}

/**
 * Công bố cấu hình vòng quay của admin. Quyền ghi thật nằm ở RLS của
 * app_config: client hiện form không có nghĩa là tài khoản thường ghi được.
 */
export async function publishSpinConfig(
  config: SpinConfig,
  updatedBy?: string | null,
): Promise<void> {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      "Supabase đang tắt trên bản app này nên chưa thể công bố. Cấu hình vẫn được giữ làm bản nháp trên máy.",
    );
  }
  const { error } = await supabase.from("app_config").upsert(
    {
      key: SPIN_CONFIG_KEY,
      value: config,
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
        : `Không công bố được cấu hình vòng quay: ${error.message}`,
    );
  }
}

/** Tải cấu hình vòng quay vào cache local; lỗi mạng được nuốt an toàn. */
export async function refreshSpinConfigCache(): Promise<boolean> {
  try {
    const config = await fetchSpinConfigFromSupabase();
    if (!config) return false;
    useRewardsStore.getState().setSpinConfigCache(config, "supabase", Date.now());
    return true;
  } catch (error) {
    console.warn(
      "[piglingo] Chưa tải được cấu hình vòng quay từ Supabase, app dùng cache/mặc định:",
      error,
    );
    return false;
  }
}

/** Hook nền: tải cấu hình vòng quay một lần mỗi lần app/layout được mount. */
export function useSpinConfigSync(): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!isSupabaseEnabled) return;
    void refreshSpinConfigCache();
  }, []);
}
