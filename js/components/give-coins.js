// 🎁 선생님 칭찬 코인 주기
import { html, useState } from '../../vendor/preact-htm.js';
import { rpc, friendlyError } from '../lib/sb.js';
import { toast } from './ui.js';

const REASONS = ['발표를 잘했어요', '친구를 도와줬어요', '바른 자세로 공부했어요', '숙제를 해 왔어요', '끝까지 노력했어요'];

export function GiveCoins({ student, onDone, compact = false }) {
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);

  const give = async (n) => {
    setBusy(true);
    try {
      const r = await rpc('give_coins', { p_user: student.id, p_amount: n, p_reason: reason });
      toast(`${student.display_name || student.login_id}에게 ${n > 0 ? '+' : ''}${n}🪙 (지금 ${r.coins}🪙)`);
      onDone?.();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };

  return html`<div class=${'give-coins' + (compact ? ' compact' : '')}>
    ${!compact && html`<h2>🎁 칭찬 코인 주기 <small class="muted">지금 🪙 ${student.coins ?? 0}</small></h2>`}
    <div class="chips">${REASONS.map((r) => html`<button type="button" class=${'chip' + (reason === r ? ' on' : '')} onClick=${() => setReason(r)}>${r}</button>`)}</div>
    <div class="btn-row">
      <input class="input" style="max-width:16em" value=${reason} maxlength="60" onInput=${(e) => setReason(e.target.value)} placeholder="칭찬 이유" />
      ${[5, 10, 20].map((n) => html`<button class="btn small good" disabled=${busy} onClick=${() => give(n)}>+${n}🪙</button>`)}
      <input class="input num-in" type="number" value=${amount} onInput=${(e) => setAmount(Number(e.target.value))} />
      <button class="btn small" disabled=${busy || !amount} onClick=${() => give(amount)}>주기</button>
    </div>
    <p class="muted small">학생 화면의 "최근 기록"에 칭찬 이유가 함께 보여요. 잘못 줬다면 −(빼기) 숫자를 넣어 돌려받을 수 있어요.</p>
  </div>`;
}
