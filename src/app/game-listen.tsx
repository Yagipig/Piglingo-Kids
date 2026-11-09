import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { OptionCard, type OptionState } from "@/components/exercises/option-card";
import { GameBadge, GameHeader, WinCard } from "@/components/game-ui";
import { SpeakerButton } from "@/components/speaker-button";
import { Card } from "@/components/ui";
import { speakTarget, useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, useThemeColors } from "@/lib/theme";
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
      <GameHeader
        title="🎧 Nghe và chọn"
        right={
          <GameBadge
            text={`${finished ? `${QUESTIONS}/${QUESTIONS}` : `${index + 1}/${QUESTIONS}`} · ⭐ ${score}`}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.body}>
        {finished ? (
          <WinCard>
            <Text style={styles.winStars}>
              {"⭐".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </Text>
            <Text style={styles.winText} maxFontSizeMultiplier={1.3}>
              Em nghe đúng {score}/{QUESTIONS} câu và được thưởng {score} XP 🎉
            </Text>
            <DuoButton label="Chơi lại" onPress={restart} />
          </WinCard>
        ) : question ? (
          <>
            <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
              Nghe thật kỹ rồi chọn nghĩa đúng nhé!
            </Text>
            <Card accentColor={colors.sky} style={styles.listenBox}>
              <SpeakerButton text={question.target.target} size={76} />
              <Text style={styles.listenHint} maxFontSizeMultiplier={1.3}>
                Bấm loa để nghe lại 🔊
              </Text>
              {question.target.romanization ? (
                <Text style={styles.roman} maxFontSizeMultiplier={1.3}>
                  {question.target.romanization}
                </Text>
              ) : null}
            </Card>
            <View style={styles.options}>
              {question.options.map((word) => {
                const isCorrect = word.target === question.target.target;
                const isPicked = picked === word.target;
                const state: OptionState = !picked
                  ? "idle"
                  : isCorrect
                    ? "correct"
                    : isPicked
                      ? "wrong"
                      : "idle";
                return (
                  <OptionCard
                    key={word.target}
                    text={word.native}
                    emoji={word.emoji}
                    state={state}
                    disabled={!!picked}
                    onPress={() => pick(word)}
                  />
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
  body: { padding: 20, gap: 18, paddingBottom: 60 },
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  listenBox: {
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.selectedBg,
    padding: 22,
  },
  listenHint: { fontSize: 14, fontWeight: "700", color: colors.selectedText },
  roman: { fontSize: 15, color: colors.textMuted, fontStyle: "italic" },
  options: { gap: 12 },
  winStars: { fontSize: 34 },
  winText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.neutral700,
    textAlign: "center",
    lineHeight: 22,
  },
}));
