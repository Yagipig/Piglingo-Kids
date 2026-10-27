import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

import { DuoButton } from "@/components/duo-button";
import { Flag } from "@/components/flag";
import type { Kingdom } from "@/lib/kingdoms";
import type { MissionView } from "@/lib/garden";
import { landForUnit, type Land } from "@/lib/lands";
import { XP_PERFECT_BONUS, XP_PER_LESSON } from "@/lib/store";
import { makeThemedStyles, radius, shadow, useThemeColors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { UnitPack } from "@/lib/types";

type MissionPanelProps = {
  view: MissionView | null;
  unit: UnitPack | null;
  kingdom: Kingdom | null;
  courseId: string;
  targetLanguage: string;
  onClose: () => void;
  onStart: (lessonId: string) => void;
  onGuidebook: (unitId: string) => void;
};

/**
 * Panel "nhiệm vụ" mở ra khi trẻ chạm một điểm bài học trên bản đồ:
 * chỉ trình bày dữ kiện thật của bài (tên, vương quốc, vùng đất, độ khó,
 * số hoạt động, ước tính phút, XP theo quy tắc store, tiến độ vùng) và
 * CTA theo trạng thái. Nút bắt đầu đi đúng route /lesson/[id] cũ.
 */
export function MissionPanel({
  view,
  unit,
  kingdom,
  courseId,
  targetLanguage,
  onClose,
  onStart,
  onGuidebook,
}: MissionPanelProps) {
  const colors = useThemeColors();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const land: Land | null = unit ? landForUnit(unit) : null;
  const accent = kingdom?.palette.primary ?? colors.sky;
  const accentDeep = kingdom?.palette.deep ?? colors.skyDark;

  return (
    <Modal
      visible={view != null}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(160)}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng panel nhiệm vụ"
        />
        {view ? (
          <Animated.View
            entering={reducedMotion ? undefined : SlideInDown.duration(240)}
            style={styles.sheet}
            accessibilityViewIsModal
          >
            <View style={[styles.topBar, { backgroundColor: accent }]} />
            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Flag courseId={courseId} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.kingdomLabel} maxFontSizeMultiplier={1.2}>
                    {kingdom ? `${kingdom.kingdomName} · ${targetLanguage}` : targetLanguage}
                  </Text>
                  <Text style={styles.title} maxFontSizeMultiplier={1.3}>
                    {view.title}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                  style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {land ? (
                <Text style={styles.landLine} maxFontSizeMultiplier={1.3}>
                  {land.emoji} Vùng đất: {land.name} — {land.tagline}
                </Text>
              ) : null}

              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
                    🎚️ Độ khó: {view.difficulty}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
                    ⏱️ Khoảng {view.minutes} phút · {view.exerciseCount} hoạt động
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
                    ⚡ +{XP_PER_LESSON} XP · Không sai: +{XP_PER_LESSON + XP_PERFECT_BONUS} XP
                  </Text>
                </View>
              </View>

              {view.chips.length > 0 ? (
                <View style={styles.chipRow}>
                  {view.chips.map((chip) => (
                    <View key={chip} style={[styles.chip, { backgroundColor: accent + "1F" }]}>
                      <Text style={[styles.chipText, { color: accentDeep }]} maxFontSizeMultiplier={1.2}>
                        {chip}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={styles.progressLine} maxFontSizeMultiplier={1.3}>
                {view.completed
                  ? "⭐ Đã hoàn thành bài này rồi!"
                  : view.locked
                    ? "🔒 Cổng đang khóa"
                    : view.current
                      ? "🧭 Đây là bài tiếp theo của con"
                      : "💎 Bài đã mở, sẵn sàng khám phá"}
                {"  ·  "}
                Vùng đất: {view.unitDone}/{view.unitTotal} bài
              </Text>

              {view.locked ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedText} maxFontSizeMultiplier={1.3}>
                    Hãy hoàn thành bài đang mở trước để mở điểm đến này nhé.
                  </Text>
                  <Text style={styles.lockedSub} maxFontSizeMultiplier={1.3}>
                    Ba/mẹ có thể mở toàn bộ bài học bằng mã mở khóa trong tab Hồ sơ.
                  </Text>
                </View>
              ) : (
                <DuoButton
                  label={view.cta === "review" ? "Ôn lại bài này" : "Bắt đầu bài này"}
                  variant="primary"
                  size="lg"
                  onPress={() => onStart(view.lessonId)}
                  style={{ alignSelf: "stretch" }}
                />
              )}

              {unit ? (
                <Pressable
                  onPress={() => onGuidebook(unit.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở sổ tay ${unit.title}`}
                  style={({ pressed }) => [styles.guidebookLink, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="book-outline" size={17} color={accentDeep} />
                  <Text style={[styles.guidebookText, { color: accentDeep }]} maxFontSizeMultiplier={1.3}>
                    Xem sổ tay vùng đất này
                  </Text>
                </Pressable>
              ) : null}

              <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
                Ước tính theo số hoạt động, mỗi bạn nhỏ học theo nhịp riêng.
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(20, 28, 20, 0.45)",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 14,
    },
    sheet: {
      width: "100%",
      maxWidth: 560,
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      overflow: "hidden",
      ...shadow.chunky,
    },
    topBar: { height: 8 },
    content: { padding: 18, gap: 10 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    kingdomLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    title: { fontSize: 19, fontWeight: "900", color: colors.neutral700 },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    landLine: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: { fontSize: 12, fontWeight: "800", color: colors.neutral700 },
    progressLine: { fontSize: 14, fontWeight: "700", color: colors.neutral700, lineHeight: 20 },
    lockedBox: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.lg,
      padding: 12,
      gap: 3,
    },
    lockedText: { fontSize: 14, fontWeight: "700", color: colors.neutral700 },
    lockedSub: { fontSize: 12, color: colors.textMuted },
    guidebookLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 4,
    },
    guidebookText: { fontSize: 14, fontWeight: "800" },
    footnote: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
  })
);
