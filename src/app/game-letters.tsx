import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { SpeakerButton } from "@/components/speaker-button";
import { useSfx } from "@/lib/audio";
import { useCourseContent } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";
import type { Word } from "@/lib/types";

const MAX_WRONG = 6;
const WIN_XP = 5;
const KEY_ROWS = ["ABCDEFGHIJ", "KLMNOPQRST", "UVWXYZ"];

/**
 * Dạng chữ dùng để đoán: tiếng Anh dùng chính tả của từ; tiếng Nhật/Trung
 * dùng romanization (romaji/pinyin) bỏ dấu thanh và khoảng trắng.
 */
function guessForm(word: Word): string | null {
  const raw = word.romanization ?? word.target;
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (cleaned.length < 3 || cleaned.length > 10) return null;
  return cleaned;
}

/** Game "Đoán chữ bí mật": nhìn emoji + nghĩa, đoán từng chữ cái của từ. */
export default function GameLettersScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const addBonusXp = useProgress((s) => s.addBonusXp);
  const { allWords } = useCourseContent(activeCourseId);
  const { playCorrect, playIncorrect, playFinish } = useSfx();

  const playable = useMemo(
    () =>
      [...new Map(allWords().map((w) => [w.target, w] as const)).values()]
        .map((w) => ({ word: w, form: guessForm(w) }))
        .filter((x): x is { word: Word; form: string } => x.form !== null),
    [allWords]
  );

  const [round, setRound] = useState(0);
  const current = useMemo(
    () => playable[Math.floor(Math.random() * playable.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playable, round]
  );
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const awardedRef = useRef(false);

  const form = current?.form ?? "";
  const won = form.length > 0 && [...form].every((ch) => guessed.has(ch));
  const lost = wrong >= MAX_WRONG;

  const restart = () => {
    setRound((r) => r + 1);
    setGuessed(new Set());
    setWrong(0);
    awardedRef.current = false;
  };

  const guess = (letter: string) => {
    if (won || lost || guessed.has(letter)) return;
    const next = new Set(guessed);
    next.add(letter);
    setGuessed(next);
    if (form.includes(letter)) {
      playCorrect();
      const done = [...form].every((ch) => next.has(ch));
      if (done && !awardedRef.current) {
        awardedRef.current = true;
        addBonusXp(WIN_XP);
        playFinish();
      }
    } else {
      playIncorrect();
      setWrong((w) => w + 1);
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
          🔤 Đoán chữ bí mật
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {!current ? (
          <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa có từ phù hợp để chơi.
          </Text>
        ) : (
          <>
            <View style={styles.heartsRow}>
              <Text style={styles.hearts} maxFontSizeMultiplier={1.2}>
                {"❤️".repeat(MAX_WRONG - wrong)}
                {"🤍".repeat(wrong)}
              </Text>
              <Text style={styles.heartsLabel} maxFontSizeMultiplier={1.2}>
                Còn {MAX_WRONG - wrong} lượt đoán sai
              </Text>
            </View>

            <View style={styles.wordCard}>
              <Text style={styles.bigEmoji}>{current.word.emoji}</Text>
              <Text style={styles.native} maxFontSizeMultiplier={1.3}>
                {current.word.native}
              </Text>
              <SpeakerButton text={current.word.target} size={48} />
            </View>

            <View style={styles.blanks}>
              {[...form].map((ch, i) => (
                <View key={i} style={styles.blank}>
                  <Text style={styles.blankLetter} maxFontSizeMultiplier={1.1}>
                    {guessed.has(ch) || lost ? ch.toUpperCase() : ""}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.formHint} maxFontSizeMultiplier={1.2}>
              {current.word.romanization
                ? `Đoán theo cách đọc: ${current.word.romanization}`
                : "Đoán theo chính tả của từ"}
            </Text>

            {won ? (
              <View style={styles.winBox}>
                <Text style={styles.resultText} maxFontSizeMultiplier={1.3}>
                  🎉 Đúng rồi! Từ bí mật là “{current.word.target}”
                  {current.word.romanization ? ` (${current.word.romanization})` : ""}.
                  Em được thưởng {WIN_XP} XP!
                </Text>
                <DuoButton label="Ván mới" onPress={restart} />
              </View>
            ) : lost ? (
              <View style={styles.loseBox}>
                <Text style={styles.resultText} maxFontSizeMultiplier={1.3}>
                  Hết lượt rồi! Từ bí mật là “{current.word.target}”
                  {current.word.romanization ? ` (${current.word.romanization})` : ""} —{" "}
                  {current.word.native}. Chơi lại nhé!
                </Text>
                <DuoButton label="Ván mới" onPress={restart} />
              </View>
            ) : (
              <View style={styles.keyboard}>
                {KEY_ROWS.map((row) => (
                  <View key={row} style={styles.keyRow}>
                    {[...row].map((letter) => {
                      const lower = letter.toLowerCase();
                      const used = guessed.has(lower);
                      const hit = used && form.includes(lower);
                      return (
                        <Pressable
                          key={letter}
                          onPress={() => guess(lower)}
                          disabled={used}
                          accessibilityRole="button"
                          accessibilityLabel={`Chữ ${letter}`}
                          accessibilityState={{ disabled: used }}
                          style={({ pressed }) => [
                            styles.key,
                            hit && styles.keyHit,
                            used && !hit && styles.keyMiss,
                            pressed && !used && { opacity: 0.8 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.keyText,
                              hit && { color: colors.correctText },
                              used && !hit && { color: colors.textMuted },
                            ]}
                            maxFontSizeMultiplier={1.1}
                          >
                            {letter}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
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
  intro: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  heartsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hearts: { fontSize: 16 },
  heartsLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  wordCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "14",
    borderRadius: radius.xl,
    padding: 16,
  },
  bigEmoji: { fontSize: 44 },
  native: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.neutral700 },
  blanks: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center" },
  blank: {
    width: 34,
    height: 44,
    borderBottomWidth: 4,
    borderBottomColor: colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
  },
  blankLetter: { fontSize: 24, fontWeight: "800", color: colors.neutral700 },
  formHint: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  keyboard: { gap: 8 },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  key: {
    minWidth: 31,
    paddingHorizontal: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.neutral300,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  keyHit: { backgroundColor: colors.correctBg, borderColor: colors.correctText },
  keyMiss: { backgroundColor: colors.neutral100, opacity: 0.6 },
  keyText: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
  winBox: {
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.amber + "1A",
    borderRadius: radius.xl,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  loseBox: {
    borderWidth: 2,
    borderColor: colors.wrongText,
    backgroundColor: colors.wrongBg,
    borderRadius: radius.xl,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  resultText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.neutral700,
    textAlign: "center",
    lineHeight: 22,
  },
}));
