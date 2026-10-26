import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  addUsedSeconds,
  grantExtraMinutes,
  loadTodayUsage,
  remainingSeconds,
} from './parentStorage';
import type { DailyUsage, ParentSettings } from './types';

/**
 * Hook theo dõi thời gian dùng app trong ngày và enforce giới hạn của phụ huynh.
 *
 * Cách đo: một bộ đếm chạy mỗi `tickSeconds` giây (mặc định 15) CHỈ khi app đang
 * ở foreground (AppState = 'active'). Mỗi tick cộng đúng số giây thực đã trôi qua
 * kể từ tick trước vào AsyncStorage, nên tắt/mở app hay chuyển ngày đều xử lý đúng:
 * sang ngày mới, loadTodayUsage() tự trả về bản ghi 0 phút của ngày mới.
 */

const DEFAULT_TICK_SECONDS = 15;

export interface UseDailyLimit {
  usage: DailyUsage | null;
  /** Giây còn lại hôm nay. null = không giới hạn. */
  remaining: number | null;
  isLimitReached: boolean;
  /** Phụ huynh gia hạn thêm (phút) cho hôm nay — gọi sau khi đã qua ParentGate. */
  extendToday: (minutes: number) => Promise<void>;
  reload: () => Promise<void>;
}

export function useDailyLimit(
  settings: ParentSettings,
  options?: { enabled?: boolean; tickSeconds?: number },
): UseDailyLimit {
  const enabled = options?.enabled ?? true;
  const tickSeconds = options?.tickSeconds ?? DEFAULT_TICK_SECONDS;
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    setUsage(await loadTodayUsage());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return undefined;

    lastTickAtRef.current = Date.now();
    const interval = setInterval(() => {
      void (async () => {
        if (AppState.currentState !== 'active') return;
        const now = Date.now();
        const elapsedSeconds = lastTickAtRef.current
          ? Math.min((now - lastTickAtRef.current) / 1000, tickSeconds * 2)
          : tickSeconds;
        lastTickAtRef.current = now;
        // Chỉ cộng khi còn dưới giới hạn để số liệu không phình vô hạn sau khi đã hết giờ.
        const current = await loadTodayUsage();
        const remainingNow = remainingSeconds(settings, current);
        if (remainingNow === null || remainingNow > 0) {
          setUsage(await addUsedSeconds(elapsedSeconds));
        } else {
          setUsage(current);
        }
      })();
    }, tickSeconds * 1000);

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      // Khi quay lại foreground, bắt đầu tính lại từ thời điểm này (không tính lúc app ở background).
      if (state === 'active') {
        lastTickAtRef.current = Date.now();
        void reload();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, reload, settings, tickSeconds]);

  const extendToday = useCallback(async (minutes: number) => {
    setUsage(await grantExtraMinutes(minutes));
  }, []);

  const remaining = usage ? remainingSeconds(settings, usage) : null;
  const isLimitReached = remaining !== null && remaining <= 0;

  return { usage, remaining, isLimitReached, extendToday, reload };
}
