# Nguồn dữ liệu tuyến Media — Đợt 2 (Twemoji + Lingua Libre)

Sinh bởi `scripts/build-integration2-media.mjs`. Mọi số liệu dưới đây
lấy từ lần chạy sinh ra các file hiện tại trong repo.

## Twemoji

- Nguồn: jdecked/twemoji (bản duy trì chính thức của Twemoji), pinned **17.0.3**.
- URL tải từng PNG: `https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/72x72/<codepoint>.png` (jsDelivr GitHub mirror của repo chính thức).
- Repo: https://github.com/jdecked/twemoji
- Giấy phép: **graphics CC BY 4.0** (https://github.com/jdecked/twemoji/blob/main/LICENSE-GRAPHICS — https://creativecommons.org/licenses/by/4.0), code MIT (LICENSE).
- Quy ước tên file: codepoint hex nối bằng `-`, bỏ U+FE0F; script thử thêm biến thể giữ FE0F/đệm 4 ký tự khi cần (keycap dùng dạng `31-20e3`).
- Emoji dùng trong Word.emoji của 3 packs (hợp nhất): **299**; có asset Twemoji: **292**; không có asset: **7** (⑪ ⑫ ⑬ ⑭ ⑮ ⑯ ⑳ — các số khoanh tròn, không thuộc bộ emoji chuẩn của Twemoji; component fallback emoji hệ thống).
- Tổng dung lượng PNG: **234730 bytes**.
- OpenMoji: **dự phòng, CHƯA dùng** — Twemoji phủ đủ mọi emoji minh họa quan trọng còn thiếu chỉ là số khoanh tròn; không phát sinh dữ liệu CC BY-SA nào từ OpenMoji.

## Lingua Libre (Wikimedia Commons)

- API chính thức: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|size` với truy vấn `LL-Q<qid> (<iso>) <target>` (en Q1860/eng, ja Q5287/jpn, zh Q9192/cmn).
- Trang dự án: https://lingualibre.org — bản ghi nằm trên Wikimedia Commons, tên file `LL-Qxxxx (yyy)-<speaker>-<text>.<ext>`.
- Quy tắc giấy phép CỨNG của đợt này: chỉ lấy file mà extmetadata của CHÍNH file đó ghi **CC0** hoặc **CC BY** (tối đa CC BY). CC BY-SA / NC / ND / không rõ đều bị loại, kể cả khi là bản ghi Lingua Libre.
- Chỉ lấy file có đoạn text trong tên file khớp đúng `Word.target`; chuyển MP3 mono 22050 Hz/48 kbps bằng ffmpeg.
- Manifest giọng thật nằm RIÊNG ở `src/content/real-audio-manifest.ts`; `src/content/audio-manifest.ts` (TTS) không đổi.
- ⚠️ Trong quá trình thu thập, Wikimedia Commons đã trả **HTTP 429 (rate limit)** — theo quy tắc hard-stop, việc truy vấn provider này đã dừng và output được chốt từ phần đã lấy được (các MP3 + phản hồi API đã cache). Độ phủ dưới đây là PHỦ MỘT PHẦN vì lý do này, không phải độ phủ thật của Lingua Libre. Chạy lại script ở một phiên sau (khi hết giới hạn) sẽ bổ sung tiếp nhờ cache + cơ chế giữ mục cũ.
- en-vi: phủ **9/216** từ; khớp đúng text: 18 file; bị loại vì giấy phép: 7 file; tổng MP3: 40910 bytes.
- LỊCH SỬ CÁC PHIÊN (ghi chú thủ công tích lũy): phiên đầu 09/11/2026 lấy dog/cat/horse/blue rồi bị 429. Phiên bổ sung 1 (sáng 10/11): thêm bird/fish (CC0); trong 3 truy vấn thành công (bird/fish/rabbit) có 33 file khớp, 15 file bị loại (CC BY-SA 4.0); tải file rabbit bị 429 nên dừng; phiên này cũng phát hiện và sửa lỗi script làm mất mục cũ khi dừng giữa chừng. Phiên bổ sung 2 (10/11, người dùng nói "tiếp tục"): thử tải lại đúng 1 file rabbit → HTTP 200, lấy thêm **rabbit/cow/duck** (đều CC0); truy vấn **red** trả 50 trang nhưng KHÔNG có file nào khớp đúng text "red"; tới **green** (có ứng viên CC0: Grendelkhan/Wodencafe/Rachlel/Sravani Jampana) thì lượt tải file lại bị 429 → dừng ngay theo quy tắc, green chưa được lấy, ja/zh vẫn chưa kịp truy vấn.
- ja-vi: phủ **0/214** từ; khớp đúng text: 0 file; bị loại vì giấy phép: 0 file; tổng MP3: 0 bytes. (chưa truy vấn được trong lần chạy này — đã dừng vì 429 ở khóa trước)
- zh-vi: phủ **0/208** từ; khớp đúng text: 0 file; bị loại vì giấy phép: 0 file; tổng MP3: 0 bytes. (chưa truy vấn được trong lần chạy này — đã dừng vì 429 ở khóa trước)

### Từng file đã lấy (bằng chứng giấy phép theo file)

| Key | File Commons | Speaker | Giấy phép | Trang file |
|---|---|---|---|---|
| en-vi:bird | LL-Q1860 (eng)-Muldoonsamuel55-Bird.wav | Muldoonsamuel55 | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Bird.wav |
| en-vi:blue | LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-blue.wav | Samuel Muldoon | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-blue.wav |
| en-vi:cat | LL-Q1860 (eng)-Muldoonsamuel55-Cat.wav | Muldoonsamuel55 | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Cat.wav |
| en-vi:cow | LL-Q1860 (eng)-Muldoonsamuel55-Cow.wav | Muldoonsamuel55 | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Cow.wav |
| en-vi:dog | LL-Q1860 (eng)-Sravani Jampana-dog.wav | Sravani Jampana | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Sravani_Jampana-dog.wav |
| en-vi:duck | LL-Q1860 (eng)-Grendelkhan-duck.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-duck.wav |
| en-vi:fish | LL-Q1860 (eng)-Grendelkhan-fish.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fish.wav |
| en-vi:horse | LL-Q1860 (eng)-Grendelkhan-horse.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-horse.wav |
| en-vi:rabbit | LL-Q1860 (eng)-Grendelkhan-rabbit.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-rabbit.wav |

### File khớp đúng text nhưng bị loại vì giấy phép (mẫu bằng chứng quy tắc lọc)

- en-vi: File:LL-Q1860 (eng)-GonFreeaks-cow.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-cow.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Nattes à chat-duck.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Nattes à chat-green.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Back ache-green.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Back ache-GREEN.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Lirazelf-green.wav [CC BY-SA 4.0]
