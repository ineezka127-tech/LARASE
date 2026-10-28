import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { answerText, TYPES } from '../lib/questions.js';
import { Loading, ErrorBox, XPBar, fmtDate, timeAgo } from '../components/ui.js';
import { RichText } from '../components/math.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { GiveCoins } from '../components/give-coins.js';
import { PraiseButton } from '../components/praise.js';
import { fracToken } from '../lib/fraction.js';

const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');
const accClass = (t) => { const n = parseInt(t, 10); return isNaN(n) ? 'none' : n >= 80 ? 'hi' : n >= 50 ? 'mid' : 'lo'; };

// 💾 저장 공간 (무료 한도 대비)
const mb = (b) => (b >= 1024 * 1024 * 100 ? Math.round(b / 1024 / 1024) : Math.round((b / 1024 / 1024) * 10) / 10);
function StorageCard() {
  const [u, setU] = useState(null);
  useEffect(() => { rpc('storage_usage').then(setU).catch(() => setU(false)); }, []);
  if (!u) return null;
  const row = (label, used, limit, extra) => {
    const p = Math.min(100, (used / limit) * 100);
    return html`<div class="su-row"><span class="su-label">${label}</span>
      <span class="bar-track"><span class=${'bar-fill ' + (p > 80 ? 'lo' : p > 60 ? 'mid' : 'hi')} style=${`width:${Math.max(p, 1)}%`}></span></span>
      <span class="su-val"><b>${mb(used)}MB</b> / ${mb(limit) >= 1024 ? '1GB' : mb(limit) + 'MB'} <small class="muted">(${p < 1 ? '1% 미만' : Math.round(p) + '%'})${extra || ''}</small></span></div>`;
  };
  return html`<div class="card storage-card">
    <b>💾 저장 공간</b> <small class="muted">Supabase 무료 한도</small>
    ${row('데이터 (문제·기록)', u.db_bytes, u.db_limit)}
    ${row('파일 (판서·자료)', u.file_bytes, u.file_limit, ` · 판서 ${u.file_count}장`)}
  </div>`;
}

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
      // 🧪 테스트 계정은 현황·정답률에서 빼요
      const tests = p.data.filter((x) => x.is_test);
      const testIds = new Set(tests.map((x) => x.id));
      setD({ students: p.data.filter((x) => !x.is_test), tests, attempts: a.data.filter((x) => !testIds.has(x.user_id)), events: e.data.filter((x) => !testIds.has(x.user_id)), lessons: l.data, pending: pend.count || 0, games: games.error ? [] : games.data });
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

  const card = (s) => {
    const st = stat(s.id);
    return html`<a class="card student-card" href=${'#/t/student/' + s.id}>
        <div class="sc-head"><${AvatarImg} cfg=${s.avatar_cfg} size=${52} />
          <div><b>${s.display_name || '(이름 없음)'}</b><div class="muted small">${s.login_id}${s.grade ? ` · ${s.grade}학년` : ''}</div></div></div>
        <${XPBar} xp=${s.xp} compact />
        <div class="sc-stats">
          <span>🔥 ${s.streak}일</span><span>🪙 ${s.coins ?? 0}</span>${(() => { const g = d.games.find((x) => x.user_id === s.id); return g ? html`<span>🎲 월드 ${g.world}</span>` : ''; })()}<span>📝 이번 주 ${st.week}문제</span>
        </div>
        <div class="sc-foot"><span class="muted small">마지막 활동: ${timeAgo(st.last)}</span><span class=${'acc-badge ' + accClass(st.acc)}>정답률 ${st.acc}</span></div>
    </a>`;
  };

  return html`<div class="page">
    <div class="action-row">
      <a class="card action" href="#/t/lesson/new"><span>➕</span><div>새 수업 자료<small>판서·PDF로 문제 만들기</small></div></a>
      <a class="card action" href="#/t/grading"><span>📝</span><div>서술형 채점 ${d.pending > 0 && html`<b class="count">${d.pending}</b>`}<small>${d.pending > 0 ? `${d.pending}개 기다려요` : '기다리는 답 없음'}</small></div></a>
      <a class="card action" href="#/t/lessons"><span>📺</span><div>수업 모드<small>TV로 함께 풀기</small></div></a>
      <${PraiseButton} className="card action praise-action" label=${html`<span>🎁</span><div>칭찬·약속<small>경험치·코인·주사위</small></div>`} />
    </div>

    <div class="home-tools">
      <a class="card live-link" href="#/t/live"><span class="live-dot"></span><b>📡 실시간 현황</b><small class="muted">지금 누가 무엇을 풀고 있는지</small></a>
      <a class="card live-link" href="#/t/report"><b>📄 학습 리포트</b><small class="muted">개별화교육용 .md 내려받기</small></a>
      <${StorageCard} />
    </div>

    <h2>👥 학생 현황 <small class="muted">(최근 30일)</small></h2>
    ${d.students.length === 0 && html`<div class="card empty">학생 계정이 없어요. <a href="#/t/students">학생 계정 만들기 →</a></div>`}
    <div class="grid">${d.students.map((s) => card(s))}</div>
    ${d.tests.length > 0 && html`<details class="card test-accounts"><summary><b>🧪 테스트 계정 ${d.tests.length}개</b> <small class="muted">— 현황·정답률·친구 목록에서 빠져요 (학생 관리에서 바꿀 수 있어요)</small></summary>
      <div class="grid">${d.tests.map((s) => card(s))}</div></details>`}

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
            <td>${(() => { const v = pct(at.filter((a) => a.is_correct).length, at.length); return html`<span class=${'acc-badge ' + accClass(v)}>${v}</span>`; })()}</td>
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
    <div class="page-head"><a class="back" href="#/">← 현황</a><a class="btn small primary" href=${'#/t/report/' + studentId}>📄 학습 리포트·.md</a></div>
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
