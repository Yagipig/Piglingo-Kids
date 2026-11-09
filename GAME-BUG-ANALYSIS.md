# PHÂN TÍCH GỐC RỄ — Lỗi game Lật thẻ (game-memory) & Đoán chữ (game-letters)

- Ngày điều tra: 09/11/2026 — CHỈ ĐỌC, không sửa code.
- Nguồn đọc: toàn bộ từ cây hiện hành `~/workspace/piglingo-merged/`
  (`src/app/game-memory.tsx`, `src/app/game-letters.tsx`, `src/components/game-ui.tsx`,
  `src/components/ui/card.tsx`, `src/lib/content.ts`, đối chiếu `game-listen.tsx`,
  `game-speed.tsx`, `game-scramble.tsx`) + `REDESIGN-PHASE4-REPORT.md`.

## KẾT LUẬN NGẮN

Cả hai game gãy bởi **cùng một gốc rễ**: `useCourseContent()` trả về hàm
`allWords` **mới ở mỗi lần render**, khiến mọi `useMemo(..., [allWords])` bị
tính lại sau MỖI lần đổi state (tức sau mỗi lần chạm). Hai game bị báo lỗi là
hai game mà thân hàm memo **chọn ngẫu nhiên**: bộ thẻ bị xáo trộn + rút lại
6 từ mới sau mỗi lần bấm (Lật thẻ), từ bí mật bị rút lại sau mỗi phím bấm
(Đoán chữ). Handler chạm, state và style hiển thị của cả hai game đều đúng.

---

## GỐC RỄ CHUNG (áp cho cả hai game)

`src/lib/content.ts:176-185`:

```ts
export function useCourseContent(courseId: string) {
  const cached = getCourseCache(courseId);
  return {
    pack: cached.pack,
    allLessons: cached.list,          // mảng ỔN ĐỊNH từ cache module
    ...
    allWords: () => cached.allWords,  // ← closure MỚI tạo ở mỗi lần gọi/render
    ...
  };
}
```

- `allLessons` là tham chiếu mảng ổn định trong `courseCache` → game nào phụ
  thuộc nó thì memo không bao giờ tự vỡ.
- `allWords` là arrow function viết inline, **đổi identity sau mỗi render** →
  `useMemo(fn, [allWords])` luôn bị coi là "deps đổi" → chạy lại `fn` sau
  mỗi lần component re-render (mỗi lần `setState` do người chơi chạm).

Đối chiếu 5 game:

| Game | Deps của memo | Thân memo | Hệ quả |
|---|---|---|---|
| game-scramble | `[allLessons]` (ổn định) | dựng pool câu | **Không lỗi** ✓ |
| game-speed | `[allWords]` (vỡ) | chỉ khử trùng lặp, nội dung tất định; câu hỏi giữ trong `useState` | Vỡ memo nhưng **không thấy lỗi** |
| game-listen | `[allWords]` (vỡ) | `buildQuestions` có `shuffle` (game-listen.tsx:59-61) | **Cùng bệnh tiềm ẩn** (xem mục phụ) |
| game-memory | `[allWords]` (vỡ) | `buildDeck` rút ngẫu nhiên + xáo trộn | **LỖI đã báo** |
| game-letters | `[allWords]` (vỡ) | rút 1 từ ngẫu nhiên làm từ bí mật | **LỖI đã báo** |

---

## GAME 1 — Lật thẻ ghép cặp (`src/app/game-memory.tsx`)

Triệu chứng: bấm vào thẻ mà thẻ không lật / không hiện mặt thẻ.

### Ứng viên 1 — Bộ thẻ bị rút lại sau MỖI lần bấm (CAO — gần như chắc chắn)

Chuỗi bằng chứng:

- `game-memory.tsx:49-53`: `uniqueWords = useMemo(..., [allWords])` → tính
  lại mỗi render vì `allWords` đổi identity (gốc rễ ở trên).
- `game-memory.tsx:55-58`: `deck = useMemo(() => buildDeck(uniqueWords), [uniqueWords, round])`
  → `uniqueWords` đổi identity mỗi render nên `deck` cũng dựng lại mỗi render.
- `buildDeck` (`game-memory.tsx:31-39`): `shuffle(words).slice(0, PAIRS)` —
  **rút ngẫu nhiên 6 từ khác nhau + xáo trộn vị trí** mỗi lần chạy.
- `flip()` (`game-memory.tsx:78-83`) chạy đúng: `setFlipped([...flipped, card.key])`.
  Nhưng ngay sau đó component re-render → deck là một bộ 12 thẻ HOÀN TOÀN MỚI.
  `flipped` đang giữ key kiểu `` `${word.target}:t` `` của bộ cũ; với hàng
  trăm từ trong khóa, xác suất từ vừa bấm còn nằm trong 6 từ mới rút là rất
  thấp → ở `game-memory.tsx:124` (`isUp = flipped.includes(card.key) || ...`)
  **không thẻ nào khớp key đã lật** → mọi thẻ vẫn úp, lưới còn trông như bị
  thay toàn bộ. Đúng từng chữ triệu chứng "bấm mà thẻ không lật/không hiện mặt".
- Hệ quả phụ: `matched` (key theo `word.target`) cũng tham chiếu bộ cũ;
  `setTimeout` 850ms úp lại thẻ (dòng 103-106) thao tác trên state của một bộ
  thẻ không còn tồn tại. Game không thể thắng được.

### Ứng viên 2 — Phần tử phủ / z-index / pointerEvents chặn chạm (THẤP — đã loại trừ)

- Thẻ là `Pressable` con trực tiếp của lưới `View` trong `ScrollView`
  (`game-memory.tsx:120-160`) — đúng khuôn game-scramble dùng cho token
  (bấm được bình thường).
- `GameHeader`/`GameBadge` (Phase 4, `src/components/game-ui.tsx`) nằm NGOÀI
  `ScrollView`, trong luồng dọc thường; không có `position: absolute`,
  không overlay, không `pointerEvents` ở bất kỳ đâu trong `game-ui.tsx`
  hay file game này.
- `pressed && { opacity: 0.85 }` trong style function chỉ là hiệu ứng nhấn.

### Ứng viên 3 — Mặt thẻ bị render ẩn bởi style (THẤP — đã loại trừ)

- Không dùng 3D flip: không `transform: rotateY`, không
  `backfaceVisibility` trong toàn file. Mặt thẻ render theo điều kiện
  `{isUp ? (mặt chữ/nghĩa) : (🐷)}` (`game-memory.tsx:145-160`) — cơ chế
  đúng; nó chỉ không bao giờ nhận được `isUp = true` bền vững vì Ứng viên 1.
- `cardUp`/`cardMatched` chỉ đổi màu nền/viền.

### Ứng viên 4 — `speakTarget` ném lỗi trước `setFlipped` (THẤP — đã loại trừ)

- `flip()` gọi `speakTarget(...)` ở dòng 81, TRƯỚC `setFlipped(next)` ở
  dòng 83 — nếu hàm này throw đồng bộ thì lần bấm đó mất. Nhưng:
  (a) nó chỉ chạy với thẻ loại `"target"` (nửa bộ thẻ) — thẻ `"native"`
  không gọi mà vẫn không lật theo báo cáo; (b) `speakTarget`
  (`src/lib/audio.ts:22-36`) là gọi expo-speech/audio player thông thường,
  cùng hàm được game-listen dùng trong `useEffect` + `SpeakerButton` mà
  không gãy luồng. Không khớp triệu chứng toàn bộ thẻ.

### Phase 4 đã đổi gì trong file này?

Theo `REDESIGN-PHASE4-REPORT.md` mục 2: chỉ (1) thanh đầu → `GameHeader` +
`GameBadge`, (2) hộp thắng → `WinCard`, (3) thẻ lật bo góc `radius.xl`.
Không dòng nào thuộc chuỗi `useMemo → buildDeck → flip → isUp`. **Lỗi không
do các dòng Phase 4 chèn**; nó nằm ở pattern `useMemo([allWords])` có từ
trước và ở `useCourseContent` không memo hóa (Phase 4 không đụng
`src/lib/`).

### Sửa tối thiểu đề xuất (cho Ứng viên 1)

Một điểm sửa chữa được cả hai game (và cả game-listen): memo hóa kết quả
của `useCourseContent` theo `courseId` trong `src/lib/content.ts` (cache
object trả về theo courseId cạnh `courseCache`, hoặc bọc `useMemo`) để
`allWords` giữ nguyên identity giữa các render cùng khóa. Phương án dự
phòng chỉ trong 2 file game: đổi deps của các memo rút ngẫu nhiên từ
`[allWords]` sang khóa theo `activeCourseId` + `round`. Ưu tiên sửa ở
`content.ts` vì là gốc chung.

---

## GAME 2 — Đoán chữ bí mật (`src/app/game-letters.tsx`)

Triệu chứng: "cũng bị lỗi", chưa rõ chi tiết.

### Ứng viên 1 — Từ bí mật bị rút lại sau MỖI phím bấm (CAO — gần như chắc chắn)

- `game-letters.tsx:43-50`: `playable = useMemo(..., [allWords])` → tính lại
  mỗi render (cùng gốc rễ `content.ts:183`).
- `game-letters.tsx:52-56`:
  `current = useMemo(() => playable[Math.floor(Math.random() * playable.length)], [playable, round])`
  → `playable` đổi identity mỗi render → **mỗi lần re-render là một từ bí
  mật NGẪU NHIÊN MỚI**.
- Mỗi lần bấm phím, `guess()` (dòng 72-90) gọi `setGuessed`/`setWrong` →
  re-render → từ bí mật đổi sang từ khác: số ô trống nhảy theo độ dài từ
  mới, các chữ đã đoán áp sang từ không liên quan, tim/lượt sai vẫn giữ —
  ván chơi không bao giờ ổn định, không thắng thua đúng được. Đây là biểu
  hiện "bị lỗi" rõ nhất có thể suy ra từ code; mọi triệu chứng cụ thể người
  dùng thấy (ô chữ tự đổi, chữ đã hiện biến mất, từ gợi ý nhảy) đều là hệ
  quả của ứng viên này.

### Ứng viên 2 — Hàng phím tràn ngang, phím ở hai đầu bị cắt (TRUNG BÌNH)

- Hàng 1 và 2 có 10 phím (`KEY_ROWS`, dòng 17). Mỗi phím `minWidth: 31`
  (dòng 229) + `gap: 6` (keyRow) → bề rộng tối thiểu của hàng =
  10×31 + 9×6 = **364px**, chưa tính đệm thân trang 20px×2 (body, dòng
  ~207) → cần viewport ≥ ~404px mới vừa.
- Điện thoại phổ biến 360-390px → hàng phím tràn 2 đầu (hàng được
  `justifyContent: "center"` nên tràn đều hai phía): các phím A/J, K/T,
  U/Z bị đẩy ra mép, có thể bị cắt và khó/không bấm trúng trên máy thật.
- Phase 4 chỉ tăng `minHeight: 48` cho phím (chiều cao, theo báo cáo Phase
  4 mục 2) — không làm thay đổi bề ngang; điểm này là khiếm khuyết bố cục
  sẵn có, là yếu tố phụ thêm vào Ứng viên 1 chứ không thay thế nó.
- Sửa tối thiểu đề xuất: cho phím co theo bề rộng (bỏ `minWidth` cố định,
  dùng `flex: 1` cho mỗi phím trong hàng) — hoặc giảm `minWidth`/gap.

### Các điểm đã rà và KHÔNG thấy gãy (loại trừ)

- **Chọn từ bí mật**: `guessForm` (dòng 22-33) chuẩn hóa NFD, bỏ dấu,
  giữ a-z, lọc độ dài 3-10 — nhất quán: `form` luôn chữ thường a-z.
- **Render ô chữ** (dòng 131-140): hiện chữ khi `guessed.has(ch) || lost` —
  đúng; `key={i}` ổn định trong một ván.
- **Bàn phím**: đủ 26 chữ A-Z qua 3 hàng; `onPress={() => guess(lower)}`
  đúng chữ thường khớp `form`; `disabled={used}` + `accessibilityState`
  đúng khuôn; trạng thái hit/miss suy đúng từ `form.includes(lower)`.
- **Cộng/trừ lượt sai**: đoán sai → `playIncorrect()` + `setWrong(w+1)`
  (dòng 87-89); tim hiển thị `"❤️".repeat(6 - wrong) + "🤍".repeat(wrong)`
  — đúng.
- **Thắng/thua**: `won = form.length > 0 && [...form].every(ch => guessed.has(ch))`;
  `lost = wrong >= MAX_WRONG (6)`; thưởng 5 XP đúng một lần nhờ
  `awardedRef` (dòng 80-84). Khi thắng/thua, bàn phím được thay bằng
  `WinCard` có nút "Ván mới" → `restart()` đặt lại `guessed`/`wrong` và
  tăng `round` → rút từ mới đúng ý đồ (dòng 66-70).
- **Thẻ từ** dùng `Card` của ui/ (`src/components/ui/card.tsx`): `View`
  thuần, không overlay/`pointerEvents` — `SpeakerButton` bên trong bấm
  bình thường.
- Trường hợp khóa không có từ hợp lệ: `current` undefined → hiện câu
  thông báo (dòng 109-113), không crash.

### Phase 4 đã đổi gì trong file này?

Theo báo cáo Phase 4 mục 2: thanh đầu → `GameHeader`; thẻ từ → `Card` viền
hổ phách; hộp thắng/thua → `WinCard`/`WinCard tone="lose"`; phím đoán chữ
thêm `minHeight: 48`. Không dòng nào thuộc chuỗi
`useMemo → current → guess`. **Không phải thủ phạm.**

---

## PHÁT HIỆN PHỤ — game-listen mang cùng bệnh tiềm ẩn

`game-listen.tsx:53-61`: `uniqueWords`/`questions` dùng cùng pattern
`useMemo(..., [allWords])` và `buildQuestions` có `shuffle` → danh sách câu
hỏi cũng bị dựng lại ngẫu nhiên sau mỗi lần chọn đáp án (trong cửa sổ
950ms chờ chuyển câu, câu hỏi/đáp án hiển thị bị thay thầm; `picked` tham
chiếu câu cũ). Người dùng chưa báo có thể vì nhịp game vẫn "chạy tiếp"
nên khó nhận ra. Sửa ở `content.ts` như đề xuất sẽ chữa cả game này.
game-speed dùng cùng deps nhưng thân memo tất định + câu hỏi nằm trong
`useState` nên không biểu hiện lỗi.

## TỔNG KẾT ƯU TIÊN SỬA (đề xuất, chưa thực hiện)

1. **(Chữa cả 3 game)** Memo hóa object trả về của `useCourseContent`
   theo `courseId` trong `src/lib/content.ts` để `allWords` ổn định
   identity — sửa 1 chỗ, đúng gốc rễ.
2. **(Riêng Đoán chữ)** Cho phím bàn phím co giãn theo bề rộng màn hình
   (`flex: 1`, bỏ `minWidth: 31` cố định) để không tràn trên máy hẹp.
3. Không cần sửa handler/state/style lật thẻ hay logic đoán chữ — đã rà
   và đều đúng; cũng không cần đụng `game-ui.tsx`/`Card` của Phase 4.

---

## ĐÃ SỬA (09/11/2026)

Đúng theo 3 ưu tiên ở trên, chỉ sửa 2 file code:

1. **`src/lib/content.ts` — chữa gốc rễ cho cả 3 game.**
   - Thêm type xuất khẩu `CourseContent` (đúng hình dạng object mà
     `useCourseContent` vẫn trả về — không đổi chữ ký/hành vi).
   - `CourseCacheEntry` có thêm field `view: CourseContent | null`
     (khởi tạo `view: null` trong `getCourseCache`).
   - `useCourseContent(courseId)` giờ tạo object kết quả **một lần
     duy nhất** rồi lưu vào `cached.view` và trả về **cùng một object**
     cho mọi lần gọi/render cùng `courseId`. Hệ quả: closure `allWords`
     (và `getLesson`/`getUnit`/`getWord`, mảng `allLessons`) giữ
     nguyên identity → `useMemo(..., [allWords])` trong game-memory,
     game-letters, game-listen (và mọi nơi dùng khác) không còn bị
     tính lại sau mỗi lần đổi state; dữ liệu ngẫu nhiên chỉ dựng lại
     khi dep `round` đổi, tức đúng lúc bắt đầu vòng mới.
2. **`src/app/game-letters.tsx` — phím hết tràn ngang (chỉ style).**
   Style `key`: bỏ `minWidth: 31`, thêm `flex: 1` để phím co giãn
   theo bề rộng hàng; giữ nguyên `minHeight: 48` của Phase 4. Không
   đụng handler/logic đoán chữ (đã rà là đúng).
3. **Không sửa** `game-memory.tsx` và `game-listen.tsx` — handler,
   state, style và deps của chúng vốn đúng; memo hóa ở `content.ts`
   chữa cả hai (deck chỉ còn dựng khi `[uniqueWords, round]` thật sự
   đổi; questions tương tự).

**Chống tái phát — `scripts/test-games-stability.mjs` (mới, 14 nhóm):**
- (a) Hành vi, dùng module `content.ts` thật (biên dịch bằng tsc như
  test-level-floor): 3 khóa đều trả cùng object `===` và cùng tham
  chiếu `allWords` qua nhiều lần gọi; khác khóa → khác object. Kèm mô
  phỏng trung thực ngữ nghĩa `useMemo` của React (deps so bằng
  `Object.is`, mỗi "render" gọi lại `useCourseContent` như component
  thật) trên chuỗi memo của cả 3 game: hàm dựng dữ liệu ngẫu nhiên
  chỉ chạy 1 lần qua 10 render đổi state, chạy lại đúng 1 lần khi
  `round` đổi.
- (b) Tĩnh: `content.ts` có cơ chế giữ `view` theo `CourseCacheEntry`;
  deps của các memo trong 3 game đúng dạng ổn định; `buildDeck` /
  `buildQuestions` chỉ được gọi trong memo theo vòng; `Math.random`
  trong game-letters chỉ xuất hiện trong memo rút từ; style phím có
  `flex: 1`, không còn `minWidth: 31`, giữ `minHeight: 48`.
- Baseline trong cùng test: 80 unit / 314 bài / 2488 exercise.

**Kiểm chứng đợt sửa:** test-games-stability 14/14 PASS; toàn bộ test
cũ PASS nguyên số lượng (spin 20, pets 21, adventure-map 26,
companion 9, lesson-ui 16, level-floor 11, garden 14, rewards 9,
ranks 12, competitions 20, provinces 30, worldmap 76);
`npx tsc --noEmit` 0 lỗi; `npx expo export --platform web` PASS.
Chưa kiểm chứng trên điện thoại thật (cảm giác lật thẻ + bàn phím
vừa màn hình hẹp) — chờ nghiệm thu trên preview như các đợt trước.
