import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  createRewardId,
  type FamilyReward,
  type GlobalReward,
} from "./rewards";
import { DEFAULT_GLOBAL_REWARDS } from "./rewards-defaults";

export interface GlobalConfigCache {
  rewards: GlobalReward[];
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
  markCelebrated: (target: string, allCourseIds?: string[]) => void;
};

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set) => ({
      familyRewards: [],
      globalConfigCache: null,
      adminDraft: null,
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
