import { Image } from "expo-image";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CloseButton } from "@/components/close-button";
import { Flag } from "@/components/flag";
import { exitScreen } from "@/lib/navigation";
import { orderedCourses } from "@/lib/content";
import { kingdomForCourse, kingdomPortalImage } from "@/lib/kingdoms";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow, useThemeColors } from "@/lib/theme";

/**
 * Chọn khóa học — vỏ mới "ba vương quốc ngôn ngữ" của Magical Garden:
 * mỗi khóa thật (Anh/Nhật/Trung) là một vương quốc có cổng minh họa,
 * bảng màu và hoạt động riêng. Route, hành vi chọn khóa
 * (setActiveCourse + exitScreen) và số liệu tiến độ giữ nguyên.
 */
export default function CoursesScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { activeCourseId, setActiveCourse, courses } = useProgress();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          🌍 Ba vương quốc ngôn ngữ
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Mỗi vương quốc là một ngôn ngữ đang chờ con khám phá trong khu
          vườn. Đổi ngôn ngữ bất cứ lúc nào — XP và chuỗi ngày dùng chung
          cho cả ba vương quốc.
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
            course.lessonCount > 0
              ? Math.round((doneClamped / course.lessonCount) * 100)
              : 0;
          const active = course.id === activeCourseId;
          const kingdom = kingdomForCourse(course.id);
          const palette = kingdom?.palette;
          return (
            <Pressable
              key={course.id}
              onPress={() => {
                setActiveCourse(course.id);
                exitScreen();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${kingdom ? kingdom.kingdomName + ", " : ""}${course.targetLanguage}, đã học ${doneClamped}/${course.lessonCount} bài`}
              accessibilityState={{ selected: active }}
              accessibilityHint={
                active ? "Khóa học đang học" : `Chuyển sang ${course.targetLanguage}`
              }
              style={[
                styles.card,
                palette && { borderColor: palette.primary },
                active &&
                  palette && {
                    backgroundColor: palette.soft,
                    borderColor: palette.deep,
                  },
              ]}
            >
              {kingdom ? (
                <Image
                  source={kingdomPortalImage(kingdom.kingdomId)}
                  style={styles.portalImage}
                  contentFit="contain"
                  accessibilityLabel={`Cổng ${kingdom.kingdomName}`}
                />
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.nameRow}>
                  <Flag courseId={course.id} size={22} />
                  <Text style={styles.kingdomName} maxFontSizeMultiplier={1.3}>
                    {kingdom?.kingdomName ?? course.targetLanguage}
                  </Text>
                </View>
                <Text style={styles.langName} maxFontSizeMultiplier={1.3}>
                  {course.targetLanguage} · {kingdom?.tagline}
                </Text>
                <Text style={styles.meta} maxFontSizeMultiplier={1.3}>
                  {doneClamped}/{course.lessonCount} bài · {course.unitCount} vùng đất ·{" "}
                  {pct}%
                </Text>
                {kingdom ? (
                  <Text style={styles.activities} maxFontSizeMultiplier={1.3}>
                    {kingdom.approvedActivities.slice(0, 3).join(" · ")}
                  </Text>
                ) : null}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: palette?.primary ?? colors.green,
                      },
                    ]}
                  />
                </View>
              </View>
              {active ? (
                <Text
                  style={[
                    styles.activeBadge,
                    { color: palette?.deep ?? colors.greenDark },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  Đang học
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
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
  body: { padding: 20, gap: 12, paddingBottom: 60 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.neutral200,
    borderRadius: radius.xl,
    padding: 14,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  portalImage: { width: 92, height: 92 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  kingdomName: { fontSize: 17, fontWeight: "900", color: colors.neutral700 },
  langName: { fontSize: 12.5, fontWeight: "700", color: colors.textMuted },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  activities: { fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
    marginTop: 6,
  },
  barFill: { height: "100%", borderRadius: radius.full },
  activeBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.green,
    textTransform: "uppercase",
  },
}));
