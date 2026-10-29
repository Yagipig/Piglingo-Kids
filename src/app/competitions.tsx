import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenBackground } from "@/components/screen-background";
import {
  COMPETITION_SECTIONS,
  competitionsForBand,
  type Competition,
} from "@/lib/competitions";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow } from "@/lib/theme";
import type { SchoolBand } from "@/lib/types";

/**
 * Màn Cuộc thi & chứng chỉ tiếng Anh: danh sách liên kết tới trang
 * CHÍNH THỨC của các cuộc thi/chứng chỉ, chia theo 3 khối lớp của lộ
 * trình. Khối trùng schoolBand của người dùng được đưa lên đầu và gắn
 * nhãn "Khối của em". App chỉ mở trang ngoài bằng Linking — không thu
 * lệ phí, không đăng ký hộ, không lưu dữ liệu về các kỳ thi.
 */
export default function CompetitionsScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const myBand: SchoolBand = progress.schoolBand ?? "tieu-hoc";

  const sections = useMemo(() => {
    const mine = COMPETITION_SECTIONS.filter((s) => s.band === myBand);
    const rest = COMPETITION_SECTIONS.filter((s) => s.band !== myBand);
    return [...mine, ...rest];
  }, [myBand]);

  const openLink = async (item: Competition) => {
    try {
      await Linking.openURL(item.url);
    } catch {
      Alert.alert(
        "Chưa mở được liên kết",
        "Ba mẹ kiểm tra kết nối mạng rồi thử lại sau nhé.",
      );
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              🏆 Cuộc thi & chứng chỉ tiếng Anh
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              Các kỳ thi và chứng chỉ quốc tế theo từng khối lớp — bấm vào thẻ
              để mở trang chính thức của đơn vị tổ chức.
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {sections.map((section) => (
            <View key={section.band} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
                  {section.title}
                </Text>
                {section.band === myBand ? (
                  <View style={styles.myBandBadge}>
                    <Text style={styles.myBandBadgeText} maxFontSizeMultiplier={1.1}>
                      Khối của em
                    </Text>
                  </View>
                ) : null}
              </View>
              {competitionsForBand(section.band).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openLink(item)}
                  accessibilityRole="link"
                  accessibilityLabel={`${item.name}. ${item.org}. ${item.levelLabel}. Xem trang chính thức`}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.compName} maxFontSizeMultiplier={1.25}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.compOrg} maxFontSizeMultiplier={1.2}>
                      {item.org}
                    </Text>
                    <View style={styles.chip}>
                      <Text style={styles.chipText} maxFontSizeMultiplier={1.1}>
                        {item.levelLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.compDesc} maxFontSizeMultiplier={1.3}>
                    {item.desc}
                  </Text>
                  <Text style={styles.openLink} maxFontSizeMultiplier={1.2}>
                    Xem trang chính thức ↗
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}

          <Text style={styles.footnote} maxFontSizeMultiplier={1.3}>
            Các liên kết mở trang chính thức của đơn vị tổ chức. Piglingo không
            thu lệ phí và không đăng ký hộ — ba mẹ xem kỹ lịch thi, lệ phí và
            địa điểm trên trang chính thức nhé.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: colors.neutral100,
      borderWidth: 2,
      borderColor: colors.neutral200,
    },
    backText: { fontSize: 22, fontWeight: "800", color: colors.neutral700 },
    title: { fontSize: 24, fontWeight: "900", color: colors.neutral700 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
    body: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      padding: 16,
      paddingBottom: 48,
      gap: 20,
    },
    section: { gap: 10 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.neutral700,
    },
    myBandBadge: {
      backgroundColor: colors.green,
      borderRadius: radius.full,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    myBandBadgeText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      padding: 14,
      gap: 7,
      ...shadow.card,
    },
    compName: { fontSize: 16.5, fontWeight: "900", color: colors.neutral700 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    compOrg: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    chip: {
      backgroundColor: colors.neutral100,
      borderWidth: 1.5,
      borderColor: colors.neutral200,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    chipText: { fontSize: 11.5, fontWeight: "800", color: colors.neutral700 },
    compDesc: { fontSize: 13.5, lineHeight: 19, color: colors.neutral700 },
    openLink: { fontSize: 13.5, fontWeight: "900", color: colors.skyDark },
    footnote: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  }),
);
