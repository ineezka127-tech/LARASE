import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, createAccount, friendlyError, normalizeLoginId } from '../lib/sb.js';
import { Loading, ErrorBox, toast } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { TIERS, TIER_INFO } from '../lib/questions.js';

export function StudentsPage() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([
    { id: '특수1', grade: 1 }, { id: '특수2', grade: 1 }, { id: '특수3', grade: 2 }, { id: '특수4', grade: 2 }, { id: '특수5', grade: 3 },
  ]);
  const [pw, setPw] = useState('1234');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const load = async () => {
    const { data, error } = await sb.from('profiles').select('*').eq('role', 'student').order('login_id');
    if (error) setErr(friendlyError(error)); else setList(data);
  };
  useEffect(() => { load(); }, []);

  const existing = new Set((list || []).map((s) => s.login_id));
  const todo = rows.filter((r) => r.id.trim() && !existing.has(normalizeLoginId(r.id)));

  const create = async () => {
    if (!/^\S{4,}$/.test(pw)) { toast('비밀번호는 4자 이상, 띄어쓰기 없이 해 주세요'); return; }
    setBusy(true);
    const out = [];
    // 🔒 새 계정 만들기는 평소에 잠겨 있어요. 만드는 동안만 10분 열어요
    try { await rpc('open_signup', { p_minutes: 10 }); } catch {}
    for (const r of todo) {
      try {
        await createAccount({ loginId: r.id, password: pw, role: 'student', grade: r.grade });
        out.push(`✅ ${r.id} 만들었어요`);
      } catch (e) { out.push(`⚠️ ${r.id}: ${friendlyError(e)}`); }
      setLog([...out]);
    }
    try { await rpc('open_signup', { p_minutes: 0 }); } catch {}
    setBusy(false);
    load();
  };

  const setGrade = async (s, grade) => {
    const { error } = await sb.from('profiles').update({ grade: grade || null }).eq('id', s.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else { toast('저장했어요 ✔'); load(); }
  };
  const setTier = async (s, tier) => {
    const { error } = await sb.from('profiles').update({ tier: tier || null }).eq('id', s.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else { toast('그룹을 저장했어요 ✔'); load(); }
  };
  const setTest = async (s, on) => {
    const { error } = await sb.from('profiles').update({ is_test: on }).eq('id', s.id);
    if (error) toast('⚠️ ' + (/is_test/.test(error.message) ? 'Supabase에서 update-07-game-friends.sql을 먼저 실행해 주세요' : friendlyError(error)));
    else { toast(on ? '🧪 테스트 계정으로 표시했어요 (통계에서 빠져요)' : '학생 계정으로 되돌렸어요 ✔'); load(); }
  };
  const reset = async (s) => {
    const who = s ? `${s.display_name || s.login_id}` : '학생 전체';
    if (!confirm(`${who}의 경험치·레벨·스탯을 처음(레벨 1)으로 되돌릴까요?\n풀이 기록과 산 아이템은 그대로 남아요.`)) return;
    const keep = confirm('코인도 그대로 둘까요?\n[확인] 코인 유지  /  [취소] 코인을 50으로 되돌리기');
    try {
      const r = await rpc('reset_progress', { p_user: s ? s.id : null, p_keep_coins: keep });
      toast(`🔄 ${r.reset}명을 초기화했어요`);
      load();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
  };
  const clearName = async (s) => {
    if (!confirm(`${s.login_id}의 이름을 지울까요? 다음 로그인 때 이름을 새로 정하게 돼요.`)) return;
    const { error } = await sb.from('profiles').update({ display_name: null }).eq('id', s.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else load();
  };

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!list) return html`<${Loading} />`;

  return html`<div class="page">
    <h1>👥 학생 관리</h1>
    <div class="card">
      <table class="table">
        <tr><th></th><th>아이디</th><th>화면 이름</th><th>학년</th><th title="가=상, 나=중, 다=하. 문제를 이 그룹에 맞춰 골라 줘요">그룹</th><th>레벨</th><th>XP</th><th>코인</th><th title="테스트 계정은 현황·정답률·친구 목록에서 빠져요">🧪 테스트</th><th></th></tr>
        ${list.map((s) => html`<tr>
          <td><${AvatarImg} cfg=${s.avatar_cfg} size=${44} /></td><td><b>${s.login_id}</b></td><td>${s.display_name || html`<span class="muted">(아직 안 정함)</span>`}</td>
          <td><select class="input" value=${s.grade || ''} onChange=${(e) => setGrade(s, Number(e.target.value))}>
            <option value="">-</option>${[1, 2, 3].map((g) => html`<option value=${g}>${g}학년</option>`)}</select></td>
          <td><div class="tier-pick">${TIERS.map((t) => html`<button type="button" class=${'tier-btn t-' + t + ((s.tier || '나') === t ? ' on' : '')} title=${TIER_INFO[t].name} onClick=${() => setTier(s, t)}>${t}</button>`)}</div></td>
          <td>Lv.${s.level}</td><td>${s.xp}</td><td>🪙 ${s.coins ?? 0}</td>
          <td><label class="check"><input type="checkbox" checked=${!!s.is_test} onChange=${(e) => setTest(s, e.target.checked)} /> ${s.is_test ? '테스트' : ''}</label></td>
          <td class="right"><a class="btn small" href=${'#/t/student/' + s.id}>기록·🎁코인</a> <button class="btn small ghost" onClick=${() => clearName(s)}>이름 초기화</button> <button class="btn small ghost" onClick=${() => reset(s)}>🔄 진도 초기화</button></td>
        </tr>`)}
      </table>
      <p class="muted small">🎯 <b>그룹</b>: 가(상)·나(중)·다(하). 퀴즈와 모험 지도에서 학생 그룹에 맞는 문제가 먼저 나와요. 정하지 않으면 '나'로 봐요.</p>
      <p class="muted small">🧪 <b>테스트</b>에 체크한 계정은 선생님 현황판의 정답률·반 통계와 아이들의 친구 목록에서 빠져요. (선생님이 연습용으로 쓰는 계정에 체크하세요)</p>
      ${list.length === 0 && html`<p class="muted">아직 학생 계정이 없어요. 아래에서 만들어 주세요.</p>`}
      ${list.length > 0 && html`<div class="btn-row"><button class="btn small warn" onClick=${() => reset(null)}>🔄 학생 전체 진도 초기화</button>
        <span class="muted small">실제 수업을 시작하기 전에 테스트로 쌓인 경험치·레벨을 지울 때 쓰세요. 풀이 기록은 남아요.</span></div>`}
    </div>

    <div class="card">
      <h2>➕ 학생 계정 만들기</h2>
      <p class="muted small">학생은 처음 로그인할 때 화면에 보일 이름을 직접 정해요. 실제 이름은 저장하지 않아도 돼요.</p>
      <table class="table">
        <tr><th>아이디</th><th>학년</th><th></th></tr>
        ${rows.map((r, i) => {
          const has = existing.has(normalizeLoginId(r.id));
          return html`<tr class=${has ? 'muted' : ''}>
            <td><input class="input" value=${r.id} onInput=${(e) => setRows(rows.map((x, k) => (k === i ? { ...x, id: e.target.value } : x)))} /></td>
            <td><select class="input" value=${r.grade} onChange=${(e) => setRows(rows.map((x, k) => (k === i ? { ...x, grade: Number(e.target.value) } : x)))}>
              ${[1, 2, 3].map((g) => html`<option value=${g}>${g}학년</option>`)}</select></td>
            <td>${has ? '이미 있음' : html`<button class="btn small ghost" onClick=${() => setRows(rows.filter((_, k) => k !== i))}>✕</button>`}</td>
          </tr>`;
        })}
      </table>
      <div class="btn-row">
        <button class="btn small" onClick=${() => setRows([...rows, { id: `특수${rows.length + 1}`, grade: 1 }])}>+ 줄 추가</button>
        <label>모두 같은 비밀번호 <input class="input" style="width:8em" value=${pw} onInput=${(e) => setPw(e.target.value)} /></label>
        <button class="btn primary" disabled=${busy || !todo.length} onClick=${create}>${busy ? '만드는 중…' : `계정 ${todo.length}개 만들기`}</button>
      </div>
      ${log.length > 0 && html`<div class="log">${log.map((l) => html`<div>${l}</div>`)}</div>`}
      <p class="muted small">💡 계정을 다 만든 뒤에는 Supabase에서 <b>새 가입 허용(Allow new users to sign up)</b>을 꺼 두면 더 안전해요. 학생을 더 만들 때만 잠깐 켜 주세요.</p>
    </div>
  </div>`;
}
