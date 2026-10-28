// 🎲 모험 지도 (보드게임) — 주사위로 이동하고, 몬스터를 만나면 문제로 싸워요
import { html, useState, useEffect, useRef, useMemo } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { totalStats, avatarSvg } from '../lib/avatar.js';
import { checkAnswer, answerText } from '../lib/questions.js';
import { MAP, TILE, BLOCKING, TILE_INFO, ITEM_INFO, worldInfo, zoneOf, ORDER, makeEnemy, maxHp, playerDamage, blockAmount, enemyDamage, critChance } from '../lib/game.js';
import { Loading, ErrorBox, Modal, SpeakBtn, reward, toast, shuffle } from '../components/ui.js';
import { RichText } from '../components/math.js';
import { AvatarImg } from '../components/avatar-ui.js';

const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMS = ['①', '②', '③', '④', '⑤'];

function prepareMcq(q) {
  const order = shuffle(q.data.choices.map((_, i) => i));
  return { ...q, _map: order, data: { ...q.data, choices: order.map((i) => q.data.choices[i]), answer: order.indexOf(q.data.answer - 1) + 1 } };
}

// ---------- 지도 ----------
function GameMap({ world, tile, defeated, choices, onChoose, avatarUri }) {
  const w = worldInfo(world);
  const lines = [];
  MAP.forEach((t) => t.next.forEach((n) => lines.push([t, TILE[n]])));
  return html`<svg class="game-map" viewBox="0 0 980 620" role="img" aria-label="모험 지도">
    <defs><linearGradient id="gbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color=${w.bg[0]} /><stop offset="1" stop-color=${w.bg[1]} /></linearGradient></defs>
    <rect x="0" y="0" width="980" height="620" rx="24" fill="url(#gbg)" />
    ${lines.map(([a, b]) => html`<line x1=${a.x} y1=${a.y} x2=${b.x} y2=${b.y} stroke=${w.path} stroke-width="16" stroke-linecap="round" opacity="0.55" />`)}
    ${MAP.map((t) => {
      const [icon] = TILE_INFO[t.type];
      const done = defeated.includes(t.id);
      const isChoice = choices?.includes(t.id);
      const fill = { mob: '#ffc9c9', elite: '#e599f7', boss: '#ff8787', chest: '#ffe066', trap: '#ffa94d', rest: '#96f2d7', gate: '#ced4da', island: '#99e9f2', start: '#fff' }[t.type] || '#fff';
      return html`<g class=${'tile' + (isChoice ? ' choice' : '')} onClick=${() => isChoice && onChoose(t.id)}>
        <circle cx=${t.x} cy=${t.y} r=${t.type === 'boss' ? 30 : 23} fill=${done ? '#e9ecef' : fill} stroke=${isChoice ? '#5b6cff' : '#3a2f3b'} stroke-width=${isChoice ? 6 : 2.5} />
        <text x=${t.x} y=${t.y + 8} text-anchor="middle" font-size=${t.type === 'boss' ? 26 : 20}>${done ? '✔️' : t.type === 'boss' ? w.boss[0] : icon}</text>
        ${t.type === 'gate' && html`<text x=${t.x} y=${t.y - 28} text-anchor="middle" font-size="15" font-weight="800" fill="#3a2f3b">🎲🎲 ${t.need}+</text>`}
      </g>`;
    })}
    ${(() => { const t = TILE[tile]; return html`<g class="token" style=${`transform: translate(${t.x}px, ${t.y - 34}px)`}>
      <circle r="24" fill="#fff" stroke="#5b6cff" stroke-width="4" /><image href=${avatarUri} x="-22" y="-22" width="44" height="44" />
    </g>`; })()}
  </svg>`;
}

// ---------- 전투 ----------
function Battle({ enemy: start, stats, hp: hp0, items, pool, onEnd, onUseItem, cfg }) {
  const [enemy, setEnemy] = useState(start);
  const [hp, setHp] = useState(hp0);
  const [phase, setPhase] = useState('intro');   // intro → attack → (defend) → attack … → win / lose
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [left, setLeft] = useState(0);
  const [log, setLog] = useState('');
  const [fx, setFx] = useState('');
  const used = useRef(new Set());
  const timer = useRef(null);
  const mhp = maxHp(stats);

  const pick = (type) => {
    let list = pool.filter((x) => x.type === type && !used.current.has(x.id));
    if (!list.length) list = pool.filter((x) => x.type === type);
    if (!list.length) list = pool;                         // OX가 없으면 5지선다로
    const one = list[Math.floor(Math.random() * list.length)];
    used.current.add(one.id);
    return one.type === 'mcq' ? prepareMcq(one) : one;
  };
  const ask = (ph) => {
    const nq = pick(ph === 'attack' ? 'mcq' : 'ox');
    setQ(nq); setAnswer(null); setPhase(ph); setLeft(ph === 'attack' ? 60 : 30);
  };
  useEffect(() => { const t = setTimeout(() => ask('attack'), 1200); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (answer !== null || !q || (phase !== 'attack' && phase !== 'defend')) return;
    timer.current = setInterval(() => setLeft((s) => {
      if (s <= 1) { clearInterval(timer.current); resolve('__timeout__'); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer.current);
  }, [q?.id, phase, answer]);

  const resolve = async (ans) => {
    clearInterval(timer.current);
    if (answer !== null) return;
    setAnswer(ans);
    const correct = ans !== '__timeout__' && checkAnswer(q, ans) === true;
    const stored = q._map && ans !== '__timeout__' ? q._map[ans - 1] + 1 : ans;
    rpc('submit_answer', { p_question: q.id, p_answer: stored === '__timeout__' ? null : stored, p_correct: correct, p_mode: 'game' }).catch(() => {});
    await wait(900);
    if (phase === 'attack') {
      if (correct) {
        const crit = Math.random() < critChance(stats.luck);
        const dmg = playerDamage(stats, enemy, crit);
        const ehp = Math.max(0, enemy.hp - dmg);
        setEnemy({ ...enemy, hp: ehp });
        setFx('hit-enemy');
        setLog(crit ? `💥 크리티컬! ${dmg} 피해!` : `⚔️ 공격 성공! ${dmg} 피해!`);
        await wait(1000); setFx('');
        if (ehp <= 0) { setPhase('win'); setLog(`🎉 ${enemy.name}을(를) 물리쳤어요!`); await wait(900); onEnd({ won: true, hp }); return; }
      } else {
        setLog(ans === '__timeout__' ? '⏰ 시간이 다 됐어요. 공격이 빗나갔어요!' : '💨 공격이 빗나갔어요!');
        await wait(1000);
      }
      ask('defend');
    } else {
      const block = blockAmount(stats, correct);
      const dmg = enemyDamage(enemy, block);
      const nhp = Math.max(0, hp - dmg);
      setFx('hit-me');
      setLog(`${correct ? `🛡️ 막기 성공! 방패 ${block}` : '😣 방어 실패!'} → ${dmg > 0 ? `${dmg} 피해` : '피해 없음!'}`);
      setHp(nhp);
      await wait(1100); setFx('');
      if (nhp <= 0) { setPhase('lose'); setLog('😵 쓰러졌어요…'); await wait(1000); onEnd({ won: false, hp: 0 }); return; }
      ask('attack');
    }
  };

  const usePotion = async (kind) => {
    if (!items[kind] || hp >= mhp) return;
    const ok = await onUseItem(kind);
    if (!ok) return;
    const heal = kind === 'big_potion' ? mhp : Math.ceil(mhp / 2);
    setHp(Math.min(mhp, hp + heal));
    toast(`${ITEM_INFO[kind][0]} 체력 회복!`);
  };

  const bar = (v, m, cls) => html`<div class=${'hpbar ' + cls}><div style=${`width:${Math.max(0, (v / m) * 100)}%`}></div><span>${v} / ${m}</span></div>`;
  const done = answer !== null;
  return html`<div class="battle">
    <div class="battle-top">
      <div class=${'fighter enemy ' + (fx === 'hit-enemy' ? 'shake' : '')}>
        <div class="f-emoji">${enemy.emoji}</div>
        <b>${{ mob: '', elite: '💀 ', boss: '👑 ' }[enemy.kind]}${enemy.name}</b> <small class="muted">공격 ${enemy.atk} · 방어 ${enemy.def}</small>
        ${bar(enemy.hp, enemy.maxHp, 'enemy')}
      </div>
      <div class="vs">VS</div>
      <div class=${'fighter me ' + (fx === 'hit-me' ? 'shake' : '')}>
        <div class="f-avatar"><${AvatarImg} cfg=${cfg} mode="full" size=${72} /></div>
        <b>나</b> <small class="muted">공격 ${stats.atk} · 방어 ${stats.def} · 행운 ${stats.luck}</small>
        ${bar(hp, mhp, 'me')}
        <div class="btn-row center-row">
          ${['potion', 'big_potion'].map((k) => items[k] > 0 && html`<button class="btn small" disabled=${hp >= mhp || phase === 'win' || phase === 'lose'} onClick=${() => usePotion(k)}>${ITEM_INFO[k][0]} ×${items[k]}</button>`)}
        </div>
      </div>
    </div>
    <div class="battle-log">${log || (phase === 'intro' ? `${enemy.emoji} ${enemy.name}이(가) 나타났다!` : '')}</div>
    ${q && (phase === 'attack' || phase === 'defend') && html`<div class=${'card battle-q ' + phase}>
      <div class="bq-head"><b>${phase === 'attack' ? '⚔️ 공격 차례 — 맞히면 공격!' : '🛡️ 방어 차례 — 맞히면 막아요!'}</b>
        <span class=${'timer' + (left <= 10 ? ' low' : '')}>⏱️ ${left}초</span></div>
      <div class="timebar"><div style=${`width:${(left / (phase === 'attack' ? 60 : 30)) * 100}%`}></div></div>
      <div class="q-prompt"><${RichText} text=${q.prompt} /> <${SpeakBtn} text=${q.prompt} /></div>
      ${q.type === 'ox'
        ? html`<div class="ox-row">${[true, false].map((v) => html`<button class=${'ox-btn ' + (v ? 'o' : 'x') + (done && v === !!q.data.answer ? ' right' : done && v === answer ? ' wrong' : '')} disabled=${done} onClick=${() => resolve(v)}>${v ? 'O' : 'X'}</button>`)}</div>`
        : html`<div class="choices">${q.data.choices.map((c, i) => html`<button class=${'choice' + (done && i + 1 === q.data.answer ? ' right' : done && i + 1 === answer ? ' wrong' : '')} disabled=${done} onClick=${() => resolve(i + 1)}><span class="num">${NUMS[i]}</span><span><${RichText} text=${c} /></span></button>`)}</div>`}
      ${done && checkAnswer(q, answer) !== true && html`<div class="fb-answer">정답: <b><${RichText} text=${answerText(q)} /></b></div>`}
    </div>`}
  </div>`;
}

// ---------- 게임 화면 ----------
export function GamePage({ profile, refreshProfile }) {
  const [st, setSt] = useState(null);
  const [pool, setPool] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dice, setDice] = useState(null);
  const [msg, setMsg] = useState('');
  const [choices, setChoices] = useState(null);
  const [battle, setBattle] = useState(null);
  const [popup, setPopup] = useState(null);
  const chooseRef = useRef(null);
  const stats = totalStats(profile);
  const mhp = maxHp(stats);
  const avatarUri = useMemo(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(profile.avatar_cfg, 'portrait')), [JSON.stringify(profile.avatar_cfg)]);

  const load = async () => {
    try {
      const [g, q] = await Promise.all([
        rpc('game_get'),
        sb.from('questions').select('id,type,prompt,data,difficulty').in('type', ['mcq', 'ox']).limit(800),
      ]);
      if (q.error) throw q.error;
      setSt(g);
      setPool(q.data.filter((x) => x.type !== 'mcq' || (x.data.choices || []).length >= 2));
    } catch (e) { setErr(friendlyError(e)); }
  };
  useEffect(() => { load(); }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!st || !pool) return html`<${Loading} text="모험 지도를 펼치는 중…" />`;
  if (!pool.some((x) => x.type === 'mcq')) {
    return html`<div class="page narrow"><div class="card empty"><div class="big-emoji">🗺️</div>
      <p>아직 모험에 쓸 5지선다 문제가 없어요.<br/>선생님이 수업 자료를 올리면 모험을 시작할 수 있어요!</p><a class="btn" href="#/">홈으로</a></div></div>`;
  }

  const hp = st.hp ?? mhp;
  const w = worldInfo(st.world);
  const tile = TILE[st.tile] || TILE[0];
  const z = zoneOf(st.world, ORDER[tile.id] ?? 0);

  const save = async (patch) => {
    const n = { ...st, ...patch };
    setSt(n);
    try { const r = await rpc('game_save', { p_tile: n.tile, p_hp: n.hp, p_checkpoint: n.checkpoint, p_stuck: n.stuck }); setSt({ ...n, rolls_left: r.rolls_left }); } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    return n;
  };
  const useItem = async (kind) => {
    try { const r = await rpc('game_use_item', { p_item: kind }); setSt((s) => ({ ...s, items: r.items, rolls_left: r.rolls_left, bonus_rolls: r.bonus_rolls })); return true; }
    catch (e) { toast('⚠️ ' + friendlyError(e)); return false; }
  };

  // 갈림길에서 고르기
  const choose = (ids) => new Promise((res) => { setChoices(ids); chooseRef.current = (id) => { setChoices(null); res(id); }; });

  // 칸에 도착했을 때
  const arrive = async (s, t) => {
    if (['mob', 'elite', 'boss'].includes(t.type) && !s.defeated.includes(t.id)) {
      setBattle({ enemy: makeEnemy(s.world, t.id), tile: t.id, z: zoneOf(s.world, ORDER[t.id]) });
      return;
    }
    if (t.type === 'chest' && !s.defeated.includes(t.id)) {
      const r = await rpc('game_reward', { p_kind: 'chest', p_tile: t.id, p_z: zoneOf(s.world, ORDER[t.id]) });
      if (r.state) setSt((x) => ({ ...x, ...r.state }));
      setPopup({ icon: '🎁', title: '보물 상자!', lines: [r.coins ? `🪙 +${r.coins}` : '', r.item ? `${ITEM_INFO[r.item][0]} ${ITEM_INFO[r.item][1]}` : '', r.lucky ? '🍀 행운 보너스!' : ''] });
      reward(r); refreshProfile();
      return;
    }
    if (t.type === 'trap') {
      const lose = Math.max(1, Math.round(mhp * 0.2));
      const nhp = Math.max(1, (s.hp ?? mhp) - lose);
      await save({ hp: nhp });
      setPopup({ icon: '⚠️', title: '함정에 빠졌어요!', lines: [`❤️ -${lose}`] });
      return;
    }
    if (t.type === 'rest') {
      await save({ hp: null, checkpoint: t.id });
      setPopup({ icon: '⛲', title: '쉼터', lines: ['체력이 모두 회복됐어요!', '여기가 새 출발점이 돼요 (쓰러지면 여기서 다시 시작)'] });
      return;
    }
    if (t.type === 'island') {
      await save({ stuck: 1 });
      setPopup({ icon: '🏝️', title: '무인도에 도착!', lines: ['다음 차례에 주사위 2개가 같은 숫자(더블)면 바로 탈출해요.', '아니면 한 번 쉬고 나와요.'] });
      return;
    }
    if (t.type === 'gate') setMsg(`🪨 험한 길목! 다음 차례에 주사위 2개 합이 ${t.need} 이상이면 지나갈 수 있어요.`);
  };

  // 한 칸씩 움직이기
  const move = async (s, steps) => {
    let cur = TILE[s.tile];
    for (let i = 0; i < steps; i++) {
      let nextId = cur.next[0];
      if (cur.next.length === 0) break;
      if (cur.next.length > 1) { setMsg('🛤️ 갈림길! 갈 길을 눌러 고르세요.'); nextId = await choose(cur.next); setMsg(''); }
      cur = TILE[nextId];
      s = { ...s, tile: cur.id };
      setSt(s);
      await wait(320);
      const blocks = BLOCKING.includes(cur.type) && !(cur.type !== 'gate' && s.defeated.includes(cur.id));
      if (blocks) break;
    }
    s = await save({ tile: s.tile, stuck: 0 });
    await arrive(s, cur);
  };

  const roll = async () => {
    if (busy || battle) return;
    setBusy(true); setMsg('');
    try {
      const atGate = tile.type === 'gate';
      const two = atGate || st.stuck > 0;
      setDice({ rolling: true, count: two ? 2 : 1 });
      const r = await rpc('game_roll', { p_count: two ? 2 : 1 });
      await wait(700);
      setDice({ values: r.dice, lucky: r.lucky });
      const s = { ...st, rolls_left: r.rolls_left };
      setSt(s);
      if (st.stuck > 0) {
        if (r.dice[0] === r.dice[1]) { setMsg('🎉 더블! 무인도 탈출!'); await move(s, r.dice[0]); }
        else { setMsg('🏝️ 이번엔 쉬어요. 다음 차례엔 나갈 수 있어요.'); await save({ stuck: 0 }); }
      } else if (atGate) {
        const sum = r.dice[0] + r.dice[1];
        if (sum >= tile.need) { setMsg(`💪 ${sum}! 험한 길목을 지나가요!`); await move(s, r.dice[0]); }
        else setMsg(`😅 ${sum}… ${tile.need} 이상이 필요해요. 다음 차례에 다시 도전!`);
      } else {
        await move(s, r.dice[0]);
      }
    } catch (e) { setMsg('⚠️ ' + friendlyError(e)); }
    setBusy(false);
  };

  const endBattle = async ({ won, hp: nhp }) => {
    const b = battle;
    setBattle(null);
    if (won) {
      await save({ hp: nhp });
      try {
        const r = await rpc('game_reward', { p_kind: b.enemy.kind, p_tile: b.tile, p_z: b.z });
        if (r.state) setSt((x) => ({ ...x, ...r.state }));
        reward(r); refreshProfile();
        setPopup({ icon: '🏆', title: `${b.enemy.name} 물리침!`, lines: [`⭐ +${r.xp} XP`, `🪙 +${r.coins}`, r.item ? `${ITEM_INFO[r.item][0]} ${ITEM_INFO[r.item][1]} 획득!` : '', r.lucky ? '🍀 행운 보너스 (1.5배)!' : '', r.next_world ? `🗺️ 다음 지역 "${worldInfo(st.world + 1).name}"(으)로 가요!` : ''] });
      } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    } else {
      try {
        const r = await rpc('game_death');
        setSt((x) => ({ ...x, ...r.state }));
        refreshProfile();
        setPopup({ icon: '😵', title: '쓰러졌어요…', lines: [`🪙 -${r.coin_loss}  ⭐ -${r.xp_loss} XP`, '괜찮아요! 마지막 쉼터에서 체력을 회복하고 다시 시작해요.', '장비를 맞추거나 레벨을 올리면 더 강해져요 💪'] });
      } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    }
  };

  const ti = TILE_INFO[tile.type];
  return html`<div class="page game">
    <div class="game-hud card">
      <div class="hud-world">${w.emoji} <b>월드 ${st.world} · ${w.name}</b> <small class="muted">이 지역 추천 레벨 ${makeEnemy(st.world, 2).lv}</small></div>
      <div class="hud-hp"><span>❤️</span><div class="hpbar me"><div style=${`width:${(hp / mhp) * 100}%`}></div><span>${hp} / ${mhp}</span></div></div>
      <div class="hud-stats">⚔️${stats.atk} 🛡️${stats.def} 🍀${stats.luck}</div>
      <div class="hud-items">${Object.entries(ITEM_INFO).map(([k, [icon, name, desc]]) => html`<button class="btn small" title=${desc}
        disabled=${!(st.items?.[k] > 0) || (k !== 'dice' && hp >= mhp)}
        onClick=${async () => { if (await useItem(k)) { if (k !== 'dice') { const heal = k === 'big_potion' ? mhp : Math.ceil(mhp / 2); await save({ hp: Math.min(mhp, hp + heal) >= mhp ? null : Math.min(mhp, hp + heal) }); toast(`${icon} 체력 회복!`); } else toast('🎲 주사위 +1'); } }}>${icon} ${st.items?.[k] || 0}</button>`)}</div>
    </div>

    <div class="game-bar card">
      <div class="dice-box">${dice ? (dice.rolling ? html`<span class="die rolling">🎲${dice.count > 1 ? '🎲' : ''}</span>` : html`${dice.values.map((v) => html`<span class="die">${DIE[v]}</span>`)}${dice.lucky ? html`<small class="lucky">🍀 행운!</small>` : ''}`) : html`<span class="die idle">🎲</span>`}</div>
      <div class="game-msg">${msg || html`<span class="muted">지금 위치: ${ti[0]} ${ti[1]}</span>`}</div>
      <button class="btn huge primary" disabled=${busy || !!battle || !!choices || st.rolls_left <= 0} onClick=${roll}>
        ${st.stuck > 0 ? '🏝️ 탈출 굴리기' : tile.type === 'gate' ? `🎲🎲 길목 도전 (${tile.need}+)` : '🎲 주사위 굴리기'} <small>(남은 ${st.rolls_left}번)</small></button>
    </div>
    <div class="map-wrap">
      <${GameMap} world=${st.world} tile=${st.tile} defeated=${st.defeated || []} choices=${choices} onChoose=${(id) => chooseRef.current?.(id)} avatarUri=${avatarUri} />
    </div>

    ${st.rolls_left <= 0 && html`<div class="card row-card highlight"><span class="big-emoji">📚</span><div><b>오늘 주사위를 다 썼어요!</b><div class="muted">복습 퀴즈를 끝까지 풀면 주사위를 1번 더 받아요 (하루 최대 3번). 내일 다시 5번이 채워져요.</div></div></div>`}

    <details class="card game-help"><summary><b>❓ 모험 규칙</b></summary>
      <ul>
        <li>하루에 주사위 <b>5번</b>. 복습 퀴즈를 끝까지 풀면 <b>+1번</b>씩 (하루 최대 +3)</li>
        <li>⚔️ 몬스터를 만나면 전투! <b>5지선다를 맞히면 공격</b>(1분), <b>OX를 맞히면 방어</b>(30초)</li>
        <li>공격 피해 = 4 + 공격력×2 − 적 방어 · 방어를 맞히면 (방어력+2)만큼 막아요</li>
        <li>🍀 행운: 크리티컬(1.5배 피해), 보상 1.5배, 주사위 다시 굴리기 확률이 올라가요</li>
        <li>💀 엘리트는 물약이나 주사위 티켓을, 👑 보스를 물리치면 다음 지역으로!</li>
        <li>🪨 험한 길목: 주사위 2개 합이 기준 이상이어야 통과 · 🏝️ 무인도: 더블이면 바로 탈출</li>
        <li>⛲ 쉼터: 체력 회복 + 저장. 쓰러지면 코인과 경험치를 조금(5%) 잃고 쉼터에서 다시 시작해요</li>
        <li>체력은 매일 아침 다시 가득 차요</li>
      </ul>
    </details>

    ${battle && html`<div class="battle-bg"><${Battle} enemy=${battle.enemy} stats=${stats} hp=${hp} items=${st.items || {}} pool=${pool} onEnd=${endBattle} onUseItem=${useItem} cfg=${profile.avatar_cfg} /></div>`}
    ${popup && html`<${Modal} onClose=${() => setPopup(null)}>
      <div class="center"><div class="big-emoji" style="font-size:3.5em">${popup.icon}</div><h2>${popup.title}</h2>
        ${popup.lines.filter(Boolean).map((l) => html`<p>${l}</p>`)}
        <button class="btn big primary" onClick=${() => setPopup(null)}>좋아요!</button></div>
    <//>`}
  </div>`;
}
