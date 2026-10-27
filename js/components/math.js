// 분수 표시 · 분수 답 입력(숫자판 + 펜) 화면 부품
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { splitFractions } from '../lib/fraction.js';
import { recognize, loadModel } from '../lib/digits.js';

// 분수 하나를 진짜 분수 모양으로
export function Frac({ w, n, d, size = '' }) {
  return html`<span class=${'frac ' + size}>
    ${w != null && w !== '' && html`<span class="frac-w">${w}</span>`}
    ${n != null && n !== '' && html`<span class="frac-nd"><span class="frac-n">${n}</span><span class="frac-d">${d}</span></span>`}
  </span>`;
}

// 글 속의 {2 1/3}, {7/3}, 7/3 을 분수 모양으로 바꿔서 보여 줍니다
export function RichText({ text }) {
  const parts = splitFractions(text);
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
  return html`${parts.map((p) => (typeof p === 'string' ? p : html`<${Frac} ...${p} />`))}`;
}

// ---------- 펜으로 숫자 쓰기 ----------
function PenPad({ onResult, resetKey }) {
  const canvas = useRef();
  const strokes = useRef([]);
  const cur = useRef(null);
  const penSeen = useRef(false);
  const timer = useRef(null);
  const [status, setStatus] = useState('');

  const redraw = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#1f2440';
    for (const st of strokes.current) {
      ctx.beginPath();
      st.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (st.length === 1) ctx.lineTo(st[0].x + 0.1, st[0].y);
      ctx.stroke();
    }
  };

  const clear = () => { strokes.current = []; cur.current = null; clearTimeout(timer.current); setStatus(''); redraw(); };

  useEffect(() => {
    const c = canvas.current;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr; c.height = r.height * dpr;
      redraw();
    };
    fit();
    window.addEventListener('resize', fit);
    loadModel().catch(() => setStatus('⚠️ 글씨 인식 준비 실패 — 숫자판을 써 주세요'));
    return () => { window.removeEventListener('resize', fit); clearTimeout(timer.current); };
  }, []);

  useEffect(() => { clear(); }, [resetKey]);

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    if (e.pointerType === 'pen') penSeen.current = true;
    else if (e.pointerType === 'touch' && penSeen.current) return;   // 펜을 쓰는 중이면 손바닥 터치 무시
    e.preventDefault();
    canvas.current.setPointerCapture(e.pointerId);
    clearTimeout(timer.current);
    cur.current = [pos(e)];
    strokes.current.push(cur.current);
    redraw();
  };
  const move = (e) => {
    if (!cur.current) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) cur.current.push(pos(ev));
    redraw();
  };
  const up = () => {
    if (!cur.current) return;
    cur.current = null;
    clearTimeout(timer.current);
    timer.current = setTimeout(run, 800);   // 잠깐 멈추면 인식 (다음 획을 그으면 다시 읽음)
  };
  const run = async () => {
    if (!strokes.current.length) return;
    setStatus('🔍 읽는 중…');
    try {
      const r = await recognize(strokes.current, canvas.current.getBoundingClientRect().height);
      setStatus('');
      onResult(r);
    } catch {
      setStatus('⚠️ 글씨 인식 준비 실패 — 숫자판을 써 주세요');
    }
  };

  return html`<div class="penpad-wrap">
    <canvas ref=${canvas} class="penpad" onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}></canvas>
    <div class="penpad-hint">${status || (strokes.current.length ? '' : '여기에 숫자를 크게 써요 ✏️')}</div>
    <button type="button" class="btn small penpad-clear" onClick=${() => { clear(); onResult(null); }}>🧽 다시 쓰기</button>
  </div>`;
}

// ---------- 분수 답 입력 ----------
const SLOTS = [['w', '자연수'], ['n', '분자'], ['d', '분모']];

function getMode() {
  try { return localStorage.getItem('bokseup-input-mode') || 'pad'; } catch { return 'pad'; }
}

export function FractionInput({ value, onChange, disabled, resultClass = '' }) {
  const [slot, setSlot] = useState('n');
  const [mode, setModeState] = useState(getMode());
  const [guess, setGuess] = useState(null);   // 펜 인식 결과
  const setMode = (m) => { setModeState(m); try { localStorage.setItem('bokseup-input-mode', m); } catch {} };

  const v = value || { w: '', n: '', d: '' };
  const put = (k, s) => onChange({ ...v, [k]: s });

  const press = (key) => {
    const curv = String(v[slot] ?? '');
    if (key === 'back') put(slot, curv.slice(0, -1));
    else if (key === 'clear') put(slot, '');
    else if (curv.length < 3) put(slot, curv === '0' ? key : curv + key);
  };
  const nextSlot = () => setSlot(slot === 'w' ? 'n' : slot === 'n' ? 'd' : 'w');

  const onPen = (r) => {
    setGuess(r);
    if (r?.text) put(slot, r.text.slice(0, 3));
  };
  const fixDigit = (i, digit) => {
    const chars = String(v[slot] || '').split('');
    chars[i] = String(digit);
    put(slot, chars.join(''));
    setGuess({ ...guess, digits: guess.digits.map((g, k) => (k === i ? { ...g, digit, prob: 1, alts: [] } : g)), sure: true });
  };
  const choose = (k) => { setSlot(k); setGuess(null); };

  return html`<div class=${'frac-input ' + resultClass}>
    <div class="fi-display">
      ${['w'].map((k) => html`<button type="button" class=${'fi-slot whole' + (slot === k && !disabled ? ' on' : '') + (v.w === '' || v.w == null ? ' empty' : '')}
        disabled=${disabled} onClick=${() => choose(k)}>${v.w || html`<small>자연수<br/><span class="fi-sub">없으면 비워요</span></small>`}</button>`)}
      <div class="fi-nd">
        <button type="button" class=${'fi-slot' + (slot === 'n' && !disabled ? ' on' : '')} disabled=${disabled} onClick=${() => choose('n')}>${v.n || html`<small>분자</small>`}</button>
        <div class="fi-bar"></div>
        <button type="button" class=${'fi-slot' + (slot === 'd' && !disabled ? ' on' : '')} disabled=${disabled} onClick=${() => choose('d')}>${v.d || html`<small>분모</small>`}</button>
      </div>
    </div>

    ${!disabled && html`<div class="fi-panel">
      <div class="fi-tabs">
        <span class="fi-now">✍️ <b>${SLOTS.find((s) => s[0] === slot)[1]}</b> 칸에 넣어요</span>
        <button type="button" class=${'tab' + (mode === 'pad' ? ' on' : '')} onClick=${() => setMode('pad')}>🔢 숫자판</button>
        <button type="button" class=${'tab' + (mode === 'pen' ? ' on' : '')} onClick=${() => setMode('pen')}>✏️ 펜으로 쓰기</button>
      </div>
      ${mode === 'pad'
        ? html`<div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((k) => html`
            <button type="button" class=${'key' + (k.length > 1 ? ' fn' : '')} onClick=${() => press(k)}>${k === 'back' ? '⌫' : k === 'clear' ? '지우기' : k}</button>`)}</div>`
        : html`<div>
            <${PenPad} onResult=${onPen} resetKey=${slot} />
            ${guess?.digits?.length > 0 && html`<div class=${'pen-result' + (guess.sure ? '' : ' unsure')}>
              <div>${guess.sure ? '✅' : '🤔'} <b class="pen-read">${guess.text}</b> (으)로 읽었어요${guess.sure ? '' : ' — 맞는지 확인해 주세요'}</div>
              ${guess.digits.some((g) => g.alts.length && g.prob < 0.85) && html`<div class="pen-alts">
                ${guess.digits.map((g, i) => g.prob < 0.85 && g.alts.length > 0 && html`<span class="pen-alt-row">
                  ${guess.digits.length > 1 ? `${i + 1}번째 숫자: ` : '혹시 '}
                  ${g.alts.map((a) => html`<button type="button" class="chip" onClick=${() => fixDigit(i, a.digit)}>${a.digit}</button>`)}
                  ${guess.digits.length > 1 ? '' : '인가요?'}
                </span>`)}
              </div>`}
            </div>`}
          </div>`}
      <div class="btn-row center-row">
        <button type="button" class="btn" onClick=${nextSlot}>다음 칸 ▶</button>
      </div>
    </div>`}
  </div>`;
}
