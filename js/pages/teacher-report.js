// 📄 학생별 학습 리포트 (화면으로 보기 + .md 내려받기)
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { TYPES, DIFFICULTY, TIER_INFO, tierOf, answerText } from '../lib/questions.js';
import { loadStudentData, computeReport, reportMarkdown, downloadText, todayKst, EFFORT_LABEL } from '../lib/report.js';
import { Loading, ErrorBox, toast, go } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { RichText } from '../components/math.js';

// 기간 고르기
function semesterRange() {
  const t = todayKst();
  const y = Number(t.slice(0, 4));
  const m = Number(t.slice(5, 7));
  if (m >= 3 && m <= 8) return [`${y}-03-01`, t];
  return m >= 9 ? [`${y}-09-01`, t] : [`${y - 1}-09-01`, t];
}
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
const PERIODS = {
  d30: ['최근 30일', () => [daysAgo(29), todayKst()]],
  month: ['이번 달', () => [todayKst().slice(0, 8) + '01', todayKst()]],
  semester: ['이번 학기', semesterRange],
  year: ['올해', () => [todayKst().slice(0, 4) + '-01-01', todayKst()]],
};

function usePeriod() {
  const [key, setKey] = useState('semester');
  const [custom, setCustom] = useState(PERIODS.semester[1]());
  const range = key === 'custom' ? custom : PERIODS[key][1]();
  const ui = html`<div class="period-pick">
    ${Object.entries(PERIODS).map(([k, [label]]) => html`<button type="button" class=${'chip' + (key === k ? ' on' : '')} onClick=${() => setKey(k)}>${label}</button>`)}
    <button type="button" class=${'chip' + (key === 'custom' ? ' on' : '')} onClick=${() => { setCustom(range); setKey('custom'); }}>📅 직접</button>
    ${key === 'custom' && html`<span class="range-in"><input class="input" type="date" value=${custom[0]} onInput=${(e) => setCustom([e.target.value, custom[1]])} /> ~
      <input class="input" type="date" value=${custom[1]} onInput=${(e) => setCustom([custom[0], e.target.value])} /></span>`}
  </div>`;
  return [range, ui];
}

const accClass = (p) => (p == null ? 'none' : p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'lo');
function Bars({ rows, label }) {
  if (!rows.length || rows.every((r) => !r.n)) return html`<p class="muted small">기록 없음</p>`;
  return html`<div class="bars">${rows.filter((r) => r.n).map((r) => html`<div class="bar-row">
    <span class="bar-label">${label(r)}</span>
    <span class="bar-track"><span class=${'bar-fill ' + accClass(r.pct)} style=${`width:${r.pct ?? 0}%`}></span></span>
    <span class="bar-val"><b>${r.pct ?? '-'}%</b> <small class="muted">${r.right}/${r.n}</small></span>
  </div>`)}</div>`;
}

function fileName(r) {
  const s = r.student;
  return `학습리포트_${s.display_name || s.login_id}_${r.from}_${r.to}.md`.replace(/[\\/:*?"<>|\s]+/g, '_');
}

function StudentReport({ studentId }) {
  const [range, periodUi] = usePeriod();
  const [r, setR] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setR(null);
    loadStudentData(studentId, range[0], range[1]).then((d) => setR(computeReport(d))).catch((e) => setErr(friendlyError(e)));
  }, [studentId, range[0], range[1]]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  const md = r ? reportMarkdown(r) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(md); toast('리포트를 복사했어요 ✔'); } catch { toast('⚠️ 복사가 안 돼요. 내려받기를 써 주세요'); } };

  return html`<div class="page report">
    <a class="back" href="#/t/report">← 학생 고르기</a>
    ${!r ? html`<div class="card">${periodUi}</div><${Loading} text="기록을 모으는 중…" />` : html`
    <div class="card report-head">
      <${AvatarImg} cfg=${r.student.avatar_cfg} size=${64} />
      <div class="rh-body">
        <h1>${r.student.display_name || r.student.login_id} <small class="muted">${r.student.login_id} · ${r.student.grade ? r.student.grade + '학년' : ''}</small></h1>
        <span class=${'tier-badge t-' + r.tier}>${r.tier}</span> <small class="muted">${TIER_INFO[r.tier].name} · ${TIER_INFO[r.tier].level}</small>
      </div>
      <div class="rh-actions">
        <button class="btn primary" onClick=${() => downloadText(fileName(r), md)}>📄 .md 내려받기</button>
        <button class="btn" onClick=${copy}>📋 복사</button>
      </div>
    </div>
    <div class="card">${periodUi}</div>

    <div class="stat-tiles">
      <div class="tile"><small>학습한 날</small><b>${r.days}<small>일</small></b></div>
      <div class="tile"><small>푼 문제</small><b>${r.total}<small>문항</small></b></div>
      <div class="tile"><small>정답률</small><b class=${'acc-text ' + accClass(r.acc)}>${r.acc ?? '-'}<small>%</small></b></div>
      <div class="tile"><small>처음 풀 때 정답률</small><b>${r.firstAcc ?? '-'}<small>%</small></b></div>
      <div class="tile"><small>오답 극복</small><b>${r.comeback}<small>문항</small></b></div>
      <div class="tile"><small>🌟 보너스 도전</small><b>${r.bonus ? r.bonus.right + '/' + r.bonus.n : '-'}<small>${r.bonus ? ' ' + r.bonus.target : ''}</small></b></div>
      <div class="tile"><small>서술형 성실도</small><b>${r.essayEffortAvg ?? '-'}<small>/3</small></b></div>
    </div>

    <div class="two-col">
      <div class="card"><h2>📚 과목·주제별</h2><${Bars} rows=${r.byTopic} label=${(t) => html`${t.subject} <small class="muted">${t.topic}</small>`} /></div>
      <div class="card"><h2>🧗 난이도별</h2><${Bars} rows=${r.byDifficulty} label=${(d) => DIFFICULTY[d.key]} />
        <h2 class="mt">🧩 문제 유형별</h2><${Bars} rows=${r.byType} label=${(t) => `${TYPES[t.key]?.icon || ''} ${TYPES[t.key]?.label || t.key}`} /></div>
    </div>
    <div class="card"><h2>📈 주별 정답률</h2><${Bars} rows=${r.byWeek} label=${(w) => w.key.slice(5).replace('-', '/') + ' 주'} />
      ${r.trend && html`<p class="muted small">앞쪽 절반 ${r.trend.first}% → 뒤쪽 절반 ${r.trend.second}%</p>`}</div>

    <div class="card"><h2>🤔 자주 틀린 문제</h2>
      ${!r.missed.length ? html`<p class="muted">틀린 문제가 없어요 🎉</p>` : html`<table class="table">
        <tr><th>문제</th><th>틀림/풀이</th><th>학생 답</th><th>정답</th><th></th></tr>
        ${r.missed.map((m) => html`<tr><td><${RichText} text=${m.q?.prompt || ''} /><div class="muted small">${m.lesson}</div></td><td>${m.wrong}/${m.tries}</td>
          <td><${RichText} text=${m.lastAnswer} /></td><td><${RichText} text=${m.q ? answerText(m.q) : ''} /></td><td>${m.solved ? '✅' : '❌'}</td></tr>`)}
      </table>`}</div>

    <div class="card"><h2>📝 서술형 답안 <small class="muted">${r.essays.length}개</small></h2>
      ${!r.essays.length ? html`<p class="muted">서술형 답안이 없어요.</p>` : r.essays.map((e) => html`<div class="essay-row">
        <div class="muted small">${e.date} · ${e.lesson || ''}</div>
        <div><b>Q.</b> <${RichText} text=${e.prompt || ''} /></div>
        <div class="essay-ans">“${e.answer}” <small class="muted">${e.answer.replace(/\s/g, '').length}자</small></div>
        <div class="small">${e.graded ? html`<span class="pill">${['💪 다시', '👍 부분', '🌟 정답'][e.score ?? 0]}</span>` : html`<span class="pill warn">채점 전</span>`}
          ${e.effort && html`<span class="pill">성실도 ${EFFORT_LABEL[e.effort]}</span>`} ${e.feedback && html`<span class="muted">“${e.feedback}”</span>`}</div>
      </div>`)}</div>

    <details class="card"><summary><b>📄 리포트 글 미리보기 (.md)</b></summary><pre class="md-preview">${md}</pre></details>`}
  </div>`;
}

function Picker() {
  const [list, setList] = useState(null);
  const [range, periodUi] = usePeriod();
  const [busy, setBusy] = useState('');
  useEffect(() => {
    sb.from('profiles').select('*').eq('role', 'student').order('login_id').then(({ data }) => setList(data || []));
  }, []);
  if (!list) return html`<${Loading} />`;
  const real = list.filter((s) => !s.is_test);

  const all = async () => {
    const parts = [];
    for (let i = 0; i < real.length; i++) {
      setBusy(`${i + 1} / ${real.length} 만드는 중…`);
      try { parts.push(reportMarkdown(computeReport(await loadStudentData(real[i].id, range[0], range[1])))); }
      catch (e) { toast('⚠️ ' + friendlyError(e)); }
    }
    setBusy('');
    downloadText(`학습리포트_전체_${range[0]}_${range[1]}.md`, parts.join('\n\n---\n\n'));
  };

  const card = (s) => html`<a class="card student-pick" href=${'#/t/report/' + s.id}>
    <${AvatarImg} cfg=${s.avatar_cfg} size=${52} /><div><b>${s.display_name || '(이름 없음)'}</b><div class="muted small">${s.login_id} · ${tierOf(s)} 그룹${s.is_test ? ' · 🧪 테스트' : ''}</div></div><span class="spacer"></span>📄</a>`;

  return html`<div class="page report">
    <h1>📄 학습 리포트</h1>
    <p class="muted">학생을 누르면 기간별 정답률·난이도·유형·서술형 성실도를 볼 수 있어요. <b>.md 파일</b>로 내려받아 개별화교육계획·평가에 쓰세요.</p>
    <div class="card">${periodUi}
      <div class="btn-row"><button class="btn primary" disabled=${!!busy || !real.length} onClick=${all}>${busy || `📦 학생 ${real.length}명 리포트 한 파일로 내려받기`}</button>
        <span class="muted small">기간: ${range[0]} ~ ${range[1]} · 테스트 계정은 빠져요</span></div></div>
    <div class="grid">${real.map(card)}</div>
    ${list.length > real.length && html`<h2>🧪 테스트 계정</h2><div class="grid">${list.filter((s) => s.is_test).map(card)}</div>`}
  </div>`;
}

export function ReportPage({ studentId }) {
  return studentId ? html`<${StudentReport} key=${studentId} studentId=${studentId} />` : html`<${Picker} />`;
}
