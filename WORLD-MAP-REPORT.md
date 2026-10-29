# WORLD-MAP-REPORT — Trang chủ dạng bản đồ biển (game map)

Ngày: 29/10/2026 · Phạm vi: CHỈ trang chủ (tab Học). Không upload GitHub (chờ điều phối).

## 1. Thay đổi cấu trúc

Trang chủ không còn là "khu vườn + danh sách thẻ đảo cuộn dọc". Bố cục mới
KHÔNG cuộn trang:

```
WorldHeader (giữ nguyên)
Thanh mục tiêu XP hôm nay (giữ nguyên)
Hàng chip 3 vương quốc: Cổ Tích / Hoa Anh Đào / Đèn Lồng
Nút "Tiếp tục học" (giữ nguyên component)
┌─ Bản đồ biển (flex:1) ────────────────────────────────┐
│ [Tiểu học][THCS][THPT]  ← nút phủ: bay tới vùng       │
│   mặt biển 2600×2100, 80 đảo, kéo/chụm/nút +/−        │
│ [🎯 Nhiệm vụ & thành tích]        [+][−][🎯]          │
│ Bảng chi tiết đảo (trượt từ đáy khi chạm đảo)         │
└────────────────────────────────────────────────────────┘
Panel "🎯 Nhiệm vụ & thành tích" (lớp phủ, cuộn bên trong):
  GardenDashboard nguyên vẹn + thẻ Gợi ý hành trình + thẻ Phần thưởng
MissionPanel (giữ nguyên, mở từ chip bài học trong bảng chi tiết đảo)
```

## 2. File mới: `src/components/world-map.tsx`

- **Camera**: state `{x, y, scale}`, scale kẹp 0.35–1.8; thế giới 2600×2100
  biến đổi bằng `transform: translate + scale` với `transformOrigin: "0 0"`;
  camera luôn được kẹp để thế giới phủ kín khung nhìn (hoặc căn giữa khi
  thế giới nhỏ hơn khung).
- **Cử chỉ** (`PanResponder`, chỉ React Native core):
  - Kéo 1 ngón: `onMoveShouldSetPanResponder` chỉ nhận khi lệch > ~8px nên
    cú CHẠM vẫn tới được đảo (Pressable) bên dưới.
  - Chụm 2 ngón: zoom quanh điểm giữa 2 ngón (điểm thế giới dưới điểm giữa
    giữ nguyên vị trí sau zoom), tính từ `nativeEvent.touches`.
  - Nút tròn +/− (zoom ×1.25/×0.8 quanh tâm khung) và nút 🎯 "về đảo đang
    học" ở góc phải dưới (tự nâng lên khi bảng chi tiết đảo đang mở).
  - Bay camera = nội suy ~450ms bằng `requestAnimationFrame` (easeInOutCubic);
    nếu `useReducedMotion()` bật → nhảy thẳng, không hoạt họa.
- **Mặt biển**: nền xanh biển; 3 vùng ngang theo khối lớp (Tiểu học 1160px
  trên cùng, THCS 470px, THPT 470px) có dải tint rất nhẹ khác nhau + nhãn
  vùng lớn mờ ở mép trái ("Chặng 1 · Khối Tiểu học (lớp 1–5)"…); ~30 điểm
  trang trí 🌊 🐚 🪸 ⛵ 🐠 ⭐ mờ, vị trí tất định.
- **Đảo**: đủ 80 đảo của cả 3 khóa trên cùng một biển. Vị trí: lưới 10 cột
  trong vùng của band, thứ tự theo (khóa Anh → Nhật → Trung, rồi thứ tự
  unit trong pack), độ lệch giả ngẫu nhiên TĨNH bằng hàm băm tất định
  (không `Math.random`). Ảnh `island-map-a..d.jpg` luân phiên theo chỉ số
  unit trong khóa (như LandCard), kích thước 190×140; nhãn dưới đảo gồm
  tên đảo thật (`landForUnit`) + tên chủ đề.
  - Đảo học hết: vòng sáng xanh + huy hiệu ⭐.
  - Đảo đang học (của khóa đang chọn): vòng pulse vàng hoạt họa + mascot
    heo (`mascot-avatar.png`) đứng trên đảo.
  - Đảo chưa tới (mọi bài còn khóa): ảnh mờ 0.5 + huy hiệu 🔒.
- **Chạm đảo**: mở BẢNG CHI TIẾT trượt từ đáy khung bản đồ (Animated 240ms):
  tên chủ đề, tên đảo, ngôn ngữ, tiến độ x/y điểm, nút 📖 Sổ tay, và hàng
  chip bài học cuộn ngang (xong = xanh + ⭐, hiện tại = viền vàng nổi bật,
  khóa = xám + 🔒). Chạm chip (kể cả chip khóa) gọi đúng
  `onMissionPress(ref, courseId)` của `index.tsx` → MissionPanel như cũ.
  Chạm đảo thuộc khóa khác: gọi `onSelectCourse(courseId)` để màn cha đổi
  khóa đang chọn rồi mới mở bảng (khớp hành vi cổng vương quốc cũ).
  Chạm mặt biển trống → đóng bảng.
- **API ra ngoài**: props `{courses, activeCourseId, unlockedAll,
  onSelectCourse, onMissionPress, onGuidebookPress}`; ref
  `WorldMapHandle` qua `useImperativeHandle`:
  `centerOnUnit(courseId, unitIndex)` (bay + chọn đảo) và
  `centerOnBand(band)` (bay tới vùng khối lớp). Mở app lần đầu camera tự
  đặt (không hoạt họa) vào đảo đang học ở scale 0.85.

## 3. File sửa: `src/app/(tabs)/index.tsx`

- Bỏ `ScrollView` toàn trang, bỏ render `MagicalGardenScene` và `LandCard`
  (cả hai file vẫn giữ nguyên trong repo, như tiền lệ `adventure-node`).
- Hàng chip 3 vương quốc ngay dưới header: chạm = đổi khóa + bay camera
  tới đảo đang học của khóa đó (qua ref + effect chờ đổi khóa); chạm lại
  khóa đang chọn = bay về đảo đang học.
- 3 nút nhỏ "Tiểu học/THCS/THPT" phủ góc trái trên bản đồ: bay camera tới
  vùng tương ứng, KHÔNG ẩn đảo nào (thay chip lọc chặng cũ).
- `GardenDashboard` chuyển nguyên vẹn vào panel lớp phủ mở bằng nút nổi
  "🎯 Nhiệm vụ & thành tích" (panel có backdrop, nút đóng, cuộn dọc bên
  trong); thẻ "Gợi ý hành trình" và thẻ "Phần thưởng của em" cũng nằm
  trong panel này, hành vi "Học từ đây" đổi thành bay camera + mở bảng
  chi tiết đảo gợi ý.
- Nút "Tiếp tục học": giữ nguyên component, hành vi đổi thành bay camera
  tới đảo hiện tại + mở bảng chi tiết đảo đó (không nhảy thẳng vào bài).
- MissionPanel: trạng thái chọn bài nay mang theo `courseId` của đảo được
  chạm; `missionView` vẫn tính bằng ĐÚNG công thức cũ nhưng trên dữ liệu
  của khóa chứa bài đó (completedLessons/currentIndex/totalLessons của
  khóa đó) — với bài thuộc khóa đang chọn thì kết quả y hệt trước.
- Dữ liệu bản đồ cho cả 3 khóa dựng từ `useCourseContent` × 3 +
  `progress.courses[courseId]`; store/công thức khóa
  (`globalIndex > currentLessonIndex`, `isAllUnlocked`) giữ nguyên 100%.

## 4. Không thay đổi

- Nội dung packs: 80 unit / 314 bài / 2488 câu (đối chiếu lại bằng test).
- Store, các route khác, rewards/ranks/competitions/leaderboard,
  `land-card.tsx`, `magical-garden-scene.tsx`, `adventure-node.tsx` (giữ file).
- Toàn bộ chữ hiển thị mới đều thuần Việt.

## 5. Kiểm chứng (đã chạy ở máy)

| Kiểm tra | Kết quả |
|---|---|
| `node scripts/test-worldmap.mjs` (mới, 39 mục tĩnh) | **39/39 PASS** |
| `node scripts/test-garden.mjs` | **14/14 PASS** (gồm baseline 80/314/2488 + 80 tên đảo) |
| `node scripts/test-rewards.mjs` | **9/9 PASS** |
| `node scripts/test-ranks.mjs` | **12/12 PASS** |
| `node scripts/test-competitions.mjs` | **20/20 PASS** |
| `npx tsc --noEmit` | **0 lỗi** |
| `npx expo export --platform web` | **PASS** |
| `dist/index.html` chứa "Đảo Phú Quốc" | ✓ |
| `dist/index.html` chứa nhãn vùng "Khối Tiểu học" (+ Chặng 2/3) | ✓ |
| `dist/index.html` chứa chip "Vương quốc Cổ Tích/Hoa Anh Đào" + nút "Nhiệm vụ & thành tích" | ✓ |

## 6. Chưa kiểm chứng (cần thử trên trình duyệt/thiết bị thật sau khi live)

- Cảm giác kéo/chụm thật trên cảm ứng và chuột (PanResponder trên web),
  độ mượt khi kéo với 80 đảo, và vị trí neo khi zoom chụm 2 ngón.
- `transformOrigin: "0 0"` trên bản Android (APK) — bản web đã đúng theo
  export; APK chưa build lại đợt này theo chủ trương web trước.
- Bố cục bảng chi tiết đảo/panel trên màn hẹp và dark mode.
