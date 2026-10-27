import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { difficultyLabel, type LessonRef } from "@/lib/content";
import { adventureColors, makeThemedStyles, radius, shadow } from "@/lib/theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type IslandPinProps = {
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
  /** Vị trí tâm ghim trên khung đảo, theo % bề rộng / chiều cao khung. */
  x: number;
  y: number;
  onPress: () => void;
  onLockedPress: () => void;
  /**
   * Nếu được truyền, MỌI lần chạm ghim (mở lẫn khóa) đều gọi callback này
   * thay cho onPress/onLockedPress — trang chủ dùng để mở MissionPanel.
   * Không truyền thì giữ nguyên hành vi cũ (khớp AdventureNode).
   */
  onMissionPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const WRAP = 76;
const PIN = 48;
const PIN_CURRENT = 58;

/**
 * Ghim tròn đánh số trên bản đồ đảo — thay vai trò của AdventureNode
 * trong thẻ vùng đất: trạng thái do màn cha tính sẵn và truyền vào,
 * khớp hệt node cũ (xong = nền xanh + ⭐, hiện tại = ghim lớn + viền
 * phát sáng + heo mascot đứng phía trên nhún nhẹ, khóa = ghim xám +
 * 🔒). Cách điều phối lần chạm và nhãn trợ năng giữ nguyên như
 * AdventureNode để luồng MissionPanel/điều hướng không đổi.
 */
export function IslandPin({
  ref_,
  indexInUnit,
  completed,
  current,
  locked,
  color,
  totalLessons,
  x,
  y,
  onPress,
  onLockedPress,
  onMissionPress,
}: IslandPinProps) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const bob = useSharedValue(0);
  const isCurrent = current && !locked;

  useEffect(() => {
    if (isCurrent && !reducedMotion) {
      pulse.set(
        withRepeat(
          withSequence(
            withTiming(1.14, { duration: 650 }),
            withTiming(1, { duration: 650 })
          ),
          -1,
          true
        )
      );
      bob.set(
        withRepeat(
          withSequence(
            withTiming(-5, { duration: 620 }),
            withTiming(0, { duration: 620 })
          ),
          -1,
          true
        )
      );
    } else {
      pulse.set(1);
      bob.set(0);
    }
  }, [isCurrent, reducedMotion, pulse, bob]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.get() }],
  }));
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.get() }],
  }));

  const size = isCurrent ? PIN_CURRENT : PIN;

  return (
    <View
      style={[styles.wrap, { left: `${x}%`, top: `${y}%` }]}
      pointerEvents="box-none"
    >
      {isCurrent ? (
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
      ) : null}
      {isCurrent ? (
        <Animated.View pointerEvents="none" style={[styles.mascotWrap, bobStyle]}>
          <Image
            source={require("@/assets/images/mascot-avatar.png")}
            style={styles.mascot}
            contentFit="cover"
            accessibilityLabel="Bạn heo đang ở bài này"
          />
        </Animated.View>
      ) : null}
      <AnimatedPressable
        onPress={() =>
          onMissionPress ? onMissionPress() : locked ? onLockedPress() : onPress()
        }
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
          styles.pin,
          { width: size, height: size },
          completed
            ? styles.pinDone
            : locked
              ? styles.pinLocked
              : {
                  backgroundColor: color.main + "2E",
                  borderColor: color.main,
                  borderBottomColor: color.dark,
                },
          isCurrent && styles.pinCurrent,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text
          style={[
            styles.number,
            completed
              ? styles.numberDone
              : locked
                ? styles.numberLocked
                : { color: color.dark },
            isCurrent && styles.numberCurrent,
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {indexInUnit + 1}
        </Text>
        {completed ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐</Text>
          </View>
        ) : locked ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔒</Text>
          </View>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      width: WRAP,
      height: WRAP,
      marginLeft: -WRAP / 2,
      marginTop: -WRAP / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    glow: {
      position: "absolute",
      width: PIN_CURRENT + 10,
      height: PIN_CURRENT + 10,
      borderRadius: radius.full,
      backgroundColor: adventureColors.glowSoft,
      borderWidth: 3,
      borderColor: adventureColors.glow,
      opacity: 0.75,
    },
    mascotWrap: {
      position: "absolute",
      top: -22,
      width: 38,
      height: 38,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: colors.white,
      backgroundColor: colors.white,
      overflow: "hidden",
      ...shadow.chunky,
    },
    mascot: { width: "100%", height: "100%" },
    pin: {
      borderRadius: radius.full,
      borderWidth: 2,
      borderBottomWidth: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      ...shadow.chunky,
    },
    pinDone: {
      backgroundColor: colors.correctText,
      borderColor: colors.correctText,
      borderBottomColor: colors.correctText,
    },
    pinLocked: {
      backgroundColor: colors.neutral200,
      borderColor: colors.neutral300,
      borderBottomColor: colors.neutral300,
      opacity: 0.75,
    },
    pinCurrent: { borderColor: adventureColors.glow, borderBottomColor: colors.amber },
    number: { fontSize: 19, fontWeight: "900" },
    numberCurrent: { fontSize: 23 },
    numberDone: { color: colors.white },
    numberLocked: { color: colors.textMuted },
    badge: {
      position: "absolute",
      top: -7,
      right: -7,
      width: 21,
      height: 21,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.neutral200,
    },
    badgeText: { fontSize: 10.5 },
  })
);
