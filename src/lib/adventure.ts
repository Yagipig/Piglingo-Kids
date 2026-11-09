import { isLockedAtFrontier, type LessonRef } from "./content";

/**
 * Logic THUẦN cho BẢN ĐỒ ĐƯỜNG ĐI (Phase 3 redesign) — chỉ suy từ dữ
 * liệu thật (danh sách bài của khóa + `completedLessons` trong store),
 * không lưu thêm trạng thái nào:
 *
 * - CHẶNG: nhóm 6 bài liên tiếp theo `globalIndex`. Biển tên chặng lấy
 *   TÊN UNIT của bài đầu chặng (dữ liệu thật trong pack).
 * - RƯƠNG cuối chặng: trạng thái suy từ `completedLessons` — học xong
 *   mọi bài trong chặng thì rương mở được. Mở rương chỉ là màn ăn mừng
 *   hiển thị sao/XP của chặng, KHÔNG cộng XP mới, KHÔNG gắn phần
 *   thưởng gia đình.
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
}): CheckpointState {
  if (opts.completed) return "completed";
  if (opts.globalIndex === opts.frontierIndex) return "current";
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

  return { width, height, points, banners, chests, pathD: buildPathD(points) };
}
