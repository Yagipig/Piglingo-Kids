import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DuoButton } from "@/components/duo-button";
import { OptionCard, type OptionState } from "@/components/exercises/option-card";
import { SpeakerButton } from "@/components/speaker-button";
import { Card } from "@/components/ui";
import { RealVoiceButton } from "@/components/real-voice-button";
import { WordMeta } from "@/components/word-meta";
import {
  SkillFeedbackBar,
  SkillFrame,
  SkillPetCheer,
  SkillResultCard,
  useSkillPool,
  type SkillFeedback,
} from "@/components/skills-ui";
import { useSfx } from "@/lib/audio";
import {
  SKILL_XP,
  SKILL_XP_PERFECT_BONUS,
  buildReadSession,
  lookupWordInCourse,
  skillRngFor,
  tokenizeTarget,
  type ReadQuestion,
} from "@/lib/skills";
import { useProgress } from "@/lib/store";
import {
  makeThemedStyles,
  radius,
  spacing,
  typography,
  useThemeColors,
} from "@/lib/theme";
import type { Word } from "@/lib/types";

/**
 * Buổi LUYỆN ĐỌC (/skills-read): đoạn đọc ghép từ 3–5 câu mẫu của
 * MỘT unit trong pool + 4 câu hỏi hiểu bài sinh tự động từ chính đoạn
 * (nghĩa của từ trong đoạn / phán đúng-sai bằng cách giữ nguyên hoặc
 * hoán đổi một từ khóa / chọn câu có trong đoạn). Chạm vào từng từ
 * trong đoạn -> thẻ nhỏ: nghe đọc từ đó (TTS) + nghĩa tiếng Việt tra
 * trong từ vựng sẵn có của khóa; từ không có trong từ điển thì chỉ
 * đọc, KHÔNG bịa nghĩa.
 */
export default function SkillsReadScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { courseId, pool, tokens } = useSkillPool();
  const completeSkillSession = useProgress((s) => s.completeSkillSession);
  const { playCorrect, playIncorrect, playFinish } = useSfx();
  const accent = tokens?.primary ?? colors.sky;

  const [attempt, setAttempt] = useState(0);
  const session = useMemo(
    () => buildReadSession(pool, skillRngFor({ courseId, skill: "read", attempt })),
    [pool, courseId, attempt]
  );
  const [step, setStep] = useState(0); // 0 = đọc đoạn; 1.. = câu hỏi
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<SkillFeedback | null>(null);
  const [selected, setSelected] = useState<{ token: string; word?: Word } | null>(null);
  const awardedRef = useRef(false);

  const questions = session?.questions ?? [];
  const totalSteps = 1 + questions.length;
  const finished = session !== null && step > questions.length;
  const question: ReadQuestion | undefined = questions[step - 1];
  const correctCount = results.filter(Boolean).length;
  const perfect = finished && results.length > 0 && results.every(Boolean);

  useEffect(() => {
    if (finished && !awardedRef.current && session) {
      awardedRef.current = true;
      completeSkillSession(results.every(Boolean));
      playFinish();
    }
  }, [completeSkillSession, finished, playFinish, results, session]);

  const restart = () => {
    setAttempt((a) => a + 1);
    setStep(0);
    setPicked(null);
    setResults([]);
    setFeedback(null);
    setSelected(null);
    awardedRef.current = false;
  };

  const pick = (optionIndex: number, correct: boolean) => {
    if (picked !== null) return;
    setPicked(optionIndex);
    setResults((r) => [...r, correct]);
    setFeedback({ kind: correct ? "correct" : "wrong", nonce: step });
    if (correct) playCorrect();
    else playIncorrect();
  };

  const nextQuestion = () => {
    setPicked(null);
    setFeedback(null);
    setStep((s) => s + 1);
  };

  const optionState = (i: number, isCorrect: boolean): OptionState => {
    if (picked === null) return "idle";
    if (isCorrect) return "correct";
    return picked === i ? "wrong" : "idle";
  };

  const questionDetail = (q: ReadQuestion): string | undefined => {
    if (picked === null) return undefined;
    if (q.kind === "word-meaning") {
      return `Từ "${q.word.target}" nghĩa là "${q.word.native}".`;
    }
    if (q.kind === "true-false") {
      return q.isTrue
        ? "Đúng vậy — câu này y hệt trong đoạn văn."
        : `Câu trong đoạn văn là: "${q.sourceTarget}"`;
    }
    return `Câu có trong đoạn văn: "${q.options[q.correctIndex]}"`;
  };

  return (
    <SkillFrame
      title="📖 Luyện Đọc"
      badgeText={`${Math.min(step + 1, totalSteps)}/${totalSteps}`}
      progress={
        totalSteps
          ? Math.min(1, ((step >= 1 ? 1 : 0) + results.length) / totalSteps)
          : 0
      }
      accentColor={accent}
      footer={
        <SkillFeedbackBar
          feedback={finished ? null : feedback}
          detail={question ? questionDetail(question) : undefined}
          onContinue={nextQuestion}
        />
      }
    >
      {!session ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa đủ câu mẫu để ghép đoạn đọc. Bé học thêm vài bài
            trên bản đồ rồi quay lại nhé!
          </Text>
        </Card>
      ) : finished ? (
        <SkillResultCard
          headline="Buổi đọc hoàn thành!"
          detail={`Bé trả lời đúng ${correctCount}/${questions.length} câu hỏi về đoạn "${session.unitTitle}".`}
          xpEarned={SKILL_XP + (perfect ? SKILL_XP_PERFECT_BONUS : 0)}
          perfect={perfect}
          onAgain={restart}
        />
      ) : step === 0 ? (
        <>
          <SkillPetCheer feedback={null} />
          <Card accentColor={accent} style={styles.passageCard}>
            <Text style={styles.passageTitle} maxFontSizeMultiplier={1.3}>
              📖 Đoạn đọc · {session.unitTitle}
            </Text>
            {session.passage.map((sentence, si) => (
              <View key={`${sentence.target}-${si}`} style={styles.sentenceBlock}>
                <View style={styles.tokenRow}>
                  {tokenizeTarget(sentence.target).map((token, ti) => {
                    const isSelected =
                      selected?.token === token &&
                      selected !== null;
                    return (
                      <Pressable
                        key={`${token}-${ti}`}
                        onPress={() =>
                          setSelected({
                            token,
                            word: lookupWordInCourse(courseId, token),
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Xem từ ${token}`}
                        style={[
                          styles.token,
                          isSelected && { backgroundColor: accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tokenText,
                            isSelected && { color: colors.white },
                          ]}
                          maxFontSizeMultiplier={1.3}
                        >
                          {token}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {sentence.romanization ? (
                  <Text style={styles.roman} maxFontSizeMultiplier={1.3}>
                    {sentence.romanization}
                  </Text>
                ) : null}
              </View>
            ))}
            <Text style={styles.tapHint} maxFontSizeMultiplier={1.3}>
              Chạm vào từng từ để nghe đọc và xem nghĩa nhé 👆
            </Text>
          </Card>

          {selected ? (
            <Card style={styles.wordCard}>
              <View style={styles.wordRow}>
                <Text style={styles.wordText} maxFontSizeMultiplier={1.3}>
                  {selected.word?.target ?? selected.token}
                  {selected.word?.romanization
                    ? ` · ${selected.word.romanization}`
                    : ""}
                </Text>
                <SpeakerButton text={selected.word?.target ?? selected.token} size={48} />
              </View>
              {selected.word ? (
                <>
                  <Text style={styles.wordMeaning} maxFontSizeMultiplier={1.3}>
                    {selected.word.emoji} Nghĩa: {selected.word.native}
                  </Text>
                  <WordMeta courseId={courseId} word={selected.word} />
                  <RealVoiceButton
                    courseId={courseId}
                    text={selected.word.target}
                    compact
                  />
                </>
              ) : (
                <Text style={styles.wordMeaning} maxFontSizeMultiplier={1.3}>
                  Từ này chưa có trong từ điển của khóa — bé nghe và đọc theo
                  mẫu nhé!
                </Text>
              )}
            </Card>
          ) : null}

          <DuoButton
            label="Đã đọc xong → Trả lời câu hỏi"
            variant="secondary"
            onPress={() => setStep(1)}
          />
        </>
      ) : question ? (
        <>
          <SkillPetCheer feedback={feedback} />
          <Card accentColor={accent} style={styles.questionCard}>
            <Text style={styles.questionLabel} maxFontSizeMultiplier={1.3}>
              Câu hỏi {step}/{questions.length}
            </Text>
            {question.kind === "word-meaning" ? (
              <>
                <Text style={styles.questionText} maxFontSizeMultiplier={1.3}>
                  Trong đoạn văn, từ "{question.word.target}"
                  {question.word.romanization
                    ? ` (${question.word.romanization})`
                    : ""}{" "}
                  nghĩa là gì?
                </Text>
                <View style={styles.inlineSpeaker}>
                  <SpeakerButton text={question.word.target} size={48} />
                  <Text style={styles.speakerHint}>Nghe lại từ này</Text>
                </View>
              </>
            ) : question.kind === "true-false" ? (
              <>
                <Text style={styles.questionText} maxFontSizeMultiplier={1.3}>
                  Câu này có đúng với đoạn văn không?
                </Text>
                <Text style={styles.statement} maxFontSizeMultiplier={1.3}>
                  "{question.statement}"
                </Text>
              </>
            ) : (
              <Text style={styles.questionText} maxFontSizeMultiplier={1.3}>
                Câu nào sau đây CÓ trong đoạn văn?
              </Text>
            )}
          </Card>

          <View style={styles.options}>
            {question.kind === "true-false" ? (
              <>
                <OptionCard
                  text="✅ Đúng với đoạn văn"
                  state={optionState(0, question.isTrue)}
                  disabled={picked !== null}
                  onPress={() => pick(0, question.isTrue)}
                />
                <OptionCard
                  text="❌ Không đúng"
                  state={optionState(1, !question.isTrue)}
                  disabled={picked !== null}
                  onPress={() => pick(1, !question.isTrue)}
                />
              </>
            ) : (
              question.options.map((text, i) => (
                <OptionCard
                  key={`${text}-${i}`}
                  text={text}
                  state={optionState(i, i === question.correctIndex)}
                  disabled={picked !== null}
                  onPress={() => pick(i, i === question.correctIndex)}
                />
              ))
            )}
          </View>
        </>
      ) : null}
    </SkillFrame>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    passageCard: { gap: spacing.md },
    passageTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    sentenceBlock: { gap: spacing.xs },
    tokenRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    token: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      minHeight: 40,
      justifyContent: "center",
    },
    tokenText: {
      fontSize: 19,
      fontWeight: "700",
      color: colors.neutral700,
    },
    roman: {
      fontSize: typography.caption.fontSize,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    tapHint: {
      fontSize: typography.caption.fontSize,
      color: colors.textMuted,
      fontWeight: "600",
    },
    wordCard: { gap: spacing.sm },
    wordRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    wordText: {
      flex: 1,
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    wordMeaning: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "700",
      color: colors.neutral700,
    },
    questionCard: { gap: spacing.md },
    questionLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: "800",
      color: colors.textMuted,
    },
    questionText: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight + 4,
      fontWeight: "800",
      color: colors.neutral700,
    },
    statement: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight + 8,
      fontWeight: "800",
      color: colors.neutral700,
    },
    inlineSpeaker: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    speakerHint: {
      fontSize: typography.caption.fontSize,
      color: colors.textMuted,
      fontWeight: "600",
    },
    options: { gap: spacing.sm + 4 },
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
