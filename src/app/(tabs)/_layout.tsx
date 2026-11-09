import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, shadow, touchTargets, useResolvedScheme, useThemeColors } from "@/lib/theme";

/**
 * Thanh tab dưới — cấu trúc route GIỮ NGUYÊN (Học / Ôn tập / Hồ sơ),
 * chỉ đổi phong cách theo design system Phase 2: nút to (icon 28px,
 * vùng chạm ≥48px), nhãn rõ 12px/800, tab đang chọn có "viên thuốc"
 * nền xanh mềm sau icon, bo góc trên lớn, bóng nổi mềm, tôn trọng
 * safe-area dưới (home indicator / thanh điều hướng Android).
 */
export default function TabsLayout() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const pillBackground = scheme === "dark" ? "#173d24" : "#dcfce7";

  const renderIcon =
    (focusedName: keyof typeof Ionicons.glyphMap, outlineName: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <View
        style={[
          styles.iconPill,
          focused ? { backgroundColor: pillBackground } : styles.iconPillIdle,
        ]}
      >
        <Ionicons
          name={focused ? focusedName : outlineName}
          size={touchTargets.tabIcon}
          color={color}
        />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: scheme === "dark" ? colors.green : colors.greenDark,
        tabBarInactiveTintColor: colors.neutral400,
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 2,
          borderTopColor: colors.neutral200,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          height: touchTargets.tabBarHeight + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 10,
          ...shadow.floating,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Học",
          tabBarIcon: renderIcon("map", "map-outline"),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Ôn tập",
          tabBarIcon: renderIcon("game-controller", "game-controller-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: renderIcon("compass", "compass-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 56,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillIdle: { backgroundColor: "transparent" },
});
