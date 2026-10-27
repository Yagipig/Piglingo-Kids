import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { makeThemedStyles, radius } from "@/lib/theme";
import type { FillBlankExercise } from "@/lib/types";

import { OptionCard, type OptionState } from "./option-card";

type FillBlankProps = {
  exercise: FillBlankExercise;
  answer: number | null;
  onAnswer: (index: number) => void;
  status: "none" | "correct" | "wrong";
};

export function ensureBlank(sentence: string, correctOption?: string): string {
  if (sentence.includes("___")) return sentence;
  if (!correctOption) return sentence;
  const cleanOption = correctOption
    .replace(/[.,!?¿¡;:"'’‘“”`、。！？]/g, "")
    .toLowerCase();
  const words = sentence.split(/\s+/);
  const idx = words.findIndex(
    (w) =>
      w.replace(/[.,!?¿¡;:"'’‘“”`、。！？]/g, "").toLowerCase() === cleanOption
  );
  if (idx !== -1) {
    const token = words[idx];
    const trailingPunct = token.match(/[.,!?¿¡;:"'’‘“”`、。！？]+$/)?.[0] ?? "";
    words[idx] = `___${trailingPunct}`;
    return words.join(" ");
  }
  return sentence;
}

export function FillBlank({ exercise, answer, onAnswer, status }: FillBlankProps) {
  const styles = useStyles();
  const baseSentence = ensureBlank(exercise.sentence, exercise.options[exercise.correct]);
  const filled =
    answer !== null
      ? baseSentence.replace("___", exercise.options[answer])
      : baseSentence;

  const optionState = (index: number): OptionState => {
    if (status === "none") return answer === index ? "selected" : "idle";
    if (index === exercise.correct) return "correct";
    if (answer === index) return "wrong";
    return "idle";
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        Điền vào chỗ trống
      </Text>
      <View style={styles.bubble}>
        <Text
          style={styles.sentence}
          accessibilityLabel={filled.replace("___", "blank")}
          maxFontSizeMultiplier={1.3}
        >
          {filled}
        </Text>
        <View style={styles.bubbleTail} />
      </View>
      <Text style={styles.translation} maxFontSizeMultiplier={1.3}>
        {exercise.translation}
      </Text>

      <View style={styles.options}>
        {exercise.options.map((option, index) => (
          <OptionCard
            key={option + index}
            text={option}
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
    container: { gap: 16 },
    title: { fontSize: 24, fontWeight: "800", color: colors.neutral700 },
    bubble: {
      backgroundColor: colors.selectedBg,
      borderRadius: radius.xl,
      padding: 16,
      alignSelf: "flex-start",
      maxWidth: "100%",
    },
    bubbleTail: {
      position: "absolute",
      bottom: -8,
      left: 28,
      width: 18,
      height: 18,
      backgroundColor: colors.selectedBg,
      transform: [{ rotate: "45deg" }],
      borderBottomRightRadius: 4,
    },
    sentence: { fontSize: 22, fontWeight: "700", color: colors.text },
    translation: { fontSize: 15, color: colors.textMuted },
    options: { gap: 10, marginTop: 8 },
  })
);
