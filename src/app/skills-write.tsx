import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Svg, Path } from "react-native-svg";

import { DuoButton } from "@/components/duo-button";
import { OptionCard, type OptionState } from "@/components/exercises/option-card";
import { SpeakerButton } from "@/components/speaker-button";
import { Card } from "@/components/ui";
import {
  SkillFeedbackBar,
  SkillFrame,
  SkillPetCheer,
  SkillResultCard,
  useSkillPool,
  type SkillFeedback,
} from "@/components/skills-ui";
import { useSfx } from "@/lib/audio";
import {
  SKILL_XP,
  SKILL_XP_PERFECT_BONUS,
  buildWriteSession,
  skillMulberry32,
  skillRngFor,
  skillSeedFrom,
  type WriteActivity,
} from "@/lib/skills";
import { strokeAttribution } from "@/lib/strokes";
import { useProgress } from "@/lib/store";
import {
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  typography,
  useThemeColors,
} from "@/lib/theme";

type AnswerFn = (correct: boolean, detail?: string) => void;

/**
 * Buổi LUYỆN VIẾT (/skills-write): 5 hoạt động — xếp thẻ từ thành câu
 * mẫu đúng; điền chữ cái còn thiếu (Anh: chính tả) / chọn chữ còn
 * thiếu (Trung/Nhật); TẬP THỨ TỰ NÉT bằng dữ liệu THẬT (Hanzi Writer
 * cho tiếng Trung, KanjiVG cho tiếng Nhật — xem lib/strokes.ts): xem
 * nét chạy mẫu rồi chọn "nét tiếp theo" từ 3 hình nét ứng viên.
 */
export default function SkillsWriteScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { courseId, pool, tokens } = useSkillPool();
  const completeSkillSession = useProgress((s) => s.completeSkillSession);
  const { playFinish } = useSfx();
  const accent = tokens?.primary ?? colors.sky;

  const [attempt, setAttempt] = useState(0);
  const session = useMemo(
    () => buildWriteSession(pool, skillRngFor({ courseId, skill: "write", attempt })),
    [pool, courseId, attempt]
  );
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<SkillFeedback | null>(null);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const awardedRef = useRef(false);

  const activity: WriteActivity | undefined = session[index];
  const finished = index >= session.length;
  const correctCount = results.filter(Boolean).length;
  const perfect = finished && results.length > 0 && results.every(Boolean);
  const attribution = strokeAttribution(courseId);

  useEffect(() => {
    if (finished && !awardedRef.current && session.length > 0) {
      awardedRef.current = true;
      completeSkillSession(results.every(Boolean));
      playFinish();
    }
  }, [completeSkillSession, finished, playFinish, results, session.length]);

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setResults([]);
    setFeedback(null);
    setDetail(undefined);
    awardedRef.current = false;
  };

  const answer: AnswerFn = (correct, detailText) => {
    setResults((r) => [...r, correct]);
    setFeedback({ kind: correct ? "correct" : "wrong", nonce: index + 1 });
    setDetail(detailText);
  };

  const next = () => {
    setFeedback(null);
    setDetail(undefined);
    setIndex((i) => i + 1);
  };

  return (
    <SkillFrame
      title="✍️ Luyện Viết"
      badgeText={
        finished
          ? `${session.length}/${session.length}`
          : `${Math.min(index + 1, session.length)}/${session.length}`
      }
      progress={session.length ? results.length / session.length : 0}
      accentColor={accent}
      footer={
        <SkillFeedbackBar
          feedback={finished ? null : feedback}
          detail={detail}
          onContinue={next}
        />
      }
    >
      {finished ? (
        <SkillResultCard
          headline="Buổi viết hoàn thành!"
          detail={`Bé làm đúng ${correctCount}/${session.length} hoạt động viết.`}
          xpEarned={SKILL_XP + (perfect ? SKILL_XP_PERFECT_BONUS : 0)}
          perfect={perfect}
          onAgain={restart}
        />
      ) : activity ? (
        <>
          <SkillPetCheer feedback={feedback} />
          {activity.kind === "unscramble" ? (
            <UnscrambleActivity key={index} activity={activity} accent={accent} answered={feedback !== null} onAnswer={answer} />
          ) : activity.kind === "spell" ? (
            <SpellActivity key={index} activity={activity} accent={accent} answered={feedback !== null} onAnswer={answer} />
          ) : activity.kind === "gap-char" ? (
            <GapCharActivity key={index} activity={activity} accent={accent} answered={feedback !== null} onAnswer={answer} />
          ) : activity.kind === "stroke" ? (
            <StrokeActivity key={index} activity={activity} accent={accent} answered={feedback !== null} onAnswer={answer} />
          ) : (
            <CharOrderActivity key={index} activity={activity} accent={accent} answered={feedback !== null} onAnswer={answer} />
          )}
          {attribution ? (
            <Text style={styles.attribution} maxFontSizeMultiplier={1.2}>
              {attribution}
            </Text>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.3}>
            Khóa học này chưa đủ nội dung để luyện viết. Bé học thêm vài bài trên
            bản đồ rồi quay lại nhé!
          </Text>
        </Card>
      )}
    </SkillFrame>
  );
}

/* ============================ Xếp câu từ thẻ từ ============================ */

function UnscrambleActivity({
  activity,
  accent,
  answered,
  onAnswer,
}: {
  activity: Extract<WriteActivity, { kind: "unscramble" }>;
  accent: string;
  answered: boolean;
  onAnswer: AnswerFn;
}) {
  const styles = useStyles();
  const { playCorrect, playIncorrect } = useSfx();
  const [placed, setPlaced] = useState<number[]>([]);
  const usedSet = new Set(placed);
  const allPlaced = placed.length === activity.tokens.length;

  const check = () => {
    const built = placed.map((i) => activity.shuffled[i]).join(" ");
    const correct = built === activity.tokens.join(" ");
    if (correct) playCorrect();
    else playIncorrect();
    onAnswer(
      correct,
      `Câu đúng: "${activity.sentence.target}" — ${activity.sentence.native}`
    );
  };

  return (
    <>
      <Card accentColor={accent} style={styles.promptCard}>
        <Text style={styles.promptTitle} maxFontSizeMultiplier={1.3}>
          Xếp các thẻ từ thành câu đúng nhé!
        </Text>
        <Text style={styles.promptNative} maxFontSizeMultiplier={1.3}>
          Nghĩa: {activity.sentence.native}
        </Text>
        <View style={styles.answerRow}>
          {placed.length === 0 ? (
            <Text style={styles.answerPlaceholder}>Chạm vào các thẻ ở dưới…</Text>
          ) : (
            placed.map((bankIdx, pos) => (
              <Pressable
                key={`${bankIdx}-${pos}`}
                disabled={answered}
                onPress={() => setPlaced((p) => p.filter((_, i) => i !== pos))}
                style={[styles.tokenChip, styles.tokenPlaced]}
                accessibilityRole="button"
                accessibilityLabel={`Bỏ thẻ ${activity.shuffled[bankIdx]}`}
              >
                <Text style={styles.tokenText}>{activity.shuffled[bankIdx]}</Text>
              </Pressable>
            ))
          )}
        </View>
      </Card>
      <View style={styles.bankRow}>
        {activity.shuffled.map((token, i) =>
          usedSet.has(i) ? (
            <View key={`${token}-${i}`} style={[styles.tokenChip, styles.tokenGhost]}>
              <Text style={[styles.tokenText, styles.tokenGhostText]}>{token}</Text>
            </View>
          ) : (
            <Pressable
              key={`${token}-${i}`}
              disabled={answered}
              onPress={() => setPlaced((p) => [...p, i])}
              style={styles.tokenChip}
              accessibilityRole="button"
              accessibilityLabel={`Chọn thẻ ${token}`}
            >
              <Text style={styles.tokenText}>{token}</Text>
            </Pressable>
          )
        )}
      </View>
      {!answered ? (
        <DuoButton
          label="Kiểm tra"
          variant={allPlaced ? "secondary" : "locked"}
          disabled={!allPlaced}
          onPress={check}
        />
      ) : (
        <View style={styles.speakerRow}>
          <SpeakerButton text={activity.sentence.target} size={48} />
          <Text style={styles.speakerHint}>Nghe lại câu đúng</Text>
        </View>
      )}
    </>
  );
}

/* ============================ Điền chữ cái (Anh) ============================ */

function SpellActivity({
  activity,
  accent,
  answered,
  onAnswer,
}: {
  activity: Extract<WriteActivity, { kind: "spell" }>;
  accent: string;
  answered: boolean;
  onAnswer: AnswerFn;
}) {
  const styles = useStyles();
  const { playCorrect, playIncorrect } = useSfx();
  const [entries, setEntries] = useState<string[]>([]);
  const [usedBank, setUsedBank] = useState<Set<number>>(new Set());
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;
    if (entries.length === activity.missing.length && entries.length > 0) {
      resolvedRef.current = true;
      const correct = entries.join("") === activity.missing.join("");
      if (correct) playCorrect();
      else playIncorrect();
      onAnswer(
        correct,
        `"${activity.word.word.target}" ${activity.word.word.emoji} nghĩa là "${activity.word.word.native}".`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  let blankSeen = 0;
  return (
    <>
      <Card accentColor={accent} style={styles.promptCard}>
        <Text style={styles.promptTitle} maxFontSizeMultiplier={1.3}>
          Điền chữ cái còn thiếu để hoàn thành từ nhé!
        </Text>
        <Text style={styles.promptNative} maxFontSizeMultiplier={1.3}>
          {activity.word.word.emoji} Nghĩa: {activity.word.word.native}
          {activity.word.word.romanization
            ? ` · ${activity.word.word.romanization}`
            : ""}
        </Text>
        <View style={styles.letterRow}>
          {activity.display.map((ch, i) => {
            if (ch !== null) {
              return (
                <View key={i} style={styles.letterCell}>
                  <Text style={styles.letterText}>{ch}</Text>
                </View>
              );
            }
            const filled = entries[blankSeen];
            blankSeen += 1;
            return (
              <View
                key={i}
                style={[
                  styles.letterCell,
                  styles.letterBlank,
                  filled ? styles.letterFilled : null,
                ]}
              >
                <Text style={styles.letterText}>{filled ?? " "}</Text>
              </View>
            );
          })}
        </View>
      </Card>
      <View style={styles.bankRow}>
        {activity.bank.map((letter, i) => {
          const used = usedBank.has(i);
          return used ? (
            <View key={`${letter}-${i}`} style={[styles.tokenChip, styles.tokenGhost]}>
              <Text style={[styles.tokenText, styles.tokenGhostText]}>{letter}</Text>
            </View>
          ) : (
            <Pressable
              key={`${letter}-${i}`}
              disabled={answered}
              onPress={() => {
                setEntries((e) => [...e, letter]);
                setUsedBank((s) => new Set(s).add(i));
              }}
              style={styles.tokenChip}
              accessibilityRole="button"
              accessibilityLabel={`Chọn chữ ${letter}`}
            >
              <Text style={styles.tokenText}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>
      {!answered && entries.length > 0 ? (
        <DuoButton
          label="↩ Xoá chữ cuối"
          variant="white"
          onPress={() => {
            setEntries((e) => e.slice(0, -1));
            setUsedBank((s) => {
              const next = new Set(s);
              // Giải phóng chip cuối cùng đã dùng cho chữ vừa xoá.
              const usedIdx = [...next].sort((a, b) => a - b);
              const last = usedIdx[usedIdx.length - 1];
              if (last !== undefined) next.delete(last);
              return next;
            });
          }}
        />
      ) : null}
    </>
  );
}

/* ============================ Chọn chữ còn thiếu (Trung/Nhật) ============================ */

function GapCharActivity({
  activity,
  accent,
  answered,
  onAnswer,
}: {
  activity: Extract<WriteActivity, { kind: "gap-char" }>;
  accent: string;
  answered: boolean;
  onAnswer: AnswerFn;
}) {
  const styles = useStyles();
  const { playCorrect, playIncorrect } = useSfx();
  const [picked, setPicked] = useState<number | null>(null);
  const chars = [...activity.word.word.target];
  const correctChar = chars[activity.charIndex];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === activity.correctIndex;
    if (correct) playCorrect();
    else playIncorrect();
    onAnswer(
      correct,
      `"${activity.word.word.target}" ${activity.word.word.emoji} nghĩa là "${activity.word.word.native}".`
    );
  };

  const optionState = (i: number): OptionState => {
    if (picked === null) return "idle";
    if (i === activity.correctIndex) return "correct";
    return picked === i ? "wrong" : "idle";
  };

  return (
    <>
      <Card accentColor={accent} style={styles.promptCard}>
        <Text style={styles.promptTitle} maxFontSizeMultiplier={1.3}>
          Chọn chữ còn thiếu trong từ nhé!
        </Text>
        <Text style={styles.promptNative} maxFontSizeMultiplier={1.3}>
          {activity.word.word.emoji} Nghĩa: {activity.word.word.native}
          {activity.word.word.romanization
            ? ` · ${activity.word.word.romanization}`
            : ""}
        </Text>
        <Text style={styles.bigWord} maxFontSizeMultiplier={1.3}>
          {chars
            .map((ch, i) =>
              i === activity.charIndex
                ? picked !== null
                  ? correctChar
                  : "＿"
                : ch
            )
            .join(" ")}
        </Text>
      </Card>
      <View style={styles.options}>
        {activity.options.map((ch, i) => (
          <OptionCard
            key={`${ch}-${i}`}
            text={ch}
            state={optionState(i)}
            disabled={picked !== null || answered}
            onPress={() => pick(i)}
          />
        ))}
      </View>
    </>
  );
}

/* ============================ Tập thứ tự nét (dữ liệu thật) ============================ */

function StrokeActivity({
  activity,
  accent,
  answered,
  onAnswer,
}: {
  activity: Extract<WriteActivity, { kind: "stroke" }>;
  accent: string;
  answered: boolean;
  onAnswer: AnswerFn;
}) {
  const colors = useThemeColors();
  const styles = useStyles();
  const { playCorrect, playIncorrect } = useSfx();
  const { data, char, word } = activity;
  const total = data.strokes.length;
  const [placedCount, setPlacedCount] = useState(0);
  const [wrongOnce, setWrongOnce] = useState(false);
  const [missNote, setMissNote] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const resolvedRef = useRef(false);

  // Ứng viên cho bước hiện tại: nét đúng + 2 nét khác của cùng chữ, thứ
  // tự trình bày gieo hạt ổn định theo (chữ + bước).
  const candidates = useMemo(() => {
    if (placedCount >= total) return [];
    const rng = skillMulberry32(skillSeedFrom(`stroke:${char}:${placedCount}`));
    const others = data.strokes
      .map((_, i) => i)
      .filter((i) => i !== placedCount);
    const shuffledOthers = [...others];
    for (let i = shuffledOthers.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
    }
    const picks = [placedCount, ...shuffledOthers.slice(0, 2)];
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [picks[i], picks[j]] = [picks[j], picks[i]];
    }
    return picks;
  }, [char, data.strokes, placedCount, total]);

  // Chạy mẫu: hiện từng nét theo thứ tự, 550ms một nét.
  useEffect(() => {
    if (previewCount === null) return undefined;
    if (previewCount > total) {
      const end = setTimeout(() => setPreviewCount(null), 500);
      return () => clearTimeout(end);
    }
    const t = setTimeout(() => setPreviewCount((c) => (c === null ? null : c + 1)), 550);
    return () => clearTimeout(t);
  }, [previewCount, total]);

  const pickCandidate = (strokeIndex: number) => {
    if (answered || previewCount !== null) return;
    if (strokeIndex === placedCount) {
      playCorrect();
      setMissNote(null);
      const next = placedCount + 1;
      setPlacedCount(next);
      if (next >= total && !resolvedRef.current) {
        resolvedRef.current = true;
        onAnswer(
          !wrongOnce,
          `Bé đã viết xong chữ "${char}" trong từ "${word.word.target}" (${word.word.native}) theo đúng thứ tự nét!`
        );
      }
    } else {
      playIncorrect();
      setWrongOnce(true);
      setMissNote("Chưa đúng nét này — bé nhìn vị trí nét rồi thử lại nhé!");
    }
  };

  const shownStrokes = previewCount !== null ? previewCount : placedCount;

  return (
    <>
      <Card accentColor={accent} style={styles.promptCard}>
        <Text style={styles.promptTitle} maxFontSizeMultiplier={1.3}>
          Tập viết chữ "{char}" theo đúng thứ tự nét
        </Text>
        <Text style={styles.promptNative} maxFontSizeMultiplier={1.3}>
          Trong từ "{word.word.target}" {word.word.emoji} — {word.word.native}
          {word.word.romanization ? ` · ${word.word.romanization}` : ""}
        </Text>
        <View style={styles.canvasWrap}>
          <Svg
            width={216}
            height={216}
            viewBox={`0 0 ${data.w} ${data.h}`}
            accessibilityLabel={`Chữ ${char} đã viết ${placedCount} trên ${total} nét`}
          >
            {data.strokes.map((d, i) => (
              <Path key={`ghost-${i}`} d={d} fill={colors.neutral200} opacity={0.45} />
            ))}
            {data.strokes.slice(0, shownStrokes).map((d, i) => (
              <Path
                key={`done-${i}`}
                d={d}
                fill={previewCount !== null ? accent : colors.neutral700}
              />
            ))}
          </Svg>
        </View>
        <Text style={styles.strokeProgress} maxFontSizeMultiplier={1.3}>
          {previewCount !== null
            ? "Đang chạy nét mẫu… xem kỹ thứ tự nhé 👀"
            : `Đã đúng ${placedCount}/${total} nét`}
        </Text>
        {missNote ? (
          <Text style={styles.missNote} maxFontSizeMultiplier={1.3}>
            {missNote}
          </Text>
        ) : null}
        {!answered ? (
          <DuoButton
            label="▶ Xem nét mẫu"
            variant="white"
            disabled={previewCount !== null}
            onPress={() => setPreviewCount(0)}
          />
        ) : null}
      </Card>

      {!answered && previewCount === null && placedCount < total ? (
        <>
          <Text style={styles.candidateLabel} maxFontSizeMultiplier={1.3}>
            Nét tiếp theo là nét nào?
          </Text>
          <View style={styles.candidateRow}>
            {candidates.map((strokeIndex) => (
              <Pressable
                key={strokeIndex}
                onPress={() => pickCandidate(strokeIndex)}
                accessibilityRole="button"
                accessibilityLabel={`Chọn nét ứng viên số ${strokeIndex + 1}`}
                style={({ pressed }) => [
                  styles.candidateCard,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Svg width={72} height={72} viewBox={`0 0 ${data.w} ${data.h}`}>
                  {data.strokes.map((d, i) => (
                    <Path key={`cg-${i}`} d={d} fill={colors.neutral200} opacity={0.35} />
                  ))}
                  <Path d={data.strokes[strokeIndex]} fill={accent} />
                </Svg>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

/* ============================ Xếp thứ tự chữ (dự phòng) ============================ */

function CharOrderActivity({
  activity,
  accent,
  answered,
  onAnswer,
}: {
  activity: Extract<WriteActivity, { kind: "char-order" }>;
  accent: string;
  answered: boolean;
  onAnswer: AnswerFn;
}) {
  const styles = useStyles();
  const { playCorrect, playIncorrect } = useSfx();
  const [placed, setPlaced] = useState<number[]>([]);
  const usedSet = new Set(placed);
  const allPlaced = placed.length === activity.chars.length;

  const check = () => {
    const built = placed.map((i) => activity.shuffled[i]).join("");
    const correct = built === activity.chars.join("");
    if (correct) playCorrect();
    else playIncorrect();
    onAnswer(
      correct,
      `"${activity.word.word.target}" ${activity.word.word.emoji} nghĩa là "${activity.word.word.native}".`
    );
  };

  return (
    <>
      <Card accentColor={accent} style={styles.promptCard}>
        <Text style={styles.promptTitle} maxFontSizeMultiplier={1.3}>
          Nhìn mẫu chữ lớn rồi xếp các chữ theo đúng thứ tự nhé!
        </Text>
        <Text style={styles.modelWord} maxFontSizeMultiplier={1.2}>
          {activity.word.word.target}
        </Text>
        <Text style={styles.promptNative} maxFontSizeMultiplier={1.3}>
          {activity.word.word.emoji} Nghĩa: {activity.word.word.native}
          {activity.word.word.romanization
            ? ` · ${activity.word.word.romanization}`
            : ""}
        </Text>
        <View style={styles.answerRow}>
          {placed.length === 0 ? (
            <Text style={styles.answerPlaceholder}>Chạm vào các chữ ở dưới…</Text>
          ) : (
            placed.map((bankIdx, pos) => (
              <Pressable
                key={`${bankIdx}-${pos}`}
                disabled={answered}
                onPress={() => setPlaced((p) => p.filter((_, i) => i !== pos))}
                style={[styles.tokenChip, styles.tokenPlaced]}
                accessibilityRole="button"
                accessibilityLabel={`Bỏ chữ ${activity.shuffled[bankIdx]}`}
              >
                <Text style={styles.tokenText}>{activity.shuffled[bankIdx]}</Text>
              </Pressable>
            ))
          )}
        </View>
      </Card>
      <View style={styles.bankRow}>
        {activity.shuffled.map((ch, i) =>
          usedSet.has(i) ? (
            <View key={`${ch}-${i}`} style={[styles.tokenChip, styles.tokenGhost]}>
              <Text style={[styles.tokenText, styles.tokenGhostText]}>{ch}</Text>
            </View>
          ) : (
            <Pressable
              key={`${ch}-${i}`}
              disabled={answered}
              onPress={() => setPlaced((p) => [...p, i])}
              style={styles.tokenChip}
              accessibilityRole="button"
              accessibilityLabel={`Chọn chữ ${ch}`}
            >
              <Text style={styles.tokenText}>{ch}</Text>
            </Pressable>
          )
        )}
      </View>
      {!answered ? (
        <DuoButton
          label="Kiểm tra"
          variant={allPlaced ? "secondary" : "locked"}
          disabled={!allPlaced}
          onPress={check}
        />
      ) : null}
    </>
  );
}

/* ================================== Styles ================================== */

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    promptCard: { gap: spacing.md, alignItems: "center" },
    promptTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight + 2,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    promptNative: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "700",
      color: colors.textMuted,
      textAlign: "center",
    },
    answerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "center",
      minHeight: 52,
      alignItems: "center",
    },
    answerPlaceholder: {
      fontSize: typography.body.fontSize,
      color: colors.textMuted,
      fontWeight: "600",
    },
    bankRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      justifyContent: "center",
    },
    tokenChip: {
      minHeight: 48,
      minWidth: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    tokenPlaced: { backgroundColor: colors.selectedBg, borderColor: colors.sky },
    tokenGhost: { opacity: 0.35, shadowOpacity: 0, elevation: 0 },
    tokenGhostText: { color: colors.textMuted },
    tokenText: {
      fontSize: 19,
      fontWeight: "800",
      color: colors.neutral700,
    },
    speakerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, justifyContent: "center" },
    speakerHint: {
      fontSize: typography.caption.fontSize,
      color: colors.textMuted,
      fontWeight: "600",
    },
    letterRow: { flexDirection: "row", gap: 6, justifyContent: "center", flexWrap: "wrap" },
    letterCell: {
      width: 40,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    letterBlank: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.sky,
    },
    letterFilled: { backgroundColor: colors.selectedBg, borderStyle: "solid" },
    letterText: { fontSize: 24, fontWeight: "900", color: colors.neutral700 },
    bigWord: {
      fontSize: 40,
      lineHeight: 52,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    options: { gap: spacing.sm + 4 },
    canvasWrap: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 2,
      borderColor: colors.neutral200,
      padding: spacing.sm,
      alignItems: "center",
    },
    strokeProgress: {
      fontSize: typography.body.fontSize,
      fontWeight: "800",
      color: colors.neutral700,
      textAlign: "center",
    },
    missNote: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: "700",
      color: colors.wrongText,
      textAlign: "center",
    },
    candidateLabel: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    candidateRow: {
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "center",
    },
    candidateCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 2,
      borderColor: colors.neutral200,
      padding: spacing.sm,
      minWidth: 88,
      minHeight: 88,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    modelWord: {
      fontSize: 64,
      lineHeight: 76,
      fontWeight: "900",
      color: colors.neutral700,
      opacity: 0.16,
      textAlign: "center",
    },
    attribution: {
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight + 2,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
    emptyCard: { gap: spacing.md, alignItems: "center" },
    emptyText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.neutral700,
      textAlign: "center",
      fontWeight: "600",
    },
  })
);
