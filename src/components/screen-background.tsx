import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { useProgress } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";

/**
 * Độ mờ của lớp phủ màu nền theme trên ảnh nền tự chọn: đủ trong để chữ
 * và thẻ nội dung vẫn đọc rõ, đủ mỏng để vẫn thấy ảnh phía sau.
 */
const OVERLAY_OPACITY = 0.86;

/**
 * Bọc các màn chính của app: nếu người dùng đã chọn ảnh nền thì hiển thị ảnh
 * phủ toàn màn (kèm lớp phủ mờ theo theme), chưa chọn thì là nền phẳng mặc
 * định đúng như trước. Nội dung con giữ nguyên cấu trúc/cuộn.
 */
export function ScreenBackground({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const backgroundImage = useProgress((state) => state.backgroundImage);

  if (!backgroundImage) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={{ uri: backgroundImage }}
      style={styles.root}
      resizeMode="cover"
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.background, opacity: OVERLAY_OPACITY },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
