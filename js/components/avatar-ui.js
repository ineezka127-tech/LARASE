// 아바타 보여 주기 · 꾸미기 화면 부품
import { html, useMemo, useState } from '../../vendor/preact-htm.js';
import { avatarSvg, cleanCfg, FACES, SKINS, EYES, BROWS, NOSES, MOUTHS, CHEEKS, HAIRS, HAIR_COLORS, BROW_COLORS, NOSE_COLORS, PREMIUM, ITEMS, ITEM, SLOTS, STATS, RARITY, totalStats, gearStats, power } from '../lib/avatar.js';
import { rpc, friendlyError } from '../lib/sb.js';
import { toast } from './ui.js';

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
  ['eyes', '눈', [...Object.entries(EYES), ...Object.entries(PREMIUM.eyes)]],
  ['brows', '눈썹', Object.entries(BROWS)],
  ['browColor', '눈썹 색', BROW_COLORS.map((c) => [c, ''])],
  ['nose', '코', Object.entries(NOSES)],
  ['noseColor', '코 색', NOSE_COLORS.map((c) => [c, ''])],
  ['mouth', '입', Object.entries(MOUTHS)],
  ['cheek', '볼', Object.entries(CHEEKS)],
  ['hair', '머리 모양', [...Object.entries(HAIRS), ...Object.entries(PREMIUM.hair)]],
  ['hairColor', '머리색', [...HAIR_COLORS, ...Object.keys(PREMIUM.hairColor)].map((c) => [c, ''])],
];

const COLOR_KEYS = ['skin', 'hairColor', 'browColor', 'noseColor'];
const SWATCH = {
  hc_mint: 'linear-gradient(135deg,#63e6be,#20c997)', hc_silver: 'linear-gradient(135deg,#f1f3f5,#868e96)', hc_fire: 'linear-gradient(135deg,#ffd43b,#e03131)',
  hc_rainbow: 'linear-gradient(135deg,#ff6b6b,#ffd43b,#69db7c,#4dabf7,#9775fa)', hc_galaxy: 'linear-gradient(135deg,#1c1a4a,#5f3dc4,#4dabf7)',
};
const FULL_SLOTS = ['top', 'bottom', 'shoes', 'held', 'shield', 'armor', 'acc', 'bg', 'pet'];

// 하나의 탭에서 고르는 칸들
export function OptionGrid({ cfg, slot, options, onPick, lockedInfo }) {
  const cur = cleanCfg(cfg)[slot];
  if (COLOR_KEYS.includes(slot)) {
    return html`<div class="swatches">${options.map(([c]) => {
      const lock = lockedInfo?.(c);
      return html`<button type="button" class=${'swatch' + (cur === c ? ' on' : '') + (c === 'auto' ? ' auto' : '') + (lock ? ' locked' : '')}
        style=${`background:${SWATCH[c] || (c === 'auto' ? '#fff' : c)}`} aria-label="색" title=${ITEM[c]?.name || ''} onClick=${() => onPick(c, lock)}>
        ${c === 'auto' ? '자동' : ''}${lock && html`<span class="opt-lock">${lock}</span>`}</button>`;
    })}</div>`;
  }
  const mode = FULL_SLOTS.includes(slot) ? 'full' : 'portrait';
  return html`<div class=${'opt-grid ' + mode}>${options.map(([value, label]) => {
    const lock = lockedInfo?.(value);
    const it = ITEM[value];
    const rare = it && it.rarity !== 'common' ? RARITY[it.rarity][1] : '';
    return html`<button type="button" class=${'opt' + (cur === value ? ' on' : '') + (lock ? ' locked' : '')} style=${rare && cur !== value ? `border-color:${rare}` : ''} onClick=${() => onPick(value, lock)}>
      ${value === null ? html`<span class="opt-none">✕</span>` : html`<${AvatarImg} cfg=${{ ...cfg, [slot]: value }} mode=${mode} size=${mode === 'full' ? 64 : 70} />`}
      <small>${label}</small>
      ${it && html`<${ItemStats} item=${it} />`}
      ${lock && html`<span class="opt-lock">${lock}</span>`}
    </button>`;
  })}</div>`;
}

// 아이템 칸 탭 목록 (옷장/상점에서 사용)
export function itemOptions(slot, { withNone = true } = {}) {
  const list = ITEMS.filter((i) => i.slot === slot).map((i) => [i.id, i.name]);
  return withNone && ['hat', 'glasses', 'held', 'shield', 'armor', 'acc', 'pet'].includes(slot) ? [[null, '없음'], ...list] : list;
}

export { SLOTS };

// 아이템 능력치 작은 표시 (⚔️+6 🛡️+2)
export function ItemStats({ item }) {
  const st = Object.entries(item.stats || {}).filter(([, v]) => v);
  if (!st.length) return null;
  return html`<span class="item-stats">${st.map(([k, v]) => html`<span>${STATS[k][0]}+${v}</span>`)}</span>`;
}

export function RarityTag({ item }) {
  if (!item || item.rarity === 'common') return null;
  const [name, color] = RARITY[item.rarity];
  return html`<span class="rarity" style=${`background:${color}`}>${name}</span>`;
}

// 💪 능력치 판 (기본 + 투자 + 장비 / 스탯 포인트 투자)
export function StatPanel({ profile, cfg, onChange, editable = true }) {
  const [busy, setBusy] = useState(false);
  const total = totalStats(profile, cfg);
  const gear = gearStats(cfg);
  const inv = profile.stats || {};
  const up = async (k) => {
    setBusy(true);
    try { await rpc('allocate_stat', { p_stat: k }); onChange?.(); }
    catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };
  return html`<div class="stat-panel">
    <div class="power">전투력 <b>${power(total)}</b></div>
    ${Object.entries(STATS).map(([k, [icon, label]]) => html`<div class="stat-row">
      <span class="stat-label">${icon} ${label}</span>
      <b class="stat-val">${total[k]}</b>
      <small class="muted">${gear[k] ? `장비 +${gear[k]}` : ''}${inv[k] ? ` · 투자 ${inv[k]}` : ''}</small>
      ${editable && profile.stat_points > 0 && html`<button class="btn small primary stat-up" disabled=${busy} onClick=${() => up(k)}>+</button>`}
    </div>`)}
    ${editable && html`<div class="muted small">${profile.stat_points > 0 ? `🎯 스탯 포인트 ${profile.stat_points}개를 쓸 수 있어요! (+ 누르기)` : '레벨이 오를 때마다 스탯 포인트 1개를 받아요.'}</div>`}
  </div>`;
}
