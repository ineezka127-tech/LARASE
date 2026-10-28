import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { Loading, ErrorBox, XPBar, fmtDate, subjectStyle } from '../components/ui.js';
import { AvatarImg } from '../components/avatar-ui.js';
import { GroupedLessons } from '../components/grouped.js';
import { loadCatalog } from '../lib/groups.js';

// 학생 화면에서 함께 쓰는 진도 정보 불러오기
export async function loadProgress(userId) {
  const [lessons, questions, attempts, views] = await Promise.all([
    sb.from('lessons').select('id,title,subject,unit,topic_id,lesson_date,created_at').order('lesson_date', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('questions').select('id,lesson_id,type'),
    sb.from('attempts').select('id,question_id,lesson_id,is_correct,score,feedback,graded_at,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('events').select('ref,created_at').eq('user_id', userId).eq('kind', 'view'),
  ]);
  for (const r of [lessons, questions, attempts, views]) if (r.error) throw r.error;
  const viewed = new Set(views.data.map((v) => v.ref));
  const byLesson = {};
  for (const l of lessons.data) byLesson[l.id] = { total: 0, done: new Set(), wrong: new Set() };
  for (const q of questions.data) if (byLesson[q.lesson_id]) byLesson[q.lesson_id].total += 1;
  // 최신 기록부터 보며 문제별 마지막 결과로 판단
  const seen = new Set();
  for (const a of attempts.data) {
    const p = byLesson[a.lesson_id];
    if (!p || seen.has(a.question_id)) continue;
    seen.add(a.question_id);
    if (a.is_correct === false) p.wrong.add(a.question_id);
    else p.done.add(a.question_id);
  }
  const catalog = await loadCatalog();
  return { lessons: lessons.data, byLesson, viewed, attempts: attempts.data, ...catalog };
}

export function StudentHome({ profile }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => loadProgress(profile.id).then(setData).catch((e) => setErr(friendlyError(e)));
  useEffect(() => { load(); }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!data) return html`<${Loading} />`;

  const { lessons, byLesson, viewed, attempts } = data;
  const fresh = lessons.filter((l) => !viewed.has(l.id)).slice(0, 3);
  const weekAgo = Date.now() - 7 * 86400000;
  const replies = attempts.filter((a) => a.graded_at && new Date(a.graded_at).getTime() > weekAgo);
  const groupActions = ({ kind, topic, range, subject: subj, period }) => {
    if (kind === 'topic') return html`<a class="btn small primary" href=${'#/quiz/topic/' + topic.id}>🎯 주제 전체 퀴즈</a>`;
    if (kind === 'range') {
      const q = new URLSearchParams({ ...(range[0] ? { from: range[0], to: range[1] } : {}), ...(subj ? { s: subj } : {}) });
      return html`<a class="btn small primary" href=${'#/quiz/range?' + q}>${period ? '🧠 이 기간 총정리 퀴즈' : '🧠 이 주 총정리 퀴즈'}</a>`;
    }
    if (kind === 'subject') return html`<a class="btn small" href=${'#/quiz/range?' + new URLSearchParams({ s: subj, ...(range[0] ? { from: range[0], to: range[1] } : {}) })}>🧠 과목 총정리 퀴즈</a>`;
    return null;
  };
  const wrongTotal = Object.values(byLesson).reduce((s, p) => s + p.wrong.size, 0);

  return html`<div class="page">
    <section class="hero card">
      <a class="hero-avatar" href="#/avatar" title="꾸미기"><${AvatarImg} cfg=${profile.avatar_cfg} mode="full" size=${120} /></a>
      <div class="hero-body">
        <h1>${profile.display_name}님, 안녕하세요!</h1>
        <${XPBar} xp=${profile.xp} />
        <div class="hero-stats">
          <span class="pill">🔥 ${profile.streak || 0}일 연속</span>
          <span class="pill">⭐ ${profile.xp} XP</span>
          <a class="pill coin" href="#/shop">🪙 ${profile.coins ?? 0} 코인</a>
          ${wrongTotal > 0 && html`<span class="pill warn">💪 다시 풀 문제 ${wrongTotal}개</span>`}
        </div>
      </div>
    </section>

    ${!profile.avatar_cfg && html`<a class="card row-card highlight" href="#/avatar">
      <span class="big-emoji">🧑‍🎨</span><div><b>내 캐릭터를 만들어 보세요!</b><div class="muted">얼굴, 머리 모양을 고르고 🪙 코인으로 옷도 살 수 있어요.</div></div>
    </a>`}

    ${replies.length > 0 && html`<section>
      <h2>💌 선생님이 확인했어요</h2>
      <div class="list">${replies.slice(0, 3).map((a) => {
        const l = lessons.find((x) => x.id === a.lesson_id);
        return html`<a class="card row-card" href=${'#/lesson/' + a.lesson_id}>
          <span class="big-emoji">${a.score === 2 ? '🌟' : a.score === 1 ? '👍' : '💪'}</span>
          <div><b>${l?.title || '수업'}</b> 서술형 — ${a.score === 2 ? '아주 잘했어요!' : a.score === 1 ? '조금만 더!' : '다시 해 봐요'}
          ${a.feedback && html`<div class="muted">“${a.feedback}”</div>`}</div>
        </a>`;
      })}</div>
    </section>`}

    ${fresh.length > 0 && html`<section>
      <h2>✨ 새로 올라온 수업</h2>
      <div class="grid">${fresh.map((l) => html`<a class="card lesson-card new" href=${'#/lesson/' + l.id} style=${subjectStyle(l.subject)}>
        <div class="badge-new">NEW</div>
        <div class="lesson-meta">${l.subject}${l.unit && ' · ' + l.unit}</div>
        <h3>${l.title}</h3>
        <div class="muted">${fmtDate(l.lesson_date)}</div>
      </a>`)}</div>
    </section>`}

    <section>
      <h2>📚 내 수업</h2>
      ${lessons.length === 0 && html`<div class="card empty">아직 올라온 수업이 없어요. 😊</div>`}
      ${lessons.length > 0 && html`<${GroupedLessons} lessons=${lessons} subjects=${data.subjects} topics=${data.topics} storageKey="student-groups"
        groupActions=${groupActions} renderLesson=${(l) => {
          const p = byLesson[l.id];
          const pct = p.total ? Math.round((p.done.size / p.total) * 100) : 0;
          const topic = data.topics.find((t) => t.id === l.topic_id);
          return html`<div class="card lesson-card" key=${l.id} style=${subjectStyle(l.subject)}>
            <div class="lesson-meta">${l.subject}${topic && ' · ' + topic.name} · ${fmtDate(l.lesson_date)}</div>
            <h3>${l.title} ${pct === 100 && '🏅'}</h3>
            <div class="progress"><div style=${`width:${pct}%`}></div></div>
            <div class="muted small">${p.done.size} / ${p.total} 문제 완료${p.wrong.size ? ` · 다시 풀 문제 ${p.wrong.size}개` : ''}</div>
            <div class="lesson-actions">
              <a class="btn" href=${'#/lesson/' + l.id}>📖 복습</a>
              <a class="btn primary" href=${'#/quiz/' + l.id}>🎯 퀴즈</a>
              ${p.wrong.size > 0 && html`<a class="btn warn" href=${'#/quiz/' + l.id + '?wrong=1'}>💪 오답</a>`}
            </div>
          </div>`;
        }} />`}
    </section>
  </div>`;
}
