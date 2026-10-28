// Supabase 연결과 로그인 도우미
const cfg = window.APP_CONFIG || {};

// 📄 어느 페이지인지: index.html = 학생 페이지, teacher.html = 선생님 페이지
// 로그인 정보를 따로 저장해서, 같은 브라우저에서 선생님 페이지와 학생(테스트) 페이지를 동시에 열어 둘 수 있어요
export const APP_MODE = window.APP_MODE === 'teacher' ? 'teacher' : 'student';
export const OTHER_PAGE = APP_MODE === 'teacher' ? './' : './teacher.html';

export const configured =
  !!cfg.SUPABASE_URL && !!cfg.SUPABASE_KEY &&
  !cfg.SUPABASE_URL.includes('여기에') && !cfg.SUPABASE_KEY.includes('여기에');

export const sb = configured
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: APP_MODE === 'teacher' ? 'bokseup-teacher-auth' : 'bokseup-auth' },
    })
  : null;

// 선생님 로그인을 유지한 채로 학생 계정을 만들 때 쓰는 임시 연결
export function tempClient() {
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'bokseup-temp' },
  });
}

export function normalizeLoginId(id) {
  return String(id || '').replace(/\s+/g, '').toLowerCase();
}

// 한글 아이디도 쓸 수 있도록 아이디를 16진수로 바꿔 내부 계정 주소로 만듭니다.
export function idToEmail(id) {
  const bytes = new TextEncoder().encode(normalizeLoginId(id));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `u${hex}@${cfg.EMAIL_DOMAIN || 'bokseup.app'}`;
}

// Supabase는 비밀번호가 6자 이상이어야 해서 앞뒤에 고정 글자를 붙입니다. (학생은 1234만 입력)
export function wrapPassword(pw) {
  return `bok!${pw}!seup`;
}

export async function signIn(loginId, password) {
  const { error } = await sb.auth.signInWithPassword({
    email: idToEmail(loginId),
    password: wrapPassword(password),
  });
  if (error) throw error;
}

export async function createAccount({ loginId, password, role = 'student', grade = null }) {
  const client = tempClient();
  const { data, error } = await client.auth.signUp({
    email: idToEmail(loginId),
    password: wrapPassword(password),
    options: { data: { login_id: normalizeLoginId(loginId), role, grade: grade ?? '' } },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('계정은 만들어졌지만 바로 로그인할 수 없어요. Supabase에서 "Confirm email"을 꺼 주세요.');
  }
  return data.user;
}

export async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args);
  if (error) throw error;
  return data;
}

// 오류 메시지를 쉬운 한국어로
export function friendlyError(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return '아이디나 비밀번호가 맞지 않아요.';
  if (/already registered|already been registered|User already/i.test(m)) return '이미 있는 아이디예요.';
  if (/email (signups|logins|provider).*disabled|email.*not enabled/i.test(m)) return `Supabase에서 이메일 로그인 방식이 꺼져 있어요. (Authentication → Sign In / Providers → 아래 목록의 Email → Enable Email provider 켜기) [${m}]`;
  if (/Signups not allowed|signup.*disabled/i.test(m)) return `Supabase에서 새 계정 만들기가 꺼져 있어요. (Authentication → Sign In / Providers → Allow new users to sign up) [${m}]`;
  if (/SIGNUP_CLOSED|Database error saving new user/i.test(m)) return '새 계정 만들기가 잠겨 있어요. 선생님 페이지 → 👥 학생 관리에서 계정을 만들어 주세요. (그때 10분 동안만 열려요)';
  if (/duplicate key|already exists|23505/i.test(m)) return '이미 있는 이름이에요. 다른 이름을 써 주세요.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return '인터넷 연결을 확인해 주세요.';
  if (/rate limit/i.test(m)) return '잠시 후에 다시 해 주세요. (요청이 너무 많아요)';
  return m ? `오류: ${m}` : '알 수 없는 오류가 났어요.';
}
