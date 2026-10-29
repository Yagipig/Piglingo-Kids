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

/** Kích thước "thế giới" — đúng tỉ lệ ảnh nền bản đồ Việt Nam 1800×1047. */
export const WORLD_WIDTH = 2200;
export const WORLD_HEIGHT = 1279;

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.8;

/** Tên tỉnh chỉ hiện khi zoom đủ gần (tránh rối khi xem toàn cảnh). */
const LABEL_MIN_SCALE = 0.75;

const PIN_SIZE = 42;
const PIN_SIZE_SMALL = 30;
const PIN_WRAP_W = 132;

/** Mức zoom gợi ý khi bay tới từng miền. */
const REGION_SCALE: Record<ProvinceRegion, number> = {
  bac: 0.48,
  trung: 0.55,
  nam: 0.62,
};

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
  /** Tâm ghim theo tọa độ thế giới. */
  cx: number;
  cy: number;
  state: ProvinceVisualState;
  /** Unit của khóa đang chọn đặt tại tỉnh này (null nếu không có). */
  unit: UnitPack | null;
  unitIndex: number | null;
  doneCount: number;
  totalCount: number;
};

type Selection =
  | { kind: "province"; index: number }
  | { kind: "sea"; id: string }
  | null;

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
/* Một ghim tỉnh trên bản đồ                                           */
/* ------------------------------------------------------------------ */

const ProvincePin = memo(function ProvincePin({
  model,
  selected,
  showLabel,
  reducedMotion,
  onPress,
}: {
  model: ProvinceModel;
  selected: boolean;
  showLabel: boolean;
  reducedMotion: boolean;
  onPress: (index: number) => void;
}) {
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(0)).current;
  const isCurrent = model.state === "current";

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

  const size = model.state === "info" ? PIN_SIZE_SMALL : PIN_SIZE;
  const pinEmoji =
    model.state === "done"
      ? "⭐"
      : model.state === "current"
        ? "📍"
        : model.state === "locked"
          ? "🔒"
          : model.state === "available"
            ? "🚩"
            : "📖";

  const stateText =
    model.state === "done"
      ? `đã học xong ${model.totalCount} bài`
      : model.state === "current"
        ? "đang học ở đây"
        : model.state === "locked"
          ? "chưa mở khóa"
          : model.state === "available"
            ? `có bài học đang chờ, đã xong ${model.doneCount}/${model.totalCount} bài`
            : "chỉ xem thông tin tỉnh";

  return (
    <View
      style={[
        styles.pinWrap,
        { left: model.cx - PIN_WRAP_W / 2, top: model.cy - size / 2 },
      ]}
      pointerEvents="box-none"
    >
      {isCurrent ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              width: size + 22,
              height: size + 22,
              left: (PIN_WRAP_W - (size + 22)) / 2,
              borderRadius: (size + 22) / 2,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      ) : null}
      <Pressable
        onPress={() => onPress(model.index)}
        accessibilityRole="button"
        accessibilityLabel={`Tỉnh ${model.province.name} — ${stateText}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.pinPress, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.pinCenter}>
          {isCurrent ? (
            <View
              pointerEvents="none"
              style={[styles.mascotWrap, { left: (size - 40) / 2 }]}
            >
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
              styles.pin,
              { width: size, height: size, borderRadius: size / 2 },
              model.state === "done" && styles.pinDone,
              model.state === "current" && styles.pinCurrent,
              model.state === "locked" && styles.pinLocked,
              model.state === "available" && styles.pinAvailable,
              model.state === "info" && styles.pinInfo,
              selected && styles.pinSelected,
            ]}
          >
            <Text style={{ fontSize: size * 0.48 }}>{pinEmoji}</Text>
          </View>
        </View>
        {showLabel ? (
          <View style={[styles.labelPill, selected && styles.labelPillSelected]}>
            <Text style={styles.provinceName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {model.province.name}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Ghim điểm biển (Hoàng Sa / Trường Sa)                               */
/* ------------------------------------------------------------------ */

const SeaPin = memo(function SeaPin({
  point,
  cx,
  cy,
  selected,
  showLabel,
  onPress,
}: {
  point: SeaPoint;
  cx: number;
  cy: number;
  selected: boolean;
  showLabel: boolean;
  onPress: (id: string) => void;
}) {
  const styles = useStyles();
  const size = 36;
  return (
    <View
      style={[
        styles.pinWrap,
        { left: cx - PIN_WRAP_W / 2, top: cy - size / 2 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => onPress(point.id)}
        accessibilityRole="button"
        accessibilityLabel={`${point.name} — điểm biển đảo quê hương, chạm để xem thông tin`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.pinPress, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.pinCenter}>
          <View
            style={[
              styles.pin,
              styles.pinSea,
              { width: size, height: size, borderRadius: size / 2 },
              selected && styles.pinSelected,
            ]}
          >
            <Text style={{ fontSize: size * 0.5 }}>🇻🇳</Text>
          </View>
        </View>
        {showLabel ? (
          <View style={[styles.labelPill, selected && styles.labelPillSelected]}>
            <Text style={styles.provinceName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {point.name.replace("Quần đảo ", "")}
            </Text>
          </View>
        ) : null}
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
/* Bản đồ Việt Nam                                                     */
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

  const activeCourse = useMemo(
    () => courses.find((c) => c.courseId === activeCourseId) ?? courses[0],
    [courses, activeCourseId]
  );

  /* ----- Mô hình ghim tỉnh theo khóa đang chọn ----- */
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
      return {
        province,
        index,
        cx: province.x * WORLD_WIDTH,
        cy: province.y * WORLD_HEIGHT,
        state,
        unit,
        unitIndex,
        doneCount,
        totalCount: lessons.length,
      };
    });
  }, [activeCourse, unlockedAll]);

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
    const scale = clampScale(targetScale ?? cameraRef.current.scale);
    flyTo({ x: w / 2 - cx * scale, y: h / 2 - cy * scale, scale });
  };

  const flyToProvince = (journeyIndex: number, select: boolean) => {
    const province = PROVINCES[journeyIndex];
    if (!province) return;
    if (select) setSelection({ kind: "province", index: journeyIndex });
    const targetScale = Math.max(cameraRef.current.scale, 0.95);
    centerOnWorldPoint(
      province.x * WORLD_WIDTH,
      province.y * WORLD_HEIGHT,
      targetScale
    );
  };

  const zoomBy = (factor: number) => {
    const { w, h } = viewportRef.current;
    const cam = cameraRef.current;
    const scale = clampScale(cam.scale * factor);
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
      const inRegion = PROVINCES.filter((p) => p.region === region);
      if (inRegion.length === 0) return;
      const cx =
        (inRegion.reduce((a, p) => a + p.x, 0) / inRegion.length) * WORLD_WIDTH;
      const cy =
        (inRegion.reduce((a, p) => a + p.y, 0) / inRegion.length) * WORLD_HEIGHT;
      centerOnWorldPoint(cx, cy, REGION_SCALE[region]);
    },
    zoomIn: () => zoomBy(1.3),
    zoomOut: () => zoomBy(1 / 1.3),
    centerOnCurrent: () => {
      if (currentModel) flyToProvince(currentModel.index, true);
    },
  }));

  /* Mở app lần đầu: đặt camera ngay (không hoạt họa) vào tỉnh đang học. */
  useEffect(() => {
    if (initializedRef.current || viewport.w <= 0 || viewport.h <= 0) return;
    initializedRef.current = true;
    if (currentModel) {
      const scale = 0.9;
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
        // Không nhận ngay khi chạm xuống → cú CHẠM vẫn tới được ghim bên dưới.
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

  const showLabels = camera.scale >= LABEL_MIN_SCALE;

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
          {/* Ảnh nền bản đồ Việt Nam phủ kín thế giới */}
          <Image
            source={require("@/assets/images/vietnam-map-bg.jpg")}
            style={styles.bgImage}
            contentFit="fill"
            accessibilityLabel="Bản đồ Việt Nam"
          />
          {/* Chạm vào vùng trống → đóng bảng chi tiết */}
          <Pressable
            style={styles.seaTouch}
            onPress={() => setSelection(null)}
            accessibilityRole="button"
            accessibilityLabel="Vùng trống trên bản đồ — chạm để đóng bảng chi tiết"
          />
          {models.map((model) => (
            <ProvincePin
              key={model.province.id}
              model={model}
              selected={
                selection?.kind === "province" && selection.index === model.index
              }
              showLabel={
                showLabels ||
                model.state === "current" ||
                (selection?.kind === "province" && selection.index === model.index)
              }
              reducedMotion={reducedMotion}
              onPress={(index) => setSelection({ kind: "province", index })}
            />
          ))}
          {SEA_POINTS.map((point) => (
            <SeaPin
              key={point.id}
              point={point}
              cx={point.x * WORLD_WIDTH}
              cy={point.y * WORLD_HEIGHT}
              selected={selection?.kind === "sea" && selection.id === point.id}
              showLabel={
                showLabels || (selection?.kind === "sea" && selection.id === point.id)
              }
              onPress={(id) => setSelection({ kind: "sea", id })}
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
    viewport: { flex: 1, overflow: "hidden", backgroundColor: "#1d6f9f" },
    world: {
      position: "absolute",
      left: 0,
      top: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      transformOrigin: "0 0",
    },
    bgImage: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
    seaTouch: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
    pinWrap: { position: "absolute", width: PIN_WRAP_W },
    pinPress: { alignItems: "center" },
    pinCenter: { alignItems: "center", justifyContent: "center" },
    pulseRing: {
      position: "absolute",
      top: -11,
      borderWidth: 5,
      borderColor: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.18)",
    },
    pin: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.92)",
      ...shadow.chunky,
    },
    pinDone: { backgroundColor: "#58a700" },
    pinCurrent: { backgroundColor: "#f59e0b" },
    pinLocked: { backgroundColor: "#b8c4cc", opacity: 0.9 },
    pinAvailable: { backgroundColor: "#38bdf8" },
    pinInfo: { backgroundColor: "rgba(255,255,255,0.82)" },
    pinSea: { backgroundColor: "#0ea5e9" },
    pinSelected: { borderColor: "#fbbf24", borderWidth: 4 },
    mascotWrap: {
      position: "absolute",
      top: -30,
      width: 40,
      height: 40,
      borderRadius: radius.full,
      borderWidth: 2.5,
      borderColor: colors.white,
      backgroundColor: colors.white,
      overflow: "hidden",
      zIndex: 3,
      ...shadow.chunky,
    },
    mascot: { width: "100%", height: "100%" },
    labelPill: {
      marginTop: 4,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderWidth: 1.5,
      borderColor: "rgba(13, 71, 110, 0.35)",
      borderRadius: radius.md,
      paddingHorizontal: 7,
      paddingVertical: 2,
      alignItems: "center",
    },
    labelPillSelected: { borderColor: "#fbbf24", backgroundColor: "#fffbeb" },
    provinceName: { fontSize: 15, fontWeight: "900", color: colors.neutral700 },
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
