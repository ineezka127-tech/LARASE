// 읽어 주기 (태블릿의 한국어 음성 사용)
import { speakFractions } from './fraction.js';

let koVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  koVoice = voices.find((v) => v.lang === 'ko-KR' && /google/i.test(v.name)) || voices.find((v) => v.lang?.startsWith('ko')) || null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export const ttsSupported = 'speechSynthesis' in window;

// 지금 읽고 있는 글 (멈추기 버튼 표시용)
let current = null;
let seq = 0;
function setCurrent(text) {
  current = text;
  window.dispatchEvent(new CustomEvent('bokseup-tts', { detail: text }));
}
export function speakingText() {
  return current;
}

// 긴 글은 문장 단위로 나눠 차례로 읽어요 (크롬에서 긴 글이 중간에 끊기는 문제 방지)
function chunks(t) {
  const parts = t.split(/(?<=[.!?。…\n])\s+/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (out.length && (out[out.length - 1] + ' ' + p).length < 120) out[out.length - 1] += ' ' + p;
    else out.push(p);
  }
  return out.length ? out : [t];
}

export function speak(text, { rate = 0.9 } = {}) {
  if (!ttsSupported || !text) return;
  window.speechSynthesis.cancel();
  const id = ++seq;
  const list = chunks(speakFractions(text).replace(/[_]{2,}/g, '빈칸'));
  setCurrent(String(text));
  list.forEach((piece, i) => {
    const u = new SpeechSynthesisUtterance(piece);
    u.lang = 'ko-KR';
    u.rate = rate;
    if (koVoice) u.voice = koVoice;
    if (i === list.length - 1) u.onend = () => { if (id === seq) setCurrent(null); };
    u.onerror = () => { if (id === seq) setCurrent(null); };
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (!ttsSupported) return;
  seq++;
  window.speechSynthesis.cancel();
  setCurrent(null);
}

export function getAutoRead() {
  try { return localStorage.getItem('bokseup-autoread') === '1'; } catch { return false; }
}

export function setAutoRead(on) {
  try { localStorage.setItem('bokseup-autoread', on ? '1' : '0'); } catch {}
}
