import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../supabase/AuthContext';
import { catalog } from '../../lib/content';
import {
  conditionLabel,
  evaluateCondition,
  familyRewardStatus,
  scopedFamilyRewards,
  visibleFamilyRewards,
  type FamilyReward,
  type RewardCondition,
} from '../../lib/rewards';
import { effectiveGlobalRewards, useRewardsStore } from '../../lib/rewardsStore';
import { useProgress } from '../../lib/store';

const EMOJIS = ['🎁', '🧸', '📚', '🎡', '🍦', '⚽', '🎨', '🧩', '🎬', '🏆'];
const PERCENTS = [25, 50, 75, 100] as const;

interface FamilyRewardForm {
  id: string | null;
  childName: string;
  title: string;
  message: string;
  emoji: string;
  budgetText: string;
  courseId: string;
  percent: number;
  allCourses: boolean;
  secretUntilDone: boolean;
}

const EMPTY_FORM: FamilyRewardForm = {
  id: null,
  childName: 'Con',
  title: '',
  message: '',
  emoji: '🎁',
  budgetText: '',
  courseId: 'en-vi',
  percent: 100,
  allCourses: false,
  secretUntilDone: true,
};

function formFromReward(reward: FamilyReward): FamilyRewardForm {
  const isAll = reward.condition.type === 'all-courses-complete';
  const courseId =
    reward.condition.type === 'course-percent' || reward.condition.type === 'course-complete'
      ? reward.condition.courseId
      : 'en-vi';
  const percent =
    reward.condition.type === 'course-percent'
      ? reward.condition.percent
      : reward.condition.type === 'course-complete'
        ? 100
        : 100;
  return {
    id: reward.id,
    childName: reward.childName,
    title: reward.title,
    message: reward.message,
    emoji: reward.emoji,
    budgetText: reward.budgetText ?? '',
    courseId,
    percent,
    allCourses: isAll,
    secretUntilDone: reward.secretUntilDone,
  };
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * "Phần thưởng của con" — chỉ được render bên trong ParentDashboard,
 * tức sau ParentGate. Trẻ không có đường CRUD nào ở màn Phần thưởng.
 *
 * Dữ liệu local-first trong rewardsStore; khi đã đăng nhập, hook ở root
 * layout đồng bộ các bản ghi của đúng tài khoản qua family_rewards (RLS
 * owner-only). Chưa đăng nhập thì phần thưởng chỉ nằm trên thiết bị này.
 */
export function FamilyRewardsSection() {
  const { user } = useAuth();
  const progress = useProgress();
  const familyRewards = useRewardsStore((state) => state.familyRewards);
  const globalConfigCache = useRewardsStore((state) => state.globalConfigCache);
  const addFamilyReward = useRewardsStore((state) => state.addFamilyReward);
  const updateFamilyReward = useRewardsStore((state) => state.updateFamilyReward);
  const deleteFamilyReward = useRewardsStore((state) => state.deleteFamilyReward);
  const setGivenAt = useRewardsStore((state) => state.setGivenAt);

  const [form, setForm] = useState<FamilyRewardForm>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmGivenId, setConfirmGivenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      visibleFamilyRewards(scopedFamilyRewards(familyRewards, user?.id ?? null)).sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    [familyRewards, user?.id],
  );
  const activeRewards = visible.filter((reward) => reward.givenAt == null);
  const givenRewards = visible.filter((reward) => reward.givenAt != null);
  const parentTips = effectiveGlobalRewards({ globalConfigCache }).filter(
    (reward) => reward.enabled && reward.kind === 'parent-tip',
  );

  const save = () => {
    if (!form.childName.trim() || !form.title.trim()) {
      setMessage('Hãy nhập tên con và tên phần thưởng.');
      return;
    }
    const condition: RewardCondition = form.allCourses
      ? { type: 'all-courses-complete' }
      : { type: 'course-percent', courseId: form.courseId, percent: form.percent };
    const payload = {
      childName: form.childName.trim(),
      title: form.title.trim(),
      message: form.message.trim(),
      emoji: form.emoji,
      budgetText: form.budgetText.trim() ? form.budgetText.trim() : null,
      condition,
      secretUntilDone: form.secretUntilDone,
    };

    if (form.id) {
      const existing = familyRewards.find((reward) => reward.id === form.id);
      if (existing?.givenAt != null) {
        setMessage('Phần thưởng đã trao chỉ để xem lịch sử. Hãy tạo phần thưởng mới nếu ba/mẹ muốn thay đổi.');
        return;
      }
      updateFamilyReward(form.id, payload);
      setMessage('Đã cập nhật phần thưởng của con.');
    } else {
      addFamilyReward({ ...payload, ownerId: user?.id ?? null });
      setMessage(
        user
          ? 'Đã tạo phần thưởng. Dữ liệu sẽ đồng bộ theo tài khoản khi có mạng.'
          : 'Đã tạo phần thưởng trên thiết bị này. Đăng nhập để đồng bộ theo tài khoản.',
      );
    }
    setForm(EMPTY_FORM);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🎁 Phần thưởng của con</Text>
      <Text style={styles.intro}>
        Ba/mẹ tự đặt phần thưởng ngoài đời thật cho con. App chỉ ghi lại cam kết và tiến độ; không thanh toán, không tự động trao quà.
      </Text>
      {!user ? (
        <Text style={styles.warning}>
          Ba/mẹ chưa đăng nhập: phần thưởng chỉ lưu trên thiết bị này. Đăng nhập để đồng bộ riêng theo tài khoản gia đình.
        </Text>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.formTitle}>{form.id ? 'Sửa phần thưởng' : 'Tạo phần thưởng mới'}</Text>
        <TextInput
          value={form.childName}
          onChangeText={(childName) => setForm({ ...form, childName })}
          placeholder="Tên con (nhãn tự nhập, ví dụ: Bé Na)"
          style={styles.input}
        />
        <TextInput
          value={form.title}
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="Tên thưởng, ví dụ: Bố mẹ sẽ mua cho con bộ Lego con thích"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <TextInput
          value={form.message}
          onChangeText={(message) => setForm({ ...form, message })}
          placeholder="Lời nhắn dành cho con"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <TextInput
          value={form.budgetText}
          onChangeText={(budgetText) => setForm({ ...form, budgetText })}
          placeholder="Ngân sách tham khảo (tùy chọn), ví dụ: tối đa 5.000 yên"
          style={styles.input}
        />

        <Text style={styles.label}>Ảnh minh họa</Text>
        <View style={styles.chipRow}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setForm({ ...form, emoji })}
              style={[styles.emojiChip, form.emoji === emoji && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Chọn biểu tượng ${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Điều kiện nhận thưởng</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setForm({ ...form, allCourses: false })}
            style={[styles.chip, !form.allCourses && styles.chipSelected]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipLabel, !form.allCourses && styles.chipLabelSelected]}>Một khóa + mốc %</Text>
          </Pressable>
          <Pressable
            onPress={() => setForm({ ...form, allCourses: true })}
            style={[styles.chip, form.allCourses && styles.chipSelected]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipLabel, form.allCourses && styles.chipLabelSelected]}>Toàn bộ 3 khóa</Text>
          </Pressable>
        </View>

        {!form.allCourses ? (
          <>
            <View style={styles.chipRow}>
              {catalog.courses.map((course) => (
                <Pressable
                  key={course.id}
                  onPress={() => setForm({ ...form, courseId: course.id })}
                  style={[styles.chip, form.courseId === course.id && styles.chipSelected]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipLabel, form.courseId === course.id && styles.chipLabelSelected]}>
                    {course.flag} {course.targetLanguage}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipRow}>
              {PERCENTS.map((percent) => (
                <Pressable
                  key={percent}
                  onPress={() => setForm({ ...form, percent })}
                  style={[styles.chip, form.percent === percent && styles.chipSelected]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipLabel, form.percent === percent && styles.chipLabelSelected]}>{percent}%</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Giữ bí mật tới khi đạt</Text>
            <Text style={styles.switchHint}>Phía trẻ chỉ thấy một món quà bí mật và phần trăm tiến độ.</Text>
          </View>
          <Switch
            value={form.secretUntilDone}
            onValueChange={(secretUntilDone) => setForm({ ...form, secretUntilDone })}
          />
        </View>

        <Pressable onPress={save} style={styles.primaryButton} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{form.id ? 'Lưu thay đổi' : 'Tạo phần thưởng'}</Text>
        </Pressable>
        {form.id ? (
          <Pressable onPress={() => setForm(EMPTY_FORM)} style={styles.secondaryButton} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Hủy sửa</Text>
          </Pressable>
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <Text style={styles.subTitle}>Đang theo dõi ({activeRewards.length})</Text>
      {activeRewards.length === 0 ? (
        <Text style={styles.empty}>Chưa có phần thưởng riêng nào đang theo dõi.</Text>
      ) : (
        activeRewards.map((reward) => {
          const evaluation = evaluateCondition(reward.condition, progress);
          const status = familyRewardStatus(reward, progress);
          return (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardMeta}>
                    Cho {reward.childName} · {conditionLabel(reward.condition)}
                  </Text>
                </View>
                <Text style={styles.statusPill}>{status === 'achieved' ? 'Đã đạt' : `${evaluation.percent}%`}</Text>
              </View>
              {reward.message ? <Text style={styles.rewardText}>💌 {reward.message}</Text> : null}
              {reward.budgetText ? <Text style={styles.rewardText}>Ngân sách: {reward.budgetText}</Text> : null}
              <Text style={styles.rewardText}>
                Tiến độ hiện tại: {evaluation.completed}/{evaluation.total} ({evaluation.percent}%)
                {reward.secretUntilDone ? ' · Đang giữ bí mật với trẻ' : ' · Trẻ nhìn thấy tên thưởng'}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${evaluation.percent}%` }]} />
              </View>
              <View style={styles.actionRow}>
                <ActionButton label="Sửa" onPress={() => setForm(formFromReward(reward))} />
                {status === 'achieved' ? (
                  <ActionButton
                    label={confirmGivenId === reward.id ? 'Bấm nữa để xác nhận đã trao' : 'Xác nhận đã trao'}
                    primary
                    onPress={() => {
                      if (confirmGivenId === reward.id) {
                        setGivenAt(reward.id, Date.now());
                        setConfirmGivenId(null);
                      } else {
                        setConfirmGivenId(reward.id);
                      }
                    }}
                  />
                ) : null}
                <ActionButton
                  label={confirmDeleteId === reward.id ? 'Bấm nữa để xóa' : 'Xóa'}
                  danger={confirmDeleteId === reward.id}
                  onPress={() => {
                    if (confirmDeleteId === reward.id) {
                      deleteFamilyReward(reward.id);
                      setConfirmDeleteId(null);
                    } else {
                      setConfirmDeleteId(reward.id);
                    }
                  }}
                />
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.subTitle}>Lịch sử đã trao ({givenRewards.length})</Text>
      {givenRewards.length === 0 ? (
        <Text style={styles.empty}>Chưa có phần thưởng nào được xác nhận đã trao.</Text>
      ) : (
        givenRewards.map((reward) => (
          <View key={reward.id} style={styles.historyCard}>
            <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardMeta}>
                Cho {reward.childName} · Đã trao lúc {reward.givenAt ? formatDateTime(reward.givenAt) : '—'}
              </Text>
              <Text style={styles.rewardText}>{conditionLabel(reward.condition)}</Text>
            </View>
            <ActionButton label="Hoàn tác" onPress={() => setGivenAt(reward.id, null)} />
          </View>
        ))
      )}

      {parentTips.length > 0 ? (
        <>
          <Text style={styles.subTitle}>Gợi ý từ phần thưởng chung</Text>
          {parentTips.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <Text style={styles.rewardEmoji}>{tip.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>{tip.name}</Text>
                <Text style={styles.rewardText}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
  danger,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.actionButton, primary && styles.actionButtonPrimary, danger && styles.actionButtonDanger]}
    >
      <Text
        style={[
          styles.actionButtonText,
          primary && styles.actionButtonPrimaryText,
          danger && styles.actionButtonDangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 10 },
  sectionTitle: { fontSize: 21, fontWeight: '800', color: '#1B1B1B', marginTop: 6 },
  intro: { fontSize: 15, lineHeight: 21, color: '#555555' },
  warning: { fontSize: 14, lineHeight: 20, color: '#7C2D12', backgroundColor: '#FFEDD5', borderRadius: 12, padding: 11 },
  form: { gap: 10, backgroundColor: '#F7F7F7', borderRadius: 16, padding: 14 },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#1B1B1B' },
  input: { borderWidth: 1.5, borderColor: '#D4D4D4', borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#1B1B1B' },
  multiline: { minHeight: 62, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '800', color: '#1B1B1B', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#208AEF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#208AEF' },
  chipLabel: { fontSize: 14, fontWeight: '700', color: '#208AEF' },
  chipLabelSelected: { color: '#FFFFFF' },
  emojiChip: { borderWidth: 1.5, borderColor: '#D4D4D4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  emoji: { fontSize: 21 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontSize: 15, fontWeight: '800', color: '#1B1B1B' },
  switchHint: { fontSize: 13, color: '#666666', marginTop: 2 },
  primaryButton: { backgroundColor: '#208AEF', borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  secondaryButton: { borderWidth: 1.5, borderColor: '#A3A3A3', borderRadius: 999, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: '#555555' },
  message: { fontSize: 14, lineHeight: 20, color: '#166534', backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10 },
  subTitle: { fontSize: 18, fontWeight: '800', color: '#1B1B1B', marginTop: 8 },
  empty: { fontSize: 14, color: '#666666' },
  rewardCard: { gap: 8, backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FDBA74', borderRadius: 16, padding: 13 },
  historyCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC', borderRadius: 16, padding: 13 },
  tipCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 16, padding: 13 },
  rewardHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rewardEmoji: { fontSize: 28 },
  rewardTitle: { fontSize: 16, fontWeight: '800', color: '#1B1B1B' },
  rewardMeta: { fontSize: 13, color: '#666666', marginTop: 2 },
  rewardText: { fontSize: 14, lineHeight: 20, color: '#444444' },
  statusPill: { overflow: 'hidden', borderRadius: 999, backgroundColor: '#208AEF', color: '#FFFFFF', fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: '#E5E5E5', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#F59E0B' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  actionButton: { borderWidth: 1.5, borderColor: '#A3A3A3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  actionButtonPrimary: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  actionButtonDanger: { borderColor: '#E11D48', backgroundColor: '#FFF1F2' },
  actionButtonText: { fontSize: 13, fontWeight: '800', color: '#444444' },
  actionButtonPrimaryText: { color: '#FFFFFF' },
  actionButtonDangerText: { color: '#BE123C' },
});
