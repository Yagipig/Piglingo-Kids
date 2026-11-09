# SPIN-REPORT — Vòng quay may mắn + Kho báu + Admin vòng quay

Đợt triển khai theo spec người dùng chốt 16:02 ngày 09/11/2026: bé hoàn
thành bài học → nhận lượt quay → quay vòng → quà vào **Kho báu**. Tái
dùng toàn bộ khuôn sẵn có của hệ phần thưởng (app_config + RLS admin,
cache/nháp trong rewardsStore, khuôn `givenAt` xác nhận đã trao, khuôn
đồng bộ owner-only của family rewards) — không chế cơ chế mới.

## Luồng hoạt động

1. **Cấp vé** (`completeLesson` trong store, qua hàm thuần
   `ticketsForCompletion`): chỉ khi bé hoàn thành **MỚI** một bài thật
   (học lại bài cũ / bài ôn `mistakes`/`srs` không sinh vé):
   - Bài thường → 1 vé **Dễ** 🟢
   - Bài hoàn hảo (không sai câu nào) → 1 vé **Trung bình** 🟡
   - Bài này làm một **chặng** thành hoàn thành (so số chặng xong
     trước/sau bằng `completedStageCount`, cùng hàm của hệ thú cưng)
     → thêm 1 vé **Khó** 🔴
   - Vé lưu trong store `spinTickets {easy, medium, hard}` — quay ngay
     ở màn kết quả bài học (nút "🎡 Quay vòng may mắn" nổi bật khi có
     vé) hoặc để dành quay sau ở trang Vòng quay/Kho báu.
   - XP bài học giữ nguyên 15/+5; claim rương chặng không đổi.
2. **Quay**: trang Vòng quay dựng vòng SVG chỉ từ quà **hợp lệ** của
   tầng; kết quả được chọn TRƯỚC bằng hàm trọng số thuần
   `pickWeighted` (RNG bơm từ ngoài — test gieo hạt được), animation
   (RN `Animated`, 3,2 giây) chỉ trình diễn tới đúng ô đã chọn.
3. **Nhận quà** (`applySpinWin` trong store): trừ 1 vé → áp quà:
   - `xp` cộng đúng sổ sách của `addBonusXp` (XP khóa + XP ngày).
   - `stars` cộng vào **bộ đếm sao sẵn có** của store ("xu" chính là
     sao — chốt người dùng 09/11, xem mục cuối); `food` vào `petFood`.
   - `accessory`: mở khóa **vĩnh viễn** món của nhóm quà cho **cả 3
     thú** (`spinUnlockedAccessories`, nguồn "vòng quay" tách khỏi mốc
     chặng; mỗi thú +4 món spin-only trong tủ phụ kiện).
   - `sticker`: mở sticker chưa có trong bộ 6 mẫu; đã đủ bộ → đổi 10 sao.
   - `rare-pet`: **Phượng Hoàng Cầu Vồng 🦚** vào bộ sưu tập
     (`rarePets`) — chọn làm thú đồng hành được ở trang Thú cưng, đi
     theo trên bản đồ và trong bài học; Phượng Hoàng **không có skill**
     (chỉ cổ vũ, đúng chốt chặn "pet không làm bài thay bé"). Trùng
     Phượng Hoàng → đổi 25 sao.
   - `real` (quà thật/tiền): **trừ tồn kho ngay**, ghi lịch sử với
     `realStatus: "pending"` → hiện trong Kho báu "Chờ trao"; chỉ
     phụ huynh/admin xác nhận "đã trao" (`givenAt`) ở trang Admin.

## Bảng quà mặc định (admin sửa được toàn bộ)

| Tầng | Quà | Loại | Giá trị | Trọng số |
|---|---|---|---|---|
| Dễ | 50 XP | xp | 50 | 30 |
| Dễ | 10 sao | stars | 10 | 25 |
| Dễ | 1 phần thức ăn pet | food | 1 | 20 |
| Dễ | Mũ hoặc kính cho pet | accessory (nhóm mũ-kính) | — | 15 |
| Dễ | Sticker bất ngờ | sticker | — | 10 |
| Dễ | 1.000đ tiền thưởng thật | real + tiền mặt, không giới hạn số lượng | 1.000đ | **1** |
| Trung bình | 100 XP | xp | 100 | 28 |
| Trung bình | 25 sao | stars | 25 | 24 |
| Trung bình | Váy hoặc áo cho pet | accessory (nhóm áo-váy) | — | 18 |
| Trung bình | Đôi giày cho pet | accessory (nhóm giày) | — | 15 |
| Trung bình | 5.000đ tiền thưởng thật | real + tiền mặt, không giới hạn số lượng | 5.000đ | **2** |
| Khó | 200 XP | xp | 200 | 30 |
| Khó | Bộ quần áo cho pet | accessory (nhóm bộ-đồ) | — | 20 |
| Khó | Pet hiếm Phượng Hoàng Cầu Vồng 🦚 | rare-pet | — | 12 |
| Khó | Gấu bông thật | real, tồn kho 2 | — | 8 |
| Khó | 15.000đ tiền thưởng thật | real + tiền mặt, không giới hạn số lượng | 15.000đ | **1** |

Ngân sách tiền mặt mặc định: **50.000đ/tháng** (admin sửa được). Quà
tiền ở cả 3 tầng đều có trọng số nhỏ nhất đúng yêu cầu "tỉ lệ trúng
nhỏ nhất" (kỳ vọng lý thuyết: ~1% ở Dễ, ~2,3% ở Trung bình, ~1,4% ở
Khó) — test gieo hạt 4.000 lượt/tầng đo tỉ lệ trúng tiền vẫn nhỏ
(Dễ < 4%, Trung bình < 8%, Khó < 5%). Quà tiền **không giới hạn tồn
kho** (stock null): cổng chặn chính là ngân sách tháng — hết ngân
sách thì quà tiền tự rời vòng như cơ chế sẵn có.

## Cơ chế TỰ LOẠI khỏi vòng quay (hàm thuần `isPrizeEligible`)

Một quà chỉ nằm trên vòng khi đồng thời: `enabled` **và** trọng số > 0
**và** còn tồn kho (tồn kho hiệu lực = số máy bé đã ghi nhận trong
`spinStock` nếu có, ngược lại lấy từ cấu hình; `null` = không giới
hạn) **và** — riêng quà tiền mặt — tổng tiền đã trúng trong tháng
(`moneyWonInMonth` từ lịch sử) còn dưới ngân sách tháng. Hết tồn kho
hoặc hết ngân sách ⇒ quà tự rời vòng; quà ảo và quà thật không phải
tiền mặt không bị ngân sách chặn. Nếu một tầng còn dưới 2 quà hợp lệ,
hệ thống bổ sung quà ảo dự phòng của tầng đó (20 XP/5 sao, 40 XP/10
sao, 80 XP/20 sao) để vòng không bao giờ rỗng. Trang Admin hiện rõ lý do
từng quà bị loại ("Hết số lượng" / "Hết ngân sách tháng" / "Đang tắt").

## Đồng bộ — điều kiện SQL

- **Cấu hình** (danh sách quà + ngân sách): qua `app_config` key riêng
  **`spin_config`**, đúng khuôn global rewards — đọc công khai, ghi
  chỉ JWT email admin (RLS sẵn có từ rewards-schema.sql). Chưa đăng
  nhập/chưa có cấu hình → dùng `DEFAULT_SPIN_CONFIG` cục bộ.
- **Lịch sử quay + quà chờ trao**: lưu trong store của máy bé
  (`spinHistory`, persist cùng progress) và đồng bộ theo tài khoản
  bằng khuôn family rewards (pull → merge theo id/`updatedAt`, hòa
  thì bản **đã trao** thắng → push), qua bảng mới `spin_history`.
  - ⚠️ **Cần chạy file `src/features/supabase/spin-schema.sql` trên
    Supabase SQL Editor để đồng bộ lịch sử giữa các máy** (file
    idempotent, gồm cả app_config nếu chưa có). **Chưa chạy vẫn dùng
    đầy đủ trên một máy** — hook đồng bộ nuốt lỗi an toàn.
  - Theo đúng chỉ đạo: KHÔNG tự chạy SQL, KHÔNG upload GitHub trong
    đợt này.

## File tạo mới

- `src/lib/spin.ts` — logic thuần: cấu hình mặc định, sticker, điều
  kiện được quay + lý do loại, `pickWeighted` + `mulberry32`, cấp vé,
  ngân sách tháng, sanitize, merge lịch sử.
- `src/lib/spinConfigSync.ts` + `src/lib/spinHistorySync.ts` +
  `src/lib/useSpinHistorySync.ts` — đồng bộ theo khuôn rewards.
- `src/app/spin.tsx` — trang Vòng quay (vòng SVG theo trọng số quà
  hợp lệ, tab 3 tầng hiện số vé).
- `src/app/treasure.tsx` — trang Kho báu (ví ⭐/🔑/🍎, vé, sticker,
  pet hiếm, quà thật chờ trao có ảnh + đã nhận, lịch sử quay).
- `src/app/admin-spin.tsx` — trang Admin vòng quay (CRUD quà đầy đủ
  field gồm ảnh quà thật + tồn kho, ngân sách tháng, lịch sử, xác
  nhận đã trao; cổng `isAdminEmail` như admin-rewards).
- `src/features/supabase/spin-schema.sql` — bảng `spin_history`
  owner-only + app_config (idempotent).
- `scripts/test-spin.mjs` — 20 nhóm kiểm tra.

## File sửa

- `src/lib/store.ts` — field vòng quay (`spinTickets`,
  `spinHistory`, `spinStock`, `stickers`, `spinUnlockedAccessories`,
  `rarePets`) + migrate cả 2 nhánh; `completeLesson` cấp vé;
  `applySpinWin` / `markSpinPrizeGiven` / `setSpinStockRemaining` /
  `replaceSpinHistory`; `toggleAccessory` chấp nhận món mở bằng vòng
  quay; `setActiveCompanion` thêm `"phuong-hoang"` (guard đã sở hữu).
- `src/lib/pets.ts` — `RARE_PET` Phượng Hoàng Cầu Vồng + skill kind `"none"`;
  `SPIN_ACCESSORIES` (4 món/thú, `unlockStage = ∞`, `source: "spin"`)
  + `SPIN_ACCESSORY_GROUPS`/`spinGroupTargets`; `allAccessoriesFor`;
  `companionPetFor` nhận mode `"ky-lan"` + `rarePets`;
  `petSkillForExercise` trả null cho `"none"`.
- `src/lib/rewardsStore.ts` — cache + nháp admin cấu hình vòng quay,
  `effectiveSpinConfig`.
- `src/app/_layout.tsx` — đăng ký route spin/treasure/admin-spin,
  admin-spin vào khu người lớn (giới hạn giờ), RewardsRunner chạy 2
  hook đồng bộ vòng quay.
- `src/app/(tabs)/index.tsx` — hàng lối tắt 2: 🎡 Vòng quay, 🧰 Kho báu.
- `src/app/lesson/[id].tsx` — màn kết quả: nút quay nổi bật khi có vé
  + tổng vé; `finishPet` truyền `rarePets`.
- `src/app/pet.tsx` — tủ phụ kiện gồm món vòng quay
  (ghi "Trúng ở vòng quay 🎡 để mở" / "Đã mở ở vòng quay 🎡"); thẻ
  Phượng Hoàng Cầu Vồng chọn/bỏ đồng hành; nút Kho báu; thẻ thông báo
  khi Phượng Hoàng đang đồng hành.
- `src/components/adventure-map.tsx` — thú đi theo: Phượng Hoàng Cầu
  Vồng (khi chọn + đã sở hữu) đứng đầu chuỗi ưu tiên; Phượng
  Hoàng/Rồng không mang phụ kiện.
- `src/components/lesson-pet.tsx` — truyền `rarePets`; Phượng Hoàng
  ẩn nút skill, hiện câu cổ vũ riêng.
- `scripts/test-companion.mjs` — **sửa 1 khẳng định tĩnh kèm ghi chú
  lý do**: chuỗi `travelerPetEmoji` thay đổi chủ đích vì pet hiếm đứng
  đầu chuỗi ưu tiên (tiền lệ giống đợt B+C); hai khẳng định prop còn
  lại giữ nguyên.

## Kiểm chứng (đã chạy thật)

- `node scripts/test-spin.mjs` — **20/20 PASS**: bảng quà + trọng số
  (tiền = xác suất nhỏ, đo thực tế bằng 4.000 lượt gieo hạt), bộ lọc
  hợp lệ (tắt/hết kho/hết ngân sách đều bị loại, quà tiền bị loại khi
  hết ngân sách nhưng quà ảo còn), đệm quà dự phòng, chọn trọng số tất
  định theo hạt, cấp vé đúng 3 trường hợp, ngân sách tháng từ lịch sử,
  merge đã-trao-thắng, sanitize, nhóm phụ kiện 3 thú, Phượng Hoàng
  Cầu Vồng skill none, nối dây UI/SQL, baseline.
- Toàn bộ test cũ PASS: pets 21, adventure-map 26,
  companion 9, lesson-ui 16, level-floor 11, garden 14, rewards 9, ranks 12,
  competitions 20, provinces 30, worldmap 76. (Một khẳng định tĩnh
  trong test-pets về chuỗi migrate `activeCompanion` đã sửa kèm ghi
  chú lý do — migrate nay ánh xạ khóa cũ "ky-lan" → "phuong-hoang".)
- `npx tsc --noEmit` — **0 lỗi**.
- `npx expo export --platform web` — **PASS**; `dist/` có đủ
  `spin.html`, `treasure.html`, `admin-spin.html`.
- Baseline nội dung giữ nguyên: **80 unit / 314 bài / 2.488 câu**.

## Người dùng sẽ thấy gì

- **Bé**: học xong bài → màn kết quả hiện "🎟️ Bé có N vé quay may
  mắn" + nút **🎡 Quay vòng may mắn**; trang chủ có thêm lối tắt
  **Vòng quay** và **Kho báu**. Ở trang Vòng quay: 3 tab tầng hiện số
  vé, vòng quay màu quay 3,2 giây dừng đúng ô quà, bấm **Nhận quà** là
  quà vào Kho báu. Kho báu hiện ví (sao/chìa khóa/thức ăn),
  bộ sưu tập 6 sticker, Phượng Hoàng Cầu Vồng nếu đã trúng, quà thật
  đang "⏳ Chờ trao" (có ảnh) và quà đã nhận. Trúng phụ kiện → vào
  trang Thú cưng mặc ngay cho Sư tử/Cáo/Gấu Trúc; trúng Phượng Hoàng
  → chọn Phượng Hoàng đồng hành được trên bản đồ và trong bài học.
- **Phụ huynh/Admin** (email admin): trang **Quản trị vòng quay**
  (route `/admin-spin`) — thêm/sửa/xóa/tắt quà từng tầng (kèm ảnh quà
  thật, tồn kho, trọng số), đặt ngân sách tiền mỗi tháng và thấy ngay
  tháng này đã trúng bao nhiêu, xem lịch sử bé đã quay, danh sách quà
  thật chờ trao với nút **Xác nhận đã trao**. Bấm **Công bố** để cấu
  hình áp cho mọi máy. Quà hết hàng/hết ngân sách tự biến mất khỏi
  vòng quay của bé kèm lý do hiển thị ngay trong trang Admin.

## Chưa kiểm chứng / lưu ý

- Chưa chạy SQL `spin-schema.sql` (theo chỉ đạo) → đồng bộ lịch sử
  giữa các máy chưa kích hoạt; một máy dùng đầy đủ.
- Chưa kiểm chứng trên thiết bị thật: cảm giác quay, hiển thị vòng
  SVG trên điện thoại nhỏ. Tồn kho là theo từng máy (mỗi máy trừ kho
  độc lập từ cấu hình đã công bố) — đúng thiết kế một gia đình/một
  máy chính của bé; admin đặt lại số lượng trong form là đặt lại cho
  máy đang cầm.

## Chỉnh theo chốt của người dùng 09/11

Người dùng trả lời 4 điểm trợ lý hỏi và CHỐT như sau (đợt chỉnh này
chỉ sửa phần vòng quay/thú cưng hiếm, không đụng logic học):

1. **Cách cấp vé theo tầng: ĐÚNG như đã xây** (thường → Dễ, hoàn hảo
   → Trung bình, xong chặng → +Khó) — giữ nguyên, không sửa.
2. **Pet hiếm MỚI HẲN**: bỏ Kỳ Lân 🦄, thay bằng **Phượng Hoàng Cầu
   Vồng 🦚** — "pet hiếm nhất, đẹp nhất", chỉ có ở vòng quay Khó.
   Đổi toàn bộ: tên/emoji/khóa định danh `ky-lan` → `phuong-hoang`
   trong `pets.ts` (RARE_PET, CompanionMode, companionPetFor),
   `spin.ts`, `store.ts` (rarePets, setActiveCompanion), trang Thú
   cưng (thẻ sưu tập), Kho báu, bản đồ, lesson-pet và các test. Vẫn
   chỉ cổ vũ (skill `"none"`), không làm bài thay bé. Migrate ánh xạ
   dữ liệu cũ `ky-lan` → `phuong-hoang` để không mất pet đã trúng.
3. **"XU" CHÍNH LÀ SAO ⭐**: bỏ hẳn loại quà `coins` và ví xu riêng.
   Quà "10 xu" (Dễ) → **+10 sao**, "25 xu" (Trung bình) → **+25 sao**,
   cộng thẳng vào bộ đếm `stars` sẵn có của store. Field `coins` đã
   GỠ khỏi store (type + initial state + cả hai nhánh migrate) —
   an toàn vì đợt vòng quay chưa từng được công bố lên preview/
   production nên chưa có dữ liệu người dùng thật nào chứa `coins`;
   migrate vẫn chủ động làm sạch khóa `coins` thừa và đổi kind
   `"coins"` → `"stars"` trong lịch sử quay cũ nếu có. Sticker trúng
   trùng khi đủ bộ → **+10 sao**; trùng pet hiếm → **+25 sao**. Kho
   báu và trang Thú cưng bỏ ô ví 🪙 Xu (ví chỉ còn ⭐/🔑/🍎); trang
   Vòng quay hiện "Ví sao của bé"; Admin đổi nhãn loại quà "Xu" →
   "Sao".
4. **Quà tiền theo tầng + xác suất nhỏ nhất** (ngân sách tháng giữ
   mặc định 50.000đ):
   - **Dễ** thêm quà thật **1.000đ**, trọng số **1** (các quà cũ giữ
     nguyên: 50 XP 30, 10 sao 25, thức ăn 20, mũ/kính 15, sticker 10).
   - **Trung bình**: 5.000đ hạ trọng số 3 → **2**.
   - **Khó**: 15.000đ (trong khoảng 10.000–20.000đ người dùng cho)
     hạ trọng số 2 → **1**.
   - Cả ba quà tiền: **tồn kho null** (không giới hạn số lượng) —
     cổng chặn chính là ngân sách tháng; hết ngân sách thì quà tiền
     tự loại khỏi vòng theo cơ chế sẵn có.

Kiểm chứng đợt chỉnh: `test-spin` 20/20 PASS (đã cập nhật theo spec
mới: sao thay xu, trọng số tiền mới ở cả 3 tầng, tỉ lệ trúng tiền đo
bằng 4.000 lượt gieo hạt/tầng vẫn nhỏ, Phượng Hoàng Cầu Vồng), toàn
bộ test cũ PASS (pets 21 — có sửa 1 khẳng định tĩnh về migrate kèm
ghi chú lý do, adventure-map 26, companion 9 — khẳng định
travelerPetEmoji cập nhật sang Phượng Hoàng, lesson-ui 16,
level-floor 11, garden 14, rewards 9, ranks 12, competitions 20,
provinces 30, worldmap 76), `tsc --noEmit` 0 lỗi, `expo export`
PASS, baseline 80/314/2488 giữ nguyên.
