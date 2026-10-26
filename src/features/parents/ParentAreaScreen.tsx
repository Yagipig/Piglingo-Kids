import React, { useCallback, useEffect, useState } from 'react';
import { ParentDashboard } from './ParentDashboard';
import { ParentGate } from './ParentGate';
import { useParentSettings } from './useParentSettings';
import { loadTodayUsage } from './parentStorage';
import type { ProgressSource } from './progressAdapter';
import type { ProgressSnapshot } from './types';

interface ParentAreaScreenProps {
  /** Nguồn tiến độ đã nối với store thật qua adapter. */
  progressSource: ProgressSource;
  onOpenAccount?: () => void;
}

/**
 * Màn hình khu vực phụ huynh hoàn chỉnh, sẵn sàng gắn vào một route:
 * ParentGate (phép tính) bọc ngoài, bên trong là ParentDashboard đọc snapshot
 * từ ProgressSource và cài đặt giới hạn từ AsyncStorage.
 *
 * Xem INTEGRATION.md để biết cách tạo route expo-router trỏ vào component này.
 */
export function ParentAreaScreen({ progressSource, onOpenAccount }: ParentAreaScreenProps) {
  const { settings, setDailyLimitMinutes } = useParentSettings();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [usedMinutesToday, setUsedMinutesToday] = useState<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setSnapshot(progressSource.getSnapshot());
    const usage = await loadTodayUsage();
    setUsedMinutesToday(Math.floor(usage.usedSeconds / 60));
  }, [progressSource]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ParentGate onUnlocked={() => void refresh()}>
      <ParentDashboard
        snapshot={snapshot}
        settings={settings}
        usedMinutesToday={usedMinutesToday}
        onChangeDailyLimit={(minutes) => void setDailyLimitMinutes(minutes)}
        onOpenAccount={onOpenAccount}
      />
    </ParentGate>
  );
}
