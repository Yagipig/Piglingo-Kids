import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { hasRealVoice, speakRealVoice } from "@/lib/audio";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, useThemeColors } from "@/lib/theme";

/**
 * Nút "Nghe giọng thật" (Đợt 2 — Lingua Libre): chỉ hiện khi ĐÚNG từ
 * này có bản ghi giọng người thật đã kiểm chứng giấy phép trong
 * `realAudioManifest`. Bấm vào chỉ phát bản ghi đó; nút loa/TTS thường
 * vẫn giữ nguyên hành vi cũ. Không có bản ghi -> không render gì.
 */
export function RealVoiceButton({
  text,
  courseId: courseIdProp,
  compact = false,
}: {
  text: string;
  courseId?: string;
  compact?: boolean;
}) {
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const courseId = courseIdProp ?? activeCourseId;
  const colors = useThemeColors();
  const styles = useStyles();

  if (!text || !hasRealVoice(courseId, text)) return null;

  return (
    <Pressable
      onPress={() => speakRealVoice(courseId, text)}
      accessibilityRole="button"
      accessibilityLabel={`Nghe giọng người thật đọc ${text}`}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { opacity: pressed ? 0.72 : 1 },
      ]}
      hitSlop={6}
    >
      <Ionicons
        name="person-circle-outline"
        size={compact ? 17 : 19}
        color={colors.white}
      />
      <Text
        style={[styles.label, compact && styles.compactLabel]}
        maxFontSizeMultiplier={1.2}
      >
        Nghe giọng thật
      </Text>
    </Pressable>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    button: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: colors.green,
      borderColor: colors.greenDark,
      borderBottomWidth: 3,
    },
    compact: { minHeight: 32, paddingHorizontal: 8, paddingVertical: 4 },
    label: { fontSize: 13, fontWeight: "800", color: colors.white },
    compactLabel: { fontSize: 12 },
  })
);

export default RealVoiceButton;
