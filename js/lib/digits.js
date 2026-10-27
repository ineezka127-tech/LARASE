// ✏️ 손글씨 숫자 인식 (인터넷·API 없이 태블릿 안에서 계산)
// 펜 획 → 숫자별로 나누기 → 28×28 그림으로 바꾸기(MNIST와 같은 방식) → 작은 신경망으로 0~9 판별

// ---------- 모델 불러오기 ----------
// digits.bin: int8 가중치를 이어 붙인 파일 / digits.json: 각 가중치의 모양과 배율
let modelPromise = null;

export function parseModel(meta, buffer) {
  const bytes = new Int8Array(buffer);
  let off = 0;
  const tensors = meta.tensors.map((t) => {
    const n = t.shape.reduce((a, b) => a * b, 1);
    const data = new Float32Array(n);
    for (let i = 0; i < n; i++) data[i] = bytes[off + i] * t.scale;
    off += n;
    return { shape: t.shape, data };
  });
  return tensors;
}

export function loadModel() {
  if (!modelPromise) {
    const base = new URL('../../vendor/', import.meta.url);
    modelPromise = Promise.all([
      fetch(new URL('digits.json', base)).then((r) => r.json()),
      fetch(new URL('digits.bin', base)).then((r) => r.arrayBuffer()),
    ]).then(([meta, buf]) => parseModel(meta, buf));
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

// ---------- 신경망 계산 (conv 3×3 ×4, dense ×2) ----------
function conv3(input, h, w, cin, kernel, bias, cout) {
  const oh = h - 2, ow = w - 2;
  const out = new Float32Array(oh * ow * cout);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const o = (y * ow + x) * cout;
      for (let co = 0; co < cout; co++) out[o + co] = bias[co];
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const ii = ((y + ky) * w + (x + kx)) * cin;
          const kb = (ky * 3 + kx) * cin * cout;
          for (let ci = 0; ci < cin; ci++) {
            const v = input[ii + ci];
            if (v === 0) continue;
            const kr = kb + ci * cout;
            for (let co = 0; co < cout; co++) out[o + co] += v * kernel[kr + co];
          }
        }
      }
      for (let co = 0; co < cout; co++) if (out[o + co] < 0) out[o + co] = 0;
    }
  }
  return out;
}

function pool2(input, h, w, c) {
  const oh = h >> 1, ow = w >> 1;
  const out = new Float32Array(oh * ow * c);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      for (let ch = 0; ch < c; ch++) {
        const a = input[((2 * y) * w + 2 * x) * c + ch];
        const b = input[((2 * y) * w + 2 * x + 1) * c + ch];
        const d = input[((2 * y + 1) * w + 2 * x) * c + ch];
        const e = input[((2 * y + 1) * w + 2 * x + 1) * c + ch];
        out[(y * ow + x) * c + ch] = Math.max(a, b, d, e);
      }
    }
  }
  return out;
}

function dense(input, kernel, bias, nout, relu) {
  const nin = input.length;
  const out = Float32Array.from(bias);
  for (let i = 0; i < nin; i++) {
    const v = input[i];
    if (v === 0) continue;
    const r = i * nout;
    for (let o = 0; o < nout; o++) out[o] += v * kernel[r + o];
  }
  if (relu) for (let o = 0; o < nout; o++) if (out[o] < 0) out[o] = 0;
  return out;
}

// img: 28×28 Float32Array(0~1) → 0~9 확률 10개
export function predict(model, img) {
  const [k1, b1, k2, b2, k3, b3, k4, b4, d1, db1, d2, db2] = model.map((t) => t.data);
  let a = conv3(img, 28, 28, 1, k1, b1, 32);
  a = conv3(a, 26, 26, 32, k2, b2, 32);
  a = pool2(a, 24, 24, 32);
  a = conv3(a, 12, 12, 32, k3, b3, 64);
  a = conv3(a, 10, 10, 64, k4, b4, 64);
  a = pool2(a, 8, 8, 64);
  a = dense(a, d1, db1, 128, true);
  const z = dense(a, d2, db2, 10, false);
  const m = Math.max(...z);
  const e = Array.from(z, (v) => Math.exp(v - m));
  const s = e.reduce((p, q) => p + q, 0);
  return e.map((v) => v / s);
}

// ---------- 획 → 28×28 그림 ----------
// strokes: [[{x,y}, ...], ...] (화면 좌표). MNIST처럼 20×20 안에 넣고 무게중심을 가운데로.
export function rasterize(strokes) {
  const pts = strokes.flat();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
  const s = 20 / Math.max(w, h);
  const R = 4;                      // 4배 크게 그린 뒤 줄여서 부드럽게
  const N = 28 * R;
  const ox = (28 - w * s) / 2, oy = (28 - h * s) / 2;
  const big = new Float32Array(N * N);
  const rad = 1.25 * R;             // 28칸 기준 굵기 약 2.5
  const map = (p) => ({ x: ((p.x - minX) * s + ox) * R, y: ((p.y - minY) * s + oy) * R });
  for (const st of strokes) {
    const q = st.map(map);
    if (q.length === 1) q.push({ x: q[0].x + 0.01, y: q[0].y });
    for (let i = 1; i < q.length; i++) {
      const a = q[i - 1], b = q[i];
      const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - rad - 1)), x1 = Math.min(N - 1, Math.ceil(Math.max(a.x, b.x) + rad + 1));
      const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - rad - 1)), y1 = Math.min(N - 1, Math.ceil(Math.max(a.y, b.y) + rad + 1));
      const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1e-6;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          let t = ((px - a.x) * dx + (py - a.y) * dy) / L;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = a.x + t * dx - px, ey = a.y + t * dy - py;
          const d = Math.sqrt(ex * ex + ey * ey);
          const v = d <= rad - 0.5 ? 1 : d >= rad + 0.5 ? 0 : rad + 0.5 - d;
          if (v > big[y * N + x]) big[y * N + x] = v;
        }
      }
    }
  }
  // 28×28로 줄이기
  const img = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      let sum = 0;
      for (let yy = 0; yy < R; yy++) for (let xx = 0; xx < R; xx++) sum += big[(y * R + yy) * N + x * R + xx];
      img[y * 28 + x] = sum / (R * R);
    }
  }
  // 무게중심을 가운데로 옮기기
  let mx = 0, my = 0, tot = 0;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) { const v = img[y * 28 + x]; mx += v * x; my += v * y; tot += v; }
  if (!tot) return img;
  const sx = Math.round(13.5 - mx / tot), sy = Math.round(13.5 - my / tot);
  if (!sx && !sy) return img;
  const out = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const nx = x + sx, ny = y + sy;
      if (nx >= 0 && nx < 28 && ny >= 0 && ny < 28) out[ny * 28 + nx] = img[y * 28 + x];
    }
  }
  return out;
}

// ---------- 여러 자리 숫자 나누기 ----------
// 가로로 겹치는 획끼리 한 숫자로 묶습니다 (예: 4, 5, 7처럼 두 번에 나눠 쓴 숫자).
export function groupStrokes(strokes, padHeight) {
  const boxes = strokes.map((st) => {
    const xs = st.map((p) => p.x), ys = st.map((p) => p.y);
    return { st, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  });
  // 아주 작은 점(실수로 찍은 것)은 버리기
  const minSize = (padHeight || 200) * 0.04;
  const real = boxes.filter((b) => Math.max(b.maxX - b.minX, b.maxY - b.minY) >= minSize);
  const list = (real.length ? real : boxes).sort((a, b) => a.minX - b.minX);
  const groups = [];
  for (const b of list) {
    const g = groups[groups.length - 1];
    if (g) {
      // 획 폭이 0에 가까운 세로획(1, 4의 세로줄)도 있으니 최소 폭을 둡니다
      const tol = minSize * 0.5;
      const overlap = Math.min(g.maxX, b.maxX) - Math.max(g.minX, b.minX);
      const narrow = Math.max(Math.min(g.maxX - g.minX, b.maxX - b.minX), minSize);
      const inside = b.minX >= g.minX - tol && b.maxX <= g.maxX + tol;
      if (inside || overlap > narrow * 0.3) {
        g.strokes.push(b.st);
        g.minX = Math.min(g.minX, b.minX); g.maxX = Math.max(g.maxX, b.maxX);
        continue;
      }
    }
    groups.push({ strokes: [b.st], minX: b.minX, maxX: b.maxX });
  }
  return groups.map((g) => g.strokes);
}

// 획 전체 → { text: "12", digits: [{digit, prob, alts:[{digit,prob}]}], sure }
export async function recognize(strokes, padHeight) {
  const model = await loadModel();
  const groups = groupStrokes(strokes.filter((s) => s.length), padHeight).slice(0, 3);
  const digits = groups.map((g) => {
    const probs = predict(model, rasterize(g));
    const ranked = probs.map((p, d) => ({ digit: d, prob: p })).sort((a, b) => b.prob - a.prob);
    return { digit: ranked[0].digit, prob: ranked[0].prob, alts: ranked.slice(1, 4).filter((r) => r.prob > 0.02) };
  });
  return { text: digits.map((d) => d.digit).join(''), digits, sure: digits.every((d) => d.prob >= 0.85) };
}
