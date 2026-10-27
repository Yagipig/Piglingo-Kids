import { router } from "expo-router";
import React, { useMemo, useRef } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContinueButton } from "@/components/continue-button";
import { LandCard } from "@/components/land-card";
import { ScreenBackground } from "@/components/screen-background";
import { WorldHeader } from "@/components/world-header";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  difficultyForIndex,
  difficultyLabel,
  tierForLearnerLevel,
  useCourseContent,
} from "@/lib/content";
import { landForUnit } from "@/lib/lands";
import {
  activeToday,
  currentLessonIndex,
  currentStreak,
  dailyXpToday,
  learnerLevelLabel,
  useProgress,
} from "@/lib/store";
import { makeThemedStyles, radius, unitPalette } from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";
import { useAmbientMusic } from "@/lib/useAmbientMusic";

/**
 * Trang chủ "Little Explorers — Bản đồ thế giới khám phá ngôn ngữ": mỗi
 * chủ đề học là một vùng đất phiêu lưu (đảo/rừng/làng/lâu đài...), các bài
 * là "điểm khám phá" trên vùng. Thứ tự vùng/bài và công thức khóa giữ
 * nguyên 100% như bản Khu vườn trước: bài khóa khi chưa mở hết và
 * globalIndex > currentIndex (currentLessonIndex từ store).
 */
export default function LearnScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const { activeCourseId, dailyGoal, learnerLevel, musicOn, setMusicOn } = progress;
  const courseProgress = progress.course();
  const { pack, allLessons } = useCourseContent(activeCourseId);
  const { user } = useAuth();
  const unlockedAll = isAllUnlocked(progress, user?.email);
  useAmbientMusic();

  const todayXp = dailyXpToday(progress);
  const goalPct =
    dailyGoal > 0 ? Math.min(100, Math.max(0, (todayXp / dailyGoal) * 100)) : 0;
  const lessonIds = allLessons.map((l) => l.lesson.id);
  const currentIndex = currentLessonIndex(courseProgress.completedLessons, lessonIds);
  const streak = currentStreak(progress);
  const streakLit = activeToday(progress);

  const total = allLessons.length;
  const explored = allLessons.filter(
    (l) => courseProgress.completedLessons[l.lesson.id]
  ).length;
  const exploredPct = total > 0 ? Math.round((explored / total) * 100) : 0;
  const allDone = total > 0 && currentIndex >= total;
  const continueTarget = allLessons[Math.min(currentIndex, total - 1)];

  const scrollRef = useRef<ScrollView>(null);
  const unitYRef = useRef(new Map<string, number>());
  const sectionYRef = useRef(new Map<string, number>());

  // Units cycle through the palette across the whole course.
  const unitColor = new Map<string, (typeof unitPalette)[number]>();
  pack.sections.forEach((section) =>
    section.units.forEach((unit) =>
      unitColor.set(unit.id, unitPalette[unitColor.size % unitPalette.length])
    )
  );

  // Gợi ý theo cấp độ: bài đầu tiên của tầng độ khó tương ứng cấp độ đã chọn.
  const targetTier = tierForLearnerLevel(learnerLevel);
  const suggestedRef = useMemo(
    () => allLessons.find((l) => difficultyForIndex(l.globalIndex, total) === targetTier),
    [allLessons, targetTier, total]
  );

  const jumpToSuggestion = () => {
    if (!suggestedRef) return;
    const unitY = unitYRef.current.get(suggestedRef.unit.id);
    if (unitY === undefined) return;
    const section = pack.sections.find((s) =>
      s.units.some((u) => u.id === suggestedRef.unit.id)
    );
    const sectionY = section ? (sectionYRef.current.get(section.id) ?? 0) : 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, sectionY + unitY - 8), animated: true });
  };

  const showLockedHint = () => {
    Alert.alert(
      "Cổng vùng đất đang khóa 🔒",
      "Hoàn thành các điểm khám phá trước để mở cổng nhé. Hoặc nhờ ba/mẹ nhập mã mở khóa ở tab Hồ sơ để mở toàn bộ thế giới."
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <WorldHeader
          courseId={activeCourseId}
          targetLanguage={pack.targetLanguage}
          streak={streak}
          streakLit={streakLit}
          xp={courseProgress.xp}
          unlockedAll={unlockedAll}
          musicOn={musicOn}
          onToggleMusic={() => setMusicOn(!musicOn)}
          onOpenCourses={() => router.push("/courses")}
          explored={explored}
          totalLessons={total}
          exploredPct={exploredPct}
        />

        <View style={styles.goalBar}>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
          </View>
          <Text style={styles.goalLabel} maxFontSizeMultiplier={1.3}>
            {todayXp}/{dailyGoal} XP hôm nay
          </Text>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
          <View style={styles.column}>
            {continueTarget ? (
              <ContinueButton
                target={continueTarget}
                allDone={allDone}
                onPress={() => router.push(`/lesson/${continueTarget.lesson.id}`)}
              />
            ) : null}

            {suggestedRef ? (
              <View style={styles.suggestCard}>
                <Text style={styles.suggestEmoji}>🗺️</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.suggestTitle} maxFontSizeMultiplier={1.3}>
                    Gợi ý hành trình
                  </Text>
                  <Text style={styles.suggestText} maxFontSizeMultiplier={1.3}>
                    Cấp độ: {learnerLevelLabel(learnerLevel)} · Bắt đầu từ{" "}
                    {difficultyLabel(suggestedRef.globalIndex, total)} —{" "}
                    {suggestedRef.unit.title}
                  </Text>
                </View>
                <Pressable
                  onPress={jumpToSuggestion}
                  accessibilityRole="button"
                  accessibilityLabel="Nhảy tới bài gợi ý theo cấp độ"
                  style={({ pressed }) => [styles.suggestButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.suggestButtonText} maxFontSizeMultiplier={1.2}>
                    Học từ đây
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {pack.sections.map((section, sectionIdx) => (
              <View
                key={section.id}
                onLayout={(e) => {
                  sectionYRef.current.set(section.id, e.nativeEvent.layout.y);
                }}
              >
                <View style={styles.sectionHeader}>
                  {sectionIdx > 0 ? <Text style={styles.gate}>🚪 · · · 🚪</Text> : null}
                  <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
                    🧭 {section.title}
                  </Text>
                </View>
                {section.units.map((unit) => {
                  const unitLessons = allLessons.filter((l) => l.unit.id === unit.id);
                  const color = unitColor.get(unit.id) ?? unitPalette[0];
                  return (
                    <LandCard
                      key={unit.id}
                      unit={unit}
                      land={landForUnit(unit)}
                      color={color}
                      lessons={unitLessons}
                      completedLessons={courseProgress.completedLessons}
                      currentIndex={currentIndex}
                      unlockedAll={unlockedAll}
                      totalLessons={total}
                      onLessonPress={(ref) => router.push(`/lesson/${ref.lesson.id}`)}
                      onLockedPress={showLockedHint}
                      onGuidebookPress={() => router.push(`/guidebook/${unit.id}`)}
                      onLayout={(y) => unitYRef.current.set(unit.id, y)}
                    />
                  );
                })}
              </View>
            ))}

            <Pressable
              onPress={() => router.push("/rewards")}
              accessibilityRole="button"
              accessibilityLabel="Xem phần thưởng của em"
              style={({ pressed }) => [styles.rewardsCard, pressed && { opacity: 0.86 }]}
            >
              <Text style={styles.rewardsEmoji}>🎁</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rewardsTitle} maxFontSizeMultiplier={1.3}>
                  Phần thưởng của em
                </Text>
                <Text style={styles.rewardsText} maxFontSizeMultiplier={1.3}>
                  Xem huy hiệu, rương kho báu và quà bí mật từ ba/mẹ đang chờ con khám phá.
                </Text>
              </View>
              <Text style={styles.rewardsArrow}>›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1 },
  goalBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  goalTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.amber },
  goalLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, minWidth: 88 },
  body: { padding: 16, paddingBottom: 60 },
  column: { width: "100%", maxWidth: 720, alignSelf: "center" },
  suggestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 10,
  },
  suggestEmoji: { fontSize: 30 },
  suggestTitle: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
  suggestText: { fontSize: 13, color: colors.textMuted },
  suggestButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestButtonText: { fontSize: 13, fontWeight: "800", color: colors.white },
  sectionHeader: { alignItems: "center", marginTop: 10, gap: 2 },
  gate: { fontSize: 13, color: colors.textMuted, letterSpacing: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  rewardsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 16,
  },
  rewardsEmoji: { fontSize: 34 },
  rewardsTitle: { fontSize: 17, fontWeight: "900", color: colors.neutral700 },
  rewardsText: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  rewardsArrow: { fontSize: 30, fontWeight: "800", color: colors.amber },
}));
