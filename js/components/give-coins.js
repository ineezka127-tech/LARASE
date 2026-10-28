// 🎁 학생 기록 화면에서 이 학생만 칭찬하기 / 코인 돌려받기 (칭찬 창을 그대로 써요)
import { html, useState } from '../../vendor/preact-htm.js';
import { PraiseModal } from './praise.js';

export function GiveCoins({ student, onDone }) {
  const [open, setOpen] = useState(false);
  return html`<div class="give-coins">
    <h2>🎁 칭찬하기 <small class="muted">지금 🪙 ${student.coins ?? 0}</small></h2>
    <div class="btn-row">
      <button class="btn good" onClick=${() => setOpen(true)}>🎁 칭찬 (경험치·코인·🎲주사위)</button>
      <button class="btn minus" onClick=${() => setOpen('minus')}>📌 코인 돌려받기</button>
    </div>
    <p class="muted small">학생 화면의 "최근 기록"에 이유가 함께 보여요.</p>
    ${open && html`<${PraiseModal} only=${student.id} startMode=${open === 'minus' ? 'minus' : 'plus'} onClose=${() => setOpen(false)} onDone=${onDone} />`}
  </div>`;
}
