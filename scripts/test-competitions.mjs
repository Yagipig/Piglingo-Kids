/**
 * Test tĩnh cho mục "Cuộc thi & chứng chỉ tiếng Anh":
 *  - src/lib/competitions.ts có đúng 13 mục, mỗi band >= 4 mục, id không trùng.
 *  - Mọi URL là https:// và thuộc đúng các domain chính thức đã duyệt.
 *  - Route /competitions đã đăng ký trong _layout và dashboard đã nối thẻ.
 * Chạy: node scripts/test-competitions.mjs
 */
import { readFileSync } from "node:fs";
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

const src = read("src/lib/competitions.ts");

// --- Trích các mục: id + band + url ---
const entries = [];
const entryRe = /id: "([^"]+)",\s+band: "([^"]+)"/g;
let m;
while ((m = entryRe.exec(src)) !== null) {
  entries.push({ id: m[1], band: m[2] });
}
const urls = [...src.matchAll(/url: "(https:\/\/[^"]+)"/g)].map((x) => x[1]);

check("đủ 13 mục cuộc thi/chứng chỉ", entries.length === 13, `thấy ${entries.length}`);
check("số URL khớp số mục", urls.length === entries.length, `${urls.length} url / ${entries.length} mục`);

const ids = entries.map((e) => e.id);
check("id không trùng nhau", new Set(ids).size === ids.length);

for (const band of ["tieu-hoc", "thcs", "thpt"]) {
  const n = entries.filter((e) => e.band === band).length;
  check(`band ${band} có >= 4 mục`, n >= 4, `thấy ${n}`);
}

const ALLOWED_DOMAINS = [
  "ioe.vn",
  "cambridgeenglish.org",
  "ets.org",
  "iigvietnam.com",
  "britishcouncil.vn",
  "idp.com",
];
const badUrls = urls.filter((u) => {
  try {
    const host = new URL(u).hostname;
    return !ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return true;
  }
});
check("mọi URL thuộc domain chính thức đã duyệt", badUrls.length === 0, badUrls.join(", "));
check(
  "mọi URL bắt đầu bằng https://",
  urls.every((u) => u.startsWith("https://")),
);

// Mọi mục phải có đủ các trường hiển thị
for (const field of ["name:", "org:", "levelLabel:", "desc:"]) {
  const count = (src.match(new RegExp(field, "g")) ?? []).length;
  check(`mọi mục có trường ${field}`, count >= 13, `thấy ${count}`);
}

// --- Route + nối dây giao diện ---
const layout = read("src/app/_layout.tsx");
check(
  'route "competitions" đã đăng ký modal trong _layout',
  layout.includes('name="competitions"'),
);

const screen = read("src/app/competitions.tsx");
check("màn hình có tiêu đề Cuộc thi & chứng chỉ", screen.includes("Cuộc thi & chứng chỉ tiếng Anh"));
check("màn hình mở link bằng Linking.openURL", screen.includes("Linking.openURL"));
check("màn hình có nhãn 'Khối của em'", screen.includes("Khối của em"));
check("màn hình có ghi chú không thu lệ phí/đăng ký hộ", screen.includes("không thu lệ phí và không đăng ký hộ") || screen.includes("không\n            thu lệ phí"));

const dashboard = read("src/components/garden-dashboard.tsx");
check("dashboard có prop onOpenCompetitions", dashboard.includes("onOpenCompetitions"));
check("dashboard có thẻ Cuộc thi & chứng chỉ", dashboard.includes("Cuộc thi & chứng chỉ tiếng Anh"));

const index = read("src/app/(tabs)/index.tsx");
check(
  "index.tsx nối onOpenCompetitions sang /competitions",
  index.includes('onOpenCompetitions={() => router.push("/competitions")}'),
);

console.log(
  failures.length === 0
    ? `\nTEST COMPETITIONS: ${passed}/${passed} PASS`
    : `\nTEST COMPETITIONS: ${failures.length} FAIL — ${failures.join("; ")}`,
);
process.exit(failures.length === 0 ? 0 : 1);
