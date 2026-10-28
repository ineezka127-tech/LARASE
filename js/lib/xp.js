// 경험치·레벨·배지 규칙 (supabase 의 xp_need / level_for_xp 와 같은 공식)
// 레벨 L → L+1 에 필요한 경험치 = 40 × L^1.4 (5 단위 반올림): 40, 105, 185, 280, 380 … 1005(Lv10)
export function needFor(level) {
  return Math.round((40 * Math.pow(level, 1.4)) / 5) * 5;
}

export function levelInfo(xp) {
  let level = 1;
  let left = Math.max(0, xp || 0);
  while (left >= needFor(level)) {
    left -= needFor(level);
    level += 1;
  }
  const need = needFor(level);
  return { level, into: left, need, pct: Math.round((left / need) * 100) };
}

export const LEVEL_TITLES = [
  [1, '새싹 탐험가'], [3, '씩씩한 모험가'], [5, '지혜의 기사'], [8, '빛나는 마법사'],
  [12, '전설의 용사'], [16, '복습 마스터'], [20, '기억의 왕'],
];

export function levelTitle(level) {
  let t = LEVEL_TITLES[0][1];
  for (const [lv, name] of LEVEL_TITLES) if (level >= lv) t = name;
  return t;
}

// [아이콘, 활동, 경험치, 코인]
export const XP_GUIDE = [
  ['📖', '복습 자료 보기', '+4 (다른 날 +2)', '+1'],
  ['✅', '처음 맞힌 문제', '+5', '+2'],
  ['💪', '틀렸던 문제 맞히기', '+4', '+3'],
  ['🔁', '다른 날 다시 맞히기', '+1', '+1'],
  ['🙂', '도전하기 (틀려도)', '+1', ''],
  ['✍️', '서술형 제출 / 선생님 채점', '+2 / 최대 +5', '+1 / 최대 +3'],
  ['🏁', '퀴즈 끝까지 (만점이면 2배)', '+5 / +10', '+5 / +10'],
  ['🗂️', '묶음 퀴즈 끝까지 (만점이면 2배)', '+5 / +10', '+5 / +10'],
  ['🔥', '오늘 첫 활동 (연속 출석)', '+4 ~ +8', '+3'],
  ['⭐', '레벨 업', '스탯 포인트 +1', '+20'],
  ['🎁', '선생님 칭찬', '', '선생님 마음대로!'],
];

// 배지: 내 기록으로 계산
export function computeBadges({ profile, attempts, events }) {
  const count = (kind) => events.filter((e) => e.kind === kind).length;
  const maxStreak = Math.max(profile.streak || 0, ...events.filter((e) => e.kind === 'daily').map((e) => Number(e.ref) || 0));
  const perfect = events.some((e) => e.kind === 'quiz_done' && e.xp >= 20);
  return [
    { icon: '👣', name: '첫 걸음', desc: '첫 문제 풀기', got: attempts.length >= 1 },
    { icon: '📖', name: '복습 새싹', desc: '복습 자료 10번 보기', got: count('view') >= 10 },
    { icon: '🔥', name: '3일 연속', desc: '3일 연속 공부하기', got: maxStreak >= 3 },
    { icon: '🌟', name: '일주일 개근', desc: '7일 연속 공부하기', got: maxStreak >= 7 },
    { icon: '💯', name: '만점왕', desc: '퀴즈 모두 맞히기', got: perfect },
    { icon: '💪', name: '오답 극복', desc: '틀린 문제 5개 다시 맞히기', got: count('comeback') >= 5 },
    { icon: '🧠', name: '문제 100개', desc: '문제 100번 풀기', got: attempts.length >= 100 },
    { icon: '🛡️', name: '레벨 5', desc: '레벨 5 달성', got: profile.level >= 5 },
    { icon: '🏆', name: '레벨 10', desc: '레벨 10 달성', got: profile.level >= 10 },
  ];
}
