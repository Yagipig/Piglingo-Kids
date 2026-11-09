import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAuth } from "@/features/supabase/AuthContext";
import {
  buildAdventureLayout,
  buildPathD,
  buildStages,
  chestStateForStage,
  checkpointState,
  STAGE_BANNER_HEIGHT,
  type AdventureStage,
  type CheckpointState,
} from "@/lib/adventure";
import {
  effectiveFrontierIndex,
  useCourseContent,
  type LessonRef,
} from "@/lib/content";
import { kingdomForCourse } from "@/lib/kingdoms";
import { useProgress } from "@/lib/store";
import { kingdomColorTokens, radius, shadow, useThemeColors } from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";

const MASCOT = require("@/assets/images/mascot-avatar.png");

type KingdomTokens = NonNullable<ReturnType<typeof kingdomColorTokens>>;

/**
 * BẢN ĐỒ ĐƯỜNG ĐI theo vương quốc (Phase 3 redesign) — thay bản đồ tỉnh
 * làm bản đồ học chính: cuộn dọc, đường SVG uốn lượn tất định, mỗi bài
 * học là 1 checkpoint hiện SỐ BÀI TOÀN CỤC, chặng 6 bài có biển tên
 * (tên unit của bài đầu chặng) và rương kho báu cuối chặng. Mọi trạng
 * thái (xong / hiện tại / mở / khóa, rương mở hay chưa) suy từ tiến độ
 * thật + helper Phase 2 (`effectiveFrontierIndex`,
 * `isLockedAtFrontier` qua `checkpointState`) — component này không
 * lưu thêm trạng thái học nào.
 */
export function AdventureMap({ courseId }: { courseId: string }) {
  const colors = useThemeColors();
  const progress = useProgress();
  const { user } = useAuth();
  const { allLessons } = useCourseContent(courseId);
  const kingdom = kingdomForCourse(courseId);
  const tokens = kingdomColorTokens(courseId);

  const completedLessons = progress.courses?.[courseId]?.completedLessons ?? {};
  const learnerLevel = progress.learnerLevel;
  const unlockedAll = isAllUnlocked(progress, user?.email);

  const lessonIds = useMemo(() => allLessons.map((l) => l.lesson.id), [allLessons]);
  const frontierIndex = effectiveFrontierIndex(
    completedLessons,
    lessonIds,
    learnerLevel
  );
  const stages = useMemo(() => buildStages(allLessons), [allLessons]);
  const total = allLessons.length;

  const [width, setWidth] = useState(0);
  const layout = useMemo(
    () => (width > 0 ? buildAdventureLayout(allLessons, width) : null),
    [allLessons, width]
  );

  // Đường đã đi: từ bài đầu tới bài ở biên hiệu lực (toàn bộ khi học xong).
  const progressPathD = useMemo(() => {
    if (!layout) return "";
    return buildPathD(layout.points.slice(0, frontierIndex + 1));
  }, [layout, frontierIndex]);

  /* Tự cuộn tới checkpoint hiện tại khi mở bản đồ (một lần mỗi khóa). */
  const scrollRef = useRef<ScrollView>(null);
  const scrolledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!layout || layout.points.length === 0) return;
    if (scrolledForRef.current === courseId) return;
    scrolledForRef.current = courseId;
    const target =
      layout.points[Math.min(frontierIndex, layout.points.length - 1)];
    if (!target) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, target.y - 300),
        animated: true,
      });
    }, 90);
    return () => clearTimeout(timer);
  }, [layout, courseId, frontierIndex]);

  if (!kingdom || !tokens) return null;

  const onCheckpointPress = (ref: LessonRef, state: CheckpointState) => {
    if (state === "locked") return;
    router.push(`/lesson/${ref.lesson.id}`);
  };

  const onChestPress = (stage: AdventureStage) => {
    if (chestStateForStage(stage, completedLessons) !== "open") return;
    router.push({
      pathname: "/celebration",
      params: { course: courseId, stage: String(stage.index) },
    });
  };

  return (
    <View
      style={[styles.root, { backgroundColor: tokens.soft }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {layout && width > 0 ? (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ height: layout.height }}
        >
          <View style={{ width, height: layout.height }}>
            <Svg
              width={width}
              height={layout.height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Path
                d={layout.pathD}
                stroke={colors.white}
                strokeWidth={15}
                strokeLinecap="round"
                fill="none"
                opacity={0.65}
              />
              <Path
                d={progressPathD}
                stroke={tokens.primary}
                strokeWidth={15}
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
              <Path
                d={layout.pathD}
                stroke={colors.white}
                strokeWidth={3}
                strokeDasharray="0.5 13"
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
            </Svg>

            {/* Họa tiết vương quốc rải dọc đường đi (tất định theo chỉ số bài) */}
            {layout.points.map((point) =>
              point.globalIndex % 3 === 1 ? (
                <Text
                  key={`motif-${point.globalIndex}`}
                  pointerEvents="none"
                  style={[
                    styles.motif,
                    { left: width - point.x - 14, top: point.y - 62 },
                  ]}
                >
                  {kingdom.motif[point.globalIndex % kingdom.motif.length]}
                </Text>
              ) : null
            )}

            {/* Biển tên chặng */}
            {layout.banners.map((banner) => {
              const stage = stages[banner.stageIndex];
              if (!stage) return null;
              return (
                <View
                  key={`banner-${stage.index}`}
                  pointerEvents="none"
                  style={[
                    styles.banner,
                    { top: banner.y, borderColor: tokens.primary },
                  ]}
                >
                  <View
                    style={[styles.bannerBadge, { backgroundColor: tokens.deep }]}
                  >
                    <Text style={styles.bannerBadgeText}>
                      {stage.index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.bannerTitle, { color: tokens.deep }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      Chặng {stage.index + 1} · {stage.title}
                    </Text>
                    <Text style={styles.bannerSub} maxFontSizeMultiplier={1.2}>
                      Bài {stage.startGlobal + 1}–{stage.endGlobal + 1} trong
                      toàn khóa
                    </Text>
                  </View>
                  <Text style={styles.bannerEmoji}>{kingdom.motif[0]}</Text>
                </View>
              );
            })}

            {/* Checkpoint từng bài học */}
            {layout.points.map((point) => {
              const ref = allLessons[point.globalIndex];
              if (!ref) return null;
              const state = checkpointState({
                unlockedAll,
                completed: !!completedLessons[ref.lesson.id],
                globalIndex: point.globalIndex,
                frontierIndex,
              });
              return (
                <CheckpointNode
                  key={`cp-${point.globalIndex}`}
                  x={point.x}
                  y={point.y}
                  state={state}
                  globalIndex={point.globalIndex}
                  total={total}
                  unitTitle={ref.unit.title}
                  tokens={tokens}
                  mutedColor={colors.textMuted}
                  lockedBg={colors.neutral200}
                  lockedBorder={colors.neutral300}
                  onPress={() => onCheckpointPress(ref, state)}
                />
              );
            })}

            {/* Rương kho báu cuối mỗi chặng */}
            {layout.chests.map((chest) => {
              const stage = stages[chest.stageIndex];
              if (!stage) return null;
              const chestState = chestStateForStage(stage, completedLessons);
              const open = chestState === "open";
              return (
                <Pressable
                  key={`chest-${stage.index}`}
                  onPress={() => onChestPress(stage)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    open
                      ? `Mở rương kho báu của Chặng ${stage.index + 1}`
                      : `Rương kho báu Chặng ${stage.index + 1} chưa mở — học xong chặng này để mở`
                  }
                  accessibilityState={{ disabled: !open }}
                  style={[styles.chest, { left: chest.x - 48, top: chest.y - 48 }]}
                >
                  <View
                    style={[
                      styles.chestCircle,
                      open
                        ? { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }
                        : {
                            backgroundColor: colors.neutral200,
                            borderColor: colors.neutral300,
                          },
                    ]}
                  >
                    <Text style={styles.chestEmoji}>{open ? "🎁" : "📦"}</Text>
                    {!open ? <Text style={styles.chestLock}>🔒</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.chestLabel,
                      { color: open ? "#b45309" : colors.textMuted },
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {open ? "Mở rương!" : `Rương chặng ${stage.index + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText} maxFontSizeMultiplier={1.3}>
            Đang trải bản đồ {kingdom.kingdomName}…
          </Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */

type CheckpointNodeProps = {
  x: number;
  y: number;
  state: CheckpointState;
  globalIndex: number;
  total: number;
  unitTitle: string;
  tokens: KingdomTokens;
  mutedColor: string;
  lockedBg: string;
  lockedBorder: string;
  onPress: () => void;
};

const STATE_LABEL: Record<CheckpointState, string> = {
  completed: "đã học xong, bấm để ôn lại",
  current: "bài đang học, bấm để học",
  open: "đã mở khóa, bấm để học",
  locked: "đang khóa",
};

const CheckpointNode = React.memo(function CheckpointNode({
  x,
  y,
  state,
  globalIndex,
  total,
  unitTitle,
  tokens,
  mutedColor,
  lockedBg,
  lockedBorder,
  onPress,
}: CheckpointNodeProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (state !== "current") return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 620,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [state, pulse]);

  const circleStyle =
    state === "completed"
      ? { backgroundColor: tokens.primary, borderColor: tokens.deep }
      : state === "current"
        ? { backgroundColor: tokens.deep, borderColor: tokens.primary }
        : state === "open"
          ? { backgroundColor: "#ffffff", borderColor: tokens.primary }
          : { backgroundColor: lockedBg, borderColor: lockedBorder };

  return (
    <Pressable
      onPress={state === "locked" ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={`Bài ${globalIndex + 1}/${total}: ${unitTitle} — ${STATE_LABEL[state]}`}
      accessibilityState={{ disabled: state === "locked" }}
      style={[styles.node, { left: x - 42, top: y - 64 }]}
    >
      {state === "current" ? (
        <Image
          source={MASCOT}
          style={styles.nodePig}
          contentFit="contain"
          accessibilityLabel="Heo Piglingo đang đứng ở bài này"
        />
      ) : (
        <View style={styles.nodePigSpacer} />
      )}
      <Animated.View
        style={[
          styles.nodeCircle,
          circleStyle,
          state === "current" ? { transform: [{ scale: pulse }] } : null,
        ]}
      >
        <Text
          style={[
            styles.nodeText,
            state === "open" ? { color: tokens.deep } : null,
            state === "locked" ? { fontSize: 24 } : null,
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {state === "completed"
            ? "✓"
            : state === "locked"
              ? "🔒"
              : String(globalIndex + 1)}
        </Text>
      </Animated.View>
      <Text
        style={[
          styles.nodeLabel,
          {
            color: state === "current" ? tokens.deep : mutedColor,
            fontWeight: state === "current" ? "900" : "700",
          },
        ]}
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
      >
        Bài {globalIndex + 1}/{total}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  motif: {
    position: "absolute",
    fontSize: 22,
    opacity: 0.5,
  },
  banner: {
    position: "absolute",
    left: 14,
    right: 14,
    height: STAGE_BANNER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    ...shadow.soft,
  },
  bannerBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerBadgeText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  bannerTitle: { fontSize: 15, fontWeight: "900" },
  bannerSub: { fontSize: 11.5, fontWeight: "700", color: "#737373" },
  bannerEmoji: { fontSize: 20 },
  node: {
    position: "absolute",
    width: 84,
    height: 116,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  nodePig: { width: 32, height: 32 },
  nodePigSpacer: { height: 32 },
  nodeCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  nodeText: { fontSize: 21, fontWeight: "900", color: "#ffffff" },
  nodeLabel: { fontSize: 10.5, marginTop: 3 },
  chest: {
    position: "absolute",
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  chestCircle: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  chestEmoji: { fontSize: 30 },
  chestLock: { position: "absolute", right: -4, bottom: -4, fontSize: 16 },
  chestLabel: { fontSize: 10.5, fontWeight: "800", marginTop: 3 },
});
