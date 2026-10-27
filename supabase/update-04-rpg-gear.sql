-- =====================================================================
--  업데이트 4: ⚔️ RPG 장비(투구·갑옷·무기·방패·장신구) · 능력치 · 스탯 포인트 투자
--  SQL Editor → New query → 전체 붙여넣기 → Run  (여러 번 실행해도 안전)
--  ※ 업데이트 3(update-03-avatar-shop.sql)을 먼저 실행해 주세요.
-- =====================================================================

alter table public.shop_items add column if not exists rarity text not null default 'common';
alter table public.shop_items add column if not exists atk int not null default 0;
alter table public.shop_items add column if not exists def int not null default 0;
alter table public.shop_items add column if not exists hp int not null default 0;
alter table public.shop_items add column if not exists luck int not null default 0;

-- 스탯 포인트를 투자한 능력치 { atk, def, hp, luck }
alter table public.profiles add column if not exists stats jsonb not null default '{}';

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
  end if;
  return new;
end $$;

-- 💪 스탯 포인트 1개 투자
create or replace function public.allocate_stat(p_stat text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p profiles%rowtype;
  v_stats jsonb;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_stat not in ('atk', 'def', 'hp', 'luck') then raise exception '알 수 없는 능력치예요'; end if;
  select * into p from profiles where id = uid for update;
  if p.stat_points < 1 then raise exception '스탯 포인트가 없어요. 레벨을 올려 보세요!'; end if;
  v_stats := coalesce(p.stats, '{}') || jsonb_build_object(p_stat, coalesce((p.stats ->> p_stat)::int, 0) + 1);
  update profiles set stats = v_stats, stat_points = stat_points - 1 where id = uid;
  return jsonb_build_object('stats', v_stats, 'stat_points', p.stat_points - 1);
end $$;
grant execute on function public.allocate_stat(text) to authenticated;

-- 🧑‍🎨 아바타 저장 (새 칸: 눈썹·코·볼 / 방패·갑옷·장신구)
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
  foreach k in array array['face', 'skin', 'eyes', 'brows', 'nose', 'mouth', 'cheek', 'hair', 'hairColor'] loop
    v := p_cfg ->> k;
    if v is not null and char_length(v) <= 20 and v ~ '^[A-Za-z0-9_#]+$' then
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
  ('p_dragon', 'pet', '아기 용', 600, 13, 'legend', 4, 0, 0, 2)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price, min_level = excluded.min_level,
  rarity = excluded.rarity, atk = excluded.atk, def = excluded.def, hp = excluded.hp, luck = excluded.luck, active = true;
