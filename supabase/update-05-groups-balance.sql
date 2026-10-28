-- =====================================================================
--  업데이트 5: 📚 과목·주제 묶기 · 🔁 문제 세트 · ⚖️ 경험치 조정 · 스탯 포인트 레벨당 1개
--  SQL Editor → New query → 전체 붙여넣기 → Run  (여러 번 실행해도 안전)
--  ※ 업데이트 2·3·4를 먼저 실행해 주세요.
-- =====================================================================

-- ---------- 과목 ----------
create table if not exists public.subjects (
  id serial primary key,
  name text unique not null,
  emoji text not null default '📘',
  position int not null default 0,
  active boolean not null default true
);
insert into public.subjects (name, emoji, position) values
  ('국어', '📖', 1), ('수학', '➗', 2), ('진로와 직업', '🧭', 3)
on conflict (name) do nothing;
-- 이미 만든 수업의 과목도 목록에 넣기 (지우지 않고 살려 두기)
insert into public.subjects (name, emoji, position)
  select distinct subject, '📘', 50 from public.lessons where coalesce(subject, '') <> ''
on conflict (name) do nothing;

-- ---------- 주제(제재) 묶음 ----------
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (subject, name)
);
alter table public.lessons add column if not exists topic_id uuid references public.topics on delete set null;

-- 예전 '단원' 글자를 주제로 옮기기
insert into public.topics (subject, name)
  select distinct coalesce(nullif(subject, ''), '기타'), unit from public.lessons where coalesce(unit, '') <> ''
on conflict (subject, name) do nothing;
update public.lessons l set topic_id = t.id
  from public.topics t
  where l.topic_id is null and coalesce(l.unit, '') <> ''
    and t.subject = coalesce(nullif(l.subject, ''), '기타') and t.name = l.unit;

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects for select to authenticated using (true);
drop policy if exists "subjects write" on public.subjects;
create policy "subjects write" on public.subjects for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "topics read" on public.topics;
create policy "topics read" on public.topics for select to authenticated using (true);
drop policy if exists "topics write" on public.topics;
create policy "topics write" on public.topics for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- ---------- 문제 세트 (같은 내용, 다른 문제) ----------
alter table public.questions add column if not exists set_no int not null default 1;
alter table public.questions add column if not exists source text not null default 'ai';

-- ---------- ⚖️ 레벨 곡선: 레벨 L → L+1 에 필요한 경험치 = 40 × L^1.4 (5 단위로 반올림) ----------
--   Lv1→2: 40, Lv2→3: 105, Lv3→4: 185, Lv5→6: 380, Lv10→11: 1005  (js/lib/xp.js 와 같은 공식)
create or replace function public.xp_need(p_level int) returns int
language sql immutable as $$ select (round(40 * power(p_level, 1.4) / 5) * 5)::int $$;

create or replace function public.level_for_xp(p_xp int) returns int
language plpgsql immutable as $$
declare
  v_level int := 1;
  v_left int := greatest(p_xp, 0);
begin
  while v_left >= public.xp_need(v_level) loop
    v_left := v_left - public.xp_need(v_level);
    v_level := v_level + 1;
  end loop;
  return v_level;
end $$;

create or replace function public.xp_floor(p_level int) returns int
language sql immutable as $$ select coalesce(sum(public.xp_need(l)), 0)::int from generate_series(1, p_level - 1) l $$;

-- 지금 레벨은 그대로 두고, 새 곡선에 맞게 경험치 막대만 맞추기 (한 번만)
create table if not exists public.app_meta (key text primary key, done_at timestamptz not null default now());
do $$
begin
  if not exists (select 1 from public.app_meta where key = 'update05_xp') then
    update public.profiles set xp = greatest(xp, public.xp_floor(level)) where role = 'student';
    insert into public.app_meta (key) values ('update05_xp');
  end if;
end $$;

-- ---------- 경험치·코인 지급 (내부용) ----------
--   스탯 포인트: 레벨업마다 1개 / 출석 보너스: 3 + 연속 일수(최대 5)
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
  v_level_coins int;
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
    when 'view' then case when p_amount > 0 then 1 else 0 end
    when 'correct' then 2
    when 'comeback' then 3
    when 'review' then 1
    when 'essay' then case when p_amount > 0 then 1 else 0 end
    when 'essay_graded' then case when p_amount >= 5 then 3 when p_amount > 0 then 1 else 0 end
    when 'quiz_done' then case when p_amount >= 10 then 10 else 5 end
    when 'set_done' then case when p_amount >= 10 then 10 else 5 end
    else 0 end;
  v_total := greatest(p_amount, 0) + v_bonus;
  v_level := greatest(p.level, public.level_for_xp(p.xp + v_total));   -- 레벨은 내려가지 않음
  v_level_coins := 20 * (v_level - p.level);
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
    'leveled_up', v_level > p.level,
    'coins', v_coins + v_bonus_coins + v_level_coins, 'coin_total', p.coins + v_coins + v_bonus_coins + v_level_coins
  );
end $$;
revoke execute on function public._grant_xp(uuid, int, text, text, boolean) from public, anon, authenticated;

-- 복습 자료 보기: 처음 +4, 다른 날 다시 보면 +2 (하루 한 번)
create or replace function public.record_view(p_lesson uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  if exists (select 1 from events where user_id = uid and kind = 'view' and ref = p_lesson::text
             and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) then
    return jsonb_build_object('xp', 0, 'already', true);
  end if;
  return public._grant_xp(uid,
    case when exists (select 1 from events where user_id = uid and kind = 'view' and ref = p_lesson::text) then 2 else 4 end,
    'view', p_lesson::text, true);
end $$;

-- 문제 풀기: 처음 맞힘 +5 / 오답 극복 +4 / 다른 날 다시 맞힘 +1 / 도전 +1 / 서술형 제출 +2
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

-- 퀴즈 끝까지 풀기: +5, 3문제 이상 모두 맞히면 +10 (수업별 하루 한 번)
create or replace function public.complete_quiz(p_lesson uuid, p_correct int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_perfect boolean := p_total >= 3 and p_correct >= p_total;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  if exists (select 1 from events where user_id = uid and kind = 'quiz_done' and ref = p_lesson::text
             and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) then
    return jsonb_build_object('xp', 0, 'already', true, 'perfect', v_perfect);
  end if;
  return public._grant_xp(uid, case when v_perfect then 10 else 5 end, 'quiz_done', p_lesson::text, true)
         || jsonb_build_object('perfect', v_perfect);
end $$;

-- 묶음 퀴즈(주제 전체·기간 총정리) 끝까지 풀기: +5, 5문제 이상 모두 맞히면 +10 (묶음별 하루 한 번)
create or replace function public.complete_set(p_ref text, p_correct int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_ref text := left(coalesce(p_ref, ''), 80);
  v_perfect boolean := p_total >= 5 and p_correct >= p_total;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if public.is_teacher() then return jsonb_build_object('xp', 0, 'preview', true); end if;
  if p_total < 1 then return jsonb_build_object('xp', 0); end if;
  if exists (select 1 from events where user_id = uid and kind = 'set_done' and ref = v_ref
             and (created_at at time zone 'Asia/Seoul')::date = public.kst_today()) then
    return jsonb_build_object('xp', 0, 'already', true, 'perfect', v_perfect);
  end if;
  return public._grant_xp(uid, case when v_perfect then 10 else 5 end, 'set_done', v_ref, true)
         || jsonb_build_object('perfect', v_perfect);
end $$;
grant execute on function public.complete_set(text, int, int) to authenticated;

-- 서술형 채점: 2 정답(+5) / 1 부분(+2) / 0 다시 해 보기(0)
create or replace function public.grade_attempt(p_attempt bigint, p_score int, p_feedback text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a attempts%rowtype;
  v_xp int := case p_score when 2 then 5 when 1 then 2 else 0 end;
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  select * into a from attempts where id = p_attempt for update;
  if not found then raise exception 'attempt not found'; end if;
  update attempts set score = p_score, is_correct = (p_score = 2), feedback = nullif(p_feedback, ''),
         graded_at = now(), xp = xp + case when a.graded_at is null then v_xp else 0 end
   where id = p_attempt;
  if a.graded_at is null and v_xp > 0 then
    return public._grant_xp(a.user_id, v_xp, 'essay_graded', p_attempt::text, false);
  end if;
  return jsonb_build_object('xp', 0);
end $$;

-- 🔄 선생님: 경험치·레벨·스탯 초기화 (풀이 기록은 남김). p_user 가 null 이면 학생 전체
create or replace function public.reset_progress(p_user uuid, p_keep_coins boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  update profiles set xp = 0, level = 1, stat_points = 0, skill_points = 0, stats = '{}', streak = 0,
         coins = case when p_keep_coins then coins else 50 end
   where role = 'student' and (p_user is null or id = p_user);
  get diagnostics n = row_count;
  insert into events (user_id, kind, ref, xp, coins)
    select id, 'reset', case when p_keep_coins then 'keep_coins' else 'reset_coins' end, 0, 0
    from profiles where role = 'student' and (p_user is null or id = p_user);
  return jsonb_build_object('reset', n);
end $$;
grant execute on function public.reset_progress(uuid, boolean) to authenticated;
