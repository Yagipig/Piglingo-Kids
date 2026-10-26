import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PARENT_SETTINGS,
  PARENT_STORAGE_KEYS,
  todayKey,
  type DailyUsage,
  type ParentSettings,
} from './types';

/**
 * Toàn bộ thao tác đọc/ghi AsyncStorage của khu vực phụ huynh tập trung ở đây,
 * để các hook/component không phải tự chạm vào khóa lưu trữ.
 */

/* ------------------------- Cài đặt phụ huynh ------------------------- */

export async function loadParentSettings(): Promise<ParentSettings> {
  try {
    const raw = await AsyncStorage.getItem(PARENT_STORAGE_KEYS.settings);
    if (!raw) return DEFAULT_PARENT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ParentSettings>;
    return {
      dailyLimitMinutes:
        parsed.dailyLimitMinutes === null || typeof parsed.dailyLimitMinutes === 'number'
          ? parsed.dailyLimitMinutes
          : DEFAULT_PARENT_SETTINGS.dailyLimitMinutes,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return DEFAULT_PARENT_SETTINGS;
  }
}

export async function saveParentSettings(settings: ParentSettings): Promise<void> {
  await AsyncStorage.setItem(PARENT_STORAGE_KEYS.settings, JSON.stringify(settings));
}

/* ------------------------- Thời gian dùng trong ngày ------------------------- */

function emptyUsage(date: string): DailyUsage {
  return { date, usedSeconds: 0, extraMinutes: 0 };
}

/** Đọc số liệu hôm nay; nếu bản ghi thuộc ngày cũ thì tự coi như ngày mới (dùng 0 phút). */
export async function loadTodayUsage(now: Date = new Date()): Promise<DailyUsage> {
  const today = todayKey(now);
  try {
    const raw = await AsyncStorage.getItem(PARENT_STORAGE_KEYS.usage);
    if (!raw) return emptyUsage(today);
    const parsed = JSON.parse(raw) as DailyUsage;
    if (parsed.date !== today) return emptyUsage(today);
    return {
      date: today,
      usedSeconds: typeof parsed.usedSeconds === 'number' ? parsed.usedSeconds : 0,
      extraMinutes: typeof parsed.extraMinutes === 'number' ? parsed.extraMinutes : 0,
    };
  } catch {
    return emptyUsage(today);
  }
}

export async function saveUsage(usage: DailyUsage): Promise<void> {
  await AsyncStorage.setItem(PARENT_STORAGE_KEYS.usage, JSON.stringify(usage));
}

/** Cộng thêm thời gian đã dùng (giây) vào tổng của hôm nay và trả về bản ghi mới. */
export async function addUsedSeconds(seconds: number): Promise<DailyUsage> {
  if (seconds <= 0) return loadTodayUsage();
  const usage = await loadTodayUsage();
  const next: DailyUsage = { ...usage, usedSeconds: usage.usedSeconds + Math.round(seconds) };
  await saveUsage(next);
  return next;
}

/** Phụ huynh gia hạn thêm số phút cho riêng hôm nay. */
export async function grantExtraMinutes(minutes: number): Promise<DailyUsage> {
  const usage = await loadTodayUsage();
  const next: DailyUsage = { ...usage, extraMinutes: usage.extraMinutes + minutes };
  await saveUsage(next);
  return next;
}

/** Giới hạn hiệu lực hôm nay (phút) = giới hạn cài đặt + gia hạn. null = không giới hạn. */
export function effectiveLimitMinutes(
  settings: ParentSettings,
  usage: DailyUsage,
): number | null {
  if (settings.dailyLimitMinutes === null) return null;
  return settings.dailyLimitMinutes + usage.extraMinutes;
}

/** Còn lại bao nhiêu giây hôm nay. null = không giới hạn. */
export function remainingSeconds(
  settings: ParentSettings,
  usage: DailyUsage,
): number | null {
  const limit = effectiveLimitMinutes(settings, usage);
  if (limit === null) return null;
  return Math.max(0, limit * 60 - usage.usedSeconds);
}
