import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdventureNode } from "@/components/adventure-node";
import { difficultyLabel, type LessonRef } from "@/lib/content";
import type { Land } from "@/lib/lands";
import {
  landPalette,
  makeThemedStyles,
  radius,
  shadow,
  useResolvedScheme,
  useThemeColors,
} from "@/lib/theme";
import type { UnitPack } from "@/lib/types";

type LandCardProps = {
  unit: UnitPack;
  land: Land;
  /** Màu unitPalette của unit — giữ nhận diện màu theo thứ tự cũ. */
  color: { main: string; dark: string };
  lessons: LessonRef[];
  completedLessons: Record<string, true>;
  /** globalIndex của bài hiện tại (theo currentLessonIndex). */
  currentIndex: number;
  unlockedAll: boolean;
  totalLessons: number;
  onLessonPress: (ref_: LessonRef) => void;
  onLockedPress: () => void;
  onGuidebookPress: () => void;
  /** Giữ cơ chế đo vị trí cuộn tới unit gợi ý như trang chủ cũ. */
  onLayout?: (y: number) => void;
};

/**
 * Thẻ "vùng đất phiêu lưu" cho một unit: banner cảnh vùng (2 lớp màu giả
 * gradient + emoji phong cảnh), tên vùng + tiêu đề gốc của unit, tiến độ
 * khám phá và lưới các điểm bài học. Mọi trạng thái bài do màn cha tính.
 */
export function LandCard({
  unit,
  land,
  color,
  lessons,
  completedLessons,
  currentIndex,
  unlockedAll,
  totalLessons,
  onLessonPress,
  onLockedPress,
  onGuidebookPress,
  onLayout,
}: LandCardProps) {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useStyles();
  const palette = landPalette[land.kind];
  const doneCount = lessons.filter((l) => completedLessons[l.lesson.id]).length;
  const unitDone = doneCount === lessons.length && lessons.length > 0;
  const unitStarted = doneCount > 0;
  const unitEmoji = unit.words[0]?.emoji ?? "🌱";
  const firstRef = lessons[0];
  const landPct = lessons.length > 0 ? Math.round((doneCount / lessons.length) * 100) : 0;
  // Dark mode: dùng tông accent tối của vùng để banner dịu lại.
  const sceneTop = scheme === "dark" ? palette.dark : palette.top;
  const sceneBottom = scheme === "dark" ? palette.accent : palette.bottom;

  return (
    <View
      style={[styles.card, { borderColor: color.main }]}
      onLayout={
        onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined
      }
    >
      {/* Banner cảnh vùng: lớp trời trên + lớp đất dưới, emoji phong cảnh */}
      <View style={styles.scene}>
        <View style={[styles.sceneTop, { backgroundColor: sceneTop }]} />
        <View style={[styles.sceneBottom, { backgroundColor: sceneBottom }]} />
        <Text style={styles.sceneEmoji}>
          {land.emoji} {unitEmoji}
          {land.variant === 2 ? " ✨" : ""}
        </Text>
        <View style={[styles.landBadge, { backgroundColor: color.main }]}>
          <Text style={styles.landBadgeText} maxFontSizeMultiplier={1.2}>
            {land.name}
            {unitDone ? " 🏆" : unitStarted ? " 🧭" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {unit.title}
            </Text>
            <Text style={styles.desc} maxFontSizeMultiplier={1.3}>
              {unit.description}
            </Text>
            <Text style={styles.tagline} maxFontSizeMultiplier={1.3}>
              {land.tagline}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.guidebookButton,
              { backgroundColor: color.main, borderBottomColor: color.dark },
              pressed && { opacity: 0.8 },
            ]}
            onPress={onGuidebookPress}
            accessibilityRole="button"
            accessibilityLabel={`Sổ tay ${unit.title}`}
          >
            <Ionicons name="book" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${landPct}%`, backgroundColor: color.main },
              ]}
            />
          </View>
          <Text style={styles.progressText} maxFontSizeMultiplier={1.2}>
            {unitDone
              ? `Đã khám phá hết! ${doneCount}/${lessons.length} điểm 🎉`
              : `Đã khám phá ${doneCount}/${lessons.length} điểm`}
          </Text>
        </View>

        {firstRef ? (
          <Text style={styles.difficultyChip} maxFontSizeMultiplier={1.2}>
            Độ khó: {difficultyLabel(firstRef.globalIndex, totalLessons)}
          </Text>
        ) : null}

        <View style={styles.trail}>
          {lessons.map((ref, i) => (
            <AdventureNode
              key={ref.lesson.id}
              ref_={ref}
              indexInUnit={i}
              completed={!!completedLessons[ref.lesson.id]}
              current={ref.globalIndex === currentIndex}
              locked={!unlockedAll && ref.globalIndex > currentIndex}
              color={color}
              totalLessons={totalLessons}
              onPress={() => onLessonPress(ref)}
              onLockedPress={onLockedPress}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    card: {
      borderWidth: 2,
      borderRadius: radius.xxl,
      marginTop: 14,
      backgroundColor: colors.surface,
      overflow: "hidden",
      ...shadow.card,
    },
    scene: { height: 74, justifyContent: "flex-end" },
    sceneTop: { position: "absolute", top: 0, left: 0, right: 0, height: 44 },
    sceneBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 34 },
    sceneEmoji: { fontSize: 34, paddingHorizontal: 14, marginBottom: 4 },
    landBadge: {
      position: "absolute",
      top: 10,
      right: 12,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    landBadgeText: { fontSize: 12, fontWeight: "800", color: colors.white },
    info: { padding: 14, gap: 10 },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    title: { fontSize: 19, fontWeight: "800", color: colors.neutral700 },
    desc: { fontSize: 13, color: colors.textMuted },
    tagline: { fontSize: 12, fontWeight: "700", color: colors.textMuted, fontStyle: "italic" },
    guidebookButton: {
      borderRadius: radius.md,
      padding: 9,
      borderBottomWidth: 3,
    },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    progressTrack: {
      flex: 1,
      height: 10,
      borderRadius: radius.full,
      backgroundColor: colors.neutral200,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: radius.full },
    progressText: { fontSize: 12, fontWeight: "800", color: colors.correctText },
    difficultyChip: {
      alignSelf: "flex-start",
      fontSize: 12,
      fontWeight: "800",
      color: colors.textMuted,
      backgroundColor: colors.neutral100,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      overflow: "hidden",
    },
    trail: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      backgroundColor: colors.amber + "14",
      borderRadius: radius.lg,
      padding: 12,
    },
  })
);
