#!/usr/bin/env node
/**
 * Test Phase 3 redesign — BẢN ĐỒ ĐƯỜNG ĐI (src/lib/adventure.ts):
 * - Chặng hoá 6 bài theo globalIndex: Anh 108 bài → 18 chặng đầy;
 *   Nhật/Trung 103 bài → 17 chặng đầy + chặng cuối 1 bài (tổng 18).
 *   Biển chặng = tên unit của bài đầu chặng (dữ liệu thật).
 * - Trạng thái rương suy đúng từ completedLessons mẫu (chặng xong hết
 *   mới mở; thiếu 1 bài là đóng).
 * - Trạng thái checkpoint khớp helper Phase 2 cho 3 cấp độ trên tiến
 *   độ trống: bài hiện tại = globalIndex 0/44/81 với khóa Anh; bài
 *   trước sàn khóa, bài đã xong không bao giờ khóa.
 * - Hình học đường đi: tất định (2 lần dựng cho cùng kết quả), x nằm
 *   trong bề rộng cột (320/360/480), y tăng đơn điệu, có đủ biển +
 *   rương cho mỗi chặng.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-adventure-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/adventure.ts',
    '--module',
    'commonjs',
    '--target',
    'ES2022',
    '--moduleResolution',
    'node',
    '--ignoreDeprecations',
    '6.0',
    '--resolveJsonModule',
    '--esModuleInterop',
    '--skipLibCheck',
    '--types',
    'node',
    '--outDir',
    outDir,
  ],
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const adventure = require(path.join(outDir, 'lib', 'adventure.js'));
const content = require(path.join(outDir, 'lib', 'content.js'));
const {
  STAGE_DECORATION_EMOJIS,
  STAGE_SIZE,
  buildAdventureLayout,
  buildStages,
  chestStateForStage,
  checkpointState,
  isStageComplete,
  planHop,
  stageCompletedCount,
} = adventure;
const { catalog, effectiveFrontierIndex, useCourseContent } = content;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const courses = {};
for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
  courses[courseId] = useCourseContent(courseId).allLessons;
}

console.log('test-adventure-map: chặng / rương / checkpoint / hình học đường đi');

check('STAGE_SIZE = 6 (chặng 6 bài theo brief)', () => {
  assert.equal(STAGE_SIZE, 6);
});

check('en-vi: 108 bài → 18 chặng đầy 6 bài, ranh giới khớp globalIndex', () => {
  const all = courses['en-vi'];
  assert.equal(all.length, 108);
  const stages = buildStages(all);
  assert.equal(stages.length, 18);
  stages.forEach((stage, i) => {
    assert.equal(stage.index, i);
    assert.equal(stage.lessons.length, 6);
    assert.equal(stage.startGlobal, i * 6);
    assert.equal(stage.endGlobal, i * 6 + 5);
    // Biển chặng = tên unit của bài đầu chặng (dữ liệu thật).
    assert.equal(stage.title, all[i * 6].unit.title);
    // Các bài trong chặng liên tiếp, đúng thứ tự toàn cục.
    stage.lessons.forEach((ref, j) => {
      assert.equal(ref.globalIndex, i * 6 + j);
      assert.equal(ref.lesson.id, all[i * 6 + j].lesson.id);
    });
  });
});

for (const courseId of ['ja-vi', 'zh-vi']) {
  check(`${courseId}: 103 bài → 17 chặng đầy + chặng cuối 1 bài (tổng 18 chặng)`, () => {
    const all = courses[courseId];
    assert.equal(all.length, 103);
    const stages = buildStages(all);
    assert.equal(stages.length, 18);
    stages.slice(0, 17).forEach((stage, i) => {
      assert.equal(stage.lessons.length, 6, `chặng ${i}`);
      assert.equal(stage.startGlobal, i * 6);
      assert.equal(stage.endGlobal, i * 6 + 5);
    });
    const last = stages[17];
    assert.equal(last.lessons.length, 1);
    assert.equal(last.startGlobal, 102);
    assert.equal(last.endGlobal, 102);
    assert.equal(last.title, all[102].unit.title);
    // Mọi bài xuất hiện đúng 1 lần, giữ nguyên thứ tự.
    const flat = stages.flatMap((s) => s.lessons.map((r) => r.lesson.id));
    assert.deepEqual(flat, all.map((r) => r.lesson.id));
  });
}

check('rương: tiến độ trống → mọi rương đóng; xong 1 chặng → chỉ rương đó mở', () => {
  const all = courses['en-vi'];
  const stages = buildStages(all);
  const empty = {};
  for (const stage of stages) {
    assert.equal(chestStateForStage(stage, empty), 'closed');
    assert.equal(isStageComplete(stage, empty), false);
    assert.equal(stageCompletedCount(stage, empty), 0);
  }
  const onlyStage0 = {};
  for (const ref of stages[0].lessons) onlyStage0[ref.lesson.id] = true;
  assert.equal(chestStateForStage(stages[0], onlyStage0), 'open');
  assert.equal(isStageComplete(stages[0], onlyStage0), true);
  assert.equal(stageCompletedCount(stages[0], onlyStage0), 6);
  assert.equal(chestStateForStage(stages[1], onlyStage0), 'closed');
});

check('rương: thiếu đúng 1 bài trong chặng → vẫn đóng, đếm đúng 5/6', () => {
  const all = courses['en-vi'];
  const stages = buildStages(all);
  const almost = {};
  stages[3].lessons.forEach((ref, j) => {
    if (j < 5) almost[ref.lesson.id] = true;
  });
  assert.equal(stageCompletedCount(stages[3], almost), 5);
  assert.equal(isStageComplete(stages[3], almost), false);
  assert.equal(chestStateForStage(stages[3], almost), 'closed');
  // Bài lạ ngoài chặng không làm chặng "xong hộ".
  const stray = { ...almost, [stages[4].lessons[0].lesson.id]: true };
  assert.equal(stageCompletedCount(stages[3], stray), 5);
  assert.equal(chestStateForStage(stages[3], stray), 'closed');
});

check('rương: học xong toàn khóa → mọi rương mở', () => {
  const all = courses['ja-vi'];
  const full = {};
  for (const ref of all) full[ref.lesson.id] = true;
  for (const stage of buildStages(all)) {
    assert.equal(chestStateForStage(stage, full), 'open');
  }
});

/** Trạng thái checkpoint của mọi bài, tính như component bản đồ tính. */
function statesFor(courseId, completed, level, unlockedAll = false) {
  const all = courses[courseId];
  const ids = all.map((l) => l.lesson.id);
  const frontier = effectiveFrontierIndex(completed, ids, level);
  return {
    frontier,
    states: all.map((ref) =>
      checkpointState({
        unlockedAll,
        completed: !!completed[ref.lesson.id],
        globalIndex: ref.globalIndex,
        frontierIndex: frontier,
      }),
    ),
  };
}

const EXPECTED_FRONTIER = { moi: 0, 'da-biet': 44, 'chuyen-nghiep': 81 };
for (const [level, expected] of Object.entries(EXPECTED_FRONTIER)) {
  check(`en-vi tiến độ trống, cấp độ ${level}: bài hiện tại = ${expected}, đúng 1 bài current`, () => {
    const { frontier, states } = statesFor('en-vi', {}, level);
    assert.equal(frontier, expected);
    assert.equal(states.filter((s) => s === 'current').length, 1);
    assert.equal(states[expected], 'current');
    assert.equal(states.filter((s) => s === 'completed').length, 0);
    // Mọi bài còn lại đều khóa (chưa mở khóa toàn bộ).
    states.forEach((s, i) => {
      if (i !== expected) assert.equal(s, 'locked', `bài ${i}`);
    });
  });
}

check('en-vi da-biet: bài ngay trước sàn (43) khóa, bài ở sàn (44) là current', () => {
  const { states } = statesFor('en-vi', {}, 'da-biet');
  assert.equal(states[43], 'locked');
  assert.equal(states[44], 'current');
  assert.equal(states[0], 'locked');
});

check('checkpoint: bài đã xong không bao giờ khóa; biên tiến theo tiến độ thật', () => {
  const all = courses['en-vi'];
  const completed = {};
  for (let i = 0; i <= 5; i++) completed[all[i].lesson.id] = true;
  const { frontier, states } = statesFor('en-vi', completed, 'moi');
  assert.equal(frontier, 6);
  for (let i = 0; i <= 5; i++) assert.equal(states[i], 'completed', `bài ${i}`);
  assert.equal(states[6], 'current');
  assert.equal(states[7], 'locked');
  // Hạ/nâng cấp độ: bài đã xong vẫn completed ở mọi cấp độ.
  for (const level of ['da-biet', 'chuyen-nghiep']) {
    const s2 = statesFor('en-vi', completed, level).states;
    for (let i = 0; i <= 5; i++) assert.equal(s2[i], 'completed', `${level} bài ${i}`);
  }
});

check('checkpoint: mở khóa toàn bộ (unlockedAll) → không bài nào khóa, biên vẫn là current', () => {
  const { states } = statesFor('en-vi', {}, 'da-biet', true);
  assert.equal(states.filter((s) => s === 'locked').length, 0);
  assert.equal(states[44], 'current');
  assert.equal(states[0], 'open');
  assert.equal(states[107], 'open');
});

check('hình học: tất định — dựng 2 lần cho kết quả y hệt (en-vi, 360px)', () => {
  const all = courses['en-vi'];
  const a = buildAdventureLayout(all, 360);
  const b = buildAdventureLayout(all, 360);
  assert.deepEqual(a, b);
});

for (const width of [320, 360, 480]) {
  check(`hình học ${width}px: x trong cột, y tăng đơn điệu, đủ biển + rương`, () => {
    const all = courses['en-vi'];
    const layout = buildAdventureLayout(all, width);
    assert.equal(layout.points.length, 108);
    assert.equal(layout.banners.length, 18);
    assert.equal(layout.chests.length, 18);
    let prevY = -Infinity;
    for (const point of layout.points) {
      // Vòng tròn checkpoint 64px phải nằm gọn trong bề rộng cột.
      assert.ok(point.x - 32 >= 0, `x=${point.x} tràn trái ở ${width}px`);
      assert.ok(point.x + 32 <= width, `x=${point.x} tràn phải ở ${width}px`);
      assert.ok(point.y > prevY, `y không tăng tại bài ${point.globalIndex}`);
      prevY = point.y;
    }
    // Rương của mỗi chặng nằm dưới bài cuối chặng; biển chặng sau nằm dưới rương trước.
    layout.chests.forEach((chest, i) => {
      const lastPoint = layout.points[(i + 1) * 6 - 1];
      assert.ok(chest.y > lastPoint.y, `rương chặng ${i}`);
      if (i + 1 < layout.banners.length) {
        assert.ok(layout.banners[i + 1].y > chest.y, `biển chặng ${i + 1}`);
      }
    });
    assert.ok(layout.height > layout.points[layout.points.length - 1].y);
    assert.ok(layout.pathD.startsWith('M '), 'pathD mở đầu bằng M');
    assert.ok(layout.pathD.includes(' C '), 'pathD có đoạn cong Bezier');
  });
}

check('hình học: khóa 103 bài cũng đủ 18 biển + 18 rương, y tăng đơn điệu', () => {
  const layout = buildAdventureLayout(courses['zh-vi'], 360);
  assert.equal(layout.points.length, 103);
  assert.equal(layout.banners.length, 18);
  assert.equal(layout.chests.length, 18);
  for (let i = 1; i < layout.points.length; i++) {
    assert.ok(layout.points[i].y > layout.points[i - 1].y, `bài ${i}`);
  }
});

check('Đợt A — trang trí tranh phiêu lưu: mỗi chặng 1 đảo + 1 vật trang trí, mây rải dọc bản đồ', () => {
  const all = courses['en-vi'];
  const layout = buildAdventureLayout(all, 360);
  assert.equal(layout.islands.length, 18);
  assert.equal(layout.decorations.length, 18);
  assert.ok(layout.clouds.length >= 10, 'bản đồ dài phải có nhiều mây');
  layout.islands.forEach((island, i) => {
    assert.equal(island.stageIndex, i);
    assert.ok(island.rx > 100 && island.rx <= 178, `đảo ${i} rx=${island.rx}`);
    assert.ok(island.ry >= 190 && island.ry <= 290, `đảo ${i} ry=${island.ry}`);
    // Tâm đảo nằm trong cột; ellipse được phép tràn mép (SVG tự cắt,
    // đúng kiểu đảo bị cắt bởi khung tranh) nhưng không được lệch hẳn ra ngoài.
    assert.ok(island.x >= 60 && island.x <= 300, `đảo ${i} tâm x=${island.x}`);
  });
  layout.decorations.forEach((deco, i) => {
    assert.equal(deco.emoji, STAGE_DECORATION_EMOJIS[i % STAGE_DECORATION_EMOJIS.length]);
    assert.ok(deco.x >= 34 && deco.x <= 326, `trang trí ${i} x=${deco.x}`);
  });
  for (const cloud of layout.clouds) {
    assert.ok(cloud.x >= 54 && cloud.x <= 306, `mây x=${cloud.x}`);
    assert.ok(cloud.scale >= 0.75 && cloud.scale <= 1.2, `mây scale=${cloud.scale}`);
    assert.ok(cloud.y < layout.height, 'mây nằm trong chiều cao bản đồ');
  }
});

check('Đợt A — đảo/mây/trang trí tất định: dựng 2 lần deep-equal ở cả 320px và 480px', () => {
  for (const width of [320, 480]) {
    const a = buildAdventureLayout(courses['ja-vi'], width);
    const b = buildAdventureLayout(courses['ja-vi'], width);
    assert.deepEqual(
      { islands: a.islands, clouds: a.clouds, decorations: a.decorations },
      { islands: b.islands, clouds: b.clouds, decorations: b.decorations },
    );
  }
});

check('Đợt A — planHop: chưa từng mở (seen=null) → đứng yên tại biên, mốc = biên', () => {
  assert.deepEqual(planHop(null, 44, 108), {
    shouldHop: false,
    fromIndex: 44,
    toIndex: 44,
    newSeen: 44,
  });
  assert.deepEqual(planHop(null, 0, 108), {
    shouldHop: false,
    fromIndex: 0,
    toIndex: 0,
    newSeen: 0,
  });
});

check('Đợt A — planHop: biên tiến so với mốc → nhảy từ điểm mốc tới điểm hiện tại', () => {
  assert.deepEqual(planHop(44, 45, 108), {
    shouldHop: true,
    fromIndex: 44,
    toIndex: 45,
    newSeen: 45,
  });
  // Học liền nhiều bài mới quay lại: nhảy một mạch qua các điểm giữa.
  assert.deepEqual(planHop(10, 30, 108), {
    shouldHop: true,
    fromIndex: 10,
    toIndex: 30,
    newSeen: 30,
  });
  // Học xong toàn khóa: biên thô = total, điểm đích hiển thị kẹp ở bài cuối.
  assert.deepEqual(planHop(107, 108, 108), {
    shouldHop: true,
    fromIndex: 107,
    toIndex: 107,
    newSeen: 108,
  });
});

check('Đợt A — planHop: biên bằng mốc → đứng yên, mốc giữ nguyên', () => {
  assert.deepEqual(planHop(45, 45, 108), {
    shouldHop: false,
    fromIndex: 45,
    toIndex: 45,
    newSeen: 45,
  });
});

check('Đợt A — planHop: hạ cấp độ (biên lùi) → KHÔNG nhảy ngược, mốc lùi theo biên', () => {
  assert.deepEqual(planHop(81, 44, 108), {
    shouldHop: false,
    fromIndex: 44,
    toIndex: 44,
    newSeen: 44,
  });
  assert.deepEqual(planHop(108, 0, 108), {
    shouldHop: false,
    fromIndex: 0,
    toIndex: 0,
    newSeen: 0,
  });
});

check('Đợt A — planHop: khóa rỗng (total=0) → không nhảy, không crash', () => {
  const plan = planHop(null, 0, 0);
  assert.equal(plan.shouldHop, false);
  assert.equal(planHop(3, 5, 0).shouldHop, false);
});

check('baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const course of catalog.courses) {
    const { allLessons } = useCourseContent(course.id);
    lessons += allLessons.length;
    for (const ref of allLessons) exercises += ref.lesson.exercises.length;
    units += new Set(allLessons.map((l) => l.unit.id)).size;
  }
  assert.equal(units, 80);
  assert.equal(lessons, 314);
  assert.equal(exercises, 2488);
});

console.log(`\nPASS test-adventure-map: ${passed} nhóm kiểm tra đạt.`);
