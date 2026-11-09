import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { router } from "expo-router";

import { DuoButton } from "@/components/duo-button";
import { Card } from "@/components/ui";
import { useProgress } from "@/lib/store";
import { useRewardsStore, effectiveSpinConfig } from "@/lib/rewardsStore";
import { useSpinConfigSync } from "@/lib/spinConfigSync";
import {
  SPIN_TIERS,
  budgetState,
  eligiblePrizesForTier,
  formatVnd,
  moneyWonInMonth,
  pickWeighted,
  type SpinPrize,
  type SpinTier,
} from "@/lib/spin";
import { makeThemedStyles, radius, spacing, useThemeColors } from "@/lib/theme";

/**
 * TRANG VÒNG QUAY MAY MẮN 🎡
 *
 * - Vé quay bé nhận khi hoàn thành bài học (thường = Dễ, hoàn hảo =
 *   Trung bình, xong chặng = thêm Khó) — lưu trong store `spinTickets`.
 * - Vòng chỉ chứa quà ĐANG HỢP LỆ của tầng (đang bật + còn hàng +
 *   còn ngân sách tiền mặt) — xem `eligiblePrizesForTier` ở spin.ts.
 * - Kết quả được chọn TRƯỚC bằng trọng số (hàm thuần `pickWeighted`);
 *   vòng quay chỉ là animation trình diễn tới đúng ô đó. Bấm "Nhận
 *   quà" mới áp dụng: quà ảo vào ví/bộ sưu tập ngay, quà thật vào
 *   Kho báu ở trạng thái "Chờ trao".
 */

const WHEEL_SIZE = 300;
const WHEEL_R = WHEEL_SIZE / 2;
const SECTOR_COLORS = [
  "#f59e0b",
  "#38bdf8",
  "#f472b6",
  "#34d399",
  "#a78bfa",
  "#fb7185",
  "#facc15",
  "#4ade80",
];

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: WHEEL_R + radius * Math.sin(rad),
    y: WHEEL_R - radius * Math.cos(rad),
  };
}

function sectorPath(startDeg: number, endDeg: number, radius: number) {
  const start = polar(startDeg, radius);
  const end = polar(endDeg, radius);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${WHEEL_R} ${WHEEL_R} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

type WheelSector = {
  prize: SpinPrize;
  start: number;
  span: number;
  center: number;
  color: string;
};

function buildSectors(prizes: SpinPrize[]): WheelSector[] {
  const total = prizes.reduce((sum, p) => sum + Math.max(0, p.weight), 0);
  let cursor = 0;
  return prizes.map((prize, index) => {
    const span = total > 0 ? (Math.max(0, prize.weight) / total) * 360 : 0;
    const sector = {
      prize,
      start: cursor,
      span,
      center: cursor + span / 2,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
    };
    cursor += span;
    return sector;
  });
}

export default function SpinScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  useSpinConfigSync();
  const config = useRewardsStore(effectiveSpinConfig);
  const tickets = useProgress((s) => s.spinTickets);
  const spinStock = useProgress((s) => s.spinStock);
  const spinHistory = useProgress((s) => s.spinHistory);
  const stars = useProgress((s) => s.stars);
  const applySpinWin = useProgress((s) => s.applySpinWin);

  const [tier, setTier] = useState<SpinTier>(() => {
    const t = useProgress.getState().spinTickets ?? { easy: 0, medium: 0, hard: 0 };
    return t.easy > 0 ? "easy" : t.medium > 0 ? "medium" : t.hard > 0 ? "hard" : "easy";
  });
  const [phase, setPhase] = useState<"idle" | "spinning" | "won" | "claimed">("idle");
  const [result, setResult] = useState<SpinPrize | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const [rotationRange, setRotationRange] = useState({ from: 0, to: 0 });

  const eligibilityCtx = useMemo(
    () => ({
      stockById: spinStock ?? {},
      moneyWonThisMonth: moneyWonInMonth(spinHistory ?? []),
      monthlyBudgetVnd: config.monthlyBudgetVnd,
    }),
    [spinStock, spinHistory, config.monthlyBudgetVnd]
  );
  const prizes = useMemo(
    () => eligiblePrizesForTier(config, tier, eligibilityCtx),
    [config, tier, eligibilityCtx]
  );
  const sectors = useMemo(() => buildSectors(prizes), [prizes]);
  const ticketCount = tickets?.[tier] ?? 0;
  const budget = budgetState(config, spinHistory ?? []);

  const wheelRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${rotationRange.from}deg`, `${rotationRange.to}deg`],
  });

  const startSpin = () => {
    if (phase === "spinning" || ticketCount <= 0 || sectors.length === 0) return;
    // Chọn kết quả TRƯỚC bằng trọng số thuần — animation chỉ trình diễn.
    const picked = pickWeighted(prizes);
    if (!picked) return;
    const sector = sectors.find((s) => s.prize.id === picked.id);
    if (!sector) return;
    const from = rotationRef.current;
    const align = (360 - (sector.center % 360)) % 360;
    const currentMod = ((from % 360) + 360) % 360;
    let delta = align - currentMod;
    if (delta < 0) delta += 360;
    const to = from + 5 * 360 + delta;
    setResult(picked);
    setPhase("spinning");
    setRotationRange({ from, to });
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      rotationRef.current = to % 360;
      setPhase("won");
    });
  };

  const claim = () => {
    if (!result) return;
    const id = applySpinWin(tier, result);
    if (!id) {
      setPhase("idle");
      return;
    }
    setPhase("claimed");
  };

  const switchTier = (next: SpinTier) => {
    if (phase === "spinning") return;
    setTier(next);
    setResult(null);
    setPhase("idle");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🎡 Vòng quay may mắn</Text>
      <Text style={styles.subtitle}>
        Học xong bài là có vé quay! Quà trúng sẽ vào Kho báu của bé.
      </Text>

      <View style={styles.tierRow}>
        {SPIN_TIERS.map((t) => {
          const active = tier === t.id;
          return (
            <View key={t.id} style={styles.tierTabWrap}>
              <DuoButton
                label={`${t.emoji} ${t.label}`}
                variant={active ? "primary" : "secondary"}
                onPress={() => switchTier(t.id)}
              />
              <Text style={styles.ticketBadge}>
                🎟️ {tickets?.[t.id] ?? 0} vé
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.wheelWrap}>
        <View style={styles.pointer} />
        <Animated.View style={{ transform: [{ rotate: wheelRotation }] }}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {sectors.map((sector) => {
              const labelPos = polar(sector.center, WHEEL_R * 0.62);
              return (
                <G key={sector.prize.id}>
                  <Path
                    d={sectorPath(sector.start, sector.start + sector.span, WHEEL_R - 4)}
                    fill={sector.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + 8}
                    fontSize={24}
                    textAnchor="middle"
                  >
                    {sector.prize.emoji}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={WHEEL_R} cy={WHEEL_R} r={34} fill="#ffffff" stroke="#e5e7eb" strokeWidth={2} />
            <SvgText x={WHEEL_R} y={WHEEL_R + 10} fontSize={26} textAnchor="middle">
              🐷
            </SvgText>
          </Svg>
        </Animated.View>
      </View>

      <View style={styles.prizeList}>
        {sectors.map((sector) => (
          <Text key={sector.prize.id} style={styles.prizeLine}>
            {sector.prize.emoji} {sector.prize.name}
          </Text>
        ))}
      </View>

      {phase === "idle" ? (
        ticketCount > 0 ? (
          <DuoButton label={`QUAY NGAY! (còn ${ticketCount} vé)`} variant="super" onPress={startSpin} />
        ) : (
          <Card style={styles.noteCard}>
            <Text style={styles.noteText}>
              Bé chưa có vé tầng này. Học xong một bài học để nhận vé nhé:
              bài thường → vé Dễ 🟢, bài không sai câu nào → vé Trung bình 🟡,
              hoàn thành một chặng → thêm vé Khó 🔴.
            </Text>
          </Card>
        )
      ) : null}

      {phase === "spinning" ? (
        <Text style={styles.spinningText}>Đang quay… chúc bé may mắn! 🍀</Text>
      ) : null}

      {phase === "won" && result ? (
        <Card style={styles.resultCard}>
          <Text style={styles.resultEmoji}>{result.emoji}</Text>
          <Text style={styles.resultTitle}>Bé trúng: {result.name}!</Text>
          {result.kind === "real" ? (
            <Text style={styles.noteText}>
              Đây là quà THẬT 🎁 — quà sẽ vào Kho báu ở trạng thái "Chờ trao",
              ba mẹ sẽ trao tận tay cho bé nhé.
            </Text>
          ) : null}
          <DuoButton label="Nhận quà 🎁" variant="super" onPress={claim} />
        </Card>
      ) : null}

      {phase === "claimed" && result ? (
        <Card style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>Đã nhận: {result.name}</Text>
          <Text style={styles.noteText}>
            {result.kind === "real"
              ? "Quà thật đang chờ ba mẹ trao trong Kho báu."
              : "Quà đã vào Kho báu của bé rồi!"}
          </Text>
          <View style={styles.claimActions}>
            {ticketCount > 0 ? (
              <DuoButton
                label="Quay tiếp 🎡"
                variant="primary"
                onPress={() => {
                  setResult(null);
                  setPhase("idle");
                }}
              />
            ) : null}
            <DuoButton
              label="Xem Kho báu 🧰"
              variant="secondary"
              onPress={() => router.push("/treasure")}
            />
          </View>
        </Card>
      ) : null}

      <Text style={styles.budgetNote}>
        Quà tiền tháng này: đã trúng {formatVnd(budget.spent)} / ngân sách{" "}
        {formatVnd(budget.budget)}
        {budget.exhausted ? " — hết ngân sách nên quà tiền tạm rời vòng quay." : "."}
      </Text>
      <Text style={styles.moneyNote}>Ví sao của bé: ⭐ {stars ?? 0} sao</Text>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 26, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  tierRow: { flexDirection: "row", gap: spacing.sm },
  tierTabWrap: { flex: 1, alignItems: "center", gap: 4 },
  ticketBadge: { fontSize: 13, fontWeight: "700", color: colors.text },
  wheelWrap: { alignItems: "center", marginVertical: spacing.sm },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#dc2626",
    zIndex: 2,
    marginBottom: -8,
  },
  prizeList: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  prizeLine: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  noteCard: { gap: spacing.sm },
  noteText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  spinningText: { textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.text },
  resultCard: { alignItems: "center", gap: spacing.sm },
  resultEmoji: { fontSize: 48 },
  resultTitle: { fontSize: 18, fontWeight: "900", color: colors.text, textAlign: "center" },
  claimActions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  budgetNote: { fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 17 },
  moneyNote: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  })
);
