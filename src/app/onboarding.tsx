import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { Flag } from "@/components/flag";
import { catalog, orderedCourses } from "@/lib/content";
import {
  DAILY_GOAL_OPTIONS,
  DEFAULT_COURSE,
  LEARNER_LEVELS,
  useProgress,
  type LearnerLevel,
} from "@/lib/store";
import { makeThemedStyles, radius, useResolvedScheme, useThemeColors } from "@/lib/theme";

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useStyles();
  const finishOnboarding = useProgress((s) => s.finishOnboarding);
  const setLearnerLevel = useProgress((s) => s.setLearnerLevel);
  const [level, setLevel] = useState<LearnerLevel>("moi");
  const [courseId, setCourseId] = useState(
    catalog.courses.some((c) => c.id === DEFAULT_COURSE)
      ? DEFAULT_COURSE
      : (orderedCourses[0]?.id ?? "en-vi")
  );
  const [goal, setGoal] = useState<number>(20);

  const selected = catalog.courses.find((c) => c.id === courseId);
  const activeGreen = scheme === "dark" ? colors.green : colors.greenDark;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Image
          source={require("@/assets/images/world-hero.png")}
          style={styles.hero}
          contentFit="cover"
          accessibilityLabel="Thế giới phiêu lưu Little Explorers"
        />
        <Image
          source={require("@/assets/images/mascot.svg")}
          style={styles.mascot}
          contentFit="contain"
        />
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Little Explorers 🧭
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Chào mừng nhà thám hiểm nhí đến với Piglingo Kids! Chọn một ngôn ngữ
          và lên đường khám phá các vùng đất qua những bài học ngắn, có âm
          thanh và ôn tập thông minh.
        </Text>

        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
          Em muốn học
        </Text>
        <View style={styles.langGrid}>
          {orderedCourses.map((course) => (
            <Pressable
              key={course.id}
              onPress={() => setCourseId(course.id)}
              accessibilityRole="button"
              accessibilityLabel={`${course.targetLanguage}, ${course.unitCount} chủ đề, ${course.lessonCount} bài`}
              accessibilityState={{ selected: courseId === course.id }}
              style={[styles.langChip, courseId === course.id && styles.langChipActive]}
            >
              <Flag courseId={course.id} size={32} />
              <Text
                style={[
                  styles.langName,
                  courseId === course.id && { color: activeGreen },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {course.targetLanguage}
              </Text>
              <Text style={styles.langMeta} maxFontSizeMultiplier={1.3}>
                {course.unitCount} chủ đề · {course.lessonCount} bài
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
          Em đang ở cấp độ nào?
        </Text>
        <View style={styles.levelList}>
          {LEARNER_LEVELS.map((l) => (
            <Pressable
              key={l.value}
              onPress={() => setLevel(l.value)}
              accessibilityRole="button"
              accessibilityLabel={`${l.label}. ${l.hint}`}
              accessibilityState={{ selected: level === l.value }}
              style={[styles.levelCard, level === l.value && styles.levelCardActive]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.levelName, level === l.value && { color: activeGreen }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {l.label}
                </Text>
                <Text style={styles.levelHint} maxFontSizeMultiplier={1.3}>
                  {l.hint}
                </Text>
              </View>
              <Text style={styles.levelCheck}>{level === l.value ? "✅" : "⚪"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
          Mục tiêu XP mỗi ngày
        </Text>
        <View style={styles.goals}>
          {DAILY_GOAL_OPTIONS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              accessibilityRole="button"
              accessibilityLabel={`${g} XP mỗi ngày, ${g <= 10 ? "Nhẹ nhàng" : g <= 20 ? "Đều đặn" : g <= 30 ? "Chăm chỉ" : "Siêu cố gắng"}`}
              accessibilityState={{ selected: goal === g }}
              style={[styles.goalChip, goal === g && styles.goalChipActive]}
            >
              <Text
                style={[styles.goalText, goal === g && { color: activeGreen }]}
                maxFontSizeMultiplier={1.3}
              >
                {g} XP
              </Text>
              <Text
                style={[styles.goalHint, goal === g && { color: activeGreen }]}
                maxFontSizeMultiplier={1.3}
              >
                {g <= 10 ? "Nhẹ nhàng" : g <= 20 ? "Đều đặn" : g <= 30 ? "Chăm chỉ" : "Siêu cố gắng"}
              </Text>
            </Pressable>
          ))}
        </View>

        <DuoButton
          label={selected ? `Học ${selected.targetLanguage}` : "Bắt đầu học"}
          onPress={() => {
            setLearnerLevel(level);
            finishOnboarding(courseId, goal);
            router.replace("/(tabs)");
          }}
          style={{ alignSelf: "stretch" }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  hero: { height: 150, borderRadius: radius.xl, width: "100%" },
  mascot: { width: 100, height: 100, alignSelf: "center" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.neutral700,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.neutral700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  langChip: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
  },
  langChipActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight + "22",
  },
  levelList: { gap: 10 },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 14,
  },
  levelCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight + "22",
  },
  levelName: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
  levelHint: { fontSize: 12, color: colors.textMuted },
  levelCheck: { fontSize: 20 },
  langName: { fontSize: 17, fontWeight: "800", color: colors.neutral700 },
  langNameActive: { color: colors.greenDark },
  langMeta: { fontSize: 11, color: colors.textMuted },
  goals: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  goalChip: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    gap: 2,
  },
  goalChipActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight + "22",
  },
  goalText: { fontSize: 18, fontWeight: "800", color: colors.neutral700 },
  goalTextActive: { color: colors.greenDark },
  goalHint: { fontSize: 12, color: colors.textMuted },
}));
