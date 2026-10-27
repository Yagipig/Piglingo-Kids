import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CelebrationBurst } from "@/components/celebration";
import { DuoButton } from "@/components/duo-button";
import { FamilyRewardCard, GlobalRewardCard } from "@/components/reward-cards";
import { useAuth } from "@/features/supabase/AuthContext";
import { useSfx } from "@/lib/audio";
import { catalog } from "@/lib/content";
import {
  evaluateCondition,
  scopedFamilyRewards,
  visibleFamilyRewards,
  type GlobalReward,
  type RewardCondition,
} from "@/lib/rewards";
import { effectiveGlobalRewards, useRewardsStore } from "@/lib/rewardsStore";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow } from "@/lib/theme";

function isCompletionRewardForCourse(reward: GlobalReward, courseId: string): boolean {
  return (
    (reward.condition.type === "course-complete" && reward.condition.courseId === courseId) ||
    (reward.condition.type === "course-percent" &&
      reward.condition.courseId === courseId &&
      reward.condition.percent >= 100)
  );
}

function conditionIsCompletion(condition: RewardCondition, courseId: string | null): boolean {
  if (courseId == null) return condition.type === "all-courses-complete";
  return (
    (condition.type === "course-complete" && condition.courseId === courseId) ||
    (condition.type === "course-percent" &&
      condition.courseId === courseId &&
      condition.percent >= 100)
  );
}

/**
 * Màn chúc mừng toàn màn hình khi lần đầu chạm mốc 100%.
 * Chỉ hiển thị và hé lộ thưởng đã đạt; tuyệt đối không tự đánh dấu
 * phần thưởng ngoài đời là "đã trao" (givenAt chỉ do phụ huynh đặt).
 */
export default function CelebrationScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ course?: string; scope?: string }>();
  const progress = useProgress();
  const { user } = useAuth();
  const familyRewards = useRewardsStore((state) => state.familyRewards);
  const globalConfigCache = useRewardsStore((state) => state.globalConfigCache);
  const sfx = useSfx();

  const isAllCourses = params.scope === "all" || !params.course;
  const courseId = isAllCourses ? null : (params.course ?? null);
  const course = courseId ? catalog.courses.find((item) => item.id === courseId) : null;

  useEffect(() => {
    sfx.playFinish();
    // Chỉ phát một lần khi màn chúc mừng được mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalMatches = useMemo(() => {
    const all = effectiveGlobalRewards({ globalConfigCache }).filter(
      (reward) => reward.enabled && reward.kind !== "parent-tip",
    );
    const matches = isAllCourses
      ? all.filter((reward) => reward.condition.type === "all-courses-complete")
      : all.filter((reward) => courseId != null && isCompletionRewardForCourse(reward, courseId));
    return matches.sort((a, b) => {
      const rank = (reward: GlobalReward) =>
        reward.kind === "title" ? 0 : reward.kind === "chest" ? 1 : 2;
      return rank(a) - rank(b) || a.sortOrder - b.sortOrder;
    });
  }, [courseId, globalConfigCache, isAllCourses]);

  const familyMatches = useMemo(
    () =>
      visibleFamilyRewards(scopedFamilyRewards(familyRewards, user?.id ?? null)).filter(
        (reward) => {
          if (!conditionIsCompletion(reward.condition, courseId)) return false;
          return evaluateCondition(reward.condition, progress).done;
        },
      ),
    [courseId, familyRewards, progress, user?.id],
  );

  const headline = isAllCourses
    ? "Chúc mừng! Con đã hoàn thành hành trình khám phá ngôn ngữ!"
    : `Chúc mừng! Con đã hoàn thành 100% khóa ${course?.targetLanguage ?? "học"}!`;

  return (
    <SafeAreaView style={styles.screen}>
      <CelebrationBurst active />
      <ScrollView contentContainerStyle={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.mascotWrap}>
          <Image
            source={require("@/assets/images/mascot-celebrate.png")}
            style={styles.mascot}
            contentFit="contain"
            accessibilityLabel="Nhân vật Piglingo ăn mừng"
          />
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(100)} style={styles.chest}>
          🎁
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(160)} style={styles.title}>
          {headline}
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(220)} style={styles.subtitle}>
          Rương kho báu đã mở! Con đã đi tới cuối bản đồ{isAllCourses ? " của cả ba ngôn ngữ" : ""} bằng chính nỗ lực của mình.
        </Animated.Text>

        {globalMatches.map((reward, index) => (
          <Animated.View
            key={reward.id}
            entering={FadeInUp.delay(280 + index * 90)}
            style={styles.cardWrap}
          >
            <GlobalRewardCard
              reward={reward}
              evaluation={evaluateCondition(reward.condition, progress)}
            />
          </Animated.View>
        ))}

        {familyMatches.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>💝 Phần thưởng từ ba/mẹ đã mở</Text>
            {familyMatches.map((reward) => (
              <View key={reward.id} style={styles.cardWrap}>
                <FamilyRewardCard
                  reward={reward}
                  evaluation={evaluateCondition(reward.condition, progress)}
                  progress={progress}
                />
                <Text style={styles.parentNote}>
                  Ba/mẹ sẽ trao phần thưởng này cho con ngoài đời thật nhé!
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.actions}>
          <DuoButton
            label="Xem phần thưởng của con"
            size="lg"
            onPress={() => router.replace("/rewards")}
          />
          <DuoButton
            label="Đóng"
            variant="white"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      alignItems: "center",
      padding: 22,
      paddingBottom: 48,
      gap: 13,
    },
    mascotWrap: {
      width: 150,
      height: 150,
      borderRadius: radius.full,
      backgroundColor: colors.amber + "22",
      borderWidth: 3,
      borderColor: colors.amber,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      ...shadow.chunky,
    },
    mascot: { width: 138, height: 138 },
    chest: { fontSize: 54, marginTop: -18 },
    title: {
      fontSize: 27,
      lineHeight: 35,
      fontWeight: "900",
      textAlign: "center",
      color: colors.neutral700,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textMuted,
      maxWidth: 560,
    },
    cardWrap: { width: "100%", alignSelf: "stretch" },
    sectionTitle: {
      alignSelf: "flex-start",
      marginTop: 10,
      fontSize: 19,
      fontWeight: "900",
      color: colors.neutral700,
    },
    parentNote: { marginTop: 6, fontSize: 13, fontWeight: "700", color: colors.correctText },
    actions: { width: "100%", gap: 10, marginTop: 14 },
  }),
);
