// 문제 유형, 채점, AI 결과 가져오기
import { checkFraction, fracToken, parseFraction, isComplete } from './fraction.js';

export const TYPES = {
  ox: { label: 'O/X', icon: '⭕' },
  mcq: { label: '5지선다', icon: '🔢' },
  short: { label: '단답형', icon: '✏️' },
  match: { label: '짝 맞추기', icon: '🔗' },
  order: { label: '순서 맞추기', icon: '🔀' },
  essay: { label: '서술형', icon: '📝' },
  frac: { label: '분수·수 답', icon: '➗' },
};

export const FRAC_FORMS = {
  any: '값만 맞으면 정답',
  mixed: '대분수로 써야 정답',
  improper: '가분수로 써야 정답',
  exact: '정답과 똑같은 모양이어야 정답',
};

export const DIFFICULTY = { 1: '쉬움', 2: '보통', 3: '도전' };

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s.,!?·'"“”‘’()\-~]/g, '');

// 정답 확인 (서술형은 선생님이 채점하므로 null)
export function checkAnswer(q, answer) {
  const d = q.data || {};
  switch (q.type) {
    case 'ox': return answer === !!d.answer;
    case 'mcq': return Number(answer) === Number(d.answer);
    case 'short': return (d.answers || []).some((a) => norm(a) && norm(a) === norm(answer));
    case 'match': return (d.pairs || []).every((p, i) => answer?.[i] === p[1]);
    case 'order': return (d.items || []).every((it, i) => answer?.[i] === it);
    case 'essay': return null;
    case 'frac': return checkFraction(d, answer).correct;
    default: return false;
  }
}

// 정답을 사람이 읽는 글로
export function answerText(q) {
  const d = q.data || {};
  switch (q.type) {
    case 'ox': return d.answer ? 'O' : 'X';
    case 'mcq': return `${d.answer}번 ${d.choices?.[d.answer - 1] ?? ''}`;
    case 'short': return (d.answers || []).join(' / ');
    case 'match': return (d.pairs || []).map((p) => `${p[0]} → ${p[1]}`).join('\n');
    case 'order': return (d.items || []).map((it, i) => `${i + 1}. ${it}`).join('\n');
    case 'essay': return d.model_answer || '';
    case 'frac': return fracToken(d.answer || {});
    default: return '';
  }
}

export function emptyQuestion(type = 'mcq') {
  const base = { id: crypto.randomUUID(), type, difficulty: 2, prompt: '', data: {} };
  if (type === 'ox') base.data = { answer: true, explanation: '' };
  if (type === 'mcq') base.data = { choices: ['', '', '', '', ''], answer: 1, explanation: '' };
  if (type === 'short') base.data = { answers: [''], explanation: '' };
  if (type === 'match') base.data = { pairs: [['', ''], ['', ''], ['', '']] };
  if (type === 'order') base.data = { items: ['', '', ''] };
  if (type === 'essay') base.data = { model_answer: '', keywords: [] };
  if (type === 'frac') base.data = { answer: { w: null, n: 1, d: 2 }, form: 'any', lowest: false, explanation: '' };
  if (type === 'ox' || type === 'match') base.difficulty = 1;
  if (type === 'essay') base.difficulty = 3;
  return base;
}

// AI가 만든 문제 하나를 앱 형식으로 정리합니다. 문제가 있으면 throw.
export function normalizeQuestion(raw) {
  const type = String(raw.type || '').toLowerCase();
  if (!TYPES[type]) throw new Error(`알 수 없는 문제 유형: ${raw.type}`);
  const prompt = String(raw.prompt || raw.question || '').trim();
  if (!prompt) throw new Error('문제 내용(prompt)이 비어 있어요');
  const difficulty = [1, 2, 3].includes(Number(raw.difficulty)) ? Number(raw.difficulty) : 2;
  const explanation = String(raw.explanation || '').trim();
  const str = (x) => String(x ?? '').trim();
  let data;
  if (type === 'ox') {
    const a = raw.answer;
    const val = a === true || /^(o|true|참|맞다|맞음|⭕)$/i.test(str(a));
    data = { answer: val, explanation };
  } else if (type === 'mcq') {
    const choices = (raw.choices || []).map(str).filter(Boolean);
    if (choices.length < 2) throw new Error('보기가 부족해요');
    let ans = Number(raw.answer);
    if (!Number.isInteger(ans) || ans < 1 || ans > choices.length) {
      const idx = choices.findIndex((c) => c === str(raw.answer));
      if (idx < 0) throw new Error('정답 번호가 올바르지 않아요');
      ans = idx + 1;
    }
    data = { choices, answer: ans, explanation };
  } else if (type === 'short') {
    const answers = (Array.isArray(raw.answers) ? raw.answers : [raw.answer]).map(str).filter(Boolean);
    if (!answers.length) throw new Error('정답이 없어요');
    data = { answers, explanation };
  } else if (type === 'match') {
    const pairs = (raw.pairs || []).map((p) => (Array.isArray(p) ? [str(p[0]), str(p[1])] : [str(p.left), str(p.right)])).filter((p) => p[0] && p[1]);
    if (pairs.length < 2) throw new Error('짝이 2개 이상 필요해요');
    if (new Set(pairs.map((p) => p[1])).size !== pairs.length) throw new Error('오른쪽 낱말이 서로 달라야 해요');
    data = { pairs, explanation };
  } else if (type === 'order') {
    const items = (raw.items || []).map(str).filter(Boolean);
    if (items.length < 2) throw new Error('순서 항목이 2개 이상 필요해요');
    if (new Set(items).size !== items.length) throw new Error('순서 항목이 서로 달라야 해요');
    data = { items, explanation };
  } else if (type === 'frac') {
    const answer = parseFraction(raw.answer);
    if (!answer || !isComplete(answer)) throw new Error('분수 정답 형식이 올바르지 않아요 (예: "2 1/3", "7/3")');
    const form = FRAC_FORMS[raw.form] ? raw.form : 'any';
    data = { answer, form, lowest: !!raw.lowest, explanation };
  } else {
    data = { model_answer: str(raw.model_answer || raw.answer), keywords: (raw.keywords || []).map(str).filter(Boolean) };
  }
  return { id: crypto.randomUUID(), type, difficulty, prompt, data };
}

// 편집 화면에서 저장 전에 확인 (문제 없으면 null)
export function validateQuestion(q) {
  const d = q.data || {};
  if (!q.prompt?.trim()) return '문제 내용이 비어 있어요';
  if (q.type === 'mcq') {
    if ((d.choices || []).filter((c) => c.trim()).length < 2) return '보기를 2개 이상 써 주세요';
    if (!d.choices[d.answer - 1]?.trim()) return '정답으로 고른 보기가 비어 있어요';
  }
  if (q.type === 'short' && !(d.answers || []).some((a) => a.trim())) return '정답을 써 주세요';
  if (q.type === 'match') {
    if ((d.pairs || []).length < 2) return '짝을 2개 이상 써 주세요';
    if (new Set(d.pairs.map((p) => p[1])).size !== d.pairs.length) return '오른쪽 낱말이 서로 달라야 해요';
  }
  if (q.type === 'order') {
    if ((d.items || []).length < 2) return '순서 항목을 2개 이상 써 주세요';
    if (new Set(d.items).size !== d.items.length) return '순서 항목이 서로 달라야 해요';
  }
  if (q.type === 'frac' && !isComplete(d.answer)) return '분수 정답을 써 주세요 (분자와 분모, 또는 자연수만)';
  return null;
}

// 클로드 답변에서 JSON만 꺼내 읽습니다 (```json 블록, 앞뒤 설명 글이 있어도 괜찮음)
export function parseAIResult(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1];
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('JSON을 찾지 못했어요. 클로드 답변 전체를 복사해서 붙여넣어 주세요.');
  t = t.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'); // 끝에 붙은 쉼표 정리
  let obj;
  try { obj = JSON.parse(t); } catch (e) {
    throw new Error('JSON 형식이 깨져 있어요. 클로드에게 "JSON 형식만 다시 출력해 줘"라고 요청해 보세요.');
  }
  const errors = [];
  const questions = [];
  (obj.questions || []).forEach((q, i) => {
    try { questions.push(normalizeQuestion(q)); } catch (e) { errors.push(`${i + 1}번 문제: ${e.message}`); }
  });
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    lesson: {
      title: String(obj.title || '').trim(),
      subject: String(obj.subject || '').trim(),
      unit: String(obj.unit || '').trim(),
      summary: String(obj.summary || '').trim(),
      key_points: arr(obj.key_points).map((s) => String(s).trim()).filter(Boolean),
      flashcards: arr(obj.flashcards)
        .map((c) => ({ front: String(c.front || c.word || '').trim(), back: String(c.back || c.meaning || '').trim() }))
        .filter((c) => c.front && c.back),
    },
    questions,
    errors,
  };
}

// ---------- 클로드 지시문 만들기 ----------
export const PROMPT_TYPES = {
  ox: 'O/X', mcq: '5지선다', short: '단답형', match: '짝 맞추기', order: '순서 맞추기', essay: '서술형', frac: '분수·수 답',
};
export const PROMPT_LEVELS = {
  easy: ['쉬움 위주', [60, 30, 10]],
  mix: ['골고루', [30, 50, 20]],
  hard: ['도전 위주', [10, 40, 50]],
};
export const DEFAULT_PROMPT_OPTS = { count: 12, level: 'mix', types: ['ox', 'mcq', 'short', 'match', 'order', 'essay'] };

const TYPE_HINT = {
  ox: 'O/X',
  mcq: '5지선다',
  short: '단답형, 한두 낱말로 답하는 문제',
  match: '짝 맞추기, 3~5쌍',
  order: '순서 맞추기, 3~5단계 — 순서가 분명한 내용이 없으면 다른 유형으로',
  essay: '서술형, 2~3문장으로 답하는 문제',
  frac: '답이 분수나 수인 계산 문제',
};
const TYPE_WEIGHT = { ox: 3, mcq: 4, short: 3, match: 1, order: 1, essay: 1, frac: 4 };

function composition({ count, level, types }) {
  const list = types.length ? types : DEFAULT_PROMPT_OPTS.types;
  const total = list.reduce((s, t) => s + TYPE_WEIGHT[t], 0);
  let left = count;
  const n = list.map((t, i) => {
    const v = i === list.length - 1 ? left : Math.max(1, Math.round((count * TYPE_WEIGHT[t]) / total));
    left -= v;
    return [t, Math.max(1, v)];
  });
  const [e, m, h] = PROMPT_LEVELS[level]?.[1] || PROMPT_LEVELS.mix[1];
  return `4. questions: 퀴즈 ${count}문제, 아래 구성으로
${n.map(([t, v]) => `   - ${t} ${v}개 (${TYPE_HINT[t]})`).join('\n')}
   - 난이도 비율: 쉬움(1) 약 ${e}%, 보통(2) 약 ${m}%, 도전(3) 약 ${h}%`;
}

const PROMPT_HEAD = `너는 특수학급 선생님을 돕는 복습 자료 제작 도우미야.
첨부한 수업 자료(아이캔노트 판서, 학습지, 교과서 PDF·이미지)를 꼼꼼히 읽고, 학생들이 복습할 자료와 퀴즈를 만들어 줘.

[학생 정보]
- 특수학급 학생 5명, 읽기·이해 수준은 초등 3~6학년 정도
- 짧고 쉬운 문장, 한 문장에 한 가지 내용만
- 어려운 낱말은 쉬운 말로 풀어서 설명

[만들 것]
1. summary: 오늘 배운 내용 요약 (5~8문장, 쉬운 말, 줄바꿈 \\n 사용 가능)
2. key_points: 꼭 기억할 핵심 3~6개 (한 줄씩)
3. flashcards: 중요한 낱말 카드 4~10개 (front: 낱말, back: 쉬운 뜻)
`;
const PROMPT_RULES = `
[규칙]
- 자료에 있는 내용으로만 만들 것. 자료에 없는 내용은 지어내지 말 것
- 손글씨 판서가 잘 안 보이는 부분은 문제로 내지 말 것
- difficulty: 1 쉬움, 2 보통, 3 도전
- mcq의 answer는 정답 보기의 번호(1~5)
- short의 answers에는 정답으로 인정할 표현을 모두 넣을 것 (예: ["광합성", "광합성 작용"])
- match의 pairs는 [왼쪽, 오른쪽] 순서, 오른쪽 낱말끼리 겹치지 않게
- order의 items는 올바른 순서대로 적을 것
- frac의 answer는 "2 1/3"(대분수), "7/3"(가분수·진분수), "4"(자연수)처럼 문자열로 쓸 것
- frac의 form: 대분수로 답해야 하면 "mixed", 가분수로 답해야 하면 "improper", 상관없으면 "any". 기약분수로만 답해야 하면 "lowest": true
- 문제·보기·해설 속 분수는 {7/3}, 대분수는 {2 1/3}처럼 중괄호로 감싸서 쓸 것 (화면에 분수 모양으로 보여요)
- explanation은 왜 그 답인지 1~2문장으로 쉽게
- 반드시 아래 형식의 JSON 하나만 코드 블록으로 출력할 것

\`\`\`json
{
  "title": "수업 제목",
  "subject": "과목",
  "unit": "단원",
  "summary": "요약 글",
  "key_points": ["핵심1", "핵심2"],
  "flashcards": [{"front": "낱말", "back": "뜻"}],
  "questions": [
    {"type": "ox", "difficulty": 1, "prompt": "문제", "answer": true, "explanation": "해설"},
    {"type": "mcq", "difficulty": 2, "prompt": "문제", "choices": ["보기1", "보기2", "보기3", "보기4", "보기5"], "answer": 3, "explanation": "해설"},
    {"type": "short", "difficulty": 2, "prompt": "문제", "answers": ["정답", "다른 표현"], "explanation": "해설"},
    {"type": "match", "difficulty": 1, "prompt": "알맞은 것끼리 연결하세요", "pairs": [["왼쪽1", "오른쪽1"], ["왼쪽2", "오른쪽2"], ["왼쪽3", "오른쪽3"]]},
    {"type": "order", "difficulty": 2, "prompt": "순서대로 놓으세요", "items": ["1단계", "2단계", "3단계"]},
    {"type": "essay", "difficulty": 3, "prompt": "문제", "model_answer": "예시 답안", "keywords": ["채점할 때 볼 핵심 낱말"]},
    {"type": "frac", "difficulty": 2, "prompt": "{7/3}을 대분수로 나타내세요.", "answer": "2 1/3", "form": "mixed", "lowest": false, "explanation": "7÷3은 몫이 2, 나머지가 1이라서 {2 1/3}이에요."}
  ]
}
\`\`\``;

export function buildPrompt(opts = DEFAULT_PROMPT_OPTS) {
  return PROMPT_HEAD + composition({ ...DEFAULT_PROMPT_OPTS, ...opts }) + '\n' + PROMPT_RULES;
}

// 같은 내용으로 "다른 문제 세트" 만들기 (이미 있는 문제와 겹치지 않게)
export function buildVariantPrompt(lesson, questions, opts = DEFAULT_PROMPT_OPTS) {
  const o = { ...DEFAULT_PROMPT_OPTS, ...opts };
  const old = questions.map((q, i) => `${i + 1}. [${q.type}] ${q.prompt}`).join('\n');
  return `너는 특수학급 선생님을 돕는 복습 퀴즈 제작 도우미야.
아래 수업 내용으로 이미 퀴즈를 한 번 만들었어. 학생들이 같은 문제에 익숙해져서 외워 버리지 않도록,
**같은 내용이지만 새로운 문제**를 만들어 줘.

[학생 정보]
- 특수학급 학생, 읽기·이해 수준은 초등 3~6학년 정도. 짧고 쉬운 문장으로.

[수업 내용]
제목: ${lesson.title}
요약: ${lesson.summary || ''}
핵심: ${(lesson.key_points || []).join(' / ')}
낱말: ${(lesson.flashcards || []).map((c) => `${c.front}=${c.back}`).join(', ')}

[이미 있는 문제 — 똑같이 내지 말 것]
${old || '(없음)'}

[새 문제를 만드는 방법]
- 같은 개념을 다른 방향에서 묻기 (예: 뜻→낱말, 낱말→뜻 / 맞는 것 고르기 ↔ 틀린 것 고르기)
- 다른 문제 유형으로 바꾸기, 다른 예시·숫자·상황 쓰기
- 보기의 순서와 내용을 바꾸기
- 자료에 없는 내용은 지어내지 말 것

${composition(o)}
${PROMPT_RULES.replace(/"title"[\s\S]*?"questions": \[/, '"questions": [')}`;
}

export const AI_PROMPT = buildPrompt();

// 🃏 낱말 카드로 문제 자동 만들기 (뜻 고르기 / 낱말 고르기)
export function flashcardQuestions(cards, setNo = 1) {
  const ok = (cards || []).filter((c) => c.front && c.back);
  if (ok.length < 3) return [];
  const pickOthers = (arr, i, n) => arr.filter((_, k) => k !== i).sort(() => Math.random() - 0.5).slice(0, n);
  const out = [];
  ok.forEach((c, i) => {
    const wrongBacks = pickOthers(ok.map((x) => x.back), i, Math.min(4, ok.length - 1));
    const choicesA = [c.back, ...wrongBacks].sort(() => Math.random() - 0.5);
    out.push({ id: crypto.randomUUID(), type: 'mcq', difficulty: 1, prompt: `'${c.front}'의 뜻은 무엇일까요?`, set_no: setNo, source: 'auto',
      data: { choices: choicesA, answer: choicesA.indexOf(c.back) + 1, explanation: `${c.front}: ${c.back}` } });
    const wrongFronts = pickOthers(ok.map((x) => x.front), i, Math.min(4, ok.length - 1));
    const choicesB = [c.front, ...wrongFronts].sort(() => Math.random() - 0.5);
    out.push({ id: crypto.randomUUID(), type: 'mcq', difficulty: 2, prompt: `다음 뜻을 가진 낱말은 무엇일까요?\n"${c.back}"`, set_no: setNo, source: 'auto',
      data: { choices: choicesB, answer: choicesB.indexOf(c.front) + 1, explanation: `${c.front}: ${c.back}` } });
  });
  return out;
}
