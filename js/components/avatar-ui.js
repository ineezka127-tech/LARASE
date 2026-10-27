// 아바타 보여 주기 · 꾸미기 화면 부품
import { html, useMemo } from '../../vendor/preact-htm.js';
import { avatarSvg, cleanCfg, FACES, SKINS, EYES, MOUTHS, HAIRS, HAIR_COLORS, ITEMS, SLOTS } from '../lib/avatar.js';

// mode: 'portrait'(상반신, 동그라미) | 'full'(전신)
export function AvatarImg({ cfg, mode = 'portrait', size = 48, className = '' }) {
  const svg = useMemo(() => avatarSvg(cfg, mode), [JSON.stringify(cfg), mode]);
  const style = mode === 'portrait' ? `width:${size}px;height:${size}px` : `width:${size}px;height:${Math.round(size * 1.4)}px`;
  return html`<span class=${`avatar-img ${mode} ${className}`} style=${style} dangerouslySetInnerHTML=${{ __html: svg }}></span>`;
}

// 기본 꾸미기 탭 (무료)
export const BASIC_TABS = [
  ['face', '얼굴형', Object.entries(FACES)],
  ['skin', '피부색', SKINS.map((c) => [c, ''])],
  ['eyes', '눈', Object.entries(EYES)],
  ['mouth', '입', Object.entries(MOUTHS)],
  ['hair', '머리 모양', Object.entries(HAIRS)],
  ['hairColor', '머리색', HAIR_COLORS.map((c) => [c, ''])],
];

const COLOR_KEYS = ['skin', 'hairColor'];
const FULL_SLOTS = ['top', 'bottom', 'shoes', 'held', 'bg', 'pet'];

// 하나의 탭에서 고르는 칸들
export function OptionGrid({ cfg, slot, options, onPick, lockedInfo }) {
  const cur = cleanCfg(cfg)[slot];
  if (COLOR_KEYS.includes(slot)) {
    return html`<div class="swatches">${options.map(([c]) => html`
      <button type="button" class=${'swatch' + (cur === c ? ' on' : '')} style=${`background:${c}`} aria-label="색" onClick=${() => onPick(c)}></button>`)}</div>`;
  }
  const mode = FULL_SLOTS.includes(slot) ? 'full' : 'portrait';
  return html`<div class=${'opt-grid ' + mode}>${options.map(([value, label]) => {
    const lock = lockedInfo?.(value);
    return html`<button type="button" class=${'opt' + (cur === value ? ' on' : '') + (lock ? ' locked' : '')} onClick=${() => onPick(value, lock)}>
      ${value === null ? html`<span class="opt-none">✕</span>` : html`<${AvatarImg} cfg=${{ ...cfg, [slot]: value }} mode=${mode} size=${mode === 'full' ? 64 : 70} />`}
      <small>${label}</small>
      ${lock && html`<span class="opt-lock">${lock}</span>`}
    </button>`;
  })}</div>`;
}

// 아이템 칸 탭 목록 (옷장/상점에서 사용)
export function itemOptions(slot, { withNone = true } = {}) {
  const list = ITEMS.filter((i) => i.slot === slot).map((i) => [i.id, i.name]);
  return withNone && ['hat', 'glasses', 'held', 'pet'].includes(slot) ? [[null, '없음'], ...list] : list;
}

export { SLOTS };
