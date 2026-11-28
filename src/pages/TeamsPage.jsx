import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueStandings, getPlayerRankings } from '../api/client';
import { LEAGUES, OTHER_LEAGUE, STANDING_LEAGUE_CODES } from '../constants';
import { logoUrl, photoUrl, teamDisplayName, teamLeague, text } from '../utils';
import TeamCompare from '../components/TeamCompare';

const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const matchesClubSearch = (name, query) => {
  const value = String(name || '');
  const initials = value.split('').map(character => {
    const code = character.charCodeAt(0) - 0xac00;
    return code >= 0 && code < 11172 ? INITIALS[Math.floor(code / 588)] : character;
  }).join('');
  return text(value).includes(text(query)) || initials.includes(text(query));
};

function standingOutcome(row) {
  const description = String(row?.description || '').toLowerCase();
  if (description.includes('champions league')) return { code: 'champions', label: '챔피언스리그권' };
  if (description.includes('europa league')) return { code: 'europa', label: '유로파리그권' };
  if (description.includes('conference league')) return { code: 'conference', label: '컨퍼런스리그권' };
  if (description.includes('relegation') && description.includes('play')) return { code: 'relegation-playoff', label: '강등 플레이오프' };
  if (description.includes('relegation')) return { code: 'relegation', label: '강등권' };
  if (description.includes('promotion')) return { code: 'promotion', label: '승격권' };
  return null;
}

function rankingPlayerName(item) {
  return item?.displayName || item?.playerDisplayName || item?.playerNameKo || item?.playerName || '선수 정보 없음';
}

function TeamLeagueStandings({ leagueCode, teams, onTeamOpen, onPlayerOpen }) {
  const [tab, setTab] = useState('standings');
  const [state, setState] = useState({ loading: false, rows: [], goals: [], assists: [] });

  useEffect(() => {
    if (!STANDING_LEAGUE_CODES.has(leagueCode)) {
      setState({ loading: false, rows: [], goals: [], assists: [] });
      return undefined;
    }

    const controller = new AbortController();
    setState({ loading: true, rows: [], goals: [], assists: [] });
    Promise.allSettled([
      getLeagueStandings({ leagueCode }, controller.signal),
      getPlayerRankings({ leagueCode, type: 'GOALS' }, controller.signal),
      getPlayerRankings({ leagueCode, type: 'ASSISTS' }, controller.signal)
    ]).then(([standings, goals, assists]) => {
      if (controller.signal.aborted) return;
      const rows = standings.status === 'fulfilled' && Array.isArray(standings.value)
        ? standings.value.flatMap(group => Array.isArray(group?.standings) ? group.standings : [])
        : [];
      setState({
        loading: false,
        rows,
        goals: goals.status === 'fulfilled' && Array.isArray(goals.value) ? goals.value : [],
        assists: assists.status === 'fulfilled' && Array.isArray(assists.value) ? assists.value : []
      });
    });
    return () => controller.abort();
  }, [leagueCode]);

  if (!STANDING_LEAGUE_CODES.has(leagueCode) || (!state.loading && !state.rows.length && !state.goals.length && !state.assists.length)) return null;

  const nameFor = row => {
    const team = teams.find(candidate => String(candidate.teamId) === String(row?.team?.teamId));
    return team ? teamDisplayName(team) : row?.team?.teamName || '팀 정보 없음';
  };
  const outcomes = [...new Map(state.rows.map(standingOutcome).filter(Boolean).map(outcome => [outcome.code, outcome])).values()];
  const rankingRows = tab === 'goals' ? state.goals : state.assists;
  const rankingLabel = tab === 'goals' ? '골' : '도움';

  return <section className="team-league-standings" aria-label="리그 주요 지표">
    <header><div><p className="eyebrow">LEAGUE CENTRE</p><h3>리그 주요 지표</h3></div><span>{state.loading ? '기록을 불러오는 중' : `${state.rows.length || Math.max(state.goals.length, state.assists.length)}개 기록`}</span></header>
    <div className="team-league-metric-tabs" role="tablist" aria-label="리그 주요 지표 탭">
      <button className={tab === 'standings' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'standings'} onClick={() => setTab('standings')}>순위</button>
      <button className={tab === 'goals' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'goals'} onClick={() => setTab('goals')}>득점 순위</button>
      <button className={tab === 'assists' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'assists'} onClick={() => setTab('assists')}>도움 순위</button>
    </div>
    {tab === 'standings' && <>
      {outcomes.length > 0 && <div className="team-standing-legend" aria-label="순위 구간 안내">{outcomes.map(outcome => <span className={outcome.code} key={outcome.code}>{outcome.label}</span>)}<small>컵 대회 결과에 따라 실제 진출권은 달라질 수 있습니다.</small></div>}
      {!state.loading && <div className="team-league-standings-head"><span>순위</span><span>클럽</span><span>경기</span><span>득실</span><span>승점</span></div>}
      <ol>{state.rows.map(row => {
        const outcome = standingOutcome(row);
        return <li className={outcome ? `is-${outcome.code}` : ''} key={row.leagueStandingId ?? row.team?.teamId}><button type="button" onClick={() => row?.team?.teamId && onTeamOpen(row.team.teamId)}><b>{row.ranking ?? '—'}</b><span className="team-league-standing-club">{row.team?.logoUrl && <img src={logoUrl(row.team.logoUrl)} alt="" referrerPolicy="no-referrer" />}<span>{nameFor(row)}{outcome && <em className={outcome.code} title={row.description || outcome.label}>{outcome.label}</em>}</span></span><small>{row.all?.played ?? 0}</small><small>{row.goalsDiff ?? 0}</small><strong>{row.points ?? 0}</strong></button></li>;
      })}</ol>
    </>}
    {tab !== 'standings' && <ol className="team-league-ranking-list">{rankingRows.map(item => {
      const name = rankingPlayerName(item);
      const photo = photoUrl(item?.photoUrl);
      return <li key={`${tab}-${item.playerId ?? name}-${item.ranking ?? ''}`}><button type="button" onClick={() => item?.playerId && onPlayerOpen?.(Number(item.playerId))}><b>{item.ranking ?? '—'}</b><span className="team-league-ranking-photo">{name.slice(0, 1)}{photo && <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}</span><strong>{name}</strong><em>{item.teamName || '소속팀 정보 없음'}</em><span className="team-league-ranking-value">{item.value ?? 0}<small>{rankingLabel}</small></span></button></li>;
    })}</ol>}
    {tab !== 'standings' && !state.loading && !rankingRows.length && <p className="team-league-ranking-empty">등록된 {rankingLabel} 랭킹이 없습니다.</p>}
  </section>;
}

export default function TeamsPage({ teams, error, sample, onPlayerOpen }) {
  const navigate = useNavigate();
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const result = new Map([...LEAGUES, OTHER_LEAGUE].map(([code]) => [code, 0]));

    for (const team of teams) {
      result.set(
        teamLeague(team),
        (result.get(teamLeague(team)) || 0) + 1
      );
    }

    return result;
  }, [teams]);

  const filtered = teams.filter(item =>
    (leagueFilter === 'all' || teamLeague(item) === leagueFilter)
    && [item.teamName, item.teamNameKo].some(name => matchesClubSearch(name, search))
  );

  const allLeagueOptions = [...LEAGUES, OTHER_LEAGUE];
  const order = leagueFilter === 'all'
    ? allLeagueOptions
    : allLeagueOptions.filter(([code]) => code === leagueFilter);

  return (
    <section className="view">
      <div className="section-head">
        <div>
          <p className="eyebrow">TOP LEAGUES</p>

          <h2>
            클럽 목록
            {' '}
            <span className="count">
              {teams.length.toLocaleString()}
            </span>
          </h2>

          <p>
            주요 리그와 유럽 대항전, 국내 컵, 유럽 주요 리그, J리그를
            한곳에서 살펴보세요.
          </p>
        </div>
      </div>

      <div
        className="league-filters"
        aria-label="리그 선택"
      >
        <button
          className={`league-filter ${
            leagueFilter === 'all' ? 'selected' : ''
          }`}
          type="button"
          onClick={() => setLeagueFilter('all')}
        >
          <span className="league-filter-name">
            전체
          </span>

          <strong>
            {teams.length}
          </strong>
        </button>

        {allLeagueOptions
          .filter(([code]) => counts.get(code))
          .map(([code, name, country]) => (
            <button
              key={code}
              className={`league-filter ${
                leagueFilter === code ? 'selected' : ''
              }`}
              type="button"
              disabled={!counts.get(code)}
              onClick={() => setLeagueFilter(code)}
            >
              <span className="league-filter-meta">
                {country}
              </span>

              <span className="league-filter-name">
                {name}
              </span>

              <strong>
                {counts.get(code) || 0}
              </strong>
            </button>
          ))}
      </div>

      <label className="search team-search">
        <span aria-hidden="true">
          ⌕
        </span>

        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="클럽 이름 검색"
          aria-label="클럽 검색"
        />
      </label>

      <TeamCompare teams={teams} sample={sample} />

      <div className="league-groups">
        {order.map(([code, name, country]) => {
          const clubs = filtered
            .filter(item => teamLeague(item) === code)
            .sort(
              (a, b) =>
                teamDisplayName(a).localeCompare(
                  teamDisplayName(b),
                  'ko'
                )
            );

          if (!clubs.length) {
            return null;
          }

          return (
            <section
              className="league-section"
              key={code}
            >
              <div className="league-heading">
                <div>
                  <span className="league-kicker">
                    {country}
                  </span>

                  <h3>
                    {name}
                    {' '}
                    <span>
                      {clubs.length}
                    </span>
                  </h3>
                </div>
              </div>

              <TeamLeagueStandings
                leagueCode={code}
                teams={teams}
                onTeamOpen={teamId => navigate(`/teams/${teamId}`)}
                onPlayerOpen={onPlayerOpen}
              />

              <div className="team-grid">
                {clubs.map(item => {
                  const picture = logoUrl(item.logoUrl);

                  return (
                    <button
                      className="team-card"
                      type="button"
                      key={item.teamId}
                      onClick={() =>
                        navigate(`/teams/${item.teamId}`)
                      }
                    >
                      <span className="club-logo">
                        {teamDisplayName(item).slice(0, 1)}

                        {picture && (
                          <img
                            className="club-emblem"
                            src={picture}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </span>

                      <small>
                        {item.leagueName || item.leagueCode || '클럽 상세 보기'}
                      </small>

                      <strong>
                        {teamDisplayName(item)}
                      </strong>

                      <span className="arr">
                        ↗
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {!filtered.length && (
        <div
          className={`empty ${
            error ? 'error' : ''
          }`}
        >
          {error || (
            search
              ? '검색 조건에 맞는 클럽이 없습니다.'
              : leagueFilter === 'all'
                ? '아직 등록된 클럽이 없습니다.'
                : '해당 리그에 등록된 클럽이 없습니다.'
          )}
        </div>
      )}
    </section>
  );
}
