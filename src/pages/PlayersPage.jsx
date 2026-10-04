import { useEffect, useState } from 'react';
import { getPlayers } from '../api/client';
import { demo } from '../demo';
import { leagueName, logoUrl, photoUrl, teamDisplayName } from '../utils';
import LeagueTeamFilters from '../components/LeagueTeamFilters';
import Pagination from '../components/Pagination';
import './PlayersPage.css';

export default function PlayersPage({ sample, teams, refreshKey, onPlayerOpen }) {
  const [state, setState] = useState({
    page: 0,
    keyWord: '',
    leagueCode: '',
    teamId: '',
    hasNext: false,
    hasPrevious: false,
    loading: true,
    error: ''
  });
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState(current => current.keyWord === search.trim()
        ? current
        : { ...current, page: 0, keyWord: search.trim() });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState(current => ({ ...current, loading: true, error: '' }));

      try {
        let data;

        if (sample) {
          let source = demo.players.filter(item =>
            String(item.playerName || '').toLowerCase().includes(state.keyWord.toLowerCase())
          );

          const size = 50;
          data = {
            players: source.slice(state.page * size, (state.page + 1) * size),
            hasNext: (state.page + 1) * size < source.length,
            hasPrevious: state.page > 0
          };
        } else {
          data = await getPlayers(state, controller.signal);
        }

        if (!Array.isArray(data.players)) throw new Error('예상과 다른 선수 목록 응답 형식입니다.');

        setPlayers(data.players);
        setState(current => ({
          ...current,
          hasNext: Boolean(data.hasNext),
          hasPrevious: current.page > 0 && Boolean(data.hasPrevious),
          loading: false,
          error: ''
        }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPlayers([]);
          setState(current => ({ ...current, loading: false, error: error.message }));
        }
      }
    }

    load();
    return () => controller.abort();
  }, [sample, state.page, state.keyWord, state.leagueCode, state.teamId, refreshKey]);

  const filters = [];
  if (state.leagueCode) filters.push(leagueName(state.leagueCode));
  if (state.teamId) {
    const selected = teams.find(team => String(team.teamId) === String(state.teamId));
    if (selected) filters.push(teamDisplayName(selected));
  }

  return (
    <section className="players-page">
      <header className="players-head">
        <div>
          <p className="eyebrow">PLAYER DIRECTORY</p>
          <h1>선수</h1>
          <p>선수를 검색하고 현재 소속팀과 이적 기록으로 바로 이동하세요.</p>
        </div>
        <strong>{players.length}<span>현재 페이지</span></strong>
      </header>

      <label className="search players-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="선수 이름 검색"
          aria-label="선수 검색"
        />
      </label>

      <LeagueTeamFilters
        prefix="players"
        leagueCode={state.leagueCode}
        teamId={state.teamId}
        teams={teams}
        onLeagueChange={leagueCode => setState(current => ({ ...current, page: 0, leagueCode, teamId: '' }))}
        onTeamChange={teamId => setState(current => ({ ...current, page: 0, teamId }))}
      />

      {state.loading ? (
        <div className="empty list-loading">목록을 불러오는 중…</div>
      ) : players.length ? (
        <div className="players-cards" aria-live="polite">
          {players.map(item => {
            const displayTeamName = item.teamNameKo ?? item.teamName;
            const team = teams.find(candidate => candidate.teamName === item.teamName)
              || teams.find(candidate => teamDisplayName(candidate) === displayTeamName);
            const picture = photoUrl(item.photoUrl);

            return (
              <button className="players-card" type="button" key={item.playerId} onClick={() => onPlayerOpen(Number(item.playerId))}>
                <div className="players-photo">
                  <span>{(item.playerName || '?').slice(0,1)}</span>
                  {picture && <img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                </div>

                <div className="players-card-copy">
                  <small>PLAYER #{item.playerId}</small>
                  <h3>{item.playerName}</h3>

                  <div className="players-team">
                    <span>
                      {displayTeamName?.slice(0,1) || '?'}
                      {team && logoUrl(team.logoUrl) && <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />}
                    </span>
                    <strong>{displayTeamName || '소속팀 정보 없음'}</strong>
                  </div>
                </div>

                <span className="players-open">상세 →</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={`empty ${state.error ? 'error' : ''}`}>
          {state.error || (state.keyWord ? '검색 조건에 맞는 선수가 없습니다.' : '아직 등록된 선수가 없습니다.')}
        </div>
      )}

      <p className="showing">
        {state.page + 1} 페이지 · {players.length}명 표시
        {filters.length ? ` · ${filters.join(' · ')}` : ''}
      </p>

      <Pagination
        page={state.page}
        hasPrevious={state.hasPrevious}
        hasNext={state.hasNext}
        loading={state.loading}
        onPage={page => setState(current => ({ ...current, page }))}
      />
    </section>
  );
}
