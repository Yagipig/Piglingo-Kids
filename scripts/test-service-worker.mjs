// Kiểm chứng tĩnh cơ chế service worker sau đợt sửa lỗi kẹt giao diện cũ:
// network-first cho điều hướng/HTML, tên cache gắn phiên bản, xóa cache cũ
// khi activate, skipWaiting + clients.claim, tĩnh cache-first theo phiên bản.
import { readFileSync } from "node:fs";

const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const html = readFileSync(
  new URL("../src/app/+html.tsx", import.meta.url),
  "utf8"
);

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) {
    pass++;
    console.log("  ok -", name);
  } else {
    fail++;
    console.log("  FAIL -", name);
  }
}

// 1. Tên cache gắn phiên bản, không còn tên cố định duy nhất của bản đầu.
const versionMatch = sw.match(/SW_VERSION\s*=\s*"([^"]+)"/);
check("có hằng số SW_VERSION đóng dấu phiên bản", !!versionMatch);
check(
  "CACHE_NAME được ghép từ SW_VERSION",
  /CACHE_NAME\s*=\s*"[^"]*"\s*\+\s*SW_VERSION/.test(sw)
);
check(
  'không còn tên cache cố định "piglingo-kids-v1"',
  !sw.includes("piglingo-kids-v1")
);

// 2. Network-first cho điều hướng/HTML: nhánh tài liệu gọi fetch(request)
//    TRƯỚC khi rơi về caches.match.
const docIdx = sw.indexOf('request.mode === "navigate"');
check("có nhận diện request điều hướng (mode navigate)", docIdx >= 0);
const fetchIdx = sw.indexOf("fetch(request", docIdx);
const fallbackIdx = sw.indexOf('.match("./index.html"', docIdx);
check(
  "nhánh điều hướng thử mạng trước (fetch trước caches.match dự phòng)",
  docIdx >= 0 && fetchIdx > docIdx && fallbackIdx > fetchIdx
);
check(
  "fetch điều hướng kèm no-cache để lấy bản mới nhất",
  /fetch\(request,\s*\{\s*cache:\s*"no-cache"\s*\}\)/.test(sw)
);
check(
  "tài liệu HTML (destination/accept) cũng network-first",
  sw.includes('request.destination === "document"') &&
    sw.includes('"text/html"')
);

// 3. Activate: xóa mọi cache khác phiên bản + skipWaiting + clients.claim.
check(
  "activate xóa mọi cache không thuộc phiên bản hiện tại",
  /addEventListener\("activate"/.test(sw) &&
    /keys\.filter\(\(k\) => k !== CACHE_NAME\)\.map\(\(k\) => caches\.delete\(k\)\)/.test(
      sw
    )
);
check("có skipWaiting để worker mới áp dụng ngay", sw.includes("skipWaiting()"));
check("có clients.claim để giành điều khiển ngay", sw.includes("clients.claim()"));

// 4. Tài nguyên tĩnh: cache-first trong cache phiên bản hiện tại.
check(
  "tài nguyên tĩnh tra cache trước (caches.match(request))",
  sw.includes("caches.match(request)")
);
check(
  "tài nguyên tĩnh lưu vào cache theo phiên bản (open(CACHE_NAME))",
  (sw.match(/open\(CACHE_NAME\)/g) || []).length >= 2
);
check(
  "chỉ cache response ok cho tài nguyên tĩnh",
  /if \(response\.ok\)/.test(sw)
);

// 5. Request lạ: bỏ qua non-GET và khác origin (Supabase không bị cache).
check("bỏ qua request không phải GET", /request\.method !== "GET"/.test(sw));
check(
  "bỏ qua request khác origin (API/Supabase network-only)",
  /url\.origin !== self\.location\.origin/.test(sw)
);

// 6. Phía app: đăng ký SW chủ động kiểm tra bản mới.
check(
  "+html.tsx gọi registration.update() để kiểm tra sw mới sớm",
  html.includes("registration.update()")
);
check(
  "+html.tsx kiểm tra lại khi app quay lại foreground",
  html.includes("visibilitychange") && html.includes('"visible"')
);
check(
  "+html.tsx tự nạp lại một lần khi controller đổi (thoát kẹt)",
  html.includes("controllerchange") && html.includes("piglingo-sw-reloaded")
);

console.log(`\ntest-service-worker: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
