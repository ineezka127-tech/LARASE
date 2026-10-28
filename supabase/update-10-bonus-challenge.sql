-- 업데이트 10: 🌟 보너스 도전 — 난이도 5 '심화'(가 그룹 보너스용) 허용
-- 업데이트 9 다음에 한 번 실행하세요. (여러 번 실행해도 괜찮아요)
alter table public.questions drop constraint if exists questions_difficulty_check;
alter table public.questions add constraint questions_difficulty_check check (difficulty between 1 and 5);
