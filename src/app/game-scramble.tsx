import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";

const ROUNDS = 5;
const XP_PER_SENTENCE = 2;

type SentenceItem = {
  prompt: string;
  answer: string[];
  tokens: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Game "Xếp câu cho đúng": bấm các từ theo đúng thứ tự để ghép thành câu. */
export default function GameScrambleScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const addBonusXp = useProgress((s) => s.addBonusXp);
  const { allLessons } = useCourseContent(activeCourseId);
  const { playCorrect, playIncorrect, playFinish } = useSfx();

  const pool = useMemo<SentenceItem[]>(() => {
    const items: SentenceItem[] = [];
    for (const ref of allLessons) {
      for (const ex of ref.lesson.exercises) {
        if (ex.type === "wordBank" && ex.direction === "nativeToTarget") {
          items.push({ prompt: ex.prompt, answer: ex.answer, tokens: ex.tokens });
        }
      }
    }
    return items;
  }, [allLessons]);

  const [round, setRound] = useState(0);
  const sentences = useMemo(
    () => shuffle(pool).slice(0, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, round]
  );
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const awardedRef = useRef(false);

  const current = sentences[index];
  const finished = index >= sentences.length || sentences.length === 0;
  const stars = score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setPlaced([]);
    setVerdict(null);
    setScore(0);
    awardedRef.current = false;
  };

  const finishGame = (finalScore: number) => {
    if (!awardedRef.current) {
      awardedRef.current = true;
      if (finalScore > 0) addBonusXp(finalScore * XP_PER_SENTENCE);
      playFinish();
    }
  };

  const check = () => {
    if (!current || verdict !== null) return;
    const built = placed.map((ti) => current.tokens[ti]);
    const ok =
      built.length === current.answer.length &&
      built.every((t, i) => t === current.answer[i]);
    setVerdict(ok);
    if (ok) {
      playCorrect();
      setScore((s) => s + 1);
    } else {
      playIncorrect();
    }
    const nextScore = score + (ok ? 1 : 0);
    setTimeout(() => {
      setPlaced([]);
      setVerdict(null);
      if (index + 1 >= sentences.length) finishGame(nextScore);
      setIndex((i) => i + 1);
    }, ok ? 900 : 2200);
  };

  const toggleToken = (tokenIndex: number) => {
    if (verdict !== null) return;
    setPlaced((prev) =>
      prev.includes(tokenIndex)
        ? prev.filter((t) => t !== tokenIndex)
        : [...prev, tokenIndex]
    );
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
          🧩 Xếp câu cho đúng
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {finished ? `${ROUNDS}/${ROUNDS}` : `${index + 1}/${ROUNDS}`} · ⭐ {score}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {sentences.length === 0 ? (
          <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa có câu mẫu để chơi. Hãy học vài bài trước nhé!
          </Text>
        ) : finished ? (
          <View style={styles.winBox}>
            <Text style={styles.winStars}>
              {"⭐".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </Text>
            <Text style={styles.winText} maxFontSizeMultiplier={1.3}>
              Em xếp đúng {score}/{sentences.length} câu và được thưởng{" "}
              {score * XP_PER_SENTENCE} XP 🎉
            </Text>
            <DuoButton label="Chơi lại" onPress={restart} />
          </View>
        ) : current ? (
          <>
            <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
              Dịch câu này bằng cách bấm các từ theo đúng thứ tự:
            </Text>
            <View style={styles.promptCard}>
              <Text style={styles.promptText} maxFontSizeMultiplier={1.3}>
                {current.prompt}
              </Text>
            </View>

            <View
              style={[
                styles.answerBox,
                verdict === true && styles.answerOk,
                verdict === false && styles.answerBad,
              ]}
            >
              {placed.length === 0 ? (
                <Text style={styles.answerPlaceholder} maxFontSizeMultiplier={1.3}>
                  Bấm các từ ở dưới để xếp câu…
                </Text>
              ) : (
                <View style={styles.tokenRow}>
                  {placed.map((ti) => (
                    <Pressable
                      key={ti}
                      onPress={() => toggleToken(ti)}
                      accessibilityRole="button"
                      accessibilityLabel={`Bỏ từ ${current.tokens[ti]}`}
                      style={styles.tokenPlaced}
                    >
                      <Text style={styles.tokenPlacedText} maxFontSizeMultiplier={1.2}>
                        {current.tokens[ti]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            {verdict === false ? (
              <Text style={styles.correctHint} maxFontSizeMultiplier={1.3}>
                Câu đúng là: {current.answer.join(" ")}
              </Text>
            ) : null}
            {verdict === true ? (
              <Text style={styles.correctHint} maxFontSizeMultiplier={1.3}>
                Đúng rồi! 🎉
              </Text>
            ) : null}

            <View style={styles.tokenRow}>
              {current.tokens.map((token, ti) =>
                placed.includes(ti) ? null : (
                  <Pressable
                    key={ti}
                    onPress={() => toggleToken(ti)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn từ ${token}`}
                    style={({ pressed }) => [styles.token, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.tokenText} maxFontSizeMultiplier={1.2}>
                      {token}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <DuoButton
              label="Kiểm tra"
              disabled={placed.length !== current.answer.length || verdict !== null}
              onPress={check}
            />
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
  badge: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 13, fontWeight: "800", color: colors.neutral700 },
  body: { padding: 20, gap: 16, paddingBottom: 60 },
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  promptCard: {
    borderWidth: 2,
    borderColor: colors.indigo,
    backgroundColor: colors.indigo + "14",
    borderRadius: radius.xl,
    padding: 16,
  },
  promptText: { fontSize: 19, fontWeight: "800", color: colors.neutral700, lineHeight: 26 },
  answerBox: {
    minHeight: 64,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.neutral300,
    borderRadius: radius.lg,
    padding: 10,
    justifyContent: "center",
  },
  answerOk: { borderColor: colors.correctText, backgroundColor: colors.correctBg },
  answerBad: { borderColor: colors.wrongText, backgroundColor: colors.wrongBg },
  answerPlaceholder: { fontSize: 14, color: colors.textMuted },
  correctHint: { fontSize: 15, fontWeight: "700", color: colors.neutral700 },
  tokenRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  token: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral300,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tokenText: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
  tokenPlaced: {
    backgroundColor: colors.sky,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tokenPlacedText: { fontSize: 16, fontWeight: "800", color: colors.white },
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
