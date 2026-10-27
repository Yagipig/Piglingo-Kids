import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CloseButton } from "@/components/close-button";
import { Flag } from "@/components/flag";
import { exitScreen } from "@/lib/navigation";
import { orderedCourses } from "@/lib/content";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow, useResolvedScheme, useThemeColors } from "@/lib/theme";

export default function CoursesScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useStyles();
  const { activeCourseId, setActiveCourse, courses } = useProgress();
  const activeGreen = scheme === "dark" ? colors.green : colors.greenDark;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          🛂 Hộ chiếu ngôn ngữ
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Mỗi hộ chiếu mở ra một thế giới vùng đất mới. Đổi ngôn ngữ bất cứ
          lúc nào — XP và chuỗi ngày dùng chung cho cả ba ngôn ngữ.
        </Text>
        {orderedCourses.map((course) => {
          const prog = courses[course.id];
          const lessonsDone = prog
            ? Object.keys(prog.completedLessons).filter(
                (id) => id !== "mistakes" && id !== "srs"
              ).length
            : 0;
          const active = course.id === activeCourseId;
          return (
            <Pressable
              key={course.id}
              onPress={() => {
                setActiveCourse(course.id);
                exitScreen();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${course.targetLanguage}, đã học ${lessonsDone}/${course.lessonCount} bài`}
              accessibilityState={{ selected: active }}
              accessibilityHint={
                active ? "Khóa học đang học" : `Chuyển sang ${course.targetLanguage}`
              }
              style={[styles.card, active && styles.cardActive]}
            >
              <Flag courseId={course.id} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.langName} maxFontSizeMultiplier={1.3}>
                  {course.targetLanguage}
                </Text>
                <Text style={styles.meta} maxFontSizeMultiplier={1.3}>
                  {Math.min(lessonsDone, course.lessonCount)}/{course.lessonCount} bài · {course.unitCount} vùng đất
                </Text>
              </View>
              {active ? (
                <Text
                  style={[styles.activeBadge, { color: activeGreen }]}
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
    gap: 14,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.neutral200,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  cardActive: { borderColor: colors.green, backgroundColor: colors.greenLight + "18" },
  langName: { fontSize: 18, fontWeight: "800", color: colors.neutral700 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  activeBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.green,
    textTransform: "uppercase",
  },
}));
