import { useEffect, useState } from 'react';
import { getPlayer, getPlayerRankings, getPlayerSeasonStatistics, getPlayers } from '../api/client';
import { demo } from '../demo';
import { leagueName, logoUrl, photoUrl, teamDisplayName, teamLeague } from '../utils';
import LeagueTeamFilters from '../components/LeagueTeamFilters';
import Pagination from '../components/Pagination';
import LoadingPlaceholder from '../components/LoadingPlaceholder';
import './PlayersPage.css';
import { CORE_SERVER_LEAGUE_CODES, OTHER_LEAGUE_CODE, SERVER_LEAGUE_CODES } from '../constants';

const CORE_PLAYER_FILTER = 'CORE';
const rankingPlayerName = item => item?.displayName || item?.playerDisplayName || item?.playerNameKo || item?.playerName || '선수 정보 없음';

function rankingClub(item, resolvedTeams, teams) {
  const key = String(item?.playerId ?? '');
  const teamName = item?.teamName || resolvedTeams[key];
  if (!teamName) return { name: Object.hasOwn(resolvedTeams, key) ? '소속팀 미등록' : '소속팀 확인 중', crest: '' };
  const team = teams.find(candidate => candidate?.teamName === teamName || teamDisplayName(candidate) === teamName);
  return { name: team ? teamDisplayName(team) : teamName, crest: logoUrl(item?.teamLogoUrl || item?.teamLogo || team?.logoUrl) };
}

function PlayerRankings({ leagueCode, onPlayerOpen, teams }) {
  const [state, setState] = useState({ goals: [], assists: [] });
  const [resolvedTeams, setResolvedTeams] = useState({});
  useEffect(() => {
    if (!leagueCode) { setState({ goals: [], assists: [] }); return undefined; }
    const controller = new AbortController();
    Promise.allSettled([
      getPlayerRankings({ leagueCode, type: 'GOALS' }, controller.signal),
      getPlayerRankings({ leagueCode, type: 'ASSISTS' }, controller.signal)
    ]).then(([goals, assists]) => {
      if (controller.signal.aborted) return;
      setState({ goals: goals.status === 'fulfilled' && Array.isArray(goals.value) ? goals.value : [], assists: assists.status === 'fulfilled' && Array.isArray(assists.value) ? assists.value : [] });
    });
    return () => controller.abort();
  }, [leagueCode]);
  useEffect(() => {
    setResolvedTeams({});
  }, [leagueCode]);
  useEffect(() => {
    const rows = [...state.goals, ...state.assists];
    const unresolved = [...new Map(rows.filter(item => item?.playerId && !item?.teamName && !Object.hasOwn(resolvedTeams, String(item.playerId))).map(item => [item.playerId, item])).values()];
    if (!unresolved.length) return undefined;
    const controller = new AbortController();
    Promise.allSettled(unresolved.map(async item => {
      const player = await getPlayer(item.playerId, controller.signal);
      if (player?.teamName) return [String(item.playerId), player.teamName];
      const statistics = await getPlayerSeasonStatistics(item.playerId, controller.signal);
      const record = Array.isArray(statistics)
        ? [...statistics].filter(entry => String(entry?.leagueCode || '') === String(leagueCode)).sort((a, b) => Number(b?.minutes || 0) - Number(a?.minutes || 0))[0]
        : null;
      return [String(item.playerId), record?.teamName || ''];
    })).then(results => {
      if (controller.signal.aborted) return;
      setResolvedTeams(current => ({ ...current, ...Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(result => result.value)) }));
    });
    return () => controller.abort();
  }, [leagueCode, resolvedTeams, state.assists, state.goals]);
  if (!state.goals.length && !state.assists.length) return null;
  const render = (title, rows, unit) => <section><h3>{title}</h3>{rows.slice(0, 5).map(item => {
    const name = rankingPlayerName(item);
    const club = rankingClub(item, resolvedTeams, teams);
    const leader = Number(item.ranking) === 1;
    return <button type="button" key={`${title}-${item.playerId}`} onClick={() => onPlayerOpen(Number(item.playerId))}><span className="player-ranking-position">{item.ranking}</span><span className="player-ranking-photo">{name.slice(0, 1)}{photoUrl(item.photoUrl) && <img src={photoUrl(item.photoUrl)} alt="" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}</span><span className="player-ranking-copy"><strong>{leader && <span className="player-ranking-trophy" title={title === '득점 랭킹' ? '득점왕' : '도움왕'}>🏆</span>}{name}</strong><span className="player-ranking-club">{club.crest && <img src={club.crest} alt="" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}<em>{club.name}</em></span></span><b>{item.value ?? 0}<small>{unit}</small></b></button>;
  })}</section>;
  return <div className="player-rankings">{render('득점 랭킹', state.goals, '골')}{render('도움 랭킹', state.assists, '도움')}</div>;
}

export default function PlayersPage({ sample, teams, refreshKey, onPlayerOpen }) {
  const [state, setState] = useState({
    page: 0,
    keyWord: '',
    leagueCode: CORE_PLAYER_FILTER,
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
        } else if (state.leagueCode === CORE_PLAYER_FILTER) {
          const sources = await Promise.all([...CORE_SERVER_LEAGUE_CODES].map(leagueCode => getPlayers({ ...state, leagueCode }, controller.signal)));
          const slots = 8;
          const players = Array.from({ length: slots }, (_, index) => sources.map(source => source?.players?.[index]).filter(Boolean)).flat();
          data = { players, hasNext: sources.some(source => source?.hasNext), hasPrevious: state.page > 0 };
        } else {
          data = await getPlayers({
            ...state,
            leagueCode: SERVER_LEAGUE_CODES.has(state.leagueCode) ? state.leagueCode : ''
          }, controller.signal);
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

  const visiblePlayers = state.leagueCode && state.leagueCode !== CORE_PLAYER_FILTER && !SERVER_LEAGUE_CODES.has(state.leagueCode)
    ? players.filter(player => {
      const team = teams.find(candidate => candidate.teamName === player.teamName || teamDisplayName(candidate) === (player.teamNameKo ?? player.teamName));
      const playerLeague = teamLeague(team);
      return state.leagueCode === OTHER_LEAGUE_CODE ? playerLeague === OTHER_LEAGUE_CODE : playerLeague === state.leagueCode;
    })
    : players;

  const filters = [];
  if (state.leagueCode) filters.push(state.leagueCode === CORE_PLAYER_FILTER ? '주요 리그' : leagueName(state.leagueCode));
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
          <p>주요 리그 선수를 먼저 보고, 소속팀과 이적 기록으로 바로 이동하세요.</p>
        </div>
        <strong>{visiblePlayers.length}<span>현재 페이지</span></strong>
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

      {!sample && SERVER_LEAGUE_CODES.has(state.leagueCode) && <PlayerRankings leagueCode={state.leagueCode} teams={teams} onPlayerOpen={onPlayerOpen} />}

      {state.loading ? (
        <LoadingPlaceholder label="선수 목록을 불러오는 중입니다." />
      ) : visiblePlayers.length ? (
        <div className="players-cards" aria-live="polite">
          {visiblePlayers.map(item => {
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
        {state.page + 1} 페이지 · {visiblePlayers.length}명 표시
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
