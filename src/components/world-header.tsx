import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Flag } from "@/components/flag";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";

type WorldHeaderProps = {
  courseId: string;
  targetLanguage: string;
  streak: number;
  streakLit: boolean;
  xp: number;
  unlockedAll: boolean;
  musicOn: boolean;
  onToggleMusic: () => void;
  onOpenCourses: () => void;
  /** Tiến độ khám phá toàn khóa (số liệu cũ bloomed/total của trang chủ). */
  explored: number;
  totalLessons: number;
  exploredPct: number;
};

/**
 * "Bầu trời thế giới" ở đầu bản đồ: ảnh hero phiêu lưu, avatar mascot,
 * lời chào nhà thám hiểm, hàng chỉ số (streak/XP/mở khóa) và thanh tiến
 * độ khám phá. Lớp nền dùng selectedBg bán đặc để ảnh nền tự chọn của
 * người dùng (ScreenBackground) vẫn thoáng hiện phía sau.
 */
export function WorldHeader({
  courseId,
  targetLanguage,
  streak,
  streakLit,
  xp,
  unlockedAll,
  musicOn,
  onToggleMusic,
  onOpenCourses,
  explored,
  totalLessons,
  exploredPct,
}: WorldHeaderProps) {
  const colors = useThemeColors();
  const styles = useStyles();
  return (
    <View style={styles.skyBand}>
      <Image
        source={require("@/assets/images/world-hero.png")}
        style={styles.hero}
        contentFit="cover"
        accessibilityLabel="Bản đồ thế giới phiêu lưu Little Explorers"
      />
      <View style={styles.headerRow}>
        <View style={styles.avatarRing}>
          <Image
            source={require("@/assets/images/mascot.svg")}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.3}>
            Chào nhà thám hiểm! 🧭
          </Text>
          <Text style={styles.greetingSub} maxFontSizeMultiplier={1.3}>
            Little Explorers — khám phá thế giới ngôn ngữ
          </Text>
        </View>
        <Pressable
          onPress={onToggleMusic}
          accessibilityRole="button"
          accessibilityLabel={musicOn ? "Tắt nhạc nền" : "Bật nhạc nền"}
          accessibilityState={{ selected: musicOn }}
          style={({ pressed }) => [styles.musicButton, pressed && { opacity: 0.8 }]}
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
      </View>

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
          value={xp}
          label="XP"
          color={colors.skyDark}
        />
        {unlockedAll ? (
          <View style={styles.unlockBadge}>
            <Text style={styles.unlockBadgeText} maxFontSizeMultiplier={1.2}>
              🔓 Đã mở hết
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.exploreProgress}>
        <Text style={styles.exploreProgressText} maxFontSizeMultiplier={1.3}>
          🗺️ Đã khám phá {explored}/{totalLessons} điểm đến
        </Text>
        <View style={styles.exploreTrack}>
          <View style={[styles.exploreFill, { width: `${exploredPct}%` }]} />
        </View>
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
    hero: {
      height: 92,
      borderRadius: radius.lg,
      marginBottom: 2,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatarRing: {
      width: 58,
      height: 58,
      borderRadius: radius.full,
      borderWidth: 3,
      borderColor: colors.amber,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    mascot: { width: 50, height: 50 },
    greeting: { fontSize: 21, fontWeight: "800", color: colors.neutral700 },
    greetingSub: { fontSize: 13, color: colors.textMuted },
    musicButton: {
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
    statsRow: { flexDirection: "row", alignItems: "center", gap: 20 },
    stat: { flexDirection: "row", alignItems: "center", gap: 5 },
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
    exploreProgress: { gap: 5 },
    exploreProgressText: { fontSize: 14, fontWeight: "800", color: colors.correctText },
    exploreTrack: {
      height: 12,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    exploreFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.green },
  })
);
