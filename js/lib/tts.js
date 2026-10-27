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

export function speak(text, { rate = 0.9 } = {}) {
  if (!ttsSupported || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(speakFractions(text).replace(/[_]{2,}/g, '빈칸'));
  u.lang = 'ko-KR';
  u.rate = rate;
  if (koVoice) u.voice = koVoice;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel();
}

export function getAutoRead() {
  try { return localStorage.getItem('bokseup-autoread') === '1'; } catch { return false; }
}

export function setAutoRead(on) {
  try { localStorage.setItem('bokseup-autoread', on ? '1' : '0'); } catch {}
}
