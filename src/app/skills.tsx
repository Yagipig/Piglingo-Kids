import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameHeader } from "@/components/game-ui";
import { Card } from "@/components/ui";
import { SKILL_CARDS, SKILL_SESSION_SIZE, SKILL_XP, SKILL_XP_PERFECT_BONUS } from "@/lib/skills";
import { kingdomColorTokens, makeThemedStyles, spacing, typography, useThemeColors } from "@/lib/theme";
import { useProgress } from "@/lib/store";
import { catalog } from "@/lib/content";

/**
 * HUB "Luyện kỹ năng" (/skills): 4 thẻ Nghe / Nói / Đọc / Viết theo
 * màu vương quốc của khóa đang học. Nội dung từng buổi được sinh tự
 * động từ từ vựng + câu mẫu của chính khóa đó (lib/skills.ts).
 */
export default function SkillsHubScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const courseId = useProgress((s) => s.activeCourseId);
  const tokens = kingdomColorTokens(courseId);
  const accent = tokens?.primary ?? colors.sky;
  const course = catalog.courses.find((c) => c.id === courseId);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <GameHeader title="🎯 Luyện kỹ năng" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card accentColor={accent} style={styles.introCard}>
          <Text style={styles.introTitle} maxFontSizeMultiplier={1.3}>
            Luyện 4 kỹ năng ở {tokens?.kingdomName ?? "vương quốc của bé"}
          </Text>
          <Text style={styles.introText} maxFontSizeMultiplier={1.3}>
            Mỗi buổi luyện có {SKILL_SESSION_SIZE} hoạt động lấy từ chính những bài{" "}
            {course?.targetLanguage ?? ""} bé đã học và đang học. Hoàn thành một buổi: +
            {SKILL_XP} XP, đúng hết được thêm +{SKILL_XP_PERFECT_BONUS} XP nữa!
          </Text>
        </Card>

        {SKILL_CARDS.map((skill) => (
          <Pressable
            key={skill.id}
            onPress={() => router.push(skill.route as never)}
            accessibilityRole="button"
            accessibilityLabel={`Luyện ${skill.label}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
          >
            <Card accentColor={accent} style={styles.skillCard}>
              <Text style={styles.skillEmoji}>{skill.emoji}</Text>
              <View style={styles.skillTexts}>
                <Text style={styles.skillLabel} maxFontSizeMultiplier={1.3}>
                  Luyện {skill.label}
                </Text>
                <Text style={styles.skillBlurb} maxFontSizeMultiplier={1.3}>
                  {skill.blurb}
                </Text>
              </View>
              <Text style={[styles.skillArrow, { color: accent }]}>›</Text>
            </Card>
          </Pressable>
        ))}

        <Text style={styles.note} maxFontSizeMultiplier={1.3}>
          Buổi luyện tính vào nhiệm vụ ngày như một bài học. Vé vòng quay chỉ đến từ
          bài học và chặng trên bản đồ thôi nhé!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
    introCard: { gap: spacing.sm },
    introTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    introText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.neutral700,
      fontWeight: "600",
    },
    skillCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 88,
    },
    skillEmoji: { fontSize: 44 },
    skillTexts: { flex: 1, gap: 2 },
    skillLabel: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    skillBlurb: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.textMuted,
      fontWeight: "600",
    },
    skillArrow: { fontSize: 40, fontWeight: "900" },
    note: {
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight + 4,
      color: colors.textMuted,
      textAlign: "center",
      fontWeight: "600",
    },
  })
);
