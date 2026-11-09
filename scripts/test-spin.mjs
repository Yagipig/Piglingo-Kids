// Kiểm thử VÒNG QUAY MAY MẮN + KHO BÁU (đợt Vòng quay):
// 1) Logic thuần trong src/lib/spin.ts — điều kiện được quay (tắt /
//    hết tồn kho / hết ngân sách ⇒ tự loại khỏi vòng, quà ảo vẫn còn),
//    đệm quà dự phòng khi tầng còn <2 quà hợp lệ, chọn theo trọng số
//    với RNG gieo hạt tất định, cấp vé đúng 3 trường hợp, ngân sách
//    tháng tính từ lịch sử, merge lịch sử (đã trao thắng khi hòa).
// 2) Khẳng định tĩnh: store cấp vé trong completeLesson + áp quà
//    trong applySpinWin (trừ tồn kho quà thật → chờ trao; accessory
//    → mở khóa vĩnh viễn cho cả 3 thú; pet hiếm → rarePets), các
//    trang spin/treasure/admin-spin và nối dây (_layout, dashboard,
//    màn kết quả bài học, trang Thú cưng).
// 3) Baseline nội dung giữ nguyên: 80 unit / 314 bài / 2488 câu.
// Chạy: node scripts/test-spin.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = mkdtempSync(path.join(tmpdir(), 'piglingo-spin-'));
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc');
execFileSync(
  tscBin,
  [
    '--ignoreConfig',
    'src/lib/srs.ts',
    'src/lib/adventure.ts',
    'src/lib/types.ts',
    'src/lib/content.ts',
    'src/lib/rewards.ts',
    'src/lib/pets.ts',
    'src/lib/spin.ts',
    '--outDir',
    outDir,
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    '--target',
    'es2022',
    '--skipLibCheck',
  ],
  { cwd: root, stdio: 'inherit' },
);

const spin = await import(pathToFileURL(path.join(outDir, 'lib', 'spin.js')).href);
const pets = await import(pathToFileURL(path.join(outDir, 'lib', 'pets.js')).href);
const content = await import(pathToFileURL(path.join(outDir, 'lib', 'content.js')).href);
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const store = read('src/lib/store.ts');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok ${passed}. ${name}`);
}

const CFG = spin.DEFAULT_SPIN_CONFIG;
const prize = (id) => CFG.prizes.find((p) => p.id === id);
const OPEN_CTX = { stockById: {}, moneyWonThisMonth: 0, monthlyBudgetVnd: CFG.monthlyBudgetVnd };

console.log('Vòng quay — bảng quà mặc định:');
check('đủ 3 tầng với trọng số đúng spec chốt 09/11 (sao thay xu, tiền = xác suất NHỎ NHẤT)', () => {
  assert.equal(CFG.prizes.filter((p) => p.tier === 'easy').length, 6);
  assert.equal(CFG.prizes.filter((p) => p.tier === 'medium').length, 5);
  assert.equal(CFG.prizes.filter((p) => p.tier === 'hard').length, 5);
  assert.equal(prize('spin-easy-xp').weight, 30);
  assert.equal(prize('spin-easy-xp').amount, 50);
  // "Xu" chính là SAO: quà sao cộng vào bộ đếm stars sẵn có, không còn kind coins.
  assert.equal(prize('spin-easy-stars').kind, 'stars');
  assert.equal(prize('spin-easy-stars').weight, 25);
  assert.equal(prize('spin-easy-stars').amount, 10);
  assert.equal(prize('spin-med-stars').kind, 'stars');
  assert.equal(prize('spin-med-stars').weight, 24);
  assert.equal(prize('spin-med-stars').amount, 25);
  assert.ok(!CFG.prizes.some((p) => p.kind === 'coins'), 'không còn loại quà xu (coins) nào');
  assert.equal(prize('spin-easy-food').weight, 20);
  assert.equal(prize('spin-easy-acc').accessoryGroup, 'mu-kinh');
  // Quà tiền theo tầng: Dễ 1.000đ w1, Trung bình 5.000đ w2, Khó 15.000đ w1 —
  // tồn kho null (không giới hạn số lượng), cổng chính là ngân sách tháng.
  assert.equal(prize('spin-easy-cash').weight, 1, 'quà 1.000đ phải có xác suất nhỏ nhất (trọng số 1)');
  assert.equal(prize('spin-easy-cash').cash, true);
  assert.equal(prize('spin-easy-cash').amount, 1000);
  assert.equal(prize('spin-easy-cash').stock, null, 'quà tiền không giới hạn tồn kho — chặn bằng ngân sách');
  assert.equal(prize('spin-med-cash').weight, 2, 'quà 5.000đ phải khó trúng (trọng số 2)');
  assert.equal(prize('spin-med-cash').cash, true);
  assert.equal(prize('spin-med-cash').amount, 5000);
  assert.equal(prize('spin-med-cash').stock, null);
  assert.equal(prize('spin-hard-cash').weight, 1, 'quà 15.000đ phải có xác suất nhỏ nhất (trọng số 1)');
  assert.equal(prize('spin-hard-cash').amount, 15000);
  assert.equal(prize('spin-hard-cash').stock, null);
  assert.equal(prize('spin-hard-teddy').weight, 8);
  assert.equal(prize('spin-hard-teddy').stock, 2, 'gấu bông (không phải tiền) vẫn giữ tồn kho');
  assert.equal(prize('spin-hard-pet').kind, 'rare-pet');
  assert.equal(prize('spin-hard-set').accessoryGroup, 'bo-do');
  assert.equal(CFG.monthlyBudgetVnd, 50000, 'ngân sách tháng mặc định giữ 50.000đ');
});

console.log('Vòng quay — điều kiện được quay / tự loại:');
check('mặc định: mọi quà đều hợp lệ, tầng nào cũng đủ quay', () => {
  const expected = { easy: 6, medium: 5, hard: 5 };
  for (const tier of ['easy', 'medium', 'hard']) {
    const list = spin.eligiblePrizesForTier(CFG, tier, OPEN_CTX);
    assert.equal(list.length, expected[tier], `tầng ${tier} phải có ${expected[tier]} quà`);
  }
  assert.equal(spin.prizeExclusionReason(prize('spin-easy-xp'), OPEN_CTX), null);
});

check('quà bị TẮT (enabled=false) bị loại khỏi vòng', () => {
  const off = { ...prize('spin-easy-xp'), enabled: false };
  assert.equal(spin.isPrizeEligible(off, OPEN_CTX), false);
  assert.equal(spin.prizeExclusionReason(off, OPEN_CTX), 'Đang tắt');
  const cfg = { ...CFG, prizes: CFG.prizes.map((p) => (p.id === off.id ? off : p)) };
  assert.ok(!spin.eligiblePrizesForTier(cfg, 'easy', OPEN_CTX).some((p) => p.id === off.id));
});

check('HẾT TỒN KHO (stock 0 / máy bé ghi 0) ⇒ tự loại; stock null = không giới hạn', () => {
  const teddy = prize('spin-hard-teddy');
  assert.equal(teddy.stock, 2);
  assert.equal(spin.isPrizeEligible(teddy, OPEN_CTX), true);
  assert.equal(
    spin.isPrizeEligible(teddy, { ...OPEN_CTX, stockById: { [teddy.id]: 0 } }),
    false,
    'máy bé ghi tồn kho 0 thì quà phải rời vòng',
  );
  assert.equal(
    spin.prizeExclusionReason(teddy, { ...OPEN_CTX, stockById: { [teddy.id]: 0 } }),
    'Hết số lượng',
  );
  assert.equal(spin.isPrizeEligible({ ...teddy, stock: 0 }, OPEN_CTX), false);
  assert.equal(spin.isPrizeEligible({ ...teddy, stock: null }, { ...OPEN_CTX, stockById: {} }), true);
  // Ghi nhận của máy bé THẮNG cấu hình: cấu hình còn 2 nhưng máy đã hết.
  assert.equal(spin.effectiveStock(teddy, { [teddy.id]: 0 }), 0);
  assert.equal(spin.effectiveStock(teddy, {}), 2);
});

check('HẾT NGÂN SÁCH tháng ⇒ quà TIỀN bị loại nhưng quà ẢO vẫn quay được', () => {
  const brokeCtx = { stockById: {}, moneyWonThisMonth: CFG.monthlyBudgetVnd, monthlyBudgetVnd: CFG.monthlyBudgetVnd };
  assert.equal(spin.isPrizeEligible(prize('spin-med-cash'), brokeCtx), false);
  assert.equal(spin.prizeExclusionReason(prize('spin-med-cash'), brokeCtx), 'Hết ngân sách tháng');
  assert.equal(spin.isPrizeEligible(prize('spin-hard-cash'), brokeCtx), false);
  // Quà thật KHÔNG phải tiền mặt (gấu bông) không bị ngân sách chặn.
  assert.equal(spin.isPrizeEligible(prize('spin-hard-teddy'), brokeCtx), true);
  // Quà ảo vẫn còn nguyên trên vòng.
  const medium = spin.eligiblePrizesForTier(CFG, 'medium', brokeCtx);
  assert.ok(medium.some((p) => p.id === 'spin-med-xp'));
  assert.ok(!medium.some((p) => p.id === 'spin-med-cash'));
  const hard = spin.eligiblePrizesForTier(CFG, 'hard', brokeCtx);
  assert.ok(hard.some((p) => p.id === 'spin-hard-pet'));
});

check('tầng còn <2 quà hợp lệ ⇒ bổ sung quà ảo dự phòng cho đủ quay', () => {
  const onlyXp = {
    ...CFG,
    prizes: CFG.prizes.map((p) =>
      p.tier === 'easy' && p.id !== 'spin-easy-xp' ? { ...p, enabled: false } : p,
    ),
  };
  const list = spin.eligiblePrizesForTier(onlyXp, 'easy', OPEN_CTX);
  assert.ok(list.length >= 2, 'vòng không được phép còn dưới 2 ô');
  assert.ok(list.some((p) => p.id.startsWith('fallback-')), 'phải có quà dự phòng');
  assert.ok(list.every((p) => p.kind === 'xp' || p.kind === 'stars'), 'quà dự phòng phải là quà ảo');
});

console.log('Vòng quay — chọn theo trọng số (gieo hạt tất định):');
check('pickWeighted với RNG gieo hạt cho kết quả tất định + đúng biên trọng số', () => {
  const list = spin.eligiblePrizesForTier(CFG, 'easy', OPEN_CTX);
  const a = spin.pickWeighted(list, spin.mulberry32(42));
  const b = spin.pickWeighted(list, spin.mulberry32(42));
  assert.equal(a.id, b.id, 'cùng hạt giống ⇒ cùng kết quả');
  // rng() = 0 → quà đầu tiên; rng() sát 1 → quà cuối cùng.
  assert.equal(spin.pickWeighted(list, () => 0).id, list[0].id);
  assert.equal(spin.pickWeighted(list, () => 0.999999).id, list[list.length - 1].id);
  assert.equal(spin.pickWeighted([], spin.mulberry32(1)), null);
  assert.equal(spin.pickWeighted([{ ...list[0], weight: 0 }], spin.mulberry32(1)), null);
});

check('quà tiền trúng HIẾM hơn hẳn quà ảo khi quay nhiều lượt gieo hạt (cả 3 tầng)', () => {
  const N = 4000;
  const measure = (tier, cashId, seed) => {
    const list = spin.eligiblePrizesForTier(CFG, tier, OPEN_CTX);
    const rng = spin.mulberry32(seed);
    let cash = 0;
    for (let i = 0; i < N; i += 1) {
      if (spin.pickWeighted(list, rng)?.id === cashId) cash += 1;
    }
    return cash / N;
  };
  const easyRatio = measure('easy', 'spin-easy-cash', 20261109);
  assert.ok(easyRatio > 0 && easyRatio < 0.04, `tỉ lệ trúng 1.000đ phải nhỏ nhất (đo được ${easyRatio})`);
  const medRatio = measure('medium', 'spin-med-cash', 20261109);
  assert.ok(medRatio > 0 && medRatio < 0.08, `tỉ lệ trúng 5.000đ phải nhỏ (đo được ${medRatio})`);
  const hardRatio = measure('hard', 'spin-hard-cash', 20261109);
  assert.ok(hardRatio > 0 && hardRatio < 0.05, `tỉ lệ trúng 15.000đ phải nhỏ nhất (đo được ${hardRatio})`);
});

console.log('Vòng quay — cấp vé khi hoàn thành bài:');
check('ticketsForCompletion: thường→Dễ, hoàn hảo→Trung bình, xong chặng→+Khó', () => {
  assert.deepEqual(spin.ticketsForCompletion({ perfect: false, stageJustCompleted: false }), ['easy']);
  assert.deepEqual(spin.ticketsForCompletion({ perfect: true, stageJustCompleted: false }), ['medium']);
  assert.deepEqual(spin.ticketsForCompletion({ perfect: false, stageJustCompleted: true }), ['easy', 'hard']);
  assert.deepEqual(spin.ticketsForCompletion({ perfect: true, stageJustCompleted: true }), ['medium', 'hard']);
});

check('store: completeLesson cấp vé qua ticketsForCompletion, bài ôn/học lại không sinh vé', () => {
  assert.ok(store.includes('ticketsForCompletion({ perfect, stageJustCompleted })'), 'phải cấp vé qua hàm thuần');
  assert.ok(store.includes('completedStageCount(allLessons, nextCompleted)'), 'phải so số chặng xong trước/sau');
  assert.ok(store.includes('if (prevCompleted[lessonId]) return current;'), 'học lại bài cũ không sinh vé');
  assert.ok(store.includes('spinTickets'), 'store phải có ví vé');
});

console.log('Vòng quay — áp quà (store) + ngân sách từ lịch sử:');
check('applySpinWin: trừ vé, quà THẬT trừ tồn kho + chờ trao, accessory mở vĩnh viễn, pet hiếm vào rarePets', () => {
  assert.ok(store.includes('applySpinWin: (tier, prize) => {'), 'store phải có applySpinWin');
  assert.ok(store.includes('[prize.id]: Math.max(0, current - 1)'), 'trúng quà thật phải trừ tồn kho ngay');
  assert.ok(store.includes('realStatus: prize.kind === "real" ? "pending" : null'), 'quà thật vào Kho báu ở trạng thái chờ trao');
  assert.ok(store.includes('spinGroupTargets(prize.accessoryGroup)'), 'quà phụ kiện phải ánh xạ sang nhóm phụ kiện pet');
  assert.ok(store.includes('patch.spinUnlockedAccessories = unlocked'), 'phụ kiện vòng quay mở VĨNH VIỄN ngoài mốc chặng');
  assert.ok(store.includes('patch.rarePets = [...owned, RARE_PET.id]'), 'pet hiếm Phượng Hoàng Cầu Vồng phải vào bộ sưu tập');
  assert.ok(store.includes('markSpinPrizeGiven: (historyId) =>'), 'phải có xác nhận đã trao theo khuôn givenAt');
  assert.ok(store.includes('givenAt: Date.now()'), 'xác nhận trao phải ghi givenAt');
  // Chốt 09/11: "xu" = sao — quà sao cộng vào stars sẵn có, không còn ví coins.
  assert.ok(store.includes('patch.stars = (state.stars ?? 0) + prize.amount'), 'quà sao phải cộng vào bộ đếm stars sẵn có');
  assert.ok(!store.includes('patch.coins'), 'không còn cộng ví xu riêng nữa');
  assert.ok(store.includes('mode === "phuong-hoang"'), 'pet hiếm đồng hành qua khóa phuong-hoang');
});

check('moneyWonInMonth/budgetState: chỉ cộng TIỀN MẶT trong đúng tháng', () => {
  const at = new Date(2026, 10, 15, 12, 0, 0).getTime(); // 15/11/2026
  const entry = (over) => ({
    id: 'x', ownerId: null, at, tier: 'medium', prizeId: 'p', prizeName: 'q',
    prizeEmoji: '🎁', kind: 'real', amount: 0, cash: true, imageUrl: null,
    realStatus: 'pending', givenAt: null, updatedAt: at, ...over,
  });
  const history = [
    entry({ id: 'a', amount: 5000 }),
    entry({ id: 'b', amount: 15000, tier: 'hard' }),
    entry({ id: 'c', amount: 99000, cash: false }), // gấu bông — không tính tiền
    entry({ id: 'd', amount: 7000, kind: 'stars', cash: false }), // sao — không tính
    entry({ id: 'e', amount: 5000, at: new Date(2026, 9, 31).getTime() }), // tháng trước
  ];
  assert.equal(spin.moneyWonInMonth(history, at), 20000);
  const state = spin.budgetState({ ...CFG, monthlyBudgetVnd: 20000 }, history, at);
  assert.equal(state.spent, 20000);
  assert.equal(state.exhausted, true, 'đạt ngân sách ⇒ exhausted');
  assert.equal(spin.budgetState({ ...CFG, monthlyBudgetVnd: 50000 }, history, at).remaining, 30000);
  assert.deepEqual(spin.pendingRealEntries(history).map((e) => e.id), ['a', 'b', 'c', 'e']);
});

check('mergeSpinHistory: updatedAt mới thắng; hòa thì bản ĐÃ TRAO thắng', () => {
  const base = {
    id: 'h1', ownerId: null, at: 100, tier: 'hard', prizeId: 'p', prizeName: 'Gấu bông',
    prizeEmoji: '🧸', kind: 'real', amount: 0, cash: false, imageUrl: null,
    realStatus: 'pending', givenAt: null, updatedAt: 100,
  };
  const given = { ...base, realStatus: 'given', givenAt: 100, updatedAt: 100 };
  const merged = spin.mergeSpinHistory([base], [given]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].realStatus, 'given', 'trạng thái đã trao không được bị bản cũ đè');
  const newer = { ...base, prizeName: 'Tên mới', updatedAt: 200 };
  assert.equal(spin.mergeSpinHistory([base], [newer])[0].prizeName, 'Tên mới');
});

check('sanitize: cấu hình/lịch sử rác bị loại, cấu hình mặc định qua được sanitize', () => {
  assert.equal(spin.sanitizeSpinConfig(null), null);
  assert.equal(spin.sanitizeSpinConfig({ prizes: 'x' }), null);
  const round = spin.sanitizeSpinConfig(JSON.parse(JSON.stringify(CFG)));
  assert.equal(round.prizes.length, CFG.prizes.length);
  assert.equal(round.monthlyBudgetVnd, CFG.monthlyBudgetVnd);
  assert.equal(spin.sanitizeSpinHistoryEntry({ id: 5 }), null);
});

console.log('Vòng quay — phụ kiện vòng quay + Phượng Hoàng Cầu Vồng (pets.ts):');
check('mỗi nhóm quà phụ kiện có đúng 1 món đích cho mỗi thú; món vòng quay không mở bằng chặng', () => {
  for (const group of ['mu-kinh', 'ao-vay', 'giay', 'bo-do']) {
    const targets = pets.spinGroupTargets(group);
    assert.equal(targets.length, 3, `nhóm ${group} phải có món cho cả 3 thú`);
    for (const t of targets) {
      const item = pets.accessoryById(t.courseId, t.accessoryId);
      assert.ok(item, `thiếu món ${t.accessoryId}`);
      assert.equal(item.source, 'spin');
      assert.equal(pets.isAccessoryUnlocked(item, 999), false, 'món vòng quay không mở bằng số chặng');
    }
  }
  assert.equal(pets.accessoriesFor('en-vi').length, 6, 'tủ theo chặng vẫn đúng 6 món');
  assert.equal(pets.allAccessoriesFor('en-vi').length, 10, 'tủ đầy đủ = 6 chặng + 4 vòng quay');
});

check('companionPetFor: Phượng Hoàng Cầu Vồng chỉ đồng hành khi đã sở hữu; skill = none (không làm bài thay)', () => {
  assert.equal(pets.RARE_PET.id, 'phuong-hoang');
  assert.equal(pets.RARE_PET.name, 'Phượng Hoàng Cầu Vồng');
  assert.equal(pets.RARE_PET.emoji, '🦚');
  assert.equal(
    pets.companionPetFor({ activeCompanion: 'phuong-hoang', courseId: 'en-vi', legendary: false, rarePets: [] })?.emoji,
    '🦁',
    'chưa có Phượng Hoàng thì quay về thú thế giới',
  );
  const phoenix = pets.companionPetFor({ activeCompanion: 'phuong-hoang', courseId: 'ja-vi', legendary: false, rarePets: ['phuong-hoang'] });
  assert.equal(phoenix.emoji, '🦚');
  assert.equal(phoenix.name, 'Phượng Hoàng Cầu Vồng');
  assert.equal(phoenix.skillKind, 'none');
  const fakeExercise = { type: 'select', prompt: 'Chọn từ đúng', options: ['cat'], answer: 'cat' };
  assert.equal(
    pets.petSkillForExercise({ exercise: fakeExercise, courseId: 'en-vi', skillKind: 'none', getWord: () => undefined }),
    null,
    'Phượng Hoàng Cầu Vồng (skill none) không bao giờ sinh gợi ý làm bài',
  );
});

console.log('Vòng quay — nối dây UI:');
check('trang vòng quay/kho báu/admin tồn tại với đúng cơ chế', () => {
  const spinPage = read('src/app/spin.tsx');
  assert.ok(spinPage.includes('pickWeighted(prizes)'), 'kết quả phải chọn TRƯỚC bằng trọng số');
  assert.ok(spinPage.includes('eligiblePrizesForTier(config, tier, eligibilityCtx)'), 'vòng chỉ gồm quà hợp lệ');
  assert.ok(spinPage.includes('applySpinWin(tier, result)'), 'nhận quà phải qua applySpinWin');
  const treasure = read('src/app/treasure.tsx');
  assert.ok(treasure.includes('pendingRealEntries(history)'), 'Kho báu phải hiện quà thật chờ trao');
  assert.ok(treasure.includes('SPIN_STICKERS'), 'Kho báu phải hiện bộ sưu tập sticker');
  const admin = read('src/app/admin-spin.tsx');
  assert.ok(admin.includes('isAdminEmail(user?.email)'), 'admin-spin phải dùng cổng admin như admin-rewards');
  assert.ok(admin.includes('publishSpinConfig(draft, user?.email)'), 'cấu hình phải công bố qua app_config');
  assert.ok(admin.includes('markSpinPrizeGiven(entryId)'), 'admin phải xác nhận được đã trao');
  assert.ok(admin.includes('prizeExclusionReason'), 'admin phải thấy lý do quà bị loại khỏi vòng');
});

check('_layout đăng ký route + khu người lớn; dashboard + màn kết quả + trang pet nối đúng', () => {
  const layout = read('src/app/_layout.tsx');
  assert.ok(layout.includes('name="spin"'));
  assert.ok(layout.includes('name="treasure"'));
  assert.ok(layout.includes('name="admin-spin"'));
  assert.ok(layout.includes('segments[0] === "admin-spin"'), 'admin-spin phải là khu người lớn (giới hạn giờ)');
  assert.ok(layout.includes('useSpinConfigSync()'));
  assert.ok(layout.includes('useSpinHistorySync(hydrated)'));
  const home = read('src/app/(tabs)/index.tsx');
  assert.ok(home.includes('router.push("/spin")'));
  assert.ok(home.includes('router.push("/treasure")'));
  const lesson = read('src/app/lesson/[id].tsx');
  assert.ok(lesson.includes('router.push("/spin")'), 'màn kết quả bài học phải có nút đi quay');
  assert.ok(lesson.includes('spinTicketTotal'), 'nút quay hiện theo số vé đang có');
  const petPage = read('src/app/pet.tsx');
  assert.ok(petPage.includes('allAccessoriesFor(courseId)'), 'trang pet phải hiện cả phụ kiện vòng quay');
  assert.ok(petPage.includes('setActiveCompanion("phuong-hoang")'), 'trang pet phải chọn được Phượng Hoàng Cầu Vồng đồng hành');
});

check('kênh đồng bộ: cấu hình qua app_config key riêng + SQL spin_history kèm điều kiện', () => {
  const sync = read('src/lib/spinConfigSync.ts');
  assert.ok(sync.includes('SPIN_CONFIG_KEY = "spin_config"'));
  const sql = read('src/features/supabase/spin-schema.sql');
  assert.ok(sql.includes('create table if not exists public.spin_history'));
  assert.ok(sql.includes('auth.uid() = owner_id'), 'spin_history phải owner-only như family_rewards');
});

console.log('Baseline nội dung:');
check('80 unit / 314 bài / 2488 câu — giữ nguyên', () => {
  let units = 0;
  let lessons = 0;
  let exercises = 0;
  for (const courseId of ['en-vi', 'ja-vi', 'zh-vi']) {
    const pack = content.getPack(courseId);
    for (const section of pack.sections) {
      units += section.units.length;
      for (const unit of section.units) {
        lessons += unit.lessons.length;
        for (const lesson of unit.lessons) exercises += lesson.exercises.length;
      }
    }
  }
  assert.deepEqual([units, lessons, exercises], [80, 314, 2488]);
});

console.log(`\nPASS test-spin: ${passed} nhóm kiểm tra đạt.`);
