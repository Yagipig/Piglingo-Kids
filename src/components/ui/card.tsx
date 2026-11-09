import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { makeThemedStyles, radius, shadow, spacing } from "@/lib/theme";

/**
 * Thẻ nội dung chuẩn của design system (Phase 2): bo góc lớn, viền 2px
 * nhẹ, bóng mềm. Dùng cho thẻ nhiệm vụ, thẻ vương quốc, thẻ thống kê…
 * ở các phase sau — component này THUẦN trình bày, không chứa logic.
 */
type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Màu viền nhấn (ví dụ màu vương quốc); bỏ trống = viền trung tính. */
  accentColor?: string;
  /** Có đệm trong mặc định (spacing.lg) hay không. */
  padded?: boolean;
};

export function Card({ children, style, accentColor, padded = true }: CardProps) {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.card,
        accentColor ? { borderColor: accentColor } : null,
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.neutral200,
      borderWidth: 2,
      borderRadius: radius.xl,
      ...shadow.card,
    },
    padded: { padding: spacing.lg },
  })
);
