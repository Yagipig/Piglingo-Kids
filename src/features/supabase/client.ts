import 'react-native-url-polyfill/auto';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase cho Piglingo Kids — THIẾT KẾ "TỰ TẮT AN TOÀN":
 *
 *  - Đọc cấu hình từ biến môi trường EXPO_PUBLIC_SUPABASE_URL và
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY (file .env ở thư mục gốc project, xem .env.example).
 *  - Nếu thiếu một trong hai biến, `supabase` = null, `isSupabaseEnabled` = false,
 *    và app PHẢI tiếp tục chạy hoàn toàn bằng dữ liệu local như Bước 1.
 *    Không có dòng nào trong module này được phép throw khi thiếu cấu hình.
 *  - Chỉ dùng anon/publishable key. TUYỆT ĐỐI không đặt service_role key hay
 *    secret key vào app — mọi bảo vệ dữ liệu dựa vào Row Level Security (xem schema.sql).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled: boolean = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // React Native không có localStorage: dùng AsyncStorage để phiên đăng nhập
        // còn nguyên sau khi tắt/mở app (theo tài liệu chính thức của Supabase cho RN).
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Lấy client khi chắc chắn tính năng đang bật; throw lỗi dễ hiểu nếu đang tắt. */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase chưa được cấu hình. Hãy tạo file .env từ .env.example và điền ' +
        'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY, rồi khởi động lại app.',
    );
  }
  return supabase;
}

let appStateRegistered = false;

/**
 * Đăng ký tự làm mới token theo trạng thái app (khuyến nghị của Supabase cho React Native):
 * app ở foreground thì startAutoRefresh, vào background thì stopAutoRefresh.
 * Gọi một lần duy nhất, ví dụ trong AuthProvider hoặc layout gốc. No-op khi Supabase đang tắt.
 */
export function registerSupabaseAppStateAutoRefresh(): void {
  if (!supabase || appStateRegistered) return;
  appStateRegistered = true;
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
