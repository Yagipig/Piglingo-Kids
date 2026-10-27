import type { GlobalReward } from "./rewards";

/**
 * Bộ phần thưởng chung đóng gói sẵn trong app.
 *
 * Dùng khi máy chưa tải được app_config từ Supabase, đang offline hoặc
 * admin chưa công bố cấu hình mới. Khi Supabase có cấu hình hợp lệ, bản
 * đó thay thế toàn bộ danh sách này (không merge từng mục).
 */

const COURSES = [
  { id: "en-vi", name: "Tiếng Anh", flag: "🇬🇧" },
  { id: "ja-vi", name: "Tiếng Nhật", flag: "🇯🇵" },
  { id: "zh-vi", name: "Tiếng Trung", flag: "🇨🇳" },
] as const;

const courseMilestones: GlobalReward[] = COURSES.flatMap((course, courseIndex) => [
  {
    id: `default-${course.id}-25`,
    kind: "badge" as const,
    name: `Huy hiệu Khởi hành ${course.name}`,
    description: `Hoàn thành 25% hành trình ${course.name} ${course.flag}. Một khởi đầu thật đáng tự hào!`,
    emoji: "🌱",
    condition: { type: "course-percent" as const, courseId: course.id, percent: 25 },
    congratsMessage: `Con đã đi được 1/4 hành trình ${course.name}. Tiếp tục khám phá nhé, nhà thám hiểm nhí!`,
    sortOrder: 100 + courseIndex * 10 + 1,
    enabled: true,
  },
  {
    id: `default-${course.id}-50`,
    kind: "badge" as const,
    name: `Huy hiệu Nửa hành trình ${course.name}`,
    description: `Hoàn thành 50% khóa ${course.name}. Con đã đi được nửa đường rồi!`,
    emoji: "⭐",
    condition: { type: "course-percent" as const, courseId: course.id, percent: 50 },
    congratsMessage: `Tuyệt vời! Con đã hoàn thành một nửa khóa ${course.name}. Đích đến đang gần hơn rồi!`,
    sortOrder: 100 + courseIndex * 10 + 2,
    enabled: true,
  },
  {
    id: `default-${course.id}-75`,
    kind: "badge" as const,
    name: `Huy hiệu Bứt phá ${course.name}`,
    description: `Hoàn thành 75% khóa ${course.name}. Chỉ còn một chặng nữa thôi!`,
    emoji: "🚀",
    condition: { type: "course-percent" as const, courseId: course.id, percent: 75 },
    congratsMessage: `Bứt phá thành công! Con đã hoàn thành 75% khóa ${course.name}. Cố lên một chút nữa nhé!`,
    sortOrder: 100 + courseIndex * 10 + 3,
    enabled: true,
  },
  {
    id: `default-${course.id}-complete`,
    kind: "chest" as const,
    name: `Rương kho báu ${course.name}`,
    description: `Mở rương khi hoàn thành 100% khóa ${course.name}. Bên trong là niềm tự hào của một hành trình trọn vẹn!`,
    emoji: "🎁",
    condition: { type: "course-complete" as const, courseId: course.id },
    congratsMessage: `Rương kho báu ${course.name} đã mở! Con đã hoàn thành toàn bộ khóa học này. Thật xuất sắc!`,
    sortOrder: 100 + courseIndex * 10 + 4,
    enabled: true,
  },
]);

export const DEFAULT_GLOBAL_REWARDS: GlobalReward[] = [
  {
    id: "default-first-unit",
    kind: "badge",
    name: "Huy hiệu Vùng đất đầu tiên",
    description: "Hoàn thành trọn vẹn vùng đất/chủ đề đầu tiên trên bản đồ khám phá.",
    emoji: "🏅",
    condition: { type: "units-completed", count: 1 },
    congratsMessage: "Chúc mừng! Con đã chinh phục vùng đất đầu tiên. Hành trình thám hiểm đã chính thức bắt đầu!",
    sortOrder: 10,
    enabled: true,
  },
  {
    id: "default-five-units",
    kind: "badge",
    name: "Huy hiệu Nhà khám phá bền bỉ",
    description: "Hoàn thành 5 vùng đất/chủ đề trong thế giới Little Explorers.",
    emoji: "🧭",
    condition: { type: "units-completed", count: 5 },
    congratsMessage: "Con đã khám phá xong 5 vùng đất! Sự bền bỉ của con thật đáng nể.",
    sortOrder: 20,
    enabled: true,
  },
  {
    id: "default-ten-units",
    kind: "badge",
    name: "Huy hiệu Bản đồ rộng mở",
    description: "Hoàn thành 10 vùng đất/chủ đề và mở rộng bản đồ ngôn ngữ của mình.",
    emoji: "🗺️",
    condition: { type: "units-completed", count: 10 },
    congratsMessage: "Bản đồ của con đang rộng mở! 10 vùng đất đã được chinh phục rồi.",
    sortOrder: 30,
    enabled: true,
  },
  ...courseMilestones,
  {
    id: "default-all-courses-chest",
    kind: "chest",
    name: "Rương kho báu Thế giới ngôn ngữ",
    description: "Rương đặc biệt chỉ mở khi con hoàn thành 100% cả ba khóa Tiếng Anh, Tiếng Nhật và Tiếng Trung.",
    emoji: "👑",
    condition: { type: "all-courses-complete" },
    congratsMessage: "Rương kho báu lớn nhất đã mở! Con đã hoàn thành hành trình khám phá cả ba ngôn ngữ!",
    sortOrder: 900,
    enabled: true,
  },
  {
    id: "default-language-explorer-title",
    kind: "title",
    name: "Nhà thám hiểm ngôn ngữ",
    description: "Danh hiệu cao quý dành cho bạn nhỏ hoàn thành 100% chương trình cả 3 khóa.",
    emoji: "🧭",
    condition: { type: "all-courses-complete" },
    congratsMessage: "Chúc mừng! Con đã hoàn thành hành trình khám phá ngôn ngữ và xứng đáng với danh hiệu Nhà thám hiểm ngôn ngữ!",
    sortOrder: 910,
    enabled: true,
  },
  {
    id: "default-parent-tip-toy",
    kind: "parent-tip",
    name: "Gợi ý: Một món đồ chơi con yêu thích",
    description: "Ba/mẹ có thể tham khảo để tự đặt phần thưởng riêng, ví dụ một bộ xếp hình hoặc món đồ chơi con đã mong ước.",
    emoji: "🧸",
    condition: { type: "all-courses-complete" },
    congratsMessage: "Đây là gợi ý dành cho ba/mẹ, không phải phần thưởng tự động trong app.",
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: "default-parent-tip-trip",
    kind: "parent-tip",
    name: "Gợi ý: Một chuyến đi chơi gia đình",
    description: "Ví dụ: đi thủy cung, công viên giải trí, nhà sách hoặc một buổi dã ngoại khi con đạt mốc lớn.",
    emoji: "🎡",
    condition: { type: "all-courses-complete" },
    congratsMessage: "Đây là gợi ý dành cho ba/mẹ, gia đình tự thực hiện ngoài đời thật.",
    sortOrder: 1010,
    enabled: true,
  },
  {
    id: "default-parent-tip-activity",
    kind: "parent-tip",
    name: "Gợi ý: Hoạt động con được tự chọn",
    description: "Để con chọn món ăn yêu thích, một bộ phim gia đình hoặc hoạt động vui chơi đặc biệt sau khi đạt mục tiêu.",
    emoji: "🎉",
    condition: { type: "units-completed", count: 5 },
    congratsMessage: "Đây là gợi ý để ba/mẹ tham khảo khi thiết lập phần thưởng riêng cho con.",
    sortOrder: 1020,
    enabled: true,
  },
];
