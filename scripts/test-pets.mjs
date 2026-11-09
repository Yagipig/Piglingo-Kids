#!/usr/bin/env node
/**
 * Test Đợt B+C — HỆ THÚ CƯNG TOÀN DIỆN (src/lib/pets.ts + store + UI):
 * - petLevelFor đúng biên ngưỡng cấp 1–10.
 * - stageReward: chặng 3/6/9… có chìa khóa, chặng khác không có.
 * - Phụ kiện: 6 món/pet, mở đúng mốc 3/6/9/12/15/18 chặng đã xong.
 * - Nhận quà chặng (stageClaimCheck — hàm thuần store dùng chung):
 *   chặng xong thật + chưa nhận → ok kèm quà đúng bảng; đã nhận →
 *   không ok (tương đương claim lần 2 là no-op); chưa xong → không ok.
 * - Chìa khóa: checkpointState với keyUnlocked → "open" dù ngoài biên;
 *   store (kiểm tĩnh) trừ đúng 1 khóa + ghi bài vào keyUnlockedLessons.
 * - legendaryUnlocked chỉ đúng khi một khóa đạt 100% số bài.
 * - mostMissedWord chọn đúng từ sai nhiều nhất (hòa → gặp gần nhất).
 * - Roster khớp kingdoms.ts: thú Cổ Tích nay là Sư tử 🦁 (spec Đợt B+C
 *   thay Cú Sách của các đợt trước).
 * - CHỐT CHẶN skill: bài hỏi đúng cách đọc (kana) → chỉ gợi ý một
 *   phần; pinyin không trùng đáp án → hiện đầy đủ; nativeToTarget →
 *   không có skill an toàn (null).
 * - Kiểm tĩnh store/UI: field + migrate 2 nhánh, completeLesson cộng
 *   điểm phát triển/sao, claim/feed/toggle/setActiveCompanion có chốt,
 *   route /pet đã đăng ký, pet đã nối vào màn bài học + celebration.
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
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-pets-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/pets.ts',
    'src/lib/kingdoms.ts',
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
const pets = require(path.join(outDir, 'lib', 'pets.js'));
const adventure = require(path.join(outDir, 'lib', 'adventure.js'));
const content = require(path.join(outDir, 'lib', 'content.js'));
const kingdoms = require(path.join(outDir, 'lib', 'kingdoms.js'));
const {
  WORLD_PETS,
  LEGENDARY_PET,
  accessoriesFor,
  accessoryById,
  completedStageCount,
  isAccessoryUnlocked,
  legendaryUnlocked,
  mostMissedWord,
  petForCourse,
  petLevelFor,
  petSkillForExercise,
  stageClaimCheck,
  stageReward,
} = pets;
const { checkpointState } = adventure;

const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('test-pets: hệ thú cưng toàn diện (Đợt B+C)');

check('petLevelFor: biên ngưỡng cấp 1–10 đúng từng mốc', () => {
  assert.equal(petLevelFor(0).level, 1);
  assert.equal(petLevelFor(49).level, 1);
  assert.equal(petLevelFor(50).level, 2);
  assert.equal(petLevelFor(149).level, 2);
  assert.equal(petLevelFor(150).level, 3);
  assert.equal(petLevelFor(300).level, 4);
  assert.equal(petLevelFor(500).level, 5);
  assert.equal(petLevelFor(800).level, 6);
  assert.equal(petLevelFor(1200).level, 7);
  assert.equal(petLevelFor(1800).level, 8);
  assert.equal(petLevelFor(2600).level, 9);
  assert.equal(petLevelFor(3599).level, 9);
  const max = petLevelFor(3600);
  assert.equal(max.level, 10);
  assert.equal(max.isMax, true);
  assert.equal(max.toNext, null);
  assert.equal(petLevelFor(99999).level, 10);
  assert.equal(petLevelFor(25).progress01, 0.5);
  assert.equal(petLevelFor(100).toNext, 50);
  assert.equal(petLevelFor(-5).level, 1);
});

check('stageReward: quà thuần theo chặng — chặng 3/6/9 có khóa, còn lại không', () => {
  assert.deepEqual(stageReward(1), { xpBonus: 10, food: 1, stars: 3, key: 0 });
  assert.deepEqual(stageReward(2), { xpBonus: 10, food: 1, stars: 3, key: 0 });
  assert.equal(stageReward(3).key, 1);
  assert.equal(stageReward(6).key, 1);
  assert.equal(stageReward(9).key, 1);
  assert.equal(stageReward(4).key, 0);
  assert.equal(stageReward(18).key, 1);
});

check('phụ kiện: mỗi pet 6 món thuần Việt, mốc mở 3/6/9/12/15/18', () => {
  for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
    const items = accessoriesFor(courseId);
    assert.equal(items.length, 6, `${courseId} phải có đúng 6 món`);
    assert.deepEqual(
      items.map((i) => i.unlockStage),
      [3, 6, 9, 12, 15, 18],
    );
    for (const item of items) {
      assert.ok(item.name && item.emoji && item.id, 'món phải đủ id/emoji/tên');
    }
  }
  assert.equal(accessoryById('en-vi', 'su-tu-vuong-mien')?.unlockStage, 18);
  assert.equal(accessoryById('en-vi', 'khong-co')?.id, undefined);
});

check('isAccessoryUnlocked: đúng biên số chặng đã xong', () => {
  const first = accessoriesFor('ja-vi')[0]; // mốc 3
  const last = accessoriesFor('ja-vi')[5]; // mốc 18
  assert.equal(isAccessoryUnlocked(first, 2), false);
  assert.equal(isAccessoryUnlocked(first, 3), true);
  assert.equal(isAccessoryUnlocked(last, 17), false);
  assert.equal(isAccessoryUnlocked(last, 18), true);
});

const en = content.useCourseContent('en-vi');
const enLessons = en.allLessons;
const firstStageIds = enLessons.slice(0, 6).map((l) => l.lesson.id);
const completedOf = (ids) =>
  Object.fromEntries(ids.map((id) => [id, true]));

check('stageClaimCheck: chặng xong + chưa nhận → ok và quà đúng bảng', () => {
  const res = stageClaimCheck({
    allLessons: enLessons,
    completedLessons: completedOf(firstStageIds),
    claimedStages: [],
    stageNumber: 1,
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.reward, stageReward(1));
  assert.equal(completedStageCount(enLessons, completedOf(firstStageIds)), 1);
});

check('stageClaimCheck: đã nhận rồi → không ok (claim lần 2 là no-op)', () => {
  const res = stageClaimCheck({
    allLessons: enLessons,
    completedLessons: completedOf(firstStageIds),
    claimedStages: [1],
    stageNumber: 1,
  });
  assert.equal(res.ok, false);
});

check('stageClaimCheck: chặng chưa xong hẳn / không tồn tại → không ok', () => {
  const fiveOfSix = stageClaimCheck({
    allLessons: enLessons,
    completedLessons: completedOf(firstStageIds.slice(0, 5)),
    claimedStages: [],
    stageNumber: 1,
  });
  assert.equal(fiveOfSix.ok, false);
  const noStage = stageClaimCheck({
    allLessons: enLessons,
    completedLessons: completedOf(enLessons.map((l) => l.lesson.id)),
    claimedStages: [],
    stageNumber: 99,
  });
  assert.equal(noStage.ok, false);
  const third = stageClaimCheck({
    allLessons: enLessons,
    completedLessons: completedOf(enLessons.slice(0, 18).map((l) => l.lesson.id)),
    claimedStages: [1, 2],
    stageNumber: 3,
  });
  assert.equal(third.ok, true);
  assert.equal(third.reward.key, 1, 'chặng 3 phải có chìa khóa');
});

check('checkpointState + chìa khóa: bài mở bằng khóa = open, không có khóa = locked', () => {
  const base = { unlockedAll: false, completed: false, globalIndex: 10, frontierIndex: 0 };
  assert.equal(checkpointState({ ...base, keyUnlocked: true }), 'open');
  assert.equal(checkpointState({ ...base, keyUnlocked: false }), 'locked');
  assert.equal(checkpointState({ ...base }), 'locked');
  assert.equal(
    checkpointState({ ...base, completed: true, keyUnlocked: false }),
    'completed',
  );
  assert.equal(
    checkpointState({ unlockedAll: false, completed: false, globalIndex: 0, frontierIndex: 0, keyUnlocked: true }),
    'current',
  );
});

check('legendaryUnlocked: chỉ đúng khi một khóa đạt 100% số bài', () => {
  const totals = { 'en-vi': 108, 'ja-vi': 103, 'zh-vi': 103 };
  const full = (n) => ({
    completedLessons: Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`l${i}`, true]),
    ),
  });
  assert.equal(legendaryUnlocked({}, totals), false);
  assert.equal(legendaryUnlocked({ 'en-vi': full(107) }, totals), false);
  assert.equal(legendaryUnlocked({ 'en-vi': full(108) }, totals), true);
  assert.equal(legendaryUnlocked({ 'zh-vi': full(103) }, totals), true);
  assert.equal(legendaryUnlocked({ 'en-vi': full(108) }, {}), false);
});

check('mostMissedWord: chọn từ sai nhiều nhất; hòa → gặp gần nhất; chưa sai → null', () => {
  const course = {
    wordStats: {
      dog: { correct: 3, wrong: 2, lastSeen: 100 },
      cat: { correct: 0, wrong: 5, lastSeen: 50 },
      bird: { correct: 9, wrong: 0, lastSeen: 999 },
    },
  };
  assert.deepEqual(mostMissedWord(course), { target: 'cat', wrong: 5, correct: 0 });
  const tie = {
    wordStats: {
      a: { correct: 0, wrong: 3, lastSeen: 10 },
      b: { correct: 1, wrong: 3, lastSeen: 20 },
    },
  };
  assert.equal(mostMissedWord(tie)?.target, 'b');
  assert.equal(mostMissedWord({ wordStats: {} }), null);
  assert.equal(
    mostMissedWord({ wordStats: { x: { correct: 2, wrong: 0, lastSeen: 1 } } }),
    null,
  );
});

check('roster: mỗi thế giới một thú + skill đúng spec; kingdoms đã đổi Cú Sách → Sư tử', () => {
  assert.equal(petForCourse('en-vi')?.emoji, '🦁');
  assert.equal(petForCourse('en-vi')?.skillKind, 'speak');
  assert.equal(petForCourse('ja-vi')?.emoji, '🦊');
  assert.equal(petForCourse('ja-vi')?.skillKind, 'reading');
  assert.equal(petForCourse('zh-vi')?.emoji, '🐼');
  assert.equal(petForCourse('zh-vi')?.skillKind, 'pinyin');
  assert.equal(LEGENDARY_PET.emoji, '🐉');
  assert.equal(LEGENDARY_PET.skillKind, 'reminder');
  assert.equal(kingdoms.kingdomForCourse('en-vi')?.companion, '🦁');
  assert.equal(kingdoms.kingdomForCourse('ja-vi')?.companion, '🦊');
  assert.equal(kingdoms.kingdomForCourse('zh-vi')?.companion, '🐼');
  assert.equal(WORLD_PETS['en-vi'].name, 'Sư tử');
});

check('chốt chặn skill: bài hỏi cách đọc kana (đáp án = cách đọc) → chỉ gợi ý một phần', () => {
  const ja = content.useCourseContent('ja-vi');
  const exercise = {
    type: 'select',
    id: 'test-kana',
    mode: 'targetToNative',
    prompt: 'あ',
    audioTarget: 'あ',
    options: [{ text: 'ki' }, { text: 'ku' }, { text: 'a' }, { text: 'i' }],
    correct: 2,
  };
  const res = petSkillForExercise({
    exercise,
    courseId: 'ja-vi',
    skillKind: 'reading',
    getWord: ja.getWord,
  });
  assert.ok(res && res.kind === 'reading');
  assert.equal(res.partial, true, 'đáp án là cách đọc → bắt buộc gợi ý một phần');
  assert.notEqual(res.displayText, 'a', 'không được hiện nguyên cách đọc "a"');
});

check('skill pinyin: không trùng đáp án (hỏi nghĩa) → hiện đầy đủ + thanh điệu', () => {
  const zh = content.useCourseContent('zh-vi');
  const exercise = {
    type: 'select',
    id: 'test-pinyin',
    mode: 'targetToNative',
    prompt: '一 (yī)',
    audioTarget: '一',
    options: [{ text: 'ba' }, { text: 'năm' }, { text: 'một' }, { text: 'bốn' }],
    correct: 2,
  };
  const res = petSkillForExercise({
    exercise,
    courseId: 'zh-vi',
    skillKind: 'pinyin',
    getWord: zh.getWord,
  });
  assert.ok(res && res.kind === 'reading');
  assert.equal(res.partial, false);
  assert.equal(res.displayText, 'yī');
  assert.ok(res.toneLabel.includes('thanh 1'));
});

check('skill đọc mẫu (Sư tử): select targetToNative → speak từ đích; nativeToTarget → null', () => {
  const enC = content.useCourseContent('en-vi');
  const ex = {
    type: 'select',
    id: 'test-speak',
    mode: 'targetToNative',
    prompt: 'dog',
    audioTarget: 'dog',
    options: [{ text: 'cá' }, { text: 'chim' }, { text: 'chó' }, { text: 'ngựa' }],
    correct: 2,
  };
  const res = petSkillForExercise({
    exercise: ex,
    courseId: 'en-vi',
    skillKind: 'speak',
    getWord: enC.getWord,
  });
  assert.ok(res && res.kind === 'speak');
  assert.equal(res.speakText, 'dog');
  assert.equal(res.partial, false);
  const flipped = petSkillForExercise({
    exercise: { ...ex, mode: 'nativeToTarget', prompt: 'chó' },
    courseId: 'en-vi',
    skillKind: 'speak',
    getWord: enC.getWord,
  });
  assert.equal(flipped, null, 'nativeToTarget: đáp án nằm trong lựa chọn → ẩn skill');
  const readingFlipped = petSkillForExercise({
    exercise: { ...ex, mode: 'nativeToTarget', prompt: 'chó' },
    courseId: 'ja-vi',
    skillKind: 'reading',
    getWord: enC.getWord,
  });
  assert.equal(readingFlipped, null);
});

check('hồ câu thoại: mỗi hồ ≥6 câu, chỉ động viên/khen — không câu tiêu cực', () => {
  assert.ok(pets.ENCOURAGEMENT_WRONG.length >= 6);
  assert.ok(pets.PRAISE_RIGHT.length >= 6);
  // Chặn từ chê bai/trừng phạt và trạng thái đói/chết của pet. ("Đừng
  // buồn nhé" là câu an ủi bạn nhỏ nên KHÔNG cấm chữ "buồn" đứng riêng.)
  const banned = ['dở', 'tệ', 'ngu', 'thất vọng', 'đói', 'chết', 'bị phạt'];
  for (const line of [...pets.ENCOURAGEMENT_WRONG, ...pets.PRAISE_RIGHT]) {
    for (const word of banned) {
      assert.ok(
        !line.toLowerCase().includes(word),
        `câu thoại không được tiêu cực: "${line}" chứa "${word}"`,
      );
    }
  }
});

/* ---------- Kiểm tĩnh store + UI (khuôn test-companion) ---------- */

const store = read('src/lib/store.ts');

check('store: field thú cưng có đủ + mặc định an toàn trong initial state', () => {
  for (const snippet of [
    'petGrowth: Record<string, number>',
    'petFood: number',
    'stars: number',
    'unlockKeys: number',
    'keyUnlockedLessons: Record<string, string[]>',
    'claimedStageRewards: Record<string, number[]>',
    'equippedAccessories: Record<string, string[]>',
    'activeCompanion: "world" | "legendary"',
    'petGrowth: {},',
    'petFood: 0,',
    'stars: 0,',
    'unlockKeys: 0,',
    'keyUnlockedLessons: {},',
    'claimedStageRewards: {},',
    'equippedAccessories: {},',
    'activeCompanion: "world",',
  ]) {
    assert.ok(store.includes(snippet), `store thiếu: ${snippet}`);
  }
});

check('store: migrate điền mặc định thú cưng ở CẢ HAI nhánh', () => {
  const occurrences = (needle) => store.split(needle).length - 1;
  assert.ok(occurrences('petGrowth:') >= 3, 'type + initial + 2 nhánh migrate phải có petGrowth');
  assert.ok(
    store.includes('(old.petGrowth as Record<string, number>) ?? {}'),
    'nhánh có courses phải điền petGrowth ?? {}',
  );
  assert.ok(
    store.includes('(old.activeCompanion as "world" | "legendary") ?? "world"'),
    'nhánh có courses phải điền activeCompanion ?? "world"',
  );
  assert.ok(
    store.includes('activeCompanion: "world" as const'),
    'nhánh legacy phải điền activeCompanion mặc định',
  );
});

check('store: completeLesson cộng điểm phát triển +10/+5 và sao khi perfect, XP giữ 15/+5', () => {
  assert.ok(store.includes('const growthGain = 10 + (perfect ? 5 : 0);'));
  assert.ok(store.includes('const stars = (state.stars ?? 0) + (perfect ? 1 : 0);'));
  assert.ok(store.includes('const earned = XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0);'));
});

check('store: claim/feed/toggle/useKey/setActiveCompanion đều có chốt chặn', () => {
  assert.ok(store.includes('const check = stageClaimCheck({'), 'claim phải qua stageClaimCheck');
  assert.ok(store.includes('if (!check.ok) return state;'), 'claim không đủ điều kiện = no-op');
  assert.ok(store.includes('petFood: (state.petFood ?? 0) - 1'), 'cho ăn phải trừ 1 thức ăn');
  assert.ok(store.includes('(state.petGrowth?.[courseId] ?? 0) + 8'), 'cho ăn +8 điểm');
  assert.ok(store.includes('if (!isAccessoryUnlocked(item, doneStages)) return state;'));
  assert.ok(store.includes('unlockKeys: (state.unlockKeys ?? 0) - 1'), 'dùng khóa phải trừ 1');
  assert.ok(store.includes('if (list.includes(lessonId)) return state;'), 'bài đã mở bằng khóa thì không trừ nữa');
  assert.ok(store.includes('if (!legendaryUnlocked(state.courses ?? {}, totals)) return state;'));
});

check('UI: route /pet đăng ký + lối vào từ dashboard, bản đồ; pet nối vào bài học và celebration', () => {
  const layout = read('src/app/_layout.tsx');
  assert.ok(layout.includes('name="pet"'), '_layout phải đăng ký màn pet');
  const home = read('src/app/(tabs)/index.tsx');
  assert.ok(home.includes('router.push("/pet")'), 'dashboard phải có lối tắt Thú cưng');
  assert.ok(home.includes('accessoryById(kingdom.courseId, id)'), 'thẻ vương quốc phải hiện phụ kiện đang mặc');
  const mapScreen = read('src/app/map/[courseId].tsx');
  assert.ok(mapScreen.includes('router.push("/pet")'), 'đầu màn bản đồ phải có nút Thú cưng');
  const lesson = read('src/app/lesson/[id].tsx');
  assert.ok(lesson.includes('<LessonPet'), 'màn bài học phải render LessonPet');
  assert.ok(lesson.includes('sendPetFeedback'), 'màn bài học phải gửi kết quả chấm cho pet');
  const celebration = read('src/app/celebration.tsx');
  assert.ok(celebration.includes('justClaimed'), 'celebration phải phân biệt vừa nhận quà');
  assert.ok(celebration.includes('stageReward('), 'celebration phải đọc bảng quà chặng');
  const map = read('src/components/adventure-map.tsx');
  assert.ok(map.includes('progress.claimStageReward(courseId, stageNumber)'), 'bản đồ phải claim trước khi ăn mừng');
  assert.ok(map.includes('keyUnlocked: keyUnlockedIds.includes(ref.lesson.id)'), 'bản đồ phải truyền keyUnlocked vào checkpointState');
  assert.ok(map.includes('progress.useUnlockKey(courseId'), 'panel khóa phải gọi useUnlockKey');
});

check('baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
    const pack = content.getPack(courseId);
    for (const section of pack.sections) {
      units += section.units.length;
      for (const unit of section.units) {
        lessons += unit.lessons.length;
        for (const lesson of unit.lessons) exercises += lesson.exercises.length;
      }
    }
  }
  assert.equal(units, 80);
  assert.equal(lessons, 314);
  assert.equal(exercises, 2488);
});

console.log(`\nPASS test-pets: ${passed} nhóm kiểm tra đạt.`);
