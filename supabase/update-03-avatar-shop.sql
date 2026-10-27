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
