import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Flag } from "@/components/flag";
import { speakTarget } from "@/lib/audio";
import {
  gardenSceneImage,
  gardenTreeImage,
  hotspotsForCourse,
  kingdomPortalImage,
  KINGDOMS,
  type Kingdom,
} from "@/lib/kingdoms";
import type {
  Companion,
  TreeStage,
  UnitFlower,
} from "@/lib/garden";
import type { CourseRewardProgress, GlobalReward } from "@/lib/rewards";
import {
  adventureColors,
  makeThemedStyles,
  radius,
  shadow,
} from "@/lib/theme";
import type { Word } from "@/lib/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type MagicalGardenSceneProps = {
  activeCourseId: string;
  courseProgressList: CourseRewardProgress[];
  treeStage: TreeStage;
  flowers: UnitFlower[];
  badges: GlobalReward[];
  companions: Companion[];
  butterflies: boolean;
  getWord: (target: string) => Word | undefined;
  onKingdomPress: (courseId: string) => void;
  onBadgesPress: () => void;
};

/** Tỉ lệ khung ảnh cổng đã tách nền (rộng/cao) để không bị méo hình. */
const PORTAL_ASPECT: Record<string, number> = {
  storybook: 600 / 507,
  sakura: 600 / 410,
  lantern: 600 / 501,
};

/** Vị trí đốm trang trí trên tán cây — cố định, không random lúc render. */
const TREE_DECO_SPOTS = [
  { left: "12%", top: "6%" },
  { left: "30%", top: "2%" },
  { left: "52%", top: "4%" },
  { left: "74%", top: "8%" },
  { left: "86%", top: "20%" },
  { left: "64%", top: "16%" },
  { left: "40%", top: "12%" },
  { left: "18%", top: "22%" },
  { left: "82%", top: "34%" },
  { left: "8%", top: "36%" },
  { left: "56%", top: "26%" },
  { left: "34%", top: "30%" },
];

/**
 * Cảnh vườn thần tiên của trang chủ: ảnh nền vẽ sẵn + cây thần tách lớp
 * lớn dần theo tổng XP + ba cổng vương quốc là Pressable thật + hoa theo
 * tiến độ unit + bướm khi đạt mục tiêu ngày + huy hiệu đã đạt + thú đồng
 * hành đã mở + vật ẩn khám phá phát TTS. Mọi trạng thái do màn cha tính
 * từ tiến độ thật và truyền vào; component này không tự sửa dữ liệu.
 */
export function MagicalGardenScene({
  activeCourseId,
  courseProgressList,
  treeStage,
  flowers,
  badges,
  companions,
  butterflies,
  getWord,
  onKingdomPress,
  onBadgesPress,
}: MagicalGardenSceneProps) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [bubble, setBubble] = useState<{ word: Word } | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBubble(null);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
  }, [activeCourseId]);

  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    },
    []
  );

  const progressOf = (courseId: string) =>
    courseProgressList.find((item) => item.courseId === courseId);

  const treeWidthPct = 46 * (treeStage.scalePct / 100);
  const decoEmojis: string[] = [
    ...Array.from({ length: treeStage.decoFlowers }, () => "🌸"),
    ...Array.from({ length: treeStage.decoStars }, () => "⭐"),
  ].slice(0, TREE_DECO_SPOTS.length);

  const sceneCompanions = companions.filter((c) => c.unlocked).slice(0, 4);
  const hotspots = hotspotsForCourse(activeCourseId)
    .map((hotspot) => ({ hotspot, word: getWord(hotspot.target) }))
    .filter((item): item is { hotspot: (typeof item)["hotspot"]; word: Word } => !!item.word);

  const handleHotspot = (word: Word) => {
    setBubble({ word });
    speakTarget(activeCourseId, word.target);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3200);
  };

  return (
    <View
      style={styles.scene}
      accessibilityLabel="Khu vườn ngôn ngữ thần tiên với ba cổng vương quốc: Cổ Tích, Hoa Anh Đào và Đèn Lồng"
    >
      <Image
        source={gardenSceneImage()}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Cảnh vườn: đồi xanh, sông lấp lánh, cầu vồng và ao sen"
      />

      {/* Mây trôi nhẹ */}
      <Floaty reducedMotion={reducedMotion} duration={5200} distance={12} style={styles.cloudOne}>
        <Text style={styles.cloudText}>☁️</Text>
      </Floaty>
      <Floaty reducedMotion={reducedMotion} duration={6800} distance={9} style={styles.cloudTwo}>
        <Text style={styles.cloudText}>☁️</Text>
      </Floaty>

      {/* Cây thần tách lớp — lớn dần theo tổng XP */}
      <View
        pointerEvents="none"
        style={[
          styles.treeWrap,
          { width: `${treeWidthPct}%`, left: `${50 - treeWidthPct / 2}%` },
        ]}
      >
        {treeStage.glow ? <View style={styles.treeGlow} /> : null}
        <Image
          source={gardenTreeImage()}
          style={styles.treeImage}
          contentFit="contain"
          accessibilityLabel={`Cây thần: ${treeStage.label}`}
        />
        {decoEmojis.map((emoji, i) => (
          <Text
            key={`${emoji}-${i}`}
            style={[styles.treeDeco, TREE_DECO_SPOTS[i] as object]}
          >
            {emoji}
          </Text>
        ))}
      </View>

      {/* Ba cổng vương quốc — phần tử bấm thật */}
      {KINGDOMS.map((kingdom) => {
        const progress = progressOf(kingdom.courseId);
        const active = kingdom.courseId === activeCourseId;
        return (
          <Portal
            key={kingdom.kingdomId}
            kingdom={kingdom}
            active={active}
            completed={progress?.completed ?? 0}
            total={progress?.total ?? 0}
            percent={progress?.percent ?? 0}
            complete={progress?.complete ?? false}
            onPress={() => onKingdomPress(kingdom.courseId)}
          />
        );
      })}

      {/* Bảng huy hiệu đã đạt */}
      <Pressable
        onPress={onBadgesPress}
        accessibilityRole="button"
        accessibilityLabel={
          badges.length > 0
            ? `Đã đạt ${badges.length} huy hiệu. Xem phần thưởng`
            : "Chưa có huy hiệu. Xem phần thưởng"
        }
        style={({ pressed }) => [styles.badgeSign, pressed && { opacity: 0.85 }]}
      >
        {badges.length > 0 ? (
          <Text style={styles.badgeEmojis} maxFontSizeMultiplier={1.1}>
            🏅 {badges.map((badge) => badge.emoji).join(" ")}
          </Text>
        ) : (
          <Text style={styles.badgeEmpty} maxFontSizeMultiplier={1.1}>
            🌱 Huy hiệu sẽ xuất hiện trong vườn
          </Text>
        )}
      </Pressable>

      {/* Thú đồng hành đã mở khóa */}
      {sceneCompanions.length > 0 ? (
        <View pointerEvents="none" style={styles.companionRow}>
          {sceneCompanions.map((companion) => (
            <View key={companion.id} style={styles.companionBubble}>
              <Text style={styles.companionEmoji}>{companion.emoji}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Bướm khi đạt mục tiêu XP hôm nay */}
      {butterflies ? (
        <>
          <Floaty reducedMotion={reducedMotion} duration={2100} distance={7} vertical style={styles.butterflyOne}>
            <Text style={styles.butterflyText}>🦋</Text>
          </Floaty>
          <Floaty reducedMotion={reducedMotion} duration={2600} distance={6} vertical style={styles.butterflyTwo}>
            <Text style={styles.butterflyText}>🦋</Text>
          </Floaty>
        </>
      ) : (
        <Text pointerEvents="none" style={styles.butterflyRest}>
          🦋
        </Text>
      )}

      {/* Vật ẩn khám phá của khóa đang học */}
      {hotspots.map(({ hotspot, word }) => (
        <Pressable
          key={hotspot.target}
          onPress={() => handleHotspot(word)}
          accessibilityRole="button"
          accessibilityLabel={`Vật ẩn: ${word.target}, nghĩa là ${word.native}. Chạm để nghe phát âm`}
          style={({ pressed }) => [
            styles.hotspot,
            {
              left: hotspot.leftPct != null ? `${hotspot.leftPct}%` : undefined,
              right: hotspot.rightPct != null ? `${hotspot.rightPct}%` : undefined,
              top: hotspot.topPct != null ? `${hotspot.topPct}%` : undefined,
              bottom: hotspot.bottomPct != null ? `${hotspot.bottomPct}%` : undefined,
            },
            pressed && { transform: [{ scale: 1.2 }] },
          ]}
        >
          <Text style={styles.hotspotEmoji}>{hotspot.emoji}</Text>
        </Pressable>
      ))}

      {/* Bong bóng từ vựng của vật ẩn */}
      {bubble ? (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.bubbleEmoji}>{bubble.word.emoji}</Text>
          <View>
            <Text style={styles.bubbleTarget} maxFontSizeMultiplier={1.2}>
              {bubble.word.target}
              {bubble.word.romanization ? ` · ${bubble.word.romanization}` : ""}
            </Text>
            <Text style={styles.bubbleNative} maxFontSizeMultiplier={1.2}>
              {bubble.word.native}
            </Text>
          </View>
          <Text style={styles.bubbleSpeaker}>🔊</Text>
        </View>
      ) : null}

      {/* Dải hoa theo tiến độ 32 unit */}
      <View pointerEvents="none" style={styles.flowerStrip} aria-hidden>
        {flowers.map((flower) => (
          <Text
            key={`${flower.courseId}-${flower.unitId}`}
            style={[
              styles.flower,
              flower.state === "seed" && styles.flowerSeed,
              flower.state === "growing" && styles.flowerGrowing,
            ]}
          >
            {flower.state === "bloomed"
              ? flower.flowerEmoji
              : flower.state === "growing"
                ? "🌿"
                : "🌱"}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Portal({
  kingdom,
  active,
  completed,
  total,
  percent,
  complete,
  onPress,
}: {
  kingdom: Kingdom;
  active: boolean;
  completed: number;
  total: number;
  percent: number;
  complete: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const positionStyle =
    kingdom.scenePosition === "left"
      ? styles.portalLeft
      : kingdom.scenePosition === "center"
        ? styles.portalCenter
        : styles.portalRight;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${kingdom.kingdomName}, ${kingdom.targetLanguage}: đã học ${completed}/${total} bài, ${percent} phần trăm${active ? ". Đang học khóa này" : ""}`}
      accessibilityHint={active ? "Chạm để xuống bản đồ của vương quốc" : `Chuyển sang học ${kingdom.targetLanguage}`}
      style={({ pressed }) => [
        styles.portal,
        positionStyle,
        pressed && { opacity: 0.88 },
      ]}
    >
      {active ? <View pointerEvents="none" style={styles.portalGlow} /> : null}
      <Image
        source={kingdomPortalImage(kingdom.kingdomId)}
        style={[
          styles.portalImage,
          { aspectRatio: PORTAL_ASPECT[kingdom.kingdomId] ?? 1.2 },
        ]}
        contentFit="contain"
      />
      <View
        style={[
          styles.portalLabel,
          active && {
            borderColor: kingdom.palette.deep,
            backgroundColor: kingdom.palette.soft,
          },
        ]}
      >
        <Flag courseId={kingdom.courseId} size={15} />
        <Text style={styles.portalName} maxFontSizeMultiplier={1.1} numberOfLines={1}>
          {kingdom.shortName}
        </Text>
        {complete ? (
          <Text style={styles.portalTrophy}>🏆</Text>
        ) : completed === 0 ? (
          <Text style={styles.portalTrophy}>🌱</Text>
        ) : (
          <Text style={styles.portalTrophy}>🧭</Text>
        )}
      </View>
      <Text style={styles.portalProgress} maxFontSizeMultiplier={1.1}>
        {completed}/{total} bài · {percent}%
      </Text>
      {active ? (
        <View style={[styles.hereTag, { backgroundColor: kingdom.palette.deep }]}>
          <Text style={styles.hereTagText} maxFontSizeMultiplier={1.1}>
            Đang ở đây
          </Text>
        </View>
      ) : null}
      {active ? (
        <View
          pointerEvents="none"
          style={[styles.activeRing, { borderColor: adventureColors.glow }]}
        />
      ) : null}
    </Pressable>
  );
}

/** Phần tử trôi/bập bềnh nhẹ bằng transform — đứng yên khi giảm chuyển động. */
function Floaty({
  children,
  reducedMotion,
  duration,
  distance,
  vertical = false,
  style,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
  duration: number;
  distance: number;
  vertical?: boolean;
  style?: object;
}) {
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      offset.set(0);
      return;
    }
    offset.set(
      withRepeat(
        withSequence(
          withTiming(distance, { duration }),
          withTiming(vertical ? distance : -distance, { duration }),
          withTiming(0, { duration })
        ),
        -1,
        true
      )
    );
  }, [reducedMotion, duration, distance, vertical, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: vertical
      ? [{ translateY: offset.get() }]
      : [{ translateX: offset.get() }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    scene: {
      position: "relative",
      width: "100%",
      aspectRatio: 1.5,
      maxHeight: 470,
      borderRadius: radius.xxl,
      overflow: "hidden",
      borderWidth: 3,
      borderColor: colors.white,
      backgroundColor: "#BDEBFF",
      ...shadow.chunky,
      marginBottom: 14,
    },
    cloudOne: { position: "absolute", top: "4%", left: "6%" },
    cloudTwo: { position: "absolute", top: "9%", right: "10%" },
    cloudText: { fontSize: 26, opacity: 0.9 },
    treeWrap: {
      position: "absolute",
      bottom: "13%",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    treeGlow: {
      position: "absolute",
      width: "92%",
      aspectRatio: 1,
      borderRadius: radius.full,
      backgroundColor: "#FDE68A59",
      top: "2%",
    },
    treeImage: { width: "100%", aspectRatio: 760 / 790 },
    treeDeco: { position: "absolute", fontSize: 13 },
    portal: {
      position: "absolute",
      width: "30%",
      minWidth: 88,
      alignItems: "center",
      gap: 2,
    },
    portalLeft: { left: "2%", bottom: "9%" },
    portalCenter: { left: "35%", bottom: "16%" },
    portalRight: { right: "2%", bottom: "9%" },
    portalGlow: {
      position: "absolute",
      top: "-6%",
      width: "96%",
      aspectRatio: 1,
      borderRadius: radius.full,
      backgroundColor: "#FDE68A66",
    },
    portalImage: { width: "100%" },
    portalLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surface + "F2",
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
      maxWidth: "100%",
    },
    portalName: { fontSize: 12, fontWeight: "900", color: colors.neutral700 },
    portalTrophy: { fontSize: 11 },
    portalProgress: {
      fontSize: 10.5,
      fontWeight: "800",
      color: colors.white,
      textShadowColor: "rgba(0,0,0,0.45)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    hereTag: {
      borderRadius: radius.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    hereTagText: { fontSize: 10, fontWeight: "900", color: colors.white },
    activeRing: {
      position: "absolute",
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderWidth: 3,
      borderRadius: radius.xl,
      opacity: 0.9,
    },
    badgeSign: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: colors.surface + "E6",
      borderRadius: radius.full,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1.5,
      borderColor: colors.amber,
      maxWidth: "52%",
    },
    badgeEmojis: { fontSize: 12 },
    badgeEmpty: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
    companionRow: {
      position: "absolute",
      left: 8,
      bottom: 30,
      flexDirection: "row",
      gap: 5,
    },
    companionBubble: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: colors.surface + "E6",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.white,
    },
    companionEmoji: { fontSize: 16 },
    butterflyOne: { position: "absolute", top: "30%", right: "16%" },
    butterflyTwo: { position: "absolute", top: "46%", left: "10%" },
    butterflyText: { fontSize: 17 },
    butterflyRest: {
      position: "absolute",
      top: "34%",
      right: "18%",
      fontSize: 15,
      opacity: 0.45,
    },
    hotspot: {
      position: "absolute",
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.surface + "D9",
      borderWidth: 2,
      borderColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 5,
    },
    hotspotEmoji: { fontSize: 18 },
    bubble: {
      position: "absolute",
      top: 10,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 2,
      borderColor: colors.amber,
      paddingHorizontal: 12,
      paddingVertical: 8,
      zIndex: 6,
      ...shadow.card,
    },
    bubbleEmoji: { fontSize: 26 },
    bubbleTarget: { fontSize: 16, fontWeight: "900", color: colors.neutral700 },
    bubbleNative: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    bubbleSpeaker: { fontSize: 15 },
    flowerStrip: {
      position: "absolute",
      left: 6,
      right: 6,
      bottom: 3,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    flower: { fontSize: 12 },
    flowerSeed: { fontSize: 9, opacity: 0.5 },
    flowerGrowing: { fontSize: 11, opacity: 0.85 },
  })
);
