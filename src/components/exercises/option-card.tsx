import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { haptics } from "@/lib/haptics";
import {
  radius,
  shadow,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from "@/lib/theme";

export type OptionState = "idle" | "selected" | "correct" | "wrong";

function stateColors(
  colors: ThemeColors
): Record<OptionState, { border: string; bg: string; text: string }> {
  return {
    idle: { border: colors.neutral200, bg: colors.surface, text: colors.text },
    selected: { border: colors.sky, bg: colors.selectedBg, text: colors.selectedText },
    correct: {
      border: colors.greenLight,
      bg: colors.correctBg,
      text: colors.correctText,
    },
    wrong: { border: colors.rose, bg: colors.wrongBg, text: colors.wrongText },
  };
}

type OptionCardProps = {
  text: string;
  emoji?: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function OptionCard({
  text,
  emoji,
  state,
  onPress,
  disabled,
  compact,
}: OptionCardProps) {
  const c = stateColors(useThemeColors())[state];
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{
        selected: state === "selected",
        disabled: !!disabled,
      }}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compact : styles.full,
        {
          borderColor: c.border,
          backgroundColor: c.bg,
          borderBottomWidth: pressed ? 2 : 5,
        },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <View style={styles.textWrap}>
        <Text style={[styles.text, { color: c.text }]} maxFontSizeMultiplier={1.3}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  full: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    width: "100%",
  },
  compact: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    minHeight: 96,
    gap: spacing.sm,
  },
  emoji: { fontSize: 44 },
  textWrap: { flexShrink: 1 },
  text: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: "700",
    textAlign: "center",
  },
});
