import { isSupabaseEnabled, supabase } from "@/features/supabase/client";
import {
  mergeFamilyRewards,
  sanitizeFamilyReward,
  type FamilyReward,
} from "./rewards";
import { useRewardsStore } from "./rewardsStore";

/**
 * Đồng bộ family_rewards theo đúng tinh thần offline-first của app:
 * local trong rewardsStore luôn là nguồn dùng được ngay; Supabase chỉ là
 * lớp chia sẻ theo tài khoản khi phụ huynh đã đăng nhập.
 *
 * Quyền riêng tư thật nằm ở RLS owner-only của bảng family_rewards.
 * Client còn tự lọc: chỉ đồng bộ bản ghi ownerId = null (sẽ nhận chủ khi
 * đăng nhập) hoặc ownerId đúng bằng user hiện tại. Bản ghi local gắn với
 * tài khoản khác trên cùng thiết bị không bị đẩy nhầm sang tài khoản mới.
 */

interface FamilyRewardRow {
  id: string;
  owner_id: string;
  payload: unknown;
  created_at?: string;
  updated_at?: string;
}

function relevantRewards(rewards: FamilyReward[], userId: string): FamilyReward[] {
  return rewards.filter((reward) => reward.ownerId == null || reward.ownerId === userId);
}

function withOwner(reward: FamilyReward, userId: string): FamilyReward {
  return { ...reward, ownerId: userId };
}

export async function pullFamilyRewards(userId: string): Promise<FamilyReward[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data, error } = await supabase
    .from("family_rewards")
    .select("id, owner_id, payload, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Không tải được phần thưởng gia đình: ${error.message}`);
  }
  const rewards: FamilyReward[] = [];
  for (const row of (data ?? []) as FamilyRewardRow[]) {
    const reward = sanitizeFamilyReward(row.payload);
    if (reward) {
      // owner_id ở cột rời là nguồn RLS đáng tin cậy hơn payload.
      rewards.push({ ...reward, id: row.id, ownerId: row.owner_id });
    }
  }
  return rewards;
}

export async function pushFamilyRewards(
  userId: string,
  rewards: FamilyReward[],
): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;
  const owned = relevantRewards(rewards, userId).map((reward) => withOwner(reward, userId));
  if (owned.length === 0) return;

  const rows = owned.map((reward) => ({
    id: reward.id,
    owner_id: userId,
    payload: reward,
    // Cột server phục vụ sắp xếp/RLS; quyết định merge vẫn dùng payload.updatedAt
    // vì trigger server tự thay updated_at ở mỗi lần update.
    created_at: new Date(reward.createdAt).toISOString(),
    updated_at: new Date(reward.updatedAt).toISOString(),
  }));

  const { error } = await supabase
    .from("family_rewards")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`Không đẩy được phần thưởng gia đình: ${error.message}`);
  }
}

/**
 * Một vòng đồng bộ đầy đủ: kéo server → merge theo id/updatedAt/deletedAt
 * → ghi lại store → đẩy danh sách đã hợp nhất lên server.
 */
export async function syncFamilyRewards(userId: string): Promise<FamilyReward[]> {
  if (!isSupabaseEnabled || !supabase) {
    return useRewardsStore.getState().familyRewards;
  }

  const local = useRewardsStore.getState().familyRewards;
  const otherOwnerRewards = local.filter(
    (reward) => reward.ownerId != null && reward.ownerId !== userId,
  );
  const localRelevant = relevantRewards(local, userId).map((reward) =>
    withOwner(reward, userId),
  );
  const remote = await pullFamilyRewards(userId);
  const mergedRelevant = mergeFamilyRewards(localRelevant, remote);
  const mergedAll = mergeFamilyRewards(otherOwnerRewards, mergedRelevant);

  useRewardsStore.getState().replaceFamilyRewards(mergedAll);
  await pushFamilyRewards(userId, mergedRelevant);
  return mergedAll;
}
