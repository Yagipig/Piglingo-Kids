import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { catalog, useCourseContent } from "./content";
import {
  RARE_PET,
  accessoryById,
  completedStageCount,
  isAccessoryUnlocked,
  legendaryUnlocked,
  spinGroupTargets,
  stageClaimCheck,
} from "./pets";
import {
  createSpinId,
  nextUncollectedSticker,
  ticketsForCompletion,
  type SpinHistoryEntry,
  type SpinPrize,
  type SpinTier,
} from "./spin";
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
  /** Thú đồng hành: thú thế giới / Rồng Huyền Thoại / pet hiếm Phượng Hoàng Cầu Vồng. */
  activeCompanion: "world" | "legendary" | "phuong-hoang";
  /* ----- Vòng quay may mắn + Kho báu — mọi field có mặc định an toàn
     và migrate điền mặc định khi dữ liệu cũ thiếu. Người dùng chốt
     09/11: "xu" chính là SAO — vòng quay cộng thẳng vào field `stars`
     ở trên, không còn ví xu riêng (field `coins` cũ đã gỡ, migrate
     làm sạch khóa thừa trong dữ liệu đã lưu). ----- */
  /** Vé quay đang có theo tầng (xong bài thường/perfect/chặng mà có). */
  spinTickets: Record<SpinTier, number>;
  /** Lịch sử quay, mới nhất trước; quà thật mang realStatus chờ trao/đã trao. */
  spinHistory: SpinHistoryEntry[];
  /** Tồn kho còn lại theo prizeId trên máy này (ghi đè cấu hình khi có). */
  spinStock: Record<string, number>;
  /** Sticker đã sưu tập trong Kho báu (id trong SPIN_STICKERS). */
  stickers: string[];
  /** Phụ kiện mở VĨNH VIỄN nhờ vòng quay, theo từng khóa. */
  spinUnlockedAccessories: Record<string, string[]>;
  /** Pet hiếm đang sở hữu (vd "phuong-hoang" — xem RARE_PET trong pets.ts). */
  rarePets: string[];
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
  /** Chọn thú đồng hành: "legendary" cần Rồng đã mở; "phuong-hoang" cần đã trúng Phượng Hoàng Cầu Vồng. */
  setActiveCompanion: (mode: "world" | "legendary" | "phuong-hoang") => void;
  /**
   * Áp dụng kết quả MỘT lượt quay đã chọn sẵn: trừ 1 vé của tầng, áp
   * quà ngay (XP/sao/thức ăn/phụ kiện/sticker/pet hiếm) hoặc — quà thật
   * — trừ tồn kho và ghi lịch sử ở trạng thái "Chờ trao". Trả về id
   * bản ghi lịch sử vừa tạo; hết vé thì trả null và không đổi gì.
   */
  applySpinWin: (tier: SpinTier, prize: SpinPrize) => string | null;
  /** Phụ huynh xác nhận ĐÃ TRAO một quà thật (đặt givenAt như rewards). */
  markSpinPrizeGiven: (historyId: string) => void;
  /** Admin chỉnh tồn kho còn lại của một phần quà trên máy này. */
  setSpinStockRemaining: (prizeId: string, remaining: number) => void;
  /** Thay toàn bộ lịch sử quay (đồng bộ Supabase dùng sau khi merge). */
  replaceSpinHistory: (history: SpinHistoryEntry[]) => void;
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
      spinTickets: { easy: 0, medium: 0, hard: 0 },
      spinHistory: [],
      spinStock: {},
      stickers: [],
      spinUnlockedAccessories: {},
      rarePets: [],
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
          /* VÉ VÒNG QUAY: chỉ cấp khi bé hoàn thành MỚI một bài thật
             (học lại bài cũ / bài ôn "mistakes"-"srs" không sinh vé —
             tránh cày vé): bài thường → vé Dễ, bài hoàn hảo → vé
             Trung bình; nếu chính bài này làm một CHẶNG thành hoàn
             thành (so số chặng xong trước/sau bằng cùng hàm đếm của hệ
             thú cưng/adventure) → thêm 1 vé Khó. XP 15/+5 giữ nguyên. */
          const spinTickets = (() => {
            const current = state.spinTickets ?? { easy: 0, medium: 0, hard: 0 };
            if (lessonId === "mistakes" || lessonId === "srs") return current;
            const prevCompleted =
              (state.courses ?? {})[state.activeCourseId]?.completedLessons ?? {};
            if (prevCompleted[lessonId]) return current;
            const allLessons = useCourseContent(state.activeCourseId).allLessons;
            const nextCompleted: Record<string, true> = {
              ...prevCompleted,
              [lessonId]: true,
            };
            const stageJustCompleted =
              completedStageCount(allLessons, nextCompleted) >
              completedStageCount(allLessons, prevCompleted);
            const next = { ...current };
            for (const tier of ticketsForCompletion({ perfect, stageJustCompleted })) {
              next[tier] = (next[tier] ?? 0) + 1;
            }
            return next;
          })();
          return {
            streak,
            lastActiveDay: today,
            activeDays,
            petGrowth,
            stars,
            spinTickets,
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
          // Phụ kiện trúng ở VÒNG QUAY đã mở VĨNH VIỄN — mặc/bỏ mặc
          // được ngay, không cần qua mốc chặng (nhánh riêng để giữ
          // nguyên luật mở theo chặng ở dưới).
          if (
            (state.spinUnlockedAccessories?.[courseId] ?? []).includes(accessoryId)
          ) {
            const equippedSpin = state.equippedAccessories?.[courseId] ?? [];
            const nextSpin = equippedSpin.includes(accessoryId)
              ? equippedSpin.filter((id) => id !== accessoryId)
              : [...equippedSpin, accessoryId];
            return {
              equippedAccessories: {
                ...(state.equippedAccessories ?? {}),
                [courseId]: nextSpin,
              },
            };
          }
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
          // Phượng Hoàng Cầu Vồng chỉ đồng hành khi bé đã TRÚNG ở vòng quay.
          if (mode === "phuong-hoang") {
            if (!(state.rarePets ?? []).includes(RARE_PET.id)) return state;
          }
          if (mode === "legendary") {
            const totals = Object.fromEntries(
              catalog.courses.map((c) => [c.id, c.lessonCount])
            );
            if (!legendaryUnlocked(state.courses ?? {}, totals)) return state;
          }
          return { activeCompanion: mode };
        }),

      /* -------------------- Vòng quay + Kho báu -------------------- */

      applySpinWin: (tier, prize) => {
        if (!prize) return null;
        const ticketsNow = get().spinTickets ?? { easy: 0, medium: 0, hard: 0 };
        if ((ticketsNow[tier] ?? 0) <= 0) return null;
        const entryId = createSpinId("spin");
        const now = Date.now();
        let applied = false;
        set((state) => {
          const tickets = state.spinTickets ?? { easy: 0, medium: 0, hard: 0 };
          if ((tickets[tier] ?? 0) <= 0) return state;
          applied = true;
          const patch: Partial<ProgressState> = {
            spinTickets: { ...tickets, [tier]: (tickets[tier] ?? 0) - 1 },
          };
          if (prize.kind === "xp" && prize.amount > 0) {
            // Ghi sổ XP đúng như addBonusXp: XP khóa đang học + XP
            // hôm nay + lịch sử ngày (tách biến để tránh vòng lặp import
            // hành vi — cùng helper bumpDailyXp/pruneDays của store).
            const today = dayString(new Date());
            const daily = bumpDailyXp(state, prize.amount);
            const days = state.activeDays ?? {};
            const prevDay = days[today] ?? { xp: 0, lessons: 0, perfect: 0 };
            patch.dailyXp = daily.dailyXp;
            patch.dailyXpDay = daily.dailyXpDay;
            patch.activeDays = pruneDays({
              ...days,
              [today]: { ...prevDay, xp: prevDay.xp + prize.amount },
            });
            Object.assign(
              patch,
              updateCourse(state, state.activeCourseId, (c) => ({
                ...c,
                xp: c.xp + prize.amount,
              }))
            );
          } else if (prize.kind === "stars") {
            // "Xu" của vòng quay chính là SAO — cộng vào ví sao sẵn có.
            patch.stars = (state.stars ?? 0) + prize.amount;
          } else if (prize.kind === "food") {
            patch.petFood = (state.petFood ?? 0) + prize.amount;
          } else if (prize.kind === "accessory" && prize.accessoryGroup) {
            // Mở VĨNH VIỄN món của nhóm này cho CẢ BA thú.
            const unlocked = { ...(state.spinUnlockedAccessories ?? {}) };
            for (const target of spinGroupTargets(prize.accessoryGroup)) {
              const list = unlocked[target.courseId] ?? [];
              if (!list.includes(target.accessoryId)) {
                unlocked[target.courseId] = [...list, target.accessoryId];
              }
            }
            patch.spinUnlockedAccessories = unlocked;
          } else if (prize.kind === "sticker") {
            const owned = state.stickers ?? [];
            const stickerId =
              prize.stickerId ?? nextUncollectedSticker(owned);
            if (stickerId && !owned.includes(stickerId)) {
              patch.stickers = [...owned, stickerId];
            } else {
              // Đã có sticker đó / sưu tập đủ bộ → đổi 10 sao, không mất quà.
              patch.stars = (state.stars ?? 0) + 10;
            }
          } else if (prize.kind === "rare-pet") {
            const owned = state.rarePets ?? [];
            if (!owned.includes(RARE_PET.id)) {
              patch.rarePets = [...owned, RARE_PET.id];
            } else {
              // Trùng pet hiếm → đổi 25 sao, không mất quà.
              patch.stars = (state.stars ?? 0) + 25;
            }
          } else if (prize.kind === "real") {
            // Trừ tồn kho NGAY khi trúng; quà vào Kho báu chờ trao.
            const current = (state.spinStock ?? {})[prize.id] ?? prize.stock;
            if (current !== null && current !== undefined) {
              patch.spinStock = {
                ...(state.spinStock ?? {}),
                [prize.id]: Math.max(0, current - 1),
              };
            }
          }
          const entry: SpinHistoryEntry = {
            id: entryId,
            ownerId: null,
            at: now,
            tier,
            prizeId: prize.id,
            prizeName: prize.name,
            prizeEmoji: prize.emoji,
            kind: prize.kind,
            amount: prize.amount,
            cash: prize.kind === "real" && prize.cash,
            imageUrl: prize.imageUrl ?? null,
            realStatus: prize.kind === "real" ? "pending" : null,
            givenAt: null,
            updatedAt: now,
          };
          patch.spinHistory = [entry, ...(state.spinHistory ?? [])].slice(0, 300);
          return patch;
        });
        return applied ? entryId : null;
      },

      markSpinPrizeGiven: (historyId) =>
        set((state) => ({
          spinHistory: (state.spinHistory ?? []).map((entry) =>
            entry.id === historyId &&
            entry.kind === "real" &&
            entry.realStatus !== "given"
              ? {
                  ...entry,
                  realStatus: "given" as const,
                  givenAt: Date.now(),
                  updatedAt: Date.now(),
                }
              : entry
          ),
        })),

      setSpinStockRemaining: (prizeId, remaining) =>
        set((state) => ({
          spinStock: {
            ...(state.spinStock ?? {}),
            [prizeId]: Math.max(0, Math.floor(remaining)),
          },
        })),

      replaceSpinHistory: (history) =>
        set({ spinHistory: (history ?? []).slice(0, 300) }),

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
        // Đợt chỉnh vòng quay (người dùng chốt 09/11): ví xu riêng đã
        // bỏ ("xu" = sao) — làm sạch khóa `coins` khỏi dữ liệu đã lưu;
        // khóa pet hiếm cũ "ky-lan" được đổi sang "phuong-hoang" ở các
        // field bên dưới (activeCompanion / rarePets / lịch sử quay).
        const { coins: _legacyCoins, ...old } = persisted as Record<
          string,
          unknown
        >;
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
            activeCompanion: (old.activeCompanion === "ky-lan" ||
            old.activeCompanion === "phuong-hoang"
              ? "phuong-hoang"
              : (old.activeCompanion as "world" | "legendary") ??
                "world") as "world" | "legendary" | "phuong-hoang",
            spinTickets: (old.spinTickets as Record<SpinTier, number>) ?? {
              easy: 0,
              medium: 0,
              hard: 0,
            },
            spinHistory: (
              (old.spinHistory as SpinHistoryEntry[]) ?? []
            ).map((entry) =>
              entry && (entry.kind as string) === "coins"
                ? { ...entry, kind: "stars" as const }
                : entry
            ),
            spinStock: (old.spinStock as Record<string, number>) ?? {},
            stickers: (old.stickers as string[]) ?? [],
            spinUnlockedAccessories:
              (old.spinUnlockedAccessories as Record<string, string[]>) ?? {},
            rarePets: ((old.rarepets as string[]) ?? []).map((id) =>
              id === "ky-lan" ? "phuong-hoang" : id
            ),
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
          spinTickets: { easy: 0, medium: 0, hard: 0 },
          spinHistory: [],
          spinStock: {},
          stickers: [],
          spinUnlockedAccessories: {},
          rarePets: [],
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
