import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { Flag } from "@/components/flag";
import { Card, ProgressBar } from "@/components/ui";
import { ScreenBackground } from "@/components/screen-background";
import { SpeakerButton } from "@/components/speaker-button";
import { useCourseContent } from "@/lib/content";
import { dueInDays } from "@/lib/srs";
import { dailyQuests, dueSrsWords, useProgress, type Quest } from "@/lib/store";
import { makeThemedStyles, radius, shadow, useThemeColors } from "@/lib/theme";

export default function PracticeScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const progress = useProgress();
  const { activeCourseId } = progress;
  const courseProgress = progress.course();
  const { pack, allWords } = useCourseContent(activeCourseId);
  const dueWords = dueSrsWords(courseProgress.srs);
  const quests = dailyQuests(progress);

  const uniqueWords = [
    ...new Map(allWords().map((w) => [w.target, w] as const)).values(),
  ];
  const words = uniqueWords
    .map((w) => ({
      ...w,
      stat: courseProgress.wordStats[w.target],
      srs: courseProgress.srs[w.target],
    }))
    .filter((w) => w.stat);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.3}>
          🎒 Ba lô &amp; Ôn tập
        </Text>
        <Text style={styles.subheading} maxFontSizeMultiplier={1.3}>
          Mở ba lô thám hiểm: chơi game, làm nhiệm vụ và ôn lại những gì đã học.
        </Text>
        <View style={styles.courseRow}>
          <Flag courseId={activeCourseId} size={20} />
          <Text style={styles.courseLabel} maxFontSizeMultiplier={1.3}>
            {pack.targetLanguage}
          </Text>
        </View>

        <Text style={styles.gamesHeading} maxFontSizeMultiplier={1.3}>
          🎮 Trò chơi
        </Text>
        {[
          {
            route: "/game-memory" as const,
            emoji: "🧠",
            title: "Ghép thẻ trí nhớ",
            desc: "Lật thẻ và ghép chữ với nghĩa của chúng",
            bg: colors.indigo,
            dark: colors.indigoDark,
          },
          {
            route: "/game-listen" as const,
            emoji: "🎧",
            title: "Nghe và chọn",
            desc: "Nghe phát âm rồi chọn nghĩa đúng, 10 câu mỗi ván",
            bg: colors.rose,
            dark: colors.roseDark,
          },
          {
            route: "/game-scramble" as const,
            emoji: "🧩",
            title: "Xếp câu cho đúng",
            desc: "Bấm các từ theo đúng thứ tự để ghép thành câu",
            bg: colors.skyDark,
            dark: "#0369a1",
          },
          {
            route: "/game-speed" as const,
            emoji: "⚡",
            title: "Đố nhanh 60 giây",
            desc: "Trả lời đúng càng nhiều càng tốt trong 60 giây",
            bg: colors.amber,
            dark: "#d97706",
          },
          {
            route: "/game-letters" as const,
            emoji: "🔤",
            title: "Đoán chữ bí mật",
            desc: "Nhìn hình và nghĩa, đoán từng chữ cái của từ",
            bg: colors.green,
            dark: colors.greenDark,
          },
        ].map((game) => (
          <Pressable
            key={game.route}
            onPress={() => router.push(game.route)}
            accessibilityRole="button"
            accessibilityLabel={`Chơi game ${game.title}`}
            style={({ pressed }) => [
              styles.gameCard,
              { backgroundColor: game.bg, borderBottomColor: game.dark },
              pressed && { opacity: 0.85, borderBottomWidth: 2 },
            ]}
          >
            <Text style={styles.gameEmoji}>{game.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameTitle} maxFontSizeMultiplier={1.3}>
                {game.title}
              </Text>
              <Text style={styles.gameDesc} maxFontSizeMultiplier={1.3}>
                {game.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>
        ))}

        <Card style={styles.cardGap}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="treasure-chest"
              size={24}
              color={colors.amber}
            />
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              Nhiệm vụ hôm nay
            </Text>
          </View>
          {quests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </Card>

        <Card style={styles.cardGap}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="brain" size={24} color={colors.indigo} />
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              Ôn tập ngắt quãng
            </Text>
          </View>
          <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
            {dueWords.length === 0
              ? "Chưa có từ cần ôn. Cứ học tiếp nhé!"
              : `${dueWords.length} từ đang chờ ôn tập.`}
          </Text>
          <DuoButton
            label="Ôn từ vựng"
            variant="primary"
            disabled={dueWords.length === 0}
            onPress={() => router.push("/lesson/srs")}
          />
        </Card>

        <Card style={styles.cardGap}>
          <View style={styles.cardHeader}>
            <Ionicons name="bandage" size={24} color={colors.rose} />
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              Lỗi sai
            </Text>
          </View>
          <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
            {courseProgress.mistakes.length === 0
              ? "Không có lỗi nào cần ôn. Giỏi lắm!"
              : `${courseProgress.mistakes.length} câu cần luyện lại.`}
          </Text>
          <DuoButton
            label="Luyện các câu sai"
            variant="primary"
            disabled={courseProgress.mistakes.length === 0}
            onPress={() => router.push("/lesson/mistakes")}
          />
        </Card>

        <Card style={styles.cardGap}>
          <View style={styles.cardHeader}>
            <Ionicons name="book" size={24} color={colors.green} />
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
              Từ đã học ({words.length})
            </Text>
          </View>
          {words.length === 0 ? (
            <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.3}>
              Các từ em đã học sẽ hiện ở đây cùng độ nhớ.
            </Text>
          ) : (
            words
              .sort((a, b) => (b.stat?.lastSeen ?? 0) - (a.stat?.lastSeen ?? 0))
              .map((word) => {
                const total = (word.stat?.correct ?? 0) + (word.stat?.wrong ?? 0);
                const strength =
                  total > 0 ? Math.min(100, Math.max(0, (word.stat!.correct / total) * 100)) : 0;
                const due = word.srs ? dueInDays(word.srs) : null;
                return (
                  <View key={word.target} style={styles.wordRow}>
                    <SpeakerButton text={word.target} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wordTarget} maxFontSizeMultiplier={1.3}>
                        {word.emoji} {word.target}
                      </Text>
                      <Text style={styles.wordNative} maxFontSizeMultiplier={1.3}>
                        {word.native}
                      </Text>
                      {due !== null && due === 0 ? (
                        <Text style={styles.dueBadge} maxFontSizeMultiplier={1.2}>
                          Cần ôn ngay
                        </Text>
                      ) : due !== null && due <= 3 ? (
                        <Text style={styles.dueSoon} maxFontSizeMultiplier={1.2}>
                          Ôn lại sau {due} ngày
                        </Text>
                      ) : null}
                    </View>
                    <ProgressBar
                      value={strength / 100}
                      height={10}
                      color={
                        strength >= 70
                          ? colors.green
                          : strength >= 40
                            ? colors.amber
                            : colors.rose
                      }
                      style={styles.strengthBar}
                      accessibilityLabel={`Độ nhớ của từ ${word.target}: ${Math.round(strength)}%`}
                    />
                  </View>
                );
              })
          )}
        </Card>
      </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function QuestRow({ quest }: { quest: Quest }) {
  const colors = useThemeColors();
  const styles = useStyles();
  const ratio =
    quest.target > 0 ? Math.min(1, Math.max(0, quest.value / quest.target)) : 0;
  return (
    <View style={styles.questRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.questLabelRow}>
          <Text
            style={[styles.questLabel, quest.done && { color: colors.textMuted }]}
            maxFontSizeMultiplier={1.3}
          >
            {quest.label}
          </Text>
          <Text style={styles.questCount} maxFontSizeMultiplier={1.1}>
            {quest.value}/{quest.target}
          </Text>
        </View>
        <ProgressBar
          value={ratio}
          height={12}
          color={quest.done ? colors.green : colors.amber}
          accessibilityLabel={`${quest.label}: ${quest.value} trên ${quest.target}`}
        />
      </View>
      <Ionicons
        name={quest.done ? "checkmark-circle" : "ellipse-outline"}
        size={28}
        color={quest.done ? colors.green : colors.neutral300}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 20, gap: 16, paddingBottom: 60 },
  heading: { fontSize: 26, fontWeight: "800", color: colors.neutral700 },
  subheading: { fontSize: 14, color: colors.textMuted, marginTop: -8 },
  gamesHeading: { fontSize: 20, fontWeight: "800", color: colors.neutral700, marginTop: 2 },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.xl,
    padding: 18,
    borderBottomWidth: 6,
    ...shadow.chunky,
  },
  gameCardIndigo: { backgroundColor: colors.indigo },
  gameCardRose: { backgroundColor: colors.rose },
  gameEmoji: { fontSize: 36 },
  gameTitle: { fontSize: 18, fontWeight: "800", color: colors.white },
  gameDesc: { fontSize: 13, color: colors.white, opacity: 0.9 },
  courseRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  courseLabel: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardGap: { gap: 12 },
  cardTitle: { fontSize: 19, fontWeight: "800", color: colors.neutral700 },
  cardSubtitle: { fontSize: 14, color: colors.textMuted },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  wordTarget: { fontSize: 16, fontWeight: "700", color: colors.text },
  wordNative: { fontSize: 13, color: colors.textMuted },
  dueBadge: { fontSize: 11, fontWeight: "700", color: colors.rose, marginTop: 2 },
  dueSoon: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  strengthBar: { width: 64 },
  questRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  questLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  questLabel: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  questCount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
  },
}));
