import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { useAuth } from "@/features/supabase/AuthContext";
import {
  buildAdventureLayout,
  buildPathD,
  buildStages,
  chestStateForStage,
  checkpointState,
  planHop,
  STAGE_BANNER_HEIGHT,
  type AdventureStage,
  type CheckpointState,
} from "@/lib/adventure";
import {
  catalog,
  effectiveFrontierIndex,
  useCourseContent,
  type LessonRef,
} from "@/lib/content";
import { kingdomForCourse } from "@/lib/kingdoms";
import {
  accessoryById,
  legendaryUnlocked,
  petForCourse,
} from "@/lib/pets";
import { useProgress } from "@/lib/store";
import {
  kingdomColorTokens,
  radius,
  shadow,
  useGamePalette,
  useThemeColors,
} from "@/lib/theme";
import { isAllUnlocked } from "@/lib/unlock";

const MASCOT = require("@/assets/images/mascot-avatar.png");

/** Khóa AsyncStorage lưu MỐC ĐÃ XEM (biên hiệu lực) theo từng khóa —
 * cơ chế để heo nhảy lò cò khi biên tiến lúc mở lại bản đồ (Đợt A).
 * Cố ý KHÔNG để trong store: đây là trạng thái xem bản đồ, không phải
 * tiến độ học. */
const seenFrontierKey = (courseId: string) =>
  `adventure-seen-frontier:${courseId}`;

type KingdomTokens = NonNullable<ReturnType<typeof kingdomColorTokens>>;

/**
 * BẢN ĐỒ ĐƯỜNG ĐI theo vương quốc (Phase 3 redesign + Đợt A) — thay bản
 * đồ tỉnh làm bản đồ học chính: cuộn dọc trên nền BIỂN nhiều lớp có đảo
 * cát/cỏ, mây và vật trang trí tất định theo chặng (phong cách tranh
 * phiêu lưu, vẽ bằng SVG/emoji của app — không dùng tranh ngoài);
 * đường đi hai tông (viền cát + lõi màu, đoạn đã đi tô màu vương quốc);
 * mỗi bài học là 1 checkpoint hiện SỐ BÀI TOÀN CỤC (bài đã xong có 👑),
 * chặng 6 bài có biển tên (tên unit của bài đầu chặng) và rương kho báu
 * cuối chặng. Mọi trạng thái (xong / hiện tại / mở / khóa, rương mở hay
 * chưa) suy từ tiến độ thật + helper Phase 2 (`effectiveFrontierIndex`,
 * `isLockedAtFrontier` qua `checkpointState`). Ở điểm hiện tại có HEO
 * (hoặc ẢNH CỦA BÉ đặt ở Hồ sơ) + THÚ ĐI THEO của vương quốc do
 * <Traveler> vẽ — kèm cú nhảy lò cò khi biên tiến so với mốc đã xem
 * lưu ở AsyncStorage (trạng thái xem bản đồ, KHÔNG phải tiến độ học).
 */
export function AdventureMap({ courseId }: { courseId: string }) {
  const colors = useThemeColors();
  const palette = useGamePalette();
  const progress = useProgress();
  const { user } = useAuth();
  const { allLessons } = useCourseContent(courseId);
  const kingdom = kingdomForCourse(courseId);
  const tokens = kingdomColorTokens(courseId);

  const completedLessons = progress.courses?.[courseId]?.completedLessons ?? {};
  const learnerLevel = progress.learnerLevel;
  const unlockedAll = isAllUnlocked(progress, user?.email);
  /** Ảnh cá nhân của bé (Hồ sơ) — thay heo ở điểm dừng hiện tại. */
  const avatarImage = progress.avatarImage ?? null;

  /* ----- Thú cưng (Đợt B+C): chìa khóa + rương đã nhận + bạn đồng hành -- */
  const unlockKeys = progress.unlockKeys ?? 0;
  const keyUnlockedIds = progress.keyUnlockedLessons?.[courseId] ?? [];
  const claimedStages = progress.claimedStageRewards?.[courseId] ?? [];
  const equippedHere = progress.equippedAccessories?.[courseId] ?? [];
  const dragonActive =
    progress.activeCompanion === "legendary" &&
    legendaryUnlocked(
      progress.courses ?? {},
      Object.fromEntries(catalog.courses.map((c) => [c.id, c.lessonCount]))
    );
  /** Thú đi theo: Rồng (khi được chọn + đã mở) hoặc thú của vương quốc. */
  const travelerPetEmoji = dragonActive ? "🐉" : kingdom?.companion ?? "🐷";
  /** Phụ kiện đang mặc của thú vương quốc này (Rồng không dùng phụ kiện). */
  const travelerAccessoryEmojis = dragonActive
    ? []
    : equippedHere
        .map((id) => accessoryById(courseId, id)?.emoji)
        .filter((e): e is string => !!e);
  const worldPet = petForCourse(courseId);
  /** Checkpoint đang khóa mà bé vừa chạm — panel hỏi dùng chìa khóa. */
  const [keyPanelRef, setKeyPanelRef] = useState<LessonRef | null>(null);

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

  /* ---- Mốc đã xem + cú nhảy lò cò của heo & thú đi theo (Đợt A) ---- */
  // undefined = chưa đọc xong AsyncStorage; null = chưa từng mở bản đồ.
  const [seenFrontier, setSeenFrontier] = useState<number | null | undefined>(
    undefined
  );
  useEffect(() => {
    let alive = true;
    setSeenFrontier(undefined);
    setHopSession(null);
    AsyncStorage.getItem(seenFrontierKey(courseId))
      .then((raw) => {
        if (!alive) return;
        const n = raw === null ? NaN : Number(raw);
        setSeenFrontier(Number.isFinite(n) ? n : null);
      })
      .catch(() => {
        if (alive) setSeenFrontier(null);
      });
    return () => {
      alive = false;
    };
  }, [courseId]);

  const hopPlan = useMemo(() => {
    if (seenFrontier === undefined || total === 0) return null;
    return planHop(seenFrontier, frontierIndex, total);
  }, [seenFrontier, frontierIndex, total]);

  // Phiên nhảy đang chạy (đông cứng điểm đầu/điểm đích để đổi kế hoạch
  // giữa chừng không cắt ngang cú nhảy).
  const [hopSession, setHopSession] = useState<{
    key: string;
    from: number;
    to: number;
  } | null>(null);
  const skipHopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!hopPlan) return;
    AsyncStorage.setItem(
      seenFrontierKey(courseId),
      String(hopPlan.newSeen)
    ).catch(() => {});
    if (hopPlan.shouldHop) {
      const key = `${courseId}|${seenFrontier}|${hopPlan.toIndex}`;
      setHopSession((prev) =>
        prev?.key === key
          ? prev
          : { key, from: hopPlan.fromIndex, to: hopPlan.toIndex }
      );
    }
    if (seenFrontier !== hopPlan.newSeen) setSeenFrontier(hopPlan.newSeen);
  }, [hopPlan, courseId, seenFrontier]);

  const handleHopEnd = useCallback((key: string) => {
    setHopSession((prev) => (prev?.key === key ? null : prev));
  }, []);

  /* Tự cuộn khi mở bản đồ (một lần mỗi khóa): không nhảy thì cuộn tới
   * điểm hiện tại; có cú nhảy thì CHỜ phiên nhảy được chốt rồi cuộn tới
   * ĐIỂM XUẤT PHÁT để bé thấy heo nhảy về phía đích. */
  const scrollRef = useRef<ScrollView>(null);
  const scrolledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!layout || layout.points.length === 0 || !hopPlan) return;
    if (scrolledForRef.current === courseId) return;
    if (hopPlan.shouldHop && !hopSession) return; // chờ chốt phiên nhảy
    scrolledForRef.current = courseId;
    const startIndex = hopSession ? hopSession.from : hopPlan.toIndex;
    const target =
      layout.points[Math.min(startIndex, layout.points.length - 1)];
    if (!target) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, target.y - 300),
        animated: true,
      });
    }, 90);
    return () => clearTimeout(timer);
  }, [layout, courseId, hopPlan, hopSession]);

  if (!kingdom || !tokens) return null;

  const onCheckpointPress = (ref: LessonRef, state: CheckpointState) => {
    if (state === "locked") {
      // Panel hỏi dùng 🔑 Chìa khóa bí mật để mở sớm (không dùng Alert).
      setKeyPanelRef(ref);
      return;
    }
    router.push(`/lesson/${ref.lesson.id}`);
  };

  const onChestPress = (stage: AdventureStage) => {
    if (chestStateForStage(stage, completedLessons) !== "open") return;
    const stageNumber = stage.index + 1;
    if (!claimedStages.includes(stageNumber)) {
      // Nhận quà TRƯỚC (một lần duy nhất — claimStageReward tự chặn
      // lần hai), rồi sang màn ăn mừng để hiện đúng quà vừa nhận.
      progress.claimStageReward(courseId, stageNumber);
      router.push({
        pathname: "/celebration",
        params: {
          course: courseId,
          stage: String(stage.index),
          justClaimed: "1",
        },
      });
      return;
    }
    router.push({
      pathname: "/celebration",
      params: { course: courseId, stage: String(stage.index) },
    });
  };

  const onUseKey = () => {
    if (!keyPanelRef || unlockKeys <= 0) return;
    progress.useUnlockKey(courseId, keyPanelRef.lesson.id);
    setKeyPanelRef(null);
  };

  const travelerFrom = hopSession ? hopSession.from : hopPlan?.fromIndex ?? 0;
  const travelerTo = hopSession ? hopSession.to : hopPlan?.toIndex ?? 0;

  return (
    <View
      style={[styles.root, { backgroundColor: palette.sea }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {layout && width > 0 ? (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ height: layout.height }}
          onTouchStart={() => skipHopRef.current?.()}
        >
          <View style={{ width, height: layout.height }}>
            <Svg
              width={width}
              height={layout.height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <LinearGradient
                  id="adventureSea"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={palette.skyTop} />
                  <Stop offset="0.3" stopColor={palette.sea} />
                  <Stop offset="1" stopColor={palette.seaDeep} />
                </LinearGradient>
              </Defs>
              {/* Biển nhiều lớp màu (phong cách tranh phiêu lưu, Đợt A) */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={layout.height}
                fill="url(#adventureSea)"
              />
              {/* Đảo cát/cỏ dưới mỗi cụm chặng */}
              {layout.islands.map((island) => (
                <G key={`island-${island.stageIndex}`}>
                  <Ellipse
                    cx={island.x}
                    cy={island.y + 8}
                    rx={island.rx * 1.07}
                    ry={island.ry * 1.05}
                    fill="#ffffff"
                    opacity={0.35}
                  />
                  <Ellipse
                    cx={island.x}
                    cy={island.y}
                    rx={island.rx}
                    ry={island.ry}
                    fill={palette.sand}
                    opacity={0.95}
                  />
                  <Ellipse
                    cx={island.x}
                    cy={island.y - 6}
                    rx={island.rx * 0.8}
                    ry={island.ry * 0.76}
                    fill={palette.grass}
                    opacity={0.9}
                  />
                </G>
              ))}
              {/* Mây trắng mềm rải theo quãng */}
              {layout.clouds.map((cloud, i) => (
                <G key={`cloud-${i}`} opacity={0.85}>
                  <Ellipse
                    cx={cloud.x - 22 * cloud.scale}
                    cy={cloud.y + 4 * cloud.scale}
                    rx={21 * cloud.scale}
                    ry={12 * cloud.scale}
                    fill={palette.cloud}
                  />
                  <Ellipse
                    cx={cloud.x}
                    cy={cloud.y}
                    rx={30 * cloud.scale}
                    ry={16 * cloud.scale}
                    fill={palette.cloud}
                  />
                  <Ellipse
                    cx={cloud.x + 23 * cloud.scale}
                    cy={cloud.y + 5 * cloud.scale}
                    rx={19 * cloud.scale}
                    ry={11 * cloud.scale}
                    fill={palette.cloud}
                  />
                </G>
              ))}
              {/* Đường đi: viền cát bao ngoài + lõi màu (hai tông) */}
              <Path
                d={layout.pathD}
                stroke={palette.sand}
                strokeWidth={23}
                strokeLinecap="round"
                fill="none"
                opacity={0.95}
              />
              <Path
                d={layout.pathD}
                stroke="#bae6fd"
                strokeWidth={13}
                strokeLinecap="round"
                fill="none"
                opacity={0.95}
              />
              <Path
                d={progressPathD}
                stroke={tokens.primary}
                strokeWidth={13}
                strokeLinecap="round"
                fill="none"
                opacity={0.95}
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

            {/* Vật trang trí tất định theo chặng, lệch khỏi đường đi */}
            {layout.decorations.map((deco) => (
              <Text
                key={`deco-${deco.stageIndex}`}
                pointerEvents="none"
                style={[
                  styles.decoration,
                  { left: deco.x - 17, top: deco.y - 17 },
                ]}
              >
                {deco.emoji}
              </Text>
            ))}

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
                keyUnlocked: keyUnlockedIds.includes(ref.lesson.id),
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
              const claimed = claimedStages.includes(stage.index + 1);
              return (
                <Pressable
                  key={`chest-${stage.index}`}
                  onPress={() => onChestPress(stage)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    open
                      ? claimed
                        ? `Rương kho báu Chặng ${stage.index + 1} — đã nhận quà rồi`
                        : `Mở rương kho báu của Chặng ${stage.index + 1} để nhận quà cho thú cưng`
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
                    {open
                      ? claimed
                        ? "Đã nhận quà ✓"
                        : "Mở rương!"
                      : `Rương chặng ${stage.index + 1}`}
                  </Text>
                </Pressable>
              );
            })}

            {/* Heo (hoặc ảnh của bé) + thú đi theo đứng ở điểm hiện tại,
                nhảy lò cò khi biên hiệu lực đã tiến so với lần mở trước */}
            {hopPlan ? (
              <Traveler
                points={layout.points}
                fromIndex={travelerFrom}
                toIndex={travelerTo}
                animate={!!hopSession}
                sessionKey={
                  hopSession
                    ? hopSession.key
                    : `${courseId}|dung-yen|${travelerTo}`
                }
                companionEmoji={travelerPetEmoji}
                accessoryEmojis={travelerAccessoryEmojis}
                avatarImage={avatarImage}
                borderColor={tokens.primary}
                onHopEnd={handleHopEnd}
                registerSkip={(fn) => {
                  skipHopRef.current = fn;
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText} maxFontSizeMultiplier={1.3}>
            Đang trải bản đồ {kingdom.kingdomName}…
          </Text>
        </View>
      )}

      {/* Panel hỏi dùng 🔑 Chìa khóa bí mật cho checkpoint đang khóa */}
      {keyPanelRef ? (
        <View style={styles.keyPanel} accessibilityViewIsModal>
          <Text style={styles.keyPanelPet} maxFontSizeMultiplier={1.2}>
            {travelerPetEmoji}
          </Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.keyPanelTitle} maxFontSizeMultiplier={1.25}>
              {worldPet
                ? `${worldPet.name} nói:`
                : "Bạn đồng hành nói:"}{" "}
              Bài {keyPanelRef.globalIndex + 1}/{total} đang khóa.
            </Text>
            <Text style={styles.keyPanelText} maxFontSizeMultiplier={1.25}>
              Dùng 🔑 Chìa khóa bí mật để mở sớm bài này nhé? Bé đang có{" "}
              {unlockKeys} chìa khóa.
              {unlockKeys <= 0
                ? " Mở rương kho báu ở cuối chặng là kiếm được chìa khóa đó!"
                : ""}
            </Text>
            <View style={styles.keyPanelRow}>
              <Pressable
                onPress={onUseKey}
                disabled={unlockKeys <= 0}
                accessibilityRole="button"
                accessibilityLabel="Dùng chìa khóa bí mật để mở bài này"
                accessibilityState={{ disabled: unlockKeys <= 0 }}
                style={({ pressed }) => [
                  styles.keyUseButton,
                  { backgroundColor: tokens.primary },
                  unlockKeys <= 0 && styles.keyButtonDisabled,
                  pressed && unlockKeys > 0 && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.keyUseText} maxFontSizeMultiplier={1.2}>
                  🔑 Dùng chìa khóa
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setKeyPanelRef(null)}
                accessibilityRole="button"
                accessibilityLabel="Để sau, đóng bảng hỏi chìa khóa"
                style={({ pressed }) => [
                  styles.keyLaterButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.keyLaterText} maxFontSizeMultiplier={1.2}>
                  Để sau
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => setKeyPanelRef(null)}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            style={styles.keyCloseButton}
          >
            <Text style={styles.keyCloseText}>✕</Text>
          </Pressable>
        </View>
      ) : null}
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
  locked: "đang khóa, bấm để hỏi mở bằng chìa khóa bí mật",
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
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Bài ${globalIndex + 1}/${total}: ${unitTitle} — ${STATE_LABEL[state]}`}
      style={[styles.node, { left: x - 42, top: y - 64 }]}
    >
      {state === "completed" ? (
        <Text style={styles.nodeCrown} accessibilityLabel="Bài đã chinh phục">
          👑
        </Text>
      ) : (
        // Điểm hiện tại: heo/ảnh bé + thú đi theo do <Traveler> vẽ đè lên.
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

/* ------------------------------------------------------------------ */

type TravelerProps = {
  points: { x: number; y: number }[];
  fromIndex: number;
  toIndex: number;
  animate: boolean;
  sessionKey: string;
  companionEmoji: string;
  /** Emoji các phụ kiện thú đang mặc (Đợt B+C) — hiện cạnh thú đi theo. */
  accessoryEmojis: string[];
  avatarImage: string | null;
  borderColor: string;
  onHopEnd: (key: string) => void;
  registerSkip: (fn: (() => void) | null) => void;
};

/**
 * HEO PIGLINGO (hoặc ẢNH CỦA BÉ nếu đã đặt ở Hồ sơ) + THÚ ĐI THEO
 * (thú của vương quốc, hoặc Rồng Huyền Thoại khi bé chọn Rồng đồng
 * hành; thú vương quốc hiện kèm emoji các phụ kiện đang mặc — Đợt
 * B+C), đứng ở điểm dừng hiện tại.
 * Khi biên hiệu lực đã tiến so với lần mở trước, cả hai NHẢY LÒ CÒ dọc
 * đường đi từ điểm cũ tới điểm hiện tại trong ~1 giây: mỗi bước là một
 * vòng cung nảy, thú nhảy nối đuôi chậm hơn heo một nhịp. Chạm vào bản
 * đồ là bỏ qua tới đích; đứng yên thì chạm vào marker là nảy nhẹ một
 * cái. Dùng Animated sẵn của React Native, không thêm thư viện.
 */
const Traveler = React.memo(function Traveler({
  points,
  fromIndex,
  toIndex,
  animate,
  sessionKey,
  companionEmoji,
  accessoryEmojis,
  avatarImage,
  borderColor,
  onHopEnd,
  registerSkip,
}: TravelerProps) {
  const hop = useRef(new Animated.Value(0)).current;
  const hopPet = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const bouncePet = useRef(new Animated.Value(0)).current;
  const hoppingRef = useRef(false);

  const waypoints = useMemo(
    () => points.slice(fromIndex, toIndex + 1),
    [points, fromIndex, toIndex]
  );
  const segCount = Math.max(0, waypoints.length - 1);

  // Khung nội suy: mỗi điểm dừng + điểm giữa của bước kế tiếp (điểm
  // giữa nhấc lên -30px → vòng cung nảy lò cò cho từng bước).
  const frames = useMemo(() => {
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const arc: number[] = [];
    waypoints.forEach((p, i) => {
      input.push(i);
      xs.push(p.x);
      ys.push(p.y);
      arc.push(0);
      const next = waypoints[i + 1];
      if (next) {
        input.push(i + 0.5);
        xs.push((p.x + next.x) / 2);
        ys.push((p.y + next.y) / 2);
        arc.push(-30);
      }
    });
    if (input.length < 2 && xs.length > 0) {
      input.push(1);
      xs.push(xs[0]);
      ys.push(ys[0]);
      arc.push(0);
    }
    return { input, xs, ys, arc };
  }, [waypoints]);

  const tx = hop.interpolate({ inputRange: frames.input, outputRange: frames.xs });
  const ty = hop.interpolate({ inputRange: frames.input, outputRange: frames.ys });
  const arcY = hop.interpolate({ inputRange: frames.input, outputRange: frames.arc });
  const petTx = hopPet.interpolate({ inputRange: frames.input, outputRange: frames.xs });
  const petTy = hopPet.interpolate({ inputRange: frames.input, outputRange: frames.ys });
  const petArcY = hopPet.interpolate({ inputRange: frames.input, outputRange: frames.arc });

  useEffect(() => {
    if (!animate || segCount === 0) {
      hop.setValue(segCount);
      hopPet.setValue(segCount);
      hoppingRef.current = false;
      registerSkip(null);
      if (animate) onHopEnd(sessionKey); // phiên 0 bước: dọn ngay
      return;
    }
    hoppingRef.current = true;
    hop.setValue(0);
    hopPet.setValue(0);
    const duration = Math.min(1100, Math.max(520, 420 + segCount * 110));
    const pigAnim = Animated.timing(hop, {
      toValue: segCount,
      duration,
      delay: 380,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const petAnim = Animated.timing(hopPet, {
      toValue: segCount,
      duration,
      delay: 380 + 150,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    pigAnim.start(({ finished }) => {
      if (finished) {
        hoppingRef.current = false;
        registerSkip(null);
        onHopEnd(sessionKey);
      }
    });
    petAnim.start();
    registerSkip(() => {
      pigAnim.stop();
      petAnim.stop();
      hop.setValue(segCount);
      hopPet.setValue(segCount);
      hoppingRef.current = false;
      registerSkip(null);
      onHopEnd(sessionKey);
    });
    return () => {
      pigAnim.stop();
      petAnim.stop();
    };
    // sessionKey là danh tính của phiên nhảy; mọi giá trị khác suy ra
    // từ phiên — chỉ chạy lại khi phiên thay đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const handleTap = () => {
    if (hoppingRef.current) return;
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: -16,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.sequence([
      Animated.delay(110),
      Animated.timing(bouncePet, {
        toValue: -11,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(bouncePet, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (waypoints.length === 0) return null;

  return (
    <>
      {/* Thú đi theo: neo riêng để nhảy nối đuôi sau heo một nhịp */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.travelerAnchor,
          { transform: [{ translateX: petTx }, { translateY: petTy }] },
        ]}
      >
        <Animated.View style={{ transform: [{ translateY: petArcY }] }}>
          <Animated.View style={{ transform: [{ translateY: bouncePet }] }}>
            <View style={styles.travelerPet}>
              <Text style={styles.travelerPetEmoji}>{companionEmoji}</Text>
              {accessoryEmojis.length > 0 ? (
                <Text style={styles.travelerPetAccessory} numberOfLines={1}>
                  {accessoryEmojis.slice(0, 3).join("")}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Heo Piglingo / ảnh của bé ở điểm dừng hiện tại */}
      <Animated.View
        style={[
          styles.travelerAnchor,
          { transform: [{ translateX: tx }, { translateY: ty }] },
        ]}
      >
        <Animated.View style={{ transform: [{ translateY: arcY }] }}>
          <Animated.View style={{ transform: [{ translateY: bounce }] }}>
            <Pressable
              onPress={handleTap}
              accessibilityRole="button"
              accessibilityLabel={
                avatarImage
                  ? `Ảnh của bé đang ở Bài ${toIndex + 1}`
                  : `Heo Piglingo đang ở Bài ${toIndex + 1}`
              }
              style={[styles.travelerMarker, { borderColor }]}
            >
              {avatarImage ? (
                <Image
                  source={{ uri: avatarImage }}
                  style={styles.travelerImage}
                  contentFit="cover"
                />
              ) : (
                <Image
                  source={MASCOT}
                  style={styles.travelerImage}
                  contentFit="contain"
                />
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  decoration: {
    position: "absolute",
    fontSize: 30,
    opacity: 0.9,
  },
  travelerAnchor: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  },
  travelerMarker: {
    position: "absolute",
    left: -23,
    top: -80,
    width: 46,
    height: 46,
    borderRadius: radius.full,
    borderWidth: 3,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  travelerImage: { width: 40, height: 40, borderRadius: radius.full },
  travelerPet: {
    position: "absolute",
    left: 15,
    top: -64,
    minWidth: 36,
    minHeight: 36,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    ...shadow.soft,
  },
  travelerPetEmoji: { fontSize: 20 },
  travelerPetAccessory: { fontSize: 9, lineHeight: 11, marginTop: -3 },
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
  nodeCrown: { height: 32, fontSize: 21, lineHeight: 30, textAlign: "center" },
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
    width: 72,
    height: 72,
    borderRadius: radius.full,
    borderWidth: 3,
    borderBottomWidth: 7,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  chestEmoji: { fontSize: 36 },
  chestLock: { position: "absolute", right: -4, bottom: -4, fontSize: 16 },
  chestLabel: { fontSize: 10.5, fontWeight: "800", marginTop: 3 },
  /* Panel hỏi dùng chìa khóa bí mật (overlay đáy màn bản đồ) */
  keyPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#f59e0b",
    borderRadius: radius.xl,
    padding: 14,
    ...shadow.card,
  },
  keyPanelPet: { fontSize: 34 },
  keyPanelTitle: { fontSize: 15, fontWeight: "900", color: "#92400e" },
  keyPanelText: { fontSize: 13.5, fontWeight: "600", color: "#57534e" },
  keyPanelRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  keyUseButton: {
    minHeight: 48,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keyButtonDisabled: { backgroundColor: "#d6d3d1" },
  keyUseText: { fontSize: 14, fontWeight: "900", color: "#ffffff" },
  keyLaterButton: {
    minHeight: 48,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f4",
    borderWidth: 2,
    borderColor: "#e7e5e4",
  },
  keyLaterText: { fontSize: 14, fontWeight: "800", color: "#57534e" },
  keyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f4",
  },
  keyCloseText: { fontSize: 15, fontWeight: "900", color: "#78716c" },
});
