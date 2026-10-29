# MAP-FIX-REPORT — Sửa 2 lỗi trải nghiệm bản đồ trên máy tính

Ngày: 29/10/2026. Phạm vi: CHỈ sửa `src/components/world-map.tsx` (+ cập nhật
`scripts/test-worldmap.mjs`). Không đổi API/logic nào khác, không upload GitHub.

## Lỗi người dùng báo (trên máy tính)

1. "Chế độ thu phóng chỉ bản đồ thôi, không phải cả giao diện màn hình" —
   chụm/cuộn trên trình duyệt làm trình duyệt phóng to CẢ TRANG (cả thanh
   nút 2 bên, đầu trang) thay vì chỉ bản đồ.
2. "Trên máy tính không kéo sang 2 bên được" — kéo ngang bằng chuột không
   di chuyển được bản đồ.

## Nguyên nhân

- Viewport bản đồ chưa khóa cử chỉ trình duyệt: thiếu `touch-action: none`
  và chưa có wheel handler, nên pinch/trackpad-zoom bị trình duyệt giành
  để zoom cả trang.
- Thế giới rộng 1250px nhỏ hơn bề ngang khung nhìn của màn hình máy tính
  → camera bị kẹp cứng trục ngang, không còn khoảng để kéo ngang.
- PanResponder trên web không xử lý wheel và kéo bằng chuột không tin cậy.

## Cách đã sửa (trong world-map.tsx)

1. **Khóa cử chỉ trình duyệt trên vùng bản đồ (web):** viewport nhận thêm
   style `touchAction: "none"` + `userSelect: "none"` (hằng
   `WEB_VIEWPORT_LOCK`, chỉ áp dụng khi `Platform.OS === "web"`).
2. **Wheel/trackpad zoom (web):** listener DOM `wheel` với
   `{ passive: false }` gắn qua ref của viewport — luôn `preventDefault()`
   (chặn zoom trang + cuộn trang khi con trỏ trên bản đồ), zoom camera
   quanh đúng vị trí con trỏ (điểm dưới con trỏ đứng yên), deltaY chuẩn
   hóa theo deltaMode (dòng ×16, trang ×chiều cao), hỗ trợ `ctrlKey`
   (chụm trên trackpad, hệ số nhạy riêng).
3. **Kéo bằng chuột (web):** `mousedown` (chỉ khi nhấn thật vào trong
   viewport) → theo dõi `mousemove`/`mouseup` ở window. Lệch > 6px mới
   coi là kéo và cập nhật camera qua cùng `clampCamera` hiện có.
   PanResponder tự nhường khi cú kéo chuột đang diễn ra (tránh kéo 2 lần).
4. **Chặn chạm nhầm sau kéo:** ref `{ lastDragEndAt, lastDragDist }` —
   mọi handler chạm tỉnh (Path `onPress`, huy hiệu Pressable, điểm biển,
   cả vùng biển trống) kiểm tra: nếu vừa kết thúc cú kéo > 6px trong
   ≤ 300ms thì BỎ QUA. `mouseup` nghe ở phase capture của window nên
   "vết kéo" được ghi TRƯỚC khi onPress kịp chạy. Cú kéo/chụm cảm ứng
   qua PanResponder cũng ghi vết tương tự khi thả tay.
5. **Thế giới to hơn:** bề rộng render 1250 → **1600** (cao tỉ lệ theo
   viewBox 1000×1977 → **3163**): tỉnh to hơn, có khoảng kéo ngang trên
   màn rộng.
6. **Thang zoom động theo khung nhìn thật** (`scaleLimits`, tính từ
   `onLayout`): `fitScale = min(vw/worldW, vh/worldH)` (thấy toàn quốc),
   `coverScale = max(vw/worldW, vh/worldH)` (phủ kín khung);
   min = `fitScale × 0,95`, max = `max(1,8, coverScale × 2,2)`.
   - Mở app: khung NGANG mở ở `coverScale × 1,15` căn vào tỉnh đang học
     (kéo được cả 2 chiều ngay); khung DỌC mở ở mức vừa theo bề ngang.
   - Nút − thu được về mức thấy toàn quốc; bay về tỉnh đang học (🎯)
     dùng scale không nhỏ hơn coverScale (×1,15) khi khung ngang.
   - Kẹp biên giữ hành vi cũ: trục nào thế giới nhỏ hơn khung thì căn
     giữa, lớn hơn thì kẹp không hở viền biển — đúng với worldW mới.

## Kiểm chứng ở máy (tự động)

- `scripts/test-worldmap.mjs`: **84/84 PASS** (đã cập nhật: touchAction
  none, wheel + preventDefault, mousedown/mousemove/mouseup, cơ chế vết
  kéo, worldW 1600, fitScale/coverScale…).
- test-provinces 30/30, test-garden 14/14, test-rewards 9/9,
  test-ranks 12/12, test-competitions 20/20 — đều PASS.
- Baseline packs giữ nguyên: 80 unit / 314 bài / 2488 câu.
- `npx tsc --noEmit`: **0 lỗi**.
- `npx expo export --platform web`: **PASS**.

## Phần CHỈ kiểm chứng được bằng tay trên trình duyệt thật

Các mục sau không kiểm chứng được bằng test tĩnh/tsc/export — điều phối
cần thử trực tiếp trên bản live sau khi đẩy:

- Kéo bản đồ bằng CHUỘT trên máy tính (cả ngang lẫn dọc) có mượt và
  đúng hướng không; thả chuột sau khi kéo có bị chọn nhầm tỉnh không.
- Cuộn chuột (wheel) và chụm trackpad (ctrlKey) có zoom đúng quanh vị
  trí con trỏ không, và trình duyệt có THẬT SỰ không còn zoom cả trang
  (thanh nút/đầu trang đứng yên) không.
- Mở trang trên màn hình rộng: bản đồ có phủ kín và kéo ngang được
  ngay từ đầu không; nút − có thu về thấy toàn quốc không.
- Trên điện thoại (cảm ứng): kéo 1 ngón + chụm 2 ngón vẫn như cũ, chạm
  tỉnh vẫn mở đúng bảng, không bị cơ chế "vết kéo" chặn nhầm cú chạm
  thật (chạm ngay sau khi kéo < 300ms có thể bị bỏ qua 1 lần — hành vi
  có chủ đích, cần xác nhận mức độ khó chịu thực tế).

## File đã sửa

- `src/components/world-map.tsx` (sửa chính)
- `scripts/test-worldmap.mjs` (cập nhật kiểm tra tĩnh)
- `MAP-FIX-REPORT.md` (file mới — báo cáo này)
