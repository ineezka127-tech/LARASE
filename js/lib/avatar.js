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

export const DEFAULT_AVATAR = {
  face: 'round', skin: SKINS[1], eyes: 'dot', brows: 'soft', nose: 'dot', mouth: 'smile', cheek: 'pink',
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
    eyes: pick(c.eyes, Object.keys(EYES), 'dot'),
    brows: pick(c.brows, Object.keys(BROWS), 'soft'),
    nose: pick(c.nose, Object.keys(NOSES), 'dot'),
    mouth: pick(c.mouth, Object.keys(MOUTHS), 'smile'),
    cheek: pick(c.cheek, Object.keys(CHEEKS), 'pink'),
    hair: pick(c.hair, Object.keys(HAIRS), 'short'),
    hairColor: pick(c.hairColor, HAIR_COLORS, HAIR_COLORS[0]),
  };
  for (const s of Object.keys(SLOTS)) {
    out[s] = ITEM[c[s]]?.slot === s ? c[s] : (['top', 'bottom', 'shoes', 'bg'].includes(s) ? DEFAULT_AVATAR[s] : null);
  }
  return out;
}

// ---------- 그리기 도우미 ----------
const OUT = '#3a2f3b';
const SW = 'stroke="#3a2f3b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
const star = (x, y, r, fill, extra = '') => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${p.join('L')}Z" fill="${fill}" ${extra}/>`;
};

// 머리 기준: 가운데 (100, 82), 반지름 50  →  꼭대기 y=32, 양옆 x=50/150
const HX = 100, HY = 82, HR = 50;

// ---------- 배경 ----------
function drawBg(id) {
  const full = (fill) => `<rect x="-10" y="-20" width="220" height="300" fill="${fill}"/>`;
  switch (id) {
    case 'bg_pink': return full('#ffe1ee');
    case 'bg_mint': return full('#d8f6ec');
    case 'bg_classroom':
      return full('#fff4dc') + `<rect x="0" y="196" width="200" height="74" fill="#e2c391"/>
        <rect x="26" y="26" width="148" height="72" rx="4" fill="#2f6b4f" stroke="#8a5a2b" stroke-width="5"/>
        <text x="100" y="70" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">1+1=2</text>`;
    case 'bg_park':
      return full('#cfeeff') + `<circle cx="168" cy="36" r="16" fill="#ffd54a"/><rect x="0" y="196" width="200" height="74" fill="#8fd16b"/>
        <rect x="14" y="140" width="10" height="60" fill="#8a5a2b"/><circle cx="19" cy="128" r="24" fill="#4caf50"/>
        <ellipse cx="56" cy="40" rx="20" ry="9" fill="#fff"/><ellipse cx="72" cy="35" rx="14" ry="9" fill="#fff"/>`;
    case 'bg_rainbow': {
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
      return full('#eaf6ff') + cols.map((c, i) => `<path d="M${-10 + i * 9} 222 A${110 - i * 9} ${110 - i * 9} 0 0 1 ${210 - i * 9} 222" fill="none" stroke="${c}" stroke-width="9"/>`).join('')
        + `<ellipse cx="18" cy="220" rx="28" ry="13" fill="#fff"/><ellipse cx="184" cy="220" rx="28" ry="13" fill="#fff"/>`;
    }
    case 'bg_night':
      return full('#1f2a5a') + `<circle cx="162" cy="40" r="15" fill="#fff6c9"/><circle cx="170" cy="35" r="13" fill="#1f2a5a"/>`
        + [[24, 28], [64, 54], [120, 20], [182, 104], [16, 120], [40, 180], [176, 176]].map(([x, y]) => star(x, y, 5, '#ffe680')).join('')
        + `<rect x="0" y="228" width="200" height="42" fill="#2c3b73"/>`;
    case 'bg_castle':
      return full('#ffe8cc') + `<rect x="0" y="200" width="200" height="70" fill="#a9e34b"/>
        <rect x="24" y="70" width="152" height="130" fill="#ced4da" stroke="#868e96" stroke-width="3"/>
        ${[24, 54, 84, 114, 144].map((x) => `<rect x="${x}" y="58" width="16" height="14" fill="#ced4da" stroke="#868e96" stroke-width="3"/>`).join('')}
        <path d="M84 200 L84 160 Q100 140 116 160 L116 200Z" fill="#8a5a2b"/>
        <path d="M100 20 L100 58 M100 20 L124 28 L100 36" stroke="#e03131" stroke-width="3" fill="#e03131"/>`;
    case 'bg_space':
      return full('#120d2e') + [[20, 20], [50, 80], [90, 24], [140, 64], [182, 18], [172, 150], [26, 160], [120, 196], [60, 226], [186, 236]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${1 + (i % 3)}" fill="#fff"/>`).join('')
        + `<circle cx="162" cy="56" r="18" fill="#f4a261"/><ellipse cx="162" cy="56" rx="30" ry="7" fill="none" stroke="#e9c46a" stroke-width="3"/><circle cx="32" cy="104" r="9" fill="#7fd1ff"/>`;
    default: return full('#dff0ff');
  }
}

// ---------- 등 뒤 (날개·망토) ----------
function drawBack(c) {
  let s = '';
  if (c.acc === 'ac_angel') {
    const wing = (dir) => `<path d="M${100 + dir * 18} 150 C${100 + dir * 60} 100 ${100 + dir * 92} 120 ${100 + dir * 86} 150 C${100 + dir * 92} 168 ${100 + dir * 64} 176 ${100 + dir * 50} 172 C${100 + dir * 60} 186 ${100 + dir * 36} 192 ${100 + dir * 20} 176 Z" fill="#fff" ${SW}/>`;
    s += wing(-1) + wing(1);
  }
  if (c.acc === 'ac_dragon') {
    const wing = (dir) => `<path d="M${100 + dir * 18} 148 L${100 + dir * 84} 104 L${100 + dir * 80} 132 L${100 + dir * 94} 140 L${100 + dir * 76} 158 L${100 + dir * 86} 172 L${100 + dir * 22} 178 Z" fill="#c92a2a" ${SW}/><path d="M${100 + dir * 30} 160 L${100 + dir * 80} 116 M${100 + dir * 30} 166 L${100 + dir * 84} 150" stroke="#862e2e" stroke-width="2"/>`;
    s += wing(-1) + wing(1);
  }
  if (c.top === 't_hero') s += `<path d="M70 132 L58 236 L142 236 L130 132 Z" fill="#e63946" ${SW}/>`;
  if (c.top === 't_king') s += `<path d="M68 130 L50 240 L150 240 L132 130 Z" fill="#7b2cbf" ${SW}/><path d="M50 240 L150 240 L148 230 L52 230Z" fill="#fff"/>`;
  return s;
}

// ---------- 머리카락 ----------
// 바깥선은 머리(반지름 50)보다 6~8 크게 둘러서 정수리와 옆머리를 감쌉니다
const HAIR_TOP = 'M44 94 C40 52 62 24 100 24 C138 24 160 52 156 94';

function hairBack(style, color) {
  const s = `fill="${color}" ${SW}`;
  switch (style) {
    case 'long': return `<path d="M44 90 C40 50 62 24 100 24 C138 24 160 50 156 90 L162 172 C138 186 62 186 38 172 Z" ${s}/>`;
    case 'bob': return `<path d="M42 92 C38 50 62 22 100 22 C138 22 162 50 158 92 L160 128 C144 138 56 138 40 128 Z" ${s}/>`;
    case 'ponytail': return `<path d="M136 44 C176 40 188 92 164 132 C170 100 160 74 140 66 Z" ${s}/>`;
    case 'pigtails': return `<circle cx="44" cy="72" r="16" ${s}/><circle cx="156" cy="72" r="16" ${s}/>
      <path d="M38 86 C28 110 34 134 42 142 C46 122 50 106 52 90Z" ${s}/><path d="M162 86 C172 110 166 134 158 142 C154 122 150 106 148 90Z" ${s}/>`;
    case 'curly': return `<path d="M40 104 C34 50 62 20 100 20 C138 20 166 50 160 104 L158 120 C142 130 58 130 42 120 Z" ${s}/>`;
    default: return '';
  }
}

function hairFront(style, color) {
  const s = `fill="${color}" ${SW}`;
  switch (style) {
    case 'short': return `<path d="${HAIR_TOP} C152 74 140 62 124 62 C116 56 100 56 92 60 C78 56 62 62 54 72 C49 78 46 86 44 94 Z" ${s}/>`;
    case 'side': return `<path d="${HAIR_TOP} C152 76 146 66 134 62 C112 64 86 60 70 46 C60 62 50 78 44 94 Z" ${s}/>`;
    case 'bob':
    case 'long':
    case 'ponytail':
    case 'pigtails': return `<path d="${HAIR_TOP} C152 78 146 66 134 60 C124 68 112 64 104 56 C94 66 78 66 70 58 C58 66 48 80 44 94 Z" ${s}/>`;
    case 'spiky': return `<path d="M44 94 L38 52 L56 52 L58 22 L78 34 L90 10 L106 30 L120 12 L128 34 L146 22 L144 52 L162 52 L156 94 C146 70 124 62 100 62 C76 62 54 70 44 94 Z" ${s}/>`;
    case 'curly': {
      const bumps = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i * Math.PI) / 8;
        bumps.push([HX + 52 * Math.cos(a), HY - 4 + 52 * Math.sin(a)]);
      }
      return `<path d="${HAIR_TOP} C140 68 60 68 44 94 Z" fill="${color}"/>`
        + [...bumps, [78, 58], [100, 54], [122, 58]].map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${color}" stroke="${OUT}" stroke-width="2"/>`).join('');
    }
    case 'buzz': return `<path d="M48 84 C46 50 66 30 100 30 C134 30 154 50 152 84 C134 66 66 66 48 84 Z" fill="${color}" opacity="0.85" ${SW}/>`;
    default: return '';
  }
}

// ---------- 얼굴 ----------
function headShape(face, skin) {
  const s = `fill="${skin}" ${SW}`;
  const ears = `<ellipse cx="51" cy="92" rx="8" ry="10" ${s}/><ellipse cx="149" cy="92" rx="8" ry="10" ${s}/>`;
  switch (face) {
    case 'oval': return ears + `<ellipse cx="${HX}" cy="${HY}" rx="46" ry="52" ${s}/>`;
    case 'square': return ears + `<rect x="52" y="32" width="96" height="98" rx="34" ${s}/>`;
    case 'chubby': return ears + `<path d="M52 82 C52 40 148 40 148 82 C154 114 134 134 100 134 C66 134 46 114 52 82 Z" ${s}/>`;
    default: return ears + `<circle cx="${HX}" cy="${HY}" r="${HR}" ${s}/>`;
  }
}

const EX = [80, 120], EY = 90;   // 눈 위치 (동물의 숲처럼 얼굴 아래쪽에 넓게)

function drawEyes(style) {
  const [L, R] = EX, Y = EY;
  switch (style) {
    case 'round': return EX.map((x) => `<ellipse cx="${x}" cy="${Y}" rx="7.5" ry="8.5" fill="#fff" ${SW}/><circle cx="${x + 1}" cy="${Y + 1}" r="4.5" fill="${OUT}"/><circle cx="${x + 2.5}" cy="${Y - 1}" r="1.6" fill="#fff"/>`).join('');
    case 'big': return EX.map((x) => `<ellipse cx="${x}" cy="${Y}" rx="7" ry="9" fill="${OUT}"/><circle cx="${x + 2.5}" cy="${Y - 3}" r="3" fill="#fff"/><circle cx="${x - 2}" cy="${Y + 3}" r="1.4" fill="#fff"/>`).join('');
    case 'lash': return EX.map((x, i) => {
      const d = i ? 1 : -1;
      return `<ellipse cx="${x}" cy="${Y}" rx="4.5" ry="6" fill="${OUT}"/><circle cx="${x + 1.5}" cy="${Y - 2}" r="1.6" fill="#fff"/>`
        + `<path d="M${x + d * 4} ${Y - 4} L${x + d * 9} ${Y - 7} M${x + d * 4.5} ${Y - 1} L${x + d * 9.5} ${Y - 2}" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`;
    }).join('');
    case 'smile': return EX.map((x) => `<path d="M${x - 6} ${Y + 2} Q${x} ${Y - 6} ${x + 6} ${Y + 2}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`).join('');
    case 'wink': return `<ellipse cx="${L}" cy="${Y}" rx="4" ry="5.5" fill="${OUT}"/><circle cx="${L + 1.4}" cy="${Y - 2}" r="1.5" fill="#fff"/><path d="M${R - 6} ${Y} L${R + 6} ${Y - 3} M${R - 6} ${Y} L${R + 6} ${Y + 3}" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
    case 'sleepy': return EX.map((x) => `<path d="M${x - 6} ${Y} Q${x} ${Y + 5} ${x + 6} ${Y}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`).join('');
    case 'cool': return EX.map((x) => `<path d="M${x - 7} ${Y - 2} L${x + 7} ${Y - 2}" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/><path d="M${x - 5} ${Y - 2} Q${x} ${Y + 7} ${x + 5} ${Y - 2} Z" fill="${OUT}"/>`).join('');
    case 'star': return EX.map((x) => star(x, Y, 8, '#ffb703', `stroke="${OUT}" stroke-width="1.5"`)).join('');
    default: return EX.map((x) => `<ellipse cx="${x}" cy="${Y}" rx="4" ry="5.5" fill="${OUT}"/><circle cx="${x + 1.4}" cy="${Y - 2}" r="1.5" fill="#fff"/>`).join('');
  }
}

function drawBrows(style, hairColor) {
  const col = hairColor === '#f3d572' || hairColor === '#a7adb4' ? '#8b6b3b' : OUT;
  const Y = EY - 13;
  const line = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  switch (style) {
    case 'thick': return line(`M73 ${Y} Q80 ${Y - 3} 87 ${Y}`, 4.5) + line(`M113 ${Y} Q120 ${Y - 3} 127 ${Y}`, 4.5);
    case 'up': return line(`M73 ${Y + 1} L87 ${Y - 3}`, 3.2) + line(`M113 ${Y - 3} L127 ${Y + 1}`, 3.2);
    case 'worried': return line(`M73 ${Y - 3} L87 ${Y + 1}`) + line(`M113 ${Y + 1} L127 ${Y - 3}`);
    case 'none': return '';
    default: return line(`M74 ${Y} Q80 ${Y - 2.5} 86 ${Y}`) + line(`M114 ${Y} Q120 ${Y - 2.5} 126 ${Y}`);
  }
}

function drawNose(style, skin) {
  const shade = shadeColor(skin, 0.22);
  switch (style) {
    case 'round': return `<ellipse cx="100" cy="100" rx="5" ry="4" fill="${shade}"/>`;
    case 'tri': return `<path d="M96 101 L104 101 L100 96 Z" fill="${shade}" stroke="${shade}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'none': return '';
    default: return `<ellipse cx="100" cy="100" rx="2.6" ry="2" fill="${shade}"/>`;
  }
}

function drawMouth(style) {
  const Y = 110;
  switch (style) {
    case 'cat': return `<path d="M91 ${Y - 1} Q95.5 ${Y + 5} 100 ${Y - 1} Q104.5 ${Y + 5} 109 ${Y - 1}" fill="none" ${SW} stroke-width="2.4"/>`;
    case 'grin': return `<path d="M90 ${Y - 3} L110 ${Y - 3} Q109 ${Y + 9} 100 ${Y + 9} Q91 ${Y + 9} 90 ${Y - 3} Z" fill="#b5373c" ${SW}/><path d="M94 ${Y + 4} Q100 ${Y + 1} 106 ${Y + 4} Q103 ${Y + 8} 100 ${Y + 8} Q97 ${Y + 8} 94 ${Y + 4}Z" fill="#ff8fa3"/>`;
    case 'teeth': return `<path d="M88 ${Y - 3} L112 ${Y - 3} Q110 ${Y + 10} 100 ${Y + 10} Q90 ${Y + 10} 88 ${Y - 3} Z" fill="#fff" ${SW}/><path d="M89 ${Y + 1} L111 ${Y + 1}" stroke="${OUT}" stroke-width="1.2"/>`;
    case 'o': return `<ellipse cx="100" cy="${Y + 1}" rx="4" ry="5" fill="#b5373c" ${SW}/>`;
    case 'tongue': return `<path d="M92 ${Y - 1} Q100 ${Y + 6} 108 ${Y - 1}" fill="none" ${SW} stroke-width="2.4"/><path d="M97 ${Y + 2} Q97 ${Y + 10} 101 ${Y + 10} Q105 ${Y + 10} 104 ${Y + 2}" fill="#ff7b9c" ${SW}/>`;
    case 'pout': return `<path d="M95 ${Y + 2} Q100 ${Y - 3} 105 ${Y + 2}" fill="none" ${SW} stroke-width="2.4"/>`;
    case 'flat': return `<path d="M94 ${Y + 1} L106 ${Y + 1}" ${SW} stroke-width="2.4"/>`;
    default: return `<path d="M93 ${Y - 1} Q100 ${Y + 6} 107 ${Y - 1}" fill="none" ${SW} stroke-width="2.4"/>`;
  }
}

function drawCheeks(style) {
  if (style === 'none') return '';
  if (style === 'freckles') return [[66, 102], [71, 105], [68, 108], [134, 102], [129, 105], [132, 108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#a0603c"/>`).join('');
  return `<ellipse cx="68" cy="104" rx="8" ry="4.5" fill="#ff8fa3" opacity="0.45"/><ellipse cx="132" cy="104" rx="8" ry="4.5" fill="#ff8fa3" opacity="0.45"/>`;
}

function shadeColor(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * (1 - k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

// ---------- 몸 ----------
// 몸통 y 124~198, 팔은 어깨(74,134)/(126,134)에서 손(57,186)/(143,186)으로. 팔을 먼저 그리고 몸통이 어깨를 덮어서 붙어 보이게.
const TOP_COLORS = {
  t_blue: '#4d96ff', t_red: '#ff6b6b', t_yellow: '#ffd43b', t_green: '#51cf66', t_stripe: '#ffffff', t_hoodie: '#9775fa',
  t_uniform: '#ffffff', t_jersey: '#1c7ed6', t_hanbok: '#ff8fab', t_hero: '#1c3faa', t_space: '#f1f3f5', t_king: '#ffd43b',
};
const LONG_SLEEVE = ['t_hoodie', 't_uniform', 't_hanbok', 't_hero', 't_space', 't_king'];
const ARM = { l: [74, 136, 58, 184], r: [126, 136, 142, 184] };

function limb(x1, y1, x2, y2, color, w = 15) {
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${OUT}" stroke-width="${w + 4.4}" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

function drawArms(top, skin) {
  const col = TOP_COLORS[top] || '#4d96ff';
  const long = LONG_SLEEVE.includes(top);
  let s = '';
  for (const [x1, y1, x2, y2] of Object.values(ARM)) {
    s += limb(x1, y1, x2, y2, skin);
    // 소매
    const t = long ? 0.86 : 0.42;
    s += limb(x1, y1, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, top === 't_space' ? '#e9ecef' : col, 16);
    s += `<circle cx="${x2 + (x2 < 100 ? -1 : 1)}" cy="${y2 + 3}" r="8" fill="${skin}" ${SW}/>`;
  }
  return s;
}

function drawTorso(id) {
  const col = TOP_COLORS[id] || '#4d96ff';
  const body = `<path d="M68 146 Q68 126 86 124 L114 124 Q132 126 132 146 L134 198 L66 198 Z" fill="${col}" ${SW}/>`;
  switch (id) {
    case 't_stripe': return body + [140, 156, 172, 188].map((y) => `<path d="M${y > 180 ? 67 : 68} ${y} L${y > 180 ? 133 : 132} ${y}" stroke="#4dabf7" stroke-width="7"/>`).join('') + `<path d="M68 146 Q68 126 86 124 L114 124 Q132 126 132 146 L134 198 L66 198 Z" fill="none" ${SW}/>`;
    case 't_hoodie': return body + `<path d="M84 125 Q100 146 116 125" fill="none" stroke="#6741d9" stroke-width="3"/><rect x="84" y="168" width="32" height="18" rx="6" fill="#845ef7" ${SW}/><path d="M95 132 L94 150 M105 132 L106 150" stroke="#fff" stroke-width="2"/>`;
    case 't_uniform': return body + `<path d="M88 124 L100 140 L112 124" fill="#fff" ${SW}/><path d="M97 138 L103 138 L106 168 L100 176 L94 168 Z" fill="#c92a2a" ${SW}/>`;
    case 't_jersey': return body + `<text x="100" y="178" font-size="28" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">10</text><path d="M68 148 L132 148" stroke="#fff" stroke-width="4"/>`;
    case 't_hanbok': return body + `<path d="M88 125 L112 158 L132 140" fill="none" stroke="#fff" stroke-width="5"/><path d="M106 150 Q118 168 112 194 M108 150 Q100 174 104 196" stroke="#d6336c" stroke-width="4" fill="none"/>`;
    case 't_hero': return body + `<path d="M85 148 L100 138 L115 148 L108 168 L92 168 Z" fill="#ffd43b" ${SW}/><text x="100" y="162" font-size="14" font-weight="900" fill="#e63946" text-anchor="middle" font-family="sans-serif">S</text><rect x="66" y="188" width="68" height="8" fill="#ffd43b"/>`;
    case 't_space': return body + `<rect x="82" y="144" width="36" height="26" rx="4" fill="#4dabf7" ${SW}/><circle cx="90" cy="157" r="3" fill="#ff6b6b"/><circle cx="100" cy="157" r="3" fill="#ffd43b"/><circle cx="110" cy="157" r="3" fill="#51cf66"/>`;
    case 't_king': return body + `<path d="M72 125 Q100 148 128 125 L128 134 Q100 158 72 134Z" fill="#fff"/>`;
    default: return body;
  }
}

function drawLegs(bottom, skin) {
  // 다리 (왼 83, 오른 117), 허리 194 ~ 발목 244
  return `<rect x="73" y="196" width="20" height="48" fill="${skin}" ${SW}/><rect x="107" y="196" width="20" height="48" fill="${skin}" ${SW}/>`;
}

function drawBottom(id) {
  const pants = (c, extra = '') => `<path d="M66 194 L134 194 L133 240 L104 240 L100 212 L96 240 L67 240 Z" fill="${c}" ${SW}/>${extra}`;
  switch (id) {
    case 'b_shorts': return `<path d="M66 194 L134 194 L134 214 L104 214 L100 206 L96 214 L66 214 Z" fill="#868e96" ${SW}/>`;
    case 'b_skirt': return `<path d="M68 194 L132 194 L142 224 L58 224 Z" fill="#f783ac" ${SW}/>`;
    case 'b_jeans': return pants('#4c6ef5', `<path d="M82 202 L82 210 M118 202 L118 210" stroke="#dbe4ff" stroke-width="2"/>`);
    case 'b_training': return pants('#343a40', `<path d="M70 196 L70 238 M130 196 L130 238" stroke="#fff" stroke-width="3"/>`);
    case 'b_rainbow': return `<path d="M68 194 L132 194 L142 224 L58 224 Z" fill="#ffe066" ${SW}/>`
      + ['#ff6b6b', '#ffa94d', '#69db7c', '#4dabf7'].map((c, i) => `<path d="M${67 - i * 2.5} ${201 + i * 6} L${133 + i * 2.5} ${201 + i * 6}" stroke="${c}" stroke-width="4.5"/>`).join('');
    case 'b_hanbok': return pants('#748ffc', `<path d="M66 196 L134 196" stroke="#5c7cfa" stroke-width="6"/>`);
    case 'b_hanbok_skirt': return `<path d="M64 188 L136 188 L150 246 L50 246 Z" fill="#4263eb" ${SW}/><path d="M64 190 L136 190" stroke="#fff" stroke-width="5"/>`;
    default: return pants('#364fc7');
  }
}

function drawShoes(id) {
  const col = { s_white: '#f8f9fa', s_black: '#343a40', s_red: '#e03131', s_rain: '#fcc419', s_boots: '#8d5a2b', s_iron: '#adb5bd', s_gold: '#fab005' }[id] || '#f8f9fa';
  const boot = ['s_rain', 's_boots', 's_iron'].includes(id);
  // 운동화는 발목(238)부터, 부츠는 정강이 중간(226)부터
  const one = (x) => (boot
    ? `<path d="M${x - 12} 226 L${x + 12} 226 L${x + 13} 248 Q${x + 15} 256 ${x + 8} 256 L${x - 8} 256 Q${x - 15} 256 ${x - 13} 248 Z" fill="${col}" ${SW}/><path d="M${x - 12} 232 L${x + 12} 232" stroke="${OUT}" stroke-width="1.5" opacity="0.45"/>`
    : `<path d="M${x - 15} 255 Q${x - 16} 239 ${x} 239 Q${x + 16} 239 ${x + 15} 255 Z" fill="${col}" ${SW}/><path d="M${x - 15} 255 L${x + 15} 255" stroke="${OUT}" stroke-width="2.4"/><path d="M${x - 5} 244 L${x + 5} 244" stroke="${OUT}" stroke-width="1.5" opacity="0.4"/>`);
  const shine = id === 's_gold' ? `<circle cx="78" cy="246" r="2" fill="#fff"/><circle cx="112" cy="246" r="2" fill="#fff"/>` : '';
  return one(83) + one(117) + shine;
}

// ---------- 갑옷 (몸통 위) ----------
function drawArmor(id) {
  const pad = (fill) => `<ellipse cx="72" cy="134" rx="15" ry="11" fill="${fill}" ${SW}/><ellipse cx="128" cy="134" rx="15" ry="11" fill="${fill}" ${SW}/>`;
  switch (id) {
    case 'a_leather': return `<path d="M72 132 L128 132 L130 194 L70 194 Z" fill="#a0522d" ${SW}/><path d="M100 134 L100 192" stroke="#6b3a1e" stroke-width="2"/>${[146, 162, 178].map((y) => `<circle cx="94" cy="${y}" r="1.8" fill="#ffd8a8"/><circle cx="106" cy="${y}" r="1.8" fill="#ffd8a8"/>`).join('')}<rect x="68" y="186" width="64" height="9" fill="#6b3a1e" ${SW}/>`;
    case 'a_chain': return `<path d="M70 130 L130 130 L132 196 L68 196 Z" fill="#adb5bd" ${SW}/>`
      + [140, 150, 160, 170, 180].map((y) => `<path d="M72 ${y} ${Array.from({ length: 10 }, (_, i) => `Q${75 + i * 6} ${y + 5} ${78 + i * 6} ${y}`).join(' ')}" fill="none" stroke="#868e96" stroke-width="1.5"/>`).join('') + pad('#868e96') + `<rect x="68" y="188" width="64" height="8" fill="#495057" ${SW}/>`;
    case 'a_robe': return `<path d="M70 128 L130 128 L146 238 L54 238 Z" fill="#5f3dc4" ${SW}/><path d="M100 132 L100 236" stroke="#ffd43b" stroke-width="3"/>${star(82, 170, 6, '#ffd43b')}${star(120, 206, 5, '#ffd43b')}${star(84, 222, 4, '#ffd43b')}<rect x="66" y="180" width="68" height="7" fill="#ffd43b"/>`;
    case 'a_knight': return `<path d="M72 128 L128 128 Q134 160 126 194 L74 194 Q66 160 72 128 Z" fill="#dee2e6" ${SW}/><path d="M80 138 Q100 150 120 138 L118 160 Q100 170 82 160 Z" fill="#f1f3f5" ${SW}/><path d="M100 140 L100 190" stroke="#868e96" stroke-width="2"/>${pad('#ced4da')}<rect x="70" y="186" width="60" height="8" fill="#495057" ${SW}/><circle cx="100" cy="190" r="4" fill="#fab005" ${SW}/>`;
    case 'a_gold': return `<path d="M72 128 L128 128 Q134 160 126 194 L74 194 Q66 160 72 128 Z" fill="#fcc419" ${SW}/><path d="M80 138 Q100 150 120 138 L118 160 Q100 170 82 160 Z" fill="#ffe066" ${SW}/><path d="M92 152 L100 144 L108 152 L100 162 Z" fill="#e03131" ${SW}/>${pad('#fab005')}<rect x="70" y="186" width="60" height="8" fill="#e67700" ${SW}/>`;
    default: return '';
  }
}

// ---------- 장신구 (앞쪽) ----------
function drawAccFront(id) {
  switch (id) {
    case 'ac_medal': return `<path d="M92 126 L100 146 L108 126" fill="none" stroke="#1c7ed6" stroke-width="4"/><circle cx="100" cy="152" r="8" fill="#fab005" ${SW}/>${star(100, 152, 4.5, '#fff')}`;
    case 'ac_scarf': return `<path d="M76 124 Q100 140 124 124 L126 134 Q100 150 74 134 Z" fill="#e03131" ${SW}/><path d="M112 134 L118 164 L108 166 L104 138 Z" fill="#e03131" ${SW}/>`;
    case 'ac_necklace': return `<path d="M84 126 Q100 148 116 126" fill="none" stroke="#fab005" stroke-width="2.5"/><path d="M100 140 L106 147 L100 156 L94 147 Z" fill="#4dabf7" ${SW}/>`;
    default: return '';
  }
}

// ---------- 안경 ----------
function drawGlasses(id) {
  const Y = EY;
  switch (id) {
    case 'g_round': return `<circle cx="80" cy="${Y}" r="11" fill="rgba(255,255,255,0.25)" stroke="${OUT}" stroke-width="2.5"/><circle cx="120" cy="${Y}" r="11" fill="rgba(255,255,255,0.25)" stroke="${OUT}" stroke-width="2.5"/><path d="M91 ${Y} L109 ${Y} M69 ${Y - 2} L54 ${Y - 4} M131 ${Y - 2} L146 ${Y - 4}" stroke="${OUT}" stroke-width="2.5"/>`;
    case 'g_sun': return `<path d="M66 ${Y - 8} L94 ${Y - 8} L92 ${Y + 6} Q80 ${Y + 12} 68 ${Y + 6} Z M106 ${Y - 8} L134 ${Y - 8} L132 ${Y + 6} Q120 ${Y + 12} 108 ${Y + 6} Z" fill="#212529" stroke="${OUT}" stroke-width="2"/><path d="M94 ${Y - 6} L106 ${Y - 6} M66 ${Y - 7} L54 ${Y - 8} M134 ${Y - 7} L146 ${Y - 8}" stroke="${OUT}" stroke-width="2.5"/><path d="M72 ${Y - 4} L78 ${Y - 4}" stroke="#fff" stroke-width="2"/>`;
    case 'g_star': return EX.map((x) => star(x, Y, 13, 'rgba(255,212,59,0.55)', 'stroke="#f08c00" stroke-width="2.5"')).join('') + `<path d="M93 ${Y} L107 ${Y}" stroke="#f08c00" stroke-width="2.5"/>`;
    case 'g_heart': return EX.map((x) => `<path d="M${x} ${Y + 10} C${x - 16} ${Y} ${x - 12} ${Y - 14} ${x} ${Y - 6} C${x + 12} ${Y - 14} ${x + 16} ${Y} ${x} ${Y + 10} Z" fill="rgba(255,107,157,0.55)" stroke="#d6336c" stroke-width="2.5"/>`).join('') + `<path d="M93 ${Y - 2} L107 ${Y - 2}" stroke="#d6336c" stroke-width="2.5"/>`;
    default: return '';
  }
}

// ---------- 모자·투구 (머리카락보다 넓게: x 36~164) ----------
function drawHat(id) {
  switch (id) {
    case 'h_ribbon': return `<path d="M128 40 L110 28 L112 54 Z M128 40 L146 28 L144 54 Z" fill="#ff6b9d" ${SW}/><circle cx="128" cy="41" r="5.5" fill="#f06595" ${SW}/>`;
    case 'h_cap': return `<path d="M38 66 C36 18 64 6 100 6 C136 6 164 18 162 66 Z" fill="#e03131" ${SW}/><path d="M34 64 Q100 90 166 64 L164 58 Q100 78 36 58 Z" fill="#c92a2a" ${SW}/><path d="M100 8 L100 64" stroke="#c92a2a" stroke-width="2"/><circle cx="100" cy="8" r="4" fill="#c92a2a" ${SW}/>`;
    case 'h_beanie': return `<path d="M36 70 C34 16 64 2 100 2 C136 2 166 16 164 70 Z" fill="#20c997" ${SW}/><rect x="34" y="58" width="132" height="16" rx="8" fill="#12b886" ${SW}/>${[52, 72, 92, 112, 132, 150].map((x) => `<path d="M${x} 60 L${x} 72" stroke="#0ca678" stroke-width="2"/>`).join('')}<circle cx="100" cy="6" r="9" fill="#fff" ${SW}/>`;
    case 'h_flower': return `<path d="M44 74 C50 30 150 30 156 74" fill="none" stroke="#69db7c" stroke-width="5"/>` + [[48, 60, '#ff8787'], [64, 40, '#ffd43b'], [84, 30, '#da77f2'], [104, 28, '#ff8787'], [124, 32, '#ffd43b'], [142, 44, '#da77f2'], [154, 62, '#ff8787']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${c}" ${SW}/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/>`).join('');
    case 'h_headphone': return `<path d="M44 90 C40 14 160 14 156 90" fill="none" stroke="#343a40" stroke-width="8"/><rect x="34" y="76" width="18" height="30" rx="8" fill="#e64980" ${SW}/><rect x="148" y="76" width="18" height="30" rx="8" fill="#e64980" ${SW}/>`;
    case 'h_leather': return `<path d="M36 76 C34 14 64 0 100 0 C136 0 166 14 164 76 L152 78 C150 60 128 52 100 52 C72 52 50 60 48 78 Z" fill="#a0522d" ${SW}/><path d="M100 2 L100 52" stroke="#6b3a1e" stroke-width="3"/><path d="M40 64 Q100 44 160 64" fill="none" stroke="#6b3a1e" stroke-width="3"/>`;
    case 'h_iron': return `<path d="M36 80 C34 14 64 0 100 0 C136 0 166 14 164 80 L152 82 C150 62 128 54 100 54 C72 54 50 62 48 82 Z" fill="#ced4da" ${SW}/><path d="M96 54 L104 54 L103 84 L97 84 Z" fill="#adb5bd" ${SW}/><path d="M38 62 Q100 40 162 62" fill="none" stroke="#868e96" stroke-width="4"/>${[50, 70, 130, 150].map((x) => `<circle cx="${x}" cy="${x < 100 ? 58 - (x - 50) * 0.3 : 52 + (x - 130) * 0.3}" r="2" fill="#495057"/>`).join('')}`;
    case 'h_knight': return `<path d="M100 -4 C112 -4 120 6 118 14 C110 8 104 10 100 4 Z" fill="#e03131" ${SW}/><path d="M36 84 C34 16 64 2 100 2 C136 2 166 16 164 84 L150 86 C148 64 128 56 100 56 C72 56 52 64 50 86 Z" fill="#dee2e6" ${SW}/><path d="M60 40 Q100 24 140 40" fill="none" stroke="#adb5bd" stroke-width="3"/><path d="M96 56 L104 56 L103 88 L97 88 Z" fill="#ced4da" ${SW}/><circle cx="100" cy="22" r="5" fill="#fab005" ${SW}/>`;
    case 'h_dragon': return `<path d="M50 40 L24 4 L62 26 Z M150 40 L176 4 L138 26 Z" fill="#fff4e6" ${SW}/><path d="M36 84 C34 16 64 2 100 2 C136 2 166 16 164 84 L150 86 C148 64 128 56 100 56 C72 56 52 64 50 86 Z" fill="#c92a2a" ${SW}/><path d="M70 32 L100 18 L130 32 L100 46 Z" fill="#fab005" ${SW}/><circle cx="100" cy="32" r="5" fill="#40c057" ${SW}/>`;
    case 'h_wizard': return `<path d="M58 54 L106 2 L144 54 Z" fill="#5f3dc4" ${SW}/><ellipse cx="100" cy="58" rx="68" ry="12" fill="#5f3dc4" ${SW}/>${star(100, 32, 7, '#ffd43b')}<circle cx="84" cy="44" r="3" fill="#ffd43b"/>`;
    case 'h_crown': return `<path d="M60 48 L60 14 L80 32 L100 6 L120 32 L140 14 L140 48 Z" fill="#fcc419" ${SW}/><rect x="58" y="42" width="84" height="10" rx="3" fill="#fab005" ${SW}/><circle cx="100" cy="34" r="5" fill="#e03131"/><circle cx="78" cy="40" r="3.5" fill="#4dabf7"/><circle cx="122" cy="40" r="3.5" fill="#51cf66"/>`;
    default: return '';
  }
}

// ---------- 방패 (왼손, 화면 왼쪽) ----------
function drawShield(id) {
  const cx = 48, cy = 180;
  switch (id) {
    case 'sh_wood': return `<circle cx="${cx}" cy="${cy}" r="21" fill="#c08457" ${SW}/><circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="#8a5a2b" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="5" fill="#adb5bd" ${SW}/>`;
    case 'sh_iron': return `<path d="M${cx - 20} ${cy - 22} L${cx + 20} ${cy - 22} L${cx + 20} ${cy} Q${cx + 18} ${cy + 20} ${cx} ${cy + 28} Q${cx - 18} ${cy + 20} ${cx - 20} ${cy} Z" fill="#ced4da" ${SW}/><path d="M${cx} ${cy - 20} L${cx} ${cy + 24} M${cx - 18} ${cy - 4} L${cx + 18} ${cy - 4}" stroke="#868e96" stroke-width="3"/>`;
    case 'sh_star': return `<circle cx="${cx}" cy="${cy}" r="22" fill="#4dabf7" ${SW}/>${star(cx, cy, 13, '#ffd43b', `stroke="${OUT}" stroke-width="1.5"`)}`;
    case 'sh_magic': return `<path d="M${cx - 20} ${cy - 24} L${cx + 20} ${cy - 24} L${cx + 20} ${cy} Q${cx + 18} ${cy + 20} ${cx} ${cy + 28} Q${cx - 18} ${cy + 20} ${cx - 20} ${cy} Z" fill="#7048e8" ${SW}/><circle cx="${cx}" cy="${cy}" r="9" fill="#91f0ff" ${SW}/><path d="M${cx - 14} ${cy - 18} L${cx + 14} ${cy - 18}" stroke="#ffd43b" stroke-width="3"/>`;
    case 'sh_dragon': return `<path d="M${cx - 22} ${cy - 24} L${cx + 22} ${cy - 24} L${cx + 22} ${cy} Q${cx + 20} ${cy + 22} ${cx} ${cy + 30} Q${cx - 20} ${cy + 22} ${cx - 22} ${cy} Z" fill="#c92a2a" ${SW}/><path d="M${cx - 22} ${cy - 24} L${cx + 22} ${cy - 24} L${cx + 22} ${cy - 16} L${cx - 22} ${cy - 16} Z" fill="#fab005" ${SW}/><path d="M${cx - 10} ${cy + 8} Q${cx} ${cy - 14} ${cx + 10} ${cy + 8} Q${cx} ${cy} ${cx - 10} ${cy + 8} Z" fill="#fab005" ${SW}/>`;
    default: return '';
  }
}

// ---------- 무기·소품 (오른손 (143,187) 근처) ----------
function drawHeld(id) {
  switch (id) {
    case 'i_book': return `<g transform="rotate(-8 150 182)"><rect x="136" y="166" width="30" height="36" rx="3" fill="#4dabf7" ${SW}/><rect x="140" y="170" width="22" height="8" fill="#fff"/></g>`;
    case 'i_pencil': return `<g transform="rotate(-35 148 186)"><rect x="144" y="146" width="9" height="50" fill="#ffd43b" ${SW}/><path d="M144 146 L148.5 134 L153 146 Z" fill="#f8c99b" ${SW}/><rect x="144" y="192" width="9" height="7" fill="#ff8787" ${SW}/></g>`;
    case 'i_balloon': return `<path d="M146 186 Q156 156 160 118" stroke="${OUT}" stroke-width="1.5" fill="none"/><ellipse cx="162" cy="98" rx="18" ry="22" fill="#ff6b6b" ${SW}/><path d="M158 120 L166 120 L162 114Z" fill="#ff6b6b" ${SW}/><ellipse cx="156" cy="90" rx="4" ry="7" fill="#fff" opacity="0.6"/>`;
    case 'i_wood_sword': return `<path d="M146 186 L170 128" stroke="#c08457" stroke-width="8" stroke-linecap="round"/><path d="M146 186 L170 128" stroke="${OUT}" stroke-width="1.2" fill="none"/><path d="M136 178 L156 188" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>`;
    case 'i_sword': return `<path d="M146 186 L174 116" stroke="#e9ecef" stroke-width="9" stroke-linecap="round"/><path d="M146 186 L174 116" stroke="${OUT}" stroke-width="1.5" fill="none"/><path d="M134 178 L158 190" stroke="#1c7ed6" stroke-width="7" stroke-linecap="round"/><circle cx="142" cy="198" r="4" fill="#fab005" ${SW}/>`;
    case 'i_flame': return `<path d="M146 186 L176 110" stroke="#ff922b" stroke-width="11" stroke-linecap="round"/><path d="M152 170 L176 110 L166 150 Z" fill="#ffe066"/><path d="M168 116 Q186 98 174 82 Q184 104 162 112 Z" fill="#ff6b6b" ${SW}/><path d="M134 178 L158 190" stroke="#c92a2a" stroke-width="7" stroke-linecap="round"/>`;
    case 'i_hammer': return `<path d="M146 188 L160 140" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/><g transform="rotate(16 162 132)"><rect x="142" y="120" width="40" height="22" rx="8" fill="#ff6b9d" ${SW}/><rect x="142" y="120" width="10" height="22" rx="4" fill="#ffd43b" ${SW}/><rect x="172" y="120" width="10" height="22" rx="4" fill="#ffd43b" ${SW}/></g>`;
    case 'i_bow': return `<path d="M156 120 Q190 176 156 232" fill="none" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M156 120 L156 232" stroke="#adb5bd" stroke-width="1.5"/><path d="M146 186 L178 168" stroke="#495057" stroke-width="2.5"/><path d="M178 168 L172 164 L176 174 Z" fill="#495057"/>`;
    case 'i_wand': return `<path d="M146 192 L168 146" stroke="#5f3dc4" stroke-width="5" stroke-linecap="round"/>${star(170, 136, 10, '#ffd43b', SW)}`;
    case 'i_staff': return `<path d="M148 230 L162 108" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/><path d="M162 108 Q150 96 156 84 Q166 92 176 84 Q180 98 162 108 Z" fill="#8a5a2b" ${SW}/><circle cx="164" cy="94" r="8" fill="#91f0ff" ${SW}/><circle cx="162" cy="92" r="2.5" fill="#fff"/>`;
    case 'i_trophy': return `<path d="M136 156 L166 156 L162 182 Q151 190 140 182 Z" fill="#fcc419" ${SW}/><path d="M136 162 Q124 162 130 174 Q134 180 140 178 M166 162 Q178 162 172 174 Q168 180 162 178" fill="none" ${SW}/><rect x="146" y="186" width="10" height="10" fill="#fcc419" ${SW}/><rect x="139" y="196" width="24" height="7" fill="#8d5a2b" ${SW}/>`;
    default: return '';
  }
}

const PET_EMOJI = { p_chick: '🐥', p_cat: '🐱', p_dog: '🐶', p_rabbit: '🐰', p_dino: '🦖', p_unicorn: '🦄', p_dragon: '🐉' };
function drawPet(id) {
  const e = PET_EMOJI[id];
  return e ? `<ellipse cx="30" cy="256" rx="18" ry="4" fill="rgba(0,0,0,0.12)"/><text x="30" y="252" font-size="36" text-anchor="middle">${e}</text>` : '';
}

// ---------- 전체 조립 ----------
export function avatarSvg(cfgIn, mode = 'full') {
  const c = cleanCfg(cfgIn);
  const view = mode === 'portrait' ? '28 -6 144 144' : '0 -10 200 274';
  const parts = [
    drawBg(c.bg),
    drawBack(c),
    hairBack(c.hair, c.hairColor),
    `<ellipse cx="100" cy="256" rx="44" ry="6" fill="rgba(0,0,0,0.12)"/>`,
    drawLegs(c.bottom, c.skin),
    drawShoes(c.shoes),
    drawBottom(c.bottom),
    drawArms(c.top, c.skin),
    drawTorso(c.top),
    drawArmor(c.armor),
    drawAccFront(c.acc),
    headShape(c.face, c.skin),
    drawCheeks(c.cheek),
    drawBrows(c.brows, c.hairColor),
    drawEyes(c.eyes),
    drawNose(c.nose, c.skin),
    drawMouth(c.mouth),
    hairFront(c.hair, c.hairColor),
    drawGlasses(c.glasses),
    drawHat(c.hat),
    drawShield(c.shield),
    drawHeld(c.held),
    drawPet(c.pet),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="아바타">${parts.join('')}</svg>`;
}
