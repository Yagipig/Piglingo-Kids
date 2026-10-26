/**
 * Route tài khoản phụ huynh (/account) — tích hợp Bước 2.
 *
 * Root layout (src/app/_layout.tsx) đã bọc <AuthProvider>, nên màn hình này
 * đăng nhập/đăng ký/đăng xuất được ngay; khi chưa cấu hình .env cho Supabase,
 * AuthScreen tự hiển thị trạng thái "đang tắt" và app vẫn chạy local.
 */
import React from 'react';
import { AuthScreen } from '@/features/supabase/AuthScreen';

export default function AccountRoute() {
  return <AuthScreen />;
}
