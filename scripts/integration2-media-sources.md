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
- en-vi: phủ **6/216** từ; tổng MP3: 26594 bytes.
- ja-vi: phủ **0/214** từ; tổng MP3: 0 bytes.
- zh-vi: phủ **0/208** từ; tổng MP3: 0 bytes.
- PHIÊN BỔ SUNG 10/11/2026 (ghi chú thủ công, đính chính số liệu sinh tự động ở trên vốn chỉ đếm phần chạy offline chốt lại từ cache): truy vấn thử đầu tiên trả HTTP 200 (giới hạn đã thả), script chạy online và lấy thêm được **bird** và **fish** (đều CC0). Trong 3 truy vấn API thành công trước điểm dừng (bird/fish/rabbit): khớp đúng text **33 file**, bị loại vì giấy phép **15 file** (đều CC BY-SA 4.0). Tải file gốc của **rabbit** thì Wikimedia trả **HTTP 429** — theo quy tắc hard-stop, phiên dừng ngay tại đó, không gọi thêm; rabbit dù có ứng viên CC0 (`LL-Q1860 (eng)-Grendelkhan-rabbit.wav`) vẫn CHƯA được lấy, và ja/zh vẫn chưa kịp truy vấn trong phiên này. Bản chốt cuối được sinh lại ở chế độ OFFLINE từ cache + dữ liệu cũ, kèm sửa lỗi script: trước đây dừng giữa chừng làm mất các mục cũ nằm sau điểm dừng (horse/blue) khỏi metadata/manifest dù file MP3 còn nguyên — nay script bảo toàn mọi mục cũ còn file trên đĩa.

### Từng file đã lấy (bằng chứng giấy phép theo file)

| Key | File Commons | Speaker | Giấy phép | Trang file |
|---|---|---|---|---|
| en-vi:bird | LL-Q1860 (eng)-Muldoonsamuel55-Bird.wav | Muldoonsamuel55 | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Bird.wav |
| en-vi:blue | LL-Q1860 (eng)-Samuel Muldoon (Muldoonsamuel55)-blue.wav | Samuel Muldoon | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Samuel_Muldoon_(Muldoonsamuel55)-blue.wav |
| en-vi:cat | LL-Q1860 (eng)-Muldoonsamuel55-Cat.wav | Muldoonsamuel55 | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Muldoonsamuel55-Cat.wav |
| en-vi:dog | LL-Q1860 (eng)-Sravani Jampana-dog.wav | Sravani Jampana | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Sravani_Jampana-dog.wav |
| en-vi:fish | LL-Q1860 (eng)-Grendelkhan-fish.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-fish.wav |
| en-vi:horse | LL-Q1860 (eng)-Grendelkhan-horse.wav | Grendelkhan | CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:LL-Q1860_(eng)-Grendelkhan-horse.wav |

### File khớp đúng text nhưng bị loại vì giấy phép (mẫu bằng chứng quy tắc lọc)

- en-vi: File:LL-Q1860 (eng)-Greenman-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Nattes à chat-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Back ache-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-SpringProof-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Lirazelf-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Vivekteraiyavt-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-bird.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Greenman-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Nattes à chat-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Back ache-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-SpringProof-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Lirazelf-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Vivekteraiyavt-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Rachlel-fish.wav [CC BY-SA 4.0]
- en-vi: File:LL-Q1860 (eng)-Naomi Persephone Amethyst (NaomiAmethyst)-fish.wav [CC BY-SA 4.0]
