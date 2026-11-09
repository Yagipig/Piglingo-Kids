import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { catalog, useCourseContent } from "./content";
import {
  accessoryById,
  completedStageCount,
  isAccessoryUnlocked,
  legendaryUnlocked,
  stageClaimCheck,
} from "./pets";
import { isDue, reviewWord, type SrsEntry } from "./srs";
import type { SchoolBand } from "./types";

export const XP_PER_LESSON = 15;
export const XP_PERFECT_BONUS = 5;
export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_DAILY_GOAL = 20;
export const DEFAULT_COURSE = "en-vi";
/** Days of per-day history kept for the streak calendar and quests. */
const DAY_HISTORY_LIMIT = 70;

export type ThemePreference = "system" | "light" | "dark";

/** Cấp độ người học, do bé/phụ huynh tự chọn ở onboarding hoặc tab Hồ sơ. */
export type LearnerLevel = "moi" | "da-biet" | "chuyen-nghiep";

export const LEARNER_LEVELS: { value: LearnerLevel; label: string; hint: string }[] = [
  { value: "moi", label: "Mới bắt đầu", hint: "Chưa biết gì, học từ đầu 🌱" },
  { value: "da-biet", label: "Đã biết cơ bản", hint: "Đã biết một ít, học tiếp 🚀" },
  { value: "chuyen-nghiep", label: "Chuyên nghiệp", hint: "Đã giỏi, muốn thử thách 🏆" },
];

export function learnerLevelLabel(level: LearnerLevel): string {
  return LEARNER_LEVELS.find((l) => l.value === level)?.label ?? "Mới bắt đầu";
}

export const SCHOOL_BANDS: { value: SchoolBand; label: string; hint: string }[] = [
  { value: "tieu-hoc", label: "Tiểu học · Lớp 1–5", hint: "Khối Tiểu học, lớp 1–5 📚" },
  { value: "thcs", label: "THCS · Lớp 6–9", hint: "Khối THCS, lớp 6–9 🚀" },
  { value: "thpt", label: "THPT · Lớp 10–12", hint: "Khối THPT, lớp 10–12 🎓" },
];

export function schoolBandLabel(band: SchoolBand): string {
  return SCHOOL_BANDS.find((b) => b.value === band)?.label ?? "Tiểu học · Lớp 1–5";
}
export type WordStat = { correct: number; wrong: number; lastSeen: number };
export type MistakeRef = { lessonId: string; exerciseId: string };
export type DayActivity = { xp: number; lessons: number; perfect: number };

export type CourseProgress = {
  xp: number;
  completedLessons: Record<string, true>;
  mistakes: MistakeRef[];
  wordStats: Record<string, WordStat>;
  srs: Record<string, SrsEntry>;
};

function emptyCourseProgress(): CourseProgress {
  return {
    xp: 0,
    completedLessons: {},
    mistakes: [],
    wordStats: {},
    srs: {},
  };
}

function dayString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return dayString(d);
}

type ProgressState = {
  activeCourseId: string;
  streak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  dailyXp: number;
  dailyXpDay: string | null;
  onboardingDone: boolean;
  /** Đã nhập đúng mã mở khóa: toàn bộ bài học được mở (xem lib/unlock.ts). */
  allUnlocked: boolean;
  /** Cấp độ người học tự chọn: "moi" | "da-biet" | "chuyen-nghiep". */
  learnerLevel: LearnerLevel;
  /** Khối lớp người học tự chọn: "tieu-hoc" | "thcs" | "thpt". */
  schoolBand: SchoolBand;
  /** Nhạc nền khu vườn đang bật hay tắt (mặc định tắt). */
  musicOn: boolean;
  /** Kỷ lục game "Đố nhanh 60 giây": số câu đúng cao nhất trong một ván. */
  speedBest: number;
  /**
   * Ảnh nền tự chọn (data URL jpeg) áp dụng cho các màn tab chính.
   * null = dùng nền mặc định theo theme.
   */
  backgroundImage: string | null;
  /**
   * Ảnh cá nhân của bé (data URL jpeg) đặt ở tab Hồ sơ: hiện ở điểm
   * dừng hiện tại trên bản đồ đường đi và cạnh heo mascot ở trang chủ.
   * null = chưa đặt, dùng heo mascot mặc định. Dữ liệu cũ không có
   * field này → migrate điền null; code đọc luôn dùng `?? null`.
   */
  avatarImage: string | null;
  /** "system" follows the device's light/dark setting. */
  themePreference: ThemePreference;
  /* ----- Hệ thú cưng (Đợt B+C) — mọi field có mặc định an toàn và
     migrate điền mặc định khi dữ liệu cũ thiếu. ----- */
  /** Điểm phát triển của thú theo từng khóa (học bài + cho ăn mà có). */
  petGrowth: Record<string, number>;
  /** Thức ăn cho thú đang có (kiếm được từ rương chặng). */
  petFood: number;
  /** Sao tích lũy (bài hoàn hảo + rương chặng). */
  stars: number;
  /** Chìa khóa bí mật đang có (mở sớm một bài đang khóa). */
  unlockKeys: number;
  /** Bài đã mở sớm bằng chìa khóa, theo từng khóa. */
  keyUnlockedLessons: Record<string, string[]>;
  /** Số thứ tự chặng (từ 1) đã nhận quà rương, theo từng khóa. */
  claimedStageRewards: Record<string, number[]>;
  /** Phụ kiện thú đang mặc, theo từng khóa. */
  equippedAccessories: Record<string, string[]>;
  /** Thú đồng hành: thú của thế giới, hay Rồng Huyền Thoại khi đã mở. */
  activeCompanion: "world" | "legendary";
  courses: Record<string, CourseProgress>;
  /** Per-day activity across courses, for the streak calendar and quests. */
  activeDays: Record<string, DayActivity>;

  course: () => CourseProgress;
  completeLesson: (lessonId: string, perfect: boolean) => void;
  addMistake: (mistake: MistakeRef) => void;
  clearMistake: (exerciseId: string) => void;
  recordWord: (target: string, correct: boolean) => void;
  reviewSrsWord: (target: string, correct: boolean) => void;
  setActiveCourse: (courseId: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  finishOnboarding: (courseId: string, goal: number) => void;
  /** Mở khóa toàn bộ bài học (sau khi nhập đúng mã mở khóa). */
  unlockAll: () => void;
  setLearnerLevel: (level: LearnerLevel) => void;
  setSchoolBand: (band: SchoolBand) => void;
  /** Cộng XP thưởng (game, hoạt động phụ) vào khóa hiện tại + XP ngày. */
  addBonusXp: (amount: number) => void;
  setMusicOn: (on: boolean) => void;
  /** Ghi nhận điểm game Đố nhanh; chỉ giữ lại kỷ lục cao nhất. */
  recordSpeedScore: (score: number) => void;
  /** Đặt ảnh nền tự chọn (data URL) hoặc xóa về nền mặc định với null. */
  setBackgroundImage: (uri: string | null) => void;
  /** Đặt ảnh cá nhân của bé (data URL) hoặc xóa về heo mặc định với null. */
  setAvatarImage: (uri: string | null) => void;
  /**
   * Nhận quà rương của một chặng (stageNumber từ 1): chỉ khi chặng đã
   * hoàn thành thật và chưa nhận — cộng XP thưởng (cùng cơ chế
   * addBonusXp, ghi vào khóa của rương) + thức ăn + sao + chìa khóa.
   * Gọi lần thứ hai là no-op.
   */
  claimStageReward: (courseId: string, stageNumber: number) => void;
  /** Cho thú của một khóa ăn: tốn 1 thức ăn, +8 điểm phát triển. */
  feedPet: (courseId: string) => void;
  /** Mặc/cởi một phụ kiện cho thú (chỉ khi đã mở khóa theo số chặng). */
  toggleAccessory: (courseId: string, accessoryId: string) => void;
  /** Dùng 1 chìa khóa bí mật để mở sớm một bài đang khóa của khóa. */
  useUnlockKey: (courseId: string, lessonId: string) => void;
  /** Chọn thú đồng hành: "legendary" chỉ nhận khi Rồng đã mở khóa. */
  setActiveCompanion: (mode: "world" | "legendary") => void;
};

function bumpDailyXp(state: ProgressState, amount: number) {
  const today = dayString(new Date());
  const isSameDay = state.dailyXpDay === today;
  const dailyXp = isSameDay ? state.dailyXp + amount : amount;
  return { dailyXp, dailyXpDay: today };
}

function pruneDays(days: Record<string, DayActivity>) {
  const keys = Object.keys(days ?? {}).sort();
  if (keys.length <= DAY_HISTORY_LIMIT) return days ?? {};
  const keep = new Set(keys.slice(-DAY_HISTORY_LIMIT));
  return Object.fromEntries(Object.entries(days).filter(([k]) => keep.has(k)));
}

function updateCourse(
  state: ProgressState,
  courseId: string,
  fn: (c: CourseProgress) => CourseProgress
): Partial<ProgressState> {
  const courses = state.courses ?? {};
  const prev = courses[courseId] ?? emptyCourseProgress();
  return { courses: { ...courses, [courseId]: fn(prev) } };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      activeCourseId: DEFAULT_COURSE,
      streak: 0,
      lastActiveDay: null,
      dailyGoal: DEFAULT_DAILY_GOAL,
      dailyXp: 0,
      dailyXpDay: null,
      onboardingDone: false,
      allUnlocked: false,
      learnerLevel: "moi",
      schoolBand: "tieu-hoc",
      musicOn: false,
      speedBest: 0,
      backgroundImage: null,
      avatarImage: null,
      themePreference: "system",
      petGrowth: {},
      petFood: 0,
      stars: 0,
      unlockKeys: 0,
      keyUnlockedLessons: {},
      claimedStageRewards: {},
      equippedAccessories: {},
      activeCompanion: "world",
      courses: {},
      activeDays: {},

      course: () => (get().courses ?? {})[get().activeCourseId] ?? emptyCourseProgress(),

      completeLesson: (lessonId, perfect) =>
        set((state) => {
          const today = dayString(new Date());
          const yesterday = getYesterday();
          const streak =
            state.lastActiveDay === today
              ? state.streak
              : state.lastActiveDay === yesterday
                ? state.streak + 1
                : 1;
          const earned = XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0);
          const daily = bumpDailyXp(state, earned);
          const days = state.activeDays ?? {};
          const prevDay = days[today] ?? { xp: 0, lessons: 0, perfect: 0 };
          const activeDays = pruneDays({
            ...days,
            [today]: {
              xp: prevDay.xp + earned,
              lessons: prevDay.lessons + 1,
              perfect: prevDay.perfect + (perfect ? 1 : 0),
            },
          });
          const courseUpdate = updateCourse(state, state.activeCourseId, (c) => ({
            ...c,
            xp: c.xp + earned,
            completedLessons:
              lessonId === "mistakes" || lessonId === "srs"
                ? c.completedLessons
                : { ...c.completedLessons, [lessonId]: true },
          }));
          // Học là cách nuôi pet: mỗi bài học xong cho thú của khóa
          // đang học +10 điểm phát triển (bài hoàn hảo +5 nữa), và bài
          // hoàn hảo mang về thêm 1 sao.
          const growthGain = 10 + (perfect ? 5 : 0);
          const petGrowth = {
            ...(state.petGrowth ?? {}),
            [state.activeCourseId]:
              (state.petGrowth?.[state.activeCourseId] ?? 0) + growthGain,
          };
          const stars = (state.stars ?? 0) + (perfect ? 1 : 0);
          return {
            streak,
            lastActiveDay: today,
            activeDays,
            petGrowth,
            stars,
            ...daily,
            ...courseUpdate,
          };
        }),

      addMistake: (mistake) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) =>
            c.mistakes.some((m) => m.exerciseId === mistake.exerciseId)
              ? c
              : { ...c, mistakes: [...c.mistakes, mistake] }
          )
        ),

      clearMistake: (exerciseId) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => ({
            ...c,
            mistakes: c.mistakes.filter((m) => m.exerciseId !== exerciseId),
          }))
        ),

      recordWord: (target, correct) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => {
            const prev = c.wordStats[target] ?? { correct: 0, wrong: 0, lastSeen: 0 };
            const quality = correct ? (prev.wrong > prev.correct ? 1 : 2) : 0;
            return {
              ...c,
              wordStats: {
                ...c.wordStats,
                [target]: {
                  correct: prev.correct + (correct ? 1 : 0),
                  wrong: prev.wrong + (correct ? 0 : 1),
                  lastSeen: Date.now(),
                },
              },
              srs: { ...c.srs, [target]: reviewWord(c.srs[target], quality) },
            };
          })
        ),

      reviewSrsWord: (target, correct) =>
        set((state) =>
          updateCourse(state, state.activeCourseId, (c) => {
            const prev = c.wordStats[target] ?? { correct: 0, wrong: 0, lastSeen: 0 };
            return {
              ...c,
              wordStats: {
                ...c.wordStats,
                [target]: {
                  correct: prev.correct + (correct ? 1 : 0),
                  wrong: prev.wrong + (correct ? 0 : 1),
                  lastSeen: Date.now(),
                },
              },
              srs: { ...c.srs, [target]: reviewWord(c.srs[target], correct ? 2 : 0) },
            };
          })
        ),

      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),

      setThemePreference: (preference) => set({ themePreference: preference }),

      finishOnboarding: (courseId, goal) =>
        set({ activeCourseId: courseId, dailyGoal: goal, onboardingDone: true }),

      unlockAll: () => set({ allUnlocked: true }),

      setMusicOn: (on) => set({ musicOn: on }),

      recordSpeedScore: (score) =>
        set((state) => ({ speedBest: Math.max(state.speedBest ?? 0, score) })),

      setBackgroundImage: (uri) => set({ backgroundImage: uri }),

      setAvatarImage: (uri) => set({ avatarImage: uri }),

      claimStageReward: (courseId, stageNumber) =>
        set((state) => {
          if (!catalog.courses.some((c) => c.id === courseId)) return state;
          const course = (state.courses ?? {})[courseId];
          const claimed = state.claimedStageRewards?.[courseId] ?? [];
          const check = stageClaimCheck({
            allLessons: useCourseContent(courseId).allLessons,
            completedLessons: course?.completedLessons ?? {},
            claimedStages: claimed,
            stageNumber,
          });
          if (!check.ok) return state;
          const reward = check.reward;
          // XP thưởng: cùng cơ chế ghi sổ của addBonusXp (XP ngày +
          // lịch sử ngày + XP của khóa) nhưng ghi vào khóa của rương.
          const daily = bumpDailyXp(state, reward.xpBonus);
          const today = dayString(new Date());
          const days = state.activeDays ?? {};
          const prevDay = days[today] ?? { xp: 0, lessons: 0, perfect: 0 };
          const activeDays = pruneDays({
            ...days,
            [today]: { ...prevDay, xp: prevDay.xp + reward.xpBonus },
          });
          const courseUpdate = updateCourse(state, courseId, (c) => ({
            ...c,
            xp: c.xp + reward.xpBonus,
          }));
          return {
            ...daily,
            activeDays,
            ...courseUpdate,
            petFood: (state.petFood ?? 0) + reward.food,
            stars: (state.stars ?? 0) + reward.stars,
            unlockKeys: (state.unlockKeys ?? 0) + reward.key,
            claimedStageRewards: {
              ...(state.claimedStageRewards ?? {}),
              [courseId]: [...claimed, stageNumber],
            },
          };
        }),

      feedPet: (courseId) =>
        set((state) => {
          if ((state.petFood ?? 0) <= 0) return state;
          return {
            petFood: (state.petFood ?? 0) - 1,
            petGrowth: {
              ...(state.petGrowth ?? {}),
              [courseId]: (state.petGrowth?.[courseId] ?? 0) + 8,
            },
          };
        }),

      toggleAccessory: (courseId, accessoryId) =>
        set((state) => {
          const item = accessoryById(courseId, accessoryId);
          if (!item) return state;
          if (!catalog.courses.some((c) => c.id === courseId)) return state;
          const completed =
            (state.courses ?? {})[courseId]?.completedLessons ?? {};
          const doneStages = completedStageCount(
            useCourseContent(courseId).allLessons,
            completed
          );
          if (!isAccessoryUnlocked(item, doneStages)) return state;
          const equipped = state.equippedAccessories?.[courseId] ?? [];
          const next = equipped.includes(accessoryId)
            ? equipped.filter((id) => id !== accessoryId)
            : [...equipped, accessoryId];
          return {
            equippedAccessories: {
              ...(state.equippedAccessories ?? {}),
              [courseId]: next,
            },
          };
        }),

      useUnlockKey: (courseId, lessonId) =>
        set((state) => {
          if ((state.unlockKeys ?? 0) <= 0) return state;
          const list = state.keyUnlockedLessons?.[courseId] ?? [];
          if (list.includes(lessonId)) return state;
          return {
            unlockKeys: (state.unlockKeys ?? 0) - 1,
            keyUnlockedLessons: {
              ...(state.keyUnlockedLessons ?? {}),
              [courseId]: [...list, lessonId],
            },
          };
        }),

      setActiveCompanion: (mode) =>
        set((state) => {
          if (mode === "legendary") {
            const totals = Object.fromEntries(
              catalog.courses.map((c) => [c.id, c.lessonCount])
            );
            if (!legendaryUnlocked(state.courses ?? {}, totals)) return state;
          }
          return { activeCompanion: mode };
        }),

      setLearnerLevel: (level) => set({ learnerLevel: level }),

      setSchoolBand: (band) => set({ schoolBand: band }),

      addBonusXp: (amount) =>
        set((state) => {
          if (!amount) return state;
          const today = dayString(new Date());
          const daily = bumpDailyXp(state, amount);
          const days = state.activeDays ?? {};
          const prevDay = days[today] ?? { xp: 0, lessons: 0, perfect: 0 };
          const activeDays = pruneDays({
            ...days,
            [today]: { ...prevDay, xp: prevDay.xp + amount },
          });
          const courseUpdate = updateCourse(state, state.activeCourseId, (c) => ({
            ...c,
            xp: c.xp + amount,
          }));
          return { activeDays, ...daily, ...courseUpdate };
        }),
    }),
    {
      name: "progress-v2",
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: unknown) => {
        const old = persisted as Record<string, unknown>;
        if (old.courses) {
          return {
            activeDays: {},
            themePreference: "system" as ThemePreference,
            ...old,
            schoolBand: (old.schoolBand as SchoolBand) ?? "tieu-hoc",
            avatarImage: (old.avatarImage as string | null) ?? null,
            petGrowth: (old.petGrowth as Record<string, number>) ?? {},
            petFood: (old.petFood as number) ?? 0,
            stars: (old.stars as number) ?? 0,
            unlockKeys: (old.unlockKeys as number) ?? 0,
            keyUnlockedLessons:
              (old.keyUnlockedLessons as Record<string, string[]>) ?? {},
            claimedStageRewards:
              (old.claimedStageRewards as Record<string, number[]>) ?? {},
            equippedAccessories:
              (old.equippedAccessories as Record<string, string[]>) ?? {},
            activeCompanion:
              (old.activeCompanion as "world" | "legendary") ?? "world",
          } as ProgressState;
        }
        // Migrate v1 flat progress → per-course.
        const legacy = old as {
          xp?: number;
          completedLessons?: Record<string, true>;
          mistakes?: MistakeRef[];
          wordStats?: Record<string, WordStat>;
          srs?: Record<string, SrsEntry>;
        };
        return {
          activeCourseId: DEFAULT_COURSE,
          streak: old.streak ?? 0,
          lastActiveDay: old.lastActiveDay ?? null,
          dailyGoal: old.dailyGoal ?? DEFAULT_DAILY_GOAL,
          dailyXp: old.dailyXp ?? 0,
          dailyXpDay: old.dailyXpDay ?? null,
          onboardingDone: old.onboardingDone ?? false,
          allUnlocked: (old.allUnlocked as boolean) ?? false,
          learnerLevel: (old.learnerLevel as LearnerLevel) ?? "moi",
          schoolBand: (old.schoolBand as SchoolBand) ?? "tieu-hoc",
          musicOn: (old.musicOn as boolean) ?? false,
          speedBest: (old.speedBest as number) ?? 0,
          backgroundImage: (old.backgroundImage as string | null) ?? null,
          avatarImage: (old.avatarImage as string | null) ?? null,
          petGrowth: {},
          petFood: 0,
          stars: 0,
          unlockKeys: 0,
          keyUnlockedLessons: {},
          claimedStageRewards: {},
          equippedAccessories: {},
          activeCompanion: "world" as const,
          themePreference: (old.themePreference as ThemePreference) ?? "system",
          activeDays: (old.activeDays as Record<string, DayActivity>) ?? {},
          courses: {
            [DEFAULT_COURSE]: {
              xp: legacy.xp ?? 0,
              completedLessons: legacy.completedLessons ?? {},
              mistakes: legacy.mistakes ?? [],
              wordStats: legacy.wordStats ?? {},
              srs: legacy.srs ?? {},
            },
          },
        };
      },
    }
  )
);

export function currentLessonIndex(
  completed: Record<string, true> = {},
  lessonIds: string[] = []
) {
  const firstIncomplete = lessonIds.findIndex((id) => !completed[id]);
  return firstIncomplete === -1 ? lessonIds.length : firstIncomplete;
}

export function dailyXpToday(state: Pick<ProgressState, "dailyXp" | "dailyXpDay">) {
  const today = dayString(new Date());
  return state.dailyXpDay === today ? state.dailyXp : 0;
}

/**
 * The streak as it should be displayed *now*: the stored value goes stale if a
 * full day was missed (it's only recomputed on lesson completion).
 */
export function currentStreak(
  state: Pick<ProgressState, "streak" | "lastActiveDay">,
  now = new Date()
) {
  const today = dayString(now);
  const yesterday = getYesterday(now);
  return state.lastActiveDay === today || state.lastActiveDay === yesterday
    ? state.streak
    : 0;
}

/** True once a lesson has been completed today (used to light up the flame). */
export function activeToday(state: Pick<ProgressState, "lastActiveDay">) {
  return state.lastActiveDay === dayString(new Date());
}

export function todayActivity(
  state: Pick<ProgressState, "activeDays">
): DayActivity {
  return (
    (state.activeDays ?? {})[dayString(new Date())] ?? { xp: 0, lessons: 0, perfect: 0 }
  );
}

export type Quest = {
  id: string;
  label: string;
  target: number;
  value: number;
  done: boolean;
};

export function dailyQuests(
  state: Pick<ProgressState, "activeDays" | "dailyGoal">
): Quest[] {
  const today = todayActivity(state);
  const goal = Math.max(1, state.dailyGoal || DEFAULT_DAILY_GOAL);
  const make = (id: string, label: string, target: number, value: number): Quest => ({
    id,
    label,
    target,
    value: Math.min(value, target),
    done: value >= target,
  });
  return [
    make("xp", `Kiếm ${goal} XP`, goal, today.xp),
    make("lessons", "Hoàn thành 3 bài", 3, today.lessons),
    make("perfect", "Có 1 bài không sai câu nào", 1, today.perfect),
  ];
}

/** Rolling 7-day window ending today, for the streak calendar strip. */
export function lastSevenDays(state: Pick<ProgressState, "activeDays">) {
  const out: { day: string; weekday: string; active: boolean; isToday: boolean }[] = [];
  const now = new Date();
  const days = state.activeDays ?? {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const day = dayString(date);
    out.push({
      day,
      weekday: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()],
      active: (days[day]?.lessons ?? 0) > 0,
      isToday: i === 0,
    });
  }
  return out;
}

export function dueSrsWords(srs: Record<string, SrsEntry> = {}, now = Date.now()) {
  return Object.entries(srs ?? {})
    .filter(([, entry]) => isDue(entry, now))
    .map(([target]) => target);
}
