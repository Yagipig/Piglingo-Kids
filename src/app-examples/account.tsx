/**
 * ROUTE MẪU cho expo-router — copy thành `src/app/account.tsx` trong project gốc.
 *
 * Điều kiện: layout gốc (src/app/_layout.tsx) đã bọc <AuthProvider>
 * (đoạn code mẫu nằm trong INTEGRATION.md mục 5.3). Nếu chưa bọc, màn hình
 * vẫn mở được và hiển thị trạng thái "đang tắt" / chưa đăng nhập tùy cấu hình,
 * nhưng đăng nhập sẽ không có tác dụng cho tới khi có AuthProvider.
 */
import React from 'react';
import { AuthScreen } from '../features/supabase/AuthScreen';

export default function AccountRoute() {
  return <AuthScreen />;
}
