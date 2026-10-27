import type { LandKind } from "./theme";
import type { UnitPack } from "./types";

/**
 * "Nhà Thám Hiểm Nhí" — ánh xạ thuần hiển thị từ unit học sang "vùng đất
 * phiêu lưu". File này KHÔNG chứa dữ liệu học: title/description/words của
 * unit vẫn lấy nguyên từ pack; ở đây chỉ quyết định vùng đất trông thế nào
 * (tên đảo, emoji cảnh, câu giới thiệu, tông màu banner).
 *
 * Tên vùng đất là tên các ĐẢO THẬT của Việt Nam, gán theo thứ tự unit
 * trong từng khóa (Anh → Nhật → Trung). `kind` chỉ còn vai trò khóa chọn
 * tông màu banner trong `landPalette` (luân phiên để bản đồ nhiều màu
 * sắc) — mọi unit đều là đảo.
 *
 * Tra cứu theo (courseId, unitId) trước theo bảng cụ thể, sau đó theo
 * tiêu đề chủ đề chuẩn hoá, cuối cùng fallback an toàn cho unit lạ.
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

function makeLand(
  kind: LandKind,
  name: string,
  emoji?: string,
  tagline?: string,
  variant: 1 | 2 = 1,
): Land {
  return {
    kind,
    name,
    emoji: emoji ?? LAND_INFO[kind].emoji,
    tagline: tagline ?? LAND_INFO[kind].tagline,
    variant,
  };
}

/**
 * Ánh xạ chính xác theo từng unit id — mỗi unit là một đảo thật của
 * Việt Nam, theo thứ tự unit trong khóa. Tông màu (kind) luân phiên
 * giữa các đảo kề nhau để bản đồ vẫn rực rỡ nhiều màu.
 */
const BY_UNIT_ID: Record<string, Land> = {
  // en-vi — Tiếng Anh
  "en-vi:unit-1": makeLand("island", "Đảo Phú Quốc", "🏝️", "Đảo ngọc nắng vàng, biển xanh cát trắng"),
  "en-vi:unit-2": makeLand("forest", "Đảo Cát Bà", "🌴", "Đảo xanh rừng biển, kề bên vịnh Lan Hạ"),
  "en-vi:unit-3": makeLand("ocean", "Côn Đảo", "🐢", "Nơi rùa biển ghé về đẻ trứng mỗi mùa"),
  "en-vi:unit-4": makeLand("mountain", "Đảo Lý Sơn", "🌋", "Đảo tỏi thơm lừng trên miệng núi lửa xưa"),
  "en-vi:unit-5": makeLand("valley", "Đảo Cô Tô", "🐚", "Bãi biển trong veo, hải âu bay lượn"),
  "en-vi:unit-6": makeLand("meadow", "Đảo Phú Quý", "🦐", "Đảo xa gió lành, hải sản tươi ngon"),
  "en-vi:unit-7": makeLand("village", "Quần đảo Nam Du", "⛵", "Chùm đảo nhỏ xinh giữa biển khơi"),
  "en-vi:unit-8": makeLand("castle", "Cù Lao Chàm", "🪸", "Rạn san hô rực rỡ dưới làn nước xanh"),
  "en-vi:unit-9": makeLand("island", "Hòn Tre", "🎋", "Hòn đảo xanh mát cạnh phố biển Nha Trang"),
  "en-vi:unit-10": makeLand("ocean", "Đảo Bạch Long Vĩ", "🐉", "Hòn đảo xa nhất của vịnh Bắc Bộ"),
  "en-vi:unit-11": makeLand("forest", "Đảo Thổ Chu", "🌅", "Đảo tiền tiêu nơi cực Tây Nam Tổ quốc"),
  "en-vi:unit-12": makeLand("island", "Đảo Tuần Châu", "🏝️", "Cổng ngọc mở vào vịnh Hạ Long kỳ vĩ"),
  "en-vi:unit-13": makeLand("valley", "Đảo Ti Tốp", "🏖️", "Đảo nhỏ giữa vịnh Hạ Long"),
  "en-vi:unit-14": makeLand("ocean", "Hòn Gầm Ghì", "🪸", "Rạn san hô rực rỡ ở phía nam đảo Phú Quốc"),
  "en-vi:unit-15": makeLand("mountain", "Quần Đảo Hải Tặc", "🏴‍☠️", "Quần đảo nghe tên đã muốn phiêu lưu"),
  "en-vi:unit-16": makeLand("island", "Cồn Cỏ", "🏝️", "Hòn đảo anh hùng giữa biển Quảng Trị"),
  "en-vi:unit-17": makeLand("forest", "Đảo Cái Chiên", "🐚", "Đảo nhỏ yên bình ở vùng biển Quảng Ninh"),
  "en-vi:unit-18": makeLand("ocean", "Đảo Bản Sen", "🌿", "Hòn đảo xanh trong quần đảo Vân Đồn"),
  "en-vi:unit-19": makeLand("valley", "Hòn Mê", "🌊", "Cụm đảo xanh ngoài khơi Thanh Hóa"),
  "en-vi:unit-20": makeLand("meadow", "Đảo Sơn Chà", "⛰️", "Hòn đảo nhỏ dưới chân đèo Hải Vân"),
  "en-vi:unit-21": makeLand("village", "Hòn Khô", "🪸", "Hòn đảo hoang sơ gần Quy Nhơn, biển trong veo"),
  // ja-vi — Tiếng Nhật
  "ja-vi:unit-1": makeLand("meadow", "Đảo Quan Lạn", "🏖️", "Bãi cát trắng dài, nước biển trong xanh"),
  "ja-vi:unit-2": makeLand("island", "Đảo Ngọc Vừng", "🦪", "Đảo ngọc trai lấp lánh trong vịnh Bái Tử Long"),
  "ja-vi:unit-3": makeLand("ocean", "Đảo Vĩnh Thực", "🌊", "Đảo hoang sơ nơi địa đầu Tổ quốc"),
  "ja-vi:unit-4": makeLand("forest", "Đảo Thanh Lân", "🦀", "Hòn đảo hiền hòa giữa quần đảo Cô Tô"),
  "ja-vi:unit-5": makeLand("village", "Đảo Cái Bầu", "🛶", "Đảo lễ hội, thuyền bè về rộn ràng"),
  "ja-vi:unit-6": makeLand("mountain", "Hòn Dấu", "⚓", "Hải đăng trăm tuổi soi đường tàu biển"),
  "ja-vi:unit-7": makeLand("valley", "Hòn Chuối", "🍌", "Hòn đảo nhỏ mang tên trái chuối quê nhà"),
  "ja-vi:unit-8": makeLand("meadow", "Hòn Khoai", "🥔", "Hòn đảo xanh mang tên củ khoai thân thương"),
  "ja-vi:unit-9": makeLand("island", "Hòn Sơn", "🥥", "Đảo dừa xanh mát giữa biển Kiên Giang"),
  "ja-vi:unit-10": makeLand("castle", "Đảo Bình Ba", "🦞", "Đảo tôm hùm nổi tiếng gần vịnh Cam Ranh"),
  "ja-vi:unit-11": makeLand("ocean", "Đảo Bình Hưng", "🪸", "Đảo nhỏ nước trong, san hô ngay dưới chân"),
  "ja-vi:unit-12": makeLand("island", "Hòn Phụ Tử", "🪨", "Khối đá cha con đứng giữa biển trời Kiên Giang"),
  "ja-vi:unit-13": makeLand("forest", "Cù Lao Câu", "🐢", "Đảo nhỏ hoang sơ, rùa biển ghé về đẻ trứng"),
  "ja-vi:unit-14": makeLand("valley", "Đảo Long Sơn", "🦪", "Làng bè nuôi hàu yên bình gần Vũng Tàu"),
  "ja-vi:unit-15": makeLand("castle", "Hòn Bà", "🌺", "Hòn đảo nhỏ mang bao câu chuyện dân gian ven biển"),
  "ja-vi:unit-16": makeLand("island", "Hòn Rái", "🦦", "Hòn đảo nhỏ trong quần đảo Nam Du"),
  "ja-vi:unit-17": makeLand("forest", "Hòn Đốc", "🌴", "Hòn đảo thuộc quần đảo Hải Tặc xưa"),
  "ja-vi:unit-18": makeLand("ocean", "Hòn Bảy Cạnh", "🐢", "Nơi rùa biển lên đẻ trứng ở Côn Đảo"),
  "ja-vi:unit-19": makeLand("mountain", "Hòn Tranh", "🏖️", "Bãi biển đẹp của đảo Phú Quý"),
  "ja-vi:unit-20": makeLand("valley", "Đảo Trần", "🌅", "Hòn đảo tiền tiêu vùng biển Quảng Ninh"),
  "ja-vi:unit-21": makeLand("meadow", "Hòn La", "🐚", "Hòn đảo nhỏ hiền hòa ngoài khơi Quảng Bình"),
  // zh-vi — Tiếng Trung
  "zh-vi:unit-1": makeLand("ocean", "Hòn Mun", "🐠", "Khu bảo tồn biển, cá bơi từng đàn"),
  "zh-vi:unit-2": makeLand("valley", "Hòn Tằm", "🦋", "Hòn đảo xanh mềm mại như dải lụa"),
  "zh-vi:unit-3": makeLand("meadow", "Cù Lao Xanh", "🌱", "Hòn đảo xanh non giữa biển Bình Định"),
  "zh-vi:unit-4": makeLand("forest", "Đảo Khỉ", "🐒", "Vương quốc của những chú khỉ tinh nghịch"),
  "zh-vi:unit-5": makeLand("mountain", "Đảo Yến", "🪺", "Nơi chim yến làm tổ trên vách đá"),
  "zh-vi:unit-6": makeLand("island", "Đảo Diệp Sơn", "🚶", "Con đường cát giữa biển hiện ra khi nước rút"),
  "zh-vi:unit-7": makeLand("village", "Hòn Nghệ", "🎨", "Hòn đảo nhỏ mang tên nghề khéo tay"),
  "zh-vi:unit-8": makeLand("meadow", "Hòn Heo", "🐷", "Hòn đảo mang tên chú heo dễ thương"),
  "zh-vi:unit-9": makeLand("castle", "Quần đảo Trường Sa", "🇻🇳", "Quần đảo thiêng liêng nơi đầu sóng ngọn gió"),
  "zh-vi:unit-10": makeLand("island", "Quần đảo Hoàng Sa", "🇻🇳", "Quần đảo quê hương giữa Biển Đông"),
  "zh-vi:unit-11": makeLand("forest", "Đảo Ó", "🦅", "Hòn đảo xanh yên bình giữa biển Quảng Ninh"),
  "zh-vi:unit-12": makeLand("ocean", "Đảo Cống Tây", "🌿", "Đảo xanh hoang sơ trong vịnh Bái Tử Long"),
  "zh-vi:unit-13": makeLand("mountain", "Hòn Rơm", "🌾", "Bãi biển cát vàng nổi tiếng ở Mũi Né"),
  "zh-vi:unit-14": makeLand("valley", "Đảo Mắt Rồng", "🐉", "Hòn đảo có hồ nước tròn như mắt rồng"),
  "zh-vi:unit-15": makeLand("island", "Hòn Gió", "💨", "Hòn đảo lộng gió giữa biển Bình Định"),
  "zh-vi:unit-16": makeLand("forest", "Hòn Nẹ", "🌴", "Hòn đảo xanh ngoài khơi Thanh Hóa"),
  "zh-vi:unit-17": makeLand("ocean", "Hòn Ông Căn", "🛶", "Hòn đảo nhỏ yên bình ở vùng biển Bình Định"),
  "zh-vi:unit-18": makeLand("mountain", "Hòn Giang", "🌊", "Hòn đảo nhỏ trong vịnh Nha Phu"),
  "zh-vi:unit-19": makeLand("valley", "Hòn Cau", "🪸", "Hòn đảo nhỏ xinh thuộc vùng biển Bình Thuận"),
  "zh-vi:unit-20": makeLand("castle", "Hòn Sẹo", "🏝️", "Hòn đảo hoang sơ với bãi biển hình vòng cung"),
};

/** Tra theo chủ đề (tiêu đề chuẩn hoá, bỏ hậu tố số) — dự phòng cho unit mới. */
const BY_TOPIC: { match: string; land: Land }[] = [
  { match: "con vật", land: makeLand("island", "Đảo Bạn Thú", "🐢", "Nơi muôn thú rủ nhau học nói") },
  { match: "màu sắc", land: makeLand("valley", "Đảo Cầu Vồng", "🌈", "Sắc màu rực rỡ khắp hòn đảo") },
  { match: "gia đình", land: makeLand("village", "Đảo Sum Vầy", "🛖", "Hòn đảo ấm áp của cả gia đình") },
  { match: "đồ ăn", land: makeLand("island", "Đảo Ẩm Thực", "🍍", "Hòn đảo thơm ngon của bao món quà biển") },
  { match: "thức ăn", land: makeLand("island", "Đảo Ẩm Thực", "🍍", "Hòn đảo thơm ngon của bao món quà biển") },
  { match: "con số", land: makeLand("mountain", "Đảo Con Số", "🐚", "Đếm sao biển và vỏ sò thật vui") },
  { match: "số đếm", land: makeLand("mountain", "Đảo Con Số", "🐚", "Đếm sao biển và vỏ sò thật vui") },
  { match: "trường học", land: makeLand("castle", "Đảo Tri Thức", "🌴", "Hòn đảo của những bạn nhỏ ham học") },
  { match: "chào hỏi", land: makeLand("village", "Đảo Chào Hỏi", "🌅", "Bình minh mới, lời chào mới") },
  { match: "hiragana", land: makeLand("island", "Đảo Chữ Cái", "🏝️", "Những chữ cái đầu tiên bé làm quen") },
  { match: "katakana", land: makeLand("island", "Đảo Chữ Mới", "🏝️", "Thêm những chữ cái mới thật thú vị") },
  { match: "từ đầu tiên", land: makeLand("meadow", "Đảo Đầu Tiên", "🌼", "Nơi những từ đầu tiên nảy mầm") },
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
        return { ...entry.land, variant: 2 };
      }
      return entry.land;
    }
  }
  return makeLand("meadow", unit.title);
}
