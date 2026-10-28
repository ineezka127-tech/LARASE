-- 업데이트 9: 보안 점검 반영 · 저장 공간 표시 · 실시간 현황 · 성실도 · 가/나/다 그룹 · 난이도 4단계
-- 업데이트 8 다음에 SQL Editor에서 한 번 실행하세요. (여러 번 실행해도 괜찮아요)

-- =====================================================================
--  1. 🧪 테스트 계정 표시 (업데이트 7의 앞부분 — 이미 있으면 그대로)
-- =====================================================================
alter table public.profiles add column if not exists is_test boolean not null default false;
update public.profiles set is_test = true where lower(login_id) = 'test01' and not is_test;

-- =====================================================================
--  2. 🎯 가/나/다 그룹 · 난이도 4단계 · 서술형 성실도
-- =====================================================================
-- 학생 그룹 (가=상, 나=중, 다=하). 비어 있으면 '나'로 봐요
alter table public.profiles add column if not exists tier text;
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check check (tier is null or tier in ('가', '나', '다'));

-- 문제 그룹 (비어 있으면 모든 그룹 공통 문제)
alter table public.questions add column if not exists tier text;
alter table public.questions drop constraint if exists questions_tier_check;
alter table public.questions add constraint questions_tier_check check (tier is null or tier in ('가', '나', '다'));

-- 난이도: 1 쉬움 · 2 보통 · 3 어려움 · 4 도전 (예전 3 '도전'은 4로 옮겨요, 한 번만)
alter table public.questions drop constraint if exists questions_difficulty_check;
alter table public.questions add constraint questions_difficulty_check check (difficulty between 1 and 4);
do $$
begin
  if not exists (select 1 from public.app_meta where key = 'update09_difficulty4') then
    update public.questions set difficulty = 4 where difficulty = 3;
    insert into public.app_meta (key) values ('update09_difficulty4');
  end if;
end $$;

-- 서술형 성실도 (1 조금 · 2 보통 · 3 성실)
alter table public.attempts add column if not exists effort smallint;
alter table public.attempts drop constraint if exists attempts_effort_check;
alter table public.attempts add constraint attempts_effort_check check (effort is null or effort between 1 and 3);

create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_created_idx on public.attempts (created_at desc);
create index if not exists events_created_idx on public.events (created_at desc);

-- 서술형 채점 + 성실도
create or replace function public.grade_attempt2(p_attempt bigint, p_score int, p_feedback text, p_effort int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  if p_effort is not null and (p_effort < 1 or p_effort > 3) then raise exception '성실도는 1~3이에요'; end if;
  r := public.grade_attempt(p_attempt, p_score, p_feedback);
  update attempts set effort = p_effort where id = p_attempt;
  return r;
end $$;

-- 학생이 스스로 바꾸면 안 되는 칸 지키기 (테스트 표시·그룹 추가)
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
    new.tier := old.tier;
  end if;
  return new;
end $$;

-- 친구 위치 (테스트 계정 빼기)
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

-- =====================================================================
--  3. 💾 저장 공간 (선생님만)
-- =====================================================================
create or replace function public.storage_usage() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'file_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects),
    'file_count', (select count(*) from storage.objects),
    'db_limit', 500 * 1024 * 1024,
    'file_limit', 1024 * 1024 * 1024
  );
end $$;

-- =====================================================================
--  4. 🔒 새 계정 만들기 잠금: 선생님이 "계정 만들기"를 누른 뒤 10분 동안만 열려요
--     (그 밖의 시간에는 누가 앱 주소와 공개 키로 몰래 가입하려 해도 막혀요)
-- =====================================================================
create or replace function public.open_signup(p_minutes int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  insert into app_meta (key, done_at) values ('signup_open_until', now() + make_interval(mins => greatest(0, least(p_minutes, 30))))
  on conflict (key) do update set done_at = excluded.done_at;
  return jsonb_build_object('open_until', now() + make_interval(mins => greatest(0, least(p_minutes, 30))));
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := 'student';
  v_has_teacher boolean := exists (select 1 from profiles where role = 'teacher');
begin
  -- 선생님이 이미 있으면, 선생님이 연 시간에만 가입할 수 있어요
  if v_has_teacher and not exists (select 1 from app_meta where key = 'signup_open_until' and done_at > now()) then
    raise exception 'SIGNUP_CLOSED';
  end if;
  -- 첫 번째로 '선생님'으로 가입한 계정만 선생님이 됩니다
  if (new.raw_user_meta_data ->> 'role') = 'teacher' and not v_has_teacher then
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

-- =====================================================================
--  5. 📡 실시간 현황: 풀이 기록·활동 기록이 생기면 선생님 화면에 바로 알려 줘요
--     (읽기 권한 규칙은 그대로라서 학생은 자기 것만, 선생님은 모두 받아요)
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attempts') then
      alter publication supabase_realtime add table public.attempts;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
      alter publication supabase_realtime add table public.events;
    end if;
  end if;
end $$;

-- =====================================================================
--  6. 🔒 함수 실행 권한 정리 (보안 점검 결과)
--     - 로그인하지 않은 사람(anon)은 app_status 말고는 아무 함수도 못 써요
--     - 속에서만 쓰는 도우미 함수(_로 시작 등)는 로그인한 학생도 직접 못 불러요
-- =====================================================================
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname like '\_%' or f.proname in ('handle_new_user', 'protect_profile') then
      execute format('revoke execute on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
grant execute on function public.app_status() to anon;

-- 앞으로 새로 만드는 함수도 기본으로는 로그인 안 한 사람에게 막혀 있게
alter default privileges in schema public revoke execute on functions from public, anon;

-- 검색 경로 고정 (보안 점검 경고 해결)
alter function public.kst_today() set search_path = public;
alter function public.level_for_xp(int) set search_path = public;
alter function public.xp_need(int) set search_path = public;
alter function public.xp_floor(int) set search_path = public;
alter function public._scaled(int, numeric) set search_path = public;
alter function public._game_json(public.game_state) set search_path = public;
