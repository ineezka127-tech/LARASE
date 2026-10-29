-- 업데이트 11: 👀 실시간 지켜보기 (학생이 지금 푸는 문제·입력 중인 답)
-- 업데이트 10 다음에 한 번 실행하세요. (여러 번 실행해도 괜찮아요)

-- 학생마다 한 줄: 지금 보고 있는 화면과 문제, 입력 중인 답
create table if not exists public.live_status (
  user_id uuid primary key references public.profiles on delete cascade,
  page text,
  lesson_id uuid,
  title text,
  question_id uuid,
  q_index int,
  q_total int,
  draft jsonb,
  answered boolean not null default false,
  correct boolean,
  updated_at timestamptz not null default now(),
  constraint live_status_draft_size check (draft is null or pg_column_size(draft) < 4000),
  constraint live_status_title_len check (title is null or char_length(title) <= 200)
);
alter table public.live_status enable row level security;

-- 학생은 자기 줄만 쓰고, 선생님은 모두 읽어요 (학생끼리는 서로 못 봐요)
drop policy if exists "live read" on public.live_status;
create policy "live read" on public.live_status for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());
drop policy if exists "live insert" on public.live_status;
create policy "live insert" on public.live_status for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "live update" on public.live_status;
create policy "live update" on public.live_status for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.live_status from anon;
grant select, insert, update on public.live_status to authenticated;

-- 실시간으로 선생님 화면에 보내기
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_status') then
    alter publication supabase_realtime add table public.live_status;
  end if;
end $$;

-- 선생님 스위치: 지켜보기 켜기/끄기 (p_minutes = 0 이면 끄기), 입력 중인 답까지 볼지
create or replace function public.set_live_watch(p_minutes int, p_drafts boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_until timestamptz := now() + make_interval(mins => greatest(0, least(p_minutes, 720)));
begin
  if not public.is_teacher() then raise exception 'teacher only'; end if;
  insert into app_meta (key, done_at) values ('live_watch_until', v_until)
  on conflict (key) do update set done_at = excluded.done_at;
  insert into app_meta (key, done_at) values ('live_watch_drafts', case when p_drafts then v_until else now() end)
  on conflict (key) do update set done_at = excluded.done_at;
  return public.live_watch();
end $$;

-- 지금 지켜보기 중인지 (학생 화면이 확인해요)
create or replace function public.live_watch() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'on', coalesce((select done_at > now() from app_meta where key = 'live_watch_until'), false),
    'drafts', coalesce((select done_at > now() from app_meta where key = 'live_watch_drafts'), false),
    'until', (select done_at from app_meta where key = 'live_watch_until')
  )
$$;

revoke execute on function public.set_live_watch(int, boolean) from public, anon;
revoke execute on function public.live_watch() from public, anon;
grant execute on function public.set_live_watch(int, boolean) to authenticated;
grant execute on function public.live_watch() to authenticated;
