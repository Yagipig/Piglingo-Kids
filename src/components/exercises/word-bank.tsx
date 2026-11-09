import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SpeakerButton } from "@/components/speaker-button";
import { haptics } from "@/lib/haptics";
import {
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  touchTargets,
  typography,
  useThemeColors,
} from "@/lib/theme";
import type { WordBankExercise } from "@/lib/types";

type WordBankProps = {
  exercise: WordBankExercise;
  /** Indexes into exercise.tokens, in chosen order. */
  answer: number[];
  onAnswer: (tokenIndexes: number[]) => void;
  status: "none" | "correct" | "wrong";
};

export function WordBank({ exercise, answer, onAnswer, status }: WordBankProps) {
  const colors = useThemeColors();
  const styles = useStyles();
  const locked = status !== "none";

  const pick = (index: number) => {
    if (locked || answer.includes(index)) return;
    onAnswer([...answer, index]);
  };

  const unpick = (index: number) => {
    if (locked) return;
    onAnswer(answer.filter((i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        Dịch câu này
      </Text>

      <View style={styles.promptRow}>
        {exercise.audioTarget ? (
          <SpeakerButton text={exercise.audioTarget} size={56} />
        ) : null}
        <Text style={styles.prompt} maxFontSizeMultiplier={1.3}>
          {exercise.prompt}
        </Text>
      </View>

      <View
        style={[
          styles.answerArea,
          status === "correct" && { borderColor: colors.greenLight },
          status === "wrong" && { borderColor: colors.rose },
        ]}
      >
        {answer.map((tokenIndex) => (
          <Chip
            key={tokenIndex}
            label={exercise.tokens[tokenIndex]}
            hint="Chạm để bỏ khỏi câu trả lời"
            onPress={() => unpick(tokenIndex)}
          />
        ))}
      </View>

      <View style={styles.pool}>
        {exercise.tokens.map((token, index) => {
          const used = answer.includes(index);
          return used ? (
            <View key={index} style={[styles.chip, styles.chipGhost]}>
              <Text style={[styles.chipText, { color: "transparent" }]}>{token}</Text>
            </View>
          ) : (
            <Chip
              key={index}
              label={token}
              hint="Chạm để thêm vào câu trả lời"
              onPress={() => pick(index)}
            />
          );
        })}
      </View>
    </View>
  );
}

function Chip({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.chip, { borderBottomWidth: pressed ? 2 : 4 }]}
    >
      <Text style={styles.chipText} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
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
    promptRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    prompt: { fontSize: 20, fontWeight: "700", color: colors.text, flexShrink: 1 },
    answerArea: {
      minHeight: 68,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.neutral300,
      backgroundColor: colors.neutral100,
      borderRadius: radius.xl,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    pool: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "center",
    },
    chip: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      minHeight: touchTargets.min,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadow.soft,
    },
    chipGhost: {
      backgroundColor: colors.neutral200,
      borderColor: colors.neutral200,
      shadowOpacity: 0,
      elevation: 0,
    },
    chipText: {
      fontSize: typography.title.fontSize,
      fontWeight: "600",
      color: colors.text,
    },
  })
);
