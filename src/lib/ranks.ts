/**
 * Cấp bậc nhà thám hiểm biển đảo — suy THUẦN từ tổng XP học tập, không
 * lưu thêm trạng thái nào (nơi gọi truyền tổng XP hiện có của store).
 *
 * Thang bậc được cân theo quy tắc XP thật của app (src/lib/store.ts):
 * mỗi bài hoàn thành cho 15 XP, thêm 5 XP nếu không sai câu nào.
 *
 * Hiệu chuẩn đợt 2 (lộ trình 1–12 hoàn thiện, 314 bài):
 *   XP tối đa từ bài học  = 314 × 20 = 6.280 XP (chưa kể XP game).
 *   XP khi học hết, không hoàn hảo = 314 × 15 = 4.710 XP.
 *   Bậc cuối 4.650 XP ≈ 74% XP tối đa từ bài học (mốc thiết kế 70–75%):
 *   bé phải học gần như trọn lộ trình mới chạm được, và học hết 314 bài
 *   là chắc chắn đủ — đích cao nhưng không "treo" ngoài tầm với.
 *   Các bậc giữa được giãn theo đường cong tăng dần như đợt đầu (hiệu
 *   chuẩn cũ trên 170 bài, hệ số giãn ≈ 6.280 / 3.400 ≈ 1,85, làm tròn
 *   số đẹp): khoảng cách giữa hai bậc liên tiếp tăng dần
 *   200 → 250 → 450 → 750 → 900 → 1.000 → 1.100 XP.
 */

export interface RankTier {
  /** Bậc, từ 1 (thấp nhất) tới 8 (cao nhất). */
  level: number;
  title: string;
  emoji: string;
  /** Tổng XP tối thiểu để đạt bậc này. */
  minXp: number;
}

export const RANK_TIERS: RankTier[] = [
  { level: 1, title: "Người Bạn Ra Khơi", emoji: "🛶", minXp: 0 },
  { level: 2, title: "Thủy Thủ Nhí", emoji: "⛵", minXp: 200 },
  { level: 3, title: "Hoa Tiêu Nhí", emoji: "🧭", minXp: 450 },
  { level: 4, title: "Thuyền Phó Tương Lai", emoji: "⚓", minXp: 900 },
  { level: 5, title: "Thuyền Trưởng Nhí", emoji: "🚢", minXp: 1650 },
  { level: 6, title: "Chúa Đảo Nhí", emoji: "🏝️", minXp: 2550 },
  { level: 7, title: "Huyền Thoại Biển Khơi", emoji: "🌟", minXp: 3550 },
  { level: 8, title: "Vua Biển Cả", emoji: "👑", minXp: 4650 },
];

export interface RankState {
  level: number;
  title: string;
  emoji: string;
  /** Ngưỡng XP của bậc hiện tại. */
  minXp: number;
  /** Ngưỡng XP của bậc tiếp theo; null khi đã ở bậc cao nhất. */
  nextXp: number | null;
  /** Danh hiệu bậc tiếp theo; null khi đã ở bậc cao nhất. */
  nextTitle: string | null;
  /** Emoji bậc tiếp theo; null khi đã ở bậc cao nhất. */
  nextEmoji: string | null;
  /** Tiến độ 0..1 từ minXp tới nextXp; bằng 1 khi ở bậc cao nhất. */
  progress01: number;
  /** XP còn thiếu để lên bậc tiếp theo; 0 khi ở bậc cao nhất. */
  xpToNext: number;
  isMax: boolean;
}

/** Cấp bậc tương ứng với một tổng XP (âm/không hợp lệ được coi là 0). */
export function rankForXp(totalXp: number): RankState {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (xp >= tier.minXp) current = tier;
  }
  const next = RANK_TIERS.find((tier) => tier.level === current.level + 1) ?? null;
  if (!next) {
    return {
      level: current.level,
      title: current.title,
      emoji: current.emoji,
      minXp: current.minXp,
      nextXp: null,
      nextTitle: null,
      nextEmoji: null,
      progress01: 1,
      xpToNext: 0,
      isMax: true,
    };
  }
  const span = next.minXp - current.minXp;
  const progress01 =
    span > 0 ? Math.min(1, Math.max(0, (xp - current.minXp) / span)) : 0;
  return {
    level: current.level,
    title: current.title,
    emoji: current.emoji,
    minXp: current.minXp,
    nextXp: next.minXp,
    nextTitle: next.title,
    nextEmoji: next.emoji,
    progress01,
    xpToNext: Math.max(0, next.minXp - xp),
    isMax: false,
  };
}

export type RankTierState = "achieved" | "current" | "locked";

/** Trạng thái của một bậc trong thang so với tổng XP hiện có. */
export function rankTierState(tier: RankTier, totalXp: number): RankTierState {
  const rank = rankForXp(totalXp);
  if (tier.level === rank.level) return "current";
  return totalXp >= tier.minXp ? "achieved" : "locked";
}
