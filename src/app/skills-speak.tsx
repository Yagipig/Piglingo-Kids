import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DuoButton } from "@/components/duo-button";
import { Card } from "@/components/ui";
import {
  SkillFrame,
  SkillResultCard,
  useSkillPool,
} from "@/components/skills-ui";
import {
  MockPronunciationProvider,
  PronunciationResultView,
  RecordButton,
  usePronunciationRecorder,
  type PronunciationResult,
} from "@/features/speaking";
import { speakTarget } from "@/lib/audio";
import {
  SKILL_XP,
  SKILL_XP_PERFECT_BONUS,
  buildSpeakSession,
  skillRngFor,
  speakingLanguageForCourse,
} from "@/lib/skills";
import { useProgress } from "@/lib/store";
import {
  makeThemedStyles,
  radius,
  spacing,
  typography,
  useThemeColors,
} from "@/lib/theme";

/**
 * Buổi LUYỆN NÓI (/skills-speak): 5 mục (câu mẫu + từ) từ pool của
 * khóa đang học. Mỗi mục tái dùng NGUYÊN module luyện nói sẵn có của
 * app (features/speaking): nghe mẫu bằng TTS -> bé ghi âm đọc theo ->
 * nghe lại giọng mình -> hiện điểm. Điểm do MockPronunciationProvider
 * chấm MÔ PHỎNG (PronunciationResultView tự gắn nhãn "điểm luyện tập
 * mô phỏng") — app không quảng cáo chấm thật ở bất cứ đâu.
 * Buổi hoàn thành khi bé đã thử ghi âm đủ cả 5 mục.
 */
export default function SkillsSpeakScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { courseId, pool, tokens } = useSkillPool();
  const completeSkillSession = useProgress((s) => s.completeSkillSession);
  const accent = tokens?.primary ?? colors.sky;
  const language = speakingLanguageForCourse(courseId);

  const assessor = useMemo(() => new MockPronunciationProvider(), []);
  const recorder = usePronunciationRecorder();

  const [attempt, setAttempt] = useState(0);
  const items = useMemo(
    () =>
      buildSpeakSession(pool, skillRngFor({ courseId, skill: "speak", attempt })),
    [pool, courseId, attempt]
  );
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, PronunciationResult>>({});
  const [isAssessing, setIsAssessing] = useState(false);
  const [done, setDone] = useState(false);
  const awardedRef = useRef(false);

  const item = items[index];
  const attemptedCount = Object.keys(results).length;
  const allAttempted = items.length > 0 && attemptedCount >= items.length;
  const currentResult = results[index];

  const handleStart = useCallback(async () => {
    await recorder.startRecording();
  }, [recorder]);

  const handleStop = useCallback(async () => {
    const recorded = await recorder.stopRecording();
    if (!recorded || !item) return;
    setIsAssessing(true);
    try {
      const assessed = await assessor.assess({
        targetText: item.text,
        language,
        audioUri: recorded.uri,
        durationMillis: recorded.durationMillis,
      });
      setResults((prev) => ({ ...prev, [index]: assessed }));
    } finally {
      setIsAssessing(false);
    }
  }, [assessor, index, item, language, recorder]);

  const finish = () => {
    if (!allAttempted || awardedRef.current) return;
    awardedRef.current = true;
    // Nói: hoàn thành đủ lượt ghi âm = buổi hoàn hảo (+5 XP) theo spec.
    completeSkillSession(true);
    setDone(true);
  };

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setResults({});
    setDone(false);
    awardedRef.current = false;
  };

  return (
    <SkillFrame
      title="🎤 Luyện Nói"
      badgeText={`Đã đọc ${attemptedCount}/${items.length} mục`}
      progress={items.length ? attemptedCount / items.length : 0}
      accentColor={accent}
    >
      {done ? (
        <SkillResultCard
          headline="Buổi nói hoàn thành!"
          detail={`Bé đã luyện đọc đủ ${items.length}/${items.length} mục. Điểm ở từng mục là điểm luyện tập mô phỏng để bé vui luyện nói mỗi ngày.`}
          xpEarned={SKILL_XP + SKILL_XP_PERFECT_BONUS}
          perfect
          onAgain={restart}
        />
      ) : item ? (
        <>
          <View style={styles.dots}>
            {items.map((it, i) => (
              <Pressable
                key={`${it.text}-${i}`}
                onPress={() => setIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={`Mục ${i + 1}${results[i] ? " (đã đọc)" : ""}`}
                style={[
                  styles.dot,
                  i === index && { backgroundColor: accent, borderColor: accent },
                  results[i] && i !== index && styles.dotDone,
                ]}
              >
                <Text
                  style={[
                    styles.dotText,
                    i === index && { color: colors.white },
                  ]}
                >
                  {results[i] ? "✓" : i + 1}
                </Text>
              </Pressable>
            ))}
          </View>

          <Card accentColor={accent} style={styles.targetCard}>
            <Text style={styles.unitLabel} maxFontSizeMultiplier={1.3}>
              {item.isSentence ? "Câu mẫu" : "Từ vựng"} · {item.unitTitle}
            </Text>
            <Text style={styles.targetText} maxFontSizeMultiplier={1.3}>
              {item.text}
            </Text>
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              {item.hint}
            </Text>
          </Card>

          <DuoButton
            label="🔊 Nghe mẫu"
            variant="primary"
            onPress={() => speakTarget(courseId, item.text)}
          />

          <View style={styles.recordWrap}>
            <RecordButton
              isRecording={recorder.isRecording}
              durationMillis={recorder.durationMillis}
              disabled={isAssessing}
              onStart={() => void handleStart()}
              onStop={() => void handleStop()}
            />
            {recorder.recordingUri && !recorder.isRecording ? (
              <Pressable
                onPress={recorder.playRecording}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.playbackButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.playbackLabel} maxFontSizeMultiplier={1.3}>
                  ▶️ Nghe lại giọng của con
                </Text>
              </Pressable>
            ) : null}
            {isAssessing ? (
              <Text style={styles.status} maxFontSizeMultiplier={1.3}>
                Đang nghe con đọc… ⏳
              </Text>
            ) : null}
            {recorder.errorMessage ? (
              <Text style={styles.error} maxFontSizeMultiplier={1.3}>
                {recorder.errorMessage}
              </Text>
            ) : null}
          </View>

          {currentResult ? (
            <PronunciationResultView result={currentResult} />
          ) : (
            <Text style={styles.tip} maxFontSizeMultiplier={1.3}>
              Nghe mẫu trước, rồi bấm nút micro và đọc theo thật to nhé!
            </Text>
          )}

          <View style={styles.navRow}>
            <DuoButton
              label="← Mục trước"
              variant="white"
              disabled={index === 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={styles.navButton}
            />
            <DuoButton
              label="Mục tiếp →"
              variant="white"
              disabled={index >= items.length - 1}
              onPress={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
              style={styles.navButton}
            />
          </View>

          <DuoButton
            label={
              allAttempted
                ? "🏁 Hoàn thành buổi luyện"
                : `🏁 Hoàn thành buổi luyện (đã đọc ${attemptedCount}/${items.length})`
            }
            variant={allAttempted ? "secondary" : "locked"}
            disabled={!allAttempted}
            onPress={finish}
          />
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa đủ nội dung để luyện nói. Bé học thêm vài bài trên
            bản đồ rồi quay lại nhé!
          </Text>
        </Card>
      )}
    </SkillFrame>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    dots: {
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "center",
      flexWrap: "wrap",
    },
    dot: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: colors.neutral200,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    dotDone: { backgroundColor: colors.correctBg, borderColor: colors.greenLight },
    dotText: { fontSize: 17, fontWeight: "800", color: colors.neutral700 },
    targetCard: { alignItems: "center", gap: spacing.sm },
    unitLabel: {
      fontSize: typography.caption.fontSize,
      fontWeight: "800",
      color: colors.textMuted,
    },
    targetText: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    hintText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
    recordWrap: { alignItems: "center", gap: spacing.sm },
    playbackButton: {
      backgroundColor: colors.selectedBg,
      borderRadius: radius.full,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
    },
    playbackLabel: {
      fontSize: typography.body.fontSize,
      fontWeight: "800",
      color: colors.selectedText,
    },
    status: {
      fontSize: typography.body.fontSize,
      color: colors.textMuted,
      textAlign: "center",
    },
    error: {
      fontSize: typography.body.fontSize,
      color: colors.wrongText,
      textAlign: "center",
    },
    tip: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
    navRow: { flexDirection: "row", gap: spacing.md },
    navButton: { flex: 1 },
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
