/**
 * Cấp bậc nhà thám hiểm biển đảo — suy THUẦN từ tổng XP học tập, không
 * lưu thêm trạng thái nào (nơi gọi truyền tổng XP hiện có của store).
 *
 * Thang bậc được cân theo quy tắc XP thật của app (src/lib/store.ts):
 * mỗi bài hoàn thành cho 15 XP, thêm 5 XP nếu không sai câu nào, nên
 * 170 bài cho tối đa 170 × 20 = 3.400 XP chỉ từ bài học — chưa kể XP
 * thưởng từ các trò chơi (addBonusXp). Bậc cao nhất 2.800 XP vì thế
 * "với tới được" khi bé học gần hết chương trình (học hết 170 bài
 * không hoàn hảo đã có 2.550 XP, cộng thêm bài hoàn hảo/game là đủ),
 * nhưng vẫn là đích đáng tự hào chứ không tự động đạt.
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
  { level: 2, title: "Thủy Thủ Nhí", emoji: "⛵", minXp: 100 },
  { level: 3, title: "Hoa Tiêu Nhí", emoji: "🧭", minXp: 250 },
  { level: 4, title: "Thuyền Phó Tương Lai", emoji: "⚓", minXp: 500 },
  { level: 5, title: "Thuyền Trưởng Nhí", emoji: "🚢", minXp: 900 },
  { level: 6, title: "Chúa Đảo Nhí", emoji: "🏝️", minXp: 1400 },
  { level: 7, title: "Huyền Thoại Biển Khơi", emoji: "🌟", minXp: 2000 },
  { level: 8, title: "Vua Biển Cả", emoji: "👑", minXp: 2800 },
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
