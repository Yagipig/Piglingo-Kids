#!/usr/bin/env node
/**
 * Test chống tái phát — lỗi game Lật thẻ / Đoán chữ / Nghe (xem
 * GAME-BUG-ANALYSIS.md):
 *
 * Gốc rễ cũ: `useCourseContent()` trả object + closure `allWords` MỚI
 * sau mỗi lần gọi/render → mọi `useMemo(..., [allWords])` tính lại sau
 * mỗi lần đổi state → bộ thẻ bị rút lại sau mỗi lần lật, từ bí mật bị
 * rút lại sau mỗi phím bấm, câu hỏi nghe bị xáo lại sau mỗi đáp án.
 *
 * (a) HÀNH VI (dùng module content.ts THẬT, biên dịch bằng tsc như
 *     test-level-floor): gọi `useCourseContent` nhiều lần cùng
 *     courseId phải trả về CÙNG object (===) và cùng tham chiếu
 *     `allWords`; mô phỏng đúng ngữ nghĩa useMemo của React (deps so
 *     bằng Object.is) trên chuỗi memo của cả 3 game → hàm dựng dữ
 *     liệu ngẫu nhiên chỉ chạy 1 lần qua nhiều "render", và chỉ chạy
 *     lại khi `round` đổi (bắt đầu vòng mới).
 * (b) TĨNH: content.ts giữ view theo CourseCacheEntry; deps của các
 *     memo trong 3 game đúng dạng đã ổn định; hàm dựng ngẫu nhiên chỉ
 *     được gọi bên trong memo của vòng; phím Đoán chữ không còn
 *     minWidth cố định (flex: 1, giữ minHeight 48).
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-games-stability-test-'));
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
const { catalog, useCourseContent } = content;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('test-games-stability: useCourseContent ổn định identity + memo game không dựng lại dữ liệu');

const COURSE_IDS = catalog.courses.map((c) => c.id);
assert.ok(COURSE_IDS.length >= 3, 'cần ít nhất 3 khóa trong catalog');

/* ---------------- (a) Hành vi: identity ổn định ---------------- */

for (const courseId of COURSE_IDS) {
  check(`${courseId}: useCourseContent trả CÙNG object và CÙNG allWords qua nhiều lần gọi`, () => {
    const first = useCourseContent(courseId);
    for (let i = 0; i < 5; i++) {
      const again = useCourseContent(courseId);
      assert.equal(again, first, 'object trả về phải là cùng một tham chiếu (===)');
      assert.equal(again.allWords, first.allWords, 'closure allWords phải ổn định identity');
      assert.equal(again.getLesson, first.getLesson);
      assert.equal(again.getWord, first.getWord);
      assert.equal(again.allLessons, first.allLessons);
      assert.equal(again.allWords(), first.allWords(), 'mảng từ phải là cùng một tham chiếu');
    }
    // Đúng cách các game destructure trong thân component:
    const { allWords: a } = useCourseContent(courseId);
    const { allWords: b } = useCourseContent(courseId);
    assert.equal(a, b, 'allWords destructure ở 2 "render" phải giống hệt nhau');
  });
}

check('khác courseId → khác object (cache tách theo khóa)', () => {
  const views = COURSE_IDS.map((id) => useCourseContent(id));
  for (let i = 0; i < views.length; i++) {
    for (let j = i + 1; j < views.length; j++) {
      assert.notEqual(views[i], views[j]);
      assert.notEqual(views[i].allWords, views[j].allWords);
    }
  }
});

/**
 * Mô phỏng trung thực ngữ nghĩa useMemo của React: tính lại CHỈ khi
 * một dep đổi theo Object.is. Mỗi "render" giả lập gọi lại
 * useCourseContent (đúng như thân component làm) rồi chạy chuỗi memo.
 */
function createMemo() {
  let prevDeps = null;
  let prevValue;
  let runs = 0;
  return {
    compute(fn, deps) {
      if (
        prevDeps &&
        prevDeps.length === deps.length &&
        deps.every((d, i) => Object.is(d, prevDeps[i]))
      ) {
        return prevValue;
      }
      runs += 1;
      prevDeps = deps;
      prevValue = fn();
      return prevValue;
    },
    get runs() {
      return runs;
    },
  };
}

check('chuỗi memo kiểu game-memory: bộ thẻ KHÔNG bị rút lại sau mỗi lần "lật thẻ" (đổi state)', () => {
  const courseId = COURSE_IDS[0];
  const memoWords = createMemo();
  const memoDeck = createMemo();
  let round = 0;
  const render = () => {
    const { allWords } = useCourseContent(courseId); // gọi lại mỗi render như component thật
    const uniqueWords = memoWords.compute(
      () => [...new Map(allWords().map((w) => [w.target, w])).values()],
      [allWords],
    );
    return memoDeck.compute(
      () => {
        // buildDeck rút NGẪU NHIÊN 6 từ — nếu memo vỡ, mỗi render ra bộ khác.
        const pool = [...uniqueWords];
        const picked = [];
        for (let i = 0; i < 6 && pool.length > 0; i++) {
          picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
        return picked;
      },
      [uniqueWords, round],
    );
  };
  const deck = render();
  for (let flip = 0; flip < 10; flip++) {
    assert.equal(render(), deck, `render thứ ${flip + 2}: bộ thẻ bị dựng lại`);
  }
  assert.equal(memoWords.runs, 1);
  assert.equal(memoDeck.runs, 1);
  round += 1; // restart() — vòng mới THÌ được rút bộ mới
  render();
  assert.equal(memoDeck.runs, 2, 'đổi round phải dựng bộ thẻ mới đúng 1 lần');
});

check('chuỗi memo kiểu game-letters: từ bí mật KHÔNG nhảy sau mỗi phím bấm', () => {
  const courseId = COURSE_IDS[0];
  const memoPlayable = createMemo();
  const memoCurrent = createMemo();
  let round = 0;
  const render = () => {
    const { allWords } = useCourseContent(courseId);
    const playable = memoPlayable.compute(
      () => [...new Map(allWords().map((w) => [w.target, w])).values()],
      [allWords],
    );
    return memoCurrent.compute(
      () => playable[Math.floor(Math.random() * playable.length)],
      [playable, round],
    );
  };
  const secret = render();
  for (let key = 0; key < 10; key++) {
    assert.equal(render(), secret, `render thứ ${key + 2}: từ bí mật bị rút lại`);
  }
  assert.equal(memoCurrent.runs, 1);
  round += 1;
  render();
  assert.equal(memoCurrent.runs, 2, 'đổi round phải rút từ mới đúng 1 lần');
});

check('chuỗi memo kiểu game-listen: câu hỏi KHÔNG bị xáo lại sau mỗi đáp án', () => {
  const courseId = COURSE_IDS[0];
  const memoWords = createMemo();
  const memoQuestions = createMemo();
  let round = 0;
  const render = () => {
    const { allWords } = useCourseContent(courseId);
    const uniqueWords = memoWords.compute(
      () => [...new Map(allWords().map((w) => [w.target, w])).values()],
      [allWords],
    );
    return memoQuestions.compute(
      () => [...uniqueWords].sort(() => Math.random() - 0.5).slice(0, 10),
      [uniqueWords, round],
    );
  };
  const questions = render();
  for (let answer = 0; answer < 10; answer++) {
    assert.equal(render(), questions, `render thứ ${answer + 2}: câu hỏi bị dựng lại`);
  }
  assert.equal(memoQuestions.runs, 1);
  round += 1;
  render();
  assert.equal(memoQuestions.runs, 2);
});

check('nội dung view vẫn đúng: pack/allLessons/getWord khớp dữ liệu thật', () => {
  for (const courseId of COURSE_IDS) {
    const view = useCourseContent(courseId);
    assert.equal(view.pack.id, courseId);
    assert.ok(view.allLessons.length > 0);
    const words = view.allWords();
    assert.ok(words.length > 0);
    assert.equal(view.getWord(words[0].target), words[0]);
    assert.equal(view.getLesson(view.allLessons[0].lesson.id), view.allLessons[0]);
  }
});

/* ---------------- (b) Tĩnh: cơ chế cache + deps của 3 game ---------------- */

const contentSrc = readFileSync(path.join(root, 'src', 'lib', 'content.ts'), 'utf8');

check('content.ts: CourseCacheEntry giữ view, useCourseContent trả view đã cache', () => {
  assert.match(contentSrc, /view:\s*CourseContent \| null/, 'entry phải có field view');
  assert.match(contentSrc, /view: null/, 'getCourseCache phải khởi tạo view: null');
  assert.match(contentSrc, /if \(!cached\.view\)/, 'useCourseContent phải tạo view một lần');
  assert.match(contentSrc, /return cached\.view;/, 'useCourseContent phải trả cached.view');
});

function gameSrc(file) {
  return readFileSync(path.join(root, 'src', 'app', file), 'utf8');
}

check('game-memory: deps memo ổn định, buildDeck chỉ gọi trong memo theo vòng', () => {
  const src = gameSrc('game-memory.tsx');
  assert.match(src, /\[allWords\]/, 'uniqueWords phải memo theo [allWords]');
  assert.match(src, /\[uniqueWords, round\]/, 'deck phải memo theo [uniqueWords, round]');
  assert.equal(
    (src.match(/buildDeck\(/g) ?? []).length,
    2,
    'buildDeck chỉ có định nghĩa + đúng 1 lời gọi (trong memo deck)',
  );
  assert.match(src, /buildDeck\(uniqueWords\)/);
});

check('game-listen: deps memo ổn định, buildQuestions chỉ gọi trong memo theo vòng', () => {
  const src = gameSrc('game-listen.tsx');
  assert.match(src, /\[allWords\]/, 'uniqueWords phải memo theo [allWords]');
  assert.match(src, /\[uniqueWords, round\]/, 'questions phải memo theo [uniqueWords, round]');
  assert.equal(
    (src.match(/buildQuestions\(/g) ?? []).length,
    2,
    'buildQuestions chỉ có định nghĩa + đúng 1 lời gọi (trong memo questions)',
  );
  assert.match(src, /buildQuestions\(uniqueWords\)/);
});

check('game-letters: deps memo ổn định, Math.random chỉ nằm ở memo rút từ theo vòng', () => {
  const src = gameSrc('game-letters.tsx');
  assert.match(src, /\[allWords\]/, 'playable phải memo theo [allWords]');
  assert.match(src, /\[playable, round\]/, 'current phải memo theo [playable, round]');
  assert.equal(
    (src.match(/Math\.random/g) ?? []).length,
    1,
    'Math.random chỉ được xuất hiện 1 lần (trong memo current)',
  );
});

check('game-letters: phím co giãn flex: 1, bỏ minWidth 31, giữ minHeight 48', () => {
  const src = gameSrc('game-letters.tsx');
  assert.ok(!/minWidth:\s*31/.test(src), 'không còn minWidth 31 cố định gây tràn ngang');
  const keyStyle = src.match(/key:\s*\{([\s\S]*?)\},/);
  assert.ok(keyStyle, 'không tìm thấy style key');
  assert.match(keyStyle[1], /flex:\s*1/, 'phím phải có flex: 1 để co theo bề rộng hàng');
  assert.match(keyStyle[1], /minHeight:\s*48/, 'phím phải giữ minHeight 48 (chuẩn chạm)');
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

console.log(`\nPASS test-games-stability: ${passed} nhóm kiểm tra đạt.`);
