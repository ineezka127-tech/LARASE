import { html, useState } from '../../vendor/preact-htm.js';
import { sb, rpc, signIn, createAccount, friendlyError, normalizeLoginId, APP_MODE, OTHER_PAGE } from '../lib/sb.js';
import { cleanCfg } from '../lib/avatar.js';
import { AvatarBuilder } from './avatar.js';

const RECENT_KEY = APP_MODE === 'teacher' ? 'bokseup-recent-ids-teacher' : 'bokseup-recent-ids';
function recentIds() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function rememberId(id) {
  try {
    const list = [id, ...recentIds().filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
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
      <div class="login-logo">${APP_MODE === 'teacher' ? '🧑‍🏫' : '🎈'}</div>
      <h1>${appName}${APP_MODE === 'teacher' ? html` <span class="mode-tag">선생님</span>` : ''}</h1>
      <p class="muted">${APP_MODE === 'teacher' ? '수업 자료·학생 현황·채점을 관리해요' : '배우고, 놀고, 쓰면서 쑥쑥 자라요!'}</p>
      ${recent.length > 0 && html`<div class="chips">${recent.map((r) => html`
        <button type="button" class=${'chip' + (r === id ? ' on' : '')} onClick=${() => setId(r)}>${r}</button>`)}</div>`}
      <label>아이디<input class="input big" value=${id} onInput=${(e) => setId(e.target.value)} autocomplete="username" placeholder="예: 특수1" /></label>
      <label>비밀번호<input class="input big" type="password" value=${pw} onInput=${(e) => setPw(e.target.value)} autocomplete="current-password" /></label>
      ${err && html`<div class="error-box">${err}</div>`}
      <button class="btn big primary block" disabled=${busy}>${busy ? '들어가는 중…' : '들어가기 🚀'}</button>
      <a class="other-page" href=${OTHER_PAGE}>${APP_MODE === 'teacher' ? '📚 학생 페이지로 →' : '🧑‍🏫 선생님 페이지'}</a>
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

export function Onboarding({ profile, onDone }) {
  const [name, setName] = useState('');
  const [cfg, setCfg] = useState(cleanCfg(profile.avatar_cfg));
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const next = (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('이름을 써 주세요.'); return; }
    setErr(''); setStep(2);
  };
  const save = async () => {
    setBusy(true);
    try {
      const { error } = await sb.from('profiles').update({ display_name: name.trim().slice(0, 12) }).eq('id', profile.id);
      if (error) throw error;
      await rpc('save_avatar', { p_cfg: cfg });
      onDone();
    } catch (ex) { setErr(friendlyError(ex)); }
    setBusy(false);
  };

  if (step === 1) {
    return html`<div class="login-wrap">
      <form class="card login" onSubmit=${next}>
        <div class="login-logo">👋</div>
        <h1>반가워요!</h1>
        <p>화면에 보일 <b>내 이름</b>을 정해요.</p>
        <input class="input big center" maxlength="12" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="이름 또는 별명" />
        ${err && html`<div class="error-box">${err}</div>`}
        <button class="btn big primary block">다음 ▶</button>
      </form>
    </div>`;
  }
  return html`<div class="login-wrap">
    <div class="card login wide">
      <h1>${name}님의 캐릭터를 만들어요 🎨</h1>
      <p class="muted">옷과 모자는 코인을 모아서 상점에서 살 수 있어요!</p>
      <${AvatarBuilder} cfg=${cfg} onChange=${setCfg} />
      ${err && html`<div class="error-box">${err}</div>`}
      <div class="btn-row center-row">
        <button class="btn" onClick=${() => setStep(1)}>◀ 이름 다시 쓰기</button>
        <button class="btn big primary" disabled=${busy} onClick=${save}>완성! 시작하기 🚀</button>
      </div>
    </div>
  </div>`;
}
