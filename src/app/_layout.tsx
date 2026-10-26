import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";

import { TimeLimitGuard } from "@/features/parents/TimeLimitGuard";
import { useParentSettings } from "@/features/parents/useParentSettings";
import { AuthProvider } from "@/features/supabase/AuthContext";
import { useProgress } from "@/lib/store";
import { useResolvedScheme, useThemeColors } from "@/lib/theme";

/**
 * Bước 2: bọc phần app của bé bằng TimeLimitGuard, với 2 điều kiện an toàn:
 * - Chỉ enforce khi phụ huynh ĐÃ từng lưu cài đặt (settings.updatedAt > 0 do
 *   setDailyLimitMinutes ghi). Chưa ai đặt giới hạn -> không khóa bé, dù giá
 *   trị mặc định trong module phụ huynh là 30 phút/ngày.
 * - Không enforce ở các route phụ huynh/tài khoản/onboarding (/parents,
 *   /account, /onboarding), để người lớn luôn vào được khu vực của mình.
 * Trong lúc cài đặt chưa nạp xong (AsyncStorage), render nguyên trạng không
 * bọc guard để giữ nguyên hành vi khởi động cũ.
 */
function KidsTimeLimit({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useParentSettings();
  const segments = useSegments();
  const inGrownUpArea =
    segments[0] === "parents" || segments[0] === "account" || segments[0] === "onboarding";
  const parentConfigured = settings.updatedAt > 0;
  if (!isLoaded) return <>{children}</>;
  return (
    <TimeLimitGuard settings={settings} enabled={parentConfigured && !inGrownUpArea}>
      {children}
    </TimeLimitGuard>
  );
}

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(() => useProgress.persist.hasHydrated());
  const onboardingDone = useProgress((s) => s.onboardingDone);
  const segments = useSegments();
  const scheme = useResolvedScheme();
  const colors = useThemeColors();

  useEffect(() => {
    if (useProgress.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useProgress.persist.onFinishHydration(() => setHydrated(true));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    // Root window color, so transitions and overscroll never flash white.
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === "onboarding";
    const state = useProgress.getState();
    const hasProgress = Object.values(state.courses).some(
      (c) => c.xp > 0 || Object.keys(c.completedLessons).length > 0
    );
    const shouldShowOnboarding = !onboardingDone && !hasProgress;

    if (shouldShowOnboarding && !inOnboarding) {
      router.replace("/onboarding");
    } else if (!shouldShowOnboarding && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [hydrated, onboardingDone, segments]);

  return (
    <AuthProvider>
      <KidsTimeLimit>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="courses" options={{ presentation: "modal" }} />
          <Stack.Screen name="lesson/[id]" options={{ presentation: "fullScreenModal" }} />
          <Stack.Screen name="guidebook/[unitId]" options={{ presentation: "modal" }} />
          <Stack.Screen name="parents" options={{ presentation: "modal" }} />
          <Stack.Screen name="account" options={{ presentation: "modal" }} />
          <Stack.Screen name="speaking" options={{ presentation: "modal" }} />
        </Stack>
      </KidsTimeLimit>
    </AuthProvider>
  );
}
