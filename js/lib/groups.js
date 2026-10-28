// 과목·주제·기간으로 수업 묶기
import { sb } from './sb.js';

export async function loadCatalog() {
  const [s, t] = await Promise.all([
    sb.from('subjects').select('*').order('position').order('name'),
    sb.from('topics').select('*').order('position').order('created_at'),
  ]);
  if (s.error) throw s.error;
  if (t.error) throw t.error;
  return { subjects: s.data, topics: t.data };
}

// 날짜 도우미 (한국 시간 기준 'YYYY-MM-DD')
export const ymd = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const today = () => ymd(new Date());

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7;   // 월=0
  d.setDate(d.getDate() - day);
  return d;
}

export function weekRange(dateStr) {
  const mon = mondayOf(dateStr);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [ymd(mon), ymd(sun)];
}

const md = (s) => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };

export function weekLabel(dateStr) {
  const [a, b] = weekRange(dateStr);
  const mon = new Date(a + 'T00:00:00');
  const nth = Math.floor((mon.getDate() - 1) / 7) + 1;
  return `${mon.getMonth() + 1}월 ${nth}째 주 (${md(a)}~${md(b)})`;
}

export const PERIODS = {
  all: '전체 기간',
  this_week: '이번 주',
  last_week: '지난주',
  this_month: '이번 달',
  last_month: '지난달',
  custom: '기간 정하기',
};

export function periodRange(key, custom = {}) {
  const t = today();
  if (key === 'this_week') return weekRange(t);
  if (key === 'last_week') {
    const d = mondayOf(t);
    d.setDate(d.getDate() - 7);
    return weekRange(ymd(d));
  }
  if (key === 'this_month' || key === 'last_month') {
    const d = new Date(t + 'T00:00:00');
    if (key === 'last_month') d.setMonth(d.getMonth() - 1);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [ymd(first), ymd(last)];
  }
  if (key === 'custom' && custom.from && custom.to) return [custom.from, custom.to];
  return [null, null];
}

export function inRange(dateStr, [from, to]) {
  if (!from) return true;
  return dateStr >= from && dateStr <= to;
}

// 화면 설정 기억하기 (기기마다)
export function remember(key, fallback) {
  try { return JSON.parse(localStorage.getItem('bokseup-' + key)) ?? fallback; } catch { return fallback; }
}
export function store(key, value) {
  try { localStorage.setItem('bokseup-' + key, JSON.stringify(value)); } catch {}
}
