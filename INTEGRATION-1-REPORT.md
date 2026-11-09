# INTEGRATION-1-REPORT — Đợt 1 tích hợp nguồn mở: NỀN DỮ LIỆU

Đợt tích hợp nguồn mở đầu tiên sau redesign, theo đúng thứ tự đã chốt
(FSRS → CC-CEDICT → CEFR-J/NGSL-NDL → HSK + Tanos → ECDICT + ipa-dict
→ Unihan + wordfreq) và kết quả kiểm kê ở
`~/workspace/your_files/PIGLINGO-RESOURCES-AUDIT*.md`. Nguyên tắc xuyên
suốt: mọi bổ sung là **cộng thêm metadata / dữ liệu tra cứu** cho từ
vựng sẵn có — baseline nội dung giữ nguyên **80 unit / 314 bài /
2.488 câu** (đếm lại từ packs trong test hợp nhất); không mất tiến
độ/XP/dữ liệu người dùng; giao diện thuần Việt; không nguồn nào thuộc
danh sách LOẠI của kiểm kê được đưa vào. **Không upload GitHub, không
chạy SQL.**

Điều phối: 3 agent con làm 3 mảng độc lập (FSRS / dữ liệu Anh / dữ
liệu Trung–Nhật) theo schema cố định; điều phối viên hợp nhất
(`lexicon.ts`, component hiển thị, màn Nguồn dữ liệu), chạy toàn bộ
kiểm chứng cuối và viết báo cáo này.

## 1. FSRS — thay thuật toán ôn tập (ĐẠT, dùng thư viện thật)

- **Thư viện:** `ts-fsrs` **6.0.0** (MIT, kèm `@open-spaced-repetition/srs-kit`)
  cài qua npm thành công; Metro bundle + tsc + export đều PASS nên
  dùng thư viện thật, không cần bản cài tương đương. Cấu hình:
  `request_retention 0.9`, fuzz **tắt** (lịch tất định), learning steps
  mặc định của thư viện (1m, 10m / relearning 10m).
- **Trước:** `src/lib/srs.ts` tự chế kiểu SM-2 — `SrsEntry {interval,
  ease, dueAt, streak}`, khoảng lặp 1 → 3 → interval×ease, ease kẹp
  1,3–3,0.
- **Sau:** entry là trạng thái thẻ FSRS dạng số thuần JSON-serializable
  (`dueAt, stability, difficulty, elapsedDays, scheduledDays,
  learningSteps, reps, lapses, state 0–3 khớp enum của ts-fsrs,
  lastReview`). Chữ ký bề mặt giữ nguyên — `reviewWord(entry, quality
  0|1|2)` (0=Again, 1=Hard, 2=Good), `isDue`, `dueInDays` — nên
  `practice.tsx` và hai điểm gọi trong `store.ts` **không phải sửa**.
- **Giữ 100% lịch sử (hàm `convertLegacyEntry(legacy, wordStats?)`):**
  (a) `dueAt` giữ **nguyên** của thẻ cũ; (b) `reps = max(streak,
  wordStats.correct)`, `lapses = wordStats.wrong` (thiếu stats → 0);
  (c) `stability ≈ interval` cũ (interval = 0 mà reps > 0 → 1; reps = 0
  → 0 theo quy ước thẻ rỗng của FSRS — ts-fsrs 6 văng lỗi nếu D > 0 mà
  S = 0); (d) `difficulty` ánh xạ đảo từ ease cũ, kẹp 1–10; (e)
  `lastReview` từ `wordStats.lastSeen`. Áp dụng ở **cả hai đường**:
  migrate của store gọi `normalizeSrsRecord` ở cả hai nhánh (bản ghi
  hiện tại + legacy v1) **và** chuyển đổi lười trong
  `reviewWord/isDue/dueInDays/dueSrsWords` (cần thiết vì persist không
  đặt version nên migrate không đảm bảo chạy trên máy người dùng cũ;
  đường lười không có wordStats nên lapses = 0 — đã ghi chú trong code).
- **Kiểm chứng:** `scripts/test-fsrs.mjs` **15/15** — fixture lịch sử
  4 entry (streak cao, interval = 0, thiếu wordStats, ease sàn): số
  entry và `dueAt` từng entry giữ nguyên sau chuyển đổi; review Good ở
  cả 3 trạng thái không bao giờ hẹn vào quá khứ; Again trên thẻ Review
  tăng lapses và hẹn lại ≈ now; entry mới có state New. Test hợp nhất
  (mục 8) khẳng định lại ở tầng record.
- **Thay đổi hành vi nhìn thấy được (cố ý, đúng FSRS):** từ mới trả lời
  đúng lần đầu quay lại sau **10 phút** (learning step, state Learning)
  thay vì 1 ngày như SM-2, tốt nghiệp Review ở lần Good kế tiếp
  (interval đầu ≈ 2 ngày); Again trên thẻ **mới** không tăng lapses
  (đúng đặc tả FSRS — lapses chỉ tăng khi quên ở trạng thái Review).

## 2. CC-CEDICT — dữ liệu tiếng Trung (ĐẠT)

- **Nguồn:** file chính thức qua MDBG
  (`cedict_1_0_ts_utf-8_mdbg.txt.gz`, header bản phát hành
  `2026-11-09T04:23:50Z`, 125.397 mục), giấy phép **CC BY-SA 4.0**.
- **Đầu ra:** trường `pinyin` (đã chuyển số → dấu theo quy tắc nguyên
  âm chuẩn), `gloss` (tối đa 3 nghĩa Anh, đã lọc chú thích lượng từ),
  `trad` (chỉ khi khác giản thể) trong `src/content/lexicon/zh.json`.
  Phủ: pinyin + gloss **204/208 từ (98,1%)**; 104 từ có chữ phồn thể
  khác giản thể. Đồng âm được phân định bằng `romanization` sẵn có của
  app (vd 便宜 → "pián yi").
- **Quy tắc hợp nhất (đã ghi trong `lexicon.ts` + `word-meta.tsx`):**
  nghĩa tiếng Việt và pinyin `romanization` của app **luôn là chính,
  không bị ghi đè**; dữ liệu CC-CEDICT là tra cứu phụ — gloss chỉ hiện
  ở Sổ tay dưới nhãn "Tham khảo (tiếng Anh)", pinyin CC-CEDICT chỉ
  được mượn để hiển thị khi app chưa có `romanization` cho từ đó.

## 3. CEFR-J + NGSL + New Dolch — thẻ cấp độ tiếng Anh (ĐẠT)

- **Nguồn:** cả ba đều tải từ **trang chính thức** (cefr-j.org —
  `CEFRJ_wordlist_ver1.6.zip`; newgeneralservicelist.com — NGSL 1.2 +
  NDL 1.1), không phải dùng mirror.
- **Đầu ra** trong `en.json`: `cefr` (chuẩn hóa về A1/A2/B1/B2; nhiều
  từ loại lấy cấp thấp nhất; dạng biến đổi tra lemma qua trường
  `exchange` của ECDICT) phủ **205/216 (94,9%)**; `ngslRank` **158
  (73,1%)**; `dolch` **154 (71,3%)**.
- **Hiển thị:** chip "CEFR A1" và chip "Từ cơ bản" (Dolch) cạnh thẻ từ
  ở Sổ tay, tab Ôn tập và thẻ từ của Luyện Đọc (component dùng chung
  `src/components/word-meta.tsx`) — không thiết kế lại màn hình nào.

## 4. HSK mapping + Tanos JLPT (ĐẠT)

- **HSK:** chỉ lấy **lớp ánh xạ từ → cấp** từ
  `drkameleon/complete-hsk-vocabulary` (MIT; không lấy gloss của repo
  này). Phủ **184/208 (88,5%)**, phân bố cấp 1→57, 2→37, 3→43, 4→27,
  5→13, 6→6, 7→1. *Lưu ý dữ liệu:* trong bản repo hiện hành, tiền tố
  `new-*` là GF0025-2021, còn đề cương thi mới nhất mang tiền tố
  `newest-*` (repo cập nhật 2026-02) — pipeline cài ưu tiên
  `newest-*` → `new-*` để đúng ý định "đề cương mới nhất trước", đã
  ghi trong provenance. Chip "HSK n" hiện ở cùng các vị trí như CEFR.
- **JLPT:** nhãn của **Tanos / Jonathan Waller (CC BY)** qua mirror
  `jamsinclair/open-anki-jlpt-decks` (README của mirror ghi rõ dựa
  trên tanos.co.uk; trang tanos.co.uk không kết nối được tại thời
  điểm tích hợp — đúng phương án dự phòng của kiểm kê). Phủ **139/214
  (65,0%)**: N5→82, N4→23, N3→25, N2→9. Khớp theo dạng chữ trước,
  cách đọc sau; không khớp thì để trống, không tự gán.
- **Ghi "ước lượng cộng đồng" ở mọi nơi hiển thị JLPT:** chip hiện
  dạng "JLPT N5*", Sổ tay có dòng chú thích dưới danh sách từ (*Cấp
  JLPT là ước lượng của cộng đồng (Tanos) — JLPT không công bố danh
  sách từ chính thức*), và màn Nguồn dữ liệu ghi rõ điều này.
  *Số liệu theo nguồn, không tự sửa:* あ nằm ở danh sách N4 của mirror
  (mục liên từ "Ah"), ありがとう chỉ có ở danh sách N3 — giữ nguyên
  theo nguồn và đã ghi chú trong provenance.

## 5. ECDICT + ipa-dict en_US (+ CMUdict) — phiên âm IPA (ĐẠT)

- **ipa-dict `en_US`** (MIT) là nguồn IPA chính; **ECDICT** (MIT) bổ
  sung: phonetic dự phòng cho 2 cụm từ, `frq` (hạng COCA) phủ **187
  (86,6%)**, `gloss` (định nghĩa Anh rút 1 dòng) phủ **204 (94,4%)**.
  IPA tổng phủ **207/216 (95,8%)**. ⚠️ File `en_UK` **không được tải
  và không được dùng** (GPL) — đúng cảnh báo của kiểm kê.
- **CMUdict:** không nhúng file riêng — dữ liệu `en_US` của ipa-dict
  vốn được tạo **từ chính CMUdict** (qua cmudict-ipa, đều MIT), nên
  CMUdict giữ vai trò nguồn gốc/kiểm chứng và được ghi công trong màn
  Nguồn ("© Carnegie Mellon University, BSD 2-Clause") thay vì nhân
  đôi dữ liệu ARPAbet không hiển thị được.
- **Hiển thị:** IPA in nghiêng ngay dưới từ ở Sổ tay, tab Ôn tập và
  thẻ từ Luyện Đọc (chung `WordMeta`).

## 6. Unihan + wordfreq — metadata ký tự & tần suất (ĐẠT)

- **Unihan 18.0** (Unicode License v3, tải từ unicode.org, đọc trường
  theo đúng tên file của phiên bản): `chars-zh.json` phủ **281/281**
  ký tự Hán của từ vựng zh (đủ `def`, `strokes`, `radical`, `reading`
  = kMandarin); `chars-ja.json` có **58** kanji (94 kana không có
  trong Unihan — bỏ qua theo thiết kế). Đây là metadata tra cứu/sắp
  xếp; hoạt động tập nét vẫn dùng dữ liệu Hanzi Writer/KanjiVG của
  Đợt kỹ năng. *Khác biệt nguồn, ghi để đối chiếu:* số nét của 猫 theo
  Unihan (kTotalStrokes) là 12, theo Hanzi Writer là 11 — hai quy ước
  đếm khác nhau, app không trộn hai nguồn cho cùng một mục đích.
- **wordfreq 3.1.1** (dữ liệu CC BY-SA 4.0, mã Apache-2.0): `zipf`
  phủ zh **208/208**, ja **213/214**.
- **Cách dùng cho sắp xếp:** `lexicon.freqScore(courseId, target)`
  (Anh: hạng COCA/NGSL, từ Dolch; Trung/Nhật: Zipf). Tab Ôn tập đổi
  thứ tự danh sách "Từ đã học" thành: **đến hạn ôn trước → phổ biến
  hơn trước → học gần đây**; chỉ đổi thứ tự hiển thị, không đổi nội
  dung học hay lịch ôn.

## 7. Màn "Nguồn dữ liệu & Giấy phép" (ĐẠT)

- Route mới **`/data-sources`** (`src/app/data-sources.tsx`, đăng ký
  modal trong `_layout.tsx`), lối vào: mục **"Nguồn dữ liệu & Giấy
  phép"** trong danh sách cài đặt ở tab **Hồ sơ** (cùng khu với lối
  vào Dành cho ba/mẹ và Quản trị).
- Liệt kê **12 nguồn** đang dùng trong app — đủ cả hai nguồn của Đợt
  kỹ năng (Hanzi Writer/Make Me a Hanzi + KanjiVG) và 10 nguồn đợt
  này (ts-fsrs, CC-CEDICT, HSK mapping, Tanos, CEFR-J, NGSL/NDL,
  ECDICT, ipa-dict + CMUdict, Unihan, wordfreq) — mỗi nguồn gồm: dùng
  vào việc gì, giấy phép, và câu ghi công đúng yêu cầu của giấy phép
  (gồm trích dẫn nguyên mẫu CEFR-J của Tono Lab, ghi chú JLPT ước
  lượng cộng đồng, ghi công CMU/Carnegie Mellon, Arphic, Ulrich Apel).

## 8. Kiểm chứng tổng (điều phối viên tự chạy ở bước hợp nhất)

- **Test mới:** `scripts/test-fsrs.mjs` **15/15** và
  `scripts/test-data-integration.mjs` **13/13** — khẳng định: chuyển
  đổi FSRS giữ nguyên số entry + `dueAt` và lịch mới không nằm trong
  quá khứ; subset CC-CEDICT khớp từ zh thật (猫 = "māo" + gloss chứa
  "cat"); khóa của mọi file lexicon chỉ gồm từ vựng thật của app, từ
  không khớp thì vắng mặt; tỉ lệ gắn thẻ (IPA ≥ 85%, CEFR ≥ 85%, HSK
  ≥ 75%, JLPT ≥ 55% — số thật đều cao hơn ngưỡng); IPA có cho
  dog/cat/apple; Unihan phủ đúng tập ký tự zh; nối dây tĩnh (route,
  lối vào, ghi công bắt buộc); baseline 80/314/2488.
- **Toàn bộ test cũ PASS nguyên số lượng:** games-stability 14,
  service-worker 18, skills 15, spin 20, pets 21, adventure-map 26,
  companion 9, lesson-ui 16, level-floor 11, garden 14, rewards 9,
  ranks 12, competitions 20, provinces 30, worldmap 76.
- **`npx tsc --noEmit`: 0 lỗi.** **`npx expo export --platform web`:
  PASS** — `dist/` có `data-sources.html` và đủ các route kỹ năng.
- **Dung lượng dữ liệu mới (tổng ≈ 114 KB):** en.json 38.732 B;
  zh.json 26.714 B; ja.json 10.236 B; chars-zh.json 33.536 B;
  chars-ja.json 7.747 B. (File thô nguồn ~120 MB ở thư mục tạm, không
  vào repo.) `package.json` thêm 1 dependency: `ts-fsrs ^6.0.0`.

## 9. File tạo / sửa

**Tạo mới:** `src/lib/lexicon.ts`; `src/components/word-meta.tsx`;
`src/app/data-sources.tsx`; `src/content/lexicon/{en,zh,ja,chars-zh,chars-ja}.json`;
`scripts/build-lexicon-en.mjs`, `scripts/build-lexicon-cjk.mjs`,
`scripts/build-lexicon-freq.py`; `scripts/lexicon-sources-en.md`,
`scripts/lexicon-sources-cjk.md` (provenance); `scripts/test-fsrs.mjs`,
`scripts/test-data-integration.mjs`; `INTEGRATION-1-REPORT.md`.

**Sửa:** `src/lib/srs.ts` (viết lại quanh FSRS); `src/lib/store.ts`
(chỉ điểm nối migrate/normalize srs); `package.json` +
`package-lock.json` (ts-fsrs); `src/app/guidebook/[unitId].tsx`
(dòng metadata + chú thích JLPT); `src/app/(tabs)/practice.tsx`
(WordMeta + thứ tự theo tần suất); `src/app/skills-read.tsx`
(WordMeta trong thẻ từ); `src/app/_layout.tsx` (đăng ký route);
`src/app/(tabs)/profile.tsx` (lối vào màn Nguồn).

## 10. Giới hạn còn lại / chưa tích hợp

- **Không có nguồn nào trong phạm vi Đợt 1 bị loại vì tải lỗi hay
  giấy phép đổi.** Hai điểm phải ghi rõ: (1) **CMUdict không nhúng
  file riêng** — vai trò của nó đã nằm trong ipa-dict en_US (dữ liệu
  dẫn xuất từ CMUdict) và được ghi công đầy đủ; (2) **Tanos lấy qua
  mirror** có provenance vì tanos.co.uk không kết nối được khi tích
  hợp — cùng với CEFR-J, đây là hai nguồn kiểm kê dặn **lưu bản
  chụp/trang điều khoản trước khi phát hành thương mại** (CEFR-J đợt
  này đã tải thẳng từ trang chính thức nên rủi ro thấp hơn; Tanos vẫn
  nên lưu bản chụp trang sharing kèm ngày khi có dịp).
- 8 cụm từ tiếng Anh không nguồn nào có dữ liệu (`as if`, `even if`,
  `in case`, `would have`...) → không có metadata, hiển thị như cũ —
  không bịa. 4 cụm tiếng Trung (多少钱， 怎么走...) chỉ có điểm tần suất,
  không có mục CC-CEDICT/HSK riêng — đúng dữ liệu nguồn.
- Chưa kiểm chứng trên thiết bị thật: cảm giác lịch ôn FSRS sau vài
  ngày sử dụng thật của bé, và bố cục dòng metadata trên điện thoại
  nhỏ — như mọi đợt, phần này chờ nghiệm thu trên máy thật.
- Dữ liệu ShareAlike (CC-CEDICT, NGSL/NDL, wordfreq) được giữ trong
  các file JSON riêng dưới `src/content/lexicon/` kèm ghi công, không
  trộn lẫn với dữ liệu MIT/CC BY — đúng nguyên tắc của kiểm kê.
