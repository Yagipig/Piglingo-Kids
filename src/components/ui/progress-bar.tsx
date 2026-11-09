import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, useThemeColors } from "@/lib/theme";

/**
 * Thanh tiến độ chuẩn của design system (Phase 2): rãnh bo tròn đầy,
 * phần đã đạt tô màu đặc. `value` nhận tỉ lệ 0..1 (tự kẹp 2 đầu).
 * THUẦN trình bày — nơi gọi tự tính tỉ lệ từ dữ liệu thật.
 */
type ProgressBarProps = {
  /** Tỉ lệ hoàn thành 0..1. */
  value: number;
  /** Màu phần đã đạt; mặc định xanh lá thương hiệu. */
  color?: string;
  /** Chiều cao thanh (px). */
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Nhãn trợ năng mô tả tiến độ (ví dụ "Đã học 5 trên 10 bài"). */
  accessibilityLabel?: string;
};

export function ProgressBar({
  value,
  color,
  height = 12,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const colors = useThemeColors();
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[
        styles.track,
        { height, backgroundColor: colors.neutral200 },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, backgroundColor: color ?? colors.green },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: { height: "100%", borderRadius: radius.full },
});
