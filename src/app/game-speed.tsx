import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { speakTarget, useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";
import type { Word } from "@/lib/types";

const GAME_SECONDS = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(words: Word[], avoidTarget?: string): { target: Word; options: Word[] } {
  let target = words[Math.floor(Math.random() * words.length)];
  if (avoidTarget && words.length > 1) {
    while (target.target === avoidTarget) {
      target = words[Math.floor(Math.random() * words.length)];
    }
  }
  const distractors = shuffle(words.filter((w) => w.target !== target.target)).slice(0, 3);
  return { target, options: shuffle([target, ...distractors]) };
}

type Phase = "idle" | "playing" | "done";

/** Game "Đố nhanh 60 giây": trả lời đúng càng nhiều câu càng thắng. */
export default function GameSpeedScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const addBonusXp = useProgress((s) => s.addBonusXp);
  const speedBest = useProgress((s) => s.speedBest);
  const recordSpeedScore = useProgress((s) => s.recordSpeedScore);
  const { allWords } = useCourseContent(activeCourseId);
  const { playCorrect, playIncorrect, playFinish } = useSfx();

  const uniqueWords = useMemo(
    () => [...new Map(allWords().map((w) => [w.target, w] as const)).values()],
    [allWords]
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [question, setQuestion] = useState(() => makeQuestion(uniqueWords));
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [flash, setFlash] = useState<null | boolean>(null);
  const endAtRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    endAtRef.current = Date.now() + GAME_SECONDS * 1000;
    const timer = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) {
        clearInterval(timer);
        setPhase("done");
      }
    }, 200);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "done" && !settledRef.current) {
      settledRef.current = true;
      recordSpeedScore(correct);
      if (correct > 0) addBonusXp(correct);
      playFinish();
    }
  }, [phase, correct, addBonusXp, playFinish, recordSpeedScore]);

  const start = () => {
    settledRef.current = false;
    setCorrect(0);
    setAnswered(0);
    setFlash(null);
    setTimeLeft(GAME_SECONDS);
    setQuestion(makeQuestion(uniqueWords));
    setPhase("playing");
  };

  const answer = (word: Word) => {
    if (phase !== "playing") return;
    const ok = word.target === question.target.target;
    if (ok) {
      setCorrect((c) => c + 1);
      playCorrect();
    } else {
      playIncorrect();
    }
    setAnswered((a) => a + 1);
    setFlash(ok);
    setTimeout(() => setFlash(null), 220);
    setQuestion(makeQuestion(uniqueWords, question.target.target));
  };

  const isNewBest = phase === "done" && correct > 0 && correct >= speedBest;

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
          ⚡ Đố nhanh 60 giây
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {phase === "idle" ? (
          <View style={styles.centerBox}>
            <Text style={styles.bigEmoji}>⚡</Text>
            <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
              Trong 60 giây, chọn nghĩa đúng của từ càng nhanh càng tốt. Mỗi
              câu đúng được 1 XP!
            </Text>
            <Text style={styles.bestText} maxFontSizeMultiplier={1.3}>
              🏆 Kỷ lục của em: {speedBest} câu đúng
            </Text>
            <DuoButton label="Bắt đầu" onPress={start} />
          </View>
        ) : phase === "done" ? (
          <View style={styles.winBox}>
            <Text style={styles.bigEmoji}>🏁</Text>
            <Text style={styles.winText} maxFontSizeMultiplier={1.3}>
              Hết giờ! Em trả lời đúng {correct}/{answered} câu và được thưởng{" "}
              {correct} XP 🎉
            </Text>
            <Text style={styles.bestText} maxFontSizeMultiplier={1.3}>
              {isNewBest
                ? "🌟 Kỷ lục mới! Giỏi quá!"
                : `🏆 Kỷ lục: ${speedBest} câu đúng`}
            </Text>
            <DuoButton label="Chơi lại" onPress={start} />
          </View>
        ) : (
          <>
            <View style={styles.hudRow}>
              <View
                style={[
                  styles.timeBadge,
                  timeLeft <= 10 && { backgroundColor: colors.wrongBg },
                ]}
              >
                <Text style={styles.timeText} maxFontSizeMultiplier={1.2}>
                  ⏱ {timeLeft}s
                </Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText} maxFontSizeMultiplier={1.2}>
                  ⭐ Đúng: {correct}
                </Text>
              </View>
            </View>
            <View style={styles.timeTrack}>
              <View
                style={[
                  styles.timeFill,
                  {
                    width: `${(timeLeft / GAME_SECONDS) * 100}%`,
                    backgroundColor: timeLeft <= 10 ? colors.rose : colors.green,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={() => speakTarget(activeCourseId, question.target.target)}
              accessibilityRole="button"
              accessibilityLabel={`Nghe và xem từ ${question.target.target}`}
              style={[
                styles.wordCard,
                flash === true && styles.wordOk,
                flash === false && styles.wordBad,
              ]}
            >
              <Text style={styles.wordEmoji}>{question.target.emoji}</Text>
              <Text style={styles.wordTarget} maxFontSizeMultiplier={1.2}>
                {question.target.target}
              </Text>
              {question.target.romanization ? (
                <Text style={styles.wordRoman} maxFontSizeMultiplier={1.2}>
                  {question.target.romanization}
                </Text>
              ) : null}
              <Text style={styles.wordHint} maxFontSizeMultiplier={1.2}>
                🔊 Bấm để nghe
              </Text>
            </Pressable>

            <View style={styles.options}>
              {question.options.map((word) => (
                <Pressable
                  key={word.target}
                  onPress={() => answer(word)}
                  accessibilityRole="button"
                  accessibilityLabel={word.native}
                  style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.optionText} maxFontSizeMultiplier={1.3}>
                    {word.native}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
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
  body: { padding: 20, gap: 16, paddingBottom: 60 },
  centerBox: { gap: 14, alignItems: "center", paddingTop: 30 },
  bigEmoji: { fontSize: 54, textAlign: "center" },
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 22, textAlign: "center" },
  bestText: { fontSize: 15, fontWeight: "800", color: colors.amber },
  hudRow: { flexDirection: "row", justifyContent: "space-between" },
  timeBadge: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  timeText: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
  timeTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  timeFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.green },
  wordCard: {
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: colors.selectedBg,
    borderRadius: radius.xl,
    padding: 20,
  },
  wordOk: { borderColor: colors.correctText, backgroundColor: colors.correctBg },
  wordBad: { borderColor: colors.wrongText, backgroundColor: colors.wrongBg },
  wordEmoji: { fontSize: 44 },
  wordTarget: { fontSize: 26, fontWeight: "800", color: colors.neutral700 },
  wordRoman: { fontSize: 14, color: colors.textMuted, fontStyle: "italic" },
  wordHint: { fontSize: 12, color: colors.selectedText, fontWeight: "700" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  option: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderBottomWidth: 4,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  optionText: { fontSize: 17, fontWeight: "800", color: colors.neutral700, textAlign: "center" },
  winBox: {
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 22,
    gap: 12,
    alignItems: "center",
  },
  winText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.neutral700,
    textAlign: "center",
    lineHeight: 22,
  },
}));
