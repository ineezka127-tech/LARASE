// 📚 과목·주제(제재) 관리
import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { sb, friendlyError } from '../lib/sb.js';
import { loadCatalog } from '../lib/groups.js';
import { Loading, ErrorBox, toast } from '../components/ui.js';

export function SubjectsPage() {
  const [cat, setCat] = useState(null);
  const [counts, setCounts] = useState({});
  const [err, setErr] = useState(null);
  const [newSubj, setNewSubj] = useState('');
  const [newTopic, setNewTopic] = useState({});

  const load = async () => {
    try {
      const [c, l] = await Promise.all([loadCatalog(), sb.from('lessons').select('id,subject,topic_id')]);
      if (l.error) throw l.error;
      const n = {};
      l.data.forEach((x) => { n['s:' + x.subject] = (n['s:' + x.subject] || 0) + 1; if (x.topic_id) n['t:' + x.topic_id] = (n['t:' + x.topic_id] || 0) + 1; });
      setCounts(n);
      setCat(c);
    } catch (e) { setErr(friendlyError(e)); }
  };
  useEffect(() => { load(); }, []);

  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); await load(); } catch (e) { toast('⚠️ ' + friendlyError(e)); }
  };
  const must = (r) => { if (r.error) throw r.error; return r; };

  if (err) return html`<div class="page"><${ErrorBox} error=${err} onRetry=${load} /></div>`;
  if (!cat) return html`<${Loading} />`;
  const { subjects, topics } = cat;

  const addSubject = () => {
    const name = newSubj.trim();
    if (!name) return;
    run(async () => { must(await sb.from('subjects').insert({ name, position: subjects.length + 1 })); setNewSubj(''); }, '과목을 추가했어요 ✔');
  };
  const rename = (s) => {
    const name = prompt('새 과목 이름', s.name)?.trim();
    if (!name || name === s.name) return;
    run(async () => {
      must(await sb.from('subjects').update({ name }).eq('id', s.id));
      must(await sb.from('lessons').update({ subject: name }).eq('subject', s.name));
      must(await sb.from('topics').update({ subject: name }).eq('subject', s.name));
    }, '이름을 바꿨어요 ✔');
  };
  const setEmoji = (s) => {
    const emoji = prompt('과목 아이콘 (이모지 하나)', s.emoji)?.trim();
    if (!emoji) return;
    run(async () => must(await sb.from('subjects').update({ emoji: [...emoji][0] }).eq('id', s.id)));
  };
  const toggle = (s) => run(async () => must(await sb.from('subjects').update({ active: !s.active }).eq('id', s.id)), s.active ? '숨겼어요 (수업 자료는 그대로 남아요)' : '다시 보여요 ✔');
  const move = (i, d) => {
    const a = [...subjects];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    run(async () => { for (let k = 0; k < a.length; k++) must(await sb.from('subjects').update({ position: k + 1 }).eq('id', a[k].id)); });
  };
  const addTopic = (subj) => {
    const name = (newTopic[subj] || '').trim();
    if (!name) return;
    run(async () => { must(await sb.from('topics').insert({ subject: subj, name, position: topics.filter((t) => t.subject === subj).length + 1 })); setNewTopic({ ...newTopic, [subj]: '' }); }, '주제를 추가했어요 ✔');
  };
  const renameTopic = (t) => {
    const name = prompt('새 주제 이름', t.name)?.trim();
    if (!name || name === t.name) return;
    run(async () => must(await sb.from('topics').update({ name }).eq('id', t.id)), '이름을 바꿨어요 ✔');
  };
  const delTopic = (t) => {
    if (!confirm(`"${t.name}" 주제를 지울까요? 수업 자료는 지워지지 않고 "주제 없음"이 돼요.`)) return;
    run(async () => must(await sb.from('topics').delete().eq('id', t.id)), '지웠어요');
  };

  return html`<div class="page">
    <a class="back" href="#/t/lessons">← 수업 자료</a>
    <h1>📚 과목·주제 관리</h1>
    <p class="muted">과목 아래에 <b>주제(제재·단원)</b>를 만들어 두면, 수업 자료를 주제별로 묶고 학생은 <b>주제 전체 퀴즈</b>를 풀 수 있어요.</p>

    ${subjects.map((s, i) => html`<div class=${'card subj-card' + (s.active ? '' : ' hidden-subj')} key=${s.id}>
      <div class="subj-head">
        <button class="btn small ghost subj-emoji" onClick=${() => setEmoji(s)} title="아이콘 바꾸기">${s.emoji}</button>
        <h2>${s.name} <small class="muted">수업 ${counts['s:' + s.name] || 0}개${s.active ? '' : ' · 숨김'}</small></h2>
        <span class="spacer"></span>
        <button class="btn small ghost" disabled=${i === 0} onClick=${() => move(i, -1)}>▲</button>
        <button class="btn small ghost" disabled=${i === subjects.length - 1} onClick=${() => move(i, 1)}>▼</button>
        <button class="btn small" onClick=${() => rename(s)}>✏️ 이름</button>
        <button class="btn small" onClick=${() => toggle(s)}>${s.active ? '🙈 숨기기' : '👀 보이기'}</button>
      </div>
      <div class="topic-list">
        ${topics.filter((t) => t.subject === s.name).map((t) => html`<span class="topic-chip" key=${t.id}>
          🗂️ ${t.name} <small class="muted">${counts['t:' + t.id] || 0}</small>
          <button onClick=${() => renameTopic(t)} title="이름 바꾸기">✏️</button><button onClick=${() => delTopic(t)} title="지우기">✕</button>
        </span>`)}
      </div>
      <div class="btn-row">
        <input class="input" style="max-width:18em" placeholder="새 주제 이름 (예: 분수, 시 읽기)" value=${newTopic[s.name] || ''}
          onInput=${(e) => setNewTopic({ ...newTopic, [s.name]: e.target.value })} onKeyDown=${(e) => e.key === 'Enter' && addTopic(s.name)} />
        <button class="btn small primary" onClick=${() => addTopic(s.name)}>+ 주제 추가</button>
      </div>
    </div>`)}

    <div class="card btn-row">
      <input class="input" style="max-width:14em" placeholder="새 과목 이름" value=${newSubj} onInput=${(e) => setNewSubj(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && addSubject()} />
      <button class="btn primary" onClick=${addSubject}>+ 과목 추가</button>
      <span class="muted small">숨긴 과목은 새 수업 자료를 만들 때 목록에 안 나와요. 이미 만든 수업은 그대로 남아요.</span>
    </div>
  </div>`;
}
