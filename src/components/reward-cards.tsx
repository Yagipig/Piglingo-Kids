import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  familyRewardStatus,
  type ConditionEvaluation,
  type FamilyReward,
  type GlobalReward,
} from "@/lib/rewards";
import { makeThemedStyles, radius, shadow } from "@/lib/theme";

export function RewardProgressBar({ percent }: { percent: number }) {
  const styles = useStyles();
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <View style={styles.track} accessibilityLabel={`Tiến độ ${safePercent}%`}>
      <View style={[styles.fill, { width: `${safePercent}%` }]} />
    </View>
  );
}

export function GlobalRewardCard({
  reward,
  evaluation,
}: {
  reward: GlobalReward;
  evaluation: ConditionEvaluation;
}) {
  const styles = useStyles();
  const done = evaluation.done;
  const displayEmoji = reward.kind === "chest" && !done ? "🧰" : reward.emoji;
  return (
    <View
      style={[styles.card, done ? styles.cardDone : styles.cardLocked]}
      accessible
      accessibilityLabel={`${reward.name}. ${done ? "Đã đạt" : "Chưa đạt"}. ${evaluation.label}. Tiến độ ${evaluation.percent}%.`}
    >
      <Text style={[styles.emoji, !done && styles.emojiDim]}>{displayEmoji}</Text>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{reward.name}</Text>
          <Text style={[styles.pill, done ? styles.pillDone : styles.pillPending]}>
            {done ? "✓ Đã đạt" : `${evaluation.percent}%`}
          </Text>
        </View>
        <Text style={styles.description}>{reward.description}</Text>
        <RewardProgressBar percent={evaluation.percent} />
        <Text style={styles.meta}>{evaluation.label}</Text>
        {done ? <Text style={styles.congrats}>🎉 {reward.congratsMessage}</Text> : null}
      </View>
    </View>
  );
}

export function FamilyRewardCard({
  reward,
  evaluation,
  progress,
}: {
  reward: FamilyReward;
  evaluation: ConditionEvaluation;
  /** Snapshot tiến độ tối thiểu để suy ra trạng thái đã trao/đã đạt. */
  progress: Parameters<typeof familyRewardStatus>[1];
}) {
  const styles = useStyles();
  const status = familyRewardStatus(reward, progress);
  const isSecret = reward.secretUntilDone && status === "pending";

  if (isSecret) {
    return (
      <View
        style={[styles.card, styles.cardLocked]}
        accessible
        accessibilityLabel={`Một phần quà bí mật đang chờ con. Tiến độ ${evaluation.percent}%.`}
      >
        <Text style={styles.emoji}>🎁</Text>
        <View style={styles.content}>
          <Text style={styles.name}>Một phần quà bí mật đang chờ con!</Text>
          <Text style={styles.description}>
            Ba/mẹ đang giữ bí mật món quà này. Hoàn thành mục tiêu để mở nhé!
          </Text>
          <RewardProgressBar percent={evaluation.percent} />
          <Text style={styles.meta}>
            {evaluation.label} · Đã đi được {evaluation.percent}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, status !== "pending" ? styles.cardDone : styles.cardLocked]}
      accessible
      accessibilityLabel={`${reward.title}. ${status === "given" ? "Đã trao" : status === "achieved" ? "Đã đạt, chờ ba mẹ trao" : "Chưa đạt"}.`}
    >
      <Text style={styles.emoji}>{reward.emoji}</Text>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{reward.title}</Text>
          <Text style={[styles.pill, status !== "pending" ? styles.pillDone : styles.pillPending]}>
            {status === "given" ? "Đã trao 🎉" : status === "achieved" ? "Đã đạt" : `${evaluation.percent}%`}
          </Text>
        </View>
        {reward.message ? <Text style={styles.description}>💌 {reward.message}</Text> : null}
        <RewardProgressBar percent={evaluation.percent} />
        <Text style={styles.meta}>
          Cho {reward.childName} · {evaluation.label}
          {status === "achieved" ? " · Đang chờ ba/mẹ trao ngoài đời thật" : ""}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: 12,
      borderWidth: 2,
      borderRadius: radius.xl,
      padding: 14,
      backgroundColor: colors.surface,
      ...shadow.card,
    },
    cardDone: { borderColor: colors.amber },
    cardLocked: { borderColor: colors.neutral200 },
    emoji: { fontSize: 38, lineHeight: 46 },
    emojiDim: { opacity: 0.55 },
    content: { flex: 1, gap: 6 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    name: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    pill: {
      overflow: "hidden",
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: "800",
      color: colors.white,
      backgroundColor: colors.neutral400,
    },
    pillDone: { backgroundColor: colors.greenDark },
    pillPending: { backgroundColor: colors.neutral400 },
    description: { fontSize: 13, lineHeight: 19, color: colors.text },
    congrats: { fontSize: 13, lineHeight: 19, fontWeight: "700", color: colors.correctText },
    meta: { fontSize: 12, color: colors.textMuted },
    track: {
      height: 9,
      borderRadius: radius.full,
      backgroundColor: colors.neutral200,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.amber },
  }),
);
