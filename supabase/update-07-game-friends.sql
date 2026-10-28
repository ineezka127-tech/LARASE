-- 업데이트 7: 모험 지도에서 친구들 위치 보기
-- 업데이트 6 다음에 SQL Editor에서 한 번 실행하세요.

-- 다른 학생들의 이름·아바타·현재 위치만 돌려줘요 (체력·아이템 같은 건 안 보여요)
create or replace function public.game_others() returns table (
  user_id uuid, display_name text, avatar_cfg jsonb, level int, world int, tile int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_cfg, p.level, coalesce(g.world, 1), coalesce(g.tile, 0)
    from profiles p
    left join game_state g on g.user_id = p.id
   where p.role = 'student' and p.id <> auth.uid() and auth.uid() is not null
   order by p.login_id
$$;
revoke execute on function public.game_others() from public, anon;
grant execute on function public.game_others() to authenticated;
