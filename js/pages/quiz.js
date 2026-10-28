import { html, useState, useEffect, useMemo, useRef } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { checkAnswer, answerText, TYPES, DIFFICULTY, TIERS, tierOf } from '../lib/questions.js';
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
// ---------- 문제 고르기: 같은 내용이라도 매번 다르게 ----------
// 지난번에 틀린 문제 → 아직 안 푼 문제 → 나머지 순으로 뽑고, 쉬운 문제부터. 5지선다는 보기 순서도 섞어요.
function prepare(q) {
  if (q.type !== 'mcq') return q;
  const order = shuffle(q.data.choices.map((_, i) => i));
  return { ...q, _map: order, data: { ...q.data, choices: order.map((i) => q.data.choices[i]), answer: order.indexOf(q.data.answer - 1) + 1 } };
}

// 🎯 맞춤 난이도: 맞히면 한 단계 위, 틀리면 한 단계 아래 문제를 골라요 (1 쉬움 ~ 4 도전)
// 같은 난이도 안에서는 지난번에 틀린 문제 → 안 푼 문제 → 맞힌 문제 순서
function pickNext(cands, level, last, used) {
  let best = null;
  let bestScore = Infinity;
  for (const q of cands) {
    if (used.has(q.id)) continue;
    const seen = last[q.id] === false ? 0 : !(q.id in last) ? 1 : 3;
    const score = Math.abs(q.difficulty - level) * 10 + seen + Math.random() * 2;
    if (score < bestScore) { bestScore = score; best = q; }
  }
  return best ? prepare(best) : null;
}
const nextLevel = (level, correct) => (correct === true ? Math.min(4, level + 1) : correct === false ? Math.max(1, level - 1) : level);

// 처음 난이도: 이 문제들을 전에 잘 풀었으면 '보통'부터, 아니면 '쉬움'부터 (몸풀기)
function startLevel(cands, last) {
  const seen = cands.filter((q) => q.id in last && last[q.id] !== null);
  if (seen.length < 3) return 1;
  return seen.filter((q) => last[q.id]).length / seen.length >= 0.75 ? 2 : 1;
}

// 내 그룹 문제 + 공통 문제. 모자라면 가까운 그룹에서 빌려 와요
const NEAR = { 가: ['나', '다'], 나: ['다', '가'], 다: ['나', '가'] };
function forTier(pool, tier, n) {
  const mine = pool.filter((q) => !q.tier || q.tier === tier);
  if (mine.length >= n) return mine;
  const out = [...mine];
  for (const t of NEAR[tier]) {
    if (out.length >= n) break;
    out.push(...pool.filter((q) => q.tier === t));
  }
  return out;
}

function drawQuestions(pool, last, n) {
  const wrong = shuffle(pool.filter((q) => last[q.id] === false));
  const fresh = shuffle(pool.filter((q) => !(q.id in last)));
  const rest = shuffle(pool.filter((q) => q.id in last && last[q.id] !== false));
  return [...wrong, ...fresh, ...rest].slice(0, n).sort((a, b) => a.difficulty - b.difficulty).map(prepare);
}

async function loadQuiz(source, profile, query) {
  let lessons;
  let title;
  let backHref = '#/';
  if (source.lesson) {
    const { data, error } = await sb.from('lessons').select('id,title').eq('id', source.lesson);
    if (error) throw error;
    if (!data.length) throw new Error('수업을 찾을 수 없어요.');
    lessons = data;
    title = data[0].title;
    backHref = '#/lesson/' + source.lesson;
  } else if (source.topic) {
    const [t, l] = await Promise.all([
      sb.from('topics').select('*').eq('id', source.topic).maybeSingle(),
      sb.from('lessons').select('id,title').eq('topic_id', source.topic),
    ]);
    if (t.error || l.error) throw t.error || l.error;
    if (!t.data) throw new Error('주제를 찾을 수 없어요.');
    lessons = l.data;
    title = `🗂️ ${t.data.name} 전체 퀴즈`;
  } else {
    const r = source.range || {};
    let qb = sb.from('lessons').select('id,title,lesson_date,subject');
    if (r.from) qb = qb.gte('lesson_date', r.from).lte('lesson_date', r.to);
    if (r.s) qb = qb.eq('subject', r.s);
    const { data, error } = await qb;
    if (error) throw error;
    lessons = data;
    const md = (x) => x.slice(5).replace('-', '/');
    title = `🧠 ${r.s ? r.s + ' ' : ''}${r.from ? `${md(r.from)}~${md(r.to)} ` : ''}총정리 퀴즈`;
  }
  const ids = lessons.map((l) => l.id);
  if (!ids.length) return { title, backHref, list: [], ref: null };
  const [q, at] = await Promise.all([
    sb.from('questions').select('*').in('lesson_id', ids).order('position'),
    sb.from('attempts').select('question_id,is_correct,created_at').eq('user_id', profile.id).in('lesson_id', ids).order('created_at', { ascending: false }),
  ]);
  if (q.error || at.error) throw q.error || at.error;
  const last = {};
  at.data.forEach((a) => { if (!(a.question_id in last)) last[a.question_id] = a.is_correct; });
  let pool = q.data;
  const group = !source.lesson;
  if (group) pool = pool.filter((x) => x.type !== 'essay');          // 묶음 퀴즈는 서술형 빼기
  if (query.d) {
    const all = pool.filter((x) => String(x.difficulty) === query.d);
    const mine = all.filter((x) => profile.role === 'teacher' || !x.tier || x.tier === tierOf(profile));
    pool = mine.length ? mine : all;
  }
  const n = group ? 10 : 12;
  let list;
  let adaptive = null;
  if (query.wrong) list = shuffle(pool.filter((x) => last[x.id] === false)).map(prepare);
  else if (query.d || profile.role === 'teacher') list = drawQuestions(pool, last, n);   // 난이도를 직접 골랐거나 선생님 미리보기
  else {
    const cands = forTier(pool, tierOf(profile), n);
    const level = startLevel(cands, last);
    const first = pickNext(cands, level, last, new Set());
    list = first ? [first] : [];
    adaptive = { cands, last, n: Math.min(n, cands.length), level };
  }
  const ref = source.lesson ? null : source.topic ? 'topic:' + source.topic : `range:${source.range?.from || ''}:${source.range?.to || ''}:${source.range?.s || ''}`;
  return { title, backHref, list, ref, lessonId: source.lesson || null, adaptive };
}

export function QuizPage({ source, profile, query }) {
  const [meta, setMeta] = useState(null);
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
  const [level, setLevel] = useState(1);

  useEffect(() => {
    loadQuiz(source, profile, query).then((m) => { setMeta(m); setList(m.list); setLevel(m.adaptive?.level || 1); }).catch((e) => setErr(friendlyError(e)));
    return () => stopSpeaking();
  }, []);
  const lessonId = meta?.lessonId;

  const q = list?.[idx];
  useEffect(() => { if (q && auto) speak(q.prompt); }, [q?.id, round, auto]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /><a class="btn" href="#/">← 홈으로</a></div>`;
  if (!list) return html`<${Loading} />`;
  if (!list.length) return html`<div class="page narrow"><div class="card empty">
    <div class="big-emoji">🎉</div><p>${query.wrong ? '다시 풀 문제가 없어요. 모두 맞혔어요!' : '풀 문제가 없어요.'}</p>
    ${lessonId && html`<a class="btn primary" href=${'#/lesson/' + lessonId}>복습 자료 보기</a>`} <a class="btn" href="#/">홈으로</a></div></div>`;

  const submit = async (ans) => {
    if (busy || result) return;
    setBusy(true);
    setAnswer(ans);
    const correct = checkAnswer(q, ans);
    let xp = 0;
    try {
      const stored = q._map ? q._map[ans - 1] + 1 : ans;   // 섞인 보기 번호 → 원래 번호로 저장
      const r = await rpc('submit_answer', { p_question: q.id, p_answer: stored, p_correct: correct === true, p_mode: round > 1 || query.wrong ? 'retry' : lessonId ? 'quiz' : 'set' });
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

  const adaptiveRound = meta?.adaptive && round === 1;
  const total = adaptiveRound ? meta.adaptive.n : list.length;
  const next = async () => {
    stopSpeaking();
    if (idx + 1 < list.length) {
      setIdx(idx + 1); setAnswer(undefined); setResult(null);
      return;
    }
    if (adaptiveRound && idx + 1 < total) {
      const lv = nextLevel(level, result?.correct);
      const nq = pickNext(meta.adaptive.cands, lv, meta.adaptive.last, new Set(list.map((x) => x.id)));
      if (nq) {
        setLevel(lv); setList([...list, nq]); setIdx(idx + 1); setAnswer(undefined); setResult(null);
        return;
      }
    }
    const graded = results.filter((r) => r.correct !== null);
    const right = graded.filter((r) => r.correct).length;
    let bonus = null;
    if (round === 1 && !query.wrong) {
      try {
        bonus = lessonId
          ? await rpc('complete_quiz', { p_lesson: lessonId, p_correct: right, p_total: graded.length })
          : await rpc('complete_set', { p_ref: meta.ref, p_correct: right, p_total: graded.length });
        reward(bonus);
      } catch {}
    }
    setFinish({ right, total: graded.length, essays: results.length - graded.length, bonus });
  };

  // 🔁 같은 내용, 새로 뽑은 문제로 다시
  const restart = async () => {
    setList(null); setFinish(null); setIdx(0); setAnswer(undefined); setResult(null); setResults([]); setRound(1);
    try { const m = await loadQuiz(source, profile, query); setMeta(m); setList(m.list); setLevel(m.adaptive?.level || 1); } catch (e) { setErr(friendlyError(e)); }
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
          <button class="btn big block" onClick=${restart}>🔁 다른 문제로 또 풀기</button>
          ${lessonId && html`<a class="btn big block" href=${'#/lesson/' + lessonId}>📖 복습 자료 다시 보기</a>`}
          <a class="btn big primary block" href="#/">🏠 홈으로</a>
        </div>
      </div>
    </div>`;
  }

  const View = VIEWS[q.type];
  const done = !!result;
  return html`<div class="page quiz">
    <div class="quiz-top">
      <a class="back" href=${meta.backHref}>← ${meta.title}</a>
      ${ttsSupported && html`<label class="toggle"><input type="checkbox" checked=${auto} onChange=${(e) => { setAuto(e.target.checked); setAutoRead(e.target.checked); }} /> 자동 읽기</label>`}
    </div>
    <div class="dots">${Array.from({ length: total }, (_, i) => {
      const r = results[i];
      const cls = 'dot' + (i === idx ? ' cur' : '') + (r ? (r.correct === false ? ' bad' : ' good') : '');
      return html`<span class=${cls}></span>`;
    })}</div>
    <div class="card question" key=${q.id + round}>
      <div class="q-meta"><span class="pill">${TYPES[q.type].icon} ${TYPES[q.type].label}</span><span class=${'pill d' + q.difficulty}>${DIFFICULTY[q.difficulty]}</span><span class="muted">${idx + 1} / ${total}</span></div>
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
      ${adaptiveRound && result.correct === true && level < 4 && idx + 1 < total && html`<div class="level-up-note">🔺 다음 문제는 조금 더 어려워요!</div>`}
      <button class="btn huge primary block" onClick=${next}>${idx + 1 < total ? '다음 문제 ▶' : '결과 보기 🏁'}</button>
    </div>`}
  </div>`;
}
