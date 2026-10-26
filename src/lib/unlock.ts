/**
 * Mở khóa toàn bộ bài học — hai cách:
 *
 * 1. MÃ MỞ KHÓA: bé/phụ huynh nhập mã này ở tab Hồ sơ ("Mã mở khóa bài
 *    học"). Nhập đúng thì store bật cờ `allUnlocked` (lưu bền vững trên
 *    máy) và mọi bài đều mở. Admin cấp mã này cho ai thì người đó mở
 *    được toàn bộ bài học trên máy của mình.
 * 2. TÀI KHOẢN ADMIN: email đăng nhập Supabase nằm trong ADMIN_EMAILS
 *    thì tự động mở khóa toàn bộ (không cần nhập mã). Muốn thêm admin
 *    khác, thêm email vào danh sách ADMIN_EMAILS rồi build lại app.
 */

export const UNLOCK_CODE = "HEOVIP95";

/** Email tài khoản admin (Supabase Auth) — đăng nhập là tự mở khóa toàn bộ. */
export const ADMIN_EMAILS: string[] = ["tuyenjp23@gmail.com"];

/** Chuẩn hóa mã người dùng nhập: bỏ khoảng trắng thừa, không phân biệt hoa thường. */
export function normalizeUnlockCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidUnlockCode(input: string): boolean {
  return normalizeUnlockCode(input) === UNLOCK_CODE;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.trim().toLowerCase() === normalized);
}

/**
 * Đã mở khóa toàn bộ chưa?
 * - `state.allUnlocked`: đã nhập đúng mã trên máy này, hoặc
 * - `email`: email phiên Supabase hiện tại thuộc danh sách admin.
 */
export function isAllUnlocked(
  state: { allUnlocked?: boolean },
  email?: string | null
): boolean {
  return !!state.allUnlocked || isAdminEmail(email);
}
