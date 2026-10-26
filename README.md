# Piglingo Kids 🐷

App học tiếng Anh, tiếng Nhật và tiếng Trung cho bé từ 7 tuổi (giao diện tiếng Việt). Một codebase chạy cả **web** và **Android** (Expo / React Native).

Tiến độ (XP, chuỗi ngày, bài đã học, ôn tập SRS) **dùng chung** giữa 3 ngôn ngữ và được lưu trên máy, không mất khi tắt app.

## Trạng thái (Bước 0 + Bước 1 + Bước 2 đã tích hợp)

| Hạng mục | Trạng thái |
|---|---|
| Web (`expo export --platform web`) | Đã build và test trên trình duyệt headless |
| APK Android | Chưa build được trong môi trường phát triển; workflow GitHub Actions có sẵn (xem dưới) |
| 3 khóa học mẫu | en-vi (6 chủ đề, 24 bài), ja-vi (6, 19), zh-vi (5, 19) |
| Lưu tiến độ local | Có (zustand + AsyncStorage) |
| Ghi âm / chấm phát âm | **Đã tích hợp (Bước 2):** route `/speaking` lấy câu mẫu từ khóa đang học, ghi âm bằng `expo-audio`, nghe mẫu bằng `expo-speech`, chấm phát âm **mô phỏng** (offline) qua `MockPronunciationProvider` — thay provider thật về sau, xem `docs/STEP2-INTEGRATION.md` |
| Khu vực phụ huynh | **Đã tích hợp (Bước 2):** route `/parents`, cổng phép tính cho người lớn, dashboard đọc tiến độ thật từ store (adapter `src/lib/parentProgress.ts`), giới hạn thời gian dùng app — chỉ áp dụng sau khi phụ huynh đã tự đặt giới hạn |
| Tài khoản Supabase | **Đã tích hợp, tùy chọn (Bước 2):** route `/account`, đăng nhập email; khi đã đăng nhập, app tự đẩy snapshot tiến độ lên Supabase một lần mỗi phiên đăng nhập (`src/lib/useProgressSync.ts`). Project thật đã tạo (xem mục Supabase bên dưới); chỉ bật khi có file `.env` với `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mẫu ở `src/features/supabase/.env.example`, schema ở `src/features/supabase/schema.sql`). Không có `.env` thì app chạy local như cũ |

`package-lock.json` đã được cập nhật sau khi cài thêm 2 dependency của Bước 2 (`@supabase/supabase-js`, `react-native-url-polyfill`) bằng `npm install --legacy-peer-deps`.

## Chạy thử

```bash
npm install --legacy-peer-deps
npm run web                      # chạy web ở chế độ dev
npx expo export --platform web   # build web tĩnh vào dist/
npx tsc --noEmit                 # kiểm tra kiểu
```

Bản web xuất ra là SPA (`web.output = single`): máy chủ cần trả `index.html` cho mọi đường dẫn.

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
