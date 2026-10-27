import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FamilyRewardCard, GlobalRewardCard } from "@/components/reward-cards";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  evaluateCondition,
  scopedFamilyRewards,
  visibleFamilyRewards,
} from "@/lib/rewards";
import { effectiveGlobalRewards, useRewardsStore } from "@/lib/rewardsStore";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius } from "@/lib/theme";

/**
 * Màn Phần thưởng phía trẻ — CHỈ XEM.
 * Không có nút thêm/sửa/xóa hay xác nhận đã trao tại đây. Trạng thái đạt
 * được suy ra trực tiếp từ store học hiện tại, không lưu bản sao.
 */
export default function RewardsScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const { user } = useAuth();
  const familyRewards = useRewardsStore((state) => state.familyRewards);
  const globalConfigCache = useRewardsStore((state) => state.globalConfigCache);

  const globalRewards = effectiveGlobalRewards({ globalConfigCache }).filter(
    (reward) => reward.enabled && reward.kind !== "parent-tip",
  );
  const childFamilyRewards = visibleFamilyRewards(
    scopedFamilyRewards(familyRewards, user?.id ?? null),
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
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
          <Text style={styles.title}>🎁 Phần thưởng của em</Text>
          <Text style={styles.subtitle}>Khám phá để mở huy hiệu, rương kho báu và quà từ ba/mẹ.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>🏅 Khu vực 1 · Phần thưởng chung</Text>
        <Text style={styles.sectionHint}>
          Những mục tiêu này do Piglingo Kids và thầy/cô quản trị thiết lập cho mọi nhà thám hiểm.
        </Text>
        {globalRewards.map((reward) => (
          <GlobalRewardCard
            key={reward.id}
            reward={reward}
            evaluation={evaluateCondition(reward.condition, progress)}
          />
        ))}

        <Text style={[styles.sectionTitle, styles.secondSection]}>💝 Khu vực 2 · Quà từ cha mẹ</Text>
        <Text style={styles.sectionHint}>
          Phần thưởng riêng do ba/mẹ chuẩn bị cho con ở ngoài đời thật.
        </Text>
        {childFamilyRewards.length > 0 ? (
          childFamilyRewards.map((reward) => (
            <FamilyRewardCard
              key={reward.id}
              reward={reward}
              evaluation={evaluateCondition(reward.condition, progress)}
              progress={progress}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={styles.emptyTitle}>Chưa có quà riêng nào</Text>
            <Text style={styles.emptyText}>
              Ba/mẹ có thể chuẩn bị một phần thưởng bí mật cho con trong khu vực phụ huynh. Con cứ tiếp tục khám phá nhé!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    body: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    sectionTitle: { fontSize: 20, fontWeight: "900", color: colors.neutral700 },
    secondSection: { marginTop: 18 },
    sectionHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: -6 },
    emptyCard: {
      alignItems: "center",
      gap: 7,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.neutral300,
      borderRadius: radius.xl,
      padding: 20,
      backgroundColor: colors.neutral100,
    },
    emptyEmoji: { fontSize: 38 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", color: colors.textMuted },
  }),
);
