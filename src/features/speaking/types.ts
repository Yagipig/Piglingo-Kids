/**
 * Kiểu dữ liệu dùng chung cho tính năng luyện nói / chấm phát âm (Bước 2).
 *
 * Thiết kế "provider" tách riêng phần ghi âm khỏi phần chấm điểm:
 * hôm nay dùng MockPronunciationProvider (offline, mô phỏng), sau này chỉ cần
 * thay bằng provider thật (Tencent / iFlytek / Azure Speech) mà không sửa UI.
 */

/** Ba ngôn ngữ học trong Piglingo Kids. Khớp với mã khóa học en-vi / ja-vi / zh-vi. */
export type SpeakingLanguage = 'en' | 'ja' | 'zh';

/** Ánh xạ sang mã ngôn ngữ BCP 47 để truyền cho expo-speech (TTS). */
export const SPEECH_LOCALE: Record<SpeakingLanguage, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

/** Thông tin một lượt ghi âm đã hoàn tất, đầu vào cho bước chấm điểm. */
export interface PronunciationRequest {
  /** Câu / từ mẫu mà bé cần đọc theo. */
  targetText: string;
  /** Ngôn ngữ của câu mẫu. */
  language: SpeakingLanguage;
  /** Đường dẫn file ghi âm trên máy (recorder.uri của expo-audio), có thể null trên web. */
  audioUri: string | null;
  /** Thời lượng ghi âm tính bằng mili-giây. */
  durationMillis: number;
}

/** Điểm của từng từ trong câu mẫu. */
export interface WordScore {
  word: string;
  /** Điểm 0–100. */
  score: number;
}

/** Kết quả chấm phát âm trả về từ một PronunciationProvider. */
export interface PronunciationResult {
  /** Điểm tổng 0–100. */
  overallScore: number;
  /** Số sao 0–3 suy ra từ điểm tổng, dùng để khen bé. */
  stars: 0 | 1 | 2 | 3;
  /** Điểm chi tiết: độ chính xác, độ trôi chảy, độ đầy đủ (đều 0–100). */
  accuracy: number;
  fluency: number;
  completeness: number;
  /** Điểm từng từ (với tiếng Nhật/Trung, provider mock tách theo ký tự). */
  wordScores: WordScore[];
  /** Nhận xét ngắn bằng tiếng Việt, tích cực, dành cho bé. */
  feedbackVi: string;
  /** Tên provider đã chấm, ví dụ "mock". Provider thật nên ghi rõ tên dịch vụ. */
  providerName: string;
  /** true nếu đây là điểm mô phỏng, UI phải hiển thị nhãn "điểm luyện tập". */
  isSimulated: boolean;
}

/**
 * Hợp đồng mà mọi dịch vụ chấm phát âm phải tuân theo.
 * Provider thật cần gửi `request.audioUri` lên máy chủ chấm điểm và
 * trả về đúng cấu trúc PronunciationResult này.
 */
export interface PronunciationProvider {
  readonly name: string;
  assess(request: PronunciationRequest): Promise<PronunciationResult>;
}

/** Quy đổi điểm 0–100 thành 0–3 sao. */
export function scoreToStars(score: number): 0 | 1 | 2 | 3 {
  if (score >= 85) return 3;
  if (score >= 65) return 2;
  if (score >= 45) return 1;
  return 0;
}

/** Nhận xét tiếng Việt mặc định theo mốc điểm, dùng chung cho các provider. */
export function feedbackForScore(score: number): string {
  if (score >= 85) return 'Tuyệt vời! Con đọc rất rõ và đúng. 🌟';
  if (score >= 65) return 'Tốt lắm! Con đọc gần đúng rồi, nghe mẫu và thử lại một lần nữa nhé.';
  if (score >= 45) return 'Con đã cố gắng rồi! Nghe mẫu thật chậm rồi đọc theo nhé.';
  return 'Không sao đâu, mình nghe mẫu và đọc từng từ một nhé. Con làm được!';
}
