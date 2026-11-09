import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Card } from "@/components/ui/card";
import {
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  touchTargets,
  typography,
  useThemeColors,
} from "@/lib/theme";

/**
 * Khung trình bày DÙNG CHUNG cho 5 màn game (Phase 4 redesign): thanh
 * đầu (nút quay lại ≥48px + tiêu đề + huy hiệu bên phải), huy hiệu chỉ
 * số dạng viên thuốc và thẻ kết quả thắng/thua. Các component này THUẦN
 * trình bày — luật chơi, điểm số và cách tính thưởng của từng game vẫn
 * nằm nguyên trong chính màn game đó.
 */
export function GameHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useStyles();
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        style={({ pressed }) => [
          styles.backButton,
          pressed && { backgroundColor: colors.neutral100 },
        ]}
      >
        <Ionicons name="arrow-back" size={24} color={colors.neutral700} />
      </Pressable>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

/** Huy hiệu viên thuốc hiển thị chỉ số trong game (lượt, điểm, thời gian…). */
export function GameBadge({
  text,
  style,
}: {
  text: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Thẻ kết quả cuối ván: viền + nền vàng hổ phách khi thắng, đỏ mềm khi
 * thua. Nội dung (sao, câu chữ, nút chơi lại) do màn game truyền vào.
 */
export function WinCard({
  children,
  tone = "win",
}: {
  children: React.ReactNode;
  tone?: "win" | "lose";
}) {
  const colors = useThemeColors();
  const styles = useStyles();
  const lose = tone === "lose";
  return (
    <Card
      accentColor={lose ? colors.wrongText : colors.amber}
      style={[
        styles.winCard,
        { backgroundColor: lose ? colors.wrongBg : colors.amber + "1A" },
      ]}
    >
      {children}
    </Card>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: touchTargets.min,
      height: touchTargets.min,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    title: {
      flex: 1,
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "800",
      color: colors.neutral700,
    },
    badge: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.full,
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    badgeText: {
      fontSize: typography.caption.fontSize,
      fontWeight: "800",
      color: colors.neutral700,
    },
    winCard: { gap: spacing.md, alignItems: "center" },
  })
);
