// 🎁 수업 중 칭찬하기: 학생을 누르고 이유를 고르면 경험치·코인을 바로 줘요
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { Modal, toast } from './ui.js';
import { AvatarImg } from './avatar-ui.js';

export const REASONS = ['발표를 잘했어요', '대답을 잘했어요', '바른 자세로 공부했어요', '친구를 도와줬어요', '끝까지 노력했어요', '숙제를 해 왔어요'];
const PRESETS = [[5, 5], [10, 10], [20, 20], [0, 10]];

export function PraiseModal({ onClose, only = null, onDone }) {
  const [students, setStudents] = useState(null);
  const [picked, setPicked] = useState(only ? [only] : []);
  const [reason, setReason] = useState(REASONS[0]);
  const [xp, setXp] = useState(10);
  const [coins, setCoins] = useState(10);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    sb.from('profiles').select('id,login_id,display_name,avatar_cfg,level').eq('role', 'student').order('login_id')
      .then(({ data, error }) => (error ? toast('⚠️ ' + friendlyError(error)) : setStudents(data)));
  }, []);

  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const give = async (gx = xp, gc = coins) => {
    if (!picked.length) { toast('칭찬할 학생을 눌러 주세요'); return; }
    setBusy(true);
    const names = [];
    for (const id of picked) {
      const s = students.find((x) => x.id === id);
      try {
        await rpc('give_reward', { p_user: id, p_xp: gx, p_coins: gc, p_reason: reason });
        names.push(s.display_name || s.login_id);
      } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    }
    setBusy(false);
    if (names.length) {
      setDone({ names, xp: gx, coins: gc, reason, cfgs: picked.map((id) => students.find((x) => x.id === id)?.avatar_cfg) });
      onDone?.();
    }
  };

  if (done) {
    return html`<${Modal} onClose=${onClose} wide>
      <div class="praise-done">
        <div class="praise-avatars">${done.cfgs.map((c) => html`<${AvatarImg} cfg=${c} mode="full" size=${110} />`)}</div>
        <h2>🎉 ${done.names.join(', ')}</h2>
        <p class="praise-reason">“${done.reason}”</p>
        <p class="praise-gain">${done.xp > 0 && html`<span class="pill">+${done.xp} XP</span>`} ${done.coins !== 0 && html`<span class="pill coin">${done.coins > 0 ? '+' : ''}${done.coins} 🪙</span>`}</p>
        <div class="btn-row center-row">
          <button class="btn" onClick=${() => { setDone(null); setPicked(only ? [only] : []); }}>또 칭찬하기</button>
          <button class="btn primary" onClick=${onClose}>닫기</button>
        </div>
      </div>
    <//>`;
  }

  return html`<${Modal} onClose=${onClose} wide>
    <h2>🎁 칭찬하기</h2>
    ${!students ? html`<p class="muted">불러오는 중…</p>` : html`
      ${!only && html`<p class="muted small">칭찬할 학생을 누르세요 (여러 명 가능)</p>
      <div class="praise-grid">${students.map((s) => html`<button type="button" class=${'praise-student' + (picked.includes(s.id) ? ' on' : '')} onClick=${() => toggle(s.id)}>
        <${AvatarImg} cfg=${s.avatar_cfg} size=${64} /><b>${s.display_name || s.login_id}</b><small>Lv.${s.level}</small></button>`)}
        <button type="button" class="praise-student all" onClick=${() => setPicked(picked.length === students.length ? [] : students.map((s) => s.id))}>👥<b>${picked.length === students.length ? '모두 빼기' : '모두'}</b></button>
      </div>`}
      <div class="chips">${REASONS.map((r) => html`<button type="button" class=${'chip' + (reason === r ? ' on' : '')} onClick=${() => setReason(r)}>${r}</button>`)}</div>
      <input class="input" maxlength="60" value=${reason} onInput=${(e) => setReason(e.target.value)} placeholder="칭찬 이유" />
      <div class="praise-presets">${PRESETS.map(([px, pc]) => html`<button class="btn big good" disabled=${busy} onClick=${() => give(px, pc)}>${px > 0 ? `+${px} XP ` : ''}+${pc}🪙</button>`)}</div>
      <details class="praise-custom"><summary class="muted small">직접 정하기 (코인은 − 로 돌려받기도 가능)</summary>
        <div class="btn-row">
          <label>경험치 <input class="input num-in" type="number" min="0" max="200" value=${xp} onInput=${(e) => setXp(Number(e.target.value))} /></label>
          <label>코인 <input class="input num-in" type="number" value=${coins} onInput=${(e) => setCoins(Number(e.target.value))} /></label>
          <button class="btn primary" disabled=${busy} onClick=${() => give(xp, coins)}>주기</button>
        </div>
      </details>`}
  <//>`;
}

// 버튼 하나로 여는 칭찬 (선생님 화면·수업 모드 공통)
export function PraiseButton({ className = 'btn', label = '🎁 칭찬하기', onDone }) {
  const [open, setOpen] = useState(false);
  return html`<button class=${className} onClick=${() => setOpen(true)}>${label}</button>
    ${open && html`<${PraiseModal} onClose=${() => setOpen(false)} onDone=${onDone} />`}`;
}
