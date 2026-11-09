# SKILLS-REPORT — Khu Luyện 4 Kỹ Năng (Nghe / Nói / Đọc / Viết)

Đợt triển khai theo spec người dùng 09/11/2026 ("chỉ học từ vựng thì
nhàm chán"): thêm khu **Luyện kỹ năng** cho Piglingo Kids, xây trên cây
code hiện tại (redesign Phase 2–4 + thú cưng + vòng quay). Nội dung mỗi
buổi luyện **sinh tự động từ từ vựng + câu mẫu sẵn có của khóa đang
học** — không thêm dữ liệu nội dung, không sửa baseline
**80 unit / 314 bài / 2.488 câu**, không upload GitHub, không chạy SQL.

## Kiến trúc + cách sinh nội dung

- **Động cơ thuần `src/lib/skills.ts`**: `buildSkillPool(courseId,
  completedLessons, learnerLevel)` dựng pool của khóa đang học theo
  đúng thứ tự ưu tiên của spec:
  - **(a) tier 0** — bài **đã học xong**;
  - **(b) tier 1** — bài **ở biên hiện tại** (theo
    `effectiveFrontierIndex`, đã gồm sàn cấp độ) **+ unit của nó**;
  - **(c) tier 2** — các bài tiếp theo.
  Từ vựng gắn theo unit (unit chứa bài đã học/biên thì từ của unit mang
  tier đó), câu mẫu gắn theo từng bài. Câu mẫu trích từ chính các bài
  tập sẵn có: `fillBlank` (câu đích = `audioTarget`, nghĩa =
  `translation`, từ khuyết = đáp án đúng) và `wordBank` (câu đích =
  `audioTarget` hoặc đáp án ghép thẻ, kèm romaji/pinyin ở dòng 2 của
  prompt với ja/zh). Pool tối đa 90 từ + 60 câu, ưu tiên tier thấp.
  Hàm chỉ đi theo thứ tự bài của khóa nên chạy cho **cả 3 khóa
  en/ja/zh và mọi band** (test đã xác nhận biên dời sang THCS khi học
  hết Tiểu học, và sàn cấp độ "chuyen-nghiep" được tôn trọng).
- **Mỗi buổi = 5 hoạt động**, gieo hạt tất định bằng
  `skillRngFor({ day, courseId, skill, attempt })` (mulberry32 +
  FNV-1a): cùng ngày + cùng số buổi -> cùng buổi (test khóa được);
  bấm "Luyện buổi nữa" (attempt + 1) -> buổi khác trong ngày, không
  lặp y hệt. Chọn mẫu trong buổi thiên vị tier (đã học 3 : biên 2 :
  tiếp theo 1), nhiễu ưu tiên **cùng unit** trước.
- **Điểm vào**: hub `src/app/skills.tsx` ("🎯 Luyện kỹ năng", 4 thẻ
  theo màu vương quốc của khóa đang học, chạm ≥ 48px qua Card +
  Pressable cỡ lớn); lối tắt **🎯 Kỹ năng** ở mục "Khám phá thêm" trên
  dashboard và nút **🎯** cạnh nút 🐾 trên header màn bản đồ vương
  quốc. 4 route riêng `skills-listen / skills-speak / skills-read /
  skills-write` đăng ký modal trong `_layout.tsx` như các route khác.
- **Khung chung `src/components/skills-ui.tsx`** (phong cách Phase 4):
  `SkillFrame` (GameHeader + ProgressBar màu vương quốc),
  `SkillFeedbackBar` (dải đúng/sai + nút Tiếp tục cố định dưới đáy),
  `SkillResultCard` (WinCard + XP), `useSkillPool`, và
  `SkillPetCheer` — thú đồng hành cổ vũ bằng hồ câu khen/động viên sẵn
  có của `lib/pets.ts` (PRAISE_RIGHT / ENCOURAGEMENT_WRONG qua
  companionPetFor). LessonPet gốc không tái dùng được vì nó gắn chặt
  với một Exercise của bài học; bản gọn này **chỉ cổ vũ, không có
  skill gợi ý** nên không thể lộ đáp án.

## Mỗi kỹ năng gồm những dạng nào

### 🎧 Nghe (`skills-listen.tsx`) — TTS bằng `speakTarget` (expo-speech/kênh đọc sẵn có)
5 hoạt động xoay vòng 3 dạng:
1. **Nghe từ -> chọn đúng từ** trong 4 lựa chọn (nhiễu cùng unit trước);
   lựa chọn hiện chữ của từ vì đây là dạng nhận diện mặt chữ theo âm.
2. **Nghe câu -> chọn đúng nghĩa tiếng Việt** trong 4 nghĩa. **Không
   hiện chữ của câu đích trước khi trả lời** — chỉ có nút loa (tự phát
   khi vào hoạt động + bấm nghe lại tùy ý); sau khi trả lời mới hiện
   câu gốc + phiên âm + nghĩa để đối chiếu.
3. **Nghe câu -> điền từ còn thiếu**: hiện câu với `＿＿＿` (không hiện
   nghĩa, không hiện câu đầy đủ), chọn từ trong ngân hàng 4 từ; từ
   khuyết lấy đúng từ bài fillBlank gốc hoặc một từ vựng có mặt trong
   câu. Sau khi trả lời hiện câu hoàn chỉnh + nghĩa.

### 🎤 Nói (`skills-speak.tsx`) — TÁI DÙNG module sẵn có, không viết lại
Buổi gồm **5 mục** (ưu tiên 3 câu mẫu + 2 từ) từ pool. Mỗi mục dùng
nguyên bộ `src/features/speaking`: `usePronunciationRecorder` (ghi âm /
phát lại), `RecordButton`, `MockPronunciationProvider` (chấm),
`PronunciationResultView` (hiện sao + điểm + nhận xét). Luồng: nghe mẫu
(TTS qua `speakTarget`) -> ghi âm đọc theo -> nghe lại giọng mình ->
hiện điểm. Bé chuyển mục bằng chip số 1–5 / nút trước-sau; buổi hoàn
thành khi **đã thử ghi âm đủ 5 mục**.
**Điểm nói là điểm MÔ PHỎNG** — `PronunciationResultView` sẵn có tự
gắn nhãn "Đây là điểm luyện tập mô phỏng (chưa nghe giọng thật)" ngay
trong thẻ kết quả, và màn kết quả buổi nhắc lại điều này. Không nơi
nào trong khu kỹ năng quảng cáo chấm phát âm thật.

### 📖 Đọc (`skills-read.tsx`)
- **Đoạn đọc**: ghép **3–5 câu mẫu của cùng một unit** trong pool
  (unit ưu tiên tier thấp nhất có đủ câu), hiện phiên âm nếu dữ liệu
  có. **Chạm vào từng từ** trong đoạn -> thẻ nhỏ: nút loa đọc từ đó
  (TTS) + nghĩa tiếng Việt tra bằng `lookupWordInCourse` trong từ vựng
  sẵn có của khóa; **từ không có trong từ điển thì chỉ đọc, kèm dòng
  "chưa có trong từ điển" — không bịa nghĩa**.
- **4 câu hỏi** (cộng bước đọc đoạn = 5 hoạt động), tất cả suy trực
  tiếp từ đoạn (test khóa từng tính chất):
  1. *Nghĩa của từ trong đoạn*: từ thật có mặt trong đoạn, đáp án là
     nghĩa của nó, nhiễu là nghĩa các từ khác cùng unit.
  2. *Đúng/sai*: giữ nguyên một câu của đoạn (Đúng) hoặc **hoán đổi
     đúng một từ khóa** bằng từ khác cùng unit (Sai).
  3. *Chọn câu CÓ trong đoạn*: 1 câu thật + 2 câu đã hoán đổi từ (hoặc
     câu của unit khác) làm nhiễu.
  4. Thêm một câu nghĩa-từ (từ khác) hoặc đúng/sai thứ hai.

### ✍️ Viết (`skills-write.tsx`)
1. **Xếp thẻ từ thành câu mẫu đúng** (thẻ xáo trộn gieo hạt, chạm để
   xếp/bỏ, nút Kiểm tra khi đủ thẻ).
2. **Điền chữ/từ còn thiếu**:
   - Anh (**chính tả**): giấu 1–3 chữ cái của một từ, bé chọn chữ từ
     ngân hàng chữ (chữ bị giấu + 2 chữ nhiễu) điền theo thứ tự.
   - Trung/Nhật (**chọn chữ còn thiếu**): một chữ trong từ bị thay
     bằng `＿`, chọn trong 4 chữ (nhiễu lấy từ các chữ khác cùng unit).
3. **Tập thứ tự nét** (Trung/Nhật — xem mục dữ liệu nét dưới đây):
   bấm **▶ Xem nét mẫu** để xem các nét hiện lần lượt theo thứ tự,
   sau đó ở mỗi bước chọn **"nét tiếp theo là nét nào"** trong 3 hình
   nét ứng viên (nét đúng + 2 nét khác của cùng chữ, hiện trên nền
   bóng mờ của cả chữ để bé nhìn vị trí); chọn đúng -> nét hiện lên
   khung vẽ SVG; chọn sai -> được thử lại, hoạt động chỉ tính "đúng"
   nếu đi hết các nét mà chưa sai lần nào.
4. **Dạng dự phòng** (chỉ khi pool hiện tại không có chữ nào có dữ
   liệu nét): **xếp đúng thứ tự các chữ** của từ nhiều chữ, với **mẫu
   chữ lớn mờ** hiện ở đầu thẻ làm mẫu nhìn — không chấm thứ tự nét.

## Dữ liệu nét: LẤY ĐƯỢC DỮ LIỆU THẬT (không dùng dự phòng trong thực tế)

Script `scripts/build-strokes.mjs` tải và trích gọn **đúng các chữ
xuất hiện trong từ vựng** của hai khóa, lưu ở
`src/content/strokes-zh.json` (486 KB) + `src/content/strokes-ja.json`
(67 KB), truy cập qua `src/lib/strokes.ts`:

| Khóa | Nguồn | Giấy phép | Phủ sóng |
|---|---|---|---|
| zh-vi | **Hanzi Writer data** (`hanzi-writer-data@2.0`, jsDelivr) — mỗi chữ gồm `strokes` (path SVG) + thứ tự nét | Dữ liệu nét xây từ phông **Arphic — Arphic Public License** (mã Hanzi Writer: MIT) | **281/281 chữ** trong từ vựng zh (số nét 1–16; hoạt động tập nét dùng chữ 2–14 nét) |
| ja-vi | **KanjiVG** (kanjivg.tagaini.net, file SVG theo mã Unicode) — trích các path `-s1, -s2, ...` theo đúng thứ tự | **CC BY-SA 3.0** (© Ulrich Apel / KanjiVG) | **152/152 chữ** (kana + kanji) trong từ vựng ja |

Toạ độ zh đã chuẩn hoá về hộp bao riêng của từng chữ (lật trục Y về hệ
SVG) trong script build; ja giữ nguyên hệ 109×109 của KanjiVG. App vẽ
bằng `react-native-svg` (đã có sẵn). **Dòng ghi nguồn hiện ngay cuối
màn Luyện Viết** ("Thứ tự nét tiếng Trung: dữ liệu Hanzi Writer (chữ
Arphic, giấy phép Arphic Public License)." / "Thứ tự nét tiếng Nhật:
dữ liệu KanjiVG (kanjivg.tagaini.net), giấy phép CC BY-SA 3.0.").
Khóa Anh không có dữ liệu nét (bảng chữ Latin) — buổi viết của Anh
dùng dạng chính tả thay thế. Vì phủ sóng đạt 100%, dạng dự phòng
(xếp thứ tự chữ + mẫu mờ) hiện **không kích hoạt** với dữ liệu thật;
nó chỉ là lưới an toàn khi pool không chứa chữ có dữ liệu.

## Điểm: nối XP + nhiệm vụ ngày (không vé vòng quay)

- Store thêm đúng **một action** `completeSkillSession(perfect)`:
  cộng **15 XP** (hoàn hảo **+5**) vào khóa đang học + sổ XP ngày —
  cùng sổ sách `bumpDailyXp` / `activeDays` như `completeLesson` — và
  ghi buổi vào nhật ký ngày: `activeDays[hôm nay].lessons + 1` (hoàn
  hảo thì `perfect + 1`). `dailyQuests` đếm quest "Hoàn thành 3 bài"
  và "Có 1 bài không sai câu nào" từ chính `activeDays` này, nên
  **buổi luyện tính vào nhiệm vụ ngày như một bài** — đây là cách nối
  tối thiểu, không sửa hàm `dailyQuests`. (Hệ quả kèm theo, đúng bản
  chất: ngày có luyện kỹ năng cũng sáng ô "ngày hoạt động" trong dải
  7 ngày vì dải đó cũng đọc `activeDays.lessons`.)
- "Hoàn hảo" của buổi: Nghe/Đọc/Viết = đúng hết các hoạt động/câu hỏi
  được chấm; Nói = ghi âm đủ cả 5 mục (theo spec).
- **TUYỆT ĐỐI không cấp vé vòng quay**: `completeSkillSession` không
  đụng `spinTickets` / `completedLessons` / streak / điểm thú / sao;
  cả store vẫn chỉ có đúng **một** nơi gọi `ticketsForCompletion`
  (trong `completeLesson`) — test tĩnh khóa điều này, và 4 màn kỹ
  năng đều không chứa `spinTickets`/`applySpinWin`. XP bài học 15/+5,
  claim rương chặng, điều kiện khóa bài đều giữ nguyên.

## File tạo mới

- `src/lib/skills.ts` — động cơ nội dung thuần (pool, hạt, 4 bộ sinh buổi).
- `src/lib/strokes.ts` — truy cập dữ liệu nét + ghi công nguồn.
- `src/content/strokes-zh.json`, `src/content/strokes-ja.json` — dữ
  liệu nét trích gọn (sinh bởi script dưới đây).
- `scripts/build-strokes.mjs` — tải Hanzi Writer / KanjiVG, trích
  đúng chữ trong từ vựng, chuẩn hoá toạ độ zh.
- `src/components/skills-ui.tsx` — khung chung 4 màn (frame, pet cổ
  vũ, dải phản hồi, thẻ kết quả, hook pool).
- `src/app/skills.tsx` — hub Luyện kỹ năng.
- `src/app/skills-listen.tsx`, `src/app/skills-speak.tsx`,
  `src/app/skills-read.tsx`, `src/app/skills-write.tsx` — 4 màn kỹ năng.
- `scripts/test-skills.mjs` — 15 nhóm kiểm tra mới.
- `SKILLS-REPORT.md` — báo cáo này.

## File sửa

- `src/lib/store.ts` — thêm action `completeSkillSession` (chỉ thêm,
  không đổi action nào sẵn có).
- `src/app/_layout.tsx` — đăng ký 5 route skills* (modal).
- `src/app/(tabs)/index.tsx` — thêm lối tắt 🎯 "Kỹ năng" ở hàng lối
  tắt 2 của mục "Khám phá thêm".
- `src/app/map/[courseId].tsx` — thêm nút 🎯 cạnh nút 🐾 ở header bản
  đồ, mở `/skills`.

## Kiểm chứng (đã chạy thật)

- `node scripts/test-skills.mjs` — **15/15 PASS**:
  - Pool đúng thứ tự tier ở 3 khóa; biên rơi vào bài có câu mẫu -> câu
    đầu của pool là tier 1 của đúng bài đó; chưa học -> không tier 0;
    học hết Tiểu học -> biên ở band THCS và vẫn sinh được buổi; sàn
    cấp độ chuyen-nghiep được tôn trọng.
  - Sinh buổi tất định theo hạt (cùng hạt -> buổi giống hệt; khác số
    buổi -> khác); cả 3 khóa × 4 kỹ năng đều đủ buổi (5 hoạt động /
    5 mục nói / đoạn 3–5 câu + 4 câu hỏi).
  - Đáp án thuộc nguồn: nghe (đáp án duy nhất trong lựa chọn; điền từ
    ghép lại đúng câu gốc), nói (mục nào cũng là từ/câu của pool),
    đọc (từ hỏi nghĩa có thật trong đoạn; câu sai chỉ khác câu gốc
    đúng 1 từ và không trùng câu nào trong đoạn; câu chọn-đúng nằm
    trong đoạn), viết (unscramble là hoán vị của câu gốc; spell điền
    lại đúng từ, ngân hàng chứa đủ chữ bị giấu; gap-char đúng chữ tại
    vị trí khuyết).
  - Nét thật: spot-check độc lập — 猫 = 11 nét (Hanzi Writer), あ = 3
    nét (KanjiVG); hoạt động nét trong buổi zh/ja dùng đúng dữ liệu
    của chữ thuộc từ trong pool; Anh không có hoạt động nét/gap-char
    và có hoạt động chính tả.
  - Không vé quay + nối dây: store chỉ 1 nơi gọi
    `ticketsForCompletion`; `completeSkillSession` chứa đúng công
    thức XP + `lessons + 1`; 4 màn kỹ năng gọi `completeSkillSession`
    và không chứa `spinTickets`/`applySpinWin`; route/lối tắt/module
    nói được nối đúng.
  - Baseline **80 / 314 / 2488** giữ nguyên.
  - Hai khẳng định test ban đầu đã được viết lại cho đúng ngữ nghĩa
    dữ liệu (từ vựng gắn theo unit nên tier biên thể hiện ở câu mẫu;
    unit ở biên của ja chưa có câu mẫu) — có ghi chú lý do ngay trong
    file test; không khẳng định nào bị nới lỏng về đáp án/điểm.
- Toàn bộ test cũ **PASS nguyên số lượng, không sửa khẳng định nào**:
  spin 20, pets 21, adventure-map 26, companion 9, lesson-ui 16,
  level-floor 11, garden 14, rewards 9, ranks 12, competitions 20,
  provinces 30, worldmap 76.
- `npx tsc --noEmit` — **0 lỗi**.
- `npx expo export --platform web` — **PASS**; `dist/` có đủ
  `skills.html`, `skills-listen.html`, `skills-speak.html`,
  `skills-read.html`, `skills-write.html`.

## Người dùng sẽ thấy gì

- **Trang chủ** có thêm lối tắt 🎯 **Kỹ năng** (và nút 🎯 trên bản đồ
  vương quốc): mở ra khu **Luyện kỹ năng** với 4 thẻ lớn Nghe 🎧 /
  Nói 🎤 / Đọc 📖 / Viết ✍️ màu theo vương quốc đang học, ghi rõ mỗi
  buổi 5 hoạt động, xong buổi +15 XP (đúng hết +5).
- **Nghe**: loa to tự phát, chọn từ/nghĩa/từ còn thiếu; trả lời xong
  mới thấy câu gốc để đối chiếu; thú đồng hành khen/động viên ở mỗi
  câu.
- **Nói**: từng mục hiện câu/từ mẫu + nghĩa, nút "Nghe mẫu", nút micro
  ghi âm, nghe lại giọng mình, thẻ điểm có sao — kèm nhãn rõ ràng
  "điểm luyện tập mô phỏng".
- **Đọc**: đoạn ngắn bằng tiếng đang học, chạm từng từ để nghe đọc +
  xem nghĩa, rồi trả lời 4 câu hỏi về đoạn.
- **Viết**: xếp thẻ từ thành câu, điền chữ còn thiếu; ở tiếng Trung /
  Nhật có **tập viết theo thứ tự nét thật** — xem nét mẫu chạy rồi
  chọn nét tiếp theo trên khung vẽ; cuối màn có dòng ghi nguồn dữ
  liệu nét.
- Xong buổi nào, XP cộng ngay và **nhiệm vụ ngày nhích lên** như vừa
  học một bài; vòng quay không thêm vé (vé vẫn chỉ từ bài học/chặng).

## Giới hạn / chưa kiểm chứng trên máy thật

- **Chấm nói vẫn là MÔ PHỎNG** (MockPronunciationProvider sẵn có) —
  nhãn mô phỏng hiện trong chính thẻ điểm và màn kết quả buổi.
- Chưa kiểm chứng trên thiết bị thật: ghi âm trên web/Android thật
  (quyền micro, phát lại), cảm giác chạm ở hoạt động nét (khung SVG
  216px + thẻ ứng viên 88px), TTS từng thiết bị, và bố cục đoạn đọc
  trên điện thoại nhỏ.
- Dữ liệu nét zh làm gói web nặng thêm ~0,5 MB (JSON path đã rút gọn
  toạ độ nguyên) — chỉ nạp khi vào khu Viết; chưa đo thời gian tải
  thật trên mạng chậm.
- Buổi Đọc cần unit có ≥ 3 câu mẫu + ≥ 4 từ vựng: cả 3 khóa đều có
  unit đạt (test khóa), nhưng ở tiến độ rất sớm pool câu ít nên đoạn
  đọc luôn lấy từ unit có câu mẫu sớm nhất của khóa thay vì đúng unit
  đang học dở — đúng thiết kế ưu tiên của pool, ghi rõ để đối chiếu.
