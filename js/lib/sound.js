// 🔊 모험 소리: 파일 없이 브라우저가 직접 만드는 배경 음악과 효과음 (Web Audio)
// 음악·효과음은 따로 켜고 끌 수 있고, 설정은 이 기기에 저장돼요.

const KEY = 'bokseup-sound';
const load = () => { try { return { music: true, sfx: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { music: true, sfx: true }; } };
let prefs = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };

let ctx = null;
let master, musicBus, sfxBus;
const listeners = new Set();

function ac() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  ctx.onstatechange = () => { if (ctx.state === 'running' && wanted && !playing) startMusic(wanted); };
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.22 : 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 0.6 : 0; sfxBus.connect(master);
  return ctx;
}
// 브라우저는 화면을 한 번 누른 뒤에야 소리를 내줘요
if (typeof window !== 'undefined') {
  const unlock = () => { ac(); if (wanted && !playing) startMusic(wanted); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export const soundPrefs = () => ({ ...prefs });
export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setSound(patch) {
  prefs = { ...prefs, ...patch }; save();
  if (ctx) {
    musicBus.gain.setTargetAtTime(prefs.music ? 0.22 : 0, ctx.currentTime, 0.1);
    sfxBus.gain.setTargetAtTime(prefs.sfx ? 0.6 : 0, ctx.currentTime, 0.05);
  }
  listeners.forEach((f) => f(soundPrefs()));
}

// ---------- 소리 재료 ----------
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function tone(bus, { f, t = 0, d = 0.2, type = 'sine', v = 0.3, a = 0.005, slide = 0, detune = 0 }) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + t;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + d + 0.05);
}
let noiseBuf = null;
function noise(bus, { t = 0, d = 0.1, v = 0.3, hp = 800, lp = 8000, sweep = 0 }) {
  const c = ac(); if (!c) return;
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t0 = c.currentTime + t;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.setValueAtTime(lp, t0); if (sweep) l.frequency.exponentialRampToValueAtTime(Math.max(200, lp * sweep), t0 + d);
  const g = c.createGain(); g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(h); h.connect(l); l.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + d + 0.05);
}

// ---------- 효과음 ----------
const S = {
  step: () => tone(sfxBus, { f: 660, d: 0.08, type: 'triangle', v: 0.18, slide: 1.4 }),
  dice: () => { for (let i = 0; i < 7; i++) noise(sfxBus, { t: i * 0.08 + Math.random() * 0.03, d: 0.05, v: 0.35, hp: 1500, lp: 6000 }); },
  diceLand: () => { noise(sfxBus, { d: 0.12, v: 0.5, hp: 200, lp: 1500 }); tone(sfxBus, { f: midi(79), t: 0.05, d: 0.35, type: 'triangle', v: 0.25 }); tone(sfxBus, { f: midi(84), t: 0.12, d: 0.4, type: 'triangle', v: 0.2 }); },
  lucky: () => [84, 88, 91, 96].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.06, d: 0.3, type: 'sine', v: 0.2 })),
  chest: () => [72, 76, 79, 84, 88].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.07, d: 0.35, type: 'triangle', v: 0.22 })),
  trap: () => { tone(sfxBus, { f: 300, d: 0.5, type: 'sawtooth', v: 0.2, slide: 0.35 }); noise(sfxBus, { d: 0.3, v: 0.25, hp: 100, lp: 900 }); },
  heal: () => [67, 71, 74, 79].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.09, d: 0.5, type: 'sine', v: 0.2 })),
  island: () => [76, 72, 76, 79].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.18, d: 0.4, type: 'triangle', v: 0.18 })),
  appear: () => { tone(sfxBus, { f: midi(45), d: 0.7, type: 'sawtooth', v: 0.18, slide: 0.8 }); tone(sfxBus, { f: midi(52), t: 0.15, d: 0.7, type: 'sawtooth', v: 0.15, slide: 0.8 }); noise(sfxBus, { d: 0.5, v: 0.12, hp: 200, lp: 2000, sweep: 0.2 }); },
  correct: () => { tone(sfxBus, { f: midi(76), d: 0.15, type: 'square', v: 0.12 }); tone(sfxBus, { f: midi(83), t: 0.09, d: 0.3, type: 'square', v: 0.12 }); },
  wrong: () => { tone(sfxBus, { f: 220, d: 0.25, type: 'square', v: 0.12, slide: 0.7 }); tone(sfxBus, { f: 160, t: 0.15, d: 0.35, type: 'square', v: 0.12, slide: 0.7 }); },
  attack: () => { noise(sfxBus, { d: 0.22, v: 0.4, hp: 600, lp: 9000, sweep: 0.15 }); tone(sfxBus, { f: 140, t: 0.16, d: 0.18, type: 'square', v: 0.3, slide: 0.5 }); noise(sfxBus, { t: 0.16, d: 0.15, v: 0.45, hp: 100, lp: 2500 }); },
  crit: () => { S.attack(); [79, 84, 91].forEach((n, i) => tone(sfxBus, { f: midi(n), t: 0.3 + i * 0.05, d: 0.25, type: 'square', v: 0.12 })); },
  miss: () => noise(sfxBus, { d: 0.35, v: 0.3, hp: 1500, lp: 9000, sweep: 0.3 }),
  block: () => { tone(sfxBus, { f: 900, d: 0.4, type: 'triangle', v: 0.25, detune: 15 }); tone(sfxBus, { f: 1350, d: 0.3, type: 'sine', v: 0.15 }); noise(sfxBus, { d: 0.08, v: 0.35, hp: 2000, lp: 9000 }); },
  hurt: () => { tone(sfxBus, { f: 180, d: 0.3, type: 'sawtooth', v: 0.25, slide: 0.5 }); noise(sfxBus, { d: 0.2, v: 0.35, hp: 80, lp: 1200 }); },
  tick: () => tone(sfxBus, { f: 1200, d: 0.04, type: 'square', v: 0.07 }),
  win: () => [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.52], [84, 0.64]].forEach(([n, t], i) => tone(sfxBus, { f: midi(n), t, d: i === 5 ? 0.9 : 0.2, type: 'square', v: 0.14 })),
  lose: () => [67, 63, 60, 55].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.22, d: 0.45, type: 'triangle', v: 0.2 })),
  boss: () => { [40, 40, 43, 40].forEach((n, i) => tone(sfxBus, { f: midi(n), t: i * 0.22, d: 0.3, type: 'sawtooth', v: 0.2 })); noise(sfxBus, { t: 0.66, d: 0.6, v: 0.2, hp: 60, lp: 600 }); },
};
export function sfx(name) { if (!prefs.sfx) return; try { ac() && S[name]?.(); } catch {} }

// ---------- 배경 음악 (짧은 곡을 계속 반복) ----------
// 한 줄 = 16칸(16분음표), 숫자는 음 높이(MIDI), null 은 쉼표
const SONGS = {
  peace: { bpm: 84, lead: [72, null, 76, null, 79, null, 76, null, 74, null, 77, null, 81, null, 77, null, 72, null, 76, null, 79, null, 84, null, 79, null, 76, null, 74, null, null, null],
    bass: [48, null, null, null, 55, null, null, null, 50, null, null, null, 53, null, null, null, 48, null, null, null, 55, null, null, null, 53, null, null, null, 55, null, null, null],
    leadType: 'triangle', bassType: 'sine', drums: false },
  battle: { bpm: 140, lead: [69, null, 72, 69, 76, null, 74, 72, 71, null, 72, 74, 76, null, null, null, 69, null, 72, 69, 77, null, 76, 74, 72, null, 71, 69, 68, null, null, null],
    bass: [45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43, 45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 40, 40, 52, 40],
    leadType: 'square', bassType: 'sawtooth', drums: true },
  boss: { bpm: 156, lead: [64, 65, 64, null, 71, null, 70, 69, 64, 65, 64, null, 72, null, 71, 70, 64, 65, 64, null, 76, null, 75, 74, 73, null, 72, null, 71, null, 70, null],
    bass: [40, 40, 40, 52, 40, 40, 41, 41, 40, 40, 40, 52, 40, 40, 43, 43, 40, 40, 40, 52, 40, 40, 41, 41, 39, 39, 39, 51, 38, 38, 38, 50],
    leadType: 'sawtooth', bassType: 'square', drums: true },
};
let wanted = null;
let playing = null;
let timer = null;
let step = 0;
let nextAt = 0;

function startMusic(name) {
  const c = ac(); if (!c || c.state !== 'running') return;
  stopTimer();
  playing = name; step = 0; nextAt = c.currentTime + 0.1;
  const song = SONGS[name];
  const sixteenth = 60 / song.bpm / 4;
  timer = setInterval(() => {
    while (nextAt < c.currentTime + 0.25) {
      const i = step % song.lead.length;
      const t = nextAt - c.currentTime;
      const ln = song.lead[i];
      if (ln) tone(musicBus, { f: midi(ln), t, d: sixteenth * 1.8, type: song.leadType, v: song.leadType === 'triangle' ? 0.22 : 0.08 });
      const bn = song.bass[i];
      if (bn) tone(musicBus, { f: midi(bn), t, d: sixteenth * (song.drums ? 0.9 : 3.5), type: song.bassType, v: song.drums ? 0.1 : 0.25 });
      if (song.drums) {
        if (i % 4 === 0) tone(musicBus, { f: 110, t, d: 0.12, type: 'sine', v: 0.5, slide: 0.4 });            // 쿵
        if (i % 8 === 4) noise(musicBus, { t, d: 0.1, v: 0.25, hp: 1200, lp: 7000 });                         // 착
        if (i % 2 === 1) noise(musicBus, { t, d: 0.03, v: 0.08, hp: 6000, lp: 12000 });                       // 치
      } else if (i % 8 === 0) {
        tone(musicBus, { f: midi((song.bass[i] || 48) + 24), t, d: sixteenth * 7, type: 'sine', v: 0.06 });   // 은은한 화음
      }
      step += 1; nextAt += sixteenth;
    }
  }, 60);
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; playing = null; }

// 곡 바꾸기 (같은 곡이면 그대로)
export function music(name) {
  wanted = name;
  if (playing === name) return;
  if (!ctx || ctx.state !== 'running') { ac(); return; }   // 첫 터치 뒤에 시작
  startMusic(name);
}
export function stopMusic() { wanted = null; stopTimer(); }
