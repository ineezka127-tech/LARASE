import { html, useState, useEffect, useMemo, useRef } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { checkAnswer, answerText, TYPES, DIFFICULTY } from '../lib/questions.js';
import { speak, stopSpeaking, getAutoRead, setAutoRead, ttsSupported } from '../lib/tts.js';
import { Loading, ErrorBox, SpeakBtn, reward, shuffle, toast } from '../components/ui.js';
import { RichText, FractionInput } from '../components/math.js';
import { checkFraction, isComplete } from '../lib/fraction.js';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];

// ---------- 문제 유형별 화면 ----------
function OX({ q, done, answer, onAnswer }) {
  return html`<div class="ox-row">
    ${[true, false].map((v) => {
      let cls = 'ox-btn ' + (v ? 'o' : 'x');
      if (done && v === !!q.data.answer) cls += ' right';
      else if (done && v === answer) cls += ' wrong';
      return html`<button class=${cls} disabled=${done} onClick=${() => onAnswer(v)}>${v ? 'O' : 'X'}</button>`;
    })}
  </div>`;
}

function MCQ({ q, done, answer, onAnswer }) {
  return html`<div class="choices">${q.data.choices.map((c, i) => {
    const n = i + 1;
    let cls = 'choice';
    if (done && n === q.data.answer) cls += ' right';
    else if (done && n === answer) cls += ' wrong';
    return html`<div class="choice-row">
      <button class=${cls} disabled=${done} onClick=${() => onAnswer(n)}><span class="num">${NUMS[i]}</span><span><${RichText} text=${c} /></span></button>
      <${SpeakBtn} text=${`${n}번, ${c}`} />
    </div>`;
  })}</div>`;
}

function Short({ q, done, answer, onAnswer }) {
  const [v, setV] = useState('');
  const ref = useRef();
  useEffect(() => { if (!done) ref.current?.focus(); }, [q.id]);
  return html`<form class="short" onSubmit=${(e) => { e.preventDefault(); if (v.trim()) onAnswer(v.trim()); }}>
    <input ref=${ref} class=${'input huge center' + (done ? (checkAnswer(q, answer) ? ' right' : ' wrong') : '')}
      value=${done ? answer : v} disabled=${done} onInput=${(e) => setV(e.target.value)} placeholder="정답을 써 보세요" />
    ${!done && html`<button class="btn big primary" disabled=${!v.trim()}>확인 ✔</button>`}
  </form>`;
}

function Essay({ q, done, answer, onAnswer }) {
  const [v, setV] = useState('');
  return html`<div class="essay">
    <textarea class="input" rows="5" value=${done ? answer : v} disabled=${done} onInput=${(e) => setV(e.target.value)} placeholder="생각을 2~3문장으로 써 보세요"></textarea>
    ${!done && html`<button class="btn big primary" disabled=${v.trim().length < 2} onClick=${() => onAnswer(v.trim())}>제출하기 📮</button>`}
  </div>`;
}

const PAIR_COLORS = ['#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#fdffb6', '#a0c4ff'];

function Match({ q, done, answer, onAnswer }) {
  const pairs = q.data.pairs;
  const rights = useMemo(() => shuffle(pairs.map((p) => p[1])), [q.id]);
  const [sel, setSel] = useState(null);
  const [map, setMap] = useState({}); // 왼쪽 번호 → 오른쪽 낱말
  const cur = done ? Object.fromEntries((answer || []).map((r, i) => [i, r])) : map;
  const usedBy = (r) => Object.keys(cur).find((k) => cur[k] === r);
  const tapLeft = (i) => {
    if (done) return;
    if (cur[i] != null) { const m = { ...map }; delete m[i]; setMap(m); setSel(i); } else setSel(i);
  };
  const tapRight = (r) => {
    if (done || sel == null) return;
    const m = { ...map };
    const prev = usedBy(r);
    if (prev != null) delete m[prev];
    m[sel] = r;
    setMap(m);
    const next = pairs.findIndex((_, i) => m[i] == null);
    setSel(next >= 0 ? next : null);
  };
  const complete = pairs.every((_, i) => cur[i] != null);
  return html`<div>
    <div class="match">
      <div class="match-col">${pairs.map((p, i) => {
        const color = cur[i] != null ? PAIR_COLORS[i % PAIR_COLORS.length] : '';
        const ok = done && cur[i] === p[1];
        return html`<button class=${'match-item' + (sel === i && !done ? ' sel' : '') + (done ? (ok ? ' right' : ' wrong') : '')}
          style=${color && `background:${color}`} onClick=${() => tapLeft(i)}>${p[0]}${done && !ok ? html`<small>→ ${p[1]}</small>` : ''}</button>`;
      })}</div>
      <div class="match-col">${rights.map((r) => {
        const k = usedBy(r);
        const color = k != null ? PAIR_COLORS[k % PAIR_COLORS.length] : '';
        return html`<button class="match-item" style=${color && `background:${color}`} disabled=${done} onClick=${() => tapRight(r)}>${r}</button>`;
      })}</div>
    </div>
    ${!done && html`<p class="muted center">왼쪽을 누르고, 짝이 되는 오른쪽을 눌러요.</p>
      <button class="btn big primary block" disabled=${!complete} onClick=${() => onAnswer(pairs.map((_, i) => map[i]))}>확인 ✔</button>`}
  </div>`;
}

function Order({ q, done, answer, onAnswer }) {
  const items = q.data.items;
  const pool0 = useMemo(() => {
    let s = shuffle(items);
    for (let t = 0; t < 5 && items.length > 1 && s.every((x, i) => x === items[i]); t++) s = shuffle(items);
    return s;
  }, [q.id]);
  const [picked, setPicked] = useState([]);
  const cur = done ? answer || [] : picked;
  const pool = pool0.filter((x) => !cur.includes(x));
  return html`<div class="order">
    <div class="order-slots">${items.map((_, i) => {
      const v = cur[i];
      const cls = 'order-slot' + (v ? ' filled' : '') + (done ? (v === items[i] ? ' right' : ' wrong') : '');
      return html`<button class=${cls} disabled=${done || !v} onClick=${() => setPicked(picked.filter((x) => x !== v))}>
        <span class="num">${i + 1}</span>${v || ''}${done && v !== items[i] ? html`<small>→ ${items[i]}</small>` : ''}</button>`;
    })}</div>
    ${!done && html`<div class="order-pool">${pool.map((x) => html`<button class="chip big" onClick=${() => setPicked([...picked, x])}>${x}</button>`)}</div>
      <button class="btn big primary block" disabled=${cur.length !== items.length} onClick=${() => onAnswer(picked)}>확인 ✔</button>`}
  </div>`;
}

function FracAnswer({ q, done, answer, onAnswer }) {
  const [v, setV] = useState({ w: '', n: '', d: '' });
  const cur = done ? answer : v;
  const ok = done && checkFraction(q.data, answer).correct;
  return html`<div class="frac-q">
    <${FractionInput} value=${cur} onChange=${setV} disabled=${done} resultClass=${done ? (ok ? 'right' : 'wrong') : ''} />
    ${!done && html`<button class="btn big primary block" disabled=${!isComplete(v)} onClick=${() => onAnswer(v)}>확인 ✔</button>`}
  </div>`;
}

const VIEWS = { ox: OX, mcq: MCQ, short: Short, essay: Essay, match: Match, order: Order, frac: FracAnswer };

// ---------- 퀴즈 진행 ----------
export function QuizPage({ lessonId, profile, query }) {
  const [lesson, setLesson] = useState(null);
  const [list, setList] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState(undefined);
  const [result, setResult] = useState(null); // { correct, xp }
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [finish, setFinish] = useState(null);
  const [err, setErr] = useState(null);
  const [auto, setAuto] = useState(getAutoRead());
  const [round, setRound] = useState(1);

  useEffect(() => {
    (async () => {
      const [l, q] = await Promise.all([
        sb.from('lessons').select('id,title').eq('id', lessonId).maybeSingle(),
        sb.from('questions').select('*').eq('lesson_id', lessonId).order('position'),
      ]);
      if (l.error || q.error) throw l.error || q.error;
      if (!l.data) throw new Error('수업을 찾을 수 없어요.');
      let qs = q.data;
      if (query.d) qs = qs.filter((x) => String(x.difficulty) === query.d);
      if (query.wrong) {
        const { data: at, error } = await sb.from('attempts').select('question_id,is_correct,created_at')
          .eq('user_id', profile.id).eq('lesson_id', lessonId).order('created_at', { ascending: false });
        if (error) throw error;
        const last = {};
        at.forEach((a) => { if (!(a.question_id in last)) last[a.question_id] = a.is_correct; });
        qs = qs.filter((x) => last[x.id] === false);
      }
      setLesson(l.data);
      setList(qs);
    })().catch((e) => setErr(friendlyError(e)));
    return () => stopSpeaking();
  }, []);

  const q = list?.[idx];
  useEffect(() => { if (q && auto) speak(q.prompt); }, [q?.id, round, auto]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /><a class="btn" href="#/">← 홈으로</a></div>`;
  if (!list) return html`<${Loading} />`;
  if (!list.length) return html`<div class="page narrow"><div class="card empty">
    <div class="big-emoji">🎉</div><p>${query.wrong ? '다시 풀 문제가 없어요. 모두 맞혔어요!' : '풀 문제가 없어요.'}</p>
    <a class="btn primary" href=${'#/lesson/' + lessonId}>복습 자료 보기</a> <a class="btn" href="#/">홈으로</a></div></div>`;

  const submit = async (ans) => {
    if (busy || result) return;
    setBusy(true);
    setAnswer(ans);
    const correct = checkAnswer(q, ans);
    let xp = 0;
    try {
      const r = await rpc('submit_answer', { p_question: q.id, p_answer: ans, p_correct: correct === true, p_mode: round > 1 || query.wrong ? 'retry' : 'quiz' });
      xp = r?.xp || 0;
      reward(r);
    } catch (e) {
      toast('⚠️ 기록 저장 실패: ' + friendlyError(e));
    }
    if (correct === true) speak('정답이에요!');
    setResult({ correct, xp, hint: q.type === 'frac' ? checkFraction(q.data, ans).hint : '' });
    setResults([...results, { q, correct }]);
    setBusy(false);
  };

  const next = async () => {
    stopSpeaking();
    if (idx + 1 < list.length) {
      setIdx(idx + 1); setAnswer(undefined); setResult(null);
      return;
    }
    const graded = results.filter((r) => r.correct !== null);
    const right = graded.filter((r) => r.correct).length;
    let bonus = null;
    if (round === 1 && !query.wrong) {
      try { bonus = await rpc('complete_quiz', { p_lesson: lessonId, p_correct: right, p_total: graded.length }); reward(bonus); } catch {}
    }
    setFinish({ right, total: graded.length, essays: results.length - graded.length, bonus });
  };

  const retryWrong = () => {
    const wrong = results.filter((r) => r.correct === false).map((r) => r.q);
    setList(wrong); setIdx(0); setAnswer(undefined); setResult(null); setResults([]); setFinish(null); setRound(round + 1);
  };

  if (finish) {
    const pct = finish.total ? finish.right / finish.total : 1;
    const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : 1;
    const gained = results.length;
    return html`<div class="page narrow">
      <div class="card finish">
        <div class="stars">${[1, 2, 3].map((s) => html`<span class=${s <= stars ? 'on' : ''}>★</span>`)}</div>
        <h1>${pct === 1 ? '완벽해요! 🎉' : pct >= 0.6 ? '잘했어요! 👏' : '끝까지 해냈어요! 💪'}</h1>
        <p class="finish-score">${finish.total > 0 && html`<b>${finish.right}</b> / ${finish.total} 맞힘`}
          ${finish.essays > 0 && html`<br/><small>서술형 ${finish.essays}개는 선생님이 확인해요 📮</small>`}</p>
        ${finish.bonus?.xp > 0 && html`<p class="pill xp">🏁 완주 보너스 +${finish.bonus.xp} XP${finish.bonus.perfect ? ' (만점 2배!)' : ''}</p>`}
        <p class="muted">${gained}문제를 풀었어요.</p>
        <div class="btn-col">
          ${finish.right < finish.total && html`<button class="btn big warn block" onClick=${retryWrong}>💪 틀린 문제 다시 풀기</button>`}
          <a class="btn big block" href=${'#/lesson/' + lessonId}>📖 복습 자료 다시 보기</a>
          <a class="btn big primary block" href="#/">🏠 홈으로</a>
        </div>
      </div>
    </div>`;
  }

  const View = VIEWS[q.type];
  const done = !!result;
  return html`<div class="page quiz">
    <div class="quiz-top">
      <a class="back" href=${'#/lesson/' + lessonId}>← ${lesson.title}</a>
      ${ttsSupported && html`<label class="toggle"><input type="checkbox" checked=${auto} onChange=${(e) => { setAuto(e.target.checked); setAutoRead(e.target.checked); }} /> 자동 읽기</label>`}
    </div>
    <div class="dots">${list.map((_, i) => {
      const r = results[i];
      const cls = 'dot' + (i === idx ? ' cur' : '') + (r ? (r.correct === false ? ' bad' : ' good') : '');
      return html`<span class=${cls}></span>`;
    })}</div>
    <div class="card question" key=${q.id + round}>
      <div class="q-meta"><span class="pill">${TYPES[q.type].icon} ${TYPES[q.type].label}</span><span class=${'pill d' + q.difficulty}>${DIFFICULTY[q.difficulty]}</span><span class="muted">${idx + 1} / ${list.length}</span></div>
      <div class="q-prompt"><${RichText} text=${q.prompt} /> <${SpeakBtn} text=${q.prompt} /></div>
      <${View} q=${q} done=${done} answer=${answer} onAnswer=${submit} />
    </div>

    ${done && html`<div class=${'feedback card ' + (result.correct === true ? 'good' : result.correct === false ? 'bad' : 'essay')}>
      <div class="fb-title">
        ${result.correct === true ? '🎉 정답이에요!' : result.correct === false ? '🤔 아쉬워요!' : '📮 제출했어요! 선생님이 확인할 거예요.'}
        ${result.xp > 0 && html`<span class="xp-pop">+${result.xp} XP</span>`}
      </div>
      ${result.hint && html`<div class="fb-hint">💡 ${result.hint}</div>`}
      ${result.correct === false && q.type !== 'match' && q.type !== 'order' && html`<div class="fb-answer">정답: <b><${RichText} text=${answerText(q)} /></b></div>`}
      ${result.correct === null && q.data.model_answer && html`<div class="fb-answer"><b>예시 답안</b><br/>${q.data.model_answer}</div>`}
      ${q.data.explanation && html`<div class="fb-explain">📘 <${RichText} text=${q.data.explanation} /> <${SpeakBtn} text=${q.data.explanation} /></div>`}
      <button class="btn huge primary block" onClick=${next}>${idx + 1 < list.length ? '다음 문제 ▶' : '결과 보기 🏁'}</button>
    </div>`}
  </div>`;
}
