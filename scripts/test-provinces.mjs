#!/usr/bin/env node
/**
 * Test logic + dữ liệu của BẢN ĐỒ 34 TỈNH/THÀNH (src/lib/provinces.ts):
 *  - Đủ 34 tỉnh/thành theo hành trình Bắc → Nam + 2 điểm biển
 *    (Hoàng Sa, Trường Sa); id không trùng; tọa độ nằm trong (0,1);
 *    tỉnh nào cũng có giới thiệu, lịch sử và ≥ 2 đặc sản.
 *  - Đúng cơ cấu miền: Bắc 15, Trung 11, Nam 8; tỉnh đầu là Lai Châu,
 *    tỉnh cuối là Cà Mau; 23 tỉnh có mergedFrom (sáp nhập 2025),
 *    11 tỉnh giữ nguyên (mergedFrom = null).
 *  - Ánh xạ bài học: với unitCount 27 (Anh/Nhật) và 26 (Trung), các
 *    unit rơi vào các tỉnh PHÂN BIỆT, phủ tỉnh đầu + Cà Mau, đơn điệu
 *    tăng theo thứ tự unit; unitIndexForProvince là phép ngược đúng.
 *  - Baseline nội dung packs giữ nguyên 80 unit / 314 bài / 2488 câu.
 * Chạy: node scripts/test-provinces.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(path.join(tmpdir(), "piglingo-provinces-test-"));
const tscBin = path.join(root, "node_modules", ".bin", "tsc");

execFileSync(
  tscBin,
  [
    "--ignoreConfig",
    "src/lib/provinces.ts",
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
  { cwd: root, stdio: "inherit" },
);

const require = createRequire(import.meta.url);
const {
  PROVINCES,
  SEA_POINTS,
  PROVINCE_COUNT,
  REGION_LABELS,
  provinceIndexForUnit,
  unitIndexForProvince,
  provinceForUnit,
} = require(path.join(outDir, "provinces.js"));

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

/* ------------------------- Dữ liệu tỉnh ------------------------- */
check("đủ 34 tỉnh/thành", PROVINCES.length === 34 && PROVINCE_COUNT === 34);
check("đủ 2 điểm biển Hoàng Sa / Trường Sa",
  SEA_POINTS.length === 2 &&
  SEA_POINTS.some((p) => p.id === "hoang-sa") &&
  SEA_POINTS.some((p) => p.id === "truong-sa"));

const allIds = [...PROVINCES.map((p) => p.id), ...SEA_POINTS.map((p) => p.id)];
check("id không trùng nhau", new Set(allIds).size === allIds.length);
check("tên tỉnh không trùng nhau",
  new Set(PROVINCES.map((p) => p.name)).size === PROVINCES.length);

check("mọi tọa độ tỉnh nằm trong (0,1)",
  PROVINCES.every((p) => p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1));
check("mọi tọa độ điểm biển nằm trong (0,1)",
  SEA_POINTS.every((p) => p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1));

check("mọi tỉnh có giới thiệu + lịch sử + ≥ 2 đặc sản",
  PROVINCES.every(
    (p) =>
      p.intro.trim().length > 0 &&
      p.history.trim().length > 0 &&
      Array.isArray(p.specialties) &&
      p.specialties.length >= 2 &&
      p.specialties.every((s) => s.trim().length > 0),
  ));
check("mọi điểm biển có giới thiệu + lịch sử",
  SEA_POINTS.every((p) => p.intro.trim().length > 0 && p.history.trim().length > 0));

const byRegion = { bac: 0, trung: 0, nam: 0 };
for (const p of PROVINCES) byRegion[p.region] += 1;
check("cơ cấu miền: Bắc 15 · Trung 11 · Nam 8",
  byRegion.bac === 15 && byRegion.trung === 11 && byRegion.nam === 8,
  JSON.stringify(byRegion));
check("hành trình theo miền: Bắc trước, Trung giữa, Nam cuối",
  PROVINCES.slice(0, 15).every((p) => p.region === "bac") &&
  PROVINCES.slice(15, 26).every((p) => p.region === "trung") &&
  PROVINCES.slice(26).every((p) => p.region === "nam"));
check("tỉnh đầu hành trình là Lai Châu, tỉnh cuối là Cà Mau",
  PROVINCES[0].name === "Lai Châu" && PROVINCES[33].name === "Cà Mau");
check("có đủ nhãn miền thuần Việt",
  REGION_LABELS.bac === "Miền Bắc" &&
  REGION_LABELS.trung === "Miền Trung" &&
  REGION_LABELS.nam === "Miền Nam");

const merged = PROVINCES.filter((p) => p.mergedFrom !== null);
const kept = PROVINCES.filter((p) => p.mergedFrom === null);
check("23 tỉnh/thành sáp nhập có mergedFrom, 11 tỉnh giữ nguyên",
  merged.length === 23 && kept.length === 11,
  `merged=${merged.length} kept=${kept.length}`);
check("mergedFrom của Tuyên Quang nhắc Hà Giang, của Đà Nẵng nhắc Quảng Nam",
  PROVINCES.find((p) => p.id === "tuyen-quang")?.mergedFrom?.includes("Hà Giang") &&
  PROVINCES.find((p) => p.id === "da-nang")?.mergedFrom?.includes("Quảng Nam"));
check("nội dung nổi bật đúng: Hà Nội có Phở, Khánh Hòa nhắc Trường Sa, An Giang nhắc Phú Quốc",
  PROVINCES.find((p) => p.id === "ha-noi")?.specialties.includes("Phở Hà Nội") &&
  (PROVINCES.find((p) => p.id === "khanh-hoa")?.intro.includes("Trường Sa") ?? false) &&
  (PROVINCES.find((p) => p.id === "an-giang")?.intro.includes("Phú Quốc") ?? false));

/* ------------------------- Ánh xạ bài học ------------------------- */
for (const unitCount of [27, 26]) {
  const placed = Array.from({ length: unitCount }, (_, u) =>
    provinceIndexForUnit(u, unitCount),
  );
  check(`unitCount=${unitCount}: các unit rơi vào tỉnh phân biệt`,
    new Set(placed).size === unitCount);
  check(`unitCount=${unitCount}: đơn điệu tăng nghiêm ngặt theo thứ tự unit`,
    placed.every((v, i) => i === 0 || v > placed[i - 1]));
  check(`unitCount=${unitCount}: phủ tỉnh đầu (0) và Cà Mau (33)`,
    placed[0] === 0 && placed[unitCount - 1] === 33);
  check(`unitCount=${unitCount}: mọi tỉnh index hợp lệ 0–33`,
    placed.every((v) => v >= 0 && v <= 33));
  check(`unitCount=${unitCount}: unitIndexForProvince là phép ngược đúng`,
    placed.every((pIdx, u) => unitIndexForProvince(pIdx, unitCount) === u));
  const emptyCount = PROVINCES.filter(
    (_, idx) => unitIndexForProvince(idx, unitCount) === null,
  ).length;
  check(`unitCount=${unitCount}: số tỉnh không có bài = ${34 - unitCount}`,
    emptyCount === 34 - unitCount, `empty=${emptyCount}`);
}
check("provinceForUnit(0, 27) là Lai Châu, provinceForUnit(26, 27) là Cà Mau",
  provinceForUnit(0, 27).id === "lai-chau" && provinceForUnit(26, 27).id === "ca-mau");
check("provinceIndexForUnit kẹp biên an toàn (unit âm / vượt quá)",
  provinceIndexForUnit(-3, 27) === 0 && provinceIndexForUnit(999, 27) === 33);

/* ------------------------- Baseline packs ------------------------- */
let totalUnits = 0;
let totalLessons = 0;
let totalExercises = 0;
for (const courseId of ["en-vi", "ja-vi", "zh-vi"]) {
  const pack = JSON.parse(
    readFileSync(path.join(root, "src/content/packs", `${courseId}.json`), "utf8"),
  );
  for (const section of pack.sections) {
    for (const unit of section.units) {
      totalUnits += 1;
      for (const lesson of unit.lessons ?? []) {
        totalLessons += 1;
        totalExercises += lesson.exercises?.length ?? 0;
      }
    }
  }
}
check("baseline packs giữ nguyên 80 unit / 314 bài / 2488 câu",
  totalUnits === 80 && totalLessons === 314 && totalExercises === 2488,
  `${totalUnits}/${totalLessons}/${totalExercises}`);

console.log(
  failures.length === 0
    ? `\nTEST PROVINCES: ${passed}/${passed} PASS`
    : `\nTEST PROVINCES: ${failures.length} FAIL — ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
