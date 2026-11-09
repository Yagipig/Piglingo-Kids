/**
 * Dữ liệu từ điển BỔ SUNG (Đợt 1 tích hợp nguồn mở) — chỉ là metadata /
 * dữ liệu tra cứu cộng thêm cho từ vựng sẵn có của app, trích subset từ
 * các nguồn mở đúng theo từ vựng của từng khóa:
 *
 * - en-vi: ipa-dict en_US (MIT) + ECDICT (MIT) + CEFR-J Wordlist v1.6
 *   (Tono Laboratory) + NGSL 1.2 / New Dolch List (CC BY-SA 4.0).
 * - zh-vi: CC-CEDICT qua MDBG (CC BY-SA 4.0) + mapping HSK
 *   (drkameleon/complete-hsk-vocabulary, MIT) + wordfreq (CC BY-SA 4.0).
 * - ja-vi: nhãn JLPT của Tanos / Jonathan Waller (CC BY — ƯỚC LƯỢNG
 *   cộng đồng, JLPT không công bố danh sách chính thức) + wordfreq +
 *   JMdict/KANJIDIC2 của EDRDG (CC BY-SA 4.0; cách đọc + nghĩa Anh là
 *   tra cứu phụ) + pitch accent của kanjium (CC BY-SA 4.0).
 * - Ký tự: Unicode Unihan 18.0 (Unicode License v3).
 * - Câu ví dụ: Tatoeba (CC BY 2.0 FR / một phần CC0) — chỉ các câu đã
 *   qua lọc máy VÀ điều phối viên đọc duyệt tay 100% mới nằm trong
 *   src/content/examples.json (mỗi câu giữ id + tác giả + giấy phép).
 *
 * Quy tắc hợp nhất: dữ liệu ở đây KHÔNG BAO GIỜ ghi đè nội dung của
 * app (nghĩa tiếng Việt `native`, pinyin/romaji `romanization` trong
 * pack vẫn là chính thức). Phần CC-CEDICT chỉ là tra cứu phụ (pinyin
 * đối chiếu, nghĩa tiếng Anh tham khảo). Từ không khớp nguồn nào thì
 * các hàm dưới đây trả về undefined — không bịa dữ liệu.
 * Ghi công đầy đủ: màn "Nguồn dữ liệu & Giấy phép" (route /data-sources),
 * provenance: scripts/lexicon-sources-en.md + lexicon-sources-cjk.md.
 */
import enData from "../content/lexicon/en.json";
import jaData from "../content/lexicon/ja.json";
import zhData from "../content/lexicon/zh.json";
import charsJaData from "../content/lexicon/chars-ja.json";
import charsZhData from "../content/lexicon/chars-zh.json";
import kanjidicJaData from "../content/lexicon/kanjidic-ja.json";
import examplesData from "../content/examples.json";

export type EnLexEntry = {
  ipa?: string;
  cefr?: string;
  dolch?: boolean;
  ngslRank?: number;
  /** Hạng tần suất COCA trong ECDICT (nhỏ = càng phổ biến). */
  frq?: number;
  /** Định nghĩa tiếng Anh tham khảo (ECDICT) — tra cứu phụ. */
  gloss?: string;
};

export type ZhLexEntry = {
  hsk?: number;
  /** Pinyin dạng dấu của CC-CEDICT — chỉ để đối chiếu/tra cứu phụ. */
  pinyin?: string;
  /** Nghĩa tiếng Anh tham khảo của CC-CEDICT — tra cứu phụ. */
  gloss?: string;
  trad?: string;
  /** Điểm tần suất Zipf của wordfreq (lớn = càng phổ biến). */
  zipf?: number;
};

export type JaLexEntry = {
  /** Cấp JLPT ước lượng cộng đồng (Tanos) — không phải danh sách chính thức. */
  jlpt?: string;
  zipf?: number;
  /** Cách đọc kana trong JMdict khi khác/chưa thể suy từ target. */
  jmReading?: string;
  /** Nghĩa tiếng Anh tham khảo trong JMdict (EDRDG) — tra cứu phụ. */
  jmGloss?: string;
  /** Vị trí mora rơi (pitch accent) của kanjium; 0 là hợp lệ (heiban). */
  pitch?: number;
  /** Kana đã dùng để khớp pitch accent một cách chắc chắn. */
  pitchReading?: string;
};

export type KanjidicEntry = {
  on?: string[];
  kun?: string[];
  gloss: string;
  strokes: number;
};

export type CharInfo = {
  def?: string;
  strokes?: number;
  radical?: number;
  reading?: string;
};

const EN = enData as Record<string, EnLexEntry>;
const ZH = zhData as Record<string, ZhLexEntry>;
const JA = jaData as Record<string, JaLexEntry>;
const CHARS_ZH = charsZhData as Record<string, CharInfo>;
const CHARS_JA = charsJaData as Record<string, CharInfo>;
const KANJIDIC_JA = kanjidicJaData as Record<string, KanjidicEntry>;

export type ExampleSentence = {
  id: number;
  text: string;
  author: string;
  license: string;
  reviewStatus: string;
  reviewed: boolean;
};

const EXAMPLES = examplesData as {
  approvedSentenceIds: number[];
  courses: Record<string, Record<string, ExampleSentence[]>>;
};

/**
 * Câu ví dụ Tatoeba ĐÃ DUYỆT TAY cho một từ; undefined nếu từ chưa có
 * câu đạt duyệt. Chỉ là phụ trợ — câu mẫu và nghĩa của app vẫn là chính.
 */
export function exampleSentence(
  courseId: string,
  target: string
): ExampleSentence | undefined {
  const key = courseId === "en-vi" ? target.toLowerCase() : target;
  return EXAMPLES.courses[courseId]?.[key]?.[0];
}

export function enrichEn(target: string): EnLexEntry | undefined {
  return EN[target.toLowerCase()];
}

export function enrichZh(target: string): ZhLexEntry | undefined {
  return ZH[target];
}

export function enrichJa(target: string): JaLexEntry | undefined {
  return JA[target];
}

/** Tra cứu bổ sung theo khóa đang học; undefined nếu từ không có dữ liệu. */
export function enrichWord(
  courseId: string,
  target: string
): EnLexEntry | ZhLexEntry | JaLexEntry | undefined {
  if (courseId === "en-vi") return enrichEn(target);
  if (courseId === "zh-vi") return enrichZh(target);
  if (courseId === "ja-vi") return enrichJa(target);
  return undefined;
}

/** Thông tin KANJIDIC2 (EDRDG) cho một kanji; kana/ký tự không có thì undefined. */
export function kanjidicInfo(char: string): KanjidicEntry | undefined {
  return KANJIDIC_JA[char];
}

/** Thông tin ký tự (Unihan) cho khóa Trung/Nhật; kana không có thì undefined. */
export function charInfo(courseId: string, char: string): CharInfo | undefined {
  if (courseId === "zh-vi") return CHARS_ZH[char];
  if (courseId === "ja-vi") return CHARS_JA[char];
  return undefined;
}

/**
 * Điểm tần suất dùng để ƯU TIÊN ÔN TẬP/HIỂN THỊ trong cùng một khóa
 * (số lớn = từ càng phổ biến = nên ưu tiên trước). 0 = không có dữ liệu.
 * - Anh: hạng COCA của ECDICT (frq), dự phòng hạng NGSL, từ Dolch.
 * - Trung/Nhật: điểm Zipf của wordfreq.
 * Chỉ là metadata sắp xếp — không đổi nội dung học.
 */
export function freqScore(courseId: string, target: string): number {
  if (courseId === "en-vi") {
    const e = enrichEn(target);
    if (!e) return 0;
    if (e.frq) return Math.max(1, 100_000 - e.frq);
    if (e.ngslRank) return Math.max(1, 100_000 - e.ngslRank);
    return e.dolch ? 50_000 : 0;
  }
  if (courseId === "zh-vi") return enrichZh(target)?.zipf ?? 0;
  if (courseId === "ja-vi") return enrichJa(target)?.zipf ?? 0;
  return 0;
}

/** Khóa này có từ nào mang nhãn JLPT không (để hiện ghi chú ước lượng). */
export function courseHasJlpt(courseId: string, targets: string[]): boolean {
  if (courseId !== "ja-vi") return false;
  return targets.some((t) => JA[t]?.jlpt);
}
