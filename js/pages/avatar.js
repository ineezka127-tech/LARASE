// 🧑‍🎨 내 캐릭터 꾸미기 (옷장)
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { rpc, friendlyError } from '../lib/sb.js';
import { ITEM, SLOTS, cleanCfg } from '../lib/avatar.js';
import { AvatarImg, OptionGrid, BASIC_TABS, itemOptions, StatPanel } from '../components/avatar-ui.js';
import { loadInventory, canWear } from './shop.js';
import { Loading, ErrorBox, toast, go } from '../components/ui.js';

// 기본 꾸미기만 (처음 로그인할 때)
export function AvatarBuilder({ cfg, onChange }) {
  const [tab, setTab] = useState(BASIC_TABS[0][0]);
  const cur = BASIC_TABS.find((t) => t[0] === tab);
  return html`<div class="builder">
    <div class="builder-preview"><${AvatarImg} cfg=${cfg} mode="full" size=${160} /></div>
    <div class="builder-body">
      <div class="tabs small-tabs">${BASIC_TABS.map(([k, label]) => html`<button type="button" class=${'tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}>${label}</button>`)}</div>
      <${OptionGrid} cfg=${cfg} slot=${tab} options=${cur[2]} onPick=${(v) => onChange({ ...cfg, [tab]: v })} />
    </div>
  </div>`;
}

export function AvatarPage({ profile, refreshProfile }) {
  const [cfg, setCfg] = useState(cleanCfg(profile.avatar_cfg));
  const [owned, setOwned] = useState(null);
  const [tab, setTab] = useState('face');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { loadInventory(profile.id).then(setOwned).catch((e) => setErr(friendlyError(e))); }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!owned) return html`<${Loading} />`;

  const dirty = JSON.stringify(cfg) !== JSON.stringify(cleanCfg(profile.avatar_cfg));
  const tabs = [...BASIC_TABS.map(([k, label, opts]) => [k, label, opts]), ...Object.entries(SLOTS).map(([k, label]) => [k, label, itemOptions(k)])];
  const cur = tabs.find((t) => t[0] === tab);
  const isItem = !!SLOTS[tab];

  // 아이템 칸 + 상점 전용 머리·머리색·눈은 가진 것만
  const lockedInfo = (id) => {
    const it = ITEM[id];
    if (!it || canWear(it, owned, profile.level)) return null;
    return profile.level < it.level ? `🔒Lv.${it.level}` : `🪙${it.price}`;
  };

  const pick = (v, lock) => {
    if (lock) { toast('🛍️ 상점에서 살 수 있어요!'); return; }
    setCfg({ ...cfg, [tab]: v });
  };

  const save = async () => {
    setSaving(true);
    try {
      await rpc('save_avatar', { p_cfg: cfg });
      toast('내 캐릭터를 저장했어요 ✔');
      await refreshProfile();
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setSaving(false);
  };

  return html`<div class="page closet">
    <div class="closet-layout">
      <div class="closet-preview card">
        <${AvatarImg} cfg=${cfg} mode="full" size=${210} />
        <div class="closet-portrait"><${AvatarImg} cfg=${cfg} mode="portrait" size=${72} /><small class="muted">프로필 사진</small></div>
        <button class="btn big primary block" disabled=${!dirty || saving} onClick=${save}>${saving ? '저장 중…' : dirty ? '💾 저장하기' : '✔ 저장됨'}</button>
        ${dirty && html`<button class="btn ghost block" onClick=${() => setCfg(cleanCfg(profile.avatar_cfg))}>↩️ 처음으로</button>`}
        <a class="btn block" href="#/shop">🛍️ 상점 가기 (🪙 ${profile.coins})</a>
        <${StatPanel} profile=${profile} cfg=${cfg} onChange=${refreshProfile} />
      </div>
      <div class="closet-body">
        <h1>🧑‍🎨 내 캐릭터 꾸미기</h1>
        <div class="tab-group-label">기본 모습</div>
        <div class="tabs small-tabs">${BASIC_TABS.map(([k, label]) => html`<button class=${'tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}>${label}</button>`)}</div>
        <div class="tab-group-label">옷장</div>
        <div class="tabs small-tabs">${Object.entries(SLOTS).map(([k, label]) => html`<button class=${'tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}>${label}</button>`)}</div>
        <div class="card"><${OptionGrid} cfg=${cfg} slot=${tab} options=${cur[2]} onPick=${pick} lockedInfo=${lockedInfo} /></div>
        ${(isItem || ['hair', 'hairColor', 'eyes'].includes(tab)) && html`<p class="muted small">🔒 표시는 상점에서 사거나 레벨을 올리면 입을 수 있어요. <a href="#/shop" onClick=${(e) => { e.preventDefault(); go('#/shop'); }}>상점 가기 →</a></p>`}
      </div>
    </div>
  </div>`;
}
