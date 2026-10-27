# Piglingo Kids 🐷

App học tiếng Anh, tiếng Nhật và tiếng Trung cho bé từ 7 tuổi (giao diện tiếng Việt). Một codebase chạy cả **web** và **Android** (Expo / React Native).

Tiến độ (XP, chuỗi ngày, bài đã học, ôn tập SRS) **dùng chung** giữa 3 ngôn ngữ và được lưu trên máy, không mất khi tắt app.

## Trạng thái (Bước 0 + Bước 1 + Bước 2 đã tích hợp)

| Hạng mục | Trạng thái |
|---|---|
| Web (`expo export --platform web`) | Đã build và test trên trình duyệt headless |
| APK Android | Chưa build được trong môi trường phát triển; workflow GitHub Actions có sẵn (xem dưới) |
| 3 khóa học mẫu | en-vi (11 chủ đề, 44 bài), ja-vi (11, 39), zh-vi (10, 39) |
| Giao diện học | **Khu vườn của bé**: mỗi chủ đề là một luống hoa — học xong bài nào hoa nở bài đó; có nhạc nền du dương bật/tắt ở đầu màn hình học |
| Mở khóa bài học | Mặc định học lần lượt; nhập **mã mở khóa** ở tab Hồ sơ (hoặc đăng nhập bằng tài khoản admin) để mở toàn bộ — xem mục "Mã mở khóa & cấp độ" |
| Cấp độ người học | 3 cấp độ tự chọn: Mới bắt đầu / Đã biết cơ bản / Chuyên nghiệp — màn hình học gợi ý bài theo cấp độ |
| Trò chơi | 5 game trong tab Luyện tập: **Ghép thẻ trí nhớ** (`/game-memory`), **Nghe và chọn** (`/game-listen`), **Xếp câu cho đúng** (`/game-scramble`), **Đố nhanh 60 giây** (`/game-speed`, có lưu kỷ lục), **Đoán chữ bí mật** (`/game-letters`) — chơi thắng được thưởng XP |
| Web PWA | Có manifest + service worker, triển khai tự động lên GitHub Pages (workflow `web-pages.yml`) — xem mục "Chạy trên web (PWA)" |
| Ảnh nền tự chọn | Ở tab Hồ sơ: **chọn ảnh từ thư viện** (`expo-image-picker`) làm nền cho 3 màn tab chính (Học, Luyện tập, Hồ sơ). Ảnh được nén nhẹ và lưu trên thiết bị (data URL trong store), có lớp phủ mờ để chữ vẫn dễ đọc; bấm **Xóa nền** để quay về nền mặc định theo theme |
| Lưu tiến độ local | Có (zustand + AsyncStorage) |
| Ghi âm / chấm phát âm | **Đã tích hợp (Bước 2):** route `/speaking` lấy câu mẫu từ khóa đang học, ghi âm bằng `expo-audio`, nghe mẫu bằng `expo-speech`, chấm phát âm **mô phỏng** (offline) qua `MockPronunciationProvider` — thay provider thật về sau, xem `docs/STEP2-INTEGRATION.md` |
| Khu vực phụ huynh | **Đã tích hợp (Bước 2):** route `/parents`, cổng phép tính cho người lớn, dashboard đọc tiến độ thật từ store (adapter `src/lib/parentProgress.ts`), giới hạn thời gian dùng app — chỉ áp dụng sau khi phụ huynh đã tự đặt giới hạn |
| Hệ thống phần thưởng | **Đã tích hợp:** thưởng chung do Admin quản lý (`/admin-rewards`), màn xem thưởng của trẻ (`/rewards`), mục **Phần thưởng của con** trong khu phụ huynh, màn chúc mừng khi lần đầu hoàn thành 100% một khóa/cả 3 khóa (`/celebration`) — xem mục "Hệ thống phần thưởng" bên dưới |
| Tài khoản Supabase | **Đã tích hợp, tùy chọn (Bước 2):** route `/account`, đăng nhập email; khi đã đăng nhập, app tự đẩy snapshot tiến độ lên Supabase một lần mỗi phiên đăng nhập (`src/lib/useProgressSync.ts`). Project thật đã tạo (xem mục Supabase bên dưới); chỉ bật khi có file `.env` với `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mẫu ở `src/features/supabase/.env.example`, schema ở `src/features/supabase/schema.sql`). Không có `.env` thì app chạy local như cũ |

`package-lock.json` đã được cập nhật sau khi cài thêm 2 dependency của Bước 2 (`@supabase/supabase-js`, `react-native-url-polyfill`) bằng `npm install --legacy-peer-deps`.

## Chạy thử

```bash
npm install --legacy-peer-deps
npm run web                      # chạy web ở chế độ dev
npx expo export --platform web   # build web tĩnh vào dist/
npx tsc --noEmit                 # kiểm tra kiểu
```

Bản web xuất ra dạng tĩnh (`web.output = static`, có `src/app/+html.tsx` tùy biến thẻ PWA): mỗi route có sẵn file HTML riêng trong `dist/`, triển khai thẳng lên GitHub Pages.

## Chạy trên web (PWA)

Hướng đi hiện tại là **làm trên web trước**: bản web được triển khai tự động lên GitHub Pages mỗi khi đẩy code lên nhánh `main` (workflow `.github/workflows/web-pages.yml`), chạy tại:

**https://yagipig.github.io/Piglingo-Kids/**

(Đường dẫn con `/Piglingo-Kids` khớp `experiments.baseUrl` trong `app.json`; chỉ ảnh hưởng bản web.)

Bản web là PWA: có `public/manifest.json` và service worker `public/sw.js` (cache tài nguyên tĩnh để mở nhanh/chạy offline phần đã tải). Cài lên màn hình chính điện thoại Android như một app, **chưa cần build APK**:

1. Mở Chrome trên điện thoại, vào https://yagipig.github.io/Piglingo-Kids/
2. Bấm menu **⋮** ở góc phải → **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**).
3. Bấm **Cài đặt** — biểu tượng Piglingo 🐷 sẽ xuất hiện trên màn hình chính, mở lên là chạy toàn màn hình như app thật.

Build APK Android **tạm hoãn** tới khi bản web ổn định (workflow APK vẫn giữ trong repo, xem mục Build APK bên dưới).

## Mã mở khóa & cấp độ

- **Mã mở khóa toàn bộ bài học: `HEOVIP95`** — nhập ở tab **Hồ sơ → Mã mở khóa bài học**. Ai có mã này đều mở được toàn bộ bài học trên máy của mình (không cần học lần lượt). Khai báo mã ở `src/lib/unlock.ts` (đổi mã thì sửa hằng `UNLOCK_CODE` rồi build lại).
- **Tài khoản admin:** danh sách `ADMIN_EMAILS` trong `src/lib/unlock.ts` đang có sẵn `tuyenjp23@gmail.com` — đăng nhập Supabase bằng email này là tự mở khóa toàn bộ, không cần nhập mã. Thêm admin khác bằng cách thêm email vào danh sách rồi build lại.
- **Cấp độ người học:** chọn khi onboarding hoặc đổi bất cứ lúc nào ở tab Hồ sơ, gồm 3 mức: **Mới bắt đầu** (🌱), **Đã biết cơ bản** (🚀), **Chuyên nghiệp** (🏆). Bài học được phân tầng độ khó theo vị trí trong khóa (Cơ bản / Nâng cao / Chuyên sâu) và màn hình học hiển thị mục "Gợi ý theo cấp độ của bé" để nhảy nhanh tới bài phù hợp.
- **Nhạc nền khu vườn:** bản nhạc du dương tự tổng hợp (`assets/sfx/ambient-garden.mp3`, sinh bởi `scripts/make-ambient-music.py`, vòng lặp 48 giây, nghe lặp liền mạch). Bật/tắt bằng nút 🔊/🔇 ở đầu màn hình học; mặc định tắt và chỉ phát sau khi người dùng bật — đúng chính sách autoplay của trình duyệt web.

## Hệ thống phần thưởng

- **Phần thưởng chung:** app có sẵn bộ mẫu trong `src/lib/rewards-defaults.ts` (huy hiệu theo mốc 25/50/75%, rương khi xong một khóa, danh hiệu **Nhà thám hiểm ngôn ngữ** khi xong 100% cả 3 khóa và gợi ý dành cho phụ huynh). Admin có thể thêm/sửa/ẩn/sắp xếp/xem trước rồi công bố từ route `/admin-rewards`.
- **Cách cấp quyền Admin an toàn:** Admin chính là tài khoản Supabase có email nằm trong `ADMIN_EMAILS` ở `src/lib/unlock.ts` (hiện là `tuyenjp23@gmail.com`). **Không có tài khoản admin hoặc mật khẩu mặc định nào được tạo thêm.** Muốn đổi Admin phải sửa đồng thời email trong `ADMIN_EMAILS` và trong policy của bảng `app_config` ở `src/features/supabase/rewards-schema.sql`, rồi build lại app/chạy lại phần policy.
- **Phần thưởng riêng của gia đình:** phụ huynh vào `/parents`, qua cổng người lớn, rồi dùng mục **Phần thưởng của con** để nhập tên con, tên thưởng, lời nhắn, ngân sách dạng text tùy chọn, điều kiện theo khóa/mốc % hoặc cả 3 khóa, và chế độ giữ bí mật tới khi đạt. Chỉ phụ huynh mới bấm được **Xác nhận đã trao**; app không tự đánh dấu đã trao và không tích hợp thanh toán.
- **Dữ liệu & đồng bộ:** trạng thái đạt thưởng luôn suy ra từ tiến độ học hiện có, không lưu bản sao. Phần thưởng gia đình lưu local trước; khi phụ huynh đăng nhập, app đồng bộ bảng `family_rewards` theo tài khoản. Chưa đăng nhập thì dữ liệu chỉ nằm trên thiết bị đó. Cấu hình chung của Admin nằm ở bảng `app_config`, mọi máy đọc được nhưng chỉ email Admin mới ghi được nhờ RLS.
- **Chạy SQL phần thưởng:** mở Supabase Dashboard → SQL Editor của project `piglingo-kids`, chạy toàn bộ file `src/features/supabase/rewards-schema.sql` một lần (file idempotent, không sửa `schema.sql` cũ). Nếu chưa chạy SQL này, app vẫn dùng bộ thưởng mặc định/cache và phần thưởng gia đình local, nhưng chưa đồng bộ/công bố được lên server.

## Supabase (đã tạo project thật)

Project `piglingo-kids` trên Supabase (region **Singapore**) đã được tạo và đã chạy `src/features/supabase/schema.sql` ngày **26/10/2026** — gồm 2 bảng `profiles`, `user_progress` kèm Row Level Security (mỗi tài khoản chỉ đọc/ghi được dữ liệu của chính mình).

Cách chạy app với Supabase:

1. Sao chép `src/features/supabase/.env.example` thành file `.env` ở thư mục gốc project (cùng cấp `package.json`).
2. Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key) lấy trong Supabase Dashboard → *Project Settings → API Keys*. Chỉ dùng khóa công khai này; **tuyệt đối không** đưa `service_role`/secret key vào app.
3. Khởi động lại Expo (`npx expo start -c`) để biến môi trường mới có hiệu lực.

Lưu ý:

- File `.env` đã nằm trong `.gitignore` — **không commit `.env` lên Git**. Giá trị thật của khóa chỉ nằm ở máy của người vận hành, không ghi trong README hay mã nguồn.
- Không có `.env` (hoặc để trống 2 biến) thì Supabase tự tắt: app vẫn đăng nhập-không-cần và chạy **hoàn toàn offline** bằng dữ liệu local như cũ.
- Đồng bộ hiện tại: sau khi phụ huynh đăng nhập (route `/account`) và store local đã nạp xong, app tự đẩy snapshot tiến độ (tổng XP, streak, số bài từng ngôn ngữ, số thẻ SRS đến hạn) lên Supabase **một lần cho mỗi phiên đăng nhập**, chạy nền và bỏ qua lặng lẽ nếu mất mạng (hook `src/lib/useProgressSync.ts`). Snapshot là bản tóm tắt cho dashboard nên chiều kéo về **chưa** ghi đè store local — lý do ghi rõ trong `src/lib/useProgressSync.ts`.

## Build APK Android

**Cách 1 — GitHub Actions (khuyên dùng):** đẩy repo lên GitHub, vào *Actions → Build Android APK → Run workflow*. File APK nằm trong *Artifacts* (`piglingo-kids-apk`). APK release được ký bằng khóa debug mặc định của Expo, đủ để cài thử; muốn đưa lên Google Play cần khóa ký riêng.

**Cách 2 — EAS Build:** `npx eas build -p android --profile preview` (cần tài khoản Expo; lần đầu `eas init` sẽ tạo projectId).

**Cách 3 — Máy cá nhân:** cài Android Studio và JDK 17, rồi `npx expo run:android --variant release`.

## Nội dung học

Nội dung nằm trong `scripts/build-content.mjs` (tự viết cho dự án này). Sửa nội dung rồi chạy:

```bash
node scripts/build-content.mjs
```

Lệnh này sinh lại `src/content/packs/*.json` và `src/content/catalog.json`. Phát âm dùng TTS có sẵn trên thiết bị (`expo-speech`); chất lượng giọng nói tiếng Nhật và tiếng Trung phụ thuộc máy.

## License và ghi nhận nguồn

Xem `NOTICE.md`. Mã nguồn nền: Lingo Lessons (MIT).
