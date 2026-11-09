import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdventureMap } from "@/components/adventure-map";
import { useCourseContent } from "@/lib/content";
import { KINGDOMS, kingdomForCourse } from "@/lib/kingdoms";
import { useProgress } from "@/lib/store";
import { kingdomColorTokens, makeThemedStyles, radius, shadow } from "@/lib/theme";

/** Tiến độ rỗng dùng chung — tham chiếu ổn định cho selector zustand. */
const EMPTY_COMPLETED: Record<string, true> = {};

/**
 * Màn BẢN ĐỒ ĐƯỜNG ĐI của một vương quốc (Phase 3 redesign): đầu trang
 * có nút quay lại + tên vương quốc + tiến độ bài, hàng chip chuyển
 * nhanh sang vương quốc khác; thân là `AdventureMap` cuộn dọc. Đổi
 * vương quốc ở đây cũng đặt luôn khóa đang học (`setActiveCourse`) để
 * tab Học và bản đồ luôn khớp nhau.
 */
export default function AdventureMapScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const courseId = KINGDOMS.some((k) => k.courseId === params.courseId)
    ? (params.courseId as string)
    : "en-vi";
  const kingdom = kingdomForCourse(courseId);
  const tokens = kingdomColorTokens(courseId);
  const setActiveCourse = useProgress((s) => s.setActiveCourse);
  const completedLessons =
    useProgress((s) => s.courses?.[courseId]?.completedLessons) ??
    EMPTY_COMPLETED;
  const { allLessons } = useCourseContent(courseId);

  if (!kingdom || !tokens) return null;

  const total = allLessons.length;
  const done = allLessons.filter((l) => completedLessons[l.lesson.id]).length;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const switchKingdom = (nextId: string) => {
    if (nextId === courseId) return;
    setActiveCourse(nextId);
    router.replace(`/map/${nextId}`);
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: tokens.soft }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: tokens.deep }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {kingdom.motif[0]} {kingdom.kingdomName}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            {kingdom.targetLanguage} · Đã xong {done}/{total} bài
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/pet")}
          accessibilityRole="button"
          accessibilityLabel="Mở trang Thú cưng"
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.petIcon}>🐾</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/skills")}
          accessibilityRole="button"
          accessibilityLabel="Mở khu Luyện kỹ năng"
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.petIcon}>🎯</Text>
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        {KINGDOMS.map((item) => {
          const active = item.courseId === courseId;
          return (
            <Pressable
              key={item.courseId}
              onPress={() => switchKingdom(item.courseId)}
              accessibilityRole="button"
              accessibilityLabel={`Xem bản đồ ${item.kingdomName}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.switchChip,
                { borderColor: item.palette.primary },
                active && { backgroundColor: item.palette.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.switchEmoji}>{item.motif[0]}</Text>
              <Text
                style={[
                  styles.switchLabel,
                  { color: active ? item.palette.onPrimary : item.palette.deep },
                ]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {item.shortName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AdventureMap courseId={courseId} />
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 6,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    backIcon: { fontSize: 22, fontWeight: "900", color: colors.neutral700 },
    petIcon: { fontSize: 22 },
    title: { fontSize: 20, fontWeight: "900" },
    subtitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    switchRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 14,
      paddingBottom: 8,
    },
    switchChip: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.85)",
      paddingHorizontal: 8,
    },
    switchEmoji: { fontSize: 17 },
    switchLabel: { fontSize: 13, fontWeight: "800" },
  })
);
