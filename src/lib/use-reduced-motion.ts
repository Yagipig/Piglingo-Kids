import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Đọc tuỳ chọn "giảm chuyển động" của hệ thống (và lắng nghe khi nó đổi).
 * Dùng để tắt hiệu ứng pulse/pháo giấy cho trẻ nhạy cảm với chuyển động.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
