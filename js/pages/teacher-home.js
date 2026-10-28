import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { answerText, TYPES } from '../lib/questions.js';
import { Loading, ErrorBox, XPBar, fmtDate, timeAgo } from '../components/ui.js';
import { RichText } from '../components/math.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { GiveCoins } from '../components/give-coins.js';
import { PraiseButton } from '../components/praise.js';
import { fracToken } from '../lib/fraction.js';

const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');

export function TeacherHome() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [p, a, e, l, pend, games] = await Promise.all([
        sb.from('profiles').select('*').eq('role', 'student').order('login_id'),
        sb.from('attempts').select('user_id,lesson_id,question_id,is_correct,created_at').gte('created_at', since),
        sb.from('events').select('user_id,kind,ref,created_at').gte('created_at', since).order('created_at', { ascending: false }),
        sb.from('lessons').select('id,title,subject,published,lesson_date').order('lesson_date', { ascending: false }).limit(8),
        sb.from('attempts').select('id', { count: 'exact', head: true }).is('graded_at', null).is('is_correct', null),
        sb.from('game_state').select('user_id,world,tile,deaths'),
      ]);
      for (const r of [p, a, e, l, pend]) if (r.error) throw r.error;
      setD({ students: p.data, attempts: a.data, events: e.data, lessons: l.data, pending: pend.count || 0, games: games.error ? [] : games.data });
    })().catch((x) => setErr(friendlyError(x)));
  }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!d) return html`<${Loading} />`;

  const weekAgo = Date.now() - 7 * 86400000;
  const stat = (uid) => {
    const at = d.attempts.filter((a) => a.user_id === uid);
    const graded = at.filter((a) => a.is_correct !== null);
    const week = at.filter((a) => new Date(a.created_at).getTime() > weekAgo);
    const last = d.events.find((e) => e.user_id === uid);
    return { week: week.length, acc: pct(graded.filter((a) => a.is_correct).length, graded.length), last: last?.created_at };
  };

  return html`<div class="page">
    <div class="action-row">
      <a class="card action" href="#/t/lesson/new"><span>➕</span>새 수업 자료 만들기</a>
      <a class="card action" href="#/t/grading"><span>📝</span>서술형 채점 ${d.pending > 0 && html`<b class="count">${d.pending}</b>`}</a>
      <a class="card action" href="#/t/lessons"><span>📺</span>수업 모드 (TV)</a>
      <${PraiseButton} className="card action praise-action" label=${html`<span>🎁</span>칭찬하기 (경험치·코인)`} />
    </div>

    <h2>👥 학생 현황 <small class="muted">(최근 30일)</small></h2>
    ${d.students.length === 0 && html`<div class="card empty">학생 계정이 없어요. <a href="#/t/students">학생 계정 만들기 →</a></div>`}
    <div class="grid">${d.students.map((s) => {
      const st = stat(s.id);
      return html`<a class="card student-card" href=${'#/t/student/' + s.id}>
        <div class="sc-head"><${AvatarImg} cfg=${s.avatar_cfg} size=${52} />
          <div><b>${s.display_name || '(이름 없음)'}</b><div class="muted small">${s.login_id}${s.grade ? ` · ${s.grade}학년` : ''}</div></div></div>
        <${XPBar} xp=${s.xp} compact />
        <div class="sc-stats">
          <span>🔥 ${s.streak}일</span><span>🪙 ${s.coins ?? 0}</span>${(() => { const g = d.games.find((x) => x.user_id === s.id); return g ? html`<span>🎲 월드 ${g.world}</span>` : ''; })()}<span>이번 주 ${st.week}문제</span><span>정답률 ${st.acc}</span>
        </div>
        <div class="muted small">마지막 활동: ${timeAgo(st.last)}</div>
      </a>`;
    })}</div>

    <h2>📚 최근 수업 <small class="muted">— 반 전체 정답률</small></h2>
    <div class="card">
      <table class="table">
        <tr><th>날짜</th><th>수업</th><th>공개</th><th>복습 본 학생</th><th>정답률</th><th></th></tr>
        ${d.lessons.map((l) => {
          const at = d.attempts.filter((a) => a.lesson_id === l.id && a.is_correct !== null);
          const viewers = new Set(d.events.filter((e) => e.kind === 'view' && e.ref === l.id).map((e) => e.user_id));
          return html`<tr>
            <td>${fmtDate(l.lesson_date)}</td><td><b>${l.title}</b> <span class="muted small">${l.subject}</span></td>
            <td>${l.published ? '✅' : '🙈'}</td><td>${viewers.size} / ${d.students.length}</td>
            <td>${pct(at.filter((a) => a.is_correct).length, at.length)}</td>
            <td class="right"><a class="btn small" href=${'#/t/lesson/' + l.id}>편집</a> <a class="btn small" href=${'#/class/' + l.id}>📺</a></td>
          </tr>`;
        })}
      </table>
    </div>
  </div>`;
}

export function StudentDetail({ studentId }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      const [p, a, l, e] = await Promise.all([
        sb.from('profiles').select('*').eq('id', studentId).single(),
        sb.from('attempts').select('*, questions(prompt,type,data)').eq('user_id', studentId).order('created_at', { ascending: false }),
        sb.from('lessons').select('id,title,subject,lesson_date').order('lesson_date', { ascending: false }),
        sb.from('events').select('kind,ref,created_at').eq('user_id', studentId).eq('kind', 'view'),
      ]);
      for (const r of [p, a, l, e]) if (r.error) throw r.error;
      setD({ s: p.data, attempts: a.data, lessons: l.data, views: e.data });
    })().catch((x) => setErr(friendlyError(x)));
  }, [studentId, reload]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!d) return html`<${Loading} />`;
  const { s, attempts, lessons, views } = d;

  // 문제별 마지막 결과
  const last = {};
  attempts.forEach((a) => { if (!(a.question_id in last)) last[a.question_id] = a; });
  const wrongNow = Object.values(last).filter((a) => a.is_correct === false);

  return html`<div class="page">
    <a class="back" href="#/">← 현황</a>
    <section class="card me-card">
      <${AvatarImg} cfg=${s.avatar_cfg} mode="full" size=${120} />
      <div class="hero-body">
        <h1>${s.display_name || '(이름 없음)'} <small class="muted">${s.login_id}${s.grade ? ` · ${s.grade}학년` : ''}</small></h1>
        <${XPBar} xp=${s.xp} />
        <div class="hero-stats"><span class="pill coin">🪙 ${s.coins ?? 0}</span><span class="pill">🔥 ${s.streak}일 연속</span><span class="pill">푼 문제 ${attempts.length}</span><span class="pill warn">지금 틀린 문제 ${wrongNow.length}</span></div>
      </div>
    </section>

    <div class="card"><${GiveCoins} student=${s} onDone=${() => setReload(reload + 1)} /></div>

    <h2>📚 수업별 기록</h2>
    <div class="card"><table class="table">
      <tr><th>수업</th><th>복습 본 횟수</th><th>푼 횟수</th><th>정답률</th><th>지금 틀린 문제</th></tr>
      ${lessons.map((l) => {
        const at = attempts.filter((a) => a.lesson_id === l.id);
        const g = at.filter((a) => a.is_correct !== null);
        const v = views.filter((x) => x.ref === l.id).length;
        const w = wrongNow.filter((a) => a.lesson_id === l.id).length;
        if (!at.length && !v) return html`<tr class="muted"><td>${l.title}</td><td colspan="4">아직 안 봤어요</td></tr>`;
        return html`<tr><td><b>${l.title}</b></td><td>${v}</td><td>${at.length}</td><td>${pct(g.filter((a) => a.is_correct).length, g.length)}</td><td>${w || '-'}</td></tr>`;
      })}
    </table></div>

    <h2>🤔 지금 틀린 문제</h2>
    ${wrongNow.length === 0 && html`<div class="card empty">없어요! 👍</div>`}
    <div class="list">${wrongNow.map((a) => html`<div class="card">
      <div class="muted small">${TYPES[a.questions?.type]?.label} · ${fmtDate(a.created_at)}</div>
      <b><${RichText} text=${a.questions?.prompt} /></b>
      <div class="two-col small">
        <div>학생 답: <span class="bad-text"><${RichText} text=${fmtAnswer(a.answer, a.questions)} /></span></div>
        <div>정답: <span class="good-text"><${RichText} text=${a.questions ? answerText(a.questions) : ''} /></span></div>
      </div>
    </div>`)}</div>
  </div>`;
}

export function fmtAnswer(ans, q) {
  if (ans == null) return '';
  if (q?.type === 'ox') return ans ? 'O' : 'X';
  if (q?.type === 'frac') return fracToken(ans);
  if (q?.type === 'mcq') return `${ans}번 ${q.data?.choices?.[ans - 1] ?? ''}`;
  if (Array.isArray(ans)) {
    if (q?.type === 'match') return q.data.pairs.map((p, i) => `${p[0]}→${ans[i]}`).join(', ');
    return ans.join(' → ');
  }
  return String(ans);
}
