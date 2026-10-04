import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import PlayerDialog from './components/PlayerDialog';
import HomePage from './pages/HomePage';
import TransfersPage from './pages/TransfersPage';
import PostsPage from './pages/PostsPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayersPage from './pages/PlayersPage';
import { getTeams, getTeamsByLeague } from './api/client';
import { LEAGUES } from './constants';
import { demo } from './demo';
import { leagueName } from './utils';

function AppRoutes() {
  const navigate = useNavigate();
  const [sample, setSample] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamError, setTeamError] = useState('');
  const [connection, setConnection] = useState({ message: '연결 확인 중', state: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [playerId, setPlayerId] = useState(null);
  const [postTeamId, setPostTeamId] = useState('all');

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
        const codes = LEAGUES.filter(([code]) => code !== 'unclassified').map(([code]) => code);
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
            failed.push(leagueName(code));
            return;
          }
          result.value.teams.forEach(team => leagueById.set(String(team.teamId), code));
        });

        const normalized = clubs.value.teams.map(team => ({
          ...team,
          leagueCode: leagueById.get(String(team.teamId)) || team.leagueCode
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

  function toggleSample() {
    setSample(current => !current);
    setPlayerId(null);
    setPostTeamId('all');
    setRefreshKey(value => value + 1);
  }

  function selectTeamPosts(teamId) {
    setPostTeamId(teamId);
    navigate('/posts');
  }

  return (
    <>
      <Routes>
        <Route
          element={
            <Layout
              sample={sample}
              onToggleSample={toggleSample}
              connection={connection}
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
                onPlayerOpen={setPlayerId}
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
                onPlayerOpen={setPlayerId}
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
              />
            }
          />
          <Route path="/teams" element={<TeamsPage teams={teams} error={teamError} />} />
          <Route
            path="/teams/:teamId"
            element={
              <TeamDetailPage
                sample={sample}
                teams={teams}
                onSelectTeamPosts={selectTeamPosts}
                onPlayerOpen={setPlayerId}
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
                onPlayerOpen={setPlayerId}
              />
            }
          />
        </Route>
      </Routes>

      <PlayerDialog
        playerId={playerId}
        sample={sample}
        teams={teams}
        onClose={() => setPlayerId(null)}
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
