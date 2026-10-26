import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LimitReachedScreen } from './LimitReachedScreen';
import { ParentGate } from './ParentGate';
import { effectiveLimitMinutes } from './parentStorage';
import { useDailyLimit } from './useDailyLimit';
import type { ParentSettings } from './types';

interface TimeLimitGuardProps {
  settings: ParentSettings;
  /** Tắt enforce (ví dụ khi đang ở chính khu vực phụ huynh) thì đặt false. */
  enabled?: boolean;
  children: ReactNode;
}

const EXTENSION_OPTIONS = [10, 20, 30];

/**
 * Bọc toàn bộ phần app của bé: tự đếm thời gian dùng trong ngày, hết giờ thì
 * thay nội dung bằng màn hình nghỉ. Phụ huynh bấm "gia hạn" phải qua ParentGate,
 * sau đó chọn thêm 10/20/30 phút cho riêng hôm nay.
 *
 * Lưu ý: nên mount guard này ở layout gốc nhưng NGOÀI khu vực phụ huynh,
 * nếu không phụ huynh cũng bị chặn bởi chính giới hạn này.
 */
export function TimeLimitGuard({ settings, enabled = true, children }: TimeLimitGuardProps) {
  const { usage, isLimitReached, extendToday } = useDailyLimit(settings, { enabled });
  const [showExtendGate, setShowExtendGate] = useState(false);

  if (!enabled || !isLimitReached || !usage) {
    return <>{children}</>;
  }

  const limitToday = effectiveLimitMinutes(settings, usage) ?? settings.dailyLimitMinutes ?? 0;

  if (showExtendGate) {
    return (
      <ParentGate onUnlocked={() => undefined}>
        <View style={styles.extendContainer}>
          <Text style={styles.extendTitle}>Gia hạn cho hôm nay</Text>
          <Text style={styles.extendHint}>Chọn thêm thời gian học cho bé hôm nay:</Text>
          {EXTENSION_OPTIONS.map((minutes) => (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              onPress={() => {
                void extendToday(minutes).then(() => setShowExtendGate(false));
              }}
              style={({ pressed }: { pressed: boolean }) => [styles.extendButton, pressed && styles.pressed]}
            >
              <Text style={styles.extendButtonLabel}>+ {minutes} phút</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowExtendGate(false)}
            style={({ pressed }: { pressed: boolean }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelLabel}>Không gia hạn</Text>
          </Pressable>
        </View>
      </ParentGate>
    );
  }

  return (
    <LimitReachedScreen
      limitMinutes={limitToday}
      onParentExtendRequest={() => setShowExtendGate(true)}
    />
  );
}

const styles = StyleSheet.create({
  extendContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  extendTitle: { fontSize: 26, fontWeight: '800', color: '#1B1B1B' },
  extendHint: { fontSize: 17, color: '#555555', textAlign: 'center' },
  extendButton: {
    backgroundColor: '#208AEF',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 13,
    minWidth: 200,
    alignItems: 'center',
  },
  extendButtonLabel: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  cancelButton: { paddingVertical: 10 },
  cancelLabel: { fontSize: 17, color: '#555555' },
  pressed: { opacity: 0.85 },
});
