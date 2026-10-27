import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { Loading, ErrorBox, toast, fmtDate } from '../components/ui.js';
import { RichText } from '../components/math.js';

function highlight(text, keywords) {
  if (!keywords?.length) return text;
  const esc = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return String(text).split(new RegExp(`(${esc})`, 'g')).map((part) =>
    keywords.includes(part) ? html`<mark>${part}</mark>` : part);
}

function GradeCard({ a, student, onDone }) {
  const [fb, setFb] = useState(a.feedback || '');
  const [busy, setBusy] = useState(false);
  const q = a.questions || {};
  const kws = q.data?.keywords || [];
  const hit = kws.filter((k) => String(a.answer).includes(k));

  const grade = async (score) => {
    setBusy(true);
    try {
      await rpc('grade_attempt', { p_attempt: a.id, p_score: score, p_feedback: fb });
      toast('채점했어요 ✔');
      onDone();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };

  return html`<div class="card grade-card">
    <div class="gc-head"><span class="sc-avatar">${student?.avatar}</span><b>${student?.display_name || student?.login_id}</b>
      <span class="muted small">${a.lessons?.title} · ${fmtDate(a.created_at)}</span>
      ${a.graded_at && html`<span class="pill">${a.score === 2 ? '🌟 정답' : a.score === 1 ? '👍 부분' : '💪 다시'}</span>`}</div>
    <div class="gc-q">Q. <${RichText} text=${q.prompt} /></div>
    <div class="gc-answer">${highlight(a.answer, kws)}</div>
    <div class="muted small">예시 답안: ${q.data?.model_answer || '-'}</div>
    ${kws.length > 0 && html`<div class="small">핵심 낱말 ${hit.length}/${kws.length}: ${kws.map((k) => html`<span class=${'pill ' + (hit.includes(k) ? 'good' : '')}>${k}</span>`)}</div>`}
    <input class="input" placeholder="학생에게 한마디 (선택)" value=${fb} onInput=${(e) => setFb(e.target.value)} />
    <div class="btn-row">
      <button class="btn good" disabled=${busy} onClick=${() => grade(2)}>🌟 정답 (+8)</button>
      <button class="btn" disabled=${busy} onClick=${() => grade(1)}>👍 부분 정답 (+4)</button>
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
      const [a, p] = await Promise.all([query, sb.from('profiles').select('id,display_name,login_id,avatar')]);
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
