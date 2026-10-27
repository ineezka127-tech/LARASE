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
