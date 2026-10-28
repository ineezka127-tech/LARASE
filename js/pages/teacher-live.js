// 📡 실시간 현황: 학생들이 지금 무엇을 하고 있는지 바로바로 보여요
// Supabase 실시간 연결을 쓰고, 연결이 안 되면 20초마다 새로 불러와요
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { TYPES, DIFFICULTY, tierOf } from '../lib/questions.js';
import { answerToText, todayKst } from '../lib/report.js';
import { Loading, ErrorBox, timeAgo } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { RichText } from '../components/math.js';

const EVENT_TEXT = {
  view: '📖 복습 자료를 봤어요', quiz_done: '🏁 퀴즈를 끝까지 풀었어요', daily: '🔥 오늘 첫 접속', levelup: '⭐ 레벨 업!',
  buy: '🛍️ 상점에서 샀어요', essay_graded: '🌟 서술형 채점 받음', teacher_coins: '🎁 칭찬/약속', teacher_praise: '🎁 칭찬 받음', teacher_dice: '🎲 주사위 선물',
};
const MODE = { quiz: '퀴즈', set: '묶음 퀴즈', retry: '다시 풀기', game: '모험', bonus: '🌟 보너스 도전' };

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
