import { router, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { catalog } from "./content";
import { allCourseRewardProgress, evaluateCondition } from "./rewards";
import { useRewardsStore } from "./rewardsStore";
import { useProgress } from "./store";

/**
 * Theo dõi mốc 100% ở nền thay vì chỉ ở màn kết quả một bài học.
 *
 * Cờ được đặt TRƯỚC khi điều hướng: nếu app thoát giữa chừng, màn chúc
 * mừng không lặp lại ở mọi lần mở app; trẻ vẫn xem lại thành tích trong
 * màn Phần thưởng. Hook không tự đặt givenAt cho bất kỳ thưởng nào.
 */
export function useRewardCelebration(progressHydrated: boolean): void {
  const courses = useProgress((state) => state.courses);
  const segments = useSegments();
  const navigatingRef = useRef(false);
  const [rewardsHydrated, setRewardsHydrated] = useState(() =>
    useRewardsStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useRewardsStore.persist.hasHydrated()) {
      setRewardsHydrated(true);
      return;
    }
    const unsubscribe = useRewardsStore.persist.onFinishHydration(() => {
      setRewardsHydrated(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!progressHydrated || !rewardsHydrated || navigatingRef.current) return;
    if (segments[0] === "celebration") return;

    const progressState = useProgress.getState();
    const rewardsState = useRewardsStore.getState();
    const courseProgress = allCourseRewardProgress(progressState);
    const allDone = evaluateCondition(
      { type: "all-courses-complete" },
      progressState,
    ).done;

    try {
      if (allDone && !rewardsState.celebratedAllCourses) {
        const allCourseIds = catalog.courses.map((course) => course.id);
        // Đặt cả cờ tổng và cờ từng khóa trước khi mở màn hình.
        rewardsState.markCelebrated("all-courses", allCourseIds);
        navigatingRef.current = true;
        router.push("/celebration?scope=all");
        globalThis.setTimeout(() => {
          navigatingRef.current = false;
        }, 1000);
        return;
      }

      const newlyCompleted = courseProgress.find(
        (course) =>
          course.complete &&
          !rewardsState.celebratedCourseIds.includes(course.courseId),
      );
      if (newlyCompleted) {
        rewardsState.markCelebrated(newlyCompleted.courseId);
        navigatingRef.current = true;
        router.push(`/celebration?course=${encodeURIComponent(newlyCompleted.courseId)}`);
        globalThis.setTimeout(() => {
          navigatingRef.current = false;
        }, 1000);
      }
    } catch (error) {
      // Điều hướng có thể chưa sẵn sàng ở khung hình đầu tiên của root layout.
      // Cờ đã đặt trước nên không tạo vòng lặp; lần mount sau vẫn an toàn.
      navigatingRef.current = false;
      console.warn("[piglingo] Chưa mở được màn chúc mừng phần thưởng:", error);
    }
  }, [courses, progressHydrated, rewardsHydrated, segments]);
}
