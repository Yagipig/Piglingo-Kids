import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useMemo, useRef } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Flag } from "@/components/flag";
import { ScreenBackground } from "@/components/screen-background";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  difficultyForIndex,
  difficultyLabel,
  tierForLearnerLevel,
  useCourseContent,
  type LessonRef,
} from "@/lib/content";
import {
  activeToday,
  currentLessonIndex,
  currentStreak,
  dailyXpToday,
  learnerLevelLabel,
  useProgress,
} from "@/lib/store";
import { makeThemedStyles, radius, unitPalette, useThemeColors } from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";
import { useAmbientMusic } from "@/lib/useAmbientMusic";

const FLOWERS = ["🌸", "🌼", "🌺", "🌻", "🌷"];

/**
 * Màn hình học "Khu vườn của bé": mỗi chủ đề là một luống hoa. Học xong
 * bài nào, luống có thêm một bông hoa nở; chủ đề hoàn thành thì hoa nở
 * rộ cả luống. Không dùng lối mòn đường đi uốn lượn.
 */
export default function LearnScreen() {
  const colors = useThemeColors();
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
  const bloomed = allLessons.filter(
    (l) => courseProgress.completedLessons[l.lesson.id]
  ).length;
  const gardenPct = total > 0 ? Math.round((bloomed / total) * 100) : 0;

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
      "Hạt giống đang ngủ 🔒",
      "Hoàn thành các bài trước để hạt nảy mầm nhé. Hoặc nhờ ba/mẹ nhập mã mở khóa ở tab Hồ sơ để mở toàn bộ bài học."
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.skyBand}>
        <View style={styles.headerRow}>
          <Text style={styles.sun}>☀️</Text>
          <Image
            source={require("@/assets/images/mascot.svg")}
            style={styles.mascot}
            contentFit="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.3}>
              Khu vườn của bé 🌷
            </Text>
            <Text style={styles.greetingSub} maxFontSizeMultiplier={1.3}>
              Học bài nào, hoa nở bài đó!
            </Text>
          </View>
          <Pressable
            onPress={() => setMusicOn(!musicOn)}
            accessibilityRole="button"
            accessibilityLabel={musicOn ? "Tắt nhạc nền" : "Bật nhạc nền"}
            accessibilityState={{ selected: musicOn }}
            style={({ pressed }) => [styles.musicButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.musicIcon}>{musicOn ? "🔊" : "🔇"}</Text>
          </Pressable>
          <Pressable
            style={styles.coursePicker}
            onPress={() => router.push("/courses")}
            accessibilityRole="button"
            accessibilityLabel={`Khóa học: ${pack.targetLanguage}. Đổi khóa học`}
          >
            <Flag courseId={activeCourseId} size={30} />
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
            value={courseProgress.xp}
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

        <View style={styles.gardenProgress}>
          <Text style={styles.gardenProgressText} maxFontSizeMultiplier={1.3}>
            🌸 Khu vườn đã nở {bloomed}/{total} hoa
          </Text>
          <View style={styles.gardenTrack}>
            <View style={[styles.gardenFill, { width: `${gardenPct}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.goalBar}>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
        </View>
        <Text style={styles.goalLabel} maxFontSizeMultiplier={1.3}>
          {todayXp}/{dailyGoal} XP hôm nay
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        {suggestedRef ? (
          <View style={styles.suggestCard}>
            <Text style={styles.suggestEmoji}>🎯</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.suggestTitle} maxFontSizeMultiplier={1.3}>
                Gợi ý theo cấp độ của bé
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

        {pack.sections.map((section) => (
          <View
            key={section.id}
            onLayout={(e) => {
              sectionYRef.current.set(section.id, e.nativeEvent.layout.y);
            }}
          >
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              {section.title}
            </Text>
            {section.units.map((unit) => {
              const unitLessons = allLessons.filter((l) => l.unit.id === unit.id);
              const color = unitColor.get(unit.id) ?? unitPalette[0];
              const doneCount = unitLessons.filter(
                (l) => courseProgress.completedLessons[l.lesson.id]
              ).length;
              const unitDone = doneCount === unitLessons.length && unitLessons.length > 0;
              const unitStarted = doneCount > 0;
              const unitEmoji = unit.words[0]?.emoji ?? "🌱";
              const firstRef = unitLessons[0];
              return (
                <View
                  key={unit.id}
                  style={[styles.bed, { borderColor: color.main }]}
                  onLayout={(e) => {
                    unitYRef.current.set(unit.id, e.nativeEvent.layout.y);
                  }}
                >
                  <View style={styles.bedHeader}>
                    <View style={[styles.bedEmojiCircle, { backgroundColor: color.main }]}>
                      <Text style={styles.bedEmoji}>{unitEmoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.bedTitle} maxFontSizeMultiplier={1.3}>
                        {unit.title}{" "}
                        {unitDone ? "🌸" : unitStarted ? "🌿" : "🌱"}
                      </Text>
                      <Text style={styles.bedDesc} maxFontSizeMultiplier={1.3}>
                        {unit.description}
                      </Text>
                      <Text style={styles.bedProgress} maxFontSizeMultiplier={1.2}>
                        {unitDone
                          ? `Hoa nở rộ! Đã xong ${doneCount}/${unitLessons.length} bài 🎉`
                          : `Đã nở ${doneCount}/${unitLessons.length} hoa`}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.guidebookButton,
                        { backgroundColor: color.main },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => router.push(`/guidebook/${unit.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Sổ tay ${unit.title}`}
                    >
                      <Ionicons name="book" size={20} color={colors.white} />
                    </Pressable>
                  </View>

                  {firstRef ? (
                    <Text style={styles.difficultyChip} maxFontSizeMultiplier={1.2}>
                      Độ khó: {difficultyLabel(firstRef.globalIndex, total)}
                    </Text>
                  ) : null}

                  <View style={styles.soil}>
                    {unitLessons.map((ref, i) => (
                      <Seedling
                        key={ref.lesson.id}
                        ref_={ref}
                        indexInUnit={i}
                        completed={!!courseProgress.completedLessons[ref.lesson.id]}
                        current={ref.globalIndex === currentIndex}
                        locked={!unlockedAll && ref.globalIndex > currentIndex}
                        color={color}
                        totalLessons={total}
                        onLockedPress={showLockedHint}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
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

function Seedling({
  ref_,
  indexInUnit,
  completed,
  current,
  locked,
  color,
  totalLessons,
  onLockedPress,
}: {
  ref_: LessonRef;
  indexInUnit: number;
  completed: boolean;
  current: boolean;
  locked: boolean;
  color: { main: string; dark: string };
  totalLessons: number;
  onLockedPress: () => void;
}) {
  const styles = useStyles();
  const face = completed
    ? FLOWERS[ref_.globalIndex % FLOWERS.length]
    : locked
      ? "🔒"
      : current
        ? "🌿"
        : "🌱";
  return (
    <View style={styles.seedWrap}>
      <Pressable
        onPress={() =>
          locked ? onLockedPress() : router.push(`/lesson/${ref_.lesson.id}`)
        }
        accessibilityRole="button"
        accessibilityLabel={`${ref_.unit.title}, bài ${indexInUnit + 1}, độ khó ${difficultyLabel(ref_.globalIndex, totalLessons)}`}
        accessibilityState={{ disabled: locked, selected: current }}
        accessibilityHint={
          locked
            ? "Đang khóa. Hãy hoàn thành các bài trước, hoặc nhập mã mở khóa ở tab Hồ sơ để mở toàn bộ bài học."
            : completed
              ? "Đã hoàn thành, hoa đã nở. Luyện lại."
              : "Bắt đầu bài này."
        }
        style={({ pressed }) => [
          styles.seed,
          completed
            ? styles.seedDone
            : locked
              ? styles.seedLocked
              : {
                  backgroundColor: color.main + "2E",
                  borderColor: color.main,
                },
          current && !locked && { borderColor: color.dark, borderWidth: 3.5 },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.seedFace}>{face}</Text>
      </Pressable>
      <Text
        style={[styles.seedLabel, current && !locked && styles.seedLabelCurrent]}
        maxFontSizeMultiplier={1.2}
      >
        {current && !locked ? "Bắt đầu" : `Bài ${indexInUnit + 1}`}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1 },
  skyBand: {
    backgroundColor: colors.selectedBg,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sun: { fontSize: 30 },
  mascot: { width: 52, height: 52 },
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
  gardenProgress: { gap: 5 },
  gardenProgressText: { fontSize: 14, fontWeight: "800", color: colors.correctText },
  gardenTrack: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  gardenFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.green },
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
  body: { padding: 16, paddingBottom: 60, gap: 4 },
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  bed: {
    borderWidth: 2,
    borderRadius: radius.xl,
    marginTop: 14,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  bedHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  bedEmojiCircle: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bedEmoji: { fontSize: 30 },
  bedTitle: { fontSize: 19, fontWeight: "800", color: colors.neutral700 },
  bedDesc: { fontSize: 13, color: colors.textMuted },
  bedProgress: { fontSize: 12, fontWeight: "800", color: colors.correctText },
  guidebookButton: { borderRadius: radius.md, padding: 9 },
  difficultyChip: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  soil: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: colors.amber + "14",
    borderRadius: radius.lg,
    padding: 12,
  },
  seedWrap: { alignItems: "center", gap: 4, width: 62 },
  seed: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.neutral300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  seedDone: { backgroundColor: colors.correctBg, borderColor: colors.correctText },
  seedLocked: { backgroundColor: colors.neutral200, borderColor: colors.neutral300, opacity: 0.65 },
  seedFace: { fontSize: 27 },
  seedLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  seedLabelCurrent: { color: colors.neutral700, fontWeight: "800" },
}));
