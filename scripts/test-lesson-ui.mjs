#!/usr/bin/env node
/**
 * Test Phase 4 REDESIGN — GIAO DIỆN HỌC BÀI + GAME (kiểm TĨNH theo
 * khuôn test-companion/test-pets, vì các màn hình React Native không
 * chạy thẳng trong Node):
 * - lesson/[id].tsx: thanh tiến độ dùng ProgressBar của ui/ + màu
 *   vương quốc; thẻ câu hỏi là Card của ui/; MỌI móc logic cũ còn
 *   nguyên (completeLesson, LessonPet + sendPetFeedback, checkAnswer,
 *   answerIsReady, TTS speakTarget, nút quay vòng quay theo vé,
 *   nút Kiểm tra/Tiếp tục ở footer cố định).
 * - exercises/*: OptionCard bo góc xl + bóng mềm + vùng chạm lớn;
 *   tiêu đề các dạng bài dùng typography.h1; match có ProgressBar
 *   tiến độ ghép; chip word-bank đạt vùng chạm tối thiểu.
 * - game-ui.tsx: khung game dùng chung (GameHeader nút quay lại đạt
 *   vùng chạm tối thiểu, GameBadge, WinCard thắng/thua).
 * - 5 màn game: đều dùng GameHeader; Nghe và chọn + Đố nhanh dùng lại
 *   OptionCard của bài học; Xếp câu dùng Card cho thẻ đề; Đoán chữ
 *   phím đoán đạt minHeight 48; Đố nhanh dùng ProgressBar thời gian.
 * - practice.tsx: thẻ dùng Card + ProgressBar của ui/, hết chữ
 *   tiếng Anh "Mistakes"/"Words" trên tiêu đề thẻ.
 * - celebration.tsx: nhánh rương chặng dùng Card viền màu vương
 *   quốc, các nhánh cũ (justClaimed, stageReward) còn nguyên.
 * - Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 exercise
 *   (đếm thẳng từ packs JSON).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('test-lesson-ui: Phase 4 — trình bày Học bài + Game (kiểm tĩnh)');

/* ---------------- Màn hình học bài ---------------- */
const lesson = read('src/app/lesson/[id].tsx');

check('lesson: thanh tiến độ là ProgressBar của ui/ theo màu vương quốc', () => {
  assert.ok(
    lesson.includes('import { Card, ProgressBar } from "@/components/ui"'),
    'lesson phải import Card + ProgressBar từ ui/',
  );
  assert.ok(lesson.includes('<ProgressBar'), 'header phải render ProgressBar');
  assert.ok(
    lesson.includes('kingdomColorTokens(activeCourseId)'),
    'màu nhấn phải suy từ vương quốc của khóa đang học',
  );
  assert.ok(
    !lesson.includes('progressTrack'),
    'không còn thanh tiến độ tự chế (progressTrack) của bản cũ',
  );
});

check('lesson: thẻ câu hỏi là Card của ui/ viền màu vương quốc', () => {
  assert.ok(
    lesson.includes('<Card accentColor={kingdomTokens?.primary}'),
    'khu vực bài tập phải nằm trong Card viền màu vương quốc',
  );
  assert.ok(lesson.includes('styles.stageCard'), 'Card câu hỏi dùng style stageCard');
});

check('lesson: móc logic học còn nguyên — completeLesson + chấm + sẵn sàng', () => {
  assert.ok(
    lesson.includes('progress.completeLesson(lessonId, perfect)'),
    'hoàn thành bài vẫn gọi completeLesson(lessonId, perfect)',
  );
  assert.ok(lesson.includes('function checkAnswer('), 'hàm chấm checkAnswer còn nguyên');
  assert.ok(lesson.includes('function answerIsReady('), 'hàm answerIsReady còn nguyên');
  assert.ok(lesson.includes('const onCheck = () =>'), 'luồng Kiểm tra còn nguyên');
  assert.ok(lesson.includes('const onContinue = () =>'), 'luồng Tiếp tục còn nguyên');
});

check('lesson: pet đồng hành + TTS + vé vòng quay còn nguyên', () => {
  assert.ok(lesson.includes('<LessonPet'), 'vẫn render LessonPet trên thẻ bài tập');
  assert.ok(lesson.includes('sendPetFeedback'), 'vẫn gửi kết quả chấm cho pet');
  assert.ok(lesson.includes('speakTarget('), 'vẫn phát TTS đáp án nghe khi đúng lúc');
  assert.ok(lesson.includes('spinTicketTotal'), 'màn kết quả vẫn tính tổng vé vòng quay');
  assert.ok(
    lesson.includes('router.push("/spin")'),
    'màn kết quả vẫn có nút đi quay vòng may mắn',
  );
});

check('lesson: footer cố định có nút Kiểm tra / Tiếp tục (DuoButton ≥48px)', () => {
  assert.ok(lesson.includes('label="Kiểm tra"'), 'footer vẫn có nút Kiểm tra');
  assert.ok(lesson.includes('label="Tiếp tục"'), 'footer vẫn có nút Tiếp tục');
  assert.ok(
    lesson.includes('status === "correct" && { backgroundColor: colors.correctBg }') &&
      lesson.includes('status === "wrong" && { backgroundColor: colors.wrongBg }'),
    'dải phản hồi đúng/sai ở footer vẫn đổi màu theo kết quả chấm',
  );
});

/* ---------------- Các dạng bài tập ---------------- */
const optionCard = read('src/components/exercises/option-card.tsx');

check('option-card: bo góc xl + bóng mềm + vùng chạm lớn, trạng thái giữ nguyên', () => {
  assert.ok(optionCard.includes('borderRadius: radius.xl'), 'thẻ đáp án bo góc xl');
  assert.ok(optionCard.includes('...shadow.soft'), 'thẻ đáp án dùng bóng mềm của design system');
  assert.ok(optionCard.includes('minHeight: 64'), 'dạng đầy đủ cao tối thiểu 64px');
  assert.ok(optionCard.includes('minHeight: 96'), 'dạng gọn cao tối thiểu 96px');
  for (const state of ['"idle"', '"selected"', '"correct"', '"wrong"']) {
    assert.ok(optionCard.includes(state), `trạng thái ${state} của đáp án phải còn`);
  }
});

check('exercises: tiêu đề 5 dạng bài dùng typography.h1 của design system', () => {
  for (const file of ['select', 'fill-blank', 'word-bank', 'type-answer', 'match']) {
    const src = read(`src/components/exercises/${file}.tsx`);
    assert.ok(
      src.includes('typography.h1'),
      `${file}.tsx phải dùng typography.h1 cho tiêu đề`,
    );
  }
});

check('match: có ProgressBar tiến độ ghép suy từ số cặp đã ghép', () => {
  const match = read('src/components/exercises/match.tsx');
  assert.ok(match.includes('<ProgressBar'), 'match phải hiện ProgressBar tiến độ');
  assert.ok(
    match.includes('matched.size / exercise.pairs.length'),
    'tiến độ ghép phải suy từ matched/pairs thật, không số bịa',
  );
});

check('word-bank: chip từ đạt vùng chạm tối thiểu của design system', () => {
  const bank = read('src/components/exercises/word-bank.tsx');
  assert.ok(
    bank.includes('minHeight: touchTargets.min'),
    'chip từ phải cao tối thiểu bằng touchTargets.min (48px)',
  );
});

/* ---------------- Khung game dùng chung + 5 màn game ---------------- */
const gameUi = read('src/components/game-ui.tsx');

check('game-ui: GameHeader/GameBadge/WinCard thuần trình bày, nút quay lại ≥48px', () => {
  assert.ok(gameUi.includes('export function GameHeader'), 'phải có GameHeader');
  assert.ok(gameUi.includes('export function GameBadge'), 'phải có GameBadge');
  assert.ok(gameUi.includes('export function WinCard'), 'phải có WinCard');
  assert.ok(
    gameUi.includes('width: touchTargets.min') &&
      gameUi.includes('height: touchTargets.min'),
    'nút quay lại phải đạt vùng chạm tối thiểu 48px',
  );
  assert.ok(gameUi.includes('router.back()'), 'nút quay lại vẫn gọi router.back() như cũ');
});

check('5 màn game: tất cả dùng GameHeader dùng chung', () => {
  for (const file of ['game-memory', 'game-listen', 'game-scramble', 'game-speed', 'game-letters']) {
    const src = read(`src/app/${file}.tsx`);
    assert.ok(
      src.includes('from "@/components/game-ui"') && src.includes('<GameHeader'),
      `${file}.tsx phải dùng GameHeader của game-ui`,
    );
  }
});

check('game: Nghe và chọn + Đố nhanh dùng lại OptionCard; Xếp câu dùng Card; Đố nhanh dùng ProgressBar', () => {
  const listen = read('src/app/game-listen.tsx');
  assert.ok(listen.includes('OptionCard'), 'game-listen phải dùng OptionCard của bài học');
  assert.ok(listen.includes('type OptionState'), 'game-listen ánh xạ trạng thái đáp án qua OptionState');
  const speed = read('src/app/game-speed.tsx');
  assert.ok(speed.includes('OptionCard'), 'game-speed phải dùng OptionCard của bài học');
  assert.ok(speed.includes('<ProgressBar'), 'game-speed thanh thời gian là ProgressBar của ui/');
  const scramble = read('src/app/game-scramble.tsx');
  assert.ok(scramble.includes('<Card accentColor={colors.indigo}'), 'game-scramble thẻ đề là Card của ui/');
  const memory = read('src/app/game-memory.tsx');
  assert.ok(memory.includes('<WinCard>'), 'game-memory hộp thắng là WinCard dùng chung');
  const letters = read('src/app/game-letters.tsx');
  assert.ok(letters.includes('tone="lose"'), 'game-letters hộp thua là WinCard tone lose');
});

check('game-letters: phím đoán chữ đạt chiều cao chạm tối thiểu 48px', () => {
  const letters = read('src/app/game-letters.tsx');
  assert.ok(letters.includes('minHeight: 48'), 'phím chữ phải có minHeight 48');
});

/* ---------------- Tab Ôn tập ---------------- */
const practice = read('src/app/(tabs)/practice.tsx');

check('practice: thẻ dùng Card + ProgressBar của ui/, tiêu đề thuần Việt', () => {
  assert.ok(
    practice.includes('import { Card, ProgressBar } from "@/components/ui"'),
    'practice phải import Card + ProgressBar từ ui/',
  );
  assert.ok(practice.includes('<ProgressBar'), 'practice phải dùng ProgressBar');
  assert.ok(practice.includes('Lỗi sai'), 'thẻ lỗi sai phải ghi thuần Việt');
  assert.ok(practice.includes('Từ đã học'), 'thẻ từ vựng phải ghi thuần Việt');
  assert.ok(!practice.includes('>Mistakes<'), 'không còn tiêu đề tiếng Anh "Mistakes"');
  assert.ok(!practice.includes('Words ('), 'không còn tiêu đề tiếng Anh "Words"');
});

/* ---------------- Màn ăn mừng ---------------- */
const celebration = read('src/app/celebration.tsx');

check('celebration: nhánh rương chặng dùng Card viền màu vương quốc, nhánh cũ còn nguyên', () => {
  assert.ok(
    celebration.includes('accentColor={kingdom?.palette.primary}'),
    'thẻ quà chặng phải viền theo màu vương quốc của khóa',
  );
  assert.ok(celebration.includes('justClaimed'), 'vẫn phân biệt vừa nhận quà');
  assert.ok(celebration.includes('stageReward('), 'vẫn đọc bảng quà chặng');
  assert.ok(
    celebration.includes('typography.display'),
    'tiêu đề ăn mừng dùng typography.display của design system',
  );
});

/* ---------------- Baseline nội dung ---------------- */
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
  assert.deepEqual([units, lessons, exercises], [80, 314, 2488]);
});

console.log(`\nPASS test-lesson-ui: ${passed} nhóm kiểm tra đạt.`);
