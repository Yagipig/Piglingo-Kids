import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IslandPin } from "@/components/island-pin";
import { difficultyLabel, type LessonRef } from "@/lib/content";
import type { KingdomPalette } from "@/lib/kingdoms";
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
  /**
   * Màu nhấn của vương quốc đang học (Magical Garden): nhuộm viền thẻ,
   * fill tiến độ và nút sổ tay. Thiếu thì dùng màu unitPalette như cũ.
   * Banner cảnh vùng vẫn theo landPalette của từng unit.
   */
  accent?: KingdomPalette | null;
  /**
   * Nếu được truyền, chạm node (mở lẫn khóa) sẽ gọi callback này với đúng
   * ref + trạng thái khóa để màn cha mở MissionPanel; không truyền thì
   * giữ hành vi onLessonPress/onLockedPress cũ.
   */
  onMissionPress?: (ref_: LessonRef, locked: boolean) => void;
  onLessonPress: (ref_: LessonRef) => void;
  onLockedPress: () => void;
  onGuidebookPress: () => void;
  /** Giữ cơ chế đo vị trí cuộn tới unit gợi ý như trang chủ cũ. */
  onLayout?: (y: number) => void;
};

/** 4 tranh đảo luân phiên theo chỉ số unit trong khóa (giữ thứ tự lands). */
const ISLAND_IMAGES = [
  require("@/assets/images/island-map-a.jpg"),
  require("@/assets/images/island-map-b.jpg"),
  require("@/assets/images/island-map-c.jpg"),
  require("@/assets/images/island-map-d.jpg"),
];

/**
 * Đường đi của ghim trên đảo, theo % (x = % bề rộng, y = % chiều cao
 * khung 4:3): bắt đầu ở bãi biển phía dưới, qua làng ở giữa, lên đồi
 * phía trên — nằm trong vùng đất thoáng chung của cả 4 tranh đảo.
 */
const PIN_PATHS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 50, y: 52 }],
  2: [
    { x: 36, y: 66 },
    { x: 63, y: 38 },
  ],
  3: [
    { x: 30, y: 68 },
    { x: 54, y: 50 },
    { x: 68, y: 30 },
  ],
  4: [
    { x: 32, y: 70 },
    { x: 56, y: 58 },
    { x: 44, y: 42 },
    { x: 64, y: 30 },
  ],
  5: [
    { x: 26, y: 74 },
    { x: 46, y: 62 },
    { x: 64, y: 50 },
    { x: 48, y: 38 },
    { x: 66, y: 26 },
  ],
};

/** Tọa độ ghim thứ `i` trong unit có `count` bài (dự phòng cho count lạ). */
function pinPosition(count: number, i: number): { x: number; y: number } {
  const path = PIN_PATHS[count];
  if (path) return path[Math.min(i, path.length - 1)];
  if (count <= 1) return PIN_PATHS[1][0];
  const t = i / (count - 1);
  const xs = [30, 56, 68, 44];
  return { x: xs[i % xs.length], y: 74 - 48 * t };
}

/** Chỉ số unit trong khóa suy từ id ("<course>:unit-N") — khớp thứ tự pack. */
function unitIndexInCourse(unitId: string): number {
  const m = /unit-(\d+)$/.exec(unitId);
  return m ? Math.max(0, parseInt(m[1], 10) - 1) : 0;
}

/**
 * Thẻ "vùng đất phiêu lưu" cho một unit: banner cảnh vùng (2 lớp màu giả
 * gradient + emoji phong cảnh), tên vùng + tiêu đề gốc của unit, tiến độ
 * khám phá và bản đồ đảo với các ghim bài học đánh số (IslandPin). Mọi
 * trạng thái bài do màn cha tính.
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
  accent,
  onMissionPress,
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
  // Điểm nhấn vương quốc (nếu có) thay màu unit ở viền/fill/nút sổ tay.
  const accentMain = accent?.primary ?? color.main;
  const accentDark = accent?.deep ?? color.dark;

  return (
    <View
      style={[styles.card, { borderColor: accentMain }]}
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
              { backgroundColor: accentMain, borderBottomColor: accentDark },
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
                { width: `${landPct}%`, backgroundColor: accentMain },
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

        <View style={styles.islandScene}>
          <Image
            source={ISLAND_IMAGES[unitIndexInCourse(unit.id) % ISLAND_IMAGES.length]}
            style={styles.islandImage}
            contentFit="cover"
            accessibilityLabel={`Bản đồ đảo ${land.name}`}
          />
          {lessons.map((ref, i) => {
            const nodeLocked = !unlockedAll && ref.globalIndex > currentIndex;
            const pos = pinPosition(lessons.length, i);
            return (
              <IslandPin
                key={ref.lesson.id}
                ref_={ref}
                indexInUnit={i}
                completed={!!completedLessons[ref.lesson.id]}
                current={ref.globalIndex === currentIndex}
                locked={nodeLocked}
                color={color}
                totalLessons={totalLessons}
                x={pos.x}
                y={pos.y}
                onPress={() => onLessonPress(ref)}
                onLockedPress={onLockedPress}
                onMissionPress={
                  onMissionPress ? () => onMissionPress(ref, nodeLocked) : undefined
                }
              />
            );
          })}
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
    islandScene: {
      position: "relative",
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.neutral100,
    },
    islandImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  })
);
