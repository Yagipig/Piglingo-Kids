import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  createRewardId,
  type FamilyReward,
  type GlobalReward,
} from "./rewards";
import { DEFAULT_GLOBAL_REWARDS } from "./rewards-defaults";
import { DEFAULT_SPIN_CONFIG, type SpinConfig } from "./spin";

export interface GlobalConfigCache {
  rewards: GlobalReward[];
  /** Thời điểm tải/công bố cấu hình này (epoch ms). */
  fetchedAt: number;
  source: "supabase" | "admin-local";
}

export interface SpinConfigCache {
  config: SpinConfig;
  /** Thời điểm tải/công bố cấu hình này (epoch ms). */
  fetchedAt: number;
  source: "supabase" | "admin-local";
}

export type NewFamilyReward = Omit<
  FamilyReward,
  "id" | "givenAt" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  givenAt?: number | null;
};

type RewardsState = {
  familyRewards: FamilyReward[];
  globalConfigCache: GlobalConfigCache | null;
  /** Nháp admin trên máy này; chưa phải cấu hình đã công bố toàn app. */
  adminDraft: GlobalReward[] | null;
  /** Cache cấu hình vòng quay may mắn (app_config key "spin_config"). */
  spinConfigCache: SpinConfigCache | null;
  /** Nháp admin vòng quay trên máy này; chưa công bố. */
  spinAdminDraft: SpinConfig | null;
  celebratedCourseIds: string[];
  celebratedAllCourses: boolean;

  addFamilyReward: (input: NewFamilyReward) => string;
  updateFamilyReward: (
    id: string,
    patch: Partial<Omit<FamilyReward, "id" | "createdAt">>,
  ) => void;
  deleteFamilyReward: (id: string) => void;
  replaceFamilyRewards: (rewards: FamilyReward[]) => void;
  setGivenAt: (id: string, givenAt: number | null) => void;
  setGlobalConfigCache: (
    rewards: GlobalReward[],
    source: GlobalConfigCache["source"],
    fetchedAt?: number,
  ) => void;
  setAdminDraft: (rewards: GlobalReward[] | null) => void;
  setSpinConfigCache: (
    config: SpinConfig,
    source: SpinConfigCache["source"],
    fetchedAt?: number,
  ) => void;
  setSpinAdminDraft: (config: SpinConfig | null) => void;
  markCelebrated: (target: string, allCourseIds?: string[]) => void;
};

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set) => ({
      familyRewards: [],
      globalConfigCache: null,
      adminDraft: null,
      spinConfigCache: null,
      spinAdminDraft: null,
      celebratedCourseIds: [],
      celebratedAllCourses: false,

      addFamilyReward: (input) => {
        const now = Date.now();
        const id = createRewardId("family");
        const reward: FamilyReward = {
          ...input,
          id,
          givenAt: input.givenAt ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        set((state) => ({ familyRewards: [...state.familyRewards, reward] }));
        return id;
      },

      updateFamilyReward: (id, patch) =>
        set((state) => ({
          familyRewards: state.familyRewards.map((reward) =>
            reward.id === id
              ? { ...reward, ...patch, id: reward.id, updatedAt: Date.now() }
              : reward,
          ),
        })),

      deleteFamilyReward: (id) =>
        set((state) => {
          const now = Date.now();
          return {
            familyRewards: state.familyRewards.map((reward) =>
              reward.id === id
                ? { ...reward, deletedAt: now, updatedAt: now }
                : reward,
            ),
          };
        }),

      replaceFamilyRewards: (rewards) => set({ familyRewards: rewards }),

      setGivenAt: (id, givenAt) =>
        set((state) => ({
          familyRewards: state.familyRewards.map((reward) =>
            reward.id === id
              ? { ...reward, givenAt, updatedAt: Date.now() }
              : reward,
          ),
        })),

      setGlobalConfigCache: (rewards, source, fetchedAt = Date.now()) =>
        set({
          globalConfigCache: {
            rewards,
            fetchedAt,
            source,
          },
        }),

      setAdminDraft: (rewards) => set({ adminDraft: rewards }),

      setSpinConfigCache: (config, source, fetchedAt = Date.now()) =>
        set({
          spinConfigCache: {
            config,
            fetchedAt,
            source,
          },
        }),

      setSpinAdminDraft: (config) => set({ spinAdminDraft: config }),

      markCelebrated: (target, allCourseIds = []) =>
        set((state) => {
          if (target === "all-courses") {
            return {
              celebratedAllCourses: true,
              celebratedCourseIds: Array.from(
                new Set([...state.celebratedCourseIds, ...allCourseIds]),
              ),
            };
          }
          return {
            celebratedCourseIds: state.celebratedCourseIds.includes(target)
              ? state.celebratedCourseIds
              : [...state.celebratedCourseIds, target],
          };
        }),
    }),
    {
      name: "piglingo-rewards-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        familyRewards: state.familyRewards,
        globalConfigCache: state.globalConfigCache,
        adminDraft: state.adminDraft,
        spinConfigCache: state.spinConfigCache,
        spinAdminDraft: state.spinAdminDraft,
        celebratedCourseIds: state.celebratedCourseIds,
        celebratedAllCourses: state.celebratedAllCourses,
      }),
    },
  ),
);

/** Danh sách thưởng chung đang hiệu lực ở phía client. */
export function effectiveGlobalRewards(state: {
  globalConfigCache: GlobalConfigCache | null;
}): GlobalReward[] {
  const rewards = state.globalConfigCache?.rewards ?? DEFAULT_GLOBAL_REWARDS;
  return [...rewards].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Cấu hình vòng quay đang hiệu lực ở phía client: cache đã tải/công bố,
 * chưa có thì dùng bộ mặc định trong spin.ts (app chạy đầy đủ offline).
 */
export function effectiveSpinConfig(state: {
  spinConfigCache: SpinConfigCache | null;
}): SpinConfig {
  return state.spinConfigCache?.config ?? DEFAULT_SPIN_CONFIG;
}
