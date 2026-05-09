import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
  useRouterState
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './lib/api';
import './styles.css';
import TopNav from './components/TopNav';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import SessionPage from './components/SessionPage';
import ProgressPage from './components/ProgressPage';
import NotesPage from './components/NotesPage';
import LeaderPage from './components/LeaderPage';

const queryClient = new QueryClient();
const AppContext = React.createContext(null);

function useAppContext() {
  return React.useContext(AppContext);
}

function RequireAuth({ user, children }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!user) {
      navigate({ to: '/' });
    }
  }, [navigate, user]);
  return user ? children : null;
}

function AppShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [token, setToken] = React.useState(api.getToken());

  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: () => api.me(),
    enabled: Boolean(token),
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: (payload) => api.login(payload),
    onSuccess: (res) => {
      api.setToken(res.token);
      setToken(res.token);
      qc.invalidateQueries();
      navigate({ to: '/dashboard' });
    }
  });

  const registerMutation = useMutation({
    mutationFn: (payload) => api.register(payload),
    onSuccess: (res) => {
      api.setToken(res.token);
      setToken(res.token);
      qc.invalidateQueries();
      navigate({ to: '/dashboard' });
    }
  });

  const choirQuery = useQuery({
    queryKey: ['choir'],
    queryFn: () => api.getChoir(),
    enabled: Boolean(meQuery.data?.user)
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.listSessions(),
    enabled: Boolean(meQuery.data?.user)
  });

  const progressQuery = useQuery({
    queryKey: ['progress-me'],
    queryFn: () => api.myProgress(),
    enabled: Boolean(meQuery.data?.user)
  });

  const notesQuery = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.getMyNotes(),
    enabled: Boolean(meQuery.data?.user)
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(),
    enabled: Boolean(meQuery.data?.user)
  });

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: () => api.getMembers(),
    enabled: Boolean(meQuery.data?.user && ['manager', 'admin'].includes(meQuery.data.user.role))
  });

  const statsQuery = useQuery({
    queryKey: ['choir-progress'],
    queryFn: () => api.choirProgress(),
    enabled: Boolean(meQuery.data?.user && ['manager', 'admin'].includes(meQuery.data.user.role))
  });

  const joinCodeQuery = useQuery({
    queryKey: ['join-code'],
    queryFn: () => api.getJoinCode(),
    enabled: Boolean(meQuery.data?.user && ['manager', 'admin'].includes(meQuery.data.user.role))
  });

  const managersQuery = useQuery({
    queryKey: ['admin-managers'],
    queryFn: () => api.listManagers(),
    enabled: Boolean(meQuery.data?.user && meQuery.data.user.role === 'admin')
  });

  const completeMutation = useMutation({
    mutationFn: (payload) => api.logProgress(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress-me'] });
      qc.invalidateQueries({ queryKey: ['me', token] });
      qc.invalidateQueries({ queryKey: ['choir-progress'] });
    }
  });

  const postAnnouncementMutation = useMutation({
    mutationFn: (payload) => api.createAnnouncement(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] })
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateAnnouncement(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] })
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateMember(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] })
  });

  const postNoteMutation = useMutation({
    mutationFn: (payload) => api.createNote(payload)
  });

  const user = meQuery.data?.user || null;

  const appCtx = {
    user,
    sessions: sessionsQuery.data?.sessions || [],
    progressRows: progressQuery.data?.progress || [],
    choir: choirQuery.data?.choir,
    notes: notesQuery.data?.notes || [],
    announcements: announcementsQuery.data?.announcements || [],
    members: membersQuery.data?.members || [],
    choirStats: statsQuery.data,
    joinCode: joinCodeQuery.data?.joinCode,
    managers: managersQuery.data?.managers || [],
    onLogin: (payload) => loginMutation.mutateAsync(payload),
    onRegister: (payload) => registerMutation.mutateAsync(payload),
    onLogout: () => {
      api.clearToken();
      setToken(null);
      qc.clear();
      navigate({ to: '/' });
    },
    onCompleteSession: (sessionId, payload) => completeMutation.mutateAsync({ sessionId, ...payload }),
    onAskAi: (messages) => api.aiChat(messages),
    onPostAnnouncement: (payload) => postAnnouncementMutation.mutateAsync(payload),
    onUpdateAnnouncement: (id, payload) => updateAnnouncementMutation.mutateAsync({ id, payload }),
    onAddNote: (payload) => postNoteMutation.mutateAsync(payload),
    onUpdateMember: (id, payload) => updateMemberMutation.mutateAsync({ id, payload }),
    loadingAuth: loginMutation.isPending || registerMutation.isPending
  };

  return (
    <AppContext.Provider value={appCtx}>
      <div className={`appRoot${user ? ' authed' : ''}`}>
        <TopNav user={user} onLogout={appCtx.onLogout} />
        <Outlet />
      </div>
    </AppContext.Provider>
  );
}

function LoginRoute() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const ctx = useAppContext();
  if (ctx.user && location === '/') {
    navigate({ to: '/dashboard' });
  }
  return <AuthPage loading={ctx.loadingAuth} onLogin={ctx.onLogin} onRegister={ctx.onRegister} />;
}

function DashboardRoute() {
  const ctx = useAppContext();
  return (
    <RequireAuth user={ctx.user}>
      <DashboardPage
        announcements={ctx.announcements}
        choir={ctx.choir}
        onAskAi={ctx.onAskAi}
        progressRows={ctx.progressRows}
        sessions={ctx.sessions}
        user={ctx.user}
      />
    </RequireAuth>
  );
}

function SessionRoute() {
  const ctx = useAppContext();
  const { sessionId } = sessionRoute.useParams();
  const session = ctx.sessions.find((item) => item.id === sessionId) || ctx.sessions.find((item) => String(item.order) === sessionId) || ctx.sessions[0];
  return (
    <RequireAuth user={ctx.user}>
      <SessionPage
        onAskAi={ctx.onAskAi}
        onComplete={(payload) => ctx.onCompleteSession(session?.id, payload)}
        session={session}
      />
    </RequireAuth>
  );
}

function ProgressRoute() {
  const ctx = useAppContext();
  return (
    <RequireAuth user={ctx.user}>
      <ProgressPage progressRows={ctx.progressRows} user={ctx.user} />
    </RequireAuth>
  );
}

function NotesRoute() {
  const ctx = useAppContext();
  return (
    <RequireAuth user={ctx.user}>
      <NotesPage notes={ctx.notes} />
    </RequireAuth>
  );
}

function LeaderRoute() {
  const ctx = useAppContext();
  if (!ctx.user || !['manager', 'admin'].includes(ctx.user.role)) {
    return (
      <main className="pageWrap">
        <section className="sectionCard">
          <h2>Leader view is available for manager/admin roles only.</h2>
          <Link to="/dashboard">Back to dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <LeaderPage
      user={ctx.user}
      joinCode={ctx.joinCode}
      members={ctx.members}
      managers={ctx.managers}
      announcements={ctx.announcements}
      onAddNote={ctx.onAddNote}
      onPostAnnouncement={ctx.onPostAnnouncement}
      onUpdateAnnouncement={ctx.onUpdateAnnouncement}
      onUpdateMember={ctx.onUpdateMember}
      stats={ctx.choirStats}
    />
  );
}

const rootRoute = createRootRoute({ component: AppShell });

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LoginRoute });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: DashboardRoute });
const sessionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/session/$sessionId', component: SessionRoute });
const progressRoute = createRoute({ getParentRoute: () => rootRoute, path: '/progress', component: ProgressRoute });
const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notes', component: NotesRoute });
const leaderRoute = createRoute({ getParentRoute: () => rootRoute, path: '/leader', component: LeaderRoute });

const routeTree = rootRoute.addChildren([loginRoute, dashboardRoute, sessionRoute, progressRoute, notesRoute, leaderRoute]);

const router = createRouter({ routeTree });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
