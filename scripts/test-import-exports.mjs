#!/usr/bin/env node
/**
 * Test CHỐT CHẶN SỰ CỐ TRẮNG MÀN HÌNH ở Luyện Đọc/Sổ tay (09/11/2026):
 * trên nhánh GitHub, `src/lib/audio.ts` bị sót nội dung MỚI khi tải lên
 * (vẫn là bản cũ, không có `hasRealVoice`/`speakRealVoice`), trong khi
 * `real-voice-button.tsx` (bản mới) import hai hàm đó. Metro build
 * KHÔNG kiểm tra named export nên deployment vẫn Ready, nhưng lúc
 * render RealVoiceButton -> gọi hàm undefined -> TypeError -> không có
 * error boundary -> React gỡ toàn bộ cây -> trắng màn hình với MỌI từ.
 *
 * Test này quét TĨNH toàn bộ src/**: với mỗi named import trỏ tới một
 * file trong project (đường "@/..." hoặc tương đối), khẳng định tên đó
 * THẬT SỰ được export bởi file đích. Chạy trên cây code của nhánh lỗi
 * thì FAIL ở real-voice-button -> lib/audio; trên cây đúng thì PASS.
 * Mục đích: không bao giờ để một import "treo" lọt qua test nữa —
 * `tsc` chỉ chạy trên cây local, còn file lên nhánh phải có chốt riêng.
 *
 * Chạy: node scripts/test-import-exports.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');

let groups = 0;
const ok = (name, fn) => {
  fn();
  groups += 1;
  console.log(`  ✓ ${name}`);
};

// ---------- Thu thập file nguồn ----------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const files = walk(srcRoot);
assert.ok(files.length > 50, `quét được đủ file nguồn (thấy ${files.length})`);

// ---------- Giải quyết specifier -> file trong project ----------
// (khai báo trước exportsOf vì export * cần resolve đệ quy)
function resolveProjectFile(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(srcRoot, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // package ngoài / node_modules — ngoài phạm vi
  if (/\.(json|png|jpe?g|svg|mp3|wav|ttf|woff2?)$/.test(base)) return 'asset';
  const candidates = [
    base + '.ts',
    base + '.tsx',
    base + '.js',
    base + '.jsx',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ];
  if (/\.tsx?$/.test(base) && existsSync(base)) return base;
  for (const c of candidates) if (existsSync(c)) return c;
  return 'missing';
}

// ---------- Trích exports của một file ----------
const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const text = readFileSync(file, 'utf8');
  const names = new Set();
  exportCache.set(file, names); // đặt trước để chống đệ quy vòng (export *)
  // export function/const/let/var/class/type/interface/enum NAME
  for (const m of text.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g
  )) {
    names.add(m[1]);
  }
  // export { A, B as C, type D } [from "..."]
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const as = t.split(/\s+as\s+/);
      names.add((as[1] ?? as[0]).trim());
    }
  }
  if (/export\s+default\b/.test(text)) names.add('default');
  // export * from "..." — gộp exports của module đích (trừ default)
  for (const m of text.matchAll(/export\s+\*\s+from\s*["']([^"']+)["']/g)) {
    const target = resolveProjectFile(file, m[1]);
    if (target && target !== 'asset' && target !== 'missing') {
      for (const n of exportsOf(target)) if (n !== 'default') names.add(n);
    }
  }
  return names;
}

// ---------- Quét named imports ----------
const violations = [];
let checkedImports = 0;
let checkedFiles = 0;
const importRe =
  /import\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  let fileChecked = false;
  for (const m of text.matchAll(importRe)) {
    const spec = m[2];
    const target = resolveProjectFile(file, spec);
    if (target === null || target === 'asset') continue;
    const rel = path.relative(root, file);
    if (target === 'missing') {
      violations.push(`${rel}: không tìm thấy module "${spec}"`);
      continue;
    }
    const exported = exportsOf(target);
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const importedName = t.split(/\s+as\s+/)[0].trim();
      checkedImports += 1;
      fileChecked = true;
      if (!exported.has(importedName)) {
        violations.push(
          `${rel}: import { ${importedName} } từ "${spec}" nhưng ${path.relative(root, target)} không export tên này`
        );
      }
    }
  }
  if (fileChecked) checkedFiles += 1;
}

ok(`quét đủ rộng: ${checkedFiles} file, ${checkedImports} named import trong project`, () => {
  assert.ok(checkedFiles > 30, `chỉ quét ${checkedFiles} file`);
  assert.ok(checkedImports > 150, `chỉ kiểm ${checkedImports} import`);
});

ok('không named import nào "treo" (mọi tên import đều có export thật)', () => {
  assert.deepEqual(violations, [], `\n${violations.join('\n')}`);
});

ok('sự cố gốc: lib/audio export đủ hasRealVoice + speakRealVoice cho RealVoiceButton', () => {
  const audioExports = exportsOf(path.join(srcRoot, 'lib/audio.ts'));
  assert.ok(audioExports.has('hasRealVoice'), 'thiếu export hasRealVoice');
  assert.ok(audioExports.has('speakRealVoice'), 'thiếu export speakRealVoice');
});

ok('cặp store <-> srs khớp nhau: srs export normalizeSrsRecord/reviewWord/isDue/dueInDays', () => {
  const srsExports = exportsOf(path.join(srcRoot, 'lib/srs.ts'));
  for (const n of ['normalizeSrsRecord', 'reviewWord', 'isDue', 'dueInDays', 'normalizeSrsEntry']) {
    assert.ok(srsExports.has(n), `srs.ts thiếu export ${n}`);
  }
});

console.log(`\ntest-import-exports: PASS ${groups} nhóm`);
