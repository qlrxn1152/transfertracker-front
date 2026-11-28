import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import PlayerDialog from './components/PlayerDialog';
import HomePage from './pages/HomePage';
import TransfersPage from './pages/TransfersPage';
import PostsPage from './pages/PostsPage';
import PostDetailPage from './pages/PostDetailPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayersPage from './pages/PlayersPage';
import AccountPage from './pages/AccountPage';
import FixturesPage from './pages/FixturesPage';
import KakaoAuthCallbackPage from './pages/KakaoAuthCallbackPage';
import { getTeams, getTeamsByLeague } from './api/client';
import { CORE_SERVER_LEAGUE_CODES, SERVER_LEAGUE_CODES } from './constants';
import { demo } from './demo';
import { leagueName } from './utils';
import { trackPageView } from './firebase/analytics';
import PostPushManager from './components/PostPushManager';

const SESSION_STORAGE_KEY = 'transfertracker.session';

function analyticsPageName(pathname) {
  if (pathname === '/') return 'home';
  if (pathname === '/transfers') return 'transfers';
  if (pathname === '/posts') return 'reporter_posts';
  if (pathname === '/fixtures' || pathname.startsWith('/fixtures/')) return 'fixtures';
  if (pathname.startsWith('/posts/')) return 'reporter_post_detail';
  if (pathname === '/teams') return 'teams';
  if (pathname.startsWith('/teams/')) return 'team_detail';
  if (pathname === '/players') return 'players';
  if (pathname === '/login') return 'login';
  if (pathname === '/signup') return 'signup';
  if (pathname === '/account') return 'account';
  if (pathname === '/auth/kakao/callback') return 'kakao_login_callback';
  return 'other';
}

function readStoredSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    return value?.accessToken ? value : null;
  } catch {
    return null;
  }
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sample, setSample] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamError, setTeamError] = useState('');
  const [connection, setConnection] = useState({ message: '연결 확인 중', state: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [playerId, setPlayerId] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [postTeamId, setPostTeamId] = useState('all');
  const [session, setSession] = useState(readStoredSession);
  const [playerFollowRefresh, setPlayerFollowRefresh] = useState(0);
  const lastTrackedPath = useRef('');

  useEffect(() => {
    if (lastTrackedPath.current === location.pathname) return;

    lastTrackedPath.current = location.pathname;
    trackPageView({
      path: location.pathname,
      pageName: analyticsPageName(location.pathname)
    });
  }, [location.pathname]);

  function updateSession(nextSession) {
    setSession(nextSession);
    if (nextSession) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const value = Number(params.get('player'));

    setPlayerId(Number.isSafeInteger(value) && value > 0 ? value : null);
  }, [location.search]);

  useEffect(() => {
    if (location.pathname !== '/posts') return;

    const teamId = new URLSearchParams(location.search).get('teamId');
    setPostTeamId(teamId || 'all');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTeams() {
      if (sample) {
        setTeams(demo.teams);
        setTeamError('');
        setConnection({ message: '샘플 데이터', state: '' });
        return;
      }

      setConnection({ message: '불러오는 중', state: '' });

      try {
        const codes = [...SERVER_LEAGUE_CODES];
        const results = await Promise.allSettled([
          getTeams(controller.signal),
          ...codes.map(code => getTeamsByLeague(code, controller.signal))
        ]);

        const clubs = results[0];
        if (clubs.status !== 'fulfilled' || !Array.isArray(clubs.value.teams)) {
          throw new Error(clubs.status === 'rejected'
            ? clubs.reason.message
            : '예상과 다른 클럽 응답 형식입니다.');
        }

        const leagueById = new Map();
        const failed = [];

        codes.forEach((code, index) => {
          const result = results[index + 1];
          if (result.status !== 'fulfilled' || !Array.isArray(result.value.teams)) {
            // 확장 대회 API는 백엔드 배포 순서에 따라 나중에 열릴 수 있다.
            // 기존 핵심 리그만 연결 상태 오류로 노출한다.
            if (CORE_SERVER_LEAGUE_CODES.has(code)) failed.push(leagueName(code));
            return;
          }
          result.value.teams.forEach(team => leagueById.set(String(team.teamId), code));
        });

        const normalized = clubs.value.teams.map(team => ({
          ...team,
          // 확장 수집 API가 리그 코드를 직접 내려 주는 경우를 우선 사용하고,
          // 기존 API 응답은 리그별 조회 결과로 보완한다.
          leagueCode: team.leagueCode ?? team.collectionLeagueCode ?? team.collectionLeague ?? leagueById.get(String(team.teamId))
        }));

        setTeams(normalized);
        setTeamError(failed.length ? `${failed.join(', ')} 팀 목록을 불러오지 못했습니다.` : '');
        setConnection({
          message: failed.length ? '일부 연결 실패' : 'API 연결됨',
          state: failed.length ? 'offline' : 'online'
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setTeams([]);
          setTeamError(error.message);
          setConnection({ message: '일부 연결 실패', state: 'offline' });
        }
      }
    }

    loadTeams();
    return () => controller.abort();
  }, [sample, refreshKey]);

  function openPlayer(id, transfer = null) {
    const value = Number(id);
    if (!Number.isSafeInteger(value) || value < 1) return;

    // URL 업데이트와 별개로 모달 상태를 즉시 연다.
    setPlayerId(value);
    setSelectedTransfer(transfer);

    const params = new URLSearchParams(location.search);
    params.set('player', String(value));

    navigate({
      pathname: location.pathname,
      search: `?${params.toString()}`
    });
  }

  function closePlayer() {
    setSelectedTransfer(null);
    const params = new URLSearchParams(location.search);
    params.delete('player');

    const search = params.toString();

    navigate({
      pathname: location.pathname,
      search: search ? `?${search}` : ''
    }, { replace: true });
  }

  function toggleSample() {
    if (playerId) closePlayer();
    setSample(current => !current);
    setPostTeamId('all');
    setRefreshKey(value => value + 1);
  }

  function selectTeamPosts(teamId) {
    setPostTeamId(teamId);
    navigate('/posts');
  }

  return (
    <>
      <PostPushManager session={session} />
      <Routes>
        <Route
          element={
            <Layout
              sample={sample}
              teams={teams}
              onPlayerOpen={openPlayer}
              onToggleSample={toggleSample}
              connection={connection}
              session={session}
              onLogout={() => updateSession(null)}
            />
          }
        >
          <Route
            path="/"
            element={
              <HomePage
                sample={sample}
                teams={teams}
                refreshKey={refreshKey}
                session={session}
                onPlayerOpen={openPlayer}
              />
            }
          />
          <Route
            path="/transfers"
            element={
              <TransfersPage
                sample={sample}
                teams={teams}
                refreshKey={refreshKey}
                onPlayerOpen={openPlayer}
              />
            }
          />
          <Route
            path="/posts"
            element={
              <PostsPage
                sample={sample}
                teams={teams}
                selectedTeamId={postTeamId}
                onSelectedTeamChange={setPostTeamId}
                session={session}
                onPlayerOpen={openPlayer}
              />
            }
          />
          <Route path="/fixtures" element={<FixturesPage teams={teams} />} />
          <Route path="/fixtures/:fixtureId" element={<FixturesPage teams={teams} />} />
          <Route path="/posts/:postId" element={<PostDetailPage sample={sample} teams={teams} />} />
          <Route path="/teams" element={<TeamsPage teams={teams} error={teamError} sample={sample} onPlayerOpen={openPlayer} />} />
          <Route
            path="/teams/:teamId"
            element={
              <TeamDetailPage
                sample={sample}
                teams={teams}
                session={session}
                onSelectTeamPosts={selectTeamPosts}
                onPlayerOpen={openPlayer}
              />
            }
          />
          <Route
            path="/players"
            element={
              <PlayersPage
                sample={sample}
                teams={teams}
                refreshKey={refreshKey}
                onPlayerOpen={openPlayer}
              />
            }
          />
          <Route
            path="/login"
            element={<AccountPage mode="login" teams={teams} session={session} onSessionChange={updateSession} />}
          />
          <Route
            path="/signup"
            element={<AccountPage mode="signup" teams={teams} session={session} onSessionChange={updateSession} />}
          />
          <Route
            path="/auth/kakao/callback"
            element={<KakaoAuthCallbackPage onSessionChange={updateSession} />}
          />
          <Route
            path="/account"
            element={
              <AccountPage
                mode="account"
                teams={teams}
                session={session}
                onSessionChange={updateSession}
                playerFollowRefresh={playerFollowRefresh}
                onPlayerOpen={openPlayer}
              />
            }
          />
        </Route>
      </Routes>

      <PlayerDialog
        playerId={playerId}
        selectedTransfer={selectedTransfer}
        sample={sample}
        teams={teams}
        session={session}
        onClose={closePlayer}
        onFavoriteChange={() => setPlayerFollowRefresh(value => value + 1)}
      />

      <Analytics />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
