import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameHeader } from "@/components/game-ui";
import { Card } from "@/components/ui";
import { getPack } from "@/lib/content";
import { kingdomColorTokens, makeThemedStyles, spacing, typography, useThemeColors } from "@/lib/theme";
import { useProgress } from "@/lib/store";

/**
 * SỔ TAY — DANH SÁCH CHẶNG (/guidebook): lối vào của route Sổ tay.
 * Trước đây route con /guidebook/[unitId] tồn tại nhưng KHÔNG có lối
 * vào nào trong giao diện nên bé không tới được (các tính năng Đợt 2 —
 * ảnh Twemoji, nút Nghe giọng thật, tham khảo CC-CEDICT/JMdict — bị
 * kẹt sau cánh cửa không ai mở). Màn này liệt kê mọi chặng của khóa
 * ĐANG HỌC (đúng khóa mà màn chi tiết [unitId] đang tra theo
 * activeCourseId), bấm vào là mở chi tiết từ vựng của chặng đó.
 * Sổ tay là tra cứu tự do: mọi chặng đều mở, không phụ thuộc khóa bài.
 */
export default function GuidebookIndexScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const courseId = useProgress((s) => s.activeCourseId);
  const tokens = kingdomColorTokens(courseId);
  const accent = tokens?.primary ?? colors.sky;
  const pack = getPack(courseId);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <GameHeader title="📖 Sổ tay" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card accentColor={accent} style={styles.introCard}>
          <Text style={styles.introTitle} maxFontSizeMultiplier={1.3}>
            Sổ tay {pack.targetLanguage} — tra từ bất cứ lúc nào
          </Text>
          <Text style={styles.introText} maxFontSizeMultiplier={1.3}>
            Chọn một chặng để xem lại mọi từ đã gặp: nghe phát âm, nghe giọng
            thật (khi có), xem ví dụ và hình minh họa. Muốn xem sổ tay của
            ngôn ngữ khác, bé đổi khóa đang học ở màn chọn thế giới nhé!
          </Text>
        </Card>

        {pack.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              {section.title}
            </Text>
            {section.units.map((unit) => (
              <Pressable
                key={unit.id}
                onPress={() => router.push(`/guidebook/${unit.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Mở sổ tay chặng ${unit.title}: ${unit.words.length} từ`}
                style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
              >
                <Card accentColor={accent} style={styles.unitCard}>
                  <View style={styles.unitTexts}>
                    <Text style={styles.unitLabel} maxFontSizeMultiplier={1.3}>
                      {unit.title}
                    </Text>
                    <Text style={styles.unitBlurb} maxFontSizeMultiplier={1.3}>
                      {unit.words.length} từ · {unit.lessons.length} bài học
                    </Text>
                  </View>
                  <Text style={[styles.unitArrow, { color: accent }]}>›</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}

        <Text style={styles.note} maxFontSizeMultiplier={1.3}>
          Sổ tay chỉ để tra cứu vui — học và ôn tập vẫn ở bản đồ hành trình
          và tab Ôn tập nhé!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    body: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
    introCard: { gap: spacing.xs },
    introTitle: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "800",
      color: colors.neutral700,
    },
    introText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.textMuted },
    section: { gap: spacing.sm },
    sectionTitle: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
      marginTop: spacing.xs,
    },
    unitCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    unitTexts: { flex: 1, gap: 2 },
    unitLabel: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    unitBlurb: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    unitArrow: { fontSize: 26, fontWeight: "800" },
    note: {
      fontSize: 12.5,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
  })
);
