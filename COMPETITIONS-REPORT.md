# COMPETITIONS-REPORT — Mục "Cuộc thi & chứng chỉ tiếng Anh"

Ngày thực hiện: 29/10/2026. Phạm vi: thêm màn hình giới thiệu + liên kết tới trang chính thức của các cuộc thi/chứng chỉ tiếng Anh, chia theo 3 khối lớp của lộ trình. KHÔNG upload GitHub (để phía điều phối), KHÔNG đổi nội dung học/store/logic ranks/leaderboard/rewards.

## Dữ liệu — `src/lib/competitions.ts` (mới)

13 mục đúng đặc tả, URL dùng nguyên văn đã được điều phối kiểm chứng:

- **Khối Tiểu học (4):** IOE (ioe.vn) · Cambridge Young Learners (cambridgeenglish.org) · TOEFL Primary (ets.org) · Thi TOEFL Primary tại Việt Nam — IIG (iigvietnam.com)
- **Khối THCS (4):** IOE (ioe.vn) · Cambridge A2 Key for Schools · Cambridge B1 Preliminary for Schools · TOEFL Junior (ets.org)
- **Khối THPT (5):** IELTS — British Council (britishcouncil.vn) · IELTS — IDP (ielts.idp.com) · TOEFL iBT (ets.org) · Cambridge B2 First for Schools · IOE (ioe.vn)

Mỗi mục: `id, band, name, org, levelLabel, desc, url` + helper `competitionsForBand()` và `COMPETITION_SECTIONS` (tiêu đề "Khối Tiểu học (lớp 1–5)" / "Khối THCS (lớp 6–9)" / "Khối THPT (lớp 10–12)").

## Triển khai

| File | Thay đổi |
|---|---|
| `src/lib/competitions.ts` | **Mới** — dữ liệu 13 mục + sections + helper. |
| `src/app/competitions.tsx` | **Mới** — màn "🏆 Cuộc thi & chứng chỉ tiếng Anh", bọc `ScreenBackground` như achievements; 3 mục theo khối, khối trùng `schoolBand` (đọc từ store) đưa lên đầu + huy hiệu "Khối của em"; mỗi mục là thẻ `Pressable` (tên đậm, dòng đơn vị + chip trình độ, mô tả, "Xem trang chính thức ↗") mở `Linking.openURL(url)`, lỗi mở link hiện `Alert` thân thiện thuần Việt; cuối màn có ghi chú Piglingo không thu lệ phí/không đăng ký hộ. |
| `src/app/_layout.tsx` | Đăng ký `<Stack.Screen name="competitions" options={{ presentation: "modal" }} />` ngay sau `achievements`. |
| `src/components/garden-dashboard.tsx` | Thêm prop `onOpenCompetitions` (theo pattern `onOpenRewards`) + 1 thẻ bấm "🏆 Cuộc thi & chứng chỉ tiếng Anh" (phụ đề "IOE · Cambridge · TOEFL · IELTS theo khối lớp") đặt sau thẻ Thành tích & xếp hạng. Không sửa thẻ khác. |
| `src/app/(tabs)/index.tsx` | Nối `onOpenCompetitions={() => router.push("/competitions")}` cạnh `onOpenRewards`. |
| `scripts/test-competitions.mjs` | **Mới** — test tĩnh cho dữ liệu + nối dây (xem dưới). |

## Kiểm chứng (đã chạy thật)

- `node scripts/test-competitions.mjs`: **20/20 PASS** — đủ 13 mục; mỗi band ≥ 4 (Tiểu học 4, THCS 4, THPT 5); id không trùng; mọi URL `https://` và thuộc đúng domain chính thức (ioe.vn, cambridgeenglish.org, ets.org, iigvietnam.com, britishcouncil.vn, idp.com); route đã đăng ký; dashboard/index đã nối dây.
- `node scripts/test-garden.mjs`: **14/14 PASS** · `test-rewards.mjs`: **9/9 PASS** · `test-ranks.mjs`: **12/12 PASS**.
- Baseline packs đếm lại từ file thật: **80 unit / 314 bài / 2488 câu** — không đổi.
- `npx tsc --noEmit`: **0 lỗi**.
- `npx expo export --platform web`: **PASS** — route `/competitions` có trong bản export (`dist/competitions.html`); prerender chứa "Cuộc thi" (2), "IOE" (14), "Khối của em" (1), "Cambridge" (17).

## Việc còn lại phía điều phối

- Upload 6 file (competitions.ts, competitions.tsx, _layout.tsx, garden-dashboard.tsx, (tabs)/index.tsx, test-competitions.mjs) lên GitHub + kiểm chứng live trên 2 địa chỉ như các đợt trước.
- Chưa kiểm chứng thao tác mở liên kết ngoài trên thiết bị thật (Linking trên web mở tab mới; trên Android mở trình duyệt) — cần người dùng thử chạm 1 thẻ sau khi live.
