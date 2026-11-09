#!/usr/bin/env node
/**
 * Test Phase 2 redesign — Hướng 1: cấp độ = điểm bắt đầu mở bài theo
 * tầng độ khó (floorIndexForLevel / effectiveFrontierIndex /
 * isLockedAtFrontier trong src/lib/content.ts).
 *
 * Kiểm tra trên SỐ BÀI THẬT của từng khóa (Anh 108, Nhật 103, Trung 103):
 * - Floor của 3 cấp độ khớp tầng độ khó (moi → 0; da-biet → bài đầu
 *   tầng Nâng cao; chuyen-nghiep → bài đầu tầng Chuyên sâu).
 * - Bài tại floor của da-biet/chuyen-nghiep KHÔNG bị khóa; bài ngay
 *   trước floor vẫn khóa (trừ khi đã hoàn thành).
 * - Đổi cấp độ không đổi completedLessons/totalXp (helper thuần + thân
 *   hàm setLearnerLevel trong store chỉ gán learnerLevel).
 * - Hạ cấp độ không khóa lại bài đã hoàn thành.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-level-floor-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/content.ts',
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
const content = require(path.join(outDir, 'lib', 'content.js'));
const {
  catalog,
  difficultyForIndex,
  effectiveFrontierIndex,
  floorIndexForLevel,
  isLockedAtFrontier,
  tierForLearnerLevel,
  useCourseContent,
} = content;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

/** Bài `globalIndex` có bị khóa không, theo đúng helper app dùng. */
function locked(completed, ids, level, globalIndex, unlockedAll = false) {
  const frontier = effectiveFrontierIndex(completed, ids, level);
  return isLockedAtFrontier({
    unlockedAll,
    completed: !!completed[ids[globalIndex]],
    globalIndex,
    frontierIndex: frontier,
  });
}

const EXPECTED = {
  'en-vi': { lessons: 108, floorDaBiet: 44, floorChuyenNghiep: 81 },
  'ja-vi': { lessons: 103, floorDaBiet: 42, floorChuyenNghiep: 78 },
  'zh-vi': { lessons: 103, floorDaBiet: 42, floorChuyenNghiep: 78 },
};

const courses = {};
for (const [courseId, exp] of Object.entries(EXPECTED)) {
  const { allLessons } = useCourseContent(courseId);
  courses[courseId] = {
    ids: allLessons.map((l) => l.lesson.id),
    total: allLessons.length,
    exp,
  };
}

console.log('test-level-floor: sàn cấp độ + biên hiệu lực (Hướng 1)');

for (const [courseId, { ids, total, exp }] of Object.entries(courses)) {
  check(`${courseId}: số bài thật = ${exp.lessons} và floor của 3 cấp độ đúng tầng`, () => {
    assert.equal(total, exp.lessons);
    assert.equal(ids.length, exp.lessons);
    assert.equal(floorIndexForLevel('moi', total), 0);
    assert.equal(floorIndexForLevel('da-biet', total), exp.floorDaBiet);
    assert.equal(floorIndexForLevel('chuyen-nghiep', total), exp.floorChuyenNghiep);
    // Floor thật sự là bài ĐẦU TIÊN của tầng tương ứng cấp độ.
    for (const level of ['moi', 'da-biet', 'chuyen-nghiep']) {
      const floor = floorIndexForLevel(level, total);
      assert.equal(difficultyForIndex(floor, total), tierForLearnerLevel(level));
      if (floor > 0) {
        assert.notEqual(difficultyForIndex(floor - 1, total), tierForLearnerLevel(level));
      }
    }
  });

  check(`${courseId}: tiến độ rỗng — cấp độ quyết định đúng bài mở duy nhất`, () => {
    const empty = {};
    // moi: học từ bài đầu tiên như hành vi cũ.
    assert.equal(effectiveFrontierIndex(empty, ids, 'moi'), 0);
    assert.equal(locked(empty, ids, 'moi', 0), false);
    assert.equal(locked(empty, ids, 'moi', 1), true);
    // da-biet: bài tại floor MỞ, bài ngay trước floor KHÓA, bài 0 KHÓA.
    assert.equal(effectiveFrontierIndex(empty, ids, 'da-biet'), exp.floorDaBiet);
    assert.equal(locked(empty, ids, 'da-biet', exp.floorDaBiet), false);
    assert.equal(locked(empty, ids, 'da-biet', exp.floorDaBiet - 1), true);
    assert.equal(locked(empty, ids, 'da-biet', 0), true);
    assert.equal(locked(empty, ids, 'da-biet', exp.floorDaBiet + 1), true);
    // chuyen-nghiep: tương tự tại floor chuyên sâu.
    assert.equal(effectiveFrontierIndex(empty, ids, 'chuyen-nghiep'), exp.floorChuyenNghiep);
    assert.equal(locked(empty, ids, 'chuyen-nghiep', exp.floorChuyenNghiep), false);
    assert.equal(locked(empty, ids, 'chuyen-nghiep', exp.floorChuyenNghiep - 1), true);
    assert.equal(locked(empty, ids, 'chuyen-nghiep', exp.floorDaBiet), true);
    // Mở khóa toàn bộ (admin / mã HEOVIP95 → unlockedAll) vẫn mở tất cả.
    for (const level of ['moi', 'da-biet', 'chuyen-nghiep']) {
      assert.equal(locked(empty, ids, level, 0, true), false);
      assert.equal(locked(empty, ids, level, total - 1, true), false);
    }
  });
}

check('en-vi da-biet: học xong bài ở floor thì biên tiến tiếp, không kẹt', () => {
  const { ids, exp } = courses['en-vi'];
  const completed = { [ids[exp.floorDaBiet]]: true };
  assert.equal(effectiveFrontierIndex(completed, ids, 'da-biet'), exp.floorDaBiet + 1);
  assert.equal(locked(completed, ids, 'da-biet', exp.floorDaBiet), false); // đã xong → ôn được
  assert.equal(locked(completed, ids, 'da-biet', exp.floorDaBiet + 1), false); // biên mới
  assert.equal(locked(completed, ids, 'da-biet', exp.floorDaBiet + 2), true);
  assert.equal(locked(completed, ids, 'da-biet', exp.floorDaBiet - 1), true); // chưa học, trước biên
});

check('en-vi da-biet: xong hết từ floor tới cuối → biên quay về phần cơ bản còn thiếu', () => {
  const { ids, total, exp } = { ...courses['en-vi'], total: courses['en-vi'].ids.length };
  const completed = {};
  for (let i = exp.floorDaBiet; i < total; i++) completed[ids[i]] = true;
  assert.equal(effectiveFrontierIndex(completed, ids, 'da-biet'), 0);
  assert.equal(locked(completed, ids, 'da-biet', 0), false);
  assert.equal(locked(completed, ids, 'da-biet', 1), true);
});

check('hạ cấp độ KHÔNG khóa lại bài đã hoàn thành; nâng cấp không lùi tiến độ', () => {
  const { ids, exp } = courses['en-vi'];
  const completed = {};
  for (let i = 0; i <= 50; i++) completed[ids[i]] = true; // xong liên tục 0..50
  // Nâng lên chuyen-nghiep: biên nhảy tới floor chuyên sâu, bài đã xong vẫn mở.
  assert.equal(effectiveFrontierIndex(completed, ids, 'chuyen-nghiep'), exp.floorChuyenNghiep);
  assert.equal(locked(completed, ids, 'chuyen-nghiep', 50), false);
  assert.equal(locked(completed, ids, 'chuyen-nghiep', exp.floorChuyenNghiep), false);
  assert.equal(locked(completed, ids, 'chuyen-nghiep', 51), true); // chưa xong, trước biên
  // Hạ về moi: biên = tiến độ thật (51), bài đã xong 0..50 vẫn mở hết.
  assert.equal(effectiveFrontierIndex(completed, ids, 'moi'), 51);
  for (let i = 0; i <= 50; i++) {
    assert.equal(locked(completed, ids, 'moi', i), false, `bài ${i} đã xong bị khóa lại`);
  }
  assert.equal(locked(completed, ids, 'moi', 51), false);
  assert.equal(locked(completed, ids, 'moi', 52), true);
  // Xong toàn khóa ở mọi cấp độ → biên = total (không còn bài hiện tại).
  const all = {};
  for (const id of ids) all[id] = true;
  for (const level of ['moi', 'da-biet', 'chuyen-nghiep']) {
    assert.equal(effectiveFrontierIndex(all, ids, level), ids.length);
  }
});

check('đổi cấp độ không đổi completedLessons/totalXp (helper thuần + store chỉ gán learnerLevel)', () => {
  const { ids } = courses['en-vi'];
  const completed = Object.freeze({ [ids[3]]: true, [ids[44]]: true });
  const snapshot = JSON.stringify(completed);
  for (const level of ['moi', 'da-biet', 'chuyen-nghiep']) {
    effectiveFrontierIndex(completed, ids, level);
    floorIndexForLevel(level, ids.length);
  }
  assert.equal(JSON.stringify(completed), snapshot);
  // Thân hàm setLearnerLevel trong store.ts chỉ gán learnerLevel —
  // không chạm completedLessons, không cộng XP.
  const storeSrc = readFileSync(path.join(root, 'src', 'lib', 'store.ts'), 'utf8');
  const match = storeSrc.match(/setLearnerLevel:\s*\(level\)\s*=>\s*set\(\{[^}]*\}\)/);
  assert.ok(match, 'không tìm thấy thân setLearnerLevel trong store.ts');
  assert.ok(!/completedLessons|xp/i.test(match[0]), `setLearnerLevel chạm tiến độ/XP: ${match[0]}`);
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

console.log(`\nPASS test-level-floor: ${passed} nhóm kiểm tra đạt.`);
