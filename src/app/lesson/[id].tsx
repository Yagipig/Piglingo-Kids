import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import { exitScreen } from "@/lib/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CelebrationBurst, StarRow } from "@/components/celebration";
import { CloseButton } from "@/components/close-button";
import { DuoButton } from "@/components/duo-button";
import { Card, ProgressBar } from "@/components/ui";
import { LessonPet, type PetFeedback } from "@/components/lesson-pet";
import { FillBlank, ensureBlank } from "@/components/exercises/fill-blank";
import { Match } from "@/components/exercises/match";
import { Select } from "@/components/exercises/select";
import { TypeAnswer } from "@/components/exercises/type-answer";
import { WordBank } from "@/components/exercises/word-bank";
import { speakTarget, useSfx } from "@/lib/audio";
import {
  catalog,
  effectiveFrontierIndex,
  useCourseContent,
} from "@/lib/content";
import { haptics } from "@/lib/haptics";
import { landForUnit } from "@/lib/lands";
import {
  PERFECT_LINES,
  companionPetFor,
  legendaryUnlocked,
} from "@/lib/pets";
import {
  currentStreak,
  dueSrsWords,
  useProgress,
  XP_PER_LESSON,
  XP_PERFECT_BONUS,
} from "@/lib/store";
import {
  kingdomColorTokens,
  landPalette,
  makeThemedStyles,
  radius,
  spacing,
  typography,
  useResolvedScheme,
  useThemeColors,
} from "@/lib/theme";
import type { Exercise } from "@/lib/types";

type Status = "none" | "correct" | "wrong";
type Answer = number | number[] | string | null;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’‘`]/g, "'")
    .replace(/["“”]/g, '"')
    .replace(/[.,!?¿¡;:"'、。！？]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkAnswer(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.type) {
    case "select":
    case "fillBlank":
      return answer === exercise.correct;
    case "wordBank": {
      if (!Array.isArray(answer)) return false;
      const attempt = answer.map((i) => exercise.tokens[i]).join(" ");
      return normalize(attempt) === normalize(exercise.answer.join(" "));
    }
    case "typeAnswer": {
      if (typeof answer !== "string") return false;
      const attempt = normalize(answer);
      return [exercise.answer, ...exercise.alternatives].some(
        (a) =>
          normalize(a) === attempt ||
          normalize(a.replace(/\s*\([^)]*\)/g, "")) === attempt
      );
    }
    case "match":
      return answer === "done";
  }
}

function correctAnswerText(exercise: Exercise): string {
  switch (exercise.type) {
    case "select":
      return exercise.options[exercise.correct].text;
    case "fillBlank": {
      const sentence = ensureBlank(exercise.sentence, exercise.options[exercise.correct]);
      return sentence.replace("___", exercise.options[exercise.correct]);
    }
    case "wordBank":
      return exercise.answer.join(" ");
    case "typeAnswer":
      return exercise.answer;
    case "match":
      return "";
  }
}

function answerIsReady(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.type) {
    case "select":
    case "fillBlank":
      return typeof answer === "number";
    case "wordBank":
      return Array.isArray(answer) && answer.length > 0;
    case "typeAnswer":
      return typeof answer === "string" && answer.trim().length > 0;
    case "match":
      return answer === "done";
  }
}

export default function LessonScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const { activeCourseId } = progress;
  const { pack, getLesson, allLessons, allWords, getWord } =
    useCourseContent(activeCourseId);
  const sfx = useSfx();

  const isMistakes = id === "mistakes";
  const isSrs = id === "srs";

  const buildSrsExercises = (dueWords: string[]): Exercise[] => {
    const pool = allWords();
    return dueWords.slice(0, 10).flatMap((target) => {
      const word = getWord(target);
      if (!word) return [];
      const seenNatives = new Set<string>([word.native]);
      const distractors: { text: string }[] = [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const w of shuffled) {
        if (w.target !== target && !seenNatives.has(w.native)) {
          seenNatives.add(w.native);
          distractors.push({ text: w.native });
          if (distractors.length >= 3) break;
        }
      }
      const unindexedOptions = [{ text: word.native, emoji: word.emoji }, ...distractors];
      const options = [...unindexedOptions];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const correctIndex = options.findIndex((o) => o.text === word.native);
      return [
        {
          type: "select" as const,
          id: `srs-${target}`,
          mode: "targetToNative" as const,
          prompt: word.target,
          audioTarget: word.target,
          options,
          correct: correctIndex >= 0 ? correctIndex : 0,
        },
      ];
    });
  };

  const { exercises, lessonId, alreadyCompleted } = useMemo(() => {
    const course = useProgress.getState().course();
    if (isMistakes) {
      const list = course.mistakes
        .map((m) => {
          const ref = getLesson(m.lessonId);
          return ref?.lesson.exercises.find((e) => e.id === m.exerciseId);
        })
        .filter((e): e is Exercise => !!e)
        .slice(0, 10);
      return { exercises: list, lessonId: "mistakes", alreadyCompleted: true };
    }
    if (isSrs) {
      const due = dueSrsWords(course.srs);
      return {
        exercises: buildSrsExercises(due),
        lessonId: "srs",
        alreadyCompleted: true,
      };
    }
    const ref = getLesson(id ?? "");
    return {
      exercises: ref?.lesson.exercises ?? [],
      lessonId: ref?.lesson.id ?? "",
      alreadyCompleted: !!course.completedLessons[ref?.lesson.id ?? ""],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCourseId]);

  const isPractice = isMistakes || isSrs || alreadyCompleted;

  // Words the learner had already met before this session; a select exercise
  // on any other word is its introduction and gets a TỪ MỚI badge (only the
  // first time it appears in the lesson).
  const newWordIndexes = useMemo(() => {
    if (isPractice) return new Set<number>();
    const seen = new Set(Object.keys(useProgress.getState().course().wordStats ?? {}));
    const out = new Set<number>();
    exercises.forEach((e, i) => {
      if (e.type === "select" && e.audioTarget && !seen.has(e.audioTarget)) {
        seen.add(e.audioTarget);
        out.add(i);
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, isPractice]);

  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("none");
  const [answer, setAnswer] = useState<Answer>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const wrongIds = useRef(new Set<string>());
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  /* Kết quả chấm gần nhất để pet đồng hành phản ứng (động viên/khen). */
  const [petFeedback, setPetFeedback] = useState<PetFeedback | null>(null);
  const petNonceRef = useRef(0);
  const sendPetFeedback = (kind: "correct" | "wrong") => {
    petNonceRef.current += 1;
    setPetFeedback({ kind, nonce: petNonceRef.current });
  };

  useEffect(() => {
    setQueue(exercises);
    setIndex(0);
    setStatus("none");
    setAnswer(null);
    setCorrectCount(0);
    wrongIds.current = new Set();
    setFinished(false);
    finishedRef.current = false;
    setPetFeedback(null);
  }, [exercises]);

  const exercise = queue[index];
  const total = exercises.length;
  const percentage = total === 0 ? 0 : Math.min(100, (correctCount / total) * 100);
  // Màu nhấn của vương quốc đang học — đồng bộ thẻ câu hỏi + thanh tiến
  // độ với bản đồ/dashboard (chỉ trình bày, suy từ khóa đang học).
  const kingdomTokens = kingdomColorTokens(activeCourseId);

  useEffect(() => {
    if (!exercise && total > 0 && !finishedRef.current) {
      finishedRef.current = true;
      const perfect = wrongIds.current.size === 0;
      progress.completeLesson(lessonId, perfect);
      sfx.playFinish();
      haptics.celebrate();
      setFinished(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, total, lessonId, isPractice]);

  if (total === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.finishTitle}>Chưa có gì để ôn!</Text>
          <DuoButton label="Quay lại" onPress={() => exitScreen()} />
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const perfect = wrongIds.current.size === 0;
    // Sao + độ chính xác: chỉ là cách trình bày của dữ kiện sẵn có
    // (perfect / correctCount / total) — không lưu thêm hệ thưởng nào.
    const stars = perfect ? 3 : 2;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    // Điểm đến tiếp theo theo đúng BIÊN HIỆU LỰC sau khi hoàn thành
    // (tiến độ thật + sàn cấp độ) — cùng mốc với trang chủ/bản đồ, nên
    // học từ điểm bắt đầu theo cấp độ sẽ tiến tiếp đúng bài, không bị
    // kéo ngược về bài cơ bản đầu tiên chưa học.
    const nextIndex = effectiveFrontierIndex(
      progress.course().completedLessons,
      allLessons.map((l) => l.lesson.id),
      progress.learnerLevel
    );
    const nextRef = !isPractice ? allLessons[nextIndex] : undefined;
    // Pet đồng hành chúc mừng khi bài hoàn hảo (chọn câu tất định theo
    // bài để không nhấp nháy giữa các lần render).
    const finishPet = companionPetFor({
      activeCompanion: progress.activeCompanion ?? "world",
      courseId: activeCourseId,
      legendary: legendaryUnlocked(
        progress.courses ?? {},
        Object.fromEntries(catalog.courses.map((c) => [c.id, c.lessonCount]))
      ),
      rarePets: progress.rarePets ?? [],
    });
    // Vé vòng quay đang có (completeLesson vừa cấp vé cho bài này nếu
    // là lần hoàn thành mới) — hiện nút quay nổi bật ở màn kết quả.
    const spinTicketTotal =
      (progress.spinTickets?.easy ?? 0) +
      (progress.spinTickets?.medium ?? 0) +
      (progress.spinTickets?.hard ?? 0);
    const perfectLine = perfect
      ? PERFECT_LINES[
          Math.abs(
            lessonId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
          ) % PERFECT_LINES.length
        ]
      : null;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <CelebrationBurst active={finished} />
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Image
              source={require("@/assets/images/mascot-celebrate.png")}
              style={styles.finishMascot}
              contentFit="contain"
            />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(120)}>
            <StarRow stars={stars} />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(150)} style={styles.finishTitle}>
            {isMistakes
              ? "Đã sửa hết lỗi!"
              : isSrs
                ? "Ôn tập xong!"
                : "Hoàn thành bài học!"}
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(300)} style={styles.resultRow}>
            <ResultCard
              label="Tổng XP"
              value={`${XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0)}`}
              icon={<Ionicons name="flash" size={20} color={colors.amber} />}
              color={colors.amber}
            />
            <ResultCard
              label="Chuỗi ngày"
              value={`${currentStreak(progress)}`}
              icon={
                <MaterialCommunityIcons name="fire" size={22} color={colors.orange} />
              }
              color={colors.orange}
            />
            <ResultCard
              label="Độ chính xác"
              value={`${accuracy}%`}
              icon={
                <MaterialCommunityIcons name="target" size={22} color={colors.skyDark} />
              }
              color={colors.skyDark}
            />
          </Animated.View>
          {perfect ? (
            <Animated.Text entering={FadeInUp.delay(450)} style={styles.perfect}>
              Không sai câu nào! +{XP_PERFECT_BONUS} XP
            </Animated.Text>
          ) : null}
          {perfect && finishPet && perfectLine ? (
            <Animated.Text entering={FadeInUp.delay(520)} style={styles.petCheer}>
              {finishPet.emoji} {finishPet.name}: “{perfectLine}”
            </Animated.Text>
          ) : null}
          {nextRef ? (
            <Animated.Text entering={FadeInUp.delay(450)} style={styles.nextUnlock}>
              🔓 Điểm đến tiếp theo đã mở: {nextRef.unit.title} —{" "}
              {nextRef.lesson.title}
            </Animated.Text>
          ) : null}
          {!isPractice && spinTicketTotal > 0 ? (
            <Animated.View
              entering={FadeInUp.delay(560)}
              style={{ alignSelf: "stretch", gap: 8 }}
            >
              <Animated.Text style={styles.ticketNote}>
                🎟️ Bé có {spinTicketTotal} vé quay may mắn — quay ngay để nhận
                quà vào Kho báu nhé!
              </Animated.Text>
              <DuoButton
                label="🎡 Quay vòng may mắn"
                variant="super"
                onPress={() => router.push("/spin")}
              />
            </Animated.View>
          ) : null}
          <Animated.View
            entering={FadeInUp.delay(450)}
            style={{ alignSelf: "stretch" }}
          >
            <DuoButton label="Tiếp tục" onPress={() => exitScreen()} />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) return <SafeAreaView style={styles.screen} />;

  const onCheck = () => {
    const isCorrect = checkAnswer(exercise, answer);
    sendPetFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      sfx.playCorrect();
      haptics.success();
      setStatus("correct");
      setCorrectCount((c) => c + 1);
      if (isMistakes) progress.clearMistake(exercise.id);
      if (exercise.type === "select" && exercise.audioTarget) {
        if (isSrs) progress.reviewSrsWord(exercise.audioTarget, true);
        else progress.recordWord(exercise.audioTarget, true);
        if (exercise.mode === "nativeToTarget")
          speakTarget(activeCourseId, exercise.audioTarget);
      }
    } else {
      sfx.playIncorrect();
      haptics.error();
      setStatus("wrong");
      wrongIds.current.add(exercise.id);
      if (!isMistakes && !isSrs) {
        progress.addMistake({ lessonId, exerciseId: exercise.id });
      }
      if (exercise.type === "select" && exercise.audioTarget) {
        if (isSrs) progress.reviewSrsWord(exercise.audioTarget, false);
        else progress.recordWord(exercise.audioTarget, false);
      }
    }
  };

  const onContinue = () => {
    if (status === "wrong") setQueue((q) => [...q, exercise]);
    setStatus("none");
    setAnswer(null);
    setIndex((i) => i + 1);
  };

  // Dải trang trí "vùng đất" của unit hiện tại (chỉ trình bày, suy từ
  // dữ liệu bài học đã có — không đổi luồng câu hỏi/chấm điểm).
  const currentRef = !isMistakes && !isSrs ? getLesson(id ?? "") : undefined;
  const currentLand = currentRef ? landForUnit(currentRef.unit) : null;
  const landStripColor = currentLand
    ? scheme === "dark"
      ? landPalette[currentLand.kind].dark
      : landPalette[currentLand.kind].bottom
    : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <CloseButton />
          <View style={styles.progressWrap}>
            <ProgressBar
              value={percentage / 100}
              color={kingdomTokens?.primary ?? colors.greenLight}
              height={14}
              accessibilityLabel="Tiến độ bài học"
            />
          </View>
          <Text style={styles.finishFlag}>🏁</Text>
          {isPractice ? (
            <View style={styles.practicePill}>
              <Ionicons name="infinite" size={24} color={colors.skyDark} />
            </View>
          ) : null}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {currentLand && currentRef ? (
            <View style={[styles.landStrip, { backgroundColor: landStripColor ?? undefined }]}>
              <Text style={styles.landStripText} maxFontSizeMultiplier={1.2}>
                {currentLand.emoji} {currentLand.name} · {currentRef.unit.title}
              </Text>
            </View>
          ) : null}
          <LessonPet
            courseId={activeCourseId}
            exercise={exercise}
            exerciseKey={`${exercise.id}-${index}`}
            feedback={petFeedback}
          />
          <Card accentColor={kingdomTokens?.primary} style={styles.stageCard}>
          {index >= exercises.length && !isMistakes ? (
            <View style={[styles.badge, { backgroundColor: colors.orange + "22" }]}>
              <Ionicons name="refresh" size={14} color={colors.orange} />
              <Text style={[styles.badgeText, { color: colors.orange }]}>CÂU SAI TRƯỚC ĐÓ</Text>
            </View>
          ) : newWordIndexes.has(index) && !isPractice ? (
            <View style={[styles.badge, { backgroundColor: colors.indigo + "22" }]}>
              <Ionicons name="sparkles" size={14} color={colors.indigo} />
              <Text style={[styles.badgeText, { color: colors.indigo }]}>TỪ MỚI</Text>
            </View>
          ) : null}
          {exercise.type === "select" && (
            <Select
              exercise={exercise}
              answer={typeof answer === "number" ? answer : null}
              onAnswer={setAnswer}
              status={status}
              targetLanguage={pack.targetLanguage}
            />
          )}
          {exercise.type === "wordBank" && (
            <WordBank
              exercise={exercise}
              answer={Array.isArray(answer) ? answer : []}
              onAnswer={setAnswer}
              status={status}
            />
          )}
          {exercise.type === "match" && (
            <Match
              key={`${exercise.id}-${index}`}
              exercise={exercise}
              onComplete={(wrongAttempts) => {
                sendPetFeedback(wrongAttempts > 0 ? "wrong" : "correct");
                if (wrongAttempts > 0) {
                  sfx.playIncorrect();
                  wrongIds.current.add(exercise.id);
                  if (!isMistakes) {
                    progress.addMistake({ lessonId, exerciseId: exercise.id });
                  }
                  setQueue((q) => [...q, exercise]);
                } else {
                  sfx.playCorrect();
                  if (isMistakes) progress.clearMistake(exercise.id);
                  setCorrectCount((c) => c + 1);
                }
                setStatus("none");
                setAnswer(null);
                setIndex((i) => i + 1);
              }}
              onWordResult={(target, ok) => progress.recordWord(target, ok)}
            />
          )}
          {exercise.type === "typeAnswer" && (
            <TypeAnswer
              exercise={exercise}
              answer={typeof answer === "string" ? answer : ""}
              onAnswer={setAnswer}
              status={status}
              targetLanguage={pack.targetLanguage}
            />
          )}
          {exercise.type === "fillBlank" && (
            <FillBlank
              exercise={exercise}
              answer={typeof answer === "number" ? answer : null}
              onAnswer={setAnswer}
              status={status}
            />
          )}
          </Card>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 8, 24) },
            status === "correct" && { backgroundColor: colors.correctBg },
            status === "wrong" && { backgroundColor: colors.wrongBg },
          ]}
        >
          {status === "correct" && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.feedbackRow}>
              <Ionicons name="checkmark-circle" size={34} color={colors.correctText} />
              <Text style={[styles.feedback, { color: colors.correctText }]}>
                Giỏi lắm!
              </Text>
            </Animated.View>
          )}
          {status === "wrong" && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <View style={styles.feedbackRow}>
                <Ionicons name="close-circle" size={34} color={colors.wrongText} />
                <Text style={[styles.feedback, { color: colors.wrongText }]}>
                  Đáp án đúng:
                </Text>
              </View>
              <Text style={[styles.feedbackDetail, { color: colors.wrongText }]}>
                {correctAnswerText(exercise)}
              </Text>
            </Animated.View>
          )}
          {status === "none" ? (
            <DuoButton
              label="Kiểm tra"
              onPress={onCheck}
              disabled={!answerIsReady(exercise, answer)}
            />
          ) : (
            <DuoButton
              label="Tiếp tục"
              variant={status === "wrong" ? "danger" : "secondary"}
              onPress={onContinue}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color: string;
}) {
  const styles = useStyles();
  return (
    <Card padded={false} accentColor={color} style={styles.resultCard}>
      <View style={[styles.resultCardHeader, { backgroundColor: color }]}>
        <Text style={styles.resultCardLabel} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      </View>
      <View style={styles.resultCardBody}>
        {icon}
        <Text
          style={[styles.resultCardValue, { color }]}
          maxFontSizeMultiplier={1.3}
        >
          {value}
        </Text>
      </View>
    </Card>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  progressWrap: { flex: 1 },
  finishFlag: { fontSize: 20 },
  landStrip: {
    borderRadius: radius.full,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  landStripText: { fontSize: 13, fontWeight: "800", color: colors.white },
  stageCard: { padding: spacing.xl },
  practicePill: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 44,
    height: 44,
    justifyContent: "center",
  },
  body: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.neutral200,
  },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  feedback: {
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    fontWeight: "800",
  },
  feedbackDetail: { fontSize: 16, fontWeight: "600", marginTop: 2, marginLeft: 42 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
    position: "relative",
  },
  finishMascot: { width: 150, height: 150 },
  finishTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: colors.neutral700,
    textAlign: "center",
  },
  mutedCenter: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
  perfect: { fontSize: 15, fontWeight: "700", color: colors.amber },
  petCheer: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.correctText,
    textAlign: "center",
  },
  ticketNote: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.amber,
    textAlign: "center",
  },
  nextUnlock: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.correctText,
    textAlign: "center",
  },
  resultRow: { flexDirection: "row", gap: 14, flexWrap: "wrap", justifyContent: "center" },
  resultCard: {
    overflow: "hidden",
    minWidth: 118,
  },
  resultCardHeader: { paddingVertical: 6, alignItems: "center" },
  resultCardLabel: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultCardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  resultCardValue: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
  },
}));
