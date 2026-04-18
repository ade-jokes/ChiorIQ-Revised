import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
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
import LeaderPage from './components/LeaderPage';

const queryClient = new QueryClient();

function RequireAuth({ user, children }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!user) {
      navigate({ to: '/' });
    }
  }, [navigate, user]);
  return user ? children : null;
}

function RequireLeader({ user, children }) {
  if (!user) {
    return null;
  }

  if (!['manager', 'admin'].includes(user.role)) {
    return (
      <main className="pageWrap">
        <section className="sectionCard">
          <h2>This portal is for Choir Managers and Admins.</h2>
          <p>Please use the member portal if you are a choir member.</p>
        </section>
      </main>
    );
  }

  return children;
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
      navigate({ to: '/leader' });
    }
  });

  const choirQuery = useQuery({
    queryKey: ['choir'],
    queryFn: () => api.getChoir(),
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

  const postAnnouncementMutation = useMutation({
    mutationFn: (payload) => api.createAnnouncement(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] })
  });

  const postNoteMutation = useMutation({
    mutationFn: (payload) => api.createNote(payload)
  });

  const user = meQuery.data?.user || null;

  const appCtx = {
    user,
    choir: choirQuery.data?.choir,
    announcements: announcementsQuery.data?.announcements || [],
    members: membersQuery.data?.members || [],
    choirStats: statsQuery.data,
    joinCode: joinCodeQuery.data?.joinCode,
    onLogin: (payload) => loginMutation.mutateAsync(payload),
    onRegister: (payload) => registerMutation.mutateAsync(payload),
    onLogout: () => {
      api.clearToken();
      setToken(null);
      qc.clear();
      navigate({ to: '/' });
    },
    onAskAi: (messages) => api.aiChat(messages),
    onPostAnnouncement: (payload) => postAnnouncementMutation.mutateAsync(payload),
    onAddNote: (payload) => postNoteMutation.mutateAsync(payload),
    loadingAuth: loginMutation.isPending || registerMutation.isPending
  };

  return (
    <div className="appRoot">
      <TopNav user={user} onLogout={appCtx.onLogout} />
      <Outlet context={appCtx} />
    </div>
  );
}

function LoginRoute() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const ctx = loginRoute.useRouteContext();
  if (ctx.user && location === '/') {
    navigate({ to: '/dashboard' });
  }
  return <AuthPage loading={ctx.loadingAuth} onLogin={ctx.onLogin} onRegister={ctx.onRegister} />;
}

function DashboardRoute() {
  const ctx = dashboardRoute.useRouteContext();
  return (
    <RequireAuth user={ctx.user}>
      <RequireLeader user={ctx.user}>
        <DashboardPage
          announcements={ctx.announcements}
          choir={ctx.choir}
          progressRows={[]}
          sessions={[]}
          user={ctx.user}
        />
      </RequireLeader>
    </RequireAuth>
  );
}

function LeaderRoute() {
  const ctx = leaderRoute.useRouteContext();
  return (
    <RequireAuth user={ctx.user}>
      <RequireLeader user={ctx.user}>
        <LeaderPage
          joinCode={ctx.joinCode}
          members={ctx.members}
          onAddNote={ctx.onAddNote}
          onPostAnnouncement={ctx.onPostAnnouncement}
          stats={ctx.choirStats}
        />
      </RequireLeader>
    </RequireAuth>
  );
}

const rootRoute = createRootRoute({ component: AppShell });

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LoginRoute });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: DashboardRoute });
const leaderRoute = createRoute({ getParentRoute: () => rootRoute, path: '/leader', component: LeaderRoute });

const routeTree = rootRoute.addChildren([loginRoute, dashboardRoute, leaderRoute]);

const router = createRouter({ routeTree });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
