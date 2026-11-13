import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CloseButton } from "@/components/close-button";
import { getPack, orderedCourses } from "@/lib/content";
import {
  PROVINCES,
  REGION_LABELS,
  SEA_POINTS,
  unitIndexForProvince,
  type Province,
  type SeaPoint,
} from "@/lib/provinces";
import { makeThemedStyles, radius } from "@/lib/theme";
import {
  SATELLITE_PROVINCE_POSITIONS,
  SATELLITE_SEA_POSITIONS,
} from "@/lib/vietnam-map-positions";

/**
 * Màn "Bản đồ Việt Nam" — bản đồ vệ tinh dạng KHÁM PHÁ (không thay bản
 * đồ đường đi học chính): ảnh vệ tinh Việt Nam do gia đình cung cấp
 * (assets/images/vietnam-satellite-map.jpg, 646×550) với 34 ghim số
 * theo thứ tự hành trình Bắc → Nam + 2 ghim cờ Hoàng Sa / Trường Sa.
 * Chạm một ghim mở thẻ thông tin tỉnh (giới thiệu / lịch sử / đặc sản
 * từ provinces.ts) kèm bài học đang đặt tại tỉnh đó ở từng khóa và lối
 * mở sang bản đồ bài học của khóa.
 *
 * Ảnh chụp nghiêng nên vị trí ghim là tương đối, đặt tay theo hình đất
 * liền trên ảnh (xem vietnam-map-positions.ts); bản đồ ranh giới tỉnh
 * SVG (province-shapes.ts) vẫn giữ nguyên cho các màn khác.
 */

const MAP_IMAGE = require("@/assets/images/vietnam-satellite-map.jpg");

const REGION_PIN_COLORS: Record<Province["region"], string> = {
  bac: "#F97316",
  trung: "#0284C7",
  nam: "#16A34A",
};

type Selection =
  | { kind: "province"; province: Province; journeyIndex: number }
  | { kind: "sea"; point: SeaPoint }
  | null;

export default function VietnamMapScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);

  const courseRows = useMemo(() => {
    if (!selection || selection.kind !== "province") return [];
    return orderedCourses
      .map((course) => {
        const pack = getPack(course.id);
        // Pack chia theo sections (khối lớp); unit của khóa là toàn bộ
        // unit trong các section, giữ đúng thứ tự hành trình.
        const units = pack.sections.flatMap((section) => section.units);
        const unitIndex = unitIndexForProvince(
          selection.journeyIndex,
          units.length
        );
        if (unitIndex == null) return null;
        return { course, unit: units[unitIndex] };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }, [selection]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          Bản đồ Việt Nam
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
          Hành trình xuyên Việt qua 34 tỉnh/thành, từ Lai Châu tới Cà Mau.
          Chạm vào một ghim số để khám phá tỉnh đó — và xem bài học đang
          chờ bé ở đó nhé!
        </Text>

        <View style={styles.mapFrame}>
          <Image source={MAP_IMAGE} style={styles.mapImage} resizeMode="cover" />
          {PROVINCES.map((province, i) => {
            const pos = SATELLITE_PROVINCE_POSITIONS[province.id];
            if (!pos) return null;
            const active =
              selection?.kind === "province" &&
              selection.province.id === province.id;
            return (
              <Pressable
                key={province.id}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}. ${province.name}`}
                onPress={() =>
                  setSelection({ kind: "province", province, journeyIndex: i })
                }
                style={[
                  styles.pin,
                  {
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    backgroundColor: REGION_PIN_COLORS[province.region],
                  },
                  active && styles.pinActive,
                ]}
              >
                <Text style={styles.pinText} maxFontSizeMultiplier={1}>
                  {i + 1}
                </Text>
              </Pressable>
            );
          })}
          {SEA_POINTS.map((point) => {
            const pos = SATELLITE_SEA_POSITIONS[point.id];
            if (!pos) return null;
            const active =
              selection?.kind === "sea" && selection.point.id === point.id;
            return (
              <Pressable
                key={point.id}
                accessibilityRole="button"
                accessibilityLabel={point.name}
                onPress={() => setSelection({ kind: "sea", point })}
                style={[
                  styles.pin,
                  styles.seaPin,
                  {
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                  },
                  active && styles.pinActive,
                ]}
              >
                <Text style={styles.pinText} maxFontSizeMultiplier={1}>
                  ⚑
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          {(Object.keys(REGION_LABELS) as Province["region"][]).map(
            (region) => (
              <View key={region} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: REGION_PIN_COLORS[region] },
                  ]}
                />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>
                  {REGION_LABELS[region]}
                </Text>
              </View>
            )
          )}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.seaPin]} />
            <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>
              Biển đảo
            </Text>
          </View>
        </View>

        {selection == null && (
          <View style={styles.card}>
            <Text style={styles.cardHint} maxFontSizeMultiplier={1.3}>
              👆 Chạm vào một ghim trên bản đồ để xem giới thiệu, một nét
              lịch sử và đặc sản của tỉnh đó.
            </Text>
          </View>
        )}

        {selection?.kind === "province" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
              {selection.journeyIndex + 1}. {selection.province.name}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.25}>
              {REGION_LABELS[selection.province.region]} · Chặng{" "}
              {selection.journeyIndex + 1} của hành trình xuyên Việt
            </Text>
            <Text style={styles.cardText} maxFontSizeMultiplier={1.3}>
              {selection.province.intro}
            </Text>
            <Text style={styles.cardLabel} maxFontSizeMultiplier={1.25}>
              📜 Một nét lịch sử
            </Text>
            <Text style={styles.cardText} maxFontSizeMultiplier={1.3}>
              {selection.province.history}
            </Text>
            <Text style={styles.cardLabel} maxFontSizeMultiplier={1.25}>
              🎁 Đặc sản
            </Text>
            <View style={styles.chipRow}>
              {selection.province.specialties.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
            {selection.province.mergedFrom && (
              <Text style={styles.cardNote} maxFontSizeMultiplier={1.25}>
                Từ năm 2025, {selection.province.name} được hợp thành từ{" "}
                {selection.province.mergedFrom}.
              </Text>
            )}
            {courseRows.length > 0 && (
              <>
                <Text style={styles.cardLabel} maxFontSizeMultiplier={1.25}>
                  📚 Bài học đang chờ ở tỉnh này
                </Text>
                {courseRows.map(({ course, unit }) => (
                  <Pressable
                    key={course.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Mở bản đồ bài học ${course.targetLanguage}`}
                    onPress={() => router.push(`/map/${course.id}`)}
                    style={({ pressed }) => [
                      styles.courseRow,
                      pressed && styles.courseRowPressed,
                    ]}
                  >
                    <Text style={styles.courseRowText} maxFontSizeMultiplier={1.25}>
                      {course.flag} {course.targetLanguage}: {unit.title}
                    </Text>
                    <Text style={styles.courseRowArrow} maxFontSizeMultiplier={1.25}>
                      Mở bản đồ ›
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {selection?.kind === "sea" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
              ⚑ {selection.point.name}
            </Text>
            <Text style={styles.cardSub} maxFontSizeMultiplier={1.25}>
              Biển đảo Việt Nam · Chỉ khám phá, không có bài học
            </Text>
            <Text style={styles.cardText} maxFontSizeMultiplier={1.3}>
              {selection.point.intro}
            </Text>
            <Text style={styles.cardLabel} maxFontSizeMultiplier={1.25}>
              📜 Một nét lịch sử
            </Text>
            <Text style={styles.cardText} maxFontSizeMultiplier={1.3}>
              {selection.point.history}
            </Text>
          </View>
        )}

        <Text style={styles.credit} maxFontSizeMultiplier={1.2}>
          Ảnh bản đồ vệ tinh Việt Nam do gia đình cung cấp. Vị trí các ghim
          là tương đối theo hình đất liền trên ảnh.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    body: { padding: 16, gap: 12, paddingBottom: 32 },
    intro: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    mapFrame: {
      width: "100%",
      aspectRatio: 646 / 550,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: "#0B3B5E",
    },
    mapImage: { position: "absolute", width: "100%", height: "100%" },
    pin: {
      position: "absolute",
      width: 26,
      height: 26,
      marginLeft: -13,
      marginTop: -13,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    seaPin: { backgroundColor: "#2563EB" },
    pinActive: {
      width: 34,
      height: 34,
      marginLeft: -17,
      marginTop: -17,
      borderWidth: 3,
      zIndex: 5,
    },
    pinText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 12, height: 12, borderRadius: radius.full },
    legendText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      gap: 8,
    },
    cardHint: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    cardTitle: { fontSize: 19, fontWeight: "800", color: colors.text },
    cardSub: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    cardLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      marginTop: 6,
    },
    cardText: { fontSize: 14, lineHeight: 21, color: colors.text },
    cardNote: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      backgroundColor: colors.selectedBg,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: { fontSize: 12, fontWeight: "600", color: colors.selectedText },
    courseRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    courseRowPressed: { opacity: 0.7 },
    courseRowText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text },
    courseRowArrow: { fontSize: 12, fontWeight: "800", color: colors.skyDark },
    credit: { fontSize: 11, lineHeight: 16, color: colors.textMuted, textAlign: "center" },
  })
);
