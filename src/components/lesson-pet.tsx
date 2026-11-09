import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SpeakerButton } from "@/components/speaker-button";
import { speakTarget } from "@/lib/audio";
import { catalog, useCourseContent } from "@/lib/content";
import {
  ENCOURAGEMENT_WRONG,
  PRAISE_RIGHT,
  companionPetFor,
  legendaryUnlocked,
  mostMissedWord,
  petSkillForExercise,
  pickLine,
  type PetSkillContent,
} from "@/lib/pets";
import { useProgress } from "@/lib/store";
import { kingdomColorTokens, makeThemedStyles, radius, shadow } from "@/lib/theme";
import type { Exercise } from "@/lib/types";

export type PetFeedback = {
  kind: "correct" | "wrong";
  /** Tăng dần sau mỗi lần chấm — pet phản ứng đúng một lần cho mỗi lần chấm. */
  nonce: number;
};

type LessonPetProps = {
  courseId: string;
  exercise: Exercise;
  /** Đổi khi sang bài tập khác (kể cả câu sai được xếp lại) — để reset thẻ skill. */
  exerciseKey: string;
  feedback: PetFeedback | null;
};

const CATALOG_TOTALS = Object.fromEntries(
  catalog.courses.map((c) => [c.id, c.lessonCount])
);

/**
 * PET ĐỒNG HÀNH TRONG BÀI HỌC (Đợt B+C): thú của thế giới của bài học
 * (hoặc Rồng Huyền Thoại khi bé đã mở và chọn Rồng đồng hành) ngồi ở
 * góc màn hình, ĐỘNG VIÊN khi bé trả lời sai, khen khi trả lời đúng,
 * và có NÚT SKILL riêng — skill chỉ HỖ TRỢ học (đọc mẫu / cách đọc /
 * pinyin / nhắc bài cũ), không làm bài thay bé: nội dung skill đi qua
 * chốt chặn trong `petSkillForExercise` nên không bao giờ lộ đáp án.
 */
export function LessonPet({
  courseId,
  exercise,
  exerciseKey,
  feedback,
}: LessonPetProps) {
  const styles = useStyles();
  const progress = useProgress();
  const { getWord } = useCourseContent(courseId);
  const tokens = kingdomColorTokens(courseId);

  const legendary = legendaryUnlocked(progress.courses ?? {}, CATALOG_TOTALS);
  const pet = companionPetFor({
    activeCompanion: progress.activeCompanion ?? "world",
    courseId,
    legendary,
    rarePets: progress.rarePets ?? [],
  });

  const [message, setMessage] = useState<string | null>(null);
  const lastLineRef = useRef<string | null>(null);
  const [skill, setSkill] = useState<PetSkillContent | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Sang bài tập khác → đóng thẻ skill, pet quay về câu đồng hành mặc định.
  useEffect(() => {
    setSkill(null);
    setSkillOpen(false);
    setReminderOpen(false);
    setMessage(null);
  }, [exerciseKey]);

  // Phản ứng theo kết quả chấm gần nhất: sai → động viên (không lặp
  // câu vừa dùng); đúng → thỉnh thoảng khen.
  useEffect(() => {
    if (!feedback) return;
    if (feedback.kind === "wrong") {
      const line = pickLine(ENCOURAGEMENT_WRONG, lastLineRef.current);
      lastLineRef.current = line;
      setMessage(line);
    } else if (Math.random() < 0.55) {
      const line = pickLine(PRAISE_RIGHT, lastLineRef.current);
      lastLineRef.current = line;
      setMessage(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback?.nonce]);

  const courseProgress = progress.courses?.[courseId];
  const missed = useMemo(
    () => mostMissedWord(courseProgress ?? {}),
    [courseProgress]
  );
  const missedWord = missed ? getWord(missed.target) : undefined;

  if (!pet) return null;

  const onSkillPress = () => {
    if (pet.skillKind === "reminder") {
      setReminderOpen((open) => !open);
      return;
    }
    if (skillOpen) {
      setSkillOpen(false);
      return;
    }
    const content = petSkillForExercise({
      exercise,
      courseId,
      skillKind: pet.skillKind,
      getWord,
    });
    if (!content) return;
    setSkill(content);
    setSkillOpen(true);
    if (content.kind === "speak") speakTarget(courseId, content.speakText);
  };

  const skillAvailable =
    pet.skillKind === "reminder"
      ? true
      : petSkillForExercise({
          exercise,
          courseId,
          skillKind: pet.skillKind,
          getWord,
        }) !== null;

  const bubbleText =
    message ??
    (pet.rare
      ? `${pet.name} đồng hành cùng bé đây! Mình không có phép thuật học bài — mình chỉ cổ vũ: bé giỏi lắm, cố lên nhé! 🦚✨`
      : `${pet.name} đồng hành cùng bé đây! Bí thì bấm nút “${pet.skillName}” của mình nhé.`);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            { borderColor: pet.legendary ? "#b45309" : tokens?.primary ?? "#f59e0b" },
          ]}
          accessibilityLabel={`Thú cưng đồng hành: ${pet.name}`}
        >
          <Text style={styles.avatarEmoji}>{pet.emoji}</Text>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText} maxFontSizeMultiplier={1.25}>
            {bubbleText}
          </Text>
        </View>
      </View>

      {pet.skillKind !== "none" ? (
        <>
          <Pressable
            onPress={onSkillPress}
            disabled={!skillAvailable}
            accessibilityRole="button"
            accessibilityLabel={`Dùng kỹ năng ${pet.skillName} của ${pet.name}`}
            accessibilityState={{ disabled: !skillAvailable }}
            style={({ pressed }) => [
              styles.skillButton,
              {
                backgroundColor: pet.legendary
                  ? "#b45309"
                  : tokens?.primary ?? "#f59e0b",
              },
              !skillAvailable && styles.skillButtonDisabled,
              pressed && skillAvailable && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.skillButtonText} maxFontSizeMultiplier={1.2}>
              {pet.emoji} {pet.skillName}
              {pet.skillKind === "speak" ? " 🔊" : ""}
            </Text>
          </Pressable>
          {!skillAvailable ? (
            <Text style={styles.skillHint} maxFontSizeMultiplier={1.2}>
              Bài tập này {pet.name} chưa giúp được — bé tự làm nhé, mình cổ vũ!
            </Text>
          ) : null}
        </>
      ) : null}

      {skillOpen && skill ? (
        <View style={styles.skillCard}>
          {skill.kind === "speak" ? (
            <>
              <Text style={styles.skillCardTitle} maxFontSizeMultiplier={1.2}>
                {pet.name} đọc mẫu:
              </Text>
              <Text style={styles.skillDisplay} maxFontSizeMultiplier={1.3}>
                {skill.displayText}
              </Text>
              <Pressable
                onPress={() => speakTarget(courseId, skill.speakText)}
                accessibilityRole="button"
                accessibilityLabel="Nghe đọc mẫu lại"
                style={styles.replayButton}
              >
                <Text style={styles.replayText} maxFontSizeMultiplier={1.2}>
                  🔊 Nghe lại
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.skillCardTitle} maxFontSizeMultiplier={1.2}>
                {pet.skillKind === "pinyin"
                  ? `Pinyin của “${skill.wordTarget}”:`
                  : `Cách đọc của “${skill.wordTarget}”:`}
              </Text>
              <Text style={styles.skillDisplay} maxFontSizeMultiplier={1.3}>
                {skill.displayText}
              </Text>
              {skill.toneLabel ? (
                <Text style={styles.skillTone} maxFontSizeMultiplier={1.2}>
                  Thanh điệu: {skill.toneLabel}
                </Text>
              ) : null}
            </>
          )}
          {skill.partial ? (
            <Text style={styles.partialNote} maxFontSizeMultiplier={1.2}>
              (gợi ý một phần) — bài này đang hỏi đúng phần này nên{" "}
              {pet.name} chỉ hé một chút thôi, bé tự tìm tiếp nhé!
            </Text>
          ) : null}
        </View>
      ) : null}

      {reminderOpen ? (
        <View style={styles.skillCard}>
          {missed ? (
            <>
              <Text style={styles.skillCardTitle} maxFontSizeMultiplier={1.2}>
                🐉 Rồng nhắc lại từ bé hay sai nhất:
              </Text>
              <View style={styles.reminderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.skillDisplay} maxFontSizeMultiplier={1.3}>
                    {missed.target}
                    {missedWord ? ` — ${missedWord.native}` : ""}
                  </Text>
                  <Text style={styles.skillTone} maxFontSizeMultiplier={1.2}>
                    Bé đã trả lời sai từ này {missed.wrong} lần — ôn lại một
                    chút là nhớ ngay!
                  </Text>
                </View>
                <SpeakerButton text={missed.target} size={48} />
              </View>
            </>
          ) : (
            <Text style={styles.skillCardTitle} maxFontSizeMultiplier={1.2}>
              Bé đang học rất chắc, chưa có bài cũ nào cần nhắc! 🌟
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: 8, marginBottom: 12 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      borderWidth: 2.5,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    avatarEmoji: { fontSize: 26 },
    bubble: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      paddingHorizontal: 12,
      paddingVertical: 9,
      ...shadow.soft,
    },
    bubbleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    skillButton: {
      alignSelf: "flex-start",
      minHeight: 48,
      borderRadius: radius.full,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 58,
    },
    skillButtonDisabled: { backgroundColor: colors.neutral300 },
    skillButtonText: { fontSize: 14, fontWeight: "900", color: colors.white },
    skillHint: {
      marginLeft: 58,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    skillCard: {
      marginLeft: 58,
      backgroundColor: colors.amber + "1A",
      borderWidth: 2,
      borderColor: colors.amber,
      borderRadius: radius.xl,
      padding: 12,
      gap: 5,
      ...shadow.soft,
    },
    skillCardTitle: { fontSize: 13.5, fontWeight: "800", color: colors.neutral700 },
    skillDisplay: { fontSize: 21, fontWeight: "900", color: colors.neutral700 },
    skillTone: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    partialNote: { fontSize: 12.5, fontWeight: "700", color: "#b45309" },
    replayButton: {
      alignSelf: "flex-start",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
    },
    replayText: { fontSize: 13.5, fontWeight: "800", color: colors.text },
    reminderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  })
);
