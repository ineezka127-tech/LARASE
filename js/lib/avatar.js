// 🧑‍🎨 조합형 아바타 (SVG로 직접 그림)
// cfg: { face, skin, eyes, mouth, hair, hairColor, top, bottom, shoes, hat, glasses, held, bg, pet }
// 전신 viewBox 0 0 200 280 / 증명사진(상반신) viewBox 28 14 144 144

export const SKINS = ['#ffe3cc', '#f8cfa6', '#e8b48a', '#c98e62', '#8f5c3c', '#5e3b25'];
export const HAIR_COLORS = ['#2b2220', '#5a3825', '#8b5a2b', '#d9a441', '#f3d572', '#c0392b', '#e979ad', '#4a7bd8', '#7b52c7', '#a7adb4'];

export const FACES = { round: '동그란 얼굴', oval: '갸름한 얼굴', square: '네모난 얼굴', chubby: '통통한 얼굴' };
export const EYES = { dot: '콩알 눈', big: '반짝 눈', smile: '웃는 눈', wink: '윙크', sleepy: '졸린 눈', star: '별 눈' };
export const MOUTHS = { smile: '미소', grin: '활짝', o: '오!', tongue: '메롱', flat: '무표정', cat: '고양이 입' };
export const HAIRS = { short: '짧은 머리', side: '옆가르마', bob: '단발', long: '긴 머리', ponytail: '포니테일', pigtails: '양갈래', spiky: '삐죽 머리', curly: '곱슬 머리', buzz: '까까머리' };

export const DEFAULT_AVATAR = {
  face: 'round', skin: SKINS[1], eyes: 'dot', mouth: 'smile', hair: 'short', hairColor: HAIR_COLORS[0],
  top: 't_blue', bottom: 'b_navy', shoes: 's_white', hat: null, glasses: null, held: null, bg: 'bg_sky', pet: null,
};

// ---------- 상점 아이템 (가격·레벨은 서버 shop_items 표와 같아야 함 → tools/gen-shop-sql.mjs) ----------
export const SLOTS = {
  top: '상의', bottom: '하의', shoes: '신발', hat: '모자', glasses: '안경', held: '손에 들기', bg: '배경', pet: '펫',
};

export const ITEMS = [
  // 상의
  { id: 't_blue', slot: 'top', name: '파란 티셔츠', price: 0, level: 1 },
  { id: 't_red', slot: 'top', name: '빨간 티셔츠', price: 0, level: 1 },
  { id: 't_yellow', slot: 'top', name: '노란 티셔츠', price: 0, level: 1 },
  { id: 't_green', slot: 'top', name: '초록 티셔츠', price: 0, level: 1 },
  { id: 't_stripe', slot: 'top', name: '줄무늬 티셔츠', price: 40, level: 1 },
  { id: 't_hoodie', slot: 'top', name: '후드티', price: 80, level: 1 },
  { id: 't_uniform', slot: 'top', name: '교복 셔츠', price: 120, level: 2 },
  { id: 't_jersey', slot: 'top', name: '축구 유니폼', price: 150, level: 3 },
  { id: 't_hanbok', slot: 'top', name: '한복 저고리', price: 200, level: 5 },
  { id: 't_hero', slot: 'top', name: '슈퍼히어로 옷', price: 300, level: 7 },
  { id: 't_space', slot: 'top', name: '우주복', price: 400, level: 10 },
  { id: 't_king', slot: 'top', name: '임금님 망토', price: 600, level: 14 },
  // 하의
  { id: 'b_navy', slot: 'bottom', name: '남색 바지', price: 0, level: 1 },
  { id: 'b_shorts', slot: 'bottom', name: '회색 반바지', price: 0, level: 1 },
  { id: 'b_skirt', slot: 'bottom', name: '분홍 치마', price: 0, level: 1 },
  { id: 'b_jeans', slot: 'bottom', name: '청바지', price: 40, level: 1 },
  { id: 'b_training', slot: 'bottom', name: '트레이닝 바지', price: 60, level: 1 },
  { id: 'b_rainbow', slot: 'bottom', name: '무지개 치마', price: 100, level: 3 },
  { id: 'b_hanbok', slot: 'bottom', name: '한복 바지', price: 150, level: 5 },
  { id: 'b_hanbok_skirt', slot: 'bottom', name: '한복 치마', price: 150, level: 5 },
  // 신발
  { id: 's_white', slot: 'shoes', name: '흰 운동화', price: 0, level: 1 },
  { id: 's_black', slot: 'shoes', name: '검은 운동화', price: 0, level: 1 },
  { id: 's_red', slot: 'shoes', name: '빨간 운동화', price: 30, level: 1 },
  { id: 's_rain', slot: 'shoes', name: '노란 장화', price: 50, level: 1 },
  { id: 's_boots', slot: 'shoes', name: '갈색 부츠', price: 60, level: 2 },
  { id: 's_gold', slot: 'shoes', name: '황금 신발', price: 300, level: 10 },
  // 모자
  { id: 'h_ribbon', slot: 'hat', name: '리본', price: 40, level: 1 },
  { id: 'h_cap', slot: 'hat', name: '야구 모자', price: 50, level: 1 },
  { id: 'h_beanie', slot: 'hat', name: '털모자', price: 60, level: 1 },
  { id: 'h_flower', slot: 'hat', name: '꽃 머리띠', price: 70, level: 2 },
  { id: 'h_headphone', slot: 'hat', name: '헤드폰', price: 120, level: 3 },
  { id: 'h_wizard', slot: 'hat', name: '마법사 모자', price: 200, level: 6 },
  { id: 'h_crown', slot: 'hat', name: '왕관', price: 500, level: 12 },
  // 안경
  { id: 'g_round', slot: 'glasses', name: '동그란 안경', price: 40, level: 1 },
  { id: 'g_sun', slot: 'glasses', name: '선글라스', price: 80, level: 2 },
  { id: 'g_star', slot: 'glasses', name: '별 안경', price: 120, level: 4 },
  { id: 'g_heart', slot: 'glasses', name: '하트 안경', price: 120, level: 4 },
  // 손에 들기
  { id: 'i_book', slot: 'held', name: '책', price: 30, level: 1 },
  { id: 'i_pencil', slot: 'held', name: '연필', price: 30, level: 1 },
  { id: 'i_balloon', slot: 'held', name: '풍선', price: 60, level: 2 },
  { id: 'i_wand', slot: 'held', name: '마법봉', price: 150, level: 5 },
  { id: 'i_sword', slot: 'held', name: '용사의 검', price: 250, level: 7 },
  { id: 'i_trophy', slot: 'held', name: '트로피', price: 300, level: 9 },
  // 배경
  { id: 'bg_sky', slot: 'bg', name: '하늘색', price: 0, level: 1 },
  { id: 'bg_pink', slot: 'bg', name: '분홍색', price: 0, level: 1 },
  { id: 'bg_mint', slot: 'bg', name: '민트색', price: 0, level: 1 },
  { id: 'bg_classroom', slot: 'bg', name: '우리 교실', price: 80, level: 1 },
  { id: 'bg_park', slot: 'bg', name: '공원', price: 100, level: 2 },
  { id: 'bg_rainbow', slot: 'bg', name: '무지개', price: 200, level: 4 },
  { id: 'bg_night', slot: 'bg', name: '별이 빛나는 밤', price: 150, level: 3 },
  { id: 'bg_space', slot: 'bg', name: '우주', price: 250, level: 6 },
  // 펫
  { id: 'p_chick', slot: 'pet', name: '병아리', price: 100, level: 1 },
  { id: 'p_cat', slot: 'pet', name: '고양이', price: 150, level: 2 },
  { id: 'p_dog', slot: 'pet', name: '강아지', price: 150, level: 2 },
  { id: 'p_rabbit', slot: 'pet', name: '토끼', price: 150, level: 3 },
  { id: 'p_dino', slot: 'pet', name: '공룡', price: 300, level: 6 },
  { id: 'p_unicorn', slot: 'pet', name: '유니콘', price: 400, level: 9 },
  { id: 'p_dragon', slot: 'pet', name: '용', price: 600, level: 13 },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// 알 수 없는 값은 기본값으로 (그림에 들어가는 값은 모두 이 목록에서만 나옴)
export function cleanCfg(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  return {
    face: pick(c.face, Object.keys(FACES), 'round'),
    skin: pick(c.skin, SKINS, SKINS[1]),
    eyes: pick(c.eyes, Object.keys(EYES), 'dot'),
    mouth: pick(c.mouth, Object.keys(MOUTHS), 'smile'),
    hair: pick(c.hair, Object.keys(HAIRS), 'short'),
    hairColor: pick(c.hairColor, HAIR_COLORS, HAIR_COLORS[0]),
    ...Object.fromEntries(Object.keys(SLOTS).map((s) => [s, ITEM[c[s]]?.slot === s ? c[s] : (DEFAULT_AVATAR[s] && s !== 'hat' ? DEFAULT_AVATAR[s] : null)])),
  };
}

// ---------- 그리기 도우미 ----------
const darken = (hex, k = 0.18) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * (1 - k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};
const OUT = '#3a2f3b';   // 외곽선 색
const SW = 'stroke="#3a2f3b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';

// ---------- 배경 ----------
function drawBg(id) {
  const full = (fill) => `<rect x="0" y="0" width="200" height="280" fill="${fill}"/>`;
  switch (id) {
    case 'bg_pink': return full('#ffe1ee');
    case 'bg_mint': return full('#d8f6ec');
    case 'bg_classroom':
      return full('#fff4dc') + `<rect x="0" y="200" width="200" height="80" fill="#e2c391"/>
        <rect x="30" y="30" width="140" height="70" rx="4" fill="#2f6b4f" stroke="#8a5a2b" stroke-width="5"/>
        <text x="100" y="72" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">1+1=2</text>
        <circle cx="175" cy="135" r="13" fill="#fff" stroke="#555" stroke-width="2"/><path d="M175 127v8l5 3" stroke="#555" stroke-width="2" fill="none"/>`;
    case 'bg_park':
      return full('#cfeeff') + `<circle cx="165" cy="40" r="18" fill="#ffd54a"/><rect x="0" y="200" width="200" height="80" fill="#8fd16b"/>
        <rect x="18" y="140" width="10" height="64" fill="#8a5a2b"/><circle cx="23" cy="130" r="26" fill="#4caf50"/>
        <ellipse cx="60" cy="60" rx="22" ry="10" fill="#fff"/><ellipse cx="78" cy="55" rx="16" ry="10" fill="#fff"/>`;
    case 'bg_rainbow': {
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
      return full('#eaf6ff') + cols.map((c, i) => `<path d="M${-10 + i * 9} 230 A${110 - i * 9} ${110 - i * 9} 0 0 1 ${210 - i * 9} 230" fill="none" stroke="${c}" stroke-width="9"/>`).join('')
        + `<ellipse cx="20" cy="228" rx="28" ry="14" fill="#fff"/><ellipse cx="182" cy="228" rx="28" ry="14" fill="#fff"/>`;
    }
    case 'bg_night':
      return full('#1f2a5a') + `<circle cx="160" cy="45" r="16" fill="#fff6c9"/><circle cx="168" cy="40" r="14" fill="#1f2a5a"/>`
        + [[30, 30], [70, 60], [120, 25], [180, 110], [20, 120], [60, 170], [150, 190], [100, 90]].map(([x, y]) => `<path d="M${x} ${y - 5}L${x + 1.5} ${y - 1.5}L${x + 5} ${y}L${x + 1.5} ${y + 1.5}L${x} ${y + 5}L${x - 1.5} ${y + 1.5}L${x - 5} ${y}L${x - 1.5} ${y - 1.5}Z" fill="#ffe680"/>`).join('')
        + `<rect x="0" y="236" width="200" height="44" fill="#2c3b73"/>`;
    case 'bg_space':
      return full('#120d2e') + [[20, 20], [50, 80], [90, 30], [140, 70], [180, 20], [170, 150], [30, 160], [120, 200], [60, 230], [185, 240]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${1 + (i % 3)}" fill="#fff"/>`).join('')
        + `<circle cx="160" cy="60" r="20" fill="#f4a261"/><ellipse cx="160" cy="60" rx="32" ry="7" fill="none" stroke="#e9c46a" stroke-width="3"/>
        <circle cx="35" cy="110" r="9" fill="#7fd1ff"/>`;
    default: return full('#dff0ff');
  }
}

// ---------- 망토 (뒤쪽) ----------
function drawCape(top) {
  if (top === 't_hero') return `<path d="M68 132 L56 250 L144 250 L132 132 Z" fill="#e63946" ${SW}/>`;
  if (top === 't_king') return `<path d="M66 130 L48 254 L152 254 L134 130 Z" fill="#7b2cbf" ${SW}/><path d="M48 254 L152 254 L150 244 L50 244Z" fill="#fff" stroke="none"/>`
    + [60, 80, 100, 120, 140].map((x) => `<circle cx="${x}" cy="249" r="2" fill="#333"/>`).join('');
  return '';
}

// ---------- 머리카락 ----------
function hairBack(style, color) {
  const c = color, s = `fill="${c}" ${SW}`;
  switch (style) {
    case 'long': return `<path d="M52 74 C46 26 154 26 148 74 L156 168 C134 182 66 182 44 168 Z" ${s}/>`;
    case 'bob': return `<path d="M50 78 C44 26 156 26 150 78 L152 122 C140 132 60 132 48 122 Z" ${s}/>`;
    case 'ponytail': return `<path d="M140 52 C176 50 182 96 160 128 C168 98 160 74 140 70 Z" ${s}/>`;
    case 'pigtails': return `<circle cx="46" cy="70" r="17" ${s}/><circle cx="154" cy="70" r="17" ${s}/>
      <path d="M40 84 C30 110 36 132 44 140 C48 120 52 104 54 88Z" ${s}/><path d="M160 84 C170 110 164 132 156 140 C152 120 148 104 146 88Z" ${s}/>`;
    case 'curly': return `<path d="M52 92 C40 40 160 40 148 92 L150 112 C140 120 60 120 50 112 Z" ${s}/>`;
    default: return '';
  }
}

function hairFront(style, color) {
  const s = `fill="${color}" ${SW}`;
  switch (style) {
    case 'short': return `<path d="M53 82 C46 28 154 28 147 82 C140 64 128 56 112 58 C104 50 88 50 80 58 C68 58 58 66 53 82 Z" ${s}/>`;
    case 'side': return `<path d="M53 84 C44 26 156 26 147 84 C144 70 138 62 130 60 C110 62 84 58 72 46 C66 58 60 70 53 84 Z" ${s}/>`;
    case 'bob':
    case 'long':
    case 'ponytail':
    case 'pigtails': return `<path d="M52 84 C46 26 154 26 148 84 C146 72 140 62 132 58 C124 66 112 60 104 54 C94 64 78 62 70 56 C60 62 54 72 52 84 Z" ${s}/>`;
    case 'spiky': return `<path d="M52 84 L48 50 L62 56 L64 30 L80 46 L92 22 L104 44 L118 24 L126 46 L142 32 L140 56 L154 52 L148 84 C140 66 120 58 100 58 C80 58 60 66 52 84 Z" ${s}/>`;
    case 'curly': return [[60, 62], [72, 46], [90, 38], [110, 38], [128, 46], [140, 62], [56, 80], [144, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${color}" stroke="${OUT}" stroke-width="2.2"/>`).join('')
      + `<path d="M58 70 C70 52 130 52 142 70 L140 60 C120 40 80 40 60 60 Z" fill="${color}"/>`;
    case 'buzz': return `<path d="M54 76 C50 34 150 34 146 76 C130 58 70 58 54 76 Z" fill="${color}" opacity="0.55"/>`;
    default: return '';
  }
}

// ---------- 얼굴 ----------
function headShape(face, skin) {
  const s = `fill="${skin}" ${SW}`;
  const ears = `<circle cx="54" cy="88" r="9" ${s}/><circle cx="146" cy="88" r="9" ${s}/>`;
  switch (face) {
    case 'oval': return ears + `<ellipse cx="100" cy="82" rx="43" ry="50" ${s}/>`;
    case 'square': return ears + `<rect x="55" y="34" width="90" height="94" rx="30" ${s}/>`;
    case 'chubby': return ears + `<path d="M56 78 C56 38 144 38 144 78 C150 108 132 128 100 128 C68 128 50 108 56 78 Z" ${s}/>`;
    default: return ears + `<circle cx="100" cy="82" r="47" ${s}/>`;
  }
}

function drawEyes(style) {
  const L = 82, R = 118, Y = 88;
  switch (style) {
    case 'big': return [L, R].map((x) => `<ellipse cx="${x}" cy="${Y}" rx="7" ry="9" fill="${OUT}"/><circle cx="${x + 2.5}" cy="${Y - 3}" r="3" fill="#fff"/><circle cx="${x - 2}" cy="${Y + 3}" r="1.4" fill="#fff"/>`).join('');
    case 'smile': return [L, R].map((x) => `<path d="M${x - 7} ${Y + 2} Q${x} ${Y - 7} ${x + 7} ${Y + 2}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`).join('');
    case 'wink': return `<circle cx="${L}" cy="${Y}" r="4.5" fill="${OUT}"/><path d="M${R - 7} ${Y} L${R + 7} ${Y - 3} M${R - 7} ${Y} L${R + 7} ${Y + 4}" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
    case 'sleepy': return [L, R].map((x) => `<path d="M${x - 7} ${Y} Q${x} ${Y + 6} ${x + 7} ${Y}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`).join('');
    case 'star': return [L, R].map((x) => `<path d="M${x} ${Y - 8}L${x + 2.6} ${Y - 2.6}L${x + 8} ${Y - 2}L${x + 3.8} ${Y + 1.8}L${x + 5} ${Y + 7.5}L${x} ${Y + 4.5}L${x - 5} ${Y + 7.5}L${x - 3.8} ${Y + 1.8}L${x - 8} ${Y - 2}L${x - 2.6} ${Y - 2.6}Z" fill="#ffb703" stroke="${OUT}" stroke-width="1.5"/>`).join('');
    default: return [L, R].map((x) => `<circle cx="${x}" cy="${Y}" r="5" fill="${OUT}"/><circle cx="${x + 1.6}" cy="${Y - 1.8}" r="1.6" fill="#fff"/>`).join('');
  }
}

function drawMouth(style) {
  const Y = 108;
  switch (style) {
    case 'grin': return `<path d="M88 ${Y - 2} Q100 ${Y - 2} 112 ${Y - 2} Q110 ${Y + 12} 100 ${Y + 12} Q90 ${Y + 12} 88 ${Y - 2} Z" fill="#c0392b" ${SW}/><path d="M92 ${Y + 6} Q100 ${Y + 2} 108 ${Y + 6} Q104 ${Y + 11} 100 ${Y + 11} Q96 ${Y + 11} 92 ${Y + 6}Z" fill="#ff8fa3"/>`;
    case 'o': return `<ellipse cx="100" cy="${Y + 2}" rx="5" ry="6" fill="#c0392b" ${SW}/>`;
    case 'tongue': return `<path d="M90 ${Y} Q100 ${Y + 8} 110 ${Y}" fill="none" ${SW} stroke-width="2.6"/><path d="M96 ${Y + 3} Q96 ${Y + 13} 101 ${Y + 13} Q106 ${Y + 13} 105 ${Y + 3}" fill="#ff7b9c" ${SW}/>`;
    case 'flat': return `<path d="M92 ${Y + 2} L108 ${Y + 2}" ${SW} stroke-width="2.8"/>`;
    case 'cat': return `<path d="M88 ${Y} Q94 ${Y + 7} 100 ${Y} Q106 ${Y + 7} 112 ${Y}" fill="none" ${SW} stroke-width="2.6"/>`;
    default: return `<path d="M89 ${Y} Q100 ${Y + 10} 111 ${Y}" fill="none" ${SW} stroke-width="2.8"/>`;
  }
}

// ---------- 몸 ----------
const TOP_COLORS = {
  t_blue: '#4d96ff', t_red: '#ff6b6b', t_yellow: '#ffd43b', t_green: '#51cf66', t_stripe: '#ffffff', t_hoodie: '#9775fa',
  t_uniform: '#ffffff', t_jersey: '#1c7ed6', t_hanbok: '#ff8fab', t_hero: '#1c3faa', t_space: '#f1f3f5', t_king: '#ffd43b',
};
const LONG_SLEEVE = ['t_hoodie', 't_uniform', 't_hanbok', 't_hero', 't_space', 't_king'];

function drawTop(id, skin) {
  const col = TOP_COLORS[id] || '#4d96ff';
  const long = LONG_SLEEVE.includes(id);
  const sleeve = long ? 54 : 24;
  const arm = (x, rot) => `<g transform="rotate(${rot} ${x + 8} 134)">
      <rect x="${x}" y="132" width="16" height="58" rx="8" fill="${skin}" ${SW}/>
      <rect x="${x}" y="130" width="16" height="${sleeve}" rx="7" fill="${id === 't_space' ? '#e9ecef' : col}" ${SW}/>
      <circle cx="${x + 8}" cy="${long ? 192 : 192}" r="8" fill="${skin}" ${SW}/></g>`;
  let body = `<path d="M66 142 Q66 126 84 125 L116 125 Q134 126 134 142 L136 202 L64 202 Z" fill="${col}" ${SW}/>`;
  let deco = '';
  switch (id) {
    case 't_stripe': deco = [140, 156, 172, 188].map((y) => `<rect x="66" y="${y}" width="68" height="7" fill="#4dabf7"/>`).join(''); break;
    case 't_hoodie': deco = `<path d="M82 126 Q100 146 118 126" fill="none" stroke="#6741d9" stroke-width="3"/><rect x="84" y="170" width="32" height="18" rx="6" fill="#845ef7" ${SW}/><path d="M94 132 L93 150 M106 132 L107 150" stroke="#fff" stroke-width="2"/>`; break;
    case 't_uniform': deco = `<path d="M86 125 L100 140 L114 125" fill="#fff" ${SW}/><path d="M97 138 L103 138 L106 170 L100 178 L94 170 Z" fill="#c92a2a" ${SW}/><rect x="66" y="196" width="70" height="6" fill="#adb5bd"/>`; break;
    case 't_jersey': deco = `<text x="100" y="180" font-size="30" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">10</text><path d="M66 150 L134 150" stroke="#fff" stroke-width="4"/>`; break;
    case 't_hanbok': deco = `<path d="M86 126 L112 160 L134 140" fill="none" stroke="#fff" stroke-width="5"/><path d="M106 152 Q118 170 112 196 M108 152 Q100 176 104 198" stroke="#d6336c" stroke-width="4" fill="none"/>`; break;
    case 't_hero': deco = `<path d="M84 150 L100 140 L116 150 L108 170 L92 170 Z" fill="#ffd43b" ${SW}/><text x="100" y="164" font-size="14" font-weight="900" fill="#e63946" text-anchor="middle" font-family="sans-serif">S</text><rect x="64" y="192" width="72" height="8" fill="#ffd43b"/>`; break;
    case 't_space': deco = `<rect x="82" y="146" width="36" height="26" rx="4" fill="#4dabf7" ${SW}/><circle cx="90" cy="159" r="3" fill="#ff6b6b"/><circle cx="100" cy="159" r="3" fill="#ffd43b"/><circle cx="110" cy="159" r="3" fill="#51cf66"/>`; break;
    case 't_king': deco = `<path d="M70 126 Q100 150 130 126 L130 136 Q100 160 70 136Z" fill="#fff"/>` + [80, 100, 120].map((x) => `<circle cx="${x}" cy="${141 + (x === 100 ? 4 : 0)}" r="2" fill="#333"/>`).join(''); break;
    default: break;
  }
  return arm(48, 12) + arm(136, -12) + body + deco;
}

function drawBottom(id, skin) {
  const legs = `<rect x="74" y="200" width="20" height="48" fill="${skin}" ${SW}/><rect x="106" y="200" width="20" height="48" fill="${skin}" ${SW}/>`;
  const pants = (c, extra = '') => `<path d="M66 198 L134 198 L132 248 L104 248 L100 216 L96 248 L68 248 Z" fill="${c}" ${SW}/>${extra}`;
  switch (id) {
    case 'b_shorts': return legs + `<path d="M66 198 L134 198 L134 224 L104 224 L100 212 L96 224 L66 224 Z" fill="#868e96" ${SW}/>`;
    case 'b_skirt': return legs + `<path d="M68 198 L132 198 L144 234 L56 234 Z" fill="#f783ac" ${SW}/>`;
    case 'b_jeans': return pants('#4c6ef5', `<path d="M82 206 L82 214 M118 206 L118 214" stroke="#dbe4ff" stroke-width="2"/>`);
    case 'b_training': return pants('#343a40', `<path d="M70 200 L70 246 M130 200 L130 246" stroke="#fff" stroke-width="3"/>`);
    case 'b_rainbow': return legs + `<path d="M68 198 L132 198 L144 234 L56 234 Z" fill="#ffe066" ${SW}/>`
      + ['#ff6b6b', '#ffa94d', '#69db7c', '#4dabf7'].map((c, i) => `<path d="M${66 - i * 3} ${206 + i * 7} L${134 + i * 3} ${206 + i * 7}" stroke="${c}" stroke-width="5"/>`).join('');
    case 'b_hanbok': return pants('#748ffc', `<path d="M66 200 L134 200" stroke="#5c7cfa" stroke-width="6"/>`);
    case 'b_hanbok_skirt': return `<path d="M64 192 L136 192 L150 252 L50 252 Z" fill="#4263eb" ${SW}/><path d="M64 194 L136 194" stroke="#fff" stroke-width="5"/>`;
    default: return pants('#364fc7');
  }
}

function drawShoes(id) {
  const col = { s_white: '#f8f9fa', s_black: '#343a40', s_red: '#e03131', s_rain: '#fcc419', s_boots: '#8d5a2b', s_gold: '#fab005' }[id] || '#f8f9fa';
  const boot = id === 's_rain' || id === 's_boots';
  const one = (x) => (boot
    ? `<path d="M${x - 11} 226 L${x + 11} 226 L${x + 11} 248 Q${x + 20} 250 ${x + 18} 258 L${x - 13} 258 Z" fill="${col}" ${SW}/>`
    : `<path d="M${x - 13} 256 Q${x - 14} 242 ${x} 242 Q${x + 16} 242 ${x + 18} 256 Z" fill="${col}" ${SW}/><path d="M${x - 13} 256 L${x + 18} 256" stroke="${OUT}" stroke-width="2"/>`);
  const shine = id === 's_gold' ? `<circle cx="78" cy="248" r="2" fill="#fff"/><circle cx="110" cy="248" r="2" fill="#fff"/>` : '';
  return one(84) + one(116) + shine;
}

function drawGlasses(id) {
  const Y = 88;
  switch (id) {
    case 'g_round': return `<circle cx="82" cy="${Y}" r="11" fill="rgba(255,255,255,0.25)" stroke="${OUT}" stroke-width="2.5"/><circle cx="118" cy="${Y}" r="11" fill="rgba(255,255,255,0.25)" stroke="${OUT}" stroke-width="2.5"/><path d="M93 ${Y} L107 ${Y} M71 ${Y - 2} L56 ${Y - 4} M129 ${Y - 2} L144 ${Y - 4}" stroke="${OUT}" stroke-width="2.5"/>`;
    case 'g_sun': return `<path d="M68 ${Y - 8} L96 ${Y - 8} L94 ${Y + 6} Q82 ${Y + 12} 70 ${Y + 6} Z M104 ${Y - 8} L132 ${Y - 8} L130 ${Y + 6} Q118 ${Y + 12} 106 ${Y + 6} Z" fill="#212529" stroke="${OUT}" stroke-width="2"/><path d="M96 ${Y - 6} L104 ${Y - 6} M68 ${Y - 7} L56 ${Y - 8} M132 ${Y - 7} L144 ${Y - 8}" stroke="${OUT}" stroke-width="2.5"/><path d="M74 ${Y - 4} L80 ${Y - 4}" stroke="#fff" stroke-width="2"/>`;
    case 'g_star': return [82, 118].map((x) => `<path d="M${x} ${Y - 14}L${x + 4} ${Y - 4}L${x + 14} ${Y - 3}L${x + 6} ${Y + 3}L${x + 9} ${Y + 13}L${x} ${Y + 7}L${x - 9} ${Y + 13}L${x - 6} ${Y + 3}L${x - 14} ${Y - 3}L${x - 4} ${Y - 4}Z" fill="rgba(255,212,59,0.55)" stroke="#f08c00" stroke-width="2.5"/>`).join('') + `<path d="M95 ${Y} L105 ${Y}" stroke="#f08c00" stroke-width="2.5"/>`;
    case 'g_heart': return [82, 118].map((x) => `<path d="M${x} ${Y + 10} C${x - 16} ${Y} ${x - 12} ${Y - 14} ${x} ${Y - 6} C${x + 12} ${Y - 14} ${x + 16} ${Y} ${x} ${Y + 10} Z" fill="rgba(255,107,157,0.55)" stroke="#d6336c" stroke-width="2.5"/>`).join('') + `<path d="M93 ${Y - 2} L107 ${Y - 2}" stroke="#d6336c" stroke-width="2.5"/>`;
    default: return '';
  }
}

function drawHat(id) {
  switch (id) {
    case 'h_ribbon': return `<path d="M120 40 L104 30 L106 52 Z M120 40 L136 30 L134 52 Z" fill="#ff6b9d" ${SW}/><circle cx="120" cy="41" r="5" fill="#f06595" ${SW}/>`;
    case 'h_cap': return `<path d="M54 64 C54 22 146 22 146 64 Z" fill="#e03131" ${SW}/><path d="M100 60 L160 60 Q166 68 154 70 L100 68 Z" fill="#c92a2a" ${SW}/><circle cx="100" cy="28" r="4" fill="#c92a2a"/>`;
    case 'h_beanie': return `<path d="M52 70 C50 18 150 18 148 70 Z" fill="#20c997" ${SW}/><rect x="50" y="60" width="100" height="14" rx="6" fill="#12b886" ${SW}/><circle cx="100" cy="18" r="9" fill="#fff" ${SW}/>`;
    case 'h_flower': return `<path d="M56 60 C64 30 136 30 144 60" fill="none" stroke="#69db7c" stroke-width="5"/>` + [[64, 48, '#ff8787'], [82, 36, '#ffd43b'], [100, 32, '#ff8787'], [118, 36, '#da77f2'], [136, 48, '#ffd43b']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" ${SW}/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/>`).join('');
    case 'h_headphone': return `<path d="M52 86 C48 22 152 22 148 86" fill="none" stroke="#343a40" stroke-width="8"/><rect x="42" y="74" width="18" height="28" rx="8" fill="#e64980" ${SW}/><rect x="140" y="74" width="18" height="28" rx="8" fill="#e64980" ${SW}/>`;
    case 'h_wizard': return `<path d="M60 52 L106 2 L142 52 Z" fill="#5f3dc4" ${SW}/><ellipse cx="100" cy="54" rx="56" ry="10" fill="#5f3dc4" ${SW}/><path d="M98 20l3 6 6 1-5 4 2 6-6-3-6 3 2-6-5-4 6-1z" fill="#ffd43b"/><circle cx="84" cy="38" r="3" fill="#ffd43b"/>`;
    case 'h_crown': return `<path d="M62 50 L62 18 L80 34 L100 10 L120 34 L138 18 L138 50 Z" fill="#fcc419" ${SW}/><circle cx="100" cy="36" r="5" fill="#e03131"/><circle cx="78" cy="42" r="3.5" fill="#4dabf7"/><circle cx="122" cy="42" r="3.5" fill="#51cf66"/>`;
    default: return '';
  }
}

function drawHeld(id) {
  // 오른손(화면 오른쪽) 근처 (약 150, 192)
  switch (id) {
    case 'i_book': return `<g transform="rotate(-8 150 186)"><rect x="136" y="170" width="30" height="36" rx="3" fill="#4dabf7" ${SW}/><rect x="140" y="174" width="22" height="8" fill="#fff"/></g>`;
    case 'i_pencil': return `<g transform="rotate(-35 150 190)"><rect x="146" y="150" width="9" height="50" fill="#ffd43b" ${SW}/><path d="M146 150 L150.5 138 L155 150 Z" fill="#f8c99b" ${SW}/><rect x="146" y="196" width="9" height="7" fill="#ff8787" ${SW}/></g>`;
    case 'i_balloon': return `<path d="M152 190 Q160 160 162 120" stroke="${OUT}" stroke-width="1.5" fill="none"/><ellipse cx="164" cy="100" rx="18" ry="22" fill="#ff6b6b" ${SW}/><path d="M160 122 L168 122 L164 116Z" fill="#ff6b6b" ${SW}/><ellipse cx="158" cy="92" rx="4" ry="7" fill="#fff" opacity="0.6"/>`;
    case 'i_wand': return `<path d="M150 196 L172 150" stroke="#5f3dc4" stroke-width="5" stroke-linecap="round"/><path d="M174 132l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#ffd43b" ${SW}/>`;
    case 'i_sword': return `<path d="M151 196 L178 124" stroke="#ced4da" stroke-width="8" stroke-linecap="round"/><path d="M151 196 L178 124" stroke="${OUT}" stroke-width="1.5" fill="none"/><path d="M142 186 L162 194" stroke="#e8590c" stroke-width="6" stroke-linecap="round"/><circle cx="148" cy="204" r="4" fill="#ffd43b" ${SW}/>`;
    case 'i_trophy': return `<path d="M140 160 L170 160 L166 186 Q155 194 144 186 Z" fill="#fcc419" ${SW}/><path d="M140 166 Q128 166 134 178 Q138 184 144 182 M170 166 Q182 166 176 178 Q172 184 166 182" fill="none" ${SW}/><rect x="150" y="190" width="10" height="10" fill="#fcc419" ${SW}/><rect x="143" y="200" width="24" height="7" fill="#8d5a2b" ${SW}/>`;
    default: return '';
  }
}

const PET_EMOJI = { p_chick: '🐥', p_cat: '🐱', p_dog: '🐶', p_rabbit: '🐰', p_dino: '🦖', p_unicorn: '🦄', p_dragon: '🐉' };
function drawPet(id) {
  const e = PET_EMOJI[id];
  return e ? `<ellipse cx="34" cy="262" rx="20" ry="5" fill="rgba(0,0,0,0.12)"/><text x="34" y="258" font-size="40" text-anchor="middle">${e}</text>` : '';
}

// ---------- 전체 조립 ----------
export function avatarSvg(cfgIn, mode = 'full') {
  const c = cleanCfg(cfgIn);
  const view = mode === 'portrait' ? '28 14 144 144' : '0 0 200 280';
  const parts = [
    drawBg(c.bg),
    drawCape(c.top),
    hairBack(c.hair, c.hairColor),
    `<ellipse cx="100" cy="262" rx="46" ry="7" fill="rgba(0,0,0,0.12)"/>`,
    drawBottom(c.bottom, c.skin),
    drawShoes(c.shoes),
    `<rect x="92" y="114" width="16" height="16" fill="${c.skin}" ${SW}/>`,
    drawTop(c.top, c.skin),
    headShape(c.face, c.skin),
    `<ellipse cx="72" cy="102" rx="7" ry="4" fill="#ff8fa3" opacity="0.45"/><ellipse cx="128" cy="102" rx="7" ry="4" fill="#ff8fa3" opacity="0.45"/>`,
    drawEyes(c.eyes),
    drawMouth(c.mouth),
    hairFront(c.hair, c.hairColor),
    drawGlasses(c.glasses),
    drawHat(c.hat),
    drawHeld(c.held),
    drawPet(c.pet),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" role="img" aria-label="아바타">${parts.join('')}</svg>`;
}
