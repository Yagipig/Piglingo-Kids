import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radius, useThemeColors, type ThemeColors } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger" | "super" | "locked" | "white";

function palette(
  colors: ThemeColors
): Record<Variant, { bg: string; border: string; text: string }> {
  return {
    primary: { bg: colors.sky, border: colors.skyDark, text: colors.white },
    secondary: { bg: colors.green, border: colors.greenDark, text: colors.white },
    danger: { bg: colors.rose, border: colors.roseDark, text: colors.white },
    super: { bg: colors.indigo, border: colors.indigoDark, text: colors.white },
    locked: { bg: colors.neutral200, border: colors.neutral400, text: colors.neutral400 },
    white: { bg: colors.surface, border: colors.neutral200, text: colors.textMuted },
  };
}

type DuoButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** "lg" = nút phiêu lưu cỡ lớn (Tiếp tục học). Mặc định giữ nguyên như cũ. */
  size?: "md" | "lg";
};

/** The web app's 3D button: darker bottom border that collapses on press. */
export function DuoButton({
  label,
  onPress,
  variant = "secondary",
  disabled,
  style,
  size = "md",
}: DuoButtonProps) {
  const c = palette(useThemeColors())[disabled ? "locked" : variant];
  const large = size === "lg";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        large && styles.baseLg,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderBottomWidth: pressed ? 0 : large ? 6 : 4,
          marginTop: pressed ? (large ? 6 : 4) : 0,
        },
        variant === "white" && { borderWidth: 2, borderBottomWidth: pressed ? 2 : 4 },
        style,
      ]}
    >
      <Text
        style={[styles.label, large && styles.labelLg, { color: c.text }]}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  baseLg: {
    borderRadius: radius.xl,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  label: {
    fontWeight: "800",
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  labelLg: { fontSize: 18 },
});
