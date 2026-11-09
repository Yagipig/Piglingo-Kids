import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { DuoButton } from "@/components/duo-button";
import { Card, StatChip } from "@/components/ui";
import { useProgress } from "@/lib/store";
import { RARE_PET } from "@/lib/pets";
import {
  SPIN_STICKERS,
  formatVnd,
  pendingRealEntries,
  spinTierLabel,
  type SpinHistoryEntry,
} from "@/lib/spin";
import { makeThemedStyles, radius, spacing, useThemeColors } from "@/lib/theme";

/**
 * TRANG KHO BÁU 🧰 — mọi thứ bé gom được khi học + quay vòng quay:
 * ví (⭐ sao / 🔑 chìa khóa / 🍎 thức ăn), vé quay đang có,
 * bộ sưu tập sticker, pet hiếm, quà THẬT đang chờ ba mẹ trao (hiện
 * ảnh nếu có) và đã nhận, cùng lịch sử quay gần đây.
 */

function RealPrizeRow({ entry }: { entry: SpinHistoryEntry }) {
  const styles = useStyles();
  return (
    <View style={styles.realRow}>
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.realImage} />
      ) : (
        <Text style={styles.realEmoji}>{entry.prizeEmoji}</Text>
      )}
      <View style={styles.realInfo}>
        <Text style={styles.realName}>{entry.prizeName}</Text>
        <Text style={styles.realMeta}>
          Trúng ngày {new Date(entry.at).toLocaleDateString("vi-VN")} · vòng{" "}
          {spinTierLabel(entry.tier)}
          {entry.cash && entry.amount > 0 ? ` · ${formatVnd(entry.amount)}` : ""}
        </Text>
      </View>
      <Text
        style={[
          styles.realStatus,
          entry.realStatus === "given" ? styles.realGiven : styles.realPending,
        ]}
      >
        {entry.realStatus === "given" ? "✅ Đã nhận" : "⏳ Chờ trao"}
      </Text>
    </View>
  );
}

export default function TreasureScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const stars = useProgress((s) => s.stars);
  const unlockKeys = useProgress((s) => s.unlockKeys);
  const petFood = useProgress((s) => s.petFood);
  const tickets = useProgress((s) => s.spinTickets);
  const stickers = useProgress((s) => s.stickers);
  const rarePets = useProgress((s) => s.rarePets);
  const spinHistory = useProgress((s) => s.spinHistory);

  const history = spinHistory ?? [];
  const pending = pendingRealEntries(history);
  const given = history.filter(
    (entry) => entry.kind === "real" && entry.realStatus === "given"
  );
  const totalTickets =
    (tickets?.easy ?? 0) + (tickets?.medium ?? 0) + (tickets?.hard ?? 0);
  const ownedStickers = new Set(stickers ?? []);
  const hasPhoenix = (rarePets ?? []).includes(RARE_PET.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🧰 Kho báu của bé</Text>
      <Text style={styles.subtitle}>
        Mọi phần quà bé gom được khi học bài và quay vòng quay may mắn đều ở đây.
      </Text>

      <View style={styles.walletRow}>
        <StatChip emoji="⭐" value={`${stars ?? 0}`} label="Sao" />
        <StatChip emoji="🔑" value={`${unlockKeys ?? 0}`} label="Chìa khóa" />
        <StatChip emoji="🍎" value={`${petFood ?? 0}`} label="Thức ăn" />
      </View>

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>🎟️ Vé quay may mắn</Text>
        <Text style={styles.bodyText}>
          Dễ 🟢: {tickets?.easy ?? 0} vé · Trung bình 🟡: {tickets?.medium ?? 0} vé ·
          Khó 🔴: {tickets?.hard ?? 0} vé
        </Text>
        <DuoButton
          label={totalTickets > 0 ? `Đi quay ngay (${totalTickets} vé) 🎡` : "Tìm hiểu vòng quay 🎡"}
          variant="super"
          onPress={() => router.push("/spin")}
        />
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>🌟 Bộ sưu tập sticker</Text>
        <View style={styles.stickerGrid}>
          {SPIN_STICKERS.map((sticker) => {
            const owned = ownedStickers.has(sticker.id);
            return (
              <View
                key={sticker.id}
                style={[styles.stickerCell, !owned && styles.stickerLocked]}
              >
                <Text style={styles.stickerEmoji}>{owned ? sticker.emoji : "❔"}</Text>
                <Text style={styles.stickerName}>
                  {owned ? sticker.name : "Chưa có"}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.bodyText}>
          Đã sưu tập {ownedStickers.size}/{SPIN_STICKERS.length} sticker. Quay
          trúng ô "Sticker bất ngờ" ở vòng Dễ để mở sticker mới nhé!
        </Text>
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>{RARE_PET.emoji} Pet hiếm</Text>
        {hasPhoenix ? (
          <>
            <Text style={styles.bodyText}>
              {RARE_PET.emoji} {RARE_PET.name} — {RARE_PET.skillBlurb}
            </Text>
            <DuoButton
              label="Đến trang Thú cưng 🐾"
              variant="secondary"
              onPress={() => router.push("/pet")}
            />
          </>
        ) : (
          <Text style={styles.bodyText}>
            Chưa có pet hiếm nào. Hoàn thành chặng để nhận vé Khó và quay trúng{" "}
            {RARE_PET.emoji} {RARE_PET.name} nhé!
          </Text>
        )}
      </Card>

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>🎁 Quà thật đang chờ ba mẹ trao ({pending.length})</Text>
        {pending.length === 0 ? (
          <Text style={styles.bodyText}>
            Chưa có quà thật nào đang chờ. Quà tiền và quà thật ở vòng Trung
            bình/Khó khi trúng sẽ hiện ở đây.
          </Text>
        ) : (
          pending.map((entry) => <RealPrizeRow key={entry.id} entry={entry} />)
        )}
      </Card>

      {given.length > 0 ? (
        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>✅ Quà thật đã nhận ({given.length})</Text>
          {given.map((entry) => (
            <RealPrizeRow key={entry.id} entry={entry} />
          ))}
        </Card>
      ) : null}

      <Card style={styles.cardGap}>
        <Text style={styles.cardTitle}>🕘 Lịch sử quay gần đây</Text>
        {history.length === 0 ? (
          <Text style={styles.bodyText}>
            Bé chưa quay lần nào. Học xong một bài để nhận vé đầu tiên nhé!
          </Text>
        ) : (
          history.slice(0, 15).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyEmoji}>{entry.prizeEmoji}</Text>
              <View style={styles.realInfo}>
                <Text style={styles.historyName}>{entry.prizeName}</Text>
                <Text style={styles.realMeta}>
                  {new Date(entry.at).toLocaleString("vi-VN")} · vòng{" "}
                  {spinTierLabel(entry.tier)}
                  {entry.kind === "real"
                    ? entry.realStatus === "given"
                      ? " · đã trao"
                      : " · chờ trao"
                    : ""}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 26, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  walletRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  cardGap: { gap: spacing.sm },
  cardTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  bodyText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stickerCell: {
    width: "30%",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  stickerLocked: { opacity: 0.55 },
  stickerEmoji: { fontSize: 30 },
  stickerName: { fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" },
  realRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  realImage: { width: 52, height: 52, borderRadius: radius.sm },
  realEmoji: { fontSize: 34, width: 52, textAlign: "center" },
  realInfo: { flex: 1 },
  realName: { fontSize: 14, fontWeight: "800", color: colors.text },
  realMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  realStatus: { fontSize: 12, fontWeight: "900" },
  realPending: { color: "#b45309" },
  realGiven: { color: "#15803d" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  historyEmoji: { fontSize: 24, width: 36, textAlign: "center" },
  historyName: { fontSize: 14, fontWeight: "700", color: colors.text },
  })
);
