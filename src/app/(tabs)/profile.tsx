import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { Flag } from "@/components/flag";
import { useAuth } from "@/features/supabase/AuthContext";
import { useCourseContent } from "@/lib/content";
import {
  currentStreak,
  dailyXpToday,
  lastSevenDays,
  LEARNER_LEVELS,
  useProgress,
  type ThemePreference,
} from "@/lib/store";
import { isAllUnlocked, isValidUnlockCode } from "@/lib/unlock";
import { makeThemedStyles, radius, useResolvedScheme, useThemeColors } from "@/lib/theme";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "Theo máy", icon: "phone-portrait-outline" },
  { value: "light", label: "Sáng", icon: "sunny-outline" },
  { value: "dark", label: "Tối", icon: "moon-outline" },
];

export default function ProfileScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useStyles();
  const progress = useProgress();
  const { themePreference, setThemePreference } = progress;
  const { learnerLevel, setLearnerLevel, unlockAll } = progress;
  const { user } = useAuth();
  const unlockedAll = isAllUnlocked(progress, user?.email);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const submitUnlockCode = () => {
    if (isValidUnlockCode(unlockCode)) {
      unlockAll();
      setUnlockCode("");
      setUnlockMessage("Đã mở khóa toàn bộ bài học 🎉");
    } else {
      setUnlockMessage("Mã chưa đúng, em nhờ ba/mẹ kiểm tra lại nhé.");
    }
  };
  const { activeCourseId, dailyGoal } = progress;
  const courseProgress = progress.course();
  const { pack, allLessons, allWords } = useCourseContent(activeCourseId);
  const todayXp = dailyXpToday(progress);
  const streak = currentStreak(progress);
  const week = lastSevenDays(progress);

  const activeGreen = scheme === "dark" ? colors.green : colors.greenDark;

  const lessonsDone = Object.keys(courseProgress.completedLessons).filter((id) =>
    allLessons.some((l) => l.lesson.id === id)
  ).length;
  const wordsLearned = Object.keys(courseProgress.wordStats).filter((target) =>
    allWords().some((w) => w.target === target)
  ).length;

  const stats = [
    {
      label: "Chuỗi ngày",
      value: `${streak}`,
      icon: <MaterialCommunityIcons name="fire" size={28} color={colors.orange} />,
    },
    {
      label: "XP khóa học",
      value: `${courseProgress.xp}`,
      icon: <Ionicons name="flash" size={26} color={colors.skyDark} />,
    },
    {
      label: "XP hôm nay",
      value: `${todayXp}/${dailyGoal}`,
      icon: (
        <MaterialCommunityIcons name="bullseye-arrow" size={27} color={colors.amber} />
      ),
    },
    {
      label: "Cần ôn",
      value: `${courseProgress.mistakes.length}`,
      icon: <Ionicons name="refresh-circle" size={26} color={colors.rose} />,
    },
    {
      label: "Bài đã học",
      value: `${lessonsDone}/${allLessons.length}`,
      icon: <Ionicons name="checkmark-circle" size={26} color={colors.green} />,
    },
    {
      label: "Từ đã học",
      value: `${wordsLearned}`,
      icon: <Ionicons name="book" size={26} color={colors.indigo} />,
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/mascot.svg")}
            style={styles.mascot}
            contentFit="contain"
          />
          <Text style={styles.name} maxFontSizeMultiplier={1.3}>
            Tiến độ của em
          </Text>
          <Pressable
            onPress={() => router.push("/courses")}
            style={styles.courseRow}
            accessibilityRole="button"
            accessibilityLabel={`Đang học ${pack.targetLanguage}. Đổi khóa học.`}
          >
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              Đang học
            </Text>
            <Flag courseId={activeCourseId} size={18} />
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              {pack.targetLanguage}
            </Text>
            <View style={styles.switchRow}>
              <Text
                style={[styles.switch, { color: activeGreen }]}
                maxFontSizeMultiplier={1.3}
              >
                Đổi
              </Text>
              <Ionicons name="chevron-down" size={12} color={activeGreen} />
            </View>
          </Pressable>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <MaterialCommunityIcons
              name="fire"
              size={22}
              color={streak > 0 ? colors.orange : colors.neutral300}
            />
            <Text style={styles.weekTitle} maxFontSizeMultiplier={1.3}>
              {streak > 0
                ? `Chuỗi ${streak} ngày`
                : "Hoàn thành một bài để bắt đầu chuỗi ngày"}
            </Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View
                key={d.day}
                style={styles.weekDay}
                accessible={true}
                accessibilityLabel={`${d.weekday}, ${d.isToday ? "hôm nay, " : ""}${d.active ? "đã học" : "chưa học"}`}
              >
                <Text style={styles.weekLabel} maxFontSizeMultiplier={1.2}>
                  {d.weekday}
                </Text>
                <View
                  style={[
                    styles.weekDot,
                    d.active && styles.weekDotActive,
                    d.isToday && styles.weekDotToday,
                  ]}
                >
                  {d.active ? (
                    <Ionicons name="checkmark-sharp" size={16} color={colors.white} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.grid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={styles.statCard}
              accessible={true}
              accessibilityLabel={`${stat.label}: ${stat.value}`}
            >
              {stat.icon}
              <Text style={styles.statValue} maxFontSizeMultiplier={1.3}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.3}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="lock-open-outline" size={22} color={colors.amber} />
            <Text style={styles.settingsTitle} maxFontSizeMultiplier={1.3}>
              Mã mở khóa bài học
            </Text>
          </View>
          {unlockedAll ? (
            <Text style={styles.unlockDone} maxFontSizeMultiplier={1.3}>
              Đã mở khóa toàn bộ 🎉
            </Text>
          ) : (
            <>
              <Text style={styles.settingsHint} maxFontSizeMultiplier={1.3}>
                Có mã mở khóa thì nhập vào đây để mở toàn bộ bài học, không cần
                học lần lượt từng bài.
              </Text>
              <TextInput
                value={unlockCode}
                onChangeText={(t) => {
                  setUnlockCode(t);
                  setUnlockMessage(null);
                }}
                placeholder="Nhập mã mở khóa"
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Ô nhập mã mở khóa bài học"
                style={styles.unlockInput}
              />
              <DuoButton label="Mở khóa" onPress={submitUnlockCode} />
              {unlockMessage ? (
                <Text style={styles.unlockMessage} maxFontSizeMultiplier={1.3}>
                  {unlockMessage}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="school-outline" size={22} color={colors.skyDark} />
            <Text style={styles.settingsTitle} maxFontSizeMultiplier={1.3}>
              Cấp độ của em
            </Text>
          </View>
          <View style={styles.levelList}>
            {LEARNER_LEVELS.map((l) => {
              const active = learnerLevel === l.value;
              return (
                <Pressable
                  key={l.value}
                  onPress={() => setLearnerLevel(l.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${l.label}. ${l.hint}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.levelCard, active && styles.levelCardActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.levelName, active && { color: activeGreen }]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {l.label}
                    </Text>
                    <Text style={styles.levelHint} maxFontSizeMultiplier={1.3}>
                      {l.hint}
                    </Text>
                  </View>
                  <Text style={styles.levelCheck}>{active ? "✅" : "⚪"}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsHint} maxFontSizeMultiplier={1.3}>
            Màn hình học sẽ gợi ý bài phù hợp với cấp độ này.
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="color-palette-outline" size={22} color={colors.indigo} />
            <Text style={styles.settingsTitle} maxFontSizeMultiplier={1.3}>
              Giao diện
            </Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const active = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} theme`}
                  accessibilityState={{ selected: active }}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={active ? activeGreen : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      active && { color: activeGreen },
                    ]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsHint} maxFontSizeMultiplier={1.3}>
            Theo cài đặt sáng/tối của điện thoại.
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <Pressable
            onPress={() => router.push("/speaking")}
            style={styles.linkRow}
            accessibilityRole="button"
            accessibilityLabel="Luyện nói và phát âm"
          >
            <Ionicons name="mic-outline" size={22} color={colors.skyDark} />
            <Text style={styles.linkLabel} maxFontSizeMultiplier={1.3}>
              Luyện nói
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/parents")}
            style={styles.linkRow}
            accessibilityRole="button"
            accessibilityLabel="Khu vực dành cho ba mẹ"
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.indigo} />
            <Text style={styles.linkLabel} maxFontSizeMultiplier={1.3}>
              Dành cho ba/mẹ
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, gap: 20, paddingBottom: 60 },
  header: { alignItems: "center", gap: 8, paddingTop: 12 },
  mascot: { width: 110, height: 110 },
  name: { fontSize: 26, fontWeight: "800", color: colors.neutral700 },
  courseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 6,
  },
  switch: { fontSize: 13, fontWeight: "700", color: colors.green },
  weekCard: {
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.xl,
    padding: 16,
    gap: 14,
  },
  weekHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  weekTitle: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 6 },
  weekLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  weekDot: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotActive: { backgroundColor: colors.orange },
  weekDotToday: { borderWidth: 2, borderColor: colors.orange },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.neutral700 },
  statLabel: { fontSize: 12, color: colors.textMuted },
  settingsCard: {
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
  },
  settingsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsTitle: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
  themeRow: { flexDirection: "row", gap: 10 },
  themeChip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  themeChipActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight + "22",
  },
  themeLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  themeLabelActive: { color: colors.greenDark },
  settingsHint: { fontSize: 12, color: colors.textMuted },
  unlockDone: { fontSize: 16, fontWeight: "800", color: colors.correctText },
  unlockInput: {
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surface,
  },
  unlockMessage: { fontSize: 13, color: colors.textMuted },
  levelList: { gap: 10 },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 12,
  },
  levelCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight + "22",
  },
  levelName: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
  levelHint: { fontSize: 12, color: colors.textMuted },
  levelCheck: { fontSize: 18 },
  linkLabel: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.neutral700 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
}));
