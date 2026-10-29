import { html, render, useState, useEffect, useCallback } from '../vendor/preact-htm.js';
import { sb, configured, rpc, friendlyError, APP_MODE, OTHER_PAGE } from './lib/sb.js';
import { Loading, RewardLayer, XPBar } from './components/ui.js';
import { LoginPage, SetupPage, NotConfigured, Onboarding } from './pages/auth.js';
import { StudentHome } from './pages/student-home.js';
import { LessonView } from './pages/lesson.js';
import { QuizPage } from './pages/quiz.js';
import { MePage } from './pages/me.js';
import { AvatarPage } from './pages/avatar.js';
import { ShopPage } from './pages/shop.js';
import { AvatarImg } from './components/avatar-ui.js';
import { PraiseButton } from './components/praise.js';
import { TeacherHome, StudentDetail } from './pages/teacher-home.js';
import { LessonList, LessonEditor } from './pages/teacher-lessons.js';
import { GradingPage } from './pages/grading.js';
import { StudentsPage } from './pages/teacher-students.js';
import { ClassMode } from './pages/classmode.js';
import { SubjectsPage } from './pages/teacher-subjects.js';
import { GamePage } from './pages/game.js';
import { LiveDashboard } from './pages/teacher-live.js';
import { ReportPage } from './pages/teacher-report.js';
import { StatsPage } from './pages/teacher-stats.js';

const APP_NAME = window.APP_CONFIG?.APP_NAME || '복습 교실';

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function useRoute() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function Header({ profile }) {
  const teacher = profile.role === 'teacher';
  const here = location.hash || '#/';
  const link = (href, label) => html`<a href=${href} class=${here === href || (href !== '#/' && here.startsWith(href)) ? 'on' : ''}>${label}</a>`;
  return html`<header class="topbar">
    <a class="brand" href="#/">${teacher ? '🧑‍🏫' : '📚'} <span>${APP_NAME}</span>${teacher && html`<span class="mode-tag">선생님</span>`}</a>
    <nav>
      ${teacher
        ? html`${link('#/', '📊 현황')}${link('#/t/live', '📡 실시간')}${link('#/t/stats', '📊 통계')}${link('#/t/lessons', '📚 수업 자료')}${link('#/t/grading', '📝 채점')}${link('#/t/students', '👥 학생')}${link('#/t/report', '📄 리포트')}`
        : html`${link('#/', '🏠 홈')}${link('#/game', '🎲 모험')}${link('#/avatar', '🧑‍🎨 꾸미기')}${link('#/shop', '🛍️ 상점')}${link('#/me', '🙋 내 정보')}`}
    </nav>
    ${teacher
      ? html`<a class="btn small" href=${OTHER_PAGE} target="_blank" rel="noopener" title="학생 페이지를 새 탭으로 열어요 (테스트 계정으로 들어가 보세요)">👀<span class="hide-narrow"> 학생 화면</span></a><${PraiseButton} className="btn small good" label="🎁 칭찬" /><button class="btn small ghost" onClick=${() => sb.auth.signOut()}>로그아웃</button>`
      : html`<a class="me-chip" href="#/me"><${AvatarImg} cfg=${profile.avatar_cfg} size=${40} /><span class="me-chip-body"><${XPBar} xp=${profile.xp} compact /><span class="coin-chip">🪙 ${profile.coins ?? 0}</span></span></a>`}
  </header>`;
}

// 페이지를 잘못 찾아왔을 때
function WrongPage({ icon, text }) {
  return html`<div class="login-wrap"><div class="card login">
    <div class="login-logo">${icon}</div>
    <p><b>${text}</b></p>
    <div class="btn-col">
      <a class="btn big primary block" href=${OTHER_PAGE}>${APP_MODE === 'teacher' ? '📚 학생 페이지로 가기' : '🧑‍🏫 선생님 페이지로 가기'}</a>
      <button class="btn ghost block" onClick=${() => sb.auth.signOut()}>이 페이지에서 로그아웃</button>
    </div>
  </div></div>`;
}

function App() {
  const route = useRoute();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    rpc('app_status').then(setStatus).catch((e) => setError(friendlyError(e)));
    return () => data.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session) { setProfile(null); return; }
    const { data, error: err } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (err) setError(friendlyError(err));
    else if (!data) setError('프로필을 찾을 수 없어요. 선생님께 알려 주세요.');
    else { setError(null); setProfile(data); }
  }, [session?.user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (!configured) return html`<${NotConfigured} />`;
  if (error && !profile) return html`<div class="page narrow"><div class="error-box">⚠️ ${error}</div>
    <button class="btn" onClick=${() => location.reload()}>새로고침</button>
    ${session && html` <button class="btn ghost" onClick=${() => sb.auth.signOut()}>로그아웃</button>`}</div>`;
  if (session === undefined) return html`<${Loading} />`;

  if (!session) {
    if (status && !status.has_teacher) {
      if (APP_MODE === 'teacher') return html`<${SetupPage} onDone=${() => setStatus({ has_teacher: true })} />`;
      return html`<${WrongPage} icon="🧑‍🏫" text="아직 선생님 계정이 없어요. 선생님 페이지에서 먼저 설정해 주세요." />`;
    }
    return html`<${LoginPage} appName=${APP_NAME} />`;
  }
  if (!profile) return html`<${Loading} />`;

  const teacher = profile.role === 'teacher';
  // 페이지와 계정 종류가 다르면 맞는 페이지로 안내
  if (APP_MODE === 'teacher' && !teacher) return html`<${WrongPage} icon="📚" text="학생 계정이에요. 학생 페이지에서 들어가 주세요." />`;
  if (APP_MODE === 'student' && teacher) return html`<${WrongPage} icon="🧑‍🏫" text="선생님 계정은 선생님 페이지에서 써요. 이 페이지는 학생(테스트 계정)용이에요." />`;
  if (!teacher && !profile.display_name) return html`<${Onboarding} profile=${profile} onDone=${loadProfile} />`;

  const [p0, p1] = route.parts;
  const ctx = { profile, refreshProfile: loadProfile, query: route.query };

  // 수업 모드는 머리글 없이 화면 가득
  if (p0 === 'class' && teacher) return html`<${ClassMode} lessonId=${p1} />`;

  let page;
  if (p0 === 'lesson') page = html`<${LessonView} key=${p1} lessonId=${p1} ...${ctx} />`;
  else if (p0 === 'quiz') page = html`<${QuizPage} key=${route.parts.join('/') + JSON.stringify(route.query)} source=${p1 === 'topic' ? { topic: route.parts[2] } : p1 === 'range' ? { range: route.query } : { lesson: p1 }} ...${ctx} />`;
  else if (p0 === 'me' && !teacher) page = html`<${MePage} ...${ctx} />`;
  else if (p0 === 'game') page = html`<${GamePage} ...${ctx} />`;
  else if (p0 === 'avatar' && !teacher) page = html`<${AvatarPage} ...${ctx} />`;
  else if (p0 === 'shop') page = html`<${ShopPage} ...${ctx} />`;
  else if (teacher && p0 === 't') {
    const sub = p1;
    if (sub === 'lessons') page = html`<${LessonList} />`;
    else if (sub === 'lesson') page = html`<${LessonEditor} key=${route.parts[2]} lessonId=${route.parts[2]} />`;
    else if (sub === 'grading') page = html`<${GradingPage} />`;
    else if (sub === 'students') page = html`<${StudentsPage} />`;
    else if (sub === 'subjects') page = html`<${SubjectsPage} />`;
    else if (sub === 'live') page = html`<${LiveDashboard} />`;
    else if (sub === 'stats') page = html`<${StatsPage} lessonId=${route.parts[2]} />`;
    else if (sub === 'report') page = html`<${ReportPage} studentId=${route.parts[2]} />`;
    else if (sub === 'student') page = html`<${StudentDetail} key=${route.parts[2]} studentId=${route.parts[2]} />`;
  }
  if (!page) page = teacher ? html`<${TeacherHome} />` : html`<${StudentHome} ...${ctx} />`;

  return html`<div class=${teacher ? 'app teacher' : 'app student'}>
    <${Header} profile=${profile} />
    <main>${page}</main>
    <${RewardLayer} onChange=${loadProfile} />
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
