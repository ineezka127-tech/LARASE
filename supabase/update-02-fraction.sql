-- 업데이트 2: 분수 답 문제 유형 추가
-- 이미 schema.sql을 실행한 Supabase 프로젝트에서 한 번만 실행하세요.
-- (SQL Editor → New query → 붙여넣기 → Run)
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('ox', 'mcq', 'short', 'match', 'order', 'essay', 'frac'));
