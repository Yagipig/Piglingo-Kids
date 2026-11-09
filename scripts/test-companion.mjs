#!/usr/bin/env node
/**
 * Test Đợt A (bổ sung Phase 3) — ẢNH CÁ NHÂN + THÚ ĐI THEO:
 * Kiểm TĨNH (theo đúng khuôn test-level-floor/test-worldmap đang dùng,
 * vì store.ts nạp AsyncStorage/zustand nên không chạy thẳng trong Node):
 * - store.ts: field `avatarImage` khai báo `string | null`, giá trị đầu
 *   là null, setter `setAvatarImage` CHỈ gán avatarImage (không đụng
 *   field khác), migrate điền null ở CẢ HAI nhánh khi dữ liệu cũ thiếu.
 * - profile.tsx: mục "Ảnh của bé" dùng đúng khuôn chọn ảnh nền
 *   (pickBackgroundImage + setAvatarImage) và có đường xóa về mặc định.
 * - adventure-map.tsx: marker ở điểm hiện tại dùng avatarImage khi có;
 *   mốc nhảy lưu bằng AsyncStorage với khóa theo courseId và quyết
 *   định nhảy qua planHop (logic thuần đã test ở test-adventure-map).
 * - index.tsx (trang chủ): hiện avatar tròn cạnh heo mascot khi đã đặt.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('test-companion: ảnh cá nhân / mốc nhảy / thú đi theo (kiểm tĩnh)');

const store = read('src/lib/store.ts');

check('store: khai báo avatarImage: string | null + action setAvatarImage', () => {
  assert.ok(store.includes('avatarImage: string | null'), 'thiếu field avatarImage');
  assert.ok(
    store.includes('setAvatarImage: (uri: string | null) => void'),
    'thiếu khai báo action setAvatarImage',
  );
});

check('store: giá trị khởi tạo avatarImage = null (mặc định heo)', () => {
  assert.ok(store.includes('avatarImage: null,'), 'initial state phải có avatarImage: null');
});

check('store: thân setAvatarImage CHỈ gán avatarImage, không đụng field khác', () => {
  const match = store.match(/setAvatarImage: \(uri\) => set\(\{ avatarImage: uri \}\)/);
  assert.ok(match, 'không tìm thấy thân setAvatarImage dạng chỉ gán avatarImage');
});

check('store: migrate điền avatarImage ?? null ở cả hai nhánh (dữ liệu cũ thiếu field)', () => {
  const occurrences = store.split('avatarImage: (old.avatarImage as string | null) ?? null').length - 1;
  assert.equal(occurrences, 2, `migrate phải có 2 chỗ điền avatarImage, thấy ${occurrences}`);
});

const profile = read('src/app/(tabs)/profile.tsx');

check('profile: có mục "Ảnh của bé" nối setAvatarImage + chọn ảnh theo khuôn ảnh nền', () => {
  assert.ok(profile.includes('Ảnh của bé'), 'thiếu tiêu đề mục "Ảnh của bé"');
  assert.ok(profile.includes('setAvatarImage(result.dataUrl)'), 'chọn ảnh xong phải gọi setAvatarImage');
  assert.ok(profile.includes('pickBackgroundImage()'), 'phải dùng chung luồng chọn ảnh nền');
  assert.ok(profile.includes('setAvatarImage(null)'), 'phải có đường xóa ảnh về mặc định');
  assert.ok(
    profile.includes('progress.avatarImage ?? null'),
    'đọc avatarImage phải chịu được undefined (dữ liệu cũ)',
  );
});

const map = read('src/components/adventure-map.tsx');

check('adventure-map: marker điểm hiện tại dùng avatarImage khi có, heo khi chưa có', () => {
  assert.ok(map.includes('progress.avatarImage ?? null'), 'phải đọc avatarImage từ store');
  assert.ok(map.includes('avatarImage ? ('), 'phải rẽ nhánh hiển thị theo avatarImage');
  assert.ok(map.includes('source={{ uri: avatarImage }}'), 'phải render ảnh cá nhân từ data URL');
  assert.ok(map.includes('source={MASCOT}'), 'chưa có ảnh thì vẫn render heo mascot');
});

check('adventure-map: mốc nhảy bằng AsyncStorage theo courseId + planHop, KHÔNG qua store', () => {
  assert.ok(
    map.includes('adventure-seen-frontier:${courseId}'),
    'khóa AsyncStorage phải theo từng courseId',
  );
  assert.ok(map.includes('AsyncStorage.getItem'), 'phải đọc mốc đã xem');
  assert.ok(map.includes('AsyncStorage.setItem'), 'phải lưu mốc mới');
  assert.ok(map.includes('planHop(seenFrontier, frontierIndex, total)'), 'quyết định nhảy phải qua planHop');
  assert.ok(!store.includes('seenFrontier'), 'store KHÔNG được thêm field cho mốc nhảy');
});

// Đợt B+C thay đổi chủ đích (spec thú cưng toàn diện thay khẳng định
// Đợt A "thú = companion của vương quốc, không phụ kiện"): thú đi theo
// nay là thú đang đồng hành — thú vương quốc (kingdoms.ts) hoặc Rồng
// Huyền Thoại khi bé chọn Rồng — và HIỆN phụ kiện đang mặc.
// Đợt Vòng quay thay đổi chủ đích tiếp: thêm pet hiếm (trúng ở vòng
// quay tầng Khó) vào đầu chuỗi ưu tiên của travelerPetEmoji — khẳng
// định chuỗi cũ được thay bằng hai mảnh của biểu thức mới. Chốt
// 09/11/2026: pet hiếm đổi Kỳ Lân 🦄 → Phượng Hoàng Cầu Vồng 🦚
// (khóa "phuong-hoang", biến phoenixActive).
check('adventure-map: thú đi theo = thú đang đồng hành (Phượng Hoàng/Rồng/vương quốc) + phụ kiện đang mặc', () => {
  assert.ok(
    map.includes('const travelerPetEmoji = phoenixActive') &&
      map.includes('dragonActive') &&
      map.includes('kingdom?.companion ?? "🐷"'),
    'thú đi theo phải suy từ activeCompanion: Phượng Hoàng Cầu Vồng khi chọn Phượng Hoàng, Rồng khi chọn Rồng, còn lại thú vương quốc',
  );
  assert.ok(map.includes('companionEmoji={travelerPetEmoji}'), 'Traveler phải nhận thú đang đồng hành');
  assert.ok(map.includes('accessoryEmojis={travelerAccessoryEmojis}'), 'Traveler phải nhận phụ kiện đang mặc');
  assert.ok(map.includes('travelerPet'), 'phải render thú đi theo cạnh marker');
});

const home = read('src/app/(tabs)/index.tsx');

check('trang chủ: hiện avatar tròn cạnh heo mascot khi bé đã đặt ảnh', () => {
  assert.ok(home.includes('progress.avatarImage ?? null'), 'phải đọc avatarImage từ store');
  assert.ok(home.includes('source={{ uri: avatarImage }}'), 'phải render ảnh của bé');
  assert.ok(home.includes('heroAvatar'), 'phải có style avatar tròn riêng');
});

console.log(`\nPASS test-companion: ${passed} nhóm kiểm tra đạt.`);
