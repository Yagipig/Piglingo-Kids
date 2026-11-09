import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SpeakerButton } from "@/components/speaker-button";
import { speakTarget } from "@/lib/audio";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, spacing, typography } from "@/lib/theme";
import type { SelectExercise } from "@/lib/types";

import { OptionCard, type OptionState } from "./option-card";

type SelectProps = {
  exercise: SelectExercise;
  answer: number | null;
  onAnswer: (index: number) => void;
  status: "none" | "correct" | "wrong";
  targetLanguage: string;
};

export function Select({
  exercise,
  answer,
  onAnswer,
  status,
  targetLanguage,
}: SelectProps) {
  const courseId = useProgress((s) => s.activeCourseId);
  const styles = useStyles();
  const hasEmoji = exercise.options.some((o) => o.emoji);
  const isListen = exercise.mode === "listen";

  useEffect(() => {
    if (isListen && exercise.audioTarget) speakTarget(courseId, exercise.audioTarget);
  }, [courseId, exercise.id, isListen, exercise.audioTarget]);

  const optionState = (index: number): OptionState => {
    if (status === "none") return answer === index ? "selected" : "idle";
    if (index === exercise.correct) return "correct";
    if (answer === index) return "wrong";
    return "idle";
  };

  const title =
    exercise.mode === "targetToNative"
      ? "Nghĩa là gì?"
      : exercise.mode === "nativeToTarget"
        ? `Chọn từ ${targetLanguage}`
        : "Chạm vào từ em nghe được";

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        {title}
      </Text>

      <View style={styles.promptRow}>
        {exercise.audioTarget ? (
          <SpeakerButton text={exercise.audioTarget} size={56} />
        ) : null}
        {!isListen ? (
          <Text style={styles.prompt} maxFontSizeMultiplier={1.3}>
            {exercise.prompt}
          </Text>
        ) : null}
      </View>

      <View style={[styles.options, hasEmoji && styles.grid]}>
        {exercise.options.map((option, index) => (
          <OptionCard
            key={option.text + index}
            text={option.text}
            emoji={option.emoji}
            compact={hasEmoji}
            state={optionState(index)}
            onPress={() => onAnswer(index)}
            disabled={status !== "none"}
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    container: { gap: spacing.xl },
    title: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    promptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      alignSelf: "flex-start",
      maxWidth: "100%",
      backgroundColor: colors.neutral100,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    prompt: { fontSize: 24, fontWeight: "700", color: colors.text, flexShrink: 1 },
    options: { gap: spacing.md },
    grid: { flexDirection: "row", flexWrap: "wrap" },
  })
);
