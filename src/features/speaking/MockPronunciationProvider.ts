import {
  feedbackForScore,
  scoreToStars,
  type PronunciationProvider,
  type PronunciationRequest,
  type PronunciationResult,
  type WordScore,
} from './types';

/**
 * Provider chấm phát âm MÔ PHỎNG — chạy hoàn toàn offline, không gửi âm thanh đi đâu.
 *
 * ⚠️ Đây KHÔNG phải chấm phát âm thật: máy không nghe được bé nói gì.
 * Điểm số được suy ra một cách xác định (deterministic) từ:
 *  - thời lượng ghi âm so với thời lượng đọc mẫu ước lượng, và
 *  - một hàm băm đơn giản của (câu mẫu + thời lượng) để điểm từng từ có
 *    dao động nhẹ nhưng ổn định giữa các lần chạy cùng một đầu vào.
 *
 * Mục đích: cho bé và phụ huynh thấy trọn luồng "nghe mẫu → ghi âm → có sao/khen"
 * ngay ở Bước 2, và để sẵn đúng interface để sau này thay bằng provider thật
 * (Tencent / iFlytek / Azure Speech — cần tài khoản + credential riêng).
 */
export class MockPronunciationProvider implements PronunciationProvider {
  readonly name = 'mock';

  async assess(request: PronunciationRequest): Promise<PronunciationResult> {
    const tokens = tokenize(request.targetText, request.language);
    const expectedMillis = estimateExpectedMillis(tokens.length, request.language);
    const durationRatio =
      expectedMillis > 0 ? request.durationMillis / expectedMillis : 0;

    // Đọc quá nhanh (bỏ từ) hoặc quá chậm (dừng quá lâu) đều bị trừ điểm trôi chảy.
    const fluency = clamp(Math.round(100 - Math.abs(1 - durationRatio) * 70));
    // Độ đầy đủ: ghi âm quá ngắn so với câu mẫu thì coi như chưa đọc hết.
    const completeness = clamp(Math.round(Math.min(1, durationRatio + 0.25) * 100));

    const wordScores: WordScore[] = tokens.map((word, index) => {
      const seed = hashString(`${request.targetText}|${word}|${index}|${request.durationMillis}`);
      // Điểm từng từ dao động 55–98, neo quanh mức trôi chảy để tổng thể nhất quán.
      const score = clamp(Math.round(fluency * 0.6 + 40 + (seed % 44) - 8));
      return { word, score };
    });

    const wordAverage =
      wordScores.length > 0
        ? wordScores.reduce((sum, item) => sum + item.score, 0) / wordScores.length
        : fluency;
    const accuracy = clamp(Math.round(wordAverage));
    const overallScore = clamp(
      Math.round(accuracy * 0.5 + fluency * 0.3 + completeness * 0.2),
    );

    // Giả lập độ trễ mạng/xử lý rất ngắn để UI kịp hiển thị trạng thái "đang chấm".
    await delay(350);

    return {
      overallScore,
      stars: scoreToStars(overallScore),
      accuracy,
      fluency,
      completeness,
      wordScores,
      feedbackVi: feedbackForScore(overallScore),
      providerName: this.name,
      isSimulated: true,
    };
  }
}

/** Tách câu mẫu thành "từ" để chấm: Anh tách theo khoảng trắng, Nhật/Trung tách theo ký tự. */
function tokenize(text: string, language: PronunciationRequest['language']): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (language === 'en') {
    return trimmed.split(/\s+/).filter(Boolean);
  }
  // Tiếng Nhật / Trung không có khoảng trắng giữa các từ: tách theo ký tự hiển thị.
  return Array.from(trimmed.replace(/\s+/g, ''));
}

/** Ước lượng thời gian đọc mẫu: Anh ~450ms/từ, Nhật/Trung ~400ms/ký tự, tối thiểu 800ms. */
function estimateExpectedMillis(tokenCount: number, language: PronunciationRequest['language']): number {
  const perToken = language === 'en' ? 450 : 400;
  return Math.max(800, tokenCount * perToken);
}

/** Băm chuỗi đơn giản (FNV-1a rút gọn) — chỉ để tạo dao động điểm ổn định, không dùng cho bảo mật. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
