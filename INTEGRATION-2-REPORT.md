# BÁO CÁO ĐỢT 2 TÍCH HỢP NGUỒN MỞ — TÍNH NĂNG (Piglingo Kids)

Ngày: 09/11/2026 · Phạm vi: `~/workspace/piglingo-merged/` · Điều phối viên hợp nhất + kiểm chứng cuối.
Nguyên tắc giữ nguyên từ Đợt 1: chỉ **cộng thêm** metadata/tra cứu/câu ví dụ/audio phụ trợ cho từ vựng sẵn có; **không ghi đè** nghĩa Việt, pinyin/romaji của app; baseline **80 unit / 314 bài / 2.488 câu giữ nguyên**; không mất tiến độ; thuần Việt; không dùng nguồn bị LOẠI ở kiểm kê; không làm lại dữ liệu nét Hanzi/KanjiVG của đợt kỹ năng. **Không upload GitHub, không chạy SQL.**

## Tóm tắt theo nguồn

| Nguồn | Trạng thái | Phủ | Giấy phép |
|---|---|---|---|
| JMdict + KANJIDIC2 (EDRDG) | ✅ ĐÃ VÀO | jmGloss 146/214 từ ja; kanji 58/58 | CC BY-SA 4.0 |
| kanjium (pitch accent) | ✅ ĐÃ VÀO | 137/214 từ ja | CC BY-SA 4.0 |
| Tatoeba (câu ví dụ) | ✅ ĐÃ VÀO (duyệt tay 100%) | 157 cặp target–câu đã duyệt (155 câu duy nhất) / 638 target | CC BY 2.0 FR; 55/240 ứng viên là CC0, trong tập duyệt cuối mỗi câu giữ giấy phép riêng |
| Twemoji | ✅ ĐÃ VÀO (1 điểm an toàn: Sổ tay) | 292/299 emoji đang dùng | Hình ảnh CC BY 4.0; mã MIT |
| OpenMoji | ⏸ Dự phòng — CHƯA DÙNG (ghi rõ ở màn Nguồn) | — | — |
| Lingua Libre | ⚠️ ĐÃ VÀO nhưng THU HẸP mạnh vì HTTP 429 | en 4/216 · ja 0/214 · zh 0/208 (ja/zh chưa kịp truy vấn, không phải "không có dữ liệu") | Chỉ CC0 trong gói (trần đợt này: CC0, tối đa CC BY) |

## 1. JMdict + KANJIDIC2 (EDRDG) — ĐÃ VÀO

- Nguồn tải thật ngày 09/11/2026 (kiểm chứng giấy phép trước khi trích): JMdict_e 10.594.690 B / 219.040 entry; KANJIDIC2 1.488.573 B, `database_version 2026-313`. Giấy phép **CC BY-SA 4.0**.
- Trích subset khớp từ vựng ja hiện có vào `src/content/lexicon/ja.json` (bổ sung khóa mới, không đổi khóa `jlpt`/`zipf` cũ):
  - `jmGloss` (nghĩa Anh tham khảo): **146/214 (68,2%)**; trong nhóm có JLPT: 120/139.
  - `jmReading`: 39 entry (chỉ khi cách đọc khác/không suy được từ target).
  - File riêng `src/content/lexicon/kanjidic-ja.json`: **58/58 kanji** thật xuất hiện trong từ vựng ja, mỗi mục có gloss + số nét (+ On/Kun khi nguồn có; 4 ký tự 校/符/電/駅 thiếu Kun trong nguồn nên UI hiện "—").
- Không phủ có lý do (không bịa): 32 kana đơn (theo thiết kế không tra JMdict), 35 dạng chia động từ/tính từ không có headword khớp, `電` để trống vì JMdict không có entry độc lập đúng cách đọc.
- Hiển thị: `WordMeta` ở Sổ tay hiện gloss dưới nhãn "Tham khảo JMdict (tiếng Anh)" + chi tiết tối đa 2 kanji (On/Kun/số nét/gloss) khi `showGloss`. Nghĩa Việt của app vẫn là chính.
- Ghi công ở `/data-sources`: mục "JMdict + KANJIDIC2 (EDRDG)" với câu ghi công tiếng Anh đúng yêu cầu của EDRDG, kèm URL giấy phép.
- Giới hạn: gloss JMdict đôi khi là *một* sense hẹp của từ đa nghĩa — chỉ dùng làm tra cứu phụ, không bao giờ thay nghĩa Việt.

## 2. kanjium — pitch accent — ĐÃ VÀO

- Nguồn: `accents.txt` 3.226.405 B / 124.137 dòng, **CC BY-SA 4.0**, khớp **cả dạng chữ lẫn cách đọc** mới nhận.
- Kết quả: `pitch` + `pitchReading` cho **137/214 từ ja (64,0%)** (nhóm có JLPT: 117/139). Pitch `0` (heiban) là giá trị hợp lệ và được tính là có dữ liệu.
- Hiển thị gọn trong `WordMeta`: chip "Trọng âm: n" + dòng điểm rơi theo `pitchReading`. Từ không có dữ liệu thì để trống hoàn toàn.
- Ghi công ở `/data-sources`: câu ghi công **Uros O. nguyên văn** theo yêu cầu của kanjium.
- Giới hạn: dữ liệu kanjium đóng băng từ ~2024; chỉ là metadata phụ trợ phát âm.

## 3. Tatoeba — câu ví dụ — ĐÃ VÀO, ĐIỀU PHỐI VIÊN DUYỆT TAY 100%

- Nguồn: export tuần chính thức từ `downloads.tatoeba.org` (bản detailed có sentence_id + username), Last-Modified 07/11/2026; quét 2.378.825 câu (Anh 2.040.567 / Nhật 248.969 / Trung 89.289). **Tuyệt đối không dùng audio của Tatoeba.**
- Giấy phép: **CC BY 2.0 FR**; nhãn CC0 1.0 chỉ gán khi id có mặt trong export CC0 chính thức của đúng ngôn ngữ. Mỗi câu giữ `id`, `author` (username), `license` trong dữ liệu và hiển thị ghi công ngay dưới câu ví dụ trong app.
- Pipeline lọc máy (script riêng của tuyến Tatoeba): giới hạn độ dài (Anh ≤8 từ & ≤48 ký tự; Nhật ≤18 ký tự; Trung ≤12 ký tự), containment đúng target (Anh theo biên từ, Nhật/Trung theo chuỗi), blocklist 7 nhóm đa ngữ (người lớn, hẹn hò, rượu bia/thuốc, bạo lực/chết chóc, chửi thề, tội phạm, tôn giáo/chính trị), loại tên riêng/chữ phồn thể/câu không vị ngữ… → 240 ứng viên (80/ngôn ngữ, tối đa 1 câu/target) từ 638 target thật.
- **Duyệt tay của điều phối viên:** đã tự đọc **toàn bộ 240 dòng** trong `scripts/tatoeba-review-list.txt`, loại thêm **83** cặp target–câu vì: câu không tự nhiên/sai ngữ pháp ("My car needs fixed.", "My pants are pants.", "水は多くがあります。"), thành ngữ/tối nghĩa không đúng nghĩa đang dạy, nội dung không hợp trẻ (tội phạm, bệnh tật, bỏ học…), hoặc target chỉ xuất hiện ngẫu nhiên bên trong một từ khác (kana nằm trong từ khác, 被 trong ngữ cảnh bị động trừu tượng kèm chữ phồn thể…).
- **Kết quả duyệt: GIỮ 157 cặp target–câu** (Anh 57 · Nhật 39 · Trung 61), tương ứng **155 câu Tatoeba duy nhất** — hai câu phục vụ 2 target ("We have five cats." cho *five/have*; "The soup got cold." cho *soup/cold*).
- File dữ liệu cuối `src/content/examples.json` chứa chính **danh sách đã duyệt**: trường `approvedSentenceIds` (155 id) nằm ngay trong file + mỗi câu mang `reviewed: true`, `reviewStatus: "human-reviewed"`. File ứng viên gốc giữ nguyên nhãn `machine-filtered` để truy vết.
- Hiển thị: dòng "Ví dụ: …" + dòng ghi công "Câu của {author} (Tatoeba #{id}), {license}" trong `WordMeta` — tức có mặt ở thẻ từ (Ôn tập), Sổ tay và thẻ từ đã chọn trong Luyện Đọc. Từ chưa có câu duyệt thì không hiện gì.

## 4. Twemoji / OpenMoji — ĐÃ VÀO Ở MỘT ĐIỂM AN TOÀN

- Nguồn: jdecked/twemoji pinned **17.0.3**, PNG 72×72 qua jsDelivr; hình ảnh **CC BY 4.0**, mã MIT.
- Phạm vi gọn theo đúng lựa chọn an toàn của brief: chỉ nhúng asset cho đúng các emoji thật sự dùng trong `Word.emoji` của 3 packs và chỉ đổi cơ chế render ở **Sổ tay** (`TwemojiImage` thay điểm render emoji của từ). Không thay emoji toàn app.
- Phủ: **292/299** emoji — 292 file PNG, tổng **234.730 B** ở `assets/twemoji/<codepoint>.png`. Thiếu 7 ký tự số khoanh tròn (⑪⑫⑬⑭⑮⑯⑳) vốn **không thuộc bộ Twemoji** → component fallback về emoji hệ thống như cũ.
- **OpenMoji: chỉ là nguồn dự phòng, chưa dùng** — đã ghi rõ như vậy ở màn Nguồn.

## 5. Lingua Libre — ĐÃ VÀO NHƯNG THU HẸP VÌ RATE-LIMIT (HTTP 429)

- Wikimedia Commons trả **429 dày đặc** trong lúc truy vấn; theo quy tắc rate-limit, tuyến Media đã **dừng hẳn và không thử lại** trong attempt này (điều phối viên cũng không gọi lại provider này bằng bất kỳ đường nào).
- Phần chốt được trước khi bị chặn: **4 từ tiếng Anh**, đều **CC0**, MP3 mono 22050 Hz / 48 kbps, tổng **17.520 B**:
  - `en-vi:dog` — Sravani Jampana, 0,57s · `en-vi:cat` — Muldoonsamuel55, 0,55s · `en-vi:horse` — Grendelkhan, 0,66s · `en-vi:blue` — Samuel Muldoon, 0,72s.
- Phủ chính thức: **en 4/216 · ja 0/214 · zh 0/208**. ja/zh là **chưa kịp truy vấn** chứ không phải kho không có dữ liệu — có thể bổ sung ở phiên sau khi hết rate-limit.
- Lọc giấy phép rất chặt: trong phần đã truy vấn, 110 file khớp text thì **49 file bị loại** vì giấy phép (phần lớn CC BY-SA 4.0 — vượt trần "chỉ CC0, tối đa CC BY" của đợt này).
- Tích hợp: metadata đầy đủ từng file trong `src/content/lingua-libre.json`; manifest riêng `src/content/real-audio-manifest.ts`; `src/lib/audio.ts` thêm `hasRealVoice()`/`speakRealVoice()` **tách riêng** — `audio-manifest.ts` và TTS mặc định **không đổi**. Nút "Nghe giọng thật" (`RealVoiceButton`) chỉ render khi từ có bản ghi: ở Sổ tay, thẻ từ đã chọn trong Luyện Đọc, và hoạt động nghe-từ trong Luyện Nghe.

## File tạo/sửa + dung lượng

### Dữ liệu mới (đóng gói vào app)
| File | Dung lượng | Ghi chú |
|---|---|---|
| `src/content/lexicon/ja.json` (cập nhật) | 22.877 B | + jmGloss/jmReading/pitch/pitchReading |
| `src/content/lexicon/kanjidic-ja.json` | 9.832 B | 58 kanji |
| `src/content/examples.json` | 42.268 B | 157 cặp target–câu đã duyệt + approvedSentenceIds |
| `src/content/lingua-libre.json` | 5.025 B | metadata 4 bản ghi CC0 |
| `src/content/real-audio-manifest.ts` | 773 B | manifest giọng thật riêng |
| `src/content/twemoji-assets.ts` | 22.378 B | require tĩnh 292 PNG + bảng codepoint |
| `assets/twemoji/*.png` (292 file) | 234.730 B tổng | Twemoji 17.0.3, 72×72 |
| `assets/audio/lingua/en/*.mp3` (4 file) | 17.520 B tổng | giọng thật CC0 |

### Mã nguồn tạo/sửa
- Mới: `src/components/twemoji-image.tsx` (1.554 B), `src/components/real-voice-button.tsx` (2.332 B).
- Sửa: `src/lib/lexicon.ts` (+ `jmReading/jmGloss/pitch/pitchReading`, `kanjidicInfo()`, `exampleSentence()`), `src/lib/audio.ts` (+ giọng thật tách riêng), `src/components/word-meta.tsx` (pitch/JMdict/KANJIDIC2/câu ví dụ), `src/app/data-sources.tsx` (+ EDRDG, kanjium, Tatoeba, Twemoji, Lingua Libre), `src/app/guidebook/[unitId].tsx` (Twemoji + nút giọng thật), `src/app/skills-listen.tsx` + `src/app/skills-read.tsx` (nút giọng thật).

### Script + provenance (không đóng gói vào app)
| File | Dung lượng |
|---|---|
| `scripts/build-integration2-ja.mjs` + `scripts/integration2-ja-sources.md` | 27.094 B + 11.101 B |
| `scripts/build-integration2-tatoeba.mjs` + `scripts/integration2-tatoeba-sources.md` | 32.214 B + 13.287 B |
| `src/content/examples-candidates.json` (ứng viên lọc máy, truy vết) | 50.613 B |
| `scripts/tatoeba-review-list.txt` (240 dòng đã đọc duyệt) | 14.929 B |
| `scripts/build-integration2-examples-approved.mjs` (vòng duyệt của điều phối viên, danh sách loại ghi trong script) | 4.939 B |
| `scripts/tatoeba-approved-list.txt` (157 dòng đã duyệt) | 11.623 B |
| `scripts/build-integration2-media.mjs` + `scripts/integration2-media-sources.md` | 25.050 B + 5.225 B |
| `scripts/test-integration-2.mjs` | 13.223 B |

## Kiểm chứng cuối (điều phối viên tự chạy)

- **Test mới `test-integration-2`: PASS 12/12 nhóm** — JMdict subset ⊆ từ ja thật + đúng 146 jmGloss; pitch có cho từ phổ biến (kể cả 0) và vắng cho từ bịa + đúng 137; KANJIDIC2 đúng 58/58 kanji thật; mọi câu Tatoeba đã nhúng chứa đúng target, nằm trong `approvedSentenceIds` lưu trong file dữ liệu, khớp 1-1 ứng viên gốc, đạt giới hạn độ dài, không có trường audio; mọi bản ghi Lingua Libre có giấy phép thuộc danh sách cho phép + file local đúng dung lượng; Twemoji subset khớp đúng tập emoji đang dùng trừ đúng 7 ký tự đã ghi nhận; nối dây tĩnh + ghi công đủ; baseline 80/314/2488.
- **Toàn bộ test cũ PASS nguyên số lượng:** games-stability 14 · service-worker 18 · skills 15 · spin 20 · pets 21 · adventure-map 26 · companion 9 · lesson-ui 16 · level-floor 11 · garden 14 · rewards 9 · ranks 12 · competitions 20 · provinces 30 · worldmap 76 · fsrs 15 · data-integration 13.
- **`npx tsc --noEmit`: 0 lỗi.**
- **`npx expo export --platform web`: PASS** (đủ route, gồm `/data-sources`, `/guidebook/[unitId]`, `/skills-listen`, `/skills-read`).

## Giới hạn còn lại

- Lingua Libre mới phủ 4 từ Anh; ja/zh cần một phiên bổ sung khi Wikimedia hết rate-limit (không thử lại trong attempt này theo quy tắc 429).
- Pitch accent (kanjium) đóng băng từ ~2024 và JMdict gloss đôi lúc là sense hẹp — cả hai chỉ là tra cứu phụ, nghĩa Việt của app vẫn là chính.
- Twemoji mới áp dụng ở Sổ tay; các điểm render emoji khác vẫn dùng emoji hệ thống (chủ ý thu hẹp để tránh rủi ro), và 7 ký tự số khoanh tròn không có trong Twemoji nên fallback hệ thống.
- Chưa kiểm chứng trên thiết bị thật: phát âm thanh giọng thật, hiển thị PNG Twemoji trên máy yếu. Chưa upload GitHub theo đúng phạm vi task.
