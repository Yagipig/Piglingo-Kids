import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PronunciationResult } from './types';

interface PronunciationResultViewProps {
  result: PronunciationResult;
}

/**
 * Hiển thị kết quả chấm: sao to cho bé, điểm chi tiết + từng từ cho bé và phụ huynh.
 * Nếu là điểm mô phỏng (mock) luôn gắn nhãn rõ ràng để không hiểu nhầm là chấm thật.
 */
export function PronunciationResultView({ result }: PronunciationResultViewProps) {
  const starsText = '⭐'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
  return (
    <View style={styles.container}>
      <Text style={styles.stars}>{starsText}</Text>
      <Text style={styles.score}>Điểm của con: {result.overallScore}/100</Text>
      <Text style={styles.feedback}>{result.feedbackVi}</Text>

      <View style={styles.detailRow}>
        <DetailItem label="Đúng âm" value={result.accuracy} />
        <DetailItem label="Trôi chảy" value={result.fluency} />
        <DetailItem label="Đọc đủ" value={result.completeness} />
      </View>

      {result.wordScores.length > 0 ? (
        <View style={styles.words}>
          {result.wordScores.map((item, index) => (
            <View
              key={`${item.word}-${index}`}
              style={[styles.wordChip, item.score >= 65 ? styles.wordGood : styles.wordRetry]}
            >
              <Text style={styles.wordText}>
                {item.word} · {item.score}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {result.isSimulated ? (
        <Text style={styles.simulatedNote}>
          Đây là điểm luyện tập mô phỏng (chưa nghe giọng thật). Chấm phát âm thật sẽ được bật khi
          nối dịch vụ chấm điểm.
        </Text>
      ) : null}
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF7E6',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFD66B',
  },
  stars: { fontSize: 40, textAlign: 'center' },
  score: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#5B3A00' },
  feedback: { fontSize: 18, textAlign: 'center', color: '#5B3A00' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  detailItem: { alignItems: 'center' },
  detailValue: { fontSize: 22, fontWeight: '800', color: '#208AEF' },
  detailLabel: { fontSize: 14, color: '#6B5B2E' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  wordChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  wordGood: { backgroundColor: '#D9F2D0' },
  wordRetry: { backgroundColor: '#FFE1E1' },
  wordText: { fontSize: 16, fontWeight: '700', color: '#333333' },
  simulatedNote: { fontSize: 13, color: '#8A6D1F', textAlign: 'center' },
});
