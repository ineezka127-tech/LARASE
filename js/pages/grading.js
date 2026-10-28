import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { Loading, ErrorBox, toast, fmtDate } from '../components/ui.js';
import { RichText } from '../components/math.js';
import { AvatarImg } from '../components/avatar-ui.js';

function highlight(text, keywords) {
  if (!keywords?.length) return text;
  const esc = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return String(text).split(new RegExp(`(${esc})`, 'g')).map((part) =>
    keywords.includes(part) ? html`<mark>${part}</mark>` : part);
}

// 성실도 처음 추천값: 글 길이와 핵심 낱말을 보고 (선생님이 바꿀 수 있어요)
export const EFFORT = { 1: '😐 조금', 2: '🙂 보통', 3: '😊 성실' };
function suggestEffort(answer, kws, hit) {
  const len = String(answer || '').replace(/\s/g, '').length;
  if (len >= 40 || (kws.length && hit.length >= Math.ceil(kws.length / 2) && len >= 20)) return 3;
  if (len >= 12) return 2;
  return 1;
}

function GradeCard({ a, student, onDone }) {
  const [fb, setFb] = useState(a.feedback || '');
  const [busy, setBusy] = useState(false);
  const q = a.questions || {};
  const kws = q.data?.keywords || [];
  const hit = kws.filter((k) => String(a.answer).includes(k));
  const [effort, setEffort] = useState(a.effort || suggestEffort(a.answer, kws, hit));

  const grade = async (score) => {
    setBusy(true);
    try {
      try { await rpc('grade_attempt2', { p_attempt: a.id, p_score: score, p_feedback: fb, p_effort: effort }); }
      catch (e) { if (/grade_attempt2/.test(e.message || '')) await rpc('grade_attempt', { p_attempt: a.id, p_score: score, p_feedback: fb }); else throw e; }
      toast('채점했어요 ✔');
      onDone();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };

  return html`<div class="card grade-card">
    <div class="gc-head"><${AvatarImg} cfg=${student?.avatar_cfg} size=${40} /><b>${student?.display_name || student?.login_id}</b>
      <span class="muted small">${a.lessons?.title} · ${fmtDate(a.created_at)}</span>
      ${a.graded_at && html`<span class="pill">${a.score === 2 ? '🌟 정답' : a.score === 1 ? '👍 부분' : '💪 다시'}</span>`}
      ${a.graded_at && a.effort && html`<span class="pill">${EFFORT[a.effort]}</span>`}</div>
    <div class="gc-q">Q. <${RichText} text=${q.prompt} /></div>
    <div class="gc-answer">${highlight(a.answer, kws)}</div>
    <div class="muted small">예시 답안: ${q.data?.model_answer || '-'}</div>
    ${kws.length > 0 && html`<div class="small">핵심 낱말 ${hit.length}/${kws.length}: ${kws.map((k) => html`<span class=${'pill ' + (hit.includes(k) ? 'good' : '')}>${k}</span>`)}</div>`}
    <div class="effort-row"><span class="small"><b>성실도</b> <span class="muted">(리포트에 들어가요)</span></span>
      ${[1, 2, 3].map((n) => html`<button type="button" class=${'chip' + (effort === n ? ' on' : '')} onClick=${() => setEffort(n)}>${EFFORT[n]}</button>`)}
      <span class="muted small">${String(a.answer || '').replace(/\s/g, '').length}자</span></div>
    <input class="input" placeholder="학생에게 한마디 (선택)" value=${fb} onInput=${(e) => setFb(e.target.value)} />
    <div class="btn-row">
      <button class="btn good" disabled=${busy} onClick=${() => grade(2)}>🌟 정답</button>
      <button class="btn" disabled=${busy} onClick=${() => grade(1)}>👍 부분 정답</button>
      <button class="btn warn" disabled=${busy} onClick=${() => grade(0)}>💪 다시 해 보기</button>
    </div>
  </div>`;
}

export function GradingPage() {
  const [list, setList] = useState(null);
  const [students, setStudents] = useState({});
  const [showDone, setShowDone] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      let query = sb.from('attempts').select('*, questions!inner(prompt,type,data), lessons(title)').eq('questions.type', 'essay').order('created_at', { ascending: false });
      query = showDone ? query.not('graded_at', 'is', null).limit(50) : query.is('graded_at', null);
      const [a, p] = await Promise.all([query, sb.from('profiles').select('id,display_name,login_id,avatar_cfg')]);
      if (a.error || p.error) throw a.error || p.error;
      setStudents(Object.fromEntries(p.data.map((s) => [s.id, s])));
      setList(a.data);
    } catch (e) { setErr(friendlyError(e)); }
  };
  useEffect(() => { setList(null); load(); }, [showDone]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;

  return html`<div class="page">
    <div class="page-head"><h1>📝 서술형 채점</h1>
      <div class="tabs"><button class=${'tab' + (!showDone ? ' on' : '')} onClick=${() => setShowDone(false)}>채점 대기</button>
        <button class=${'tab' + (showDone ? ' on' : '')} onClick=${() => setShowDone(true)}>채점 완료</button></div></div>
    ${!list ? html`<${Loading} />` : list.length === 0 ? html`<div class="card empty">${showDone ? '채점한 답안이 없어요.' : '채점할 답안이 없어요. 🎉'}</div>`
      : html`<div class="list">${list.map((a) => html`<${GradeCard} key=${a.id} a=${a} student=${students[a.user_id]} onDone=${load} />`)}</div>`}
  </div>`;
}
