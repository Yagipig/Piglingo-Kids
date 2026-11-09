# Tatoeba — provenance câu ví dụ ỨNG VIÊN (Đợt 2 tích hợp nguồn mở)

- Ngày tải nguồn: **2026-11-09**
- Script sinh dữ liệu: `scripts/build-integration2-tatoeba.mjs`
  (tải export chính thức về `/tmp/tatoeba/` — file thô KHÔNG đưa vào repo;
  chạy lại bằng `node scripts/build-integration2-tatoeba.mjs`, thêm
  `--refresh` để tải bản export tuần mới).
- Đầu ra (chỉ là **tập ứng viên chờ duyệt tay**, chưa phải dữ liệu chốt):
  - `src/content/examples-candidates.json` — 50.613 byte; khóa
    `courseId -> target -> [1 câu]` với các trường
    `{id, text, author, license, reviewStatus: "machine-filtered"}`.
  - `scripts/tatoeba-review-list.txt` — 14.929 byte, 240 dòng ứng viên,
    mỗi dòng `[course] target :: text (sentence_id, author)` để điều phối
    viên đọc và chốt duyệt tay **toàn bộ**.
- **Không dùng audio Tatoeba ở bất kỳ đâu** (không tải, không tham chiếu):
  giấy phép audio do từng người đóng góp chọn, trường giấy phép trống =
  không được tái sử dụng ngoài Tatoeba — đúng cảnh báo của kiểm kê đợt 2.
- Không lấy file `links` (không cần quan hệ dịch cho câu ví dụ đơn ngữ).

## 1. Nguồn và giấy phép (đã kiểm chứng từ nguồn chính thức)

Trang tải chính thức: https://tatoeba.org/eng/downloads (đọc lại ngày
2026-11-09). Nguyên văn mục Creative commons của trang:

> "These files are released under CC BY 2.0 FR. A part of our sentences
> are also available under CC0 1.0."

Trang cũng ghi: export tuần cập nhật mỗi thứ Bảy 06:30 UTC; file
*Detailed Sentences* có cấu trúc
`Sentence id [tab] Lang [tab] Text [tab] Username [tab] Date added [tab]
Date last modified`; file *Sentences (CC0)* "Contains all the sentences
available under CC0". Wiki chính thức
(https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus)
xác nhận cùng giấy phép mặc định CC BY 2.0 FR và nghĩa vụ ghi tên tác giả.

**Quy tắc gán nhãn giấy phép từng câu trong đầu ra:**

- Mặc định mọi câu là **CC BY 2.0 FR**, kèm `id` (sentence_id) và
  `author` (username trong export chi tiết) để ghi công theo đúng giấy phép.
- Chỉ câu nào có `id` xuất hiện trong export CC0 chính thức của đúng ngôn
  ngữ đó mới được ghi **CC0 1.0** (xác nhận trực tiếp từ dữ liệu nguồn,
  không suy đoán). Kết quả: 55/240 câu là CC0 (tất cả ở tiếng Anh);
  jpn CC0 export chỉ có 2 id và cmn chỉ 1 id (đều là câu tự mô tả giấy
  phép, không qua được bộ lọc) nên Nhật/Trung không có câu CC0 nào.

## 2. File nguồn đã tải (export tuần, Last-Modified chung: Sat, 07 Nov 2026 07:55:41 GMT)

| File | URL | Byte (nén .bz2) | Số câu quét |
|---|---|---|---|
| eng_sentences_detailed.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2 | 34.983.679 | 2.040.567 |
| jpn_sentences_detailed.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_detailed.tsv.bz2 | 4.462.852 | 248.969 |
| cmn_sentences_detailed.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences_detailed.tsv.bz2 | 1.726.683 | 89.289 |
| eng_sentences_CC0.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_CC0.tsv.bz2 | 1.288.689 | 41.515 id CC0 |
| jpn_sentences_CC0.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_CC0.tsv.bz2 | 228 | 2 id CC0 |
| cmn_sentences_CC0.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences_CC0.tsv.bz2 | 102 | 1 id CC0 |

Tổng nguồn nén ≈ 42,5 MB; tổng câu quét: **2.378.825**.

## 3. Từ vựng đích và độ phủ

Từ đích lấy từ trường `target` trong `src/content/packs/{en-vi,ja-vi,zh-vi}.json`
(khóa duy nhất, thứ tự trong pack): Anh **216**, Nhật **214** (216 mục, trùng
`て` và `に`), Trung **208** — tổng **638** target duy nhất (bản giao việc
ước lượng 634; số đếm thật là 638).

| Khóa học | Phủ trước cap (có ≥1 ứng viên đạt lọc) | Giữ sau cap | Giấy phép trong tập giữ |
|---|---|---|---|
| en-vi | 216/216 | 80 | 55 CC0 + 25 CC BY 2.0 FR |
| ja-vi | 193/214 | 80 | 80 CC BY 2.0 FR |
| zh-vi | 200/208 | 80 | 80 CC BY 2.0 FR |
| **Tổng** | **609/638 (95,5%)** | **240** | 55 CC0 + 185 CC BY |

Cap cứng: tối đa 1 câu/target và tối đa 80 câu/ngôn ngữ (tổng 240) —
khi số target phủ vượt cap, giữ các ứng viên có điểm chất lượng tốt nhất
(xem mục 4). Mọi câu giữ lại đều có `author` khác rỗng (câu mồ côi không
username bị cộng điểm phạt nên không lọt tập cuối: 0/240).

**29 target không có ứng viên nào đạt lọc** (trung thực theo dữ liệu):

- ja-vi (21): おかあさん, おにいさん, おねえさん, ともだち, きいろ,
  ぎゅうにゅう, えんぴつ, せんせい, がっこう, とけい, けしゴム, くつした,
  しんかんせん, じてんしゃ, でんしゃ, ひこうき, ふね, さむい, 食べさせる,
  まいる, ばかり. Nguyên nhân chính: 15/21 target viết bằng **kana** trong
  khi corpus Tatoeba viết bằng **kanji** tương ứng (学校, 先生, 電車, 鉛筆…)
  nên quy tắc "chứa đúng chuỗi target" không khớp — đây là giới hạn thật
  của khớp chuỗi, không tự ý nới sang dạng kanji.
- zh-vi (8): 橙色, 银色, 蜡笔, 本子, 围巾, 怎么走, 电子邮件, 明星 —
  không có câu giản thể ≤12 ký tự đạt mọi bộ lọc chứa đúng các từ này.

## 4. Pipeline lọc máy (nghiêm ngặt, minh bạch trong script)

Thứ tự: độ dài → dạng câu → charset → blocklist → khớp target → chấm
điểm chọn 1 câu/target → cap 80/ngôn ngữ.

**Khớp target (containment):**

- Anh: khớp theo **token/biên từ** (chuỗi token liên tục, không phân biệt
  hoa thường) — "cat" không khớp trong "cats"/"catch"; cụm nhiều từ phải
  khớp nguyên cụm token.
- Nhật/Trung: câu phải **chứa đúng chuỗi target** (so từng ký tự).

**Giới hạn độ dài:** Anh ≤ 8 từ **và** ≤ 48 ký tự (tối thiểu 3 từ);
Nhật ≤ 18 ký tự (tối thiểu 3); Trung ≤ 12 ký tự (tối thiểu 4) — đếm theo
ký tự Unicode của toàn câu kể cả dấu câu.

**Chỉ giữ câu khẳng định:** phải kết thúc bằng `.` (Anh) / `。` (Nhật,
Trung) — loại toàn bộ câu hỏi `?`/`？` và câu cảm thán `!`/`！`.

**Loại bỏ theo cấu trúc (đếm được trong funnel của script):**

- URL/email/ký tự điều khiển, chữ số, ký hiệu lạ: charset trắng từng ngôn
  ngữ (Anh chỉ chữ Latin + `' , . -`; Nhật chỉ hiragana/katakana/kanji +
  `、。`; Trung chỉ chữ Hán + `，。、`).
- Anh: tên riêng đáng ngờ (từ viết hoa giữa câu ngoài danh sách cho phép
  ngày/tháng/ngôn ngữ — loại 225.396 câu), viết tắt khó (`Mr.`, `Dr.`,
  `e.g.`, `U.S.`…), câu mở đầu bằng động từ mệnh lệnh/cụm nối cụt
  (`Go…`, `And…`, chứa `please`), câu cụt đuôi (`I know who.`, `He was
  in.`, `I would never.`), câu **không có động từ thật** ("A red hat." —
  loại 205.905 câu), mẫu "người + be + màu" ("I am white."), thành ngữ
  sai nghĩa từ (`feel blue`).
- Nhật: đuôi mệnh lệnh thô (て/で-final, ろ-final, なさい, くれ。/出せ/消せ/
  開けろ/しろ), đuôi cụt (hạt từ treo `は。が。を。`…, `の。`), câu mở đầu
  bằng liên từ cụt (そして, でも…), tên riêng phiên âm phổ biến trong
  corpus (トム, クリス… — loại 7.882 câu).
- Trung: **chữ phồn thể** — tập ký tự phồn-thể-chỉ xây từ ~380 cặp
  giản→phồn phổ biến khai báo rõ trong script (loại 19.060 câu; tập
  không bao quát ký tự hiếm — vòng duyệt tay là chốt chặn cuối), câu
  không có vị ngữ/chức năng từ nào (cụm danh từ/thành ngữ cụt như
  地球母亲。— loại 2.883 câu), mở đầu bằng động từ trần dạng chỉ thị
  (穿/开/张/叫/向…), đuôi mệnh lệnh `…点。` (认真点。), tên riêng phiên âm
  (汤姆, 爱丽丝, 比尔, 健二 — loại 1.950 câu).
- **Ghép sai nghĩa theo từng target** (khai báo `JA_TARGET_BLOCK` /
  `ZH_TARGET_BLOCK` trong script): target xuất hiện bên trong một từ khác
  thì không tính — vd 汤 trong 汤姆, 比 trong 比尔/比赛, 头 trong 石头,
  被 trong 被子/被告, 把 trong 加把劲, ペン trong ペンキ, ドレス trong
  アドレス, 時 trong 時々, いち trong いちいち. Từ chào hỏi （你好) còn
  phải đứng ở biên cụm (sau nó là `。`/`、`/`,`), tránh 你好香.

**Blocklist nội dung đa ngữ** (7 nhóm, khai trong script theo từng ngôn
ngữ; Anh khớp theo token, Nhật/Trung khớp chuỗi con):

1. tình dục/hẹn hò; 2. rượu bia/thuốc lá/chất kích thích; 3. bạo lực/
   chết chóc/đáng sợ; 4. bệnh tật đáng sợ (chỉ mức nặng: ung thư, phẫu
   thuật, truyền nhiễm… — từ bệnh nhẹ thuộc chương trình của app như
   生病/发烧/头疼/药 KHÔNG bị chặn); 5. chửi thề/xúc phạm (kể cả tục
   cơ thể như `fart`, `poop`, オシッコ); 6. tiền bạc/tội phạm; 7. tôn
   giáo/chính trị. Các từ đích của chính app (vd `stolen`, `rich`) được
   giữ ngoài blocklist để không tự chặn từ đang dạy.

**Chấm điểm chọn câu (thấp = tốt):** ưu tiên câu đủ ý gần độ dài lý tưởng
(Anh ~4 từ, Nhật ~10 ký tự, Trung ~8 ký tự) hơn câu cụt tối thiểu; target
xuất hiện sớm; ít mệnh đề phụ (dấu phẩy); ít kanji (Nhật); câu CC0 được
trừ điểm nhẹ (giảm gánh ghi công, theo gợi ý của kiểm kê); câu không có
username bị cộng điểm phạt; target là cụm chào hỏi/công thức
（ありがとう, 对不起…) thì câu trùng nguyên cụm được ưu tiên mạnh.

**Funnel (số câu quét → qua mọi bộ lọc VÀ chứa ≥1 target):**
Anh 2.040.567 → 334.042; Nhật 248.969 → 105.652; Trung 89.289 → 13.859.
Chi tiết số câu bị loại theo từng lý do được script in ra ở mỗi lần chạy
(trường `rejected` trong JSON thống kê ở stdout).

## 5. Kiểm chứng đã làm

- Script kiểm tra độc lập (Python, không dùng lại code pipeline) trên
  đầu ra cuối: **0 lỗi** — mọi khóa đều là target thật của pack; đúng 1
  câu/target; đủ 5 trường; `reviewStatus` luôn `machine-filtered`;
  giấy phép chỉ thuộc {CC BY 2.0 FR, CC0 1.0}; containment đúng quy tắc
  từng ngôn ngữ cho cả 240 câu; độ dài trong giới hạn; 240 dòng review
  khớp 1-1 với JSON; không URL/email; không còn các mẫu đã biết là xấu
  （死刑, 汤姆/比尔/健二, トム/クリス, 被告, 三十六计, 石头, 被子, chữ
  phồn 襠/爾, `fart`, `poop`…).
- Điều phối viên (và người viết pipeline) đọc toàn bộ
  `scripts/tatoeba-review-list.txt` — bản thân pipeline đã qua 4 vòng
  siết lọc dựa trên việc đọc danh sách này.

## 6. Giới hạn chất lượng phải biết trước khi duyệt tay

- Đây là corpus cộng đồng: vẫn còn ứng viên **đúng luật lọc nhưng yếu về
  nghĩa/phong cách** mà máy không nhận diện được — vd Anh: "My pants are
  pants." (câu tautology), "My car needs fixed." (ngữ pháp địa phương),
  "I was a cynic." / "He may yet come." (từ vựng cổ/khó); Nhật:
  "水は多くがあります。" (ngữ pháp chưa chuẩn), các câu cho **kana đơn**
  （あ, か, く…) vốn chỉ minh họa được ký tự nằm trong câu chứ không dạy
  nghĩa riêng; Trung: "三穷三富过到老。" (tục ngữ), "生病迫使他退学。"
  (sắc thái nặng), "他头朝天倒下了。" (hình ảnh lạ). Các câu này nằm
  trong danh sách để điều phối viên loại ở vòng duyệt tay — **không câu
  nào trong file này được coi là đã duyệt**.
- Đa nghĩa không tránh khỏi ở mức máy: vd `train` (động từ huấn luyện
  thay vì tàu) có thể lọt ở các target khác ngoài tập giữ cuối; khớp
  chuỗi CJK không phân biệt ranh giới từ ngoài danh sách ghép sai nghĩa
  đã khai.
- Danh sách CK proofread (gợi ý ở kiểm kê đợt 2) **không** được dùng
  trong pipeline này; chốt chất lượng là bộ lọc trên + duyệt tay 100%.
- Tác giả `author` là username Tatoeba tại thời điểm export tuần
  07/11/2026; câu CC BY dùng để phát hành phải giữ ghi công
  "câu của {author} (Tatoeba #{id}), CC BY 2.0 FR" ở màn Nguồn dữ liệu.
