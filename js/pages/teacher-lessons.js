import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { TYPES, DIFFICULTY, FRAC_FORMS, emptyQuestion, parseAIResult, validateQuestion, buildPrompt, buildVariantPrompt, flashcardQuestions, PROMPT_TYPES, PROMPT_LEVELS, DEFAULT_PROMPT_OPTS, TIERS, TIER_INFO, promptTotal } from '../lib/questions.js';
import { loadCatalog, remember, store } from '../lib/groups.js';
import { GroupedLessons } from '../components/grouped.js';
import { fracToken } from '../lib/fraction.js';
import { RichText } from '../components/math.js';
import { imageToJpeg, pdfPageCount, pdfToJpegs, uploadJpeg, removeFiles, signedUrls, parsePageRange } from '../lib/files.js';
import { Loading, ErrorBox, Modal, toast, fmtDate, go } from '../components/ui.js';

const GRADES = [1, 2, 3];

// ---------- 수업 목록 ----------
export function LessonList() {
  const [list, setList] = useState(null);
  const [cat, setCat] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { loadCatalog().then(setCat).catch((e) => setErr(friendlyError(e))); }, []);

  const load = async () => {
    const { data, error } = await sb.from('lessons').select('id,title,subject,unit,topic_id,lesson_date,published,grades,pages,questions(count)')
      .order('lesson_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) setErr(friendlyError(error)); else setList(data);
  };
  useEffect(() => { load(); }, []);

  const togglePublish = async (l) => {
    const { error } = await sb.from('lessons').update({ published: !l.published }).eq('id', l.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else load();
  };
  const remove = async (l) => {
    if (!confirm(`"${l.title}" 수업을 지울까요?\n문제와 학생들의 풀이 기록도 함께 지워져요.`)) return;
    await removeFiles(l.pages);
    const { error } = await sb.from('lessons').delete().eq('id', l.id);
    if (error) toast('⚠️ ' + friendlyError(error)); else load();
  };

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!list || !cat) return html`<${Loading} />`;

  return html`<div class="page">
    <div class="page-head"><h1>📚 수업 자료</h1><div class="btn-row"><a class="btn" href="#/t/subjects">📚 과목·주제 관리</a><a class="btn primary" href="#/t/lesson/new">➕ 새 수업 자료</a></div></div>
    ${list.length === 0 && html`<div class="card empty">아직 만든 수업이 없어요. 오른쪽 위 <b>새 수업 자료</b>를 눌러 시작하세요.</div>`}
    ${list.length > 0 && html`<${GroupedLessons} lessons=${list} subjects=${cat.subjects} topics=${cat.topics} storageKey="teacher-groups"
      groupActions=${({ kind, topic, range, subject }) => kind === 'topic'
        ? html`<a class="btn small" href=${'#/quiz/topic/' + topic.id}>👀 주제 퀴즈 미리보기</a>`
        : kind === 'range' ? html`<a class="btn small" href=${'#/quiz/range?' + new URLSearchParams({ ...(range[0] ? { from: range[0], to: range[1] } : {}), ...(subject ? { s: subject } : {}) })}>👀 총정리 퀴즈 미리보기</a>` : null}
      renderLesson=${(l) => html`<div class="card lesson-tcard" key=${l.id}>
        <div class="lesson-meta">${fmtDate(l.lesson_date)} · ${l.subject || '과목 없음'}${cat.topics.find((t) => t.id === l.topic_id) ? ' · ' + cat.topics.find((t) => t.id === l.topic_id).name : ''}</div>
        <b class="lr-title">${l.title}</b>
        <div class="muted small">문제 ${l.questions?.[0]?.count ?? 0}개 · 판서 ${l.pages.length}장 · ${l.grades.length ? l.grades.map((g) => g + '학년').join(', ') : '전체 학년'}</div>
        <div class="btn-row">
          <button class=${'btn small ' + (l.published ? 'good' : '')} onClick=${() => togglePublish(l)}>${l.published ? '✅ 공개 중' : '🙈 숨김'}</button>
          <a class="btn small" href=${'#/t/lesson/' + l.id}>✏️ 편집</a>
          <a class="btn small" href=${'#/class/' + l.id}>📺</a>
          <a class="btn small" href=${'#/lesson/' + l.id}>👀</a>
          <button class="btn small ghost" onClick=${() => remove(l)}>🗑️</button>
        </div>
      </div>`} />`}
  </div>`;
}

// ---------- 문제 하나 편집 ----------
function QuestionEditor({ q, index, total, onChange, onMove, onDelete, error }) {
  const d = q.data;
  const set = (patch) => onChange({ ...q, ...patch });
  const setData = (patch) => onChange({ ...q, data: { ...d, ...patch } });
  const lines = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);

  const changeType = (type) => {
    if (type === q.type) return;
    const fresh = emptyQuestion(type);
    onChange({ ...fresh, id: q.id, prompt: q.prompt, difficulty: q.difficulty, tier: q.tier });
  };

  return html`<div class=${'card q-edit' + (error ? ' has-error' : '')}>
    <div class="q-edit-head">
      <b>${index + 1}.</b>
      ${(q.set_no || 1) > 1 && html`<span class="pill">세트 ${q.set_no}</span>`}
      ${q.source === 'auto' && html`<span class="pill good">🃏 자동</span>`}
      <select class="input" value=${q.type} onChange=${(e) => changeType(e.target.value)}>
        ${Object.entries(TYPES).map(([k, t]) => html`<option value=${k}>${t.icon} ${t.label}</option>`)}
      </select>
      <select class="input" value=${q.tier || ''} title="이 문제를 풀 그룹" onChange=${(e) => set({ tier: e.target.value || null })}>
        <option value="">공통</option>${TIERS.map((t) => html`<option value=${t}>${t} 그룹</option>`)}
      </select>
      <select class="input" value=${q.difficulty} onChange=${(e) => set({ difficulty: Number(e.target.value) })}>
        ${[1, 2, 3, 4].map((n) => html`<option value=${n}>${DIFFICULTY[n]}</option>`)}
      </select>
      <span class="spacer"></span>
      <button class="btn small ghost" disabled=${index === 0} onClick=${() => onMove(-1)}>▲</button>
      <button class="btn small ghost" disabled=${index === total - 1} onClick=${() => onMove(1)}>▼</button>
      <button class="btn small ghost" onClick=${onDelete}>🗑️</button>
    </div>
    ${error && html`<div class="error-box small">${error}</div>`}
    <textarea class="input" rows="2" placeholder="문제" value=${q.prompt} onInput=${(e) => set({ prompt: e.target.value })}></textarea>

    ${q.type === 'ox' && html`<div class="btn-row">정답:
      <button class=${'btn small ' + (d.answer ? 'primary' : '')} onClick=${() => setData({ answer: true })}>O</button>
      <button class=${'btn small ' + (!d.answer ? 'primary' : '')} onClick=${() => setData({ answer: false })}>X</button></div>`}

    ${q.type === 'mcq' && html`<div class="mcq-edit">${[0, 1, 2, 3, 4].map((i) => html`<label class="mcq-opt">
      <input type="radio" name=${'ans' + q.id} checked=${d.answer === i + 1} onChange=${() => setData({ answer: i + 1 })} />
      <input class="input" placeholder=${`보기 ${i + 1}`} value=${d.choices[i] || ''}
        onInput=${(e) => { const c = [...d.choices]; while (c.length < 5) c.push(''); c[i] = e.target.value; setData({ choices: c }); }} />
    </label>`)}<div class="muted small">● 가 정답</div></div>`}

    ${q.type === 'short' && html`<label>정답 (여러 개면 / 로 구분)
      <input class="input" value=${d.answers.join(' / ')} onChange=${(e) => setData({ answers: e.target.value.split('/').map((s) => s.trim()).filter(Boolean) })} /></label>`}

    ${q.type === 'match' && html`<label>짝 (한 줄에 하나씩: 왼쪽 = 오른쪽)
      <textarea class="input" rows="4" value=${d.pairs.map((p) => `${p[0]} = ${p[1]}`).join('\n')}
        onChange=${(e) => setData({ pairs: lines(e.target.value).map((l) => { const [a, ...b] = l.split('='); return [a.trim(), b.join('=').trim()]; }).filter((p) => p[0] && p[1]) })}></textarea></label>`}

    ${q.type === 'order' && html`<label>올바른 순서대로 한 줄에 하나씩
      <textarea class="input" rows="4" value=${d.items.join('\n')} onChange=${(e) => setData({ items: lines(e.target.value) })}></textarea></label>`}

    ${q.type === 'essay' && html`<label>예시 답안<textarea class="input" rows="2" value=${d.model_answer} onInput=${(e) => setData({ model_answer: e.target.value })}></textarea></label>
      <label>채점 핵심 낱말 (쉼표로 구분)<input class="input" value=${(d.keywords || []).join(', ')} onChange=${(e) => setData({ keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></label>`}

    ${q.type === 'frac' && html`<div class="frac-edit">
      <div>정답:
        <input class="input num-in" inputmode="numeric" placeholder="자연수" value=${d.answer?.w ?? ''} onInput=${(e) => setData({ answer: { ...d.answer, w: e.target.value === '' ? null : Number(e.target.value) } })} />
        <span class="frac-edit-nd">
          <input class="input num-in" inputmode="numeric" placeholder="분자" value=${d.answer?.n ?? ''} onInput=${(e) => setData({ answer: { ...d.answer, n: e.target.value === '' ? null : Number(e.target.value) } })} />
          <input class="input num-in" inputmode="numeric" placeholder="분모" value=${d.answer?.d ?? ''} onInput=${(e) => setData({ answer: { ...d.answer, d: e.target.value === '' ? null : Number(e.target.value) } })} />
        </span>
        <span class="muted small">→ <${RichText} text=${fracToken(d.answer || {})} /></span>
      </div>
      <div class="btn-row">
        <select class="input" value=${d.form || 'any'} onChange=${(e) => setData({ form: e.target.value })}>
          ${Object.entries(FRAC_FORMS).map(([k, label]) => html`<option value=${k}>${label}</option>`)}
        </select>
        <label class="check"><input type="checkbox" checked=${!!d.lowest} onChange=${(e) => setData({ lowest: e.target.checked })} /> 기약분수만 정답</label>
      </div>
      <div class="muted small">💡 문제 글에 분수를 쓸 때는 {7/3}, 대분수는 {2 1/3}처럼 중괄호로 감싸면 분수 모양으로 보여요.</div>
    </div>`}

    ${q.type !== 'essay' && html`<label>해설 (선택)<input class="input" value=${d.explanation || ''} onInput=${(e) => setData({ explanation: e.target.value })} /></label>`}
  </div>`;
}

// 저장 전 정리: 빈 보기를 지우고 정답 번호를 맞춤
function cleanQuestion(q, position, lessonId) {
  const data = { ...q.data };
  if (q.type === 'mcq') {
    const kept = [];
    let ans = 1;
    data.choices.forEach((c, i) => { if (c.trim()) { kept.push(c.trim()); if (i + 1 === data.answer) ans = kept.length; } });
    data.choices = kept;
    data.answer = ans;
  }
  return { id: q.id, lesson_id: lessonId, position, type: q.type, difficulty: q.difficulty, tier: q.tier || null, prompt: q.prompt.trim(), data, set_no: q.set_no || 1, source: q.source || 'manual' };
}

// ---------- AI 결과 가져오기 ----------
function PromptOptions({ opts, setOpts }) {
  const toggle = (t) => setOpts({ ...opts, types: opts.types.includes(t) ? opts.types.filter((x) => x !== t) : [...opts.types, t] });
  const tiers = { ...DEFAULT_PROMPT_OPTS.tiers, ...(opts.tiers || {}) };
  const setTier = (t, n) => setOpts({ ...opts, tiers: { ...tiers, [t]: n } });
  return html`<div class="prompt-opts">
    <div class="tier-counts">${TIERS.map((t) => html`<label class=${'tier-count t-' + t + (tiers[t] > 0 ? '' : ' off')} title=${TIER_INFO[t].level}>
      <span class="tier-badge">${t}</span><span><b>${TIER_INFO[t].name.slice(5)}</b><small>${TIER_INFO[t].level}</small></span>
      <select class="input" value=${tiers[t]} onChange=${(e) => setTier(t, Number(e.target.value))}>
        ${[0, 4, 6, 8, 10, 12].map((n) => html`<option value=${n}>${n ? n + '문제' : '안 만듦'}</option>`)}</select></label>`)}
      <span class="muted small">모두 ${promptTotal(opts)}문제</span></div>
    <label>그룹 안 난이도 곡선 <select class="input" value=${opts.level} onChange=${(e) => setOpts({ ...opts, level: e.target.value })}>
      ${Object.entries(PROMPT_LEVELS).map(([k, [label]]) => html`<option value=${k}>${label}</option>`)}</select></label>
    <div class="opt-types">문제 유형: ${Object.entries(PROMPT_TYPES).map(([k, label]) => html`<label class="check"><input type="checkbox" checked=${opts.types.includes(k)} onChange=${() => toggle(k)} /> ${label}</label>`)}</div>
  </div>`;
}

function AIImport({ onImport, lesson, questions }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [kind, setKind] = useState('new');   // new: 처음 만들기 / variant: 다른 문제 세트
  const [mode, setMode] = useState('replace');
  const [opts, setOptsS] = useState({ ...DEFAULT_PROMPT_OPTS, ...remember('prompt-opts', DEFAULT_PROMPT_OPTS) });
  const setOpts = (o) => { setOptsS(o); store('prompt-opts', o); };
  const prompt = kind === 'variant' ? buildVariantPrompt(lesson, questions, opts) : buildPrompt(opts);

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); toast('지시문을 복사했어요 ✔'); }
    catch { setErr('복사가 안 되면 아래 "지시문 보기"를 눌러 직접 복사해 주세요.'); }
  };
  const doImport = () => {
    setErr('');
    try {
      const r = parseAIResult(text);
      if (!r.questions.length && !r.lesson.summary) throw new Error('가져올 내용이 없어요.');
      onImport(r, kind === 'variant' ? 'newset' : mode);
      setText('');
      toast(`문제 ${r.questions.length}개를 가져왔어요 ✔`);
      if (r.errors.length) setErr('일부 문제는 빠졌어요:\n' + r.errors.join('\n'));
    } catch (e) { setErr(e.message); }
  };

  return html`<div class="card ai-box">
    <h2>🤖 클로드로 복습 자료·퀴즈 만들기</h2>
    <div class="tabs">
      <button class=${'tab' + (kind === 'new' ? ' on' : '')} onClick=${() => setKind('new')}>✨ 처음 만들기</button>
      <button class=${'tab' + (kind === 'variant' ? ' on' : '')} disabled=${!questions.length} onClick=${() => setKind('variant')}>🔁 같은 내용, 다른 문제 세트</button>
    </div>
    ${kind === 'variant' && html`<p class="muted small">지금 있는 문제와 겹치지 않는 <b>새 문제 세트</b>를 만들어요. 학생 퀴즈는 여러 세트에서 섞어서 나와서, 같은 문제를 외워 버리지 않아요. (자료를 다시 첨부하지 않아도 돼요)</p>`}
    <${PromptOptions} opts=${opts} setOpts=${setOpts} />
    <ol class="steps">
      <li><button class="btn small primary" onClick=${copy}>📋 지시문 복사</button>
        <details><summary class="muted small">지시문 보기</summary><textarea class="input mono" rows="8" readonly value=${prompt}></textarea></details></li>
      <li><a class="btn small" href="https://claude.ai/new" target="_blank" rel="noopener">claude.ai 열기 ↗</a> 새 대화에서 ${kind === 'new' ? html`<b>수업 자료(PDF·판서 이미지)를 첨부</b>하고 ` : ''}지시문을 붙여넣어 보내기</li>
      <li>클로드 답변 아래의 <b>복사</b> 버튼을 눌러 답변을 복사한 뒤, 아래 칸에 붙여넣기</li>
    </ol>
    <textarea class="input mono" rows="6" placeholder="여기에 클로드의 답변을 붙여넣으세요" value=${text} onInput=${(e) => setText(e.target.value)}></textarea>
    <div class="btn-row">
      ${kind === 'new' && html`<label><input type="radio" checked=${mode === 'replace'} onChange=${() => setMode('replace')} /> 문제 바꾸기</label>
      <label><input type="radio" checked=${mode === 'append'} onChange=${() => setMode('append')} /> 문제 추가하기</label>`}
      <button class="btn primary" disabled=${!text.trim()} onClick=${doImport}>${kind === 'variant' ? '새 세트로 가져오기 ⬇' : '가져오기 ⬇'}</button>
    </div>
    ${err && html`<div class="error-box pre">${err}</div>`}
  </div>`;
}

// ---------- 판서·자료 올리기 ----------
function PagesEditor({ lessonId, pages, onChange }) {
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState('');
  const [pdfAsk, setPdfAsk] = useState(null); // { file, count, range }

  useEffect(() => {
    const need = pages.filter((p) => !urls[p]);
    if (!need.length) return;
    signedUrls(need).then((us) => {
      const m = { ...urls };
      need.forEach((p, i) => { m[p] = us[i]; });
      setUrls(m);
    }).catch(() => {});
  }, [pages.join()]);

  const addBlobs = async (blobs) => {
    const added = [];
    for (let i = 0; i < blobs.length; i++) {
      setBusy(`올리는 중… ${i + 1} / ${blobs.length}`);
      added.push(await uploadJpeg(lessonId, blobs[i]));
    }
    return added;
  };

  const onFiles = async (fileList) => {
    const files = [...fileList];
    let all = [...pages];
    try {
      for (const f of files) {
        if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
          setBusy('PDF 읽는 중…');
          const count = await pdfPageCount(f);
          if (count > 20) { setBusy(''); setPdfAsk({ file: f, count, range: '1-20', base: all }); return; }
          const imgs = await pdfToJpegs(f, parsePageRange(`1-${count}`, count), (a, b) => setBusy(`PDF 변환 중… ${a} / ${b}`));
          all = [...all, ...(await addBlobs(imgs))];
        } else if (f.type.startsWith('image/')) {
          setBusy('사진 줄이는 중…');
          all = [...all, ...(await addBlobs([await imageToJpeg(f)]))];
        } else {
          toast(`⚠️ ${f.name}: PDF나 이미지 파일만 올릴 수 있어요`);
        }
        onChange(all);
      }
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy('');
  };

  const convertRange = async () => {
    const { file, count, range, base } = pdfAsk;
    const nums = parsePageRange(range, count);
    if (!nums.length) { toast('쪽 번호를 확인해 주세요'); return; }
    setPdfAsk(null);
    try {
      const imgs = await pdfToJpegs(file, nums, (a, b) => setBusy(`PDF 변환 중… ${a} / ${b}`));
      onChange([...base, ...(await addBlobs(imgs))]);
    } catch (e) { toast('⚠️ ' + friendlyError(e)); }
    setBusy('');
  };

  const move = (i, dir) => {
    const a = [...pages];
    [a[i], a[i + dir]] = [a[i + dir], a[i]];
    onChange(a);
  };
  const del = async (i) => {
    if (!confirm('이 장을 지울까요?')) return;
    await removeFiles([pages[i]]);
    onChange(pages.filter((_, k) => k !== i));
  };

  return html`<div class="card">
    <h2>🖼️ 판서·자료 올리기 <small class="muted">학생들이 "판서" 탭에서 봐요</small></h2>
    <p class="muted small">아이캔노트는 <b>PDF 또는 이미지(PNG/JPG)로 저장</b>해서 올려 주세요. PDF는 쪽마다 그림으로 바뀌고, 저장 공간을 아끼려고 크기를 줄여서 저장해요.</p>
    <label class=${'drop' + (busy ? ' busy' : '')}>
      <input type="file" multiple accept="application/pdf,image/*" disabled=${!!busy} onChange=${(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      ${busy || '📂 여기를 눌러 파일 고르기 (여러 개 가능)'}
    </label>
    <div class="thumbs">${pages.map((p, i) => html`<div class="thumb">
      ${urls[p] ? html`<img src=${urls[p]} />` : html`<div class="thumb-ph">…</div>`}
      <div class="thumb-bar"><span>${i + 1}</span>
        <button disabled=${i === 0} onClick=${() => move(i, -1)}>◀</button>
        <button disabled=${i === pages.length - 1} onClick=${() => move(i, 1)}>▶</button>
        <button onClick=${() => del(i)}>✕</button></div>
    </div>`)}</div>
    ${pdfAsk && html`<${Modal} onClose=${() => setPdfAsk(null)}>
      <h2>PDF가 ${pdfAsk.count}쪽이에요</h2>
      <p>판서 탭에 넣을 쪽을 골라 주세요. (예: <code>1-5, 8</code>)</p>
      <input class="input big" value=${pdfAsk.range} onInput=${(e) => setPdfAsk({ ...pdfAsk, range: e.target.value })} />
      <div class="btn-row"><button class="btn primary" onClick=${convertRange}>변환하기</button><button class="btn ghost" onClick=${() => setPdfAsk(null)}>취소</button></div>
    <//>`}
  </div>`;
}

// ---------- 수업 편집 ----------
export function LessonEditor({ lessonId }) {
  const isNew = lessonId === 'new';
  const [lesson, setLesson] = useState(null);
  const [qs, setQs] = useState([]);
  const [origIds, setOrigIds] = useState([]);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qErrors, setQErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [cat, setCat] = useState({ subjects: [], topics: [] });
  useEffect(() => { loadCatalog().then(setCat).catch(() => {}); }, []);

  useEffect(() => {
    if (isNew) {
      setLesson({ id: crypto.randomUUID(), title: '', subject: '', unit: '', topic_id: null, lesson_date: new Date().toLocaleDateString('sv-SE'),
        grades: [], summary: '', key_points: [], flashcards: [], pages: [], published: false, _new: true });
      return;
    }
    (async () => {
      const [l, q] = await Promise.all([
        sb.from('lessons').select('*').eq('id', lessonId).single(),
        sb.from('questions').select('*').eq('lesson_id', lessonId).order('position'),
      ]);
      if (l.error || q.error) throw l.error || q.error;
      setLesson(l.data);
      setQs(q.data);
      setOrigIds(q.data.map((x) => x.id));
    })().catch((e) => setErr(friendlyError(e)));
  }, [lessonId]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} /></div>`;
  if (!lesson) return html`<${Loading} />`;

  const upd = (patch) => { setLesson({ ...lesson, ...patch }); setDirty(true); };
  const updQs = (next) => { setQs(next); setDirty(true); };

  const maxSet = () => Math.max(1, ...qs.map((q) => q.set_no || 1));
  const onImport = (r, mode) => {
    if (mode === 'newset') {
      const n = maxSet() + 1;
      updQs([...qs, ...r.questions.map((q) => ({ ...q, set_no: n, source: 'ai' }))]);
      return;
    }
    const L = r.lesson;
    upd({
      title: lesson.title || L.title, subject: lesson.subject || L.subject, unit: lesson.unit || L.unit,
      summary: L.summary || lesson.summary,
      key_points: L.key_points.length ? L.key_points : lesson.key_points,
      flashcards: L.flashcards.length ? L.flashcards : lesson.flashcards,
    });
    updQs(mode === 'append' ? [...qs, ...r.questions.map((q) => ({ ...q, set_no: maxSet() }))] : r.questions.map((q) => ({ ...q, set_no: 1, source: 'ai' })));
  };

  const save = async ({ thenPreview = false } = {}) => {
    if (!lesson.title.trim()) { toast('⚠️ 수업 제목을 써 주세요'); window.scrollTo(0, 0); return; }
    const errs = {};
    qs.forEach((q) => { const e = validateQuestion(q); if (e) errs[q.id] = e; });
    setQErrors(errs);
    if (Object.keys(errs).length) { toast(`⚠️ 고칠 문제가 ${Object.keys(errs).length}개 있어요 (빨간 칸)`); return; }
    setSaving(true);
    try {
      const { _new, questions, created_at, ...row } = lesson;
      row.title = row.title.trim();
      row.unit = cat.topics.find((t) => t.id === row.topic_id)?.name || '';
      const r1 = await sb.from('lessons').upsert(row);
      if (r1.error) throw r1.error;
      const rows = qs.map((q, i) => cleanQuestion(q, i, lesson.id));
      if (rows.length) {
        const r2 = await sb.from('questions').upsert(rows);
        if (r2.error) throw r2.error;
      }
      const removed = origIds.filter((id) => !qs.some((q) => q.id === id));
      if (removed.length) {
        const r3 = await sb.from('questions').delete().in('id', removed);
        if (r3.error) throw r3.error;
      }
      setOrigIds(qs.map((q) => q.id));
      setLesson({ ...lesson, _new: false });
      setDirty(false);
      toast('저장했어요 ✔');
      if (thenPreview) go('#/lesson/' + lesson.id);
      else if (isNew) history.replaceState(null, '', '#/t/lesson/' + lesson.id);
    } catch (e) { toast('⚠️ 저장 실패: ' + friendlyError(e)); }
    setSaving(false);
  };

  const addTopic = async () => {
    const name = prompt(`"${lesson.subject}" 과목에 새 주제 이름`)?.trim();
    if (!name) return;
    const { data, error } = await sb.from('topics').insert({ subject: lesson.subject, name }).select().single();
    if (error) { toast('⚠️ ' + friendlyError(error)); return; }
    setCat({ ...cat, topics: [...cat.topics, data] });
    upd({ topic_id: data.id });
  };
  const addFlashQs = () => {
    const made = flashcardQuestions(lesson.flashcards, maxSet());
    if (!made.length) { toast('낱말 카드가 3개 이상 있어야 해요'); return; }
    const have = new Set(qs.map((q) => q.prompt));
    const fresh = made.filter((q) => !have.has(q.prompt));
    updQs([...qs, ...fresh]);
    toast(`🃏 낱말 카드 문제 ${fresh.length}개를 만들었어요`);
  };

  const cardsText = lesson.flashcards.map((c) => `${c.front} : ${c.back}`).join('\n');

  return html`<div class="page editor">
    <a class="back" href="#/t/lessons">← 수업 목록</a>
    <h1>${isNew && lesson._new ? '➕ 새 수업 자료' : '✏️ 수업 자료 편집'}</h1>

    <div class="card form-grid">
      <label class="span2">수업 제목 *<input class="input big" value=${lesson.title} onInput=${(e) => upd({ title: e.target.value })} placeholder="예: 식물의 한살이" /></label>
      <label>과목
        <select class="input" value=${lesson.subject || ''} onChange=${(e) => upd({ subject: e.target.value, topic_id: null })}>
          <option value="">과목 고르기</option>
          ${cat.subjects.filter((x) => x.active || x.name === lesson.subject).map((x) => html`<option value=${x.name}>${x.emoji} ${x.name}</option>`)}
        </select></label>
      <label>주제(제재)
        <span class="topic-pick">
          <select class="input" value=${lesson.topic_id || ''} onChange=${(e) => upd({ topic_id: e.target.value || null })} disabled=${!lesson.subject}>
            <option value="">주제 없음</option>
            ${cat.topics.filter((t) => t.subject === lesson.subject).map((t) => html`<option value=${t.id}>${t.name}</option>`)}
          </select>
          <button type="button" class="btn small" disabled=${!lesson.subject} onClick=${addTopic}>+ 새 주제</button>
        </span></label>
      <label>수업 날짜<input class="input" type="date" value=${lesson.lesson_date || ''} onInput=${(e) => upd({ lesson_date: e.target.value })} /></label>
      <div>공개할 학년 <span class="muted small">(아무것도 안 고르면 전체)</span>
        <div class="btn-row">${GRADES.map((g) => html`<label class="check"><input type="checkbox" checked=${lesson.grades.includes(g)}
          onChange=${(e) => upd({ grades: e.target.checked ? [...lesson.grades, g].sort() : lesson.grades.filter((x) => x !== g) })} /> ${g}학년</label>`)}</div>
      </div>
      <label class="check span2 publish"><input type="checkbox" checked=${lesson.published} onChange=${(e) => upd({ published: e.target.checked })} />
        <b>학생에게 공개하기</b> <span class="muted small">(검토를 마친 뒤 켜 주세요)</span></label>
    </div>

    <${PagesEditor} lessonId=${lesson.id} pages=${lesson.pages} onChange=${(p) => upd({ pages: p })} />
    <${AIImport} onImport=${onImport} lesson=${lesson} questions=${qs} />

    <div class="card">
      <h2>📝 복습 자료</h2>
      <label>요약<textarea class="input" rows="6" value=${lesson.summary || ''} onInput=${(e) => upd({ summary: e.target.value })}></textarea></label>
      <label>핵심 정리 (한 줄에 하나씩)<textarea class="input" rows="4" value=${lesson.key_points.join('\n')}
        onChange=${(e) => upd({ key_points: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}></textarea></label>
      <label>낱말 카드 (한 줄에 하나씩: 낱말 : 뜻)<textarea class="input" rows="4" value=${cardsText}
        onChange=${(e) => upd({ flashcards: e.target.value.split('\n').map((l) => { const [a, ...b] = l.split(':'); return { front: (a || '').trim(), back: b.join(':').trim() }; }).filter((c) => c.front && c.back) })}></textarea></label>
    </div>

    <h2>🎯 문제 (${qs.length}개)</h2>
    ${qs.map((q, i) => html`<${QuestionEditor} key=${q.id} q=${q} index=${i} total=${qs.length} error=${qErrors[q.id]}
      onChange=${(nq) => updQs(qs.map((x) => (x.id === q.id ? nq : x)))}
      onMove=${(dir) => { const a = [...qs]; [a[i], a[i + dir]] = [a[i + dir], a[i]]; updQs(a); }}
      onDelete=${() => confirm('이 문제를 지울까요?') && updQs(qs.filter((x) => x.id !== q.id))} />`)}
    <div class="card add-q">
      <button class="btn small good" onClick=${addFlashQs}>🃏 낱말 카드로 문제 자동 만들기</button>
      <span class="muted small">(뜻 고르기 · 낱말 고르기 문제가 카드마다 2개씩 생겨요)</span>
    </div>
    <div class="card add-q">문제 직접 추가:
      ${Object.entries(TYPES).map(([k, t]) => html`<button class="btn small" onClick=${() => updQs([...qs, emptyQuestion(k)])}>${t.icon} ${t.label}</button>`)}
    </div>

    <div class="save-bar">
      ${dirty ? html`<span class="muted">저장하지 않은 변경 사항이 있어요</span>` : html`<span class="muted">모두 저장됨 ✔</span>`}
      <button class="btn" disabled=${saving} onClick=${() => save({ thenPreview: true })}>저장 후 학생 화면 보기</button>
      <button class="btn primary" disabled=${saving} onClick=${() => save()}>${saving ? '저장 중…' : '💾 저장'}</button>
    </div>
  </div>`;
}
