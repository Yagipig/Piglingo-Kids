/**
 * Test tĩnh cho BẢN ĐỒ VIỆT NAM 34 TỈNH/THÀNH ở trang chủ:
 *  - src/components/world-map.tsx: nền ảnh vietnam-map-bg phủ kín thế
 *    giới 2200×1279, ghim tỉnh từ src/lib/provinces.ts (KHÔNG còn
 *    lands.ts / tranh đảo island-map), PanResponder kéo + chụm, kẹp
 *    scale 0.35–1.8, ref centerOnUnit / centerOnProvince /
 *    centerOnRegion / zoomIn / zoomOut / centerOnCurrent, bảng chi
 *    tiết tỉnh có Giới thiệu / Lịch sử / Đặc sản + chip bài học nối
 *    MissionPanel, điểm biển Hoàng Sa / Trường Sa chỉ xem thông tin.
 *  - src/app/(tabs)/index.tsx: dùng WorldMap, KHÔNG còn hàng chip
 *    vương quốc trên đầu / nút khối lớp cũ; có 2 THANH NÚT HAI BÊN —
 *    trái: 3 ngôn ngữ (KINGDOMS) + 3 miền (centerOnRegion); phải:
 *    zoomIn / zoomOut / centerOnCurrent + Nhiệm vụ (panel chứa
 *    GardenDashboard) / Thành tích / Phần thưởng / Cuộc thi — và vẫn
 *    giữ MissionPanel + nút Tiếp tục học bay camera (centerOnUnit).
 * Chạy: node scripts/test-worldmap.mjs
 */
import { readFileSync, existsSync } from "node:fs";
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
check("có ngưỡng ~8px để cú chạm vẫn tới được ghim", map.includes("> 8"));
check("có logic chụm 2 ngón (touches/pinches)", map.includes("touchPoints") && map.includes("pinchDist"));
check("kẹp scale tối thiểu 0.35", map.includes("MIN_SCALE = 0.35"));
check("kẹp scale tối đa 1.8", map.includes("MAX_SCALE = 1.8"));
check("thế giới đúng tỉ lệ ảnh nền 2200×1279", map.includes("WORLD_WIDTH = 2200") && map.includes("WORLD_HEIGHT = 1279"));
check("nền là ảnh vietnam-map-bg phủ kín", map.includes("vietnam-map-bg.jpg") && map.includes('contentFit="fill"'));
check("ghim tỉnh lấy từ lib/provinces (PROVINCES + SEA_POINTS)", map.includes("PROVINCES") && map.includes("SEA_POINTS") && map.includes('from "@/lib/provinces"'));
check("KHÔNG còn dùng lands.ts / landForUnit", !map.includes("landForUnit") && !map.includes("lib/lands"));
check("KHÔNG còn tranh đảo island-map-a..d", !map.includes("island-map-"));
check("KHÔNG còn vùng/tint/nhãn chặng theo khối lớp", !map.includes("ZONE_DEFS") && !map.includes("centerOnBand"));
check("expose centerOnUnit qua useImperativeHandle", map.includes("useImperativeHandle") && map.includes("centerOnUnit"));
check("expose centerOnProvince qua ref", map.includes("centerOnProvince"));
check("expose centerOnRegion qua ref", map.includes("centerOnRegion"));
check("expose zoomIn / zoomOut qua ref", map.includes("zoomIn") && map.includes("zoomOut"));
check("expose centerOnCurrent qua ref", map.includes("centerOnCurrent"));
check("bay camera bằng requestAnimationFrame", map.includes("requestAnimationFrame(step)"));
check("tôn trọng use-reduced-motion khi bay camera", map.includes("useReducedMotion") && map.includes("reducedMotion"));
check("mascot heo đứng trên tỉnh đang học", map.includes("mascot-avatar"));
check("tên tỉnh chỉ hiện khi zoom ≥ 0.75 (LABEL_MIN_SCALE)", map.includes("LABEL_MIN_SCALE = 0.75"));
check("bảng tỉnh có mục Giới thiệu", map.includes("Giới thiệu"));
check("bảng tỉnh có mục Lịch sử", map.includes("Lịch sử"));
check("bảng tỉnh có mục Đặc sản dạng chip", map.includes("Đặc sản") && map.includes("specialtyChip"));
check("bảng tỉnh có dòng hợp nhất mergedFrom", map.includes("mergedFrom") && map.includes("Trước đây là các tỉnh"));
check("bảng tỉnh có chip bài học nối onMissionPress", map.includes("onMissionPress(ref, course.courseId)"));
check("chip gợi ý ngôn ngữ khác gọi onSelectCourse", map.includes("onSelectCourse(c.courseId)"));
check("điểm biển Hoàng Sa / Trường Sa có bảng thông tin riêng", map.includes("SeaDetailPanel") && map.includes("Biển đảo quê hương"));
check("ánh xạ unit ↔ tỉnh qua provinces helpers", map.includes("provinceIndexForUnit") && map.includes("unitIndexForProvince"));
check("vị trí ghim tất định theo tọa độ tỉnh (không gọi Math.random)", !map.includes("Math.random("));
check("không import thư viện ngoài React Native core/expo-image", !/from "(?!react|react-native|expo-image|@\/)/.test(map));

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
check("ảnh nền vietnam-map-bg.jpg tồn tại trong assets", existsSync(join(root, "assets/images/vietnam-map-bg.jpg")));

console.log(
  failures.length === 0
    ? `\nTEST WORLDMAP: ${passed}/${passed} PASS`
    : `\nTEST WORLDMAP: ${failures.length} FAIL — ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
