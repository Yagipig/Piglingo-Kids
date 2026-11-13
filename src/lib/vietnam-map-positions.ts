/**
 * Tọa độ ghim trên ẢNH BẢN ĐỒ VỆ TINH Việt Nam
 * (assets/images/vietnam-satellite-map.jpg, 646×550 — ảnh chụp bản đồ
 * vệ tinh do gia đình cung cấp 13/11/2026, đã cắt bỏ giao diện của app
 * nguồn: thanh trạng thái, chíp trên cùng và hàng nút dưới cùng).
 *
 * Khác với `Province.x/y` trong provinces.ts (tọa độ trên tranh cách
 * điệu Đại Việt cũ) và khác với dữ liệu ranh giới trong
 * province-shapes.ts (bản đồ SVG) — bộ tọa độ này CHỈ dùng cho màn
 * "Bản đồ Việt Nam" (src/app/vietnam-map.tsx) hiển thị ảnh vệ tinh
 * dạng khám phá: chạm ghim số để mở thẻ thông tin tỉnh.
 *
 * Tọa độ là tỉ lệ 0–1 theo chiều rộng/cao của ảnh đã cắt. Ảnh chụp
 * nghiêng (phần Bắc bị nén, phần Nam giãn ra) nên vị trí ghim được
 * đặt tay theo đúng hình đất liền trên ảnh và đã đối chiếu bằng ảnh
 * xem trước; các tỉnh miền Tây Nam Bộ (Tây Ninh, Đồng Tháp, An Giang)
 * nằm dưới lớp phủ sáng của ảnh gốc nhưng vẫn ở trong đường biên
 * Việt Nam trên ảnh. Tinh chỉnh tiếp khi đối chiếu trên máy thật.
 */
export type MapPosition = { x: number; y: number };

/** Ghim cho 34 tỉnh/thành — khóa là `Province.id` trong provinces.ts. */
export const SATELLITE_PROVINCE_POSITIONS: Record<string, MapPosition> = {
  "lai-chau": { x: 0.155, y: 0.075 },
  "dien-bien": { x: 0.148, y: 0.118 },
  "son-la": { x: 0.185, y: 0.135 },
  "lao-cai": { x: 0.185, y: 0.057 },
  "tuyen-quang": { x: 0.235, y: 0.085 },
  "cao-bang": { x: 0.281, y: 0.034 },
  "lang-son": { x: 0.302, y: 0.074 },
  "thai-nguyen": { x: 0.27, y: 0.1 },
  "phu-tho": { x: 0.245, y: 0.12 },
  "bac-ninh": { x: 0.3, y: 0.14 },
  "ha-noi": { x: 0.29, y: 0.158 },
  "quang-ninh": { x: 0.33, y: 0.14 },
  "hai-phong": { x: 0.305, y: 0.165 },
  "hung-yen": { x: 0.303, y: 0.172 },
  "ninh-binh": { x: 0.293, y: 0.198 },
  "thanh-hoa": { x: 0.3, y: 0.23 },
  "nghe-an": { x: 0.305, y: 0.276 },
  "ha-tinh": { x: 0.32, y: 0.311 },
  "quang-tri": { x: 0.335, y: 0.346 },
  hue: { x: 0.355, y: 0.375 },
  "da-nang": { x: 0.368, y: 0.392 },
  "quang-ngai": { x: 0.365, y: 0.426 },
  "gia-lai": { x: 0.35, y: 0.465 },
  "dak-lak": { x: 0.36, y: 0.51 },
  "khanh-hoa": { x: 0.375, y: 0.525 },
  "lam-dong": { x: 0.355, y: 0.55 },
  "dong-nai": { x: 0.35, y: 0.605 },
  "tay-ninh": { x: 0.265, y: 0.585 },
  "tp-ho-chi-minh": { x: 0.33, y: 0.635 },
  "dong-thap": { x: 0.235, y: 0.645 },
  "an-giang": { x: 0.185, y: 0.655 },
  "vinh-long": { x: 0.25, y: 0.7 },
  "can-tho": { x: 0.225, y: 0.72 },
  "ca-mau": { x: 0.155, y: 0.78 },
};

/** Ghim cho 2 điểm biển — khóa là `SeaPoint.id` trong provinces.ts. */
export const SATELLITE_SEA_POSITIONS: Record<string, MapPosition> = {
  "hoang-sa": { x: 0.718, y: 0.219 },
  "truong-sa": { x: 0.899, y: 0.831 },
};
