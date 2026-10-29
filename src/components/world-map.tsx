import { Image } from "expo-image";
import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

import type { LessonRef } from "@/lib/content";
import { landForUnit, type Land } from "@/lib/lands";
import { makeThemedStyles, radius, shadow, unitPalette } from "@/lib/theme";
import type { SchoolBand, UnitPack } from "@/lib/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/* ------------------------------------------------------------------ */
/* Hằng số thế giới                                                    */
/* ------------------------------------------------------------------ */

/** Kích thước "thế giới" — mặt biển lớn chứa toàn bộ 80 đảo. */
export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 2100;

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.8;

const ISLAND_W = 190;
const ISLAND_H = 140;
/** Chiều cao khối đảo (ảnh + nhãn) để tính tâm đảo khi bay camera. */
const ISLAND_BLOCK_H = 196;

type ZoneDef = {
  band: SchoolBand;
  title: string;
  /** Chiều cao vùng trong thế giới. */
  height: number;
  /** Tông màu phủ rất nhẹ để phân biệt 3 chặng. */
  tint: string;
};

const ZONE_DEFS: ZoneDef[] = [
  { band: "tieu-hoc", title: "Chặng 1 · Khối Tiểu học (lớp 1–5)", height: 1160, tint: "#22c55e" },
  { band: "thcs", title: "Chặng 2 · Khối THCS (lớp 6–9)", height: 470, tint: "#38bdf8" },
  { band: "thpt", title: "Chặng 3 · Khối THPT (lớp 10–12)", height: 470, tint: "#f59e0b" },
];

const ZONE_Y: Record<SchoolBand, number> = (() => {
  const map = {} as Record<SchoolBand, number>;
  let y = 0;
  for (const zone of ZONE_DEFS) {
    map[zone.band] = y;
    y += zone.height;
  }
  return map;
})();

const GRID_COLS = 10;
const GRID_LEFT = 40;
const GRID_TOP_PAD = 72;

/** 4 tranh đảo luân phiên theo chỉ số unit trong khóa — như LandCard cũ. */
const ISLAND_IMAGES = [
  require("@/assets/images/island-map-a.jpg"),
  require("@/assets/images/island-map-b.jpg"),
  require("@/assets/images/island-map-c.jpg"),
  require("@/assets/images/island-map-d.jpg"),
];

/** Chỉ số unit trong khóa suy từ id ("<course>:unit-N") — khớp thứ tự pack. */
function unitIndexInCourse(unitId: string): number {
  const m = /unit-(\d+)$/.exec(unitId);
  return m ? Math.max(0, parseInt(m[1], 10) - 1) : 0;
}

function bandOfUnit(unit: UnitPack): SchoolBand {
  return unit.band ?? "tieu-hoc";
}

/**
 * Độ lệch giả ngẫu nhiên TĨNH theo hạt giống — tất định tuyệt đối (không
 * dùng Math.random lúc render), đảo luôn ở đúng một chỗ qua mọi lần mở.
 */
function jitter(seed: number, range: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return ((v - Math.floor(v)) * 2 - 1) * range;
}

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
  /** Bay camera tới đảo của unit thứ `unitIndex` trong khóa, đồng thời chọn đảo đó. */
  centerOnUnit: (courseId: string, unitIndex: number) => void;
  /** Bay camera tới vùng biển của một khối lớp. */
  centerOnBand: (band: SchoolBand) => void;
};

type WorldMapProps = {
  courses: WorldMapCourseData[];
  activeCourseId: string;
  unlockedAll: boolean;
  /** Chạm một đảo thuộc khóa khác → màn cha đổi khóa đang chọn sang khóa đó. */
  onSelectCourse: (courseId: string) => void;
  /** Chạm một chip bài học trong bảng chi tiết → mở MissionPanel ở màn cha. */
  onMissionPress: (ref: LessonRef, courseId: string) => void;
  /** Mở sổ tay của unit từ bảng chi tiết đảo. */
  onGuidebookPress: (unit: UnitPack, courseId: string) => void;
};

type IslandModel = {
  key: string;
  courseId: string;
  unit: UnitPack;
  unitIndex: number;
  land: Land;
  x: number;
  y: number;
  imageIndex: number;
  color: { main: string; dark: string };
  doneCount: number;
  totalCount: number;
  unitDone: boolean;
  /** Đảo chứa bài hiện tại của khóa ĐANG CHỌN (heo đứng trên đảo này). */
  isCurrent: boolean;
  /** Toàn bộ bài của đảo đều đang khóa theo công thức cũ. */
  locked: boolean;
};

type Camera = { x: number; y: number; scale: number };

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function clampCamera(cam: Camera, vw: number, vh: number): Camera {
  const scale = clampScale(cam.scale);
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
/* Trang trí biển thưa, tất định                                       */
/* ------------------------------------------------------------------ */

const DECOR_EMOJIS = ["🌊", "🐚", "🪸", "⛵", "🐠", "⭐"];
const DECOR: { emoji: string; x: number; y: number; size: number }[] = (() => {
  const items: { emoji: string; x: number; y: number; size: number }[] = [];
  for (let i = 0; i < 30; i++) {
    items.push({
      emoji: DECOR_EMOJIS[i % DECOR_EMOJIS.length],
      x: 90 + ((i * 389 + 140) % (WORLD_WIDTH - 220)),
      y: 60 + ((i * 613 + 90) % (WORLD_HEIGHT - 160)),
      size: 26 + ((i * 37) % 22),
    });
  }
  return items;
})();

/* ------------------------------------------------------------------ */
/* Một hòn đảo trên bản đồ                                             */
/* ------------------------------------------------------------------ */

const IslandNode = memo(function IslandNode({
  island,
  selected,
  reducedMotion,
  onPress,
}: {
  island: IslandModel;
  selected: boolean;
  reducedMotion: boolean;
  onPress: (island: IslandModel) => void;
}) {
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!island.isCurrent || reducedMotion) {
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
  }, [island.isCurrent, reducedMotion, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.13] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.35] });

  return (
    <View
      style={[styles.islandWrap, { left: island.x, top: island.y }]}
      pointerEvents="box-none"
    >
      {island.isCurrent ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
      ) : null}
      {island.unitDone ? (
        <View pointerEvents="none" style={styles.doneRing} />
      ) : null}
      <Pressable
        onPress={() => onPress(island)}
        accessibilityRole="button"
        accessibilityLabel={`${island.land.name} — ${island.unit.title}, đã khám phá ${island.doneCount}/${island.totalCount} điểm`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View
          style={[
            styles.islandImageFrame,
            selected && styles.islandImageFrameSelected,
            island.locked && styles.islandDim,
          ]}
        >
          <Image
            source={ISLAND_IMAGES[island.imageIndex]}
            style={styles.islandImage}
            contentFit="cover"
            accessibilityLabel={`Đảo ${island.land.name}`}
          />
          {island.unitDone ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>⭐</Text>
            </View>
          ) : null}
          {island.locked ? (
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>🔒</Text>
            </View>
          ) : null}
        </View>
        {island.isCurrent ? (
          <View pointerEvents="none" style={styles.mascotWrap}>
            <Image
              source={require("@/assets/images/mascot-avatar.png")}
              style={styles.mascot}
              contentFit="cover"
              accessibilityLabel="Bạn heo đang học ở đảo này"
            />
          </View>
        ) : null}
        <View style={[styles.labelPill, { borderColor: island.color.main }]}>
          <Text style={styles.landName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {island.land.emoji} {island.land.name}
          </Text>
          <Text style={styles.unitTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {island.unit.title}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Bảng chi tiết đảo (trượt từ đáy khung bản đồ)                       */
/* ------------------------------------------------------------------ */

function IslandDetailPanel({
  island,
  course,
  unlockedAll,
  onClose,
  onMissionPress,
  onGuidebookPress,
}: {
  island: IslandModel;
  course: WorldMapCourseData;
  unlockedAll: boolean;
  onClose: () => void;
  onMissionPress: (ref: LessonRef, courseId: string) => void;
  onGuidebookPress: (unit: UnitPack, courseId: string) => void;
}) {
  const styles = useStyles();
  const slide = useRef(new Animated.Value(140)).current;

  useEffect(() => {
    slide.setValue(140);
    Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [island.key, slide]);

  const lessons = course.lessonsByUnit.get(island.unit.id) ?? [];

  return (
    <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slide }] }]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailEmoji}>{island.land.emoji}</Text>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.detailTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {island.unit.title}
          </Text>
          <Text style={styles.detailSub} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {island.land.name} · {course.targetLanguage} · Đã khám phá{" "}
            {island.doneCount}/{island.totalCount} điểm
          </Text>
        </View>
        <Pressable
          onPress={() => onGuidebookPress(island.unit, island.courseId)}
          accessibilityRole="button"
          accessibilityLabel={`Sổ tay ${island.unit.title}`}
          style={({ pressed }) => [styles.guideButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.guideButtonText} maxFontSizeMultiplier={1.2}>
            📖 Sổ tay
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng chi tiết đảo"
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
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
              onPress={() => onMissionPress(ref, island.courseId)}
              accessibilityRole="button"
              accessibilityLabel={`${island.unit.title}, bài ${i + 1}${done ? ", đã hoàn thành" : locked ? ", đang khóa" : ""}`}
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
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Bản đồ biển                                                         */
/* ------------------------------------------------------------------ */

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { courses, activeCourseId, unlockedAll, onSelectCourse, onMissionPress, onGuidebookPress },
  ref
) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();

  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 0.6 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const animRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  /* ----- Mô hình đảo: vị trí tất định theo (khóa → thứ tự unit) ----- */
  const islands = useMemo<IslandModel[]>(() => {
    const bandTotals: Record<SchoolBand, number> = { "tieu-hoc": 0, thcs: 0, thpt: 0 };
    for (const c of courses) {
      for (const u of c.units) bandTotals[bandOfUnit(u)] += 1;
    }
    const perBandCount: Record<SchoolBand, number> = { "tieu-hoc": 0, thcs: 0, thpt: 0 };
    const cellW = (WORLD_WIDTH - GRID_LEFT * 2) / GRID_COLS;
    const list: IslandModel[] = [];
    for (const course of courses) {
      course.units.forEach((unit, unitIndex) => {
        const band = bandOfUnit(unit);
        const zone = ZONE_DEFS.find((z) => z.band === band) ?? ZONE_DEFS[0];
        const seq = perBandCount[band]++;
        const col = seq % GRID_COLS;
        const row = Math.floor(seq / GRID_COLS);
        const rowsInZone = Math.max(1, Math.ceil(bandTotals[band] / GRID_COLS));
        const cellH = (zone.height - GRID_TOP_PAD - 14) / rowsInZone;
        const seed = seq * 7 + unitIndex * 3 + bandTotals[band];
        const x = Math.max(
          8,
          Math.min(
            WORLD_WIDTH - ISLAND_W - 8,
            GRID_LEFT + col * cellW + (cellW - ISLAND_W) / 2 + jitter(seed, 13)
          )
        );
        const y = Math.max(
          ZONE_Y[band] + 40,
          Math.min(
            ZONE_Y[band] + zone.height - ISLAND_BLOCK_H - 6,
            ZONE_Y[band] + GRID_TOP_PAD + row * cellH + jitter(seed + 500, 9)
          )
        );
        const lessons = course.lessonsByUnit.get(unit.id) ?? [];
        const doneCount = lessons.filter((l) => course.completedLessons[l.lesson.id]).length;
        const first = lessons[0];
        list.push({
          key: `${course.courseId}:${unit.id}`,
          courseId: course.courseId,
          unit,
          unitIndex,
          land: landForUnit(unit),
          x,
          y,
          imageIndex: unitIndexInCourse(unit.id) % ISLAND_IMAGES.length,
          color: unitPalette[unitIndex % unitPalette.length],
          doneCount,
          totalCount: lessons.length,
          unitDone: lessons.length > 0 && doneCount === lessons.length,
          isCurrent:
            course.courseId === activeCourseId &&
            lessons.some((l) => l.globalIndex === course.currentIndex),
          locked:
            !unlockedAll && !!first && first.globalIndex > course.currentIndex,
        });
      });
    }
    return list;
  }, [courses, activeCourseId, unlockedAll]);

  const islandByKey = useMemo(
    () => new Map(islands.map((i) => [i.key, i])),
    [islands]
  );
  const selectedIsland = selectedKey ? islandByKey.get(selectedKey) ?? null : null;
  const selectedCourse = selectedIsland
    ? courses.find((c) => c.courseId === selectedIsland.courseId) ?? null
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
    const scale = clampScale(targetScale ?? cameraRef.current.scale);
    flyTo({ x: w / 2 - cx * scale, y: h / 2 - cy * scale, scale });
  };

  useImperativeHandle(ref, () => ({
    centerOnUnit: (courseId: string, unitIndex: number) => {
      const island = islands.find(
        (i) => i.courseId === courseId && i.unitIndex === unitIndex
      );
      if (!island) return;
      setSelectedKey(island.key);
      const targetScale = Math.max(cameraRef.current.scale, 0.95);
      centerOnWorldPoint(
        island.x + ISLAND_W / 2,
        island.y + ISLAND_BLOCK_H / 2,
        targetScale
      );
    },
    centerOnBand: (band: SchoolBand) => {
      const zone = ZONE_DEFS.find((z) => z.band === band);
      if (!zone) return;
      const targetScale = Math.max(cameraRef.current.scale, 0.5);
      centerOnWorldPoint(WORLD_WIDTH / 2, ZONE_Y[band] + zone.height / 2, targetScale);
    },
  }));

  /* Mở app lần đầu: đặt camera ngay (không hoạt họa) vào đảo đang học. */
  useEffect(() => {
    if (initializedRef.current || viewport.w <= 0 || viewport.h <= 0) return;
    const current = islands.find((i) => i.isCurrent);
    initializedRef.current = true;
    if (current) {
      const scale = 0.85;
      setCamera(
        clampCamera(
          {
            x: viewport.w / 2 - (current.x + ISLAND_W / 2) * scale,
            y: viewport.h / 2 - (current.y + ISLAND_BLOCK_H / 2) * scale,
            scale,
          },
          viewport.w,
          viewport.h
        )
      );
    } else {
      setCamera((c) => clampCamera(c, viewport.w, viewport.h));
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
  }>({ last: null, pinchDist: null, pinchMid: null, touchCount: 0 });

  const baselinePinch = (pts: { x: number; y: number }[]) => {
    const g = gestureRef.current;
    if (pts.length >= 2) {
      g.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.pinchMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    } else {
      g.pinchDist = null;
      g.pinchMid = null;
    }
    g.last = pts[0] ?? null;
    g.touchCount = pts.length;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Không nhận ngay khi chạm xuống → cú CHẠM vẫn tới được đảo bên dưới.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e, g) => {
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
              const scale = clampScale(cam.scale * (dist / g.pinchDist));
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
        onPanResponderRelease: () => {
          gestureRef.current = { last: null, pinchDist: null, pinchMid: null, touchCount: 0 };
        },
        onPanResponderTerminate: () => {
          gestureRef.current = { last: null, pinchDist: null, pinchMid: null, touchCount: 0 };
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // PanResponder chỉ tạo một lần; mọi trạng thái đọc qua ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const zoomBy = (factor: number) => {
    const { w, h } = viewportRef.current;
    const cam = cameraRef.current;
    const scale = clampScale(cam.scale * factor);
    const wx = (w / 2 - cam.x) / cam.scale;
    const wy = (h / 2 - cam.y) / cam.scale;
    flyTo({ x: w / 2 - wx * scale, y: h / 2 - wy * scale, scale });
  };

  const handleIslandPress = (island: IslandModel) => {
    if (island.courseId !== activeCourseId) onSelectCourse(island.courseId);
    setSelectedKey(island.key);
  };

  const currentIsland = islands.find((i) => i.isCurrent);

  return (
    <View style={styles.root}>
      <View
        style={styles.viewport}
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
          {/* Chạm vào mặt biển trống → đóng bảng chi tiết */}
          <Pressable
            style={styles.seaTouch}
            onPress={() => setSelectedKey(null)}
            accessibilityRole="button"
            accessibilityLabel="Mặt biển — chạm để đóng bảng chi tiết đảo"
          />
          {ZONE_DEFS.map((zone) => (
            <View
              key={zone.band}
              pointerEvents="none"
              style={[
                styles.zoneTint,
                {
                  top: ZONE_Y[zone.band],
                  height: zone.height,
                  backgroundColor: zone.tint,
                },
              ]}
            />
          ))}
          {DECOR.map((d, i) => (
            <Text
              key={i}
              pointerEvents="none"
              style={[
                styles.decor,
                { left: d.x, top: d.y, fontSize: d.size },
              ]}
            >
              {d.emoji}
            </Text>
          ))}
          {ZONE_DEFS.map((zone) => (
            <Text
              key={`label-${zone.band}`}
              pointerEvents="none"
              style={[styles.zoneLabel, { top: ZONE_Y[zone.band] + 14 }]}
              maxFontSizeMultiplier={1.2}
            >
              {zone.title}
            </Text>
          ))}
          {islands.map((island) => (
            <IslandNode
              key={island.key}
              island={island}
              selected={island.key === selectedKey}
              reducedMotion={reducedMotion}
              onPress={handleIslandPress}
            />
          ))}
        </View>
      </View>

      {/* Cụm nút zoom + về đảo đang học, góc phải dưới */}
      <View style={[styles.zoomCluster, { bottom: selectedIsland ? 186 : 14 }]}>
        <Pressable
          onPress={() => zoomBy(1.25)}
          accessibilityRole="button"
          accessibilityLabel="Phóng to bản đồ"
          style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <Pressable
          onPress={() => zoomBy(0.8)}
          accessibilityRole="button"
          accessibilityLabel="Thu nhỏ bản đồ"
          style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (currentIsland) {
              setSelectedKey(currentIsland.key);
              centerOnWorldPoint(
                currentIsland.x + ISLAND_W / 2,
                currentIsland.y + ISLAND_BLOCK_H / 2,
                Math.max(cameraRef.current.scale, 0.95)
              );
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Về đảo đang học"
          style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.zoomButtonEmoji}>🎯</Text>
        </Pressable>
      </View>

      {selectedIsland && selectedCourse ? (
        <IslandDetailPanel
          island={selectedIsland}
          course={selectedCourse}
          unlockedAll={unlockedAll}
          onClose={() => setSelectedKey(null)}
          onMissionPress={onMissionPress}
          onGuidebookPress={onGuidebookPress}
        />
      ) : null}
    </View>
  );
});

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1 },
    viewport: { flex: 1, overflow: "hidden", backgroundColor: "#5bb5e8" },
    world: {
      position: "absolute",
      left: 0,
      top: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      transformOrigin: "0 0",
    },
    seaTouch: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
    zoneTint: { position: "absolute", left: 0, right: 0, opacity: 0.1 },
    zoneLabel: {
      position: "absolute",
      left: 20,
      fontSize: 30,
      fontWeight: "900",
      color: "#ffffff",
      opacity: 0.55,
      letterSpacing: 0.5,
    },
    decor: { position: "absolute", opacity: 0.35 },
    islandWrap: { position: "absolute", width: ISLAND_W },
    pulseRing: {
      position: "absolute",
      top: -13,
      left: -13,
      width: ISLAND_W + 26,
      height: ISLAND_H + 26,
      borderRadius: radius.xl,
      borderWidth: 5,
      borderColor: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.18)",
    },
    doneRing: {
      position: "absolute",
      top: -6,
      left: -6,
      width: ISLAND_W + 12,
      height: ISLAND_H + 12,
      borderRadius: radius.xl,
      borderWidth: 4,
      borderColor: "#58a700",
      backgroundColor: "rgba(88, 167, 0, 0.12)",
    },
    islandImageFrame: {
      width: ISLAND_W,
      height: ISLAND_H,
      borderRadius: radius.lg,
      overflow: "hidden",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.85)",
      backgroundColor: colors.neutral100,
      ...shadow.chunky,
    },
    islandImageFrameSelected: { borderColor: "#fbbf24" },
    islandDim: { opacity: 0.5 },
    islandImage: { width: "100%", height: "100%" },
    doneBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 30,
      height: 30,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#58a700",
    },
    doneBadgeText: { fontSize: 15 },
    lockBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 30,
      height: 30,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    lockBadgeText: { fontSize: 14 },
    mascotWrap: {
      position: "absolute",
      top: -24,
      right: 6,
      width: 46,
      height: 46,
      borderRadius: radius.full,
      borderWidth: 2.5,
      borderColor: colors.white,
      backgroundColor: colors.white,
      overflow: "hidden",
      ...shadow.chunky,
    },
    mascot: { width: "100%", height: "100%" },
    labelPill: {
      marginTop: 6,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderWidth: 2,
      borderRadius: radius.md,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: "center",
    },
    landName: { fontSize: 14.5, fontWeight: "900", color: colors.neutral700 },
    unitTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    zoomCluster: { position: "absolute", right: 12, gap: 8, alignItems: "center" },
    zoomButton: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.neutral200,
      ...shadow.chunky,
    },
    zoomButtonText: { fontSize: 24, fontWeight: "900", color: colors.neutral700, lineHeight: 26 },
    zoomButtonEmoji: { fontSize: 20 },
    detailPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      ...shadow.chunky,
    },
    detailHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    detailEmoji: { fontSize: 30 },
    detailTitle: { fontSize: 17, fontWeight: "900", color: colors.neutral700 },
    detailSub: { fontSize: 12.5, fontWeight: "700", color: colors.textMuted },
    guideButton: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    guideButtonText: { fontSize: 12.5, fontWeight: "800", color: colors.neutral700 },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      alignItems: "center",
      justifyContent: "center",
    },
    closeButtonText: { fontSize: 15, fontWeight: "800", color: colors.neutral700 },
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
  })
);
