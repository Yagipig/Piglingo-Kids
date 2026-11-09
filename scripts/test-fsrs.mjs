#!/usr/bin/env node
/**
 * Test Đợt 1 tích hợp nguồn mở — FSRS thay SM-2 (src/lib/srs.ts):
 * - Thư viện thật là ts-fsrs (MIT): kiểm tĩnh srs.ts import từ
 *   'ts-fsrs', retention 0.9, fuzz tắt (lịch tất định).
 * - Chuyển đổi dữ liệu cũ BẮT BUỘC không mất lịch sử:
 *   convertLegacyEntry / normalizeSrsRecord giữ NGUYÊN số lượng
 *   entry và dueAt từng entry trên fixture lịch sử mẫu (entry streak
 *   cao, entry interval=0 từng ôn đúng, entry thiếu wordStats);
 *   reps = max(streak, correct), lapses = wrong, stability suy từ
 *   interval, difficulty ánh xạ đảo từ ease (kẹp 1..10, trừ thẻ mới
 *   tinh giữ D=0/S=0 theo quy ước thẻ rỗng của FSRS), lastReview từ
 *   wordStats.lastSeen.
 * - Lịch ôn mới: review Good (quality 2) không bao giờ cho due nằm
 *   trong quá khứ — từ thẻ mới, thẻ Learning và thẻ Review; thẻ mới
 *   học qua state Learning rồi mới tốt nghiệp Review; review Again
 *   (quality 0) hẹn lại ≈ now (learning/relearning step tính bằng
 *   phút) và lapses tăng trên thẻ Review.
 * - Entry mới tạo từ undefined (createSrsEntry) có state học mới
 *   (New, reps 0); mọi entry là số thuần JSON-serializable.
 * - isDue/dueInDays còn đúng với entry đã chuyển đổi VÀ với entry
 *   SM-2 thô chưa qua migrate (chuyển đổi lười); phép lọc của
 *   dueSrsWords (store) trên isDue cho đúng tập từ đến hạn trên
 *   record trộn cũ/mới.
 * - Kiểm tĩnh store: migrate gọi normalizeSrsRecord ở CẢ hai nhánh
 *   (bản ghi hiện tại + legacy v1), hai điểm gọi reviewWord còn
 *   nguyên, practice.tsx vẫn dùng dueInDays như cũ.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise.
 * Chạy: node scripts/test-fsrs.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-fsrs-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/srs.ts',
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

// srs.js đã biên dịch require('ts-fsrs') lúc chạy — nối node_modules
// của project vào thư mục tạm để Node resolve được thư viện thật.
try {
  symlinkSync(path.join(root, 'node_modules'), path.join(outDir, 'node_modules'), 'dir');
} catch {
  /* đã tồn tại */
}

const require = createRequire(import.meta.url);
const srsPath = existsSync(path.join(outDir, 'srs.js'))
  ? path.join(outDir, 'srs.js')
  : path.join(outDir, 'lib', 'srs.js');
const srs = require(srsPath);
const {
  SrsState,
  convertLegacyEntry,
  createSrsEntry,
  difficultyFromLegacyEase,
  dueInDays,
  isDue,
  normalizeSrsEntry,
  normalizeSrsRecord,
  reviewWord,
} = srs;

const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const DAY = 86_400_000;
const MIN = 60_000;
const T0 = 1_700_000_000_000;
const approx = (a, b) => Math.abs(a - b) < 1e-9;

console.log('test-fsrs: FSRS (ts-fsrs) thay SM-2 + chuyển đổi không mất lịch sử');

/* ---------------- Fixture lịch sử mẫu (dữ liệu SM-2 đã persist) ---------------- */

// dog: streak cao + interval dài; cat: interval=0 nhưng từng ôn đúng
// (SM-2 reset sau lần sai); bird: THIẾU wordStats; fish: ease thấp nhất.
const legacyFixture = {
  dog: { interval: 12, ease: 2.0, dueAt: T0, streak: 5 },
  cat: { interval: 0, ease: 1.4, dueAt: T0 + DAY, streak: 0 },
  bird: { interval: 0, ease: 2.5, dueAt: T0 - DAY, streak: 0 },
  fish: { interval: 3, ease: 1.3, dueAt: T0 + 5 * DAY, streak: 2 },
};
const statsFixture = {
  dog: { correct: 7, wrong: 2, lastSeen: T0 - 12 * DAY },
  cat: { correct: 3, wrong: 4, lastSeen: T0 - DAY },
  fish: { correct: 2, wrong: 0, lastSeen: T0 - 3 * DAY },
  // bird cố ý vắng mặt — entry thiếu wordStats.
};
const converted = normalizeSrsRecord(legacyFixture, statsFixture);

check('chuyển đổi: giữ NGUYÊN số lượng entry và dueAt từng entry, bỏ hẳn field SM-2', () => {
  assert.deepEqual(Object.keys(converted).sort(), Object.keys(legacyFixture).sort());
  for (const [target, legacy] of Object.entries(legacyFixture)) {
    assert.equal(converted[target].dueAt, legacy.dueAt, `${target}: dueAt phải giữ nguyên`);
    assert.ok(!('interval' in converted[target]), `${target}: không còn interval`);
    assert.ok(!('ease' in converted[target]), `${target}: không còn ease`);
    assert.ok(!('streak' in converted[target]), `${target}: không còn streak`);
    // Số thuần, JSON-serializable: vòng JSON không đổi entry.
    assert.deepEqual(JSON.parse(JSON.stringify(converted[target])), converted[target]);
  }
});

check('chuyển đổi: reps/lapses/stability/difficulty/state/lastReview đúng công thức đã chốt', () => {
  const dog = converted.dog;
  assert.equal(dog.reps, 7, 'reps = max(streak 5, correct 7)');
  assert.equal(dog.lapses, 2, 'lapses = wrong');
  assert.equal(dog.stability, 12, 'stability ≈ interval khi interval > 0');
  assert.ok(approx(dog.difficulty, 6.294117647058824), 'ease 2.0 → difficulty ≈ 6.29');
  assert.equal(dog.state, SrsState.Review);
  assert.equal(dog.scheduledDays, 12);
  assert.equal(dog.lastReview, T0 - 12 * DAY, 'lastReview = wordStats.lastSeen');

  const cat = converted.cat;
  assert.equal(cat.reps, 3, 'reps = max(streak 0, correct 3)');
  assert.equal(cat.lapses, 4);
  assert.equal(cat.stability, 1, 'interval=0 mà reps>0 → stability khởi tạo 1 (>0)');
  assert.ok(approx(cat.difficulty, 9.470588235294118), 'ease 1.4 (khó) → difficulty ≈ 9.47');
  assert.equal(cat.state, SrsState.Learning);
  assert.equal(cat.lastReview, T0 - DAY);

  const bird = converted.bird;
  assert.equal(bird.reps, 0, 'thiếu wordStats + streak 0 → reps 0');
  assert.equal(bird.lapses, 0, 'thiếu wordStats → lapses 0');
  assert.equal(bird.stability, 0);
  assert.equal(bird.difficulty, 0, 'thẻ mới tinh giữ D=0/S=0 theo quy ước thẻ rỗng FSRS');
  assert.equal(bird.state, SrsState.New);
  assert.equal(bird.lastReview, 0);

  const fish = converted.fish;
  assert.equal(fish.difficulty, 10, 'ease thấp nhất 1.3 → difficulty cao nhất 10');
  assert.equal(fish.stability, 3);
  assert.equal(fish.state, SrsState.Review);
});

check('difficultyFromLegacyEase: đảo chiều, kẹp 1..10, ease mặc định 2.5 → ≈3.65', () => {
  assert.equal(difficultyFromLegacyEase(1.3), 10);
  assert.equal(difficultyFromLegacyEase(3.0), 1);
  assert.ok(approx(difficultyFromLegacyEase(2.5), 3.6470588235294117));
  assert.equal(difficultyFromLegacyEase(99), 1, 'ease vượt trần bị kẹp trước khi ánh xạ');
  assert.equal(difficultyFromLegacyEase(0), 10, 'ease dưới sàn bị kẹp trước khi ánh xạ');
  assert.ok(difficultyFromLegacyEase(2.0) > difficultyFromLegacyEase(2.5), 'ease thấp hơn = khó hơn');
});

check('convertLegacyEntry đứng một mình (không qua record) cho cùng kết quả', () => {
  assert.deepEqual(
    convertLegacyEntry(legacyFixture.dog, statsFixture.dog, T0),
    converted.dog,
  );
  assert.deepEqual(convertLegacyEntry(legacyFixture.bird, undefined, T0), converted.bird);
});

check('entry mới từ undefined: createSrsEntry có state học mới (New), reps/lapses 0', () => {
  assert.deepEqual(createSrsEntry(T0), {
    dueAt: T0,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: SrsState.New,
    lastReview: 0,
  });
});

check('review Good: due không bao giờ nằm trong quá khứ — thẻ mới → Learning → tốt nghiệp Review', () => {
  const first = reviewWord(undefined, 2, T0);
  assert.ok(first.dueAt > T0, 'Good đầu tiên phải hẹn ở tương lai');
  assert.equal(first.reps, 1);
  assert.equal(first.state, SrsState.Learning, 'thẻ mới học đang ở trạng thái Learning');
  assert.ok(first.stability > 0 && first.difficulty >= 1 && first.difficulty <= 10);

  const graduated = reviewWord(first, 2, first.dueAt);
  assert.equal(graduated.state, SrsState.Review, 'hết learning steps → Review');
  assert.ok(graduated.scheduledDays >= 1, 'thẻ Review có interval theo ngày');
  assert.ok(graduated.dueAt > first.dueAt);

  const reviewGood = reviewWord(converted.dog, 2, T0);
  assert.equal(reviewGood.state, SrsState.Review);
  assert.ok(reviewGood.dueAt > T0, 'Good trên thẻ Review cũng không hẹn vào quá khứ');
  assert.ok(
    reviewGood.scheduledDays > converted.dog.scheduledDays,
    'ôn đúng thẻ Review thì interval FSRS dài hơn lịch cũ',
  );
});

check('review Again: due ≈ now (học lại sớm, tính bằng phút) và lapses tăng trên thẻ Review', () => {
  const again = reviewWord(converted.dog, 0, T0);
  assert.equal(again.lapses, converted.dog.lapses + 1, 'quên khi đang Review → lapses +1');
  assert.equal(again.state, SrsState.Relearning);
  assert.ok(again.dueAt > T0, 'Again không hẹn vào quá khứ');
  assert.ok(again.dueAt - T0 <= 15 * MIN, `Again phải hẹn lại sớm (≈now), thực tế +${(again.dueAt - T0) / MIN} phút`);

  const againNew = reviewWord(undefined, 0, T0);
  assert.equal(againNew.state, SrsState.Learning);
  assert.ok(againNew.dueAt > T0 && againNew.dueAt - T0 <= 15 * MIN, 'thẻ mới sai cũng hẹn lại sớm');
});

check('review Hard (quality 1) = FSRS Hard: due ở tương lai, reps tăng, không sinh lapses', () => {
  const hard = reviewWord(undefined, 1, T0);
  assert.ok(hard.dueAt > T0);
  assert.equal(hard.reps, 1);
  assert.equal(hard.lapses, 0);
  const hardReview = reviewWord(converted.dog, 1, T0);
  assert.ok(hardReview.dueAt > T0);
  assert.equal(hardReview.lapses, converted.dog.lapses);
});

check('reviewWord nhận thẳng entry SM-2 thô (chuyển đổi lười) vẫn cho lịch hợp lệ', () => {
  const out = reviewWord(legacyFixture.dog, 2, T0);
  assert.equal(out.state, SrsState.Review);
  assert.ok(out.dueAt > T0);
  assert.equal(out.reps, 6, 'không có wordStats đi kèm: reps = streak 5, +1 lần ôn này');
});

check('isDue/dueInDays: đúng với entry đã chuyển đổi VÀ entry SM-2 thô chưa migrate', () => {
  assert.equal(isDue(converted.bird, T0), true, 'dueAt đã qua → đến hạn');
  assert.equal(dueInDays(converted.bird, T0), 0);
  assert.equal(isDue(converted.fish, T0), false, 'dueAt +5 ngày → chưa đến hạn');
  assert.equal(dueInDays(converted.fish, T0), 5);
  assert.equal(dueInDays(converted.cat, T0), 1);

  // Cùng dueAt nhưng ở dạng thô SM-2: kết quả phải y hệt (lười).
  assert.equal(isDue(legacyFixture.bird, T0), true);
  assert.equal(isDue(legacyFixture.fish, T0), false);
  assert.equal(dueInDays(legacyFixture.fish, T0), 5);
  assert.equal(dueInDays({ interval: 9, ease: 2.5, dueAt: T0 + 2.5 * DAY, streak: 3 }, T0), 3, 'làm tròn lên theo ngày');

  assert.equal(isDue(undefined, T0), true, 'chưa có entry = đến hạn (hành vi cũ)');
});

check('lọc đến hạn kiểu dueSrsWords trên record trộn cũ/mới cho đúng tập từ', () => {
  const mixed = {
    oldDue: legacyFixture.bird, // SM-2 thô, dueAt qua rồi
    newNotDue: converted.fish, // FSRS, +5 ngày
    oldNotDue: legacyFixture.cat, // SM-2 thô, +1 ngày
    newDue: converted.dog, // FSRS, dueAt đúng T0 → đến hạn (<= now)
  };
  const due = Object.entries(mixed)
    .filter(([, entry]) => isDue(entry, T0))
    .map(([target]) => target);
  assert.deepEqual(due, ['oldDue', 'newDue']);
});

check('normalizeSrsEntry lặp lại không đổi entry FSRS hợp lệ (idempotent)', () => {
  for (const entry of Object.values(converted)) {
    assert.deepEqual(normalizeSrsEntry(entry), entry);
  }
  const reviewed = reviewWord(converted.dog, 2, T0);
  assert.deepEqual(normalizeSrsEntry(reviewed), reviewed);
});

/* ---------------- Kiểm tĩnh: nối dây ts-fsrs + store + practice ---------------- */

check('srs.ts dùng ts-fsrs thật với retention 0.9 và fuzz tắt', () => {
  const src = read('src/lib/srs.ts');
  assert.ok(src.includes('from "ts-fsrs"'), 'srs.ts phải import từ ts-fsrs');
  assert.ok(src.includes('FSRS_REQUEST_RETENTION = 0.9'));
  assert.ok(src.includes('request_retention: FSRS_REQUEST_RETENTION'));
  assert.ok(src.includes('enable_fuzz: false'));
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.dependencies['ts-fsrs'], 'package.json phải có ts-fsrs (MIT)');
});

check('store: migrate chuyển đổi srs ở CẢ hai nhánh, điểm nối reviewWord/dueSrsWords nguyên vẹn', () => {
  const store = read('src/lib/store.ts');
  assert.ok(store.includes('normalizeSrsRecord(course.srs ?? {}, course.wordStats ?? {})'),
    'nhánh bản ghi hiện tại phải chuyển đổi srs kèm wordStats');
  assert.ok(store.includes('normalizeSrsRecord(legacy.srs ?? {}, legacy.wordStats ?? {})'),
    'nhánh legacy v1 phải chuyển đổi srs kèm wordStats');
  assert.equal(store.split('reviewWord(c.srs[target]').length - 1, 2,
    'hai điểm gọi reviewWord (recordWord + reviewSrsWord) phải còn nguyên');
  assert.ok(store.includes('.filter(([, entry]) => isDue(entry, now))'),
    'dueSrsWords vẫn lọc qua isDue (đường chuyển đổi lười)');
  const practice = read('src/app/(tabs)/practice.tsx');
  assert.ok(practice.includes('dueInDays'), 'practice.tsx vẫn dùng dueInDays như cũ');
});

check('baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
    const pack = JSON.parse(read(`src/content/packs/${courseId}.json`));
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

console.log(`\nPASS test-fsrs: ${passed} nhóm kiểm tra đạt.`);
