-- =====================================================================
-- Piglingo Kids — Hệ thống phần thưởng: app_config + family_rewards
-- Chạy trong Supabase Dashboard → SQL Editor của project piglingo-kids.
-- File này idempotent: chạy lại nhiều lần vẫn an toàn.
-- KHÔNG thay thế hay sửa schema.sql cũ (profiles + user_progress).
-- =====================================================================

-- Hàm updated_at (đã có từ schema.sql cũ; khai báo lại để file độc lập).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- (1) app_config: cấu hình toàn app do Admin quản lý ----------
-- Khóa dùng cho phần thưởng chung:
--   key = 'global_rewards'
--   value = { "version": 1, "rewards": [ GlobalReward, ... ] }
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_config_set_updated_at on public.app_config;
create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

alter table public.app_config enable row level security;

-- ĐỌC CÔNG KHAI: anon và authenticated đều đọc được phần thưởng chung.
drop policy if exists "app_config_select_public" on public.app_config;
create policy "app_config_select_public" on public.app_config
  for select
  to anon, authenticated
  using (true);

-- GHI CHỈ ADMIN: email trong JWT phải khớp tài khoản admin của app.
-- Email này phải khớp ADMIN_EMAILS trong src/lib/unlock.ts.
drop policy if exists "app_config_insert_admin" on public.app_config;
create policy "app_config_insert_admin" on public.app_config
  for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'tuyenjp23@gmail.com');

drop policy if exists "app_config_update_admin" on public.app_config;
create policy "app_config_update_admin" on public.app_config
  for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'tuyenjp23@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'tuyenjp23@gmail.com');

drop policy if exists "app_config_delete_admin" on public.app_config;
create policy "app_config_delete_admin" on public.app_config
  for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'tuyenjp23@gmail.com');

-- ---------- (2) family_rewards: phần thưởng riêng của từng gia đình ----------
-- payload giữ toàn bộ FamilyReward dạng JSONB. Các cột rời phục vụ khóa
-- chính, RLS owner-only, sắp xếp và upsert chống trùng theo id.
create table if not exists public.family_rewards (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists family_rewards_owner_idx
  on public.family_rewards (owner_id, updated_at desc);

drop trigger if exists family_rewards_set_updated_at on public.family_rewards;
create trigger family_rewards_set_updated_at
  before update on public.family_rewards
  for each row execute function public.set_updated_at();

alter table public.family_rewards enable row level security;

-- OWNER-ONLY tuyệt đối cho cả 4 thao tác. Không có ngoại lệ cho admin:
-- admin không đọc được phần thưởng riêng của các gia đình qua API của app.
drop policy if exists "family_rewards_select_own" on public.family_rewards;
create policy "family_rewards_select_own" on public.family_rewards
  for select
  using (auth.uid() = owner_id);

drop policy if exists "family_rewards_insert_own" on public.family_rewards;
create policy "family_rewards_insert_own" on public.family_rewards
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "family_rewards_update_own" on public.family_rewards;
create policy "family_rewards_update_own" on public.family_rewards
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "family_rewards_delete_own" on public.family_rewards;
create policy "family_rewards_delete_own" on public.family_rewards
  for delete
  using (auth.uid() = owner_id);
