import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { makeThemedStyles, radius, shadow, spacing, touchTargets, typography } from "@/lib/theme";

/**
 * Chip chỉ số chuẩn của design system (Phase 2): emoji + giá trị đậm +
 * nhãn nhỏ phía dưới, nền mềm theo màu truyền vào. Chiều cao tối thiểu
 * đạt vùng chạm chuẩn 48px của brief. THUẦN trình bày.
 */
type StatChipProps = {
  emoji: string;
  /** Giá trị chính, ví dụ "120" hoặc "5/10". */
  value: string;
  /** Nhãn nhỏ dưới giá trị, ví dụ "XP hôm nay". */
  label: string;
  /** Màu nền mềm của chip; bỏ trống = nền trung tính theo theme. */
  softColor?: string;
  /** Màu chữ của giá trị; bỏ trống = màu chữ chính. */
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function StatChip({
  emoji,
  value,
  label,
  softColor,
  valueColor,
  style,
}: StatChipProps) {
  const styles = useStyles();
  return (
    <View
      style={[styles.chip, softColor ? { backgroundColor: softColor } : null, style]}
    >
      <Text style={styles.emoji} maxFontSizeMultiplier={1.2}>
        {emoji}
      </Text>
      <View style={styles.texts}>
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : null]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text style={styles.label} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: touchTargets.min,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      ...shadow.soft,
    },
    emoji: { fontSize: 20, lineHeight: 24 },
    texts: { gap: 0 },
    value: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "800",
      color: colors.text,
    },
    label: {
      fontSize: typography.tiny.fontSize,
      lineHeight: typography.tiny.lineHeight,
      fontWeight: "700",
      color: colors.textMuted,
    },
  })
);
