// 📡 실시간 현황: 학생들이 지금 무엇을 하고 있는지 바로바로 보여요
// Supabase 실시간 연결을 쓰고, 연결이 안 되면 20초마다 새로 불러와요
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { TYPES, DIFFICULTY, tierOf } from '../lib/questions.js';
import { answerToText, todayKst } from '../lib/report.js';
import { Loading, ErrorBox, timeAgo, toast } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { RichText } from '../components/math.js';

const EVENT_TEXT = {
  view: '📖 복습 자료를 봤어요', quiz_done: '🏁 퀴즈를 끝까지 풀었어요', daily: '🔥 오늘 첫 접속', levelup: '⭐ 레벨 업!',
  buy: '🛍️ 상점에서 샀어요', essay_graded: '🌟 서술형 채점 받음', teacher_coins: '🎁 칭찬/약속', teacher_praise: '🎁 칭찬 받음', teacher_dice: '🎲 주사위 선물',
};
const MODE = { quiz: '퀴즈', set: '묶음 퀴즈', retry: '다시 풀기', game: '모험', bonus: '🌟 보너스 도전' };

// ---------- 👀 지켜보기: 학생 화면 그대로 ----------
const PAGE_TEXT = { quiz: '📝 퀴즈 푸는 중', lesson: '📖 복습 자료 보는 중', game: '🎲 모험 지도', done: '🏁 퀴즈를 마쳤어요', away: '💤 퀴즈에서 나갔어요' };
const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const minutesToMidnight = () => { const now = new Date(); const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); return Math.max(10, 24 * 60 - kst.getHours() * 60 - kst.getMinutes() - 1); };

function WatchPanel({ students, showTest }) {
  const [watch, setWatch] = useState(null);
  const [rows, setRows] = useState({});
  const [drafts, setDrafts] = useState(true);
  const [conn, setConn] = useState('connecting');
  const qCache = useRef({});
  const [, bump] = useState(0);

  const withQ = async (list) => {
    const need = [...new Set(list.filter((r) => r.question_id && !qCache.current[r.question_id]).map((r) => r.question_id))];
    if (need.length) {
      const { data } = await sb.from('questions').select('id,type,difficulty,tier,prompt,data').in('id', need);
      (data || []).forEach((q) => { qCache.current[q.id] = q; });
    }
  };
  const load = async () => {
    const [w, l] = await Promise.all([rpc('live_watch'), sb.from('live_status').select('*')]);
    setWatch(w); if (w?.on) setDrafts(!!w.drafts);
    if (!l.error) { await withQ(l.data); setRows(Object.fromEntries(l.data.map((r) => [r.user_id, r]))); }
  };

  useEffect(() => {
    load().catch(() => setWatch({ on: false, missing: true }));
    let poll = null;
    const ch = sb.channel('teacher-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, async (m) => {
        const r = m.new; if (!r?.user_id) return;
        await withQ([r]);
        setRows((x) => ({ ...x, [r.user_id]: { ...(x[r.user_id] || {}), ...r, _flash: Date.now() } }));
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') { setConn('on'); if (poll) { clearInterval(poll); poll = null; } }
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(st) && !poll) { setConn('poll'); poll = setInterval(() => load().catch(() => {}), 5000); }
      });
    const fb = setTimeout(() => setConn((c) => { if (c === 'connecting' && !poll) { poll = setInterval(() => load().catch(() => {}), 5000); return 'poll'; } return c; }), 8000);
    const clock = setInterval(() => bump((n) => n + 1), 15000);
    return () => { sb.removeChannel(ch); if (poll) clearInterval(poll); clearTimeout(fb); clearInterval(clock); };
  }, []);

  const set = async (minutes, d = drafts) => {
    try { const w = await rpc('set_live_watch', { p_minutes: minutes, p_drafts: d }); setWatch(w); toast(minutes ? '👀 지켜보기를 켰어요. 학생이 퀴즈를 새로 열면 보여요' : '지켜보기를 껐어요'); }
    catch (e) { toast('⚠️ ' + friendlyError(e)); }
  };
  const left = watch?.on ? Math.max(1, Math.round((new Date(watch.until) - Date.now()) / 60000)) : 0;

  if (!watch) return html`<div class="card watch-panel"><p class="muted">불러오는 중…</p></div>`;
  if (watch.missing) return html`<div class="card watch-panel"><p class="muted">👀 지켜보기를 쓰려면 Supabase 업데이트 11이 필요해요.</p></div>`;

  const shown = students.filter((s) => showTest || !s.is_test);
  const now = Date.now();
  return html`<div class=${'card watch-panel' + (watch.on ? ' on' : '')}>
    <div class="watch-head">
      <div><h2>👀 지켜보기 ${watch.on ? html`<span class="live-badge on">켜짐 · ${hhmm(watch.until)}까지</span>` : html`<span class="live-badge">꺼짐</span>`}</h2>
        <p class="muted small">켜 두면 학생이 지금 푸는 문제와 ${drafts ? '입력 중인 답까지' : '고른 답이'} 바로 보여요. 학생 퀴즈 화면에는 "👀 선생님이 함께 보고 있어요"가 표시돼요.</p></div>
      <div class="watch-ctrl">
        <label class="check small"><input type="checkbox" checked=${drafts} onChange=${(e) => { setDrafts(e.target.checked); if (watch.on) set(left, e.target.checked); }} /> ✏️ 입력 중인 답까지 보기</label>
        <div class="btn-row">
          ${!watch.on ? html`<button class="btn primary" onClick=${() => set(60)}>▶ 1시간 켜기</button><button class="btn" onClick=${() => set(120)}>2시간</button><button class="btn" onClick=${() => set(minutesToMidnight())}>오늘 끝까지</button>`
            : html`<button class="btn" onClick=${() => set(left + 30)}>+30분</button><button class="btn warn" onClick=${() => set(0)}>■ 끄기</button>`}
        </div>
      </div>
    </div>
    ${watch.on && html`<div class="screen-grid">${shown.map((s) => {
      const r = rows[s.id];
      const fresh = r && now - new Date(r.updated_at).getTime() < 10 * 60000;
      const q = r?.question_id ? qCache.current[r.question_id] : null;
      const page = fresh ? r.page : null;
      const flash = r?._flash && now - r._flash < 2500;
      return html`<div class=${'screen-card' + (page === 'quiz' ? ' active' : '') + (flash ? ' flash' : '') + (!page ? ' idle' : '')} key=${s.id}>
        <div class="sc-top"><${AvatarImg} cfg=${s.avatar_cfg} size=${36} /><b>${s.display_name || s.login_id}</b> <span class=${'tier-badge sm t-' + tierOf(s)}>${tierOf(s)}</span>
          <span class="muted small sc-time">${r ? timeAgo(r.updated_at) : ''}</span></div>
        <div class="sc-page">${page ? PAGE_TEXT[page] || page : '— 아직 들어오지 않았어요'}${page === 'quiz' && r.q_index ? html` <b>${r.q_index}/${r.q_total}</b>` : ''}${fresh && r.title ? html` <span class="muted small">· ${r.title}</span>` : ''}</div>
        ${page === 'quiz' && q && html`<div class="sc-q"><span class="muted small">${TYPES[q.type]?.icon} ${DIFFICULTY[q.difficulty] || ''}${q.tier ? ' · ' + q.tier : ''}</span> <${RichText} text=${q.prompt.length > 90 ? q.prompt.slice(0, 90) + '…' : q.prompt} /></div>`}
        ${page === 'quiz' && (r.answered
          ? html`<div class=${'sc-ans ' + (q?.type === 'essay' || r.correct === null ? 'essay' : r.correct ? 'ok' : 'no')}>${q?.type === 'essay' || r.correct === null ? '✍️ 제출' : r.correct ? '✅ 정답' : '❌ 오답'} · <${RichText} text=${answerToText(q, r.draft).slice(0, 160)} /></div>`
          : r.draft != null && r.draft !== '' ? html`<div class="sc-ans typing">✏️ <${RichText} text=${answerToText(q, r.draft).slice(0, 160)} /><span class="dots3"><i></i><i></i><i></i></span></div>`
          : html`<div class="sc-ans wait muted">생각하는 중…</div>`)}
        ${fresh && r.lesson_id && html`<a class="small" href=${'#/t/stats/' + r.lesson_id}>📊 이 수업 문항 통계 →</a>`}
      </div>`;
    })}</div>
    <p class="muted small">${conn === 'on' ? '● 실시간 연결됨' : conn === 'poll' ? '⟳ 5초마다 새로 고침' : '… 연결 중'} · 10분 넘게 움직임이 없으면 흐리게 보여요</p>`}
  </div>`;
}

export function LiveDashboard() {
  const [students, setStudents] = useState(null);
  const [feed, setFeed] = useState([]);           // 오늘 기록 (최신이 앞)
  const [lessons, setLessons] = useState({});
  const [live, setLive] = useState('connecting');  // connecting | on | poll
  const [showTest, setShowTest] = useState(false);
  const [err, setErr] = useState(null);
  const [, tick] = useState(0);
  const qCache = useRef({});
  const fresh = useRef(new Set());

  const start = () => new Date(todayKst() + 'T00:00:00+09:00').toISOString();

  // 문제 정보 붙이기 (실시간으로 들어온 풀이에는 문제 내용이 없어서)
  const withQuestions = async (rows) => {
    const need = [...new Set(rows.filter((r) => r.question_id && !qCache.current[r.question_id]).map((r) => r.question_id))];
    if (need.length) {
      const { data } = await sb.from('questions').select('id,type,difficulty,tier,prompt,data,lesson_id').in('id', need);
      (data || []).forEach((q) => { qCache.current[q.id] = q; });
    }
    return rows.map((r) => (r.question_id ? { ...r, q: qCache.current[r.question_id] } : r));
  };

  const loadAll = async () => {
    const [p, a, e, l] = await Promise.all([
      sb.from('profiles').select('*').eq('role', 'student').order('login_id'),
      sb.from('attempts').select('*').gte('created_at', start()).order('created_at', { ascending: false }).limit(400),
      sb.from('events').select('*').gte('created_at', start()).order('created_at', { ascending: false }).limit(400),
      sb.from('lessons').select('id,title,subject'),
    ]);
    for (const r of [p, a, e, l]) if (r.error) throw r.error;
    setStudents(p.data);
    setLessons(Object.fromEntries(l.data.map((x) => [x.id, x])));
    const atts = await withQuestions(a.data.map((x) => ({ ...x, _t: 'a' })));
    const evs = e.data.filter((x) => EVENT_TEXT[x.kind]).map((x) => ({ ...x, _t: 'e' }));
    setFeed([...atts, ...evs].sort((x, y) => y.created_at.localeCompare(x.created_at)));
  };

  useEffect(() => {
    loadAll().catch((x) => setErr(friendlyError(x)));
    let poll = null;
    const startPoll = () => { if (!poll) poll = setInterval(() => loadAll().catch(() => {}), 20000); setLive('poll'); };
    const add = async (row, t) => {
      if (t === 'e' && !EVENT_TEXT[row.kind]) return;
      const [r] = t === 'a' ? await withQuestions([{ ...row, _t: 'a' }]) : [{ ...row, _t: 'e' }];
      fresh.current.add(`${t}${r.id}`);
      setFeed((f) => (f.some((x) => x._t === t && x.id === r.id) ? f : [r, ...f]));
    };
    const ch = sb.channel('teacher-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts' }, (m) => add(m.new, 'a'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (m) => add(m.new, 'e'))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setLive('on'); if (poll) { clearInterval(poll); poll = null; } }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPoll();
      });
    const fallback = setTimeout(() => setLive((s) => { if (s === 'connecting') { startPoll(); return 'poll'; } return s; }), 8000);
    const clock = setInterval(() => tick((n) => n + 1), 30000);   // "○분 전" 글자 새로 고침
    return () => { sb.removeChannel(ch); if (poll) clearInterval(poll); clearTimeout(fallback); clearInterval(clock); };
  }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${() => { setErr(null); loadAll().catch((x) => setErr(friendlyError(x))); }} /></div>`;
  if (!students) return html`<${Loading} text="오늘 기록을 불러오는 중…" />`;

  const shown = students.filter((s) => showTest || !s.is_test);
  const ids = new Set(shown.map((s) => s.id));
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const rows = feed.filter((r) => ids.has(r.user_id));
  const now = Date.now();

  const status = (s) => {
    const mine = rows.filter((r) => r.user_id === s.id);
    const last = mine[0];
    const atts = mine.filter((r) => r._t === 'a' && r.is_correct !== null && r.q?.type !== 'essay');
    const right = atts.filter((r) => r.is_correct).length;
    const mins = last ? (now - new Date(last.created_at).getTime()) / 60000 : Infinity;
    const lessonId = last?.lesson_id || last?.q?.lesson_id || (last?.kind === 'view' ? last.ref : null);
    return {
      last, mins, right, n: atts.length,
      essays: mine.filter((r) => r._t === 'a' && r.q?.type === 'essay').length,
      xp: mine.reduce((sum, r) => sum + (r.xp || 0), 0),
      recent: atts.slice(0, 8).reverse(),
      where: last ? (last._t === 'a' ? `${MODE[last.mode] || '퀴즈'} · ${lessons[lessonId]?.title || ''}` : `${EVENT_TEXT[last.kind]}${lessons[lessonId] ? ' · ' + lessons[lessonId].title : ''}`) : '오늘 아직 안 들어왔어요',
    };
  };
  const ranked = shown.map((s) => ({ s, st: status(s) })).sort((a, b) => a.st.mins - b.st.mins);
  const activeNow = ranked.filter((x) => x.st.mins < 5).length;

  return html`<div class="page live">
    <div class="page-head">
      <h1>📡 실시간 현황 <small class="muted">${todayKst()}</small></h1>
      <div class="btn-row">
        <span class=${'live-badge ' + live}>${live === 'on' ? '● 실시간 연결됨' : live === 'poll' ? '⟳ 20초마다 새로 고침' : '… 연결 중'}</span>
        <label class="check small"><input type="checkbox" checked=${showTest} onChange=${(e) => setShowTest(e.target.checked)} /> 🧪 테스트 계정도 보기</label>
      </div>
    </div>
    <${WatchPanel} students=${students} showTest=${showTest} />
    <div class="btn-row"><a class="btn small" href="#/t/stats">📊 수업별 문항 통계 보기</a></div>
    <p class="muted small">지금 공부 중 <b>${activeNow}</b>명 · 오늘 푼 문제 <b>${rows.filter((r) => r._t === 'a').length}</b>개 · 학생이 문제를 풀면 아래에 바로 나타나요.</p>

    <div class="live-grid">${ranked.map(({ s, st }) => html`<a class=${'card live-card' + (st.mins < 5 ? ' now' : st.mins < 30 ? ' recent' : '')} href=${'#/t/report/' + s.id}>
      <div class="lc-head"><span class="lc-dot"></span><${AvatarImg} cfg=${s.avatar_cfg} size=${46} />
        <div><b>${s.display_name || s.login_id}</b> <span class=${'tier-badge sm t-' + tierOf(s)}>${tierOf(s)}</span>${s.is_test ? ' 🧪' : ''}
          <div class="muted small">${st.last ? timeAgo(st.last.created_at) : '-'}</div></div></div>
      <div class="lc-where">${st.where}</div>
      <div class="lc-stats"><span>📝 ${st.n}문제</span><span class=${'acc-badge ' + (st.n ? (st.right / st.n >= 0.8 ? 'hi' : st.right / st.n >= 0.5 ? 'mid' : 'lo') : 'none')}>${st.n ? Math.round((st.right / st.n) * 100) + '%' : '-'}</span>${st.essays > 0 && html`<span>✍️ ${st.essays}</span>`}<span>⭐ ${st.xp}</span></div>
      <div class="lc-recent">${st.recent.map((r) => html`<span class=${'rd ' + (r.is_correct ? 'ok' : 'no')} title=${r.q?.prompt || ''}></span>`)}</div>
    </a>`)}</div>

    <h2>🕒 오늘의 활동</h2>
    <div class="card feed">${rows.length === 0 ? html`<p class="muted center">오늘은 아직 활동이 없어요.</p>` : rows.slice(0, 150).map((r) => {
      const s = byId[r.user_id];
      const isNew = fresh.current.has(`${r._t}${r.id}`);
      if (r._t === 'e') {
        return html`<div class=${'feed-row ev' + (isNew ? ' new' : '')} key=${'e' + r.id}>
          <span class="fr-time">${new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
          <${AvatarImg} cfg=${s?.avatar_cfg} size=${30} /><b>${s?.display_name || s?.login_id}</b>
          <span>${EVENT_TEXT[r.kind]}${r.kind === 'view' && lessons[r.ref] ? ` · ${lessons[r.ref].title}` : ''}${r.kind.startsWith('teacher') && r.ref ? ` · ${r.ref}` : ''}</span>
          ${(r.xp > 0 || r.coins) && html`<span class="muted small">${r.xp > 0 ? `+${r.xp}XP ` : ''}${r.coins ? `${r.coins > 0 ? '+' : ''}${r.coins}🪙` : ''}</span>`}
        </div>`;
      }
      const q = r.q;
      const essay = q?.type === 'essay';
      return html`<div class=${'feed-row' + (isNew ? ' new' : '') + (essay ? ' essay' : r.is_correct ? ' ok' : ' no')} key=${'a' + r.id}>
        <span class="fr-time">${new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
        <${AvatarImg} cfg=${s?.avatar_cfg} size=${30} /><b>${s?.display_name || s?.login_id}</b>
        <span class="fr-mark">${essay ? '✍️' : r.is_correct ? '✅' : '❌'}</span>
        <span class="fr-q">${q ? html`<span class="muted small">${TYPES[q.type]?.icon} ${DIFFICULTY[q.difficulty] || ''}${q.tier ? ' · ' + q.tier : ''} ·</span> <${RichText} text=${q.prompt.length > 60 ? q.prompt.slice(0, 60) + '…' : q.prompt} />` : '(문제)'}
          ${(essay || r.is_correct === false) && html`<div class="fr-ans">→ <${RichText} text=${answerToText(q, r.answer).slice(0, 120)} /></div>`}</span>
        <span class="muted small">${MODE[r.mode] || ''}${r.xp > 0 ? ` · +${r.xp}XP` : ''}</span>
      </div>`;
    })}</div>
  </div>`;
}
