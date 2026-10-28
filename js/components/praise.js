// 🎁 수업 중 칭찬하기: 학생을 누르고 이유를 고르면 경험치·코인을 바로 줘요
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { Modal, toast } from './ui.js';
import { AvatarImg } from './avatar-ui.js';

export const REASONS = ['발표를 잘했어요', '대답을 잘했어요', '바른 자세로 공부했어요', '친구를 도와줬어요', '끝까지 노력했어요', '숙제를 해 왔어요'];
export const MINUS_REASONS = ['약속을 지키지 않았어요', '수업 시간에 장난쳤어요', '친구에게 바르지 않은 말을 했어요', '숙제를 안 해 왔어요'];
const ETC = '기타';
// [경험치, 코인, 주사위]
const PRESETS = [[5, 5, 0], [10, 10, 0], [20, 20, 0], [0, 10, 0], [0, 0, 1], [10, 10, 1]];
const MINUS_PRESETS = [-5, -10, -20, -30];

const gainText = (xp, coins, dice) => [xp > 0 && `+${xp} XP`, coins !== 0 && `${coins > 0 ? '+' : ''}${coins}🪙`, dice > 0 && `🎲×${dice}`].filter(Boolean).join(' ');

export function PraiseModal({ onClose, only = null, onDone, startMode = 'plus' }) {
  const [students, setStudents] = useState(null);
  const [picked, setPicked] = useState(only ? [only] : []);
  const [mode, setMode] = useState(startMode);      // plus = 칭찬, minus = 코인 돌려받기
  const [reason, setReason] = useState(startMode === 'plus' ? REASONS[0] : MINUS_REASONS[0]);
  const [etc, setEtc] = useState(false);
  const [xp, setXp] = useState(startMode === 'plus' ? 10 : 0);
  const [coins, setCoins] = useState(startMode === 'plus' ? 10 : -10);
  const [dice, setDice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sb.from('profiles').select('*').eq('role', 'student').order('login_id')
      .then(({ data, error }) => (error ? toast('⚠️ ' + friendlyError(error)) : setStudents([...data.filter((x) => !x.is_test), ...data.filter((x) => x.is_test)])));
  }, []);

  const switchMode = (m) => {
    setMode(m); setEtc(false);
    setReason(m === 'plus' ? REASONS[0] : MINUS_REASONS[0]);
    if (m === 'minus') { setXp(0); setCoins(-10); setDice(0); } else { setXp(10); setCoins(10); }
  };
  const pickReason = (r) => {
    if (r === ETC) { setEtc(true); setReason(''); setTimeout(() => inputRef.current?.focus(), 0); }
    else { setEtc(false); setReason(r); }
  };
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const give = async (gx, gc, gd) => {
    if (!picked.length) { toast(mode === 'plus' ? '칭찬할 학생을 눌러 주세요' : '학생을 눌러 주세요'); return; }
    if (!reason.trim()) { toast('이유를 적어 주세요'); inputRef.current?.focus(); return; }
    setBusy(true);
    const names = [];
    for (const id of picked) {
      const s = students.find((x) => x.id === id);
      try {
        if (gd > 0) await rpc('give_reward2', { p_user: id, p_xp: gx, p_coins: gc, p_dice: gd, p_reason: reason.trim() });
        else await rpc('give_reward', { p_user: id, p_xp: gx, p_coins: gc, p_reason: reason.trim() });
        names.push(s.display_name || s.login_id);
      } catch (e) {
        toast('⚠️ ' + (/give_reward2/.test(e.message || '') ? '주사위를 주려면 Supabase에서 update-08-praise-dice.sql을 먼저 실행해 주세요' : friendlyError(e)));
      }
    }
    setBusy(false);
    if (names.length) {
      setDone({ names, xp: gx, coins: gc, dice: gd, reason: reason.trim(), minus: gc < 0, cfgs: picked.map((id) => students.find((x) => x.id === id)?.avatar_cfg) });
      onDone?.();
    }
  };

  if (done) {
    return html`<${Modal} onClose=${onClose} wide>
      <div class=${'praise-done' + (done.minus ? ' minus' : '')}>
        <div class="praise-avatars">${done.cfgs.map((c) => html`<${AvatarImg} cfg=${c} mode="full" size=${110} />`)}</div>
        <h2>${done.minus ? '📌' : '🎉'} ${done.names.join(', ')}</h2>
        <p class="praise-reason">“${done.reason}”</p>
        <p class="praise-gain">
          ${done.xp > 0 && html`<span class="pill">+${done.xp} XP</span>`}
          ${done.coins !== 0 && html`<span class=${'pill ' + (done.minus ? 'minus' : 'coin')}>${done.coins > 0 ? '+' : ''}${done.coins} 🪙</span>`}
          ${done.dice > 0 && html`<span class="pill dice">🎲 주사위 티켓 ×${done.dice}</span>`}
        </p>
        ${done.minus && html`<p class="muted">다음엔 약속을 지켜서 다시 모아 봐요!</p>`}
        <div class="btn-row center-row">
          <button class="btn" onClick=${() => { setDone(null); setPicked(only ? [only] : []); }}>${done.minus ? '계속하기' : '또 칭찬하기'}</button>
          <button class="btn primary" onClick=${onClose}>닫기</button>
        </div>
      </div>
    <//>`;
  }

  const reasons = mode === 'plus' ? REASONS : MINUS_REASONS;
  return html`<${Modal} onClose=${onClose} wide>
    <div class="praise-head">
      <h2>${mode === 'plus' ? '🎁 칭찬하기' : '📌 코인 돌려받기'}</h2>
      <div class="seg">
        <button type="button" class=${mode === 'plus' ? 'on' : ''} onClick=${() => switchMode('plus')}>🎁 칭찬</button>
        <button type="button" class=${mode === 'minus' ? 'on minus' : ''} onClick=${() => switchMode('minus')}>📌 약속</button>
      </div>
    </div>
    ${!students ? html`<p class="muted">불러오는 중…</p>` : html`
      ${!only && html`<div class="praise-step">① 학생 고르기 <small class="muted">(여러 명 가능)</small></div>
      <div class="praise-grid">${students.map((s) => html`<button type="button" class=${'praise-student' + (picked.includes(s.id) ? ' on' : '')} onClick=${() => toggle(s.id)}>
        <${AvatarImg} cfg=${s.avatar_cfg} size=${64} /><b>${s.display_name || s.login_id}</b><small>${s.is_test ? '🧪 테스트' : `Lv.${s.level}`}</small></button>`)}
        <button type="button" class="praise-student all" onClick=${() => { const real = students.filter((x) => !x.is_test).map((x) => x.id); setPicked(picked.length >= real.length ? [] : real); }}>👥<b>${picked.length && picked.length >= students.filter((x) => !x.is_test).length ? '모두 빼기' : '모두'}</b></button>
      </div>`}
      <div class="praise-step">${only ? '①' : '②'} 이유</div>
      <div class="chips">${[...reasons, ETC].map((r) => html`<button type="button" class=${'chip' + ((r === ETC ? etc : !etc && reason === r) ? ' on' : '') + (mode === 'minus' ? ' minus' : '')} onClick=${() => pickReason(r)}>${r === ETC ? '✏️ 기타' : r}</button>`)}</div>
      ${etc && html`<input ref=${inputRef} class="input" maxlength="60" value=${reason} onInput=${(e) => setReason(e.target.value)} placeholder=${mode === 'plus' ? '칭찬 이유를 적어 주세요' : '이유를 적어 주세요'} />`}
      <div class="praise-step">${only ? '②' : '③'} ${mode === 'plus' ? '선물 (누르면 바로 줘요)' : '돌려받을 코인 (누르면 바로 빠져요)'}</div>
      ${mode === 'plus'
        ? html`<div class="praise-presets">${PRESETS.map(([px, pc, pd]) => html`<button class="btn big good" disabled=${busy} onClick=${() => give(px, pc, pd)}>${gainText(px, pc, pd)}</button>`)}</div>`
        : html`<div class="praise-presets">${MINUS_PRESETS.map((pc) => html`<button class="btn big minus" disabled=${busy} onClick=${() => give(0, pc, 0)}>${pc} 🪙</button>`)}</div>`}
      <details class="praise-custom"><summary class="muted small">직접 정하기</summary>
        <div class="btn-row">
          ${mode === 'plus' && html`<label>경험치 <input class="input num-in" type="number" min="0" max="200" value=${xp} onInput=${(e) => setXp(Number(e.target.value))} /></label>`}
          <label>코인 <input class="input num-in" type="number" value=${coins} onInput=${(e) => setCoins(mode === 'minus' ? -Math.abs(Number(e.target.value)) : Number(e.target.value))} /></label>
          ${mode === 'plus' && html`<label>🎲 주사위 <input class="input num-in" type="number" min="0" max="5" value=${dice} onInput=${(e) => setDice(Math.max(0, Math.min(5, Number(e.target.value))))} /></label>`}
          <button class="btn primary" disabled=${busy} onClick=${() => give(mode === 'plus' ? xp : 0, coins, mode === 'plus' ? dice : 0)}>${mode === 'plus' ? '주기' : '돌려받기'}</button>
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
