import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { computeBadges, XP_GUIDE, levelTitle } from '../lib/xp.js';
import { Loading, ErrorBox, XPBar, toast, fmtDate } from '../components/ui.js';
import { AvatarPicker } from './auth.js';

const KIND_LABEL = {
  view: '📖 복습 자료 보기', correct: '✅ 처음 맞힘', comeback: '💪 오답 극복', review: '🔁 다시 맞힘',
  try: '🙂 도전', essay: '✍️ 서술형 제출', essay_graded: '🌟 서술형 채점', quiz_done: '🏁 퀴즈 완주', daily: '🔥 출석 보너스',
};

export function MePage({ profile, refreshProfile }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState(profile.display_name || '');
  const [editAvatar, setEditAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, e] = await Promise.all([
        sb.from('attempts').select('id,is_correct').eq('user_id', profile.id),
        sb.from('events').select('kind,ref,xp,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
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
      <button class="me-big-avatar" onClick=${() => setEditAvatar(!editAvatar)} title="캐릭터 바꾸기">${profile.avatar}<small>바꾸기</small></button>
      <div class="hero-body">
        <div class="name-edit">
          <input class="input big" maxlength="12" value=${name} onInput=${(e) => setName(e.target.value)} />
          <button class="btn" disabled=${!name.trim() || name.trim() === profile.display_name} onClick=${() => save({ display_name: name.trim() })}>이름 저장</button>
        </div>
        <div class="muted">아이디: ${profile.login_id} · ${levelTitle(profile.level)}</div>
        <${XPBar} xp=${profile.xp} />
      </div>
    </section>
    ${editAvatar && html`<section class="card"><h2>캐릭터 고르기</h2>
      <${AvatarPicker} level=${profile.level} value=${profile.avatar} onPick=${(a) => { save({ avatar: a }); setEditAvatar(false); }} />
    </section>`}

    <section class="stat-grid">
      <div class="card stat"><div class="stat-num">${profile.level}</div><div>레벨</div></div>
      <div class="card stat"><div class="stat-num">${profile.xp}</div><div>경험치</div></div>
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
        <h2>⭐ 경험치 얻는 방법</h2>
        <table class="table">${XP_GUIDE.map(([i, t, x]) => html`<tr><td>${i}</td><td>${t}</td><td class="right"><b>${x}</b></td></tr>`)}</table>
      </div>
      <div class="card">
        <h2>📜 최근 기록</h2>
        <table class="table">${data.events.filter((e) => e.xp > 0).slice(0, 12).map((e) => html`<tr>
          <td class="muted">${fmtDate(e.created_at)}</td><td>${KIND_LABEL[e.kind] || e.kind}</td><td class="right"><b>+${e.xp}</b></td></tr>`)}</table>
      </div>
    </section>

    <div class="center"><button class="btn ghost" onClick=${() => sb.auth.signOut()}>로그아웃</button></div>
  </div>`;
}
