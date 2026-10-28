// 🎁 선생님 칭찬: 경험치·코인 주기 (학생 기록 화면)
import { html, useState } from '../../vendor/preact-htm.js';
import { rpc, friendlyError } from '../lib/sb.js';
import { toast } from './ui.js';

import { REASONS } from './praise.js';

export function GiveCoins({ student, onDone, compact = false }) {
  const [amount, setAmount] = useState(10);
  const [xp, setXp] = useState(0);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);

  const give = async (n, gx = 0) => {
    setBusy(true);
    try {
      const r = await rpc('give_reward', { p_user: student.id, p_xp: gx, p_coins: n, p_reason: reason });
      toast(`${student.display_name || student.login_id}에게 ${gx ? `+${gx} XP ` : ''}${n > 0 ? '+' : ''}${n}🪙 (지금 ${r.coins}🪙)`);
      onDone?.();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };

  return html`<div class=${'give-coins' + (compact ? ' compact' : '')}>
    ${!compact && html`<h2>🎁 칭찬하기 <small class="muted">지금 🪙 ${student.coins ?? 0}</small></h2>`}
    <div class="chips">${REASONS.map((r) => html`<button type="button" class=${'chip' + (reason === r ? ' on' : '')} onClick=${() => setReason(r)}>${r}</button>`)}</div>
    <div class="btn-row">
      <input class="input" style="max-width:16em" value=${reason} maxlength="60" onInput=${(e) => setReason(e.target.value)} placeholder="칭찬 이유" />
      ${[5, 10, 20].map((n) => html`<button class="btn small good" disabled=${busy} onClick=${() => give(n, n)}>+${n} XP +${n}🪙</button>`)}
      <label class="small">XP <input class="input num-in" type="number" min="0" max="200" value=${xp} onInput=${(e) => setXp(Number(e.target.value))} /></label>
      <label class="small">🪙 <input class="input num-in" type="number" value=${amount} onInput=${(e) => setAmount(Number(e.target.value))} /></label>
      <button class="btn small" disabled=${busy || (!amount && !xp)} onClick=${() => give(amount, xp)}>주기</button>
    </div>
    <p class="muted small">학생 화면의 "최근 기록"에 칭찬 이유가 함께 보여요. 잘못 줬다면 −(빼기) 숫자를 넣어 돌려받을 수 있어요.</p>
  </div>`;
}
