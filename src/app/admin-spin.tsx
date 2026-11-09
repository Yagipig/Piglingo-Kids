import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";

import { DuoButton } from "@/components/duo-button";
import { Card } from "@/components/ui";
import { useAuth } from "@/features/supabase/AuthContext";
import { isSupabaseEnabled } from "@/features/supabase/client";
import { isAdminEmail } from "@/lib/unlock";
import { useProgress } from "@/lib/store";
import { effectiveSpinConfig, useRewardsStore } from "@/lib/rewardsStore";
import { publishSpinConfig, refreshSpinConfigCache } from "@/lib/spinConfigSync";
import {
  SPIN_ACCESSORY_GROUPS,
  type SpinAccessoryGroup,
} from "@/lib/pets";
import {
  SPIN_PRIZE_KINDS,
  SPIN_TIERS,
  budgetState,
  createSpinId,
  formatVnd,
  moneyWonInMonth,
  pendingRealEntries,
  prizeExclusionReason,
  spinTierLabel,
  type SpinPrize,
  type SpinPrizeKind,
  type SpinTier,
} from "@/lib/spin";
import { makeThemedStyles, radius, spacing, useThemeColors } from "@/lib/theme";

/**
 * TRANG ADMIN VÒNG QUAY — chỉ tài khoản admin (cùng cơ chế với
 * admin-rewards: cổng kiểm tra ở đây chỉ là giao diện; quyền ghi thật
 * nằm ở RLS của app_config trên Supabase).
 *
 * Admin chỉnh: danh sách phần thưởng từng tầng (tên/loại/giá trị/trọng
 * số/tồn kho/ảnh quà thật/bật-tắt), NGÂN SÁCH tiền mặt mỗi tháng, xem
 * LỊCH SỬ bé đã quay trên máy này và XÁC NHẬN ĐÃ TRAO quà thật.
 * Cấu hình công bố qua app_config key "spin_config" — mọi máy tải về
 * khi mở app. Quà hết tồn kho hoặc hết ngân sách tháng TỰ ĐỘNG rời
 * khỏi vòng quay (hàm thuần isPrizeEligible trong spin.ts).
 */

function parseNonNegative(text: string): number | null {
  const cleaned = text.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export default function AdminSpinScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const { user, isLoading } = useAuth();
  const admin = isAdminEmail(user?.email);
  const effectiveConfig = useRewardsStore(effectiveSpinConfig);
  const spinAdminDraft = useRewardsStore((s) => s.spinAdminDraft);
  const setSpinAdminDraft = useRewardsStore((s) => s.setSpinAdminDraft);
  const setSpinConfigCache = useRewardsStore((s) => s.setSpinConfigCache);
  const spinHistory = useProgress((s) => s.spinHistory);
  const spinStock = useProgress((s) => s.spinStock);
  const markSpinPrizeGiven = useProgress((s) => s.markSpinPrizeGiven);
  const setSpinStockRemaining = useProgress((s) => s.setSpinStockRemaining);

  const draft = spinAdminDraft ?? effectiveConfig;

  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [tier, setTier] = useState<SpinTier>("easy");
  const [kind, setKind] = useState<SpinPrizeKind>("xp");
  const [amountText, setAmountText] = useState("50");
  const [weightText, setWeightText] = useState("10");
  const [stockText, setStockText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cash, setCash] = useState(false);
  const [accessoryGroup, setAccessoryGroup] = useState<SpinAccessoryGroup>("mu-kinh");
  const [budgetText, setBudgetText] = useState("");

  useEffect(() => {
    if (admin) void refreshSpinConfigCache();
  }, [admin]);

  useEffect(() => {
    if (admin && !spinAdminDraft) {
      setSpinAdminDraft(effectiveConfig);
    }
  }, [admin, spinAdminDraft, effectiveConfig, setSpinAdminDraft]);

  useEffect(() => {
    setBudgetText(String(draft.monthlyBudgetVnd));
    // Chỉ đồng bộ ô ngân sách khi đổi nguồn nháp/cấu hình, không ghi đè lúc gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinAdminDraft == null]);

  const history = spinHistory ?? [];
  const budget = useMemo(
    () => budgetState(draft, history),
    [draft, history]
  );
  const eligibilityCtx = useMemo(
    () => ({
      stockById: spinStock ?? {},
      moneyWonThisMonth: moneyWonInMonth(history),
      monthlyBudgetVnd: draft.monthlyBudgetVnd,
    }),
    [spinStock, history, draft.monthlyBudgetVnd]
  );
  const pending = pendingRealEntries(history);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.muted}>Đang kiểm tra tài khoản…</Text>
      </View>
    );
  }
  if (!admin) {
    return <Redirect href="/" />;
  }

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmoji("🎁");
    setTier("easy");
    setKind("xp");
    setAmountText("50");
    setWeightText("10");
    setStockText("");
    setImageUrl("");
    setCash(false);
    setAccessoryGroup("mu-kinh");
  };

  const startEdit = (prize: SpinPrize) => {
    setEditingId(prize.id);
    setName(prize.name);
    setEmoji(prize.emoji);
    setTier(prize.tier);
    setKind(prize.kind);
    setAmountText(String(prize.amount));
    setWeightText(String(prize.weight));
    setStockText(prize.stock == null ? "" : String(prize.stock));
    setImageUrl(prize.imageUrl ?? "");
    setCash(prize.cash);
    setAccessoryGroup(prize.accessoryGroup ?? "mu-kinh");
    setMessage(null);
  };

  const savePrize = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("Hãy nhập tên phần thưởng.");
      return;
    }
    const amount = parseNonNegative(amountText) ?? 0;
    const weight = parseNonNegative(weightText) ?? 0;
    const stock = stockText.trim() === "" ? null : parseNonNegative(stockText);
    const prize: SpinPrize = {
      id: editingId ?? createSpinId("prize"),
      tier,
      kind,
      name: trimmedName,
      emoji: emoji.trim() || "🎁",
      amount,
      weight,
      stock,
      enabled:
        draft.prizes.find((p) => p.id === editingId)?.enabled ?? true,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
      cash: kind === "real" ? cash : false,
      accessoryGroup: kind === "accessory" ? accessoryGroup : null,
      stickerId: null,
    };
    const prizes = editingId
      ? draft.prizes.map((p) => (p.id === editingId ? prize : p))
      : [...draft.prizes, prize];
    setSpinAdminDraft({ ...draft, prizes });
    // Tồn kho trên MÁY NÀY bám theo số admin vừa đặt (máy khác nhận
    // qua cấu hình đã công bố khi bé quay trúng trên máy đó).
    if (stock != null) setSpinStockRemaining(prize.id, stock);
    setMessage(
      editingId
        ? "Đã cập nhật phần thưởng trong bản nháp. Bấm Công bố để áp dụng."
        : "Đã thêm phần thưởng vào bản nháp. Bấm Công bố để áp dụng."
    );
    resetForm();
  };

  const toggleEnabled = (prize: SpinPrize) => {
    setSpinAdminDraft({
      ...draft,
      prizes: draft.prizes.map((p) =>
        p.id === prize.id ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  const deletePrize = (prize: SpinPrize) => {
    Alert.alert(
      "Xóa phần thưởng?",
      `Xóa "${prize.name}" khỏi vòng quay tầng ${spinTierLabel(prize.tier)}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setSpinAdminDraft({
              ...draft,
              prizes: draft.prizes.filter((p) => p.id !== prize.id),
            });
            if (editingId === prize.id) resetForm();
          },
        },
      ]
    );
  };

  const saveBudget = () => {
    const budgetValue = parseNonNegative(budgetText);
    if (budgetValue == null) {
      setMessage("Ngân sách phải là số tiền hợp lệ (đ).");
      return;
    }
    setSpinAdminDraft({ ...draft, monthlyBudgetVnd: budgetValue });
    setMessage("Đã lưu ngân sách vào bản nháp. Bấm Công bố để áp dụng.");
  };

  const confirmGiven = (entryId: string, prizeName: string) => {
    Alert.alert(
      "Xác nhận đã trao quà?",
      `Đánh dấu "${prizeName}" là ĐÃ TRAO tận tay cho bé? Việc này ghi nhận ngày trao và không tự hoàn tác.`,
      [
        { text: "Chưa trao", style: "cancel" },
        {
          text: "Đã trao ✅",
          onPress: () => markSpinPrizeGiven(entryId),
        },
      ]
    );
  };

  const publish = async () => {
    // Áp tồn kho của bản nháp lên máy này trước khi công bố.
    for (const prize of draft.prizes) {
      if (prize.stock != null) setSpinStockRemaining(prize.id, prize.stock);
    }
    if (!isSupabaseEnabled) {
      setSpinConfigCache(draft, "admin-local");
      setSpinAdminDraft(null);
      setMessage(
        "Đã áp dụng cấu hình vòng quay trên MÁY NÀY (Supabase đang tắt nên chưa đồng bộ sang máy khác)."
      );
      return;
    }
    setPublishing(true);
    try {
      await publishSpinConfig(draft, user?.email);
      setSpinConfigCache(draft, "admin-local");
      setSpinAdminDraft(null);
      setMessage(
        "Đã công bố cấu hình vòng quay cho toàn bộ app. Các máy khác sẽ tải khi mở app."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} Bản chỉnh sửa vẫn còn trong nháp trên máy này.`
          : "Không công bố được. Bản chỉnh sửa vẫn còn trong nháp trên máy này."
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🎡 Quản trị vòng quay may mắn</Text>
      <Text style={styles.subtitle}>
        Chỉ Admin thấy trang này. Chỉnh phần thưởng + ngân sách rồi bấm CÔNG BỐ
        để mọi máy cùng dùng. Quà hết số lượng hoặc hết ngân sách tháng sẽ TỰ
        ĐỘNG rời khỏi vòng quay.
      </Text>

      {message ? (
        <Card>
          <Text style={styles.messageText}>{message}</Text>
        </Card>
      ) : null}

      <DuoButton
        label={publishing ? "Đang công bố…" : "📣 Công bố cấu hình vòng quay"}
        onPress={() => void publish()}
      />

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Ngân sách quà tiền mỗi tháng</Text>
        <Text style={styles.muted}>
          Tổng TIỀN MẶT bé được trúng tối đa trong tháng. Tháng này bé đã trúng{" "}
          {formatVnd(budget.spent)} / {formatVnd(budget.budget)}
          {budget.exhausted
            ? " — ĐÃ HẾT ngân sách: mọi quà tiền tự rời vòng quay đến tháng sau."
            : ` — còn ${formatVnd(budget.remaining)}.`}
        </Text>
        <View style={styles.inlineRow}>
          <TextInput
            value={budgetText}
            onChangeText={setBudgetText}
            style={[styles.input, styles.budgetInput]}
            placeholder="Ví dụ: 50000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
          <Text style={styles.unitText}>đ/tháng</Text>
          <DuoButton label="Lưu ngân sách" variant="secondary" onPress={saveBudget} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>
          {editingId ? "✏️ Sửa phần thưởng" : "➕ Thêm phần thưởng"}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Tên phần thưởng (vd: 50 XP, Gấu bông thật…)"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.inlineRow}>
          <TextInput
            value={emoji}
            onChangeText={setEmoji}
            style={[styles.input, styles.emojiInput]}
            placeholder="🎁"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            style={[styles.input, styles.flexInput]}
            placeholder="Giá trị: XP / số sao / số thức ăn / số tiền đ"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inlineRow}>
          <TextInput
            value={weightText}
            onChangeText={setWeightText}
            style={[styles.input, styles.flexInput]}
            placeholder="Trọng số % (tỉ lệ trúng tương đối)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
          <TextInput
            value={stockText}
            onChangeText={setStockText}
            style={[styles.input, styles.flexInput]}
            placeholder="Số lượng còn lại (để trống = không giới hạn)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.fieldLabel}>Tầng vòng quay</Text>
        <View style={styles.chipRow}>
          {SPIN_TIERS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTier(t.id)}
              style={[styles.chip, tier === t.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, tier === t.id && styles.chipTextActive]}>
                {t.emoji} {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Loại quà</Text>
        <View style={styles.chipRow}>
          {SPIN_PRIZE_KINDS.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => setKind(k.id)}
              style={[styles.chip, kind === k.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, kind === k.id && styles.chipTextActive]}>
                {k.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {kind === "accessory" ? (
          <>
            <Text style={styles.fieldLabel}>Nhóm phụ kiện mở khóa vĩnh viễn</Text>
            <View style={styles.chipRow}>
              {(Object.keys(SPIN_ACCESSORY_GROUPS) as SpinAccessoryGroup[]).map(
                (group) => (
                  <Pressable
                    key={group}
                    onPress={() => setAccessoryGroup(group)}
                    style={[styles.chip, accessoryGroup === group && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        accessoryGroup === group && styles.chipTextActive,
                      ]}
                    >
                      {SPIN_ACCESSORY_GROUPS[group].label}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </>
        ) : null}
        {kind === "real" ? (
          <>
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.input}
              placeholder="Link ảnh quà thật (https://…) — hiện trong Kho báu"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            {imageUrl.trim() ? (
              <Image source={{ uri: imageUrl.trim() }} style={styles.previewImage} />
            ) : null}
            <Pressable onPress={() => setCash((v) => !v)} style={styles.checkRow}>
              <Text style={styles.checkText}>
                {cash ? "☑" : "☐"} Đây là TIỀN MẶT (tính vào ngân sách tháng ở trên)
              </Text>
            </Pressable>
          </>
        ) : null}
        <DuoButton
          label={editingId ? "Lưu thay đổi" : "Thêm vào vòng quay"}
          variant="super"
          onPress={savePrize}
        />
        {editingId ? (
          <DuoButton label="Hủy sửa" variant="secondary" onPress={resetForm} />
        ) : null}
      </Card>

      {SPIN_TIERS.map((t) => (
        <Card key={t.id} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.emoji} Tầng {t.label} ({draft.prizes.filter((p) => p.tier === t.id).length} quà)
          </Text>
          {draft.prizes
            .filter((p) => p.tier === t.id)
            .map((prize) => {
              const reason = prizeExclusionReason(prize, eligibilityCtx);
              const remaining =
                (spinStock ?? {})[prize.id] ?? prize.stock;
              return (
                <View key={prize.id} style={styles.prizeRow}>
                  {prize.imageUrl ? (
                    <Image source={{ uri: prize.imageUrl }} style={styles.rowImage} />
                  ) : (
                    <Text style={styles.rowEmoji}>{prize.emoji}</Text>
                  )}
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{prize.name}</Text>
                    <Text style={styles.muted}>
                      Trọng số {prize.weight} ·{" "}
                      {remaining == null ? "Không giới hạn số lượng" : `Còn ${remaining}`}
                      {prize.kind === "real" && prize.cash
                        ? ` · Tiền mặt ${formatVnd(prize.amount)}`
                        : ""}
                    </Text>
                    {reason ? (
                      <Text style={styles.excludedText}>
                        ⛔ {reason} — đang bị loại khỏi vòng quay
                      </Text>
                    ) : (
                      <Text style={styles.eligibleText}>✅ Đang có trên vòng quay</Text>
                    )}
                  </View>
                  <View style={styles.rowActions}>
                    <DuoButton
                      label={prize.enabled ? "Tắt" : "Bật"}
                      variant="secondary"
                      onPress={() => toggleEnabled(prize)}
                    />
                    <DuoButton label="Sửa" variant="secondary" onPress={() => startEdit(prize)} />
                    <DuoButton label="Xóa" variant="danger" onPress={() => deletePrize(prize)} />
                  </View>
                </View>
              );
            })}
        </Card>
      ))}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>
          🎁 Quà thật chờ trao ({pending.length})
        </Text>
        {pending.length === 0 ? (
          <Text style={styles.muted}>Chưa có quà thật nào đang chờ trao trên máy này.</Text>
        ) : (
          pending.map((entry) => (
            <View key={entry.id} style={styles.prizeRow}>
              {entry.imageUrl ? (
                <Image source={{ uri: entry.imageUrl }} style={styles.rowImage} />
              ) : (
                <Text style={styles.rowEmoji}>{entry.prizeEmoji}</Text>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{entry.prizeName}</Text>
                <Text style={styles.muted}>
                  Trúng {new Date(entry.at).toLocaleString("vi-VN")} · vòng{" "}
                  {spinTierLabel(entry.tier)}
                  {entry.cash ? ` · ${formatVnd(entry.amount)}` : ""}
                </Text>
              </View>
              <DuoButton
                label="Xác nhận đã trao ✅"
                variant="super"
                onPress={() => confirmGiven(entry.id, entry.prizeName)}
              />
            </View>
          ))
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🕘 Lịch sử bé đã quay (máy này, {history.length} lượt)</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Chưa có lượt quay nào trên máy này.</Text>
        ) : (
          history.slice(0, 30).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.rowEmoji}>{entry.prizeEmoji}</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{entry.prizeName}</Text>
                <Text style={styles.muted}>
                  {new Date(entry.at).toLocaleString("vi-VN")} · vòng{" "}
                  {spinTierLabel(entry.tier)}
                  {entry.kind === "real"
                    ? entry.realStatus === "given"
                      ? ` · ✅ Đã trao${entry.givenAt ? ` ${new Date(entry.givenAt).toLocaleDateString("vi-VN")}` : ""}`
                      : " · ⏳ Chờ trao"
                    : ""}
                </Text>
              </View>
            </View>
          ))
        )}
        <Text style={styles.muted}>
          Lịch sử lưu trên máy bé và tự đồng bộ theo tài khoản khi đã chạy file
          spin-schema.sql trên Supabase; chưa chạy SQL thì vẫn xem/đánh dấu trao
          bình thường trên chính máy này.
        </Text>
      </Card>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  messageText: { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 20 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  input: {
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inlineRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  flexInput: { flex: 1 },
  emojiInput: { width: 64, textAlign: "center" },
  budgetInput: { flex: 1 },
  unitText: { fontSize: 14, fontWeight: "700", color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: "800", color: colors.text, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 2,
    borderColor: colors.neutral200,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.green, backgroundColor: colors.green },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  chipTextActive: { color: "#ffffff" },
  checkRow: { paddingVertical: 4 },
  checkText: { fontSize: 14, fontWeight: "700", color: colors.text },
  previewImage: { width: 96, height: 96, borderRadius: radius.md },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    paddingTop: spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    paddingTop: spacing.sm,
  },
  rowImage: { width: 44, height: 44, borderRadius: radius.sm },
  rowEmoji: { fontSize: 30, width: 44, textAlign: "center" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "800", color: colors.text },
  rowActions: { gap: 6, alignItems: "stretch" },
  excludedText: { fontSize: 12, fontWeight: "700", color: "#b45309", marginTop: 2 },
  eligibleText: { fontSize: 12, fontWeight: "700", color: "#15803d", marginTop: 2 },
  })
);
