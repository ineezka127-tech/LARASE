// ✍️ 육하원칙 글쓰기 (선생님): 실시간 학생 글 · 피드백 · 다시 써 보기 · 모두에게 보여주기 · 주제 · 맞춤법 · 학생별 기준
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { tierOf } from '../lib/questions.js';
import { FIELDS, FIELD, ALL_KEYS, defaultRule, exampleSentence } from '../lib/w5.js';
import { Loading, ErrorBox, SpeakBtn, toast, timeAgo, go } from '../components/ui.js';
import { PraiseModal } from '../components/praise.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { kstDate, todayKst } from '../lib/report.js';

const STATUS = { writing: ['✏️ 쓰는 중', ''], submitted: ['📮 제출', 'warn'], redo: ['🔁 다시 쓰는 중', 'redo'], done: ['👍 완료', 'good'] };
const TABS = [['subs', '📥 학생 글'], ['tasks', '📝 주제'], ['spell', '🔤 맞춤법 목록'], ['rules', '🎯 학생별 기준']];

export function TeacherWriting() {
  const [tab, setTab] = useState('subs');
  return html`<div class="page">
    <div class="page-head"><h1>✍️ 육하원칙 글쓰기</h1>
      <a class="btn primary" href="#/wshow">📺 수업 화면 (모두 함께 보기)</a></div>
    <div class="tabs">${TABS.map(([k, l]) => html`<button class=${'tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}>${l}</button>`)}</div>
    ${tab === 'subs' && html`<${Submissions} />`}
    ${tab === 'tasks' && html`<${Tasks} />`}
    ${tab === 'spell' && html`<${Spelling} />`}
    ${tab === 'rules' && html`<${Rules} />`}
  </div>`;
}

// ---------- 학생 글 (실시간) ----------
function Submissions() {
  const [d, setD] = useState(null);
  const [subs, setSubs] = useState([]);
  const [err, setErr] = useState(null);
  const [todayOnly, setTodayOnly] = useState(true);
  const [showTest, setShowTest] = useState(false);
  const [conn, setConn] = useState('connecting');
  const [flash, setFlash] = useState({});

  const loadSubs = async () => {
    const { data, error } = await sb.from('w5_submissions').select('*').order('updated_at', { ascending: false }).limit(200);
    if (error) throw error;
    setSubs(data);
  };
  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([sb.from('profiles').select('*').eq('role', 'student').order('login_id'), sb.from('w5_tasks').select('*')]);
      if (p.error || t.error) throw p.error || t.error;
      setD({ students: p.data, tasks: Object.fromEntries(t.data.map((x) => [x.id, x])) });
      await loadSubs();
    })().catch((e) => setErr(friendlyError(e)));
    let poll = null;
    const ch = sb.channel('w5-teacher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'w5_submissions' }, (m) => {
        const r = m.new;
        if (!r?.id) { loadSubs().catch(() => {}); return; }
        setSubs((xs) => [r, ...xs.filter((x) => x.id !== r.id)]);
        setFlash((f) => ({ ...f, [r.id]: Date.now() }));
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') { setConn('on'); if (poll) { clearInterval(poll); poll = null; } }
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(st) && !poll) { setConn('poll'); poll = setInterval(() => loadSubs().catch(() => {}), 8000); }
      });
    const fb = setTimeout(() => setConn((c) => { if (c === 'connecting' && !poll) { poll = setInterval(() => loadSubs().catch(() => {}), 8000); return 'poll'; } return c; }), 8000);
    return () => { sb.removeChannel(ch); if (poll) clearInterval(poll); clearTimeout(fb); };
  }, []);

  if (err) return html`<${ErrorBox} error=${err} />`;
  if (!d) return html`<${Loading} />`;
  const byId = Object.fromEntries(d.students.map((s) => [s.id, s]));
  const today = todayKst();
  const list = subs.filter((x) => byId[x.user_id] && (showTest || !byId[x.user_id].is_test) && (!todayOnly || kstDate(x.updated_at) === today));

  return html`<div>
    <div class="btn-row">
      <div class="seg"><button class=${todayOnly ? 'on' : ''} onClick=${() => setTodayOnly(true)}>오늘</button><button class=${!todayOnly ? 'on' : ''} onClick=${() => setTodayOnly(false)}>전체</button></div>
      <label class="check small"><input type="checkbox" checked=${showTest} onChange=${(e) => setShowTest(e.target.checked)} /> 🧪 테스트 계정</label>
      <span class=${'live-badge ' + conn}>${conn === 'on' ? '● 실시간' : conn === 'poll' ? '⟳ 8초마다' : '… 연결 중'}</span>
    </div>
    ${!list.length && html`<div class="card empty">${todayOnly ? '오늘은 아직 쓴 글이 없어요.' : '아직 쓴 글이 없어요.'}</div>`}
    <div class="w5t-list">${list.map((x) => html`<${SubCard} key=${x.id} x=${x} student=${byId[x.user_id]} task=${d.tasks[x.task_id]} flash=${flash[x.id] && Date.now() - flash[x.id] < 3000}
      onSaved=${(r) => setSubs((xs) => (r._deleted ? xs.filter((y) => y.id !== r.id) : xs.map((y) => (y.id === r.id ? r : y))))} />`)}</div>
  </div>`;
}

// 자주 쓰는 한마디 (누르면 입력 칸에 들어가요. 고쳐서 보내도 돼요)
export const QUICK_FEEDBACK = ['👏 여섯 칸을 모두 잘 썼어요!', '🌟 문장이 아주 자연스러워요!', '💡 왜 그랬는지 더 자세히 써 볼까요?', '💡 언제인지 더 정확하게 써 볼까요?', '💡 어떻게 했는지 더 써 볼까요?', '🔤 맞춤법을 한 번 더 살펴봐요'];

// 💬 한마디·다시 써 보기·완료·모두에게 보여주기 (학생 글 카드, 지켜보기, 수업 화면에서 함께 써요)
export function FeedbackBar({ x, onSaved, compact = false, big = false, extra = null }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const update = async (patch, note) => {
    setBusy(true);
    const { data, error } = await sb.from('w5_submissions').update(patch).eq('id', x.id).select('*').single();
    setBusy(false);
    if (error) { toast('⚠️ ' + friendlyError(error)); return; }
    onSaved?.(data); if (note) toast(note); setMsg('');
  };
  const send = (status) => {
    const text = msg.trim();
    if (status === 'redo' && !text && !confirm('한마디 없이 "다시 써 보기"만 보낼까요?')) return;
    update({ teacher_feedback: text || x.teacher_feedback || (status === 'redo' ? '한 번 더 고쳐 볼까요?' : null), feedback_at: new Date().toISOString(), ...(status ? { status } : {}) },
      status === 'redo' ? '🔁 다시 써 보기를 보냈어요' : status === 'done' ? '👍 완료로 표시했어요' : '💬 보냈어요');
  };
  const sz = big ? '' : ' small';
  return html`<div class=${'fb-bar' + (compact ? ' compact' : '') + (big ? ' big' : '')}>
    <div class="fb-chips">${QUICK_FEEDBACK.map((t) => html`<button type="button" class="chip" onClick=${() => { setMsg(t); inputRef.current?.focus(); }}>${t}</button>`)}</div>
    <div class="w5t-actions">
      <input ref=${inputRef} class="input" maxlength="300" value=${msg} placeholder="학생에게 한마디 (Enter로 보내기)" onInput=${(e) => setMsg(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && msg.trim() && send(null)} />
      <button class=${'btn primary' + sz} disabled=${busy || !msg.trim()} onClick=${() => send(null)}>💬 보내기</button>
      <button class=${'btn warn' + sz} disabled=${busy} onClick=${() => send('redo')}>🔁 다시 써 보기</button>
      ${x.status !== 'writing' && html`<button class=${'btn good' + sz} disabled=${busy || x.status === 'done'} onClick=${() => send('done')}>👍 완료</button>`}
      <button class=${'btn' + sz + (x.showcase ? ' on-star' : '')} disabled=${busy} onClick=${() => update({ showcase: !x.showcase }, x.showcase ? '보여주기를 내렸어요' : '⭐ 학생들도 볼 수 있게 했어요')}>${x.showcase ? '⭐ 내리기' : '⭐ 모두에게 보여주기'}</button>
      ${extra}
    </div>
  </div>`;
}

function SubCard({ x, student, task, flash, onSaved }) {
  const c = x.checks || {};
  const required = c.required || ALL_KEYS;
  const [label, cls] = STATUS[x.status];
  const spellFlags = [...(c.spelling || []), ...(c.finalSpelling || []).map((s) => ({ ...s, field: 'final' }))];
  return html`<div class=${'card w5t-card ' + cls + (flash ? ' flash' : '')}>
    <div class="w5t-head"><${AvatarImg} cfg=${student.avatar_cfg} size=${40} /><b>${student.display_name || student.login_id}</b>
      <span class=${'tier-badge sm t-' + tierOf(student)}>${tierOf(student)}</span>
      <span class="muted small">${task?.emoji || '🌈'} ${task?.title || '자유 주제'}</span>
      <span class=${'pill ' + cls}>${label}</span>${x.showcase ? html`<span class="pill bonus">⭐ 보여주는 중</span>` : ''}
      <span class="spacer"></span><span class="muted small">${timeAgo(x.updated_at)}</span></div>
    <table class="w5t-fields">${FIELDS.map((f) => {
      const req = required.includes(f.k);
      const pass = c.passed?.[f.k];
      return html`<tr class=${!req ? 'opt' : pass ? 'pass' : c.passed ? 'fail' : ''}>
        <th>${f.icon} ${f.label}</th><td>${x.fields?.[f.k] || html`<span class="muted">—</span>`}</td>
        <td class="w5t-mark">${!req ? html`<small class="muted">선택</small>` : c.passed ? (pass ? '✅' : html`<span title=${c.msgs?.[f.k] || ''}>❌</span>`) : ''}</td></tr>`;
    })}</table>
    ${c.msgs && Object.keys(c.msgs).length > 0 && html`<div class="small w5t-msgs">${FIELDS.filter((f) => c.msgs[f.k]).map((f) => html`<div>❌ <b>${f.label}</b>: ${c.msgs[f.k]}</div>`)}</div>`}
    ${spellFlags.length > 0 && html`<div class="small w5t-spell">🔤 ${spellFlags.map((s) => html`<span class=${'pill ' + (s.sure ? 'warn' : '')}>${s.wrong} → ${s.right}${s.sure ? '' : '?'}</span>`)}</div>`}
    ${(x.final_text || x.status !== 'writing') && html`<div class="final-box small-final">${x.final_text ? `“${x.final_text}”` : html`<span class="muted">(예시) ${exampleSentence(x.fields || {})}</span>`}</div>`}
    ${x.teacher_feedback && html`<div class="t-feedback">💬 보낸 한마디: ${x.teacher_feedback}</div>`}
    <${FeedbackBar} x=${x} onSaved=${onSaved}
      extra=${html`<button class="btn small ghost" title="이 글 지우기" onClick=${async () => { if (!confirm('이 글을 지울까요?')) return; const { error } = await sb.from('w5_submissions').delete().eq('id', x.id); if (error) toast('⚠️ ' + friendlyError(error)); else onSaved({ ...x, _deleted: true }); }}>🗑️</button>`} />
  </div>`;
}

// 지켜보기 화면에 들어가는 작은 글 카드 (칸별 내용 + 한마디)
export function WriteMini({ x, onSaved }) {
  if (!x) return html`<div class="sc-ans wait muted">글을 막 시작했어요. 한 칸을 쓰면 여기에 보여요…</div>`;
  const c = x.checks || {};
  const required = c.required || ALL_KEYS;
  return html`<div class="w5-mini">
    <div class="w5-mini-fields">${FIELDS.map((f) => {
      const v = x.fields?.[f.k];
      const mark = !required.includes(f.k) ? '' : c.passed ? (c.passed[f.k] ? '✅' : '❌') : '';
      return html`<div class=${'wm-row' + (v ? '' : ' empty')}><span class="wm-label">${f.icon} ${f.label}</span><span class="wm-val">${v || '—'}</span><span>${mark}</span></div>`;
    })}</div>
    ${x.final_text && html`<div class="final-box small-final">“${x.final_text}”</div>`}
    ${x.teacher_feedback && html`<div class="t-feedback small">💬 ${x.teacher_feedback}</div>`}
    <${FeedbackBar} x=${x} onSaved=${onSaved} compact />
  </div>`;
}

// ---------- 주제 ----------
function Tasks() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ title: '', emoji: '📝', guide: '' });
  const load = () => sb.from('w5_tasks').select('*').order('created_at', { ascending: false }).then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!form.title.trim()) return;
    const { error } = await sb.from('w5_tasks').insert({ title: form.title.trim(), emoji: form.emoji.trim() || null, guide: form.guide.trim() || null });
    if (error) toast('⚠️ ' + friendlyError(error)); else { setForm({ title: '', emoji: '📝', guide: '' }); load(); toast('주제를 올렸어요 ✔'); }
  };
  const patch = async (t, p) => { const { error } = await sb.from('w5_tasks').update(p).eq('id', t.id); if (error) toast('⚠️ ' + friendlyError(error)); else load(); };
  const del = async (t) => { if (!confirm(`'${t.title}' 주제를 지울까요? (학생 글은 '자유 주제'로 남아요)`)) return; await sb.from('w5_tasks').delete().eq('id', t.id); load(); };
  if (!list) return html`<${Loading} />`;
  return html`<div>
    <div class="card"><h2>➕ 새 주제</h2>
      <div class="btn-row"><input class="input" style="width:4.5em" value=${form.emoji} onInput=${(e) => setForm({ ...form, emoji: e.target.value })} />
        <input class="input" style="flex:1" placeholder="주제 (예: 체험학습 다녀온 날)" value=${form.title} onInput=${(e) => setForm({ ...form, title: e.target.value })} /></div>
      <input class="input" placeholder="안내 (선택: 학생 화면에 보여요)" value=${form.guide} onInput=${(e) => setForm({ ...form, guide: e.target.value })} />
      <div class="btn-row"><button class="btn primary" disabled=${!form.title.trim()} onClick=${add}>올리기</button></div></div>
    <div class="card"><table class="table">
      <tr><th></th><th>주제</th><th>학생에게 보이기</th><th></th></tr>
      ${list.map((t) => html`<tr><td>${t.emoji}</td><td><b>${t.title}</b><div class="muted small">${t.guide || ''}</div></td>
        <td><label class="check"><input type="checkbox" checked=${t.active} onChange=${(e) => patch(t, { active: e.target.checked })} /> ${t.active ? '보여요' : '숨김'}</label></td>
        <td class="right"><button class="btn small ghost" onClick=${() => del(t)}>🗑️</button></td></tr>`)}
    </table></div>
  </div>`;
}

// ---------- 맞춤법 목록 ----------
function Spelling() {
  const [list, setList] = useState(null);
  const [w, setW] = useState('');
  const [r, setR] = useState('');
  const load = () => sb.from('w5_spelling').select('*').order('created_at', { ascending: false }).then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);
  const add = async () => {
    const { error } = await sb.from('w5_spelling').insert({ wrong: w.trim(), right_word: r.trim() });
    if (error) toast('⚠️ ' + friendlyError(error)); else { setW(''); setR(''); load(); }
  };
  if (!list) return html`<${Loading} />`;
  return html`<div>
    <div class="card"><h2>➕ 자주 틀리는 말 넣기</h2>
      <p class="muted small">여기 있는 말을 학생이 쓰면 "'마셔다'는 '마셨다'로 써요"처럼 알려 줘요. 목록에 없어도 과거형 받침이 빠진 말(먹어다·놀아다 등)은 "혹시 '먹었다'인가요?"처럼 물어봐요.</p>
      <div class="btn-row"><input class="input" style="width:10em" placeholder="틀린 말 (마셔다)" value=${w} onInput=${(e) => setW(e.target.value)} /> →
        <input class="input" style="width:10em" placeholder="바른 말 (마셨다)" value=${r} onInput=${(e) => setR(e.target.value)} />
        <button class="btn primary" disabled=${!w.trim() || !r.trim()} onClick=${add}>넣기</button></div></div>
    <div class="card"><div class="spell-list">${list.map((s) => html`<span class="spell-chip">${s.wrong} → <b>${s.right_word}</b>
      <button class="x" title="지우기" onClick=${async () => { await sb.from('w5_spelling').delete().eq('id', s.id); load(); }}>×</button></span>`)}</div></div>
  </div>`;
}

// ---------- 학생별 기준 ----------
function Rules() {
  const [d, setD] = useState(null);
  const load = async () => {
    const [p, r] = await Promise.all([sb.from('profiles').select('*').eq('role', 'student').order('login_id'), sb.from('w5_rules').select('*')]);
    setD({ students: p.data || [], rules: Object.fromEntries((r.data || []).map((x) => [x.user_id, x])) });
  };
  useEffect(() => { load(); }, []);
  if (!d) return html`<${Loading} />`;
  const save = async (s, rule) => {
    const { error } = await sb.from('w5_rules').upsert({ user_id: s.id, required: rule.required, level: rule.level, rewrite: rule.rewrite, updated_at: new Date().toISOString() });
    if (error) toast('⚠️ ' + friendlyError(error)); else { toast('저장했어요 ✔'); load(); }
  };
  const reset = async (s) => { await sb.from('w5_rules').delete().eq('user_id', s.id); toast('그룹 기본값으로 돌렸어요'); load(); };
  return html`<div class="card">
    <p class="muted small">학생마다 <b>꼭 써야 하는 칸</b>과 <b>점검 세기</b>를 정해요. 정하지 않으면 그룹 기본값: 가·나 그룹은 여섯 칸 모두 + 규칙 점검 + 다시 쓰기, 다 그룹은 누가·언제·어디서·무엇을 4칸 + 채우기만 하면 통과.</p>
    <table class="table rules-table">
      <tr><th>학생</th>${FIELDS.map((f) => html`<th>${f.label}</th>`)}<th>점검</th><th>다시 쓰기</th><th></th></tr>
      ${d.students.map((s) => {
        const own = d.rules[s.id];
        const rule = own ? { required: own.required, level: own.level, rewrite: own.rewrite } : defaultRule(tierOf(s));
        const toggle = (k) => save(s, { ...rule, required: rule.required.includes(k) ? rule.required.filter((x) => x !== k) : ALL_KEYS.filter((x) => x === k || rule.required.includes(x)) });
        return html`<tr class=${own ? '' : 'default-rule'}>
          <td><b>${s.display_name || s.login_id}</b> <span class=${'tier-badge sm t-' + tierOf(s)}>${tierOf(s)}</span>${s.is_test ? ' 🧪' : ''}<div class="muted small">${own ? '직접 정함' : '그룹 기본값'}</div></td>
          ${FIELDS.map((f) => html`<td><input type="checkbox" checked=${rule.required.includes(f.k)} onChange=${() => toggle(f.k)} /></td>`)}
          <td><select class="input" value=${rule.level} onChange=${(e) => save(s, { ...rule, level: e.target.value })}><option value="normal">규칙 점검</option><option value="easy">채우면 통과</option></select></td>
          <td><input type="checkbox" checked=${rule.rewrite} onChange=${(e) => save(s, { ...rule, rewrite: e.target.checked })} /></td>
          <td>${own && html`<button class="btn small ghost" onClick=${() => reset(s)}>기본값</button>`}</td></tr>`;
      })}
    </table></div>`;
}

// ---------- 📺 수업 화면: 우리 반 글을 모두 함께 보고 바로 한마디 ----------
// 교실 TV(전자칠판)에 띄워 놓고, 글을 눌러 크게 보면서 바로 피드백·칭찬해요. 학생이 쓰는 대로 실시간으로 바뀌어요.
export function WritingShow() {
  const [d, setD] = useState(null);
  const [subs, setSubs] = useState([]);
  const [taskF, setTaskF] = useState(null);      // null = 아직 안 정함 (오늘 가장 최근 주제로)
  const [today, setToday] = useState(true);
  const [starOnly, setStarOnly] = useState(false);
  const [hide, setHide] = useState(false);       // 이름 가리기
  const [focus, setFocus] = useState(null);      // 크게 보는 글 id
  const [praise, setPraise] = useState(null);
  const [conn, setConn] = useState('connecting');

  const loadSubs = async () => {
    const { data, error } = await sb.from('w5_submissions').select('*').order('created_at', { ascending: true }).limit(400);
    if (!error) setSubs(data);
  };
  useEffect(() => {
    Promise.all([sb.from('profiles').select('*').eq('role', 'student'), sb.from('w5_tasks').select('*').order('created_at', { ascending: false })])
      .then(([p, t]) => setD({ byId: Object.fromEntries((p.data || []).map((x) => [x.id, x])), tasks: t.data || [] }));
    loadSubs();
    const ch = sb.channel('w5-class')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'w5_submissions' }, (m) => {
        if (m.eventType === 'DELETE') { setSubs((xs) => xs.filter((x) => x.id !== m.old?.id)); return; }
        const r = m.new; if (!r?.id) return;
        setSubs((xs) => (xs.some((x) => x.id === r.id) ? xs.map((x) => (x.id === r.id ? { ...r, _flash: Date.now() } : x)) : [...xs, { ...r, _flash: Date.now() }]));
      })
      .subscribe((st) => setConn(st === 'SUBSCRIBED' ? 'on' : ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(st) ? 'poll' : 'connecting'));
    const poll = setInterval(loadSubs, 15000);   // 실시간이 끊겨도 15초마다
    return () => { sb.removeChannel(ch); clearInterval(poll); };
  }, []);

  const day = todayKst();
  const base = d ? subs.filter((x) => d.byId[x.user_id] && !d.byId[x.user_id].is_test && (!today || kstDate(x.updated_at) === day)) : [];
  // 처음에는 오늘 가장 최근에 쓴 주제를 골라 둬요
  const autoTask = base.length ? [...base].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0].task_id || 'free' : 'all';
  const tf = taskF || autoTask;
  const list = base.filter((x) => (tf === 'all' || (tf === 'free' ? !x.task_id : x.task_id === tf)) && (!starOnly || x.showcase));
  const fi = list.findIndex((x) => x.id === focus);
  const cur = fi >= 0 ? list[fi] : null;
  const nameOf = (x) => (hide ? `${list.indexOf(x) + 1}번 글` : d.byId[x.user_id]?.display_name || x.author_name || '친구');
  const saved = (r) => setSubs((xs) => xs.map((y) => (y.id === r.id ? r : y)));

  useEffect(() => {
    const key = (e) => {
      if (praise || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;   // 칭찬 창이 열려 있으면 그 창이 먼저
      if (e.key === 'Escape') { if (focus) setFocus(null); else go('#/t/write'); }
      if (!cur) return;
      if (e.key === 'ArrowRight' && fi < list.length - 1) setFocus(list[fi + 1].id);
      if (e.key === 'ArrowLeft' && fi > 0) setFocus(list[fi - 1].id);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  if (!d) return html`<${Loading} />`;
  const taskInfo = (x) => d.tasks.find((t) => t.id === x.task_id);
  const allStar = list.length > 0 && list.every((x) => x.showcase);
  const bulkStar = async () => {
    const on = !allStar;
    if (!confirm(on ? `보이는 글 ${list.length}편을 학생들 태블릿 '📋 우리 반 글'에도 보여줄까요?` : '학생 태블릿에서 모두 내릴까요?')) return;
    const { error } = await sb.from('w5_submissions').update({ showcase: on }).in('id', list.map((x) => x.id));
    if (error) toast('⚠️ ' + friendlyError(error)); else { toast(on ? '⭐ 학생 태블릿에도 보여요' : '내렸어요'); loadSubs(); }
  };

  return html`<div class="wshow">
    <div class="wshow-top">
      <b>📋 우리 반 글 <small class="muted">${list.length}편</small></b>
      <div class="wshow-ctrl">
        <select class="input" value=${tf} onChange=${(e) => setTaskF(e.target.value)}>
          <option value="all">모든 주제</option>
          ${d.tasks.map((t) => html`<option value=${t.id}>${t.emoji || '📝'} ${t.title}</option>`)}
          <option value="free">🌈 자유 주제</option>
        </select>
        <div class="seg"><button class=${today ? 'on' : ''} onClick=${() => setToday(true)}>오늘</button><button class=${!today ? 'on' : ''} onClick=${() => setToday(false)}>전체</button></div>
        <label class="check small"><input type="checkbox" checked=${starOnly} onChange=${(e) => setStarOnly(e.target.checked)} /> ⭐만</label>
        <label class="check small"><input type="checkbox" checked=${hide} onChange=${(e) => setHide(e.target.checked)} /> 🙈 이름 가리기</label>
        <button class="btn small" disabled=${!list.length} onClick=${bulkStar}>${allStar ? '📢 학생 태블릿에서 내리기' : '📢 학생 태블릿에도 보여주기'}</button>
        <span class=${'live-badge ' + conn}>${conn === 'on' ? '● 실시간' : conn === 'poll' ? '⟳ 15초마다' : '…'}</span>
        <a class="btn small" href="#/t/write">✕ 나가기</a>
      </div>
    </div>

    ${!list.length ? html`<div class="wshow-empty">${today ? '오늘 쓴 글이 아직 없어요. 학생이 쓰기 시작하면 바로 나타나요 ✍️' : '쓴 글이 없어요.'}</div>`
      : html`<div class="wshow-grid">${list.map((x) => {
        const t = taskInfo(x);
        const [label, cls] = STATUS[x.status];
        const filled = FIELDS.filter((f) => String(x.fields?.[f.k] || '').trim());
        const flash = x._flash && Date.now() - x._flash < 2500;
        return html`<button type="button" key=${x.id} class=${'wshow-tile ' + cls + (flash ? ' flash' : '') + (x.showcase ? ' star' : '')} onClick=${() => setFocus(x.id)}>
          <div class="wt-head">${!hide && html`<${AvatarImg} cfg=${d.byId[x.user_id]?.avatar_cfg} size=${40} />`}<b>${nameOf(x)}</b>
            <span class=${'pill ' + cls}>${label}</span>${x.showcase ? html`<span title="학생 태블릿에도 보여요">⭐</span>` : ''}</div>
          ${tf === 'all' && html`<div class="muted small">${t?.emoji || '🌈'} ${t?.title || '자유 주제'}</div>`}
          ${x.final_text ? html`<div class="wt-text">“${x.final_text}”</div>`
            : html`<div class="wt-fields">${filled.length ? filled.map((f) => html`<span><small>${f.label}</small> ${x.fields[f.k]}</span>`) : html`<span class="muted">✏️ 쓰기 시작했어요…</span>`}</div>`}
          ${x.teacher_feedback && html`<div class="t-feedback small">💬 ${x.teacher_feedback}</div>`}
        </button>`;
      })}</div>`}

    ${cur && html`<div class="wshow-focus" onClick=${(e) => e.target === e.currentTarget && setFocus(null)}>
      <div class="wshow-card focus">
        <div class="wf-top">
          <button class="btn big" disabled=${fi <= 0} onClick=${() => setFocus(list[fi - 1].id)}>◀</button>
          <div class="wshow-task">${taskInfo(cur)?.emoji || '🌈'} ${taskInfo(cur)?.title || '자유 주제'} · ${fi + 1} / ${list.length}</div>
          <button class="btn big" disabled=${fi >= list.length - 1} onClick=${() => setFocus(list[fi + 1].id)}>▶</button>
          <button class="btn" onClick=${() => setFocus(null)}>✕</button>
        </div>
        <div class="wshow-author">${!hide && html`<${AvatarImg} cfg=${d.byId[cur.user_id]?.avatar_cfg} size=${56} />`} ${nameOf(cur)} <span class=${'pill ' + STATUS[cur.status][1]}>${STATUS[cur.status][0]}</span></div>
        <div class="wshow-text">“${cur.final_text || exampleSentence(cur.fields || {}) || '…'}” <${SpeakBtn} text=${cur.final_text || exampleSentence(cur.fields || {})} /></div>
        ${!cur.final_text && html`<div class="muted">(아직 이어 쓰기 전이라 여섯 칸을 이어 붙여 보여 줘요)</div>`}
        <div class="wshow-fields">${FIELDS.map((f) => {
          const pass = cur.checks?.passed?.[f.k];
          return html`<span class=${cur.fields?.[f.k] ? (cur.checks?.passed ? (pass ? 'pass' : 'fail') : '') : 'empty'}><small>${f.icon} ${f.label}${cur.checks?.passed && cur.fields?.[f.k] ? (pass ? ' ✅' : ' 💡') : ''}</small>${cur.fields?.[f.k] || '—'}</span>`;
        })}</div>
        ${cur.teacher_feedback && html`<div class="t-feedback big">💬 선생님: ${cur.teacher_feedback}</div>`}
        <${FeedbackBar} key=${cur.id} x=${cur} onSaved=${saved} big
          extra=${html`<button class="btn" onClick=${() => setPraise(cur.user_id)}>🎁 칭찬하기</button>`} />
      </div>
    </div>`}
    ${praise && html`<${PraiseModal} only=${praise} onClose=${() => setPraise(null)} />`}
  </div>`;
}
