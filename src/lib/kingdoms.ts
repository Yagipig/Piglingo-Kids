/**
 * Lớp hiển thị "vương quốc" cho ba khóa học thật của Piglingo Kids
 * (Magical Garden redesign) — THUẦN trình bày, không chứa dữ liệu học:
 *
 *   en-vi (Tiếng Anh)  → Storybook Kingdom 📖
 *   ja-vi (Tiếng Nhật) → Sakura Kingdom 🌸
 *   zh-vi (Tiếng Trung) → Lantern Kingdom 🏮
 *
 * Tiếng Việt là ngôn ngữ nền/giao diện, KHÔNG phải một khóa học, nên
 * không có "Lotus Kingdom" học tập. `approvedActivities` chỉ liệt kê
 * những hoạt động khóa thật có trong packs (xem GARDEN-PLAN mục 3) —
 * không hứa JLPT/Kanji/phonics/truyện/hội thoại riêng.
 */

export type KingdomId = "storybook" | "sakura" | "lantern";

export type KingdomPalette = {
  /** Màu nhận diện chính (viền cổng, fill tiến độ, chip). */
  primary: string;
  /** Tông đậm của màu chính (viền dưới 3D, chữ nhấn). */
  deep: string;
  /** Màu phụ theo bản sắc vương quốc. */
  secondary: string;
  /** Màu nhấn thứ ba. */
  accent: string;
  /** Nền mềm cho thẻ/chip. */
  soft: string;
  /** Màu chữ trên nền primary. */
  onPrimary: string;
};

export type Kingdom = {
  courseId: "en-vi" | "ja-vi" | "zh-vi";
  kingdomId: KingdomId;
  kingdomName: string;
  /** Tên ngôn ngữ thật lấy từ catalog (để đối chiếu, không hard-code sai). */
  targetLanguage: string;
  shortName: string;
  tagline: string;
  /** Motif trang trí chính (emoji) của vương quốc. */
  motif: string[];
  /** Thú đồng hành đại diện trong tranh cổng. */
  companion: string;
  /** Emoji hoa nở đầy của vương quốc trong scene vườn. */
  flowerEmoji: string;
  palette: KingdomPalette;
  /** Vị trí cổng trong cảnh vườn, trái → phải theo catalog. */
  scenePosition: "left" | "center" | "right";
  /** Chỉ những hoạt động khóa thật có — xem GARDEN-PLAN mục 3. */
  approvedActivities: string[];
};

export const KINGDOMS: Kingdom[] = [
  {
    courseId: "en-vi",
    kingdomId: "storybook",
    kingdomName: "Vương quốc Cổ Tích",
    targetLanguage: "Tiếng Anh",
    shortName: "Cổ Tích",
    tagline: "Lâu đài sách cổ tích giữa đồng hoa",
    motif: ["🏰", "📖", "🦉", "🐰", "🌷"],
    companion: "🦉",
    flowerEmoji: "🌷",
    palette: {
      primary: "#38BDF8",
      deep: "#0284C7",
      secondary: "#FACC15",
      accent: "#22C55E",
      soft: "#E0F2FE",
      onPrimary: "#FFFFFF",
    },
    scenePosition: "left",
    approvedActivities: [
      "Từ vựng qua hình ảnh",
      "Nghe & chọn",
      "Ghép cặp từ",
      "Xếp câu và điền câu",
      "Gõ lại từ đã học",
      "Sổ tay từ vựng và mẫu câu",
    ],
  },
  {
    courseId: "ja-vi",
    kingdomId: "sakura",
    kingdomName: "Vương quốc Hoa Anh Đào",
    targetLanguage: "Tiếng Nhật",
    shortName: "Hoa Anh Đào",
    tagline: "Cổng đỏ rực dưới tán hoa anh đào hồng",
    motif: ["🌸", "⛩️", "🗻", "🦊", "🎏"],
    companion: "🦊",
    flowerEmoji: "🌸",
    palette: {
      primary: "#F472B6",
      deep: "#DB2777",
      secondary: "#10B981",
      accent: "#F59E0B",
      soft: "#FDF2F8",
      onPrimary: "#FFFFFF",
    },
    scenePosition: "center",
    approvedActivities: [
      "Hiragana 1–3",
      "Làm quen Katakana",
      "Từ vựng đầu tiên",
      "Câu chào hằng ngày",
      "Nghe & chọn",
      "Mẫu câu đơn giản",
      "Sổ tay chữ và từ",
    ],
  },
  {
    courseId: "zh-vi",
    kingdomId: "lantern",
    kingdomName: "Vương quốc Đèn Lồng",
    targetLanguage: "Tiếng Trung",
    shortName: "Đèn Lồng",
    tagline: "Cổng đèn lồng đỏ bên lũy tre và gấu trúc",
    motif: ["🏮", "🎋", "🐼", "⛩️", "🛶"],
    companion: "🐼",
    flowerEmoji: "🌺",
    palette: {
      primary: "#DC2626",
      deep: "#991B1B",
      secondary: "#F59E0B",
      accent: "#059669",
      soft: "#FEF3C7",
      onPrimary: "#FFFFFF",
    },
    scenePosition: "right",
    approvedActivities: [
      "Chữ Hán đầu tiên",
      "Pinyin & thanh điệu qua phát âm mẫu",
      "Từ vựng qua hình ảnh",
      "Nghe & chọn",
      "Xếp câu và điền câu",
      "Câu chào và mẫu câu đơn giản",
      "Sổ tay chữ Hán – pinyin – nghĩa",
    ],
  },
];

const KINGDOM_BY_COURSE = new Map<string, Kingdom>(
  KINGDOMS.map((kingdom) => [kingdom.courseId, kingdom]),
);

/** Vương quốc của một khóa; null nếu khóa không thuộc ba khóa thật. */
export function kingdomForCourse(courseId: string): Kingdom | null {
  return KINGDOM_BY_COURSE.get(courseId) ?? null;
}

/**
 * Ảnh cổng vương quốc (đã tách nền) trong assets/images/.
 * Require để trong thân hàm với chuỗi tĩnh để Metro phân tích được,
 * đồng thời test Node của module này không phải nạp file ảnh.
 */
export function kingdomPortalImage(kingdomId: KingdomId): number {
  switch (kingdomId) {
    case "storybook":
      return require("@/assets/images/garden-portal-storybook.png");
    case "sakura":
      return require("@/assets/images/garden-portal-sakura.png");
    case "lantern":
      return require("@/assets/images/garden-portal-lantern.png");
  }
}

/** Ảnh nền cảnh vườn và cây thần tách lớp của scene trang chủ. */
export function gardenSceneImage(): number {
  return require("@/assets/images/garden-scene-bg.jpg");
}

export function gardenTreeImage(): number {
  return require("@/assets/images/garden-magic-tree.png");
}

/**
 * Vật ẩn khám phá trong scene: mỗi khóa active có đúng 3 hotspot, gắn với
 * TỪ CÓ THẬT trong pack của khóa (kiểm chứng bằng test-garden qua
 * useCourseContent().getWord). Vị trí tính theo % khung scene.
 * Chạm hotspot chỉ phát TTS + hiện bong bóng từ — không cộng tiến độ.
 */
export type GardenHotspot = {
  emoji: string;
  /** Từ đích trong pack — phải tồn tại qua getWord(). */
  target: string;
  leftPct?: number;
  rightPct?: number;
  topPct?: number;
  bottomPct?: number;
};

export const GARDEN_HOTSPOTS: Record<string, GardenHotspot[]> = {
  "en-vi": [
    { emoji: "🐦", target: "bird", leftPct: 5, topPct: 9 },
    { emoji: "🐰", target: "rabbit", leftPct: 3, bottomPct: 30 },
    { emoji: "🐟", target: "fish", rightPct: 13, bottomPct: 5 },
  ],
  "ja-vi": [
    { emoji: "🐱", target: "ねこ", leftPct: 44, bottomPct: 27 },
    { emoji: "🐶", target: "いぬ", leftPct: 33, bottomPct: 6 },
    { emoji: "🐟", target: "さかな", rightPct: 13, bottomPct: 5 },
  ],
  "zh-vi": [
    { emoji: "🐦", target: "鸟", leftPct: 5, topPct: 9 },
    { emoji: "🐼", target: "熊猫", rightPct: 5, bottomPct: 28 },
    { emoji: "🐟", target: "鱼", rightPct: 13, bottomPct: 5 },
  ],
};

export function hotspotsForCourse(courseId: string): GardenHotspot[] {
  return GARDEN_HOTSPOTS[courseId] ?? [];
}
