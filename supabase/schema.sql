-- =====================================================================
--  복습 교실 데이터베이스 설정
--  Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여넣고 [Run]
--  (여러 번 실행해도 안전하게 작성되어 있습니다)
-- =====================================================================

-- ---------- 공통 도우미 ----------
create or replace function public.kst_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Seoul')::date $$;

-- 레벨 L → L+1 에 필요한 경험치: 50 + 25*(L-1)  (js/xp.js 와 같은 공식)
create or replace function public.level_for_xp(p_xp int) returns int
language plpgsql immutable as $$
declare
  v_level int := 1;
  v_left int := greatest(p_xp, 0);
  v_need int := 50;
begin
  while v_left >= v_need loop
    v_left := v_left - v_need;
    v_level := v_level + 1;
    v_need := 50 + 25 * (v_level - 1);
  end loop;
  return v_level;
end $$;

-- ---------- 테이블 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  login_id text unique not null,
  display_name text check (display_name is null or char_length(display_name) <= 12),
  role text not null default 'student' check (role in ('student', 'teacher')),
  grade int,
  avatar text not null default '🐣',
  xp int not null default 0,
  level int not null default 1,
  stat_points int not null default 0,   -- 3단계(보드게임)에서 사용
  skill_points int not null default 0,  -- 3단계(보드게임)에서 사용
  streak int not null default 0,
  last_active date,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  unit text,
  lesson_date date default public.kst_today(),
  grades int[] not null default '{}',       -- 비어 있으면 모든 학년에 공개
  summary text,
  key_points jsonb not null default '[]',
  flashcards jsonb not null default '[]',   -- [{front, back}]
  pages jsonb not null default '[]',        -- 판서 이미지 저장 경로 목록
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  position int not null default 0,
  type text not null check (type in ('ox', 'mcq', 'short', 'match', 'order', 'essay', 'frac')),
  difficulty int not null default 2 check (difficulty between 1 and 3),
  prompt text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- 이미 만들어진 표에도 새 문제 유형(분수 답) 허용
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('ox', 'mcq', 'short', 'match', 'order', 'essay', 'frac'));

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  question_id uuid not null references public.questions on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  answer jsonb,
  is_correct boolean,          -- null = 서술형 채점 대기
  score int,                   -- 서술형: 0 다시, 1 부분, 2 정답
  feedback text,
  xp int not null default 0,
  mode text not null default 'quiz',
  created_at timestamptz not null default now(),
  graded_at timestamptz
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  ref text,
  xp int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_q on public.attempts (user_id, question_id);
create index if not exists attempts_lesson on public.attempts (lesson_id);
create index if not exists events_user_time on public.events (user_id, created_at);
create index if not exists questions_lesson on public.questions (lesson_id, position);

-- ---------- 권한 도우미 ----------
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function public.my_grade() returns int
language sql stable security definer set search_path = public as $$
  select grade from profiles where id = auth.uid()
$$;

-- 로그인 전 화면에서 "처음 설정"이 필요한지 확인
create or replace function public.app_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('has_teacher', exists (select 1 from profiles where role = 'teacher'))
$$;
grant execute on function public.app_status() to anon, authenticated;

-- ---------- 가입 시 프로필 자동 생성 ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := 'student';
begin
  -- 첫 번째로 '선생님'으로 가입한 계정만 선생님이 됩니다
  if (new.raw_user_meta_data ->> 'role') = 'teacher'
     and not exists (select 1 from profiles where role = 'teacher') then
    v_role := 'teacher';
  end if;
  insert into profiles (id, login_id, role, grade, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'login_id', new.email),
    v_role,
    nullif(new.raw_user_meta_data ->> 'grade', '')::int,
    case when v_role = 'teacher' then '선생님' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 학생은 이름과 아바타만 바꿀 수 있습니다 (경험치 등은 서버 함수만 변경)
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
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- 행 단위 보안(RLS) ----------
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.events enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_teacher())
  with check (id = auth.uid() or public.is_teacher());

drop policy if exists "lessons read" on public.lessons;
create policy "lessons read" on public.lessons for select to authenticated
  using (
    public.is_teacher()
    or (published and (cardinality(grades) = 0 or public.my_grade() is null or public.my_grade() = any (grades)))
  );
drop policy if exists "lessons write" on public.lessons;
create policy "lessons write" on public.lessons for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "questions read" on public.questions;
create policy "questions read" on public.questions for select to authenticated
  using (public.is_teacher() or exists (select 1 from public.lessons l where l.id = lesson_id));
drop policy if exists "questions write" on public.questions;
create policy "questions write" on public.questions for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "attempts read" on public.attempts;
create policy "attempts read" on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

-- ---------- 경험치 지급 (내부용) ----------
create or replace function public._grant_xp(p_user uuid, p_amount int, p_kind text, p_ref text, p_activity boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p profiles%rowtype;
  v_today date := public.kst_today();
  v_bonus int := 0;
  v_streak int;
  v_total int;
  v_level int;
begin
  select * into p from profiles where id = p_user for update;
  if not found then raise exception 'profile not found'; end if;
  v_streak := p.streak;
  -- 오늘 첫 활동이면 출석 보너스
  if p_activity and p.last_active is distinct from v_today then
    v_streak := case when p.last_active = v_today - 1 then p.streak + 1 else 1 end;
    v_bonus := 5 + least(v_streak, 5) * 2;
  end if;
  v_total := greatest(p_amount, 0) + v_bonus;
  v_level := public.level_for_xp(p.xp + v_total);
  update profiles set
    xp = xp + v_total,
    level = v_level,
    stat_points = stat_points + 3 * (v_level - p.level),
    skill_points = skill_points + (v_level - p.level),
    streak = v_streak,
    last_active = case when p_activity then v_today else last_active end
  where id = p_user;
  insert into events (user_id, kind, ref, xp) values (p_user, p_kind, p_ref, greatest(p_amount, 0));
  if v_bonus > 0 then
    insert into events (user_id, kind, ref, xp) values (p_user, 'daily', v_streak::text, v_bonus);
  end if;
  return jsonb_build_object(
    'xp', greatest(p_amount, 0), 'bonus', v_bonus, 'streak', v_streak,
    'total_xp', p.xp + v_total, 'level', v_level, 'old_level', p.level,
    'leveled_up', v_level > p.level
  );
end $$;
revoke execute on function public._grant_xp(uuid, int, text, text, boolean) from public, anon, authenticated;

-- ---------- 학생이 부르는 함수 ----------
-- 복습 자료 보기: 처음 +10, 다른 날 다시 보면 +5 (하루 한 번)
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
    case when exists (select 1 from events where user_id = uid and kind = 'view' and ref = p_lesson::text) then 5 else 10 end,
    'view', p_lesson::text, true);
end $$;

-- 문제 풀기
--   처음 맞힘 +8 / 틀렸던 문제 맞힘(오답 극복) +6 / 다른 날 다시 맞힘 +2 / 도전(틀림) +1 / 서술형 제출 +3
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
    v_xp := case when v_today_cnt = 0 then 3 else 0 end; v_kind := 'essay';
  elsif v_correct then
    if not v_had_correct and v_had_wrong then v_xp := 6; v_kind := 'comeback';
    elsif not v_had_correct then v_xp := 8; v_kind := 'correct';
    elsif v_today_cnt = 0 then v_xp := 2; v_kind := 'review';
    else v_xp := 0; v_kind := 'repeat';
    end if;
  else
    v_xp := case when v_today_cnt = 0 then 1 else 0 end; v_kind := 'try';
  end if;

  insert into attempts (user_id, question_id, lesson_id, answer, is_correct, xp, mode)
  values (uid, p_question, q.lesson_id, p_answer, v_correct, v_xp, coalesce(p_mode, 'quiz'));

  return public._grant_xp(uid, v_xp, v_kind, p_question::text, true) || jsonb_build_object('kind', v_kind);
end $$;

-- 퀴즈 끝까지 풀기: +10, 3문제 이상 모두 맞히면 +10 더 (수업별 하루 한 번)
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
  return public._grant_xp(uid, 10 + case when v_perfect then 10 else 0 end, 'quiz_done', p_lesson::text, true)
         || jsonb_build_object('perfect', v_perfect);
end $$;

-- ---------- 선생님이 부르는 함수 ----------
-- 서술형 채점: 2 정답(+8) / 1 부분(+4) / 0 다시 해 보기(0)
create or replace function public.grade_attempt(p_attempt bigint, p_score int, p_feedback text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a attempts%rowtype;
  v_xp int := case p_score when 2 then 8 when 1 then 4 else 0 end;
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

grant execute on function public.record_view(uuid) to authenticated;
grant execute on function public.submit_answer(uuid, jsonb, boolean, text) to authenticated;
grant execute on function public.complete_quiz(uuid, int, int) to authenticated;
grant execute on function public.grade_attempt(bigint, int, text) to authenticated;

-- ---------- 판서 이미지 저장소 ----------
insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', false)
on conflict (id) do nothing;

drop policy if exists "lesson files read" on storage.objects;
create policy "lesson files read" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-files');
drop policy if exists "lesson files insert" on storage.objects;
create policy "lesson files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-files' and public.is_teacher());
drop policy if exists "lesson files update" on storage.objects;
create policy "lesson files update" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-files' and public.is_teacher());
drop policy if exists "lesson files delete" on storage.objects;
create policy "lesson files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-files' and public.is_teacher());

-- =====================================================================
--  업데이트 3: 🪙 코인 · 🧑‍🎨 아바타 꾸미기 · 🛍️ 아바타 상점
--  SQL Editor → New query → 전체 붙여넣기 → Run  (여러 번 실행해도 안전)
-- =====================================================================

alter table public.profiles add column if not exists coins int not null default 50;   -- 처음 받는 코인 50
alter table public.profiles add column if not exists avatar_cfg jsonb;
alter table public.events add column if not exists coins int not null default 0;

-- 이미 공부하던 학생에게 시작 코인: 50 + 지금까지 오른 레벨 × 20 (딱 한 번만)
create table if not exists public.app_meta (key text primary key, done_at timestamptz not null default now());
alter table public.app_meta enable row level security;
do $$
begin
  if not exists (select 1 from public.app_meta where key = 'update03_coin_start') then
    update public.profiles set coins = 50 + (level - 1) * 20 where role = 'student';
    insert into public.events (user_id, kind, ref, xp, coins)
      select id, 'coin_start', null, 0, coins from public.profiles where role = 'student';
    insert into public.app_meta (key) values ('update03_coin_start');
  end if;
end $$;

create table if not exists public.shop_items (
  id text primary key,
  slot text not null,
  name text not null,
  price int not null default 0,
  min_level int not null default 1,
  active boolean not null default true
);

create table if not exists public.inventory (
  user_id uuid not null references public.profiles on delete cascade,
  item_id text not null references public.shop_items on delete cascade,
  bought_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;

drop policy if exists "shop read" on public.shop_items;
create policy "shop read" on public.shop_items for select to authenticated using (true);
drop policy if exists "shop write" on public.shop_items;
create policy "shop write" on public.shop_items for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "inventory read" on public.inventory;
create policy "inventory read" on public.inventory for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

-- 코인과 아바타도 서버 함수로만 바뀌게 보호
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
  end if;
  return new;
end $$;

-- 경험치 + 코인 지급 (내부용)
--   코인: 복습 보기 1, 처음 맞힘 2, 오답 극복 3, 다시 맞힘 1, 서술형 1, 서술형 채점 정답 3/부분 1,
--         퀴즈 완주 5 (만점 10), 출석 보너스 3, 레벨업마다 20
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
    v_bonus := 5 + least(v_streak, 5) * 2;
    v_bonus_coins := 3;
  end if;
  v_coins := case p_kind
    when 'view' then case when p_amount > 0 then 1 else 0 end
    when 'correct' then 2
    when 'comeback' then 3
    when 'review' then 1
    when 'essay' then case when p_amount > 0 then 1 else 0 end
    when 'essay_graded' then case when p_amount >= 8 then 3 when p_amount > 0 then 1 else 0 end
    when 'quiz_done' then case when p_amount >= 20 then 10 else 5 end
    else 0 end;
  v_total := greatest(p_amount, 0) + v_bonus;
  v_level := public.level_for_xp(p.xp + v_total);
  v_level_coins := 20 * (v_level - p.level);
  update profiles set
    xp = xp + v_total,
    level = v_level,
    stat_points = stat_points + 3 * (v_level - p.level),
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

-- 🛍️ 아이템 사기
create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it shop_items%rowtype;
  p profiles%rowtype;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into it from shop_items where id = p_item and active;
  if not found then raise exception '없는 물건이에요'; end if;
  select * into p from profiles where id = uid for update;
  if p.level < it.min_level then raise exception '레벨 %부터 살 수 있어요', it.min_level; end if;
  if exists (select 1 from inventory where user_id = uid and item_id = p_item) then raise exception '이미 가지고 있어요'; end if;
  if p.coins < it.price then raise exception '코인이 부족해요'; end if;
  update profiles set coins = coins - it.price where id = uid;
  insert into inventory (user_id, item_id) values (uid, p_item);
  insert into events (user_id, kind, ref, xp, coins) values (uid, 'buy', p_item, 0, -it.price);
  return jsonb_build_object('coins', p.coins - it.price, 'item', p_item);
end $$;

-- 🧑‍🎨 아바타 저장 (가진 아이템·무료 아이템만 입을 수 있음)
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
  -- 기본 꾸미기(얼굴·피부·눈·입·머리·머리색)는 짧은 글자만 저장
  foreach k in array array['face', 'skin', 'eyes', 'mouth', 'hair', 'hairColor'] loop
    v := p_cfg ->> k;
    if v is not null and char_length(v) <= 20 and v ~ '^[A-Za-z0-9_#]+$' then
      out_cfg := out_cfg || jsonb_build_object(k, v);
    end if;
  end loop;
  -- 아이템 칸은 무료 아이템이거나 산 아이템만
  foreach k in array array['top', 'bottom', 'shoes', 'hat', 'glasses', 'held', 'bg', 'pet'] loop
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

-- 🎁 선생님이 코인 주기 (빼기도 가능, 0 아래로는 안 내려감)
create or replace function public.give_coins(p_user uuid, p_amount int, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_new int;
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  if p_amount = 0 or abs(p_amount) > 1000 then raise exception '코인은 -1000 ~ 1000 사이로 주세요'; end if;
  update profiles set coins = greatest(0, coins + p_amount) where id = p_user and role = 'student' returning coins into v_new;
  if not found then raise exception '학생을 찾을 수 없어요'; end if;
  insert into events (user_id, kind, ref, xp, coins) values (p_user, 'teacher_coins', left(coalesce(p_reason, ''), 60), 0, p_amount);
  return jsonb_build_object('coins', v_new);
end $$;

grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.save_avatar(jsonb) to authenticated;
grant execute on function public.give_coins(uuid, int, text) to authenticated;

-- 상점 물건 목록
-- 자동 생성 파일 (tools/gen-shop-sql.mjs) — 직접 고치지 마세요
insert into public.shop_items (id, slot, name, price, min_level) values
  ('t_blue', 'top', '파란 티셔츠', 0, 1),
  ('t_red', 'top', '빨간 티셔츠', 0, 1),
  ('t_yellow', 'top', '노란 티셔츠', 0, 1),
  ('t_green', 'top', '초록 티셔츠', 0, 1),
  ('t_stripe', 'top', '줄무늬 티셔츠', 40, 1),
  ('t_hoodie', 'top', '후드티', 80, 1),
  ('t_uniform', 'top', '교복 셔츠', 120, 2),
  ('t_jersey', 'top', '축구 유니폼', 150, 3),
  ('t_hanbok', 'top', '한복 저고리', 200, 5),
  ('t_hero', 'top', '슈퍼히어로 옷', 300, 7),
  ('t_space', 'top', '우주복', 400, 10),
  ('t_king', 'top', '임금님 망토', 600, 14),
  ('b_navy', 'bottom', '남색 바지', 0, 1),
  ('b_shorts', 'bottom', '회색 반바지', 0, 1),
  ('b_skirt', 'bottom', '분홍 치마', 0, 1),
  ('b_jeans', 'bottom', '청바지', 40, 1),
  ('b_training', 'bottom', '트레이닝 바지', 60, 1),
  ('b_rainbow', 'bottom', '무지개 치마', 100, 3),
  ('b_hanbok', 'bottom', '한복 바지', 150, 5),
  ('b_hanbok_skirt', 'bottom', '한복 치마', 150, 5),
  ('s_white', 'shoes', '흰 운동화', 0, 1),
  ('s_black', 'shoes', '검은 운동화', 0, 1),
  ('s_red', 'shoes', '빨간 운동화', 30, 1),
  ('s_rain', 'shoes', '노란 장화', 50, 1),
  ('s_boots', 'shoes', '갈색 부츠', 60, 2),
  ('s_gold', 'shoes', '황금 신발', 300, 10),
  ('h_ribbon', 'hat', '리본', 40, 1),
  ('h_cap', 'hat', '야구 모자', 50, 1),
  ('h_beanie', 'hat', '털모자', 60, 1),
  ('h_flower', 'hat', '꽃 머리띠', 70, 2),
  ('h_headphone', 'hat', '헤드폰', 120, 3),
  ('h_wizard', 'hat', '마법사 모자', 200, 6),
  ('h_crown', 'hat', '왕관', 500, 12),
  ('g_round', 'glasses', '동그란 안경', 40, 1),
  ('g_sun', 'glasses', '선글라스', 80, 2),
  ('g_star', 'glasses', '별 안경', 120, 4),
  ('g_heart', 'glasses', '하트 안경', 120, 4),
  ('i_book', 'held', '책', 30, 1),
  ('i_pencil', 'held', '연필', 30, 1),
  ('i_balloon', 'held', '풍선', 60, 2),
  ('i_wand', 'held', '마법봉', 150, 5),
  ('i_sword', 'held', '용사의 검', 250, 7),
  ('i_trophy', 'held', '트로피', 300, 9),
  ('bg_sky', 'bg', '하늘색', 0, 1),
  ('bg_pink', 'bg', '분홍색', 0, 1),
  ('bg_mint', 'bg', '민트색', 0, 1),
  ('bg_classroom', 'bg', '우리 교실', 80, 1),
  ('bg_park', 'bg', '공원', 100, 2),
  ('bg_rainbow', 'bg', '무지개', 200, 4),
  ('bg_night', 'bg', '별이 빛나는 밤', 150, 3),
  ('bg_space', 'bg', '우주', 250, 6),
  ('p_chick', 'pet', '병아리', 100, 1),
  ('p_cat', 'pet', '고양이', 150, 2),
  ('p_dog', 'pet', '강아지', 150, 2),
  ('p_rabbit', 'pet', '토끼', 150, 3),
  ('p_dino', 'pet', '공룡', 300, 6),
  ('p_unicorn', 'pet', '유니콘', 400, 9),
  ('p_dragon', 'pet', '용', 600, 13)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price, min_level = excluded.min_level;
