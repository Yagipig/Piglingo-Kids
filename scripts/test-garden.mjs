#!/usr/bin/env node
/**
 * Test logic thuần của Magical Garden bằng Node.
 *
 * Biên dịch tạm src/lib/kingdoms.ts + src/lib/garden.ts (tsc tự kéo theo
 * content.ts/rewards.ts) ra thư mục hệ thống, rồi kiểm tra: ánh xạ vương
 * quốc, cấp vườn, cây thần, hoa unit, tuần hiện tại, thời lượng ước tính,
 * khóa Mission, companion, reward highlights, hotspot có từ thật trong
 * pack, và baseline nội dung 62 unit / 242 bài / 1894 exercise.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-garden-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/kingdoms.ts',
    'src/lib/garden.ts',
    'src/lib/lands.ts',
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
const kingdoms = require(path.join(outDir, 'lib', 'kingdoms.js'));
const garden = require(path.join(outDir, 'lib', 'garden.js'));
const lands = require(path.join(outDir, 'lib', 'lands.js'));
const content = require(path.join(outDir, 'lib', 'content.js'));

const { kingdomForCourse, hotspotsForCourse, KINGDOMS } = kingdoms;
const {
  gardenLevelForXp,
  treeStageForXp,
  gardenFlowers,
  weeklyChallenge,
  currentWeekDayKeys,
  estimateMinutes,
  missionLocked,
  missionView,
  gardenCompanions,
  recentRewardHighlights,
  totalGardenXp,
  butterfliesReleased,
} = garden;
const { catalog, getPack, useCourseContent } = content;
const { landForUnit } = lands;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function emptyProgress() {
  return {
    courses: {
      'en-vi': { xp: 0, completedLessons: {} },
      'ja-vi': { xp: 0, completedLessons: {} },
      'zh-vi': { xp: 0, completedLessons: {} },
    },
    dailyGoal: 20,
    dailyXp: 0,
    dailyXpDay: null,
    activeDays: {},
  };
}

function completeLessons(progress, courseId, ids) {
  for (const id of ids) progress.courses[courseId].completedLessons[id] = true;
  return progress;
}

function unitLessonIds(courseId, unitIndex) {
  const pack = getPack(courseId);
  return pack.sections[0].units[unitIndex].lessons.map((l) => l.id);
}

function allLessonIds(courseId) {
  return useCourseContent(courseId).allLessons.map((r) => r.lesson.id);
}

console.log('== Magical Garden logic tests ==');

check('1. kingdomForCourse: 3 khóa thật, không có khóa Việt', () => {
  assert.equal(kingdomForCourse('en-vi').kingdomName, 'Vương quốc Cổ Tích');
  assert.equal(kingdomForCourse('ja-vi').kingdomName, 'Vương quốc Hoa Anh Đào');
  assert.equal(kingdomForCourse('zh-vi').kingdomName, 'Vương quốc Đèn Lồng');
  assert.equal(kingdomForCourse('vi-vi'), null);
  assert.equal(kingdomForCourse('vi'), null);
  assert.equal(KINGDOMS.length, 3);
});

check('2. Cấp vườn tại các biên XP', () => {
  const cases = [
    [0, 1], [49, 1], [50, 2], [149, 2], [150, 3], [299, 3], [300, 4],
    [499, 4], [500, 5], [799, 5], [800, 6], [1199, 6], [1200, 7], [5000, 7],
  ];
  for (const [xp, level] of cases) {
    assert.equal(gardenLevelForXp(xp).current.level, level, `xp=${xp}`);
  }
  assert.equal(gardenLevelForXp(0).xpToNext, 50);
  assert.equal(gardenLevelForXp(1200).xpToNext, null);
  assert.equal(gardenLevelForXp(1200).next, null);
});

check('2b. Cây thần đổi giai đoạn theo cùng ngưỡng XP', () => {
  assert.equal(treeStageForXp(0).stage, 0);
  assert.equal(treeStageForXp(49).stage, 0);
  assert.equal(treeStageForXp(50).stage, 1);
  assert.equal(treeStageForXp(300).stage, 3);
  assert.equal(treeStageForXp(1200).stage, 6);
  assert.ok(treeStageForXp(1200).scalePct <= 104);
});

check('3. Hoa unit: 0% = mầm, một phần = đang nở, 100% = nở đầy', () => {
  const fresh = gardenFlowers(emptyProgress());
  assert.equal(fresh.length, 62);
  assert.ok(fresh.every((f) => f.state === 'seed'));

  const partial = emptyProgress();
  const firstUnit = unitLessonIds('en-vi', 0);
  completeLessons(partial, 'en-vi', firstUnit.slice(0, 1));
  const flowersPartial = gardenFlowers(partial);
  assert.equal(flowersPartial[0].state, 'growing');
  assert.ok(flowersPartial[0].ratio > 0 && flowersPartial[0].ratio < 1);

  const full = emptyProgress();
  completeLessons(full, 'en-vi', firstUnit);
  const flowersFull = gardenFlowers(full);
  assert.equal(flowersFull[0].state, 'bloomed');
  assert.equal(flowersFull[0].flowerEmoji, '🌷');
});

check('4. Tuần hiện tại: thứ Hai → Chủ nhật, không lẫn tuần trước/sau', () => {
  const now = new Date();
  const keys = currentWeekDayKeys(now);
  assert.equal(keys.length, 7);
  const parse = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  assert.equal(parse(keys[0]).getDay(), 1, 'khóa đầu là thứ Hai');
  assert.equal(parse(keys[6]).getDay(), 0, 'khóa cuối là Chủ nhật');
  for (let i = 1; i < 7; i++) {
    assert.equal((parse(keys[i]) - parse(keys[i - 1])) / 86400000, 1);
  }

  const progress = emptyProgress();
  const monday = parse(keys[0]);
  const prevSunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  progress.activeDays[keys[0]] = { xp: 30, lessons: 2, perfect: 0 };
  progress.activeDays[keys[6]] = { xp: 25, lessons: 3, perfect: 1 };
  progress.activeDays[keyOf(prevSunday)] = { xp: 999, lessons: 99, perfect: 0 };
  progress.activeDays[keyOf(nextMonday)] = { xp: 999, lessons: 99, perfect: 0 };
  const week = weeklyChallenge(progress, now);
  assert.equal(week.xp.value, 55);
  assert.equal(week.xp.target, 100); // max(50, 20*5)
  assert.equal(week.lessons.value, 5);
  assert.equal(week.lessons.done, true);
});

check('5. Thời lượng ước tính: 4 → 2 phút, 7 → 4 phút, 11 → 6 phút', () => {
  assert.equal(estimateMinutes(4), 2);
  assert.equal(estimateMinutes(7), 4);
  assert.equal(estimateMinutes(11), 6);
  assert.equal(estimateMinutes(0), 1);
});

check('6. Mission lock + CTA theo công thức khóa duy nhất', () => {
  assert.equal(missionLocked(false, 5, 2), true);
  assert.equal(missionLocked(true, 5, 2), false);
  assert.equal(missionLocked(false, 2, 2), false);
  assert.equal(missionLocked(false, 1, 2), false);

  const { allLessons } = useCourseContent('en-vi');
  const ref5 = allLessons[5];
  const lockedView = missionView(ref5, {
    completedLessons: {},
    currentIndex: 0,
    unlockedAll: false,
    totalLessons: allLessons.length,
  });
  assert.equal(lockedView.locked, true);
  assert.equal(lockedView.cta, 'locked');

  const openView = missionView(ref5, {
    completedLessons: {},
    currentIndex: 0,
    unlockedAll: true,
    totalLessons: allLessons.length,
  });
  assert.equal(openView.locked, false);
  assert.equal(openView.cta, 'start');

  const doneView = missionView(allLessons[0], {
    completedLessons: { [allLessons[0].lesson.id]: true },
    currentIndex: 1,
    unlockedAll: false,
    totalLessons: allLessons.length,
  });
  assert.equal(doneView.completed, true);
  assert.equal(doneView.cta, 'review');
});

check('7. Companion mở theo mốc thật, không theo streak', () => {
  const fresh = gardenCompanions(emptyProgress());
  assert.deepEqual(
    fresh.filter((c) => c.unlocked).map((c) => c.id),
    ['piggy'],
  );

  const oneLesson = emptyProgress();
  completeLessons(oneLesson, 'en-vi', unitLessonIds('en-vi', 0).slice(0, 1));
  const afterOne = Object.fromEntries(gardenCompanions(oneLesson).map((c) => [c.id, c.unlocked]));
  assert.equal(afterOne.rabbit, true);
  assert.equal(afterOne.cat, false);

  const enUnit = emptyProgress();
  completeLessons(enUnit, 'en-vi', unitLessonIds('en-vi', 0));
  const enMap = Object.fromEntries(gardenCompanions(enUnit).map((c) => [c.id, c.unlocked]));
  assert.equal(enMap.cat, true);
  assert.equal(enMap.owl, true);
  assert.equal(enMap.fox, false);

  const jaUnit = emptyProgress();
  completeLessons(jaUnit, 'ja-vi', unitLessonIds('ja-vi', 0));
  assert.equal(gardenCompanions(jaUnit).find((c) => c.id === 'fox').unlocked, true);

  const zhUnit = emptyProgress();
  completeLessons(zhUnit, 'zh-vi', unitLessonIds('zh-vi', 0));
  assert.equal(gardenCompanions(zhUnit).find((c) => c.id === 'panda').unlocked, true);

  const busyDay = emptyProgress();
  busyDay.activeDays['2026-01-05'] = { xp: 45, lessons: 3, perfect: 0 };
  assert.equal(gardenCompanions(busyDay).find((c) => c.id === 'bird').unlocked, true);

  const fullCourse = emptyProgress();
  completeLessons(fullCourse, 'en-vi', allLessonIds('en-vi'));
  assert.equal(gardenCompanions(fullCourse).find((c) => c.id === 'lion').unlocked, true);
});

check('8. Reward highlights: sortOrder giảm dần, bí mật/chưa trao bị loại', () => {
  const global = [
    { id: 'a', kind: 'badge', name: 'A', description: '', emoji: '🥉', condition: { type: 'units-completed', count: 1 }, congratsMessage: '', sortOrder: 5, enabled: true },
    { id: 'b', kind: 'title', name: 'B', description: '', emoji: '🏆', condition: { type: 'units-completed', count: 1 }, congratsMessage: '', sortOrder: 10, enabled: true },
    { id: 'c', kind: 'badge', name: 'C', description: '', emoji: '🥇', condition: { type: 'all-courses-complete' }, congratsMessage: '', sortOrder: 99, enabled: true },
    { id: 'tip', kind: 'parent-tip', name: 'TIP', description: '', emoji: '💡', condition: { type: 'units-completed', count: 1 }, congratsMessage: '', sortOrder: 50, enabled: true },
  ];
  const progress = emptyProgress();
  completeLessons(progress, 'en-vi', unitLessonIds('en-vi', 0));

  const base = { ownerId: null, childName: 'Con', message: '', emoji: '🎁', budgetText: null, condition: { type: 'all-courses-complete' }, createdAt: 1, updatedAt: 1, deletedAt: null };
  const family = [
    { ...base, id: 'secret', title: 'Bí mật', secretUntilDone: true, givenAt: null },
    { ...base, id: 'pending', title: 'Chưa trao', secretUntilDone: false, givenAt: null },
    { ...base, id: 'given-old', title: 'Đã trao cũ', secretUntilDone: false, givenAt: 1000 },
    { ...base, id: 'given-new', title: 'Đã trao mới', secretUntilDone: false, givenAt: 2000 },
  ];

  const highlights = recentRewardHighlights(global, progress, family, null);
  assert.deepEqual(highlights.globalTop.map((r) => r.id), ['b', 'a']);
  assert.equal(highlights.latestGivenFamily.id, 'given-new');
});

check('9. Mọi hotspot đều trỏ tới từ có thật trong pack', () => {
  for (const course of catalog.courses) {
    const hotspots = hotspotsForCourse(course.id);
    assert.equal(hotspots.length, 3, course.id);
    const { getWord } = useCourseContent(course.id);
    for (const hotspot of hotspots) {
      assert.ok(getWord(hotspot.target), `${course.id}: ${hotspot.target}`);
    }
  }
});

check('10. Bướm chỉ thả khi đạt mục tiêu XP hôm nay', () => {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const progress = emptyProgress();
  progress.dailyGoal = 20;
  progress.dailyXpDay = key;
  progress.dailyXp = 15;
  assert.equal(butterfliesReleased(progress, now), false);
  progress.dailyXp = 20;
  assert.equal(butterfliesReleased(progress, now), true);
  progress.dailyXpDay = '2000-01-01';
  assert.equal(butterfliesReleased(progress, now), false);
});

check('11. Tổng XP vườn cộng cả ba khóa', () => {
  const progress = emptyProgress();
  progress.courses['en-vi'].xp = 100;
  progress.courses['ja-vi'].xp = 50;
  progress.courses['zh-vi'].xp = 25;
  assert.equal(totalGardenXp(progress), 175);
});

check('12. Baseline nội dung: 62 unit / 242 bài / 1894 exercise', () => {
  const expected = { 'en-vi': [21, 84, 697], 'ja-vi': [21, 79, 615], 'zh-vi': [20, 79, 582] };
  let units = 0, lessons = 0, exercises = 0;
  for (const course of catalog.courses) {
    const pack = getPack(course.id);
    let u = 0, l = 0, e = 0;
    for (const section of pack.sections) {
      for (const unit of section.units) {
        u += 1;
        for (const lesson of unit.lessons) {
          l += 1;
          e += lesson.exercises.length;
        }
      }
    }
    assert.deepEqual([u, l, e], expected[course.id], course.id);
    units += u; lessons += l; exercises += e;
  }
  assert.deepEqual([units, lessons, exercises], [62, 242, 1894]);
});

check('13. Tên vùng đất: 62 đảo thật của Việt Nam, không trùng, không tên cũ', () => {
  const expected = {
    'en-vi': ['Đảo Phú Quốc', 'Đảo Cát Bà', 'Côn Đảo', 'Đảo Lý Sơn', 'Đảo Cô Tô', 'Đảo Phú Quý', 'Quần đảo Nam Du', 'Cù Lao Chàm', 'Hòn Tre', 'Đảo Bạch Long Vĩ', 'Đảo Thổ Chu', 'Đảo Tuần Châu', 'Đảo Ti Tốp', 'Hòn Gầm Ghì', 'Quần Đảo Hải Tặc', 'Cồn Cỏ', 'Đảo Cái Chiên', 'Đảo Bản Sen', 'Hòn Mê', 'Đảo Sơn Chà', 'Hòn Khô'],
    'ja-vi': ['Đảo Quan Lạn', 'Đảo Ngọc Vừng', 'Đảo Vĩnh Thực', 'Đảo Thanh Lân', 'Đảo Cái Bầu', 'Hòn Dấu', 'Hòn Chuối', 'Hòn Khoai', 'Hòn Sơn', 'Đảo Bình Ba', 'Đảo Bình Hưng', 'Hòn Phụ Tử', 'Cù Lao Câu', 'Đảo Long Sơn', 'Hòn Bà', 'Hòn Rái', 'Hòn Đốc', 'Hòn Bảy Cạnh', 'Hòn Tranh', 'Đảo Trần', 'Hòn La'],
    'zh-vi': ['Hòn Mun', 'Hòn Tằm', 'Cù Lao Xanh', 'Đảo Khỉ', 'Đảo Yến', 'Đảo Diệp Sơn', 'Hòn Nghệ', 'Hòn Heo', 'Quần đảo Trường Sa', 'Quần đảo Hoàng Sa', 'Đảo Ó', 'Đảo Cống Tây', 'Hòn Rơm', 'Đảo Mắt Rồng', 'Hòn Gió', 'Hòn Nẹ', 'Hòn Ông Căn', 'Hòn Giang', 'Hòn Cau', 'Hòn Sẹo'],
  };
  const seen = new Set();
  for (const course of catalog.courses) {
    const pack = getPack(course.id);
    const names = [];
    for (const section of pack.sections) {
      for (const unit of section.units) {
        const land = landForUnit(unit);
        names.push(land.name);
        seen.add(land.name);
        assert.ok(land.emoji.length > 0, `${unit.id}: thiếu emoji`);
        assert.ok(land.tagline.length > 0, `${unit.id}: thiếu tagline`);
        assert.ok(!/Hiragana|Katakana|Kingdom|Explorers/.test(land.name), `${unit.id}: còn tên cũ: ${land.name}`);
      }
    }
    assert.deepEqual(names, expected[course.id], course.id);
  }
  assert.equal(seen.size, 62);
});

console.log(`\nTất cả ${passed} nhóm kiểm tra PASS.`);
