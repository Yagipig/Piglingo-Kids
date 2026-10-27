#!/usr/bin/env node
/**
 * Test logic thuần của hệ thống phần thưởng bằng Node.
 *
 * Script biên dịch tạm src/lib/rewards.ts + rewards-defaults.ts ra thư mục
 * hệ thống (không sinh file vào src), rồi kiểm tra evaluateCondition,
 * familyRewardStatus, mergeFamilyRewards và baseline nội dung packs.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-rewards-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/rewards.ts',
    'src/lib/rewards-defaults.ts',
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
    '--outDir',
    outDir,
  ],
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const rewards = require(path.join(outDir, 'lib', 'rewards.js'));
const defaults = require(path.join(outDir, 'lib', 'rewards-defaults.js'));
const content = require(path.join(outDir, 'lib', 'content.js'));

const {
  evaluateCondition,
  familyRewardStatus,
  mergeFamilyRewards,
  sanitizeGlobalReward,
  scopedFamilyRewards,
} = rewards;
const { DEFAULT_GLOBAL_REWARDS } = defaults;
const { catalog, getPack } = content;

function emptyProgress() {
  return { courses: { 'en-vi': { completedLessons: {} }, 'ja-vi': { completedLessons: {} }, 'zh-vi': { completedLessons: {} } } };
}

function lessonIds(courseId, count) {
  const pack = getPack(courseId);
  const ids = pack.sections.flatMap((section) =>
    section.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)),
  );
  return count == null ? ids : ids.slice(0, count);
}

function progressWith(courseId, ids) {
  const progress = emptyProgress();
  progress.courses[courseId].completedLessons = Object.fromEntries(ids.map((id) => [id, true]));
  return progress;
}

function allProgress(missingLastLessonOf = null) {
  const progress = emptyProgress();
  for (const course of catalog.courses) {
    let ids = lessonIds(course.id);
    if (missingLastLessonOf === course.id) ids = ids.slice(0, -1);
    progress.courses[course.id].completedLessons = Object.fromEntries(ids.map((id) => [id, true]));
  }
  return progress;
}

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

check('course-percent: 0% chưa đạt; 15/60 bài đạt mốc 25% nhưng chưa đạt 50%', () => {
  const emptyEval = evaluateCondition(
    { type: 'course-percent', courseId: 'en-vi', percent: 25 },
    emptyProgress(),
  );
  assert.equal(emptyEval.done, false);
  assert.equal(emptyEval.percent, 0);

  const progress = progressWith('en-vi', lessonIds('en-vi', 15));
  const at25 = evaluateCondition(
    { type: 'course-percent', courseId: 'en-vi', percent: 25 },
    progress,
  );
  assert.equal(at25.done, true);
  assert.equal(at25.percent, 100);
  assert.equal(at25.completed, 15);
  assert.equal(at25.total, 60);

  const at50 = evaluateCondition(
    { type: 'course-percent', courseId: 'en-vi', percent: 50 },
    progress,
  );
  assert.equal(at50.done, false);
  assert.equal(at50.percent, 50);
});

check('course-complete: chỉ đạt khi mọi bài thật của khóa đều hoàn thành', () => {
  const allJa = progressWith('ja-vi', lessonIds('ja-vi'));
  const done = evaluateCondition({ type: 'course-complete', courseId: 'ja-vi' }, allJa);
  assert.equal(done.done, true);
  assert.equal(done.percent, 100);

  const missingOne = progressWith('ja-vi', lessonIds('ja-vi').slice(0, -1));
  const notDone = evaluateCondition({ type: 'course-complete', courseId: 'ja-vi' }, missingOne);
  assert.equal(notDone.done, false);
  assert.equal(notDone.percent, 98);
});

check('units-completed: unit chỉ được tính khi mọi lesson trong unit đã xong', () => {
  const pack = getPack('en-vi');
  const firstUnit = pack.sections[0].units[0];
  const allUnitLessons = firstUnit.lessons.map((lesson) => lesson.id);
  const complete = progressWith('en-vi', allUnitLessons);
  assert.equal(
    evaluateCondition({ type: 'units-completed', count: 1 }, complete).done,
    true,
  );

  const incomplete = progressWith('en-vi', allUnitLessons.slice(0, -1));
  const evaluation = evaluateCondition({ type: 'units-completed', count: 1 }, incomplete);
  assert.equal(evaluation.done, false);
  assert.equal(evaluation.completed, 0);
});

check('all-courses-complete: đạt khi cả 3 khóa 100%, thiếu 1 bài thì chưa đạt', () => {
  const complete = evaluateCondition({ type: 'all-courses-complete' }, allProgress());
  assert.equal(complete.done, true);
  assert.equal(complete.percent, 100);
  assert.equal(complete.completed, 170);
  assert.equal(complete.total, 170);

  const incomplete = evaluateCondition(
    { type: 'all-courses-complete' },
    allProgress('zh-vi'),
  );
  assert.equal(incomplete.done, false);
  assert.equal(incomplete.completed, 169);
});

check('familyRewardStatus: pending → achieved → given, givenAt luôn thắng', () => {
  const baseReward = {
    id: 'family-test',
    ownerId: null,
    childName: 'Con',
    title: 'Quà test',
    message: '',
    emoji: '🎁',
    budgetText: null,
    condition: { type: 'course-complete', courseId: 'ja-vi' },
    secretUntilDone: true,
    givenAt: null,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  };
  assert.equal(familyRewardStatus(baseReward, emptyProgress()), 'pending');
  assert.equal(
    familyRewardStatus(baseReward, progressWith('ja-vi', lessonIds('ja-vi'))),
    'achieved',
  );
  assert.equal(
    familyRewardStatus({ ...baseReward, givenAt: 123 }, emptyProgress()),
    'given',
  );
});

check('mergeFamilyRewards: id duy nhất, bản mới hơn thắng, deletedAt thắng khi mới hơn/hòa', () => {
  const base = {
    id: 'merge-1',
    ownerId: 'owner-a',
    childName: 'Con',
    title: 'Bản cũ',
    message: '',
    emoji: '🎁',
    budgetText: null,
    condition: { type: 'all-courses-complete' },
    secretUntilDone: false,
    givenAt: null,
    createdAt: 1,
    updatedAt: 100,
    deletedAt: null,
  };
  const newer = { ...base, title: 'Bản mới', updatedAt: 200 };
  const mergedNewer = mergeFamilyRewards([base], [newer]);
  assert.equal(mergedNewer.length, 1);
  assert.equal(mergedNewer[0].title, 'Bản mới');

  const deletedNewer = { ...newer, deletedAt: 300, updatedAt: 300 };
  const mergedDeleted = mergeFamilyRewards([newer], [deletedNewer]);
  assert.equal(mergedDeleted.length, 1);
  assert.equal(mergedDeleted[0].deletedAt, 300);

  const deletedTie = { ...base, deletedAt: 100 };
  const mergedTie = mergeFamilyRewards([base], [deletedTie]);
  assert.equal(mergedTie[0].deletedAt, 100);
});

check('scopedFamilyRewards: chưa đăng nhập chỉ thấy local, đăng nhập chỉ thấy local + của chính mình', () => {
  const local = { id: 'local', ownerId: null };
  const own = { id: 'own', ownerId: 'user-a' };
  const other = { id: 'other', ownerId: 'user-b' };
  assert.deepEqual(scopedFamilyRewards([local, own, other], null).map((r) => r.id), ['local']);
  assert.deepEqual(scopedFamilyRewards([local, own, other], 'user-a').map((r) => r.id), ['local', 'own']);
});

check('DEFAULT_GLOBAL_REWARDS: hợp lệ, id không trùng, đủ mốc 3 khóa + danh hiệu + parent tips', () => {
  const ids = new Set();
  for (const reward of DEFAULT_GLOBAL_REWARDS) {
    assert.ok(sanitizeGlobalReward(reward), `Reward không hợp lệ: ${reward.id}`);
    assert.ok(!ids.has(reward.id), `Trùng id: ${reward.id}`);
    ids.add(reward.id);
  }
  for (const course of catalog.courses) {
    for (const percent of [25, 50, 75]) {
      assert.ok(
        DEFAULT_GLOBAL_REWARDS.some(
          (reward) =>
            reward.condition.type === 'course-percent' &&
            reward.condition.courseId === course.id &&
            reward.condition.percent === percent,
        ),
        `Thiếu mốc ${percent}% cho ${course.id}`,
      );
    }
    assert.ok(
      DEFAULT_GLOBAL_REWARDS.some(
        (reward) =>
          reward.kind === 'chest' &&
          reward.condition.type === 'course-complete' &&
          reward.condition.courseId === course.id,
      ),
      `Thiếu rương hoàn thành khóa ${course.id}`,
    );
  }
  assert.ok(
    DEFAULT_GLOBAL_REWARDS.some(
      (reward) => reward.kind === 'title' && reward.name === 'Nhà thám hiểm ngôn ngữ',
    ),
  );
  assert.ok(DEFAULT_GLOBAL_REWARDS.filter((reward) => reward.kind === 'parent-tip').length >= 3);
});

check('baseline nội dung packs: 44 unit / 170 bài / 1312 exercise', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const course of catalog.courses) {
    const packJson = JSON.parse(
      readFileSync(path.join(root, 'src', 'content', 'packs', `${course.id}.json`), 'utf8'),
    );
    for (const section of packJson.sections) {
      units += section.units.length;
      for (const unit of section.units) {
        lessons += unit.lessons.length;
        exercises += unit.lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0);
      }
    }
  }
  assert.deepEqual({ units, lessons, exercises }, { units: 44, lessons: 170, exercises: 1312 });
});

console.log(`\nTất cả ${passed} nhóm test phần thưởng PASS.`);
