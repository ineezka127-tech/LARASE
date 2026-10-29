// ✍️ 육하원칙 글쓰기 (학생): 여섯 칸 → 점검 → 이어 쓰기 → 선생님께 내기
import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { sb, rpc, friendlyError } from '../lib/sb.js';
import { tierOf } from '../lib/questions.js';
import { FIELDS, FIELD, defaultRule, checkField, evaluate, exampleSentence, spellCheck, spellMsg, applyStarter, WHY_STARTERS } from '../lib/w5.js';
import { Loading, ErrorBox, SpeakBtn, reward, toast, fmtDate, timeAgo } from '../components/ui.js';

const STATUS = { writing: ['✏️ 쓰는 중', ''], submitted: ['📮 선생님께 냈어요', 'warn'], redo: ['🔁 다시 써 볼까요?', 'redo'], done: ['👍 완료', 'good'] };

async function loadBase(profile) {
  const [t, sp, r, mine, show] = await Promise.all([
    sb.from('w5_tasks').select('*').eq('active', true).order('created_at', { ascending: false }),
    sb.from('w5_spelling').select('wrong,right_word'),
    sb.from('w5_rules').select('*').eq('user_id', profile.id).maybeSingle(),
    sb.from('w5_submissions').select('*').eq('user_id', profile.id).order('updated_at', { ascending: false }).limit(12),
    sb.from('w5_submissions').select('id,author_name,final_text,fields,task_id,updated_at').eq('showcase', true).order('updated_at', { ascending: false }).limit(6),
  ]);
  for (const x of [t, sp, mine, show]) if (x.error) throw x.error;
  const rule = r.data ? { required: r.data.required, level: r.data.level, rewrite: r.data.rewrite } : defaultRule(tierOf(profile));
  return { tasks: t.data, spelling: sp.data, rule, mine: mine.data, show: show.data };
}

// ---------- 글쓰기 첫 화면 ----------
export function WritingPage({ profile, refreshProfile, subId, taskId }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const reload = () => loadBase(profile).then(setD).catch((e) => setErr(friendlyError(e)));   // 약속(Promise)을 돌려줘요
  useEffect(() => {
    reload();
    // 선생님 피드백·모두에게 보여주기가 바로 보이게
    const ch = sb.channel('w5-student-' + profile.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'w5_submissions', filter: `user_id=eq.${profile.id}` }, () => reload())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'w5_submissions', filter: 'showcase=eq.true' }, () => reload())
      .subscribe();
    const poll = setInterval(reload, 15000);   // 실시간이 끊겨도 15초마다
    return () => { sb.removeChannel(ch); clearInterval(poll); };
  }, []);

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${reload} /></div>`;
  if (!d) return html`<${Loading} />`;

  if (subId || taskId) {
    const sub = subId ? d.mine.find((x) => x.id === subId) : null;
    if (subId && !sub) return html`<div class="page"><div class="card empty">글을 찾을 수 없어요. <a href="#/write">← 글쓰기</a></div></div>`;
    const task = d.tasks.find((t) => t.id === (sub?.task_id || taskId)) || null;
    return html`<${Writer} key=${subId || taskId} profile=${profile} refreshProfile=${refreshProfile} base=${d} sub=${sub} task=${task} onChanged=${reload} />`;
  }

  const taskName = (id) => d.tasks.find((t) => t.id === id)?.title || '자유 주제';
  return html`<div class="page writing">
    <h1>✍️ 육하원칙 글쓰기</h1>
    <p class="muted">누가 · 언제 · 어디서 · 무엇을 · 어떻게 · 왜 — 여섯 칸을 채우면 멋진 글이 돼요!</p>

    ${d.show.length > 0 && html`<div class="card showcase-strip"><b>⭐ 친구들의 멋진 글</b>
      <div class="show-list">${d.show.map((s) => html`<div class="show-item"><div class="show-text">“${s.final_text || exampleSentence(s.fields)}”</div><small class="muted">— ${s.author_name || '친구'} · ${taskName(s.task_id)}</small></div>`)}</div></div>`}

    <h2>📝 무엇에 대해 쓸까요?</h2>
    <div class="grid task-grid">
      ${d.tasks.map((t) => html`<a class="card task-card" href=${'#/write/new/' + t.id}><span class="task-emoji">${t.emoji || '📝'}</span><div><b>${t.title}</b>${t.guide && html`<small class="muted">${t.guide}</small>`}</div></a>`)}
      <a class="card task-card free" href="#/write/new/free"><span class="task-emoji">🌈</span><div><b>자유 주제</b><small class="muted">내가 쓰고 싶은 일을 써요</small></div></a>
    </div>

    ${d.mine.length > 0 && html`<h2>📚 내가 쓴 글</h2>
      <div class="list">${d.mine.map((s) => { const [label, cls] = STATUS[s.status]; return html`<a class=${'card row-card my-writing ' + cls} href=${'#/write/' + s.id}>
        <span class="big-emoji">${d.tasks.find((t) => t.id === s.task_id)?.emoji || '📝'}</span>
        <div class="mw-body"><b>${taskName(s.task_id)}</b> <span class=${'pill ' + cls}>${label}</span>${s.showcase ? html` <span class="pill bonus">⭐ 모두에게 보여주는 중</span>` : ''}
          <div class="muted small">${s.final_text || exampleSentence(s.fields) || '아직 비어 있어요'}</div>
          ${s.teacher_feedback && html`<div class="t-feedback">💬 선생님: ${s.teacher_feedback}</div>`}</div>
        <span class="muted small">${timeAgo(s.updated_at)}</span></a>`; })}</div>`}
  </div>`;
}

// ---------- 쓰기 화면 ----------
function Writer({ profile, refreshProfile, base, sub, task, onChanged }) {
  const { rule, spelling } = base;
  const locked = sub && (sub.status === 'submitted' || sub.status === 'done');
  const [fields, setFields] = useState(sub?.fields || {});
  const [step, setStep] = useState(sub?.status === 'redo' || sub?.status === 'writing' || !sub ? 'fields' : 'sent');
  const [ev, setEv] = useState(null);
  const [touched, setTouched] = useState({});
  const [finalText, setFinalText] = useState(sub?.final_text || '');
  const [id, setId] = useState(sub?.id || null);
  const [busy, setBusy] = useState(false);
  const [finalHint, setFinalHint] = useState(null);
  const [whyHelp, setWhyHelp] = useState(false);   // '왜' 칸 도움 버튼 (점검에서 걸리면 '왜'가 통과할 때까지 보여요)
  const refs = useRef({});

  const set = (k, v) => { setFields({ ...fields, [k]: v }); if (ev) setEv(null); };

  // 칸을 다 쓰고 나가면 그 칸만 바로 점검 (잘한 칸은 ✅)
  const fieldState = (k) => {
    if (!touched[k] && !ev) return null;
    if (!rule.required.includes(k)) return null;
    return checkField(k, fields[k], fields, rule.level);
  };

  // 지금 상태를 저장 (선생님 화면에 바로 보여요)
  const save = async (patch) => {
    const row = { fields, ...patch, task_id: task?.id || null };
    if (id) {
      const { error } = await sb.from('w5_submissions').update(row).eq('id', id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await sb.from('w5_submissions').insert({ ...row, user_id: profile.id }).select('id').single();
    if (error) throw error;
    setId(data.id);
    return data.id;
  };
  const checksJson = (e, extra = {}) => ({
    passed: e.passed, required: e.required, level: rule.level, allPassed: e.allPassed,
    msgs: Object.fromEntries(Object.entries(e.results).filter(([, r]) => !r.ok).map(([k, r]) => [k, r.msg])),
    spelling: e.spelling.map(({ wrong, right, sure, field }) => ({ wrong, right, sure, field })), ...extra,
  });

  const check = async () => {
    const e = evaluate(fields, rule, spelling);
    setEv(e);
    setWhyHelp(!!e.results.why && !e.results.why.ok);
    setTouched(Object.fromEntries(FIELDS.map((f) => [f.k, true])));
    if (e.fix) setTimeout(() => refs.current[e.fix.field]?.focus(), 50);
    try { await save({ checks: checksJson(e), status: 'writing' }); } catch (x) { toast('⚠️ 저장 실패: ' + friendlyError(x)); }
  };

  const goRewrite = () => { setStep('rewrite'); window.scrollTo(0, 0); };

  const submit = async () => {
    const e = evaluate(fields, rule, spelling);
    if (!e.allPassed) { setEv(e); setStep('fields'); return; }
    if (rule.rewrite && finalText.trim().length < 8) { toast('✏️ 예시 문장을 보고 내 글로 다시 써 봐요'); return; }
    const sp = spellCheck(finalText, spelling);
    if (sp.length && !finalHint) { setFinalHint(sp[0]); return; }   // 한 번은 알려 주고, 그래도 내면 그대로 내요
    setBusy(true);
    try {
      const sid = await save({ checks: checksJson(e, { finalSpelling: sp.map(({ wrong, right, sure }) => ({ wrong, right, sure })) }), final_text: finalText.trim() || exampleSentence(fields), status: 'submitted' });
      try { const r = await rpc('w5_complete', { p_id: sid }); reward(r); refreshProfile?.(); } catch {}
      await onChanged();
      location.hash = '#/write/' + sid;
    } catch (x) { toast('⚠️ ' + friendlyError(x)); }
    setBusy(false);
  };

  // ---- 낸 뒤: 선생님 피드백 기다리기 ----
  if (step === 'sent' && sub) {
    const [label, cls] = STATUS[sub.status];
    return html`<div class="page narrow writing">
      <a class="back" href="#/write">← 글쓰기</a>
      <div class=${'card sent-card ' + cls}>
        <div class="big-emoji">${sub.status === 'done' ? '🏅' : sub.status === 'redo' ? '🔁' : '📮'}</div>
        <h2>${task?.title || '자유 주제'} <span class=${'pill ' + cls}>${label}</span></h2>
        <div class="final-box">“${sub.final_text || exampleSentence(sub.fields)}” <${SpeakBtn} text=${sub.final_text || exampleSentence(sub.fields)} /></div>
        ${sub.teacher_feedback ? html`<div class="t-feedback big">💬 선생님: ${sub.teacher_feedback}</div>` : sub.status === 'submitted' && html`<p class="muted">선생님이 읽고 있어요 👀 한마디가 오면 여기에 바로 보여요.</p>`}
        ${sub.showcase && html`<p class="pill bonus">⭐ 선생님이 모두에게 보여주고 있어요!</p>`}
        ${sub.status === 'redo' && html`<button class="btn big primary block" onClick=${() => setStep('fields')}>✏️ 다시 쓰기</button>`}
        <a class="btn block" href="#/write">다른 글 쓰기</a>
      </div>
    </div>`;
  }

  const required = (k) => rule.required.includes(k);
  const doneCount = rule.required.filter((k) => checkField(k, fields[k], fields, rule.level).ok).length;

  // ---- 2단계: 이어 쓰기 ----
  if (step === 'rewrite') {
    const ex = exampleSentence(fields);
    return html`<div class="page narrow writing">
      <button class="back linkish" onClick=${() => setStep('fields')}>← 여섯 칸 고치기</button>
      <div class="card">
        <h2>🧩 여섯 칸을 이어 붙이면…</h2>
        <div class="final-box example">“${ex}” <${SpeakBtn} text=${ex} /></div>
        <p class="muted small">이 예시를 보고, <b>내 말로 자연스럽게</b> 다시 써 보세요. 순서를 바꾸거나 말을 더해도 좋아요.</p>
        <textarea class="input big rewrite" rows="4" value=${finalText} placeholder="여기에 내 글을 써요" onInput=${(e) => { setFinalText(e.target.value); setFinalHint(null); }}></textarea>
        ${finalHint && html`<div class="w5-fix">💡 ${spellMsg(finalHint)} <button class="btn small" onClick=${() => { setFinalText(finalText.split(finalHint.wrong).join(finalHint.right)); setFinalHint(null); }}>'${finalHint.right}'(으)로 바꾸기</button>
          <button class="btn small ghost" onClick=${() => { setFinalHint({ ...finalHint, keep: true }); }}>그대로 둘래요</button></div>`}
        <div class="btn-col">
          <button class="btn huge primary block" disabled=${busy} onClick=${submit}>${busy ? '내는 중…' : '📮 선생님께 내기'}</button>
          ${!rule.rewrite && html`<p class="muted small center">다시 쓰기는 하고 싶을 때만 해도 괜찮아요.</p>`}
        </div>
      </div>
    </div>`;
  }

  // ---- 1단계: 여섯 칸 ----
  return html`<div class="page writing w5-page">
    <a class="back" href="#/write">← 글쓰기</a>
    <div class="w5-head">
      <h1>${task?.emoji || '🌈'} ${task?.title || '자유 주제'}</h1>
      ${task?.guide && html`<p class="muted">${task.guide}</p>`}
      ${sub?.status === 'redo' && sub.teacher_feedback && html`<div class="t-feedback big">💬 선생님: ${sub.teacher_feedback}</div>`}
      <div class="w5-progress"><span>${doneCount} / ${rule.required.length}칸 완성</span><div class="progress"><div style=${`width:${(doneCount / rule.required.length) * 100}%`}></div></div></div>
    </div>

    <div class="w5-grid">${FIELDS.map((f) => {
      const st = fieldState(f.k);
      const isFix = ev?.fix?.field === f.k;
      return html`<div class=${'card w5-field' + (st?.ok ? ' ok' : '') + (isFix ? ' fix' : '') + (!required(f.k) ? ' optional' : '')}>
        <label for=${'w5-' + f.k}><span class="w5-icon">${f.icon}</span><b>${f.label}</b> <span class="muted">${f.q}</span>${!required(f.k) && html` <small class="muted">(쓰고 싶으면)</small>`}${st?.ok && html` <span class="w5-ok">✅</span>`}</label>
        <input id=${'w5-' + f.k} ref=${(el) => { refs.current[f.k] = el; }} class="input big" value=${fields[f.k] || ''} placeholder=${'예) ' + f.ex.split(' / ')[0]}
          onInput=${(e) => set(f.k, e.target.value)} onBlur=${() => setTouched({ ...touched, [f.k]: true })} autocomplete="off" />
        ${f.k === 'why' && whyHelp && !st?.ok && html`<div class="starters">${WHY_STARTERS.map((s) => html`<button type="button" class="chip" onClick=${() => set('why', applyStarter(fields.why, s))}>${s.label}</button>`)}</div>`}
        <small class="muted w5-ex">예) ${f.ex}</small>
      </div>`;
    })}</div>

    ${ev && html`<div class="card w5-feedback">
      <div class="w5-praise">${ev.praise}</div>
      ${ev.fix && html`<div class="w5-fix">💡 <b>${FIELD[ev.fix.field].label}</b>: ${ev.fix.msg}
        ${ev.fix.spelling && html` <button class="btn small" onClick=${() => { const k = ev.fix.field; set(k, String(fields[k]).split(ev.fix.spelling.wrong).join(ev.fix.spelling.right)); }}>'${ev.fix.spelling.right}'(으)로 바꾸기</button>`}</div>`}
    </div>`}

    <div class="w5-actions">
      <button class="btn huge block" onClick=${check}>🔍 점검하기</button>
      ${ev?.allPassed && html`<button class="btn huge primary block" onClick=${goRewrite}>다음: 이어서 쓰기 ▶</button>`}
    </div>
  </div>`;
}
