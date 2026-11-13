#!/usr/bin/env node
/**
 * Test dữ liệu BẢN ĐỒ VIỆT NAM dạng ảnh vệ tinh (màn vietnam-map):
 *  - Mọi tỉnh/thành trong provinces.ts đều có ghim trên ảnh vệ tinh
 *    (src/lib/vietnam-map-positions.ts) và ngược lại, không thừa/thiếu.
 *  - 2 điểm biển Hoàng Sa / Trường Sa cũng có ghim.
 *  - Mọi tọa độ nằm trong khung ảnh (0,02–0,98) để ghim không tràn mép.
 *  - Hành trình Bắc → Nam: tọa độ y của ghim không "nhảy ngược" lớn
 *    theo thứ tự hành trình (vùng núi phía Bắc không đơn điệu tuyệt
 *    đối: Lào Cai nằm trên Sơn La, Cao Bằng là tỉnh cực Bắc).
 *  - File ảnh assets/images/vietnam-satellite-map.jpg tồn tại và là
 *    JPEG 646×550 như màn hình khai báo (aspectRatio 646/550).
 * Chạy: node scripts/test-vietnam-map.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(path.join(tmpdir(), "piglingo-vnmap-test-"));
const tscBin = path.join(root, "node_modules", ".bin", "tsc");

execFileSync(
  tscBin,
  [
    "--ignoreConfig",
    "src/lib/provinces.ts",
    "src/lib/vietnam-map-positions.ts",
    "--module",
    "commonjs",
    "--target",
    "ES2022",
    "--moduleResolution",
    "node",
    "--ignoreDeprecations",
    "6.0",
    "--esModuleInterop",
    "--skipLibCheck",
    "--outDir",
    outDir,
  ],
  { cwd: root, stdio: "inherit" }
);

const require = createRequire(import.meta.url);
const { PROVINCES, SEA_POINTS, unitIndexForProvince } = require(
  path.join(outDir, "provinces.js")
);
const { SATELLITE_PROVINCE_POSITIONS, SATELLITE_SEA_POSITIONS } = require(
  path.join(outDir, "vietnam-map-positions.js")
);

let passed = 0;
const failures = [];
function check(label, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ------------------------- Phủ đủ ghim ------------------------- */
const provinceIds = PROVINCES.map((p) => p.id);
const positionIds = Object.keys(SATELLITE_PROVINCE_POSITIONS);
check(
  "đủ 34 ghim tỉnh, khớp đúng id của provinces.ts",
  positionIds.length === 34 &&
    provinceIds.every((id) => id in SATELLITE_PROVINCE_POSITIONS) &&
    positionIds.every((id) => provinceIds.includes(id)),
  `ghim=${positionIds.length}`
);
check(
  "đủ 2 ghim điểm biển, khớp id SEA_POINTS",
  Object.keys(SATELLITE_SEA_POSITIONS).length === 2 &&
    SEA_POINTS.every((p) => p.id in SATELLITE_SEA_POSITIONS)
);

/* ------------------------- Tọa độ hợp lệ ------------------------- */
const allPositions = [
  ...Object.entries(SATELLITE_PROVINCE_POSITIONS),
  ...Object.entries(SATELLITE_SEA_POSITIONS),
];
check(
  "mọi tọa độ nằm trong khung 0,02–0,98",
  allPositions.every(
    ([, p]) => p.x >= 0.02 && p.x <= 0.98 && p.y >= 0.02 && p.y <= 0.98
  )
);
check(
  "không có hai ghim trùng vị trí",
  new Set(allPositions.map(([, p]) => `${p.x},${p.y}`)).size ===
    allPositions.length
);

/* ------------- Hành trình Bắc → Nam: y tăng dần ------------- */
const ys = provinceIds.map((id) => SATELLITE_PROVINCE_POSITIONS[id].y);
let bigInversions = 0;
for (let i = 1; i < ys.length; i++) {
  // Hành trình không đơn điệu tuyệt đối ở vùng núi phía Bắc (Lào Cai
  // nằm trên Sơn La, Cao Bằng là tỉnh cực Bắc dù đứng thứ 6) — chỉ
  // cấm "nhảy ngược" lớn, tức ghim bị đặt sai hẳn miền.
  if (ys[i] < ys[i - 1] - 0.1) bigInversions += 1;
}
check(
  "thứ tự hành trình đi dần xuống phía Nam (không nhảy ngược > 0,10)",
  bigInversions === 0,
  `số nghịch thế lớn=${bigInversions}`
);
check(
  "ghim đầu là Lai Châu ở phía Bắc, ghim cuối Cà Mau ở phía Nam nhất",
  ys[0] < 0.15 && ys[ys.length - 1] > 0.7
);

/* ------------------------- File ảnh ------------------------- */
const assetPath = path.join(
  root,
  "assets",
  "images",
  "vietnam-satellite-map.jpg"
);
check("file ảnh vệ tinh tồn tại", existsSync(assetPath));
if (existsSync(assetPath)) {
  const buf = readFileSync(assetPath);
  // Đọc kích thước JPEG từ đoạn SOF0/SOF2.
  let size = null;
  for (let i = 2; i < buf.length - 9; i++) {
    if (buf[i] !== 0xff) continue;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      size = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      break;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 1;
    } else {
      i += 1 + buf.readUInt16BE(i + 2);
    }
  }
  check(
    "ảnh JPEG đúng 646×550 như màn hình khai báo",
    size != null && size.w === 646 && size.h === 550,
    size ? `thực tế ${size.w}×${size.h}` : "không đọc được SOF"
  );
}

/* ------------- Thẻ tỉnh: ánh xạ bài học không lỗi ------------- */
// Mô phỏng đúng logic của màn vietnam-map khi bấm ghim tỉnh: pack
// KHÔNG có mảng units phẳng — phải flatten sections → units trước
// khi gọi unitIndexForProvince (bản đầu đọc thẳng pack.units nên
// bấm ghim tỉnh là trắng trang trên Preview PR #15).
const screenSource = readFileSync(
  path.join(root, "src", "app", "vietnam-map.tsx"),
  "utf8"
);
check(
  "màn bản đồ flatten sections → units, không đọc thẳng pack.units",
  screenSource.includes("sections.flatMap") &&
    !screenSource.includes("pack.units")
);
for (const courseId of ["en-vi", "ja-vi", "zh-vi"]) {
  const pack = JSON.parse(
    readFileSync(path.join(root, "src", "content", "packs", `${courseId}.json`), "utf8")
  );
  const units = pack.sections.flatMap((s) => s.units);
  let withUnit = 0;
  let titlesOk = true;
  for (let j = 0; j < PROVINCES.length; j++) {
    const ui = unitIndexForProvince(j, units.length);
    if (ui != null) {
      withUnit += 1;
      const unit = units[ui];
      if (!unit || typeof unit.title !== "string" || unit.title.length === 0) {
        titlesOk = false;
      }
    }
  }
  check(
    `${courseId}: mọi tỉnh tra được unit hợp lệ, số tỉnh có bài = số unit (${units.length})`,
    titlesOk && withUnit === units.length,
    `tỉnh có bài=${withUnit}`
  );
}

console.log(
  `\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} đạt, ${failures.length} lỗi`
);
process.exit(failures.length === 0 ? 0 : 1);
