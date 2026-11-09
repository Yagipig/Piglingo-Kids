# Nguồn dữ liệu từ vựng Trung + Nhật (Đợt 1 — tích hợp nguồn mở)

Ngày tải: **2026-11-09**. File thô tải về `/tmp/lex-cjk/` (KHÔNG đưa vào repo).
Script sinh dữ liệu: `scripts/build-lexicon-cjk.mjs` (+ `scripts/build-lexicon-freq.py` cho wordfreq).
Đầu ra: `src/content/lexicon/zh.json`, `ja.json`, `chars-zh.json`, `chars-ja.json` —
chỉ chứa subset khớp đúng từ vựng hiện có của app (zh: 208 từ duy nhất trong
`src/content/packs/zh-vi.json`; ja: 214 từ trong `src/content/packs/ja-vi.json`).

Cách chạy lại:

```bash
# 1) Tải nguồn vào /tmp/lex-cjk/ (lệnh tải ở từng mục dưới)
# 2) Tần suất wordfreq (cần venv có wordfreq + jieba + mecab-python3 + ipadic)
python3 scripts/build-lexicon-freq.py        # -> /tmp/lex-cjk/freq.json
# 3) Sinh 4 file lexicon
node scripts/build-lexicon-cjk.mjs
```

---

## 1. CC-CEDICT qua MDBG — pinyin, gloss, phồn thể (zh)

- **URL chính thức:** https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
- **Giấy phép:** CC BY-SA 4.0 (ghi trong header file).
- **Phiên bản:** header `#! version=1, subversion=0, format=ts, entries=125397`,
  `#! date=2026-11-09T04:23:50Z` (bản phát hành ngày tải).
- **Cách khớp:** theo giản thể, khớp nguyên từ (multi-char phải khớp cả từ).
  Khi một giản thể có nhiều mục (đồng âm khác nghĩa), chọn mục mà pinyin dạng dấu
  sau chuyển đổi **trùng với `romanization` sẵn có của app** (ví dụ 便宜 → pián yi
  "cheap", không lấy bian4 yi2 "convenient"; 十一 → shí yī "eleven", không lấy mục
  tên riêng viết hoa Shi2 Yi1 "PRC National Day"); không có tín hiệu thì lấy mục đầu.
- **Chuyển pinyin số → dấu:** theo quy tắc chuẩn — ưu tiên đánh dấu trên `a`, rồi `e`,
  rồi `o` trong `ou`, cuối cùng là nguyên âm cuối (iu→u, ui→i); thanh 5 (trung tính)
  không dấu; `u:` → `ü`. Âm tiết cách nhau bằng khoảng trắng như trong từ điển gốc.
- **Gloss:** tối đa 3 nghĩa Anh đầu (phân tách bằng `/`), nối bằng `"; "`. Đã loại
  các đoạn chỉ chứa chú thích lượng từ `CL:...` và hậu tố `(CL:...)` vì không phải nghĩa.
- **Phủ:** pinyin 204/208 (98,1%), gloss 204/208 (98,1%), `trad` khác giản thể: 104 từ.
  4 từ không có mục trong CC-CEDICT (cụm động–tân ngữ/cụm hỏi, không phải headword):
  多少钱、怎么走、打篮球、踢足球 — bỏ qua, không bịa.

## 2. HSK mapping — cấp HSK (zh)

- **Nguồn:** repo `drkameleon/complete-hsk-vocabulary` (MIT) —
  https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json
  (11.470 mục). **Chỉ lấy lớp mapping từ → cấp**, không lấy gloss của repo này.
- **Ưu tiên cấp:** họ `newest-*` (đề cương thi mới nhất — repo thêm ngày 2026-02-10,
  commit "Add new HSK3.0 levels, matching 2026 syllabus") → không có thì họ `new-*`
  (GF0025-2021 / HSK 3.0). Xuất số cấp nhỏ nhất trong họ được chọn.
  *Ghi chú đặt tên:* nhiệm vụ gọi tầng ưu tiên là "đề cương thi 2025 (level dạng
  new-1…)"; trong dữ liệu repo hiện hành, `new-*` chính là GF0025-2021, còn đề cương
  thi mới nhất mang tiền tố `newest-*` — nên thứ tự ưu tiên được cài là
  `newest-*` trước, `new-*` sau, đúng ý định "đề cương mới nhất → GF0025-2021".
- **Phủ:** 184/208 (88,5%). Phân bố cấp: 1→57, 2→37, 3→43, 4→27, 5→13, 6→6, 7→1 （卡车）.
  24 từ không có trong danh sách HSK (đúng dữ liệu gốc, không tự gán): 你好、熊猫、
  các số 十一–十五/二十、màu ghép 粉色/紫色/橙色/金色/银色、từ vay mượn 比萨/冰淇淋、
  面条、奶酪、蜡笔、连衣裙、鞋子 và 4 cụm ở mục 1.

## 3. Tanos / Jonathan Waller — nhãn JLPT (ja)

- **Nguồn gốc:** danh sách từ vựng JLPT của Jonathan Waller tại tanos.co.uk (CC BY).
- **Mirror đã dùng:** https://github.com/jamsinclair/open-anki-jlpt-decks —
  file `src/n5.csv`, `n4.csv`, `n3.csv`, `n2.csv`, `n1.csv`
  (URL dạng https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv …).
  README của repo ghi rõ các deck "based on decks from tanos.co.uk".
  Số dòng dữ liệu: N5 718, N4 668, N3 2140, N2 1906, N1 2699.
- **Lý do dùng mirror:** tải trực tiếp tanos.co.uk ngày 2026-11-09 thất bại
  (curl HTTP 000 — không kết nối được). Mirror giữ nguyên cột expression/reading/tags của Tanos.
- **Cách khớp:** `expression` (dạng kanji/kana của mục) == target của app, nếu không
  thì `reading` (dạng kana) == target. Quét N5→N1, khớp đầu tiên thắng (cấp dễ nhất).
  Không khớp → bỏ qua, tuyệt đối không tự gán cấp.
- **Phủ:** 139/214 (65,0%). Phân bố: N5→82, N4→23, N3→25, N2→9, N1→0.
  Ví dụ đúng kỳ vọng: ねこ → N5 (mục 猫/ねこ）, いぬ → N5, がっこう → N5.
  Hai trường hợp giữ nguyên theo dữ liệu mirror dù trông lạ: あ → N4 (mirror có mục
  Tanos あ/あ "Ah" nằm trong danh sách N4); ありがとう → N3 (chỉ xuất hiện trong
  n3.csv, tags JLPT_2/JLPT_3).
  Không khớp chủ yếu là: kana đơn không có mục Tanos （う、せ、そ、つ、ぬ… và katakana
  ア–ク…), dạng chia động từ （食べて、食べた、行きたい…), vài từ kana/ngoại lai
  （りんご、オレンジ、バナナ…).

## 4. Unicode Unihan — thông tin từng ký tự (chars-zh, chars-ja)

- **URL chính thức:** https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
- **Phiên bản:** Unicode **18.0.0** (header các file dữ liệu, ngày 2026-07-31).
- **Giấy phép:** Unicode License v3 (theo điều khoản UCD / terms_of_use của Unicode).
- **Vị trí trường (theo TÊN FILE + TÊN TRƯỜNG vì vị trí thay đổi theo phiên bản):**
  `Unihan_Readings.txt` chứa kDefinition, kMandarin, kJapaneseOn, kJapaneseKun;
  `Unihan_IRGSources.txt` chứa kTotalStrokes, kRSUnicode.
- **Trích xuất:** mọi ký tự phân biệt xuất hiện trong từ vựng app mà Unihan có mục.
  - `def` = kDefinition (nguyên văn); `strokes` = số đầu của kTotalStrokes;
    `radical` = phần trước dấu `.` của kRSUnicode (bỏ dấu `'`).
  - `reading`: zh → giá trị đầu của kMandarin (âm phổ biến nhất, đã có dấu thanh);
    ja → kJapaneseOn + kJapaneseKun nối bằng khoảng trắng, giữ nguyên dạng chữ hoa
    như trong dữ liệu gốc (ví dụ 水 → "SUI MIZU").
- **Phủ:** chars-zh **281/281** ký tự phân biệt, cả 4 trường đều đủ 281/281.
  chars-ja **58/152** ký tự phân biệt (58 kanji đủ cả 4 trường; 94 ký tự còn lại là
  kana — Unihan không chứa kana nên bỏ qua theo thiết kế).

## 5. wordfreq — tần suất Zipf (zh + ja)

- **Nguồn:** gói Python `wordfreq` 3.1.1 — code Apache-2.0, **dữ liệu CC BY-SA 4.0**
  (https://github.com/rspeer/wordfreq). Tokenizer: jieba cho `zh`,
  MeCab + ipadic cho `ja` (phụ thuộc tùy chọn của wordfreq, phải cài thêm).
- **Cách dùng:** `zipf_frequency(word, 'zh' | 'ja')`, làm tròn 1 chữ số thập phân;
  zipf = 0 (không có trong corpus) thì bỏ field.
- **Phủ:** zh **208/208 (100%)**; ja **213/214 (99,5%)** — từ duy nhất zipf = 0 là
  食べさせる (dạng sai khiến); từ này cũng không có jlpt nên là từ ja duy nhất
  vắng mặt hoàn toàn trong `ja.json`.
- **Lưu ý môi trường:** `/tmp` của máy này là tmpfs 512MB — cài unidic/ipadic qua
  pip tràn đĩa nếu để thư mục tạm mặc định; venv dùng cho bước này đặt ngoài `/tmp`
  và đặt `TMPDIR` sang ổ home. Dữ liệu nguồn vẫn ở `/tmp/lex-cjk/` như quy định.

---

## Tỉ lệ phủ tổng hợp

| Field | Phủ |
|---|---|
| zh `pinyin` (CC-CEDICT) | 204/208 — 98,1% |
| zh `gloss` (CC-CEDICT) | 204/208 — 98,1% |
| zh `trad` (chỉ khi khác giản thể) | 104/208 |
| zh `hsk` | 184/208 — 88,5% |
| zh `zipf` | 208/208 — 100% |
| ja `jlpt` | 139/214 — 65,0% |
| ja `zipf` | 213/214 — 99,5% |
| chars-zh | 281/281 ký tự |
| chars-ja | 58/152 ký tự (chỉ kanji; kana không có trong Unihan) |

Từ không có bất kỳ field nào thì không xuất hiện trong file đầu ra
(zh: 0 từ; ja: 1 từ — 食べさせる）.
