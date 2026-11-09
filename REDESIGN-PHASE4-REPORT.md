# REDESIGN — BÁO CÁO PHASE 4: Học bài + Game theo design system mới

- Ngày thực hiện: 09/11/2026
- Phạm vi: đúng mục Phase 4 trong `REDESIGN-AUDIT.md` — CHỈ thay lớp trình bày của
  màn Học bài, 5 dạng bài tập, tab Ôn tập, 5 màn game và màn Ăn mừng. **Không đổi
  bất kỳ logic nào**: chấm điểm, XP (15/+5), `completeLesson`, cấp vé vòng quay,
  SRS/mistakes/wordStats, điều kiện khóa bài/cấp độ, luật + điểm + thưởng của mọi
  game đều giữ nguyên từng dòng. Không đụng file nào trong `src/lib/` (trừ đọc).
  Không upload GitHub.

## 1. File đã tạo

| File | Nội dung |
|---|---|
| `src/components/game-ui.tsx` | Khung trình bày DÙNG CHUNG cho 5 màn game (thuần trình bày): `GameHeader` (nút quay lại tròn 48×48 có viền + bóng mềm, tiêu đề `typography.h2`, khe huy hiệu bên phải), `GameBadge` (viên thuốc chỉ số: lượt/điểm/câu), `WinCard` (thẻ kết quả cuối ván dựng trên `Card` của ui/ — tone `win` viền/nền vàng hổ phách, tone `lose` đỏ mềm) |
| `scripts/test-lesson-ui.mjs` | Test tĩnh mới — 16 nhóm (mục 4) |

## 2. File đã sửa (chỉ trình bày)

| File | Thay đổi trình bày |
|---|---|
| `src/app/lesson/[id].tsx` | Header: bỏ thanh tiến độ tự chế chạy spring của reanimated → `ProgressBar` của ui/ (cao 14, màu = màu chính của vương quốc đang học qua `kingdomColorTokens`). Thẻ câu hỏi: View tự chế → `Card` của ui/ viền màu vương quốc, đệm `spacing.xl`. Màn kết quả: `ResultCard` dựng lại trên `Card` (`padded={false}`, viền theo màu chỉ số). Footer giữ cố định dưới đáy — nút Kiểm tra/Tiếp tục vẫn là `DuoButton` (minHeight 52 ≥ 48px), dải màu đúng/sai giữ nguyên. Toàn bộ khoảng cách/chữ chuyển sang token `spacing`/`typography` |
| `src/components/exercises/option-card.tsx` | Thẻ đáp án dùng chung: bo góc `radius.xl`, bóng `shadow.soft`, dạng đầy đủ minHeight 64 / dạng gọn minHeight 96, chữ theo `typography.title`. Bảng màu 4 trạng thái (idle/selected/correct/wrong) giữ nguyên từng mã màu |
| `src/components/exercises/select.tsx` | Tiêu đề theo `typography.h1`; hàng đề bài (loa + từ) bọc trong bong bóng nền `neutral100` bo góc xl |
| `src/components/exercises/fill-blank.tsx` | Tiêu đề `typography.h1`; bong bóng câu có thêm viền xanh trời 2px (kể cả phần đuôi bong bóng) cho rõ khối |
| `src/components/exercises/word-bank.tsx` | Tiêu đề `typography.h1`; ô đáp án bo góc xl; chip từ: bo góc xl, bóng mềm, `minHeight = touchTargets.min` (48px), chip "ma" tắt bóng |
| `src/components/exercises/type-answer.tsx` | Tiêu đề `typography.h1`; ô nhập nền `surface` + bóng mềm, chữ 19px/600 |
| `src/components/exercises/match.tsx` | Tiêu đề `typography.h1`; THÊM hàng tiến độ ghép (`ProgressBar` + dòng "Đã ghép X/Y cặp") — suy thuần từ state `matched` sẵn có, không thêm dữ kiện/logic nào |
| `src/components/lesson-pet.tsx` | Đồng bộ phong cách thuần style: bong bóng thoại + thẻ skill bo góc `radius.xl`, thẻ skill thêm bóng mềm. Vị trí, logic hiển thị skill, chốt chặn lộ đáp án giữ nguyên tuyệt đối |
| `src/app/(tabs)/practice.tsx` | 4 thẻ tự chế → `Card` của ui/; thanh nhiệm vụ ngày + thanh độ nhớ của từ → `ProgressBar` của ui/ (số đếm chuyển lên cạnh nhãn). Sửa 2 tiêu đề tiếng Anh còn sót sang thuần Việt theo ràng buộc: "Mistakes" → "Lỗi sai" (+ câu phụ "N câu cần luyện lại."), "Words (N)" → "Từ đã học (N)" — chỉ đổi chữ hiển thị, điều kiện/nút/route giữ nguyên |
| `src/app/game-memory.tsx` | Thanh đầu → `GameHeader` + `GameBadge` ("Lượt: N"); hộp thắng → `WinCard`; thẻ lật bo góc xl. Luật lật/gép, sao theo lượt, thưởng 10 XP giữ nguyên |
| `src/app/game-listen.tsx` | Thanh đầu → `GameHeader`/`GameBadge`; hộp nghe → `Card` viền xanh trời; **đáp án chuyển sang dùng chính `OptionCard` của bài học** (trạng thái idle/correct/wrong ánh xạ từ `picked` sẵn có); hộp thắng → `WinCard`. Luồng chọn → hiện đáp án 950ms → câu kế, điểm = số câu đúng, thưởng XP giữ nguyên |
| `src/app/game-scramble.tsx` | Thanh đầu → `GameHeader`/`GameBadge`; thẻ câu đề → `Card` viền chàm; token xếp câu minHeight 48 + bo góc lg; hộp thắng → `WinCard`. Cách xếp/chấm/thưởng 2 XP mỗi câu giữ nguyên |
| `src/app/game-speed.tsx` | Thanh đầu → `GameHeader`; huy hiệu giờ/điểm → `GameBadge`; thanh thời gian → `ProgressBar` của ui/ (đỏ khi ≤10s như cũ); màn bắt đầu bọc trong `Card`; **đáp án dùng `OptionCard` dạng gọn**; hộp hết giờ → `WinCard`. Đồng hồ 60s, kỷ lục `speedBest`, thưởng 1 XP/câu đúng giữ nguyên |
| `src/app/game-letters.tsx` | Thanh đầu → `GameHeader`; thẻ từ → `Card` viền hổ phách; hộp thắng → `WinCard`, hộp thua → `WinCard tone="lose"`; **phím đoán chữ thêm `minHeight: 48`** (trước ~41px, dưới chuẩn chạm của brief). Luật đoán, 6 lượt sai, thưởng 5 XP giữ nguyên |
| `src/app/celebration.tsx` | Nhánh rương chặng: thẻ thông tin quà → `Card` của ui/ viền = **màu chính của vương quốc** của khóa (trước: viền hổ phách chung cho mọi khóa); tiêu đề 2 nhánh → `typography.display`, phụ đề → `typography.body`, tiêu đề mục → `typography.h2`. Mọi nhánh hành vi giữ nguyên: rương vừa nhận/đã nhận/chưa mở, mốc 100% khóa, thẻ phần thưởng chung/gia đình — chữ và logic không đổi |

## 3. Trước / sau từng màn hình

- **Học bài**: TRƯỚC — thanh tiến độ tự chế màu xanh lá cố định, khung câu hỏi viền
  xám đáy dày tự chế, thẻ kết quả tự chế viền đáy 5px. SAU — thanh tiến độ chuẩn
  design system **đổi màu theo vương quốc đang học** (Cổ Tích xanh trời / Hoa Anh
  Đào hồng / Đèn Lồng đỏ), thẻ câu hỏi là Card chuẩn bo góc 24 viền màu vương
  quốc, thẻ kết quả (Tổng XP / Chuỗi ngày / Độ chính xác) là Card chuẩn viền theo
  màu chỉ số; header gọn: nút đóng + tiến độ + cờ đích 🏁 (+viên "∞" khi ôn tập).
- **Bài tập**: TRƯỚC — mỗi dạng bài một kiểu chữ/khoảng cách riêng, thẻ đáp án bo
  góc 16. SAU — một ngôn ngữ chung: tiêu đề `h1` 24/900, thẻ đáp án bo góc 24 với
  4 trạng thái màu nhất quán ở mọi dạng bài và cả 2 game trắc nghiệm; ghép cặp có
  thêm thanh tiến độ ghép; chip từ và mọi nút đều ≥48px.
- **Game**: TRƯỚC — 5 màn tự chế 5 kiểu thanh đầu (nút quay lại chỉ là Pressable
  đệm 6px), 5 kiểu hộp thắng chép tay, đáp án mỗi game một kiểu. SAU — cả 5 màn
  chung một `GameHeader`/`GameBadge`/`WinCard`; đáp án của Nghe và chọn + Đố
  nhanh nhìn và bấm y hệt đáp án trong bài học.
- **Ôn tập**: TRƯỚC — thẻ viền tự chế, thanh tiến độ nhiệm vụ tự chế có số nằm
  trong thanh, còn 2 tiêu đề tiếng Anh. SAU — thẻ Card chuẩn, thanh ProgressBar
  chuẩn, tiêu đề thuần Việt toàn bộ.
- **Ăn mừng**: TRƯỚC — thẻ quà chặng viền vàng hổ phách cho mọi vương quốc, cỡ
  chữ tự chế. SAU — thẻ quà viền đúng màu vương quốc vừa học, thang chữ chuẩn
  design system; phần pháo giấy/mascot/thẻ phần thưởng giữ nguyên.

## 4. Kiểm chứng (đã chạy thật)

| Kiểm tra | Kết quả |
|---|---|
| `node scripts/test-lesson-ui.mjs` (MỚI) | **PASS 16/16 nhóm**: lesson dùng ProgressBar + Card màu vương quốc và còn nguyên mọi móc logic (`completeLesson(lessonId, perfect)`, `checkAnswer`, `answerIsReady`, `<LessonPet`, `sendPetFeedback`, `speakTarget(`, `spinTicketTotal`, `router.push("/spin")`, dải màu footer); OptionCard xl/bóng/vùng chạm + đủ 4 trạng thái; 5 dạng bài dùng `typography.h1`; match có ProgressBar từ `matched.size / pairs.length`; game-ui đạt vùng chạm; 5 game dùng GameHeader; listen/speed dùng OptionCard; practice hết chữ "Mistakes"/"Words"; celebration viền màu vương quốc + còn `justClaimed`/`stageReward(`; baseline đếm từ packs |
| `node scripts/test-spin.mjs` | PASS 20/20 (nguyên số lượng) |
| `node scripts/test-pets.mjs` | PASS 21/21 (nguyên số lượng) |
| `node scripts/test-adventure-map.mjs` | PASS 26/26 (nguyên số lượng) |
| `node scripts/test-companion.mjs` | PASS 9/9 (nguyên số lượng) |
| `node scripts/test-level-floor.mjs` | PASS 11/11 (nguyên số lượng) |
| `node scripts/test-garden.mjs` | PASS 14/14 (nguyên số lượng) |
| `node scripts/test-rewards.mjs` | PASS 9/9 (nguyên số lượng) |
| `node scripts/test-ranks.mjs` | PASS 12/12 (nguyên số lượng) |
| `node scripts/test-competitions.mjs` | PASS 20/20 (nguyên số lượng) |
| `node scripts/test-provinces.mjs` | PASS 30/30 (nguyên số lượng) |
| `node scripts/test-worldmap.mjs` | PASS 76/76 (nguyên số lượng) |
| Sửa khẳng định test cũ | **KHÔNG phải sửa khẳng định nào** — mọi test cũ đạt nguyên trạng |
| `npx tsc --noEmit` | **0 lỗi** |
| `npx expo export --platform web` | **PASS** — dist có đủ `lesson/`, `celebration.html`, `game-memory.html`, `game-listen.html`, `game-scramble.html`, `game-speed.html`, `game-letters.html` |
| Baseline nội dung | **80 unit / 314 bài / 2488 exercise** giữ nguyên |
| Logic `src/lib/` | **Không sửa file nào** — ràng buộc "không đổi lib logic" giữ tuyệt đối, không có ngoại lệ cần nêu |

## 5. Điểm trình bày cần biết (không phải lỗi)

- Thanh tiến độ bài học trước đây chạy hiệu ứng lò xo (reanimated spring); bản
  mới dùng `ProgressBar` tĩnh của design system nên độ rộng nhảy thẳng theo số
  câu đúng — đổi lại đồng nhất với mọi thanh tiến độ khác trong app (dashboard,
  nhiệm vụ, bản đồ). Nếu muốn giữ hiệu ứng trượt, cần mở rộng `ProgressBar` ở
  một đợt riêng.
- Đáp án ở game Nghe và chọn / Đố nhanh nay đi qua `OptionCard` nên có thêm
  rung haptic nhẹ khi chạm (thành phần dùng chung vốn có) — phản hồi cảm giác
  thuộc lớp trình bày, không đổi điểm/luật.
- Đáp án Đố nhanh dùng `OptionCard` dạng gọn (cao tối thiểu 96px) nên lưới
  2×2 cao hơn trước — vùng chạm lớn hơn cho trẻ, vẫn vừa màn hình điện thoại.

## 6. Chưa kiểm chứng trên thiết bị thật

- Cảm giác chạm + bố cục thật trên điện thoại (đặc biệt: lưới đáp án Đố nhanh
  cao hơn, bong bóng đề bài ở dạng Chọn từ, bàn phím Đoán chữ với phím 48px có
  tràn chiều cao ở máy nhỏ hay không) — cần mở thử trên bản preview/thiết bị
  thật như các phase trước.
- Chế độ tối (dark mode) cho các bề mặt mới (bong bóng đề bài `neutral100`,
  viền bong bóng fill-blank màu trời) — token đều lấy từ palette sáng/tối sẵn
  có và tsc/export đạt, nhưng chưa nhìn bằng mắt trên máy thật.
- Hiệu năng cuộn của màn lesson khi thẻ câu hỏi có thêm bóng Card — thành phần
  nhẹ, rủi ro thấp, chưa đo thực tế.
