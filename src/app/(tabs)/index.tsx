import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContinueButton } from "@/components/continue-button";
import { ScreenBackground } from "@/components/screen-background";
import { Card, ProgressBar, StatChip } from "@/components/ui";
import {
  effectiveFrontierIndex,
  useCourseContent,
} from "@/lib/content";
import { totalGardenXp } from "@/lib/garden";
import { KINGDOMS, kingdomForCourse, type Kingdom } from "@/lib/kingdoms";
import { accessoryById } from "@/lib/pets";
import { rankForXp } from "@/lib/ranks";
import { allCourseRewardProgress } from "@/lib/rewards";
import {
  activeToday,
  currentStreak,
  dailyQuests,
  useProgress,
} from "@/lib/store";
import {
  kingdomColorTokens,
  layout,
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  typography,
} from "@/lib/theme";
import { useAmbientMusic } from "@/lib/useAmbientMusic";

const MASCOT = require("@/assets/images/mascot-avatar.png");

const QUEST_EMOJI: Record<string, string> = {
  xp: "⭐",
  lessons: "📚",
  perfect: "💎",
};

/**
 * Trang chủ Piglingo Kids — HOME DASHBOARD kiểu game (Phase 3
 * redesign): thẻ chào với heo mascot + cấp bậc nhà thám hiểm, hàng chỉ
 * số (tổng XP / chuỗi ngày / bậc), thẻ Tiếp tục học trỏ đúng BÀI Ở
 * BIÊN HIỆU LỰC (tiến độ thật + sàn cấp độ Hướng 1, hiện số bài toàn
 * cục), thẻ Nhiệm vụ hôm nay, 3 thẻ vương quốc (XP RIÊNG từng khóa +
 * tiến độ bài) mở BẢN ĐỒ ĐƯỜNG ĐI của khóa đó, và lối tắt Cuộc thi /
 * Phần thưởng / Thành tích. Bản đồ tỉnh KHÔNG còn render ở trang chủ
 * (dữ liệu tỉnh vẫn giữ trong repo; bản đồ học chính nay là bản đồ
 * đường đi theo vương quốc ở route /map/[courseId]).
 */
export default function LearnScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const {
    activeCourseId,
    learnerLevel,
    musicOn,
    setMusicOn,
    setActiveCourse,
  } = progress;
  const courseProgress = progress.course();
  const { pack, allLessons } = useCourseContent(activeCourseId);
  /** Ảnh cá nhân của bé đặt ở tab Hồ sơ (chưa đặt thì không hiện gì thêm). */
  const avatarImage = progress.avatarImage ?? null;
  useAmbientMusic();

  const totalXp = totalGardenXp(progress);
  const rank = rankForXp(totalXp);
  const streak = currentStreak(progress);
  const streakLit = activeToday(progress);
  const quests = useMemo(() => dailyQuests(progress), [progress]);
  const courseRows = useMemo(() => allCourseRewardProgress(progress), [progress]);

  const lessonIds = allLessons.map((l) => l.lesson.id);
  // Biên hiệu lực: tiến độ thật + sàn cấp độ (Hướng 1) — cùng helper
  // Phase 2 mà bản đồ đường đi và màn bài học đang dùng.
  const frontierIndex = effectiveFrontierIndex(
    courseProgress.completedLessons,
    lessonIds,
    learnerLevel
  );
  const total = allLessons.length;
  const allDone = total > 0 && frontierIndex >= total;
  const continueTarget = allLessons[Math.min(frontierIndex, Math.max(0, total - 1))];
  const activeKingdom = kingdomForCourse(activeCourseId);
  const activeTokens = kingdomColorTokens(activeCourseId);

  const greeting =
    progress.onboardingDone || totalXp > 0
      ? "Chào mừng trở lại, nhà thám hiểm nhí!"
      : "Chào nhà thám hiểm nhí!";

  const handleContinue = () => {
    if (!continueTarget) return;
    // Học xong hết → ôn lại từ bài đầu; còn lại vào thẳng bài ở biên.
    const target = allDone ? allLessons[0] : continueTarget;
    if (target) router.push(`/lesson/${target.lesson.id}`);
  };

  const openMap = (courseId: string) => {
    if (courseId !== activeCourseId) setActiveCourse(courseId);
    router.push(`/map/${courseId}`);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            {/* Thẻ chào: mascot + cấp bậc */}
            <Card accentColor={activeTokens?.primary} style={styles.heroCard}>
              <Image
                source={MASCOT}
                style={styles.heroMascot}
                contentFit="contain"
                accessibilityLabel="Heo Piglingo"
              />
              {avatarImage ? (
                <Image
                  source={{ uri: avatarImage }}
                  style={styles.heroAvatar}
                  contentFit="cover"
                  accessibilityLabel="Ảnh của bé"
                />
              ) : null}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.heroGreeting} maxFontSizeMultiplier={1.25}>
                  {greeting}
                </Text>
                <Text style={styles.heroRank} maxFontSizeMultiplier={1.25}>
                  {rank.emoji} {rank.title}
                </Text>
                <Text style={styles.heroRankSub} maxFontSizeMultiplier={1.25}>
                  {rank.isMax
                    ? "Em đã ở bậc cao nhất — Vua Biển Cả!"
                    : `Còn ${rank.xpToNext} XP nữa là lên ${rank.nextEmoji} ${rank.nextTitle}`}
                </Text>
                {!rank.isMax ? (
                  <ProgressBar
                    value={rank.progress01}
                    color={activeTokens?.primary}
                    height={9}
                    style={{ marginTop: 4 }}
                    accessibilityLabel={`Tiến độ lên bậc tiếp theo: ${Math.round(rank.progress01 * 100)}%`}
                  />
                ) : null}
              </View>
              <Pressable
                onPress={() => setMusicOn(!musicOn)}
                accessibilityRole="button"
                accessibilityLabel={musicOn ? "Tắt nhạc nền" : "Bật nhạc nền"}
                style={({ pressed }) => [
                  styles.musicButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.musicIcon}>{musicOn ? "🔊" : "🔇"}</Text>
              </Pressable>
            </Card>

            {/* Hàng chỉ số */}
            <View style={styles.chipRow}>
              <StatChip
                emoji="⭐"
                value={String(totalXp)}
                label="Tổng XP"
                style={{ flex: 1 }}
              />
              <StatChip
                emoji={streakLit ? "🔥" : "🌙"}
                value={String(streak)}
                label="Ngày liên tiếp"
                style={{ flex: 1 }}
              />
              <StatChip
                emoji={rank.emoji}
                value={`Bậc ${rank.level}`}
                label="Cấp bậc"
                style={{ flex: 1 }}
              />
            </View>

            {/* Tiếp tục học — vào thẳng bài ở biên hiệu lực */}
            {continueTarget ? (
              <Card
                accentColor={activeTokens?.primary}
                style={styles.continueCard}
              >
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
                  🚀 Tiếp tục hành trình — {pack.targetLanguage}
                </Text>
                <ContinueButton
                  target={continueTarget}
                  totalLessons={total}
                  allDone={allDone}
                  onPress={handleContinue}
                />
                {activeKingdom ? (
                  <Text style={styles.continueSub} maxFontSizeMultiplier={1.25}>
                    Trong {activeKingdom.kingdomName} — bấm nút là vào học bài
                    này luôn, hoặc mở bản đồ bên dưới để chọn bài khác.
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {/* Nhiệm vụ hôm nay */}
            <Card>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
                🎯 Nhiệm vụ hôm nay
              </Text>
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                {quests.map((quest) => (
                  <View key={quest.id} style={styles.questRow}>
                    <Text style={styles.questEmoji}>
                      {QUEST_EMOJI[quest.id] ?? "🎯"}
                    </Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.questTop}>
                        <Text
                          style={[
                            styles.questLabel,
                            quest.done && styles.questLabelDone,
                          ]}
                          maxFontSizeMultiplier={1.25}
                        >
                          {quest.label}
                        </Text>
                        <Text style={styles.questCount} maxFontSizeMultiplier={1.25}>
                          {quest.done ? "✓ " : ""}
                          {quest.value}/{quest.target}
                        </Text>
                      </View>
                      <ProgressBar
                        value={quest.target > 0 ? quest.value / quest.target : 0}
                        color={quest.done ? "#22c55e" : "#f59e0b"}
                        height={9}
                        accessibilityLabel={`${quest.label}: ${quest.value}/${quest.target}`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* Vương quốc ngôn ngữ */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.25}>
                🌍 Vương quốc ngôn ngữ
              </Text>
              <Pressable
                onPress={() => router.push("/courses")}
                accessibilityRole="button"
                accessibilityLabel="Mở màn chọn thế giới ngôn ngữ"
                style={({ pressed }) => [
                  styles.sectionLink,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.sectionLinkText} maxFontSizeMultiplier={1.2}>
                  Chọn thế giới ›
                </Text>
              </Pressable>
            </View>

            {KINGDOMS.map((kingdom) => {
              const row = courseRows.find((c) => c.courseId === kingdom.courseId);
              const doneCount = row?.completed ?? 0;
              const totalCount = row?.total ?? 0;
              const pct = totalCount > 0 ? doneCount / totalCount : 0;
              const xp = progress.courses?.[kingdom.courseId]?.xp ?? 0;
              const active = kingdom.courseId === activeCourseId;
              const petAccessories = (
                progress.equippedAccessories?.[kingdom.courseId] ?? []
              )
                .map((id) => accessoryById(kingdom.courseId, id)?.emoji)
                .filter((e): e is string => !!e);
              return (
                <KingdomHomeCard
                  key={kingdom.courseId}
                  kingdom={kingdom}
                  xp={xp}
                  done={doneCount}
                  total={totalCount}
                  pct={pct}
                  active={active}
                  accessoryEmojis={petAccessories}
                  onPress={() => openMap(kingdom.courseId)}
                />
              );
            })}

            {/* Lối tắt */}
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.25}>
              ✨ Khám phá thêm
            </Text>
            <View style={styles.shortcutRow}>
              <ShortcutCard
                emoji="🏅"
                label="Cuộc thi"
                onPress={() => router.push("/competitions")}
              />
              <ShortcutCard
                emoji="🎁"
                label="Phần thưởng"
                onPress={() => router.push("/rewards")}
              />
              <ShortcutCard
                emoji="⭐"
                label="Thành tích"
                onPress={() => router.push("/achievements")}
              />
              <ShortcutCard
                emoji="🐾"
                label="Thú cưng"
                onPress={() => router.push("/pet")}
              />
            </View>

            <Text style={styles.footerNote} maxFontSizeMultiplier={1.25}>
              Muốn bắt đầu từ tầng cao hơn? Đổi cấp độ của em ở tab Hồ sơ —
              điểm bắt đầu trên bản đồ sẽ nhảy theo ngay.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/* ------------------------------------------------------------------ */

function KingdomHomeCard({
  kingdom,
  xp,
  done,
  total,
  pct,
  active,
  accessoryEmojis,
  onPress,
}: {
  kingdom: Kingdom;
  xp: number;
  done: number;
  total: number;
  pct: number;
  active: boolean;
  /** Emoji phụ kiện thú của vương quốc này đang mặc (Đợt B+C). */
  accessoryEmojis: string[];
  onPress: () => void;
}) {
  const styles = useStyles();
  const p = kingdom.palette;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mở bản đồ ${kingdom.kingdomName}, ${kingdom.targetLanguage}: đã học ${done}/${total} bài, ${xp} XP`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.kingdomCard,
        { borderColor: active ? p.deep : p.primary },
        active && { backgroundColor: p.soft },
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={[styles.kingdomAvatar, { backgroundColor: p.soft }]}>
        <Text style={styles.kingdomAvatarEmoji}>{kingdom.companion}</Text>
        {accessoryEmojis.length > 0 ? (
          <Text style={styles.kingdomAccessory} numberOfLines={1}>
            {accessoryEmojis.slice(0, 3).join("")}
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.kingdomNameRow}>
          <Text style={styles.kingdomName} maxFontSizeMultiplier={1.25}>
            {kingdom.kingdomName}
          </Text>
          {active ? (
            <View style={[styles.activeBadge, { backgroundColor: p.deep }]}>
              <Text style={styles.activeBadgeText} maxFontSizeMultiplier={1.1}>
                Đang học
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.kingdomMeta} maxFontSizeMultiplier={1.25}>
          {kingdom.targetLanguage} · ⭐ {xp} XP của vương quốc
        </Text>
        <Text style={styles.kingdomMeta} maxFontSizeMultiplier={1.25}>
          Đã học {done}/{total} bài
        </Text>
        <ProgressBar
          value={pct}
          color={p.primary}
          height={9}
          accessibilityLabel={`Tiến độ ${kingdom.kingdomName}: đã học ${done} trên ${total} bài`}
        />
      </View>
      <View style={[styles.mapPill, { backgroundColor: p.primary }]}>
        <Text style={styles.mapPillText} maxFontSizeMultiplier={1.15}>
          🗺️ Bản đồ
        </Text>
      </View>
    </Pressable>
  );
}

function ShortcutCard({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mở ${label}`}
      style={({ pressed }) => [
        styles.shortcutCard,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.shortcutEmoji}>{emoji}</Text>
      <Text style={styles.shortcutLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    body: { padding: spacing.lg, paddingBottom: 40 },
    column: {
      width: "100%",
      maxWidth: layout.contentMaxWidth,
      alignSelf: "center",
      gap: spacing.md,
    },
    heroCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    heroMascot: { width: 74, height: 74 },
    heroAvatar: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: colors.amber,
      marginLeft: -spacing.sm,
      backgroundColor: colors.surface,
    },
    heroGreeting: {
      fontSize: typography.body.fontSize,
      fontWeight: "700",
      color: colors.textMuted,
    },
    heroRank: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    heroRankSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    musicButton: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    musicIcon: { fontSize: 21 },
    chipRow: { flexDirection: "row", gap: spacing.sm },
    continueCard: { gap: spacing.sm },
    continueSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    cardTitle: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "800",
      color: colors.neutral700,
    },
    questRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    questEmoji: { fontSize: 21, lineHeight: 26 },
    questTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    questLabel: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
    questLabelDone: { color: colors.correctText },
    questCount: { fontSize: 13, fontWeight: "800", color: colors.textMuted },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    sectionTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
      marginTop: spacing.xs,
    },
    sectionLink: {
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    sectionLinkText: { fontSize: 14, fontWeight: "800", color: colors.skyDark },
    kingdomCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderRadius: radius.xl,
      padding: spacing.md,
      ...shadow.card,
    },
    kingdomAvatar: {
      width: 58,
      height: 58,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    kingdomAvatarEmoji: { fontSize: 32 },
    kingdomAccessory: { fontSize: 11, lineHeight: 13, marginTop: -4 },
    kingdomNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    kingdomName: {
      fontSize: typography.title.fontSize,
      fontWeight: "900",
      color: colors.neutral700,
      flexShrink: 1,
    },
    activeBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
    activeBadgeText: { fontSize: 10.5, fontWeight: "800", color: colors.white },
    kingdomMeta: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    mapPill: {
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    mapPillText: { fontSize: 12.5, fontWeight: "800", color: colors.white },
    shortcutRow: { flexDirection: "row", gap: spacing.sm },
    shortcutCard: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      ...shadow.soft,
    },
    shortcutEmoji: { fontSize: 26 },
    shortcutLabel: { fontSize: 13, fontWeight: "800", color: colors.neutral700 },
    footerNote: {
      fontSize: 12.5,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
  })
);
