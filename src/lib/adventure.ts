import { isLockedAtFrontier, type LessonRef } from "./content";

/**
 * Logic THUẦN cho BẢN ĐỒ ĐƯỜNG ĐI (Phase 3 redesign) — chỉ suy từ dữ
 * liệu thật (danh sách bài của khóa + `completedLessons` trong store),
 * không lưu thêm trạng thái nào:
 *
 * - CHẶNG: nhóm 6 bài liên tiếp theo `globalIndex`. Biển tên chặng lấy
 *   TÊN UNIT của bài đầu chặng (dữ liệu thật trong pack).
 * - RƯƠNG cuối chặng: trạng thái suy từ `completedLessons` — học xong
 *   mọi bài trong chặng thì rương mở được. Từ Đợt B+C, mở rương NHẬN
 *   QUÀ THẬT một lần cho thú cưng (XP thưởng/sao/thức ăn/chìa khóa —
 *   xem `stageReward`/`stageClaimCheck` trong pets.ts và action
 *   `claimStageReward` trong store); quà KHÔNG gắn phần thưởng gia
 *   đình ngoài đời.
 * - CHECKPOINT: trạng thái dùng ĐÚNG helper Phase 2
 *   (`isLockedAtFrontier` + biên hiệu lực do nơi gọi tính bằng
 *   `effectiveFrontierIndex`) — không tự chế công thức khóa khác.
 * - HÌNH HỌC đường đi: tất định theo `globalIndex` (hàm sin cố định),
 *   cùng bài luôn cùng vị trí ở mọi lần render/mọi máy.
 */

/** Số bài trong một chặng (brief chốt: chặng 5–7 bài → chọn 6). */
export const STAGE_SIZE = 6;

export type AdventureStage = {
  /** Số thứ tự chặng, từ 0. */
  index: number;
  /** `globalIndex` của bài đầu chặng. */
  startGlobal: number;
  /** `globalIndex` của bài cuối chặng (đã gồm chính nó). */
  endGlobal: number;
  /** Các bài trong chặng, theo đúng thứ tự toàn cục. */
  lessons: LessonRef[];
  /** Tên biển chặng = tên unit của bài đầu chặng (dữ liệu thật). */
  title: string;
};

/** Chia danh sách bài (đã sắp theo globalIndex) thành các chặng 6 bài. */
export function buildStages(allLessons: LessonRef[]): AdventureStage[] {
  const stages: AdventureStage[] = [];
  for (let start = 0; start < allLessons.length; start += STAGE_SIZE) {
    const lessons = allLessons.slice(start, start + STAGE_SIZE);
    if (lessons.length === 0) continue;
    stages.push({
      index: stages.length,
      startGlobal: lessons[0].globalIndex,
      endGlobal: lessons[lessons.length - 1].globalIndex,
      lessons,
      title: lessons[0].unit.title,
    });
  }
  return stages;
}

/** Số bài của chặng đã hoàn thành theo `completedLessons` thật. */
export function stageCompletedCount(
  stage: AdventureStage,
  completedLessons: Record<string, true> = {}
): number {
  return stage.lessons.filter((ref) => completedLessons[ref.lesson.id]).length;
}

/** Chặng hoàn thành = MỌI bài trong chặng đều có trong completedLessons. */
export function isStageComplete(
  stage: AdventureStage,
  completedLessons: Record<string, true> = {}
): boolean {
  return (
    stage.lessons.length > 0 &&
    stageCompletedCount(stage, completedLessons) === stage.lessons.length
  );
}

export type StageChestState = "open" | "closed";

/** Rương mở được khi và chỉ khi chặng đã hoàn thành toàn bộ. */
export function chestStateForStage(
  stage: AdventureStage,
  completedLessons: Record<string, true> = {}
): StageChestState {
  return isStageComplete(stage, completedLessons) ? "open" : "closed";
}

export type CheckpointState = "completed" | "current" | "open" | "locked";

/**
 * Trạng thái 1 checkpoint theo ĐÚNG semantics Phase 2:
 * - `completed`: đã học xong (không bao giờ khóa lại).
 * - `current`: bài ở biên hiệu lực — bài đang học, bấm vào học.
 * - `open`: không phải biên nhưng không khóa (chỉ xảy ra khi đã mở khóa
 *   toàn bộ bằng mã/admin).
 * - `locked`: chưa xong, không phải biên, chưa mở khóa toàn bộ.
 */
export function checkpointState(opts: {
  unlockedAll: boolean;
  completed: boolean;
  globalIndex: number;
  frontierIndex: number;
  /**
   * Bài đã được mở sớm bằng 🔑 Chìa khóa bí mật (Đợt B+C): coi như MỞ
   * (vào học và hoàn thành bình thường) dù chưa tới biên hiệu lực.
   * Biên chính không đổi — học xong bài mở bằng khóa, biên vẫn tính
   * theo helper Phase 2 như cũ.
   */
  keyUnlocked?: boolean;
}): CheckpointState {
  if (opts.completed) return "completed";
  if (opts.globalIndex === opts.frontierIndex) return "current";
  if (opts.keyUnlocked) return "open";
  return isLockedAtFrontier(opts) ? "locked" : "open";
}

/* ------------------------------------------------------------------ */
/* Hình học đường đi — tất định, không random khi render              */
/* ------------------------------------------------------------------ */

/** Chiều cao biển tên chặng (px). */
export const STAGE_BANNER_HEIGHT = 48;
/** Bước dọc giữa tâm 2 checkpoint liên tiếp trong cùng chặng (px). */
export const CHECKPOINT_STEP = 104;
/** Đường kính vòng tròn checkpoint (px); vùng chạm phủ rộng hơn. */
export const CHECKPOINT_SIZE = 64;
/** Khoảng dọc từ tâm bài cuối chặng tới tâm rương (px). */
export const CHEST_OFFSET = 88;
/** Đệm dưới rương trước biển chặng kế tiếp / cuối bản đồ (px). */
export const STAGE_BOTTOM_GAP = 52;
/** Đệm trên cùng của bản đồ (px). */
export const MAP_TOP_PADDING = 12;
/** Đệm dưới cùng sau rương cuối (px). */
export const MAP_BOTTOM_PADDING = 40;

/**
 * Tọa độ ngang của checkpoint: sóng sin tất định theo `globalIndex`.
 * Biên độ tự co theo bề rộng để vòng tròn (64px) + nhãn luôn nằm gọn
 * trong cột — kiểm chứng ở 320px và 480px trong test-adventure-map.
 */
export function checkpointCenterX(globalIndex: number, width: number): number {
  const amplitude = Math.max(30, Math.min(116, width / 2 - 78));
  return width / 2 + Math.sin(globalIndex * 0.92) * amplitude;
}

export type AdventurePoint = { globalIndex: number; x: number; y: number };

/** Đảo cát/cỏ nằm dưới một cụm chặng (phong cách tranh phiêu lưu, Đợt A). */
export type AdventureIsland = {
  stageIndex: number;
  /** Tâm đảo (px) — neo theo điểm giữa của chặng. */
  x: number;
  y: number;
  /** Bán kính ngang/dọc của ellipse đảo (px). */
  rx: number;
  ry: number;
};

/** Mây trắng mềm rải dọc chiều cao bản đồ (phong cách tranh, Đợt A). */
export type AdventureCloud = {
  x: number;
  y: number;
  /** Hệ số cỡ mây, khoảng 0.75–1.2. */
  scale: number;
};

/** Vật trang trí emoji đặt lệch khỏi đường đi, xoay vòng theo chặng. */
export type AdventureDecoration = {
  stageIndex: number;
  emoji: string;
  x: number;
  y: number;
};

export type AdventureLayout = {
  width: number;
  /** Tổng chiều cao nội dung bản đồ (px). */
  height: number;
  /** Tâm từng checkpoint theo thứ tự globalIndex tăng dần; y tăng đơn điệu. */
  points: AdventurePoint[];
  /** Vị trí biển tên từng chặng (y = mép trên của biển). */
  banners: { stageIndex: number; y: number }[];
  /** Tâm rương cuối từng chặng. */
  chests: { stageIndex: number; x: number; y: number }[];
  /** Đảo dưới từng chặng (vẽ bằng SVG, không dùng tranh ngoài). */
  islands: AdventureIsland[];
  /** Mây rải theo quãng dọc bản đồ. */
  clouds: AdventureCloud[];
  /** Vật trang trí tất định theo chặng, lệch khỏi đường đi. */
  decorations: AdventureDecoration[];
  /** Đường SVG qua mọi checkpoint. */
  pathD: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Đường cong mượt qua các điểm bằng Catmull-Rom → Bezier bậc 3.
 * Hàm thuần: cùng danh sách điểm luôn cho cùng chuỗi `d`.
 */
export function buildPathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const first = points[0];
  let d = `M ${round1(first.x)} ${round1(first.y)}`;
  if (points.length === 1) return d;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${round1(c1x)} ${round1(c1y)}, ${round1(c2x)} ${round1(c2y)}, ${round1(p2.x)} ${round1(p2.y)}`;
  }
  return d;
}

/**
 * Bố cục toàn bản đồ cho một bề rộng cột cho trước: biển chặng →
 * các checkpoint của chặng → rương cuối chặng, lặp lại tới hết khóa.
 * y của checkpoint tăng đơn điệu theo globalIndex (biển + rương chỉ
 * chèn thêm khoảng dọc giữa các chặng, không đảo thứ tự).
 */
export function buildAdventureLayout(
  allLessons: LessonRef[],
  width: number
): AdventureLayout {
  const stages = buildStages(allLessons);
  const points: AdventurePoint[] = [];
  const banners: { stageIndex: number; y: number }[] = [];
  const chests: { stageIndex: number; x: number; y: number }[] = [];

  let bannerY = MAP_TOP_PADDING;
  for (const stage of stages) {
    banners.push({ stageIndex: stage.index, y: bannerY });
    let centerY = bannerY + STAGE_BANNER_HEIGHT + 14 + CHECKPOINT_SIZE / 2;
    for (const ref of stage.lessons) {
      points.push({
        globalIndex: ref.globalIndex,
        x: checkpointCenterX(ref.globalIndex, width),
        y: centerY,
      });
      centerY += CHECKPOINT_STEP;
    }
    const lastPoint = points[points.length - 1];
    const chestY = lastPoint.y + CHEST_OFFSET;
    chests.push({ stageIndex: stage.index, x: lastPoint.x, y: chestY });
    bannerY = chestY + STAGE_BOTTOM_GAP;
  }

  const height =
    chests.length > 0
      ? chests[chests.length - 1].y + STAGE_BOTTOM_GAP + MAP_BOTTOM_PADDING
      : MAP_TOP_PADDING + MAP_BOTTOM_PADDING;

  return {
    width,
    height,
    points,
    banners,
    chests,
    islands: buildStageIslands(stages, points, width),
    clouds: buildClouds(height, width),
    decorations: buildStageDecorations(stages, points, width),
    pathD: buildPathD(points),
  };
}

/* ------------------------------------------------------------------ */
/* Trang trí phong cách tranh phiêu lưu (Đợt A) — tất định theo chỉ số */
/* ------------------------------------------------------------------ */

/**
 * Đảo dưới mỗi cụm chặng: ellipse neo ở điểm giữa chặng, bán kính biến
 * thiên mượt bằng hàm sin của chỉ số chặng. Hàm thuần — cùng đầu vào
 * luôn cho cùng đảo, không random khi render, không dùng tranh ngoài.
 */
export function buildStageIslands(
  stages: AdventureStage[],
  points: AdventurePoint[],
  width: number
): AdventureIsland[] {
  const baseRx = Math.min(width / 2 - 2, 178);
  return stages.map((stage) => {
    const mid =
      points[stage.startGlobal + Math.floor((stage.lessons.length - 1) / 2)] ??
      points[stage.startGlobal];
    return {
      stageIndex: stage.index,
      x: mid.x,
      y: round1(mid.y + 16),
      rx: round1(baseRx * (0.9 + 0.1 * Math.sin(stage.index * 1.71))),
      ry: Math.round(238 + 44 * Math.sin(stage.index * 1.31 + 0.7)),
    };
  });
}

/** Mây rải theo quãng ~430px dọc chiều cao bản đồ, vị trí tất định. */
export function buildClouds(height: number, width: number): AdventureCloud[] {
  const clouds: AdventureCloud[] = [];
  const step = 430;
  for (let i = 0, y = 170; y < height; i += 1, y += step) {
    const x = Math.min(
      width - 54,
      Math.max(54, width / 2 + Math.sin(i * 2.13) * (width / 2 - 64))
    );
    clouds.push({
      x: round1(x),
      y: y + ((i * 67) % 80),
      scale: round1(0.75 + ((i * 37) % 45) / 100),
    });
  }
  return clouds;
}

/** Chuỗi emoji trang trí xoay vòng theo chặng (phong cách tranh mẫu). */
export const STAGE_DECORATION_EMOJIS = ["🎈", "⛵", "🌴", "🦋", "🐚"] as const;

/**
 * Một vật trang trí cho mỗi chặng, đặt ở phía trống đối diện điểm giữa
 * chặng so với trục giữa cột (lệch khỏi đường đi, không che checkpoint).
 */
export function buildStageDecorations(
  stages: AdventureStage[],
  points: AdventurePoint[],
  width: number
): AdventureDecoration[] {
  return stages.map((stage) => {
    const mid =
      points[stage.startGlobal + Math.floor((stage.lessons.length - 1) / 2)] ??
      points[stage.startGlobal];
    const side = mid.x >= width / 2 ? -1 : 1;
    const x = Math.min(width - 34, Math.max(34, mid.x + side * 128));
    return {
      stageIndex: stage.index,
      emoji: STAGE_DECORATION_EMOJIS[stage.index % STAGE_DECORATION_EMOJIS.length],
      x: round1(x),
      y: round1(mid.y - 34),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Mốc nhảy lò cò của heo + thú đi theo (Đợt A)                        */
/* ------------------------------------------------------------------ */

export type HopPlan = {
  /** Có nhảy từ điểm cũ tới điểm hiện tại hay không. */
  shouldHop: boolean;
  /** Chỉ số HIỂN THỊ (đã kẹp vào [0, total-1]) của điểm bắt đầu. */
  fromIndex: number;
  /** Chỉ số HIỂN THỊ của điểm đích = điểm ở biên hiệu lực (đã kẹp). */
  toIndex: number;
  /** Mốc mới phải lưu lại sau khi xử lý (giá trị biên thô, chưa kẹp). */
  newSeen: number;
};

/**
 * Quyết định cú nhảy khi mở bản đồ, từ MỐC ĐÃ XEM lưu ngoài store
 * (AsyncStorage theo từng courseId) và BIÊN HIỆU LỰC hiện tại:
 * - Chưa từng mở (seen = null) → đứng yên ở điểm hiện tại, lưu mốc.
 * - Biên TIẾN so với mốc (seen < frontier) → nhảy từ điểm ở mốc tới
 *   điểm hiện tại (đây là cảnh sau khi học xong bài và quay lại bản đồ).
 * - Biên bằng mốc → đứng yên.
 * - Biên LÙI so với mốc (hạ cấp độ) → KHÔNG nhảy ngược, chỉ cập nhật
 *   mốc về biên hiện tại.
 * Hàm thuần để test; `total <= 0` (khóa rỗng) → không nhảy, mốc giữ nguyên.
 */
export function planHop(
  seen: number | null,
  frontierIndex: number,
  total: number
): HopPlan {
  if (total <= 0) {
    return {
      shouldHop: false,
      fromIndex: 0,
      toIndex: 0,
      newSeen: seen ?? frontierIndex,
    };
  }
  const clampDisplay = (v: number) => Math.min(Math.max(v, 0), total - 1);
  const toIndex = clampDisplay(frontierIndex);
  if (seen === null) {
    return { shouldHop: false, fromIndex: toIndex, toIndex, newSeen: frontierIndex };
  }
  if (seen < frontierIndex) {
    return {
      shouldHop: true,
      fromIndex: clampDisplay(seen),
      toIndex,
      newSeen: frontierIndex,
    };
  }
  // seen >= frontier: đứng yên tại điểm hiện tại; hạ cấp độ thì mốc lùi
  // theo biên (không nhảy ngược).
  return { shouldHop: false, fromIndex: toIndex, toIndex, newSeen: frontierIndex };
}
