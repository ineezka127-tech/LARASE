-- =====================================================================
--  업데이트 6: 📉 반복 복습 보상 줄이기 · ⛰️ 레벨 고개 · 🎁 선생님 칭찬(경험치+코인)
--             · 💇 유료 머리 모양/색/눈 · 🎲 보드게임(모험 지도)
--  SQL Editor → New query → 전체 붙여넣기 → Run (RLS를 물어보면 "Run and enable RLS")
--  ※ 업데이트 2~5를 먼저 실행해 주세요. 여러 번 실행해도 안전해요.
-- =====================================================================

-- ---------- ⛰️ 레벨 곡선: 40 × L^1.4, 레벨 5·10·15…로 가는 길은 ×1.2 (js/lib/xp.js 와 같음) ----------
create or replace function public.xp_need(p_level int) returns int
language sql immutable as $$
  select (round(40 * power(p_level, 1.4) * (case when p_level % 5 = 4 then 1.2 else 1 end) / 5) * 5)::int
$$;

-- ---------- 📉 같은 수업 반복 보상: 1번째 100% → 50% → 30% → 20% → 이후 10%, 하루 최대 2번 ----------
create or replace function public._repeat_mult(p_user uuid, p_kind text, p_ref text) returns numeric
language sql stable security definer set search_path = public as $$
  select case
    when (select count(*) from events where user_id = p_user and kind = p_kind and ref = p_ref and xp > 0
            and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) >= 2 then 0
    else case (select count(*) from events where user_id = p_user and kind = p_kind and ref = p_ref and xp > 0)
      when 0 then 1.0 when 1 then 0.5 when 2 then 0.3 when 3 then 0.2 else 0.1 end
  end
$$;

create or replace function public._scaled(p_base int, p_mult numeric) returns int
language sql immutable as $$ select case when p_mult <= 0 then 0 else greatest(1, round(p_base * p_mult))::int end $$;

-- ---------- 경험치·코인 지급 (내부용) ----------
create or replace function public._grant_xp(p_user uuid, p_amount int, p_kind text, p_ref text, p_activity boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p profiles%rowtype;
  v_today date := public.kst_today();
  v_bonus int := 0;
  v_streak int;
  v_total int;
  v_level int;
  v_coins int;
  v_bonus_coins int := 0;
  v_level_coins int := 0;
  l int;
begin
  select * into p from profiles where id = p_user for update;
  if not found then raise exception 'profile not found'; end if;
  v_streak := p.streak;
  if p_activity and p.last_active is distinct from v_today then
    v_streak := case when p.last_active = v_today - 1 then p.streak + 1 else 1 end;
    v_bonus := 3 + least(v_streak, 5);
    v_bonus_coins := 3;
  end if;
  v_coins := case p_kind
    when 'view' then case when p_amount >= 4 then 1 else 0 end
    when 'correct' then 2
    when 'comeback' then 3
    when 'review' then 1
    when 'essay' then case when p_amount > 0 then 1 else 0 end
    when 'essay_graded' then case when p_amount >= 5 then 3 when p_amount > 0 then 1 else 0 end
    when 'quiz_done' then p_amount
    when 'set_done' then p_amount
    else 0 end;
  v_total := greatest(p_amount, 0) + v_bonus;
  v_level := greatest(p.level, public.level_for_xp(p.xp + v_total));
  -- 레벨업 코인: 레벨마다 20, 5·10·15… 레벨이면 50 더
  for l in (p.level + 1)..v_level loop
    v_level_coins := v_level_coins + 20 + case when l % 5 = 0 then 50 else 0 end;
  end loop;
  update profiles set
    xp = xp + v_total,
    level = v_level,
    stat_points = stat_points + (v_level - p.level),
    skill_points = skill_points + (v_level - p.level),
    coins = coins + v_coins + v_bonus_coins + v_level_coins,
    streak = v_streak,
    last_active = case when p_activity then v_today else last_active end
  where id = p_user;
  insert into events (user_id, kind, ref, xp, coins) values (p_user, p_kind, p_ref, greatest(p_amount, 0), v_coins);
  if v_bonus > 0 then
    insert into events (user_id, kind, ref, xp, coins) values (p_user, 'daily', v_streak::text, v_bonus, v_bonus_coins);
  end if;
  if v_level_coins > 0 then
    insert into events (user_id, kind, ref, xp, coins) values (p_user, 'levelup', v_level::text, 0, v_level_coins);
  end if;
  return jsonb_build_object(
    'xp', greatest(p_amount, 0), 'bonus', v_bonus, 'streak', v_streak,
    'total_xp', p.xp + v_total, 'level', v_level, 'old_level', p.level,
    'leveled_up', v_level > p.level, 'level_coins', v_level_coins,
    'coins', v_coins + v_bonus_coins + v_level_coins, 'coin_total', p.coins + v_coins + v_bonus_coins + v_level_coins
  );
end $$;
revoke execute on function public._grant_xp(uuid, int, text, text, boolean) from public, anon, authenticated;

-- 코인만 주기 (내부용)
create or replace function public._add_coins(p_user uuid, p_coins int, p_kind text, p_ref text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update profiles set coins = greatest(0, coins + p_coins) where id = p_user returning coins into v;
  if p_coins <> 0 then insert into events (user_id, kind, ref, xp, coins) values (p_user, p_kind, p_ref, 0, p_coins); end if;
  return v;
end $$;
revoke execute on function public._add_coins(uuid, int, text, text) from public, anon, authenticated;

-- 복습 자료 보기: 처음 +4, 반복할수록 줄어듦 (하루 2번까지)
create or replace function public.record_view(p_lesson uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_xp int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  -- 같은 날 다시 열어도 한 번만 (하루 2번 제한은 퀴즈 완주에 적용)
  if exists (select 1 from events where user_id = uid and kind = 'view' and ref = p_lesson::text
             and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) then
    return jsonb_build_object('xp', 0, 'already', true);
  end if;
  v_xp := public._scaled(4, public._repeat_mult(uid, 'view', p_lesson::text));
  return public._grant_xp(uid, v_xp, 'view', p_lesson::text, true);
end $$;

-- 🎲 오늘 퀴즈를 끝까지 풀면 주사위 +1 (하루 최대 +3)
create or replace function public._game_bonus_roll(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into game_state (user_id) values (p_user) on conflict (user_id) do nothing;
  update game_state set
    bonus_rolls = case when rolls_date is distinct from public.kst_today() then 1 else least(3, bonus_rolls + 1) end,
    rolls_used = case when rolls_date is distinct from public.kst_today() then 0 else rolls_used end,
    hp = case when rolls_date is distinct from public.kst_today() then null else hp end,
    rolls_date = public.kst_today()
  where user_id = p_user;
end $$;
revoke execute on function public._game_bonus_roll(uuid) from public, anon, authenticated;

-- 퀴즈 끝까지 풀기: 기본 +5 (만점 +10) × 반복 비율, 같은 수업은 하루 2번까지
create or replace function public.complete_quiz(p_lesson uuid, p_correct int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_perfect boolean := p_total >= 3 and p_correct >= p_total;
  v_mult numeric;
  v_xp int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  perform public._game_bonus_roll(uid);
  v_mult := public._repeat_mult(uid, 'quiz_done', p_lesson::text);
  v_xp := public._scaled(case when v_perfect then 10 else 5 end, v_mult);
  if v_xp = 0 then return jsonb_build_object('xp', 0, 'already', true, 'perfect', v_perfect, 'mult', 0, 'roll_bonus', true); end if;
  return public._grant_xp(uid, v_xp, 'quiz_done', p_lesson::text, true)
         || jsonb_build_object('perfect', v_perfect, 'mult', v_mult, 'roll_bonus', true);
end $$;

-- 묶음 퀴즈 끝까지 풀기: 같은 규칙
create or replace function public.complete_set(p_ref text, p_correct int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_ref text := left(coalesce(p_ref, ''), 80);
  v_perfect boolean := p_total >= 5 and p_correct >= p_total;
  v_mult numeric;
  v_xp int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  if p_total < 1 then return jsonb_build_object('xp', 0); end if;
  perform public._game_bonus_roll(uid);
  v_mult := public._repeat_mult(uid, 'set_done', v_ref);
  v_xp := public._scaled(case when v_perfect then 10 else 5 end, v_mult);
  if v_xp = 0 then return jsonb_build_object('xp', 0, 'already', true, 'perfect', v_perfect, 'mult', 0, 'roll_bonus', true); end if;
  return public._grant_xp(uid, v_xp, 'set_done', v_ref, true)
         || jsonb_build_object('perfect', v_perfect, 'mult', v_mult, 'roll_bonus', true);
end $$;

-- 문제 풀기 (게임 속 문제는 기록만 남기고 경험치는 몬스터 보상으로)
create or replace function public.submit_answer(p_question uuid, p_answer jsonb, p_correct boolean, p_mode text default 'quiz')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q questions%rowtype;
  v_correct boolean := p_correct;
  v_had_correct boolean;
  v_had_wrong boolean;
  v_today_cnt int;
  v_xp int;
  v_kind text;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into q from questions where id = p_question;
  if not found then raise exception 'question not found'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  if q.type = 'essay' then v_correct := null; end if;

  if p_mode = 'game' then
    insert into attempts (user_id, question_id, lesson_id, answer, is_correct, xp, mode)
    values (uid, p_question, q.lesson_id, p_answer, v_correct, 0, 'game');
    return jsonb_build_object('xp', 0, 'game', true);
  end if;

  select coalesce(bool_or(is_correct), false),
         coalesce(bool_or(not is_correct), false),
         count(*) filter (where (created_at at time zone 'Asia/Seoul')::date = public.kst_today())
    into v_had_correct, v_had_wrong, v_today_cnt
    from attempts where user_id = uid and question_id = p_question;

  if q.type = 'essay' then
    v_xp := case when v_today_cnt = 0 then 2 else 0 end; v_kind := 'essay';
  elsif v_correct then
    if not v_had_correct and v_had_wrong then v_xp := 4; v_kind := 'comeback';
    elsif not v_had_correct then v_xp := 5; v_kind := 'correct';
    elsif v_today_cnt = 0 then v_xp := 1; v_kind := 'review';
    else v_xp := 0; v_kind := 'repeat';
    end if;
  else
    v_xp := case when v_today_cnt = 0 then 1 else 0 end; v_kind := 'try';
  end if;

  insert into attempts (user_id, question_id, lesson_id, answer, is_correct, xp, mode)
  values (uid, p_question, q.lesson_id, p_answer, v_correct, v_xp, coalesce(p_mode, 'quiz'));

  return public._grant_xp(uid, v_xp, v_kind, p_question::text, true) || jsonb_build_object('kind', v_kind);
end $$;

-- ---------- 🎁 선생님 칭찬: 경험치 + 코인 ----------
create or replace function public.give_reward(p_user uuid, p_xp int, p_coins int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := '{}';
  v_coins int;
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  if not exists (select 1 from profiles where id = p_user and role = 'student') then raise exception '학생을 찾을 수 없어요'; end if;
  if p_xp < 0 or p_xp > 200 then raise exception '경험치는 0 ~ 200 사이로 주세요'; end if;
  if abs(p_coins) > 1000 then raise exception '코인은 -1000 ~ 1000 사이로 주세요'; end if;
  if p_xp > 0 then r := public._grant_xp(p_user, p_xp, 'teacher_praise', left(coalesce(p_reason, ''), 60), false); end if;
  v_coins := public._add_coins(p_user, p_coins, 'teacher_coins', left(coalesce(p_reason, ''), 60));
  return r || jsonb_build_object('xp', p_xp, 'coins_given', p_coins, 'coins', v_coins);
end $$;
grant execute on function public.give_reward(uuid, int, int, text) to authenticated;

-- ---------- 💇 아바타 저장: 유료 머리 모양·머리색·눈은 산 것만, 눈썹색·코색 추가 ----------
create or replace function public.save_avatar(p_cfg jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_level int;
  k text;
  v text;
  out_cfg jsonb := '{}';
begin
  if uid is null then raise exception 'not logged in'; end if;
  select level into v_level from profiles where id = uid;
  foreach k in array array['face', 'skin', 'eyes', 'brows', 'browColor', 'nose', 'noseColor', 'mouth', 'cheek', 'hair', 'hairColor'] loop
    v := p_cfg ->> k;
    if v is not null and char_length(v) <= 20 and v ~ '^[A-Za-z0-9_#]+$' then
      -- 상점에서 파는 모양(예: 유료 머리)이면 산 사람만
      if exists (select 1 from shop_items s where s.id = v and s.price > 0)
         and not exists (select 1 from inventory i where i.user_id = uid and i.item_id = v) then
        raise exception '가지고 있지 않은 아이템이에요: %', v;
      end if;
      out_cfg := out_cfg || jsonb_build_object(k, v);
    end if;
  end loop;
  foreach k in array array['top', 'bottom', 'shoes', 'hat', 'glasses', 'held', 'shield', 'armor', 'acc', 'bg', 'pet'] loop
    v := p_cfg ->> k;
    if v is null or v = '' then
      out_cfg := out_cfg || jsonb_build_object(k, null);
    elsif exists (select 1 from shop_items s where s.id = v and s.slot = k
                  and ((s.price = 0 and s.min_level <= v_level)
                       or exists (select 1 from inventory i where i.user_id = uid and i.item_id = v))) then
      out_cfg := out_cfg || jsonb_build_object(k, v);
    else
      raise exception '가지고 있지 않은 아이템이에요: %', v;
    end if;
  end loop;
  update profiles set avatar_cfg = out_cfg where id = uid;
  return out_cfg;
end $$;

-- =====================================================================
--  🎲 보드게임
-- =====================================================================
create table if not exists public.game_state (
  user_id uuid primary key references public.profiles on delete cascade,
  world int not null default 1,
  tile int not null default 0,
  checkpoint int not null default 0,
  hp int,                                   -- null = 가득
  defeated int[] not null default '{}',     -- 이번 월드에서 쓰러뜨린 몬스터·연 상자
  items jsonb not null default '{"potion": 2}',
  stuck int not null default 0,             -- 무인도에 갇힌 차례 수
  rolls_date date,
  rolls_used int not null default 0,
  bonus_rolls int not null default 0,
  deaths int not null default 0,
  best_world int not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.game_state enable row level security;
drop policy if exists "game read" on public.game_state;
create policy "game read" on public.game_state for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

-- 내 행운 (기본 1 + 투자 + 장비)
create or replace function public._player_luck(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select 1 + coalesce((p.stats ->> 'luck')::int, 0)
         + coalesce((select sum(s.luck) from shop_items s
                     where s.id in (select value from jsonb_each_text(coalesce(p.avatar_cfg, '{}')))), 0)::int
  from profiles p where p.id = p_user
$$;

create or replace function public._game_row(p_user uuid) returns game_state
language plpgsql security definer set search_path = public as $$
declare g game_state;
begin
  insert into game_state (user_id) values (p_user) on conflict (user_id) do nothing;
  update game_state set rolls_date = public.kst_today(), rolls_used = 0, bonus_rolls = 0, hp = null, stuck = 0
   where user_id = p_user and rolls_date is distinct from public.kst_today();
  select * into g from game_state where user_id = p_user;
  return g;
end $$;
revoke execute on function public._game_row(uuid) from public, anon, authenticated;

create or replace function public._game_json(g game_state) returns jsonb
language sql stable as $$
  select to_jsonb(g) || jsonb_build_object('rolls_left', greatest(0, 5 + g.bonus_rolls - g.rolls_used))
$$;

-- 게임 상태 (날이 바뀌면 주사위·체력 다시 채움)
create or replace function public.game_get() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not logged in'; end if;
  return public._game_json(public._game_row(uid)) || jsonb_build_object('luck', public._player_luck(uid));
end $$;

-- 주사위 굴리기 (1개 또는 2개). 행운이 높으면 낮게 나온 주사위를 한 번 더 굴려 높은 쪽을 가짐
create or replace function public.game_roll(p_count int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g game_state;
  v_luck int;
  d int[] := '{}';
  x int;
  lucky boolean := false;
  i int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_count not in (1, 2) then raise exception 'bad dice'; end if;
  g := public._game_row(uid);
  if 5 + g.bonus_rolls - g.rolls_used <= 0 then raise exception '오늘 주사위를 다 썼어요. 복습 퀴즈를 끝까지 풀면 주사위를 더 받을 수 있어요!'; end if;
  v_luck := public._player_luck(uid);
  for i in 1..p_count loop d := d || (1 + floor(random() * 6))::int; end loop;
  if random() < least(0.15, v_luck * 0.01) then
    x := (1 + floor(random() * 6))::int;
    if p_count = 1 and x > d[1] then d[1] := x; lucky := true; end if;
    if p_count = 2 then
      if d[1] <= d[2] and x > d[1] then d[1] := x; lucky := true;
      elsif d[2] < d[1] and x > d[2] then d[2] := x; lucky := true; end if;
    end if;
  end if;
  update game_state set rolls_used = rolls_used + 1, updated_at = now() where user_id = uid returning * into g;
  return jsonb_build_object('dice', to_jsonb(d), 'lucky', lucky, 'rolls_left', greatest(0, 5 + g.bonus_rolls - g.rolls_used));
end $$;

-- 위치·체력 저장
create or replace function public.game_save(p_tile int, p_hp int, p_checkpoint int, p_stuck int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g game_state;
begin
  if uid is null then raise exception 'not logged in'; end if;
  perform public._game_row(uid);
  update game_state set tile = greatest(0, least(99, p_tile)), hp = case when p_hp is null then null else greatest(0, least(999, p_hp)) end,
         checkpoint = greatest(0, least(99, p_checkpoint)), stuck = greatest(0, least(3, p_stuck)), updated_at = now()
   where user_id = uid returning * into g;
  return public._game_json(g);
end $$;

-- 몬스터를 쓰러뜨리거나 상자를 열었을 때 보상 (서버에서 정함)
--   일반: 경험치 3+z, 코인 3+z / 엘리트: 8+2z, 10+2z + 물약·티켓 / 보스: 20+5z, 40+10z + 큰 물약 → 다음 월드
--   상자: 코인 5+2z 또는 물약 또는 주사위 티켓 / 행운: 보상 1.5배 확률
create or replace function public.game_reward(p_kind text, p_tile int, p_z int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g game_state;
  z int := greatest(1, least(30, p_z));
  v_luck int;
  v_lucky boolean;
  v_xp int := 0;
  v_coins int := 0;
  v_item text := null;
  r float := random();
  res jsonb := '{}';
  v_next boolean := false;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_kind not in ('mob', 'elite', 'boss', 'chest') then raise exception 'bad kind'; end if;
  g := public._game_row(uid);
  if p_tile = any (g.defeated) then return jsonb_build_object('already', true); end if;
  if (select count(*) from events where user_id = uid and kind like 'game_%' and kind <> 'game_death'
        and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) >= 40 then
    return jsonb_build_object('capped', true);
  end if;
  v_luck := public._player_luck(uid);
  v_lucky := random() < least(0.25, 0.05 + v_luck * 0.008);
  if p_kind = 'mob' then v_xp := 3 + z; v_coins := 3 + z;
  elsif p_kind = 'elite' then v_xp := 8 + 2 * z; v_coins := 10 + 2 * z; v_item := case when r < 0.7 then 'potion' else 'dice' end;
  elsif p_kind = 'boss' then v_xp := 20 + 5 * z; v_coins := 40 + 10 * z; v_item := 'big_potion'; v_next := true;
  else
    if r < 0.6 then v_coins := 5 + 2 * z; elsif r < 0.85 then v_item := 'potion'; else v_item := 'dice'; end if;
  end if;
  if v_lucky then v_xp := round(v_xp * 1.5); v_coins := round(v_coins * 1.5); end if;
  if v_xp > 0 then res := public._grant_xp(uid, v_xp, 'game_' || p_kind, p_tile::text, true); end if;
  if v_coins > 0 then perform public._add_coins(uid, v_coins, 'game_' || p_kind || '_coins', p_tile::text); end if;
  if v_item is not null then
    update game_state set items = jsonb_set(items, array[v_item], to_jsonb(coalesce((items ->> v_item)::int, 0) + 1)) where user_id = uid;
  end if;
  if v_next then
    update game_state set world = world + 1, best_world = greatest(best_world, world + 1), tile = 0, checkpoint = 0, defeated = '{}', hp = null, stuck = 0
     where user_id = uid;
  else
    update game_state set defeated = array_append(defeated, p_tile) where user_id = uid;
  end if;
  select * into g from game_state where user_id = uid;
  return res || jsonb_build_object('xp', v_xp, 'coins', v_coins, 'item', v_item, 'lucky', v_lucky, 'next_world', v_next, 'state', public._game_json(g));
end $$;

-- 물약 쓰기·주사위 티켓 쓰기 (줄이기만 가능)
create or replace function public.game_use_item(p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g game_state;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_item not in ('potion', 'big_potion', 'dice') then raise exception 'bad item'; end if;
  g := public._game_row(uid);
  if coalesce((g.items ->> p_item)::int, 0) < 1 then raise exception '아이템이 없어요'; end if;
  update game_state set items = jsonb_set(items, array[p_item], to_jsonb((items ->> p_item)::int - 1)),
         bonus_rolls = bonus_rolls + case when p_item = 'dice' then 1 else 0 end
   where user_id = uid returning * into g;
  return public._game_json(g);
end $$;

-- 쓰러졌을 때: 코인 5%(최대 30)와 이번 레벨 안의 경험치 5%를 잃고 쉼터에서 다시 시작 (레벨은 안 내려감)
create or replace function public.game_death() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p profiles%rowtype;
  v_coin_loss int;
  v_xp_loss int;
  g game_state;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into p from profiles where id = uid for update;
  v_coin_loss := least(30, floor(p.coins * 0.05))::int;
  v_xp_loss := floor(greatest(0, p.xp - public.xp_floor(p.level)) * 0.05)::int;
  update profiles set coins = coins - v_coin_loss, xp = xp - v_xp_loss where id = uid;
  insert into events (user_id, kind, ref, xp, coins) values (uid, 'game_death', null, 0, -v_coin_loss);
  perform public._game_row(uid);
  update game_state set tile = checkpoint, hp = null, stuck = 0, deaths = deaths + 1 where user_id = uid returning * into g;
  return jsonb_build_object('coin_loss', v_coin_loss, 'xp_loss', v_xp_loss, 'state', public._game_json(g));
end $$;

grant execute on function public.game_get() to authenticated;
grant execute on function public.game_roll(int) to authenticated;
grant execute on function public.game_save(int, int, int, int) to authenticated;
grant execute on function public.game_reward(text, int, int) to authenticated;
grant execute on function public.game_use_item(text) to authenticated;
grant execute on function public.game_death() to authenticated;

-- 새 레벨 곡선에 맞게 경험치 막대 맞추기 (레벨은 그대로, 한 번만)
create table if not exists public.app_meta (key text primary key, done_at timestamptz not null default now());
alter table public.app_meta enable row level security;
do $$
begin
  if not exists (select 1 from public.app_meta where key = 'update06_xp') then
    update public.profiles set xp = greatest(xp, public.xp_floor(level)) where role = 'student';
    insert into public.app_meta (key) values ('update06_xp');
  end if;
end $$;

-- 상점 물건 목록 (자동 생성: tools/gen-shop-sql.mjs) — 직접 고치지 마세요
insert into public.shop_items (id, slot, name, price, min_level, rarity, atk, def, hp, luck) values
  ('t_blue', 'top', '파란 티셔츠', 0, 1, 'common', 0, 0, 0, 0),
  ('t_red', 'top', '빨간 티셔츠', 0, 1, 'common', 0, 0, 0, 0),
  ('t_yellow', 'top', '노란 티셔츠', 0, 1, 'common', 0, 0, 0, 0),
  ('t_green', 'top', '초록 티셔츠', 0, 1, 'common', 0, 0, 0, 0),
  ('t_stripe', 'top', '줄무늬 티셔츠', 40, 1, 'common', 0, 0, 0, 0),
  ('t_hoodie', 'top', '후드티', 80, 1, 'common', 0, 0, 0, 0),
  ('t_uniform', 'top', '교복 셔츠', 120, 2, 'common', 0, 0, 0, 0),
  ('t_jersey', 'top', '축구 유니폼', 150, 3, 'rare', 0, 0, 2, 0),
  ('t_hanbok', 'top', '한복 저고리', 200, 5, 'rare', 0, 0, 0, 2),
  ('t_hero', 'top', '슈퍼히어로 옷', 300, 7, 'epic', 2, 1, 0, 0),
  ('t_space', 'top', '우주복', 400, 10, 'epic', 0, 2, 4, 0),
  ('t_king', 'top', '임금님 망토', 600, 14, 'legend', 0, 0, 4, 4),
  ('b_navy', 'bottom', '남색 바지', 0, 1, 'common', 0, 0, 0, 0),
  ('b_shorts', 'bottom', '회색 반바지', 0, 1, 'common', 0, 0, 0, 0),
  ('b_skirt', 'bottom', '분홍 치마', 0, 1, 'common', 0, 0, 0, 0),
  ('b_jeans', 'bottom', '청바지', 40, 1, 'common', 0, 0, 0, 0),
  ('b_training', 'bottom', '트레이닝 바지', 60, 1, 'common', 0, 0, 1, 0),
  ('b_rainbow', 'bottom', '무지개 치마', 100, 3, 'rare', 0, 0, 0, 1),
  ('b_hanbok', 'bottom', '한복 바지', 150, 5, 'rare', 0, 0, 0, 1),
  ('b_hanbok_skirt', 'bottom', '한복 치마', 150, 5, 'rare', 0, 0, 0, 1),
  ('s_white', 'shoes', '흰 운동화', 0, 1, 'common', 0, 0, 0, 0),
  ('s_black', 'shoes', '검은 운동화', 0, 1, 'common', 0, 0, 0, 0),
  ('s_red', 'shoes', '빨간 운동화', 30, 1, 'common', 0, 0, 0, 0),
  ('s_rain', 'shoes', '노란 장화', 50, 1, 'common', 0, 1, 0, 0),
  ('s_boots', 'shoes', '모험가 부츠', 60, 2, 'common', 0, 1, 1, 0),
  ('s_iron', 'shoes', '철 장화', 200, 5, 'rare', 0, 3, 0, 0),
  ('s_gold', 'shoes', '황금 신발', 300, 10, 'epic', 0, 1, 0, 3),
  ('h_ribbon', 'hat', '리본', 40, 1, 'common', 0, 0, 0, 0),
  ('h_cap', 'hat', '야구 모자', 50, 1, 'common', 0, 0, 0, 0),
  ('h_beanie', 'hat', '털모자', 60, 1, 'common', 0, 0, 1, 0),
  ('h_flower', 'hat', '꽃 머리띠', 70, 2, 'common', 0, 0, 0, 1),
  ('h_headphone', 'hat', '헤드폰', 120, 3, 'rare', 0, 0, 0, 1),
  ('h_leather', 'hat', '가죽 투구', 80, 2, 'common', 0, 1, 2, 0),
  ('h_iron', 'hat', '철 투구', 220, 5, 'rare', 0, 3, 4, 0),
  ('h_wizard', 'hat', '마법사 모자', 260, 6, 'epic', 2, 0, 0, 3),
  ('h_knight', 'hat', '기사 투구', 380, 9, 'epic', 0, 5, 6, 0),
  ('h_crown', 'hat', '왕관', 500, 12, 'legend', 0, 0, 5, 5),
  ('h_dragon', 'hat', '용 투구', 750, 15, 'legend', 3, 7, 8, 0),
  ('a_leather', 'armor', '가죽 갑옷', 100, 2, 'common', 0, 2, 4, 0),
  ('a_chain', 'armor', '사슬 갑옷', 240, 5, 'rare', 0, 4, 6, 0),
  ('a_robe', 'armor', '마법사 로브', 320, 7, 'epic', 3, 0, 4, 3),
  ('a_knight', 'armor', '기사 갑옷', 450, 9, 'epic', 0, 7, 10, 0),
  ('a_gold', 'armor', '황금 갑옷', 850, 15, 'legend', 0, 10, 14, 3),
  ('i_book', 'held', '책', 30, 1, 'common', 0, 0, 0, 1),
  ('i_pencil', 'held', '연필', 30, 1, 'common', 1, 0, 0, 0),
  ('i_balloon', 'held', '풍선', 60, 2, 'common', 0, 0, 0, 1),
  ('i_wood_sword', 'held', '나무 칼', 50, 1, 'common', 2, 0, 0, 0),
  ('i_hammer', 'held', '뿅망치', 160, 4, 'rare', 4, 0, 0, 0),
  ('i_bow', 'held', '활', 220, 6, 'rare', 4, 0, 0, 2),
  ('i_wand', 'held', '마법봉', 150, 5, 'rare', 3, 0, 0, 2),
  ('i_sword', 'held', '용사의 검', 280, 7, 'epic', 6, 0, 0, 0),
  ('i_staff', 'held', '대마법사 지팡이', 420, 10, 'epic', 6, 0, 0, 3),
  ('i_trophy', 'held', '트로피', 300, 9, 'epic', 0, 0, 0, 5),
  ('i_flame', 'held', '불꽃의 검', 800, 15, 'legend', 10, 0, 0, 2),
  ('sh_wood', 'shield', '나무 방패', 60, 1, 'common', 0, 2, 0, 0),
  ('sh_iron', 'shield', '철 방패', 200, 4, 'rare', 0, 4, 0, 0),
  ('sh_star', 'shield', '별 방패', 260, 6, 'rare', 0, 3, 0, 3),
  ('sh_magic', 'shield', '마법 방패', 420, 9, 'epic', 0, 6, 0, 2),
  ('sh_dragon', 'shield', '용 방패', 780, 15, 'legend', 0, 9, 6, 0),
  ('ac_medal', 'acc', '반짝 메달', 40, 1, 'common', 0, 0, 0, 1),
  ('ac_scarf', 'acc', '빨간 목도리', 60, 1, 'common', 0, 1, 2, 0),
  ('ac_necklace', 'acc', '보석 목걸이', 140, 3, 'rare', 0, 0, 3, 2),
  ('ac_angel', 'acc', '천사 날개', 420, 8, 'epic', 0, 0, 6, 3),
  ('ac_dragon', 'acc', '용 날개', 700, 13, 'legend', 4, 4, 0, 0),
  ('g_round', 'glasses', '동그란 안경', 40, 1, 'common', 0, 0, 0, 1),
  ('g_sun', 'glasses', '선글라스', 80, 2, 'common', 0, 0, 0, 0),
  ('g_star', 'glasses', '별 안경', 120, 4, 'rare', 0, 0, 0, 2),
  ('g_heart', 'glasses', '하트 안경', 120, 4, 'rare', 0, 0, 2, 0),
  ('bg_sky', 'bg', '하늘색', 0, 1, 'common', 0, 0, 0, 0),
  ('bg_pink', 'bg', '분홍색', 0, 1, 'common', 0, 0, 0, 0),
  ('bg_mint', 'bg', '민트색', 0, 1, 'common', 0, 0, 0, 0),
  ('bg_classroom', 'bg', '우리 교실', 80, 1, 'common', 0, 0, 0, 0),
  ('bg_park', 'bg', '공원', 100, 2, 'common', 0, 0, 0, 0),
  ('bg_night', 'bg', '별이 빛나는 밤', 150, 3, 'common', 0, 0, 0, 0),
  ('bg_rainbow', 'bg', '무지개', 200, 4, 'common', 0, 0, 0, 0),
  ('bg_castle', 'bg', '용사의 성', 300, 6, 'rare', 0, 0, 0, 0),
  ('bg_space', 'bg', '우주', 250, 6, 'common', 0, 0, 0, 0),
  ('p_chick', 'pet', '병아리', 100, 1, 'common', 0, 0, 0, 1),
  ('p_cat', 'pet', '고양이', 150, 2, 'common', 0, 0, 0, 2),
  ('p_dog', 'pet', '강아지', 150, 2, 'common', 0, 0, 3, 0),
  ('p_rabbit', 'pet', '토끼', 150, 3, 'common', 0, 0, 0, 2),
  ('p_dino', 'pet', '공룡', 300, 6, 'rare', 2, 0, 2, 0),
  ('p_unicorn', 'pet', '유니콘', 400, 9, 'epic', 0, 0, 2, 4),
  ('p_dragon', 'pet', '아기 용', 600, 13, 'legend', 4, 0, 0, 2),
  ('ph_bun', 'hair', '똥머리', 120, 1, 'common', 0, 0, 0, 0),
  ('ph_wavy', 'hair', '웨이브 머리', 150, 2, 'common', 0, 0, 0, 0),
  ('ph_braid', 'hair', '땋은 머리', 150, 3, 'common', 0, 0, 0, 0),
  ('ph_afro', 'hair', '뽀글 아프로', 220, 4, 'rare', 0, 0, 0, 0),
  ('ph_mohawk', 'hair', '모히칸', 260, 6, 'rare', 0, 0, 0, 0),
  ('hc_mint', 'hairColor', '민트 머리', 100, 1, 'common', 0, 0, 0, 0),
  ('hc_silver', 'hairColor', '은빛 머리', 160, 3, 'rare', 0, 0, 0, 0),
  ('hc_fire', 'hairColor', '불꽃 머리', 240, 5, 'rare', 0, 0, 0, 0),
  ('hc_rainbow', 'hairColor', '무지개 머리', 380, 8, 'epic', 0, 0, 0, 0),
  ('hc_galaxy', 'hairColor', '우주 머리', 520, 11, 'legend', 0, 0, 0, 0),
  ('pe_heart', 'eyes', '하트 눈', 90, 1, 'common', 0, 0, 0, 0),
  ('pe_sparkle', 'eyes', '별빛 눈', 140, 2, 'common', 0, 0, 0, 0),
  ('pe_cat', 'eyes', '고양이 눈', 180, 4, 'rare', 0, 0, 0, 0),
  ('pe_anime', 'eyes', '만화 눈', 240, 6, 'rare', 0, 0, 0, 0)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price, min_level = excluded.min_level,
  rarity = excluded.rarity, atk = excluded.atk, def = excluded.def, hp = excluded.hp, luck = excluded.luck, active = true;
