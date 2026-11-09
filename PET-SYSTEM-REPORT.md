# Báo cáo Đợt B+C — Hệ thú cưng toàn diện (Pet System)

**Ngày:** 09/11/2026 · **Phạm vi:** gộp Đợt B (quà chặng: XP thưởng, chìa khóa bí mật, sao, thức ăn) + Đợt C (hệ thú cưng đầy đủ: cấp, phụ kiện, trang riêng, skill hỗ trợ trong bài học, Rồng Huyền Thoại) theo SPEC người dùng chốt 15:39 + bổ sung 15:41 cùng ngày. Xây trên Phase 3 + Đợt A, cùng nhánh preview/PR #10 — **chưa đẩy GitHub** (agent chính đẩy sau).

**Triết lý bất biến đã cài cứng:** mỗi thế giới một thú để sưu tập; skill của thú chỉ HỖ TRỢ học, không làm bài thay bé; học là cách nuôi thú; **thú tuyệt đối không đói/buồn/chết khi bé nghỉ học — chỉ khích lệ**. Test cũng khóa điều này: hồ câu thoại bị kiểm tra không chứa từ chê bai/trừng phạt/đói/chết.

---

## 1. File tạo mới

| File | Vai trò |
|---|---|
| `src/lib/pets.ts` | Toàn bộ dữ liệu + logic thuần của hệ thú: roster, cấp, quà chặng, phụ kiện, điều kiện nhận quà, suy luận Rồng, hồ câu thoại, từ hay sai nhất, và toàn bộ chốt chặn skill. |
| `src/app/pet.tsx` | Trang Thú cưng (route `/pet`, modal): chips 3 thế giới, thẻ thú lớn + cấp + cho ăn + tủ phụ kiện + ví sao/khóa + khối Rồng Huyền Thoại. |
| `src/components/lesson-pet.tsx` | Component pet đồng hành trong bài học: bong bóng thoại động viên/khen + nút skill theo pet (kèm chốt chặn). |
| `scripts/test-pets.mjs` | 21 nhóm test mới (xem mục Kiểm chứng). |

## 2. File sửa

| File | Thay đổi |
|---|---|
| `src/lib/kingdoms.ts` | Thú của Anh/Cổ Tích đổi **Cú Sách 🦉 → Sư tử 🦁** (cả `companion` lẫn motif) theo spec. Hệ sưu tập vườn trong `garden.ts` giữ nguyên (là hệ trang trí riêng, không phải thú đồng hành). |
| `src/lib/adventure.ts` | `checkpointState` nhận thêm `keyUnlocked` — bài mở bằng chìa khóa có trạng thái "open". Cập nhật comment: rương chặng nay nhận quà thật. |
| `src/lib/store.ts` | 8 field mới + 5 action mới; `completeLesson` cộng điểm phát triển + sao (chi tiết mục 3). |
| `src/components/adventure-map.tsx` | Rương nối `claimStageReward`; panel chìa khóa trong màn bản đồ (không Alert); thú đi theo = thú đang đồng hành (thế giới hoặc 🐉) + hiện phụ kiện đang mặc cạnh thú; checkpoint khóa bấm được để mở panel. |
| `src/app/celebration.tsx` | Màn ăn mừng chặng phân biệt 3 trường hợp (vừa nhận quà / đã nhận trước đó / vào thẳng) và hiện đúng quà. |
| `src/app/lesson/[id].tsx` | Gắn `LessonPet` trên thẻ bài tập; gửi kết quả chấm (đúng/sai + số lần sai của match) cho pet; bài hoàn hảo có thêm câu chúc mừng của pet ở màn kết quả. |
| `src/app/(tabs)/index.tsx` | Thêm lối tắt 🐾 "Thú cưng"; thẻ vương quốc hiện emoji phụ kiện thú đang mặc. |
| `src/app/map/[courseId].tsx` | Thêm nút 🐾 ở đầu màn bản đồ mở trang Thú cưng. |
| `src/app/_layout.tsx` | Đăng ký route `pet` (modal). |
| `scripts/test-companion.mjs` | Cập nhật 1 khẳng định (xem mục Kiểm chứng — có lý do rõ ràng). |

## 3. Kinh tế hệ thú (bảng chốt)

### Quà khi học xong một CHẶNG (6 bài) — hàm thuần `stageReward(stageNumber)`, chặng tính từ 1

| Quà | Số lượng |
|---|---|
| XP thưởng | +10 XP (qua cơ chế `addBonusXp` sẵn có — tính vào XP của chính khóa đó, XP ngày và ngày học) |
| ⭐ Sao | +3 |
| 🍎 Thức ăn cho thú | +1 |
| 🔑 Chìa khóa bí mật | +1 **chỉ ở chặng 3, 6, 9, 12…** (bội số của 3) |

- Nhận quà: chạm rương ở cuối chặng đã xong trên bản đồ. Chưa nhận → app **claim trước rồi mới** sang màn ăn mừng (`justClaimed=1`) để hiện đúng quà vừa nhận; đã nhận → màn ăn mừng chỉ hiện lại tóm tắt, **không cộng thêm**; mỗi chặng nhận đúng **một lần** (store kiểm tra qua `stageClaimCheck`: chặng phải xong thật theo `completedLessons` + `buildStages` và chưa có trong `claimedStageRewards`, không đủ = no-op).
- Chìa khóa: chạm checkpoint đang khóa trên bản đồ → panel nhỏ, pet hỏi có dùng 🔑 mở sớm không. Dùng khóa → bài đó mở (vào học, hoàn thành bình thường), **biên học chính không đổi**; đã mở bằng khóa thì không trừ khóa lần hai.
- Sao còn kiếm thêm: **+1 ⭐ mỗi bài học hoàn hảo (perfect)**.

### Điểm phát triển & cấp của thú — `petLevelFor(growth)`

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Điểm cần | 0 | 50 | 150 | 300 | 500 | 800 | 1200 | 1800 | 2600 | 3600 |

Cách tăng điểm (riêng từng thú theo khóa học): học xong một bài **+10** (bài hoàn hảo **+15**); cho ăn một phần thức ăn **+8**.

### Phụ kiện — 6 món/thú, mở theo số chặng đã xong CỦA THẾ GIỚI ĐÓ: **3 / 6 / 9 / 12 / 15 / 18**

| Thú | 6 món (theo thứ tự mở) |
|---|---|
| 🦁 Sư tử (Anh) | 🧣 Khăn Choàng Đỏ · 🧢 Mũ Lưỡi Trai Xanh · 🔔 Chuông Vàng Nhỏ · 🕶️ Kính Mát Ngôi Sao · 🏅 Huy Hiệu Dũng Cảm · 👑 Vương Miện Vàng |
| 🦊 Cáo Hoa Đào (Nhật) | 🎀 Nơ Hoa Đào · 🧣 Khăn Lụa Hồng · 🌸 Trâm Hoa Anh Đào · 🪭 Quạt Giấy Hoa Đào · 🏅 Huy Hiệu Hoa Đào · 👑 Vương Miện Hoa |
| 🐼 Gấu Trúc (Trung) | 🎀 Nơ Tre Xanh · 🧣 Khăn Đỏ Dũng Sĩ · 🎋 Mũ Lá Tre · 👓 Kính Tròn Học Giả · 🔔 Chuông Tre Nhỏ · 👑 Vương Miện Tre Vàng |

Món đang mặc hiện ở 3 nơi: trên thú ở trang Thú cưng, cạnh thú đi theo trên bản đồ, và trên thẻ vương quốc ở trang chủ.

### Roster & skill

| Thú | Thế giới | Skill | Cách hỗ trợ |
|---|---|---|---|
| 🦁 Sư tử | Cổ Tích (Anh) | **Đọc mẫu** | Phát TTS từ/câu đích của bài tập hiện tại bằng kênh đọc sẵn có của app. |
| 🦊 Cáo Hoa Đào | Hoa Anh Đào (Nhật) | **Cách đọc** | Hiện cách đọc (romaji/kana) của từ đích lấy từ dữ liệu thật của khóa. |
| 🐼 Gấu Trúc | Đèn Lồng (Trung) | **Pinyin & thanh điệu** | Hiện pinyin + tên thanh điệu ("thanh 1 — cao và ngang"…) từ dữ liệu thật. |
| 🐉 Rồng Huyền Thoại | Mở khi **hoàn thành trọn một thế giới** (100% bài của một khóa — hàm suy `legendaryUnlocked`, không lưu field) | **Nhắc bài cũ** | Mở thẻ hiện từ bé hay trả lời sai nhất của khóa (từ + nghĩa + nút nghe đọc), từ dữ liệu `wordStats` thật. |

## 4. Store — field mới (mặc định an toàn, migrate điền ở cả 2 nhánh, không phá dữ liệu cũ)

`petGrowth: Record<courseId, number> = {}` · `petFood = 0` · `stars = 0` · `unlockKeys = 0` · `keyUnlockedLessons: Record<courseId, string[]> = {}` · `claimedStageRewards: Record<courseId, number[]> = {}` · `equippedAccessories: Record<courseId, string[]> = {}` · `activeCompanion: "world" | "legendary" = "world"`.

Actions: `claimStageReward`, `feedPet`, `toggleAccessory` (chỉ khi đã mở khóa), `useUnlockKey`, `setActiveCompanion` (chọn Rồng bị chặn nếu chưa mở Rồng). XP bài học giữ nguyên **15/+5** — quà chặng và điểm phát triển là dòng riêng, không đụng công thức cũ.

## 5. CHỐT CHẶN skill — không lộ đáp án (cài trong `pets.ts`, hàm `petSkillForExercise`)

Nguyên tắc: skill chỉ được dùng **từ thuộc đề bài** (prompt), không bao giờ dùng đáp án:

1. **Chỉ một số dạng bài được phép hỗ trợ:** `select`/`fillBlank` dạng hỏi nghĩa (targetToNative) và `wordBank` dạng ghép nghĩa (targetToNative). Các dạng mà đáp án nằm ngay trong các lựa chọn (nativeToTarget), ghép cặp (match) và tự gõ (typeAnswer, kể cả hỏi pinyin/kana) → **không có skill** — nút hiện mờ kèm lời cổ vũ của pet.
2. **Từ đích lấy an toàn:** select lấy từ của prompt; fillBlank lấy từ đầu tiên **khác đáp án** trong câu hoàn chỉnh; wordBank lấy từ của prompt (đáp án của nó là từ tiếng Việt nên không lộ).
3. **Kiểm tra trùng đáp án:** nội dung skill (cách đọc/pinyin) được so với đáp án đúng của bài hiện tại (đã chuẩn hoá thường hoá/bỏ khoảng trắng). Nếu **trùng** (ví dụ bài hỏi chính cách đọc của kana đó) → chỉ **gợi ý một phần** và ghi rõ "(gợi ý một phần)": cách đọc chỉ hiện chữ cái đầu + "•••" (kèm thanh điệu với pinyin); cách đọc quá ngắn (≤2 ký tự) chỉ hiện số chữ cái; nút Đọc mẫu chỉ phát **từ đầu tiên** của câu đích.
4. **Điền vào chỗ trống:** nút Đọc mẫu đọc **câu còn khuyết** (chỗ trống thành " … "), không đọc câu đã điền đáp án.
5. **Rồng (Nhắc bài cũ)** nhắc từ của các bài **khác** đã học, không liên quan đáp án bài hiện tại.

Dữ liệu skill lấy từ field thật của khóa: Nhật — 184/216 từ có `romanization` (romaji); các từ kana đơn lẻ dùng chính `native` (vốn là cách đọc). Trung — 208/208 từ có pinyin kèm dấu thanh. Bài nào không có dữ liệu đọc → ẩn nút skill ở bài đó.

## 6. Người dùng sẽ thấy gì (theo luồng)

1. **Học xong chặng trên bản đồ** → chạm rương 🎁 ở cuối chặng: app cộng quà ngay (⭐+3, +10 XP, 🍎+1, chặng 3/6/9… thêm 🔑+1) rồi mở màn ăn mừng hiện từng dòng quà + ví hiện tại; rương đổi nhãn "Đã nhận quà ✓", chạm lại chỉ xem lại.
2. **Gặp bài đang khóa muốn học sớm** → chạm vào checkpoint khóa: pet hiện panel "Bài này đang khóa. Dùng 🔑 Chìa khóa bí mật để mở sớm không?" — có khóa thì bấm **Dùng chìa khóa** là bài mở ngay; hết khóa thì nút mờ kèm chỉ dẫn kiếm khóa ở rương chặng.
3. **Trang chủ** → lối tắt 🐾 **Thú cưng** (cũng có nút 🐾 ở đầu màn bản đồ): thấy ví ⭐/🔑/🍎, chuyển qua 3 thế giới xem từng thú: emoji lớn + phụ kiện đang mặc, cấp + thanh điểm phát triển, dòng tâm trạng luôn vui ("Hôm nay mình vui lắm vì được học cùng bé!" hoặc "đang chờ bé tới học cùng nhé!"), mô tả skill, nút **Cho ăn** (+8 điểm, mờ khi hết thức ăn kèm chỉ cách kiếm), tủ 6 phụ kiện (món khóa ghi rõ "Xong N chặng để mở (hiện x/N)", món mở rồi chạm để mặc/cởi).
4. **Hoàn thành trọn một thế giới** → khối Rồng Huyền Thoại ở cuối trang Thú cưng cho **Chọn Rồng làm bạn đồng hành**: từ đó thú đi theo trên bản đồ là 🐉 và pet trong bài học là Rồng; bấm lại để quay về thú thế giới. Chưa xong thế giới nào → khối Rồng hiện tiến độ từng khóa (x/tổng bài).
5. **Trong bài học** → pet đồng hành ngồi trên thẻ bài tập: trả lời sai → câu động viên (8 câu xoay vòng không lặp câu vừa dùng); trả lời đúng → thỉnh thoảng được khen; nút skill theo pet (🦁 Đọc mẫu phát tiếng, 🦊 hiện cách đọc, 🐼 hiện pinyin + thanh điệu, 🐉 nhắc từ hay sai nhất kèm nút nghe); học xong bài hoàn hảo → màn kết quả có thêm câu chúc mừng của pet.
6. **Thú đi theo trên bản đồ** (kế thừa Đợt A) nay là thú đang đồng hành và **mang theo phụ kiện đang mặc**; thẻ vương quốc ở trang chủ cũng hiện phụ kiện.

## 7. Kiểm chứng

- **`scripts/test-pets.mjs` MỚI: 21/21 nhóm PASS** — cấp pet đúng biên 0→3600; quà chặng (3/6/9 có khóa); phụ kiện đúng mốc 3/6/9/12/15/18; nhận quà đúng một lần (lần 2 no-op qua `stageClaimCheck` — cùng hàm thuần store dùng; phần store nối dây được kiểm tĩnh theo khuôn test-companion vì store nạp AsyncStorage/zustand không chạy thẳng trong Node); chìa khóa mở bài qua `checkpointState`; Rồng chỉ mở ở 100%; `mostMissedWord` chọn đúng; roster khớp kingdoms (Sư tử 🦁); **chốt chặn skill kiểm bằng dữ liệu thật** (bài hỏi cách đọc あ → partial, pinyin 一 không trùng đáp án → hiện đủ + thanh 1, nativeToTarget → null); hồ câu không tiêu cực; baseline **80 unit / 314 bài / 2488 câu giữ nguyên**.
- **Toàn bộ test cũ PASS:** adventure-map 26/26 · companion 9/9 · level-floor 11/11 · garden 14/14 · rewards 9/9 · ranks 12/12 · competitions 20/20 · provinces 30/30 · worldmap 76/76.
- **Một khẳng định cũ được cập nhật có chủ đích:** `test-companion.mjs` (Đợt A) từng khóa "thú đi theo = companion của vương quốc, không phụ kiện" — spec Đợt B+C thay đúng điểm này (thú đi theo = thú đang đồng hành gồm cả Rồng, và hiện phụ kiện). Khẳng định đã viết lại sang cơ chế mới kèm ghi chú lý do trong file test; số nhóm vẫn 9/9.
- **`npx tsc --noEmit`: 0 lỗi.**
- **`npx expo export --platform web`: PASS** (kết quả đính kèm khi tổng hợp cuối).

## 8. Chưa kiểm chứng / giới hạn đã biết

- **Chưa thử trên máy thật / trình duyệt thật:** luồng chạm rương nhận quà, panel chìa khóa, trang Thú cưng, pet trong bài học (giọng TTS của nút Đọc mẫu phụ thuộc thiết bị như các nút nghe hiện có) — cần nghiệm thu trên preview sau khi đẩy.
- **Kỹ năng nét viết Kanji của Cáo** chưa làm: theo spec, nét viết THẬT chờ dữ liệu KanjiVG ở đợt tích hợp nguồn sau redesign; hiện Cáo hỗ trợ bằng **cách đọc** (kana/romaji).
- **Rồng không có tủ phụ kiện riêng** trong đợt này (phụ kiện gắn theo thú thế giới; khi Rồng đồng hành, thú đi theo không hiện phụ kiện) và điểm phát triển của Rồng không tách riêng — Rồng hỗ trợ qua skill Nhắc bài cũ ở mọi khóa.
- Sao (⭐) hiện là ví sưu tập hiển thị (nhận từ rương + bài hoàn hảo); chưa có shop tiêu sao — ngoài phạm vi đợt này.
