import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseEnabled, registerSupabaseAppStateAutoRefresh, supabase } from './client';

/**
 * AuthProvider / useAuth cho tài khoản phụ huynh (email + mật khẩu).
 *
 * Tài khoản này là tài khoản của BA/MẸ (để đồng bộ tiến độ giữa các máy),
 * không phải tài khoản cho bé tự đăng nhập. Khi Supabase đang tắt
 * (thiếu biến môi trường), `isEnabled` = false, user luôn null và các hàm
 * đăng nhập trả lỗi thân thiện — app vẫn chạy local bình thường.
 */

export interface AuthContextValue {
  isEnabled: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const DISABLED_MESSAGE =
  'Tính năng tài khoản đang tắt. Hãy cấu hình Supabase trong file .env rồi khởi động lại app.';

const AuthContext = createContext<AuthContextValue>({
  isEnabled: false,
  isLoading: false,
  user: null,
  session: null,
  signUp: async () => ({ error: DISABLED_MESSAGE }),
  signIn: async () => ({ error: DISABLED_MESSAGE }),
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseEnabled);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }
    registerSupabaseAppStateAutoRefresh();
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: DISABLED_MESSAGE };
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return { error: error ? toVietnameseAuthError(error.message) : null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: DISABLED_MESSAGE };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? toVietnameseAuthError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isEnabled: isSupabaseEnabled,
      isLoading,
      user: session?.user ?? null,
      session,
      signUp,
      signIn,
      signOut,
    }),
    [isLoading, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** Dịch các lỗi auth phổ biến sang tiếng Việt cho phụ huynh dễ hiểu. */
function toVietnameseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng. Ba/mẹ kiểm tra lại nhé.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Email này đã có tài khoản. Hãy bấm Đăng nhập.';
  }
  if (lower.includes('password should be at least')) {
    return 'Mật khẩu quá ngắn. Hãy đặt mật khẩu dài hơn theo yêu cầu trên màn hình.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email chưa được xác thực. Ba/mẹ mở hộp thư và bấm vào liên kết xác thực của Supabase nhé.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Chưa kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.';
  }
  return message;
}
