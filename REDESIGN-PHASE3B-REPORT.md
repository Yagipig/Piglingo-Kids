# REDESIGN — BÁO CÁO ĐỢT A (bổ sung Phase 3): Ảnh cá nhân + Restyle bản đồ phong cách tranh + Heo nhảy lò cò & thú đi theo

- Ngày thực hiện: 09/11/2026
- Phạm vi: 3 việc theo đặt hàng của người dùng sau khi xem preview Phase 3 — (1) thay ảnh heo ở điểm dừng bằng ảnh cá nhân đặt trong Hồ sơ; (2) restyle bản đồ đường đi theo phong cách tranh phiêu lưu (ảnh mẫu Behance chỉ là tham chiếu phong cách — TUYỆT ĐỐI không dùng lại tranh/file ngoài, mọi thứ vẽ bằng SVG/emoji của app); (3) heo nhảy lò cò tới điểm mới kèm thú cưng đi theo. Quà chặng (Đợt B) và hệ thú cưng đầy đủ (Đợt C) KHÔNG nằm trong đợt này.
- Bất biến giữ nguyên: baseline 80 unit / 314 bài / 2488 exercise, XP 15+5, helper khóa Phase 2 (`effectiveFrontierIndex`/`isLockedAtFrontier` qua `checkpointState`), toàn bộ route hiện có. KHÔNG upload GitHub.

## 1. File đã sửa / tạo

| File | Thay đổi |
|---|---|
| `src/lib/store.ts` | Thêm field `avatarImage: string \| null` (data URL, cùng khuôn `backgroundImage`) + action `setAvatarImage` (chỉ gán đúng field này). Initial state `null`. Migrate điền `avatarImage ?? null` ở **cả hai nhánh** (có `courses` và legacy v1) để dữ liệu cũ không có field vẫn chạy; mọi code đọc dùng `progress.avatarImage ?? null` chịu được `undefined` |
| `src/app/(tabs)/profile.tsx` | Mục mới **"🧒 Ảnh của bé"** đặt ngay trước mục Ảnh nền: xem trước hình tròn 96px viền hổ phách khi đã có ảnh (chưa có thì hiện câu hướng dẫn), nút "Chọn ảnh từ thư viện" dùng **chung luồng `pickBackgroundImage()`** với ảnh nền (cùng xử lý quyền/thu nhỏ/giới hạn dung lượng), nút "Xóa ảnh, dùng heo mặc định", thông báo kết quả thuần Việt theo đúng khuôn mục ảnh nền |
| `src/app/(tabs)/index.tsx` | Thẻ chào trang chủ: hiện **avatar tròn 48px** (viền hổ phách, chồng nhẹ lên cạnh heo mascot) khi bé đã đặt ảnh; chưa đặt thì giao diện y như cũ |
| `src/lib/adventure.ts` | Thêm hàm thuần tất định cho trang trí: `buildStageIslands` (đảo ellipse neo điểm giữa chặng, bán kính biến thiên sin theo chỉ số chặng), `buildClouds` (mây theo quãng ~430px), `buildStageDecorations` + `STAGE_DECORATION_EMOJIS` (🎈 ⛵ 🌴 🦋 🐚 xoay vòng theo chặng, đặt phía trống đối diện đường đi). `AdventureLayout` thêm `islands`/`clouds`/`decorations`. Thêm `planHop(seen, frontier, total)` — hàm thuần quyết định cú nhảy từ mốc đã xem + biên hiệu lực |
| `src/components/adventure-map.tsx` | Restyle toàn cảnh (mục 2) + component mới `Traveler` (mục 3) + mốc AsyncStorage `adventure-seen-frontier:<courseId>`; checkpoint đã xong thêm 👑; rương to hơn (vòng 62→72px, emoji 30→36) |
| `scripts/test-adventure-map.mjs` | Thêm 7 nhóm check Đợt A (trang trí tất định + `planHop` đủ ca) — tổng 19 → 26 nhóm |
| `scripts/test-companion.mjs` | **Mới** — 9 nhóm kiểm tĩnh cho `avatarImage`/mốc nhảy/thú đi theo (mục 4) |

## 2. Restyle bản đồ theo phong cách tranh phiêu lưu (VIỆC 2)

- **Nền biển nhiều lớp**: một SVG phủ toàn chiều cao bản đồ — hình chữ nhật fill gradient dọc từ `gamePalette` (trời `#7dd3fc` → biển `#38bdf8` → biển sâu `#0284c7`; bản tối tự đổi theo `useGamePalette`), thay nền phẳng `tokens.soft` trước đây (nền chờ tải cũng đổi sang màu biển).
- **Đảo dưới mỗi cụm chặng**: mỗi chặng một đảo gồm 3 ellipse SVG chồng nhau — bọt trắng mờ (phác bờ), cát (`palette.sand`), cỏ (`palette.grass`) — neo ở điểm giữa chặng, kích thước biến thiên tất định để các đảo không rập khuôn. Ellipse được phép tràn mép cột (SVG tự cắt) đúng kiểu đảo bị cắt bởi khung tranh.
- **Mây trắng mềm**: nhóm 3 ellipse trắng mờ rải theo quãng dọc bản đồ, vị trí/cỡ tất định.
- **Vật trang trí**: mỗi chặng 1 emoji trong chuỗi 🎈 ⛵ 🌴 🦋 🐚 đặt lệch về phía trống đối diện đường uốn, không che checkpoint (thay hệ họa tiết nhỏ theo từng bài trước đây).
- **Đường đi hai tông dày hơn**: viền cát 23px bao ngoài + lõi xanh trời nhạt `#bae6fd` 13px cho đoạn chưa đi (đậm/rõ hơn bản cũ); đoạn đã đi phủ lõi màu vương quốc 13px; giữ đường chấm trắng ở giữa.
- **Checkpoint đã xong thêm 👑** phía trên vòng tròn (đúng chi tiết ảnh mẫu); chuẩn hiển thị "Bài X/Tổng" toàn cục của Phase 3 giữ nguyên ở mọi checkpoint.
- Biển chặng giữ nguyên chức năng/nội dung; rương giữ nguyên logic mở theo `completedLessons`, chỉ tăng cỡ vòng + emoji cho nổi bật.

## 3. Heo nhảy lò cò + thú đi theo (VIỆC 3) & ảnh cá nhân trên bản đồ (VIỆC 1a)

- **Marker mới do `<Traveler>` vẽ đè** (checkpoint "hiện tại" không còn vẽ heo tĩnh): vòng tròn 46px viền màu vương quốc — có `avatarImage` thì hiện **ảnh của bé** (cover), chưa có thì hiện heo mascot; nhãn trợ năng đổi theo ("Ảnh của bé đang ở Bài N" / "Heo Piglingo đang ở Bài N"). Trang chủ cũng hiện avatar tròn cạnh heo khi đã đặt.
- **Thú đi theo** = `kingdom.companion` của vương quốc đang xem (Cổ Tích 🦉 / Hoa Anh Đào 🦊 / Đèn Lồng 🐼), bong bóng tròn 36px đứng lệch sau-phải và thấp hơn marker chính; **mặc định không phụ kiện** (trang phục thuộc Đợt C).
- **Cơ chế mốc**: biên hiệu lực đã xem lưu bằng AsyncStorage trực tiếp trong màn bản đồ với khóa `adventure-seen-frontier:<courseId>` — KHÔNG thêm field vào store (đây là trạng thái xem, không phải tiến độ học). Quyết định nhảy do hàm thuần `planHop` (đã test): chưa từng mở → đứng yên + lưu mốc; biên **tiến** → nhảy từ điểm mốc tới điểm hiện tại; biên bằng → đứng yên; biên **lùi** (hạ cấp độ) → không nhảy ngược, chỉ lùi mốc.
- **Cú nhảy**: Animated thuần của React Native (không thêm thư viện) — nội suy qua các điểm dừng giữa mốc và đích, mỗi bước chèn điểm giữa nhấc −30px thành vòng cung nảy lò cò; thời lượng `420 + 110ms/bước`, kẹp trong 520–1100ms (~1 giây), trễ xuất phát 380ms để camera cuộn tới điểm xuất phát trước. **Thú nhảy nối đuôi**: cùng quỹ đạo nhưng trễ hơn 150ms. Phiên nhảy được "đông cứng" điểm đầu/đích (state `hopSession`) để việc cập nhật mốc giữa chừng không cắt ngang animation.
- **Bỏ qua & tương tác**: chạm vào bất cứ đâu trên bản đồ (`onTouchStart` của ScrollView → hàm skip đã đăng ký) là heo + thú về thẳng đích; đứng yên thì chạm vào marker là cả hai nảy nhẹ một cái (thú nảy nối đuôi 110ms).
- **Luồng học xong quay lại**: học xong bài → biên tiến → dù màn bản đồ còn mounted bên dưới hay mở lại từ đầu, `planHop` đều thấy mốc cũ < biên mới nên cú nhảy diễn ra; xong cú nhảy (hoặc bị bỏ qua) thì mốc mới đã lưu, lần mở sau đứng yên.

## 4. Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `node scripts/test-adventure-map.mjs` | **PASS 26/26 nhóm** (19 cũ nguyên trạng + 7 mới: mỗi chặng đúng 1 đảo/1 vật trang trí và emoji xoay vòng đúng chuỗi; mây trong biên cột/cỡ; đảo/mây/trang trí dựng 2 lần deep-equal ở 320px + 480px; `planHop`: seen=null đứng yên, biên tiến nhảy đúng from/to kể cả nhảy nhiều bước và học xong toàn khóa (đích hiển thị kẹp ở bài cuối, mốc thô = total), biên bằng đứng yên, hạ cấp độ không nhảy ngược + mốc lùi theo, khóa rỗng không crash) |
| `node scripts/test-companion.mjs` (mới) | **PASS 9/9 nhóm** — kiểm tĩnh theo khuôn test-level-floor/test-worldmap: store khai báo `avatarImage: string \| null`, khởi tạo `null`, thân `setAvatarImage` chỉ gán `avatarImage`, migrate có đúng 2 chỗ điền `?? null`; profile có mục "Ảnh của bé" nối đúng `pickBackgroundImage` + `setAvatarImage` + xóa về null + đọc `?? null`; adventure-map dùng avatarImage cho marker (rẽ nhánh ảnh/heo), mốc qua AsyncStorage theo courseId + `planHop`, và store KHÔNG chứa field mốc; thú lấy từ `kingdom.companion`; trang chủ render avatar |
| `node scripts/test-garden.mjs` | PASS 14/14 (không sửa) |
| `node scripts/test-rewards.mjs` | PASS 9/9 (không sửa) |
| `node scripts/test-ranks.mjs` | PASS 12/12 (không sửa) |
| `node scripts/test-competitions.mjs` | PASS 20/20 (không sửa) |
| `node scripts/test-provinces.mjs` | PASS 30/30 (không sửa) |
| `node scripts/test-worldmap.mjs` | PASS 76/76 (không sửa) |
| `node scripts/test-level-floor.mjs` | PASS 11/11 (không sửa — thân `setLearnerLevel` giữ nguyên nên khẳng định tĩnh về store vẫn đúng) |
| Baseline nội dung | Giữ nguyên **80 unit / 314 bài / 2488 exercise** (khẳng định trong test-adventure-map + các test cũ đều đạt) |
| `npx tsc --noEmit` | **0 lỗi** (kiểm cả trước và sau khi export) |
| `npx expo export --platform web` | **PASS** — route `/map/[courseId]` có trong bản dựng (`dist/map/[courseId].html`) |

Chưa kiểm chứng trên thiết bị thật (chờ bản preview ở bước ngoài như các đợt trước): cảm giác mượt của cú nhảy trên máy yếu, việc ảnh cá nhân dung lượng lớn trong AsyncStorage khi persist (đã có giới hạn cứng 4 triệu ký tự từ luồng chọn ảnh dùng chung), và hiển thị đảo/mây trên màn rất hẹp ngoài các mốc 320/360/480 đã test hình học.

## 5. Người dùng sẽ thấy gì

1. **Đặt ảnh của bé**: vào tab Hồ sơ → mục "🧒 Ảnh của bé" → "Chọn ảnh từ thư viện" → ảnh hiện tròn ngay trong mục để xem trước; muốn đổi thì chọn lại, muốn bỏ thì "Xóa ảnh, dùng heo mặc định".
2. **Trang chủ**: cạnh heo PigLingo ở thẻ chào xuất hiện thêm vòng tròn ảnh của bé (chưa đặt ảnh thì trang chủ y như cũ).
3. **Mở bản đồ đường đi**: cả vùng biển đổi hẳn diện mạo — nền biển xanh nhiều lớp, dưới mỗi chặng là một đảo cát viền cỏ, mây trắng trôi rải rác, khinh khí cầu/thuyền buồm/cây dừa/bướm/vỏ sò điểm xuyết bên đường; đường đi dày, viền cát, đoạn đã đi mang màu vương quốc; bài đã xong có 👑 trên đầu; rương cuối chặng to và rõ hơn.
4. **Ở điểm đang học**: thay vì heo đứng yên, bé thấy **ảnh của mình** (hoặc heo nếu chưa đặt ảnh) trong vòng tròn viền màu vương quốc, bên cạnh là **thú của vương quốc** (🦉/🦊/🐼) đi theo — chạm vào là cả hai nảy lên vui vẻ.
5. **Học xong một bài rồi quay lại bản đồ**: heo/ảnh bé cùng thú cưng **nhảy lò cò từng bước** từ điểm cũ tới điểm mới trong khoảng một giây (thú nhảy nối đuôi phía sau); đang nhảy mà chạm vào bản đồ thì cả hai về thẳng điểm mới. Hạ cấp độ thì vị trí lùi về điểm bắt đầu mới một cách lặng lẽ, không nhảy ngược.
