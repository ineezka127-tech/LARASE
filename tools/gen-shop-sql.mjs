// js/lib/avatar.js 의 ITEMS 목록 → shop_items 표에 넣는 SQL (가격·레벨을 앱과 서버에서 똑같이 맞추기 위함)
// 사용: node tools/gen-shop-sql.mjs > supabase/shop-items.sql
const { ITEMS } = await import('../js/lib/avatar.js');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
console.log('-- 자동 생성 파일 (tools/gen-shop-sql.mjs) — 직접 고치지 마세요');
console.log('insert into public.shop_items (id, slot, name, price, min_level) values');
console.log(ITEMS.map((i) => `  (${q(i.id)}, ${q(i.slot)}, ${q(i.name)}, ${i.price}, ${i.level})`).join(',\n'));
console.log('on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price, min_level = excluded.min_level;');
