import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { GameBadge, GameHeader, WinCard } from "@/components/game-ui";
import { ProgressBar } from "@/components/ui";
import { catalog } from "@/lib/content";
import {
  ENCOURAGEMENT_WRONG,
  PRAISE_RIGHT,
  companionPetFor,
  legendaryUnlocked,
  pickLine,
} from "@/lib/pets";
import { buildSkillPool, type SkillPool } from "@/lib/skills";
import { useProgress } from "@/lib/store";
import {
  kingdomColorTokens,
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  typography,
  useThemeColors,
} from "@/lib/theme";

/**
 * Khung + tiện ích DÙNG CHUNG cho khu Luyện 4 kỹ năng (Phase 4 style):
 * hook lấy pool nội dung của khóa đang học, khung màn hình (GameHeader
 * + ProgressBar màu vương quốc), bong bóng cổ vũ của thú đồng hành
 * (tái dùng hồ câu thoại của lib/pets — CHỈ động viên/khen, không có
 * skill làm bài thay bé ở khu luyện), và thẻ kết quả cuối buổi.
 */

const CATALOG_TOTALS = Object.fromEntries(
  catalog.courses.map((c) => [c.id, c.lessonCount])
);

/** Pool nội dung của khóa đang học + màu vương quốc, cho mọi màn kỹ năng. */
export function useSkillPool(): {
  courseId: string;
  pool: SkillPool;
  tokens: ReturnType<typeof kingdomColorTokens>;
} {
  const courseId = useProgress((s) => s.activeCourseId);
  const completedLessons = useProgress(
    (s) => s.courses[s.activeCourseId]?.completedLessons
  );
  const learnerLevel = useProgress((s) => s.learnerLevel);
  const pool = useMemo(
    () => buildSkillPool(courseId, completedLessons ?? {}, learnerLevel),
    [courseId, completedLessons, learnerLevel]
  );
  const tokens = kingdomColorTokens(courseId);
  return { courseId, pool, tokens };
}

/** Khung màn hình một buổi luyện: header + thanh tiến độ + vùng cuộn + chân cố định. */
export function SkillFrame({
  title,
  badgeText,
  progress,
  accentColor,
  children,
  footer,
}: {
  title: string;
  badgeText?: string;
  progress: number;
  accentColor?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <GameHeader
        title={title}
        right={badgeText ? <GameBadge text={badgeText} /> : undefined}
      />
      <View style={styles.progressWrap}>
        <ProgressBar value={progress} color={accentColor} height={12} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      {footer}
    </SafeAreaView>
  );
}

export type SkillFeedback = { kind: "correct" | "wrong"; nonce: number };

/**
 * Thú đồng hành cổ vũ trong khu luyện: đúng -> câu khen, sai -> câu
 * động viên, lấy từ hồ câu sẵn có của hệ thú cưng (pets.ts). Thú chỉ
 * cổ vũ — không gợi ý đáp án ở khu luyện kỹ năng.
 */
export function SkillPetCheer({ feedback }: { feedback: SkillFeedback | null }) {
  const styles = useStyles();
  const progress = useProgress();
  const legendary = legendaryUnlocked(progress.courses ?? {}, CATALOG_TOTALS);
  const pet = companionPetFor({
    activeCompanion: progress.activeCompanion ?? "world",
    courseId: progress.activeCourseId,
    legendary,
    rarePets: progress.rarePets ?? [],
  });
  const [line, setLine] = useState<string | null>(null);
  const lastLineRef = useRef<string | null>(null);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (!feedback || feedback.nonce === lastNonceRef.current) return;
    lastNonceRef.current = feedback.nonce;
    const next = pickLine(
      feedback.kind === "correct" ? PRAISE_RIGHT : ENCOURAGEMENT_WRONG,
      lastLineRef.current
    );
    lastLineRef.current = next;
    setLine(next);
  }, [feedback]);

  if (!pet) return null;
  return (
    <View style={styles.petRow}>
      <Text style={styles.petEmoji}>{pet.emoji}</Text>
      <View style={styles.petBubble}>
        <Text style={styles.petLine} maxFontSizeMultiplier={1.25}>
          {line ?? `${pet.name} đang luyện cùng bé nè! Cố lên nhé 💪`}
        </Text>
      </View>
    </View>
  );
}

/** Dải phản hồi đúng/sai + nút đi tiếp, cố định cuối màn như footer bài học. */
export function SkillFeedbackBar({
  feedback,
  detail,
  onContinue,
}: {
  feedback: SkillFeedback | null;
  detail?: string;
  onContinue: () => void;
}) {
  const colors = useThemeColors();
  const styles = useStyles();
  if (!feedback) return null;
  const correct = feedback.kind === "correct";
  return (
    <View
      style={[
        styles.feedbackBar,
        { backgroundColor: correct ? colors.correctBg : colors.wrongBg },
      ]}
    >
      <Text
        style={[
          styles.feedbackTitle,
          { color: correct ? colors.correctText : colors.wrongText },
        ]}
        maxFontSizeMultiplier={1.25}
      >
        {correct ? "✅ Đúng rồi!" : "❌ Chưa đúng rồi"}
      </Text>
      {detail ? (
        <Text style={styles.feedbackDetail} maxFontSizeMultiplier={1.25}>
          {detail}
        </Text>
      ) : null}
      <DuoButton
        label="Tiếp tục"
        variant={correct ? "secondary" : "danger"}
        onPress={onContinue}
      />
    </View>
  );
}

/** Thẻ kết quả cuối buổi luyện (XP nhận được + nút luyện tiếp / quay lại). */
export function SkillResultCard({
  headline,
  detail,
  xpEarned,
  perfect,
  onAgain,
}: {
  headline: string;
  detail: string;
  xpEarned: number;
  perfect: boolean;
  onAgain: () => void;
}) {
  const styles = useStyles();
  return (
    <WinCard>
      <Text style={styles.resultEmoji}>{perfect ? "🏆" : "🎉"}</Text>
      <Text style={styles.resultHeadline} maxFontSizeMultiplier={1.3}>
        {headline}
      </Text>
      <Text style={styles.resultDetail} maxFontSizeMultiplier={1.3}>
        {detail}
      </Text>
      <Text style={styles.resultXp} maxFontSizeMultiplier={1.3}>
        +{xpEarned} XP{perfect ? " (gồm +5 XP hoàn hảo!)" : ""}
      </Text>
      <DuoButton label="🔁 Luyện buổi nữa" onPress={onAgain} />
      <DuoButton
        label="🎯 Về khu Luyện kỹ năng"
        variant="white"
        onPress={() => router.replace("/skills")}
      />
    </WinCard>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    progressWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
    petRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    petEmoji: { fontSize: 40 },
    petBubble: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 2,
      borderColor: colors.neutral200,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadow.soft,
    },
    petLine: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "600",
      color: colors.neutral700,
    },
    feedbackBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    feedbackTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
    },
    feedbackDetail: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "600",
      color: colors.neutral700,
    },
    resultEmoji: { fontSize: 52 },
    resultHeadline: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    resultDetail: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.neutral700,
      textAlign: "center",
      fontWeight: "600",
    },
    resultXp: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "900",
      color: colors.amber,
      textAlign: "center",
    },
  })
);

export type { SkillPool };
