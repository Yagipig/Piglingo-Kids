import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/lib/use-reduced-motion";

const PIECES = ["🎉", "⭐", "🟢", "🔵", "🟣", "🟠", "✨", "🎊"] as const;
const PIECE_COUNT = 16;

/**
 * Pháo giấy ăn mừng tự chế bằng reanimated: 16 mảnh emoji rơi + xoay nhẹ
 * trong ~1.4s rồi mờ dần. Chỉ trang trí (pointerEvents none, aria-hidden),
 * tự "gỡ" bằng opacity 0 sau khi chạy xong. Tắt hẳn khi hệ thống bật
 * giảm chuyển động. Sao của bài học được suy từ dữ kiện sẵn có ở màn kết
 * quả (hoàn thành = 2 sao, perfect = 3 sao) — không lưu hệ sao mới.
 */
export function CelebrationBurst({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  if (!active || reducedMotion) return null;
  return (
    <View pointerEvents="none" style={styles.layer} aria-hidden>
      {Array.from({ length: PIECE_COUNT }, (_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

function ConfettiPiece({ index }: { index: number }) {
  // Bố trí giả-ngẫu nhiên nhưng ổn định theo index (không dùng Math.random
  // để tránh nhảy hình khi re-render).
  const layout = useMemo(() => {
    const leftPct = 4 + ((index * 61) % 90);
    const delay = (index % 6) * 90;
    const duration = 1050 + ((index * 37) % 450);
    const drift = ((index * 29) % 41) - 20;
    const spin = ((index % 5) - 2) * 35;
    const size = 15 + ((index * 13) % 12);
    return { leftPct, delay, duration, drift, spin, size };
  }, [index]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(
        layout.delay,
        withTiming(1, { duration: layout.duration, easing: Easing.out(Easing.quad) })
      )
    );
  }, [layout, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.get() * 300 },
      { translateX: progress.get() * layout.drift },
      { rotate: `${progress.get() * layout.spin}deg` },
    ],
    opacity: progress.get() < 0.75 ? 1 : 1 - (progress.get() - 0.75) * 4,
  }));

  return (
    <Animated.Text
      style={[
        styles.piece,
        { left: `${layout.leftPct}%`, fontSize: layout.size },
        style,
      ]}
    >
      {PIECES[index % PIECES.length]}
    </Animated.Text>
  );
}

/** Hàng sao hoàn thành: sao mờ cho vị trí chưa đạt (chỉ hiển thị). */
export function StarRow({ stars, total = 3 }: { stars: number; total?: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityLabel={`Đạt ${stars} trên ${total} sao`}>
      {Array.from({ length: total }, (_, i) => (
        <Text key={i} style={[styles.star, i >= stars && styles.starDim]}>
          ⭐
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    overflow: "hidden",
  },
  piece: { position: "absolute", top: -8 },
  starRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  star: { fontSize: 30 },
  starDim: { opacity: 0.25 },
});
