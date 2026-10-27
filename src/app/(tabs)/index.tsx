import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContinueButton } from "@/components/continue-button";
import { GardenDashboard, type KingdomRow } from "@/components/garden-dashboard";
import { LandCard } from "@/components/land-card";
import { MagicalGardenScene } from "@/components/magical-garden-scene";
import { MissionPanel } from "@/components/mission-panel";
import { ScreenBackground } from "@/components/screen-background";
import { WorldHeader } from "@/components/world-header";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  difficultyForIndex,
  difficultyLabel,
  tierForLearnerLevel,
  useCourseContent,
  type LessonRef,
} from "@/lib/content";
import {
  butterfliesReleased,
  gardenBadgeDecor,
  gardenCompanions,
  gardenFlowers,
  gardenLevelForXp,
  missionView,
  recentRewardHighlights,
  totalGardenXp,
  treeStageForXp,
  weeklyChallenge,
} from "@/lib/garden";
import { KINGDOMS, kingdomForCourse } from "@/lib/kingdoms";
import { landForUnit } from "@/lib/lands";
import { allCourseRewardProgress } from "@/lib/rewards";
import { effectiveGlobalRewards, useRewardsStore } from "@/lib/rewardsStore";
import {
  activeToday,
  currentLessonIndex,
  currentStreak,
  dailyQuests,
  dailyXpToday,
  learnerLevelLabel,
  useProgress,
} from "@/lib/store";
import { makeThemedStyles, radius, unitPalette } from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";
import { useAmbientMusic } from "@/lib/useAmbientMusic";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Trang chủ "Magical Multilingual Learning Garden": cảnh vườn thần tiên
 * với ba cổng vương quốc (Storybook/Sakura/Lantern ↔ Anh/Nhật/Trung),
 * cây thần và hoa lớn theo tiến độ thật, bảng nhiệm vụ hôm nay, và bên
 * dưới vẫn là bản đồ vùng đất của khóa đang học. Thứ tự vùng/bài và
 * công thức khóa giữ nguyên 100%: bài khóa khi chưa mở hết và
 * globalIndex > currentIndex (currentLessonIndex từ store).
 */
export default function LearnScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const { activeCourseId, dailyGoal, learnerLevel, musicOn, setMusicOn, setActiveCourse } =
    progress;
  const courseProgress = progress.course();
  const { pack, allLessons, getWord } = useCourseContent(activeCourseId);
  const { user } = useAuth();
  const unlockedAll = isAllUnlocked(progress, user?.email);
  const reducedMotion = useReducedMotion();
  useAmbientMusic();

  const familyRewards = useRewardsStore((state) => state.familyRewards);
  const globalConfigCache = useRewardsStore((state) => state.globalConfigCache);
  const globalRewards = useMemo(
    () => effectiveGlobalRewards({ globalConfigCache }),
    [globalConfigCache]
  );

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
  const allDone = total > 0 && currentIndex >= total;
  const continueTarget = allLessons[Math.min(currentIndex, total - 1)];

  // Dữ kiện vườn suy từ tiến độ thật (không lưu thêm trạng thái nào).
  const kingdom = kingdomForCourse(activeCourseId);
  const totalXp = totalGardenXp(progress);
  const levelState = gardenLevelForXp(totalXp);
  const treeStage = treeStageForXp(totalXp);
  const courseProgressList = useMemo(
    () => allCourseRewardProgress(progress),
    [progress]
  );
  const flowers = useMemo(() => gardenFlowers(progress), [progress]);
  const companions = useMemo(() => gardenCompanions(progress), [progress]);
  const badges = useMemo(
    () => gardenBadgeDecor(globalRewards, progress),
    [globalRewards, progress]
  );
  const highlights = useMemo(
    () =>
      recentRewardHighlights(globalRewards, progress, familyRewards, user?.id ?? null),
    [globalRewards, progress, familyRewards, user?.id]
  );
  const weekly = useMemo(() => weeklyChallenge(progress), [progress]);
  const quests = useMemo(() => dailyQuests(progress), [progress]);
  const kingdomRows: KingdomRow[] = KINGDOMS.map((item) => {
    const row = courseProgressList.find((c) => c.courseId === item.courseId);
    return {
      kingdom: item,
      completed: row?.completed ?? 0,
      total: row?.total ?? 0,
      percent: row?.percent ?? 0,
      active: item.courseId === activeCourseId,
    };
  });
  const greeting =
    progress.onboardingDone || explored > 0
      ? "Chào mừng trở lại, nhà thám hiểm nhí!"
      : "Chào nhà thám hiểm nhí!";

  const scrollRef = useRef<ScrollView>(null);
  const unitYRef = useRef(new Map<string, number>());
  const sectionYRef = useRef(new Map<string, number>());
  const mapYRef = useRef(0);
  const pendingMapScrollRef = useRef(false);

  const scrollToMapTop = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, mapYRef.current - 8),
      animated: !reducedMotion,
    });
  };

  // Sau khi đổi khóa qua cổng vương quốc, đợi bản đồ mới render rồi cuộn tới.
  useEffect(() => {
    if (!pendingMapScrollRef.current) return;
    pendingMapScrollRef.current = false;
    const frame = requestAnimationFrame(() => scrollToMapTop());
    return () => cancelAnimationFrame(frame);
    // Chỉ chạy khi khóa active thay đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId]);

  const handleKingdomPress = (courseId: string) => {
    if (courseId === activeCourseId) {
      scrollToMapTop();
      return;
    }
    pendingMapScrollRef.current = true;
    setActiveCourse(courseId);
  };

  // Mission panel khi chạm một điểm bài học trên bản đồ.
  const [mission, setMission] = useState<LessonRef | null>(null);
  const missionModel = useMemo(
    () =>
      mission
        ? missionView(mission, {
            completedLessons: courseProgress.completedLessons,
            currentIndex,
            unlockedAll,
            totalLessons: total,
          })
        : null,
    [mission, courseProgress.completedLessons, currentIndex, unlockedAll, total]
  );

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
          greeting={greeting}
          streak={streak}
          streakLit={streakLit}
          totalXp={totalXp}
          gardenLevel={levelState.current.level}
          unlockedAll={unlockedAll}
          musicOn={musicOn}
          onToggleMusic={() => setMusicOn(!musicOn)}
          onOpenCourses={() => router.push("/courses")}
          onOpenProfile={() => router.push("/profile")}
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
            <MagicalGardenScene
              activeCourseId={activeCourseId}
              courseProgressList={courseProgressList}
              treeStage={treeStage}
              flowers={flowers}
              badges={badges}
              companions={companions}
              butterflies={butterfliesReleased(progress)}
              getWord={getWord}
              onKingdomPress={handleKingdomPress}
              onBadgesPress={() => router.push("/rewards")}
            />

            {continueTarget ? (
              <ContinueButton
                target={continueTarget}
                allDone={allDone}
                onPress={() => router.push(`/lesson/${continueTarget.lesson.id}`)}
              />
            ) : null}

            <GardenDashboard
              quests={quests}
              kingdomRows={kingdomRows}
              weekly={weekly}
              totalXp={totalXp}
              levelState={levelState}
              highlights={highlights}
              companions={companions}
              onKingdomPress={handleKingdomPress}
              onOpenRewards={() => router.push("/rewards")}
            />

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

            <View
              onLayout={(e) => {
                mapYRef.current = e.nativeEvent.layout.y;
              }}
            >
              {kingdom ? (
                <View style={styles.mapTitleWrap}>
                  <View
                    style={[styles.mapTitleBar, { backgroundColor: kingdom.palette.primary }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapTitle} maxFontSizeMultiplier={1.3}>
                      🗺️ Bản đồ {kingdom.kingdomName}
                    </Text>
                    <Text style={styles.mapSub} maxFontSizeMultiplier={1.3}>
                      {pack.targetLanguage} · Đã khám phá {explored}/{total} điểm đến ·
                      Chạm vào một điểm để xem nhiệm vụ
                    </Text>
                  </View>
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
                        accent={kingdom?.palette ?? null}
                        lessons={unitLessons}
                        completedLessons={courseProgress.completedLessons}
                        currentIndex={currentIndex}
                        unlockedAll={unlockedAll}
                        totalLessons={total}
                        onLessonPress={(ref) => router.push(`/lesson/${ref.lesson.id}`)}
                        onLockedPress={showLockedHint}
                        onMissionPress={(ref) => setMission(ref)}
                        onGuidebookPress={() => router.push(`/guidebook/${unit.id}`)}
                        onLayout={(y) => unitYRef.current.set(unit.id, y)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

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

        <MissionPanel
          view={missionModel}
          unit={mission?.unit ?? null}
          kingdom={kingdom}
          courseId={activeCourseId}
          targetLanguage={pack.targetLanguage}
          onClose={() => setMission(null)}
          onStart={(lessonId) => {
            setMission(null);
            router.push(`/lesson/${lessonId}`);
          }}
          onGuidebook={(unitId) => {
            setMission(null);
            router.push(`/guidebook/${unitId}`);
          }}
        />
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
  mapTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  mapTitleBar: { width: 6, alignSelf: "stretch", borderRadius: radius.full },
  mapTitle: { fontSize: 18, fontWeight: "900", color: colors.neutral700 },
  mapSub: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
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
