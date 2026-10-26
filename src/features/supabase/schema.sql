-- =====================================================================
-- Piglingo Kids — Bước 2: schema Supabase (Postgres)
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- File này chạy lại được nhiều lần (idempotent ở mức thực dụng: dùng
-- "if not exists" / "create or replace" / drop policy trước khi tạo lại).
-- =====================================================================

-- ---------- Bảng profiles: một dòng cho mỗi tài khoản phụ huynh ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Bảng user_progress: tiến độ học của bé theo tài khoản ----------
-- payload giữ toàn bộ ProgressSnapshot dạng JSONB (xem src/features/parents/types.ts),
-- các cột rời phục vụ truy vấn/thống kê nhanh.
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  streak_days integer not null default 0,
  lessons_completed integer not null default 0,
  srs_due_count integer not null default 0,
  per_language jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Tự cập nhật updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_progress_set_updated_at on public.user_progress;
create trigger user_progress_set_updated_at
  before update on public.user_progress
  for each row execute function public.set_updated_at();

-- ---------- Tự tạo profile khi có tài khoản mới ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security: mỗi phụ huynh chỉ thấy dữ liệu của mình ----------
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_progress_delete_own" on public.user_progress;
create policy "user_progress_delete_own" on public.user_progress
  for delete using (auth.uid() = user_id);
