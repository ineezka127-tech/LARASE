// ✍️ 육하원칙 글쓰기: 칸별 점검·맞춤법·피드백 (AI 없이 규칙으로, 학생 기기에서)

export const FIELDS = [
  { k: 'who', label: '누가', q: '누가 했나요?', icon: '🙋', ex: '나는 / 엄마가 / 친구와 나는' },
  { k: 'when', label: '언제', q: '언제 했나요?', icon: '⏰', ex: '어제 / 토요일 아침에 / 여름 방학에' },
  { k: 'where', label: '어디서', q: '어디에서 했나요?', icon: '📍', ex: '공원에서 / 할머니 집에' },
  { k: 'what', label: '무엇을', q: '무엇을 했나요?', icon: '🎯', ex: '축구를 했다 / 떡볶이를 먹었다' },
  { k: 'how', label: '어떻게', q: '어떻게 했나요?', icon: '🛠️', ex: '친구와 함께 / 신나게 / 버스를 타고' },
  { k: 'why', label: '왜', q: '왜 했나요?', icon: '💭', ex: '배가 고파서 / 축구가 좋아서 / 친구를 만나려고' },
];
export const FIELD = Object.fromEntries(FIELDS.map((f) => [f.k, f]));
export const ALL_KEYS = FIELDS.map((f) => f.k);

// 그룹에 맞는 기본 기준 (선생님이 학생별로 바꿀 수 있어요)
export function defaultRule(tier) {
  if (tier === '다') return { required: ['who', 'when', 'where', 'what'], level: 'easy', rewrite: false };
  return { required: [...ALL_KEYS], level: 'normal', rewrite: true };
}

// ---------- 한글 도우미 ----------
const isHangul = (ch) => ch >= '가' && ch <= '힣';
const parts = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28]; };
const compose = (i, m, f) => String.fromCharCode(0xac00 + i * 588 + m * 28 + f);
const hasFinal = (ch) => isHangul(ch) && parts(ch)[2] !== 0;
const clean = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const noPunct = (t) => clean(t).replace(/[.!?~,…]+$/g, '').trim();
// 받침에 따라 붙는 말 고르기 (나 → 나는, 엄마 → 엄마가, 동생 → 동생이)
const josa = (word, withF, withoutF) => {
  if (withoutF === '가' && { 나: 1, 저: 1, 너: 1 }[word]) return { 나: '내가', 저: '제가', 너: '네가' }[word];
  const last = word[word.length - 1]; return word + (hasFinal(last) ? withF : withoutF);
};

// ---------- 낱말 목록 ----------
const TIME = /(어제|그제|오늘|내일|모레|아침|점심|저녁|밤|새벽|낮|오전|오후|방학|주말|평일|요일|봄|여름|가을|겨울|작년|올해|지난|이번|다음|아까|방금|그때|그날|옛날|요즘|날에|때|쉬는\s?시간|학교\s?끝나고|수업|생일|설날|추석|크리스마스|휴일|하루|매일|날마다|\d+\s?(월|일|시|분|년|살|주)|[한두세네다섯여섯일곱여덟아홉열]+\s?시)/;
const PLACE = /(집|학교|교실|공원|놀이터|운동장|마트|시장|식당|가게|편의점|도서관|병원|바다|산|강|수영장|체육관|교회|성당|절|방|거실|부엌|화장실|버스|지하철|기차|차|길|동네|할머니|할아버지|친구|카페|영화관|박물관|미술관|동물원|놀이공원|캠핑장|키즈카페|PC방|노래방|학원|센터|복지관)/;
const REASON = /(때문에|때문이다|때문이에요|때문입니다|해서|어서|아서|여서|워서|러워서|싶어서|싶었기|려고|으려고|려구|위해|위해서|니까|으니까|라서|이라서|길래|좋아서|와서|봐서|나서|해서요)/;
const REASON_TAIL = /\s*(왜냐하면\s*)|(기\s*)?(때문에|때문이다|때문이에요|때문입니다)[.!]?$|(어서|아서|여서|해서|서|려고|으려고|위해서?|니까|으니까|라서|이라서)[.!]?$/g;
const WHO_END = /(이|가|은|는|께서|도|이랑|랑|하고)$/;

// ---------- 칸별 점검 ----------
// 돌려주는 값: { ok, msg (고칠 점, 한 가지), starters? }
export function checkField(k, text, all = {}, level = 'normal') {
  const t = noPunct(text);
  if (!t) return { ok: false, empty: true, msg: `'${FIELD[k].label}' 칸이 비어 있어요. 예) ${FIELD[k].ex.split(' / ')[0]}` };
  if (level === 'easy') return { ok: true };

  if (k === 'who') {
    if (WHO_END.test(t) && t.length >= 2) return { ok: true };
    return { ok: false, msg: `'${t}' 뒤에 '은/는/이/가'를 붙여 볼까요? 예) ${josa(t, '은', '는')}, ${josa(t, '이', '가')}` };
  }
  if (k === 'when') {
    if (TIME.test(t)) return { ok: true };
    return { ok: false, msg: `'언제'에는 때를 나타내는 말을 써요. 예) 어제, 토요일 아침에, 여름 방학에` };
  }
  if (k === 'where') {
    if (/(에서|에)(는|도|만)?$/.test(t) && t.length >= 2) return { ok: true };
    const place = t.match(PLACE)?.[0];
    return { ok: false, msg: `장소 뒤에 '에서'나 '에'를 붙여 볼까요? 예) ${place ? t + '에서' : '공원에서, 할머니 집에'}` };
  }
  if (k === 'what') {
    if (t.length >= 2 && (/[을를]/.test(t) || /(다|요)$/.test(t))) return { ok: true };
    return { ok: false, msg: `'무엇을' 칸에는 한 일을 끝까지 써요. 예) 축구를 했다, 떡볶이를 먹었다` };
  }
  if (k === 'how') {
    if (t.length >= 2 && noPunct(all.what) !== t) return { ok: true };
    return { ok: false, msg: `어떻게 했는지 써 볼까요? 예) 친구와 함께, 신나게, 버스를 타고` };
  }
  if (k === 'why') {
    const rep = repeatsWhat(t, all.what);
    if (rep) return { ok: false, repeat: true, msg: `무엇을 했는지 한 번 더 썼어요. ${whyQuestion(all.what)}`, starters: WHY_STARTERS };
    if (REASON.test(t) || /(?<!에)서(요)?$/.test(t)) return { ok: true };   // 고파서·아파서·커서 처럼 '~서'로 끝나는 이유
    return { ok: false, msg: `'왜' 칸에는 이유를 써요. '~해서', '~하고 싶어서', '~때문에'처럼 끝내 볼까요?`, starters: WHY_STARTERS };
  }
  return { ok: true };
}

// 이유 시작말 버튼
// 끝말 버튼은 학생이 쓴 말의 '~다'를 떼고 붙여요: 놀다 → 놀고 싶어서, 재미있다 → 재미있기 때문에, 먹다 → 먹으려고
export const WHY_STARTERS = [
  { label: '왜냐하면 …', mode: 'prepend', text: '왜냐하면 ' },
  { label: '…고 싶어서', mode: 'append', text: '고 싶어서' },
  { label: '…기 때문에', mode: 'append', text: '기 때문에' },
  { label: '…(으)려고', mode: 'append', text: '려고' },
];
export function applyStarter(text, s) {
  const t = String(text ?? '');
  if (s.mode === 'prepend') return t.trim().startsWith(s.text.trim()) ? t : s.text + t.trimStart();
  let base = noPunct(t);
  if (!base) return t;                                  // 먼저 이유를 쓰고 눌러요
  if (REASON.test(base)) return t;                      // 이미 이유로 끝났으면 그대로
  base = base.replace(/(습니다|어요|아요|요|다)$/, '');
  if (!base) return t;
  const last = base[base.length - 1];
  const needEu = s.text === '려고' && hasFinal(last) && parts(last)[2] !== 8;   // 받침(ㄹ 빼고) 있으면 '으려고'
  return base + (needEu ? '으' : '') + s.text;
}

// "왜 갔을까요?" 처럼 무엇을 칸의 동작으로 묻기
export function whyQuestion(what) {
  const last = noPunct(what).split(' ').pop() || '';
  const stem = last.replace(/(습니다|어요|아요|에요|요|다)$/, '');
  const ch = stem[stem.length - 1];
  if (stem && ch && isHangul(ch) && parts(ch)[2] === 20) return `왜 ${stem}을까요?`;   // 갔·먹었·했 (받침 ㅆ)
  return '왜 그렇게 했을까요?';
}

// 비슷한 정도 (두 글자씩 묶어서 겹치는 비율)
function similar(a, b) {
  const bi = (s) => { const x = s.replace(/\s/g, ''); const out = []; for (let i = 0; i < x.length - 1; i++) out.push(x.slice(i, i + 2)); return out; };
  const A = bi(a); const B = bi(b);
  if (!A.length || !B.length) return a.replace(/\s/g, '') === b.replace(/\s/g, '') ? 1 : 0;
  const pool = [...B]; let hit = 0;
  A.forEach((g) => { const i = pool.indexOf(g); if (i >= 0) { hit += 1; pool.splice(i, 1); } });
  return (2 * hit) / (A.length + B.length);
}
// '왜' 칸이 '무엇을' 칸의 동작을 되풀이하는지 (예: 무엇을 "놀러 갔다" / 왜 "놀러 갔기 때문이다")
export function repeatsWhat(why, what) {
  const w = noPunct(what).replace(/(습니다|어요|아요|에요|요|다)$/, '').trim();
  const y = noPunct(why).replace(REASON_TAIL, '').replace(/기$/, '').trim();
  if (!w || !y || y.length < 2) return false;
  return y === w || w.includes(y) || similar(y, w) >= 0.6;
}

// ---------- 맞춤법 ----------
// 1) 선생님 목록(확실): '마셔다'는 '마셨다'로  2) 과거형 받침 빠짐(질문): 혹시 '마셨다'인가요?
const PAST_VOWELS = new Set([0, 1, 4, 5, 6, 9, 10, 14, 15]);   // ㅏ ㅐ ㅓ ㅔ ㅕ ㅘ ㅙ ㅝ ㅞ
const NOT_ERRORS = new Set(['바다', '마다', '저마다', '날마다', '해마다', '때마다', '사람마다', '아니다', '이다', '나다']);
export function spellCheck(text, list = []) {
  const out = [];
  const seen = new Set();
  const src = String(text ?? '');
  list.forEach(({ wrong, right_word: right }) => {
    if (wrong && src.includes(wrong) && !seen.has(wrong)) { out.push({ wrong, right, sure: true }); seen.add(wrong); }
  });
  src.split(/[\s.,!?~…"'()]+/).forEach((tok) => {
    if (tok.length < 2 || !tok.endsWith('다') || seen.has(tok) || NOT_ERRORS.has(tok)) return;
    const prev = tok[tok.length - 2];
    if (!isHangul(prev)) return;
    const [i, m, f] = parts(prev);
    if (f !== 0 || !PAST_VOWELS.has(m)) return;
    if (out.some((o) => tok.includes(o.wrong))) return;
    const fixed = prev === '하' ? '했' : compose(i, m, 20);
    const right = tok.slice(0, -2) + fixed + '다';
    out.push({ wrong: tok, right, sure: false });
    seen.add(tok);
  });
  return out;
}
export const spellMsg = (s) => (s.sure ? `'${s.wrong}'은(는) '${s.right}'(으)로 써요.` : `혹시 '${s.right}'인가요?`);

// ---------- 전체 점검: 잘한 점 먼저, 고칠 점은 하나만 ----------
export function evaluate(fields, rule, spelling = []) {
  const results = {};
  const passed = {};
  rule.required.forEach((k) => { results[k] = checkField(k, fields[k], fields, rule.level); passed[k] = results[k].ok; });
  const spell = [];
  ALL_KEYS.forEach((k) => spellCheck(fields[k], spelling).forEach((s) => spell.push({ ...s, field: k })));
  const good = rule.required.filter((k) => passed[k]);
  const praise = good.length === rule.required.length
    ? `🎉 ${rule.required.length}칸을 모두 잘 썼어요!`
    : good.length ? `👍 ${good.map((k) => FIELD[k].label).join('·')} 칸을 잘 썼어요!` : '✏️ 한 칸씩 차근차근 써 봐요!';
  const firstBad = rule.required.find((k) => !passed[k]);
  let fix = null;
  if (firstBad) fix = { field: firstBad, msg: results[firstBad].msg, starters: results[firstBad].starters };
  else if (spell.length) fix = { field: spell[0].field, msg: spellMsg(spell[0]), spelling: spell[0] };
  return { results, passed, spelling: spell, praise, fix, allPassed: !firstBad, required: rule.required };
}

// ---------- 여섯 칸을 이어 붙인 예시 문장 ----------
export function exampleSentence(f) {
  const g = (k) => noPunct(f[k]);
  const main = [g('who'), g('when'), g('where'), g('how'), g('what')].filter(Boolean).join(' ');
  let s = main ? main + (/(다|요)$/.test(main) ? '.' : '.') : '';
  const why = g('why').replace(/^왜냐하면\s*/, '');
  if (why) {
    // 왜냐하면 … 때문이에요 / … 고파서요 / … 만나려고요 처럼 자연스럽게 끝내기
    const end = /(다|요)$/.test(why) ? why : /때문에$/.test(why) ? why.replace(/때문에$/, '때문이다') : /(서|려고|니까|위해)$/.test(why) ? why + '요' : why;
    s += ` 왜냐하면 ${end}.`;
  }
  return s.trim();
}
