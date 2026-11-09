# REDESIGN — BÁO CÁO PHASE 3: Home dashboard + Chọn thế giới + Bản đồ đường đi

- Ngày thực hiện: 09/11/2026
- Phạm vi: đúng mục Phase 3 trong `REDESIGN-AUDIT.md` + brief Phase 3 (3 màn hình: Home dashboard, Chọn thế giới, Bản đồ đường đi). Dùng token/component Phase 2 và helper cấp độ Phase 2 nguyên trạng. Không đổi schema store, quy tắc XP (15+5), dữ liệu bài học, route tab, logic đồng bộ/auth. KHÔNG upload GitHub.

## 0. Quyết định kỹ thuật chính (ghi rõ theo brief)

1. **Tên biển chặng**: lấy **tên unit của bài đầu chặng** — dữ liệu thật 100% từ pack (biển hiện dạng "Chặng N · {tên unit}" + dải "Bài X–Y trong toàn khóa"). Không bịa tên chặng mới.
2. **Chặng**: 6 bài liên tiếp theo `globalIndex` (`STAGE_SIZE = 6`). Anh 108 bài → 18 chặng đầy; Nhật/Trung 103 bài → 17 chặng đầy + chặng cuối 1 bài (tổng 18 chặng).
3. **Rương kho báu**: trạng thái suy THUẦN từ `completedLessons` (xong hết chặng mới mở). Bấm rương đã mở → route `/celebration` sẵn có với param mới `stage` — màn celebration được **thêm một nhánh hiển thị riêng cho rương chặng** (sao ⭐⭐⭐ + XP của chặng tính theo đúng quy tắc thật: 15 XP/bài, ghi rõ bài hoàn hảo còn +5; tổng XP vương quốc lấy từ store). Nhánh này **không cộng XP mới, không gắn phần thưởng gia đình**, và luồng celebration cũ (mốc 100% khóa) không đổi một hành vi nào khi không có param `stage`.
4. **Chạm checkpoint**: bài hiện tại / đã xong / đã mở khóa toàn bộ → vào thẳng `/lesson/[id]` (bài đã xong = ôn lại, đúng hành vi cũ qua MissionPanel). Bài khóa: không điều hướng. *Khác audit ở một điểm*: audit gợi ý mở lại MissionPanel khi chạm checkpoint; brief Phase 3 chốt "bấm vào học" nên Phase 3 đi thẳng vào bài — MissionPanel vẫn được giữ nguyên trong repo (world-map cũ dùng) và có thể nối lại ở Phase 4 nếu muốn. Đổi lại, lối vào Sổ tay (guidebook) từ trang chủ cũ không còn — guidebook vốn vẫn mở được từ các đường khác trong app; ghi nhận để Phase 4 cân nhắc nối từ bản đồ.
5. **Điều hướng bản đồ**: route riêng `/map/[courseId]` (fullScreenModal, đăng ký trong `_layout.tsx`) mở từ thẻ vương quốc ở Home, từ màn `/courses`, và chuyển vương quốc ngay trong đầu trang bản đồ (đồng thời `setActiveCourse`). Tab Học giữ nguyên là dashboard.
6. **Home bỏ**: WorldMap + 2 thanh nút hai bên + panel trượt GardenDashboard + WorldHeader + thẻ gợi ý cấp độ (điểm bắt đầu theo cấp độ nay chính là bài Tiếp tục học/biên trên bản đồ — thẻ gợi ý thành thừa; chân trang dashboard có dòng nhắc đổi cấp độ ở tab Hồ sơ). Các file cũ (`world-map.tsx`, `garden-dashboard.tsx`, `world-header.tsx`, `magical-garden-scene.tsx`, `land-card.tsx`, `mission-panel.tsx`, `provinces.ts`, `province-shapes.ts`) **giữ nguyên trong repo, chỉ ngừng import ở trang chủ** — đúng tiền lệ và yêu cầu của brief.

## 1. File đã tạo

| File | Nội dung |
|---|---|
| `src/lib/adventure.ts` | Logic thuần của bản đồ đường đi (test được bằng Node): `buildStages` (chặng 6 bài, tên = unit của bài đầu chặng), `stageCompletedCount` / `isStageComplete` / `chestStateForStage` (rương suy từ completedLessons), `checkpointState` (ủy quyền `isLockedAtFrontier` của Phase 2), hình học tất định: `checkpointCenterX` (sóng sin theo globalIndex, biên độ co theo bề rộng), `buildPathD` (Catmull-Rom → Bezier), `buildAdventureLayout` (điểm/biển/rương/đường cho cả khóa; y tăng đơn điệu) |
| `src/components/adventure-map.tsx` | Component bản đồ: ScrollView dọc; 1 SVG tĩnh (đường nền trắng + đoạn đã đi tô màu vương quốc tới biên hiệu lực + đường chấm giữa); checkpoint là Pressable nhẹ định vị tuyệt đối (React.memo), hiện **số bài toàn cục** cả trong vòng (bài đang học/mở) và nhãn "Bài X/Tổng" ở dưới; trạng thái: xong = ✓ màu vương quốc / hiện tại = pulse + heo mascot đứng trên / mở (unlockedAll) = vòng trắng viền vương quốc / khóa = 🔒 xám; biển chặng + rương cuối chặng (mở = 🎁 "Mở rương!", chưa = 📦 + 🔒); họa tiết vương quốc rải tất định dọc đường; tự cuộn tới checkpoint hiện tại khi mở (1 lần/khóa). Vùng chạm checkpoint 84×116, rương 96×96 (≥48px) |
| `src/app/map/[courseId].tsx` | Màn bản đồ: nút quay lại 48px, tiêu đề vương quốc + "Đã xong X/Tổng bài", hàng chip 3 vương quốc để chuyển bản đồ (kèm setActiveCourse), thân là `AdventureMap`. courseId lạ → rơi về `en-vi` |
| `scripts/test-adventure-map.mjs` | Test mới — 19 nhóm (xem mục 4) |

## 2. File đã sửa

| File | Thay đổi |
|---|---|
| `src/app/(tabs)/index.tsx` | **Viết lại phần trình bày thành Home dashboard** (chi tiết mục 3.1). Mọi quyết định khóa/đích Tiếp tục học vẫn dùng `effectiveFrontierIndex` của Phase 2 |
| `src/app/courses.tsx` | Restyle tại chỗ thành màn Chọn thế giới (mục 3.2): thẻ vương quốc lớn, XP riêng từng khóa, nút Vào bản đồ → `/map/[courseId]`. Bỏ `exitScreen` (điều hướng cũ về tab) vì đích mới là bản đồ |
| `src/app/celebration.tsx` | Thêm nhánh rương chặng (mục 0.3): đọc param `stage`, dựng model từ `buildStages` + tiến độ thật; chỉ render khác khi có param hợp lệ |
| `src/app/_layout.tsx` | Đăng ký `Stack.Screen name="map/[courseId]"` (fullScreenModal) |
| `scripts/test-worldmap.mjs` | Cập nhật khối check về `index.tsx` + mô tả đầu file: bỏ các khẳng định về trang chủ cũ (WorldMap/2 thanh nút/MissionPanel ở trang chủ — điều Phase 3 chủ đích thay đổi) và thay bằng khẳng định về dashboard mới (không import world-map, có ContinueButton/Nhiệm vụ hôm nay/rankForXp, mục Vương quốc + lối tắt 3 route). Mọi check về **dữ liệu tỉnh, province-shapes và world-map.tsx giữ nguyên 100%** (tổng check 84 → 76 do khối trang chủ viết gọn lại, không mất check dữ liệu nào) |
| `scripts/test-competitions.mjs` | 1 khẳng định đổi wiring: từ `onOpenCompetitions={() => router.push("/competitions")}` (qua GardenDashboard trong panel cũ) sang lối tắt trực tiếp `router.push("/competitions")` trên Home dashboard — ý định "từ trang chủ vào được Cuộc thi" giữ nguyên, có comment ghi rõ lý do trong file test |

## 3. Ba màn hình concept được hiện thực thế nào

### 3.1. Home dashboard (tab Học)
- **Thẻ chào**: heo mascot (`assets/images/mascot-avatar.png`) + lời chào + **tên bậc hiện tại** từ `ranks.ts` (`rankForXp` trên tổng XP) + dòng "Còn X XP nữa là lên {bậc kế}" + thanh tiến độ lên bậc; nút bật/tắt nhạc nền giữ lại ở góc thẻ (chức năng cũ của WorldHeader).
- **Hàng StatChip**: ⭐ Tổng XP (tổng 3 khóa, `totalGardenXp`) · 🔥/🌙 số ngày streak (`currentStreak`, lửa cháy khi `activeToday`) · {emoji bậc} "Bậc N".
- **Thẻ Tiếp tục học nổi bật** (viền màu vương quốc đang học): tái dùng `ContinueButton` của Phase 2 — đích là **bài ở biên hiệu lực**, dòng gợi ý hiện **"Bài X/Tổng" toàn cục** + tên unit; bấm nút **vào thẳng bài đó** (`/lesson/[id]`); học hết khóa → "Ôn lại từ đầu" vào bài 1.
- **Thẻ Nhiệm vụ hôm nay**: từ `dailyQuests()` thật của store (mục tiêu XP ngày / 3 bài / 1 bài hoàn hảo) — mỗi nhiệm vụ có ProgressBar + số đếm, xong thì ✓ xanh.
- **Mục "Vương quốc ngôn ngữ"**: 3 thẻ (màu `kingdomColorTokens`) — thú đồng hành, tên vương quốc thuần Việt, **XP RIÊNG TỪNG KHÓA** (`courses[courseId].xp`, ghi nhãn rõ "XP của vương quốc"), "Đã học X/Tổng bài" + ProgressBar; thẻ khóa đang học có nền mềm + huy hiệu "Đang học"; bấm thẻ (hoặc pill "🗺️ Bản đồ") → đặt activeCourse + mở `/map/[courseId]`. Đầu mục có lối "Chọn thế giới ›" sang `/courses`.
- **Lối tắt** giữ truy cập được như yêu cầu: 🏅 Cuộc thi `/competitions`, 🎁 Phần thưởng `/rewards`, ⭐ Thành tích `/achievements` — 3 thẻ bấm ≥76px.
- Bản đồ tỉnh **không còn render** ở trang chủ (dữ liệu + component giữ trong repo).

### 3.2. Chọn thế giới (`/courses`)
- 3 thẻ vương quốc lớn: ảnh cổng vương quốc + cờ + tên vương quốc + ngôn ngữ + tagline + bạn đồng hành; **StatChip ⭐ XP vương quốc (riêng khóa)** và **📚 số bài đã học/tổng**; ProgressBar % theo màu vương quốc; nút **"🗺️ Vào bản đồ"** phủ đáy thẻ. Thẻ khóa đang học: viền đậm + nền mềm + huy hiệu "Đang học". Chọn vương quốc = `setActiveCourse` + mở `/map/[courseId]` của chính nó.

### 3.3. Bản đồ đường đi (`/map/[courseId]` + `adventure-map.tsx`)
- Đúng thiết kế audit mục 5: ScrollView dọc, đường SVG uốn lượn **tất định** (sin theo globalIndex — cùng bài luôn cùng vị trí, không random), checkpoint = **từng bài học** (Anh 108, Nhật/Trung 103) hiện số bài toàn cục, **chặng 6 bài**, biển tên chặng = tên unit bài đầu chặng + dải số bài, **rương cuối mỗi chặng**.
- Trạng thái checkpoint dùng helper Phase 2 qua `checkpointState`: xong ✓ / hiện tại (đúng biên hiệu lực — pulse + heo đứng trên, bấm vào học) / mở khi unlockedAll / khóa 🔒.
- Đoạn đường từ bài 1 tới biên hiệu lực được tô màu vương quốc (thấy ngay đã đi tới đâu); vào màn hình **tự cuộn tới checkpoint hiện tại**.
- Đầu trang: nút quay lại + chuyển 3 vương quốc (chip ≥48px).
- Hiệu năng (theo audit, chưa đo máy thật — để Phase 5): checkpoint là View/Pressable nhẹ + React.memo, chỉ checkpoint hiện tại chạy animation pulse, SVG là 3 path tĩnh cho cả khóa (~108 điểm); **chưa** làm render theo cửa sổ — tổng chiều cao bản đồ Anh ≈ 13.900px, ~190 node tuyệt đối; audit đã ghi đây là rủi ro cần đo ở Phase 5 và có phương án dự phòng render theo cửa sổ nếu cuộn giật. Bề rộng đường đi tính theo bề rộng cột thật (≤480 qua PhoneFrame), hình học kiểm chứng ở 320/360/480px: vòng 64px không tràn ngang.

## 4. Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `node scripts/test-adventure-map.mjs` (mới) | **PASS 19/19 nhóm**: chặng hoá 108 (18 chặng đầy) và 103 (17 đầy + cuối 1 bài) + tên biển = unit bài đầu chặng; rương suy đúng (trống→đóng hết; xong 1 chặng→chỉ rương đó mở; thiếu 1 bài→đóng, đếm 5/6; bài ngoài chặng không tính; xong toàn khóa→mở hết); checkpoint khớp helper Phase 2 cho 3 cấp độ trên tiến độ trống (**bài hiện tại = 0/44/81** với Anh, đúng 1 bài current, bài 43 khóa ở da-biet); bài đã xong không khóa lại ở mọi cấp độ; unlockedAll → 0 bài khóa; hình học tất định (2 lần dựng deep-equal), x trong cột ở 320/360/480, y tăng đơn điệu, đủ 18 biển + 18 rương, pathD hợp lệ; baseline |
| `node scripts/test-garden.mjs` | PASS 14/14 nhóm (không sửa) |
| `node scripts/test-rewards.mjs` | PASS 9/9 nhóm (không sửa) |
| `node scripts/test-ranks.mjs` | PASS 12/12 nhóm (không sửa) |
| `node scripts/test-competitions.mjs` | PASS 20/20 (1 khẳng định đổi wiring — mục 2) |
| `node scripts/test-provinces.mjs` | PASS 30/30 (không sửa — dữ liệu tỉnh giữ nguyên như yêu cầu) |
| `node scripts/test-worldmap.mjs` | PASS 76/76 (khối trang chủ viết lại theo dashboard mới — mục 2; toàn bộ check dữ liệu tỉnh/world-map giữ nguyên) |
| `node scripts/test-level-floor.mjs` | PASS 11/11 nhóm (không sửa) |
| Baseline nội dung | Giữ nguyên **80 unit / 314 bài / 2488 exercise** (khẳng định trong test-adventure-map + các test cũ) |
| `npx tsc --noEmit` | **0 lỗi** (kiểm cả trước và sau khi export — thứ tự nào cũng sạch) |
| `npx expo export --platform web` | **PASS** — route `/map/[courseId]` xuất hiện trong bản dựng (`dist/map/[courseId].html`) |

Chưa kiểm chứng trên thiết bị thật (theo quy trình: chờ bản preview của nhánh PR ở cổng duyệt Phase 3): độ mượt cuộn bản đồ ~13.900px trên điện thoại yếu, deep-link trực tiếp vào `/map/...` trên GitHub Pages (rủi ro "Unmatched Route" đã biết với route ngoài tab — mở từ trong app thì bình thường), cảm giác chạm checkpoint khi cuộn nhanh.

## 5. Người dùng sẽ thấy gì (luồng thực tế)

1. **Mở app** → tab Học là dashboard: heo Piglingo chào kèm cấp bậc hiện tại (ví dụ "🧭 Hoa Tiêu Nhí — còn 120 XP nữa là lên Thuyền Phó Tương Lai"), 3 chip chỉ số (Tổng XP · ngày liên tiếp · Bậc), thẻ **Tiếp tục học** ghi rõ "Điểm đến tiếp theo: {unit} — Bài 45/108", thẻ Nhiệm vụ hôm nay với 3 thanh tiến độ, rồi 3 thẻ vương quốc.
2. **Bấm "Tiếp tục học"** → vào thẳng bài ở biên hiệu lực (điểm bắt đầu đã gồm sàn cấp độ: bé chọn "Đã biết cơ bản" thì đó là Bài 45) — học xong quay về, vị trí tiến tiếp bài 46, không kéo ngược.
3. **Bấm một thẻ vương quốc** (ví dụ Vương quốc Hoa Anh Đào) → bản đồ đường đi của riêng vương quốc đó mở ra và **tự cuộn tới bài đang học**: đường uốn lượn với các vòng số bài toàn cục — vòng xanh ✓ là bài đã xong, vòng đang nhấp nháy có heo đứng trên là bài hiện tại, vòng xám 🔒 là bài chưa tới; đầu mỗi chặng có biển "Chặng N · {tên chủ đề} — Bài X–Y", cuối chặng có rương.
4. **Học xong bài cuối của một chặng** → rương cuối chặng đó chuyển sang 🎁 "Mở rương!"; **bấm vào rương** → màn ăn mừng pháo giấy: "Con đã mở rương Chặng N!" với ⭐⭐⭐, số XP chặng mang về (15 XP/bài, bài hoàn hảo +5) và tổng XP của vương quốc — chỉ là ăn mừng hiển thị, không cộng thêm điểm, phần thưởng thật của ba/mẹ vẫn ở mục Phần thưởng.
5. **Đổi ngôn ngữ**: từ đầu trang bản đồ bấm chip vương quốc khác (bản đồ vẽ lại theo màu/motif vương quốc đó, tiến độ riêng của khóa đó), hoặc về Home bấm thẻ vương quốc khác, hoặc "Chọn thế giới" để xem thẻ lớn kèm XP/tiến độ rồi vào bản đồ.
6. **Cuộc thi / Phần thưởng / Thành tích** vẫn vào được ngay từ hàng lối tắt cuối dashboard như trước.
