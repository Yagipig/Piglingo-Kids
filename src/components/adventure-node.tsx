import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  difficultyLabel,
  type LessonRef,
} from "@/lib/content";
import { adventureColors, makeThemedStyles, radius, shadow } from "@/lib/theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type AdventureNodeProps = {
  ref_: LessonRef;
  indexInUnit: number;
  completed: boolean;
  /** Bài "hiện tại" chính thức theo currentLessonIndex. */
  current: boolean;
  locked: boolean;
  /** Màu chủ đạo của unit (unitPalette) — giữ nhận diện màu cũ. */
  color: { main: string; dark: string };
  /** Tổng số bài của khóa — chỉ để tính nhãn độ khó như cũ. */
  totalLessons: number;
  onPress: () => void;
  onLockedPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * "Điểm khám phá" trên bản đồ thế giới — thay vai trò của Seedling (Khu
 * vườn) trong trang chủ. Trạng thái do màn cha tính sẵn và truyền vào:
 * xong = ⭐ trên nền xanh + dấu ✓, hiện tại = hào quang pulse vàng,
 * khóa = cổng xám 🔒. Component này không tự đọc store.
 */
export function AdventureNode({
  ref_,
  indexInUnit,
  completed,
  current,
  locked,
  color,
  totalLessons,
  onPress,
  onLockedPress,
}: AdventureNodeProps) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const isCurrent = current && !locked;

  useEffect(() => {
    if (isCurrent && !reducedMotion) {
      pulse.set(
        withRepeat(
          withSequence(
            withTiming(1.12, { duration: 650 }),
            withTiming(1, { duration: 650 })
          ),
          -1,
          true
        )
      );
    } else {
      pulse.set(1);
    }
  }, [isCurrent, reducedMotion, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.get() }],
  }));

  const face = completed ? "⭐" : locked ? "🔒" : isCurrent ? "🧭" : "💎";

  return (
    <View style={styles.wrap}>
      <View style={styles.nodeStack}>
        {isCurrent ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, glowStyle]}
          />
        ) : null}
        <AnimatedPressable
          onPress={() => (locked ? onLockedPress() : onPress())}
          accessibilityRole="button"
          accessibilityLabel={`${ref_.unit.title}, bài ${indexInUnit + 1}, độ khó ${difficultyLabel(ref_.globalIndex, totalLessons)}`}
          accessibilityState={{ disabled: locked, selected: current }}
          accessibilityHint={
            locked
              ? "Đang khóa. Hãy hoàn thành các bài trước, hoặc nhập mã mở khóa ở tab Hồ sơ để mở toàn bộ bài học."
              : completed
                ? "Đã hoàn thành. Luyện lại."
                : "Bắt đầu bài này."
          }
          style={({ pressed }) => [
            styles.node,
            completed
              ? styles.nodeDone
              : locked
                ? styles.nodeLocked
                : {
                    backgroundColor: color.main + "2E",
                    borderColor: color.main,
                    borderBottomColor: color.dark,
                  },
            isCurrent && styles.nodeCurrent,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.face}>{face}</Text>
          {completed ? (
            <View style={styles.checkBadge}>
              <Text style={styles.checkText}>✓</Text>
            </View>
          ) : null}
        </AnimatedPressable>
      </View>
      <Text
        style={[styles.label, isCurrent && styles.labelCurrent]}
        maxFontSizeMultiplier={1.2}
      >
        {isCurrent ? "Đang học" : `Bài ${indexInUnit + 1}`}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { alignItems: "center", gap: 4, width: 68 },
    nodeStack: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
    glow: {
      position: "absolute",
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: adventureColors.glowSoft,
      borderWidth: 3,
      borderColor: adventureColors.glow,
      opacity: 0.75,
    },
    node: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      borderWidth: 2,
      borderBottomWidth: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      ...shadow.chunky,
    },
    nodeDone: { backgroundColor: colors.correctBg, borderColor: colors.correctText, borderBottomColor: colors.correctText },
    nodeLocked: {
      backgroundColor: colors.neutral200,
      borderColor: colors.neutral300,
      borderBottomColor: colors.neutral300,
      opacity: 0.7,
    },
    nodeCurrent: { borderColor: adventureColors.glow, borderBottomColor: colors.amber },
    face: { fontSize: 28 },
    checkBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 22,
      height: 22,
      borderRadius: radius.full,
      backgroundColor: colors.correctText,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    checkText: { fontSize: 12, fontWeight: "800", color: colors.white },
    label: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    labelCurrent: { color: colors.neutral700, fontWeight: "800" },
  })
);
