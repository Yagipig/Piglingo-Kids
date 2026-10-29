/**
 * Test tĩnh cho BẢN ĐỒ VIỆT NAM THẬT (ranh giới tỉnh) ở trang chủ:
 *  - src/components/world-map.tsx: vẽ bằng react-native-svg từ
 *    src/lib/province-shapes.ts (PROVINCE_SHAPES — 34 tỉnh có đường
 *    SVG + điểm đại diện cx/cy trong MAP_VIEWBOX 1000×1977), thế giới
 *    1600×3163 đúng tỉ lệ viewBox, tỉnh tô màu kẹo pastel luân phiên,
 *    chạm vào chính Path của tỉnh để chọn; đường hành trình chấm tròn
 *    nối các tỉnh có unit theo thứ tự unit; huy hiệu tròn đánh số
 *    1..N tại tâm tỉnh; Hoàng Sa / Trường Sa là cụm đảo vẽ trong SVG;
 *    KHÔNG còn nền ảnh vietnam-map-bg / ghim theo x/y cũ. Giữ nguyên:
 *    PanResponder kéo + chụm, ref centerOnUnit / centerOnProvince /
 *    centerOnRegion / zoomIn / zoomOut / centerOnCurrent, bảng chi
 *    tiết tỉnh (Giới thiệu / Lịch sử / Đặc sản + chip bài học nối
 *    MissionPanel) theo provinces.ts.
 *  - Thang zoom ĐỘNG theo khung nhìn (scaleLimits): fitScale thấy
 *    toàn quốc, coverScale phủ kín khung, min = fitScale × 0,95,
 *    max = max(1,8, coverScale × 2,2); mở app: khung ngang ở
 *    coverScale × 1,15, khung dọc vừa theo bề ngang.
 *  - WEB: viewport khóa touchAction/userSelect "none"; listener wheel
 *    (passive: false, luôn preventDefault, zoom quanh con trỏ, hỗ
 *    trợ ctrlKey) + kéo bằng chuột (mousedown/mousemove/mouseup);
 *    cơ chế "vết kéo" (lastDragEndAt/lastDragDist, ≤300ms) để cú
 *    chạm sau khi kéo không chọn nhầm tỉnh.
 *  - Dữ liệu hình tỉnh (runtime): đủ 34 mục, mọi id tỉnh trong
 *    provinces.ts đều có hình, cx/cy nằm trong viewBox, d bắt đầu "M".
 *  - src/app/(tabs)/index.tsx: dùng WorldMap, 2 thanh nút hai bên
 *    (trái: ngôn ngữ KINGDOMS + miền centerOnRegion; phải: zoomIn /
 *    zoomOut / centerOnCurrent + Nhiệm vụ / Thành tích / Phần thưởng /
 *    Cuộc thi), giữ MissionPanel + nút Tiếp tục học (centerOnUnit).
 * Chạy: node scripts/test-worldmap.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

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

// --- world-map.tsx ---
const mapPath = "src/components/world-map.tsx";
check("world-map.tsx tồn tại", existsSync(join(root, mapPath)));
const map = read(mapPath);

check("dùng PanResponder cho cử chỉ kéo/chụm", map.includes("PanResponder.create"));
check("có ngưỡng ~8px để cú chạm vẫn tới được tỉnh/huy hiệu", map.includes("> 8"));
check("có logic chụm 2 ngón (touches/pinches)", map.includes("touchPoints") && map.includes("pinchDist"));
check("thang zoom động scaleLimits theo khung nhìn", map.includes("scaleLimits") && map.includes("fitScale") && map.includes("coverScale"));
check("zoom tối thiểu = fitScale × 0,95 (thu về thấy toàn quốc)", map.includes("fitScale * 0.95"));
check("zoom tối đa = max(1,8, coverScale × 2,2)", map.includes("MAX_SCALE = 1.8") && map.includes("coverScale * 2.2"));
check("mở app khung ngang ở coverScale × 1,15, căn tỉnh đang học", map.includes("coverScale * 1.15"));
check("thế giới 1600×3163 đúng tỉ lệ MAP_VIEWBOX", map.includes("WORLD_WIDTH = 1600") && map.includes("WORLD_HEIGHT = 3163"));
check("viewport khóa touchAction none (web)", map.includes('touchAction: "none"') && map.includes("WEB_VIEWPORT_LOCK"));
check("viewport khóa userSelect none (web)", map.includes('userSelect: "none"'));
check("có wheel handler chặn zoom trang (preventDefault + passive false)", map.includes('"wheel"') && map.includes("preventDefault") && map.includes("passive: false"));
check("wheel hỗ trợ ctrlKey (chụm trackpad)", map.includes("ctrlKey"));
check("có kéo bằng chuột (mousedown/mousemove/mouseup)", map.includes('"mousedown"') && map.includes('"mousemove"') && map.includes('"mouseup"'));
check("cơ chế bỏ qua chạm sau kéo (lastDragEndAt/lastDragDist)", map.includes("lastDragEndAt") && map.includes("lastDragDist") && map.includes("wasRecentDrag"));
check("handler chạm tỉnh kiểm tra vết kéo trước khi chọn", map.includes("if (wasRecentDrag()) return"));
check("dùng react-native-svg (Svg + Path)", map.includes('from "react-native-svg"') && map.includes("<Svg") && map.includes("<Path"));
check("package.json đã cài react-native-svg", read("package.json").includes('"react-native-svg"'));
check("hình tỉnh lấy từ lib/province-shapes (PROVINCE_SHAPES + MAP_VIEWBOX)", map.includes("PROVINCE_SHAPES") && map.includes("MAP_VIEWBOX") && map.includes('from "@/lib/province-shapes"'));
check("vị trí tỉnh lấy từ PROVINCE_SHAPES[cx/cy], không dùng x/y cũ", map.includes("PROVINCE_SHAPES[province.id]") && map.includes("shape.cx"));
check("KHÔNG còn nền ảnh vietnam-map-bg trong world-map", !map.includes("vietnam-map-bg"));
check("KHÔNG còn dùng lands.ts / landForUnit", !map.includes("landForUnit") && !map.includes("lib/lands"));
check("KHÔNG còn tranh đảo island-map-a..d", !map.includes("island-map-"));
check("KHÔNG còn vùng/tint/nhãn chặng theo khối lớp", !map.includes("ZONE_DEFS") && !map.includes("centerOnBand"));
check("tỉnh tô màu pastel luân phiên (PROVINCE_COLORS)", map.includes("PROVINCE_COLORS") && map.includes("#ffadad") && map.includes("#caffbf") && map.includes("#ffc6ff") && map.includes("index % PROVINCE_COLORS.length"));
check("tỉnh đang chọn có stroke cam đậm + lớp sáng phủ", map.includes('stroke="#ff8c1a"') && map.includes("strokeWidth={5}"));
check("đường hành trình chấm tròn (strokeDasharray + linecap round)", map.includes("strokeDasharray") && map.includes('strokeLinecap="round"') && map.includes("journeyD"));
check("đường hành trình có lớp trắng lót dưới", map.includes('stroke="#ffffff"') && map.includes("strokeWidth={11}"));
check("đường hành trình nối theo thứ tự unitIndex tăng dần", map.includes("unitIndex as number) - (b.unitIndex as number)") || (map.includes("sort(") && map.includes("unitIndex")));
check("huy hiệu tròn đánh số thứ tự unit tại tâm tỉnh", map.includes("(model.unitIndex as number) + 1") && map.includes("UnitBadge"));
check("huy hiệu xong = xanh lá + ⭐, khóa có 🔒", map.includes("badgeDone") && map.includes("⭐") && map.includes("🔒"));
check("tỉnh không có unit ở khóa này có huy hiệu 📖", map.includes("📖") && map.includes("BADGE_SIZE_INFO"));
check("Hoàng Sa / Trường Sa là cụm đảo Ellipse trong SVG", map.includes("SEA_CLUSTER_VB") && map.includes("<Ellipse") && map.includes('"hoang-sa"') && map.includes('"truong-sa"'));
check("nền biển xanh nhạt + trang trí vui trong vùng biển", map.includes('SEA_COLOR = "#a8dffd"') && map.includes("SEA_DECORATIONS") && map.includes("🐳") && map.includes("⛵"));
check("tên tỉnh hiện khi zoom ≥ 0,5; tỉnh nhỏ ≥ 0,85", map.includes("LABEL_MIN_SCALE = 0.5") && map.includes("SMALL_LABEL_MIN_SCALE = 0.85") && map.includes("SMALL_LABEL_IDS") && map.includes('"ha-noi"') && map.includes('"bac-ninh"') && map.includes('"hung-yen"') && map.includes('"hai-phong"'));
check("expose centerOnUnit qua useImperativeHandle", map.includes("useImperativeHandle") && map.includes("centerOnUnit"));
check("expose centerOnProvince qua ref", map.includes("centerOnProvince"));
check("expose centerOnRegion qua ref (điểm neo viewBox)", map.includes("centerOnRegion") && map.includes("REGION_ANCHOR_VB"));
check("expose zoomIn / zoomOut qua ref", map.includes("zoomIn") && map.includes("zoomOut"));
check("expose centerOnCurrent qua ref", map.includes("centerOnCurrent"));
check("bay camera bằng requestAnimationFrame", map.includes("requestAnimationFrame(step)"));
check("tôn trọng use-reduced-motion khi bay camera", map.includes("useReducedMotion") && map.includes("reducedMotion"));
check("mascot heo đứng trên tỉnh đang học", map.includes("mascot-avatar"));
check("bảng tỉnh có mục Giới thiệu", map.includes("Giới thiệu"));
check("bảng tỉnh có mục Lịch sử", map.includes("Lịch sử"));
check("bảng tỉnh có mục Đặc sản dạng chip", map.includes("Đặc sản") && map.includes("specialtyChip"));
check("bảng tỉnh có dòng hợp nhất mergedFrom", map.includes("mergedFrom") && map.includes("Trước đây là các tỉnh"));
check("bảng tỉnh có chip bài học nối onMissionPress", map.includes("onMissionPress(ref, course.courseId)"));
check("chip gợi ý ngôn ngữ khác gọi onSelectCourse", map.includes("onSelectCourse(c.courseId)"));
check("điểm biển Hoàng Sa / Trường Sa có bảng thông tin riêng", map.includes("SeaDetailPanel") && map.includes("Biển đảo quê hương"));
check("thông tin tỉnh vẫn lấy từ lib/provinces (PROVINCES + SEA_POINTS)", map.includes("PROVINCES") && map.includes("SEA_POINTS") && map.includes('from "@/lib/provinces"'));
check("ánh xạ unit ↔ tỉnh qua provinces helpers", map.includes("provinceIndexForUnit") && map.includes("unitIndexForProvince"));
check("vị trí tỉnh tất định (không gọi Math.random)", !map.includes("Math.random("));
check("không import thư viện ngoài RN core/expo-image/react-native-svg", !/from "(?!react|react-native|react-native-svg|expo-image|@\/)/.test(map));

// --- province-shapes.ts (runtime): biên dịch rồi nạp như test-provinces ---
const outDir = mkdtempSync(join(tmpdir(), "piglingo-shapes-test-"));
const tscBin = join(root, "node_modules", ".bin", "tsc");
execFileSync(
  tscBin,
  [
    "--ignoreConfig",
    "src/lib/province-shapes.ts",
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
const { MAP_VIEWBOX, PROVINCE_SHAPES } = require(join(outDir, "province-shapes.js"));
const { PROVINCES } = require(join(outDir, "provinces.js"));

check("MAP_VIEWBOX = 1000×1977", MAP_VIEWBOX.width === 1000 && MAP_VIEWBOX.height === 1977);
check("PROVINCE_SHAPES đủ 34 tỉnh", Object.keys(PROVINCE_SHAPES).length === 34,
  `count=${Object.keys(PROVINCE_SHAPES).length}`);
check("mọi tỉnh trong provinces.ts đều có hình",
  PROVINCES.every((p) => PROVINCE_SHAPES[p.id] !== undefined),
  PROVINCES.filter((p) => !PROVINCE_SHAPES[p.id]).map((p) => p.id).join(","));
check("mọi hình có d bắt đầu bằng M và đủ dài",
  Object.values(PROVINCE_SHAPES).every(
    (s) => typeof s.d === "string" && s.d.startsWith("M") && s.d.length > 50,
  ));
check("mọi cx/cy nằm trong viewBox",
  Object.values(PROVINCE_SHAPES).every(
    (s) => s.cx > 0 && s.cx < MAP_VIEWBOX.width && s.cy > 0 && s.cy < MAP_VIEWBOX.height,
  ));

// --- index.tsx ---
const index = read("src/app/(tabs)/index.tsx");
check("index.tsx import WorldMap", index.includes('from "@/components/world-map"'));
check("index.tsx render <WorldMap", index.includes("<WorldMap"));
check("index.tsx KHÔNG còn render LandCard", !index.includes("<LandCard"));
check("index.tsx KHÔNG còn render MagicalGardenScene", !index.includes("<MagicalGardenScene"));
check("index.tsx KHÔNG còn hàng chip vương quốc trên đầu", !index.includes("styles.kingdomRow") && !index.includes("styles.kingdomChip") && !index.includes("kingdomChipText"));
check("index.tsx KHÔNG còn nút khối lớp cũ (BAND_BUTTONS/centerOnBand)", !index.includes("BAND_BUTTONS") && !index.includes("centerOnBand"));
check("thanh trái: 3 nút ngôn ngữ qua KINGDOMS + targetLanguage", index.includes("railLeft") && index.includes("KINGDOMS.map") && index.includes("item.targetLanguage"));
check("thanh trái: 3 nút miền gọi centerOnRegion", index.includes("centerOnRegion") && index.includes("REGION_BUTTONS"));
check("thanh phải tồn tại (railRight)", index.includes("railRight"));
check("thanh phải: nút phóng to gọi zoomIn", index.includes("zoomIn()") && index.includes("Phóng to bản đồ"));
check("thanh phải: nút thu nhỏ gọi zoomOut", index.includes("zoomOut()") && index.includes("Thu nhỏ bản đồ"));
check("thanh phải: nút về tỉnh đang học gọi centerOnCurrent", index.includes("centerOnCurrent()") && index.includes("Về tỉnh đang học"));
check("thanh phải: nút Nhiệm vụ mở panel chứa GardenDashboard", index.includes("Nhiệm vụ") && index.includes("<GardenDashboard"));
check("panel Nhiệm vụ & thành tích còn tiêu đề như cũ", index.includes("🎯 Nhiệm vụ & thành tích"));
check("thanh phải: nút Thành tích đi route /achievements", index.includes('router.push("/achievements")'));
check("thanh phải: nút Phần thưởng đi route /rewards", index.includes('router.push("/rewards")'));
check("thanh phải: nút Cuộc thi đi route /competitions", index.includes('router.push("/competitions")'));
check("MissionPanel vẫn được render ở trang chủ", index.includes("<MissionPanel"));
check("nút Tiếp tục học vẫn còn và bay camera (centerOnUnit)", index.includes("<ContinueButton") && index.includes("centerOnUnit"));
check("đổi khóa qua thanh ngôn ngữ vẫn gọi setActiveCourse", index.includes("setActiveCourse(courseId)"));
check("nút 2 thanh có nhãn chữ nhỏ (railLabel)", index.includes("railLabel") && index.includes("Đang học") && index.includes("Phần thưởng") && index.includes("Cuộc thi"));

// --- Các file cũ được giữ nguyên ---
check("land-card.tsx vẫn còn (giữ file)", existsSync(join(root, "src/components/land-card.tsx")));
check("magical-garden-scene.tsx vẫn còn (giữ file)", existsSync(join(root, "src/components/magical-garden-scene.tsx")));
check("lands.ts vẫn còn (guidebook/lesson/mission-panel còn dùng)", existsSync(join(root, "src/lib/lands.ts")));
check("ảnh nền vietnam-map-bg.jpg vẫn còn trong assets (chỉ bỏ khỏi world-map)", existsSync(join(root, "assets/images/vietnam-map-bg.jpg")));

console.log(
  failures.length === 0
    ? `\nTEST WORLDMAP: ${passed}/${passed} PASS`
    : `\nTEST WORLDMAP: ${failures.length} FAIL — ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
