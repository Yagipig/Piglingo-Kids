import { Image } from "expo-image";
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import Svg, {
  Ellipse,
  G,
  Path,
  Text as SvgText,
} from "react-native-svg";

import type { LessonRef } from "@/lib/content";
import { MAP_VIEWBOX, PROVINCE_SHAPES } from "@/lib/province-shapes";
import {
  PROVINCES,
  REGION_LABELS,
  SEA_POINTS,
  provinceIndexForUnit,
  unitIndexForProvince,
  type Province,
  type ProvinceRegion,
  type SeaPoint,
} from "@/lib/provinces";
import { makeThemedStyles, radius, shadow } from "@/lib/theme";
import type { UnitPack } from "@/lib/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/* ------------------------------------------------------------------ */
/* Hằng số thế giới                                                    */
/* ------------------------------------------------------------------ */

/**
 * Kích thước "thế giới" — đúng tỉ lệ MAP_VIEWBOX (1000×1977) của dữ
 * liệu ranh giới tỉnh: rộng 1600 → cao ≈ 3163. Tọa độ viewBox được
 * nhân tỉ lệ SX/SY sang tọa độ thế giới. Bề rộng 1600 (thay cho 1250
 * trước đây) giúp tỉnh to hơn và luôn có khoảng kéo NGANG trên màn
 * hình máy tính rộng.
 */
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 3163;

const SX = WORLD_WIDTH / MAP_VIEWBOX.width;
const SY = WORLD_HEIGHT / MAP_VIEWBOX.height;

/** Trần zoom tuyệt đối (giới hạn dưới của thang zoom tối đa động). */
const MAX_SCALE = 1.8;

/** Mức zoom khi bay tới một tỉnh trên khung nhìn dọc (điện thoại). */
const PROVINCE_FOCUS_SCALE = 0.8;

/**
 * Thang zoom ĐỘNG theo kích thước khung nhìn thật:
 * - fitScale: mức zoom thấy TRỌN cả nước trong khung.
 * - coverScale: mức zoom bản đồ PHỦ KÍN khung (không hở biển ở 2 bên).
 * - Zoom nhỏ nhất = fitScale × 0,95 (nút − luôn thu về thấy toàn quốc).
 * - Zoom lớn nhất = max(1,8, coverScale × 2,2).
 */
type ScaleLimits = {
  fitScale: number;
  coverScale: number;
  minScale: number;
  maxScale: number;
};

function scaleLimits(vw: number, vh: number): ScaleLimits {
  if (vw <= 0 || vh <= 0) {
    return { fitScale: 0, coverScale: 0, minScale: 0.1, maxScale: MAX_SCALE };
  }
  const fitScale = Math.min(vw / WORLD_WIDTH, vh / WORLD_HEIGHT);
  const coverScale = Math.max(vw / WORLD_WIDTH, vh / WORLD_HEIGHT);
  return {
    fitScale,
    coverScale,
    minScale: fitScale * 0.95,
    maxScale: Math.max(MAX_SCALE, coverScale * 2.2),
  };
}

/** Tên tỉnh hiện khi zoom ≥ 0,5; riêng các tỉnh nhỏ cần ≥ 0,85. */
const LABEL_MIN_SCALE = 0.5;
const SMALL_LABEL_MIN_SCALE = 0.85;
const SMALL_LABEL_IDS = new Set(["ha-noi", "bac-ninh", "hung-yen", "hai-phong"]);

/** Bảng màu kẹo pastel tô tỉnh, luân phiên tất định theo thứ tự hành trình. */
const PROVINCE_COLORS = [
  "#ffadad",
  "#ffd6a5",
  "#fdffb6",
  "#caffbf",
  "#9bf6ff",
  "#a0c4ff",
  "#ffc6ff",
  "#bdb2ff",
];

/** Màu biển nền của thế giới. */
const SEA_COLOR = "#a8dffd";

/** Điểm neo (tọa độ viewBox) khi bay tới từng miền. */
const REGION_ANCHOR_VB: Record<ProvinceRegion, { x: number; y: number }> = {
  bac: { x: 500, y: 300 },
  trung: { x: 540, y: 1080 },
  nam: { x: 430, y: 1730 },
};

/** Mức zoom gợi ý khi bay tới từng miền (theo thang thế giới 1600). */
const REGION_SCALE: Record<ProvinceRegion, number> = {
  bac: 0.42,
  trung: 0.46,
  nam: 0.55,
};

/**
 * Vị trí cụm đảo Hoàng Sa / Trường Sa (tọa độ viewBox) — đặt gọn trong
 * vùng Biển Đông, không đè đất liền (bỏ qua x/y cũ trong provinces.ts).
 */
const SEA_CLUSTER_VB: Record<string, { x: number; y: number }> = {
  "hoang-sa": { x: 835, y: 985 },
  "truong-sa": { x: 938, y: 1545 },
};

/** Huy hiệu số thứ tự unit tại tâm tỉnh (kích thước theo tọa độ thế giới). */
const BADGE_SIZE = 54;
const BADGE_SIZE_CURRENT = 68;
const BADGE_SIZE_INFO = 40;
const BADGE_WRAP_W = 120;
const SEA_BADGE_SIZE = 46;

/** Trang trí vui trong vùng biển (tọa độ viewBox, phóng to thu nhỏ cùng bản đồ). */
const SEA_DECORATIONS: { emoji: string; vx: number; vy: number; size: number }[] = [
  { emoji: "☀️", vx: 105, vy: 85, size: 66 },
  { emoji: "☁️", vx: 300, vy: 48, size: 44 },
  { emoji: "☁️", vx: 898, vy: 95, size: 40 },
  { emoji: "🐙", vx: 878, vy: 430, size: 42 },
  { emoji: "⛵", vx: 872, vy: 700, size: 48 },
  { emoji: "🌊", vx: 92, vy: 700, size: 40 },
  { emoji: "🐳", vx: 922, vy: 1175, size: 52 },
  { emoji: "🌊", vx: 950, vy: 1305, size: 42 },
  { emoji: "🦀", vx: 122, vy: 1565, size: 40 },
  { emoji: "🐠", vx: 168, vy: 1872, size: 42 },
  { emoji: "⛵", vx: 705, vy: 1905, size: 46 },
];

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu trao đổi với màn cha                                   */
/* ------------------------------------------------------------------ */

export type WorldMapCourseData = {
  courseId: string;
  targetLanguage: string;
  /** Unit theo đúng thứ tự pack của khóa. */
  units: UnitPack[];
  lessonsByUnit: Map<string, LessonRef[]>;
  completedLessons: Record<string, true>;
  /** globalIndex của bài hiện tại trong khóa (currentLessonIndex). */
  currentIndex: number;
  totalLessons: number;
};

export type WorldMapHandle = {
  /** Bay camera tới tỉnh chứa unit thứ `unitIndex` của khóa, đồng thời chọn tỉnh đó. */
  centerOnUnit: (courseId: string, unitIndex: number) => void;
  /** Bay camera tới tỉnh thứ `journeyIndex` trong hành trình và chọn tỉnh đó. */
  centerOnProvince: (journeyIndex: number) => void;
  /** Bay camera tới giữa một miền (Bắc/Trung/Nam). */
  centerOnRegion: (region: ProvinceRegion) => void;
  /** Phóng to một nấc quanh tâm khung nhìn. */
  zoomIn: () => void;
  /** Thu nhỏ một nấc quanh tâm khung nhìn. */
  zoomOut: () => void;
  /** Bay về tỉnh đang học của khóa đang chọn và mở bảng chi tiết. */
  centerOnCurrent: () => void;
};

type WorldMapProps = {
  courses: WorldMapCourseData[];
  activeCourseId: string;
  unlockedAll: boolean;
  /** Đổi khóa đang chọn (khi chạm chip gợi ý ngôn ngữ khác trong bảng tỉnh). */
  onSelectCourse: (courseId: string) => void;
  /** Chạm một chip bài học trong bảng chi tiết → mở MissionPanel ở màn cha. */
  onMissionPress: (ref: LessonRef, courseId: string) => void;
  /** Mở sổ tay của unit từ bảng chi tiết tỉnh. */
  onGuidebookPress: (unit: UnitPack, courseId: string) => void;
};

type ProvinceVisualState = "done" | "current" | "locked" | "available" | "info";

type ProvinceModel = {
  province: Province;
  index: number;
  /** Tâm tỉnh theo tọa độ viewBox (từ PROVINCE_SHAPES). */
  vbX: number;
  vbY: number;
  /** Tâm tỉnh theo tọa độ thế giới. */
  cx: number;
  cy: number;
  /** Màu tô pastel của tỉnh (luân phiên theo thứ tự hành trình). */
  color: string;
  state: ProvinceVisualState;
  /** Unit của khóa đang chọn đặt tại tỉnh này (null nếu không có). */
  unit: UnitPack | null;
  unitIndex: number | null;
  doneCount: number;
  totalCount: number;
};

type SeaModel = {
  point: SeaPoint;
  vbX: number;
  vbY: number;
  cx: number;
  cy: number;
};

type Selection =
  | { kind: "province"; index: number }
  | { kind: "sea"; id: string }
  | null;

type Camera = { x: number; y: number; scale: number };

function clampScale(scale: number, limits: ScaleLimits): number {
  return Math.min(limits.maxScale, Math.max(limits.minScale, scale));
}

function clampCamera(cam: Camera, vw: number, vh: number): Camera {
  const scale = clampScale(cam.scale, scaleLimits(vw, vh));
  if (vw <= 0 || vh <= 0) return { x: cam.x, y: cam.y, scale };
  const w = WORLD_WIDTH * scale;
  const h = WORLD_HEIGHT * scale;
  const x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, cam.x));
  const y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, cam.y));
  return { x, y, scale };
}

/** Điểm chạm theo tọa độ trong khung nhìn (ưu tiên touches của sự kiện). */
function touchPoints(e: GestureResponderEvent): { x: number; y: number }[] {
  const ne = e.nativeEvent as unknown as {
    touches?: { locationX: number; locationY: number }[];
    locationX: number;
    locationY: number;
  };
  if (ne.touches && ne.touches.length > 0) {
    return ne.touches.map((t) => ({ x: t.locationX, y: t.locationY }));
  }
  return [{ x: ne.locationX, y: ne.locationY }];
}

/* ------------------------------------------------------------------ */
/* Trang trí biển (emoji đặt trong thế giới, zoom cùng bản đồ)         */
/* ------------------------------------------------------------------ */

const SeaDecorations = memo(function SeaDecorations() {
  const styles = useStyles();
  return (
    <>
      {SEA_DECORATIONS.map((d, i) => {
        const fontSize = d.size * SX;
        return (
          <Text
            key={i}
            pointerEvents="none"
            style={[
              styles.decoration,
              {
                left: d.vx * SX - fontSize / 2,
                top: d.vy * SY - fontSize / 2,
                fontSize,
              },
            ]}
          >
            {d.emoji}
          </Text>
        );
      })}
    </>
  );
});

/* ------------------------------------------------------------------ */
/* Lớp SVG: hình tỉnh tô màu + đường hành trình + cụm đảo + tên tỉnh   */
/* ------------------------------------------------------------------ */

const MapSvgLayer = memo(function MapSvgLayer({
  models,
  seaModels,
  selectedIndex,
  selectedSeaId,
  labelLevel,
  onProvincePress,
  onSeaPress,
}: {
  models: ProvinceModel[];
  seaModels: SeaModel[];
  selectedIndex: number | null;
  selectedSeaId: string | null;
  /** 0: chỉ tỉnh đang học/đang chọn · 1: ≥0,5 · 2: ≥0,85 (cả tỉnh nhỏ). */
  labelLevel: 0 | 1 | 2;
  onProvincePress: (index: number) => void;
  onSeaPress: (id: string) => void;
}) {
  // Đường hành trình: nối tâm các tỉnh CÓ unit của khóa đang chọn,
  // theo đúng thứ tự unit (điểm dừng 1 → 2 → … → cuối).
  const journeyD = useMemo(() => {
    const stops = models
      .filter((m) => m.unitIndex !== null)
      .sort((a, b) => (a.unitIndex as number) - (b.unitIndex as number));
    if (stops.length < 2) return null;
    return stops
      .map((m, i) => `${i === 0 ? "M" : "L"}${m.vbX.toFixed(1)} ${m.vbY.toFixed(1)}`)
      .join(" ");
  }, [models]);

  const labelVisible = (m: ProvinceModel): boolean => {
    if (m.state === "current" || m.index === selectedIndex) return true;
    const need = SMALL_LABEL_IDS.has(m.province.id) ? 2 : 1;
    return labelLevel >= need;
  };

  return (
    <Svg
      width={WORLD_WIDTH}
      height={WORLD_HEIGHT}
      viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      preserveAspectRatio="none"
      pointerEvents="box-none"
      style={stylesSvg}
    >
      {/* Hình các tỉnh: chạm vào chính vùng tỉnh để chọn */}
      {models.map((m) => {
        const shape = PROVINCE_SHAPES[m.province.id];
        if (!shape) return null;
        const selected = m.index === selectedIndex;
        return (
          <React.Fragment key={m.province.id}>
            <Path
              d={shape.d}
              fill={m.color}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              onPress={() => onProvincePress(m.index)}
            />
            {selected ? (
              <Path
                d={shape.d}
                fill="rgba(255,255,255,0.30)"
                stroke="#ff8c1a"
                strokeWidth={5}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
              />
            ) : null}
          </React.Fragment>
        );
      })}

      {/* Đường hành trình Bắc → Nam: lớp trắng dưới + chấm tròn hồng cam trên */}
      {journeyD ? (
        <>
          <Path
            d={journeyD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
            pointerEvents="none"
          />
          <Path
            d={journeyD}
            fill="none"
            stroke="#ff7b54"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.1 15"
            pointerEvents="none"
          />
        </>
      ) : null}

      {/* Cụm đảo Hoàng Sa / Trường Sa vẽ ngay trong SVG */}
      {seaModels.map((s) => {
        const selected = s.point.id === selectedSeaId;
        return (
          <G key={s.point.id} onPress={() => onSeaPress(s.point.id)}>
            {selected ? (
              <Ellipse
                cx={s.vbX}
                cy={s.vbY}
                rx={56}
                ry={38}
                fill="none"
                stroke="#ff8c1a"
                strokeWidth={3.5}
                pointerEvents="none"
              />
            ) : null}
            <Ellipse cx={s.vbX} cy={s.vbY} rx={30} ry={12} fill="#ffe9a8" stroke="#e8c86a" strokeWidth={2} />
            <Ellipse cx={s.vbX - 26} cy={s.vbY + 11} rx={16} ry={7} fill="#ffe9a8" stroke="#e8c86a" strokeWidth={2} />
            <Ellipse cx={s.vbX + 27} cy={s.vbY + 12} rx={14} ry={6} fill="#ffe9a8" stroke="#e8c86a" strokeWidth={2} />
            <Ellipse cx={s.vbX + 5} cy={s.vbY - 7} rx={13} ry={6} fill="#7ec850" pointerEvents="none" />
            <SvgText
              x={s.vbX}
              y={s.vbY + 54}
              fontSize={24}
              fontWeight="800"
              textAnchor="middle"
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth={6}
              pointerEvents="none"
            >
              {s.point.name.replace("Quần đảo ", "")}
            </SvgText>
            <SvgText
              x={s.vbX}
              y={s.vbY + 54}
              fontSize={24}
              fontWeight="800"
              textAnchor="middle"
              fill="#0c4a6e"
              pointerEvents="none"
            >
              {s.point.name.replace("Quần đảo ", "")}
            </SvgText>
          </G>
        );
      })}

      {/* Tên tỉnh tại tâm tỉnh (vẽ 2 lớp: viền sáng dưới + chữ đậm trên) */}
      {models.map((m) =>
        labelVisible(m) ? (
          <React.Fragment key={`label-${m.province.id}`}>
            <SvgText
              x={m.vbX}
              y={m.vbY + 47}
              fontSize={25}
              fontWeight="800"
              textAnchor="middle"
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth={6}
              pointerEvents="none"
            >
              {m.province.name}
            </SvgText>
            <SvgText
              x={m.vbX}
              y={m.vbY + 47}
              fontSize={25}
              fontWeight="800"
              textAnchor="middle"
              fill="#0c4a6e"
              pointerEvents="none"
            >
              {m.province.name}
            </SvgText>
          </React.Fragment>
        ) : null
      )}
    </Svg>
  );
});

const stylesSvg = { position: "absolute" as const, left: 0, top: 0 };

/**
 * Trên WEB: khóa cử chỉ của trình duyệt trên vùng bản đồ — `touchAction:
 * "none"` để chụm/cuộn không bị trình duyệt giành làm zoom CẢ TRANG,
 * `userSelect: "none"` để kéo chuột không bôi chọn chữ. Ngoài web: null.
 */
const WEB_VIEWPORT_LOCK: ViewStyle | null =
  Platform.OS === "web"
    ? ({ touchAction: "none", userSelect: "none" } as unknown as ViewStyle)
    : null;

/* ------------------------------------------------------------------ */
/* Huy hiệu tại tâm tỉnh: số thứ tự unit / 📖 cho tỉnh chỉ xem tin     */
/* ------------------------------------------------------------------ */

const UnitBadge = memo(function UnitBadge({
  model,
  selected,
  reducedMotion,
  onPress,
}: {
  model: ProvinceModel;
  selected: boolean;
  reducedMotion: boolean;
  onPress: (index: number) => void;
}) {
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(0)).current;
  const isCurrent = model.state === "current";
  const isInfo = model.state === "info";

  useEffect(() => {
    if (!isCurrent || reducedMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCurrent, reducedMotion, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.3] });

  const size = isInfo
    ? BADGE_SIZE_INFO
    : isCurrent
      ? BADGE_SIZE_CURRENT
      : BADGE_SIZE;

  const stateText = isInfo
    ? "chỉ xem thông tin tỉnh"
    : model.state === "done"
      ? `điểm dừng số ${(model.unitIndex as number) + 1}, đã học xong ${model.totalCount} bài`
      : model.state === "current"
        ? `điểm dừng số ${(model.unitIndex as number) + 1}, đang học ở đây`
        : model.state === "locked"
          ? `điểm dừng số ${(model.unitIndex as number) + 1}, chưa mở khóa`
          : `điểm dừng số ${(model.unitIndex as number) + 1}, có bài học đang chờ, đã xong ${model.doneCount}/${model.totalCount} bài`;

  return (
    <View
      style={[
        styles.badgeWrap,
        { left: model.cx - BADGE_WRAP_W / 2, top: model.cy - size / 2 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => onPress(model.index)}
        accessibilityRole="button"
        accessibilityLabel={`Tỉnh ${model.province.name} — ${stateText}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.badgePress, pressed && { opacity: 0.85 }]}
      >
        <View style={{ width: size, height: size }}>
          {isCurrent ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  width: size + 22,
                  height: size + 22,
                  left: -11,
                  top: -11,
                  borderRadius: (size + 22) / 2,
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
          ) : null}
          {isCurrent ? (
            <View pointerEvents="none" style={[styles.mascotWrap, { left: (size - 44) / 2 }]}>
              <Image
                source={require("@/assets/images/mascot-avatar.png")}
                style={styles.mascot}
                contentFit="cover"
                accessibilityLabel="Bạn heo đang học ở tỉnh này"
              />
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              { width: size, height: size, borderRadius: size / 2 },
              model.state === "done" && styles.badgeDone,
              model.state === "current" && styles.badgeCurrent,
              model.state === "locked" && styles.badgeLocked,
              model.state === "available" && styles.badgeAvailable,
              isInfo && styles.badgeInfo,
              selected && styles.badgeSelected,
            ]}
          >
            {isInfo ? (
              <Text style={{ fontSize: size * 0.5 }}>📖</Text>
            ) : (
              <Text
                style={[
                  styles.badgeNumber,
                  { fontSize: size * 0.42 },
                  model.state === "locked" && styles.badgeNumberLocked,
                ]}
                maxFontSizeMultiplier={1.1}
              >
                {(model.unitIndex as number) + 1}
              </Text>
            )}
          </View>
          {model.state === "done" ? (
            <View style={styles.cornerBadge} pointerEvents="none">
              <Text style={styles.cornerBadgeText}>⭐</Text>
            </View>
          ) : model.state === "locked" ? (
            <View style={styles.cornerBadge} pointerEvents="none">
              <Text style={styles.cornerBadgeText}>🔒</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Huy hiệu cờ tại cụm đảo Hoàng Sa / Trường Sa                        */
/* ------------------------------------------------------------------ */

const SeaBadge = memo(function SeaBadge({
  model,
  selected,
  onPress,
}: {
  model: SeaModel;
  selected: boolean;
  onPress: (id: string) => void;
}) {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.badgeWrap,
        { left: model.cx - BADGE_WRAP_W / 2, top: model.cy - SEA_BADGE_SIZE / 2 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => onPress(model.point.id)}
        accessibilityRole="button"
        accessibilityLabel={`${model.point.name} — điểm biển đảo quê hương, chạm để xem thông tin`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.badgePress, pressed && { opacity: 0.85 }]}
      >
        <View
          style={[
            styles.badge,
            styles.badgeSea,
            {
              width: SEA_BADGE_SIZE,
              height: SEA_BADGE_SIZE,
              borderRadius: SEA_BADGE_SIZE / 2,
            },
            selected && styles.badgeSelected,
          ]}
        >
          <Text style={{ fontSize: SEA_BADGE_SIZE * 0.48 }}>🇻🇳</Text>
        </View>
      </Pressable>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Bảng chi tiết tỉnh / điểm biển (trượt từ đáy khung bản đồ)          */
/* ------------------------------------------------------------------ */

function InfoSection({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoTitle} maxFontSizeMultiplier={1.3}>
        {emoji} {title}
      </Text>
      {children}
    </View>
  );
}

function ProvinceDetailPanel({
  model,
  course,
  courses,
  unlockedAll,
  onClose,
  onSelectCourse,
  onMissionPress,
  onGuidebookPress,
}: {
  model: ProvinceModel;
  course: WorldMapCourseData;
  courses: WorldMapCourseData[];
  unlockedAll: boolean;
  onClose: () => void;
  onSelectCourse: (courseId: string) => void;
  onMissionPress: (ref: LessonRef, courseId: string) => void;
  onGuidebookPress: (unit: UnitPack, courseId: string) => void;
}) {
  const styles = useStyles();
  const slide = useRef(new Animated.Value(160)).current;
  const { province } = model;

  useEffect(() => {
    slide.setValue(160);
    Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [province.id, course.courseId, slide]);

  const lessons =
    model.unit && course ? (course.lessonsByUnit.get(model.unit.id) ?? []) : [];

  // Các khóa khác cũng có bài ở tỉnh này → chip gợi ý chuyển khóa.
  const otherCourses = course
    ? courses.filter(
        (c) =>
          c.courseId !== course.courseId &&
          unitIndexForProvince(model.index, c.units.length) !== null
      )
    : [];

  return (
    <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slide }] }]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailEmoji}>📍</Text>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.detailTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {province.name}
          </Text>
          <Text style={styles.detailSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {REGION_LABELS[province.region]} · Việt Nam
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng chi tiết tỉnh"
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {province.mergedFrom ? (
          <Text style={styles.mergedLine} maxFontSizeMultiplier={1.3}>
            Trước đây là các tỉnh: {province.mergedFrom}
          </Text>
        ) : null}

        <InfoSection emoji="🌟" title="Giới thiệu">
          <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
            {province.intro}
          </Text>
        </InfoSection>

        <InfoSection emoji="📜" title="Lịch sử">
          <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
            {province.history}
          </Text>
        </InfoSection>

        <InfoSection emoji="🎁" title="Đặc sản">
          <View style={styles.specialtyRow}>
            {province.specialties.map((s) => (
              <View key={s} style={styles.specialtyChip}>
                <Text style={styles.specialtyText} maxFontSizeMultiplier={1.2}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </InfoSection>

        {model.unit && course ? (
          <View style={styles.unitBlock}>
            <View style={styles.unitHeader}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.unitTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                  📚 {model.unit.title}
                </Text>
                <Text style={styles.detailSub} maxFontSizeMultiplier={1.3}>
                  {course.targetLanguage} · Đã khám phá {model.doneCount}/{model.totalCount} điểm
                </Text>
              </View>
              <Pressable
                onPress={() => onGuidebookPress(model.unit as UnitPack, course.courseId)}
                accessibilityRole="button"
                accessibilityLabel={`Sổ tay ${model.unit.title}`}
                style={({ pressed }) => [styles.guideButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.guideButtonText} maxFontSizeMultiplier={1.2}>
                  📖 Sổ tay
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {lessons.map((ref, i) => {
                const done = !!course.completedLessons[ref.lesson.id];
                const locked = !unlockedAll && ref.globalIndex > course.currentIndex;
                const current = !done && ref.globalIndex === course.currentIndex;
                return (
                  <Pressable
                    key={ref.lesson.id}
                    onPress={() => onMissionPress(ref, course.courseId)}
                    accessibilityRole="button"
                    accessibilityLabel={`${model.unit?.title}, bài ${i + 1}${done ? ", đã hoàn thành" : locked ? ", đang khóa" : ""}`}
                    accessibilityState={{ disabled: locked, selected: current }}
                    style={({ pressed }) => [
                      styles.lessonChip,
                      done && styles.lessonChipDone,
                      locked && styles.lessonChipLocked,
                      current && styles.lessonChipCurrent,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lessonChipText,
                        done && styles.lessonChipTextDone,
                        locked && styles.lessonChipTextLocked,
                      ]}
                      maxFontSizeMultiplier={1.1}
                    >
                      {i + 1}
                    </Text>
                    {done ? (
                      <View style={styles.chipBadge}>
                        <Text style={styles.chipBadgeText}>⭐</Text>
                      </View>
                    ) : locked ? (
                      <View style={styles.chipBadge}>
                        <Text style={styles.chipBadgeText}>🔒</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.detailHint} maxFontSizeMultiplier={1.3}>
              Chạm vào một điểm để xem nhiệm vụ của bài học nhé.
            </Text>
          </View>
        ) : course ? (
          <View style={styles.unitBlock}>
            <Text style={styles.noUnitText} maxFontSizeMultiplier={1.3}>
              Ở tỉnh này, khóa {course.targetLanguage} không có bài học — nhưng bé vẫn
              khám phá được bao điều hay về quê hương mình!
            </Text>
            {otherCourses.length > 0 ? (
              <>
                <Text style={styles.detailHint} maxFontSizeMultiplier={1.3}>
                  Ngôn ngữ khác có bài ở tỉnh này:
                </Text>
                <View style={styles.specialtyRow}>
                  {otherCourses.map((c) => (
                    <Pressable
                      key={c.courseId}
                      onPress={() => onSelectCourse(c.courseId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Chuyển sang khóa ${c.targetLanguage} để học bài ở tỉnh ${province.name}`}
                      style={({ pressed }) => [
                        styles.courseHintChip,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.courseHintText} maxFontSizeMultiplier={1.2}>
                        {c.targetLanguage} ›
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

function SeaDetailPanel({
  point,
  onClose,
}: {
  point: SeaPoint;
  onClose: () => void;
}) {
  const styles = useStyles();
  const slide = useRef(new Animated.Value(160)).current;

  useEffect(() => {
    slide.setValue(160);
    Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [point.id, slide]);

  return (
    <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slide }] }]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailEmoji}>🇻🇳</Text>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.detailTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {point.name}
          </Text>
          <Text style={styles.detailSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            Biển đảo quê hương Việt Nam
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng chi tiết điểm biển"
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <InfoSection emoji="🌟" title="Giới thiệu">
          <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
            {point.intro}
          </Text>
        </InfoSection>
        <InfoSection emoji="📜" title="Lịch sử">
          <Text style={styles.infoText} maxFontSizeMultiplier={1.3}>
            {point.history}
          </Text>
        </InfoSection>
        <Text style={styles.detailHint} maxFontSizeMultiplier={1.3}>
          Điểm biển này để khám phá thông tin thôi, không có bài học đâu bé nhé.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Bản đồ Việt Nam thật theo ranh giới tỉnh                            */
/* ------------------------------------------------------------------ */

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { courses, activeCourseId, unlockedAll, onSelectCourse, onMissionPress, onGuidebookPress },
  ref
) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();

  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 0.6 });
  const [selection, setSelection] = useState<Selection>(null);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const animRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  /* ----- Tương tác chuột trên WEB (kéo bằng chuột + cuộn để zoom) ----- */
  /** Node DOM của khung nhìn bản đồ (chỉ có nghĩa khi Platform.OS === "web"). */
  const viewportNodeRef = useRef<View | null>(null);
  /**
   * "Vết" của cú kéo vừa kết thúc: nếu người dùng vừa KÉO bản đồ xong
   * (dist > 6px, chưa quá 300ms) thì cú chạm sinh ra ngay khi thả chuột
   * phải bị BỎ QUA — tránh kéo xong lại chọn nhầm tỉnh.
   */
  const dragGuardRef = useRef({ lastDragEndAt: 0, lastDragDist: 0 });
  /** Trạng thái cú nhấn–kéo chuột đang diễn ra trên web. */
  const mouseRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    totalDist: 0,
  });

  const markDragEnd = (dist: number) => {
    if (dist > 6) {
      dragGuardRef.current = { lastDragEndAt: Date.now(), lastDragDist: dist };
    }
  };

  const wasRecentDrag = (): boolean =>
    dragGuardRef.current.lastDragDist > 6 &&
    Date.now() - dragGuardRef.current.lastDragEndAt <= 300;

  const activeCourse = useMemo(
    () => courses.find((c) => c.courseId === activeCourseId) ?? courses[0],
    [courses, activeCourseId]
  );

  /* ----- Mô hình tỉnh theo khóa đang chọn (vị trí từ PROVINCE_SHAPES) ----- */
  const models = useMemo<ProvinceModel[]>(() => {
    if (!activeCourse) return [];
    const unitCount = activeCourse.units.length;
    return PROVINCES.map((province, index) => {
      const unitIndex = unitIndexForProvince(index, unitCount);
      const unit = unitIndex !== null ? activeCourse.units[unitIndex] : null;
      const lessons = unit ? (activeCourse.lessonsByUnit.get(unit.id) ?? []) : [];
      const doneCount = lessons.filter(
        (l) => activeCourse.completedLessons[l.lesson.id]
      ).length;
      const first = lessons[0];
      const isCurrent = lessons.some((l) => l.globalIndex === activeCourse.currentIndex);
      const unitDone = lessons.length > 0 && doneCount === lessons.length;
      const locked =
        !unlockedAll && !!first && first.globalIndex > activeCourse.currentIndex;
      const state: ProvinceVisualState = !unit
        ? "info"
        : unitDone
          ? "done"
          : isCurrent
            ? "current"
            : locked
              ? "locked"
              : "available";
      const shape = PROVINCE_SHAPES[province.id];
      const vbX = shape ? shape.cx : province.x * MAP_VIEWBOX.width;
      const vbY = shape ? shape.cy : province.y * MAP_VIEWBOX.height;
      return {
        province,
        index,
        vbX,
        vbY,
        cx: vbX * SX,
        cy: vbY * SY,
        color: PROVINCE_COLORS[index % PROVINCE_COLORS.length],
        state,
        unit,
        unitIndex,
        doneCount,
        totalCount: lessons.length,
      };
    });
  }, [activeCourse, unlockedAll]);

  const modelsRef = useRef(models);
  modelsRef.current = models;

  /* ----- Mô hình 2 cụm đảo biển (vị trí cố định trong SVG) ----- */
  const seaModels = useMemo<SeaModel[]>(
    () =>
      SEA_POINTS.map((point) => {
        const vb = SEA_CLUSTER_VB[point.id] ?? { x: 835, y: 985 };
        return { point, vbX: vb.x, vbY: vb.y, cx: vb.x * SX, cy: vb.y * SY };
      }),
    []
  );

  const currentModel = models.find((m) => m.state === "current") ?? null;

  const selectedModel =
    selection?.kind === "province" ? (models[selection.index] ?? null) : null;
  const selectedSea =
    selection?.kind === "sea"
      ? (SEA_POINTS.find((p) => p.id === selection.id) ?? null)
      : null;

  /* ----- Camera: bay hoạt họa bằng requestAnimationFrame ----- */
  const cancelAnim = () => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  const flyTo = (target: Camera, animated = true) => {
    const { w, h } = viewportRef.current;
    const dest = clampCamera(target, w, h);
    cancelAnim();
    if (!animated || reducedMotion) {
      setCamera(dest);
      return;
    }
    const from = cameraRef.current;
    const start = performance.now();
    const DURATION = 450;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setCamera({
        x: from.x + (dest.x - from.x) * eased,
        y: from.y + (dest.y - from.y) * eased,
        scale: from.scale + (dest.scale - from.scale) * eased,
      });
      animRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    animRef.current = requestAnimationFrame(step);
  };

  const centerOnWorldPoint = (cx: number, cy: number, targetScale?: number) => {
    const { w, h } = viewportRef.current;
    const scale = clampScale(
      targetScale ?? cameraRef.current.scale,
      scaleLimits(w, h)
    );
    flyTo({ x: w / 2 - cx * scale, y: h / 2 - cy * scale, scale });
  };

  const flyToProvince = (journeyIndex: number, select: boolean) => {
    const model = modelsRef.current[journeyIndex];
    if (!model) return;
    if (select) setSelection({ kind: "province", index: journeyIndex });
    const { w, h } = viewportRef.current;
    const limits = scaleLimits(w, h);
    // Khung NGANG (máy tính): không zoom nhỏ hơn coverScale × 1,15 để
    // bản đồ luôn phủ kín và kéo được cả 2 chiều; khung dọc: mức nét
    // cố định PROVINCE_FOCUS_SCALE.
    const focus =
      w > h ? limits.coverScale * 1.15 : PROVINCE_FOCUS_SCALE;
    const targetScale = Math.max(cameraRef.current.scale, focus);
    centerOnWorldPoint(model.cx, model.cy, targetScale);
  };

  const zoomBy = (factor: number) => {
    const { w, h } = viewportRef.current;
    const cam = cameraRef.current;
    const scale = clampScale(cam.scale * factor, scaleLimits(w, h));
    const wx = (w / 2 - cam.x) / cam.scale;
    const wy = (h / 2 - cam.y) / cam.scale;
    flyTo({ x: w / 2 - wx * scale, y: h / 2 - wy * scale, scale });
  };

  useImperativeHandle(ref, () => ({
    centerOnUnit: (courseId: string, unitIndex: number) => {
      const course = courses.find((c) => c.courseId === courseId);
      if (!course) return;
      flyToProvince(provinceIndexForUnit(unitIndex, course.units.length), true);
    },
    centerOnProvince: (journeyIndex: number) => {
      flyToProvince(journeyIndex, true);
    },
    centerOnRegion: (region: ProvinceRegion) => {
      const anchor = REGION_ANCHOR_VB[region];
      centerOnWorldPoint(anchor.x * SX, anchor.y * SY, REGION_SCALE[region]);
    },
    zoomIn: () => zoomBy(1.3),
    zoomOut: () => zoomBy(1 / 1.3),
    centerOnCurrent: () => {
      if (currentModel) flyToProvince(currentModel.index, true);
    },
  }));

  /* Mở app lần đầu: đặt camera ngay (không hoạt họa) vào tỉnh đang học.
     - Khung NGANG (máy tính): mở ở coverScale × 1,15 — bản đồ phủ kín
       khung và kéo được cả 2 chiều ngay từ đầu.
     - Khung DỌC (điện thoại): mở ở mức vừa theo bề ngang (vw / WORLD_WIDTH). */
  useEffect(() => {
    if (initializedRef.current || viewport.w <= 0 || viewport.h <= 0) return;
    initializedRef.current = true;
    const { w, h } = viewport;
    const limits = scaleLimits(w, h);
    const scale =
      w > h
        ? clampScale(limits.coverScale * 1.15, limits)
        : clampScale(w / WORLD_WIDTH, limits);
    if (currentModel) {
      setCamera(
        clampCamera(
          {
            x: viewport.w / 2 - currentModel.cx * scale,
            y: viewport.h / 2 - currentModel.cy * scale,
            scale,
          },
          viewport.w,
          viewport.h
        )
      );
    } else {
      setCamera((c) => clampCamera({ ...c, scale }, viewport.w, viewport.h));
    }
    // Chỉ khởi tạo một lần khi khung nhìn đã đo xong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.w, viewport.h]);

  useEffect(() => cancelAnim, []);

  /* ----- Cử chỉ: kéo 1 ngón (quá ~8px) + chụm 2 ngón phóng/thu ----- */
  const gestureRef = useRef<{
    last: { x: number; y: number } | null;
    pinchDist: number | null;
    pinchMid: { x: number; y: number } | null;
    touchCount: number;
    hadPinch: boolean;
  }>({ last: null, pinchDist: null, pinchMid: null, touchCount: 0, hadPinch: false });

  const baselinePinch = (pts: { x: number; y: number }[]) => {
    const g = gestureRef.current;
    if (pts.length >= 2) {
      g.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      g.hadPinch = true;
    } else {
      g.pinchDist = null;
      g.pinchMid = null;
    }
    g.last = pts[0] ?? null;
    g.touchCount = pts.length;
  };

  const resetGesture = () => {
    gestureRef.current = {
      last: null,
      pinchDist: null,
      pinchMid: null,
      touchCount: 0,
      hadPinch: false,
    };
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Không nhận ngay khi chạm xuống → cú CHẠM vẫn tới được tỉnh/huy hiệu bên dưới.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e, g) => {
          // Trên web, cú kéo bằng CHUỘT do listener DOM riêng đảm nhiệm —
          // PanResponder không giành nữa để tránh kéo 2 lần cùng lúc.
          if (mouseRef.current.active) return false;
          const pts = touchPoints(e);
          if (pts.length >= 2) return true;
          return Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8;
        },
        onPanResponderGrant: (e) => {
          cancelAnim();
          baselinePinch(touchPoints(e));
        },
        onPanResponderMove: (e) => {
          const pts = touchPoints(e);
          const g = gestureRef.current;
          const cam = cameraRef.current;
          const { w, h } = viewportRef.current;
          if (pts.length !== g.touchCount) {
            baselinePinch(pts);
            return;
          }
          if (pts.length >= 2 && g.pinchDist && g.pinchMid) {
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            if (dist > 0 && g.pinchDist > 0) {
              // Zoom quanh điểm giữa 2 ngón: điểm thế giới dưới điểm giữa
              // trước khi zoom vẫn nằm dưới điểm giữa sau khi zoom.
              const scale = clampScale(cam.scale * (dist / g.pinchDist), scaleLimits(w, h));
              const wx = (g.pinchMid.x - cam.x) / cam.scale;
              const wy = (g.pinchMid.y - cam.y) / cam.scale;
              setCamera(clampCamera({ x: mid.x - wx * scale, y: mid.y - wy * scale, scale }, w, h));
            }
            g.pinchDist = dist;
            g.pinchMid = mid;
            g.last = pts[0];
            return;
          }
          if (pts.length === 1 && g.last) {
            const dx = pts[0].x - g.last.x;
            const dy = pts[0].y - g.last.y;
            if (dx !== 0 || dy !== 0) {
              setCamera(clampCamera({ x: cam.x + dx, y: cam.y + dy, scale: cam.scale }, w, h));
            }
            g.last = pts[0];
          }
        },
        onPanResponderRelease: (_e, gState) => {
          // Kéo/chụm cảm ứng vừa xong mà hệ thống vẫn sinh thêm một cú
          // "chạm" khi nhả tay → ghi vết kéo để handler chạm tỉnh bỏ qua.
          const dist = Math.hypot(gState.dx, gState.dy);
          if (gestureRef.current.hadPinch || dist > 6) {
            markDragEnd(Math.max(dist, 7));
          }
          resetGesture();
        },
        onPanResponderTerminate: () => {
          resetGesture();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // PanResponder chỉ tạo một lần; mọi trạng thái đọc qua ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ----- WEB: cuộn chuột/trackpad để zoom + kéo bằng chuột -----
     PanResponder trên web không xử lý được wheel và kéo chuột không
     tin cậy, nên gắn listener DOM trực tiếp (chỉ Platform.OS "web"):
     - wheel (passive: false): LUÔN preventDefault để trình duyệt
       không phóng to/cuộn CẢ TRANG — chỉ bản đồ zoom quanh con trỏ.
       ctrlKey = chụm trên trackpad → hệ số nhạy hơn.
     - mousedown trong khung bản đồ → mousemove/mouseup ở window
       (phase capture cho mouseup để ghi "vết kéo" TRƯỚC khi onPress
       của tỉnh/huy hiệu kịp chạy khi thả chuột). */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = viewportNodeRef.current as unknown as {
      addEventListener?: unknown;
      getBoundingClientRect?: () => { left: number; top: number };
      contains?: (other: unknown) => boolean;
    } | null;
    if (!node || typeof node.addEventListener !== "function") return;
    const domNode = node as unknown as HTMLElement;
    const win = globalThis as unknown as Window;

    const onWheel = (e: WheelEvent) => {
      // Chặn zoom trang + cuộn trang khi con trỏ nằm trên bản đồ.
      e.preventDefault();
      const { w, h } = viewportRef.current;
      if (w <= 0 || h <= 0) return;
      cancelAnim();
      const rect = domNode.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // Chuẩn hóa deltaY: 1 = theo dòng, 2 = theo trang.
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= rect.height;
      const intensity = e.ctrlKey ? 0.01 : 0.002;
      const factor = Math.min(2, Math.max(0.5, Math.exp(-delta * intensity)));
      const cam = cameraRef.current;
      const scale = clampScale(cam.scale * factor, scaleLimits(w, h));
      if (scale === cam.scale) return;
      // Giữ điểm thế giới dưới con trỏ đứng yên khi zoom.
      const wx = (px - cam.x) / cam.scale;
      const wy = (py - cam.y) / cam.scale;
      setCamera(clampCamera({ x: px - wx * scale, y: py - wy * scale, scale }, w, h));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!domNode.contains(e.target as Node)) return;
      cancelAnim();
      mouseRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        totalDist: 0,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      const m = mouseRef.current;
      if (!m.active) return;
      const dx = e.clientX - m.lastX;
      const dy = e.clientY - m.lastY;
      m.lastX = e.clientX;
      m.lastY = e.clientY;
      m.totalDist = Math.max(
        m.totalDist,
        Math.hypot(e.clientX - m.startX, e.clientY - m.startY)
      );
      if (m.totalDist <= 6 || (dx === 0 && dy === 0)) return;
      const cam = cameraRef.current;
      const { w, h } = viewportRef.current;
      setCamera(
        clampCamera({ x: cam.x + dx, y: cam.y + dy, scale: cam.scale }, w, h)
      );
    };

    const onMouseUp = () => {
      const m = mouseRef.current;
      if (!m.active) return;
      m.active = false;
      // Ghi vết kéo (nếu có) — handler này chạy ở phase capture của
      // window, TRƯỚC khi onPress của tỉnh/huy hiệu xử lý cú thả chuột.
      markDragEnd(m.totalDist);
      m.totalDist = 0;
    };

    domNode.addEventListener("wheel", onWheel, { passive: false });
    win.addEventListener("mousedown", onMouseDown, true);
    win.addEventListener("mousemove", onMouseMove, true);
    win.addEventListener("mouseup", onMouseUp, true);
    return () => {
      domNode.removeEventListener("wheel", onWheel);
      win.removeEventListener("mousedown", onMouseDown, true);
      win.removeEventListener("mousemove", onMouseMove, true);
      win.removeEventListener("mouseup", onMouseUp, true);
    };
    // Chỉ gắn một lần; trạng thái luôn đọc qua ref + hàm module thuần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProvincePress = useCallback((index: number) => {
    // Vừa kéo bản đồ xong (chuột hoặc cảm ứng) → bỏ qua cú chạm này.
    if (wasRecentDrag()) return;
    setSelection({ kind: "province", index });
  }, []);
  const handleSeaPress = useCallback((id: string) => {
    if (wasRecentDrag()) return;
    setSelection({ kind: "sea", id });
  }, []);

  const labelLevel: 0 | 1 | 2 =
    camera.scale >= SMALL_LABEL_MIN_SCALE
      ? 2
      : camera.scale >= LABEL_MIN_SCALE
        ? 1
        : 0;

  return (
    <View style={styles.root}>
      <View
        ref={viewportNodeRef}
        style={[styles.viewport, WEB_VIEWPORT_LOCK]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setViewport((prev) =>
            prev.w === width && prev.h === height ? prev : { w: width, h: height }
          );
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.world,
            {
              transform: [
                { translateX: camera.x },
                { translateY: camera.y },
                { scale: camera.scale },
              ],
            },
          ]}
        >
          {/* Nền biển xanh nhạt phủ toàn thế giới */}
          <View style={styles.seaBg} pointerEvents="none" />
          <SeaDecorations />
          {/* Chạm vào vùng biển trống → đóng bảng chi tiết */}
          <Pressable
            style={styles.seaTouch}
            onPress={() => {
              if (wasRecentDrag()) return;
              setSelection(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Vùng biển trống trên bản đồ — chạm để đóng bảng chi tiết"
          />
          {/* Lớp SVG: hình tỉnh + đường hành trình + cụm đảo + tên tỉnh */}
          <MapSvgLayer
            models={models}
            seaModels={seaModels}
            selectedIndex={selection?.kind === "province" ? selection.index : null}
            selectedSeaId={selection?.kind === "sea" ? selection.id : null}
            labelLevel={labelLevel}
            onProvincePress={handleProvincePress}
            onSeaPress={handleSeaPress}
          />
          {/* Huy hiệu số thứ tự / thông tin tại tâm tỉnh */}
          {models.map((model) => (
            <UnitBadge
              key={model.province.id}
              model={model}
              selected={
                selection?.kind === "province" && selection.index === model.index
              }
              reducedMotion={reducedMotion}
              onPress={handleProvincePress}
            />
          ))}
          {seaModels.map((s) => (
            <SeaBadge
              key={s.point.id}
              model={s}
              selected={selection?.kind === "sea" && selection.id === s.point.id}
              onPress={handleSeaPress}
            />
          ))}
        </View>
      </View>

      {selectedModel && activeCourse ? (
        <ProvinceDetailPanel
          model={selectedModel}
          course={activeCourse}
          courses={courses}
          unlockedAll={unlockedAll}
          onClose={() => setSelection(null)}
          onSelectCourse={onSelectCourse}
          onMissionPress={onMissionPress}
          onGuidebookPress={onGuidebookPress}
        />
      ) : selectedSea ? (
        <SeaDetailPanel point={selectedSea} onClose={() => setSelection(null)} />
      ) : null}
    </View>
  );
});

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1 },
    viewport: { flex: 1, overflow: "hidden", backgroundColor: SEA_COLOR },
    world: {
      position: "absolute",
      left: 0,
      top: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      transformOrigin: "0 0",
    },
    seaBg: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      backgroundColor: SEA_COLOR,
    },
    decoration: { position: "absolute", opacity: 0.9 },
    seaTouch: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
    badgeWrap: { position: "absolute", width: BADGE_WRAP_W },
    badgePress: { alignItems: "center", padding: 6 },
    pulseRing: {
      position: "absolute",
      borderWidth: 5,
      borderColor: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.18)",
    },
    badge: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3.5,
      borderColor: "rgba(255,255,255,0.95)",
      ...shadow.chunky,
    },
    badgeDone: { backgroundColor: "#58a700" },
    badgeCurrent: { backgroundColor: "#f59e0b" },
    badgeLocked: { backgroundColor: "#c3ced4" },
    badgeAvailable: { backgroundColor: "#38bdf8" },
    badgeInfo: { backgroundColor: "rgba(255,255,255,0.9)" },
    badgeSea: { backgroundColor: "#0ea5e9" },
    badgeSelected: { borderColor: "#ff8c1a", borderWidth: 4.5 },
    badgeNumber: { fontWeight: "900", color: colors.white },
    badgeNumberLocked: { color: "#64748b" },
    cornerBadge: {
      position: "absolute",
      top: -7,
      right: -9,
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.neutral200,
      zIndex: 4,
    },
    cornerBadgeText: { fontSize: 12 },
    mascotWrap: {
      position: "absolute",
      top: -36,
      width: 44,
      height: 44,
      borderRadius: radius.full,
      borderWidth: 2.5,
      borderColor: colors.white,
      backgroundColor: colors.white,
      overflow: "hidden",
      zIndex: 3,
      ...shadow.chunky,
    },
    mascot: { width: "100%", height: "100%" },
    detailPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "58%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
      ...shadow.chunky,
    },
    detailScroll: { flexGrow: 0 },
    detailScrollContent: { paddingBottom: 6 },
    detailHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    detailEmoji: { fontSize: 30 },
    detailTitle: { fontSize: 18, fontWeight: "900", color: colors.neutral700 },
    detailSub: { fontSize: 12.5, fontWeight: "700", color: colors.textMuted },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    closeButtonText: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
    mergedLine: {
      fontSize: 12.5,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 8,
      fontStyle: "italic",
    },
    infoSection: { marginTop: 10 },
    infoTitle: { fontSize: 14.5, fontWeight: "900", color: colors.neutral700 },
    infoText: { fontSize: 13.5, lineHeight: 19, color: colors.neutral700, marginTop: 2 },
    specialtyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
    specialtyChip: {
      backgroundColor: "#fef3c7",
      borderWidth: 1.5,
      borderColor: "#f59e0b",
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    specialtyText: { fontSize: 12.5, fontWeight: "800", color: "#92400e" },
    unitBlock: {
      marginTop: 12,
      borderTopWidth: 1.5,
      borderTopColor: colors.neutral200,
      paddingTop: 10,
    },
    unitHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    unitTitle: { fontSize: 15.5, fontWeight: "900", color: colors.neutral700 },
    guideButton: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    guideButtonText: { fontSize: 12.5, fontWeight: "800", color: colors.neutral700 },
    chipRow: { gap: 10, paddingTop: 12, paddingBottom: 2, paddingRight: 6 },
    lessonChip: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: colors.sky,
      alignItems: "center",
      justifyContent: "center",
    },
    lessonChipDone: {
      backgroundColor: colors.correctText,
      borderColor: colors.correctText,
    },
    lessonChipLocked: {
      backgroundColor: colors.neutral200,
      borderColor: colors.neutral300,
      opacity: 0.8,
    },
    lessonChipCurrent: { borderColor: "#fbbf24", borderWidth: 3 },
    lessonChipText: { fontSize: 17, fontWeight: "900", color: colors.skyDark },
    lessonChipTextDone: { color: colors.white },
    lessonChipTextLocked: { color: colors.textMuted },
    chipBadge: {
      position: "absolute",
      top: -7,
      right: -7,
      width: 20,
      height: 20,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.neutral200,
    },
    chipBadgeText: { fontSize: 10 },
    detailHint: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginTop: 6 },
    noUnitText: { fontSize: 13.5, lineHeight: 19, color: colors.neutral700 },
    courseHintChip: {
      backgroundColor: colors.neutral100,
      borderWidth: 1.5,
      borderColor: colors.sky,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    courseHintText: { fontSize: 13, fontWeight: "800", color: colors.skyDark },
  })
);
