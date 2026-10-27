// 📺 수업 모드: 교실 TV에 띄워 정리 단계에서 함께 보는 화면
import { html, useState, useEffect, useMemo } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { signedUrls } from '../lib/files.js';
import { answerText, TYPES, DIFFICULTY } from '../lib/questions.js';
import { Loading, ErrorBox, SpeakBtn, shuffle } from '../components/ui.js';
import { RichText } from '../components/math.js';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];

function buildSlides(lesson, qs, urls) {
  const s = [{ kind: 'title' }];
  if (lesson.summary) s.push({ kind: 'summary' });
  if (lesson.key_points.length) s.push({ kind: 'points' });
  urls.forEach((u, i) => s.push({ kind: 'page', url: u, n: i + 1 }));
  lesson.flashcards.forEach((c) => s.push({ kind: 'card', c }));
  qs.forEach((q, i) => s.push({ kind: 'q', q, n: i + 1, mix: q.type === 'match' ? shuffle(q.data.pairs.map((p) => p[1])) : q.type === 'order' ? shuffle(q.data.items) : [] }));
  s.push({ kind: 'end' });
  return s;
}

export function ClassMode({ lessonId }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [opts, setOpts] = useState({ pages: true, cards: true });

  useEffect(() => {
    (async () => {
      const [l, q] = await Promise.all([
        sb.from('lessons').select('*').eq('id', lessonId).single(),
        sb.from('questions').select('*').eq('lesson_id', lessonId).order('position'),
      ]);
      if (l.error || q.error) throw l.error || q.error;
      const urls = l.data.pages.length ? await signedUrls(l.data.pages) : [];
      setD({ lesson: l.data, qs: q.data, urls });
    })().catch((e) => setErr(friendlyError(e)));
  }, [lessonId]);

  const slides = useMemo(
    () => (d ? buildSlides(d.lesson, d.qs, opts.pages ? d.urls : []).filter((s) => opts.cards || s.kind !== 'card') : []),
    [d, opts.pages, opts.cards],
  );
  const move = (dir) => { setReveal(false); setI((x) => Math.max(0, Math.min(slides.length - 1, x + dir))); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') move(-1);
      if (e.key === 'Enter') setReveal((r) => !r);
      if (e.key === 'Escape') location.hash = '#/t/lessons';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /><a class="btn" href="#/t/lessons">← 돌아가기</a></div>`;
  if (!d) return html`<${Loading} />`;

  const { lesson } = d;
  const s = slides[i];
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  let body;
  if (s.kind === 'title') body = html`<div class="cm-center"><div class="cm-meta">${lesson.subject} ${lesson.unit}</div><h1 class="cm-title">${lesson.title}</h1><div class="cm-sub">오늘 배운 내용을 정리해 봐요 ✨</div></div>`;
  else if (s.kind === 'summary') body = html`<div class="cm-text"><h2>📝 오늘 배운 내용</h2>${lesson.summary.split('\n').filter(Boolean).map((p) => html`<p><${RichText} text=${p} /></p>`)}</div>`;
  else if (s.kind === 'points') body = html`<div class="cm-text"><h2>⭐ 꼭 기억해요</h2><ol>${lesson.key_points.map((k) => html`<li><${RichText} text=${k} /></li>`)}</ol></div>`;
  else if (s.kind === 'page') body = html`<img class="cm-img" src=${s.url} />`;
  else if (s.kind === 'card') body = html`<div class="cm-center" onClick=${() => setReveal(!reveal)}><div class="cm-word"><${RichText} text=${s.c.front} /></div>
    ${reveal ? html`<div class="cm-sub"><${RichText} text=${s.c.back} /></div>` : html`<div class="cm-hint">무슨 뜻일까요? 🤔</div>`}</div>`;
  else if (s.kind === 'q') {
    const q = s.q;
    body = html`<div class="cm-q">
      <div class="cm-meta">문제 ${s.n} · ${TYPES[q.type].label} · ${DIFFICULTY[q.difficulty]}</div>
      <div class="cm-prompt"><${RichText} text=${q.prompt} /></div>
      ${q.type === 'ox' && html`<div class="cm-ox"><span class=${reveal && q.data.answer ? 'on' : ''}>O</span><span class=${reveal && !q.data.answer ? 'on' : ''}>X</span></div>`}
      ${q.type === 'mcq' && html`<div class="cm-choices">${q.data.choices.map((c, k) => html`<div class=${'cm-choice' + (reveal && k + 1 === q.data.answer ? ' on' : '')}>${NUMS[k]} <${RichText} text=${c} /></div>`)}</div>`}
      ${q.type === 'match' && !reveal && html`<div class="cm-two"><div>${q.data.pairs.map((p) => html`<div class="cm-chip">${p[0]}</div>`)}</div>
        <div>${s.mix.map((r) => html`<div class="cm-chip">${r}</div>`)}</div></div>`}
      ${q.type === 'frac' && !reveal && html`<div class="cm-hint">${({ mixed: '대분수로', improper: '가분수로' })[q.data.form] || ''} 답해 보세요 ✍️</div>`}
      ${q.type === 'order' && !reveal && html`<div class="cm-chips">${s.mix.map((r) => html`<span class="cm-chip">${r}</span>`)}</div>`}
      ${reveal && q.type !== 'mcq' && q.type !== 'ox' && html`<div class="cm-answer">${answerText(q).split('\n').map((t) => html`<div><${RichText} text=${t} /></div>`)}</div>`}
      ${reveal && q.data.explanation && html`<div class="cm-explain">💡 <${RichText} text=${q.data.explanation} /></div>`}
    </div>`;
  } else body = html`<div class="cm-center"><div class="cm-word">🎉</div><h1 class="cm-title">오늘도 수고했어요!</h1><div class="cm-sub">태블릿에서 퀴즈를 풀고 경험치를 모아 봐요</div></div>`;

  const canReveal = s.kind === 'q' || s.kind === 'card';
  return html`<div class="classmode">
    <div class="cm-bar">
      <a href="#/t/lessons" class="cm-btn">✕ 나가기</a>
      <span class="cm-progress">${i + 1} / ${slides.length}</span>
      <label class="cm-opt"><input type="checkbox" checked=${opts.pages} onChange=${(e) => { setOpts({ ...opts, pages: e.target.checked }); setI(0); }} /> 판서</label>
      <label class="cm-opt"><input type="checkbox" checked=${opts.cards} onChange=${(e) => { setOpts({ ...opts, cards: e.target.checked }); setI(0); }} /> 낱말 카드</label>
      <button class="cm-btn" onClick=${fullscreen}>⛶ 전체 화면</button>
    </div>
    <div class="cm-stage" key=${i}>${body}</div>
    <div class="cm-nav">
      <button class="cm-btn big" onClick=${() => move(-1)} disabled=${i === 0}>◀ 이전</button>
      ${canReveal && html`<button class="cm-btn big reveal" onClick=${() => setReveal(!reveal)}>${reveal ? '🙈 숨기기' : '👀 정답 보기'}</button>`}
      ${s.kind === 'q' && html`<${SpeakBtn} text=${s.q.prompt} />`}
      <button class="cm-btn big" onClick=${() => move(1)} disabled=${i === slides.length - 1}>다음 ▶</button>
    </div>
  </div>`;
}
