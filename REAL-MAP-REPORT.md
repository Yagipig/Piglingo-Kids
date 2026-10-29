# REAL-MAP-REPORT — Bản đồ Việt Nam thật theo ranh giới tỉnh

Đợt thay lớp bản đồ ở trang chủ: từ "tranh Đại Việt + ghim tỉnh theo tọa độ
x/y tương đối" sang **bản đồ Việt Nam thật có ranh giới 34 tỉnh/thành**, tô
màu vui nhộn cho trẻ, có **đường hành trình nối từ Bắc vào Nam**, chạm vào
**chính vùng tỉnh** để chọn và học. Dữ liệu tỉnh/thông tin/ánh xạ bài học
trong `src/lib/provinces.ts` và dữ liệu hình tỉnh trong
`src/lib/province-shapes.ts` (nguồn ranh giới COD-AB 2025) giữ nguyên —
chỉ thay cách vẽ và nguồn vị trí: vị trí tỉnh nay lấy từ `PROVINCE_SHAPES`
(cx/cy), không dùng x/y cũ nữa.

## Thư viện mới

- **react-native-svg 15.15.4** — cài bằng `npx expo install react-native-svg`
  (bản tương thích Expo SDK 56 của project). `package.json` và
  `package-lock.json` đều đã thay đổi và **phải upload cùng đợt này**.

## Danh sách file đã tạo/sửa (để điều phối upload)

Đã sửa:

1. `package.json` — thêm dependency `react-native-svg: 15.15.4`.
2. `package-lock.json` — cập nhật theo lần cài trên (npm báo "added 13 packages").
3. `src/components/world-map.tsx` — viết lại lớp vẽ (chi tiết bên dưới);
   giữ nguyên cơ chế camera PanResponder kéo/chụm + kẹp biên +
   reduced-motion, API ref (`centerOnUnit` / `centerOnProvince` /
   `centerOnRegion` / `zoomIn` / `zoomOut` / `centerOnCurrent`), bảng chi
   tiết tỉnh + chip bài học + callback MissionPanel, và toàn bộ logic
   trạng thái khóa theo `provinces.ts` + store.
4. `scripts/test-worldmap.mjs` — viết lại theo thiết kế mới (thêm kiểm tra
   runtime cho PROVINCE_SHAPES bằng cách biên dịch như test-provinces).

Đã tạo mới:

5. `REAL-MAP-REPORT.md` — báo cáo này.

KHÔNG sửa (giữ nguyên như trước đợt này):

- `src/lib/provinces.ts`, `src/lib/province-shapes.ts` — dữ liệu giữ nguyên.
- `src/app/(tabs)/index.tsx` — API của WorldMap không đổi nên không cần sửa.
- `assets/images/vietnam-map-bg.jpg` — giữ nguyên trong repo, chỉ bỏ import
  khỏi world-map.

## Thiết kế lớp vẽ mới (world-map.tsx)

- **Thế giới 1250 × 2471** đúng tỉ lệ `MAP_VIEWBOX` 1000×1977 (hệ số
  SX = 1,25; SY ≈ 1,2499). Nền biển xanh nhạt `#a8dffd` phủ toàn thế giới.
- **Trang trí biển** bằng emoji Text đặt trong thế giới (zoom cùng bản đồ):
  mặt trời, mây, bạch tuộc, thuyền buồm ×2, sóng ×2, cá voi, cua, cá — đặt ở
  vùng Biển Đông phía phải, vùng biển phía Nam và góc biển phía Tây, đã đối
  chiếu tọa độ để không đè đất liền.
- **Mỗi tỉnh là một Path SVG** từ `PROVINCE_SHAPES`: fill màu kẹo pastel
  luân phiên tất định theo thứ tự hành trình (bảng 8 màu `PROVINCE_COLORS`),
  stroke trắng 3, `strokeLinejoin/Linecap` round. Tỉnh đang chọn: phủ lớp
  trắng 30% + stroke cam đậm `#ff8c1a` width 5. Chạm Path = chọn tỉnh.
- **Đường hành trình**: nối tâm các tỉnh CÓ unit của khóa đang chọn theo
  thứ tự unit — 2 lớp: trắng đặc width 11 (opacity 0,85) ở dưới, chấm tròn
  coral `#ff7b54` width 6 (`strokeDasharray="0.1 15"`, linecap round) ở
  trên, đúng cảm giác đường mòn game.
- **Huy hiệu tròn đánh số thứ tự unit (1..27)** tại tâm tỉnh (lớp RN trên
  SVG, cũng là điểm chạm dự phòng chắc chắn cho mọi tỉnh):
  - đã học xong: nền xanh lá `#58a700` + huy hiệu ⭐ ở góc;
  - đang học: to hơn (68 so với 54), pulse, heo mascot đứng trên;
  - bị khóa: nền xám, số xám đậm + huy hiệu 🔒 ở góc — vẫn bấm xem được;
  - có bài đang chờ (mở khóa toàn bộ): nền xanh trời;
  - tỉnh không có unit ở khóa này: huy hiệu nhỏ 📖 (40) mở thẻ thông tin.
- **Tên tỉnh**: chữ SVG tại tâm tỉnh, 2 lớp (viền trắng + chữ xanh đậm
  `#0c4a6e`, đậm 800). Hiện khi scale ≥ 0,5; riêng 4 tỉnh nhỏ Hà Nội, Bắc
  Ninh, Hưng Yên, Hải Phòng chỉ hiện khi scale ≥ 0,85; tỉnh đang học/đang
  chọn luôn hiện.
- **Hoàng Sa & Trường Sa**: cụm đảo vẽ ngay trong SVG (elip cát `#ffe9a8` +
  điểm xanh lá), kèm tên; bấm vào mở bảng thông tin từ `SEA_POINTS` (không
  dùng x/y cũ). Vị trí viewBox đã tinh chỉnh để nằm gọn trong biển, không
  đè đất liền của dữ liệu hình thật: **Hoàng Sa (835, 985)** — đông bờ biển
  Đà Nẵng; **Trường Sa (938, 1545)** — dịch xuống đông-nam so với gợi ý
  (880, 1400) vì ở (880, 1400) dữ liệu hình Khánh Hòa còn dải đất ven biển
  tới x≈926. Cả hai còn có huy hiệu 🇻🇳 (lớp RN) làm điểm chạm dự phòng.
- **centerOnRegion** dùng điểm neo viewBox: Bắc (500, 300), Trung
  (540, 1080), Nam (430, 1730), nhân SX/SY sang tọa độ thế giới; scale gợi
  ý Bắc 0,5 / Trung 0,55 / Nam 0,65.
- **Mở app**: camera đặt vào tỉnh đang học với scale
  `max(0,55; chiều rộng khung nhìn / 1250)` (không nhỏ hơn mức vừa chiều
  ngang khung nhìn), vẫn kẹp trong 0,35–1,8.
- Lớp SVG được `memo` hoá: khi kéo/zoom, nó chỉ vẽ lại khi mức hiện tên
  (0/1/2) hoặc lựa chọn thay đổi — không vẽ lại theo từng khung hình camera.

Lưu ý dữ liệu hình: một vài tỉnh (Khánh Hòa, Đà Nẵng) còn các sub-path phụ
nằm ngoài khung viewBox trong dữ liệu gốc — khi chiếu sang thế giới chúng
rơi ra ngoài khung Svg nên tự bị cắt, không hiển thị và không chắn chạm.
Mảnh đảo nhỏ của TP. Hồ Chí Minh ở (~568–579, 1924–1939) viewBox (vùng Côn
Đảo) hiển thị thành đảo nhỏ phía Nam và chạm vào vẫn chọn đúng TP. Hồ Chí
Minh.

## Kiểm chứng (tất cả PASS)

- `scripts/test-worldmap.mjs`: **75/75 PASS** — gồm kiểm tra runtime:
  PROVINCE_SHAPES đủ 34 mục, mọi id tỉnh trong provinces.ts đều có hình,
  d bắt đầu "M", cx/cy nằm trong viewBox 1000×1977.
- `scripts/test-provinces.mjs`: **30/30 PASS** — gồm baseline packs giữ
  nguyên **80 unit / 314 bài / 2488 câu**.
- `scripts/test-garden.mjs`: **14/14 PASS**.
- `scripts/test-rewards.mjs`: **9/9 PASS**.
- `scripts/test-ranks.mjs`: **12/12 PASS**.
- `scripts/test-competitions.mjs`: **20/20 PASS**.
- `npx tsc --noEmit`: **0 lỗi**.
- `npx expo export --platform web`: **PASS** — `dist/index.html` và
  `dist/(tabs)/index.html` prerender được và chứa "Cà Mau" (6 lượt, tên các
  tỉnh hiện trong HTML nhờ nhãn SVG); bundle JS chứa dữ liệu đường tỉnh
  (ví dụ mở đầu path An Giang "M308.4 1715.4"), màu đường hành trình
  `#ff7b54`, màu biển `#a8dffd` và hằng số viewBox 1977.

## Chưa kiểm chứng được ở máy

- Thao tác chạm trực tiếp lên Path SVG trên thiết bị thật/trình duyệt thật
  (ở máy chỉ kiểm chứng tĩnh + biên dịch). Đã có điểm chạm dự phòng: huy
  hiệu tại tâm mọi tỉnh và huy hiệu 🇻🇳 tại 2 cụm đảo đều là Pressable RN
  gọi đúng cùng hành động chọn.
- Cảm giác kéo/chụm và bố cục trên màn hẹp/dark mode — như các đợt trước,
  cần thử trên thiết bị thật sau khi live.

**Không upload GitHub trong đợt làm này** — chờ điều phối đẩy cùng
package.json + package-lock.json.
