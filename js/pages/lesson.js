import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { signedUrls } from '../lib/files.js';
import { DIFFICULTY, tierOf } from '../lib/questions.js';
import { liveReport } from '../lib/live.js';
import { Loading, ErrorBox, SpeakBtn, Modal, reward, fmtDate } from '../components/ui.js';
import { RichText } from '../components/math.js';

export function Flashcards({ cards }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.length) return html`<div class="card empty">낱말 카드가 없어요.</div>`;
  const c = cards[i];
  const move = (d) => { setFlip(false); setI((i + d + cards.length) % cards.length); };
  return html`<div class="flash-wrap">
    <div class=${'flashcard' + (flip ? ' flipped' : '')} onClick=${() => setFlip(!flip)}>
      <div class="flash-inner">
        <div class="flash-face front"><div class="flash-text"><${RichText} text=${c.front} /></div><small>눌러서 뜻 보기 👆</small></div>
        <div class="flash-face back"><div class="flash-text sm"><${RichText} text=${c.back} /></div><small>${c.front}</small></div>
      </div>
    </div>
    <div class="flash-nav">
      <button class="btn big" onClick=${() => move(-1)}>◀</button>
      <span>${i + 1} / ${cards.length}</span>
      <${SpeakBtn} text=${flip ? c.back : c.front} />
      <button class="btn big" onClick=${() => move(1)}>▶</button>
    </div>
  </div>`;
}

export function PageImages({ paths }) {
  const [urls, setUrls] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!paths.length) { setUrls([]); return; }
    signedUrls(paths).then(setUrls).catch((e) => setErr(friendlyError(e)));
  }, [paths.join()]);
  if (err) return html`<${ErrorBox} error=${err} />`;
  if (!urls) return html`<${Loading} />`;
  if (!urls.length) return html`<div class="card empty">판서 자료가 없어요.</div>`;
  return html`<div class="pages">${urls.map((u, i) => html`<img class="page-img" src=${u} alt=${`판서 ${i + 1}쪽`} loading="lazy" onClick=${() => setZoom(u)} />`)}
    ${zoom && html`<div class="zoom" onClick=${() => setZoom(null)}><img src=${zoom} /><span class="zoom-close">✕</span></div>`}
  </div>`;
}

export function LessonView({ lessonId, profile }) {
  const [lesson, setLesson] = useState(null);
  const [qs, setQs] = useState([]);
  const [tab, setTab] = useState('summary');
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState(false);

  useEffect(() => {
    (async () => {
      const [l, q] = await Promise.all([
        sb.from('lessons').select('*').eq('id', lessonId).maybeSingle(),
        sb.from('questions').select('id,difficulty,tier').eq('lesson_id', lessonId),
      ]);
      if (l.error || q.error) throw l.error || q.error;
      if (!l.data) throw new Error('수업을 찾을 수 없어요.');
      setLesson(l.data);
      setQs(q.data);
      if (!l.data.summary && l.data.pages.length) setTab('pages');
      rpc('record_view', { p_lesson: lessonId }).then(reward).catch(() => {});
      liveReport(profile, { page: 'lesson', lesson_id: lessonId, title: l.data.title, question_id: null, draft: null, answered: false, correct: null, q_index: null, q_total: null });
    })().catch((e) => setErr(friendlyError(e)));
  }, [lessonId]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /><a class="btn" href="#/">← 홈으로</a></div>`;
  if (!lesson) return html`<${Loading} />`;

  const tabs = [
    ['summary', '📝 요약'],
    ['points', '⭐ 핵심'],
    ['cards', '🃏 낱말 카드'],
    ['pages', '🖼️ 판서'],
  ];
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const myTier = tierOf(profile);
  const mineQs = qs.filter((q) => profile?.role === 'teacher' || !q.tier || q.tier === myTier);
  (mineQs.length ? mineQs : qs).forEach((q) => { counts[q.difficulty] = (counts[q.difficulty] || 0) + 1; });
  const keyText = lesson.key_points.map((k, i) => `${i + 1}. ${k}`).join('\n');

  return html`<div class="page">
    <a class="back" href="#/">← 홈</a>
    <div class="lesson-head">
      <div class="lesson-meta">${lesson.subject}${lesson.unit && ' · ' + lesson.unit} · ${fmtDate(lesson.lesson_date)}</div>
      <h1>${lesson.title} <${SpeakBtn} text=${lesson.title} /></h1>
    </div>
    <div class="tabs">${tabs.map(([k, label]) => html`<button class=${'tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}>${label}</button>`)}</div>

    ${tab === 'summary' && html`<div class="card reading">
      <div class="reading-tools"><${SpeakBtn} text=${lesson.summary} label="읽어 주기" /></div>
      ${(lesson.summary || '요약이 아직 없어요.').split('\n').filter(Boolean).map((p) => html`<p><${RichText} text=${p} /></p>`)}
    </div>`}
    ${tab === 'points' && html`<div class="card reading">
      <div class="reading-tools"><${SpeakBtn} text=${keyText} label="읽어 주기" /></div>
      ${lesson.key_points.length === 0 && html`<p class="muted">핵심 정리가 아직 없어요.</p>`}
      <ol class="key-points">${lesson.key_points.map((k) => html`<li><span><${RichText} text=${k} /></span> <${SpeakBtn} text=${k} /></li>`)}</ol>
    </div>`}
    ${tab === 'cards' && html`<${Flashcards} cards=${lesson.flashcards} />`}
    ${tab === 'pages' && html`<${PageImages} paths=${lesson.pages} />`}

    ${qs.length > 0 && html`<div class="sticky-cta">
      <button class="btn huge primary block" onClick=${() => setPick(true)}>🎯 퀴즈 풀러 가기 ${profile?.role === 'teacher' ? html`<small>(전체 ${qs.length}문제)</small>` : html`<small>(한 번에 ${Math.min(12, qs.length)}문제)</small>`}</button>
    </div>`}

    ${pick && html`<${Modal} onClose=${() => setPick(false)}>
      <h2>어떤 문제를 풀까요?</h2>
      ${profile?.role !== 'teacher' && mineQs.length < qs.length && html`<p class="muted small">${myTier} 그룹 문제 ${mineQs.length}개${mineQs.some((q) => !q.tier) ? ' (공통 문제 포함)' : ''} 중에서 나와요</p>`}
      <div class="pick-list">
        <a class="btn big primary block" href=${'#/quiz/' + lessonId}>🎯 나에게 맞춰 풀기 <small>(맞히면 점점 어려워져요)</small></a>
        ${[1, 2, 3, 4, 5].filter((d) => counts[d]).map((d) => html`<a class="btn big block" href=${`#/quiz/${lessonId}?d=${d}`}>
          ${['', '🌱', '🌿', '🌳', '🏔️', '🌟'][d]} ${DIFFICULTY[d]} 문제 (${counts[d]})</a>`)}
      </div>
      <button class="btn ghost block" onClick=${() => setPick(false)}>닫기</button>
    <//>`}
  </div>`;
}
