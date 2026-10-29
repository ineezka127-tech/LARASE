// 📊 문항 통계: 수업마다 문제별로 누가 무엇을 골랐는지, 정답률, 많이 나온 오답 (풀이가 생기면 바로 바뀌어요)
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { TYPES, DIFFICULTY, TIERS, tierOf, answerText } from '../lib/questions.js';
import { answerToText, fetchAll, kstDate, todayKst } from '../lib/report.js';
import { Loading, ErrorBox, fmtDate } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { RichText } from '../components/math.js';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
const accClass = (p) => (p == null ? 'none' : p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'lo');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const norm = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

// ---------- 수업 고르기 ----------
function LessonPicker() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    (async () => {
      const [l, a, p] = await Promise.all([
        sb.from('lessons').select('id,title,subject,lesson_date').order('lesson_date', { ascending: false }).limit(60),
        fetchAll(() => sb.from('attempts').select('lesson_id,user_id,is_correct')),
        sb.from('profiles').select('id,is_test').eq('role', 'student'),
      ]);
      if (l.error) throw l.error;
      const tests = new Set((p.data || []).filter((x) => x.is_test).map((x) => x.id));
      const by = {};
      a.filter((x) => !tests.has(x.user_id)).forEach((x) => {
        const g = (by[x.lesson_id] ||= { n: 0, right: 0, users: new Set() });
        if (x.is_correct !== null) { g.n += 1; if (x.is_correct) g.right += 1; }
        g.users.add(x.user_id);
      });
      setD({ lessons: l.data, by });
    })().catch((e) => setErr(friendlyError(e)));
  }, []);
  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!d) return html`<${Loading} />`;
  return html`<div class="page">
    <h1>📊 문항 통계</h1>
    <p class="muted">수업을 고르면 문제마다 학생들이 고른 답, 정답률, 많이 나온 오답을 볼 수 있어요. 학생이 풀면 바로 바뀌어요.</p>
    <div class="card"><table class="table">
      <tr><th>날짜</th><th>수업</th><th>푼 학생</th><th>정답률</th><th></th></tr>
      ${d.lessons.map((l) => { const g = d.by[l.id]; return html`<tr>
        <td>${fmtDate(l.lesson_date)}</td><td><b>${l.title}</b> <span class="muted small">${l.subject}</span></td>
        <td>${g ? g.users.size + '명' : '-'}</td>
        <td>${g?.n ? html`<span class=${'acc-badge ' + accClass(pct(g.right, g.n))}>${pct(g.right, g.n)}%</span>` : '-'}</td>
        <td class="right"><a class="btn small primary" href=${'#/t/stats/' + l.id}>📊 보기</a></td></tr>`; })}
    </table></div>
  </div>`;
}

// ---------- 한 문제 ----------
function QuestionStat({ q, no, atts, students, byId, firstOnly }) {
  const people = (list) => [...new Map(list.map((a) => [a.user_id, byId[a.user_id]])).values()].filter(Boolean);
  const graded = atts.filter((a) => a.is_correct !== null);
  const right = graded.filter((a) => a.is_correct).length;
  const p = pct(right, graded.length);
  // 이 문제를 풀어야 하는 학생 (그룹 문제면 그 그룹만)
  const target = students.filter((s) => !q.tier || tierOf(s) === q.tier);
  const solved = new Set(atts.map((a) => a.user_id));
  const notYet = target.filter((s) => !solved.has(s.id));

  let rows;
  if (q.type === 'mcq') {
    rows = (q.data.choices || []).map((c, i) => {
      const list = atts.filter((a) => Number(a.answer) === i + 1);
      return { label: html`${NUMS[i]} <${RichText} text=${c} />`, n: list.length, ok: i + 1 === q.data.answer, who: people(list) };
    });
  } else if (q.type === 'ox') {
    rows = [true, false].map((v) => {
      const list = atts.filter((a) => a.answer === v);
      return { label: v ? 'O' : 'X', n: list.length, ok: v === !!q.data.answer, who: people(list) };
    });
  } else if (q.type !== 'essay') {
    const groups = new Map();
    atts.forEach((a) => {
      const k = norm(answerToText(q, a.answer));
      const g = groups.get(k) || { label: k, n: 0, ok: !!a.is_correct, list: [] };
      g.n += 1; g.list.push(a); groups.set(k, g);
    });
    rows = [...groups.values()].sort((x, y) => y.n - x.n).slice(0, 8).map((g) => ({ label: html`<${RichText} text=${g.label || '(빈칸)'} />`, n: g.n, ok: g.ok, who: people(g.list) }));
  }
  const max = Math.max(1, ...(rows || []).map((r) => r.n));
  const total = atts.length;

  return html`<div class=${'card qstat' + (p != null && p < 50 ? ' hard' : '')}>
    <div class="qs-head">
      <b class="qs-no">${no}</b>
      <span class="pill">${TYPES[q.type]?.icon} ${TYPES[q.type]?.label}</span><span class=${'pill d' + q.difficulty}>${DIFFICULTY[q.difficulty]}</span>${q.tier ? html`<span class=${'tier-badge sm t-' + q.tier}>${q.tier}</span>` : html`<span class="pill">공통</span>`}
      <span class="spacer"></span>
      ${q.type === 'essay' ? html`<span class="muted small">서술형 ${total}개</span>` : html`<span class=${'acc-badge ' + accClass(p)}>${p ?? '-'}%</span><span class="muted small">${right}/${graded.length}${firstOnly ? '명' : '번'}</span>`}
    </div>
    <div class="qs-prompt"><${RichText} text=${q.prompt} /></div>
    ${rows && html`<div class="dist">${rows.map((r) => html`<div class=${'dist-row' + (r.ok ? ' ok' : r.n ? ' no' : '')}>
      <span class="dist-label">${r.ok ? '✅ ' : ''}${r.label}</span>
      <span class="dist-bar"><span style=${`width:${(r.n / max) * 100}%`}></span></span>
      <span class="dist-n"><b>${r.n}</b></span>
      <span class="dist-who">${r.who.map((s) => html`<span class="who" title=${s.display_name || s.login_id}><${AvatarImg} cfg=${s.avatar_cfg} size=${24} /><small>${(s.display_name || s.login_id).slice(0, 4)}</small></span>`)}</span>
    </div>`)}</div>`}
    ${q.type === 'essay' && html`<div class="essay-list">${atts.map((a) => { const s = byId[a.user_id]; return html`<div class="essay-row">
      <div class="small"><b>${s?.display_name || s?.login_id}</b> <span class="muted">${kstDate(a.created_at)}</span> ${a.graded_at ? html`<span class="pill">${['💪 다시', '👍 부분', '🌟 정답'][a.score ?? 0]}</span>` : html`<span class="pill warn">채점 전</span>`}</div>
      <div class="essay-ans">“${String(a.answer ?? '')}”</div></div>`; })}
      ${!atts.length && html`<p class="muted small">아직 답이 없어요.</p>`}</div>`}
    ${!['mcq', 'ox', 'essay'].includes(q.type) && html`<div class="muted small">정답: <${RichText} text=${answerText(q)} /></div>`}
    ${notYet.length > 0 && html`<div class="not-yet small"><span class="muted">아직 안 푼 학생:</span> ${notYet.map((s) => html`<span class="who-chip">${s.display_name || s.login_id}</span>`)}</div>`}
  </div>`;
}

// ---------- 수업 하나 ----------
function LessonStats({ lessonId }) {
  const [d, setD] = useState(null);
  const [atts, setAtts] = useState([]);
  const [err, setErr] = useState(null);
  const [firstOnly, setFirstOnly] = useState(true);
  const [todayOnly, setTodayOnly] = useState(false);
  const [tier, setTier] = useState('');
  const [sort, setSort] = useState('order');
  const [showTest, setShowTest] = useState(false);
  const [conn, setConn] = useState('connecting');
  const lastAt = useRef(null);

  const loadAtts = async () => {
    const rows = await fetchAll(() => sb.from('attempts').select('id,user_id,question_id,answer,is_correct,score,mode,created_at,graded_at').eq('lesson_id', lessonId).order('created_at'));
    setAtts(rows);
  };
  useEffect(() => {
    (async () => {
      const [l, q, p] = await Promise.all([
        sb.from('lessons').select('id,title,subject,lesson_date').eq('id', lessonId).single(),
        sb.from('questions').select('*').eq('lesson_id', lessonId).order('position'),
        sb.from('profiles').select('*').eq('role', 'student').order('login_id'),
      ]);
      for (const r of [l, q, p]) if (r.error) throw r.error;
      setD({ lesson: l.data, questions: q.data, students: p.data });
      await loadAtts();
    })().catch((e) => setErr(friendlyError(e)));

    let poll = null;
    const ch = sb.channel('stats-' + lessonId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts', filter: `lesson_id=eq.${lessonId}` }, (m) => {
        lastAt.current = Date.now();
        setAtts((x) => (x.some((a) => a.id === m.new.id) ? x : [...x, m.new]));
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') { setConn('on'); if (poll) { clearInterval(poll); poll = null; } }
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(st) && !poll) { setConn('poll'); poll = setInterval(() => loadAtts().catch(() => {}), 15000); }
      });
    const fb = setTimeout(() => setConn((c) => { if (c === 'connecting' && !poll) { poll = setInterval(() => loadAtts().catch(() => {}), 15000); return 'poll'; } return c; }), 8000);
    return () => { sb.removeChannel(ch); if (poll) clearInterval(poll); clearTimeout(fb); };
  }, [lessonId]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!d) return html`<${Loading} text="문항 통계를 계산하는 중…" />`;

  const students = d.students.filter((s) => showTest || !s.is_test);
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const today = todayKst();
  let list = atts.filter((a) => byId[a.user_id] && a.mode !== 'game' && (!todayOnly || kstDate(a.created_at) === today));
  if (firstOnly) {
    const seen = new Set();
    list = list.filter((a) => { const k = a.user_id + a.question_id; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const byQ = {};
  list.forEach((a) => { (byQ[a.question_id] ||= []).push(a); });

  let qs = d.questions.filter((q) => !tier || !q.tier || q.tier === tier).map((q, i) => ({ q, no: i + 1 }));
  const qPct = (q) => { const g = (byQ[q.id] || []).filter((a) => a.is_correct !== null); return g.length ? g.filter((a) => a.is_correct).length / g.length : 2; };
  if (sort === 'hard') qs = [...qs].sort((a, b) => qPct(a.q) - qPct(b.q));

  const graded = list.filter((a) => a.is_correct !== null);
  const right = graded.filter((a) => a.is_correct).length;
  const users = new Set(list.map((a) => a.user_id));
  const hardest = d.questions.filter((q) => (byQ[q.id] || []).some((a) => a.is_correct !== null)).sort((a, b) => qPct(a) - qPct(b))[0];

  return html`<div class="page stats">
    <a class="back" href="#/t/stats">← 수업 고르기</a>
    <div class="page-head"><h1>📊 ${d.lesson.title} <small class="muted">${d.lesson.subject} · ${fmtDate(d.lesson.lesson_date)}</small></h1>
      <span class=${'live-badge ' + conn}>${conn === 'on' ? '● 실시간' : conn === 'poll' ? '⟳ 15초마다' : '… 연결 중'}</span></div>

    <div class="card stat-filters">
      <div class="seg"><button class=${firstOnly ? 'on' : ''} onClick=${() => setFirstOnly(true)}>처음 푼 답만</button><button class=${!firstOnly ? 'on' : ''} onClick=${() => setFirstOnly(false)}>모든 풀이</button></div>
      <div class="seg"><button class=${!todayOnly ? 'on' : ''} onClick=${() => setTodayOnly(false)}>전체 기간</button><button class=${todayOnly ? 'on' : ''} onClick=${() => setTodayOnly(true)}>오늘만</button></div>
      <div class="seg"><button class=${!tier ? 'on' : ''} onClick=${() => setTier('')}>모든 그룹</button>${TIERS.map((t) => html`<button class=${tier === t ? 'on' : ''} onClick=${() => setTier(t)}>${t}</button>`)}</div>
      <div class="seg"><button class=${sort === 'order' ? 'on' : ''} onClick=${() => setSort('order')}>문제 순서</button><button class=${sort === 'hard' ? 'on' : ''} onClick=${() => setSort('hard')}>어려운 문제 먼저</button></div>
      <label class="check small"><input type="checkbox" checked=${showTest} onChange=${(e) => setShowTest(e.target.checked)} /> 🧪 테스트 계정 포함</label>
    </div>

    <div class="stat-tiles">
      <div class="tile"><small>푼 학생</small><b>${users.size}<small>/${students.length}명</small></b></div>
      <div class="tile"><small>정답률</small><b class=${'acc-text ' + accClass(pct(right, graded.length))}>${pct(right, graded.length) ?? '-'}<small>%</small></b></div>
      <div class="tile"><small>${firstOnly ? '푼 문제 (처음)' : '모든 풀이'}</small><b>${list.length}<small>개</small></b></div>
      <div class="tile wide"><small>가장 어려운 문제</small><span class="tile-q">${hardest ? html`<${RichText} text=${hardest.prompt.slice(0, 50)} />` : '-'}</span></div>
    </div>

    ${qs.map(({ q, no }) => html`<${QuestionStat} key=${q.id} q=${q} no=${no} atts=${byQ[q.id] || []} students=${students} byId=${byId} firstOnly=${firstOnly} />`)}
    ${!qs.length && html`<div class="card empty">이 그룹 문제가 없어요.</div>`}
  </div>`;
}

export function StatsPage({ lessonId }) {
  return lessonId ? html`<${LessonStats} key=${lessonId} lessonId=${lessonId} />` : html`<${LessonPicker} />`;
}
