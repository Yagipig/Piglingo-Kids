import type { LandKind } from "./theme";
import type { UnitPack } from "./types";

/**
 * "Little Explorers" — ánh xạ thuần hiển thị từ unit học sang "vùng đất
 * phiêu lưu". File này KHÔNG chứa dữ liệu học: title/description/words của
 * unit vẫn lấy nguyên từ pack; ở đây chỉ quyết định vùng đất trông thế nào
 * (loại vùng, tên trang trí, emoji cảnh, nhãn cổng khi khóa).
 *
 * Tra cứu theo (courseId, unitId) trước theo bảng cụ thể trong plan, sau đó
 * theo tiêu đề chủ đề chuẩn hoá (cùng chủ đề → cùng loại vùng trên cả 3
 * khóa), cuối cùng fallback an toàn cho unit lạ.
 */
export type Land = {
  kind: LandKind;
  /** Tên vùng hiển thị (tiền tố trang trí, KHÔNG thay title gốc của unit). */
  name: string;
  /** Emoji đại diện vùng đất. */
  emoji: string;
  /** Câu mô tả ngắn kiểu phiêu lưu. */
  tagline: string;
  /** Biến thể "2" (chủ đề mở rộng): cùng loại vùng, tông hiển thị sâu hơn. */
  variant: 1 | 2;
};

const LAND_INFO: Record<LandKind, { emoji: string; tagline: string }> = {
  forest: { emoji: "🌲", tagline: "Rừng xanh thì thầm chào nhà thám hiểm" },
  island: { emoji: "🏝️", tagline: "Cát vàng, biển xanh và kho báu ngôn ngữ" },
  village: { emoji: "🏠", tagline: "Ngôi làng ấm áp của những người bạn" },
  ocean: { emoji: "🌊", tagline: "Sóng biển mang những chữ cái xa lạ" },
  castle: { emoji: "🏰", tagline: "Lâu đài lấp lánh của các nhà thông thái" },
  mountain: { emoji: "🏔️", tagline: "Leo càng cao, đếm càng giỏi" },
  valley: { emoji: "🌈", tagline: "Cầu vồng rực rỡ sau cơn mưa màu sắc" },
  meadow: { emoji: "🌼", tagline: "Đồng cỏ hoa nở, nơi hành trình bắt đầu" },
};

function makeLand(kind: LandKind, name: string, variant: 1 | 2 = 1): Land {
  return { kind, name, emoji: LAND_INFO[kind].emoji, tagline: LAND_INFO[kind].tagline, variant };
}

/** Ánh xạ chính xác theo từng unit id (bảng mục 2.2 của REDESIGN-PLAN). */
const BY_UNIT_ID: Record<string, Land> = {
  // en-vi
  "en-vi:unit-1": makeLand("forest", "Rừng Bạn Thú"),
  "en-vi:unit-2": makeLand("valley", "Thung Lũng Cầu Vồng"),
  "en-vi:unit-3": makeLand("village", "Làng Gia Đình"),
  "en-vi:unit-4": makeLand("island", "Đảo Ẩm Thực"),
  "en-vi:unit-5": makeLand("mountain", "Núi Số Đếm"),
  "en-vi:unit-6": makeLand("castle", "Lâu Đài Tri Thức"),
  "en-vi:unit-7": makeLand("village", "Làng Gia Đình 2", 2),
  "en-vi:unit-8": makeLand("mountain", "Núi Số Đếm 2", 2),
  "en-vi:unit-9": makeLand("valley", "Thung Lũng Cầu Vồng 2", 2),
  "en-vi:unit-10": makeLand("island", "Đảo Ẩm Thực 2", 2),
  "en-vi:unit-11": makeLand("castle", "Lâu Đài Tri Thức 2", 2),
  // ja-vi
  "ja-vi:unit-1": makeLand("island", "Đảo Hiragana"),
  "ja-vi:unit-2": makeLand("forest", "Rừng Hiragana"),
  "ja-vi:unit-3": { ...makeLand("mountain", "Núi Hiragana"), emoji: "🗻" },
  "ja-vi:unit-4": makeLand("ocean", "Đại Dương Katakana"),
  "ja-vi:unit-5": makeLand("meadow", "Đồng Cỏ Đầu Tiên"),
  "ja-vi:unit-6": { ...makeLand("village", "Cổng Làng Chào Hỏi"), emoji: "🚪" },
  "ja-vi:unit-7": makeLand("village", "Làng Gia Đình"),
  "ja-vi:unit-8": makeLand("mountain", "Núi Số Đếm"),
  "ja-vi:unit-9": makeLand("valley", "Thung Lũng Cầu Vồng"),
  "ja-vi:unit-10": makeLand("island", "Đảo Ẩm Thực"),
  "ja-vi:unit-11": makeLand("castle", "Lâu Đài Tri Thức"),
  // zh-vi
  "zh-vi:unit-1": makeLand("mountain", "Núi Con Số"),
  "zh-vi:unit-2": { ...makeLand("village", "Cổng Làng Chào Hỏi"), emoji: "🚪" },
  "zh-vi:unit-3": makeLand("village", "Làng Gia Đình"),
  "zh-vi:unit-4": makeLand("forest", "Rừng Bạn Thú"),
  "zh-vi:unit-5": makeLand("valley", "Thung Lũng Cầu Vồng"),
  "zh-vi:unit-6": makeLand("village", "Làng Gia Đình 2", 2),
  "zh-vi:unit-7": makeLand("mountain", "Núi Số Đếm 2", 2),
  "zh-vi:unit-8": makeLand("valley", "Thung Lũng Cầu Vồng 2", 2),
  "zh-vi:unit-9": makeLand("island", "Đảo Ẩm Thực 2", 2),
  "zh-vi:unit-10": makeLand("castle", "Lâu Đài Tri Thức 2", 2),
};

/** Tra theo chủ đề (tiêu đề chuẩn hoá, bỏ hậu tố số) — dự phòng cho unit mới. */
const BY_TOPIC: { match: string; land: Land }[] = [
  { match: "con vật", land: makeLand("forest", "Rừng Bạn Thú") },
  { match: "màu sắc", land: makeLand("valley", "Thung Lũng Cầu Vồng") },
  { match: "gia đình", land: makeLand("village", "Làng Gia Đình") },
  { match: "đồ ăn", land: makeLand("island", "Đảo Ẩm Thực") },
  { match: "thức ăn", land: makeLand("island", "Đảo Ẩm Thực") },
  { match: "con số", land: makeLand("mountain", "Núi Số Đếm") },
  { match: "số đếm", land: makeLand("mountain", "Núi Số Đếm") },
  { match: "trường học", land: makeLand("castle", "Lâu Đài Tri Thức") },
  {
    match: "chào hỏi",
    land: { ...makeLand("village", "Cổng Làng Chào Hỏi"), emoji: "🚪" },
  },
  { match: "hiragana", land: makeLand("island", "Đảo Hiragana") },
  { match: "katakana", land: makeLand("ocean", "Đại Dương Katakana") },
  { match: "từ đầu tiên", land: makeLand("meadow", "Đồng Cỏ Đầu Tiên") },
];

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Vùng đất của một unit. `unit` chỉ cần id + title (đúng như UnitPack).
 * Không bao giờ throw: unit lạ nhận vùng đồng cỏ mặc định với tên gốc.
 */
export function landForUnit(unit: Pick<UnitPack, "id" | "title">): Land {
  const exact = BY_UNIT_ID[unit.id];
  if (exact) return exact;

  const title = normalizeTitle(unit.title);
  const isV2 = /\s2$/.test(title);
  const baseTitle = title.replace(/\s+\d+$/, "");
  for (const entry of BY_TOPIC) {
    if (baseTitle === entry.match || baseTitle.startsWith(entry.match)) {
      if (isV2 && entry.land.variant === 1) {
        return { ...entry.land, name: `${entry.land.name} 2`, variant: 2 };
      }
      return entry.land;
    }
  }
  return makeLand("meadow", unit.title);
}
