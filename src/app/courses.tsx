import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CloseButton } from "@/components/close-button";
import { Flag } from "@/components/flag";
import { ProgressBar, StatChip } from "@/components/ui";
import { orderedCourses } from "@/lib/content";
import { kingdomForCourse, kingdomPortalImage } from "@/lib/kingdoms";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow, spacing, typography } from "@/lib/theme";

/**
 * Chọn thế giới ngôn ngữ (Phase 3 redesign): 3 thẻ vương quốc LỚN —
 * thú đồng hành/cổng vương quốc, tên vương quốc thuần Việt, XP RIÊNG
 * của từng khóa và tiến độ bài thật từ store. Bấm thẻ (hoặc nút "Vào
 * bản đồ") = đặt khóa đang học rồi mở BẢN ĐỒ ĐƯỜNG ĐI của vương quốc
 * đó ở route /map/[courseId]. Thẻ của khóa đang học nổi bật hơn.
 */
export default function CoursesScreen() {
  const styles = useStyles();
  const { activeCourseId, setActiveCourse, courses } = useProgress();

  const openKingdomMap = (courseId: string) => {
    if (courseId !== activeCourseId) setActiveCourse(courseId);
    router.push(`/map/${courseId}`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          🌍 Chọn thế giới ngôn ngữ
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Mỗi vương quốc là một ngôn ngữ với hành trình riêng trên bản đồ
          đường đi. Tiến độ bài và XP tính riêng cho từng vương quốc —
          chọn một vương quốc để vào bản đồ của nó nhé!
        </Text>
        {orderedCourses.map((course) => {
          const prog = courses[course.id];
          const lessonsDone = prog
            ? Object.keys(prog.completedLessons).filter(
                (id) => id !== "mistakes" && id !== "srs"
              ).length
            : 0;
          const doneClamped = Math.min(lessonsDone, course.lessonCount);
          const pct =
            course.lessonCount > 0 ? doneClamped / course.lessonCount : 0;
          const xp = prog?.xp ?? 0;
          const active = course.id === activeCourseId;
          const kingdom = kingdomForCourse(course.id);
          const palette = kingdom?.palette;
          return (
            <Pressable
              key={course.id}
              onPress={() => openKingdomMap(course.id)}
              accessibilityRole="button"
              accessibilityLabel={`${kingdom ? kingdom.kingdomName + ", " : ""}${course.targetLanguage}: ${xp} XP, đã học ${doneClamped}/${course.lessonCount} bài. Bấm để vào bản đồ`}
              accessibilityState={{ selected: active }}
              accessibilityHint={
                active
                  ? "Vương quốc đang học — bấm để vào bản đồ"
                  : `Chuyển sang ${course.targetLanguage} và vào bản đồ`
              }
              style={({ pressed }) => [
                styles.card,
                palette && { borderColor: active ? palette.deep : palette.primary },
                active && palette && { backgroundColor: palette.soft },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.cardTop}>
                {kingdom ? (
                  <Image
                    source={kingdomPortalImage(kingdom.kingdomId)}
                    style={styles.portalImage}
                    contentFit="contain"
                    accessibilityLabel={`Cổng ${kingdom.kingdomName}`}
                  />
                ) : null}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.nameRow}>
                    <Flag courseId={course.id} size={24} />
                    <Text style={styles.kingdomName} maxFontSizeMultiplier={1.3}>
                      {kingdom?.kingdomName ?? course.targetLanguage}
                    </Text>
                  </View>
                  <Text style={styles.langName} maxFontSizeMultiplier={1.3}>
                    {course.targetLanguage} · {kingdom?.tagline}
                  </Text>
                  <Text style={styles.companion} maxFontSizeMultiplier={1.3}>
                    Bạn đồng hành: {kingdom?.companion} dẫn đường trên bản đồ
                  </Text>
                  {active ? (
                    <View
                      style={[
                        styles.activeBadge,
                        { backgroundColor: palette?.deep },
                      ]}
                    >
                      <Text style={styles.activeBadgeText} maxFontSizeMultiplier={1.15}>
                        Đang học
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.chipRow}>
                <StatChip
                  emoji="⭐"
                  value={String(xp)}
                  label="XP vương quốc"
                  softColor={palette?.soft}
                  style={{ flex: 1 }}
                />
                <StatChip
                  emoji="📚"
                  value={`${doneClamped}/${course.lessonCount}`}
                  label="Bài đã học"
                  softColor={palette?.soft}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.progressRow}>
                <ProgressBar
                  value={pct}
                  color={palette?.primary}
                  height={11}
                  accessibilityLabel={`Tiến độ ${kingdom?.kingdomName ?? course.targetLanguage}: đã học ${doneClamped} trên ${course.lessonCount} bài`}
                />
                <Text style={styles.pctText} maxFontSizeMultiplier={1.2}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>

              <View
                style={[
                  styles.mapButton,
                  { backgroundColor: palette?.primary },
                ]}
              >
                <Text style={styles.mapButtonText} maxFontSizeMultiplier={1.2}>
                  🗺️ Vào bản đồ
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: colors.neutral200,
    },
    title: { fontSize: 17, fontWeight: "800", color: colors.neutral700 },
    body: { padding: 20, gap: 14, paddingBottom: 60 },
    subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: 2 },
    card: {
      gap: spacing.md,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      ...shadow.card,
    },
    cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
    portalImage: { width: 96, height: 96 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    kingdomName: {
      fontSize: typography.h2.fontSize,
      fontWeight: "900",
      color: colors.neutral700,
      flexShrink: 1,
    },
    langName: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    companion: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    activeBadge: {
      alignSelf: "flex-start",
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginTop: 2,
    },
    activeBadgeText: {
      fontSize: 11.5,
      fontWeight: "800",
      color: colors.white,
      textTransform: "uppercase",
    },
    chipRow: { flexDirection: "row", gap: spacing.sm },
    progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    pctText: { fontSize: 13, fontWeight: "800", color: colors.textMuted, minWidth: 38, textAlign: "right" },
    mapButton: {
      minHeight: 48,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    mapButtonText: { fontSize: 16, fontWeight: "900", color: colors.white },
  })
);
