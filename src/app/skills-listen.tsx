import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DuoButton } from "@/components/duo-button";
import { OptionCard, type OptionState } from "@/components/exercises/option-card";
import { SpeakerButton } from "@/components/speaker-button";
import { Card } from "@/components/ui";
import {
  SkillFeedbackBar,
  SkillFrame,
  SkillPetCheer,
  SkillResultCard,
  useSkillPool,
  type SkillFeedback,
} from "@/components/skills-ui";
import { speakTarget, useSfx } from "@/lib/audio";
import {
  SKILL_SESSION_SIZE,
  SKILL_XP,
  SKILL_XP_PERFECT_BONUS,
  buildListenSession,
  skillRngFor,
  type ListenActivity,
} from "@/lib/skills";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, spacing, typography, useThemeColors } from "@/lib/theme";

/**
 * Buổi LUYỆN NGHE (/skills-listen): 5 hoạt động sinh từ pool của khóa
 * đang học, xoay 3 dạng: nghe từ -> chọn đúng từ; nghe câu -> chọn
 * nghĩa tiếng Việt; nghe câu -> điền từ còn thiếu. Dạng nghe hiểu
 * KHÔNG hiện chữ của câu đích trước khi bé trả lời — chỉ có nút loa;
 * câu gốc chỉ hiện ở dải đối chiếu sau khi trả lời.
 */
export default function SkillsListenScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { courseId, pool, tokens } = useSkillPool();
  const completeSkillSession = useProgress((s) => s.completeSkillSession);
  const { playCorrect, playIncorrect, playFinish } = useSfx();
  const accent = tokens?.primary ?? colors.sky;

  const [attempt, setAttempt] = useState(0);
  const session = useMemo(
    () =>
      buildListenSession(
        pool,
        skillRngFor({ courseId, skill: "listen", attempt })
      ),
    [pool, courseId, attempt]
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<SkillFeedback | null>(null);
  const awardedRef = useRef(false);

  const activity: ListenActivity | undefined = session[index];
  const finished = index >= session.length;
  const correctCount = results.filter(Boolean).length;
  const perfect = finished && results.length > 0 && results.every(Boolean);

  // Tự phát âm khi sang hoạt động mới.
  useEffect(() => {
    if (finished || !activity) return undefined;
    const text =
      activity.kind === "listen-word"
        ? activity.answer.word.target
        : activity.sentence.target;
    const t = setTimeout(() => speakTarget(courseId, text), 350);
    return () => clearTimeout(t);
  }, [activity, courseId, finished]);

  // Chấm buổi đúng một lần khi hoàn thành: +15 XP (+5 nếu đúng hết).
  useEffect(() => {
    if (finished && !awardedRef.current && session.length > 0) {
      awardedRef.current = true;
      completeSkillSession(results.every(Boolean));
      playFinish();
    }
  }, [completeSkillSession, finished, playFinish, results, session.length]);

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setPicked(null);
    setResults([]);
    setFeedback(null);
    awardedRef.current = false;
  };

  const pick = (optionIndex: number, correct: boolean) => {
    if (picked !== null) return;
    setPicked(optionIndex);
    setResults((r) => [...r, correct]);
    setFeedback({ kind: correct ? "correct" : "wrong", nonce: index + 1 });
    if (correct) playCorrect();
    else playIncorrect();
  };

  const next = () => {
    setPicked(null);
    setFeedback(null);
    setIndex((i) => i + 1);
  };

  const optionState = (i: number, isCorrect: boolean): OptionState => {
    if (picked === null) return "idle";
    if (isCorrect) return "correct";
    return picked === i ? "wrong" : "idle";
  };

  const revealDetail = (a: ListenActivity): string | undefined => {
    if (picked === null) return undefined;
    if (a.kind === "listen-word") {
      return `${a.answer.word.target} nghĩa là "${a.answer.word.native}".`;
    }
    const rom = a.sentence.romanization ? ` (${a.sentence.romanization})` : "";
    return `Câu vừa nghe: "${a.sentence.target}"${rom} — ${a.sentence.native}`;
  };

  return (
    <SkillFrame
      title="🎧 Luyện Nghe"
      badgeText={
        finished
          ? `${session.length}/${session.length}`
          : `${Math.min(index + 1, session.length)}/${session.length || SKILL_SESSION_SIZE}`
      }
      progress={session.length ? results.length / session.length : 0}
      accentColor={accent}
      footer={
        <SkillFeedbackBar
          feedback={finished ? null : feedback}
          detail={activity ? revealDetail(activity) : undefined}
          onContinue={next}
        />
      }
    >
      {finished ? (
        <SkillResultCard
          headline="Buổi nghe hoàn thành!"
          detail={`Bé nghe đúng ${correctCount}/${session.length} hoạt động.`}
          xpEarned={SKILL_XP + (perfect ? SKILL_XP_PERFECT_BONUS : 0)}
          perfect={perfect}
          onAgain={restart}
        />
      ) : activity ? (
        <>
          <SkillPetCheer feedback={feedback} />
          <Card accentColor={accent} style={styles.listenCard}>
            <SpeakerButton
              text={
                activity.kind === "listen-word"
                  ? activity.answer.word.target
                  : activity.sentence.target
              }
              size={76}
            />
            <Text style={styles.listenHint} maxFontSizeMultiplier={1.3}>
              {activity.kind === "listen-word"
                ? "Nghe thật kỹ rồi chọn đúng từ nhé!"
                : activity.kind === "listen-meaning"
                  ? "Nghe cả câu rồi chọn nghĩa tiếng Việt đúng nhé!"
                  : "Nghe cả câu rồi chọn từ còn thiếu nhé!"}
            </Text>
            {activity.kind === "listen-gap" ? (
              <Text style={styles.blanked} maxFontSizeMultiplier={1.3}>
                {activity.blanked}
              </Text>
            ) : null}
          </Card>

          <View style={styles.options}>
            {activity.kind === "listen-word"
              ? activity.options.map((item, i) => (
                  <OptionCard
                    key={`${item.word.target}-${i}`}
                    text={item.word.target}
                    emoji={item.word.emoji}
                    state={optionState(i, item.word.target === activity.answer.word.target)}
                    disabled={picked !== null}
                    onPress={() =>
                      pick(i, item.word.target === activity.answer.word.target)
                    }
                  />
                ))
              : activity.options.map((text, i) => (
                  <OptionCard
                    key={`${text}-${i}`}
                    text={text}
                    state={optionState(i, i === activity.correctIndex)}
                    disabled={picked !== null}
                    onPress={() => pick(i, i === activity.correctIndex)}
                  />
                ))}
          </View>

          {picked === null ? (
            <Text style={styles.tip} maxFontSizeMultiplier={1.3}>
              Bấm loa để nghe lại bao nhiêu lần cũng được 🔊
            </Text>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa đủ nội dung để luyện nghe. Bé học thêm vài bài trên
            bản đồ rồi quay lại nhé!
          </Text>
          <DuoButton label="Quay lại" onPress={restart} />
        </Card>
      )}
    </SkillFrame>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    listenCard: { alignItems: "center", gap: spacing.md },
    listenHint: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "700",
      color: colors.selectedText,
      textAlign: "center",
    },
    blanked: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight + 6,
      fontWeight: "800",
      color: colors.neutral700,
      textAlign: "center",
    },
    options: { gap: spacing.sm + 4 },
    tip: {
      fontSize: typography.caption.fontSize,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
    emptyCard: { gap: spacing.md, alignItems: "center" },
    emptyText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.neutral700,
      textAlign: "center",
      fontWeight: "600",
    },
  })
);
