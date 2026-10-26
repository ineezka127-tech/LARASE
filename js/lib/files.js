// 판서·PDF 파일을 이미지로 바꾸고 줄여서 저장합니다 (저장 공간 절약)
import { sb } from './sb.js';

const BUCKET = 'lesson-files';
const MAX_SIDE = 1600;
const QUALITY = 0.8;

let pdfjsPromise = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('../../vendor/pdf.min.mjs').then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdf.worker.min.mjs', import.meta.url).href;
      return m;
    });
  }
  return pdfjsPromise;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
}

function fitCanvas(w, h) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; // 투명 배경(PNG 판서)을 흰색으로
  ctx.fillRect(0, 0, c.width, c.height);
  return { c, ctx, scale };
}

export async function imageToJpeg(file) {
  const bmp = await createImageBitmap(file);
  const { c, ctx } = fitCanvas(bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return canvasToBlob(c);
}

export async function pdfPageCount(file) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const n = doc.numPages;
  doc.destroy();
  return n;
}

// pages: 변환할 쪽 번호 배열 (1부터)
export async function pdfToJpegs(file, pages, onProgress) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    const page = await doc.getPage(pages[i]);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = MAX_SIDE / Math.max(vp1.width, vp1.height);
    const vp = page.getViewport({ scale });
    const { c, ctx } = fitCanvas(vp.width, vp.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.push(await canvasToBlob(c));
    onProgress?.(i + 1, pages.length);
  }
  doc.destroy();
  return out;
}

export async function uploadJpeg(lessonId, blob) {
  const path = `${lessonId}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function removeFiles(paths) {
  if (!paths?.length) return;
  await sb.storage.from(BUCKET).remove(paths);
}

const urlCache = new Map();
export async function signedUrls(paths) {
  const need = paths.filter((p) => !urlCache.has(p));
  if (need.length) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(need, 60 * 60 * 6);
    if (error) throw error;
    data.forEach((d) => d.signedUrl && urlCache.set(d.path, d.signedUrl));
  }
  return paths.map((p) => urlCache.get(p)).filter(Boolean);
}

// "1-3, 5" → [1,2,3,5]
export function parsePageRange(text, max) {
  const set = new Set();
  String(text).split(',').forEach((part) => {
    const m = part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return;
    const a = Number(m[1]);
    const b = Number(m[2] || m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) set.add(i);
  });
  return [...set].sort((x, y) => x - y);
}
