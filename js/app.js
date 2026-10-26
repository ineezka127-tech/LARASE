import { html, render, useState, useEffect, useCallback } from '../vendor/preact-htm.js';
import { sb, configured, rpc, friendlyError } from './lib/sb.js';
import { Loading, RewardLayer, XPBar } from './components/ui.js';
import { LoginPage, SetupPage, NotConfigured, Onboarding } from './pages/auth.js';
import { StudentHome } from './pages/student-home.js';
import { LessonView } from './pages/lesson.js';
import { QuizPage } from './pages/quiz.js';
import { MePage } from './pages/me.js';
import { TeacherHome, StudentDetail } from './pages/teacher-home.js';
import { LessonList, LessonEditor } from './pages/teacher-lessons.js';
import { GradingPage } from './pages/grading.js';
import { StudentsPage } from './pages/teacher-students.js';
import { ClassMode } from './pages/classmode.js';

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
    <a class="brand" href="#/">📚 <span>${APP_NAME}</span></a>
    <nav>
      ${teacher
        ? html`${link('#/', '📊 현황')}${link('#/t/lessons', '📚 수업 자료')}${link('#/t/grading', '📝 채점')}${link('#/t/students', '👥 학생')}`
        : html`${link('#/', '🏠 홈')}${link('#/me', '🙋 내 정보')}`}
    </nav>
    ${teacher
      ? html`<button class="btn small ghost" onClick=${() => sb.auth.signOut()}>로그아웃</button>`
      : html`<a class="me-chip" href="#/me"><span class="me-avatar">${profile.avatar}</span><${XPBar} xp=${profile.xp} compact /></a>`}
  </header>`;
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
    if (status && !status.has_teacher) return html`<${SetupPage} onDone=${() => setStatus({ has_teacher: true })} />`;
    return html`<${LoginPage} appName=${APP_NAME} />`;
  }
  if (!profile) return html`<${Loading} />`;

  const teacher = profile.role === 'teacher';
  if (!teacher && !profile.display_name) return html`<${Onboarding} profile=${profile} onDone=${loadProfile} />`;

  const [p0, p1] = route.parts;
  const ctx = { profile, refreshProfile: loadProfile, query: route.query };

  // 수업 모드는 머리글 없이 화면 가득
  if (p0 === 'class' && teacher) return html`<${ClassMode} lessonId=${p1} />`;

  let page;
  if (p0 === 'lesson') page = html`<${LessonView} key=${p1} lessonId=${p1} ...${ctx} />`;
  else if (p0 === 'quiz') page = html`<${QuizPage} key=${p1 + JSON.stringify(route.query)} lessonId=${p1} ...${ctx} />`;
  else if (p0 === 'me' && !teacher) page = html`<${MePage} ...${ctx} />`;
  else if (teacher && p0 === 't') {
    const sub = p1;
    if (sub === 'lessons') page = html`<${LessonList} />`;
    else if (sub === 'lesson') page = html`<${LessonEditor} key=${route.parts[2]} lessonId=${route.parts[2]} />`;
    else if (sub === 'grading') page = html`<${GradingPage} />`;
    else if (sub === 'students') page = html`<${StudentsPage} />`;
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
