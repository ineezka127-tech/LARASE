import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, createAccount, friendlyError, normalizeLoginId } from '../lib/sb.js';
import { Loading, ErrorBox, toast } from '../components/ui.js';

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
    for (const r of todo) {
      try {
        await createAccount({ loginId: r.id, password: pw, role: 'student', grade: r.grade });
        out.push(`✅ ${r.id} 만들었어요`);
      } catch (e) { out.push(`⚠️ ${r.id}: ${friendlyError(e)}`); }
      setLog([...out]);
    }
    setBusy(false);
    load();
  };

  const setGrade = async (s, grade) => {
    const { error } = await sb.from('profiles').update({ grade: grade || null }).eq('id', s.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else { toast('저장했어요 ✔'); load(); }
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
        <tr><th></th><th>아이디</th><th>화면 이름</th><th>학년</th><th>레벨</th><th>XP</th><th></th></tr>
        ${list.map((s) => html`<tr>
          <td class="big-emoji">${s.avatar}</td><td><b>${s.login_id}</b></td><td>${s.display_name || html`<span class="muted">(아직 안 정함)</span>`}</td>
          <td><select class="input" value=${s.grade || ''} onChange=${(e) => setGrade(s, Number(e.target.value))}>
            <option value="">-</option>${[1, 2, 3].map((g) => html`<option value=${g}>${g}학년</option>`)}</select></td>
          <td>Lv.${s.level}</td><td>${s.xp}</td>
          <td class="right"><a class="btn small" href=${'#/t/student/' + s.id}>기록</a> <button class="btn small ghost" onClick=${() => clearName(s)}>이름 초기화</button></td>
        </tr>`)}
      </table>
      ${list.length === 0 && html`<p class="muted">아직 학생 계정이 없어요. 아래에서 만들어 주세요.</p>`}
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
