# Piglingo Kids 🐷

App học tiếng Anh, tiếng Nhật và tiếng Trung cho bé từ 7 tuổi (giao diện tiếng Việt). Một codebase chạy cả **web** và **Android** (Expo / React Native).

Tiến độ (XP, chuỗi ngày, bài đã học, ôn tập SRS) **dùng chung** giữa 3 ngôn ngữ và được lưu trên máy, không mất khi tắt app.

## Trạng thái (Bước 0 + Bước 1)

| Hạng mục | Trạng thái |
|---|---|
| Web (`expo export --platform web`) | Đã build và test trên trình duyệt headless |
| APK Android | Chưa build được trong môi trường phát triển; workflow GitHub Actions có sẵn (xem dưới) |
| 3 khóa học mẫu | en-vi (6 chủ đề, 24 bài), ja-vi (6, 19), zh-vi (5, 19) |
| Lưu tiến độ local | Có (zustand + AsyncStorage) |
| Ghi âm / chấm phát âm, khu vực phụ huynh, tài khoản Supabase | **Chưa làm** (Bước 2) |

## Chạy thử

```bash
npm install --legacy-peer-deps
npm run web                      # chạy web ở chế độ dev
npx expo export --platform web   # build web tĩnh vào dist/
npx tsc --noEmit                 # kiểm tra kiểu
```

Bản web xuất ra là SPA (`web.output = single`): máy chủ cần trả `index.html` cho mọi đường dẫn.

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
