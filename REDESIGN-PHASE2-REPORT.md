# REDESIGN — BÁO CÁO PHASE 2: Design system + khung layout mobile + sửa cấp độ theo Hướng 1

- Ngày thực hiện: 09/11/2026
- Phạm vi: đúng mục Phase 2 trong `REDESIGN-AUDIT.md`, cộng các điểm bắt buộc của brief Phase 2. Không đổi route, không redesign từng màn hình (Home/Worlds/Map → Phase 3; Học/Game → Phase 4), không upload GitHub.

## 0. Điểm cần lưu ý so với audit / quyết định kỹ thuật

1. **`missionLocked` đổi chữ ký** (thêm tham số `completed`): `(unlockedAll, completed, globalIndex, frontierIndex)`. Đây là hệ quả bắt buộc của Hướng 1 — muốn "bài đã hoàn thành không bao giờ bị khóa lại" thì công thức khóa phải biết trạng thái hoàn thành. Mọi nơi đang chạy thật đã được cập nhật dùng cùng một helper (mục B.2). Các component legacy `land-card.tsx`, `adventure-node.tsx`, `island-pin.tsx` KHÔNG còn được màn nào import (đúng như audit ghi) và chỉ nhận prop do cha truyền, nên giữ nguyên file cho Phase 3/6 dọn.
2. **Biên hiệu lực không phải `max(tiến độ, sàn)` đơn thuần.** Nếu chỉ lấy max rồi mở mọi bài ≤ biên thì bài ngay trước sàn sẽ bị mở (sai yêu cầu "bài trước floor vẫn khóa") và sau khi học qua sàn, vị trí hiện tại sẽ kẹt ở sàn. Semantics đã cài (mục B.1): tại mọi thời điểm chỉ có các bài ĐÃ HOÀN THÀNH + đúng MỘT bài ở biên là mở; biên = tiến độ thật nếu đã ≥ sàn, ngược lại = bài chưa hoàn thành đầu tiên tính từ sàn.
3. **PhoneFrame bọc cả modal/fullScreenModal** ở root layout (kể cả màn lesson) để mọi route thừa hưởng cùng khung. Hệ quả có chủ đích theo brief mobile-first: trên desktop/tablet, TOÀN BỘ app (gồm bản đồ tỉnh hiện tại) hiển thị trong cột 480px căn giữa, hai bên là nền trời/biển trang trí. Bản đồ tỉnh sẽ được thay bằng bản đồ đường đi ở Phase 3 nên bề rộng này là đích cuối của thiết kế.
4. **Test cũ phải sửa 1 chỗ** (mục Kiểm chứng): `scripts/test-garden.mjs` check #6 — đổi theo chữ ký/semantics mới, ghi rõ lý do trong chính file test và mục 3 dưới đây. Không bỏ bất kỳ kiểm tra nào; số nhóm kiểm tra của test-garden giữ nguyên 14.

## PHẦN A — Design system + khung layout mobile

### A.1. File đã sửa

| File | Thay đổi |
|---|---|
| `src/lib/theme.ts` | Mở rộng token ADDITIVE (không sửa/xóa token cũ): thêm `radius.sm = 8`; `spacing` (xs 4 → huge 40); `typography` (display 30/900, h1 24/900, h2 20/800, title 17/800, body 15/600, bodySmall 14/600, caption 13/700, tiny 11/700); `touchTargets` (min 48, tabBarHeight 88, tabIcon 28); `layout` (phoneMaxWidth 480, contentMaxWidth 720, gutter 16); `shadow.soft` + `shadow.floating`; `gamePalette` + `gamePaletteDark` + `useGamePalette()` (trời/biển sáng kiểu game: skyTop #7dd3fc, skyBottom #e0f2fe, sea #38bdf8, seaDeep #0284c7, sand #fde68a, grass #86efac, cloud trắng); `kingdomColorTokens(courseId)` dẫn xuất token phẳng từ bảng màu vương quốc trong `kingdoms.ts` |
| `src/app/_layout.tsx` | Bọc `<Stack>` trong `<PhoneFrame>` (trong `KidsTimeLimit`, StatusBar giữ ngoài khung). Không đổi route/thứ tự screen |
| `src/app/(tabs)/_layout.tsx` | Style tab bar mới, GIỮ NGUYÊN 3 route (Học/Ôn tập/Hồ sơ) và icon: chiều cao 88 + safe-area dưới (`useSafeAreaInsets`), bo góc trên `radius.xxl`, bóng `shadow.floating`, nhãn 12px/800, icon 28px, tab đang chọn có nền "viên thuốc" xanh mềm sau icon. Vùng chạm mỗi tab ≥ 48px |
| `src/components/duo-button.tsx` | Thêm `minHeight: 52` cho style nền — mọi nút dùng DuoButton đạt vùng chạm ≥ 48px. Không đổi API/variant |

Màu 3 vương quốc thuần Việt lấy từ NGUỒN DUY NHẤT `src/lib/kingdoms.ts` (không định nghĩa lại): Cổ Tích (Anh) primary #38bdf8 / deep #0284c7 / secondary #facc15 / accent #22c55e / soft #e0f2fe; Hoa Anh Đào (Nhật) #f472b6 / #db2777 / #10b981 / #f59e0b / #fdf2f8; Đèn Lồng (Trung) #dc2626 / #991b1b / #f59e0b / #059669 / #fef3c7.

### A.2. File đã tạo

| File | Nội dung |
|---|---|
| `src/components/phone-frame.tsx` | `PhoneFrame`: cột nội dung `maxWidth 480`, căn giữa; nền ngoài cột là trời/biển 2 lớp màu từ `gamePalette` + họa tiết trang trí mờ (☁️ 🏝️ 🌊, `pointerEvents="none"`). Trên điện thoại nội dung vẫn tràn full như cũ |
| `src/components/ui/card.tsx` | `Card`: thẻ chuẩn — bo góc `radius.xl`, viền 2px, bóng `shadow.card`, đệm `spacing.lg`, tùy chọn `accentColor` (màu vương quốc) |
| `src/components/ui/progress-bar.tsx` | `ProgressBar`: rãnh bo tròn đầy cao 12px, `value` 0..1 tự kẹp, có `accessibilityRole="progressbar"` |
| `src/components/ui/stat-chip.tsx` | `StatChip`: emoji + giá trị + nhãn nhỏ, `minHeight 48` theo chuẩn vùng chạm |
| `src/components/ui/index.ts` | Barrel export bộ UI dùng chung cho các phase sau |

Mọi chữ hiển thị mới đều thuần Việt (nhãn tab giữ nguyên "Học / Ôn tập / Hồ sơ"; comment và nhãn trợ năng bằng tiếng Việt).

## PHẦN B — Sửa cấp độ theo Hướng 1 (cấp độ = điểm bắt đầu mở bài theo tầng)

### B.1. Helper dùng chung — `src/lib/content.ts` (đặt cạnh `tierForLearnerLevel`/`difficultyForIndex`)

- `floorIndexForLevel(level, total)`: globalIndex của bài đầu tiên thuộc tầng của cấp độ, tính bằng chính `difficultyForIndex` (không hard-code tỉ lệ lần hai). Số thật: **Anh (108 bài): moi 0, da-biet 44, chuyen-nghiep 81. Nhật/Trung (103 bài): moi 0, da-biet 42, chuyen-nghiep 78.**
- `effectiveFrontierIndex(completedLessons, lessonIds, level)`: biên hiệu lực —
  - tiến độ thật (bài chưa hoàn thành đầu tiên) ≥ sàn → biên = tiến độ thật (điểm bắt đầu không lùi sau những gì đã học);
  - tiến độ thật < sàn → biên = bài chưa hoàn thành đầu tiên tính TỪ sàn (học xong bài ở biên thì biên tiến tiếp lên, không kẹt ở sàn);
  - mọi bài từ sàn tới cuối đã xong → biên quay về bài chưa hoàn thành đầu tiên của tiến độ thật (học nốt phần cơ bản còn thiếu); xong toàn khóa → biên = total.
  - Hàm thuần: không sửa `completedLessons`, không cộng XP.
- `isLockedAtFrontier({ unlockedAll, completed, globalIndex, frontierIndex })`: khóa ⟺ chưa mở khóa toàn bộ VÀ chưa hoàn thành VÀ không phải bài ở biên.

Bất biến được giữ: chọn cấp độ không đánh dấu hoàn thành bài nào, không cộng XP (`setLearnerLevel` trong store chỉ gán `learnerLevel` — có test tĩnh khóa chặt); admin + mã HEOVIP95 (`unlockedAll`) vẫn mở tất cả; bài đã hoàn thành không bao giờ bị khóa lại khi hạ cấp độ; người mới mặc định "moi" → hành vi y như trước Phase 2.

### B.2. Mọi điểm quyết định khóa đã thống nhất về cùng helper

| Nơi | Trước | Nay |
|---|---|---|
| `src/lib/garden.ts` — `missionLocked` / `missionView` (MissionPanel) | `!unlockedAll && globalIndex > currentIndex` | Ủy quyền `isLockedAtFrontier`; `missionView` truyền thêm trạng thái `completed` của chính bài |
| `src/app/(tabs)/index.tsx` ~dòng 91 | `currentIndex = currentLessonIndex(...)` cho nút Học tiếp | `frontierIndex = effectiveFrontierIndex(completed, ids, learnerLevel)`; `continueTarget`/`allDone` dùng biên này |
| `src/app/(tabs)/index.tsx` ~dòng 155 | mỗi khóa trong `coursesData` tự tính `currentLessonIndex` | `currentIndex` của mỗi khóa = `effectiveFrontierIndex(..., learnerLevel)` (thêm `learnerLevel` vào deps của useMemo để đổi cấp độ tính lại ngay) |
| `src/app/(tabs)/index.tsx` — thẻ "Gợi ý hành trình" | trỏ bài đầu tiên của tầng theo cấp độ → bài ĐANG KHÓA (lỗi cũ) | trỏ đúng bài Ở BIÊN HIỆU LỰC (`allLessons[frontierIndex]`) — bài mở được thật; vẫn ẩn khi ở "moi" như cũ |
| `src/components/world-map.tsx` — chip bài học trong unit | `locked = !unlockedAll && globalIndex > course.currentIndex` | `isLockedAtFrontier` với `frontierIndex = course.currentIndex` (đã là biên hiệu lực do trang chủ truyền vào) |
| `src/components/world-map.tsx` — trạng thái tỉnh | khóa khi bài đầu unit > mốc | khóa khi MỌI bài trong unit đều khóa theo cùng helper (bài đã hoàn thành luôn tính mở) |
| `src/app/lesson/[id].tsx` ~dòng 290 | sau khi học xong, "bài tiếp theo" = `currentLessonIndex` thuần | `effectiveFrontierIndex(..., learnerLevel)` — học từ điểm bắt đầu theo cấp độ sẽ tiến tiếp đúng bài, không bị kéo ngược về bài cơ bản đầu tiên chưa học |

### B.3. Test mới — `scripts/test-level-floor.mjs` (11 nhóm, PASS)

- Floor của 3 cấp độ trên số bài thật của cả 3 khóa (108/103/103) + kiểm chứng floor là bài đầu tiên đúng tầng.
- Tiến độ rỗng: bài tại floor của da-biet/chuyen-nghiep mở; bài ngay trước floor khóa; bài 0 khóa khi ở da-biet; `unlockedAll` mở tất cả ở mọi cấp độ.
- Học xong bài ở floor (da-biet, Anh) → biên tiến lên bài kế; xong hết từ floor tới cuối → biên quay về phần cơ bản còn thiếu.
- Đã xong 51 bài đầu: nâng chuyen-nghiep → biên nhảy tới 81 nhưng bài đã xong vẫn mở; hạ về moi → biên về tiến độ thật 51, không bài đã xong nào bị khóa lại.
- Bất biến: helper không sửa object tiến độ (deep-freeze); thân `setLearnerLevel` trong `store.ts` không chứa `completedLessons`/`xp`.
- Baseline nội dung: 80 unit / 314 bài / 2488 exercise.

## 3. Kiểm chứng chung

| Kiểm tra | Kết quả |
|---|---|
| `node scripts/test-level-floor.mjs` (mới) | **PASS 11/11 nhóm** |
| `node scripts/test-garden.mjs` | **PASS 14/14 nhóm** — sau khi sửa check #6: chữ ký `missionLocked` mới + thay khẳng định cũ `(false, 1, 2) = false` bằng hai khẳng định `(đã xong, trước biên) = mở` và `(chưa xong, trước biên) = khóa`. Lý do: công thức cũ coi mọi bài trước mốc là mở vì mặc định chúng đã hoàn thành; Hướng 1 chủ đích khóa bài CHƯA học trước sàn. Ba case `missionView` trong cùng check giữ nguyên và vẫn đạt |
| `node scripts/test-rewards.mjs` | PASS 9/9 nhóm |
| `node scripts/test-ranks.mjs` | PASS 12/12 nhóm |
| `node scripts/test-competitions.mjs` | PASS 20/20 |
| `node scripts/test-provinces.mjs` | PASS 30/30 |
| `node scripts/test-worldmap.mjs` | PASS 84/84 |
| Baseline nội dung | Giữ nguyên **80 unit / 314 bài / 2488 exercise** (khẳng định trong test-level-floor + test-rewards/ranks/provinces) |
| `npx tsc --noEmit` | **0 lỗi** |
| `npx expo export --platform web` | **PASS** (Exported: dist) |

Chưa kiểm chứng trên thiết bị thật: khung 480px + tab bar mới + hiệu ứng đổi cấp độ cần được mở thử trên điện thoại thật khi bản preview của nhánh PR lên (cổng Phase 3). Rủi ro cũ từ audit — `public/sw.js` giữ tên cache cố định `piglingo-kids-v1` — KHÔNG nằm trong phạm vi Phase 2, để Phase 6 xử lý cùng đợt dọn dẹp.

## 4. Hiệu ứng thấy được trên màn hình chính khi đổi từng cấp độ

Dựa đúng logic đã cài (`effectiveFrontierIndex` + `isLockedAtFrontier`), với khóa Tiếng Anh (108 bài) làm ví dụ:

**Trường hợp 1 — bé chưa học bài nào:**
- **Mới bắt đầu (moi):** như trước đây — nút "Học tiếp" trỏ Bài 1 (đầu tầng Cơ bản), tỉnh/unit chứa Bài 1 sáng trạng thái "đang học" trên bản đồ, chỉ chip Bài 1 mở, thẻ "Gợi ý hành trình" không hiện (chỉ hiện khi cấp độ khác "moi").
- **Đã biết một chút (da-biet):** NGAY khi đổi, vị trí hiện tại NHẢY tới Bài 45 (bài đầu tiên của tầng Nâng cao): nút "Học tiếp" đổi thành bài đó, bản đồ tự căn giữa tới unit chứa Bài 45, tỉnh đó chuyển sang "đang học", chip Bài 45 mở và bấm học được ngay. 44 bài Cơ bản phía trước hiện khóa (chưa học) — muốn học chúng thì hạ cấp độ về "moi" (vị trí quay về Bài 1) hoặc học tiếp từ Bài 45 tới cuối khóa rồi biên tự quay về Bài 1. Thẻ "Gợi ý hành trình" hiện và trỏ đúng Bài 45 — bài nay mở thật, hết lỗi cũ "gợi ý trỏ bài đang khóa".
- **Chuyên nghiệp (chuyen-nghiep):** vị trí nhảy tới Bài 82 (bài đầu tầng Chuyên sâu), mọi thứ trên trang chủ (Học tiếp, bản đồ, chip mở, thẻ gợi ý) đều dời theo tới bài đó.

**Trường hợp 2 — bé đã học xong 51 bài đầu (Bài 1–51):**
- **moi:** bài hiện tại là Bài 52 (tiến độ thật). **da-biet:** VẪN Bài 52 — tiến độ đã qua sàn Nâng cao (Bài 45) nên điểm bắt đầu không kéo lùi. **chuyen-nghiep:** bài hiện tại nhảy tới Bài 82; 51 bài đã xong vẫn hiện hoàn thành và bấm ôn lại được bình thường.
- **Hạ cấp độ** (chuyen-nghiep → moi): vị trí quay về Bài 52, KHÔNG bài đã xong nào bị khóa lại, số bài hoàn thành và XP trên trang chủ không thay đổi một chút nào — đổi cấp độ chỉ dời điểm bắt đầu, không đụng tiến độ.

**Khi đang học dở theo cấp độ:** học xong bài ở điểm bắt đầu (ví dụ Bài 45 ở da-biet), màn hình kết quả bài học dẫn tiếp tới Bài 46 (không kéo ngược về Bài 1), và trang chủ cập nhật vị trí hiện tại theo đúng bài kế đó.
