// 수업 목록을 과목별 / 주제별 / 날짜별로 묶어서 보여 주기 (학생·선생님 화면 공통)
import { html, useState } from '../../vendor/preact-htm.js';
import { PERIODS, periodRange, inRange, weekRange, weekLabel, remember, store } from '../lib/groups.js';

const VIEWS = { subject: '📚 과목별', topic: '🗂️ 주제별', date: '📅 날짜별' };

export function GroupedLessons({ lessons, subjects, topics, renderLesson, groupActions, storageKey = 'groups' }) {
  const saved = remember(storageKey, {});
  const [view, setViewS] = useState(saved.view || 'subject');
  const [subject, setSubjectS] = useState(saved.subject || '');
  const [period, setPeriodS] = useState(saved.period || 'all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const save = (patch) => store(storageKey, { view, subject, period, ...patch });
  const setView = (v) => { setViewS(v); save({ view: v }); };
  const setSubject = (v) => { setSubjectS(v); save({ subject: v }); };
  const setPeriod = (v) => { setPeriodS(v); save({ period: v }); };

  const range = periodRange(period, custom);
  const shown = lessons.filter((l) => (!subject || l.subject === subject) && inRange(l.lesson_date || '', range));

  // 과목 순서: 과목 관리에서 정한 순서, 목록에 없는 과목은 뒤에
  const order = subjects.map((s) => s.name);
  const subjOf = (name) => subjects.find((s) => s.name === name);
  const usedSubjects = [...new Set(lessons.map((l) => l.subject || '기타'))]
    .sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
  const label = (name) => `${subjOf(name)?.emoji || '📘'} ${name || '기타'}`;

  const grid = (list) => html`<div class="grid">${list.map(renderLesson)}</div>`;
  const section = (key, title, list, actions) => html`<section class="group" key=${key}>
    <div class="group-head"><h3>${title} <small class="muted">${list.length}개</small></h3>${actions}</div>
    ${grid(list)}
  </section>`;

  let body;
  if (!shown.length) body = html`<div class="card empty">이 조건에 맞는 수업이 없어요.</div>`;
  else if (view === 'subject') {
    body = usedSubjects.filter((s) => shown.some((l) => (l.subject || '기타') === s))
      .map((s) => section(s, label(s), shown.filter((l) => (l.subject || '기타') === s), groupActions?.({ kind: 'subject', subject: s, range })));
  } else if (view === 'topic') {
    const out = [];
    for (const s of usedSubjects) {
      const inSubj = shown.filter((l) => (l.subject || '기타') === s);
      if (!inSubj.length) continue;
      const ts = topics.filter((t) => t.subject === s && inSubj.some((l) => l.topic_id === t.id));
      for (const t of ts) out.push(section(t.id, html`${label(s)} · <b>${t.name}</b>`, inSubj.filter((l) => l.topic_id === t.id), groupActions?.({ kind: 'topic', topic: t })));
      const none = inSubj.filter((l) => !l.topic_id || !topics.some((t) => t.id === l.topic_id));
      if (none.length) out.push(section(s + '-none', html`${label(s)} · <span class="muted">주제 없음</span>`, none, null));
    }
    body = out;
  } else {
    const weeks = [...new Set(shown.map((l) => weekRange(l.lesson_date)[0]))].sort().reverse();
    body = weeks.map((w) => {
      const list = shown.filter((l) => weekRange(l.lesson_date)[0] === w);
      return section(w, '📅 ' + weekLabel(w), list, groupActions?.({ kind: 'range', range: weekRange(w), subject }));
    });
  }

  return html`<div class="grouped">
    <div class="group-tools card">
      <div class="tabs">${Object.entries(VIEWS).map(([k, v]) => html`<button class=${'tab' + (view === k ? ' on' : '')} onClick=${() => setView(k)}>${v}</button>`)}</div>
      <div class="chips">
        <button class=${'chip' + (!subject ? ' on' : '')} onClick=${() => setSubject('')}>전체 과목</button>
        ${usedSubjects.map((s) => html`<button class=${'chip' + (subject === s ? ' on' : '')} onClick=${() => setSubject(s)}>${label(s)}</button>`)}
      </div>
      <div class="period-row">
        <select class="input" value=${period} onChange=${(e) => setPeriod(e.target.value)}>
          ${Object.entries(PERIODS).map(([k, v]) => html`<option value=${k}>${v}</option>`)}
        </select>
        ${period === 'custom' && html`<input class="input" type="date" value=${custom.from} onInput=${(e) => setCustom({ ...custom, from: e.target.value })} />
          <span>~</span><input class="input" type="date" value=${custom.to} onInput=${(e) => setCustom({ ...custom, to: e.target.value })} />`}
        ${range[0] && shown.length > 0 && groupActions?.({ kind: 'range', range, subject, period: true })}
      </div>
    </div>
    ${body}
  </div>`;
}
