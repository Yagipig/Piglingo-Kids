import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Flag } from "@/components/flag";
import type {
  Companion,
  GardenLevelState,
  RewardHighlights,
  WeeklyChallenge,
} from "@/lib/garden";
import type { Kingdom } from "@/lib/kingdoms";
import { rankForXp } from "@/lib/ranks";
import type { Quest } from "@/lib/store";
import { makeThemedStyles, radius, shadow } from "@/lib/theme";

export type KingdomRow = {
  kingdom: Kingdom;
  completed: number;
  total: number;
  percent: number;
  active: boolean;
};

type GardenDashboardProps = {
  quests: Quest[];
  kingdomRows: KingdomRow[];
  weekly: WeeklyChallenge;
  totalXp: number;
  levelState: GardenLevelState;
  highlights: RewardHighlights;
  companions: Companion[];
  onKingdomPress: (courseId: string) => void;
  onOpenRewards: () => void;
  onOpenCompetitions: () => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Bảng điều khiển vườn dưới cảnh thần tiên: nhiệm vụ hôm nay (dùng lại
 * dailyQuests của store), tiến độ ba vương quốc, thử thách tuần từ
 * activeDays, cấp vườn theo tổng XP, phần thưởng đã đạt/quà đã trao và
 * bộ sưu tập thú đồng hành. Mọi con số do màn cha suy từ tiến độ thật.
 */
export function GardenDashboard({
  quests,
  kingdomRows,
  weekly,
  totalXp,
  levelState,
  highlights,
  companions,
  onKingdomPress,
  onOpenRewards,
  onOpenCompetitions,
}: GardenDashboardProps) {
  const styles = useStyles();
  const allQuestsDone = quests.length > 0 && quests.every((q) => q.done);
  const nextQuest = quests.find((q) => !q.done);
  const { current, next, xpToNext } = levelState;
  const levelPct = next
    ? Math.min(
        100,
        Math.round(((totalXp - current.minXp) / (next.minXp - current.minXp)) * 100),
      )
    : 100;
  const { globalTop, latestGivenFamily } = highlights;
  const hasHighlights = globalTop.length > 0 || latestGivenFamily != null;
  const rank = rankForXp(totalXp);

  return (
    <View style={styles.wrap}>
      {/* Nhiệm vụ hôm nay */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
          🎯 Nhiệm vụ hôm nay
        </Text>
        <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
          {allQuestsDone
            ? "Tuyệt vời! Con đã hoàn thành mọi nhiệm vụ hôm nay 🎉"
            : nextQuest
              ? `Nhiệm vụ tiếp theo: ${nextQuest.label} (${nextQuest.value}/${nextQuest.target})`
              : "Học một bài để bắt đầu nhiệm vụ hôm nay nhé!"}
        </Text>
        <View style={styles.questList}>
          {quests.map((quest) => (
            <View key={quest.id} style={styles.questRow}>
              <Text style={styles.questCheck}>{quest.done ? "✅" : "⬜"}</Text>
              <Text style={styles.questLabel} maxFontSizeMultiplier={1.3}>
                {quest.label}
              </Text>
              <Text style={styles.questValue} maxFontSizeMultiplier={1.2}>
                {quest.value}/{quest.target}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tiến độ ba vương quốc */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
          🌍 Tiến độ 3 vương quốc
        </Text>
        {kingdomRows.map(({ kingdom, completed, total, percent, active }) => (
          <Pressable
            key={kingdom.kingdomId}
            onPress={() => onKingdomPress(kingdom.courseId)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${kingdom.kingdomName}, ${kingdom.targetLanguage}: ${completed}/${total} bài, ${percent} phần trăm`}
            style={({ pressed }) => [
              styles.kingdomRow,
              active && { backgroundColor: kingdom.palette.soft },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Flag courseId={kingdom.courseId} size={26} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.kingdomNameRow}>
                <Text style={styles.kingdomName} maxFontSizeMultiplier={1.2}>
                  {kingdom.kingdomName}
                </Text>
                {active ? (
                  <Text style={[styles.activeTag, { color: kingdom.palette.deep }]} maxFontSizeMultiplier={1.1}>
                    Đang học
                  </Text>
                ) : null}
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${percent}%`, backgroundColor: kingdom.palette.primary },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.kingdomMeta} maxFontSizeMultiplier={1.2}>
              {completed}/{total} · {percent}%
            </Text>
          </Pressable>
        ))}

        <View style={styles.divider} />
        <Text style={styles.subTitle} maxFontSizeMultiplier={1.3}>
          📅 Thử thách tuần này
        </Text>
        <ProgressLine
          label="XP hoạt động"
          value={weekly.xp.value}
          target={weekly.xp.target}
          done={weekly.xp.done}
        />
        <ProgressLine
          label="Bài học hoàn thành"
          value={weekly.lessons.value}
          target={weekly.lessons.target}
          done={weekly.lessons.done}
        />
      </View>

      {/* Cấp vườn + phần thưởng */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
          🌳 Cấp vườn {current.level} — {current.name}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, styles.levelFill, { width: `${levelPct}%` }]} />
        </View>
        <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
          Tổng {totalXp} XP ·{" "}
          {next && xpToNext != null
            ? `Còn ${xpToNext} XP tới Cấp vườn ${next.level}`
            : "Đã đạt cấp vườn cao nhất 🏆"}
        </Text>

        <View style={styles.divider} />
        <View style={styles.rewardHeader}>
          <Text style={styles.subTitle} maxFontSizeMultiplier={1.3}>
            🎁 Phần thưởng đã đạt & quà đã trao
          </Text>
          <Pressable
            onPress={onOpenRewards}
            accessibilityRole="button"
            accessibilityLabel="Xem tất cả phần thưởng"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.seeAll} maxFontSizeMultiplier={1.2}>
              Xem tất cả ›
            </Text>
          </Pressable>
        </View>
        {hasHighlights ? (
          <View style={{ gap: 5 }}>
            {globalTop.map((reward) => (
              <Text key={reward.id} style={styles.rewardLine} maxFontSizeMultiplier={1.3}>
                {reward.emoji} {reward.name}
                <Text style={styles.rewardKind}> · Phần thưởng đã đạt</Text>
              </Text>
            ))}
            {latestGivenFamily ? (
              <Text style={styles.rewardLine} maxFontSizeMultiplier={1.3}>
                {latestGivenFamily.emoji} {latestGivenFamily.title}
                <Text style={styles.rewardKind}>
                  {" "}
                  · Quà ba/mẹ đã trao {formatDate(latestGivenFamily.givenAt ?? 0)}
                </Text>
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
            Hoàn thành bài học để mở huy hiệu đầu tiên và nhận quà từ ba/mẹ nhé!
          </Text>
        )}
      </View>

      {/* Thành tích & xếp hạng */}
      <Pressable
        onPress={() => router.push("/achievements")}
        accessibilityRole="button"
        accessibilityLabel={`Xem thành tích và xếp hạng. Cấp bậc hiện tại: ${rank.title}, ${totalXp} XP`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.rankRow}>
          <Text style={styles.rankEmoji}>{rank.emoji}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              🏆 Thành tích & xếp hạng
            </Text>
            <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
              Cấp bậc hiện tại: {rank.title} · {totalXp} XP
              {rank.isMax
                ? " · Đã đạt cấp cao nhất 👑"
                : ` · Còn ${rank.xpToNext} XP lên ${rank.nextTitle}`}
            </Text>
          </View>
          <Text style={styles.seeAll} maxFontSizeMultiplier={1.2}>
            Xem ›
          </Text>
        </View>
      </Pressable>

      {/* Cuộc thi & chứng chỉ tiếng Anh */}
      <Pressable
        onPress={onOpenCompetitions}
        accessibilityRole="button"
        accessibilityLabel="Xem các cuộc thi và chứng chỉ tiếng Anh theo khối lớp"
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.rankRow}>
          <Text style={styles.rankEmoji}>🌏</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              🏆 Cuộc thi & chứng chỉ tiếng Anh
            </Text>
            <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
              IOE · Cambridge · TOEFL · IELTS theo khối lớp
            </Text>
          </View>
          <Text style={styles.seeAll} maxFontSizeMultiplier={1.2}>
            Xem ›
          </Text>
        </View>
      </Pressable>

      {/* Thú đồng hành */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
          🐾 Bạn đồng hành trong vườn
        </Text>
        <View style={styles.companionGrid}>
          {companions.map((companion) => (
            <View
              key={companion.id}
              style={[styles.companionCard, !companion.unlocked && styles.companionLocked]}
              accessibilityLabel={`${companion.name}: ${companion.unlocked ? "đã về vườn" : `chưa mở. ${companion.conditionLabel}`}`}
            >
              <Text style={[styles.companionEmoji, !companion.unlocked && styles.companionEmojiLocked]}>
                {companion.unlocked ? companion.emoji : "🔒"}
              </Text>
              <Text style={styles.companionName} maxFontSizeMultiplier={1.2}>
                {companion.name}
              </Text>
              <Text style={styles.companionHint} maxFontSizeMultiplier={1.1}>
                {companion.unlocked ? "Đã về vườn" : companion.conditionLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ProgressLine({
  label,
  value,
  target,
  done,
}: {
  label: string;
  value: number;
  target: number;
  done: boolean;
}) {
  const styles = useStyles();
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <View style={styles.progressLine}>
      <View style={styles.progressLineHead}>
        <Text style={styles.progressLabel} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        <Text style={styles.progressValue} maxFontSizeMultiplier={1.2}>
          {value}/{target} {done ? "✅" : ""}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, styles.weekFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: 12, marginBottom: 12 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      padding: 14,
      gap: 8,
      ...shadow.card,
    },
    cardTitle: { fontSize: 16, fontWeight: "900", color: colors.neutral700 },
    subTitle: { fontSize: 14, fontWeight: "900", color: colors.neutral700 },
    cardHint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    divider: { height: 2, backgroundColor: colors.neutral100, borderRadius: radius.full, marginVertical: 2 },
    questList: { gap: 5 },
    questRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    questCheck: { fontSize: 14 },
    questLabel: { flex: 1, fontSize: 13.5, fontWeight: "700", color: colors.neutral700 },
    questValue: { fontSize: 12.5, fontWeight: "800", color: colors.textMuted },
    kingdomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: radius.lg,
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    kingdomNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    kingdomName: { fontSize: 14, fontWeight: "800", color: colors.neutral700 },
    activeTag: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    kingdomMeta: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
    barTrack: {
      height: 9,
      borderRadius: radius.full,
      backgroundColor: colors.neutral200,
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: radius.full },
    levelFill: { backgroundColor: colors.green },
    weekFill: { backgroundColor: colors.sky },
    progressLine: { gap: 4 },
    progressLineHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    progressLabel: { fontSize: 13, fontWeight: "700", color: colors.neutral700 },
    progressValue: { fontSize: 12.5, fontWeight: "800", color: colors.textMuted },
    rewardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    rankEmoji: { fontSize: 34 },
    seeAll: { fontSize: 13, fontWeight: "800", color: colors.skyDark },
    rewardLine: { fontSize: 13.5, fontWeight: "700", color: colors.neutral700 },
    rewardKind: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    companionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    companionCard: {
      width: "31.5%",
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.neutral100,
      borderRadius: radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    companionLocked: { opacity: 0.75 },
    companionEmoji: { fontSize: 26 },
    companionEmojiLocked: { fontSize: 20 },
    companionName: { fontSize: 12, fontWeight: "800", color: colors.neutral700, textAlign: "center" },
    companionHint: { fontSize: 10, color: colors.textMuted, textAlign: "center", lineHeight: 13 },
  })
);
