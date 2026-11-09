import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DuoButton } from "@/components/duo-button";
import type { LessonRef } from "@/lib/content";
import { makeThemedStyles } from "@/lib/theme";

type ContinueButtonProps = {
  /** Bài đích — do màn cha tính sẵn từ biên hiệu lực (tiến độ + sàn cấp độ). */
  target: LessonRef;
  /** Tổng số bài của khóa — để hiện "Bài X/Tổng" theo số TOÀN CỤC. */
  totalLessons: number;
  /** true khi mọi bài đã xong → nút thành "Ôn lại từ đầu". */
  allDone: boolean;
  onPress: () => void;
};

/**
 * Nút "Tiếp tục học" nổi bật ngay dưới header bản đồ: dùng DuoButton cỡ
 * lớn bên trong, kèm tên vùng đất + bài đích để bé biết mình đi đâu tiếp.
 * Dòng gợi ý hiện số bài TOÀN CỤC (Bài 82/108) thay vì chỉ số trong unit
 * (Bài 2) — nhờ vậy cú nhảy điểm bắt đầu theo cấp độ (Hướng 1) nhìn thấy
 * ngay trên màn hình chính. Phần đuôi của tên bài trong unit (": Ôn tập",
 * ": Câu") vẫn được giữ lại sau số toàn cục.
 * Chỉ trình bày — đích đến do index.tsx tính sẵn, không thêm logic tiến độ.
 */
export function ContinueButton({ target, totalLessons, allDone, onPress }: ContinueButtonProps) {
  const styles = useStyles();
  // Tên bài trong unit có dạng "Bài 2" hoặc "Bài 3: Ôn tập" — bỏ phần
  // "Bài N" (số trong unit) để thay bằng số toàn cục, giữ lại phần đuôi.
  const titleSuffix = target.lesson.title.replace(/^Bài\s*\d+\s*/, "");
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
          : `Điểm đến tiếp theo: ${target.unit.title} — Bài ${target.globalIndex + 1}/${totalLessons}${titleSuffix}`}
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
