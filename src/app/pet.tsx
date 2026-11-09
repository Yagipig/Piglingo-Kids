import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { Card, ProgressBar, StatChip } from "@/components/ui";
import { catalog, useCourseContent } from "@/lib/content";
import { KINGDOMS, kingdomForCourse } from "@/lib/kingdoms";
import {
  LEGENDARY_PET,
  RARE_PET,
  allAccessoriesFor,
  completedStageCount,
  isAccessoryUnlocked,
  legendaryUnlocked,
  petForCourse,
  petLevelFor,
} from "@/lib/pets";
import { activeToday, useProgress } from "@/lib/store";
import {
  kingdomColorTokens,
  layout,
  makeThemedStyles,
  radius,
  shadow,
  spacing,
  typography,
} from "@/lib/theme";

const CATALOG_TOTALS = Object.fromEntries(
  catalog.courses.map((c) => [c.id, c.lessonCount])
);

/** Câu vui khi hôm nay bé đã học — pet lúc nào cũng tích cực. */
const HAPPY_TODAY_LINES = [
  "Hôm nay mình vui lắm vì được học cùng bé! 🌟",
  "Bé học chăm quá, mình tự hào ghê! 🎉",
  "Một ngày học thật vui — mình lúc nào cũng thích đi cùng bé!",
];

/**
 * TRANG THÚ CƯNG (Đợt B+C): mỗi thế giới một thú để sưu tập — xem cấp
 * và điểm phát triển, cho ăn bằng thức ăn kiếm từ rương chặng, mặc
 * phụ kiện mở theo số chặng đã xong, xem ví sao/chìa khóa, và khối
 * Rồng Huyền Thoại. TRIẾT LÝ BẤT BIẾN: học là cách nuôi pet; pet
 * KHÔNG BAO GIỜ đói, buồn hay chết khi bé nghỉ học — ở đây chỉ có
 * trạng thái vui và chờ đợi tích cực.
 */
export default function PetScreen() {
  const styles = useStyles();
  const progress = useProgress();
  const [courseId, setCourseId] = useState(progress.activeCourseId);
  const [fedNote, setFedNote] = useState<string | null>(null);

  const content = useCourseContent(courseId);
  const kingdom = kingdomForCourse(courseId);
  const tokens = kingdomColorTokens(courseId);
  const pet = petForCourse(courseId);

  const growth = progress.petGrowth?.[courseId] ?? 0;
  const level = petLevelFor(growth);
  const courseProgress = progress.courses?.[courseId];
  const doneStages = useMemo(
    () =>
      completedStageCount(
        content.allLessons,
        courseProgress?.completedLessons ?? {}
      ),
    [content.allLessons, courseProgress?.completedLessons]
  );
  const totalStages = useMemo(
    () => Math.ceil(content.allLessons.length / 6),
    [content.allLessons.length]
  );
  const equipped = progress.equippedAccessories?.[courseId] ?? [];
  // Tủ phụ kiện gồm cả 6 món theo chặng và các món CHỈ mở bằng vòng quay.
  const accessories = allAccessoriesFor(courseId);
  const spinUnlockedIds = progress.spinUnlockedAccessories?.[courseId] ?? [];
  const food = progress.petFood ?? 0;
  const learnedToday = activeToday(progress);
  const dayIndex =
    Math.floor(Date.now() / 86_400_000) % HAPPY_TODAY_LINES.length;
  const legendary = legendaryUnlocked(progress.courses ?? {}, CATALOG_TOTALS);
  const dragonFollowing = progress.activeCompanion === "legendary" && legendary;
  const hasPhoenix = (progress.rarePets ?? []).includes(RARE_PET.id);
  const phoenixFollowing = progress.activeCompanion === "phuong-hoang" && hasPhoenix;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  if (!pet || !kingdom || !tokens) return null;

  const moodLine = learnedToday
    ? HAPPY_TODAY_LINES[dayIndex]
    : `${pet.name} đang chờ bé tới học cùng nhé!`;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            🐾 Thú cưng của bé
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            Học là cách nuôi thú cưng — học càng vui, thú càng lớn!
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* Ví chung */}
          <View style={styles.chipRow}>
            <StatChip emoji="⭐" value={String(progress.stars ?? 0)} label="Sao" style={{ flex: 1 }} />
            <StatChip emoji="🔑" value={String(progress.unlockKeys ?? 0)} label="Chìa khóa" style={{ flex: 1 }} />
            <StatChip emoji="🍎" value={String(food)} label="Thức ăn" style={{ flex: 1 }} />
          </View>
          <DuoButton
            label="🧰 Mở Kho báu của bé"
            variant="white"
            onPress={() => router.push("/treasure")}
          />

          {/* Chọn thế giới */}
          <View style={styles.switchRow}>
            {KINGDOMS.map((item) => {
              const active = item.courseId === courseId;
              const itemPet = petForCourse(item.courseId);
              return (
                <Pressable
                  key={item.courseId}
                  onPress={() => {
                    setCourseId(item.courseId);
                    setFedNote(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem thú cưng của ${item.kingdomName}`}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.switchChip,
                    { borderColor: item.palette.primary },
                    active && { backgroundColor: item.palette.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.switchEmoji}>{itemPet?.emoji ?? item.motif[0]}</Text>
                  <Text
                    style={[
                      styles.switchLabel,
                      { color: active ? item.palette.onPrimary : item.palette.deep },
                    ]}
                    maxFontSizeMultiplier={1.1}
                    numberOfLines={1}
                  >
                    {item.shortName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {dragonFollowing ? (
            <Card accentColor="#b45309">
              <Text style={styles.noteText} maxFontSizeMultiplier={1.25}>
                🐉 Hiện Rồng Huyền Thoại đang đồng hành cùng bé trong mọi bài
                học. Các bạn thú thế giới vẫn ở đây chờ bé chăm sóc nhé!
              </Text>
              <DuoButton
                label="Quay về thú thế giới đồng hành"
                variant="white"
                onPress={() => progress.setActiveCompanion("world")}
              />
            </Card>
          ) : null}

          {phoenixFollowing ? (
            <Card accentColor="#db2777">
              <Text style={styles.noteText} maxFontSizeMultiplier={1.25}>
                {RARE_PET.emoji} Hiện {RARE_PET.name} đang đồng hành cùng bé
                trong mọi bài học. Các bạn thú thế giới vẫn ở đây chờ bé
                chăm sóc nhé!
              </Text>
              <DuoButton
                label="Quay về thú thế giới đồng hành"
                variant="white"
                onPress={() => progress.setActiveCompanion("world")}
              />
            </Card>
          ) : null}

          {/* Thẻ thú chính */}
          <Card accentColor={tokens.primary}>
            <View style={styles.petStage}>
              <Text style={styles.petEmoji}>{pet.emoji}</Text>
              {equipped.length > 0 ? (
                <Text style={styles.petAccessoryRow} maxFontSizeMultiplier={1.2}>
                  {equipped
                    .map(
                      (id) =>
                        accessories.find((a) => a.id === id)?.emoji ?? ""
                    )
                    .join(" ")}
                </Text>
              ) : null}
              <Text style={styles.petName} maxFontSizeMultiplier={1.25}>
                {pet.name} · {kingdom.kingdomName}
              </Text>
              <Text style={styles.petMood} maxFontSizeMultiplier={1.25}>
                {moodLine}
              </Text>
            </View>

            <View style={styles.levelRow}>
              <Text style={styles.levelLabel} maxFontSizeMultiplier={1.2}>
                Cấp {level.level}
              </Text>
              <Text style={styles.levelDetail} maxFontSizeMultiplier={1.2}>
                {growth} điểm phát triển
                {level.isMax
                  ? " — cấp cao nhất!"
                  : ` · còn ${level.toNext} điểm nữa là lên cấp ${level.level + 1}`}
              </Text>
            </View>
            <ProgressBar
              value={level.progress01}
              color={tokens.primary}
              height={11}
              accessibilityLabel={`Tiến độ cấp ${level.level} của ${pet.name}: ${Math.round(level.progress01 * 100)}%`}
            />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
              Học xong một bài: +10 điểm (bài hoàn hảo +15). Cho ăn: +8 điểm.
              Đã xong {doneStages}/{totalStages} chặng ở thế giới này.
            </Text>
          </Card>

          {/* Skill */}
          <Card>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
              ✨ Kỹ năng của {pet.name}: {pet.skillName} {pet.emoji}
            </Text>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.25}>
              {pet.skillBlurb}
            </Text>
            <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
              Trong bài học {kingdom.targetLanguage}, {pet.name} sẽ ngồi ở góc
              màn hình đồng hành cùng bé.
            </Text>
          </Card>

          {/* Cho ăn */}
          <Card>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
              🍎 Cho {pet.name} ăn
            </Text>
            <Text style={styles.bodyText} maxFontSizeMultiplier={1.25}>
              Đang có {food} phần thức ăn. Mỗi phần cho {pet.name} thêm 8 điểm
              phát triển.
            </Text>
            <DuoButton
              label={food > 0 ? `Cho ${pet.name} ăn (+8 điểm)` : "Chưa có thức ăn"}
              disabled={food <= 0}
              onPress={() => {
                progress.feedPet(courseId);
                setFedNote(
                  `${pet.name} ăn ngon lành và vui hẳn lên! +8 điểm phát triển 🎉`
                );
              }}
            />
            {food <= 0 ? (
              <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
                Cách kiếm thức ăn: học xong một chặng trên bản đồ đường đi rồi
                mở rương kho báu ở cuối chặng nhé!
              </Text>
            ) : null}
            {fedNote ? (
              <Text style={styles.fedNote} maxFontSizeMultiplier={1.25}>
                {fedNote}
              </Text>
            ) : null}
          </Card>

          {/* Tủ phụ kiện */}
          <Card>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
              🎀 Tủ phụ kiện của {pet.name}
            </Text>
            <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
              Học xong càng nhiều chặng ở {kingdom.kingdomName} càng mở được
              nhiều món. Chạm vào món đã mở để mặc vào / cởi ra.
            </Text>
            <View style={styles.accessoryGrid}>
              {accessories.map((item) => {
                // Món vòng quay mở VĨNH VIỄN khi trúng — không theo chặng.
                const fromSpin = spinUnlockedIds.includes(item.id);
                const unlocked = isAccessoryUnlocked(item, doneStages) || fromSpin;
                const isEquipped = equipped.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    disabled={!unlocked}
                    onPress={() => progress.toggleAccessory(courseId, item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      unlocked
                        ? `${item.name} — ${isEquipped ? "đang mặc, chạm để cởi ra" : "chạm để mặc vào"}`
                        : item.source === "spin"
                          ? `${item.name} — chưa mở, trúng ở vòng quay may mắn để mở`
                          : `${item.name} — chưa mở, cần xong ${item.unlockStage} chặng`
                    }
                    accessibilityState={{ disabled: !unlocked, selected: isEquipped }}
                    style={({ pressed }) => [
                      styles.accessoryCell,
                      isEquipped && {
                        borderColor: tokens.primary,
                        backgroundColor: tokens.soft,
                      },
                      !unlocked && styles.accessoryCellLocked,
                      pressed && unlocked && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.accessoryEmoji}>
                      {unlocked ? item.emoji : "🔒"}
                    </Text>
                    <Text style={styles.accessoryName} maxFontSizeMultiplier={1.15}>
                      {item.name}
                    </Text>
                    <Text style={styles.accessoryMeta} maxFontSizeMultiplier={1.15}>
                      {unlocked
                        ? isEquipped
                          ? "Đang mặc ✓"
                          : fromSpin
                            ? "Đã mở ở vòng quay 🎡"
                            : "Chạm để mặc"
                        : item.source === "spin"
                          ? "Trúng ở vòng quay 🎡 để mở"
                          : `Xong ${item.unlockStage} chặng để mở (${doneStages}/${item.unlockStage})`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Rồng Huyền Thoại */}
          <Card accentColor="#b45309">
            <View style={styles.dragonHead}>
              <Text style={styles.dragonEmoji}>{LEGENDARY_PET.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
                  {LEGENDARY_PET.name}
                </Text>
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.25}>
                  Kỹ năng: {LEGENDARY_PET.skillName} — {LEGENDARY_PET.skillBlurb}
                </Text>
              </View>
            </View>
            {legendary ? (
              dragonFollowing ? (
                <DuoButton
                  label="🐉 Đang đồng hành — chạm để quay về thú thế giới"
                  variant="white"
                  onPress={() => progress.setActiveCompanion("world")}
                />
              ) : (
                <DuoButton
                  label="Chọn Rồng làm bạn đồng hành"
                  onPress={() => progress.setActiveCompanion("legendary")}
                />
              )
            ) : (
              <>
                <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
                  Điều kiện mở: hoàn thành trọn vẹn một thế giới (học xong
                  100% số bài của một ngôn ngữ). Tiến độ hiện tại:
                </Text>
                {KINGDOMS.map((item) => {
                  const totalC = CATALOG_TOTALS[item.courseId] ?? 0;
                  const doneC = Object.keys(
                    progress.courses?.[item.courseId]?.completedLessons ?? {}
                  ).length;
                  return (
                    <Text
                      key={item.courseId}
                      style={styles.progressLine}
                      maxFontSizeMultiplier={1.25}
                    >
                      {item.companion} {item.kingdomName}: {doneC}/{totalC} bài
                    </Text>
                  );
                })}
              </>
            )}
          </Card>

          {/* Pet hiếm Phượng Hoàng Cầu Vồng — chỉ có ở vòng quay may mắn tầng Khó */}
          <Card accentColor="#db2777">
            <View style={styles.dragonHead}>
              <Text style={styles.dragonEmoji}>{RARE_PET.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.25}>
                  {RARE_PET.name} — Pet hiếm
                </Text>
                <Text style={styles.bodyText} maxFontSizeMultiplier={1.25}>
                  {RARE_PET.skillBlurb}
                </Text>
              </View>
            </View>
            {hasPhoenix ? (
              phoenixFollowing ? (
                <DuoButton
                  label={`${RARE_PET.emoji} Đang đồng hành — chạm để quay về thú thế giới`}
                  variant="white"
                  onPress={() => progress.setActiveCompanion("world")}
                />
              ) : (
                <DuoButton
                  label={`Chọn ${RARE_PET.name} làm bạn đồng hành`}
                  onPress={() => progress.setActiveCompanion("phuong-hoang")}
                />
              )
            ) : (
              <>
                <Text style={styles.hintText} maxFontSizeMultiplier={1.25}>
                  Cách có {RARE_PET.name}: hoàn thành một chặng trên bản đồ
                  để nhận vé Khó 🔴, rồi quay vòng quay may mắn và trúng ô
                  Pet hiếm nhé!
                </Text>
                <DuoButton
                  label="Đến vòng quay may mắn 🎡"
                  variant="white"
                  onPress={() => router.push("/spin")}
                />
              </>
            )}
          </Card>

          <Text style={styles.footerNote} maxFontSizeMultiplier={1.25}>
            Thú cưng chỉ vui và khích lệ bé học — không có chuyện thú bị đói
            hay buồn khi bé nghỉ học đâu nhé. 💛
          </Text>
        </View>
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
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },
    backIcon: { fontSize: 22, fontWeight: "900", color: colors.neutral700 },
    title: {
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
    },
    subtitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    body: { padding: spacing.lg, paddingBottom: 40 },
    column: {
      width: "100%",
      maxWidth: layout.contentMaxWidth,
      alignSelf: "center",
      gap: spacing.md,
    },
    chipRow: { flexDirection: "row", gap: spacing.sm },
    switchRow: { flexDirection: "row", gap: 8 },
    switchChip: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
    },
    switchEmoji: { fontSize: 17 },
    switchLabel: { fontSize: 13, fontWeight: "800" },
    noteText: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    petStage: { alignItems: "center", gap: 4, paddingVertical: spacing.sm },
    petEmoji: { fontSize: 84 },
    petAccessoryRow: { fontSize: 24 },
    petName: {
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      fontWeight: "900",
      color: colors.neutral700,
      textAlign: "center",
    },
    petMood: {
      fontSize: 14.5,
      fontWeight: "700",
      color: colors.correctText,
      textAlign: "center",
    },
    levelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginTop: spacing.sm,
    },
    levelLabel: { fontSize: 17, fontWeight: "900", color: colors.neutral700 },
    levelDetail: { fontSize: 13, fontWeight: "700", color: colors.textMuted, flex: 1 },
    cardTitle: {
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
      fontWeight: "800",
      color: colors.neutral700,
      marginBottom: spacing.xs,
    },
    bodyText: { fontSize: 14.5, fontWeight: "600", color: colors.text, lineHeight: 21 },
    hintText: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted, marginTop: spacing.xs },
    fedNote: { fontSize: 14, fontWeight: "800", color: colors.correctText, marginTop: spacing.xs },
    accessoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
    accessoryCell: {
      width: "31%",
      minHeight: 118,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.neutral200,
      borderRadius: radius.lg,
      padding: spacing.sm,
    },
    accessoryCellLocked: { opacity: 0.75, backgroundColor: colors.neutral100 },
    accessoryEmoji: { fontSize: 30 },
    accessoryName: { fontSize: 12.5, fontWeight: "800", color: colors.neutral700, textAlign: "center" },
    accessoryMeta: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textAlign: "center" },
    dragonHead: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.sm },
    dragonEmoji: { fontSize: 56 },
    progressLine: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginTop: 3 },
    footerNote: {
      fontSize: 12.5,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
    },
  })
);
