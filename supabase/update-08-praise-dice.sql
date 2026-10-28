-- 업데이트 8: 칭찬하기로 🎲 주사위 티켓 주기
-- 업데이트 7 다음에 SQL Editor에서 한 번 실행하세요. (여러 번 실행해도 괜찮아요)

-- 경험치·코인·주사위 티켓을 한 번에 (코인은 − 로 돌려받기 가능, 주사위는 0~5)
create or replace function public.give_reward2(p_user uuid, p_xp int, p_coins int, p_dice int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := '{}';
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  if p_dice < 0 or p_dice > 5 then raise exception '주사위는 0 ~ 5개 사이로 주세요'; end if;
  if p_xp <> 0 or p_coins <> 0 then
    r := public.give_reward(p_user, p_xp, p_coins, p_reason);
  elsif not exists (select 1 from profiles where id = p_user and role = 'student') then
    raise exception '학생을 찾을 수 없어요';
  end if;
  if p_dice > 0 then
    perform public._game_row(p_user);
    update game_state set items = jsonb_set(items, '{dice}', to_jsonb(coalesce((items ->> 'dice')::int, 0) + p_dice))
     where user_id = p_user;
    insert into events (user_id, kind, ref, xp, coins) values (p_user, 'teacher_dice', left(coalesce(p_reason, ''), 60) || ' (🎲' || p_dice || ')', 0, 0);
  end if;
  return r || jsonb_build_object('dice', p_dice);
end $$;
revoke execute on function public.give_reward2(uuid, int, int, int, text) from public, anon;
grant execute on function public.give_reward2(uuid, int, int, int, text) to authenticated;
