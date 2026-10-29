import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContinueButton } from "@/components/continue-button";
import { GardenDashboard, type KingdomRow } from "@/components/garden-dashboard";
import { MissionPanel } from "@/components/mission-panel";
import { ScreenBackground } from "@/components/screen-background";
import { WorldHeader } from "@/components/world-header";
import { WorldMap, type WorldMapCourseData, type WorldMapHandle } from "@/components/world-map";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  difficultyForIndex,
  difficultyLabel,
  getPack,
  tierForLearnerLevel,
  useCourseContent,
  type LessonRef,
} from "@/lib/content";
import { gardenCompanions, gardenLevelForXp, missionView, recentRewardHighlights, totalGardenXp, weeklyChallenge } from "@/lib/garden";
import { KINGDOMS, kingdomForCourse } from "@/lib/kingdoms";
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
import { REGION_LABELS, type ProvinceRegion } from "@/lib/provinces";
import { makeThemedStyles, radius } from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";
import { useAmbientMusic } from "@/lib/useAmbientMusic";

/** Thứ tự 3 khóa trên bản đồ biển — khớp thứ tự KINGDOMS (Anh → Nhật → Trung). */
const COURSE_IDS = KINGDOMS.map((k) => k.courseId);

/** 3 nút miền ở thanh trái: bay camera tới vùng của miền đó. */
const REGION_BUTTONS: { region: ProvinceRegion; label: string; emoji: string }[] = [
  { region: "bac", label: "Bắc", emoji: "⛰️" },
  { region: "trung", label: "Trung", emoji: "🌊" },
  { region: "nam", label: "Nam", emoji: "🌴" },
];

/**
 * Trang chủ Piglingo Kids — BẢN ĐỒ VIỆT NAM 34 TỈNH/THÀNH kiểu game map:
 * một bản đồ chung cho cả 3 ngôn ngữ (đổi ngôn ngữ chỉ đổi bài học trong
 * tỉnh, bản đồ không đổi), kéo để di chuyển, chụm 2 ngón hoặc bấm +/− để
 * phóng to/thu nhỏ, chạm tỉnh để xem thông tin tỉnh + bài học đặt tại đó.
 * Trang KHÔNG cuộn dọc: header ở trên, bản đồ chiếm phần còn lại, các
 * tùy chọn nằm ở 2 THANH NÚT HAI BÊN kiểu game (trái: ngôn ngữ + miền;
 * phải: zoom, về tỉnh đang học, Nhiệm vụ, Thành tích, Phần thưởng,
 * Cuộc thi). Toàn bộ GardenDashboard nằm trong panel "Nhiệm vụ & thành
 * tích" trượt lên. Công thức khóa bài và MissionPanel giữ nguyên 100%.
 */
export default function LearnScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const {
    activeCourseId,
    dailyGoal,
    learnerLevel,
    musicOn,
    setMusicOn,
    setActiveCourse,
  } = progress;
  const courseProgress = progress.course();
  const { pack, allLessons } = useCourseContent(activeCourseId);
  const enContent = useCourseContent("en-vi");
  const jaContent = useCourseContent("ja-vi");
  const zhContent = useCourseContent("zh-vi");
  const { user } = useAuth();
  const unlockedAll = isAllUnlocked(progress, user?.email);
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

  // Dữ kiện vườn/dashboard suy từ tiến độ thật (không lưu thêm trạng thái nào).
  const totalXp = totalGardenXp(progress);
  const levelState = gardenLevelForXp(totalXp);
  const courseProgressList = useMemo(
    () => allCourseRewardProgress(progress),
    [progress]
  );
  const companions = useMemo(() => gardenCompanions(progress), [progress]);
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

  /* ----- Dữ liệu bản đồ cho cả 3 khóa ----- */
  const contentByCourse = useMemo(
    () => ({ "en-vi": enContent, "ja-vi": jaContent, "zh-vi": zhContent }),
    [enContent, jaContent, zhContent]
  );
  const coursesData = useMemo<WorldMapCourseData[]>(
    () =>
      COURSE_IDS.map((courseId) => {
        const content = contentByCourse[courseId];
        const completedLessons =
          progress.courses?.[courseId]?.completedLessons ?? {};
        const lessonsByUnit = new Map<string, LessonRef[]>();
        for (const r of content.allLessons) {
          const list = lessonsByUnit.get(r.unit.id) ?? [];
          list.push(r);
          lessonsByUnit.set(r.unit.id, list);
        }
        return {
          courseId,
          targetLanguage: content.pack.targetLanguage,
          units: content.pack.sections.flatMap((s) => s.units),
          lessonsByUnit,
          completedLessons,
          currentIndex: currentLessonIndex(
            completedLessons,
            content.allLessons.map((l) => l.lesson.id)
          ),
          totalLessons: content.allLessons.length,
        };
      }),
    [contentByCourse, progress.courses]
  );
  const coursesDataById = useMemo(
    () => new Map(coursesData.map((c) => [c.courseId, c])),
    [coursesData]
  );

  /** Chỉ số unit (theo thứ tự pack) chứa bài hiện tại của một khóa. */
  const currentUnitIndexOf = (courseId: string): number => {
    const data = coursesDataById.get(courseId);
    const content = contentByCourse[courseId as keyof typeof contentByCourse];
    if (!data || !content) return 0;
    const target =
      content.allLessons[Math.min(data.currentIndex, content.allLessons.length - 1)];
    if (!target) return 0;
    const idx = data.units.findIndex((u) => u.id === target.unit.id);
    return idx >= 0 ? idx : 0;
  };

  /* ----- Điều khiển bản đồ ----- */
  const mapRef = useRef<WorldMapHandle>(null);
  const pendingFlyCourseRef = useRef<string | null>(null);

  const flyToCurrentIsland = (courseId: string) => {
    mapRef.current?.centerOnUnit(courseId, currentUnitIndexOf(courseId));
  };

  // Sau khi đổi khóa (qua thanh ngôn ngữ bên trái hoặc chip gợi ý trong
  // bảng tỉnh), đợi render xong rồi bay camera tới tỉnh đang học của khóa mới.
  useEffect(() => {
    const pending = pendingFlyCourseRef.current;
    if (!pending || pending !== activeCourseId) return;
    pendingFlyCourseRef.current = null;
    const frame = requestAnimationFrame(() => flyToCurrentIsland(activeCourseId));
    return () => cancelAnimationFrame(frame);
    // Chỉ chạy khi khóa active thay đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId]);

  const handleKingdomPress = (courseId: string) => {
    setDashboardOpen(false);
    if (courseId === activeCourseId) {
      flyToCurrentIsland(courseId);
      return;
    }
    pendingFlyCourseRef.current = courseId;
    setActiveCourse(courseId);
  };

  const handleSelectCourseFromMap = (courseId: string) => {
    if (courseId !== activeCourseId) setActiveCourse(courseId);
  };

  /* ----- Mission panel (giữ nguyên công thức khóa cũ) ----- */
  const [missionSel, setMissionSel] = useState<{ ref: LessonRef; courseId: string } | null>(
    null
  );
  const missionData = missionSel ? coursesDataById.get(missionSel.courseId) : undefined;
  const missionModel = useMemo(
    () =>
      missionSel && missionData
        ? missionView(missionSel.ref, {
            completedLessons: missionData.completedLessons,
            currentIndex: missionData.currentIndex,
            unlockedAll,
            totalLessons: missionData.totalLessons,
          })
        : null,
    [missionSel, missionData, unlockedAll]
  );
  const missionCourseId = missionSel?.courseId ?? activeCourseId;

  /* ----- Panel "Nhiệm vụ & thành tích" chứa GardenDashboard ----- */
  const [dashboardOpen, setDashboardOpen] = useState(false);

  // Gợi ý theo cấp độ: bài đầu tiên của tầng độ khó tương ứng cấp độ đã chọn.
  const targetTier = tierForLearnerLevel(learnerLevel);
  const suggestedRef = useMemo(
    () => allLessons.find((l) => difficultyForIndex(l.globalIndex, total) === targetTier),
    [allLessons, targetTier, total]
  );

  const jumpToSuggestion = () => {
    if (!suggestedRef) return;
    setDashboardOpen(false);
    const idx = coursesDataById
      .get(activeCourseId)
      ?.units.findIndex((u) => u.id === suggestedRef.unit.id);
    mapRef.current?.centerOnUnit(activeCourseId, idx !== undefined && idx >= 0 ? idx : 0);
  };

  const handleContinue = () => {
    if (!continueTarget) return;
    const idx = coursesDataById
      .get(activeCourseId)
      ?.units.findIndex((u) => u.id === continueTarget.unit.id);
    mapRef.current?.centerOnUnit(activeCourseId, idx !== undefined && idx >= 0 ? idx : 0);
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

        {continueTarget ? (
          <View style={styles.continueWrap}>
            <ContinueButton
              target={continueTarget}
              allDone={allDone}
              onPress={handleContinue}
            />
          </View>
        ) : null}

        {/* Bản đồ Việt Nam + 2 thanh nút hai bên kiểu game */}
        <View style={styles.mapWrap}>
          <WorldMap
            ref={mapRef}
            courses={coursesData}
            activeCourseId={activeCourseId}
            unlockedAll={unlockedAll}
            onSelectCourse={handleSelectCourseFromMap}
            onMissionPress={(ref, courseId) => setMissionSel({ ref, courseId })}
            onGuidebookPress={(unit) => router.push(`/guidebook/${unit.id}`)}
          />

          {/* THANH TRÁI: chọn ngôn ngữ (bản đồ dùng chung, chỉ đổi bài học)
              + bay tới 3 miền Bắc / Trung / Nam */}
          <View style={styles.railLeft} pointerEvents="box-none">
            {KINGDOMS.map((item) => {
              const active = item.courseId === activeCourseId;
              return (
                <Pressable
                  key={item.courseId}
                  onPress={() => handleKingdomPress(item.courseId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Học ${item.targetLanguage} — ${item.kingdomName}`}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.railButton,
                    { borderColor: item.palette.primary },
                    active && { backgroundColor: item.palette.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.railIcon}>{item.motif[0]}</Text>
                  <Text
                    style={[
                      styles.railLabel,
                      { color: active ? item.palette.onPrimary : item.palette.deep },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.1}
                  >
                    {item.targetLanguage}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.railDivider} />
            {REGION_BUTTONS.map((b) => (
              <Pressable
                key={b.region}
                onPress={() => mapRef.current?.centerOnRegion(b.region)}
                accessibilityRole="button"
                accessibilityLabel={`Bay tới ${REGION_LABELS[b.region]}`}
                style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.railIcon}>{b.emoji}</Text>
                <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* THANH PHẢI: zoom, về tỉnh đang học và các mục chính */}
          <View style={styles.railRight} pointerEvents="box-none">
            <Pressable
              onPress={() => mapRef.current?.zoomIn()}
              accessibilityRole="button"
              accessibilityLabel="Phóng to bản đồ"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railZoomIcon}>+</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                To
              </Text>
            </Pressable>
            <Pressable
              onPress={() => mapRef.current?.zoomOut()}
              accessibilityRole="button"
              accessibilityLabel="Thu nhỏ bản đồ"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railZoomIcon}>−</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Nhỏ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => mapRef.current?.centerOnCurrent()}
              accessibilityRole="button"
              accessibilityLabel="Về tỉnh đang học"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railIcon}>🎯</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Đang học
              </Text>
            </Pressable>
            <View style={styles.railDivider} />
            <Pressable
              onPress={() => setDashboardOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Mở nhiệm vụ và thành tích"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railIcon}>📋</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Nhiệm vụ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/achievements")}
              accessibilityRole="button"
              accessibilityLabel="Mở thành tích và xếp hạng"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railIcon}>⭐</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Thành tích
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/rewards")}
              accessibilityRole="button"
              accessibilityLabel="Mở phần thưởng của em"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railIcon}>🎁</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Phần thưởng
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/competitions")}
              accessibilityRole="button"
              accessibilityLabel="Mở cuộc thi và chứng chỉ tiếng Anh"
              style={({ pressed }) => [styles.railButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.railIcon}>🏅</Text>
              <Text style={styles.railLabel} maxFontSizeMultiplier={1.1}>
                Cuộc thi
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Panel trượt lên chứa toàn bộ GardenDashboard như cũ */}
        {dashboardOpen ? (
          <View style={styles.overlay}>
            <Pressable
              style={styles.backdrop}
              onPress={() => setDashboardOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Đóng nhiệm vụ và thành tích"
            />
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle} maxFontSizeMultiplier={1.3}>
                  🎯 Nhiệm vụ & thành tích
                </Text>
                <Pressable
                  onPress={() => setDashboardOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng panel nhiệm vụ và thành tích"
                  style={({ pressed }) => [styles.panelClose, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.panelCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.panelBody}>
                <View style={styles.column}>
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
                    onOpenCompetitions={() => router.push("/competitions")}
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
                        style={({ pressed }) => [
                          styles.suggestButton,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.suggestButtonText} maxFontSizeMultiplier={1.2}>
                          Học từ đây
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => {
                      setDashboardOpen(false);
                      router.push("/rewards");
                    }}
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
                        Xem huy hiệu, rương kho báu và quà bí mật từ ba/mẹ đang chờ con
                        khám phá.
                      </Text>
                    </View>
                    <Text style={styles.rewardsArrow}>›</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}

        <MissionPanel
          view={missionModel}
          unit={missionSel?.ref.unit ?? null}
          kingdom={kingdomForCourse(missionCourseId)}
          courseId={missionCourseId}
          targetLanguage={getPack(missionCourseId).targetLanguage}
          onClose={() => setMissionSel(null)}
          onStart={(lessonId) => {
            setMissionSel(null);
            router.push(`/lesson/${lessonId}`);
          }}
          onGuidebook={(unitId) => {
            setMissionSel(null);
            router.push(`/guidebook/${unitId}`);
          }}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
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
    continueWrap: { paddingHorizontal: 16, paddingBottom: 6 },
    mapWrap: { flex: 1, position: "relative" },
    railLeft: {
      position: "absolute",
      left: 6,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      gap: 7,
    },
    railRight: {
      position: "absolute",
      right: 6,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      gap: 7,
    },
    railButton: {
      width: 60,
      borderWidth: 2,
      borderBottomWidth: 3,
      borderColor: colors.neutral200,
      borderRadius: radius.lg,
      backgroundColor: "rgba(255,255,255,0.88)",
      paddingVertical: 6,
      paddingHorizontal: 2,
      alignItems: "center",
      justifyContent: "center",
      ...shadowStyle,
    },
    railIcon: { fontSize: 17, lineHeight: 21 },
    railZoomIcon: {
      fontSize: 21,
      lineHeight: 23,
      fontWeight: "900",
      color: colors.neutral700,
    },
    railLabel: {
      fontSize: 10,
      fontWeight: "800",
      textAlign: "center",
      color: colors.neutral700,
    },
    railDivider: {
      width: 34,
      height: 2,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.75)",
      marginVertical: 2,
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "flex-end",
      zIndex: 40,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(10, 30, 40, 0.38)",
    },
    panel: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      maxHeight: "88%",
      paddingTop: 10,
      ...shadowStyle,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingBottom: 6,
    },
    panelTitle: { flex: 1, fontSize: 18, fontWeight: "900", color: colors.neutral700 },
    panelClose: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    panelCloseText: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    panelBody: { padding: 16, paddingBottom: 48 },
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
      marginTop: 12,
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
    rewardsCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 14,
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
  })
);

const shadowStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 4,
} as const;
