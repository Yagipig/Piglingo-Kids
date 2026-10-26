# INTEGRATION.md — Hướng dẫn tích hợp gói Bước 2 vào Piglingo Kids

Gói này bổ sung 3 tính năng còn thiếu của Bước 2:

1. **Luyện nói**: ghi âm bằng `expo-audio`, nghe mẫu bằng `expo-speech`, chấm phát âm qua interface `PronunciationProvider` (mặc định là provider **mô phỏng** chạy offline).
2. **Khu vực phụ huynh**: cổng xác thực bằng phép tính (`ParentGate`), dashboard tiến độ (`ParentDashboard`), giới hạn thời gian dùng app mỗi ngày (`TimeLimitGuard`).
3. **Tài khoản Supabase (tùy chọn)**: đăng nhập email cho phụ huynh + đồng bộ tiến độ lên bảng `user_progress`. **Thiếu biến môi trường thì tính năng tự tắt, app vẫn chạy local như Bước 1.**

> ⚠️ **Trạng thái trung thực của gói này**: đây là module **drop-in tự chứa**, viết để nối vào project Piglingo Kids theo các điểm nối mô tả dưới đây. Gói được viết khi **không có thư mục `src/` gốc** của project, nên *chưa* được tích hợp thật, *chưa* build cùng project gốc và *chưa* chạy trên thiết bị. Phần "Kiểm chứng đã thực hiện" ở cuối file ghi rõ cái gì đã kiểm tra được và cái gì chưa. Đừng coi gói này là "đã chạy được trên Piglingo Kids" cho tới khi làm xong checklist ở mục 7 ngay trên project thật.

---

## 1. Trong gói có gì

| Đường dẫn trong gói | Đích khi tích hợp |
|---|---|
| `package.json` | Đối chiếu / thay cho `package.json` ở root project (xem mục 2.1) |
| `app.json` | Đối chiếu / thay cho `app.json` ở root project (xem mục 2.2) |
| `src/features/speaking/` | Copy nguyên thư mục vào `src/features/speaking/` |
| `src/features/parents/` | Copy nguyên thư mục vào `src/features/parents/` |
| `src/features/supabase/` | Copy nguyên thư mục vào `src/features/supabase/` |
| `src/app-examples/parents.tsx` | Copy thành `src/app/parents.tsx` rồi sửa adapter (mục 4) |
| `src/app-examples/account.tsx` | Copy thành `src/app/account.tsx` |
| `src/app-examples/speaking-demo.tsx` | Copy thành `src/app/speaking-demo.tsx` **chỉ để test**, xóa trước khi phát hành |
| `src/features/supabase/.env.example` | Copy thành `.env` ở **root project** rồi điền giá trị (mục 5) |
| `src/features/supabase/schema.sql` | Chạy trong Supabase Dashboard → SQL Editor (mục 5) |
| `verification/` | Harness kiểm chứng tĩnh của riêng gói này — **không** copy vào project |
| `README-STEP2.md` | Gắn vào / thay đoạn trạng thái trong `README.md` của project |

---

## 2. Bước 1 — Cập nhật cấu hình

### 2.1. `package.json`: chỉ thêm 2 dependency

So với `package.json` gốc, bản trong gói chỉ thêm đúng 2 dòng vào `dependencies` (mọi thứ khác giữ nguyên từng chữ):

```json
"@supabase/supabase-js": "^2.45.0",
"react-native-url-polyfill": "^2.0.0"
```

`react-native-url-polyfill` là polyfill bắt buộc để `@supabase/supabase-js` chạy trên React Native (được import ở dòng đầu `src/features/supabase/client.ts`).

Cách áp dụng — chọn **một** trong hai:

- **Cách A (an toàn nhất)**: tự thêm 2 dòng trên vào `package.json` hiện tại của project, rồi chạy `npm install --legacy-peer-deps` (đúng lệnh project đang dùng).
- **Cách B**: dùng file `package.json` trong gói thay cho file gốc — chỉ khi file gốc chưa bị sửa gì thêm kể từ bản đã tải lên ngày 26/10/2026. Nếu đã sửa, dùng Cách A.

### 2.2. `app.json`: bổ sung mô tả quyền micro cho iOS

So với `app.json` gốc, bản trong gói thay đổi đúng 2 chỗ, nội dung còn lại giữ nguyên:

1. Trong `expo.ios.infoPlist` thêm:

```json
"NSMicrophoneUsageDescription": "Piglingo Kids cần dùng micro để bé ghi âm và luyện phát âm."
```

2. Plugin `expo-audio` chuyển từ dạng chuỗi `"expo-audio"` sang dạng có cấu hình, để thông điệp xin quyền micro trên iOS dùng đúng câu tiếng Việt ở trên:

```json
[
  "expo-audio",
  {
    "microphonePermission": "Piglingo Kids cần dùng micro để bé ghi âm và luyện phát âm."
  }
]
```

Quyền Android (`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`) và plugin `expo-audio` **đã có sẵn** trong `app.json` gốc nên không phải thêm. Sau khi sửa `app.json`, cần build lại bản native (EAS / dev client) thì thay đổi quyền mới có hiệu lực; chạy lại Metro là chưa đủ.

> Có thể áp dụng tương tự Cách A/Cách B như `package.json`.

---

## 3. Bước 2 — Tích hợp tính năng luyện nói (ghi âm / chấm phát âm)

### 3.1. Copy code

Copy thư mục `src/features/speaking/` của gói vào `src/features/speaking/` của project. Module này chỉ dùng các dependency project đã có: `expo-audio` (~56.0.12), `expo-speech` (~56.0.3), `react`, `react-native`. Không cần cài thêm gì.

Các file chính:

- `types.ts` — kiểu dữ liệu + interface `PronunciationProvider` + quy đổi điểm → sao.
- `MockPronunciationProvider.ts` — provider mô phỏng, offline.
- `usePronunciationRecorder.ts` — hook ghi âm/phát lại dùng API hiện hành của expo-audio: `useAudioRecorder(RecordingPresets.HIGH_QUALITY)`, `useAudioRecorderState`, `AudioModule.requestRecordingPermissionsAsync()`, `setAudioModeAsync(...)`, file ghi âm ở `recorder.uri`, phát lại bằng `useAudioPlayer()` + `player.replace({ uri })`.
- `RecordButton.tsx` — nút micro thật to cho bé.
- `PronunciationResultView.tsx` — hiển thị sao, điểm chi tiết, điểm từng từ; điểm mô phỏng luôn có nhãn rõ ràng.
- `SpeakingPracticeScreen.tsx` — màn hình luyện nói hoàn chỉnh cho một câu mẫu.

### 3.2. Chạy thử độc lập trước

Copy `src/app-examples/speaking-demo.tsx` thành `src/app/speaking-demo.tsx`, mở app và vào route `/speaking-demo`. Bé bấm "Nghe mẫu" → bấm micro đọc theo → thấy sao và lời khen, nghe lại được giọng của mình. Chạy thử xong thì xóa route demo này trước khi phát hành.

### 3.3. Nối vào màn hình bài học

Trong màn hình bài học hiện có, render thêm component với câu mẫu lấy từ content pack của bài:

```tsx
import { SpeakingPracticeScreen } from '@/features/speaking/SpeakingPracticeScreen';

<SpeakingPracticeScreen
  targetText={lesson.speakingText}   // ← trường câu mẫu trong content pack của bạn;
                                     //   nếu pack dùng tên trường khác, map lại ở đây
  hintText={lesson.speakingHint}
  language={lesson.language}         // 'en' | 'ja' | 'zh' — khớp mã khóa en-vi / ja-vi / zh-vi
  onAssessed={(result) => {
    // Ví dụ: lưu số lượt luyện nói / sao vào store tiến độ hiện có của app.
    // Thay bằng hàm thật của store trong project (tên hàm dưới đây chỉ là ví dụ):
    // progressStore.recordSpeakingAttempt(result.stars, result.overallScore);
  }}
/>
```

Alias `@/` trỏ về `./src/*` theo `tsconfig.json` hiện tại của project, nên import dạng `@/features/...` dùng được.

### 3.4. Thay mock provider bằng provider chấm thật (sau này)

Đây là thay đổi **có chủ đích để lại cho giai đoạn sau** — ở Bước 2 này chỉ có điểm mô phỏng, UI cũng ghi rõ "điểm luyện tập mô phỏng". Khi làm thật:

1. Viết một class mới implements `PronunciationProvider` (cùng thư mục), ví dụ `CloudPronunciationProvider`, với `assess(request)` gửi `request.audioUri` lên dịch vụ chấm và trả về đúng `PronunciationResult`.
2. Truyền provider đó qua prop `provider` của `SpeakingPracticeScreen`. Không sửa UI, không sửa hook ghi âm.
3. Dịch vụ tham khảo (theo hướng đã chọn từ Kid English Reading): Tencent / iFlytek / Azure Speech. Cả ba đều cần tài khoản + credential riêng.
4. **Bảo mật**: không nhúng secret key của dịch vụ chấm vào app. App phải gửi file ghi âm lên một backend/edge function của chính bạn, backend mới gọi dịch vụ chấm bằng khóa bí mật. Vì vậy chấm thật cần thêm một thành phần máy chủ — lý do nó không nằm trong gói Bước 2 này.

---

## 4. Bước 3 — Tích hợp khu vực phụ huynh

### 4.1. Copy code và tạo route

Copy `src/features/parents/` vào project và `src/app-examples/parents.tsx` thành `src/app/parents.tsx`. Thêm một nút/đường dẫn "Dành cho ba/mẹ" ở màn hình chính hoặc màn hình cài đặt trỏ tới `/parents`.

Module này dùng `@react-native-async-storage/async-storage` (project đã có) để lưu: cài đặt giới hạn (`piglingo.parents.settings.v1`), thời gian dùng theo ngày (`piglingo.parents.usage.v1`), phiên mở khóa phụ huynh (`piglingo.parents.session.v1`).

### 4.2. Nối dashboard vào store tiến độ thật (điểm nối quan trọng nhất)

Dashboard **không** đọc store trực tiếp — nó đọc qua interface `ProgressSnapshot` (xem `src/features/parents/types.ts`). Route mẫu đang dùng số liệu giả `DEV_SAMPLE_SNAPSHOT` để chạy thử giao diện. Muốn hiện số liệu thật, tạo adapter bọc zustand store của app bằng `createZustandProgressAdapter` và truyền vào `ParentAreaScreen`:

```tsx
import { createZustandProgressAdapter } from '@/features/parents/progressAdapter';
// useProgressStore = store thật của project (đổi tên/trường theo store của bạn)
import { useProgressStore } from '@/store/progress';

const progressSource = createZustandProgressAdapter(useProgressStore, (state) => ({
  totalXp: state.xp,
  streakDays: state.streak,
  lastStudyDate: state.lastStudyDate,
  lessonsCompleted: state.completedLessonIds.length,
  perLanguage: {
    en: { xp: state.xpByLang?.en ?? 0, lessonsCompleted: state.doneByLang?.en ?? 0 },
    ja: { xp: state.xpByLang?.ja ?? 0, lessonsCompleted: state.doneByLang?.ja ?? 0 },
    zh: { xp: state.xpByLang?.zh ?? 0, lessonsCompleted: state.doneByLang?.zh ?? 0 },
  },
  srsDueCount: state.srsDueIds.length,
  updatedAt: state.updatedAt ?? Date.now(),
}));
```

Các tên trường ở vế phải (`state.xp`, `state.completedLessonIds`...) là **ví dụ minh họa** — hãy thay bằng trường thật trong store của project. Đây là đoạn code duy nhất của khu vực phụ huynh mà người tích hợp bắt buộc phải viết theo project của mình; mọi thứ còn lại dùng ngay được.

### 4.3. Bật giới hạn thời gian dùng app

Bọc phần app dành cho bé (không bọc khu vực phụ huynh) bằng `TimeLimitGuard`. Ví dụ trong layout của nhóm màn hình của bé:

```tsx
import { TimeLimitGuard } from '@/features/parents/TimeLimitGuard';
import { useParentSettings } from '@/features/parents/useParentSettings';

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useParentSettings();
  if (!isLoaded) return null;
  return <TimeLimitGuard settings={settings}>{children}</TimeLimitGuard>;
}
```

Cách hoạt động: guard đếm thời gian app ở foreground trong ngày (tick 15 giây, lưu AsyncStorage), hết giờ thì thay nội dung bằng màn hình nghỉ; phụ huynh bấm "gia hạn" phải qua `ParentGate` rồi mới cộng thêm 10/20/30 phút cho riêng hôm đó. Giới hạn mặc định là 30 phút/ngày, phụ huynh đổi được trong dashboard (15/30/45/60/90 phút hoặc không giới hạn).

> Lưu ý: đừng bọc cả route `/parents` trong guard, nếu không hết giờ thì chính phụ huynh cũng bị chặn bởi màn hình nghỉ (dù vẫn có lối gia hạn qua ParentGate ở đó, trải nghiệm sẽ khó hiểu).

---

## 5. Bước 4 — Tích hợp Supabase (tùy chọn, mặc định tắt)

Bỏ qua toàn bộ mục này nếu chỉ muốn chạy local — không cấu hình gì thì app hoạt động y hệt Bước 1.

### 5.1. Tạo project và chạy schema

1. Tạo project tại Supabase (đăng ký tài khoản của bạn).
2. Mở **SQL Editor**, dán toàn bộ `src/features/supabase/schema.sql` và Run. File tạo 2 bảng `profiles`, `user_progress`, trigger tạo profile khi có user mới, và **Row Level Security** với policy theo `auth.uid()` (mỗi phụ huynh chỉ truy cập được dòng của mình). File chạy lại được.
3. (Tùy chọn) Trong **Authentication → Providers → Email**, cân nhắc tắt "Confirm email" khi test nội bộ để đăng ký xong đăng nhập được ngay; bản phát hành nên bật lại.

### 5.2. Biến môi trường

Copy `src/features/supabase/.env.example` thành file `.env` ở **root project** (cùng cấp `package.json`) và điền:

| Biến | Lấy ở đâu | Ghi chú |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | Công khai |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Cùng trang → Project API keys → anon / publishable | Công khai, an toàn **khi đã bật RLS**. **Không** dùng service_role key |

Sau khi sửa `.env`, khởi động lại Expo bằng `npx expo start -c` (xóa cache) thì biến mới có hiệu lực. Không commit file `.env` thật lên Git (chỉ commit `.env.example`).

**Bật / tắt tính năng**: thiếu hoặc để trống 1 trong 2 biến → `isSupabaseEnabled = false`, `supabase = null`, màn hình tài khoản hiện "Đồng bộ đám mây đang tắt", app chạy local bình thường, không crash. Đây là hành vi đã được code sẵn trong `client.ts`.

### 5.3. Bọc `AuthProvider` ở layout gốc

```tsx
// src/app/_layout.tsx
import { AuthProvider } from '@/features/supabase/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* toàn bộ nội dung layout hiện tại của bạn */}
    </AuthProvider>
  );
}
```

Copy `src/app-examples/account.tsx` thành `src/app/account.tsx` để có màn hình đăng nhập/đăng ký/đăng xuất. Nên đặt đường dẫn vào màn hình này **bên trong khu vực phụ huynh** (dashboard đã có sẵn prop `onOpenAccount`, route mẫu `parents.tsx` đã nối sẵn nút này tới `/account`).

### 5.4. Nối đồng bộ tiến độ

`src/features/supabase/progressSync.ts` cung cấp `pushProgress(userId, snapshot)`, `pullProgress(userId)` và `syncProgress(localSnapshot)` (tự so `updatedAt` hai phía, phía mới hơn thắng). Cách nối điển hình — gọi khi app mở và sau khi đăng nhập thành công:

```ts
import { syncProgress } from '@/features/supabase/progressSync';

// progressSource là adapter ở mục 4.2; applySnapshotToStore là hàm ghi snapshot
// vào store thật của project (người tích hợp tự viết theo store của mình).
const outcome = await syncProgress(progressSource.getSnapshot());
if (outcome.direction === 'pulled' && outcome.snapshot) {
  applySnapshotToStore(outcome.snapshot);
}
```

Đồng bộ là **lớp phủ tùy chọn**: không gọi các hàm này thì không có gì bị ảnh hưởng; gọi khi chưa đăng nhập trả về `{ direction: 'signed-out' }`, khi Supabase đang tắt trả về `{ direction: 'disabled' }`, không throw.

---

## 6. Tổng hợp các điểm nối (điểm tích hợp bắt buộc)

| # | Điểm nối | Việc phải làm | Mức độ |
|---|---|---|---|
| 1 | `package.json` | Thêm 2 dependency (mục 2.1) + `npm install --legacy-peer-deps` | Bắt buộc nếu dùng Supabase |
| 2 | `app.json` | Thêm mô tả quyền micro iOS + cấu hình plugin expo-audio (mục 2.2), rồi build lại native | Bắt buộc cho iOS |
| 3 | Màn hình bài học | Render `SpeakingPracticeScreen` với câu mẫu từ content pack (mục 3.3) | Bắt buộc cho luyện nói |
| 4 | Route phụ huynh | Copy route mẫu + viết adapter map store → `ProgressSnapshot` (mục 4.2) | Bắt buộc cho dashboard thật |
| 5 | Layout phần bé | Bọc `TimeLimitGuard` (mục 4.3) | Bắt buộc cho giới hạn giờ |
| 6 | Root layout | Bọc `AuthProvider` (mục 5.3) | Chỉ khi dùng Supabase |
| 7 | App khởi động / sau đăng nhập | Gọi `syncProgress` + áp snapshot kéo về (mục 5.4) | Chỉ khi dùng Supabase |

---

## 7. Checklist kiểm thử trên project thật

**Luyện nói**
- [ ] Mở `/speaking-demo`: nghe mẫu phát tiếng Anh đúng câu, tốc độ chậm.
- [ ] Bấm micro lần đầu: hệ điều hành hỏi quyền micro; từ chối quyền thì hiện thông báo tiếng Việt dễ hiểu, app không crash.
- [ ] Ghi âm ≥ 2 giây rồi dừng: nghe lại được giọng mình; có sao + điểm + nhãn "điểm luyện tập mô phỏng".
- [ ] Ghi âm quá ngắn (chạm dừng ngay): điểm "Đọc đủ" thấp hơn rõ rệt.
- [ ] Thử trên Android thật và trên web (Chrome) — ghi âm web dùng MediaRecorder, định dạng file khác native.

**Phụ huynh**
- [ ] Vào `/parents`: bị hỏi phép tính; trả lời sai hiện lỗi và đổi câu hỏi; trả lời đúng vào được dashboard.
- [ ] Đóng/mở lại app trong 10 phút: không bị hỏi lại (phiên còn hạn); sau 10 phút bị hỏi lại.
- [ ] Đổi giới hạn sang 15 phút: cài đặt còn nguyên sau khi tắt/mở app.
- [ ] Dùng app tới khi hết giờ (có thể test bằng cách đặt giới hạn nhỏ qua sửa AsyncStorage khi dev): hiện màn hình nghỉ; gia hạn qua ParentGate cộng đúng số phút cho hôm đó; sang ngày mới số phút dùng trở về 0.
- [ ] Dashboard hiện đúng số liệu thật sau khi đã nối adapter ở mục 4.2 (đối chiếu với store).

**Supabase**
- [ ] Chưa có `.env`: app chạy bình thường, màn hình tài khoản báo đang tắt.
- [ ] Có `.env` đúng: đăng ký tài khoản mới → có dòng trong bảng `profiles`; đăng nhập lại được sau khi tắt/mở app (phiên được lưu bằng AsyncStorage).
- [ ] Gọi đồng bộ: bảng `user_progress` có đúng 1 dòng cho user đó; đăng nhập bằng tài khoản khác không đọc được dòng của tài khoản đầu (kiểm chứng RLS bằng cách thử truy vấn trong SQL Editor với vai trò anon/authenticated hoặc đăng nhập 2 tài khoản trên 2 máy).
- [ ] Tắt mạng: học tiếp bình thường bằng dữ liệu local; bật mạng lại đồng bộ không báo lỗi khó hiểu.

**Tổng thể**
- [ ] `npx tsc --noEmit` trong project gốc không có lỗi mới từ thư mục `src/features/`.
- [ ] `npx expo export --platform web` build thành công.
- [ ] Build lại APK/dev client sau khi sửa `app.json` và kiểm tra quyền micro trên máy Android thật.

---

## 8. Kiểm chứng đã thực hiện trên gói này (và giới hạn)

Đã thực hiện (ngày 26/10/2026, trong môi trường tạo gói):

1. **Kiểm tra kiểu tĩnh toàn gói đạt (`tsc --noEmit` thoát mã 0)** bằng harness trong thư mục `verification/`: TypeScript 5.9.3, `strict: true`, kiểm tra toàn bộ `src/features/**` và `src/app-examples/**` — nhưng với **stub types tối thiểu** tự viết cho react / react-native / expo-audio / expo-speech / expo-router / AsyncStorage / supabase-js (trong `verification/stubs/`), vì môi trường tạo gói không có project gốc để cài dependency thật. Muốn chạy lại: `cd verification && npm install && npm run typecheck`.
2. **Test logic bằng Node đạt** cho các phần không phụ thuộc giao diện: `MockPronunciationProvider` (điểm luôn trong 0–100, tách từ tiếng Anh theo khoảng trắng, tách tiếng Nhật theo ký tự, ghi âm quá ngắn cho điểm "đọc đủ" thấp hơn, cùng đầu vào cho cùng điểm từng từ) và logic giới hạn thời gian trong `parentStorage.ts` (cộng giây đã dùng, gia hạn, tính phút còn lại, không giới hạn khi cài đặt là `null`) — dùng AsyncStorage giả lập trong bộ nhớ.

**Chưa** kiểm chứng được (phải làm trên project thật theo mục 7):

- Chưa biên dịch với types thật của Expo SDK 56 / React Native 0.85 (stub có thể lệch API chi tiết, ví dụ chữ ký hàm ít dùng tới).
- Chưa chạy trên thiết bị Android, trình duyệt web hay simulator — đặc biệt luồng xin quyền micro và ghi âm của `expo-audio` trên web.
- Chưa tích hợp vào `src/` gốc: các điểm nối ở mục 6 đều chưa được thực thi trên code thật, tên trường store trong ví dụ adapter chỉ là minh họa.
- `schema.sql` chưa được chạy trên một project Supabase thật; luồng đăng ký/đăng nhập/RLS chưa được kiểm chứng đầu-cuối.
- Chưa build lại APK sau khi sửa `app.json`.
