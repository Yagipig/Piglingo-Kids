import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Flag } from "@/components/flag";
import { ScreenBackground } from "@/components/screen-background";
import { useAuth } from "@/features/supabase/AuthContext";
import { totalCompletedLessons, totalGardenXp } from "@/lib/garden";
import { kingdomForCourse } from "@/lib/kingdoms";
import { fetchLeaderboard, type LeaderboardResult } from "@/lib/leaderboard";
import { RANK_TIERS, rankForXp, rankTierState } from "@/lib/ranks";
import { allCourseRewardProgress, completedUnitsCount } from "@/lib/rewards";
import { currentStreak, useProgress } from "@/lib/store";
import { makeThemedStyles, radius, shadow, useThemeColors } from "@/lib/theme";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Màn Thành tích của em:
 *  - Cấp bậc nhà thám hiểm biển đảo suy THUẦN từ tổng XP trong store
 *    (không cần đăng nhập, không lưu thêm trạng thái).
 *  - Số liệu học thật: tổng XP, chuỗi ngày, bài đã học, đảo đã khám phá,
 *    thứ hạng 3 vương quốc theo % hoàn thành.
 *  - Bảng xếp hạng thật giữa các tài khoản đã đăng nhập qua RPC ẩn danh
 *    của Supabase — chỉ hiện bí danh "Nhà thám hiểm #NNNNN" + XP, tuyệt
 *    đối không hiện email/tên thật của bất kỳ ai.
 */
export default function AchievementsScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const progress = useProgress();
  const { user } = useAuth();

  const totalXp = totalGardenXp(progress);
  const rank = rankForXp(totalXp);
  const streak = currentStreak(progress);
  const lessonsDone = totalCompletedLessons(progress);
  const units = completedUnitsCount(progress);

  const courseRows = useMemo(() => allCourseRewardProgress(progress), [progress]);
  const lessonsTotal = courseRows.reduce((sum, row) => sum + row.total, 0);
  const kingdomRanking = useMemo(
    () =>
      [...courseRows].sort(
        (a, b) => b.percent - a.percent || b.completed - a.completed,
      ),
    [courseRows],
  );

  const [board, setBoard] = useState<LeaderboardResult | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setBoard(null);
      setBoardLoading(false);
      return;
    }
    let cancelled = false;
    setBoardLoading(true);
    fetchLeaderboard(20)
      .then((result) => {
        if (!cancelled) {
          setBoard(result);
          setBoardLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoard({ status: "error" });
          setBoardLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const rankPct = Math.round(rank.progress01 * 100);

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
            <Text style={styles.title}>🏆 Thành tích của em</Text>
            <Text style={styles.subtitle}>
              Cấp bậc nhà thám hiểm và bảng xếp hạng theo điểm XP.
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Thẻ cấp bậc hiện tại */}
          <View style={styles.rankCard}>
            <Text style={styles.rankEmojiBig}>{rank.emoji}</Text>
            <Text style={styles.rankTitle}>{rank.title}</Text>
            <Text style={styles.rankMeta}>
              Cấp bậc {rank.level}/{RANK_TIERS.length} · Tổng {totalXp} XP
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${rankPct}%` }]} />
            </View>
            <Text style={styles.rankHint}>
              {rank.isMax
                ? "Em đã đạt cấp bậc cao nhất — Vua Biển Cả! 👑"
                : `Còn ${rank.xpToNext} XP nữa là lên ${rank.nextEmoji} ${rank.nextTitle}`}
            </Text>
          </View>

          {/* Lưới 8 cấp bậc */}
          <Text style={styles.sectionTitle}>🗺️ Thang cấp bậc biển đảo</Text>
          <View style={styles.tierGrid}>
            {RANK_TIERS.map((tier) => {
              const state = rankTierState(tier, totalXp);
              return (
                <View
                  key={tier.level}
                  style={[
                    styles.tierCard,
                    state === "current" && styles.tierCardCurrent,
                    state === "locked" && styles.tierCardLocked,
                  ]}
                  accessibilityLabel={`${tier.title}: ${
                    state === "current"
                      ? "cấp bậc hiện tại"
                      : state === "achieved"
                        ? "đã đạt"
                        : `chưa đạt, cần ${tier.minXp} XP`
                  }`}
                >
                  <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                  <Text style={styles.tierName}>{tier.title}</Text>
                  <Text style={styles.tierXp}>từ {tier.minXp} XP</Text>
                  <Text
                    style={[
                      styles.tierState,
                      state === "current" && { color: colors.skyDark },
                    ]}
                  >
                    {state === "current"
                      ? "⭐ Hiện tại"
                      : state === "achieved"
                        ? "✅ Đã đạt"
                        : "🔒 Chưa đạt"}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Số liệu học thật */}
          <Text style={styles.sectionTitle}>📊 Số liệu của em</Text>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>⚡ {totalXp}</Text>
              <Text style={styles.statLabel}>Tổng điểm XP</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>🔥 {streak} ngày</Text>
              <Text style={styles.statLabel}>Chuỗi ngày học</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                📚 {lessonsDone}/{lessonsTotal}
              </Text>
              <Text style={styles.statLabel}>Bài đã hoàn thành</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                🏝️ {units.completed}/{units.total}
              </Text>
              <Text style={styles.statLabel}>Đảo đã khám phá</Text>
            </View>
          </View>

          {/* Xếp hạng 3 vương quốc */}
          <Text style={styles.sectionTitle}>👑 Xếp hạng 3 vương quốc</Text>
          <View style={styles.card}>
            {kingdomRanking.map((row, index) => {
              const kingdom = kingdomForCourse(row.courseId);
              const pct = row.percent;
              return (
                <View key={row.courseId} style={styles.kingdomRow}>
                  <Text style={styles.medal}>{RANK_MEDALS[index] ?? ""}</Text>
                  <Flag courseId={row.courseId} size={26} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.kingdomName}>
                      {kingdom?.kingdomName ?? row.targetLanguage}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: kingdom?.palette.primary ?? colors.green,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.kingdomMeta}>
                    {row.completed}/{row.total} · {pct}%
                  </Text>
                </View>
              );
            })}
            <Text style={styles.cardHint}>
              Vương quốc nào học được nhiều nhất sẽ đứng đầu bảng này.
            </Text>
          </View>

          {/* Bảng xếp hạng thật (ẩn danh) */}
          <Text style={styles.sectionTitle}>🌍 Bảng xếp hạng nhà thám hiểm</Text>
          <View style={styles.card}>
            {!user ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.cardHint}>
                  Khi đăng nhập, điểm XP của em sẽ được xếp hạng cùng các nhà
                  thám hiểm khác. Tên trên bảng luôn là bí danh ẩn danh, không
                  ai thấy email hay tên thật của em đâu.
                </Text>
                <Pressable
                  onPress={() => router.push("/account")}
                  accessibilityRole="button"
                  accessibilityLabel="Đăng nhập để tham gia bảng xếp hạng"
                  style={({ pressed }) => [
                    styles.accountButton,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.accountButtonText}>
                    Đăng nhập / Tạo tài khoản
                  </Text>
                </Pressable>
              </View>
            ) : boardLoading || board === null ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.skyDark} />
                <Text style={styles.cardHint}>Đang tải bảng xếp hạng…</Text>
              </View>
            ) : board.status !== "ready" ? (
              <Text style={styles.cardHint}>
                Bảng xếp hạng đang được chuẩn bị, em quay lại sau nhé! 🌈
              </Text>
            ) : (
              <View style={{ gap: 6 }}>
                {board.mine ? (
                  <View style={styles.mineCard}>
                    <Text style={styles.mineText}>
                      ⭐ Hạng của em: #{board.mine.rank} · {board.mine.totalXp} XP
                    </Text>
                    <Text style={styles.mineSub}>
                      Bí danh của em trên bảng: {board.mine.anonCode}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.cardHint}>
                    Em chưa có điểm trên bảng — hãy học một bài khi đang đăng
                    nhập để tiến độ được đồng bộ lên nhé!
                  </Text>
                )}
                {board.entries.length === 0 ? (
                  <Text style={styles.cardHint}>
                    Chưa có nhà thám hiểm nào trên bảng. Em có thể là người đầu
                    tiên đấy!
                  </Text>
                ) : (
                  board.entries.map((entry) => {
                    const isMine =
                      board.mine != null &&
                      entry.anonCode === board.mine.anonCode &&
                      entry.rank === board.mine.rank &&
                      entry.totalXp === board.mine.totalXp;
                    return (
                      <View
                        key={`${entry.rank}-${entry.anonCode}`}
                        style={[styles.boardRow, isMine && styles.boardRowMine]}
                      >
                        <Text style={styles.boardRank}>
                          {entry.rank <= 3
                            ? RANK_MEDALS[entry.rank - 1]
                            : `#${entry.rank}`}
                        </Text>
                        <Text style={[styles.boardName, isMine && styles.boardNameMine]}>
                          {entry.anonCode}
                          {isMine ? " (em)" : ""}
                        </Text>
                        <Text style={styles.boardXp}>{entry.totalXp} XP</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
            <Text style={styles.footnote}>
              Điểm được tính khi đăng nhập và đồng bộ tiến độ. Tên hiển thị là
              bí danh ẩn danh để bảo vệ thông tin của các bạn nhỏ.
            </Text>
          </View>

          <Text style={styles.bottomNote}>
            Cứ học đều mỗi ngày, cấp bậc và thứ hạng của em sẽ tự leo lên thôi! ⛵
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
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    body: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.neutral700,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      padding: 14,
      gap: 10,
      ...shadow.card,
    },
    cardHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
    footnote: { fontSize: 11.5, lineHeight: 16, color: colors.textMuted },
    rankCard: {
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.xl,
      padding: 18,
      ...shadow.card,
    },
    rankEmojiBig: { fontSize: 56 },
    rankTitle: { fontSize: 22, fontWeight: "900", color: colors.neutral700, textAlign: "center" },
    rankMeta: { fontSize: 13.5, fontWeight: "700", color: colors.textMuted },
    rankHint: { fontSize: 13.5, fontWeight: "700", color: colors.neutral700, textAlign: "center" },
    barTrack: {
      height: 9,
      borderRadius: radius.full,
      backgroundColor: colors.neutral200,
      overflow: "hidden",
      alignSelf: "stretch",
    },
    barFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.green },
    tierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tierCard: {
      width: "48.5%",
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    tierCardCurrent: { borderColor: colors.skyDark, backgroundColor: colors.neutral100 },
    tierCardLocked: { opacity: 0.65 },
    tierEmoji: { fontSize: 30 },
    tierName: { fontSize: 13, fontWeight: "800", color: colors.neutral700, textAlign: "center" },
    tierXp: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted },
    tierState: { fontSize: 11.5, fontWeight: "800", color: colors.textMuted },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statCard: {
      width: "48.5%",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 10,
      gap: 2,
      alignItems: "center",
    },
    statValue: { fontSize: 17, fontWeight: "900", color: colors.neutral700 },
    statLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
    kingdomRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    medal: { fontSize: 20, width: 26, textAlign: "center" },
    kingdomName: { fontSize: 14, fontWeight: "800", color: colors.neutral700 },
    kingdomMeta: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
    accountButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.sky,
      borderRadius: radius.full,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    accountButtonText: { fontSize: 13.5, fontWeight: "900", color: colors.white },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    mineCard: {
      backgroundColor: colors.neutral100,
      borderWidth: 2,
      borderColor: colors.skyDark,
      borderRadius: radius.lg,
      padding: 10,
      gap: 2,
    },
    mineText: { fontSize: 14.5, fontWeight: "900", color: colors.neutral700 },
    mineSub: { fontSize: 12.5, fontWeight: "700", color: colors.textMuted },
    boardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: radius.md,
    },
    boardRowMine: { backgroundColor: colors.neutral100 },
    boardRank: { fontSize: 14, fontWeight: "900", color: colors.neutral700, width: 34, textAlign: "center" },
    boardName: { flex: 1, fontSize: 13.5, fontWeight: "700", color: colors.neutral700 },
    boardNameMine: { fontWeight: "900" },
    boardXp: { fontSize: 13, fontWeight: "800", color: colors.textMuted },
    bottomNote: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 4,
    },
  }),
);
