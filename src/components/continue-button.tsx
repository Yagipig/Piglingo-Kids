import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DuoButton } from "@/components/duo-button";
import type { LessonRef } from "@/lib/content";
import { makeThemedStyles } from "@/lib/theme";

type ContinueButtonProps = {
  /** Bài đích — do màn cha tính từ currentLessonIndex (logic cũ). */
  target: LessonRef;
  /** true khi mọi bài đã xong → nút thành "Ôn lại từ đầu". */
  allDone: boolean;
  onPress: () => void;
};

/**
 * Nút "Tiếp tục học" nổi bật ngay dưới header bản đồ: dùng DuoButton cỡ
 * lớn bên trong, kèm tên vùng đất + bài đích để bé biết mình đi đâu tiếp.
 * Chỉ trình bày — đích đến do index.tsx tính sẵn, không thêm logic tiến độ.
 */
export function ContinueButton({ target, allDone, onPress }: ContinueButtonProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <DuoButton
        label={allDone ? "🔁 Ôn lại từ đầu" : "▶ Tiếp tục học"}
        variant="super"
        size="lg"
        onPress={onPress}
        style={{ alignSelf: "stretch" }}
      />
      <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
        {allDone
          ? "Em đã khám phá hết thế giới này rồi. Ôn lại từ điểm đầu tiên nhé!"
          : `Điểm đến tiếp theo: ${target.unit.title} — ${target.lesson.title}`}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: 6, marginBottom: 4 },
    hint: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textAlign: "center",
    },
  })
);
