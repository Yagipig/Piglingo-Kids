import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CelebrationBurst } from "@/components/celebration";
import { DuoButton } from "@/components/duo-button";
import { Card } from "@/components/ui";
import { FamilyRewardCard, GlobalRewardCard } from "@/components/reward-cards";
import { useAuth } from "@/features/supabase/AuthContext";
import {
  buildStages,
  isStageComplete,
  stageCompletedCount,
} from "@/lib/adventure";
import { useSfx } from "@/lib/audio";
import { catalog, useCourseContent } from "@/lib/content";
import { kingdomForCourse } from "@/lib/kingdoms";
import { stageReward } from "@/lib/pets";
import {
  evaluateCondition,
  scopedFamilyRewards,
  visibleFamilyRewards,
  type GlobalReward,
  type RewardCondition,
} from "@/lib/rewards";
import { effectiveGlobalRewards, useRewardsStore } from "@/lib/rewardsStore";
import { useProgress, XP_PER_LESSON, XP_PERFECT_BONUS } from "@/lib/store";
import { makeThemedStyles, radius, shadow, typography } from "@/lib/theme";

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
  const params = useLocalSearchParams<{
    course?: string;
    scope?: string;
    stage?: string;
    justClaimed?: string;
  }>();
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

  /* ----- Nhánh RƯƠNG CHẶNG: /celebration?course=..&stage=N ---------
     Ăn mừng cho chặng đã hoàn thành trên bản đồ đường đi. Từ Đợt B+C,
     bản đồ đã gọi `claimStageReward` TRƯỚC khi điều hướng tới đây khi
     rương chưa nhận (param `justClaimed=1`) — màn này chỉ HIỂN THỊ quà
     vừa nhận từ store, tự nó không cộng gì thêm; mở lại rương đã nhận
     (không có param) thì chỉ hiện lại phần quà của chặng. Không gắn
     phần thưởng gia đình. Không có param `stage` thì hành vi cũ (mốc
     100% khóa) giữ nguyên tuyệt đối. */
  const stageContent = useCourseContent(courseId ?? "en-vi");
  const stageModel = useMemo(() => {
    if (params.stage == null || params.stage === "" || courseId == null) {
      return null;
    }
    const stageIndex = Number(params.stage);
    if (!Number.isInteger(stageIndex) || stageIndex < 0) return null;
    const stage = buildStages(stageContent.allLessons)[stageIndex];
    if (!stage) return null;
    const completedMap = progress.courses?.[courseId]?.completedLessons ?? {};
    const stageNumber = stage.index + 1;
    return {
      stage,
      done: stageCompletedCount(stage, completedMap),
      complete: isStageComplete(stage, completedMap),
      kingdom: kingdomForCourse(courseId),
      courseXp: progress.courses?.[courseId]?.xp ?? 0,
      courseName: course?.targetLanguage ?? "",
      reward: stageReward(stageNumber),
      claimed: (progress.claimedStageRewards?.[courseId] ?? []).includes(
        stageNumber
      ),
      justClaimed: params.justClaimed === "1",
      wallet: {
        stars: progress.stars ?? 0,
        food: progress.petFood ?? 0,
        keys: progress.unlockKeys ?? 0,
      },
    };
  }, [
    params.stage,
    params.justClaimed,
    courseId,
    course,
    stageContent.allLessons,
    progress,
  ]);

  if (stageModel) {
    const {
      stage,
      done,
      complete,
      kingdom,
      courseXp,
      courseName,
      reward,
      claimed,
      justClaimed,
      wallet,
    } = stageModel;
    const stageBaseXp = XP_PER_LESSON * stage.lessons.length;
    return (
      <SafeAreaView style={styles.screen}>
        <CelebrationBurst active={complete} />
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
            {complete ? "🎁" : "🔒"}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(160)} style={styles.title}>
            {complete
              ? `Con đã mở rương Chặng ${stage.index + 1}!`
              : `Rương Chặng ${stage.index + 1} chưa mở được`}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(220)} style={styles.subtitle}>
            {kingdom ? `${kingdom.kingdomName} · ` : ""}
            {courseName} — Chặng “{stage.title}”, Bài {stage.startGlobal + 1}–
            {stage.endGlobal + 1} trong toàn khóa. Con đã học xong {done}/
            {stage.lessons.length} bài của chặng này.
          </Animated.Text>

          {complete ? (
            <Animated.View entering={FadeInUp.delay(280)} style={styles.cardWrap}>
              <Text style={styles.stars}>⭐⭐⭐</Text>
              <Card
                accentColor={kingdom?.palette.primary}
                style={styles.infoCard}
              >
                {justClaimed ? (
                  <>
                    <Text style={styles.infoLine}>
                      🎁 Quà trong rương vừa về túi của bé:
                    </Text>
                    <Text style={styles.infoLine}>
                      ⚡ +{reward.xpBonus} XP thưởng · ⭐ +{reward.stars} sao
                      (đang có {wallet.stars} sao)
                    </Text>
                    <Text style={styles.infoLine}>
                      🍎 +{reward.food} thức ăn cho thú cưng (đang có{" "}
                      {wallet.food})
                      {reward.key > 0
                        ? ` · 🔑 +${reward.key} chìa khóa bí mật (đang có ${wallet.keys})`
                        : ""}
                    </Text>
                  </>
                ) : claimed ? (
                  <>
                    <Text style={styles.infoLine}>
                      Rương này bé đã nhận quà rồi nè! Quà của chặng là: ⚡ +
                      {reward.xpBonus} XP thưởng, ⭐ +{reward.stars} sao, 🍎 +
                      {reward.food} thức ăn cho thú
                      {reward.key > 0 ? `, 🔑 +${reward.key} chìa khóa bí mật` : ""}.
                    </Text>
                    <Text style={styles.infoLine}>
                      Ví của bé lúc này: ⭐ {wallet.stars} sao · 🍎 {wallet.food}{" "}
                      thức ăn · 🔑 {wallet.keys} chìa khóa.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.infoLine}>
                    🎉 Chặng này mang về ít nhất {stageBaseXp} XP (mỗi bài{" "}
                    {XP_PER_LESSON} XP, bài không sai câu nào còn +
                    {XP_PERFECT_BONUS} XP nữa). Quay lại bản đồ và chạm vào
                    rương để nhận quà cho thú cưng nhé!
                  </Text>
                )}
                <Text style={styles.infoLine}>
                  ⭐ Tổng XP của vương quốc này: {courseXp} XP.
                </Text>
                <Text style={styles.infoLine}>
                  Vào trang Thú cưng 🐾 để cho thú ăn, mặc phụ kiện và dùng
                  chìa khóa bí mật nhé!
                </Text>
              </Card>
            </Animated.View>
          ) : (
            <Animated.Text entering={FadeInUp.delay(280)} style={styles.subtitle}>
              Học xong mọi bài của Chặng {stage.index + 1} trên bản đồ đường
              đi là rương tự mở. Cố lên, nhà thám hiểm nhí!
            </Animated.Text>
          )}

          <View style={styles.actions}>
            <DuoButton
              label="🗺️ Quay lại bản đồ"
              size="lg"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)")
              }
            />
            <DuoButton
              label="Về trang chủ"
              variant="white"
              onPress={() => router.replace("/(tabs)")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
      fontSize: typography.display.fontSize,
      lineHeight: typography.display.lineHeight,
      fontWeight: "900",
      textAlign: "center",
      color: colors.neutral700,
    },
    subtitle: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      textAlign: "center",
      color: colors.textMuted,
      maxWidth: 560,
    },
    cardWrap: { width: "100%", alignSelf: "stretch" },
    stars: { fontSize: 40, textAlign: "center", marginBottom: 8 },
    infoCard: { gap: 8 },
    infoLine: {
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "600",
      color: colors.text,
    },
    sectionTitle: {
      alignSelf: "flex-start",
      marginTop: 10,
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    parentNote: { marginTop: 6, fontSize: 13, fontWeight: "700", color: colors.correctText },
    actions: { width: "100%", gap: 10, marginTop: 14 },
  }),
);
