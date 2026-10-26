import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface LimitReachedScreenProps {
  /** Số phút giới hạn hiệu lực hôm nay (đã gồm gia hạn), để hiển thị cho phụ huynh. */
  limitMinutes: number;
  /** Bấm khi phụ huynh muốn mở khóa để gia hạn — nơi gọi nên bọc bằng ParentGate. */
  onParentExtendRequest: () => void;
}

/** Màn hình "đến giờ nghỉ" hiển thị khi bé đã dùng hết thời gian hôm nay. */
export function LimitReachedScreen({ limitMinutes, onParentExtendRequest }: LimitReachedScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐷💤</Text>
      <Text style={styles.title}>Đến giờ nghỉ rồi!</Text>
      <Text style={styles.body}>
        Hôm nay con đã học và chơi {limitMinutes} phút. Mình nghỉ mắt một lát, ngày mai học tiếp
        nhé!
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onParentExtendRequest}
        style={({ pressed }: { pressed: boolean }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Ba/mẹ gia hạn thêm</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emoji: { fontSize: 64 },
  title: { fontSize: 30, fontWeight: '800', color: '#1B1B1B', textAlign: 'center' },
  body: { fontSize: 19, color: '#555555', textAlign: 'center', lineHeight: 28 },
  button: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#208AEF',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLabel: { fontSize: 18, fontWeight: '700', color: '#208AEF' },
  pressed: { opacity: 0.85 },
});
