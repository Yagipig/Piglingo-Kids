# Báo cáo: Bản đồ Việt Nam 34 tỉnh/thành (thay bản đồ 80 đảo)

Ngày thực hiện: 29/10/2026 · Trạng thái: **ĐÃ XONG ở máy, CHƯA upload GitHub** (chờ điều phối đẩy lên).

## Tóm tắt thay đổi

Trang chủ Piglingo Kids chuyển từ "80 đảo trên mặt biển" sang **bản đồ Việt Nam
34 tỉnh/thành** theo mẫu game Đại Việt người dùng gửi:

- **Một bản đồ dùng chung cho cả 3 ngôn ngữ** — đổi ngôn ngữ chỉ đổi bài học
  bên trong tỉnh, bản đồ và vị trí ghim không đổi.
- Mỗi tỉnh có **thẻ thông tin riêng**: giới thiệu, lịch sử, đặc sản (+ dòng
  "Trước đây là các tỉnh: …" với 23 tỉnh/thành hình thành sau sáp nhập 2025).
- **Bài học rải đều khắp 34 tỉnh** theo thứ tự unit của từng khóa (Anh 27,
  Nhật 27, Trung 26 unit): unit đầu ở Lai Châu, unit cuối ở Cà Mau. Thứ tự
  unit / tiến độ / công thức khóa bài **không đổi** — chỉ đổi nơi đặt bài.
- Thêm 2 điểm biển chỉ-xem-thông tin: **Hoàng Sa** và **Trường Sa**, đặt
  cạnh đúng chữ in trên ảnh nền.
- Các tùy chọn chuyển thành **2 thanh nút hai bên màn hình kiểu game**:
  trái = ngôn ngữ + miền, phải = zoom / đang học / nhiệm vụ / thành tích /
  phần thưởng / cuộc thi.

## File đã tạo / sửa

| File | Thay đổi |
|---|---|
| `src/lib/provinces.ts` | **Mới.** Dữ liệu 34 tỉnh + 2 điểm biển, helper ánh xạ `provinceIndexForUnit` / `unitIndexForProvince` / `provinceForUnit`, nhãn miền. |
| `src/components/world-map.tsx` | **Viết lại.** Thế giới 2200×1279 = đúng tỉ lệ ảnh `vietnam-map-bg.jpg` phủ kín; 34 ghim tỉnh + 2 ghim biển; bảng chi tiết tỉnh (Giới thiệu / Lịch sử / Đặc sản chip / dòng hợp nhất / chip bài học nối MissionPanel / chip gợi ý ngôn ngữ khác); API ref mới. Bỏ vùng tint theo khối lớp, bỏ tranh đảo island-map, bỏ `lands.ts` khỏi bản đồ. |
| `src/app/(tabs)/index.tsx` | Bỏ hàng chip vương quốc trên đầu + 3 nút khối lớp phủ bản đồ + nút nổi "Nhiệm vụ & thành tích" ở góc; thêm **thanh trái** (3 nút ngôn ngữ Tiếng Anh/Nhật/Trung qua KINGDOMS + 3 nút miền Bắc/Trung/Nam gọi `centerOnRegion`) và **thanh phải** (+ To / − Nhỏ / 🎯 Đang học / 📋 Nhiệm vụ mở panel GardenDashboard / ⭐ Thành tích → `/achievements` / 🎁 Phần thưởng → `/rewards` / 🏅 Cuộc thi → `/competitions`), mọi nút có nhãn chữ nhỏ. WorldHeader, ContinueButton (bay tới tỉnh đang học + mở bảng tỉnh), panel GardenDashboard và MissionPanel giữ nguyên. |
| `scripts/test-provinces.mjs` | **Mới** (30 kiểm tra). |
| `scripts/test-worldmap.mjs` | **Viết lại** theo thiết kế mới (56 kiểm tra). |
| `assets/images/vietnam-map-bg.jpg` | Dùng nguyên ảnh đã chuẩn bị sẵn (1800×1047). |

`lands.ts` **giữ nguyên và vẫn được dùng** ở guidebook (`src/app/guidebook/[unitId].tsx`),
màn lesson (`src/app/lesson/[id].tsx`), `mission-panel.tsx` và `land-card.tsx` — chỉ
bản đồ trang chủ là không còn dùng. `land-card.tsx` / `magical-garden-scene.tsx` giữ file như cũ.

## Cách hoạt động

- **Ghim tỉnh theo trạng thái của khóa đang chọn**: học xong = ⭐ xanh lá ·
  đang học = 📍 cam + vòng pulse + heo đứng trên · chưa mở = 🔒 xám ·
  có bài đang chờ = 🚩 xanh biển · tỉnh không có bài ở khóa này = ghim nhỏ 📖
  chỉ xem thông tin. Tên tỉnh hiện dưới ghim khi scale ≥ 0,75, hoặc là tỉnh
  đang học / đang chọn (tránh rối khi zoom xa).
- **Chạm tỉnh** → bảng trượt từ đáy: tên tỉnh + miền, dòng hợp nhất (nếu có),
  Giới thiệu / Lịch sử / Đặc sản (chip), rồi khối bài học của khóa đang chọn
  (tên chủ đề + tiến độ + nút Sổ tay + hàng chip bài học — chạm chip gọi đúng
  callback MissionPanel cũ). Nếu khóa đang chọn không có bài ở tỉnh này: ghi
  chú thân thiện + chip các ngôn ngữ có bài ở tỉnh này (chạm để chuyển khóa,
  bảng tự cập nhật theo khóa mới).
- **Hoàng Sa / Trường Sa**: ghim 🇻🇳 trên biển, bảng chỉ có thông tin
  (Hoàng Sa thuộc TP. Đà Nẵng, Trường Sa thuộc tỉnh Khánh Hòa).
- **Camera**: PanResponder kéo 1 ngón (ngưỡng ~8px) + chụm 2 ngón như cũ,
  kẹp scale 0,35–1,8, bay ~450ms bằng requestAnimationFrame, tắt hoạt họa khi
  reduced-motion. API ref: `centerOnUnit(courseId, unitIndex)`,
  `centerOnProvince(journeyIndex)`, `centerOnRegion("bac"|"trung"|"nam")`
  (bay tới tâm vùng, scale 0,48/0,55/0,62), `zoomIn()`, `zoomOut()`,
  `centerOnCurrent()`. Mở app: camera đặt ngay vào tỉnh đang học (scale 0,9).
  Cụm nút zoom cũ trong world-map đã gỡ — zoom nằm ở thanh phải của trang chủ.

## Tọa độ cuối cùng (x, y trên ảnh nền)

Đã tinh chỉnh bằng phân tích điểm ảnh (mặt nạ đất liền theo màu) + vẽ ghim
lên ảnh kiểm tra trực quan 2 vòng: mọi ghim nằm trên đất liền đúng vùng.

| # | Tỉnh/thành | Miền | x | y | Hợp nhất từ |
|---|---|---|---|---|---|
| 0 | Lai Châu | Bắc | 0.176 | 0.343 | — |
| 1 | Điện Biên | Bắc | 0.115 | 0.396 | — |
| 2 | Sơn La | Bắc | 0.210 | 0.420 | — |
| 3 | Lào Cai | Bắc | 0.685 | 0.148 | Lào Cai + Yên Bái |
| 4 | Tuyên Quang | Bắc | 0.723 | 0.137 | Tuyên Quang + Hà Giang |
| 5 | Cao Bằng | Bắc | 0.859 | 0.181 | — |
| 6 | Lạng Sơn | Bắc | 0.892 | 0.221 | — |
| 7 | Thái Nguyên | Bắc | 0.796 | 0.174 | Thái Nguyên + Bắc Kạn |
| 8 | Phú Thọ | Bắc | 0.690 | 0.180 | Phú Thọ + Hòa Bình + Vĩnh Phúc |
| 9 | Bắc Ninh | Bắc | 0.832 | 0.212 | Bắc Ninh + Bắc Giang |
| 10 | Hà Nội | Bắc | 0.790 | 0.220 | — |
| 11 | Quảng Ninh | Bắc | 0.872 | 0.232 | — |
| 12 | Hải Phòng | Bắc | 0.845 | 0.300 | Hải Phòng + Hải Dương |
| 13 | Hưng Yên | Bắc | 0.840 | 0.250 | Hưng Yên + Thái Bình |
| 14 | Ninh Bình | Bắc | 0.750 | 0.280 | Ninh Bình + Hà Nam + Nam Định |
| 15 | Thanh Hóa | Trung | 0.500 | 0.413 | — |
| 16 | Nghệ An | Trung | 0.495 | 0.470 | — |
| 17 | Hà Tĩnh | Trung | 0.466 | 0.502 | — |
| 18 | Quảng Trị | Trung | 0.460 | 0.555 | Quảng Trị + Quảng Bình |
| 19 | Huế | Trung | 0.505 | 0.598 | — |
| 20 | Đà Nẵng | Trung | 0.735 | 0.512 | Đà Nẵng + Quảng Nam |
| 21 | Quảng Ngãi | Trung | 0.762 | 0.545 | Quảng Ngãi + Kon Tum |
| 22 | Gia Lai | Trung | 0.738 | 0.562 | Gia Lai + Bình Định |
| 23 | Đắk Lắk | Trung | 0.764 | 0.590 | Đắk Lắk + Phú Yên |
| 24 | Khánh Hòa | Trung | 0.786 | 0.612 | Khánh Hòa + Ninh Thuận |
| 25 | Lâm Đồng | Trung | 0.478 | 0.652 | Lâm Đồng + Bình Thuận + Đắk Nông |
| 26 | Đồng Nai | Nam | 0.472 | 0.684 | Đồng Nai + Bình Phước |
| 27 | Tây Ninh | Nam | 0.432 | 0.682 | Tây Ninh + Long An |
| 28 | TP. Hồ Chí Minh | Nam | 0.472 | 0.730 | TP. Hồ Chí Minh + Bình Dương + Bà Rịa – Vũng Tàu |
| 29 | Đồng Tháp | Nam | 0.424 | 0.722 | Đồng Tháp + Tiền Giang |
| 30 | An Giang | Nam | 0.418 | 0.754 | An Giang + Kiên Giang |
| 31 | Vĩnh Long | Nam | 0.450 | 0.746 | Vĩnh Long + Bến Tre + Trà Vinh |
| 32 | Cần Thơ | Nam | 0.429 | 0.776 | Cần Thơ + Hậu Giang + Sóc Trăng |
| 33 | Cà Mau | Nam | 0.417 | 0.802 | Cà Mau + Bạc Liêu |

Điểm biển: Hoàng Sa (0.552, 0.768) — trên cụm đảo nhỏ vẽ sẵn ngay trên chữ
HOÀNG SA in trên ảnh; Trường Sa (0.200, 0.860) — trên cụm đảo cạnh chữ
TRƯỜNG SA.

Lưu ý bản đồ cách điệu: cụm miền Nam và cụm đồng bằng sông Hồng khá chật,
một vài ghim kề nhau (An Giang/Cần Thơ/Cà Mau; Bắc Ninh/Hà Nội/Hưng Yên)
sẽ hơi sát khi zoom tối đa — chấp nhận được vì tên tỉnh chỉ hiện khi zoom
gần và ghim vẫn phân biệt rõ.

## Ánh xạ bài học (tỉnh chứa từng unit)

Công thức: `provinceIndex = round(unitIndex × 33 / (unitCount − 1))`.

### Tiếng Anh (en-vi, 27 unit)
Lai Châu: Con vật · Điện Biên: Màu sắc · Lào Cai: Gia đình · Tuyên Quang: Đồ ăn ·
Cao Bằng: Con số · Lạng Sơn: Trường học · Phú Thọ: Gia đình 2 · Bắc Ninh: Số đếm 2 ·
Hà Nội: Màu sắc 2 · Quảng Ninh: Thức ăn 2 · Hưng Yên: Trường học 2 · Ninh Bình: Cơ thể ·
Thanh Hóa: Quần áo · Hà Tĩnh: Giao thông · Quảng Trị: Thời tiết · Huế: Các thì trong tiếng Anh ·
Đà Nẵng: Câu bị động · Gia Lai: Câu điều kiện · Đắk Lắk: Mệnh đề quan hệ và lời nói gián tiếp ·
Khánh Hòa: Bảo vệ môi trường · Lâm Đồng: Công nghệ và nghề nghiệp · Tây Ninh: Câu điều kiện nâng cao và câu ước ·
TP. Hồ Chí Minh: Mệnh đề quan hệ nâng cao · Đồng Tháp: Câu bị động nâng cao ·
An Giang: Lời nói gián tiếp nâng cao · Cần Thơ: Thế giới quanh ta · Cà Mau: Ôn tập tổng hợp.
(Tỉnh không có bài Anh: Sơn La, Thái Nguyên, Hải Phòng, Nghệ An, Quảng Ngãi, Đồng Nai, Vĩnh Long.)

### Tiếng Nhật (ja-vi, 27 unit)
Lai Châu: Hiragana 1 · Điện Biên: Hiragana 2 · Lào Cai: Hiragana 3 · Tuyên Quang: Katakana 1 ·
Cao Bằng: Từ đầu tiên · Lạng Sơn: Chào hỏi · Phú Thọ: Gia đình · Bắc Ninh: Số đếm ·
Hà Nội: Màu sắc · Quảng Ninh: Thức ăn · Hưng Yên: Trường học · Ninh Bình: Cơ thể ·
Thanh Hóa: Quần áo · Hà Tĩnh: Giao thông · Quảng Trị: Thời tiết · Huế: Kanji cơ bản 1 ·
Đà Nẵng: Kanji cơ bản 2 · Gia Lai: Thể te — nối câu và nhờ vả · Đắk Lắk: Thể ta — quá khứ và kinh nghiệm ·
Khánh Hòa: Thể ý định và mong muốn · Lâm Đồng: Câu điều kiện và mẫu câu N4 ·
Tây Ninh: Kanji N3 cơ bản 1 · TP. Hồ Chí Minh: Kanji N3 cơ bản 2 · Đồng Tháp: Thể bị động ·
An Giang: Thể sai khiến và kính ngữ cơ bản · Cần Thơ: Mẫu câu N3 thường gặp · Cà Mau: Hội thoại và đọc hiểu N3.
(Tỉnh không có bài Nhật: giống hệt danh sách của Anh.)

### Tiếng Trung (zh-vi, 26 unit)
Lai Châu: Con số · Điện Biên: Chào hỏi · Lào Cai: Gia đình · Tuyên Quang: Con vật ·
Cao Bằng: Màu sắc · Thái Nguyên: Gia đình 2 · Phú Thọ: Số đếm 2 · Bắc Ninh: Màu sắc 2 ·
Quảng Ninh: Thức ăn 2 · Hải Phòng: Trường học 2 · Hưng Yên: Cơ thể · Thanh Hóa: Quần áo ·
Nghệ An: Giao thông · Hà Tĩnh: Thời tiết · Quảng Trị: Mua sắm và giá cả · Đà Nẵng: Du lịch và hỏi đường ·
Quảng Ngãi: Sức khỏe và đi khám bệnh · Gia Lai: Học tập và nghề nghiệp ·
Khánh Hòa: Thể thao và sở thích · Lâm Đồng: Môi trường và bảo vệ thiên nhiên ·
Đồng Nai: Công nghệ và internet · TP. Hồ Chí Minh: Văn hóa và lễ hội ·
Đồng Tháp: Thiên nhiên và bảo vệ môi trường nâng cao · An Giang: Học thuật và thi cử ·
Cần Thơ: Xã hội và truyền thông · Cà Mau: Ôn tập tổng hợp HSK.
(Tỉnh không có bài Trung: Sơn La, Lạng Sơn, Hà Nội, Ninh Bình, Huế, Đắk Lắk, Tây Ninh, Vĩnh Long.)

## Kiểm chứng (chạy tại máy, 29/10/2026)

- `node scripts/test-provinces.mjs` — **30/30 PASS** (đủ 34 tỉnh + 2 điểm biển,
  id/tên không trùng, tọa độ trong (0,1), mọi tỉnh có intro/history/≥2 đặc sản,
  cơ cấu miền 15/11/8, 23 mergedFrom + 11 giữ nguyên, ánh xạ cho unitCount
  27 và 26: phân biệt + đơn điệu tăng + phủ Lai Châu & Cà Mau + phép ngược đúng,
  baseline packs 80/314/2488).
- `node scripts/test-worldmap.mjs` — **56/56 PASS**.
- `node scripts/test-garden.mjs` — **14/14 PASS** · `test-rewards` — **9/9 PASS** ·
  `test-ranks` — **12/12 PASS** · `test-competitions` — **20/20 PASS**.
- `npx tsc --noEmit` — **0 lỗi**.
- `npx expo export --platform web` — **PASS**. Kiểm tra bundle `dist` (sau khi
  giải mã escape `\uXXXX`/`\xXX` của Metro): có "Cà Mau" ×8, "Đặc sản" ×1,
  "Lũng Cú" ×1, "Phở Hà Nội" ×1, "Cốm Tú Lệ" ×1, "Trước đây là các tỉnh" ×1,
  "Hoàng Sa" ×7, "Trường Sa" ×7, "Về tỉnh đang học" ×3; HTML prerender trang
  chủ chứa tên tỉnh; ảnh nền có trong dist tại
  `dist/assets/assets/images/vietnam-map-bg.*.jpg`.

## Chưa kiểm chứng được ở máy

- Cảm giác kéo/chụm, độ mượt và vị trí ghim trên thiết bị thật / các cỡ màn
  hình khác nhau; bố cục 2 thanh nút trên màn rất hẹp.
- Nội dung tỉnh do trợ lý soạn từ kiến thức phổ thông nổi tiếng (di sản
  UNESCO, đặc sản trứ danh, sự kiện trong sách giáo khoa) — điều phối/người
  dùng nên đọc lướt 34 thẻ tỉnh một lần trước khi cho bé dùng chính thức.
