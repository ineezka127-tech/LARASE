// 🧑‍🎨 조합형 아바타 v2 (SVG로 직접 그림) — 동글동글한 얼굴 + RPG 장비
// cfg: { face, skin, eyes, brows, nose, mouth, cheek, hair, hairColor,
//        top, bottom, shoes, hat, glasses, held, shield, armor, acc, bg, pet }
// 전신 viewBox 0 -10 200 274 / 증명사진(상반신) viewBox 28 -6 144 144

export const SKINS = ['#ffe5d0', '#f9d1ab', '#ecb98f', '#cf9567', '#9a6443', '#64402a'];
export const HAIR_COLORS = ['#2b2220', '#5a3825', '#8b5a2b', '#d9a441', '#f3d572', '#c0392b', '#e979ad', '#4a7bd8', '#7b52c7', '#a7adb4'];

export const FACES = { round: '동그란 얼굴', oval: '갸름한 얼굴', square: '네모난 얼굴', chubby: '통통한 얼굴' };
export const EYES = { dot: '콩알 눈', round: '똘망 눈', big: '반짝 눈', lash: '속눈썹 눈', smile: '웃는 눈', wink: '윙크', sleepy: '졸린 눈', cool: '시크한 눈', star: '별 눈' };
export const BROWS = { soft: '순한 눈썹', thick: '진한 눈썹', up: '자신만만 눈썹', worried: '걱정 눈썹', none: '눈썹 없음' };
export const NOSES = { dot: '작은 코', round: '동글 코', tri: '세모 코', none: '코 없음' };
export const MOUTHS = { smile: '미소', cat: '고양이 입', grin: '활짝', teeth: '이 보이게 웃기', o: '오!', tongue: '메롱', pout: '삐죽', flat: '무표정' };
export const CHEEKS = { pink: '발그레', freckles: '주근깨', none: '없음' };
export const HAIRS = { short: '짧은 머리', side: '옆가르마', bob: '단발', long: '긴 머리', ponytail: '포니테일', pigtails: '양갈래', spiky: '삐죽 머리', curly: '곱슬 머리', buzz: '까까머리' };
export const BROW_COLORS = ['auto', '#2b2220', '#5a3825', '#8b5a2b', '#d9a441', '#a7adb4'];
export const NOSE_COLORS = ['auto', '#e8a598', '#c97c62', '#8f5c3c', '#ff8fa3'];

// 상점에서 사는 머리 모양·머리색·눈 (값 = 아이템 id)
export const PREMIUM = {
  hair: { ph_bun: '똥머리', ph_wavy: '웨이브 머리', ph_braid: '땋은 머리', ph_afro: '뽀글 아프로', ph_mohawk: '모히칸' },
  hairColor: { hc_mint: '민트', hc_silver: '은빛', hc_fire: '불꽃', hc_rainbow: '무지개', hc_galaxy: '우주' },
  eyes: { pe_heart: '하트 눈', pe_sparkle: '별빛 눈', pe_cat: '고양이 눈', pe_anime: '만화 눈' },
};
// 그라데이션 머리색: [대표색, 그라데이션 색들]
const HC = {
  hc_mint: ['#38d9a9', ['#63e6be', '#20c997']],
  hc_silver: ['#adb5bd', ['#f1f3f5', '#adb5bd', '#868e96']],
  hc_fire: ['#e8590c', ['#ffd43b', '#ff922b', '#e03131']],
  hc_rainbow: ['#9775fa', ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa']],
  hc_galaxy: ['#5f3dc4', ['#1c1a4a', '#5f3dc4', '#4dabf7']],
};

export const DEFAULT_AVATAR = {
  face: 'round', skin: SKINS[1], eyes: 'dot', brows: 'soft', browColor: 'auto', nose: 'dot', noseColor: 'auto', mouth: 'smile', cheek: 'pink',
  hair: 'short', hairColor: HAIR_COLORS[0],
  top: 't_blue', bottom: 'b_navy', shoes: 's_white', hat: null, glasses: null, held: null, shield: null, armor: null, acc: null, bg: 'bg_sky', pet: null,
};

// ---------- 능력치 ----------
export const STATS = { atk: ['⚔️', '공격'], def: ['🛡️', '방어'], hp: ['❤️', '체력'], luck: ['🍀', '행운'] };
export const RARITY = { common: ['일반', '#868e96'], rare: ['희귀', '#228be6'], epic: ['영웅', '#9c36b5'], legend: ['전설', '#f08c00'] };
export const BASE_STATS = { atk: 1, def: 1, hp: 10, luck: 1 };
export const STAT_PER_POINT = { atk: 1, def: 1, hp: 3, luck: 1 };

// ---------- 아이템 (가격·레벨·능력치는 서버 shop_items 표와 같아야 함 → tools/gen-shop-sql.mjs) ----------
export const SLOTS = {
  top: '상의', bottom: '하의', shoes: '신발', hat: '모자·투구', armor: '갑옷', held: '무기·소품', shield: '방패', acc: '장신구', glasses: '안경', bg: '배경', pet: '펫',
};

const I = (id, slot, name, price, level, rarity = 'common', stats = {}) => ({ id, slot, name, price, level, rarity, stats });
export const ITEMS = [
  // 상의
  I('t_blue', 'top', '파란 티셔츠', 0, 1), I('t_red', 'top', '빨간 티셔츠', 0, 1), I('t_yellow', 'top', '노란 티셔츠', 0, 1), I('t_green', 'top', '초록 티셔츠', 0, 1),
  I('t_stripe', 'top', '줄무늬 티셔츠', 40, 1), I('t_hoodie', 'top', '후드티', 80, 1), I('t_uniform', 'top', '교복 셔츠', 120, 2),
  I('t_jersey', 'top', '축구 유니폼', 150, 3, 'rare', { hp: 2 }), I('t_hanbok', 'top', '한복 저고리', 200, 5, 'rare', { luck: 2 }),
  I('t_hero', 'top', '슈퍼히어로 옷', 300, 7, 'epic', { atk: 2, def: 1 }), I('t_space', 'top', '우주복', 400, 10, 'epic', { def: 2, hp: 4 }),
  I('t_king', 'top', '임금님 망토', 600, 14, 'legend', { luck: 4, hp: 4 }),
  // 하의
  I('b_navy', 'bottom', '남색 바지', 0, 1), I('b_shorts', 'bottom', '회색 반바지', 0, 1), I('b_skirt', 'bottom', '분홍 치마', 0, 1),
  I('b_jeans', 'bottom', '청바지', 40, 1), I('b_training', 'bottom', '트레이닝 바지', 60, 1, 'common', { hp: 1 }),
  I('b_rainbow', 'bottom', '무지개 치마', 100, 3, 'rare', { luck: 1 }), I('b_hanbok', 'bottom', '한복 바지', 150, 5, 'rare', { luck: 1 }),
  I('b_hanbok_skirt', 'bottom', '한복 치마', 150, 5, 'rare', { luck: 1 }),
  // 신발
  I('s_white', 'shoes', '흰 운동화', 0, 1), I('s_black', 'shoes', '검은 운동화', 0, 1), I('s_red', 'shoes', '빨간 운동화', 30, 1),
  I('s_rain', 'shoes', '노란 장화', 50, 1, 'common', { def: 1 }), I('s_boots', 'shoes', '모험가 부츠', 60, 2, 'common', { def: 1, hp: 1 }),
  I('s_iron', 'shoes', '철 장화', 200, 5, 'rare', { def: 3 }), I('s_gold', 'shoes', '황금 신발', 300, 10, 'epic', { luck: 3, def: 1 }),
  // 모자·투구
  I('h_ribbon', 'hat', '리본', 40, 1), I('h_cap', 'hat', '야구 모자', 50, 1), I('h_beanie', 'hat', '털모자', 60, 1, 'common', { hp: 1 }),
  I('h_flower', 'hat', '꽃 머리띠', 70, 2, 'common', { luck: 1 }), I('h_headphone', 'hat', '헤드폰', 120, 3, 'rare', { luck: 1 }),
  I('h_leather', 'hat', '가죽 투구', 80, 2, 'common', { def: 1, hp: 2 }), I('h_iron', 'hat', '철 투구', 220, 5, 'rare', { def: 3, hp: 4 }),
  I('h_wizard', 'hat', '마법사 모자', 260, 6, 'epic', { atk: 2, luck: 3 }), I('h_knight', 'hat', '기사 투구', 380, 9, 'epic', { def: 5, hp: 6 }),
  I('h_crown', 'hat', '왕관', 500, 12, 'legend', { luck: 5, hp: 5 }), I('h_dragon', 'hat', '용 투구', 750, 15, 'legend', { def: 7, atk: 3, hp: 8 }),
  // 갑옷
  I('a_leather', 'armor', '가죽 갑옷', 100, 2, 'common', { def: 2, hp: 4 }), I('a_chain', 'armor', '사슬 갑옷', 240, 5, 'rare', { def: 4, hp: 6 }),
  I('a_robe', 'armor', '마법사 로브', 320, 7, 'epic', { atk: 3, luck: 3, hp: 4 }), I('a_knight', 'armor', '기사 갑옷', 450, 9, 'epic', { def: 7, hp: 10 }),
  I('a_gold', 'armor', '황금 갑옷', 850, 15, 'legend', { def: 10, hp: 14, luck: 3 }),
  // 무기·소품 (오른손)
  I('i_book', 'held', '책', 30, 1, 'common', { luck: 1 }), I('i_pencil', 'held', '연필', 30, 1, 'common', { atk: 1 }),
  I('i_balloon', 'held', '풍선', 60, 2, 'common', { luck: 1 }), I('i_wood_sword', 'held', '나무 칼', 50, 1, 'common', { atk: 2 }),
  I('i_hammer', 'held', '뿅망치', 160, 4, 'rare', { atk: 4 }), I('i_bow', 'held', '활', 220, 6, 'rare', { atk: 4, luck: 2 }),
  I('i_wand', 'held', '마법봉', 150, 5, 'rare', { atk: 3, luck: 2 }), I('i_sword', 'held', '용사의 검', 280, 7, 'epic', { atk: 6 }),
  I('i_staff', 'held', '대마법사 지팡이', 420, 10, 'epic', { atk: 6, luck: 3 }), I('i_trophy', 'held', '트로피', 300, 9, 'epic', { luck: 5 }),
  I('i_flame', 'held', '불꽃의 검', 800, 15, 'legend', { atk: 10, luck: 2 }),
  // 방패 (왼손)
  I('sh_wood', 'shield', '나무 방패', 60, 1, 'common', { def: 2 }), I('sh_iron', 'shield', '철 방패', 200, 4, 'rare', { def: 4 }),
  I('sh_star', 'shield', '별 방패', 260, 6, 'rare', { def: 3, luck: 3 }), I('sh_magic', 'shield', '마법 방패', 420, 9, 'epic', { def: 6, luck: 2 }),
  I('sh_dragon', 'shield', '용 방패', 780, 15, 'legend', { def: 9, hp: 6 }),
  // 장신구
  I('ac_medal', 'acc', '반짝 메달', 40, 1, 'common', { luck: 1 }), I('ac_scarf', 'acc', '빨간 목도리', 60, 1, 'common', { def: 1, hp: 2 }),
  I('ac_necklace', 'acc', '보석 목걸이', 140, 3, 'rare', { hp: 3, luck: 2 }), I('ac_angel', 'acc', '천사 날개', 420, 8, 'epic', { hp: 6, luck: 3 }),
  I('ac_dragon', 'acc', '용 날개', 700, 13, 'legend', { atk: 4, def: 4 }),
  // 안경
  I('g_round', 'glasses', '동그란 안경', 40, 1, 'common', { luck: 1 }), I('g_sun', 'glasses', '선글라스', 80, 2),
  I('g_star', 'glasses', '별 안경', 120, 4, 'rare', { luck: 2 }), I('g_heart', 'glasses', '하트 안경', 120, 4, 'rare', { hp: 2 }),
  // 배경
  I('bg_sky', 'bg', '하늘색', 0, 1), I('bg_pink', 'bg', '분홍색', 0, 1), I('bg_mint', 'bg', '민트색', 0, 1),
  I('bg_classroom', 'bg', '우리 교실', 80, 1), I('bg_park', 'bg', '공원', 100, 2), I('bg_night', 'bg', '별이 빛나는 밤', 150, 3),
  I('bg_rainbow', 'bg', '무지개', 200, 4), I('bg_castle', 'bg', '용사의 성', 300, 6, 'rare'), I('bg_space', 'bg', '우주', 250, 6),
  // 펫
  I('p_chick', 'pet', '병아리', 100, 1, 'common', { luck: 1 }), I('p_cat', 'pet', '고양이', 150, 2, 'common', { luck: 2 }),
  I('p_dog', 'pet', '강아지', 150, 2, 'common', { hp: 3 }), I('p_rabbit', 'pet', '토끼', 150, 3, 'common', { luck: 2 }),
  I('p_dino', 'pet', '공룡', 300, 6, 'rare', { atk: 2, hp: 2 }), I('p_unicorn', 'pet', '유니콘', 400, 9, 'epic', { luck: 4, hp: 2 }),
  I('p_dragon', 'pet', '아기 용', 600, 13, 'legend', { atk: 4, luck: 2 }),
  // 상점 전용 머리 모양 · 머리색 · 눈
  I('ph_bun', 'hair', '똥머리', 120, 1), I('ph_wavy', 'hair', '웨이브 머리', 150, 2), I('ph_braid', 'hair', '땋은 머리', 150, 3),
  I('ph_afro', 'hair', '뽀글 아프로', 220, 4, 'rare'), I('ph_mohawk', 'hair', '모히칸', 260, 6, 'rare'),
  I('hc_mint', 'hairColor', '민트 머리', 100, 1), I('hc_silver', 'hairColor', '은빛 머리', 160, 3, 'rare'), I('hc_fire', 'hairColor', '불꽃 머리', 240, 5, 'rare'),
  I('hc_rainbow', 'hairColor', '무지개 머리', 380, 8, 'epic'), I('hc_galaxy', 'hairColor', '우주 머리', 520, 11, 'legend'),
  I('pe_heart', 'eyes', '하트 눈', 90, 1), I('pe_sparkle', 'eyes', '별빛 눈', 140, 2), I('pe_cat', 'eyes', '고양이 눈', 180, 4, 'rare'), I('pe_anime', 'eyes', '만화 눈', 240, 6, 'rare'),
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// 장비 능력치 합계
export function gearStats(cfg) {
  const c = cleanCfg(cfg);
  const out = { atk: 0, def: 0, hp: 0, luck: 0 };
  for (const s of Object.keys(SLOTS)) {
    const st = ITEM[c[s]]?.stats || {};
    for (const k of Object.keys(out)) out[k] += st[k] || 0;
  }
  return out;
}

// 전체 능력치 = 기본 + 스탯 포인트 투자 + 장비
export function totalStats(profile, cfg = profile?.avatar_cfg) {
  const inv = profile?.stats || {};
  const gear = gearStats(cfg);
  const out = {};
  for (const k of Object.keys(BASE_STATS)) out[k] = BASE_STATS[k] + (inv[k] || 0) * STAT_PER_POINT[k] + gear[k];
  return out;
}

export function power(stats) {
  return stats.atk * 3 + stats.def * 2 + stats.hp + stats.luck * 2;
}

// 알 수 없는 값은 기본값으로 (그림에 들어가는 값은 모두 이 목록에서만 나옴)
export function cleanCfg(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const out = {
    face: pick(c.face, Object.keys(FACES), 'round'),
    skin: pick(c.skin, SKINS, SKINS[1]),
    eyes: pick(c.eyes, [...Object.keys(EYES), ...Object.keys(PREMIUM.eyes)], 'dot'),
    brows: pick(c.brows, Object.keys(BROWS), 'soft'),
    browColor: pick(c.browColor, BROW_COLORS, 'auto'),
    nose: pick(c.nose, Object.keys(NOSES), 'dot'),
    noseColor: pick(c.noseColor, NOSE_COLORS, 'auto'),
    mouth: pick(c.mouth, Object.keys(MOUTHS), 'smile'),
    cheek: pick(c.cheek, Object.keys(CHEEKS), 'pink'),
    hair: pick(c.hair, [...Object.keys(HAIRS), ...Object.keys(PREMIUM.hair)], 'short'),
    hairColor: pick(c.hairColor, [...HAIR_COLORS, ...Object.keys(PREMIUM.hairColor)], HAIR_COLORS[0]),
  };
  for (const s of Object.keys(SLOTS)) {
    out[s] = ITEM[c[s]]?.slot === s ? c[s] : (['top', 'bottom', 'shoes', 'bg'].includes(s) ? DEFAULT_AVATAR[s] : null);
  }
  return out;
}

// ---------- 그림: 도트(픽셀) 아바타 ----------
export { pixelAvatarSvg as avatarSvg } from './avatar-pixel.js';
