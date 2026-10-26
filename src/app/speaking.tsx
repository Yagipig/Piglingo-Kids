/**
 * Route luyện nói (/speaking) — tích hợp Bước 2.
 *
 * Khác bản demo trong src/app-examples/ (câu mẫu cố định tiếng Anh), route này
 * lấy câu mẫu từ CHÍNH khóa học bé đang học: từ đầu tiên của khóa hiện tại
 * trong content pack (target = câu/từ mẫu, native = nghĩa tiếng Việt làm
 * gợi ý, romanization nếu có được nối vào gợi ý), ngôn ngữ suy ra từ mã khóa
 * en-vi / ja-vi / zh-vi -> en / ja / zh.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SpeakingPracticeScreen } from '@/features/speaking/SpeakingPracticeScreen';
import type { SpeakingLanguage } from '@/features/speaking/types';
import { useCourseContent } from '@/lib/content';
import { useProgress } from '@/lib/store';

const COURSE_TO_LANGUAGE: Record<string, SpeakingLanguage> = {
  'en-vi': 'en',
  'ja-vi': 'ja',
  'zh-vi': 'zh',
};

export default function SpeakingRoute() {
  const activeCourseId = useProgress((s) => s.activeCourseId);
  const { allWords } = useCourseContent(activeCourseId);
  const words = allWords();
  const sample = words[0];
  const language = COURSE_TO_LANGUAGE[activeCourseId] ?? 'en';

  if (!sample) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Khóa học này chưa có từ nào để luyện nói. Con chọn khóa khác nhé!
        </Text>
      </View>
    );
  }

  const hintText = sample.romanization
    ? `${sample.romanization} · ${sample.native}`
    : sample.native;

  return (
    <SpeakingPracticeScreen
      targetText={sample.target}
      hintText={hintText}
      language={language}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 17, color: '#555555', textAlign: 'center' },
});
