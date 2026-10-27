import React, { useEffect } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { SpeakerButton } from "@/components/speaker-button";
import { speakTarget } from "@/lib/audio";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useResolvedScheme, useThemeColors } from "@/lib/theme";
import type { TypeAnswerExercise } from "@/lib/types";

type TypeAnswerProps = {
  exercise: TypeAnswerExercise;
  answer: string;
  onAnswer: (text: string) => void;
  status: "none" | "correct" | "wrong";
  targetLanguage: string;
};

export function TypeAnswer({
  exercise,
  answer,
  onAnswer,
  status,
  targetLanguage,
}: TypeAnswerProps) {
  const courseId = useProgress((s) => s.activeCourseId);
  const colors = useThemeColors();
  const styles = useStyles();
  const scheme = useResolvedScheme();
  const isListen = exercise.mode === "listen";

  useEffect(() => {
    if (isListen && exercise.audioTarget) speakTarget(courseId, exercise.audioTarget);
  }, [courseId, exercise.id, isListen, exercise.audioTarget]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        ✏️ {isListen ? `Gõ từ em nghe được (${targetLanguage})` : "Viết từ này bằng tiếng Anh"}
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

      <TextInput
        value={answer}
        onChangeText={onAnswer}
        editable={status === "none"}
        placeholder={isListen ? `Gõ bằng ${targetLanguage}` : "Gõ bằng tiếng Anh"}
        placeholderTextColor={colors.neutral400}
        accessibilityLabel={isListen ? `Gõ bằng ${targetLanguage}` : "Gõ bằng tiếng Anh"}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance={scheme}
        multiline
        style={[
          styles.input,
          status === "correct" && { borderColor: colors.greenLight },
          status === "wrong" && { borderColor: colors.rose },
        ]}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    container: { gap: 20 },
    title: { fontSize: 24, fontWeight: "800", color: colors.neutral700 },
    promptRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    prompt: { fontSize: 20, fontWeight: "700", color: colors.text, flexShrink: 1 },
    input: {
      minHeight: 110,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      backgroundColor: colors.neutral100,
      padding: 16,
      fontSize: 18,
      color: colors.text,
      textAlignVertical: "top",
    },
  })
);
