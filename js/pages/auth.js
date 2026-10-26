import { html, useState } from '../../vendor/preact-htm.js';
import { sb, signIn, createAccount, friendlyError, normalizeLoginId } from '../lib/sb.js';
import { AVATARS } from '../lib/xp.js';

function recentIds() {
  try { return JSON.parse(localStorage.getItem('bokseup-recent-ids') || '[]'); } catch { return []; }
}
function rememberId(id) {
  try {
    const list = [id, ...recentIds().filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem('bokseup-recent-ids', JSON.stringify(list));
  } catch {}
}

export function NotConfigured() {
  return html`<div class="page narrow">
    <div class="card">
      <h1>⚙️ 설정이 필요해요</h1>
      <p><code>config.js</code> 파일에 Supabase 주소와 키를 넣어 주세요.</p>
      <p class="muted">자세한 방법은 <code>README.md</code>의 설치 안내를 보세요.</p>
    </div>
  </div>`;
}

export function LoginPage({ appName }) {
  const recent = recentIds();
  const [id, setId] = useState(recent[0] || '');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!id || !pw) { setErr('아이디와 비밀번호를 넣어 주세요.'); return; }
    setBusy(true); setErr('');
    try {
      await signIn(id, pw);
      rememberId(normalizeLoginId(id));
    } catch (ex) {
      setErr(friendlyError(ex));
    }
    setBusy(false);
  };

  return html`<div class="login-wrap">
    <form class="card login" onSubmit=${submit}>
      <div class="login-logo">📚</div>
      <h1>${appName}</h1>
      <p class="muted">오늘 배운 것, 다시 한번 해 볼까요?</p>
      ${recent.length > 0 && html`<div class="chips">${recent.map((r) => html`
        <button type="button" class=${'chip' + (r === id ? ' on' : '')} onClick=${() => setId(r)}>${r}</button>`)}</div>`}
      <label>아이디<input class="input big" value=${id} onInput=${(e) => setId(e.target.value)} autocomplete="username" placeholder="예: 특수1" /></label>
      <label>비밀번호<input class="input big" type="password" value=${pw} onInput=${(e) => setPw(e.target.value)} autocomplete="current-password" /></label>
      ${err && html`<div class="error-box">${err}</div>`}
      <button class="btn big primary block" disabled=${busy}>${busy ? '들어가는 중…' : '들어가기 🚀'}</button>
    </form>
  </div>`;
}

export function SetupPage({ onDone }) {
  const [id, setId] = useState('선생님');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 4) { setErr('비밀번호는 4자 이상으로 해 주세요.'); return; }
    if (pw !== pw2) { setErr('비밀번호 두 개가 서로 달라요.'); return; }
    setBusy(true); setErr('');
    try {
      await createAccount({ loginId: id, password: pw, role: 'teacher' });
      await signIn(id, pw);
      rememberId(normalizeLoginId(id));
      location.hash = '#/t/students';
      onDone();
    } catch (ex) {
      setErr(friendlyError(ex));
    }
    setBusy(false);
  };

  return html`<div class="login-wrap">
    <form class="card login" onSubmit=${submit}>
      <div class="login-logo">🧑‍🏫</div>
      <h1>처음 설정</h1>
      <p class="muted">선생님 계정을 만들어요. (처음 한 번만)</p>
      <label>선생님 아이디<input class="input big" value=${id} onInput=${(e) => setId(e.target.value)} /></label>
      <label>비밀번호<input class="input big" type="password" value=${pw} onInput=${(e) => setPw(e.target.value)} autocomplete="new-password" /></label>
      <label>비밀번호 확인<input class="input big" type="password" value=${pw2} onInput=${(e) => setPw2(e.target.value)} autocomplete="new-password" /></label>
      <p class="muted small">선생님 비밀번호는 학생들이 모르는 것으로 정해 주세요.</p>
      ${err && html`<div class="error-box">${err}</div>`}
      <button class="btn big primary block" disabled=${busy}>${busy ? '만드는 중…' : '선생님 계정 만들기'}</button>
    </form>
  </div>`;
}

export function AvatarPicker({ level, value, onPick }) {
  return html`<div class="avatar-grid">${AVATARS.map(([a, lv]) => {
    const locked = level < lv;
    return html`<button type="button" class=${'avatar-opt' + (a === value ? ' on' : '') + (locked ? ' locked' : '')}
      disabled=${locked} onClick=${() => onPick(a)} title=${locked ? `레벨 ${lv}에 열려요` : ''}>
      <span>${a}</span>${locked && html`<small>🔒Lv.${lv}</small>`}
    </button>`;
  })}</div>`;
}

export function Onboarding({ profile, onDone }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(profile.avatar || '🐣');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setErr('이름을 써 주세요.'); return; }
    setBusy(true);
    const { error } = await sb.from('profiles').update({ display_name: n.slice(0, 12), avatar }).eq('id', profile.id);
    setBusy(false);
    if (error) setErr(friendlyError(error)); else onDone();
  };

  return html`<div class="login-wrap">
    <form class="card login wide" onSubmit=${save}>
      <div class="login-logo">${avatar}</div>
      <h1>반가워요! 👋</h1>
      <p>화면에 보일 <b>내 이름</b>을 정해요.</p>
      <input class="input big center" maxlength="12" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="이름 또는 별명" />
      <p>내 캐릭터를 골라요.</p>
      <${AvatarPicker} level=${profile.level} value=${avatar} onPick=${setAvatar} />
      ${err && html`<div class="error-box">${err}</div>`}
      <button class="btn big primary block" disabled=${busy}>시작하기 🚀</button>
    </form>
  </div>`;
}
