import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SpeakingLanguage } from '../speaking/types';
import type { ParentSettings, ProgressSnapshot } from './types';
import { FamilyRewardsSection } from './FamilyRewardsSection';

const LANGUAGE_LABEL: Record<SpeakingLanguage, string> = {
  en: '🇬🇧 Tiếng Anh',
  ja: '🇯🇵 Tiếng Nhật',
  zh: '🇨🇳 Tiếng Trung',
};

/** Các mốc giới hạn cho phụ huynh chọn nhanh. null = không giới hạn. */
const LIMIT_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: '15 phút', value: 15 },
  { label: '30 phút', value: 30 },
  { label: '45 phút', value: 45 },
  { label: '60 phút', value: 60 },
  { label: '90 phút', value: 90 },
  { label: 'Không giới hạn', value: null },
];

export interface ParentDashboardProps {
  /** null khi chưa đọc được tiến độ (đang tải hoặc chưa nối store). */
  snapshot: ProgressSnapshot | null;
  settings: ParentSettings;
  onChangeDailyLimit: (minutes: number | null) => void;
  /** Số phút đã dùng hôm nay, nếu nơi gọi có theo dõi (không bắt buộc). */
  usedMinutesToday?: number;
  /** Nút mở màn hình tài khoản Supabase, nếu app có dùng. */
  onOpenAccount?: () => void;
}

/**
 * Màn hình tổng quan cho phụ huynh: XP, chuỗi ngày, tiến độ từng ngôn ngữ,
 * thẻ SRS đến hạn, và cài đặt giới hạn thời gian mỗi ngày.
 * Component này thuần hiển thị — dữ liệu vào qua props (qua ProgressSnapshot adapter).
 */
export function ParentDashboard({
  snapshot,
  settings,
  onChangeDailyLimit,
  usedMinutesToday,
  onOpenAccount,
}: ParentDashboardProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Khu vực phụ huynh 👨‍👩‍👧</Text>

      {snapshot ? (
        <>
          <View style={styles.statRow}>
            <StatCard label="Tổng XP" value={`${snapshot.totalXp}`} />
            <StatCard label="Chuỗi ngày học" value={`${snapshot.streakDays} 🔥`} />
            <StatCard
              label="Bài đã hoàn thành"
              value={
                snapshot.lessonsTotal
                  ? `${snapshot.lessonsCompleted}/${snapshot.lessonsTotal}`
                  : `${snapshot.lessonsCompleted}`
              }
            />
            <StatCard label="Thẻ cần ôn hôm nay" value={`${snapshot.srsDueCount}`} />
          </View>

          <Text style={styles.sectionTitle}>Tiến độ từng ngôn ngữ</Text>
          {(Object.keys(LANGUAGE_LABEL) as SpeakingLanguage[]).map((lang) => {
            const progress = snapshot.perLanguage[lang];
            const completed = progress?.lessonsCompleted ?? 0;
            const total = progress?.lessonsTotal;
            const ratio = total && total > 0 ? Math.min(1, completed / total) : 0;
            return (
              <View key={lang} style={styles.langCard}>
                <View style={styles.langHeader}>
                  <Text style={styles.langName}>{LANGUAGE_LABEL[lang]}</Text>
                  <Text style={styles.langXp}>{progress?.xp ?? 0} XP</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
                </View>
                <Text style={styles.langDetail}>
                  {total ? `Đã học ${completed}/${total} bài` : `Đã học ${completed} bài`}
                </Text>
              </View>
            );
          })}

          {typeof snapshot.speakingAttempts === 'number' ? (
            <Text style={styles.note}>Số lượt luyện nói đã chấm: {snapshot.speakingAttempts}</Text>
          ) : null}
          {snapshot.lastStudyDate ? (
            <Text style={styles.note}>Ngày học gần nhất: {snapshot.lastStudyDate}</Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.note}>
          Chưa đọc được tiến độ. Hãy nối store tiến độ qua adapter (xem INTEGRATION.md).
        </Text>
      )}

      <Text style={styles.sectionTitle}>Giới hạn thời gian mỗi ngày</Text>
      {typeof usedMinutesToday === 'number' ? (
        <Text style={styles.note}>Hôm nay bé đã dùng khoảng {usedMinutesToday} phút.</Text>
      ) : null}
      <View style={styles.chipRow}>
        {LIMIT_OPTIONS.map((option) => {
          const selected = settings.dailyLimitMinutes === option.value;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChangeDailyLimit(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>
        Khi hết giờ, app hiện màn hình nghỉ. Ba/mẹ có thể gia hạn thêm cho riêng hôm đó sau khi
        qua cổng xác thực.
      </Text>

      <FamilyRewardsSection />

      {onOpenAccount ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenAccount}
          style={({ pressed }: { pressed: boolean }) => [styles.accountButton, pressed && styles.pressed]}
        >
          <Text style={styles.accountLabel}>Tài khoản & đồng bộ đám mây</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B1B1B' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: '#E6F4FE',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0B4F8A' },
  statLabel: { fontSize: 14, color: '#3D6E99', textAlign: 'center' },
  sectionTitle: { fontSize: 21, fontWeight: '800', color: '#1B1B1B', marginTop: 6 },
  langCard: { backgroundColor: '#F7F7F7', borderRadius: 16, padding: 14, gap: 8 },
  langHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langName: { fontSize: 18, fontWeight: '700', color: '#1B1B1B' },
  langXp: { fontSize: 16, fontWeight: '700', color: '#208AEF' },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: '#E0E0E0', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#34C759' },
  langDetail: { fontSize: 15, color: '#555555' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 2,
    borderColor: '#208AEF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipSelected: { backgroundColor: '#208AEF' },
  chipLabel: { fontSize: 16, fontWeight: '700', color: '#208AEF' },
  chipLabelSelected: { color: '#FFFFFF' },
  note: { fontSize: 15, color: '#666666' },
  accountButton: {
    marginTop: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  accountLabel: { fontSize: 18, fontWeight: '700', color: '#4C1D95' },
  pressed: { opacity: 0.85 },
});
