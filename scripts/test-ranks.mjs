#!/usr/bin/env node
/**
 * Test logic thuần của hệ thống cấp bậc (src/lib/ranks.ts) bằng Node.
 *
 * Script biên dịch tạm ranks.ts ra thư mục hệ thống (không sinh file
 * vào src), kiểm tra rankForXp/rankTierState ở các mốc biên của thang
 * 8 bậc biển đảo, đối chiếu ngưỡng với quy tắc XP thật của store
 * (15 XP/bài + 5 XP hoàn hảo), và giữ baseline nội dung packs.
 *
 * Phần bảng xếp hạng nằm trong SQL (leaderboard-schema.sql) và RPC
 * Supabase nên không test ở đây — chỉ kiểm tra tĩnh rằng file SQL và
 * src/lib/leaderboard.ts tồn tại với đúng tên RPC/thiết kế ẩn danh.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-ranks-test-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/ranks.ts',
    '--module',
    'commonjs',
    '--target',
    'ES2022',
    '--moduleResolution',
    'node',
    '--ignoreDeprecations',
    '6.0',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir',
    outDir,
  ],
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const { RANK_TIERS, rankForXp, rankTierState } = require(path.join(outDir, 'ranks.js'));

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

check('RANK_TIERS: đúng 8 bậc biển đảo, ngưỡng tăng dần nghiêm ngặt từ 0', () => {
  assert.equal(RANK_TIERS.length, 8);
  assert.deepEqual(
    RANK_TIERS.map((t) => [t.level, t.title, t.minXp]),
    [
      [1, 'Người Bạn Ra Khơi', 0],
      [2, 'Thủy Thủ Nhí', 200],
      [3, 'Hoa Tiêu Nhí', 450],
      [4, 'Thuyền Phó Tương Lai', 900],
      [5, 'Thuyền Trưởng Nhí', 1650],
      [6, 'Chúa Đảo Nhí', 2550],
      [7, 'Huyền Thoại Biển Khơi', 3550],
      [8, 'Vua Biển Cả', 4650],
    ],
  );
  for (let i = 1; i < RANK_TIERS.length; i += 1) {
    assert.ok(RANK_TIERS[i].minXp > RANK_TIERS[i - 1].minXp);
    assert.ok(RANK_TIERS[i].emoji.length > 0);
  }
});

check('rankForXp(0): bậc 1, tiến độ 0, còn 200 XP lên bậc 2', () => {
  const rank = rankForXp(0);
  assert.equal(rank.level, 1);
  assert.equal(rank.title, 'Người Bạn Ra Khơi');
  assert.equal(rank.emoji, '🛶');
  assert.equal(rank.minXp, 0);
  assert.equal(rank.nextXp, 200);
  assert.equal(rank.nextTitle, 'Thủy Thủ Nhí');
  assert.equal(rank.progress01, 0);
  assert.equal(rank.xpToNext, 200);
  assert.equal(rank.isMax, false);
});

check('rankForXp(199) sát mốc: vẫn bậc 1, còn đúng 1 XP', () => {
  const rank = rankForXp(199);
  assert.equal(rank.level, 1);
  assert.equal(rank.xpToNext, 1);
  assert.ok(Math.abs(rank.progress01 - 199 / 200) < 1e-9);
});

check('rankForXp(200): vừa lên bậc 2, tiến độ về 0', () => {
  const rank = rankForXp(200);
  assert.equal(rank.level, 2);
  assert.equal(rank.title, 'Thủy Thủ Nhí');
  assert.equal(rank.minXp, 200);
  assert.equal(rank.nextXp, 450);
  assert.equal(rank.progress01, 0);
  assert.equal(rank.xpToNext, 250);
});

check('rankForXp: mọi mốc giữa thang khớp bậc kỳ vọng', () => {
  const cases = [
    [449, 2], [450, 3], [899, 3], [900, 4], [1649, 4], [1650, 5],
    [2549, 5], [2550, 6], [3549, 6], [3550, 7],
  ];
  for (const [xp, level] of cases) {
    assert.equal(rankForXp(xp).level, level, `XP ${xp} phải ở bậc ${level}`);
  }
  const mid = rankForXp(1275); // giữa bậc 4 (900) và bậc 5 (1650)
  assert.equal(mid.level, 4);
  assert.ok(Math.abs(mid.progress01 - 0.5) < 1e-9);
  assert.equal(mid.xpToNext, 375);
});

check('rankForXp(4649): bậc 7, còn đúng 1 XP lên ngôi Vua Biển Cả', () => {
  const rank = rankForXp(4649);
  assert.equal(rank.level, 7);
  assert.equal(rank.title, 'Huyền Thoại Biển Khơi');
  assert.equal(rank.nextXp, 4650);
  assert.equal(rank.nextTitle, 'Vua Biển Cả');
  assert.equal(rank.xpToNext, 1);
});

check('rankForXp(4650) và (7000): bậc 8 cao nhất, progress01 = 1, không còn bậc sau', () => {
  for (const xp of [4650, 7000]) {
    const rank = rankForXp(xp);
    assert.equal(rank.level, 8);
    assert.equal(rank.title, 'Vua Biển Cả');
    assert.equal(rank.emoji, '👑');
    assert.equal(rank.isMax, true);
    assert.equal(rank.nextXp, null);
    assert.equal(rank.nextTitle, null);
    assert.equal(rank.progress01, 1);
    assert.equal(rank.xpToNext, 0);
  }
});

check('rankForXp: XP âm/không hợp lệ được kẹp về bậc 1', () => {
  assert.equal(rankForXp(-50).level, 1);
  assert.equal(rankForXp(Number.NaN).level, 1);
  assert.equal(rankForXp(199.9).xpToNext, 1); // làm tròn xuống trước khi tính
});

check('ngưỡng bậc cuối với tới được theo quy tắc XP của store', () => {
  // store.ts: XP_PER_LESSON = 15, XP_PERFECT_BONUS = 5; 314 bài (lộ trình 1–12).
  const storeSrc = readFileSync(path.join(root, 'src', 'lib', 'store.ts'), 'utf8');
  assert.ok(storeSrc.includes('XP_PER_LESSON = 15'));
  assert.ok(storeSrc.includes('XP_PERFECT_BONUS = 5'));
  const maxLessonXp = 314 * (15 + 5); // 6280 — chưa kể XP thưởng từ game
  const noPerfectXp = 314 * 15; // 4710
  const topThreshold = RANK_TIERS[RANK_TIERS.length - 1].minXp;
  assert.ok(topThreshold <= maxLessonXp, 'Bậc cuối phải đạt được bằng XP bài học');
  assert.ok(topThreshold > noPerfectXp - 500, 'Bậc cuối không được quá dễ');
  // Hiệu chuẩn đợt 2: bậc cuối nằm ở 70–75% XP tối đa từ bài học.
  assert.ok(topThreshold >= 0.7 * maxLessonXp, 'Bậc cuối phải từ 70% XP tối đa từ bài học');
  assert.ok(topThreshold <= 0.75 * maxLessonXp, 'Bậc cuối phải tới 75% XP tối đa từ bài học');
});

check('rankTierState: current/achieved/locked nhất quán với rankForXp', () => {
  const at300 = RANK_TIERS.map((tier) => rankTierState(tier, 300));
  assert.deepEqual(at300, [
    'achieved', 'current', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked',
  ]);
  const atMax = RANK_TIERS.map((tier) => rankTierState(tier, 9999));
  assert.deepEqual(atMax, [
    'achieved', 'achieved', 'achieved', 'achieved', 'achieved', 'achieved', 'achieved', 'current',
  ]);
  const atZero = RANK_TIERS.map((tier) => rankTierState(tier, 0));
  assert.equal(atZero[0], 'current');
  assert.ok(atZero.slice(1).every((s) => s === 'locked'));
});

check('leaderboard: SQL + client tồn tại, đúng RPC, giữ RLS owner-only', () => {
  const sql = readFileSync(
    path.join(root, 'src', 'features', 'supabase', 'leaderboard-schema.sql'),
    'utf8',
  );
  assert.ok(sql.includes('get_leaderboard'));
  assert.ok(sql.includes('get_my_rank'));
  assert.ok(sql.includes('security definer'));
  assert.ok(sql.includes('Nhà thám hiểm #'));
  assert.ok(sql.includes('to authenticated'));
  // File SQL này KHÔNG được nới quyền đọc bảng user_progress.
  assert.ok(!/create\s+policy/i.test(sql), 'Không được tạo policy mới trong leaderboard-schema.sql');

  const client = readFileSync(path.join(root, 'src', 'lib', 'leaderboard.ts'), 'utf8');
  assert.ok(client.includes("rpc(\"get_leaderboard\"") || client.includes("rpc('get_leaderboard'"));
  assert.ok(client.includes('not_ready'));
  // Client không được đọc email/tên thật/user_id của người khác.
  assert.ok(!client.includes('display_name'));
  assert.ok(!client.includes('.email'));
});

check('baseline nội dung packs: 80 unit / 314 bài / 2488 exercise', () => {
  const catalog = JSON.parse(
    readFileSync(path.join(root, 'src', 'content', 'catalog.json'), 'utf8'),
  );
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
  assert.deepEqual({ units, lessons, exercises }, { units: 80, lessons: 314, exercises: 2488 });
});

console.log(`\nTất cả ${passed} nhóm test cấp bậc PASS.`);
