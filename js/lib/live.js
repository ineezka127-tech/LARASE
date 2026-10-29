// 👀 실시간 지켜보기: 선생님이 켜 두었을 때만, 학생 화면이 지금 푸는 문제와 입력 중인 답을 알려요
import { sb, rpc } from './sb.js';

let watch = { on: false, drafts: false };
let checkedAt = 0;

// 선생님이 지켜보기를 켰는지 (1분마다 다시 확인)
export async function liveWatch(force = false) {
  if (!force && Date.now() - checkedAt < 60000) return watch;
  try { watch = (await rpc('live_watch')) || { on: false }; } catch { watch = { on: false, drafts: false }; }
  checkedAt = Date.now();
  return watch;
}

// 지금 상태 보내기 (보낸 칸만 바뀌어요)
export async function liveReport(profile, patch) {
  if (!profile || profile.role === 'teacher') return;
  const w = await liveWatch();
  if (!w.on) return;
  const row = { user_id: profile.id, ...patch, updated_at: new Date().toISOString() };
  if (!w.drafts && !patch.answered && 'draft' in row) delete row.draft;   // 입력 중인 답은 선생님이 허락했을 때만
  try { await sb.from('live_status').upsert(row); } catch {}
}

// 입력 중인 답은 잠깐 멈췄을 때 보내요 (글자마다 보내지 않게)
let timer = null;
export function liveDraft(profile, draft) {
  if (!watch.on || !watch.drafts) return;
  clearTimeout(timer);
  timer = setTimeout(() => liveReport(profile, { draft, answered: false }), 900);
}
export function cancelDraft() { clearTimeout(timer); }
