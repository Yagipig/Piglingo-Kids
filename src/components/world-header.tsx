import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Flag } from "@/components/flag";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";

type WorldHeaderProps = {
  courseId: string;
  targetLanguage: string;
  /** Lời chào do màn cha chọn (lần đầu / trở lại) — không có tên trẻ vì app không lưu tên trẻ. */
  greeting: string;
  streak: number;
  streakLit: boolean;
  /** Tổng XP của cả ba khóa — khớp khái niệm Cấp vườn. */
  totalXp: number;
  gardenLevel: number;
  unlockedAll: boolean;
  musicOn: boolean;
  onToggleMusic: () => void;
  onOpenCourses: () => void;
  /** Nút ⚙ dẫn tới tab Hồ sơ, nơi các cài đặt thật đang nằm. */
  onOpenProfile: () => void;
};

/**
 * Header gọn của trang chủ Magical Garden: logo + mascot Piglingo, lời
 * chào nhà thám hiểm, hàng chỉ số (streak / tổng XP / cấp vườn) và các
 * nút nhạc, chọn khóa, cài đặt (Hồ sơ). Ảnh hero cũ đã bỏ vì cảnh vườn
 * bên dưới là hero chính. Nền bán trong suốt để ảnh nền tự chọn của
 * người dùng (ScreenBackground) vẫn thoáng hiện phía sau.
 */
export function WorldHeader({
  courseId,
  targetLanguage,
  greeting,
  streak,
  streakLit,
  totalXp,
  gardenLevel,
  unlockedAll,
  musicOn,
  onToggleMusic,
  onOpenCourses,
  onOpenProfile,
}: WorldHeaderProps) {
  const colors = useThemeColors();
  const styles = useStyles();
  return (
    <View style={styles.skyBand}>
      <View style={styles.headerRow}>
        <View style={styles.avatarRing}>
          <Image
            source={require("@/assets/images/mascot.svg")}
            style={styles.mascot}
            contentFit="contain"
            accessibilityLabel="Mascot Piglingo"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand} maxFontSizeMultiplier={1.2}>
            Piglingo
          </Text>
          <Text style={styles.brandSub} maxFontSizeMultiplier={1.2}>
            Khu vườn ngôn ngữ thần tiên 🌸
          </Text>
        </View>
        <Pressable
          onPress={onToggleMusic}
          accessibilityRole="button"
          accessibilityLabel={musicOn ? "Tắt nhạc nền" : "Bật nhạc nền"}
          accessibilityState={{ selected: musicOn }}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.musicIcon}>{musicOn ? "🔊" : "🔇"}</Text>
        </Pressable>
        <Pressable
          style={styles.coursePicker}
          onPress={onOpenCourses}
          accessibilityRole="button"
          accessibilityLabel={`Khóa học: ${targetLanguage}. Đổi khóa học`}
        >
          <Flag courseId={courseId} size={30} />
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Mở Hồ sơ và cài đặt"
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="settings-outline" size={21} color={colors.neutral700} />
        </Pressable>
      </View>

      <Text style={styles.greeting} maxFontSizeMultiplier={1.3}>
        {greeting}
      </Text>

      <View style={styles.statsRow}>
        <Stat
          icon={
            <MaterialCommunityIcons
              name="fire"
              size={22}
              color={streakLit ? colors.orange : colors.neutral300}
            />
          }
          value={streak}
          label="ngày"
          color={streakLit ? colors.orange : colors.neutral400}
        />
        <Stat
          icon={<Ionicons name="flash" size={19} color={colors.skyDark} />}
          value={totalXp}
          label="XP"
          color={colors.skyDark}
        />
        <View style={styles.stat}>
          <Text style={styles.statEmoji}>🌳</Text>
          <Text style={[styles.statValue, { color: colors.greenDark }]} maxFontSizeMultiplier={1.2}>
            {gardenLevel}
          </Text>
          <Text style={styles.statLabel} maxFontSizeMultiplier={1.2}>
            Cấp vườn
          </Text>
        </View>
        {unlockedAll ? (
          <View style={styles.unlockBadge}>
            <Text style={styles.unlockBadgeText} maxFontSizeMultiplier={1.2}>
              🔓 Đã mở hết
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={[styles.statValue, { color }]} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    skyBand: {
      // Bán trong suốt nhẹ để ảnh nền người dùng chọn vẫn thoáng hiện.
      backgroundColor: colors.selectedBg + "E6",
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      gap: 8,
      overflow: "hidden",
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatarRing: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      borderWidth: 3,
      borderColor: colors.amber,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    mascot: { width: 44, height: 44 },
    brand: { fontSize: 20, fontWeight: "900", color: colors.neutral700 },
    brandSub: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },
    greeting: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.neutral200,
    },
    musicIcon: { fontSize: 19 },
    coursePicker: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 4 },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 18 },
    stat: { flexDirection: "row", alignItems: "center", gap: 5 },
    statEmoji: { fontSize: 17 },
    statValue: { fontSize: 16, fontWeight: "800" },
    statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },
    unlockBadge: {
      marginLeft: "auto",
      backgroundColor: colors.correctBg,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    unlockBadgeText: { fontSize: 12, fontWeight: "800", color: colors.correctText },
  })
);
