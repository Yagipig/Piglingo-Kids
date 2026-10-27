import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DuoButton } from "@/components/duo-button";
import { GlobalRewardCard } from "@/components/reward-cards";
import { useAuth } from "@/features/supabase/AuthContext";
import { catalog } from "@/lib/content";
import { publishGlobalRewards } from "@/lib/globalRewardsSync";
import {
  conditionLabel,
  createRewardId,
  evaluateCondition,
  type GlobalReward,
  type GlobalRewardKind,
  type RewardCondition,
} from "@/lib/rewards";
import { DEFAULT_GLOBAL_REWARDS } from "@/lib/rewards-defaults";
import { useRewardsStore } from "@/lib/rewardsStore";
import { useProgress } from "@/lib/store";
import { makeThemedStyles, radius } from "@/lib/theme";
import { isAdminEmail } from "@/lib/unlock";

const KIND_OPTIONS: { value: GlobalRewardKind; label: string }[] = [
  { value: "badge", label: "🏅 Huy hiệu" },
  { value: "chest", label: "🧰 Rương" },
  { value: "title", label: "👑 Danh hiệu" },
  { value: "parent-tip", label: "💡 Gợi ý phụ huynh" },
];

const CONDITION_OPTIONS: { value: RewardCondition["type"]; label: string }[] = [
  { value: "course-percent", label: "Theo % khóa" },
  { value: "course-complete", label: "Xong 100% khóa" },
  { value: "units-completed", label: "Số vùng đất" },
  { value: "all-courses-complete", label: "Xong cả 3 khóa" },
];

const EMOJIS = ["🏅", "⭐", "👑", "🧰", "🎁", "🧭", "🗺️", "🚀", "🌱", "📚", "🎉", "🏆"];
const PERCENTS = [25, 50, 75, 100];

interface RewardForm {
  id: string | null;
  kind: GlobalRewardKind;
  name: string;
  description: string;
  emoji: string;
  congratsMessage: string;
  conditionType: RewardCondition["type"];
  courseId: string;
  percent: number;
  unitCount: string;
  sortOrder: string;
  enabled: boolean;
}

const EMPTY_FORM: RewardForm = {
  id: null,
  kind: "badge",
  name: "",
  description: "",
  emoji: "🏅",
  congratsMessage: "",
  conditionType: "course-percent",
  courseId: "en-vi",
  percent: 25,
  unitCount: "1",
  sortOrder: "999",
  enabled: true,
};

function formFromReward(reward: GlobalReward): RewardForm {
  return {
    id: reward.id,
    kind: reward.kind,
    name: reward.name,
    description: reward.description,
    emoji: reward.emoji,
    congratsMessage: reward.congratsMessage,
    conditionType: reward.condition.type,
    courseId:
      reward.condition.type === "course-percent" || reward.condition.type === "course-complete"
        ? reward.condition.courseId
        : "en-vi",
    percent: reward.condition.type === "course-percent" ? reward.condition.percent : 25,
    unitCount:
      reward.condition.type === "units-completed" ? String(reward.condition.count) : "1",
    sortOrder: String(reward.sortOrder),
    enabled: reward.enabled,
  };
}

function conditionFromForm(form: RewardForm): RewardCondition {
  switch (form.conditionType) {
    case "course-percent":
      return { type: "course-percent", courseId: form.courseId, percent: form.percent };
    case "course-complete":
      return { type: "course-complete", courseId: form.courseId };
    case "units-completed":
      return {
        type: "units-completed",
        count: Math.max(1, Number.parseInt(form.unitCount, 10) || 1),
      };
    case "all-courses-complete":
      return { type: "all-courses-complete" };
  }
}

/**
 * Khu quản trị phần thưởng chung.
 *
 * Cổng email ở đây chỉ là lớp giao diện. Quyền ghi thật do RLS của bảng
 * app_config trên Supabase thực thi: chỉ JWT có email admin mới INSERT/
 * UPDATE/DELETE được. Không có tài khoản admin hay mật khẩu mặc định nào
 * được tạo thêm bởi màn hình này.
 */
export default function AdminRewardsScreen() {
  const styles = useStyles();
  const { user, isLoading } = useAuth();
  const progress = useProgress();
  const globalConfigCache = useRewardsStore((state) => state.globalConfigCache);
  const storedDraft = useRewardsStore((state) => state.adminDraft);
  const setAdminDraft = useRewardsStore((state) => state.setAdminDraft);
  const setGlobalConfigCache = useRewardsStore((state) => state.setGlobalConfigCache);

  const initialRewards = useMemo(
    () =>
      [...(storedDraft ?? globalConfigCache?.rewards ?? DEFAULT_GLOBAL_REWARDS)].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    // Chỉ lấy bản khởi tạo khi màn hình mở; các lần sửa dùng state local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draft, setDraftState] = useState<GlobalReward[]>(initialRewards);
  const [form, setForm] = useState<RewardForm>(EMPTY_FORM);
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = isAdminEmail(user?.email);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.lockedTitle}>Đang kiểm tra quyền quản trị…</Text>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.lockedBox}>
          <Text style={styles.lockedEmoji}>🔒</Text>
          <Text style={styles.lockedTitle}>Khu vực chỉ dành cho Admin</Text>
          <Text style={styles.lockedText}>
            Tài khoản hiện tại không có quyền quản lý phần thưởng chung. Quyền ghi dữ liệu thật được Supabase RLS bảo vệ ở phía máy chủ.
          </Text>
          <DuoButton label="Quay lại" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const updateDraft = (next: GlobalReward[]) => {
    const sorted = [...next].sort((a, b) => a.sortOrder - b.sortOrder);
    setDraftState(sorted);
    setAdminDraft(sorted);
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      setMessage("Hãy nhập tên phần thưởng trước khi lưu.");
      return;
    }
    const reward: GlobalReward = {
      id: form.id ?? createRewardId("global"),
      kind: form.kind,
      name: form.name.trim(),
      description: form.description.trim(),
      emoji: form.emoji,
      condition: conditionFromForm(form),
      congratsMessage:
        form.congratsMessage.trim() || "Chúc mừng con đã đạt một cột mốc mới!",
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      enabled: form.enabled,
    };
    updateDraft(
      form.id ? draft.map((item) => (item.id === form.id ? reward : item)) : [...draft, reward],
    );
    setForm(EMPTY_FORM);
    setMessage("Đã lưu vào bản nháp trên máy này. Bấm Công bố để mọi người cùng thấy.");
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = draft.findIndex((reward) => reward.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= draft.length) return;
    const next = [...draft];
    const currentOrder = next[index].sortOrder;
    next[index] = { ...next[index], sortOrder: next[swapIndex].sortOrder };
    next[swapIndex] = { ...next[swapIndex], sortOrder: currentOrder };
    updateDraft(next);
  };

  const publish = async () => {
    setPublishing(true);
    setMessage(null);
    // Cache local cập nhật ngay để admin thấy đúng bản vừa công bố trên máy này.
    setAdminDraft(draft);
    setGlobalConfigCache(draft, "admin-local", Date.now());
    try {
      await publishGlobalRewards(draft, user?.email);
      setMessage("✅ Đã công bố phần thưởng chung lên Supabase. Các máy khác sẽ nhận khi mở app có mạng.");
    } catch (error) {
      setMessage(
        `⚠️ Đang lưu bản nháp trên máy này, cần đăng nhập tài khoản admin và có mạng để công bố. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>⚙️ Quản trị phần thưởng chung</Text>
            <Text style={styles.subtitle}>Đang đăng nhập: {user?.email}</Text>
          </View>
        </View>

        <Text style={styles.securityNote}>
          Bảo mật: Supabase RLS chỉ cho phép email admin ghi bảng app_config. Màn hình này không tạo tài khoản/mật khẩu mặc định và admin không xem được phần thưởng riêng của từng gia đình.
        </Text>

        <View style={styles.actionsRow}>
          <DuoButton label="Thêm phần thưởng" onPress={() => setForm(EMPTY_FORM)} />
          <DuoButton
            label={showPreview ? "Ẩn xem trước" : "Xem trước như trẻ thấy"}
            variant="super"
            onPress={() => setShowPreview((value) => !value)}
          />
          <DuoButton
            label="Khôi phục bộ mẫu"
            variant="white"
            onPress={() => {
              updateDraft(DEFAULT_GLOBAL_REWARDS);
              setMessage("Đã khôi phục bộ mẫu vào bản nháp. Cần bấm Công bố để áp dụng cho mọi máy.");
            }}
          />
        </View>

        {showPreview ? (
          <View style={styles.previewBox}>
            <Text style={styles.sectionTitle}>👀 Xem trước phía trẻ</Text>
            {draft
              .filter((reward) => reward.enabled && reward.kind !== "parent-tip")
              .map((reward) => (
                <GlobalRewardCard
                  key={reward.id}
                  reward={reward}
                  evaluation={evaluateCondition(reward.condition, progress)}
                />
              ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Danh sách đang soạn ({draft.length})</Text>
        {draft.map((reward) => (
          <View key={reward.id} style={[styles.adminCard, !reward.enabled && styles.adminCardHidden]}>
            <Text style={styles.adminEmoji}>{reward.emoji}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.adminName}>{reward.name}</Text>
              <Text style={styles.adminMeta}>
                {KIND_OPTIONS.find((item) => item.value === reward.kind)?.label} · {conditionLabel(reward.condition)} · Thứ tự {reward.sortOrder} · {reward.enabled ? "Đang hiện" : "Đang ẩn"}
              </Text>
              <Text style={styles.adminDescription}>{reward.description}</Text>
              <View style={styles.cardActions}>
                <SmallButton label="Sửa" onPress={() => setForm(formFromReward(reward))} />
                <SmallButton label="↑" onPress={() => move(reward.id, -1)} />
                <SmallButton label="↓" onPress={() => move(reward.id, 1)} />
                <SmallButton
                  label={reward.enabled ? "Tạm ẩn" : "Kích hoạt"}
                  onPress={() =>
                    updateDraft(
                      draft.map((item) =>
                        item.id === reward.id ? { ...item, enabled: !item.enabled } : item,
                      ),
                    )
                  }
                />
                <SmallButton
                  label={confirmDeleteId === reward.id ? "Bấm nữa để xóa" : "Xóa"}
                  danger={confirmDeleteId === reward.id}
                  onPress={() => {
                    if (confirmDeleteId === reward.id) {
                      updateDraft(draft.filter((item) => item.id !== reward.id));
                      setConfirmDeleteId(null);
                    } else {
                      setConfirmDeleteId(reward.id);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>{form.id ? "Sửa phần thưởng" : "Thêm phần thưởng mới"}</Text>
        <View style={styles.form}>
          <TextInput value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Tên phần thưởng" style={styles.input} />
          <TextInput value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Mô tả" style={[styles.input, styles.multiline]} multiline />
          <TextInput value={form.congratsMessage} onChangeText={(congratsMessage) => setForm({ ...form, congratsMessage })} placeholder="Lời chúc mừng hiển thị cho trẻ" style={[styles.input, styles.multiline]} multiline />

          <Text style={styles.label}>Biểu tượng</Text>
          <View style={styles.chipRow}>
            {EMOJIS.map((emoji) => (
              <Pressable key={emoji} onPress={() => setForm({ ...form, emoji })} style={[styles.emojiChip, form.emoji === emoji && styles.chipActive]}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Loại phần thưởng</Text>
          <View style={styles.chipRow}>
            {KIND_OPTIONS.map((option) => (
              <Pressable key={option.value} onPress={() => setForm({ ...form, kind: option.value })} style={[styles.chip, form.kind === option.value && styles.chipActive]}>
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Điều kiện nhận thưởng</Text>
          <View style={styles.chipRow}>
            {CONDITION_OPTIONS.map((option) => (
              <Pressable key={option.value} onPress={() => setForm({ ...form, conditionType: option.value })} style={[styles.chip, form.conditionType === option.value && styles.chipActive]}>
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          {form.conditionType === "course-percent" || form.conditionType === "course-complete" ? (
            <>
              <Text style={styles.label}>Khóa học</Text>
              <View style={styles.chipRow}>
                {catalog.courses.map((course) => (
                  <Pressable key={course.id} onPress={() => setForm({ ...form, courseId: course.id })} style={[styles.chip, form.courseId === course.id && styles.chipActive]}>
                    <Text style={styles.chipText}>{course.flag} {course.targetLanguage}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {form.conditionType === "course-percent" ? (
            <>
              <Text style={styles.label}>Mốc phần trăm</Text>
              <View style={styles.chipRow}>
                {PERCENTS.map((percent) => (
                  <Pressable key={percent} onPress={() => setForm({ ...form, percent })} style={[styles.chip, form.percent === percent && styles.chipActive]}>
                    <Text style={styles.chipText}>{percent}%</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {form.conditionType === "units-completed" ? (
            <TextInput value={form.unitCount} onChangeText={(unitCount) => setForm({ ...form, unitCount })} placeholder="Số vùng đất/chủ đề cần hoàn thành" keyboardType="number-pad" style={styles.input} />
          ) : null}

          <TextInput value={form.sortOrder} onChangeText={(sortOrder) => setForm({ ...form, sortOrder })} placeholder="Thứ tự hiển thị (số nhỏ hiện trước)" keyboardType="number-pad" style={styles.input} />
          <View style={styles.switchRow}>
            <Text style={styles.label}>Đang kích hoạt</Text>
            <Switch value={form.enabled} onValueChange={(enabled) => setForm({ ...form, enabled })} />
          </View>

          <DuoButton label={form.id ? "Lưu thay đổi" : "Thêm vào bản nháp"} onPress={saveForm} />
          {form.id ? <DuoButton label="Hủy sửa" variant="white" onPress={() => setForm(EMPTY_FORM)} /> : null}
        </View>

        <DuoButton
          label={publishing ? "Đang công bố…" : "Công bố lên máy mọi người"}
          size="lg"
          disabled={publishing}
          onPress={() => void publish()}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SmallButton({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.smallButton, danger && styles.smallButtonDanger]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.smallButtonText, danger && styles.smallButtonDangerText]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { width: "100%", maxWidth: 820, alignSelf: "center", padding: 16, paddingBottom: 52, gap: 12 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.neutral100, borderWidth: 2, borderColor: colors.neutral200 },
    backText: { fontSize: 22, fontWeight: "800", color: colors.neutral700 },
    title: { fontSize: 23, fontWeight: "900", color: colors.neutral700 },
    subtitle: { fontSize: 13, color: colors.textMuted },
    securityNote: { fontSize: 12, lineHeight: 18, color: colors.textMuted, backgroundColor: colors.selectedBg, borderRadius: radius.lg, padding: 12 },
    actionsRow: { gap: 9 },
    previewBox: { gap: 10, borderWidth: 2, borderColor: colors.amber, borderRadius: radius.xl, padding: 12 },
    sectionTitle: { fontSize: 19, fontWeight: "900", color: colors.neutral700, marginTop: 8 },
    adminCard: { flexDirection: "row", gap: 11, borderWidth: 2, borderColor: colors.neutral200, borderRadius: radius.xl, padding: 13, backgroundColor: colors.surface },
    adminCardHidden: { opacity: 0.62 },
    adminEmoji: { fontSize: 32 },
    adminName: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    adminMeta: { fontSize: 12, color: colors.textMuted },
    adminDescription: { fontSize: 13, color: colors.text },
    cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
    smallButton: { borderWidth: 1.5, borderColor: colors.neutral300, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
    smallButtonText: { fontSize: 12, fontWeight: "800", color: colors.neutral700 },
    smallButtonDanger: { borderColor: colors.rose, backgroundColor: colors.wrongBg },
    smallButtonDangerText: { color: colors.wrongText },
    form: { gap: 10, borderWidth: 2, borderColor: colors.neutral200, borderRadius: radius.xl, padding: 14, backgroundColor: colors.surface },
    input: { borderWidth: 2, borderColor: colors.neutral200, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.background },
    multiline: { minHeight: 64, textAlignVertical: "top" },
    label: { fontSize: 13, fontWeight: "800", color: colors.neutral700 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: { borderWidth: 2, borderColor: colors.neutral200, borderRadius: radius.full, paddingHorizontal: 11, paddingVertical: 7 },
    emojiChip: { borderWidth: 2, borderColor: colors.neutral200, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 7 },
    chipActive: { borderColor: colors.amber, backgroundColor: colors.amber + "22" },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
    emojiText: { fontSize: 20 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    message: { fontSize: 13, lineHeight: 19, color: colors.text, backgroundColor: colors.correctBg, borderRadius: radius.lg, padding: 12 },
    lockedBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    lockedEmoji: { fontSize: 52 },
    lockedTitle: { fontSize: 23, fontWeight: "900", textAlign: "center", color: colors.neutral700 },
    lockedText: { fontSize: 14, lineHeight: 21, textAlign: "center", color: colors.textMuted },
  }),
);
