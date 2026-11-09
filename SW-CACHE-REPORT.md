# SW-CACHE-REPORT — Sửa triệt để lỗi kẹt giao diện cũ (service worker)

Ngày: 09/11/2026 · Phạm vi: chỉ các file service worker / đăng ký SW.
Không đổi logic app, không đổi nội dung; baseline 80 unit / 314 bài / 2488 câu giữ nguyên.
Chưa upload GitHub (theo chỉ đạo đợt này).

## File đã sửa / tạo

| File | Thay đổi |
|---|---|
| `public/sw.js` | Viết lại cơ chế cache (xem dưới) |
| `src/app/+html.tsx` | Chỉ sửa script đăng ký service worker inline |
| `scripts/test-service-worker.mjs` | Mới — 18 khẳng định tĩnh, 18/18 PASS |
| `SW-CACHE-REPORT.md` | Báo cáo này |

## Cơ chế TRƯỚC

- Tên cache CỐ ĐỊNH vĩnh viễn: `piglingo-kids-v1` — mọi bản dựng dùng chung một cache, không có khái niệm phiên bản.
- Điều hướng: network-first trên giấy, nhưng trang HTML được lưu vào cùng cache cố định và app shell được precache lúc install; khi worker cũ còn điều khiển trang, bản HTML/JS cũ cứ thế được phục vụ lại, không có mốc nào buộc làm mới.
- Trang chỉ đăng ký SW lúc `load`, không bao giờ chủ động gọi kiểm tra bản SW mới — phải chờ chu kỳ kiểm tra mặc định của trình duyệt, nên bản sửa SW (nếu có) đến máy người dùng rất chậm.

## Cơ chế SAU

1. **Tên cache gắn phiên bản bản dựng của chính sw.js**: hằng số `SW_VERSION = "20261109-2"` (đóng dấu ngày sửa + số lần sửa trong ngày), `CACHE_NAME = "piglingo-cache-" + SW_VERSION`. Vì quy trình phát hành là tải file qua giao diện web GitHub rồi `npx expo export --platform web` (Expo chép nguyên `public/` vào `dist/`), không có bước build nào tự chèn mã bản dựng vào `public/sw.js` được — đóng dấu phiên bản ngay trong file là cơ chế khả thi nhất, và nó đủ: trình duyệt phát hiện SW mới bằng cách so từng byte của `sw.js`, nên chỉ cần nội dung file đổi là chu kỳ cập nhật chạy. **Quy tắc bắt buộc từ nay: mỗi lần sửa `public/sw.js` phải tăng `SW_VERSION`.** Tài nguyên JS/CSS của app vốn đã được Expo băm theo nội dung trong tên file nên luôn khớp đúng bản dựng của HTML tham chiếu tới.
2. **Điều hướng + tài liệu HTML: NETWORK-FIRST thật sự** — `fetch(request, { cache: "no-cache" })` lấy bản mới nhất từ server (bỏ qua cả HTTP cache trung gian), chỉ khi mất mạng mới trả `index.html` đã lưu để app vẫn mở được offline. Nhận diện tài liệu gồm `mode === "navigate"`, `destination === "document"` và header `Accept: text/html`.
3. **Tài nguyên tĩnh** (JS/CSS/ảnh/font, tên đã băm): cache-first nhưng chỉ trong cache của phiên bản hiện tại; response không `ok` không được lưu.
4. **Request khác**: non-GET và khác origin (Supabase API…) — SW không can thiệp, không cache, như trước.
5. **Khi worker mới activate**: xóa MỌI cache không phải của phiên bản hiện tại — **kể cả cache tên cố định của bản đầu tiên** — rồi `skipWaiting()` (đã có ở install) + `clients.claim()` giành điều khiển ngay, không chờ đóng tab.
6. **Phía trang (`+html.tsx`)**: sau khi đăng ký, gọi `registration.update()` ngay khi mở app, và kiểm tra lại mỗi khi app quay lại foreground (`visibilitychange` → visible, `focus`). Thêm nữa: nếu trang đang do worker cũ điều khiển mà worker mới vừa giành quyền (`controllerchange`), trang **tự nạp lại đúng một lần** (có cờ chặn vòng lặp trong `sessionStorage`), nên người dùng không phải tự tay làm gì thêm.

## Vì sao máy đang kẹt thoát ra được

Chuỗi thoát kẹt, theo đúng thứ tự xảy ra trên máy người dùng:

1. Người dùng mở app (bản cũ đang hiện) → script đăng ký gọi `registration.update()` ngay → trình duyệt tải `sw.js` mới từ server và thấy nội dung khác bản đang chạy.
2. Worker mới install: precache app shell vào cache phiên bản mới, `skipWaiting()` bỏ qua trạng thái chờ.
3. Worker mới activate: **xóa toàn bộ cache cũ** (gồm cache cố định chứa giao diện cũ), `clients.claim()` giành điều khiển trang hiện tại.
4. `controllerchange` phía trang → trang tự nạp lại một lần → lần nạp này do worker mới phục vụ, điều hướng đi network-first → HTML mới nhất + JS đã băm mới → **giao diện mới hiện ra**.

Toàn bộ chỉ cần bản `sw.js` mới này được phát hành lên server (cùng đợt đẩy code redesign); phía người dùng không cần xóa dữ liệu trang, không cần gỡ app.

## Người dùng cần làm gì

- **Tối đa một lần tải lại cuối cùng**: mở app Piglingo như bình thường (bấm biểu tượng ở màn hình chính hoặc mở lại link), để trang tải xong; nếu bản mới chưa hiện ngay thì tải lại trang **một lần** (kéo xuống để làm mới trên điện thoại, hoặc nút tải lại trên trình duyệt). Sau lần đó giao diện mới sẽ hiện và giữ nguyên.
- **Từ sau lần đó: không cần đóng tab thủ công, không cần xóa cache nữa** — mỗi lần mở app, điều hướng lấy bản mới nhất từ server và app tự kiểm tra bản SW mới khi quay lại foreground.

## Phân biệt quan trọng: không phải mọi "giao diện cũ" đều là lỗi cache

- App đã cài ở màn hình chính trỏ tới **bản chính `piglingo.vercel.app`** — bản này vẫn là giao diện cũ vì **redesign chưa được gộp vào bản chính**, không phải lỗi cache. SW sửa ở đợt này chỉ bảo đảm: khi redesign được phát hành lên bản chính, máy người dùng sẽ nhận ngay thay vì kẹt lại. Muốn xem giao diện mới ngay lúc này thì mở link bản xem trước (preview) như các đợt trước.
- Ngược lại, nếu link preview/bản chính đã phát hành bản mới mà máy vẫn hiện bản cũ sau một lần tải lại, đó mới là dấu hiệu cache — cơ chế ở trên xử lý đúng trường hợp đó.

## Kiểm chứng đã chạy

- `scripts/test-service-worker.mjs`: **18/18 PASS** — network-first cho điều hướng/HTML (fetch trước, fallback cache sau, kèm `no-cache`), tên cache chứa thành phần phiên bản và không còn chuỗi tên cố định cũ, activate xóa cache khác phiên bản, có `skipWaiting` + `clients.claim`, tĩnh cache-first theo phiên bản, non-GET/khác origin bị bỏ qua, phía app có `registration.update()` + kiểm tra khi foreground + tự nạp lại một lần.
- Toàn bộ test cũ PASS nguyên số lượng: games-stability 14, spin 20, pets 21, adventure-map 26, companion 9, lesson-ui 16, level-floor 11, garden 14, rewards 9, ranks 12, competitions 20, provinces 30, worldmap 76. (Chưa có `test-skills` trên đĩa — khu kỹ năng đang được xây ở đợt khác, không thuộc đợt này.)
- `npx tsc --noEmit`: **0 lỗi**.
- `npx expo export --platform web`: **PASS**; `dist/sw.js` là bản mới (chứa `SW_VERSION = "20261109-2"`, 0 lần xuất hiện của tên cache cố định cũ) và `dist/index.html` chứa script đăng ký mới (`registration.update()`).
- Chưa kiểm chứng trên thiết bị thật: hành vi tự nạp lại một lần khi `controllerchange` và việc xóa cache cũ trên máy đã cài PWA — cần nghiệm thu khi đợt này được đẩy lên preview/bản chính.
