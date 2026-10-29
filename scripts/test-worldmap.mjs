/**
 * Test tĩnh cho BẢN ĐỒ BIỂN kiểu game map ở trang chủ:
 *  - src/components/world-map.tsx tồn tại, có PanResponder (kéo + chụm),
 *    logic zoom (kẹp scale 0.35–1.8, nút +/−), ref centerOnUnit/centerOnBand,
 *    bảng chi tiết đảo với chip bài học nối MissionPanel, nhãn 3 vùng khối lớp.
 *  - src/app/(tabs)/index.tsx dùng WorldMap, KHÔNG còn render LandCard /
 *    MagicalGardenScene, còn đủ chip 3 vương quốc, 3 nút khối lớp phủ bản đồ
 *    và nút mở panel "Nhiệm vụ & thành tích" chứa GardenDashboard.
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
check("có ngưỡng ~8px để cú chạm vẫn tới được đảo", map.includes("> 8"));
check("có logic chụm 2 ngón (touches/pinches)", map.includes("touchPoints") && map.includes("pinchDist"));
check("kẹp scale tối thiểu 0.35", map.includes("MIN_SCALE = 0.35"));
check("kẹp scale tối đa 1.8", map.includes("MAX_SCALE = 1.8"));
check("thế giới lớn 2600×2100", map.includes("WORLD_WIDTH = 2600") && map.includes("WORLD_HEIGHT = 2100"));
check("expose centerOnUnit qua useImperativeHandle", map.includes("useImperativeHandle") && map.includes("centerOnUnit"));
check("expose centerOnBand qua ref", map.includes("centerOnBand"));
check("bay camera bằng requestAnimationFrame", map.includes("requestAnimationFrame(step)"));
check("tôn trọng use-reduced-motion khi bay camera", map.includes("useReducedMotion") && map.includes("reducedMotion"));
check("nút phóng to có nhãn trợ năng", map.includes("Phóng to bản đồ"));
check("nút thu nhỏ có nhãn trợ năng", map.includes("Thu nhỏ bản đồ"));
check("nút về đảo đang học 🎯", map.includes("Về đảo đang học"));
check("dùng 4 tranh đảo luân phiên island-map-a..d", ["island-map-a", "island-map-b", "island-map-c", "island-map-d"].every((n) => map.includes(n)));
check("mascot heo đứng trên đảo đang học", map.includes("mascot-avatar"));
check("nhãn vùng Khối Tiểu học", map.includes("Khối Tiểu học"));
check("nhãn vùng Khối THCS", map.includes("Khối THCS"));
check("nhãn vùng Khối THPT", map.includes("Khối THPT"));
check("có Đảo Phú Quốc qua landForUnit", map.includes("landForUnit"));
check("bảng chi tiết đảo có chip bài học nối onMissionPress", map.includes("onMissionPress(ref, island.courseId)"));
check("đảo khóa khác tự chuyển khóa qua onSelectCourse", map.includes("onSelectCourse(island.courseId)"));
check("vị trí đảo tất định (không gọi Math.random)", !map.includes("Math.random("));
check("trang trí biển 🌊 🐚 🪸", map.includes("🌊") && map.includes("🐚") && map.includes("🪸"));
check("không import thư viện ngoài React Native core/expo-image", !/from "(?!react|react-native|expo-image|@\/)/.test(map));

// --- index.tsx ---
const index = read("src/app/(tabs)/index.tsx");
check("index.tsx import WorldMap", index.includes('from "@/components/world-map"'));
check("index.tsx render <WorldMap", index.includes("<WorldMap"));
check("index.tsx KHÔNG còn render LandCard", !index.includes("<LandCard"));
check("index.tsx KHÔNG còn render MagicalGardenScene", !index.includes("<MagicalGardenScene"));
check("index.tsx không còn cuộn trang chính (không ScrollView bọc toàn trang)", !index.includes("scrollToMapTop"));
check("còn đủ chip 3 vương quốc qua KINGDOMS", index.includes("KINGDOMS.map") && index.includes("kingdomName"));
check("3 nút khối lớp phủ bản đồ gọi centerOnBand", index.includes("centerOnBand") && index.includes("Tiểu học") && index.includes("THCS") && index.includes("THPT"));
check("nút nổi mở panel Nhiệm vụ & thành tích", index.includes("🎯 Nhiệm vụ & thành tích"));
check("GardenDashboard nằm trong panel (vẫn render)", index.includes("<GardenDashboard"));
check("MissionPanel vẫn được render ở trang chủ", index.includes("<MissionPanel"));
check("nút Tiếp tục học vẫn còn và bay camera (centerOnUnit)", index.includes("<ContinueButton") && index.includes("centerOnUnit"));
check("đổi khóa qua chip vương quốc vẫn gọi setActiveCourse", index.includes("setActiveCourse(courseId)"));

// --- Các file cũ được giữ nguyên ---
check("land-card.tsx vẫn còn (giữ file)", existsSync(join(root, "src/components/land-card.tsx")));
check("magical-garden-scene.tsx vẫn còn (giữ file)", existsSync(join(root, "src/components/magical-garden-scene.tsx")));

console.log(
  failures.length === 0
    ? `\nTEST WORLDMAP: ${passed}/${passed} PASS`
    : `\nTEST WORLDMAP: ${failures.length} FAIL — ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
