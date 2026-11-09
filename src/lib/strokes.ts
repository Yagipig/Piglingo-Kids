/**
 * Dữ liệu THỨ TỰ NÉT THẬT cho Luyện Viết — trích gọn đúng các chữ có
 * trong từ vựng của hai khóa zh-vi / ja-vi (sinh bởi
 * scripts/build-strokes.mjs, KHÔNG bịa dữ liệu):
 *
 * - zh-vi: Hanzi Writer data (hanzi-writer-data) — dữ liệu nét xây từ
 *   phông chữ Arphic, giấy phép Arphic Public License; toạ độ đã chuẩn
 *   hoá về hộp bao riêng của từng chữ (trục Y đã lật về hệ SVG).
 * - ja-vi: KanjiVG (https://kanjivg.tagaini.net) — giấy phép Creative
 *   Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0); toạ độ gốc
 *   109x109, nét theo đúng thứ tự s1, s2, ... của KanjiVG.
 *
 * Khóa en-vi không có dữ liệu nét (bảng chữ Latin không dùng thứ tự
 * nét kiểu này) — Luyện Viết của Anh dùng dạng chính tả thay thế.
 */
import jaStrokesJson from "../content/strokes-ja.json";
import zhStrokesJson from "../content/strokes-zh.json";

export type StrokeCharData = {
  /** Bề rộng hộp vẽ (đơn vị viewBox). */
  w: number;
  /** Bề cao hộp vẽ (đơn vị viewBox). */
  h: number;
  /** Path SVG của từng nét, ĐÚNG thứ tự viết. */
  strokes: string[];
};

const ZH_STROKES = zhStrokesJson as Record<string, StrokeCharData>;
const JA_STROKES = jaStrokesJson as Record<string, StrokeCharData>;

const BY_COURSE: Record<string, Record<string, StrokeCharData>> = {
  "zh-vi": ZH_STROKES,
  "ja-vi": JA_STROKES,
};

/** Dữ liệu nét của một chữ trong một khóa; không có -> null. */
export function strokeDataFor(courseId: string, char: string): StrokeCharData | null {
  return BY_COURSE[courseId]?.[char] ?? null;
}

/** Khóa này có dữ liệu nét thật hay không (zh/ja có, en không). */
export function courseHasStrokeData(courseId: string): boolean {
  return courseId in BY_COURSE;
}

/** Ghi công nguồn dữ liệu nét, hiện ở cuối màn Luyện Viết. */
export function strokeAttribution(courseId: string): string | null {
  if (courseId === "zh-vi") {
    return "Thứ tự nét tiếng Trung: dữ liệu Hanzi Writer (chữ Arphic, giấy phép Arphic Public License).";
  }
  if (courseId === "ja-vi") {
    return "Thứ tự nét tiếng Nhật: dữ liệu KanjiVG (kanjivg.tagaini.net), giấy phép CC BY-SA 3.0.";
  }
  return null;
}
