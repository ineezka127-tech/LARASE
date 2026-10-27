// js/lib/avatar.js 의 ITEMS 목록 → shop_items 표에 넣는 SQL (가격·레벨·능력치를 앱과 서버에서 똑같이 맞추기 위함)
// 사용: node tools/gen-shop-sql.mjs
const { ITEMS } = await import('../js/lib/avatar.js');
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const st = (i, k) => i.stats?.[k] || 0;
console.log('-- 상점 물건 목록 (자동 생성: tools/gen-shop-sql.mjs) — 직접 고치지 마세요');
console.log('insert into public.shop_items (id, slot, name, price, min_level, rarity, atk, def, hp, luck) values');
console.log(ITEMS.map((i) => `  (${q(i.id)}, ${q(i.slot)}, ${q(i.name)}, ${i.price}, ${i.level}, ${q(i.rarity)}, ${st(i, 'atk')}, ${st(i, 'def')}, ${st(i, 'hp')}, ${st(i, 'luck')})`).join(',\n'));
console.log('on conflict (id) do update set slot = excluded.slot, name = excluded.name, price = excluded.price, min_level = excluded.min_level,');
console.log('  rarity = excluded.rarity, atk = excluded.atk, def = excluded.def, hp = excluded.hp, luck = excluded.luck, active = true;');
