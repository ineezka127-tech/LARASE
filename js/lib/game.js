// 🎲 보드게임 규칙 (맵·몬스터·전투 계산). 화면은 js/pages/game.js
// 능력치: 공격(내가 입히는 피해) · 방어(턴마다 받는 방패) · 체력 · 행운(나만, 크리티컬·보상·주사위)

// ---------- 지역(존) 별 몬스터 능력치 ----------
// z: 1~6 (월드 1 = z1·z2, 월드 2 = z3·z4, 월드 3 = z5·z6, 그 뒤 월드는 z6를 점점 강하게)
// 기준: "그 지역 추천 레벨 + 장비를 대충 맞춘" 학생이면 일반 몬스터 1방, 엘리트 3~4방, 보스 5~6방
const Z = {
  //        추천Lv   일반(hp,atk,def)  엘리트(hp,atk,def)  보스(hp,atk,def)
  1: { lv: '1~2', mob: [9, 3, 0], elite: [30, 5, 0], boss: [52, 8, 1] },
  2: { lv: '3~4', mob: [11, 4, 1], elite: [36, 7, 1], boss: [60, 9, 2] },
  3: { lv: '5~6', mob: [13, 6, 2], elite: [44, 10, 2], boss: [76, 14, 3] },
  4: { lv: '7~8', mob: [16, 8, 3], elite: [54, 13, 3], boss: [92, 16, 4] },
  5: { lv: '9~11', mob: [19, 11, 4], elite: [64, 17, 4], boss: [110, 22, 5] },
  6: { lv: '12+', mob: [24, 14, 5], elite: [84, 21, 5], boss: [146, 26, 6] },
};

export function zoneStats(z) {
  if (z <= 6) return Z[z];
  // 월드 4부터: z6 를 18%씩 강하게
  const k = Math.pow(1.18, z - 6);
  const s = (a) => [Math.round(a[0] * k), Math.round(a[1] * k), Math.round(a[2] + (z - 6))];
  return { lv: '15+', mob: s(Z[6].mob), elite: s(Z[6].elite), boss: s(Z[6].boss) };
}

export const WORLDS = [
  { name: '새싹 숲', emoji: '🌲', bg: ['#d8f5c8', '#a9e08c'], path: '#c99c62',
    mobs: [['🐛', '애벌레'], ['🐌', '달팽이'], ['🍄', '버섯돌이']], elite: ['🐗', '성난 멧돼지'], boss: ['🐻', '숲의 왕 곰'] },
  { name: '어둠 동굴', emoji: '🦇', bg: ['#c9c3e6', '#8e86b8'], path: '#6d6491',
    mobs: [['🦇', '박쥐'], ['🕷️', '거미'], ['🐍', '뱀']], elite: ['🦂', '독전갈'], boss: ['🐲', '동굴 드래곤'] },
  { name: '유령의 성', emoji: '🏰', bg: ['#e6d3f0', '#a77fc0'], path: '#7b5b8c',
    mobs: [['👻', '유령'], ['💀', '해골 병사'], ['🧟', '좀비']], elite: ['🧛', '흡혈귀'], boss: ['👹', '마왕'] },
];
export const worldInfo = (w) => WORLDS[(w - 1) % WORLDS.length];
// 월드의 앞쪽/뒤쪽 존
export const zoneOf = (world, tileIdx) => (world - 1) * 2 + (tileIdx >= 15 ? 2 : 1);

// ---------- 맵 (모든 월드가 같은 모양, 몬스터·색만 바뀜) ----------
// type: start, step, mob, elite, boss, chest, trap, rest(쉼터·체크포인트), gate(험한 길: 주사위 2개 합 ≥ need), island(무인도)
// next: 다음 칸 (2개면 갈림길)
export const MAP = [
  { id: 0, x: 70, y: 560, type: 'start', next: [1] },
  { id: 1, x: 150, y: 560, type: 'step', next: [2] },
  { id: 2, x: 230, y: 560, type: 'mob', next: [3] },
  { id: 3, x: 310, y: 560, type: 'chest', next: [4] },
  { id: 4, x: 390, y: 560, type: 'step', next: [5] },
  { id: 5, x: 470, y: 560, type: 'mob', next: [6] },
  { id: 6, x: 550, y: 540, type: 'step', next: [7, 40] },            // 갈림길 1
  // 윗길: 험한 길목(9 이상) → 보물이 많음
  { id: 7, x: 560, y: 450, type: 'gate', need: 9, next: [8] },
  { id: 8, x: 520, y: 370, type: 'chest', next: [9] },
  { id: 9, x: 440, y: 330, type: 'mob', next: [10] },
  { id: 10, x: 360, y: 310, type: 'chest', next: [11] },
  { id: 11, x: 280, y: 300, type: 'step', next: [14] },
  // 아랫길: 돌아가지만 안전
  { id: 40, x: 640, y: 520, type: 'step', next: [41] },
  { id: 41, x: 720, y: 490, type: 'mob', next: [42] },
  { id: 42, x: 760, y: 410, type: 'trap', next: [43] },
  { id: 43, x: 720, y: 330, type: 'step', next: [44] },
  { id: 44, x: 640, y: 290, type: 'mob', next: [45] },
  { id: 45, x: 540, y: 260, type: 'step', next: [46] },
  { id: 46, x: 440, y: 240, type: 'chest', next: [47] },
  { id: 47, x: 340, y: 230, type: 'step', next: [14] },
  // 합쳐짐
  { id: 14, x: 200, y: 250, type: 'rest', next: [15] },
  { id: 15, x: 130, y: 190, type: 'elite', next: [16] },
  { id: 16, x: 150, y: 110, type: 'step', next: [17] },
  { id: 17, x: 230, y: 70, type: 'mob', next: [18] },
  { id: 18, x: 320, y: 60, type: 'step', next: [19, 50] },          // 갈림길 2
  // 윗길: 무인도와 보물
  { id: 19, x: 410, y: 40, type: 'island', next: [20] },
  { id: 20, x: 500, y: 40, type: 'chest', next: [21] },
  { id: 21, x: 590, y: 50, type: 'mob', next: [24] },
  // 아랫길: 엘리트와 함정
  { id: 50, x: 400, y: 140, type: 'trap', next: [51] },
  { id: 51, x: 490, y: 160, type: 'elite', next: [52] },
  { id: 52, x: 580, y: 150, type: 'chest', next: [24] },
  // 합쳐짐 → 보스
  { id: 24, x: 680, y: 100, type: 'rest', next: [25] },
  { id: 25, x: 770, y: 80, type: 'mob', next: [26] },
  { id: 26, x: 860, y: 110, type: 'gate', need: 7, next: [27] },
  { id: 27, x: 900, y: 200, type: 'mob', next: [28] },
  { id: 28, x: 880, y: 290, type: 'chest', next: [29] },
  { id: 29, x: 900, y: 390, type: 'elite', next: [30] },
  { id: 30, x: 900, y: 490, type: 'boss', next: [] },
];
export const TILE = Object.fromEntries(MAP.map((t) => [t.id, t]));
// 진행 순서 (존 계산용): 맵에서 출발점부터 몇 번째쯤인지
export const ORDER = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 40: 7, 41: 8, 42: 9, 43: 10, 44: 11, 45: 12, 46: 13, 47: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 50: 19, 51: 20, 52: 21, 24: 22, 25: 23, 26: 24, 27: 25, 28: 26, 29: 27, 30: 28 };
export const BLOCKING = ['mob', 'elite', 'boss', 'gate'];   // 지나가다 멈추는 칸

export const TILE_INFO = {
  start: ['🏁', '출발'], step: ['', '길'], mob: ['⚔️', '몬스터'], elite: ['💀', '엘리트 몬스터'], boss: ['👑', '보스'],
  chest: ['🎁', '보물 상자'], trap: ['⚠️', '함정'], rest: ['⛲', '쉼터 (체력 회복·저장)'], gate: ['🪨', '험한 길목'], island: ['🏝️', '무인도'],
};

// ---------- 몬스터 만들기 ----------
export function makeEnemy(world, tileId) {
  const t = TILE[tileId];
  const z = zoneOf(world, ORDER[tileId] ?? 0);
  const zs = zoneStats(z);
  const w = worldInfo(world);
  const [hp, atk, def] = zs[t.type];
  const mobIdx = MAP.filter((x) => x.type === 'mob').findIndex((x) => x.id === tileId);
  const look = t.type === 'mob' ? w.mobs[mobIdx % w.mobs.length] : t.type === 'elite' ? w.elite : w.boss;
  return { emoji: look[0], name: look[1], kind: t.type, hp, maxHp: hp, atk, def, z, lv: zs.lv };
}

// ---------- 전투 계산 ----------
export const PLAYER_HP_BONUS = 8;   // 게임 속 체력 = 능력치 체력 + 8 (처음에도 몇 번은 버티게)
export const maxHp = (stats) => stats.hp + PLAYER_HP_BONUS;
export const critChance = (luck) => Math.min(0.3, 0.05 + luck * 0.01);
export const bonusChance = (luck) => Math.min(0.25, 0.05 + luck * 0.008);
export const diceLuckChance = (luck) => Math.min(0.15, luck * 0.01);

// 내 공격: 맞히면 4 + 공격력×2 − 적 방어 (최소 2), 크리티컬이면 1.5배
export function playerDamage(stats, enemy, crit) {
  const d = Math.max(2, 4 + stats.atk * 2 - enemy.def);
  return crit ? Math.round(d * 1.5) : d;
}

// 적의 공격: 방어 문제를 맞히면 (방어력 + 2) 만큼, 틀리면 방어력의 1/3 만큼 막아요
export function blockAmount(stats, correct) {
  return correct ? stats.def + 2 : Math.floor(stats.def / 3);
}
export function enemyDamage(enemy, block) {
  return Math.max(enemy.kind === 'mob' ? 0 : 1, enemy.atk - block);
}

export const ITEM_INFO = {
  potion: ['🧪', '체력 물약', '체력을 절반 회복'],
  big_potion: ['💖', '큰 물약', '체력을 모두 회복'],
  dice: ['🎲', '주사위 티켓', '오늘 주사위 1번 더'],
};
