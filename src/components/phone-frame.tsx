import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { layout, useGamePalette } from "@/lib/theme";

/**
 * Khung layout mobile-first portrait dùng chung toàn app (Phase 2
 * redesign): trên điện thoại, nội dung chiếm trọn màn hình như cũ; trên
 * tablet/desktop/màn rộng, nội dung chính bị giới hạn ở bề rộng kiểu
 * điện thoại (`layout.phoneMaxWidth`) và căn giữa, hai bên là nền trời/
 * biển sáng kiểu game với vài họa tiết trang trí mờ (mây, đảo, sóng).
 *
 * Áp ở root layout để MỌI màn hình (kể cả modal) thừa hưởng cùng một
 * khung — các phase sau không phải tự giới hạn bề rộng từng màn.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const game = useGamePalette();
  return (
    <View style={[styles.outer, { backgroundColor: game.skyBottom }]}>
      <View style={[styles.sky, { backgroundColor: game.skyTop }]} pointerEvents="none" />
      <Text style={[styles.deco, styles.decoCloudLeft]} pointerEvents="none">
        ☁️
      </Text>
      <Text style={[styles.deco, styles.decoIslandRight]} pointerEvents="none">
        🏝️
      </Text>
      <Text style={[styles.deco, styles.decoWaveLeft]} pointerEvents="none">
        🌊
      </Text>
      <Text style={[styles.deco, styles.decoCloudRight]} pointerEvents="none">
        ☁️
      </Text>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  /** Nửa trên phủ màu trời đậm hơn, nửa dưới giữ màu trời nhạt làm biển. */
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  deco: {
    position: "absolute",
    fontSize: 44,
    opacity: 0.35,
  },
  decoCloudLeft: { top: 64, left: "6%" },
  decoIslandRight: { top: "38%", right: "5%" },
  decoWaveLeft: { bottom: 72, left: "7%" },
  decoCloudRight: { top: 140, right: "9%" },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: layout.phoneMaxWidth,
    alignSelf: "center",
  },
});
