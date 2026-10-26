import { useCallback, useEffect, useState } from 'react';
import {
  loadParentSettings,
  loadTodayUsage,
  saveParentSettings,
} from './parentStorage';
import {
  DEFAULT_PARENT_SETTINGS,
  type DailyUsage,
  type ParentSettings,
} from './types';

export interface UseParentSettings {
  settings: ParentSettings;
  isLoaded: boolean;
  /** Đổi giới hạn phút/ngày (null = không giới hạn) và lưu ngay xuống AsyncStorage. */
  setDailyLimitMinutes: (minutes: number | null) => Promise<void>;
  /** Đọc lại số liệu dùng hôm nay (ví dụ sau khi gia hạn). */
  refreshUsage: () => Promise<DailyUsage>;
}

/** Hook quản lý cài đặt phụ huynh: nạp khi mount, lưu ngay khi thay đổi. */
export function useParentSettings(): UseParentSettings {
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      setSettings(await loadParentSettings());
      setIsLoaded(true);
    })();
  }, []);

  const setDailyLimitMinutes = useCallback(async (minutes: number | null) => {
    const next: ParentSettings = { dailyLimitMinutes: minutes, updatedAt: Date.now() };
    setSettings(next);
    await saveParentSettings(next);
  }, []);

  const refreshUsage = useCallback(async () => loadTodayUsage(), []);

  return { settings, isLoaded, setDailyLimitMinutes, refreshUsage };
}
