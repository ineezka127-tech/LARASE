-- 업데이트 7: 모험 지도에서 친구들 위치 보기 + 테스트 계정 표시
-- 업데이트 6 다음에 SQL Editor에서 한 번 실행하세요. (여러 번 실행해도 괜찮아요)

-- 🧪 테스트 계정 표시: 선생님 현황·반 통계·친구 목록에서 빠져요
alter table public.profiles add column if not exists is_test boolean not null default false;
update public.profiles set is_test = true where lower(login_id) = 'test01';

-- 학생이 스스로 테스트 표시를 바꾸지 못하게
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' and not public.is_teacher() then
    new.login_id := old.login_id;
    new.role := old.role;
    new.grade := old.grade;
    new.xp := old.xp;
    new.level := old.level;
    new.stat_points := old.stat_points;
    new.skill_points := old.skill_points;
    new.streak := old.streak;
    new.last_active := old.last_active;
    new.coins := old.coins;
    new.avatar_cfg := old.avatar_cfg;
    new.stats := old.stats;
    new.is_test := old.is_test;
  end if;
  return new;
end $$;

-- 다른 학생들의 이름·아바타·현재 위치만 돌려줘요 (체력·아이템 같은 건 안 보여요)
create or replace function public.game_others() returns table (
  user_id uuid, display_name text, avatar_cfg jsonb, level int, world int, tile int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_cfg, p.level, coalesce(g.world, 1), coalesce(g.tile, 0)
    from profiles p
    left join game_state g on g.user_id = p.id
   where p.role = 'student' and not p.is_test and p.id <> auth.uid() and auth.uid() is not null
   order by p.login_id
$$;
revoke execute on function public.game_others() from public, anon;
grant execute on function public.game_others() to authenticated;
