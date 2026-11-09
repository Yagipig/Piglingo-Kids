# Nguồn dữ liệu tiếng Nhật — Đợt 2 (JMdict + KANJIDIC2 + kanjium)

Ngày tải: **2026-11-09**. File thô tải về `/tmp/lex-ja2/` (KHÔNG đưa vào repo).
Script sinh dữ liệu: `scripts/build-integration2-ja.mjs` (chạy lại được,
đọc từ vựng trực tiếp từ `src/content/packs/ja-vi.json` — 214 target duy
nhất, không hard-code danh sách từ; chạy lại cho kết quả giống hệt —
đã kiểm chứng bằng md5).

Đầu ra:
- `src/content/lexicon/ja.json` — **22.877 byte**, 213 entry như cũ
  (không thêm/xóa khóa từ; `jlpt`/`zipf` của Đợt 1 giữ nguyên từng giá
  trị — đã đối chiếu tự động), bổ sung các field `jmReading`,
  `jmGloss`, `pitch`, `pitchReading`.
- `src/content/lexicon/kanjidic-ja.json` — **9.832 byte**, 58 entry.
  File RIÊNG, không trộn với `chars-ja.json` của Unihan (Đợt 1).

Cách chạy lại:

```bash
mkdir -p /tmp/lex-ja2
curl -L -o /tmp/lex-ja2/JMdict_e.gz      http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
curl -L -o /tmp/lex-ja2/kanjidic2.xml.gz http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz
curl -L -o /tmp/lex-ja2/accents.txt https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt
node scripts/build-integration2-ja.mjs          # thêm --debug để xem từng quyết định khớp
```

---

## 1. JMdict (bản tiếng Anh JMdict_e) — EDRDG

- **URL phân phối chính thức:** http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
  (máy chủ của EDRDG). Header HTTP khi tải: `Last-Modified: Mon, 09 Nov
  2026 03:30:26 GMT`, dung lượng nén **10.594.690 byte**, giải nén parse
  được **219.040 entry**.
- **Giấy phép: CC BY-SA 4.0** — kiểm chứng tại trang giấy phép chính
  thức của EDRDG https://www.edrdg.org/edrdg/licence.html (đọc trực
  tiếp ngày tải): *"The dictionary files are made available under a
  Creative Commons Attribution-ShareAlike Licence (V4.0)"*, áp dụng cho
  cả JMdict và KANJIDIC2. Nghĩa vụ: ghi công EDRDG (mục Ghi công dưới
  đây), kèm liên kết giấy phép/tài liệu, và cập nhật dữ liệu định kỳ —
  script này chính là quy trình cập nhật: tải lại file mới nhất rồi
  chạy lại.
- **Cách khớp (thận trọng, ghi đầy đủ vì đây là phần dễ sai nhất):**
  ứng viên là các cặp (keb, reb) tôn trọng `<re_restr>`; khớp khi
  `keb == target` hoặc `reb == target`. Chấm điểm theo: loại khớp
  (keb nguyên dạng > entry kana làm headword > reb của entry kanji);
  mã ưu tiên của cặp (`nfXX` — hạng tần suất, rồi nhóm (P)
  news1/ichi1/spec1/gai1); **romanization của app** — với khớp keb,
  cách đọc đổi sang Hepburn phải nằm trong các lựa chọn romanization
  của app (đúng lựa chọn đầu +điểm cao nhất), **trái hẳn thì loại ứng
  viên**; **nghĩa tiếng Việt của app** bắc cầu sang tiếng Anh bằng
  bảng từ khóa nhỏ trong script (ví dụ "tóc"→hair, "mưa"→rain) — ứng
  viên có gloss chứa từ khóa được cộng điểm mạnh; cộng thêm khi target
  kana trùng nghĩa Việt với một target kanji của pack mà keb của ứng
  viên chính là target kanji đó （あめ "mưa" ↔ 雨 "mưa").
  Chỉ nhận ứng viên đứng đầu khi điểm ≥ 90 và hơn ứng viên thứ hai
  ≥ 25; cơ chế dự phòng khi hòa điểm: hai ứng viên thống nhất về từ
  khóa nghĩa thì lấy **gloss mà không lấy reading/pitch** (bản cuối
  không cần dùng tới). Không đạt thì để trống — không đoán.
- **Field sinh ra:** `jmReading` = reb của entry được chọn, chỉ ghi
  khi khác target (với target kanji đây là furigana kana; 39 entry);
  `jmGloss` = tối đa 2 gloss Anh của sense 1, riêng trường hợp sense 1
  không chứa từ khóa nghĩa nào mà sense sau có thì lấy gloss của sense
  khớp nghĩa sớm nhất (nhờ vậy ところ ra "was just doing; have just
  done" thay vì "place"). Nghĩa Việt của app luôn là chính; gloss này
  chỉ là tra cứu phụ.
- **Phủ:** `jmGloss` **146/214 (68,2%)**; trong 139 từ có nhãn JLPT
  (từ phổ thông): **120/139 (86,3%)**. 68 target không có JMdict:
  32 bài học bảng chữ cái kana đơn (native chỉ là tên âm tiết —
  bỏ theo thiết kế), 35 dạng chia động từ/tính từ （食べた, 行きたい,
  書かれた… — JMdict không có headword cho dạng chia, không suy gốc),
  và 電 (xem quyết định đáng chú ý).

## 2. KANJIDIC2 — EDRDG

- **URL:** http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz — nén
  **1.488.573 byte**; header trong file: `file_version 4`,
  **`database_version 2026-313`**, **`date_of_creation 2026-11-09`**;
  tổng 13.108 ký tự trong nguồn.
- **Giấy phép: CC BY-SA 4.0** (cùng trang giấy phép EDRDG ở mục 1).
- **Trích xuất:** chỉ các kanji thật xuất hiện trong từ vựng ja của
  app (58/58 ký tự — tập ký tự suy ra từ pack, không hard-code):
  mỗi ký tự có `on` (mảng, katakana như nguồn), `kun` (mảng, hiragana
  như nguồn, chỉ bỏ dấu `-` đánh dấu tiền/hậu tố ở hai đầu và khử
  trùng lặp; dấu `.` phân tách okurigana giữ nguyên như nguồn),
  `gloss` (tối đa 3 nghĩa Anh đầu), `strokes` (số nét đầu tiên của
  `stroke_count`).

## 3. kanjium — pitch accent

- **URL:** https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt
  — **3.226.405 byte, 124.137 dòng** (khớp số tác giả công bố);
  commit gần nhất chạm vào file (theo GitHub API):
  `685d4d723d6d20bf9beb169103aeac188eb067ad`, 2024-06-16.
- **Giấy phép: CC BY-SA 4.0** — kiểm chứng trong README của repo
  (tải cùng ngày): *"Everything in this package is licensed under the
  Creative Commons Attribution-ShareAlike 4.0 International license"*,
  dùng thương mại được. Dữ liệu nền gốc từ các dự án EDRDG; phần ký
  hiệu pitch-accent là đóng góp của Uros O. (câu ghi công bắt buộc
  nguyên văn ở mục Ghi công).
- **Cách khớp:** file có dạng `dạng chữ \t cách đọc kana \t vị trí
  mora rơi` (dòng dạng kana thì cột cách đọc để trống — khi đó dạng
  chữ chính là cách đọc). Chỉ lấy pitch khi **cặp (dạng chữ + kana)
  khớp chắc chắn**: dạng chữ là một keb của entry JMdict đã chọn (hoặc
  chính target) và kana là `pitchReading` = reb của entry đó; hoặc
  target toàn kana được chứng thực trực tiếp bằng một dòng dạng-kana
  trong accents.txt. Khi file cho nhiều giá trị (ví dụ `4,0`) lấy giá
  trị đầu. Không tự suy accent cho dạng chia động từ hay từ không có
  cặp khớp.
- **Phủ:** `pitch` + `pitchReading` **137/214 (64,0%)**; trong 139 từ
  có nhãn JLPT: **117/139 (84,2%)**. 77 target không có pitch gồm 32
  bài bảng chữ cái + 35 dạng chia + 電 (theo thiết kế/không có dữ
  liệu chắc chắn) và 9 từ ngữ pháp có JMdict nhưng kanjium không có
  dòng cho cặp tương ứng （いいえ, ても, かも, ばかり, わけ, ば, ずに,
  のに, はずがない).

## 4. Quyết định khớp đáng chú ý

- **かみ "tóc" → 髪** (không phải 紙 "paper" / 神 "god"): thắng nhờ từ
  khóa nghĩa "hair"; pitch （髪，かみ） = 2.
- **あつい "nóng" → 暑い** (không phải 熱い "hot to the touch" / 厚い
  "thick"): gloss chứa cả "hot" lẫn "warm".
- **あめ "mưa" → 雨**, thắng 飴 "candy" nhờ từ khóa "rain" + liên kết
  chéo với target 雨 cùng nghĩa "mưa" trong pack.
- **はい "vâng" → entry kana はい "yes"**, thắng 肺 "lung" nhờ từ khóa.
- **さん "ba" → 三 "three"**, thắng entry kana さん "Mr/Mrs".
- **人 → ひと** "person": じん và ひと hòa điểm tần suất/nghĩa, phân
  định bằng thứ tự romanization của app ("hito / jin" — hito đứng đầu).
- **金 → きん** "gold (metal)": entry きん thắng かね vì gloss của nó
  bao phủ cả "gold" lẫn một sense "money", và "vàng" đứng trước "tiền"
  trong nghĩa của app.
- **小 → しょう**: các ứng viên こ/お/さ… bị loại vì cách đọc không
  nằm trong romanization của app ("chiisai / shou"), nên しょう
  "smallness" là ứng viên hợp lệ duy nhất — có đủ `jmReading` và
  `pitch` 1. (Script còn có cơ chế dự phòng "gloss-only" — hai ứng
  viên hòa điểm nhưng thống nhất từ khóa nghĩa thì chỉ lấy gloss,
  không lấy reading/pitch — nhưng bản dữ liệu cuối không có trường
  hợp nào phải dùng tới.)
- **電 → để trống hoàn toàn**: JMdict không có entry độc lập cho
  電 （でん） "electricity" — chữ 電 chỉ xuất hiện như dạng ateji của
  稲妻 （いなずま, "lightning"). Quy tắc loại ứng viên trái
  romanization của app chặn đứng việc gán sai này.
- **ところ**: gloss lấy từ sense khớp nghĩa ngữ pháp ("was just
  doing; have just done"), không lấy sense 1 "place".

## 5. Ghi công bắt buộc (dùng cho màn "Nguồn dữ liệu & Giấy phép")

- **EDRDG (JMdict + KANJIDIC2):** "This application uses data from the
  JMdict and KANJIDIC2 dictionary files, © the Electronic Dictionary
  Research and Development Group (EDRDG), used under the Creative
  Commons Attribution-ShareAlike 4.0 International licence
  (https://www.edrdg.org/edrdg/licence.html)."
- **kanjium (bắt buộc nguyên văn theo yêu cầu của tác giả):**
  "The pitch accent notation, verb particle data, phonetics, homonyms and other additions or modifications to EDICT, KANJIDIC or KRADFILE were provided by Uros O. through his free database."
  (kanjium © Uros O. và các cộng tác viên, CC BY-SA 4.0 —
  https://github.com/mifunetoshiro/kanjium)

## 6. Giới hạn

- 35 dạng chia động từ/tính từ không có dữ liệu JMdict/pitch (không
  suy về dạng từ điển — nếu sau này cần, phải làm bước stemming có
  kiểm chứng riêng).
- `jmGloss` là nghĩa Anh của từ điển tổng quát, đôi lúc là sense hẹp
  theo chuyên ngành (ví dụ シャツ "shirt (undergarment)") — chỉ dùng
  làm tra cứu phụ cạnh nghĩa Việt của app.
- Pitch của kanjium là dữ liệu cộng đồng đóng băng từ 2024 (commit
  cuối của accents.txt: 2024-06-16) — accent của từ phổ thông ổn
  định, chấp nhận được; từ không có cặp khớp thì để trống thay vì suy.
- Chưa kiểm chứng hiển thị trên máy thật (điều phối viên hợp nhất UI
  ở bước sau; tuyến này chỉ phụ trách dữ liệu + script + provenance).
