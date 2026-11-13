// 👾 도트(픽셀) 아바타: 30×42 칸에 한 칸씩 색을 칠해서 그려요 (옛날 게임 느낌)
// 그림 순서: 배경 → 등 뒤(날개·망토) → 몸 → 얼굴 → 머리 → 모자 → 손에 든 것 → 펫
// 캐릭터 둘레에는 진한 테두리를 저절로 둘러요.
import { cleanCfg } from './avatar.js';

const W = 30, H = 42;
const INK = '#2b2033';   // 테두리·눈 색

// ---------- 색 도우미 ----------
function shade(hex, k) {   // k<0 어둡게, k>0 밝게
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

// ---------- 그림판 ----------
function canvas() {
  const bg = Array.from({ length: H }, () => Array(W).fill(null));
  const ch = Array.from({ length: H }, () => Array(W).fill(null));
  let layer = ch;
  const p = (x, y, c) => { if (c && x >= 0 && x < W && y >= 0 && y < H) layer[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, c); };
  const hline = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) p(x, y, c); };
  // 글자 그림: '.'·' ' 은 빈칸, 나머지 글자는 pal 색
  const spr = (x0, y0, rows, pal, flip = false) => rows.forEach((row, j) => [...row].forEach((k, i) => {
    if (k !== '.' && k !== ' ' && pal[k]) p(flip ? x0 + row.length - 1 - i : x0 + i, y0 + j, pal[k]);
  }));
  return { bg, ch, p, rect, hline, spr, onBg: () => { layer = bg; }, onChar: () => { layer = ch; } };
}

// ---------- 배경 ----------
function drawBg(g, id) {
  g.onBg();
  const sky = (top, bottom) => { for (let y = 0; y < H; y++) g.hline(0, W - 1, y, y < 24 ? top : bottom); };
  const cloud = (x, y) => g.spr(x, y, ['.ww.', 'wwww'], { w: '#ffffff' });
  switch (id) {
    case 'bg_pink': sky('#ffd6e7', '#ffc2da'); [[3, 5], [24, 12], [6, 30], [25, 34]].forEach(([x, y]) => g.spr(x, y, ['.h.', 'hhh', '.h.'], { h: '#ffadd2' })); break;
    case 'bg_mint': sky('#c9f2e3', '#b2ebd6'); [[4, 6], [23, 10], [3, 33], [26, 30]].forEach(([x, y]) => g.spr(x, y, ['l.l', '.l.'], { l: '#8fdcbf' })); break;
    case 'bg_classroom':
      sky('#fff1d6', '#d9b27c');
      g.rect(3, 3, 24, 13, '#8a5a2b'); g.rect(4, 4, 22, 11, '#2f6b4f');
      g.spr(6, 7, ['w.w.www.www', 'w.w...w...w', 'www.www.www', '..w.w...w..', '..w.www.www'], { w: '#e9f5ee' });
      for (let x = 0; x < W; x += 6) g.rect(x, 33, 3, 1, '#c4955c');
      break;
    case 'bg_park':
      sky('#bfe7ff', '#7ccf5a');
      g.spr(23, 2, ['.yyy.', 'yyyyy', 'yyyyy', '.yyy.'], { y: '#ffd43b' }); cloud(4, 4); cloud(13, 7);
      g.spr(0, 12, ['..ggg..', '.ggggg.', 'ggdgggg', 'gggggdg', '.ggggg.', '...b...', '...b...', '...b...', '...b...', '...b...', '...b...', '...b...'], { g: '#40a046', d: '#2f8a3a', b: '#8a5a2b' });
      [[4, 36], [12, 39], [22, 37], [27, 40]].forEach(([x, y]) => g.spr(x, y, ['r.', 'g.'], { r: '#ff6b9a', g: '#2f8a3a' }));
      break;
    case 'bg_night':
      sky('#1f2a5a', '#2c3b73');
      g.spr(22, 3, ['.mm.', 'm...', 'm...', '.mm.'], { m: '#fff3b0' });
      [[3, 3], [9, 8], [15, 2], [5, 16], [26, 14], [12, 13], [2, 26], [27, 24]].forEach(([x, y], i) => (i % 3 ? g.p(x, y, '#ffe680') : g.spr(x - 1, y - 1, ['.s.', 'sss', '.s.'], { s: '#ffe680' })));
      break;
    case 'bg_rainbow': {
      sky('#e6f4ff', '#e6f4ff');
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - 14.5, (y - 34) * 1.05);
        const band = Math.floor(17 - d);
        if (band >= 0 && band < 6) g.p(x, y, cols[band]);
      }
      g.spr(0, 31, ['.www.', 'wwwww', 'wwwww'], { w: '#ffffff' }); g.spr(25, 31, ['.www.', 'wwwww', 'wwwww'], { w: '#ffffff' });
      break;
    }
    case 'bg_castle':
      sky('#ffe8cc', '#94d82d');
      g.rect(3, 9, 24, 15, '#ced4da');
      for (let x = 3; x < 27; x += 4) g.rect(x, 7, 2, 2, '#ced4da');
      for (let y = 11; y < 24; y += 3) for (let x = 4 + (y % 2); x < 26; x += 5) g.rect(x, y, 2, 1, '#adb5bd');
      g.rect(12, 16, 6, 8, '#8a5a2b'); g.rect(13, 15, 4, 1, '#8a5a2b');
      g.rect(14, 1, 1, 6, '#5c4033'); g.spr(15, 1, ['rrr', 'rr.', 'r..'], { r: '#e03131' });
      break;
    case 'bg_space':
      sky('#120d2e', '#120d2e');
      [[2, 3], [8, 10], [14, 2], [20, 8], [27, 3], [25, 22], [3, 22], [6, 33], [17, 38], [27, 36], [11, 27]].forEach(([x, y], i) => g.p(x, y, i % 2 ? '#ffffff' : '#a5d8ff'));
      g.spr(19, 3, ['..oooo..', 'yyyyyyyy', '.oooooo.', '..oooo..'], { o: '#f4a261', y: '#e9c46a' });
      g.spr(2, 13, ['.bb.', 'bbbb', '.bb.'], { b: '#74c0fc' });
      break;
    default:   // bg_sky
      sky('#d6ecff', '#c5e3ff'); cloud(3, 5); cloud(21, 10); cloud(5, 30);
  }
  g.onChar();
}

// ---------- 머리 모양(얼굴형) ----------
// [y, 왼쪽 x, 오른쪽 x]  — 기본 얼굴은 x 8~21, y 6~19
const FACE_ROWS = {
  round: [[6, 10, 19], [7, 9, 20], ...range(8, 17).map((y) => [y, 8, 21]), [18, 9, 20], [19, 10, 19]],
  oval: [[6, 10, 19], [7, 9, 20], ...range(8, 15).map((y) => [y, 8, 21]), [16, 9, 20], [17, 9, 20], [18, 10, 19], [19, 11, 18]],
  square: [[6, 9, 20], ...range(7, 18).map((y) => [y, 8, 21]), [19, 9, 20]],
  chubby: [[6, 10, 19], [7, 8, 21], ...range(8, 17).map((y) => [y, 7, 22]), [18, 8, 21], [19, 10, 19]],
};
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

function drawHead(g, face, skin) {
  const rows = FACE_ROWS[face] || FACE_ROWS.round;
  const dk = shade(skin, -0.12);
  rows.forEach(([y, a, b], i) => { g.hline(a, b, y, skin); if (i === rows.length - 1) g.hline(a, b, y, dk); });
  // 귀
  const mid = rows.find(([y]) => y === 13);
  g.p(mid[1] - 1, 13, skin); g.p(mid[1] - 1, 14, dk); g.p(mid[2] + 1, 13, skin); g.p(mid[2] + 1, 14, dk);
}

// ---------- 얼굴 ----------
const LX = 10, RX = 18, EY = 12;   // 왼눈 x 10~11, 오른눈 x 18~19
// 왼쪽 그림을 오른쪽에 거울처럼 (가운데 x 14.5 기준)
function pair(g, y, rows, pal) {
  g.spr(LX - 1, y, rows, pal);
  g.spr(RX - 1, y, rows, pal, true);
}
const eyePair = (g, rows, pal) => pair(g, EY - 1, rows, pal);
function drawEyes(g, style) {
  const K = { k: INK, w: '#ffffff' };
  switch (style) {
    case 'round': eyePair(g, ['....', '.wk.', '.kk.'], K); break;
    case 'big': eyePair(g, ['.wk.', '.kk.', '.kk.'], K); break;
    case 'lash': eyePair(g, ['k...', '.wk.', '.kk.'], K); break;
    case 'smile': eyePair(g, ['....', '..k.', '.k.k'], K); break;
    case 'wink': g.spr(LX - 1, EY - 1, ['....', '.wk.', '.kk.'], K); g.spr(RX - 1, EY - 1, ['....', '....', '.kkk'], K); break;
    case 'sleepy': eyePair(g, ['....', '....', '.kkk'], K); break;
    case 'cool': eyePair(g, ['....', '.kkk', '.kk.'], K); break;
    case 'star': eyePair(g, ['..y.', '.yyy', '..y.'], { y: '#fab005' }); break;
    case 'pe_heart': eyePair(g, ['.r.r', '.rrr', '..r.'], { r: '#f03e3e' }); break;
    case 'pe_sparkle': eyePair(g, ['.wb.', '.bb.', '.bw.'], { w: '#ffffff', b: '#4c6ef5' }); break;
    case 'pe_cat': eyePair(g, ['.gk.', '.gk.', '.gk.'], { g: '#40c057', k: INK }); break;
    case 'pe_anime': eyePair(g, ['.kk.', '.wb.', '.bb.', '.cc.'], { k: INK, w: '#ffffff', b: '#1c7ed6', c: '#74c0fc' }); break;
    default: eyePair(g, ['....', '..k.', '..k.'], K);   // dot
  }
}
function drawBrows(g, style, color) {
  const pal = { b: color };
  switch (style) {
    case 'thick': pair(g, EY - 2, ['bbb.'], pal); break;
    case 'up': pair(g, EY - 3, ['...b', '.bb.'], pal); break;
    case 'worried': pair(g, EY - 3, ['.b..', '..bb'], pal); break;
    case 'none': break;
    default: pair(g, EY - 2, ['.bb.'], pal);   // soft
  }
}
function drawNose(g, style, color) {
  switch (style) {
    case 'round': g.rect(14, 14, 2, 1, color); break;
    case 'tri': g.p(14, 14, color); g.rect(14, 15, 2, 1, color); break;
    case 'none': break;
    default: g.p(14, 14, color);
  }
}
function drawMouth(g, style) {
  const pal = { k: INK, r: '#e8596e', w: '#ffffff', t: '#ff8787' };
  const rows = {
    smile: ['k..k', '.kk.'],
    cat: ['k.kk.k', '.k..k.'],
    grin: ['kkkk', '.rr.'],
    teeth: ['kkkk', 'kwwk', '.kk.'],
    o: ['.kk.', '.kk.'],
    tongue: ['k..k', '.kk.', '..t.'],
    pout: ['.kk.', 'k..k'],
    flat: ['kkkk'],
  }[style] || ['k..k', '.kk.'];
  g.spr(style === 'cat' ? 12 : 13, 16, rows, pal);
}
function drawCheeks(g, style) {
  if (style === 'pink') { g.rect(9, 15, 2, 1, '#ff9fb3'); g.rect(19, 15, 2, 1, '#ff9fb3'); }
  if (style === 'freckles') [[9, 14], [11, 15], [10, 16], [18, 15], [20, 14], [19, 16]].forEach(([x, y]) => g.p(x, y, '#c08457'));
}

// ---------- 머리카락 ----------
// 무지개·우주 머리처럼 여러 색이면 줄마다 색이 바뀌어요
const HC = {
  hc_mint: ['#63e6be', '#38d9a9', '#20c997'],
  hc_silver: ['#f1f3f5', '#ced4da', '#adb5bd', '#868e96'],
  hc_fire: ['#ffd43b', '#ff922b', '#f76707', '#e03131'],
  hc_rainbow: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'],
  hc_galaxy: ['#5f3dc4', '#4c3aa8', '#3b2f86', '#4dabf7', '#1c1a4a'],
};
function hairPal(color) {
  if (HC[color]) {
    const cols = HC[color];
    return (y) => { const c = cols[Math.floor(((y - 2) / 3)) % cols.length] || cols[0]; return { h: c, d: shade(c, -0.25), l: shade(c, 0.4) }; };
  }
  return () => ({ h: color, d: shade(color, -0.3), l: shade(color, 0.35) });
}
// 머리카락 그림 (x 6부터 18칸). 앞머리는 얼굴 위에, 뒷머리는 몸 뒤에.
const HAIR = {
  short: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhdhhhhhh.', '.hhh.hhdhh.hhdhhh.', '.hh............hh.', '.hh............hh.', '.d..............d.'],
  },
  side: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhlhhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhdhhhh.', '.hhhhhhhhhd..dhhh.', '.hhhhhhd.......hh.', '.hhhd..........hh.', '.hd.............d.'],
  },
  bob: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhhhdhhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.ddd..........ddd.'],
    back: ['', '', '', '', '', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'dd..............dd'],
  },
  long: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhhhdhhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hhh.'],
    back: ['', '', '', '', '', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hh..............hh', 'hhh............hhh', 'hhhh..........hhhh', '.hhhh........hhhh.', '.hhhh........hhhh.', '.hhhh........hhhh.', '.dddd........dddd.', '..dd..........dd..'],
  },
  ponytail: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhdhhhhh.', '.hhh.hhdhh..hdhhh.', '.hh............hh.', '.hh............hh.', '.d..............d.'],
    back: ['', '', '', '.................r', '................hhh', '.................hhh', '.................hhh', '..................hh', '..................hh', '..................hh', '..................hh', '.................hhh', '.................hh.', '.................dd.'],
  },
  pigtails: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhdhhhhh.', '.hhh.hhdhh..hdhhh.', '.hh............hh.', '.hh............hh.', '.d..............d.'],
    back: ['', '', '', '', '', '', '', 'rr..............rr', 'hhh............hhh', 'hhh............hhh', 'hhh............hhh', '.hh............hh.', '.hh............hh.', '.hhh..........hhh.', '..hh..........hh..', '..dd..........dd..'],
  },
  spiky: {
    front: ['..h...hh..hh...h..', '..hh.hhhhhhhh.hh..', '..hhhhhhllhhhhhh..', '.hhhhhhlhhhhhhhhh.', 'hhhhhhhhhhhhhhhhhh', '.hhhhhhhhhhhhhhhh.', '.hhh.hhhdhh.hhhhh.', '.hh...h....h...hh.', '.hh............hh.', '.d..............d.'],
  },
  curly: {
    front: ['....hh.hhhh.hh....', '..hhhhhhhhhhhhhh..', '.hhhhlhhhhhhlhhhh.', 'hhhhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhhhhhhh', 'hhdhhdhhdhhdhhdhhh', 'hhh.h.hh.hh.h.hhhh', 'hhh............hhh', '.hh............hh.', '.hh............hh.', '.dd............dd.'],
  },
  buzz: {
    front: ['', '', '....dhdhdhdhdh....', '...hdhdhdhdhdhd...', '..dhdhdhdhdhdhdh..', '..hdhdhdhdhdhdhd..', '..d............d..'],
  },
  ph_bun: {
    front: ['......hhhhhh......', '.....hhllhhhh.....', '......dhhhhd......', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhdhhhhh.', '.hhh.hhdhh..hdhhh.', '.hh............hh.', '.hh............hh.', '.d..............d.'],
    y0: 0,
  },
  ph_wavy: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhhhdhhh.', '.hhh..........hhh.', '..hhh........hhh..', '.hhh..........hhh.', '..hhh........hhh..', '.hhh..........hhh.', '..hhh........hhh..', '.hhh..........hhh.'],
    back: ['', '', '', '', '', 'hh..............hh', 'hh..............hh', 'hh..............hh', '.hh............hh.', 'hh..............hh', '.hh............hh.', 'hh..............hh', '.hh............hh.', 'hhh............hhh', '.hhh..........hhh.', 'hhh............hhh', '.hhh..........hhh.', '.ddd..........ddd.'],
  },
  ph_braid: {
    front: ['.....hhhhhhhh.....', '...hhhhllhhhhhh...', '..hhhllhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhhh.', '.hhhdhhhhhhhhdhhh.', '.hhh..........hhh.', '.hhh..........hhh.', '.hhh..........hh..', '.hhh..............', '..hdh.............', '..dhd.............', '..hdh.............', '..dhd.............', '..hdh.............', '..dhd.............', '...r..............', '..hhh.............'],
  },
  ph_afro: {
    front: ['....hhhhhhhhhh....', '..hhhhhhhhhhhhhh..', '.hhhhhhhllhhhhhhh.', 'hhhhhhhllhhhhhhhhh', 'hhhhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhhhhhhh', 'hhhhdhhhhhhhhdhhhh', 'hhhh..........hhhh', 'hhh............hhh', 'hhh............hhh', '.hh............hh.', '.dd............dd.'],
    y0: 0,
  },
  ph_mohawk: {
    front: ['.......hhhh.......', '.......hllh.......', '.......hhhh.......', '.......hhhh.......', '...ddddhhhhdddd...', '..dddddhhhhddddd..', '..d.....hh.....d..'],
    y0: 1,
  },
};
function drawHair(g, which, style, color) {
  const h = HAIR[style] || HAIR.short;
  const rows = h[which];
  if (!rows) return;
  const pal = hairPal(color);
  const y0 = h.y0 ?? 2;
  rows.forEach((row, j) => g.spr(6, y0 + j, [row], { ...pal(y0 + j), r: '#ff6b9a' }));
}

// ---------- 몸 ----------
const TOPS = {
  t_blue: '#4c8df6', t_red: '#f05252', t_yellow: '#ffd43b', t_green: '#51cf66', t_stripe: '#ffffff', t_hoodie: '#9775fa', t_uniform: '#ffffff',
  t_jersey: '#e03131', t_hanbok: '#ffc9de', t_hero: '#3b5bdb', t_space: '#f1f3f5', t_king: '#c92a2a',
};
const LONG_SLEEVE = ['t_hoodie', 't_uniform', 't_hanbok', 't_hero', 't_space', 't_king'];

function drawBody(g, c) {
  const skin = c.skin;
  const base = TOPS[c.top] || TOPS.t_blue;
  const dk = shade(base, -0.18);
  // 목
  g.rect(13, 19, 4, 1, shade(skin, -0.15));
  // 몸통 x 10~19, y 20~28
  g.rect(10, 20, 10, 9, base); g.rect(19, 20, 1, 9, dk); g.hline(10, 19, 28, dk);
  // 팔
  const sleeve = LONG_SLEEVE.includes(c.top) ? 7 : 3;
  for (const ax of [8, 20]) {
    g.rect(ax, 21, 2, 7, skin); g.rect(ax, 21, 2, sleeve, ax === 20 ? dk : base);
    g.rect(ax, 28, 2, 1, skin);   // 손
  }
  g.hline(9, 20, 20, base);
  // 옷 무늬
  const pal = { w: '#ffffff', r: '#e03131', n: '#1c3d7a', y: '#ffd43b', k: INK, b: '#4c8df6', g: '#adb5bd', p: '#ff6b9a', f: '#fff9db', o: '#f08c00', s: '#e64980', c: '#74c0fc' };
  switch (c.top) {
    case 't_stripe': for (let y = 21; y < 28; y += 2) g.hline(10, 19, y, '#4c8df6'); g.rect(8, 21, 2, 1, '#4c8df6'); g.rect(20, 21, 2, 1, '#4c8df6'); break;
    case 't_hoodie': g.spr(11, 20, ['h......h', '.hhhhhh.'], { h: dk }); g.spr(13, 21, ['w..w', 'w..w'], pal); g.rect(12, 25, 6, 2, dk); break;
    case 't_uniform': g.spr(12, 20, ['kk..kk', '..rr..', '..rr..', '..rr..', '...r..'], { k: '#dee2e6', r: '#c92a2a' }); break;
    case 't_jersey': g.spr(13, 22, ['wwww', '...w', '..w.', '..w.', '.w..'], pal); g.rect(8, 21, 2, 1, '#fff'); g.rect(20, 21, 2, 1, '#fff'); break;
    case 't_hanbok':
      g.spr(11, 20, ['ww....ww', '.ww..ww.', '..wwww..', '...rr...', '..rrrr..', '...r.r..'], { w: '#ffffff', r: '#e03131' });
      for (const ax of [8, 20]) ['#ff6b6b', '#ffd43b', '#51cf66', '#4c8df6', '#9775fa', '#ff6b6b', '#ffd43b'].forEach((col, i) => g.rect(ax, 21 + i, 2, 1, col));
      break;
    case 't_hero': g.spr(12, 22, ['..yy..', '.yrry.', 'yrrrry', '.yrry.', '..yy..'], { y: '#ffd43b', r: '#e03131' }); g.hline(10, 19, 27, '#ffd43b'); break;
    case 't_space': g.spr(10, 20, ['gggggggggg', '..........', '.bb....cc.', '.bb....cc.', '..........', 'gggggggggg'], pal); g.rect(8, 26, 2, 2, '#adb5bd'); g.rect(20, 26, 2, 2, '#adb5bd'); break;
    case 't_king': g.spr(10, 20, ['fkfffffkff', 'ffffffffff', '....ff....', '....ff....', '....fk....', '....ff....', '....ff....', '....ff....'], pal); g.rect(8, 27, 2, 1, '#fff9db'); g.rect(20, 27, 2, 1, '#fff9db'); break;
    default: g.spr(13, 20, ['k..k', '.kk.'].map((r) => r.replace(/k/g, 'd')), { d: dk });   // 둥근 깃
  }
}

const BOTTOMS = { b_navy: '#2f4b8a', b_shorts: '#8a929b', b_skirt: '#f783ac', b_jeans: '#4a7bc8', b_training: '#343a40', b_rainbow: '#ff6b6b', b_hanbok: '#e6f0ff', b_hanbok_skirt: '#7048e8' };
function drawLegs(g, c) {
  const skin = c.skin;
  const col = BOTTOMS[c.bottom] || BOTTOMS.b_navy;
  const dk = shade(col, -0.2);
  // 맨다리
  g.rect(11, 29, 3, 7, skin); g.rect(16, 29, 3, 7, skin);
  switch (c.bottom) {
    case 'b_shorts': g.rect(10, 28, 10, 1, col); g.rect(10, 29, 4, 3, col); g.rect(16, 29, 4, 3, col); g.rect(14, 29, 2, 1, col); break;
    case 'b_skirt': case 'b_rainbow': {
      const rows = c.bottom === 'b_rainbow' ? ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7'] : [col, col, col, dk, col];
      rows.forEach((rc, i) => g.hline(10 - (i > 2 ? 1 : 0), 19 + (i > 2 ? 1 : 0), 28 + i, rc));
      break;
    }
    case 'b_hanbok_skirt': for (let i = 0; i < 8; i++) g.hline(10 - Math.min(2, i >> 1), 19 + Math.min(2, i >> 1), 28 + i, i === 0 ? '#ffffff' : i === 7 ? dk : col); break;
    case 'b_hanbok': g.rect(10, 28, 10, 1, col); g.rect(9, 29, 6, 5, col); g.rect(15, 29, 6, 5, col); g.rect(10, 34, 4, 2, '#ffffff'); g.rect(16, 34, 4, 2, '#ffffff'); g.p(14, 30, dk); break;
    default:
      g.rect(10, 28, 10, 2, col); g.rect(11, 30, 3, 6, col); g.rect(16, 30, 3, 6, col); g.rect(10, 29, 1, 1, col); g.rect(19, 29, 1, 1, col);
      g.rect(13, 30, 1, 6, dk); g.rect(18, 30, 1, 6, dk);
      if (c.bottom === 'b_training') { g.rect(11, 30, 1, 6, '#ffffff'); g.rect(18, 30, 1, 6, '#ffffff'); }
      if (c.bottom === 'b_jeans') { g.p(12, 32, shade(col, 0.3)); g.p(17, 33, shade(col, 0.3)); g.hline(10, 19, 28, '#8a5a2b'); g.p(14, 28, '#ffd43b'); }
  }
}

const SHOES = { s_white: ['#f8f9fa', 0], s_black: ['#343a40', 0], s_red: ['#f03e3e', 0], s_rain: ['#ffd43b', 2], s_boots: ['#8a5a2b', 2], s_iron: ['#adb5bd', 2], s_gold: ['#fcc419', 1] };
function drawShoes(g, id) {
  const [col, tall] = SHOES[id] || SHOES.s_white;
  for (const x of [10, 16]) {
    g.rect(x + 1, 36 - tall, 3, tall, col);
    g.rect(x, 36, 4, 2, col); g.hline(x, x + 3, 37, shade(col, -0.25));
  }
  if (id === 's_white') { g.hline(10, 13, 37, '#ced4da'); g.hline(16, 19, 37, '#ced4da'); }
  if (id === 's_iron') { g.p(12, 35, '#868e96'); g.p(18, 35, '#868e96'); }
  if (id === 's_gold') { g.p(11, 36, '#fff3bf'); g.p(17, 36, '#fff3bf'); }
}

// ---------- 갑옷·장신구 ----------
function plate(g, main, light, dark, gem) {
  g.rect(10, 20, 10, 8, main); g.rect(11, 21, 2, 3, light); g.rect(19, 20, 1, 8, dark); g.hline(10, 19, 27, dark);
  g.rect(7, 19, 4, 3, main); g.rect(19, 19, 4, 3, main); g.hline(7, 10, 21, dark); g.hline(19, 22, 21, dark); g.p(8, 19, light); g.p(20, 19, light);
  if (gem) g.rect(14, 23, 2, 2, gem);
}
function drawArmor(g, id) {
  switch (id) {
    case 'a_leather':
      g.rect(10, 20, 10, 8, '#9c6644'); g.rect(19, 20, 1, 8, '#7f5539'); g.hline(10, 19, 27, '#7f5539');
      for (let i = 0; i < 6; i++) g.p(11 + i, 21 + i, '#7f5539');
      g.rect(8, 20, 2, 2, '#7f5539'); g.rect(20, 20, 2, 2, '#7f5539'); g.p(13, 26, '#fcc419');
      break;
    case 'a_chain': for (let y = 20; y < 28; y++) for (let x = 10; x < 20; x++) g.p(x, y, (x + y) % 2 ? '#adb5bd' : '#868e96'); g.rect(8, 21, 2, 3, '#868e96'); g.rect(20, 21, 2, 3, '#868e96'); break;
    case 'a_robe': g.rect(10, 20, 10, 16, '#7048e8'); g.rect(9, 30, 12, 6, '#7048e8'); g.rect(14, 20, 2, 16, '#fcc419'); g.hline(9, 20, 35, '#5f3dc4'); g.rect(8, 21, 2, 7, '#7048e8'); g.rect(20, 21, 2, 7, '#5f3dc4'); g.rect(8, 27, 2, 1, '#fcc419'); g.rect(20, 27, 2, 1, '#fcc419'); break;
    case 'a_knight': plate(g, '#ced4da', '#ffffff', '#868e96', '#e03131'); break;
    case 'a_gold': plate(g, '#fcc419', '#fff3bf', '#e67700', '#4c8df6'); break;
  }
}
function drawAccFront(g, id) {
  if (id === 'ac_medal') g.spr(13, 20, ['b..b', '.bb.', '.yy.', '.yy.'], { b: '#4c8df6', y: '#fcc419' });
  if (id === 'ac_scarf') { g.rect(11, 19, 8, 2, '#e03131'); g.hline(11, 18, 20, '#c92a2a'); g.rect(16, 21, 2, 4, '#e03131'); g.p(16, 25, '#c92a2a'); g.p(17, 25, '#c92a2a'); }
  if (id === 'ac_necklace') g.spr(11, 20, ['w......w', '.w....w.', '..wwww..', '...rr...'], { w: '#f8f9fa', r: '#e64980' });
}
function drawBack(g, c) {
  const wings = (pal, rows) => { g.spr(0, 17, rows, pal); g.spr(20, 17, rows, pal, true); };
  if (c.acc === 'ac_angel') wings({ w: '#ffffff', s: '#dee2e6' }, ['...ww.....', '.wwwww....', 'wwwwwwww..', 'wswwwwwww.', '.wswwwwwww', '..wswwwwww', '...wswwwww', '....wwwwww', '.....wwww.']);
  if (c.acc === 'ac_dragon') wings({ r: '#c92a2a', d: '#862e2e' }, ['r.........', 'rr........', 'rdr.......', 'rrdrr.....', 'r.rdrrr...', '.rrrdrrrrr', '..rrrrdrrr', '....rrrrrr', '......rrr.']);
  if (c.top === 't_hero' || c.top === 't_king') {
    const col = c.top === 't_hero' ? '#e03131' : '#a61e4d';
    for (let y = 20; y <= 35; y++) g.hline(9 - (y > 26 ? 1 : 0), 20 + (y > 26 ? 1 : 0), y, y === 35 ? shade(col, -0.3) : col);
  }
}

// ---------- 안경 ----------
function drawGlasses(g, id) {
  switch (id) {
    case 'g_round': pair(g, EY - 1, ['.kk.', 'k..k', 'k..k', '.kk.'], { k: INK }); g.hline(13, 16, EY, INK); break;
    case 'g_sun': pair(g, EY - 1, ['kkkk', 'swss', 'ssss', '.ss.'], { k: INK, s: '#212529', w: '#868e96' }); g.hline(13, 16, EY - 1, INK); break;
    case 'g_star': pair(g, EY - 2, ['.y..', 'yyyy', 'y..y', 'y..y', 'yyyy'], { y: '#fcc419' }); g.hline(13, 16, EY, '#fcc419'); break;
    case 'g_heart': pair(g, EY - 1, ['pp.p', 'pwpp', 'pppp', '.pp.'], { p: '#f06595', w: '#ffc9de' }); g.hline(13, 16, EY, '#f06595'); break;
  }
}

// ---------- 모자·투구 (x 6부터 18칸) ----------
const HATS = {
  h_ribbon: { y: 2, rows: ['............rr.rr.', '............rrkrr.', '.............r.r..'] },
  h_cap: { y: 2, rows: ['.....bbbbbbbb.....', '...bbbbwwbbbbbb...', '..bbbbbwwbbbbbbb..', '.bbbbbbbbbbbbbbbb.', '.dddddddddddddddddd', '................ddd'] },
  h_beanie: { y: 0, rows: ['........ww........', '.......wwww.......', '.....gggggggg.....', '...gggggggggggg...', '..gg.gg.gg.gg.gg..', '.gggggggggggggggg.', '.wwwwwwwwwwwwwwww.', '.wwwwwwwwwwwwwwww.'] },
  h_flower: { y: 3, rows: ['...p.....y.....p..', '..pyp...yoy...pyp.', '.gggpgggggygggpgg.'] },
  h_headphone: { y: 1, rows: ['.....kkkkkkkk.....', '...kk........kk...', '..k............k..', '.k..............k.', '.k..............k.', '.k..............k.', '.k..............k.', '.k..............k.', '.k..............k.', 'rrr............rrr', 'rrr............rrr', 'rrr............rrr', '.r..............r.'] },
  h_leather: { y: 1, rows: ['......aaaaaa......', '....aaaaaaaaaa....', '...aaalaaaaaaaa...', '..aaalaaaaaaaaaa..', '.aaaaaaaaaaaaaaaa.', '.dddddddddddddddd.', '.dd............dd.', '.dd............dd.', '.d..............d.'] },
  h_iron: { y: 1, rows: ['......gggggg......', '....gggggggggg....', '...ggwgggggggggh..', '..ggwgggggggggggh.', '.gggggggggggggggh.', '.hhhhhhhhhhhhhhhh.', '.hh.....hh.....hh.', '.hh.....hh.....hh.', '.hh............hh.', '.h..............h.'] },
  h_wizard: { y: 0, rows: ['.............pp...', '...........pppp...', '..........pppp....', '........ppppp.....', '.......ppypppp....', '......pppppppp....', '.....pppppppyp....', 'ddddddddddddddddd.', '.dddddddddddddddd.'], y0: -3 },
  h_knight: { y: 1, rows: ['........rr........', '.......rrr........', '....ssssssssss....', '...ssswsssssssh...', '..ssswsssssssssh..', '.sssssssssssssssh.', '.ssshhhhhhhhhhssh.', '.ss............sh.', '.ss............sh.', '.ss............sh.', '.ss............sh.', '.sh............hh.'] },
  h_crown: { y: 1, rows: ['...y....y....y....', '...yy..yyy..yy....', '...yyyyyyyyyyyy...', '...yryyybyyyryy...', '...oooooooooooo...'], x: 0 },
  h_dragon: { y: 0, rows: ['ww..............ww', '.ww............ww.', '..wrrrrrrrrrrrrw..', '..rrrrlrrrrrrrrr..', '.rrrlrrrrrrrrrrrr.', '.rrrrrrrrrrrrrrrr.', '.dddddyyyyyyddddd.', '.dd............dd.', '.dd............dd.', '.d..............d.'] },
};
function drawHat(g, id) {
  const h = HATS[id];
  if (!h) return;
  const pal = { r: '#e03131', k: INK, b: '#1c7ed6', d: id === 'h_cap' ? '#1864ab' : id === 'h_dragon' ? '#a61e1e' : '#7f5539', w: '#ffffff', g: id === 'h_beanie' ? '#ff922b' : id === 'h_flower' ? '#51cf66' : '#ced4da',
    p: id === 'h_wizard' ? '#7048e8' : '#ff8fab', y: '#fcc419', o: '#f08c00', a: '#9c6644', l: id === 'h_dragon' ? '#ff8787' : '#c08457', h: '#868e96', s: '#dee2e6' };
  if (id === 'h_dragon') pal.w = '#fff9db';
  if (id === 'h_wizard') pal.d = '#5f3dc4';
  if (id === 'h_crown') pal.r = '#e03131', pal.b = '#4c8df6';
  if (id === 'h_headphone') pal.r = '#f03e3e';
  g.spr(6 + (h.x || 0), h.y + (h.y0 || 0), h.rows, pal);
}

// 모자를 쓰면 가려지는 머리 꼭대기 (모자 아래로 머리가 삐져나오지 않게)
const HAT_CLEAR = { h_cap: 6, h_beanie: 7, h_leather: 6, h_iron: 6, h_knight: 7, h_dragon: 6, h_wizard: 5 };

// ---------- 방패 (왼쪽) ----------
const SHIELDS = {
  sh_wood: { rows: ['.dddddd.', 'daaadaad', 'daaadaad', 'daaadaad', 'daaadaad', 'daaadaad', '.daadad.', '..dddd..'], pal: { a: '#c08457', d: '#7f5539' } },
  sh_iron: { rows: ['.hhhhhh.', 'hgggggwh', 'hgkggggh', 'hgggggkh', 'hggggggh', 'hgkggggh', '.hgggkh.', '..hhhh..'], pal: { g: '#ced4da', h: '#868e96', w: '#ffffff', k: '#495057' } },
  sh_star: { rows: ['.bbbbbb.', 'bcccyccb', 'bccyyycb', 'byyyyyyb', 'bccyyycb', 'bcycccyb', '.bccccb.', '..bbbb..'], pal: { b: '#1864ab', c: '#4dabf7', y: '#ffd43b' } },
  sh_magic: { rows: ['.oooooo.', 'oppppppo', 'opppwppo', 'oppwcwpo', 'opppwppo', 'oppppppo', '.oppppo.', '..oooo..'], pal: { o: '#fcc419', p: '#7048e8', w: '#e5dbff', c: '#22b8cf' } },
  sh_dragon: { rows: ['.kkkkkk.', 'krrrrrrk', 'kryrryrk', 'krryyrrk', 'krrrrrrk', 'kryyyyrk', '.krrrrk.', '..kkkk..'], pal: { k: '#5c0f0f', r: '#c92a2a', y: '#fcc419' } },
};
function drawShield(g, id) {
  const s = SHIELDS[id];
  if (s) g.spr(3, 22, s.rows, s.pal);
}

// ---------- 손에 든 것 (오른쪽, 손은 x 20~21, y 28) ----------
const HELD = {
  i_book: { x: 19, y: 24, rows: ['rrrrr', 'rwwwr', 'rwkwr', 'rwwwr', 'rrrrr'], pal: { r: '#e03131', w: '#fff9db', k: '#868e96' } },
  i_pencil: { x: 21, y: 20, rows: ['....p', '...yy', '..yy.', '.yy..', 'ww...', 'k....'], pal: { p: '#ff8fab', y: '#fcc419', w: '#f4c48f', k: INK } },
  i_balloon: { x: 21, y: 6, rows: ['.rrrr.', 'rrwrrr', 'rwrrrr', 'rrrrrr', 'rrrrrr', '.rrrr.', '..rr..', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '..s...', '.s....', '.s....'], pal: { r: '#ff6b6b', w: '#ffffff', s: '#868e96' } },
  i_wood_sword: { x: 21, y: 15, rows: ['.a.', '.a.', '.a.', '.a.', '.a.', '.a.', '.a.', '.a.', '.a.', 'ddd', '.d.', '.d.'], pal: { a: '#c08457', d: '#7f5539' } },
  i_hammer: { x: 20, y: 17, rows: ['ppppppp', 'ppwpppp', 'ppppppp', 'yyyyyyy', '...y...', '...y...', '...y...', '...y...', '...y...', '...y...', '...y...'], pal: { p: '#ff8fab', w: '#ffffff', y: '#fcc419' } },
  i_bow: { x: 20, y: 18, rows: ['.aa.', '..ak', '...a', '...a', '...a', '...a', '...a', '...a', '..ak', '.aa.'], pal: { a: '#9c6644', k: '#dee2e6' } },
  i_wand: { x: 20, y: 18, rows: ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.', '..k..', '..k..', '..k..', '..k..', '..k..'], pal: { y: '#ffd43b', k: '#5c4033' } },
  i_sword: { x: 21, y: 13, rows: ['.w.', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'wsw', 'yyy', '.b.', '.b.', '.y.'], pal: { w: '#f1f3f5', s: '#adb5bd', y: '#fcc419', b: '#5c4033' } },
  i_staff: { x: 20, y: 4, rows: ['.ooo.', 'ocwco', 'occco', '.ooo.', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..', '..a..'], pal: { o: '#7048e8', c: '#22b8cf', w: '#e3fafc', a: '#7f5539' } },
  i_trophy: { x: 19, y: 22, rows: ['y.yyy.y', 'yyywyyy', '.yyyyy.', '..yyy..', '...y...', '..ooo..', '.ooooo.'], pal: { y: '#fcc419', o: '#e67700', w: '#fff3bf' } },
  i_flame: { x: 21, y: 12, rows: ['.o..', 'oyo.', '.yr.', 'oyro', '.yr.', 'oyr.', '.yro', 'oyr.', '.yr.', 'oyro', '.yr.', 'kkk.', '.b..', '.b..', '.k..'].map((r) => r), pal: { o: '#ff922b', y: '#ffd43b', r: '#f03e3e', k: '#495057', b: '#5c4033' } },
};
function drawHeld(g, id) {
  const h = HELD[id];
  if (h) g.spr(h.x, h.y, h.rows, h.pal);
}

// ---------- 펫 (오른쪽 아래) ----------
const PETS = {
  p_chick: { rows: ['..yyy...', '.yyyyy..', '.ykyyyo.', '.yyyyy..', 'yyyyyyy.', 'yyyyyyy.', '.yyyyy..', '..o.o...'], pal: { y: '#ffd43b', k: INK, o: '#f08c00' } },
  p_cat: { rows: ['o....o..', 'oo..oo..', 'oooooo..', 'okooko..', 'oopooo.o', '.oooo..o', '.oooooo.', '.o..o...'], pal: { o: '#ffa94d', k: INK, p: '#ff8fab' } },
  p_dog: { rows: ['dd..dd..', 'dwwwwd..', '.wkwkw..', '.wwkww..', '.wwwww.w', '..wwwwww', '..wwwww.', '..w..w..'], pal: { w: '#f1e3d3', d: '#9c6644', k: INK } },
  p_rabbit: { rows: ['.w..w...', '.wp.wp..', '.w..w...', 'wwwwww..', 'wkwwkw..', 'wwppww..', '.wwwwww.', '.w..ww..'], pal: { w: '#ffffff', p: '#ffc9de', k: INK } },
  p_dino: { rows: ['...gggg.', '...gkgg.', '...ggggg', '.g.ggg..', 'gggggg..', '.ggggg..', '..g..g..', '..g..g..'], pal: { g: '#51cf66', k: INK } },
  p_unicorn: { rows: ['..y.....', '.ww.....', 'wwkw....', 'wwww....', '.wwpwwww', '..wwwwwp', '..w..w..', '..w..w..'], pal: { w: '#ffffff', y: '#fcc419', k: INK, p: '#da77f2' } },
  p_dragon: { rows: ['.r....r.', '.rrrrrr.', 'rrkrrkrr', '.rrrrrr.', 'w.rrrr.w', 'wwrrrrww', '..rrrr..', '..r..rr.'], pal: { r: '#e03131', k: INK, w: '#ff8787' } },
};
function drawPet(g, id) {
  const pt = PETS[id];
  if (pt) g.spr(22, 31, pt.rows, pt.pal);
}

// ---------- 테두리 & SVG로 바꾸기 ----------
function outline(ch) {
  const out = ch.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (ch[y][x]) continue;
    if ((ch[y - 1]?.[x]) || (ch[y + 1]?.[x]) || ch[y][x - 1] || ch[y][x + 1]) out[y][x] = INK;
  }
  return out;
}
function toRects(grid, x0, y0, w, h) {
  let s = '';
  for (let y = y0; y < y0 + h; y++) {
    let x = x0;
    while (x < x0 + w) {
      const c = grid[y][x];
      let e = x + 1;
      while (e < x0 + w && grid[y][e] === c) e++;
      if (c) s += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${c}"/>`;
      x = e;
    }
  }
  return s;
}

export function pixelAvatarSvg(cfgIn, mode = 'full') {
  const c = cleanCfg(cfgIn);
  const g = canvas();
  drawBg(g, c.bg);
  drawBack(g, c);
  drawHair(g, 'back', c.hair, c.hairColor);
  drawLegs(g, c);
  drawShoes(g, c.shoes);
  drawBody(g, c);
  drawArmor(g, c.armor);
  drawAccFront(g, c.acc);
  drawHead(g, c.face, c.skin);
  drawCheeks(g, c.cheek);
  const browCol = c.browColor === 'auto' ? (HC[c.hairColor] ? HC[c.hairColor][1] : shade(c.hairColor, -0.2)) : c.browColor;
  drawBrows(g, c.brows, browCol);
  drawEyes(g, c.eyes);
  drawNose(g, c.nose, c.noseColor === 'auto' ? shade(c.skin, -0.25) : c.noseColor);
  drawMouth(g, c.mouth);
  // 모자를 쓰면 모자 아래 머리만 그려요
  if (HAT_CLEAR[c.hat]) {
    const keep = g.ch.map((r) => r.slice());
    drawHair(g, 'front', c.hair, c.hairColor);
    for (let y = 0; y < HAT_CLEAR[c.hat]; y++) g.ch[y] = keep[y].slice();
  } else drawHair(g, 'front', c.hair, c.hairColor);
  drawGlasses(g, c.glasses);
  drawHat(g, c.hat);
  drawShield(g, c.shield);
  drawHeld(g, c.held);
  drawPet(g, c.pet);
  // 그림자는 테두리 밖에
  const ch = outline(g.ch);
  for (let x = 9; x <= 20; x++) if (!ch[38][x]) ch[38][x] = 'rgba(0,0,0,0.18)';

  const portrait = mode === 'portrait';
  const [vx, vy, vw, vh] = portrait ? [4, 1, 22, 22] : [0, 0, W, H];
  const merged = g.bg.map((row, y) => row.map((col, x) => ch[y][x] || col));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" shape-rendering="crispEdges" role="img" aria-label="아바타">${toRects(merged, vx, vy, vw, vh)}</svg>`;
}
