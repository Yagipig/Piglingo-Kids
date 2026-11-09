/**
 * Spaced repetition for vocabulary review — FSRS via `ts-fsrs` (MIT).
 *
 * Lịch sử: trước đây file này là SM-2 tự chế với entry dạng
 * `{ interval, ease, dueAt, streak }`. Đợt 1 tích hợp nguồn mở
 * (09/11/2026) thay thuật toán bằng FSRS chính thức qua thư viện
 * ts-fsrs 6.x (bản cài đặt tham chiếu của thuật toán FSRS, giấy phép
 * MIT, https://github.com/open-spaced-repetition/ts-fsrs). Cấu hình:
 * request_retention = 0.9 (hàm interval suy từ retention này ở phía
 * thư viện), maximum_interval = 36500 ngày, enable_fuzz = false (lịch
 * tất định — cùng một thẻ + cùng một đánh giá thì ra cùng một lịch,
 * quan trọng cho kiểm thử và cho hành vi dễ đoán trên máy của bé).
 * Các learning_steps / relearning_steps giữ mặc định của thư viện
 * (["1m", "10m"] / ["10m"], enable_short_term = true): thẻ trả lời
 * sai (Again) quay lại sau 1–10 phút thay vì bị đẩy sang ngày hôm
 * sau như SM-2 cũ, và thẻ mới trả lời đúng (Good) đi qua trạng thái
 * Learning trước khi tốt nghiệp sang Review.
 *
 * Dạng entry MỚI (SrsEntry) là ảnh persist-được của một thẻ FSRS:
 * mọi field là số thuần (JSON-serializable), ngày tháng lưu dạng ms
 * giống quy ước cũ (dueAt / lastReview). Tên field dùng camelCase
 * theo codebase, ánh xạ 1–1 sang field snake_case của thẻ ts-fsrs
 * (due↔dueAt, scheduled_days↔scheduledDays, elapsed_days↔elapsedDays,
 * learning_steps↔learningSteps, last_review↔lastReview).
 *
 * KHÔNG MẤT LỊCH SỬ ÔN: dữ liệu đã persist trên máy người dùng thật
 * vẫn là entry SM-2 cũ. Việc chuyển đổi diễn ra ở CẢ hai đường:
 *  1. `migrate` của store (src/lib/store.ts) gọi
 *     `normalizeSrsRecord` cho mọi khóa khi gặp dữ liệu cũ.
 *  2. Chuyển đổi LƯỜI lúc truy cập: `reviewWord` / `isDue` /
 *     `dueInDays` đều đi qua `normalizeSrsEntry` trước khi đọc, nên
 *     bản ghi cũ lọt qua migrate (zustand persist không có `version`
 *     nên migrate không phải lúc nào cũng chạy) vẫn an toàn. Đường
 *     này không có wordStats đi kèm nên reps chỉ suy từ `streak` và
 *     lapses = 0 — migrate là đường đầy đủ hơn, xem
 *     `convertLegacyEntry`.
 */
import {
  Rating,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
} from "ts-fsrs";

/* ------------------------- Hằng số / kiểu ------------------------- */

/** Retention mục tiêu của lịch FSRS (0.9 = nhớ ~90% tại ngày đến hạn). */
export const FSRS_REQUEST_RETENTION = 0.9;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Hai hằng số của thuật toán SM-2 cũ, GIỮ LẠI chỉ để chuyển đổi dữ
 * liệu cũ (ánh xạ ease → difficulty trong `convertLegacyEntry`).
 * Thuật toán FSRS mới không dùng chúng.
 */
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
/** Ease lớn nhất mà SM-2 cũ có thể sinh ra (reviewWord cũ kẹp ≤ 3.0). */
const MAX_LEGACY_EASE = 3.0;

/** Trạng thái thẻ FSRS, khớp enum `State` của ts-fsrs. */
export const SrsState = {
  /** Chưa từng ôn thành công — thẻ mới tinh. */
  New: 0,
  /** Đang trong các bước học ngắn hạn (learning steps, phút). */
  Learning: 1,
  /** Đã tốt nghiệp — ôn theo interval ngày do FSRS tính. */
  Review: 2,
  /** Trả lời sai khi đang Review — đang học lại ngắn hạn. */
  Relearning: 3,
} as const;
export type SrsState = (typeof SrsState)[keyof typeof SrsState];

/** Entry FSRS persist-được: chỉ gồm số thuần, ngày tháng dạng ms. */
export type SrsEntry = {
  /** Unix ms khi từ đến hạn ôn (tương đương `due` của thẻ FSRS). */
  dueAt: number;
  /** Độ ổn định của trí nhớ, theo ngày (FSRS stability). */
  stability: number;
  /** Độ khó 1–10 (FSRS difficulty); thẻ New chưa có trí nhớ = 0. */
  difficulty: number;
  /** Số ngày đã trôi qua tính tới lần ôn gần nhất (elapsed_days). */
  elapsedDays: number;
  /** Interval (ngày) của lần hẹn gần nhất (scheduled_days). */
  scheduledDays: number;
  /** Đã đi qua bao nhiêu learning step trong lượt học hiện tại. */
  learningSteps: number;
  /** Tổng số lần đã ôn thẻ này. */
  reps: number;
  /** Số lần quên khi đang Review (do FSRS hoặc chuyển đổi ghi). */
  lapses: number;
  /** Trạng thái thẻ — xem SrsState (0 New / 1 Learning / 2 Review / 3 Relearning). */
  state: SrsState;
  /** Unix ms của lần ôn gần nhất; 0 = chưa từng ôn. */
  lastReview: number;
};

/** Entry SM-2 cũ như đã persist trên máy người dùng trước đợt FSRS. */
export type LegacySrsEntry = {
  interval: number;
  ease: number;
  dueAt: number;
  streak: number;
};

/**
 * Thống kê theo từ mà store giữ song song với srs (`wordStats`).
 * Khai báo cấu trúc tối thiểu ở đây để srs.ts không import ngược
 * store.ts (tránh vòng import); WordStat của store khớp cấu trúc này.
 */
export type SrsWordStats = {
  correct: number;
  wrong: number;
  lastSeen: number;
};

/** Bất kỳ dạng entry nào có thể gặp trong dữ liệu persist. */
export type AnySrsEntry = SrsEntry | LegacySrsEntry;

const scheduler = fsrs(
  generatorParameters({
    request_retention: FSRS_REQUEST_RETENTION,
    maximum_interval: 36500,
    enable_fuzz: false,
  })
);

/* --------------------------- Tiện ích số --------------------------- */

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nonNegativeInt(value: unknown): number {
  return Math.max(0, Math.floor(finiteOr(value, 0)));
}

/* --------------------- Nhận diện + chuyển đổi --------------------- */

/**
 * Entry cũ nhận diện qua field `interval`/`ease` của SM-2 mà entry
 * FSRS mới không còn (và ngược lại, entry mới có `stability`).
 */
export function isLegacySrsEntry(entry: unknown): entry is LegacySrsEntry {
  if (!entry || typeof entry !== "object") return false;
  const record = entry as Record<string, unknown>;
  if (typeof record.stability === "number") return false;
  return typeof record.interval === "number" || typeof record.ease === "number";
}

/**
 * Ánh xạ ease của SM-2 → difficulty của FSRS: tuyến tính, đảo chiều
 * (ease thấp = khó), ease ∈ [1.3, 3.0] → difficulty ∈ [10, 1],
 * kẹp 1..10. Ease mặc định 2.5 → difficulty ≈ 3.65.
 */
export function difficultyFromLegacyEase(ease: unknown): number {
  const clampedEase = clamp(
    finiteOr(ease, DEFAULT_EASE),
    MIN_EASE,
    MAX_LEGACY_EASE
  );
  const difficulty =
    10 - ((clampedEase - MIN_EASE) / (MAX_LEGACY_EASE - MIN_EASE)) * 9;
  return clamp(difficulty, 1, 10);
}

/**
 * Chuyển MỘT entry SM-2 cũ sang entry FSRS, theo đúng các nguyên tắc
 * đã chốt (xem thêm test-fsrs.mjs):
 *  (a) GIỮ NGUYÊN `dueAt` của thẻ cũ — không dời lịch ôn đã hẹn.
 *  (b) `reps` = max(streak cũ, stats.correct); `lapses` = stats.wrong
 *      (không có stats thì 0 — đường chuyển đổi lười không có stats).
 *  (c) `stability` suy từ interval cũ: interval > 0 → stability ≈
 *      interval (ở retention 0.9, interval FSRS xấp xỉ stability);
 *      interval = 0 mà reps > 0 → stability = 1 (thẻ từng ôn đúng
 *      nhưng SM-2 đã reset interval về 0 sau một lần sai: chọn 1
 *      ngày — nằm giữa stability khởi tạo của Again ≈ 0.212 và của
 *      Good ≈ 2.3065 trong trọng số FSRS mặc định — để thẻ có trí
 *      nhớ hợp lệ > 0 mà không thổi phồng khả năng nhớ);
 *      interval = 0 và reps = 0 → stability = 0 (thẻ mới tinh).
 *  (d) `difficulty` ánh xạ từ ease cũ qua `difficultyFromLegacyEase`
 *      — NGOẠI LỆ bắt buộc: thẻ chưa từng ôn thành công
 *      (stability = 0) giữ difficulty = 0. Đó là quy ước "chưa có độ
 *      khó" của chính FSRS (createEmptyCard sinh D=0/S=0) và ts-fsrs
 *      TỪ CHỐI thẻ có difficulty > 0 nhưng stability = 0
 *      (FSRSValidationError: Invalid memory state), nên gán difficulty
 *      suy từ ease cho thẻ này sẽ làm lần ôn đầu tiên văng lỗi.
 *  (e) `lastReview` = stats.lastSeen nếu có, ngược lại 0.
 *
 * Trạng thái suy ra: stability = 0 → New; interval > 0 → Review;
 * còn lại (interval = 0, reps > 0) → Learning.
 */
export function convertLegacyEntry(
  legacy: LegacySrsEntry,
  stats?: SrsWordStats,
  now = Date.now()
): SrsEntry {
  const source = (legacy ?? {}) as Partial<LegacySrsEntry>;
  const interval = Math.max(0, finiteOr(source.interval, 0));
  const streak = nonNegativeInt(source.streak);
  const correct = stats ? nonNegativeInt(stats.correct) : 0;
  const reps = Math.max(streak, correct);
  const lapses = stats ? nonNegativeInt(stats.wrong) : 0;
  const lastReview =
    stats && finiteOr(stats.lastSeen, 0) > 0 ? Math.floor(stats.lastSeen) : 0;

  let stability: number;
  if (interval > 0) stability = interval;
  else if (reps > 0) stability = 1;
  else stability = 0;

  const pristine = stability <= 0;
  return {
    // (a) — fall back chỉ khi dueAt gốc hỏng/không có: dùng lần thấy
    // gần nhất, cuối cùng mới tới hiện tại; không bao giờ tự ý dời
    // một dueAt hợp lệ.
    dueAt: Number.isFinite(source.dueAt)
      ? (source.dueAt as number)
      : lastReview > 0
        ? lastReview
        : now,
    stability,
    difficulty: pristine ? 0 : difficultyFromLegacyEase(source.ease),
    elapsedDays: 0,
    scheduledDays: interval,
    learningSteps: 0,
    reps,
    lapses,
    state: pristine
      ? SrsState.New
      : interval > 0
        ? SrsState.Review
        : SrsState.Learning,
    lastReview,
  };
}

/**
 * Chuẩn hóa một entry bất kỳ về SrsEntry hợp lệ cho FSRS:
 * entry cũ → `convertLegacyEntry`; entry mới → giữ nguyên các giá
 * trị hợp lệ, chỉ sửa những field hỏng/thiếu và những tổ hợp mà
 * ts-fsrs sẽ từ chối (stability > 0 thì difficulty phải trong
 * 1..10; stability = 0 thì difficulty phải = 0). Đây là hàm dùng cho
 * chuyển đổi lười trong reviewWord/isDue/dueInDays/dueSrsWords.
 */
export function normalizeSrsEntry(
  entry: AnySrsEntry | undefined | null,
  stats?: SrsWordStats
): SrsEntry | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  if (isLegacySrsEntry(entry)) return convertLegacyEntry(entry, stats);

  const source = entry as Partial<SrsEntry>;
  const stability = Math.max(0, finiteOr(source.stability, 0));
  const reps = nonNegativeInt(source.reps);
  let difficulty = finiteOr(source.difficulty, 0);
  if (stability > 0) {
    // Thẻ đã có trí nhớ: difficulty 0/hỏng → trung tính 5, còn lại kẹp 1..10.
    difficulty = difficulty >= 1 ? clamp(difficulty, 1, 10) : 5;
  } else if (reps > 0) {
    // Có reps nhưng stability bị mất (dữ liệu hỏng): khôi phục mức
    // khởi tạo bảo thủ như nhánh interval=0 của convertLegacyEntry
    // thay vì vứt lịch sử ôn của thẻ.
    return convertLegacyEntry(
      {
        interval: 0,
        ease: DEFAULT_EASE,
        dueAt: finiteOr(source.dueAt, Date.now()),
        streak: reps,
      },
      stats ??
        (typeof source.lastReview === "number" || source.lapses != null
          ? {
              correct: reps,
              wrong: nonNegativeInt(source.lapses),
              lastSeen: Math.max(0, finiteOr(source.lastReview, 0)),
            }
          : undefined)
    );
  } else {
    difficulty = 0;
  }

  const rawState = finiteOr(source.state, stability > 0 ? SrsState.Review : SrsState.New);
  const state = (
    rawState === SrsState.Learning ||
    rawState === SrsState.Review ||
    rawState === SrsState.Relearning
      ? rawState
      : SrsState.New
  ) as SrsState;

  return {
    dueAt: finiteOr(source.dueAt, Date.now()),
    stability,
    difficulty,
    elapsedDays: Math.max(0, finiteOr(source.elapsedDays, 0)),
    scheduledDays: Math.max(0, finiteOr(source.scheduledDays, 0)),
    learningSteps: nonNegativeInt(source.learningSteps),
    reps,
    lapses: nonNegativeInt(source.lapses),
    // Thẻ New mà stability = 0 giữ nguyên New; state=New với
    // stability > 0 là tổ hợp hỏng → coi như Review.
    state: state === SrsState.New && stability > 0 ? SrsState.Review : state,
    lastReview: Math.max(0, finiteOr(source.lastReview, 0)),
  };
}

/** Chuẩn hóa cả một Record srs (dùng trong migrate của store). */
export function normalizeSrsRecord(
  srs: Record<string, AnySrsEntry> | undefined | null,
  wordStats?: Record<string, SrsWordStats>
): Record<string, SrsEntry> {
  const out: Record<string, SrsEntry> = {};
  for (const [target, entry] of Object.entries(srs ?? {})) {
    const normalized = normalizeSrsEntry(entry, wordStats?.[target]);
    if (normalized) out[target] = normalized;
  }
  return out;
}

/** Thẻ FSRS mới tinh (chưa từng ôn), due ngay tại `now`. */
export function createSrsEntry(now = Date.now()): SrsEntry {
  return {
    dueAt: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: SrsState.New,
    lastReview: 0,
  };
}

/* --------------------- Cầu nối sang thẻ ts-fsrs --------------------- */

function entryToFsrsCard(entry: SrsEntry): Card {
  if (entry.state === SrsState.New && entry.stability <= 0 && entry.reps <= 0) {
    // Giữ đúng thẻ rỗng canonical của thư viện cho thẻ mới tinh
    // (last_review phải vắng mặt, D=0/S=0), chỉ mang theo lapses mà
    // chuyển đổi có thể đã ghi từ wordStats cũ.
    const empty = createEmptyCard(new Date(entry.dueAt));
    return { ...empty, lapses: entry.lapses };
  }
  return {
    due: new Date(entry.dueAt),
    stability: entry.stability,
    difficulty: entry.difficulty,
    elapsed_days: entry.elapsedDays,
    scheduled_days: entry.scheduledDays,
    learning_steps: entry.learningSteps,
    reps: entry.reps,
    lapses: entry.lapses,
    state: entry.state as State,
    last_review: entry.lastReview > 0 ? new Date(entry.lastReview) : undefined,
  } as Card;
}

function entryFromFsrsCard(card: Card, elapsedDays: number, now: number): SrsEntry {
  const dueAt = new Date(card.due).getTime();
  // Kiểu Card của ts-fsrs 6 không còn khai báo elapsed_days (runtime
  // vẫn có thể mang theo) — đọc qua ép kiểu hẹp, thiếu thì dùng số
  // ngày đã trôi qua do chính hàm ôn tập tính từ lastReview.
  const cardElapsed = (card as { elapsed_days?: unknown }).elapsed_days;
  return {
    dueAt,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays:
      typeof cardElapsed === "number" && Number.isFinite(cardElapsed)
        ? cardElapsed
        : elapsedDays,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as SrsState,
    lastReview: card.last_review ? new Date(card.last_review).getTime() : now,
  };
}

/* --------------------------- API bề mặt --------------------------- */

/**
 * Ôn một từ. Quality giữ nguyên quy ước bề mặt cũ:
 * 0 = sai (FSRS Again), 1 = đúng nhưng khó (Hard), 2 = đúng tốt (Good).
 * Entry đầu vào có thể là entry FSRS mới, entry SM-2 cũ (tự chuyển
 * đổi lười) hoặc undefined (thẻ mới). Tham số `now` thứ ba là tùy
 * chọn (mặc định Date.now() như bản cũ) — phục vụ kiểm thử tất định.
 *
 * Bất biến: kết quả của một lần ôn ĐÚNG (Good/Hard) không bao giờ có
 * dueAt nằm trong quá khứ; Again cũng hẹn lại rất sớm (1–10 phút,
 * theo learning/relearning step của FSRS) chứ không ở quá khứ.
 */
export function reviewWord(
  entry: AnySrsEntry | undefined,
  quality: 0 | 1 | 2,
  now = Date.now()
): SrsEntry {
  const rating =
    quality === 0 ? Rating.Again : quality === 1 ? Rating.Hard : Rating.Good;
  const normalized = normalizeSrsEntry(entry) ?? createSrsEntry(now);
  const elapsedDays =
    normalized.lastReview > 0
      ? Math.max(0, Math.floor((now - normalized.lastReview) / DAY_MS))
      : 0;

  let nextCard: Card;
  try {
    nextCard = scheduler.next(entryToFsrsCard(normalized), new Date(now), rating).card;
  } catch {
    // Phòng vệ dữ liệu persist hỏng mà normalize chưa lường hết:
    // ôn lại từ một thẻ đã sửa tối thiểu (giữ reps/lapses/due) hoặc
    // thẻ rỗng — không bao giờ để màn ôn tập văng lỗi vì một entry.
    const repaired: SrsEntry =
      normalized.reps > 0 || normalized.stability > 0
        ? {
            ...normalized,
            stability: normalized.stability > 0 ? normalized.stability : 1,
            difficulty:
              normalized.difficulty >= 1
                ? clamp(normalized.difficulty, 1, 10)
                : 5,
            state:
              normalized.state === SrsState.New
                ? SrsState.Review
                : normalized.state,
          }
        : createSrsEntry(now);
    try {
      nextCard = scheduler.next(entryToFsrsCard(repaired), new Date(now), rating).card;
    } catch {
      nextCard = scheduler.next(createEmptyCard(new Date(now)), new Date(now), rating).card;
    }
  }

  const result = entryFromFsrsCard(nextCard, elapsedDays, now);
  if (!(result.dueAt > now)) {
    // Bất biến lịch hẹn (đồng hồ máy lệch, edge case của thư viện):
    // hẹn lại sau 1 phút — learning step ngắn nhất của FSRS.
    result.dueAt = now + MINUTE_MS;
  }
  return result;
}

export function isDue(
  entry: AnySrsEntry | undefined | null,
  now = Date.now()
) {
  if (!entry) return true;
  const normalized = normalizeSrsEntry(entry);
  return !normalized || normalized.dueAt <= now;
}

export function dueInDays(entry: AnySrsEntry, now = Date.now()) {
  const normalized = normalizeSrsEntry(entry);
  if (!normalized) return 0;
  const ms = normalized.dueAt - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}
