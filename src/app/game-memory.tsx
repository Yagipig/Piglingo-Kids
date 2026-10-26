import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { speakTarget, useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";
import type { Word } from "@/lib/types";

const PAIRS = 6;
const WIN_XP = 10;

type Card = {
  key: string;
  word: Word;
  kind: "target" | "native";
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(words: Word[]): Card[] {
  const picked = shuffle(words).slice(0, PAIRS);
  return shuffle(
    picked.flatMap<Card>((w) => [
      { key: `${w.target}:t`, word: w, kind: "target" },
      { key: `${w.target}:n`, word: w, kind: "native" },
    ])
  );
}

/** Game "Ghép thẻ trí nhớ": lật 2 thẻ, ghép chữ với nghĩa + emoji của nó. */
export default function GameMemoryScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const addBonusXp = useProgress((s) => s.addBonusXp);
  const { allWords } = useCourseContent(activeCourseId);
  const { playCorrect, playFinish } = useSfx();

  const uniqueWords = useMemo(
    () => [...new Map(allWords().map((w) => [w.target, w] as const)).values()],
    [allWords]
  );

  const [round, setRound] = useState(0);
  const deck = useMemo(
    () => buildDeck(uniqueWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniqueWords, round]
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const awardedRef = useRef(false);

  const won = matched.size === PAIRS;
  const stars = won ? (moves <= 8 ? 3 : moves <= 11 ? 2 : 1) : 0;

  const restart = () => {
    setRound((r) => r + 1);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
    awardedRef.current = false;
  };

  const flip = (card: Card) => {
    if (locked || won) return;
    if (flipped.includes(card.key) || matched.has(card.word.target)) return;
    if (card.kind === "target") speakTarget(activeCourseId, card.word.target);
    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next
      .map((k) => deck.find((c) => c.key === k))
      .filter((c): c is Card => !!c);
    if (a && b && a.word.target === b.word.target) {
      playCorrect();
      const nextMatched = new Set(matched);
      nextMatched.add(a.word.target);
      setMatched(nextMatched);
      setFlipped([]);
      if (nextMatched.size === PAIRS && !awardedRef.current) {
        awardedRef.current = true;
        addBonusXp(WIN_XP);
        playFinish();
      }
    } else {
      setLocked(true);
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 850);
    }
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
          🧠 Ghép thẻ trí nhớ
        </Text>
        <View style={styles.moveBadge}>
          <Text style={styles.moveText} maxFontSizeMultiplier={1.2}>
            Lượt: {moves}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
          Lật 2 thẻ để ghép chữ với nghĩa của nó. Ghép đúng cả {PAIRS} cặp là
          thắng!
        </Text>

        <View style={styles.grid}>
          {deck.map((card) => {
            const isUp = flipped.includes(card.key) || matched.has(card.word.target);
            const isMatched = matched.has(card.word.target);
            return (
              <Pressable
                key={card.key}
                onPress={() => flip(card)}
                accessibilityRole="button"
                accessibilityLabel={
                  isUp
                    ? card.kind === "target"
                      ? `Thẻ chữ ${card.word.target}`
                      : `Thẻ nghĩa ${card.word.native}`
                    : "Thẻ úp, bấm để lật"
                }
                style={({ pressed }) => [
                  styles.card,
                  isUp ? styles.cardUp : styles.cardDown,
                  isMatched && styles.cardMatched,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {isUp ? (
                  card.kind === "target" ? (
                    <>
                      <Text style={styles.cardTarget} maxFontSizeMultiplier={1.1}>
                        {card.word.target}
                      </Text>
                      {card.word.romanization ? (
                        <Text style={styles.cardRoman} maxFontSizeMultiplier={1.1}>
                          {card.word.romanization}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Text style={styles.cardEmoji}>{card.word.emoji}</Text>
                      <Text style={styles.cardNative} maxFontSizeMultiplier={1.1}>
                        {card.word.native}
                      </Text>
                    </>
                  )
                ) : (
                  <Text style={styles.cardBack}>🐷</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {won ? (
          <View style={styles.winBox}>
            <Text style={styles.winStars}>
              {"⭐".repeat(stars)}
              {"☆".repeat(3 - stars)}
            </Text>
            <Text style={styles.winText} maxFontSizeMultiplier={1.3}>
              Thắng rồi! Em ghép đúng {PAIRS} cặp trong {moves} lượt và được
              thưởng {WIN_XP} XP 🎉
            </Text>
            <DuoButton label="Chơi lại" onPress={restart} />
          </View>
        ) : (
          <DuoButton label="Chơi lại từ đầu" variant="white" onPress={restart} />
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
  moveBadge: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moveText: { fontSize: 13, fontWeight: "800", color: colors.neutral700 },
  body: { padding: 20, gap: 16, paddingBottom: 60 },
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  card: {
    width: "30%",
    minWidth: 96,
    height: 108,
    borderRadius: radius.lg,
    borderBottomWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    gap: 2,
  },
  cardDown: { backgroundColor: colors.indigo, borderColor: colors.indigoDark },
  cardUp: { backgroundColor: colors.surface, borderColor: colors.neutral300, borderWidth: 2 },
  cardMatched: { backgroundColor: colors.correctBg, borderColor: colors.correctText },
  cardBack: { fontSize: 34 },
  cardEmoji: { fontSize: 32 },
  cardTarget: { fontSize: 17, fontWeight: "800", color: colors.neutral700, textAlign: "center" },
  cardRoman: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  cardNative: { fontSize: 14, fontWeight: "700", color: colors.neutral700, textAlign: "center" },
  winBox: {
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  winStars: { fontSize: 30 },
  winText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.neutral700,
    textAlign: "center",
    lineHeight: 21,
  },
}));
