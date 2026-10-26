import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RecordButtonProps {
  isRecording: boolean;
  /** Đang ghi thì hiển thị số giây đã ghi. */
  durationMillis: number;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Nút ghi âm thật to cho bé: bấm 1 lần để ghi, bấm lần nữa để dừng.
 * Khi đang ghi, nút chuyển đỏ và hiện đồng hồ giây.
 */
export function RecordButton({
  isRecording,
  durationMillis,
  disabled,
  onStart,
  onStop,
}: RecordButtonProps) {
  const seconds = Math.floor(durationMillis / 1000);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        disabled={disabled}
        onPress={isRecording ? onStop : onStart}
        style={({ pressed }: { pressed: boolean }) => [
          styles.button,
          isRecording ? styles.buttonRecording : styles.buttonIdle,
          disabled && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.icon}>{isRecording ? '⏹️' : '🎤'}</Text>
        <Text style={styles.label}>{isRecording ? 'Dừng lại' : 'Nói nào!'}</Text>
      </Pressable>
      {isRecording ? <Text style={styles.timer}>Đang ghi… {seconds} giây</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  button: {
    minWidth: 168,
    minHeight: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  buttonIdle: { backgroundColor: '#208AEF' },
  buttonRecording: { backgroundColor: '#E5484D' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  icon: { fontSize: 52 },
  label: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  timer: { fontSize: 18, fontWeight: '600', color: '#B3261E' },
});
