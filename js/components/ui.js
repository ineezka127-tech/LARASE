// 여러 화면에서 함께 쓰는 작은 부품들
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { levelInfo, levelTitle } from '../lib/xp.js';
import { speak, stopSpeaking, speakingText, ttsSupported } from '../lib/tts.js';

export function go(path) {
  location.hash = path;
}

export function Loading({ text = '불러오는 중…' }) {
  return html`<div class="loading"><div class="spinner"></div><div>${text}</div></div>`;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return html`<div class="error-box">⚠️ ${String(error)}${onRetry && html` <button class="btn small" onClick=${onRetry}>다시 시도</button>`}</div>`;
}

function useSpeaking() {
  const [cur, setCur] = useState(speakingText());
  useEffect(() => {
    const on = (e) => setCur(e.detail);
    window.addEventListener('bokseup-tts', on);
    return () => window.removeEventListener('bokseup-tts', on);
  }, []);
  return cur;
}

// 🔊 읽어 주기 / ⏹ 멈추기 (같은 버튼)
export function SpeakBtn({ text, label = '' }) {
  const cur = useSpeaking();
  if (!ttsSupported) return null;
  const on = cur != null && cur === String(text);
  return html`<button class=${'speak-btn' + (on ? ' on' : '')} aria-label=${on ? '멈추기' : '읽어 주기'} title=${on ? '멈추기' : '읽어 주기'}
    onClick=${(e) => { e.stopPropagation(); on ? stopSpeaking() : speak(text); }}>${on ? '⏹' : '🔊'}${label && html` <span>${on ? '멈추기' : label}</span>`}</button>`;
}

// 무엇이든 읽는 중이면 화면 아래에 "그만 읽기" 버튼
export function StopReadingBar() {
  const cur = useSpeaking();
  if (!ttsSupported || cur == null) return null;
  return html`<button class="stop-reading" onClick=${stopSpeaking}>⏹ 그만 읽기</button>`;
}

export function XPBar({ xp, compact = false }) {
  const info = levelInfo(xp);
  return html`<div class=${'xpbar' + (compact ? ' compact' : '')}>
    <div class="xpbar-top">
      <b>Lv.${info.level}</b>${!compact && html` <span class="muted">${levelTitle(info.level)}</span>`}
      <span class="xpbar-num">${info.into} / ${info.need} XP</span>
    </div>
    <div class="xpbar-track"><div class="xpbar-fill" style=${`width:${info.pct}%`}></div></div>
  </div>`;
}

export function Modal({ children, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return html`<div class="modal-bg" onClick=${(e) => e.target === e.currentTarget && onClose?.()}>
    <div class=${'modal' + (wide ? ' wide' : '')}>${children}</div>
  </div>`;
}

// ---------- 경험치 보상 표시 ----------
// 어디서든 reward(서버 결과)를 부르면 +XP 알림과 레벨업 축하가 나옵니다.
export function reward(result) {
  if (!result || result.preview) return;
  window.dispatchEvent(new CustomEvent('bokseup-reward', { detail: result }));
}

export function toast(text) {
  window.dispatchEvent(new CustomEvent('bokseup-toast', { detail: text }));
}

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#b983ff', '#ff9f45'];
  return html`<div class="confetti">${pieces.map((i) => html`<i style=${`left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 10) * 0.08}s;animation-duration:${1.8 + (i % 5) * 0.3}s`}></i>`)}</div>`;
}

export function RewardLayer({ onChange }) {
  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null);

  useEffect(() => {
    const push = (text, cls = '') => {
      const id = Math.random();
      setToasts((t) => [...t, { id, text, cls }].slice(-3));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    };
    const onReward = (e) => {
      const r = e.detail;
      const dailyCoins = r.bonus > 0 ? 3 : 0;
      const levelCoins = r.leveled_up ? 20 * (r.level - r.old_level) : 0;
      const coins = (r.coins || 0) - dailyCoins - levelCoins;
      if (r.xp > 0 || coins > 0) push([r.xp > 0 && `+${r.xp} XP`, coins > 0 && `+${coins} 🪙`].filter(Boolean).join('  '), 'xp');
      if (r.bonus > 0) push(`🔥 ${r.streak}일 연속 출석! +${r.bonus} XP  +${dailyCoins} 🪙`, 'xp');
      if (r.leveled_up) setLevelUp(r);
      onChange?.();
    };
    const onToast = (e) => push(e.detail);
    window.addEventListener('bokseup-reward', onReward);
    window.addEventListener('bokseup-toast', onToast);
    return () => {
      window.removeEventListener('bokseup-reward', onReward);
      window.removeEventListener('bokseup-toast', onToast);
    };
  }, [onChange]);

  return html`
    <${StopReadingBar} />
    <div class="toasts">${toasts.map((t) => html`<div key=${t.id} class=${'toast ' + t.cls}>${t.text}</div>`)}</div>
    ${levelUp && html`<${Modal} onClose=${() => setLevelUp(null)}>
      <${Confetti} />
      <div class="levelup">
        <div class="levelup-badge">⭐</div>
        <h2>레벨 업!</h2>
        <div class="levelup-num">Lv.${levelUp.old_level} → <b>Lv.${levelUp.level}</b></div>
        <div class="levelup-title">${levelTitle(levelUp.level)}</div>
        <p class="levelup-coin">🪙 +${20 * (levelUp.level - levelUp.old_level)} 코인 보너스!</p>
        <p class="muted">스탯 포인트 +${levelUp.level - levelUp.old_level} · 스킬 포인트 +${levelUp.level - levelUp.old_level}<br/><small>(보드게임이 열리면 쓸 수 있어요!) · 새 아이템이 열렸는지 상점을 확인해 보세요 🛍️</small></p>
        <button class="btn big primary" onClick=${() => setLevelUp(null)}>멋져요!</button>
      </div>
    <//>`}
  `;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

export function timeAgo(d) {
  if (!d) return '기록 없음';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
