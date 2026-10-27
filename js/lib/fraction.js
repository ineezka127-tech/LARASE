// 분수 계산·채점·글자 표시 도우미
// 답 형식: { w: 자연수|null, n: 분자|null, d: 분모|null }

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const num = (v) => (v === '' || v == null ? null : Number(v));

export function isComplete(a) {
  if (!a) return false;
  const w = num(a.w), n = num(a.n), d = num(a.d);
  if (n != null && d != null) return d > 0;
  return w != null && n == null && d == null;   // 자연수만 쓴 답 (예: 6/3 = 2)
}

// 값 비교용: [분자, 분모] (가분수)
function toRatio(a) {
  const w = num(a.w) || 0, n = num(a.n), d = num(a.d);
  if (n == null || d == null) return [w, 1];
  return [w * d + n, d];
}

export function sameValue(a, b) {
  const [p, q] = toRatio(a), [r, s] = toRatio(b);
  return p * s === r * q;
}

// 대분수: 자연수가 있고 분자 < 분모 (또는 자연수만)
export function isMixed(a) {
  const w = num(a.w), n = num(a.n), d = num(a.d);
  if (n == null) return w != null;
  return w != null && w > 0 && n < d;
}

// 가분수(또는 진분수): 자연수 없이 분자/분모만
export function isImproper(a) {
  const w = num(a.w), n = num(a.n);
  return (w == null || w === 0) && n != null;
}

export function isLowest(a) {
  const n = num(a.n), d = num(a.d);
  if (n == null) return true;
  return gcd(n, d) === 1;
}

// 채점 → { correct, hint }   (값은 맞았지만 형태가 다르면 hint)
export function checkFraction(data, given) {
  if (!isComplete(given)) return { correct: false, hint: '' };
  const ans = data.answer;
  if (!sameValue(ans, given)) return { correct: false, hint: '' };
  if (data.form === 'mixed' && !isMixed(given)) return { correct: false, hint: '값은 맞았어요! 대분수로 나타내 볼까요?' };
  if (data.form === 'improper' && !isImproper(given)) return { correct: false, hint: '값은 맞았어요! 가분수로 나타내 볼까요?' };
  if (data.lowest && !isLowest(given)) return { correct: false, hint: '값은 맞았어요! 더 간단하게(기약분수로) 나타내 볼까요?' };
  if (data.form === 'exact') {
    const same = (x, y) => (num(x) || 0) === (num(y) || 0);
    if (!(same(ans.w, given.w) && same(ans.n, given.n) && same(ans.d, given.d))) return { correct: false, hint: '값은 맞았어요! 문제에서 말한 모양으로 써 볼까요?' };
  }
  return { correct: true, hint: '' };
}

// 글자 표시용 표기: {2 1/3}, {7/3}, 2
export function fracToken(a) {
  const w = num(a.w), n = num(a.n), d = num(a.d);
  if (n == null || d == null) return String(w ?? '');
  return w ? `{${w} ${n}/${d}}` : `{${n}/${d}}`;
}

// "2 1/3", "{7/3}", "2와 1/3", 3 → {w,n,d}
export function parseFraction(v) {
  if (v && typeof v === 'object') {
    const w = num(v.w ?? v.whole), n = num(v.n ?? v.num ?? v.numerator), d = num(v.d ?? v.den ?? v.denominator);
    return { w: w || null, n, d };
  }
  const s = String(v ?? '').replace(/[{}]/g, '').replace(/와|과/g, ' ').trim();
  let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) return { w: +m[1], n: +m[2], d: +m[3] };
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return { w: null, n: +m[1], d: +m[2] };
  m = s.match(/^(\d+)$/);
  if (m) return { w: +m[1], n: null, d: null };
  return null;
}

// 문장 속 분수 찾기: {2 1/3}, {7/3}, 7/3
export const FRAC_RE = /\{\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*\}|(\d+)\/(\d+)/g;

export function splitFractions(text) {
  const out = [];
  let last = 0;
  const s = String(text ?? '');
  for (const m of s.matchAll(FRAC_RE)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2]) out.push({ w: m[1] ? +m[1] : null, n: +m[2], d: +m[3] });
    else out.push({ w: null, n: +m[4], d: +m[5] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

// 읽어 주기용: {2 1/3} → "2와 3분의 1"
export function speakFractions(text) {
  return String(text ?? '').replace(FRAC_RE, (_, w, n, d, n2, d2) =>
    n ? `${w ? w + '와 ' : ''}${d}분의 ${n}` : `${d2}분의 ${n2}`);
}
