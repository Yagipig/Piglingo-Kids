-- =====================================================================
-- Piglingo Kids — Bảng xếp hạng nhà thám hiểm (RPC ẩn danh)
-- Chạy trong Supabase Dashboard → SQL Editor của project piglingo-kids.
-- File này idempotent: chạy lại nhiều lần vẫn an toàn.
-- KHÔNG sửa schema.sql (profiles + user_progress) và KHÔNG sửa
-- rewards-schema.sql (app_config + family_rewards).
--
-- THIẾT KẾ BẢO MẬT — vì sao dùng RPC thay vì mở policy đọc bảng:
--   Bảng user_progress đang khóa RLS owner-only (mỗi tài khoản chỉ đọc
--   được dòng của chính mình) và PHẢI giữ nguyên như vậy. Nếu mở thêm
--   policy SELECT cho mọi tài khoản đã đăng nhập, bất kỳ ai đăng nhập
--   cũng đọc được payload JSONB (toàn bộ tiến độ chi tiết), per_language
--   và qua profiles là cả email của mọi gia đình khác — không chấp
--   nhận được với app cho trẻ em.
--   Thay vào đó, các hàm dưới đây chạy SECURITY DEFINER (quyền của
--   người sở hữu hàm) và chỉ trả về đúng 3 trường tối thiểu phục vụ
--   xếp hạng: hạng, bí danh ẩn danh, tổng XP. Không hàm nào trả về
--   user_id, email, display_name hay payload.
--
-- BÍ DANH ẨN DANH: suy ra thuần từ user_id bằng hàm băm ổn định —
-- cùng một tài khoản luôn nhận cùng một mã "Nhà thám hiểm #NNNNN"
-- (5 chữ số), nhưng không thể tra ngược ra tài khoản/email từ mã.
-- =====================================================================

-- ---------- Hàm phụ: bí danh ẩn danh ổn định theo tài khoản ----------
create or replace function public.leaderboard_anon_code(p_user_id uuid)
returns text
language sql
immutable
as $$
  select 'Nhà thám hiểm #'
    || (10000 + ((hashtext(p_user_id::text) & 2147483647) % 90000))::text;
$$;

-- ---------- (1) Bảng xếp hạng: top N theo tổng XP giảm dần ----------
create or replace function public.get_leaderboard(p_limit integer default 20)
returns table (rank integer, anon_code text, total_xp integer)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (order by up.total_xp desc, up.user_id)::integer as rank,
    public.leaderboard_anon_code(up.user_id) as anon_code,
    up.total_xp
  from public.user_progress as up
  order by up.total_xp desc, up.user_id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- ---------- (2) Hạng của chính tài khoản đang đăng nhập ----------
-- Trả 0 dòng khi chưa đăng nhập hoặc tài khoản chưa có tiến độ nào
-- trên server (chưa đồng bộ lần nào).
create or replace function public.get_my_rank()
returns table (rank integer, anon_code text, total_xp integer)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      up.user_id,
      up.total_xp,
      row_number() over (order by up.total_xp desc, up.user_id) as rn
    from public.user_progress as up
  )
  select
    ranked.rn::integer as rank,
    public.leaderboard_anon_code(ranked.user_id) as anon_code,
    ranked.total_xp
  from ranked
  where ranked.user_id = auth.uid();
$$;

-- ---------- Quyền gọi hàm: CHỈ tài khoản đã đăng nhập ----------
-- Mặc định Postgres cấp EXECUTE cho PUBLIC khi tạo hàm; thu hồi hết
-- rồi chỉ cấp lại cho role authenticated. Role anon KHÔNG gọi được,
-- nên người chưa đăng nhập không xem được bảng xếp hạng.
revoke all on function public.leaderboard_anon_code(uuid) from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_my_rank() from public;

grant execute on function public.leaderboard_anon_code(uuid) to authenticated;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.get_my_rank() to authenticated;
