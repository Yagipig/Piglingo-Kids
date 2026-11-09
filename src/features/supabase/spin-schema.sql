-- Piglingo Kids: đồng bộ LỊCH SỬ VÒNG QUAY MAY MẮN giữa các máy.
--
-- Chạy file này trong Supabase SQL Editor của project piglingo-kids
-- (cùng chỗ đã chạy rewards-schema.sql). File chạy lại (re-run) an
-- toàn: mọi câu lệnh đều idempotent.
--
-- ⚠️ CHƯA chạy file này thì sao? Vòng quay, Kho báu và Admin vòng quay
-- vẫn dùng ĐẦY ĐỦ trên một máy (lịch sử lưu local trong store của
-- máy bé). File này CHỈ cần khi muốn lịch sử quay + trạng thái "đã
-- trao" đồng bộ theo tài khoản sang máy khác.
--
-- Nội dung:
-- 1) app_config (key spin_config): cấu hình vòng quay do Admin công
--    bố — tạo lại theo đúng rewards-schema.sql nếu bảng chưa có.
-- 2) spin_history: một dòng cho mỗi lượt quay của tài khoản gia đình;
--    toàn bộ chi tiết lượt quay nằm trong payload JSONB để app tự
--    hợp nhất (merge) theo id/updatedAt như family_rewards.
-- 3) RLS: spin_history chỉ chủ tài khoản (owner) đọc/ghi được dòng
--    của mình; app_config đọc công khai, ghi chỉ email admin.

-- 0) Trigger helper dùng chung (đã có nếu từng chạy schema nào khác).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Cấu hình dùng chung (app_config) — giống hệt rewards-schema.sql.
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config readable by everyone" on public.app_config;
create policy "app_config readable by everyone"
  on public.app_config
  for select
  using (true);

drop policy if exists "app_config writable by admin" on public.app_config;
create policy "app_config writable by admin"
  on public.app_config
  for all
  using (
    coalesce(auth.jwt() ->> 'email', '') = 'tuyenjp23@gmail.com'
  )
  with check (
    coalesce(auth.jwt() ->> 'email', '') = 'tuyenjp23@gmail.com'
  );

drop trigger if exists app_config_set_updated_at on public.app_config;
create trigger app_config_set_updated_at
  before update on public.app_config
  for each row
  execute function public.set_updated_at();

-- 2) Lịch sử quay theo tài khoản.
create table if not exists public.spin_history (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spin_history_owner_idx
  on public.spin_history (owner_id, updated_at desc);

alter table public.spin_history enable row level security;

drop policy if exists "spin_history owner can read" on public.spin_history;
create policy "spin_history owner can read"
  on public.spin_history
  for select
  using (auth.uid() = owner_id);

drop policy if exists "spin_history owner can insert" on public.spin_history;
create policy "spin_history owner can insert"
  on public.spin_history
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "spin_history owner can update" on public.spin_history;
create policy "spin_history owner can update"
  on public.spin_history
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "spin_history owner can delete" on public.spin_history;
create policy "spin_history owner can delete"
  on public.spin_history
  for delete
  using (auth.uid() = owner_id);

drop trigger if exists spin_history_set_updated_at on public.spin_history;
create trigger spin_history_set_updated_at
  before update on public.spin_history
  for each row
  execute function public.set_updated_at();

-- Kiểm tra nhanh sau khi chạy:
-- select key from public.app_config where key = 'spin_config';
-- select count(*) from public.spin_history;
