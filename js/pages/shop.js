// 🛍️ 아바타 상점
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { ITEMS, ITEM, SLOTS, cleanCfg } from '../lib/avatar.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { Loading, ErrorBox, Modal, toast } from '../components/ui.js';

export async function loadInventory(userId) {
  const { data, error } = await sb.from('inventory').select('item_id').eq('user_id', userId);
  if (error) throw error;
  return new Set(data.map((r) => r.item_id));
}

// 이 아이템을 지금 입을 수 있는지
export function canWear(item, owned, level) {
  if (!item) return true;
  return (item.price === 0 && item.level <= level) || owned.has(item.id);
}

const FULL_SLOTS = ['top', 'bottom', 'shoes', 'held', 'bg', 'pet'];
const SHOP_SLOTS = Object.keys(SLOTS);

export function ShopPage({ profile, refreshProfile }) {
  const [owned, setOwned] = useState(null);
  const [prices, setPrices] = useState(null);   // 서버에 있는 가격 (화면 표시는 서버 기준)
  const [slot, setSlot] = useState('top');
  const [tryOn, setTryOn] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [inv, shop] = await Promise.all([loadInventory(profile.id), sb.from('shop_items').select('id,price,min_level,active')]);
      if (shop.error) throw shop.error;
      setOwned(inv);
      setPrices(Object.fromEntries(shop.data.map((s) => [s.id, s])));
    } catch (e) { setErr(friendlyError(e)); }
  };
  useEffect(() => { load(); }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!owned || !prices) return html`<${Loading} />`;

  const base = cleanCfg(profile.avatar_cfg);
  const preview = { ...base, ...tryOn };
  const items = ITEMS.filter((i) => i.slot === slot && i.price > 0 && prices[i.id]?.active !== false)
    .map((i) => ({ ...i, price: prices[i.id]?.price ?? i.price, level: prices[i.id]?.min_level ?? i.level }));

  const buy = async (it, wear) => {
    setBusy(true);
    try {
      await rpc('buy_item', { p_item: it.id });
      if (wear) await rpc('save_avatar', { p_cfg: { ...base, [it.slot]: it.id } });
      toast(`🎉 ${it.name}을(를) 샀어요!`);
      setConfirm(null);
      setTryOn({});
      await load();
      refreshProfile();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };
  const wearNow = async (it) => {
    try {
      await rpc('save_avatar', { p_cfg: { ...base, [it.slot]: it.id } });
      toast('입었어요 ✔'); setTryOn({}); refreshProfile();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
  };

  return html`<div class="page shop">
    <div class="shop-top card">
      <${AvatarImg} cfg=${preview} mode="full" size=${150} />
      <div class="shop-info">
        <h1>🛍️ 아바타 상점</h1>
        <div class="coin-big">🪙 ${profile.coins}</div>
        <p class="muted small">물건을 누르면 먼저 입어 볼 수 있어요.<br/>문제를 풀고 출석하면 코인이 모여요!</p>
        ${Object.keys(tryOn).length > 0 && html`<button class="btn small" onClick=${() => setTryOn({})}>↩️ 원래대로</button>`}
        <a class="btn small" href="#/avatar">🧑‍🎨 내 옷장</a>
      </div>
    </div>

    <div class="tabs">${SHOP_SLOTS.map((s) => html`<button class=${'tab' + (slot === s ? ' on' : '')} onClick=${() => setSlot(s)}>${SLOTS[s]}</button>`)}</div>

    <div class="shop-grid">${items.map((it) => {
      const have = owned.has(it.id);
      const lvLock = profile.level < it.level;
      const poor = profile.coins < it.price;
      const mode = FULL_SLOTS.includes(it.slot) ? 'full' : 'portrait';
      return html`<div class=${'card shop-item' + (tryOn[it.slot] === it.id ? ' trying' : '') + (lvLock ? ' lv-lock' : '')}>
        <button class="shop-preview" onClick=${() => setTryOn({ ...tryOn, [it.slot]: it.id })} title="입어 보기">
          <${AvatarImg} cfg=${{ ...base, [it.slot]: it.id }} mode=${mode} size=${mode === 'full' ? 90 : 110} />
        </button>
        <b>${it.name}</b>
        ${have
          ? (base[it.slot] === it.id
            ? html`<span class="pill good">입고 있어요</span>`
            : html`<button class="btn small good" onClick=${() => wearNow(it)}>✔ 가짐 · 입기</button>`)
          : lvLock
            ? html`<span class="pill">🔒 레벨 ${it.level}부터</span>`
            : html`<button class=${'btn small ' + (poor ? '' : 'primary')} disabled=${poor} onClick=${() => setConfirm(it)}>🪙 ${it.price}</button>`}
        ${!have && !lvLock && poor && html`<small class="muted">${it.price - profile.coins}코인 더 모아요</small>`}
      </div>`;
    })}</div>

    ${confirm && html`<${Modal} onClose=${() => setConfirm(null)}>
      <div class="center">
        <${AvatarImg} cfg=${{ ...base, [confirm.slot]: confirm.id }} mode="full" size=${140} />
        <h2>${confirm.name}</h2>
        <p>🪙 <b>${confirm.price}</b> 코인을 쓸까요?<br/><small class="muted">남는 코인: ${profile.coins - confirm.price}</small></p>
        <div class="btn-col">
          <button class="btn big primary block" disabled=${busy} onClick=${() => buy(confirm, true)}>사서 바로 입기 ✨</button>
          <button class="btn block" disabled=${busy} onClick=${() => buy(confirm, false)}>사기만 하기</button>
          <button class="btn ghost block" onClick=${() => setConfirm(null)}>그만두기</button>
        </div>
      </div>
    <//>`}
  </div>`;
}

export { ITEM };
