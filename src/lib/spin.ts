import {
  RARE_PET,
  SPIN_ACCESSORY_GROUPS,
  type SpinAccessoryGroup,
} from "./pets";
import { createRewardId } from "./rewards";

/**
 * VÒNG QUAY MAY MẮN + KHO BÁU (đợt Vòng quay) — LOGIC THUẦN + DỮ LIỆU
 * MẶC ĐỊNH, không chứa trạng thái:
 *
 * - Luồng: bé hoàn thành bài học → nhận VÉ quay (lưu trong store
 *   `spinTickets`): bài thường = vé DỄ, bài hoàn hảo = vé TRUNG BÌNH,
 *   bài làm một chặng thành hoàn thành = thêm vé KHÓ. Vé để quay ngay
 *   ở màn kết quả hoặc quay sau ở trang Vòng quay / Kho báu.
 * - Cấu hình (danh sách quà + ngân sách tháng) do ADMIN chỉnh ở trang
 *   Admin vòng quay, lưu qua app_config key `spin_config` (khuôn giống
 *   global rewards); chưa có cấu hình thì dùng `DEFAULT_SPIN_CONFIG`.
 * - ĐIỀU KIỆN ĐƯỢC QUAY của một phần quà (`isPrizeEligible`): đang bật
 *   VÀ còn tồn kho (null = không giới hạn) VÀ — riêng quà TIỀN mặt —
 *   tổng tiền đã trúng trong tháng còn dưới ngân sách tháng. Hết tồn
 *   kho hoặc hết ngân sách ⇒ quà TỰ ĐỘNG rời khỏi vòng quay.
 * - Chọn kết quả bằng trọng số (`pickWeighted`) với RNG bơm từ ngoài
 *   (gieo hạt được cho test); hình ảnh vòng quay chỉ là trình diễn.
 * - Quà thật (kind "real") khi trúng: trừ tồn kho ngay, vào Kho báu ở
 *   trạng thái "Chờ trao" (`realStatus: "pending"` trong lịch sử);
 *   chỉ Admin/Phụ huynh mới xác nhận "đã trao" (givenAt) — cùng triết
 *   lý với phần thưởng gia đình: app không tự đánh dấu đã trao.
 */

export type SpinTier = "easy" | "medium" | "hard";

export const SPIN_TIERS: { id: SpinTier; label: string; emoji: string }[] = [
  { id: "easy", label: "Dễ", emoji: "🟢" },
  { id: "medium", label: "Trung bình", emoji: "🟡" },
  { id: "hard", label: "Khó", emoji: "🔴" },
];

export function spinTierLabel(tier: SpinTier): string {
  return SPIN_TIERS.find((t) => t.id === tier)?.label ?? tier;
}

export type SpinPrizeKind =
  | "xp"
  | "stars"
  | "food"
  | "accessory"
  | "sticker"
  | "rare-pet"
  | "real";

export const SPIN_PRIZE_KINDS: { id: SpinPrizeKind; label: string }[] = [
  { id: "xp", label: "⚡ XP" },
  { id: "stars", label: "⭐ Sao" },
  { id: "food", label: "🍎 Thức ăn pet" },
  { id: "accessory", label: "🎀 Phụ kiện pet" },
  { id: "sticker", label: "🌟 Sticker" },
  { id: "rare-pet", label: "🦚 Pet hiếm" },
  { id: "real", label: "🎁 Quà thật / tiền" },
];

export function spinPrizeKindLabel(kind: SpinPrizeKind): string {
  return SPIN_PRIZE_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export interface SpinPrize {
  id: string;
  tier: SpinTier;
  kind: SpinPrizeKind;
  name: string;
  emoji: string;
  /**
   * Giá trị theo kind: XP (xp) / số sao (stars) / số phần thức ăn (food)
   * / số tiền đ (real + cash). Với accessory/sticker/rare-pet để 0.
   */
  amount: number;
  /** Trọng số tương đối trong tầng (số ghi theo % gợi ý, chỉ cần tỉ lệ). */
  weight: number;
  /** Tồn kho ban đầu/còn lại; null = không giới hạn. */
  stock: number | null;
  enabled: boolean;
  /** Link ảnh quà thật (kind "real"); quà ảo để null. */
  imageUrl: string | null;
  /** kind "real": true = tiền mặt (tính vào ngân sách tháng). */
  cash: boolean;
  /** kind "accessory": nhóm phụ kiện mở khóa vĩnh viễn khi trúng. */
  accessoryGroup: SpinAccessoryGroup | null;
  /** kind "sticker": mã sticker cụ thể; null = sticker bất ngờ (mở sticker chưa có). */
  stickerId: string | null;
}

export interface SpinConfig {
  version: 1;
  /** Giới hạn tổng TIỀN mặt bé được trúng mỗi tháng (đ). */
  monthlyBudgetVnd: number;
  prizes: SpinPrize[];
}

/* ------------------------------------------------------------------ */
/* Sticker sưu tập trong Kho báu                                       */
/* ------------------------------------------------------------------ */

export const SPIN_STICKERS: { id: string; emoji: string; name: string }[] = [
  { id: "sticker-sao", emoji: "⭐", name: "Ngôi Sao Dũng Cảm" },
  { id: "sticker-heo", emoji: "🐷", name: "Heo Con Vui Vẻ" },
  { id: "sticker-ten-lua", emoji: "🚀", name: "Tên Lửa Tri Thức" },
  { id: "sticker-cup", emoji: "🏆", name: "Cúp Vàng Vô Địch" },
  { id: "sticker-co", emoji: "🍀", name: "Cỏ Bốn Lá May Mắn" },
  { id: "sticker-buom", emoji: "🦋", name: "Bướm Xinh Bay Lượn" },
];

export function stickerById(stickerId: string) {
  return SPIN_STICKERS.find((s) => s.id === stickerId) ?? null;
}

/** Sticker chưa sưu tập đầu tiên (cho quà "sticker bất ngờ"); đủ bộ → null. */
export function nextUncollectedSticker(collected: string[] = []): string | null {
  const owned = new Set(collected ?? []);
  return SPIN_STICKERS.find((s) => !owned.has(s.id))?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Cấu hình mặc định (admin sửa được toàn bộ qua trang Admin vòng quay) */
/* ------------------------------------------------------------------ */

function defaultPrize(
  partial: Partial<SpinPrize> & Pick<SpinPrize, "id" | "tier" | "kind" | "name">
): SpinPrize {
  return {
    emoji: "🎁",
    amount: 0,
    weight: 10,
    stock: null,
    enabled: true,
    imageUrl: null,
    cash: false,
    accessoryGroup: null,
    stickerId: null,
    ...partial,
  };
}

export const DEFAULT_SPIN_CONFIG: SpinConfig = {
  version: 1,
  monthlyBudgetVnd: 50000,
  prizes: [
    /* ----- Tầng DỄ (xong một bài thường) ----- */
    defaultPrize({ id: "spin-easy-xp", tier: "easy", kind: "xp", name: "50 XP", emoji: "⚡", amount: 50, weight: 30 }),
    defaultPrize({ id: "spin-easy-stars", tier: "easy", kind: "stars", name: "10 sao", emoji: "⭐", amount: 10, weight: 25 }),
    defaultPrize({ id: "spin-easy-food", tier: "easy", kind: "food", name: "1 phần thức ăn cho thú cưng", emoji: "🍎", amount: 1, weight: 20 }),
    defaultPrize({ id: "spin-easy-acc", tier: "easy", kind: "accessory", name: "Mũ hoặc kính cho thú cưng", emoji: "🎩", weight: 15, accessoryGroup: "mu-kinh" }),
    defaultPrize({ id: "spin-easy-sticker", tier: "easy", kind: "sticker", name: "Sticker bất ngờ", emoji: "🌟", weight: 10 }),
    defaultPrize({ id: "spin-easy-cash", tier: "easy", kind: "real", name: "1.000đ tiền thưởng thật", emoji: "💵", amount: 1000, weight: 1, cash: true }),
    /* ----- Tầng TRUNG BÌNH (bài hoàn hảo — không sai câu nào) ----- */
    defaultPrize({ id: "spin-med-xp", tier: "medium", kind: "xp", name: "100 XP", emoji: "⚡", amount: 100, weight: 28 }),
    defaultPrize({ id: "spin-med-stars", tier: "medium", kind: "stars", name: "25 sao", emoji: "⭐", amount: 25, weight: 24 }),
    defaultPrize({ id: "spin-med-acc-outfit", tier: "medium", kind: "accessory", name: "Váy hoặc áo cho thú cưng", emoji: "👕", weight: 18, accessoryGroup: "ao-vay" }),
    defaultPrize({ id: "spin-med-acc-shoes", tier: "medium", kind: "accessory", name: "Đôi giày cho thú cưng", emoji: "👟", weight: 15, accessoryGroup: "giay" }),
    defaultPrize({ id: "spin-med-cash", tier: "medium", kind: "real", name: "5.000đ tiền thưởng thật", emoji: "💵", amount: 5000, weight: 2, cash: true }),
    /* ----- Tầng KHÓ (hoàn thành một chặng) ----- */
    defaultPrize({ id: "spin-hard-xp", tier: "hard", kind: "xp", name: "200 XP", emoji: "⚡", amount: 200, weight: 30 }),
    defaultPrize({ id: "spin-hard-set", tier: "hard", kind: "accessory", name: "Bộ quần áo cho thú cưng", emoji: "🦸", weight: 20, accessoryGroup: "bo-do" }),
    defaultPrize({ id: "spin-hard-pet", tier: "hard", kind: "rare-pet", name: `Pet hiếm: ${RARE_PET.name}`, emoji: RARE_PET.emoji, weight: 12 }),
    defaultPrize({ id: "spin-hard-teddy", tier: "hard", kind: "real", name: "Gấu bông thật", emoji: "🧸", weight: 8, stock: 2 }),
    defaultPrize({ id: "spin-hard-cash", tier: "hard", kind: "real", name: "15.000đ tiền thưởng thật", emoji: "💰", amount: 15000, weight: 1, cash: true }),
  ],
};

/**
 * Quà ẢO dự phòng của từng tầng — chỉ dùng để BỔ SUNG khi một tầng còn
 * dưới 2 quà hợp lệ (admin tắt gần hết / hết hàng / hết ngân sách), để
 * vòng quay không bao giờ rỗng. Không nằm trong cấu hình admin.
 */
export const SPIN_FALLBACK_PRIZES: Record<SpinTier, SpinPrize[]> = {
  easy: [
    defaultPrize({ id: "fallback-easy-xp", tier: "easy", kind: "xp", name: "20 XP", emoji: "⚡", amount: 20, weight: 10 }),
    defaultPrize({ id: "fallback-easy-stars", tier: "easy", kind: "stars", name: "5 sao", emoji: "⭐", amount: 5, weight: 10 }),
  ],
  medium: [
    defaultPrize({ id: "fallback-medium-xp", tier: "medium", kind: "xp", name: "40 XP", emoji: "⚡", amount: 40, weight: 10 }),
    defaultPrize({ id: "fallback-medium-stars", tier: "medium", kind: "stars", name: "10 sao", emoji: "⭐", amount: 10, weight: 10 }),
  ],
  hard: [
    defaultPrize({ id: "fallback-hard-xp", tier: "hard", kind: "xp", name: "80 XP", emoji: "⚡", amount: 80, weight: 10 }),
    defaultPrize({ id: "fallback-hard-stars", tier: "hard", kind: "stars", name: "20 sao", emoji: "⭐", amount: 20, weight: 10 }),
  ],
};

/* ------------------------------------------------------------------ */
/* Lịch sử quay + ngân sách tháng                                      */
/* ------------------------------------------------------------------ */

export type SpinRealStatus = "pending" | "given";

export interface SpinHistoryEntry {
  id: string;
  /** auth.users.id của tài khoản gia đình; null khi quay lúc chưa đăng nhập. */
  ownerId: string | null;
  /** Thời điểm quay (epoch ms). */
  at: number;
  tier: SpinTier;
  prizeId: string;
  prizeName: string;
  prizeEmoji: string;
  kind: SpinPrizeKind;
  amount: number;
  /** Quà tiền mặt (tính vào ngân sách tháng). */
  cash: boolean;
  /** Ảnh quà thật tại thời điểm trúng (để Kho báu hiện lại). */
  imageUrl: string | null;
  /** Chỉ kind "real": "pending" = chờ trao, "given" = phụ huynh đã xác nhận trao. */
  realStatus: SpinRealStatus | null;
  /** Chỉ phụ huynh/admin mới được đặt (qua trang Admin vòng quay). */
  givenAt: number | null;
  updatedAt: number;
}

/** Khóa tháng "YYYY-MM" theo giờ địa phương của máy. */
export function monthKeyOf(at: number): string {
  const d = new Date(at);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

/** Tổng TIỀN MẶT (đ) bé đã trúng trong tháng của `at` — căn cứ ngân sách. */
export function moneyWonInMonth(
  history: SpinHistoryEntry[] = [],
  at: number = Date.now()
): number {
  const key = monthKeyOf(at);
  return (history ?? [])
    .filter(
      (entry) =>
        entry.kind === "real" && entry.cash && monthKeyOf(entry.at) === key
    )
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
}

export type SpinBudgetState = {
  budget: number;
  spent: number;
  remaining: number;
  /** Hết ngân sách = mọi quà tiền mặt tự rời vòng quay tháng này. */
  exhausted: boolean;
};

export function budgetState(
  config: SpinConfig,
  history: SpinHistoryEntry[] = [],
  at: number = Date.now()
): SpinBudgetState {
  const budget = Math.max(0, config?.monthlyBudgetVnd ?? 0);
  const spent = moneyWonInMonth(history, at);
  return {
    budget,
    spent,
    remaining: Math.max(0, budget - spent),
    exhausted: spent >= budget,
  };
}

/** Quà thật đang chờ trao (cho Kho báu + Admin). */
export function pendingRealEntries(
  history: SpinHistoryEntry[] = []
): SpinHistoryEntry[] {
  return (history ?? []).filter(
    (entry) => entry.kind === "real" && entry.realStatus === "pending"
  );
}

/* ------------------------------------------------------------------ */
/* Điều kiện được quay + chọn theo trọng số                            */
/* ------------------------------------------------------------------ */

export type SpinEligibilityContext = {
  /** Tồn kho còn lại theo prizeId trên máy bé (ghi đè stock của cấu hình khi có). */
  stockById?: Record<string, number>;
  /** Tổng tiền mặt đã trúng trong tháng hiện tại (đ). */
  moneyWonThisMonth?: number;
  /** Ngân sách tiền mặt mỗi tháng (đ) lấy từ cấu hình đang hiệu lực. */
  monthlyBudgetVnd?: number;
};

/** Tồn kho HIỆU LỰC của một quà: số máy bé đã ghi nhận thắng cấu hình. */
export function effectiveStock(
  prize: SpinPrize,
  stockById: Record<string, number> = {}
): number | null {
  const local = stockById?.[prize.id];
  return typeof local === "number" && Number.isFinite(local) ? local : prize.stock;
}

/**
 * Một quà có ĐƯỢC QUAY (nằm trên vòng) hay không:
 * đang bật VÀ trọng số > 0 VÀ còn tồn kho (null = không giới hạn) VÀ
 * — nếu là quà TIỀN mặt — tổng tiền đã trúng tháng này còn DƯỚI ngân
 * sách tháng. Hết tồn kho / hết ngân sách ⇒ tự động loại khỏi vòng.
 */
export function isPrizeEligible(
  prize: SpinPrize,
  ctx: SpinEligibilityContext = {}
): boolean {
  if (!prize || !prize.enabled) return false;
  if (!(prize.weight > 0)) return false;
  const stock = effectiveStock(prize, ctx.stockById ?? {});
  if (stock !== null && stock <= 0) return false;
  if (prize.kind === "real" && prize.cash) {
    const budget = Math.max(0, ctx.monthlyBudgetVnd ?? 0);
    const spent = Math.max(0, ctx.moneyWonThisMonth ?? 0);
    if (spent >= budget) return false;
  }
  return true;
}

/** Lý do một quà bị loại khỏi vòng (để Admin nhìn thấy) — null = đang quay. */
export function prizeExclusionReason(
  prize: SpinPrize,
  ctx: SpinEligibilityContext = {}
): string | null {
  if (!prize.enabled) return "Đang tắt";
  if (!(prize.weight > 0)) return "Trọng số 0";
  const stock = effectiveStock(prize, ctx.stockById ?? {});
  if (stock !== null && stock <= 0) return "Hết số lượng";
  if (prize.kind === "real" && prize.cash) {
    const budget = Math.max(0, ctx.monthlyBudgetVnd ?? 0);
    const spent = Math.max(0, ctx.moneyWonThisMonth ?? 0);
    if (spent >= budget) return "Hết ngân sách tháng";
  }
  return null;
}

/**
 * Danh sách quà THẬT SỰ nằm trên vòng của một tầng: lọc theo điều kiện
 * được quay; nếu còn dưới 2 quà thì bổ sung quà ảo dự phòng của tầng
 * đó cho đủ quay (không bao giờ để vòng rỗng/1 ô).
 */
export function eligiblePrizesForTier(
  config: SpinConfig,
  tier: SpinTier,
  ctx: SpinEligibilityContext = {}
): SpinPrize[] {
  const eligible = (config?.prizes ?? []).filter(
    (prize) => prize.tier === tier && isPrizeEligible(prize, ctx)
  );
  if (eligible.length >= 2) return eligible;
  const out = [...eligible];
  for (const fallback of SPIN_FALLBACK_PRIZES[tier]) {
    if (out.length >= 2) break;
    if (!out.some((p) => p.id === fallback.id)) out.push(fallback);
  }
  return out;
}

/** RNG gieo hạt tất định (mulberry32) — cho test và bản quay thử. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Chọn MỘT quà theo trọng số. Kết quả được chọn TRƯỚC bằng hàm này;
 * animation vòng quay chỉ trình diễn tới ô đã chọn. Danh sách rỗng hoặc
 * tổng trọng số ≤ 0 → null.
 */
export function pickWeighted(
  prizes: SpinPrize[],
  rng: () => number = Math.random
): SpinPrize | null {
  const list = (prizes ?? []).filter((p) => p && p.weight > 0);
  if (list.length === 0) return null;
  const total = list.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const prize of list) {
    r -= prize.weight;
    if (r < 0) return prize;
  }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------ */
/* Cấp vé khi hoàn thành bài học                                       */
/* ------------------------------------------------------------------ */

/**
 * Vé nhận được khi bé HOÀN THÀNH MỚI một bài học (store chỉ gọi khi
 * bài chưa từng hoàn thành trước đó): bài thường → 1 vé DỄ; bài hoàn
 * hảo (không sai câu nào) → 1 vé TRUNG BÌNH; nếu chính bài này làm một
 * CHẶNG thành hoàn thành → thêm 1 vé KHÓ.
 */
export function ticketsForCompletion(opts: {
  perfect: boolean;
  stageJustCompleted: boolean;
}): SpinTier[] {
  const tickets: SpinTier[] = [opts.perfect ? "medium" : "easy"];
  if (opts.stageJustCompleted) tickets.push("hard");
  return tickets;
}

/* ------------------------------------------------------------------ */
/* Chuẩn hoá (sanitize) cấu hình + lịch sử từ nguồn ngoài              */
/* ------------------------------------------------------------------ */

const SPIN_TIER_IDS: SpinTier[] = ["easy", "medium", "hard"];
const SPIN_KIND_IDS: SpinPrizeKind[] = [
  "xp",
  "stars",
  "food",
  "accessory",
  "sticker",
  "rare-pet",
  "real",
];

function asNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

export function sanitizeSpinPrize(value: unknown): SpinPrize | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    !SPIN_TIER_IDS.includes(raw.tier as SpinTier) ||
    !SPIN_KIND_IDS.includes(raw.kind as SpinPrizeKind)
  ) {
    return null;
  }
  const group =
    typeof raw.accessoryGroup === "string" &&
    raw.accessoryGroup in SPIN_ACCESSORY_GROUPS
      ? (raw.accessoryGroup as SpinAccessoryGroup)
      : null;
  return {
    id: raw.id,
    tier: raw.tier as SpinTier,
    kind: raw.kind as SpinPrizeKind,
    name: raw.name,
    emoji: typeof raw.emoji === "string" && raw.emoji ? raw.emoji : "🎁",
    amount: asNonNegativeNumber(raw.amount, 0),
    weight: asNonNegativeNumber(raw.weight, 0),
    stock:
      typeof raw.stock === "number" && Number.isFinite(raw.stock)
        ? Math.max(0, Math.floor(raw.stock))
        : null,
    enabled: raw.enabled !== false,
    imageUrl: typeof raw.imageUrl === "string" && raw.imageUrl ? raw.imageUrl : null,
    cash: raw.cash === true,
    accessoryGroup: group,
    stickerId: typeof raw.stickerId === "string" && raw.stickerId ? raw.stickerId : null,
  };
}

export function sanitizeSpinConfig(value: unknown): SpinConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.prizes)) return null;
  const prizes = raw.prizes
    .map((item) => sanitizeSpinPrize(item))
    .filter((item): item is SpinPrize => item != null);
  return {
    version: 1,
    monthlyBudgetVnd: asNonNegativeNumber(raw.monthlyBudgetVnd, 0),
    prizes,
  };
}

export function sanitizeSpinHistoryEntry(value: unknown): SpinHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.prizeName !== "string" ||
    !SPIN_TIER_IDS.includes(raw.tier as SpinTier) ||
    !SPIN_KIND_IDS.includes(raw.kind as SpinPrizeKind)
  ) {
    return null;
  }
  return {
    id: raw.id,
    ownerId: typeof raw.ownerId === "string" ? raw.ownerId : null,
    at: asNonNegativeNumber(raw.at, 0),
    tier: raw.tier as SpinTier,
    prizeId: typeof raw.prizeId === "string" ? raw.prizeId : "",
    prizeName: raw.prizeName,
    prizeEmoji: typeof raw.prizeEmoji === "string" && raw.prizeEmoji ? raw.prizeEmoji : "🎁",
    kind: raw.kind as SpinPrizeKind,
    amount: asNonNegativeNumber(raw.amount, 0),
    cash: raw.cash === true,
    imageUrl: typeof raw.imageUrl === "string" && raw.imageUrl ? raw.imageUrl : null,
    realStatus:
      raw.realStatus === "pending" || raw.realStatus === "given"
        ? raw.realStatus
        : null,
    givenAt: typeof raw.givenAt === "number" ? raw.givenAt : null,
    updatedAt: asNonNegativeNumber(raw.updatedAt, 0),
  };
}

/**
 * Hợp nhất lịch sử quay local + server theo id: bản có `updatedAt` mới
 * hơn thắng; hòa thì bản ĐÃ TRAO (givenAt != null) thắng để trạng thái
 * "đã trao" của phụ huynh không bị bản cũ đè mất. Sắp xếp mới → cũ.
 */
export function mergeSpinHistory(
  local: SpinHistoryEntry[],
  remote: SpinHistoryEntry[]
): SpinHistoryEntry[] {
  const byId = new Map<string, SpinHistoryEntry>();
  for (const entry of [...(local ?? []), ...(remote ?? [])]) {
    if (!entry || typeof entry.id !== "string") continue;
    const current = byId.get(entry.id);
    if (!current) {
      byId.set(entry.id, entry);
      continue;
    }
    if (
      entry.updatedAt > current.updatedAt ||
      (entry.updatedAt === current.updatedAt &&
        entry.givenAt != null &&
        current.givenAt == null)
    ) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort((a, b) => b.at - a.at || b.updatedAt - a.updatedAt);
}

/** Tạo id cho quà/lượt quay mới (dùng chung khuôn id của hệ rewards). */
export function createSpinId(prefix = "spin"): string {
  return createRewardId(prefix);
}

/** Định dạng tiền đ cho UI (50.000đ). */
export function formatVnd(amount: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  return `${n.toLocaleString("vi-VN")}đ`;
}
