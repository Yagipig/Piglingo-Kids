import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { SpeakerButton } from "@/components/speaker-button";
import { speakTarget, useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";
import type { Word } from "@/lib/types";

const QUESTIONS = 10;
const OPTIONS = 4;

type Question = {
  target: Word;
  options: Word[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(words: Word[]): Question[] {
  const targets = shuffle(words).slice(0, QUESTIONS);
  return targets.map((target) => {
    const distractors = shuffle(words.filter((w) => w.target !== target.target)).slice(
      0,
      OPTIONS - 1
    );
    return { target, options: shuffle([target, ...distractors]) };
  });
}

/** Game "Nghe và chọn": nghe phát âm một từ rồi chọn đúng nghĩa tiếng Việt. */
export default function GameListenScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const addBonusXp = useProgress((s) => s.addBonusXp);
  const { allWords } = useCourseContent(activeCourseId);
  const { playCorrect, playIncorrect, playFinish } = useSfx();

  const uniqueWords = useMemo(
    () => [...new Map(allWords().map((w) => [w.target, w] as const)).values()],
    [allWords]
  );

  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => buildQuestions(uniqueWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniqueWords, round]
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const awardedRef = useRef(false);

  const finished = index >= questions.length;
  const question = questions[index];
  const stars = score >= 9 ? 3 : score >= 7 ? 2 : score >= 1 ? 1 : 0;

  // Tự phát âm từ của câu mới (và câu đầu tiên khi vào game).
  useEffect(() => {
    if (!finished && question) {
      const t = setTimeout(() => speakTarget(activeCourseId, question.target.target), 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [activeCourseId, finished, question]);

  useEffect(() => {
    if (finished && !awardedRef.current) {
      awardedRef.current = true;
      if (score > 0) addBonusXp(score);
      playFinish();
    }
  }, [addBonusXp, finished, playFinish, score]);

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
    awardedRef.current = false;
  };

  const pick = (word: Word) => {
    if (picked || !question) return;
    setPicked(word.target);
    if (word.target === question.target.target) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playIncorrect();
    }
    setTimeout(() => {
      setPicked(null);
      setIndex((i) => i + 1);
    }, 950);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.neutral700} />
        </Pressable>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          🎧 Nghe và chọn
        </Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText} maxFontSizeMultiplier={1.2}>
            {finished ? `${QUESTIONS}/${QUESTIONS}` : `${index + 1}/${QUESTIONS}`} · ⭐ {score}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {finished ? (
          <View style={styles.winBox}>
            <Text style={styles.winStars}>
              {"⭐".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </Text>
            <Text style={styles.winText} maxFontSizeMultiplier={1.3}>
              Em nghe đúng {score}/{QUESTIONS} câu và được thưởng {score} XP 🎉
            </Text>
            <DuoButton label="Chơi lại" onPress={restart} />
          </View>
        ) : question ? (
          <>
            <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
              Nghe thật kỹ rồi chọn nghĩa đúng nhé!
            </Text>
            <View style={styles.listenBox}>
              <SpeakerButton text={question.target.target} size={76} />
              <Text style={styles.listenHint} maxFontSizeMultiplier={1.3}>
                Bấm loa để nghe lại 🔊
              </Text>
              {question.target.romanization ? (
                <Text style={styles.roman} maxFontSizeMultiplier={1.3}>
                  {question.target.romanization}
                </Text>
              ) : null}
            </View>
            <View style={styles.options}>
              {question.options.map((word) => {
                const isCorrect = word.target === question.target.target;
                const isPicked = picked === word.target;
                return (
                  <Pressable
                    key={word.target}
                    onPress={() => pick(word)}
                    accessibilityRole="button"
                    accessibilityLabel={`${word.emoji} ${word.native}`}
                    accessibilityState={{ disabled: !!picked }}
                    style={({ pressed }) => [
                      styles.option,
                      picked && isCorrect && styles.optionCorrect,
                      picked && isPicked && !isCorrect && styles.optionWrong,
                      pressed && !picked && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.optionEmoji}>{word.emoji}</Text>
                    <Text style={styles.optionText} maxFontSizeMultiplier={1.3}>
                      {word.native}
                    </Text>
                    {picked && isCorrect ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.correctText} />
                    ) : picked && isPicked ? (
                      <Ionicons name="close-circle" size={24} color={colors.wrongText} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: { padding: 6 },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.neutral700 },
  progressBadge: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressText: { fontSize: 13, fontWeight: "800", color: colors.neutral700 },
  body: { padding: 20, gap: 18, paddingBottom: 60 },
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  listenBox: {
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: colors.selectedBg,
    borderRadius: radius.xl,
    padding: 22,
  },
  listenHint: { fontSize: 14, fontWeight: "700", color: colors.selectedText },
  roman: { fontSize: 15, color: colors.textMuted, fontStyle: "italic" },
  options: { gap: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.surface,
  },
  optionCorrect: { backgroundColor: colors.correctBg, borderColor: colors.correctText },
  optionWrong: { backgroundColor: colors.wrongBg, borderColor: colors.wrongText },
  optionEmoji: { fontSize: 30 },
  optionText: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.neutral700 },
  winBox: {
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 22,
    gap: 12,
    alignItems: "center",
  },
  winStars: { fontSize: 34 },
  winText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.neutral700,
    textAlign: "center",
    lineHeight: 22,
  },
}));
