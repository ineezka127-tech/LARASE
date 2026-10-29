-- 업데이트 12: ✍️ 육하원칙 글쓰기 (표 이름은 모두 w5_ 로 시작해서 기존 표와 섞이지 않아요)
-- 업데이트 11 다음에 한 번 실행하세요. (여러 번 실행해도 괜찮아요)

-- 글쓰기 주제 (선생님이 올려요)
create table if not exists public.w5_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  guide text check (guide is null or char_length(guide) <= 400),
  emoji text check (emoji is null or char_length(emoji) <= 8),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 학생 글 (칸별 내용·점검 결과·이어 쓴 글·선생님 피드백)
create table if not exists public.w5_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  task_id uuid references public.w5_tasks on delete set null,
  fields jsonb not null default '{}',          -- {who, when, where, what, how, why}
  checks jsonb not null default '{}',          -- {passed: {who: true, ...}, required: [...], spelling: [...], ...}
  final_text text check (final_text is null or char_length(final_text) <= 1000),
  status text not null default 'writing' check (status in ('writing', 'submitted', 'redo', 'done')),
  teacher_feedback text check (teacher_feedback is null or char_length(teacher_feedback) <= 300),
  feedback_at timestamptz,
  showcase boolean not null default false,
  author_name text check (author_name is null or char_length(author_name) <= 30),   -- 보여주기 화면에 쓸 이름 (쓸 때 자동으로)
  xp_given boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint w5_fields_size check (pg_column_size(fields) < 4000),
  constraint w5_checks_size check (pg_column_size(checks) < 6000)
);
alter table public.w5_submissions add column if not exists author_name text;
create index if not exists w5_submissions_user_idx on public.w5_submissions (user_id, created_at desc);
create index if not exists w5_submissions_created_idx on public.w5_submissions (created_at desc);

-- 맞춤법 오표기 목록 (선생님이 추가: 마셔다 → 마셨다)
create table if not exists public.w5_spelling (
  id uuid primary key default gen_random_uuid(),
  wrong text not null unique check (char_length(wrong) between 1 and 30),
  right_word text not null check (char_length(right_word) between 1 and 30),
  created_at timestamptz not null default now()
);

-- 학생별 통과 기준 (없으면 그룹에 맞는 기본값)
create table if not exists public.w5_rules (
  user_id uuid primary key references public.profiles on delete cascade,
  required text[] not null default array['who', 'when', 'where', 'what', 'how', 'why'],
  level text not null default 'normal' check (level in ('easy', 'normal')),   -- easy: 칸만 채우면 통과 / normal: 칸별 규칙 점검
  rewrite boolean not null default true,                                      -- 마지막에 다시 쓰기까지 해야 제출
  updated_at timestamptz not null default now()
);

-- ---------- 행 단위 보안 ----------
alter table public.w5_tasks enable row level security;
alter table public.w5_submissions enable row level security;
alter table public.w5_spelling enable row level security;
alter table public.w5_rules enable row level security;

-- 주제·맞춤법 목록: 모두 읽기, 선생님만 쓰기
drop policy if exists "w5 tasks read" on public.w5_tasks;
create policy "w5 tasks read" on public.w5_tasks for select to authenticated using (true);
drop policy if exists "w5 tasks write" on public.w5_tasks;
create policy "w5 tasks write" on public.w5_tasks for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "w5 spelling read" on public.w5_spelling;
create policy "w5 spelling read" on public.w5_spelling for select to authenticated using (true);
drop policy if exists "w5 spelling write" on public.w5_spelling;
create policy "w5 spelling write" on public.w5_spelling for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- 학생별 기준: 자기 것만 읽기, 선생님만 쓰기
drop policy if exists "w5 rules read" on public.w5_rules;
create policy "w5 rules read" on public.w5_rules for select to authenticated using (user_id = auth.uid() or public.is_teacher());
drop policy if exists "w5 rules write" on public.w5_rules;
create policy "w5 rules write" on public.w5_rules for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- 글: 학생은 자기 글만 쓰고 읽기 (+ "모두에게 보여주기"된 글은 모두 읽기), 선생님은 모두
drop policy if exists "w5 sub read" on public.w5_submissions;
create policy "w5 sub read" on public.w5_submissions for select to authenticated
  using (user_id = auth.uid() or showcase or public.is_teacher());
drop policy if exists "w5 sub insert" on public.w5_submissions;
create policy "w5 sub insert" on public.w5_submissions for insert to authenticated
  with check (user_id = auth.uid() and status in ('writing', 'submitted') and not showcase and teacher_feedback is null and not xp_given);
drop policy if exists "w5 sub update" on public.w5_submissions;
create policy "w5 sub update" on public.w5_submissions for update to authenticated
  using (user_id = auth.uid() or public.is_teacher())
  with check (user_id = auth.uid() or public.is_teacher());
-- 지우기는 선생님만
drop policy if exists "w5 sub delete" on public.w5_submissions;
create policy "w5 sub delete" on public.w5_submissions for delete to authenticated using (public.is_teacher());

revoke all on public.w5_tasks, public.w5_submissions, public.w5_spelling, public.w5_rules from anon;
grant select on public.w5_tasks, public.w5_spelling, public.w5_rules to authenticated;
grant insert, update, delete on public.w5_tasks, public.w5_spelling, public.w5_rules to authenticated;
grant select, insert, update, delete on public.w5_submissions to authenticated;

-- 학생이 바꾸면 안 되는 칸 지키기 (선생님 피드백·보여주기·경험치·다른 학생으로 바꾸기)
create or replace function public.w5_protect() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if current_user = 'authenticated' and not public.is_teacher() then
    new.user_id := old.user_id;
    new.teacher_feedback := old.teacher_feedback;
    new.feedback_at := old.feedback_at;
    new.showcase := old.showcase;
    new.xp_given := old.xp_given;
    new.created_at := old.created_at;
    new.author_name := old.author_name;
    -- 학생은 '쓰는 중'·'제출'로만 바꿀 수 있어요 (다시 쓰기 요청을 받은 글을 고쳐 내는 것 포함)
    if new.status not in ('writing', 'submitted') then new.status := old.status; end if;
    if old.status = 'done' then new.status := 'done'; new.fields := old.fields; new.final_text := old.final_text; new.checks := old.checks; end if;
  end if;
  return new;
end $$;
-- 쓸 때 이름을 자동으로 넣어요 (학생이 다른 이름을 넣을 수 없게)
create or replace function public.w5_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := (select coalesce(display_name, login_id) from profiles where id = new.user_id);
  return new;
end $$;
drop trigger if exists w5_set_author on public.w5_submissions;
create trigger w5_set_author before insert on public.w5_submissions for each row execute function public.w5_set_author();
revoke execute on function public.w5_set_author() from public, anon, authenticated;

drop trigger if exists w5_protect on public.w5_submissions;
create trigger w5_protect before update on public.w5_submissions for each row execute function public.w5_protect();

-- 제출하면 경험치 (글 하나에 한 번, 하루 최대 3편)
create or replace function public.w5_complete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s w5_submissions%rowtype;
  n_today int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into s from w5_submissions where id = p_id and user_id = uid for update;
  if not found then raise exception '글을 찾을 수 없어요'; end if;
  if s.status <> 'submitted' or s.xp_given then return jsonb_build_object('xp', 0); end if;
  select count(*) into n_today from w5_submissions
   where user_id = uid and xp_given and (created_at at time zone 'Asia/Seoul')::date = public.kst_today();
  update w5_submissions set xp_given = true where id = p_id;
  if n_today >= 3 then return jsonb_build_object('xp', 0, 'limit', true); end if;
  return public._grant_xp(uid, 8, 'w5_write', p_id::text, true);
end $$;
revoke execute on function public.w5_complete(uuid) from public, anon;
grant execute on function public.w5_complete(uuid) to authenticated;
revoke execute on function public.w5_protect() from public, anon, authenticated;

-- 실시간: 학생 글이 바뀌면 선생님 화면에, 선생님 피드백은 학생 화면에 바로
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'w5_submissions') then
    alter publication supabase_realtime add table public.w5_submissions;
  end if;
end $$;

-- 처음 쓰는 맞춤법 목록 (선생님이 더 넣을 수 있어요)
insert into public.w5_spelling (wrong, right_word) values
  ('마셔다', '마셨다'), ('갓다', '갔다'), ('왓다', '왔다'), ('햇다', '했다'), ('놀앗다', '놀았다'),
  ('먹엇다', '먹었다'), ('되서', '돼서'), ('안되', '안 돼'), ('않했다', '안 했다'), ('어떻해', '어떡해'),
  ('몇일', '며칠'), ('금새', '금세'), ('희안하다', '희한하다'), ('웬지', '왠지'), ('설겆이', '설거지')
on conflict (wrong) do nothing;

-- 첫 주제 하나
insert into public.w5_tasks (title, guide, emoji)
select '주말에 한 일', '주말에 무엇을 했는지 육하원칙으로 써 보아요.', '🏞️'
where not exists (select 1 from public.w5_tasks);
