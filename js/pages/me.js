import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { computeBadges, XP_GUIDE, levelTitle } from '../lib/xp.js';
import { Loading, ErrorBox, XPBar, toast, fmtDate } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { ITEM } from '../lib/avatar.js';

const KIND_LABEL = {
  view: '📖 복습 자료 보기', correct: '✅ 처음 맞힘', comeback: '💪 오답 극복', review: '🔁 다시 맞힘',
  try: '🙂 도전', essay: '✍️ 서술형 제출', essay_graded: '🌟 서술형 채점', quiz_done: '🏁 퀴즈 완주', daily: '🔥 출석 보너스',
  levelup: '⭐ 레벨 업', buy: '🛍️ 상점', teacher_coins: '🎁 선생님 칭찬', coin_start: '🪙 시작 코인',
};

export function MePage({ profile, refreshProfile }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState(profile.display_name || '');

  useEffect(() => {
    (async () => {
      const [a, e] = await Promise.all([
        sb.from('attempts').select('id,is_correct').eq('user_id', profile.id),
        sb.from('events').select('kind,ref,xp,coins,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
      ]);
      if (a.error || e.error) throw a.error || e.error;
      setData({ attempts: a.data, events: e.data });
    })().catch((x) => setErr(friendlyError(x)));
  }, []);

  const save = async (patch) => {
    const { error } = await sb.from('profiles').update(patch).eq('id', profile.id);
    if (error) toast('⚠️ ' + friendlyError(error));
    else { toast('저장했어요 ✔'); refreshProfile(); }
  };

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!data) return html`<${Loading} />`;

  const badges = computeBadges({ profile, ...data });
  const solved = data.attempts.length;
  const right = data.attempts.filter((a) => a.is_correct).length;

  return html`<div class="page">
    <section class="card me-card">
      <a class="me-photo" href="#/avatar" title="꾸미기"><${AvatarImg} cfg=${profile.avatar_cfg} size=${120} /><small>🧑‍🎨 꾸미기</small></a>
      <div class="hero-body">
        <div class="name-edit">
          <input class="input big" maxlength="12" value=${name} onInput=${(e) => setName(e.target.value)} />
          <button class="btn" disabled=${!name.trim() || name.trim() === profile.display_name} onClick=${() => save({ display_name: name.trim() })}>이름 저장</button>
        </div>
        <div class="muted">아이디: ${profile.login_id} · ${levelTitle(profile.level)}</div>
        <${XPBar} xp=${profile.xp} />
      </div>
    </section>

    <section class="stat-grid">
      <div class="card stat"><div class="stat-num">${profile.level}</div><div>레벨</div></div>
      <div class="card stat"><div class="stat-num">${profile.xp}</div><div>경험치</div></div>
      <a class="card stat" href="#/shop"><div class="stat-num">🪙${profile.coins ?? 0}</div><div>코인</div></a>
      <div class="card stat"><div class="stat-num">🔥${profile.streak}</div><div>연속 출석</div></div>
      <div class="card stat"><div class="stat-num">${solved}</div><div>푼 문제</div></div>
      <div class="card stat"><div class="stat-num">${solved ? Math.round((right / solved) * 100) : 0}%</div><div>정답률</div></div>
      <div class="card stat"><div class="stat-num">${profile.stat_points}<small>/${profile.skill_points}</small></div><div>스탯/스킬 포인트</div></div>
    </section>

    <section>
      <h2>🏅 배지</h2>
      <div class="badge-grid">${badges.map((b) => html`<div class=${'card badge' + (b.got ? ' got' : '')}>
        <div class="badge-icon">${b.got ? b.icon : '🔒'}</div><b>${b.name}</b><small>${b.desc}</small></div>`)}</div>
    </section>

    <section class="two-col">
      <div class="card">
        <h2>⭐ 경험치·🪙 코인 얻는 방법</h2>
        <table class="table"><tr><th></th><th>활동</th><th class="right">경험치</th><th class="right">코인</th></tr>${XP_GUIDE.map(([i, t, x, c]) => html`<tr><td>${i}</td><td>${t}</td><td class="right"><b>${x}</b></td><td class="right coin-text">${c}</td></tr>`)}</table>
      </div>
      <div class="card">
        <h2>📜 최근 기록</h2>
        <table class="table">${data.events.filter((e) => e.xp > 0 || e.coins).slice(0, 14).map((e) => html`<tr>
          <td class="muted">${fmtDate(e.created_at)}</td><td>${KIND_LABEL[e.kind] || e.kind}${e.kind === 'buy' && ITEM[e.ref] ? ` · ${ITEM[e.ref].name}` : ''}${e.kind === 'teacher_coins' && e.ref ? ` · ${e.ref}` : ''}</td>
          <td class="right">${e.xp > 0 && html`<b>+${e.xp}</b>`}</td><td class="right coin-text">${e.coins ? (e.coins > 0 ? `+${e.coins}🪙` : `${e.coins}🪙`) : ''}</td></tr>`)}</table>
      </div>
    </section>

    <div class="center"><button class="btn ghost" onClick=${() => sb.auth.signOut()}>로그아웃</button></div>
  </div>`;
}
