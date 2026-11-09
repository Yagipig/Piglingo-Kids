// Kiểm thử KHU LUYỆN 4 KỸ NĂNG (Nghe / Nói / Đọc / Viết):
// 1) Pool nội dung đúng thứ tự ưu tiên: bài đã học xong -> bài ở biên +
//    unit của nó -> bài tiếp theo; chạy cho cả 3 khóa en/ja/zh và các
//    band (biên dời sang THCS khi học hết Tiểu học).
// 2) Sinh buổi tất định theo hạt (ngày + khóa + kỹ năng + số buổi),
//    mỗi buổi đủ 5 hoạt động cho cả 4 kỹ năng ở cả 3 khóa.
// 3) Đáp án đúng của từng dạng luôn thuộc nội dung nguồn: unscramble
//    ghép lại đúng câu gốc; câu hỏi đọc suy từ đoạn; nghe điền từ lấy
//    đúng từ trong câu; chính tả điền lại đúng từ gốc; nét viết là dữ
//    liệu THẬT (Hanzi Writer / KanjiVG) của đúng chữ trong từ vựng.
// 4) Buổi luyện KHÔNG sinh vé quay: khẳng định tĩnh trên store (chỉ
//    completeLesson gọi ticketsForCompletion) + các màn kỹ năng chỉ
//    gọi completeSkillSession, không đụng spinTickets/applySpinWin.
// 5) Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 câu.
// Chạy: node scripts/test-skills.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-skills-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');
execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/types.ts',
    'src/lib/content.ts',
    'src/lib/strokes.ts',
    'src/lib/skills.ts',
    '--outDir',
    outDir,
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
  ],
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const skills = require(path.join(outDir, 'lib', 'skills.js'));
const strokes = require(path.join(outDir, 'lib', 'strokes.js'));
const content = require(path.join(outDir, 'lib', 'content.js'));
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok ${passed}. ${name}`);
}

const COURSES = ['en-vi', 'ja-vi', 'zh-vi'];
const DAY = '2026-11-09';
const rngFor = (courseId, skill, attempt) =>
  skills.skillRngFor({ courseId, skill, attempt, day: DAY });

function completedUpTo(courseId, lessonCount) {
  const { allLessons } = content.useCourseContent(courseId);
  const done = {};
  for (const ref of allLessons.slice(0, lessonCount)) done[ref.lesson.id] = true;
  return done;
}

/* ------------------------------- 1) Pool ------------------------------- */

check('Pool: thứ tự tier không giảm (đã học -> biên -> tiếp theo) ở cả 3 khóa', () => {
  for (const courseId of COURSES) {
    const done = completedUpTo(courseId, 3);
    const pool = skills.buildSkillPool(courseId, done, 'moi');
    assert.ok(pool.words.length > 0, `${courseId} pool từ rỗng`);
    assert.ok(pool.sentences.length > 0, `${courseId} pool câu rỗng`);
    const wordTiers = pool.words.map((w) => w.tier);
    const sentTiers = pool.sentences.map((s) => s.tier);
    assert.deepEqual(wordTiers, [...wordTiers].sort((a, b) => a - b));
    assert.deepEqual(sentTiers, [...sentTiers].sort((a, b) => a - b));
    assert.equal(wordTiers[0], 0, `${courseId}: từ đầu tiên phải thuộc bài đã học`);
  }
});

check('Pool: biên rơi vào bài có câu mẫu -> câu đầu của pool là tier 1 của đúng bài biên', () => {
  for (const courseId of COURSES) {
    const { allLessons } = content.useCourseContent(courseId);
    // Bài đầu tiên trong khóa có bài tập sinh câu mẫu (fillBlank/wordBank).
    const firstSentenceLesson = allLessons.find((r) =>
      r.lesson.exercises.some((e) => e.type === 'fillBlank' || e.type === 'wordBank'),
    );
    assert.ok(firstSentenceLesson, `${courseId}: phải có bài chứa câu mẫu`);
    const done = {};
    for (const ref of allLessons.slice(0, firstSentenceLesson.globalIndex)) {
      done[ref.lesson.id] = true;
    }
    const pool = skills.buildSkillPool(courseId, done, 'moi');
    assert.ok(pool.sentences.length > 0);
    assert.equal(pool.sentences[0].tier, 1, `${courseId}: câu đầu phải là tier biên`);
    assert.equal(pool.sentences[0].lessonId, firstSentenceLesson.lesson.id);
  }
});

check('Pool: chưa học gì -> không có tier 0, từ đầu thuộc unit đầu tiên', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, {}, 'moi');
    assert.ok(pool.words.every((w) => w.tier >= 1));
    const { allLessons } = content.useCourseContent(courseId);
    assert.equal(pool.words[0].unitId, allLessons[0].unit.id);
    assert.equal(pool.frontierIndex, 0);
  }
});

check('Pool: học hết Tiểu học -> biên dời sang band THCS, pool vẫn sinh được', () => {
  for (const courseId of COURSES) {
    const { allLessons } = content.useCourseContent(courseId);
    const primaryLessons = allLessons.filter((r) => r.unit.band === 'tieu-hoc');
    const done = {};
    for (const ref of primaryLessons) done[ref.lesson.id] = true;
    const pool = skills.buildSkillPool(courseId, done, 'moi');
    const frontierRef = allLessons[pool.frontierIndex];
    assert.equal(frontierRef.unit.band, 'thcs', `${courseId}: biên phải ở THCS`);
    // Buổi vẫn sinh đủ ở band mới.
    const listen = skills.buildListenSession(pool, rngFor(courseId, 'listen', 0));
    assert.equal(listen.length, 5);
  }
});

check('Pool: cấp độ chuyên-nghiep dời biên xuống sâu (sàn cấp độ được tôn trọng)', () => {
  const poolMoi = skills.buildSkillPool('en-vi', {}, 'moi');
  const poolPro = skills.buildSkillPool('en-vi', {}, 'chuyen-nghiep');
  assert.ok(poolPro.frontierIndex > poolMoi.frontierIndex);
});

/* --------------------------- 2) Tất định + đủ 5 --------------------------- */

check('Sinh buổi tất định: cùng hạt -> cùng buổi; khác số buổi -> buổi khác', () => {
  const pool = skills.buildSkillPool('en-vi', completedUpTo('en-vi', 4), 'moi');
  const a = skills.buildListenSession(pool, rngFor('en-vi', 'listen', 0));
  const b = skills.buildListenSession(pool, rngFor('en-vi', 'listen', 0));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  const c = skills.buildListenSession(pool, rngFor('en-vi', 'listen', 1));
  assert.notDeepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(c)));
});

check('Cả 3 khóa x 4 kỹ năng đều sinh đủ buổi (5 hoạt động / 5 mục / đoạn + 4 câu hỏi)', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    assert.equal(skills.buildListenSession(pool, rngFor(courseId, 'listen', 0)).length, 5, `${courseId} nghe`);
    assert.equal(skills.buildSpeakSession(pool, rngFor(courseId, 'speak', 0)).length, 5, `${courseId} nói`);
    assert.equal(skills.buildWriteSession(pool, rngFor(courseId, 'write', 0)).length, 5, `${courseId} viết`);
    const readSession = skills.buildReadSession(pool, rngFor(courseId, 'read', 0));
    assert.ok(readSession, `${courseId} đọc phải sinh được`);
    assert.ok(readSession.passage.length >= 3 && readSession.passage.length <= 5);
    assert.equal(readSession.questions.length, 4, `${courseId} đọc phải có 4 câu hỏi`);
  }
});

/* --------------------------- 3) Đáp án thuộc nguồn --------------------------- */

check('Nghe: đáp án đúng luôn nằm trong lựa chọn và thuộc nội dung nguồn', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const act of skills.buildListenSession(pool, rngFor(courseId, 'listen', attempt))) {
        if (act.kind === 'listen-word') {
          assert.equal(act.options.filter((o) => o.word.target === act.answer.word.target).length, 1);
          assert.ok(act.options.length >= 2);
        } else if (act.kind === 'listen-meaning') {
          assert.equal(act.options[act.correctIndex], act.sentence.native);
          assert.equal(new Set(act.options).size, act.options.length);
        } else {
          const correct = act.options[act.correctIndex];
          assert.equal(act.blanked.replace('＿＿＿', correct), act.sentence.target);
          assert.ok(skills.tokenizeTarget(act.sentence.target).includes(correct));
        }
      }
    }
  }
});

check('Nói: 5 mục đều có câu/từ mẫu + gợi ý nghĩa từ pool', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    const sentenceTargets = new Set(pool.sentences.map((s) => s.target));
    const wordTargets = new Set(pool.words.map((w) => w.word.target));
    for (const item of skills.buildSpeakSession(pool, rngFor(courseId, 'speak', 0))) {
      assert.ok(item.text.length > 0 && item.hint.length > 0);
      assert.ok(sentenceTargets.has(item.text) || wordTargets.has(item.text), `mục "${item.text}" phải từ pool`);
    }
  }
});

check('Đọc: câu hỏi suy trực tiếp từ đoạn (nghĩa từ / đúng-sai / chọn câu trong đoạn)', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    for (let attempt = 0; attempt < 3; attempt++) {
      const session = skills.buildReadSession(pool, rngFor(courseId, 'read', attempt));
      assert.ok(session);
      const passageTargets = session.passage.map((s) => s.target);
      assert.ok(session.passage.every((s) => s.unitId === session.unitId));
      for (const q of session.questions) {
        if (q.kind === 'word-meaning') {
          assert.equal(q.options[q.correctIndex], q.word.native);
          const inPassage = session.passage.some((s) =>
            skills.tokenizeTarget(s.target).some(
              (t) => skills.normalizeToken(t) === skills.normalizeToken(q.word.target),
            ),
          );
          assert.ok(inPassage, `từ "${q.word.target}" phải xuất hiện trong đoạn`);
        } else if (q.kind === 'true-false') {
          if (q.isTrue) {
            assert.equal(q.statement, q.sourceTarget);
            assert.ok(passageTargets.includes(q.statement));
          } else {
            assert.ok(!passageTargets.includes(q.statement), 'câu sai không được trùng câu trong đoạn');
            const a = skills.tokenizeTarget(q.statement);
            const b = skills.tokenizeTarget(q.sourceTarget);
            assert.equal(a.length, b.length);
            assert.equal(a.filter((t, i) => t !== b[i]).length, 1, 'câu sai chỉ được khác câu gốc đúng 1 từ');
          }
        } else {
          assert.ok(passageTargets.includes(q.options[q.correctIndex]));
          q.options.forEach((opt, i) => {
            if (i !== q.correctIndex) assert.ok(!passageTargets.includes(opt));
          });
        }
      }
    }
  }
});

check('Viết: unscramble ghép lại đúng câu gốc; spell điền lại đúng từ; gap-char đúng chữ trong từ', () => {
  for (const courseId of COURSES) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const act of skills.buildWriteSession(pool, rngFor(courseId, 'write', attempt))) {
        if (act.kind === 'unscramble') {
          assert.deepEqual([...act.shuffled].sort(), [...act.tokens].sort());
          assert.equal(act.tokens.join(' '), act.sentence.target);
        } else if (act.kind === 'spell') {
          let mi = 0;
          const rebuilt = act.display.map((ch) => (ch === null ? act.missing[mi++] : ch)).join('');
          assert.equal(rebuilt, act.word.word.target);
          assert.equal(mi, act.missing.length);
          const bankSorted = [...act.bank].sort();
          for (const letter of act.missing) {
            const idx = bankSorted.indexOf(letter);
            assert.ok(idx >= 0, 'ngân hàng chữ phải chứa mọi chữ bị giấu');
            bankSorted.splice(idx, 1);
          }
        } else if (act.kind === 'gap-char') {
          assert.equal(act.options[act.correctIndex], [...act.word.word.target][act.charIndex]);
        } else if (act.kind === 'char-order') {
          assert.deepEqual([...act.shuffled].sort(), [...act.chars].sort());
          assert.equal(act.chars.join(''), act.word.word.target);
        }
      }
    }
  }
});

check('Viết: hoạt động nét dùng dữ liệu THẬT của đúng chữ (zh + ja), Anh không có nét', () => {
  // Spot-check dữ liệu nguồn độc lập với builder.
  const mao = strokes.strokeDataFor('zh-vi', '猫');
  assert.ok(mao && mao.strokes.length === 11, '猫 phải có 11 nét theo Hanzi Writer');
  const a = strokes.strokeDataFor('ja-vi', 'あ');
  assert.ok(a && a.strokes.length === 3, 'あ phải có 3 nét theo KanjiVG');
  assert.equal(strokes.strokeDataFor('en-vi', 'c'), null);
  assert.equal(strokes.courseHasStrokeData('en-vi'), false);
  assert.ok(strokes.strokeAttribution('zh-vi')?.includes('Arphic'));
  assert.ok(strokes.strokeAttribution('ja-vi')?.includes('KanjiVG'));
  assert.equal(strokes.strokeAttribution('en-vi'), null);

  for (const courseId of ['zh-vi', 'ja-vi']) {
    const pool = skills.buildSkillPool(courseId, completedUpTo(courseId, 4), 'moi');
    const session = skills.buildWriteSession(pool, rngFor(courseId, 'write', 0));
    const strokeActs = session.filter((x) => x.kind === 'stroke');
    assert.ok(strokeActs.length >= 1, `${courseId}: buổi viết phải có hoạt động tập nét`);
    for (const act of strokeActs) {
      assert.ok([...act.word.word.target].includes(act.char), 'chữ tập nét phải nằm trong từ của pool');
      assert.deepEqual(act.data, strokes.strokeDataFor(courseId, act.char));
      assert.ok(act.data.strokes.length >= 2);
      assert.ok(act.data.strokes.every((d) => d.startsWith('M')), 'mọi nét phải là path SVG hợp lệ');
    }
  }
  const enPool = skills.buildSkillPool('en-vi', completedUpTo('en-vi', 4), 'moi');
  const enSession = skills.buildWriteSession(enPool, rngFor('en-vi', 'write', 0));
  assert.ok(enSession.every((x) => x.kind !== 'stroke' && x.kind !== 'gap-char'));
  assert.ok(enSession.some((x) => x.kind === 'spell'), 'Anh phải có hoạt động chính tả');
});

/* --------------------- 4) Không vé quay + nối XP/nhiệm vụ --------------------- */

check('Store: completeSkillSession cộng XP + ghi nhật ký ngày, chỉ completeLesson mới cấp vé', () => {
  const store = read('src/lib/store.ts');
  assert.ok(store.includes('completeSkillSession: (perfect: boolean) => void'));
  const implStart = store.indexOf('completeSkillSession: (perfect) =>');
  assert.ok(implStart > 0);
  const impl = store.slice(implStart, store.indexOf('name: "progress-v2"', implStart));
  assert.ok(impl.includes('XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0)'), 'XP buổi luyện phải = công thức bài học');
  assert.ok(impl.includes('lessons: prevDay.lessons + 1'), 'buổi luyện phải ghi vào nhật ký ngày cho nhiệm vụ ngày');
  // Vé quay: cả store chỉ có đúng 1 nơi gọi ticketsForCompletion (trong completeLesson).
  assert.equal(store.split('ticketsForCompletion(').length - 1, 1);
  for (const screen of ['skills-listen', 'skills-speak', 'skills-read', 'skills-write']) {
    const src = read(`src/app/${screen}.tsx`);
    assert.ok(src.includes('completeSkillSession'), `${screen} phải gọi completeSkillSession`);
    assert.ok(!src.includes('spinTickets') && !src.includes('applySpinWin'), `${screen} không được đụng vé quay`);
  }
});

check('Nối dây: hub + 4 route đăng ký trong _layout, lối tắt dashboard + bản đồ, Nói tái dùng module sẵn có', () => {
  const layout = read('src/app/_layout.tsx');
  for (const name of ['skills', 'skills-listen', 'skills-speak', 'skills-read', 'skills-write']) {
    assert.ok(layout.includes(`name="${name}"`), `_layout thiếu route ${name}`);
  }
  const dashboard = read('src/app/(tabs)/index.tsx');
  assert.ok(dashboard.includes('"/skills"') && dashboard.includes('Kỹ năng'));
  const map = read('src/app/map/[courseId].tsx');
  assert.ok(map.includes('"/skills"'), 'bản đồ phải có nút mở khu kỹ năng');
  const hub = read('src/app/skills.tsx');
  assert.ok(hub.includes('SKILL_CARDS'));
  const speak = read('src/app/skills-speak.tsx');
  assert.ok(speak.includes('@/features/speaking'), 'màn Nói phải tái dùng features/speaking');
  assert.ok(speak.includes('MockPronunciationProvider'));
  assert.ok(speak.includes('usePronunciationRecorder'));
  assert.ok(speak.includes('PronunciationResultView'));
});

/* ------------------------------- 5) Baseline ------------------------------- */

check('Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 câu', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const courseId of COURSES) {
    const pack = JSON.parse(read(`src/content/packs/${courseId}.json`));
    for (const section of pack.sections) {
      for (const unit of section.units) {
        units += 1;
        for (const lesson of unit.lessons) {
          lessons += 1;
          exercises += lesson.exercises.length;
        }
      }
    }
  }
  assert.equal(units, 80);
  assert.equal(lessons, 314);
  assert.equal(exercises, 2488);
});

console.log(`\nTEST SKILLS: PASS ${passed} nhóm`);
