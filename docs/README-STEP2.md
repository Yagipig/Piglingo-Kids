# Piglingo Kids 🐷 — Bổ sung Bước 2

> Đoạn README bổ sung cho gói Bước 2 trong thư mục `piglingo-kids-step2/`.
> Khi tích hợp xong, gộp nội dung này vào `README.md` chính của project
> và cập nhật bảng trạng thái. Hướng dẫn tích hợp chi tiết: xem `INTEGRATION.md`.

## Trạng thái (Bước 2 — gói bổ sung, chưa tích hợp vào project gốc)

| Hạng mục | Trạng thái |
|---|---|
| Ghi âm luyện nói (`expo-audio`) + nghe mẫu (`expo-speech`) | Có code hoàn chỉnh: hook ghi âm/phát lại, nút micro cho bé, màn hình luyện nói — **chưa chạy thử trên project gốc/thiết bị** |
| Chấm phát âm | Có interface `PronunciationProvider` + **provider mô phỏng (mock)** chạy offline: điểm tổng, điểm từng từ, sao, nhận xét tiếng Việt. **Chưa phải chấm thật** |
| Khu vực phụ huynh | Có code hoàn chỉnh: cổng phép tính, dashboard tiến độ qua interface `ProgressSnapshot`, giới hạn thời gian/ngày + gia hạn — cần nối adapter vào store thật |
| Tài khoản Supabase | Có code hoàn chỉnh: client tự tắt khi thiếu `.env`, đăng nhập/đăng ký email, đồng bộ tiến độ, `schema.sql` có RLS — **chưa chạy trên project Supabase thật** |
| APK Android | Không thay đổi so với Bước 1: vẫn build bằng GitHub Actions / EAS / máy cá nhân (xem README chính) |

## Cách chạy sau khi tích hợp

Giữ nguyên cách chạy của Bước 1:

```bash
npm install --legacy-peer-deps   # cài thêm @supabase/supabase-js + react-native-url-polyfill
npm run web                      # chạy web ở chế độ dev
npx tsc --noEmit                 # kiểm tra kiểu
```

Chạy thử nhanh từng tính năng:

- Luyện nói: mở route `/speaking-demo` (file mẫu `src/app-examples/speaking-demo.tsx`).
- Phụ huynh: mở route `/parents`, trả lời phép tính để vào dashboard.
- Tài khoản: mở route `/account` (chỉ hoạt động khi đã cấu hình Supabase như dưới đây).

## Cấu hình Supabase (tùy chọn)

Không cấu hình = app chạy local như Bước 1, không lỗi.

1. Tạo project tại [supabase.com](https://supabase.com).
2. Mở **SQL Editor**, dán và chạy file `src/features/supabase/schema.sql` (tạo bảng `profiles`, `user_progress` + RLS theo `auth.uid()`).
3. Copy `src/features/supabase/.env.example` thành `.env` ở thư mục gốc project, điền:
   - `EXPO_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — cùng trang → anon / publishable key (**không** dùng service_role key)
4. Khởi động lại Expo bằng `npx expo start -c`.
5. Bọc `<AuthProvider>` ở layout gốc và thêm route tài khoản như hướng dẫn trong `INTEGRATION.md` mục 5.

## Giới hạn hiện tại (đọc trước khi dùng)

- **Chấm phát âm là mô phỏng**: điểm số suy ra từ thời lượng ghi âm, máy không nghe được bé nói gì. Màn hình kết quả luôn gắn nhãn "điểm luyện tập mô phỏng". Muốn chấm thật phải nối dịch vụ Tencent / iFlytek / Azure Speech (cần tài khoản + credential riêng, và nên gọi qua backend của bạn để không lộ khóa bí mật trong app) — interface `PronunciationProvider` đã để sẵn đúng chỗ để thay.
- **Chưa kiểm chứng trên project gốc**: gói này được viết dạng drop-in khi chưa có thư mục `src/` của project; đã qua kiểm tra kiểu tĩnh bằng stub types và test logic bằng Node (chi tiết trong `INTEGRATION.md` mục 8), nhưng chưa build chung với project, chưa chạy trên máy Android/web thật, và `schema.sql` chưa chạy trên Supabase thật.
- **Dashboard phụ huynh cần nối adapter**: route mẫu hiển thị số liệu mẫu (`DEV_SAMPLE_SNAPSHOT`); muốn hiện số liệu thật phải map store zustand của app sang `ProgressSnapshot` (một hàm ngắn, xem `INTEGRATION.md` mục 4.2).
- Giới hạn thời gian tính theo thời gian app ở **foreground** trên chính máy đó; tắt app bằng cách vuốt khỏi đa nhiệm vẫn được tính đúng theo tick đã lưu, nhưng đây không phải cơ chế quản lý trẻ em cấp hệ điều hành (không thay được Family Link / Screen Time).
- Nội dung học và phát âm mẫu không thay đổi ở Bước 2: vẫn sinh từ `scripts/build-content.mjs`, phát âm mẫu vẫn dùng `expo-speech` của thiết bị.
