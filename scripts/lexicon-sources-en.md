# Lexicon tiếng Anh — provenance & tỉ lệ phủ (Đợt 1 tích hợp nguồn mở)

- Ngày tải nguồn: **2026-11-09**
- Script sinh dữ liệu: `scripts/build-lexicon-en.mjs` (đọc nguồn đã tải sẵn trong `/tmp/lex-en`, chạy lại bằng `node scripts/build-lexicon-en.mjs`; file thô của nguồn KHÔNG đưa vào repo)
- Đầu ra: `src/content/lexicon/en.json`
- Từ đích: 216 từ duy nhất từ trường `target` trong `src/content/packs/en-vi.json` (`pack.sections[].units[].words[]`), khớp không phân biệt hoa thường, khóa theo dạng thường. Cụm nhiều từ chỉ khớp nguyên cụm.

## Tỉ lệ phủ trên 216 từ đích

| Field | Số từ | Tỉ lệ | Nguồn |
|---|---|---|---|
| (có ít nhất 1 field — tổng số mục trong en.json) | 208 | 96,3% | — |
| `ipa` | 207 | 95,8% | ipa-dict en_US: 205; dự phòng phonetic ECDICT: 2 (`climate change`, `global warming`) |
| `cefr` | 205 | 94,9% | CEFR-J v1.6: 174 khớp headword trực tiếp + 31 qua lemma (xem phương pháp) |
| `dolch` | 154 | 71,3% | New Dolch List 1.1 (874 headword + dạng biến đổi chính thức) |
| `ngslRank` | 158 | 73,1% | NGSL 1.2 (2.809 lemma + dạng biến đổi chính thức) |
| `frq` | 187 | 86,6% | ECDICT, trường `frq` (hạng COCA; `frq = 0` = không có hạng → bỏ qua) |
| `gloss` | 204 | 94,4% | ECDICT, dòng đầu của trường `definition` |

Dung lượng `en.json`: 38 KB (208 mục).

8 từ không có mục nào (không khớp nguồn nào với dữ liệu thật): `as if`, `dark green`, `even if`, `if only`, `in case`, `light blue`, `only if`, `would have` — đều là cụm chức năng/màu; ECDICT có dòng cho 6 cụm đầu nhưng mọi trường đều rỗng, CEFR-J/NGSL/NDL/ipa-dict đều không có.

## Từng nguồn

### 1. ipa-dict — en_US (IPA)
- URL đã dùng (chính thức, repo gốc): https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt
- Giấy phép: MIT (dữ liệu gốc CMUdict/Wiktionary theo README của repo).
- Cách lấy: mỗi từ lấy biến thể phát âm ĐẦU TIÊN trong danh sách của ipa-dict (giữ nguyên cả dấu `/.../`).
- ⚠️ Chỉ tải en_US. **Không tải, không dùng en_UK** (bản en_UK dính giấy phép GPL theo cảnh báo của repo).

### 2. ECDICT (phonetic dự phòng, frq, gloss)
- URL đã dùng (chính thức, repo gốc): https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv (~63 MB)
- Giấy phép: MIT.
- Cách lấy (chỉ từ dòng khớp TRỰC TIẾP với từ đích):
  - `phonetic`: chỉ dùng khi ipa-dict thiếu; nếu chuỗi chưa có `/.../` thì bọc thêm `/.../` cho đồng dạng hiển thị (nội dung phát âm không đổi).
  - `frq`: hạng tần suất COCA; giá trị `0` trong ECDICT nghĩa là không có hạng → không ghi (tránh ghi số 0 giả). Trường `bnc` có trong nguồn nhưng schema cố định của đợt này không có field cho nó → không lấy.
  - `gloss`: dòng đầu tiên của `definition` (ECDICT ngăn dòng bằng ký tự `\n` literal), giữ nguyên văn (kể cả lỗi chính tả/dấu thừa hiếm hoi của nguồn, ví dụ gloss của `made` kết thúc bằng một dấu `"` thừa sẵn trong ECDICT).
  - Trường `exchange` (mục `0:<lemma>`) được dùng làm bảng truy lemma cho CEFR-J (xem dưới).

### 3. CEFR-J Wordlist Version 1.6 (cefr)
- URL đã dùng (CHÍNH THỨC, không cần mirror): trang tải https://www.cefr-j.org/download_eng.html → file https://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip (trong zip: `CEFR-J Wordlist Ver1.6.xlsx`, sheet `ALL_sep`).
- Giấy phép/ghi công: © Tono Laboratory, Tokyo University of Foreign Studies (TUFS). Wordlist được dùng cho nghiên cứu và thương mại kèm ghi công nguồn. Ghi công chuẩn: *"The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies."*
- Cách lấy:
  - Chuẩn hóa cấp độ về `A1|A2|B1|B2` theo chữ+số chính (bản 1.6 trong sheet ALL_sep vốn đã ở dạng A1–B2; script vẫn chuẩn hóa phòng khi gặp dạng lẻ kiểu A1.1).
  - Một headword có nhiều cấp theo từ loại → lấy cấp THẤP NHẤT (mức tiếp cận sớm nhất).
  - Từ đích là dạng biến đổi không có headword riêng (quá khứ/phân từ/số nhiều: `asked`, `children`, `shoes`...) → tra lemma theo trường `exchange` của ECDICT rồi lấy cấp của lemma trong CEFR-J (31 từ). Đây là cấp của lemma, không phải bịa cấp cho dạng biến đổi.
  - 3 từ đích thật sự vắng mặt trong CEFR-J v1.6 (đã kiểm tra): `crayon`, `noodle`, `smartphone`.

### 4. NGSL 1.2 (ngslRank) + New Dolch List 1.1 (dolch)
- URL đã dùng (CHÍNH THỨC newgeneralservicelist.com, không cần mirror):
  - NGSL: trang https://www.newgeneralservicelist.com/new-general-service-list
    - https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv — cột `Lemma` + `SFI Rank` → `ngslRank` (1–2809).
    - https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv — bảng dạng biến đổi chính thức (headword + các dạng của nó) để ánh xạ dạng biến đổi → headword lấy rank.
  - NDL: trang https://www.newgeneralservicelist.com/new-dolch-list
    - https://www.newgeneralservicelist.com/s/NDL_11_stats.csv — 874 headword của NDL 1.1.
    - https://www.newgeneralservicelist.com/s/NDL_11_lemmatized_for_teaching.txt — dạng biến đổi chính thức; `dolch = true` nếu từ đích là headword NDL hoặc một dạng biến đổi được liệt kê của headword NDL (khớp headword thuần túy chỉ đạt 121/216; kèm dạng biến đổi đạt 154/216).
- Giấy phép: CC BY-SA 4.0 — *New General Service List / New Dolch List by Browne, C., Culligan, B. & Phillips, J.* (NDL: Browne & Culligan), https://www.newgeneralservicelist.com
- Lưu ý: NGSL 1.2 tự nó KHÔNG chứa nhiều danh từ cụ thể và số đếm (`apple`, `banana`, `five`, `eight`, `internet`...) — đã đối chiếu với cả file stats, file lemmatized và danh sách alphabetized chính thức; các từ này có mặt trong NDL (dành cho trẻ em) thay vì NGSL. Đây là đặc tính của nguồn, không phải lỗi trích xuất.

## Kiểm chứng đã làm
- Đếm độc lập bằng Python (csv + openpyxl) trước khi viết script: CEFR trực tiếp 174, NGSL 158, NDL qua dạng biến đổi 154, ECDICT frq>0 187, gloss 204 — khớp 100% với kết quả script Node.
- Parser CSV của script đối chiếu với Python `csv` trên toàn bộ 214 dòng ECDICT khớp từ đích: 0 khác biệt ở `frq`/`gloss`.
- Kiểm tra tay: `dog` → `/ˈdɔɡ/`, `cat` → `/ˈkæt/`, `apple` → `/ˈæpəɫ/` (đúng IPA giọng Mỹ của ipa-dict en_US), cả ba đều A1 + dolch. `beautiful` KHÔNG nằm trong 216 từ đích của app nên không có trong en.json (nếu có, ipa-dict cho `/ˈbjutəfəɫ/`).
- Schema: mọi mục đều khác rỗng; `cefr` chỉ thuộc {A1, A2, B1, B2}; `ngslRank`/`frq` là số nguyên > 0; `dolch` chỉ có giá trị `true`; không khóa nào ngoài 216 từ đích.

## Nguồn không lấy được
- Không có. Cả 4 nguồn đều tải được từ trang/repo CHÍNH THỨC trong môi trường này, không phải dùng mirror nào.
