import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { MockPronunciationProvider } from './MockPronunciationProvider';
import { PronunciationResultView } from './PronunciationResultView';
import { RecordButton } from './RecordButton';
import { usePronunciationRecorder } from './usePronunciationRecorder';
import {
  SPEECH_LOCALE,
  type PronunciationProvider,
  type PronunciationResult,
  type SpeakingLanguage,
} from './types';

export interface SpeakingPracticeProps {
  /** Câu / từ mẫu bé cần đọc theo, lấy từ content pack của bài học. */
  targetText: string;
  /** Phiên âm / gợi ý hiển thị kèm (pinyin, romaji, IPA...), không bắt buộc. */
  hintText?: string;
  language: SpeakingLanguage;
  /**
   * Provider chấm điểm. Mặc định là MockPronunciationProvider (offline).
   * Khi có dịch vụ thật, truyền provider thật vào đây — UI không cần sửa.
   */
  provider?: PronunciationProvider;
  /** Gọi khi chấm xong, ví dụ để cộng XP / lưu tiến độ trong store của app. */
  onAssessed?: (result: PronunciationResult) => void;
}

/**
 * Màn hình luyện nói hoàn chỉnh cho một câu mẫu:
 *  1. Bé bấm "Nghe mẫu" (expo-speech đọc câu mẫu, chậm rãi)
 *  2. Bé bấm nút micro và đọc theo
 *  3. App chấm (provider), hiện sao + lời khen + nút nghe lại giọng của mình
 *
 * Dùng độc lập để test, hoặc nhúng vào màn hình bài học hiện có của Piglingo Kids
 * (xem INTEGRATION.md, mục "Nối vào màn hình bài học").
 */
export function SpeakingPracticeScreen({
  targetText,
  hintText,
  language,
  provider,
  onAssessed,
}: SpeakingPracticeProps) {
  const assessor = useMemo<PronunciationProvider>(
    () => provider ?? new MockPronunciationProvider(),
    [provider],
  );
  const recorder = usePronunciationRecorder();
  const [isAssessing, setIsAssessing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);

  const speakSample = useCallback(() => {
    Speech.stop();
    Speech.speak(targetText, {
      language: SPEECH_LOCALE[language],
      rate: 0.82, // đọc chậm hơn bình thường cho bé nghe rõ
      pitch: 1.0,
    });
  }, [language, targetText]);

  const handleStart = useCallback(async () => {
    setResult(null);
    await recorder.startRecording();
  }, [recorder]);

  const handleStop = useCallback(async () => {
    const recorded = await recorder.stopRecording();
    if (!recorded) return;
    setIsAssessing(true);
    try {
      const assessed = await assessor.assess({
        targetText,
        language,
        audioUri: recorded.uri,
        durationMillis: recorded.durationMillis,
      });
      setResult(assessed);
      onAssessed?.(assessed);
    } finally {
      setIsAssessing(false);
    }
  }, [assessor, language, onAssessed, recorder, targetText]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Luyện nói 🎧</Text>

      <View style={styles.targetCard}>
        <Text style={styles.targetText}>{targetText}</Text>
        {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={speakSample}
        style={({ pressed }: { pressed: boolean }) => [styles.listenButton, pressed && styles.pressed]}
      >
        <Text style={styles.listenLabel}>🔊 Nghe mẫu</Text>
      </Pressable>

      <RecordButton
        isRecording={recorder.isRecording}
        durationMillis={recorder.durationMillis}
        disabled={isAssessing}
        onStart={() => void handleStart()}
        onStop={() => void handleStop()}
      />

      {recorder.recordingUri && !recorder.isRecording ? (
        <Pressable
          accessibilityRole="button"
          onPress={recorder.playRecording}
          style={({ pressed }: { pressed: boolean }) => [styles.playbackButton, pressed && styles.pressed]}
        >
          <Text style={styles.playbackLabel}>▶️ Nghe lại giọng của con</Text>
        </Pressable>
      ) : null}

      {isAssessing ? <Text style={styles.status}>Đang nghe con đọc… ⏳</Text> : null}
      {recorder.errorMessage ? <Text style={styles.error}>{recorder.errorMessage}</Text> : null}
      {result ? <PronunciationResultView result={result} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18, alignItems: 'stretch' },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#1B1B1B' },
  targetCard: {
    backgroundColor: '#E6F4FE',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  targetText: { fontSize: 34, fontWeight: '800', textAlign: 'center', color: '#0B4F8A' },
  hintText: { fontSize: 20, color: '#3D6E99' },
  listenButton: {
    backgroundColor: '#FFB020',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  listenLabel: { fontSize: 24, fontWeight: '800', color: '#4A2E00' },
  playbackButton: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playbackLabel: { fontSize: 20, fontWeight: '700', color: '#4C1D95' },
  pressed: { opacity: 0.85 },
  status: { fontSize: 18, textAlign: 'center', color: '#555555' },
  error: { fontSize: 16, textAlign: 'center', color: '#B3261E' },
});
