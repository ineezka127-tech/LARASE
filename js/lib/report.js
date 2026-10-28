// 📄 학생 학습 리포트: 기록을 모아 숫자로 정리하고, 개별화교육계획(IEP)에 옮기기 쉬운 마크다운(.md)으로 만들어요
import { sb } from './sb.js';
import { TYPES, DIFFICULTY, TIER_INFO, tierOf, answerText } from './questions.js';
import { fracToken } from './fraction.js';

export const kstDate = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
export const todayKst = () => kstDate(Date.now());
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const pctText = (a, b) => (b ? `${pct(a, b)}%` : '-');
export const EFFORT_LABEL = { 1: '조금', 2: '보통', 3: '성실' };
const MODE_LABEL = { quiz: '수업 퀴즈', set: '묶음 퀴즈', retry: '다시 풀기', game: '모험 지도 전투', bonus: '🌟 보너스 도전 (윗단계)' };

// Supabase는 한 번에 1000줄까지라서 나눠서 가져와요
export async function fetchAll(build, size = 1000) {
  const out = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

// 학생이 낸 답을 글로
export function answerToText(q, ans) {
  if (ans == null) return '';
  const d = q?.data || {};
  switch (q?.type) {
    case 'ox': return ans === true ? 'O' : ans === false ? 'X' : String(ans);
    case 'mcq': return `${ans}번 ${d.choices?.[ans - 1] ?? ''}`.trim();
    case 'match': return Array.isArray(ans) ? (d.pairs || []).map((p, i) => `${p[0]}→${ans[i] ?? '?'}`).join(', ') : String(ans);
    case 'order': return Array.isArray(ans) ? ans.join(' → ') : String(ans);
    case 'frac': return typeof ans === 'object' ? fracToken(ans) : String(ans);
    default: return typeof ans === 'object' ? JSON.stringify(ans) : String(ans);
  }
}

// 한 학생의 기간 기록 가져오기
export async function loadStudentData(studentId, from, to) {
  const start = new Date(from + 'T00:00:00+09:00').toISOString();
  const end = new Date(new Date(to + 'T00:00:00+09:00').getTime() + 86400000).toISOString();
  const [student, attempts, events, topics] = await Promise.all([
    sb.from('profiles').select('*').eq('id', studentId).single(),
    fetchAll(() => sb.from('attempts').select('*, questions(type,difficulty,tier,prompt,data), lessons(title,subject,topic_id,lesson_date)')
      .eq('user_id', studentId).gte('created_at', start).lt('created_at', end).order('created_at')),
    fetchAll(() => sb.from('events').select('kind,ref,xp,coins,created_at').eq('user_id', studentId).gte('created_at', start).lt('created_at', end).order('created_at')),
    sb.from('topics').select('id,name'),
  ]);
  if (student.error) throw student.error;
  return { student: student.data, attempts, events, topics: Object.fromEntries((topics.data || []).map((t) => [t.id, t.name])), from, to };
}

// 숫자로 정리
export function computeReport({ student, attempts, events, topics, from, to }) {
  const auto = attempts.filter((a) => a.questions?.type !== 'essay' && a.is_correct !== null);
  const essays = attempts.filter((a) => a.questions?.type === 'essay');
  const right = auto.filter((a) => a.is_correct).length;
  const days = new Set([...attempts.map((a) => kstDate(a.created_at)), ...events.filter((e) => e.kind === 'view').map((e) => kstDate(e.created_at))]);

  const group = (list, keyFn) => {
    const m = new Map();
    list.forEach((a) => { const k = keyFn(a); if (k == null) return; const g = m.get(k) || { n: 0, right: 0 }; g.n += 1; if (a.is_correct) g.right += 1; m.set(k, g); });
    return [...m.entries()].map(([k, g]) => ({ key: k, ...g, pct: pct(g.right, g.n) }));
  };

  const bySubject = group(auto, (a) => a.lessons?.subject || '기타').sort((x, y) => y.n - x.n);
  const byTopic = group(auto, (a) => `${a.lessons?.subject || '기타'}|${topics[a.lessons?.topic_id] || '(주제 없음)'}`)
    .map((g) => ({ ...g, subject: g.key.split('|')[0], topic: g.key.split('|')[1] })).sort((x, y) => x.subject.localeCompare(y.subject) || y.n - x.n);
  const byLesson = group(auto, (a) => a.lessons?.title || '(수업 없음)').sort((x, y) => y.n - x.n);
  const byDifficulty = [1, 2, 3, 4, 5].map((d) => { const g = group(auto.filter((a) => a.questions?.difficulty === d), () => d)[0]; return { key: d, n: g?.n || 0, right: g?.right || 0, pct: g?.pct ?? null }; });
  const byType = group(auto, (a) => a.questions?.type).sort((x, y) => y.n - x.n);
  const byMode = group(auto, (a) => a.mode || 'quiz');
  const byTier = group(auto, (a) => a.questions?.tier || '공통');

  // 주별 변화
  const weekOf = (t) => { const d = new Date(kstDate(t) + 'T00:00:00+09:00'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); };
  const byWeek = group(auto, (a) => weekOf(a.created_at)).sort((x, y) => x.key.localeCompare(y.key));
  const half = Math.floor(auto.length / 2);
  const first = auto.slice(0, half);
  const second = auto.slice(half);
  const trend = auto.length >= 10 ? { first: pct(first.filter((a) => a.is_correct).length, first.length), second: pct(second.filter((a) => a.is_correct).length, second.length) } : null;

  // 오답 극복: 틀렸다가 나중에 맞힌 문제
  const hist = new Map();
  auto.forEach((a) => { const h = hist.get(a.question_id) || []; h.push(a); hist.set(a.question_id, h); });
  let comeback = 0;
  const missed = [];
  hist.forEach((h) => {
    const firstWrong = h.findIndex((a) => !a.is_correct);
    if (firstWrong >= 0 && h.slice(firstWrong + 1).some((a) => a.is_correct)) comeback += 1;
    const wrongs = h.filter((a) => !a.is_correct);
    if (wrongs.length) missed.push({ q: h[0].questions, lesson: h[0].lessons?.title, wrong: wrongs.length, tries: h.length, lastAnswer: answerToText(h[0].questions, wrongs[wrongs.length - 1].answer), solved: h[h.length - 1].is_correct });
  });
  missed.sort((x, y) => y.wrong - x.wrong || (x.solved ? 1 : 0) - (y.solved ? 1 : 0));

  const firstTry = [...hist.values()].map((h) => h[0]);
  const firstRight = firstTry.filter((a) => a.is_correct).length;

  // 🌟 보너스 도전 (윗그룹·심화 문제) — 그룹을 올릴지 생각할 때 참고
  const bonusAtt = auto.filter((a) => a.mode === 'bonus');
  const bonus = bonusAtt.length ? { n: bonusAtt.length, right: bonusAtt.filter((a) => a.is_correct).length, pct: pct(bonusAtt.filter((a) => a.is_correct).length, bonusAtt.length),
    target: { 다: '나 그룹', 나: '가 그룹', 가: '심화' }[tierOf(student)] } : null;

  const graded = essays.filter((a) => a.graded_at);
  const efforts = essays.filter((a) => a.effort);
  const avg = (xs) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

  return {
    student, from, to, tier: tierOf(student),
    days: days.size,
    activeDates: [...days].sort(),
    views: events.filter((e) => e.kind === 'view').length,
    quizzesDone: events.filter((e) => e.kind === 'quiz_done').length,
    xp: events.reduce((s, e) => s + (e.xp || 0), 0),
    total: auto.length, right, acc: pct(right, auto.length),
    uniqueQuestions: hist.size, firstRight, firstAcc: pct(firstRight, firstTry.length),
    comeback, bonus,
    bySubject, byTopic, byLesson, byDifficulty, byType, byMode, byTier, byWeek, trend,
    missed: missed.slice(0, 10),
    essays: essays.map((a) => ({ date: kstDate(a.created_at), lesson: a.lessons?.title, prompt: a.questions?.prompt, model: a.questions?.data?.model_answer, keywords: a.questions?.data?.keywords || [], answer: String(a.answer ?? ''), score: a.score, effort: a.effort, feedback: a.feedback, graded: !!a.graded_at })),
    essayScoreAvg: avg(graded.map((a) => a.score)),
    essayEffortAvg: avg(efforts.map((a) => a.effort)),
    essayLenAvg: avg(essays.map((a) => String(a.answer ?? '').replace(/\s/g, '').length)),
  };
}

// ---------- 현재 수준 문장 (자동 초안) ----------
function levelSentences(r) {
  const out = [];
  if (!r.total && !r.essays.length) return ['기간 안에 문제 풀이 기록이 없어요.'];
  r.bySubject.filter((s) => s.n >= 5).forEach((s) => {
    if (s.pct >= 80) out.push(`${s.key} 복습 문제를 대부분 해결함(정답률 ${s.pct}%, ${s.n}문항). 배운 핵심 개념을 잘 이해하고 있음.`);
    else if (s.pct >= 50) out.push(`${s.key} 복습 문제의 절반 이상을 해결함(정답률 ${s.pct}%, ${s.n}문항). 핵심 개념은 부분적으로 이해하고 있으며 반복 지도가 필요함.`);
    else out.push(`${s.key} 복습 문제 해결에 어려움이 있음(정답률 ${s.pct}%, ${s.n}문항). 쉬운 단계부터 개념을 다시 익히는 지원이 필요함.`);
  });
  const d = Object.fromEntries(r.byDifficulty.map((x) => [x.key, x]));
  const easy = [d[1], d[2]].filter((x) => x.n);
  const hard = [d[3], d[4]].filter((x) => x.n);
  if (easy.length && hard.length) {
    const ep = pct(easy.reduce((s, x) => s + x.right, 0), easy.reduce((s, x) => s + x.n, 0));
    const hp = pct(hard.reduce((s, x) => s + x.right, 0), hard.reduce((s, x) => s + x.n, 0));
    if (ep - hp >= 25) out.push(`알아보기·이해 수준 문제(쉬움·보통)는 ${ep}% 해결하나, 적용·추론 수준(어려움·도전)은 ${hp}%로 낮음. 배운 내용을 새로운 상황에 적용하는 연습이 필요함.`);
    else if (hp >= 70) out.push(`적용·추론 수준(어려움·도전) 문제도 ${hp}% 해결하여, 한 단계 높은 수준의 과제에 도전할 수 있음.`);
  }
  const weakType = r.byType.filter((t) => t.n >= 4).sort((x, y) => x.pct - y.pct)[0];
  const strongType = r.byType.filter((t) => t.n >= 4).sort((x, y) => y.pct - x.pct)[0];
  if (weakType && strongType && strongType.pct - weakType.pct >= 25) {
    out.push(`${TYPES[strongType.key]?.label} 문제(${strongType.pct}%)에 비해 ${TYPES[weakType.key]?.label} 문제(${weakType.pct}%)를 어려워함.`);
  }
  if (r.trend) {
    if (r.trend.second - r.trend.first >= 10) out.push(`기간 후반 정답률이 ${r.trend.first}% → ${r.trend.second}%로 향상됨.`);
    else if (r.trend.first - r.trend.second >= 10) out.push(`기간 후반 정답률이 ${r.trend.first}% → ${r.trend.second}%로 낮아져, 최근 학습 내용에 대한 확인이 필요함.`);
  }
  if (r.bonus) {
    const b = r.bonus;
    if (b.n >= 3 && b.pct >= 80) out.push(`보너스 도전에서 ${b.target} 수준 문제를 ${b.n}문항 중 ${b.right}문항 해결함(${b.pct}%). ${r.tier === '가' ? '심화 과제를 제공할 수 있음.' : '상위 그룹 학습을 검토할 수 있음.'}`);
    else out.push(`보너스 도전에서 ${b.target} 수준 문제에 ${b.n}번 도전하여 ${b.right}문항 해결함(${b.pct}%).`);
  }
  if (r.comeback > 0) out.push(`틀린 문제를 다시 풀어 ${r.comeback}문항을 스스로 해결함(오답 극복).`);
  if (r.essays.length) {
    const eff = r.essayEffortAvg;
    out.push(`서술형 ${r.essays.length}개 제출${r.essayScoreAvg != null ? `, 평균 점수 ${r.essayScoreAvg}/2` : ''}${eff != null ? `, 성실도 평균 ${eff}/3` : ''}.`
      + (eff != null ? (eff >= 2.5 ? ' 자신의 생각을 성실하게 글로 표현하려고 노력함.' : eff >= 1.8 ? ' 짧은 문장으로 생각을 표현할 수 있음.' : ' 생각을 글로 표현하는 데 지원이 필요함.') : ''));
  }
  out.push(`기간 중 ${r.days}일 학습함(복습 자료 보기 ${r.views}회, 퀴즈 완주 ${r.quizzesDone}회).`);
  return out;
}

// ---------- 마크다운 ----------
const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim() || '-';
const table = (head, rows) => rows.length
  ? `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')}\n`
  : '_기록 없음_\n';

export function reportMarkdown(r) {
  const s = r.student;
  const name = s.display_name || s.login_id;
  const L = [];
  L.push(`# 학습 리포트 — ${name} (${s.login_id})`);
  L.push('');
  L.push(`- 기간: ${r.from} ~ ${r.to}`);
  L.push(`- 학년: ${s.grade ? s.grade + '학년' : '-'} · 그룹: ${TIER_INFO[r.tier].name} (${TIER_INFO[r.tier].level})`);
  L.push(`- 만든 날: ${todayKst()} · 자료: 복습 교실 풀이 기록 (자동 채점 문제 기준, 서술형은 선생님 채점)`);
  L.push('');
  L.push('## 1. 한눈에 보기');
  L.push('');
  L.push(table(['항목', '값'], [
    ['학습한 날', `${r.days}일`],
    ['푼 문제 (자동 채점)', `${r.total}문항 (서로 다른 문제 ${r.uniqueQuestions}개)`],
    ['정답률 (전체 풀이)', r.acc != null ? `${r.acc}%` : '-'],
    ['처음 풀었을 때 정답률', r.firstAcc != null ? `${r.firstAcc}%` : '-'],
    ['오답 극복', `${r.comeback}문항 (틀렸다가 다시 맞힘)`],
    ['🌟 보너스 도전', r.bonus ? `${r.bonus.target} 수준 ${r.bonus.n}문항 중 ${r.bonus.right}문항 성공 (${r.bonus.pct}%) — 그룹은 그대로` : '없음'],
    ['서술형', r.essays.length ? `${r.essays.length}개 · 평균 점수 ${r.essayScoreAvg ?? '-'}/2 · 성실도 ${r.essayEffortAvg ?? '-'}/3 · 평균 ${r.essayLenAvg ?? '-'}자` : '없음'],
    ['복습 자료 보기 / 퀴즈 완주', `${r.views}회 / ${r.quizzesDone}회`],
    ['얻은 경험치', `${r.xp} XP`],
  ]));
  L.push('## 2. 현재 수준 (자동 초안 — 선생님이 다듬어 쓰세요)');
  L.push('');
  levelSentences(r).forEach((t) => L.push(`- ${t}`));
  L.push('');
  L.push('## 3. 과목·주제별');
  L.push('');
  L.push(table(['과목', '주제', '푼 문제', '맞힘', '정답률'], r.byTopic.map((t) => [t.subject, t.topic, t.n, t.right, pctText(t.right, t.n)])));
  L.push('### 수업별');
  L.push('');
  L.push(table(['수업', '푼 문제', '정답률'], r.byLesson.map((t) => [t.key, t.n, pctText(t.right, t.n)])));
  L.push('## 4. 난이도별 (그룹 안 난이도)');
  L.push('');
  L.push(table(['난이도', '뜻', '푼 문제', '정답률'], r.byDifficulty.filter((d) => d.key < 5 || d.n).map((d) => [DIFFICULTY[d.key], ['', '알아보기·떠올리기', '이해하기', '적용하기', '추론·비교하기', '심화 (여러 개념·생활 문제)'][d.key], d.n, pctText(d.right, d.n)])));
  L.push('## 5. 문제 유형별');
  L.push('');
  L.push(table(['유형', '푼 문제', '정답률'], r.byType.map((t) => [TYPES[t.key]?.label || t.key, t.n, pctText(t.right, t.n)])));
  L.push('### 푼 곳별');
  L.push('');
  L.push(table(['어디서', '푼 문제', '정답률'], r.byMode.map((t) => [MODE_LABEL[t.key] || t.key, t.n, pctText(t.right, t.n)])));
  L.push('## 6. 주별 변화');
  L.push('');
  L.push(table(['주 (월요일)', '푼 문제', '정답률'], r.byWeek.map((w) => [w.key, w.n, pctText(w.right, w.n)])));
  if (r.trend) L.push(`- 기간 앞쪽 절반 정답률 ${r.trend.first}% → 뒤쪽 절반 ${r.trend.second}%\n`);
  L.push('## 7. 자주 틀린 문제');
  L.push('');
  L.push(table(['문제', '수업', '틀린 횟수 / 푼 횟수', '학생 답(마지막 오답)', '정답', '지금은'], r.missed.map((m) => [m.q?.prompt, m.lesson, `${m.wrong} / ${m.tries}`, m.lastAnswer, m.q ? answerText(m.q) : '', m.solved ? '맞힘 ✅' : '아직 ❌'])));
  L.push('## 8. 서술형 답안');
  L.push('');
  if (!r.essays.length) L.push('_서술형 답안 없음_\n');
  r.essays.forEach((e, i) => {
    L.push(`### ${i + 1}. ${cell(e.prompt)}`);
    L.push(`- 날짜: ${e.date} · 수업: ${e.lesson || '-'}`);
    L.push(`- 학생 답: “${e.answer.replace(/\s*\n\s*/g, ' ')}” (${e.answer.replace(/\s/g, '').length}자)`);
    if (e.model) L.push(`- 예시 답안: ${e.model}`);
    if (e.keywords.length) L.push(`- 핵심 낱말: ${e.keywords.map((k) => (e.answer.includes(k) ? `**${k}**✔` : k)).join(', ')}`);
    L.push(`- 점수: ${e.graded ? ['다시 해 보기(0)', '부분 정답(1)', '정답(2)'][e.score ?? 0] : '아직 채점 안 함'} · 성실도: ${e.effort ? `${EFFORT_LABEL[e.effort]}(${e.effort}/3)` : '-'}`);
    if (e.feedback) L.push(`- 선생님 한마디: ${e.feedback}`);
    L.push('');
  });
  L.push('## 9. 개별화교육 평가 문장 만들기 (클로드에게 부탁할 때)');
  L.push('');
  L.push('이 파일을 클로드 새 대화에 첨부하고 아래 글을 붙여넣으면, 평가 문장 초안을 받을 수 있어요.');
  L.push('');
  L.push('```');
  L.push(`첨부한 파일은 특수학급 학생(${name})의 ${r.from}~${r.to} 복습 기록이야.`);
  L.push('이 기록을 근거로 개별화교육계획 평가에 쓸 문장을 만들어 줘.');
  L.push('- 과목별로 "현재 수행 수준" 2~3문장, "잘하는 점" 1~2문장, "지원이 필요한 점" 1~2문장');
  L.push('- 숫자(정답률, 문항 수)를 근거로 넣고, "~함", "~할 수 있음"처럼 끝맺기');
  L.push('- 기록에 없는 내용은 지어내지 말 것');
  L.push('```');
  return L.join('\n');
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
