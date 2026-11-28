import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFixtures, getLeagueStandings, getPlayer, getPlayerRankings, getPlayerSeasonStatistics } from '../api/client';
import { STANDING_LEAGUE_CODES, TEAM_COLLECTION_LEAGUES } from '../constants';
import { logoUrl, photoUrl, teamDisplayName, teamLeague, text } from '../utils';

const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const FINISHED_FIXTURE_STATUSES = new Set(['FINISHED', 'AFTER_EXTRA_TIME', 'AFTER_PENALTY']);
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

function standingGroupLabel(groupName) {
  const value = String(groupName || '');
  if (value === 'K-League: Regular season') return '정규리그';
  if (value === 'K-League: Championship Group') return '파이널 A';
  if (value === 'K-League: Relegation Group') return '파이널 B';
  return value || '리그 순위';
}

function rankingPlayerName(item) {
  return item?.displayName || item?.playerDisplayName || item?.playerNameKo || item?.playerName || '선수 정보 없음';
}

function rankingTeam(item, teamsByPlayer, teams) {
  const key = String(item?.playerId ?? '');
  const teamName = item?.teamName || teamsByPlayer[key];
  if (!teamName) return { name: Object.hasOwn(teamsByPlayer, key) ? '리그 소속팀 미등록' : '소속팀 확인 중', crest: '' };
  const club = teams.find(candidate => candidate?.teamName === teamName || teamDisplayName(candidate) === teamName);
  return { name: teamName, crest: logoUrl(item?.teamLogoUrl || item?.teamLogo || club?.logoUrl) };
}

function kstDateOffset(offset) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = formatter.formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const date = new Date(`${today.year}-${today.month}-${today.day}T12:00:00+09:00`);
  date.setDate(date.getDate() + offset);
  const parts = formatter.formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function fixtureDateLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '시간 미정';
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(date);
}

function LeagueUpcomingFixtures({ leagueCode, teams, onFixtureOpen }) {
  const [state, setState] = useState({ loading: true, fixtures: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, fixtures: [] });
    Promise.allSettled(Array.from({ length: 14 }, (_, index) => getFixtures({ date: kstDateOffset(index), leagueCode }, controller.signal))).then(results => {
      if (controller.signal.aborted) return;
      const fixtures = [...new Map(results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []).filter(fixture => !FINISHED_FIXTURE_STATUSES.has(fixture?.status)).sort((a, b) => Date.parse(a?.kickoffAt || 0) - Date.parse(b?.kickoffAt || 0)).map(fixture => [fixture.fixtureId, fixture])).values()].slice(0, 10);
      setState({ loading: false, fixtures });
    });
    return () => controller.abort();
  }, [leagueCode]);

  if (state.loading) return <p className="team-league-fixtures-empty">다가오는 경기를 불러오는 중입니다.</p>;
  if (!state.fixtures.length) return <p className="team-league-fixtures-empty">앞으로 2주 안에 등록된 경기가 없습니다.</p>;

  const club = team => {
    const found = teams.find(candidate => String(candidate?.teamId) === String(team?.teamId));
    // 경기 목록 응답은 팀의 원문 이름만 포함한다. 전역 팀 목록에 있는
    // 한글 표시명을 우선 사용해 목록과 상세 화면의 표기를 일치시킨다.
    return { name: teamDisplayName(found) || team?.teamName || '팀 정보 없음', logo: logoUrl(found?.logoUrl) };
  };
  return <ol className="team-league-fixtures">{state.fixtures.map(fixture => {
    const home = club(fixture.homeTeam);
    const away = club(fixture.awayTeam);
    return <li key={fixture.fixtureId}><button type="button" onClick={() => onFixtureOpen(fixture.fixtureId)}><time>{fixtureDateLabel(fixture.kickoffAt)}</time><span className="team-league-fixture-club home"><strong>{home.name}</strong>{home.logo && <img src={home.logo} alt="" referrerPolicy="no-referrer" />}</span><b>vs</b><span className="team-league-fixture-club away">{away.logo && <img src={away.logo} alt="" referrerPolicy="no-referrer" />}<strong>{away.name}</strong></span></button></li>;
  })}</ol>;
}

export function LeagueCentre({ leagueCode, teams, onTeamOpen, onPlayerOpen }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('standings');
  const [state, setState] = useState({ loading: false, groups: [], goals: [], assists: [] });
  const [rankingTeams, setRankingTeams] = useState({});
  const [standingGroup, setStandingGroup] = useState('');

  useEffect(() => {
    if (!STANDING_LEAGUE_CODES.has(leagueCode)) {
      setState({ loading: false, groups: [], goals: [], assists: [] });
      return undefined;
    }

    const controller = new AbortController();
    setState({ loading: true, groups: [], goals: [], assists: [] });
    Promise.allSettled([
      getLeagueStandings({ leagueCode }, controller.signal),
      getPlayerRankings({ leagueCode, type: 'GOALS' }, controller.signal),
      getPlayerRankings({ leagueCode, type: 'ASSISTS' }, controller.signal)
    ]).then(([standings, goals, assists]) => {
      if (controller.signal.aborted) return;
      const groups = standings.status === 'fulfilled' && Array.isArray(standings.value)
        ? standings.value.filter(group => Array.isArray(group?.standings) && group.standings.length)
        : [];
      setStandingGroup(groups[0]?.groupName || '');
      setState({
        loading: false,
        groups,
        goals: goals.status === 'fulfilled' && Array.isArray(goals.value) ? goals.value : [],
        assists: assists.status === 'fulfilled' && Array.isArray(assists.value) ? assists.value : []
      });
    });
    return () => controller.abort();
  }, [leagueCode]);

  useEffect(() => {
    setRankingTeams({});
  }, [leagueCode]);

  useEffect(() => {
    if (tab === 'standings') return undefined;
    const rows = tab === 'goals' ? state.goals : state.assists;
    const unresolved = rows.filter(item => item?.playerId && !item?.teamName && !Object.hasOwn(rankingTeams, String(item.playerId)));
    if (!unresolved.length) return undefined;

    const controller = new AbortController();
    Promise.allSettled(unresolved.map(async item => {
      const player = await getPlayer(item.playerId, controller.signal);
      if (player?.teamName) return [String(item.playerId), player.teamName];
      const statistics = await getPlayerSeasonStatistics(item.playerId, controller.signal);
      const team = Array.isArray(statistics)
        ? [...statistics]
          .filter(entry => String(entry?.leagueCode || '') === String(leagueCode))
          .sort((a, b) => Number(b?.minutes || 0) - Number(a?.minutes || 0) || Number(b?.appearances || 0) - Number(a?.appearances || 0))[0]?.teamName
        : '';
      return [String(item.playerId), team || ''];
    })).then(results => {
      if (controller.signal.aborted) return;
      setRankingTeams(current => ({
        ...current,
        ...Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(result => result.value))
      }));
    });
    return () => controller.abort();
  }, [leagueCode, rankingTeams, state.assists, state.goals, tab]);

  if (!STANDING_LEAGUE_CODES.has(leagueCode)) return null;

  const nameFor = row => {
    const team = teams.find(candidate => String(candidate.teamId) === String(row?.team?.teamId));
    return team ? teamDisplayName(team) : row?.team?.teamName || '팀 정보 없음';
  };
  const selectedStandingGroup = state.groups.find(group => String(group.groupName || '') === String(standingGroup)) || state.groups[0];
  const standingRows = selectedStandingGroup?.standings || [];
  const outcomes = [...new Map(standingRows.map(standingOutcome).filter(Boolean).map(outcome => [outcome.code, outcome])).values()];
  const rankingRows = tab === 'goals' ? state.goals : state.assists;
  const rankingLabel = tab === 'goals' ? '골' : '도움';

  return <section className="team-league-standings" aria-label="리그 주요 지표">
    <header><div><p className="eyebrow">LEAGUE CENTRE</p><h3>리그 주요 지표</h3></div><span>{state.loading ? '기록을 불러오는 중' : `${standingRows.length || Math.max(state.goals.length, state.assists.length)}개 기록`}</span></header>
    <div className="team-league-metric-tabs" role="tablist" aria-label="리그 주요 지표 탭">
      <button className={tab === 'standings' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'standings'} onClick={() => setTab('standings')}>순위</button>
      <button className={tab === 'goals' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'goals'} onClick={() => setTab('goals')}>득점 순위</button>
      <button className={tab === 'assists' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'assists'} onClick={() => setTab('assists')}>도움 순위</button>
      <button className={tab === 'fixtures' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'fixtures'} onClick={() => setTab('fixtures')}>다가오는 경기</button>
    </div>
    {tab === 'standings' && <>
      {state.groups.length > 1 && <div className="team-league-stage-tabs" role="tablist" aria-label="리그 단계">{state.groups.map(group => <button type="button" role="tab" aria-selected={group === selectedStandingGroup} className={group === selectedStandingGroup ? 'active' : ''} key={group.groupName || 'default'} onClick={() => setStandingGroup(group.groupName || '')}>{standingGroupLabel(group.groupName)}</button>)}</div>}
      {outcomes.length > 0 && <div className="team-standing-legend" aria-label="순위 구간 안내">{outcomes.map(outcome => <span className={outcome.code} key={outcome.code}>{outcome.label}</span>)}<small>컵 대회 결과에 따라 실제 진출권은 달라질 수 있습니다.</small></div>}
      {!state.loading && <div className="team-league-standings-head"><span>순위</span><span>클럽</span><span>경기</span><span>득실</span><span>승점</span></div>}
      <ol>{standingRows.map(row => {
        const outcome = standingOutcome(row);
        const leader = Number(row?.ranking) === 1;
        return <li className={`${outcome ? `is-${outcome.code} ` : ''}${leader ? 'is-league-leader' : ''}`} key={row.leagueStandingId ?? row.team?.teamId}><button type="button" onClick={() => row?.team?.teamId && onTeamOpen(row.team.teamId)}><b>{row.ranking ?? '—'}</b><span className="team-league-standing-club">{row.team?.logoUrl && <img src={logoUrl(row.team.logoUrl)} alt="" referrerPolicy="no-referrer" />}<span>{nameFor(row)}{leader && <em className="team-league-standing-leader">🏆 리그 1위</em>}{outcome && <em className={outcome.code} title={row.description || outcome.label}>{outcome.label}</em>}</span></span><small>{row.all?.played ?? 0}</small><small>{row.goalsDiff ?? 0}</small><strong>{row.points ?? 0}</strong></button></li>;
      })}</ol>
    </>}
    {(tab === 'goals' || tab === 'assists') && <ol className="team-league-ranking-list">{rankingRows.map(item => {
      const name = rankingPlayerName(item);
      const photo = photoUrl(item?.photoUrl);
      const club = rankingTeam(item, rankingTeams, teams);
      const leader = Number(item?.ranking) === 1;
      const leaderLabel = tab === 'goals' ? '득점왕' : '도움왕';
      return <li className={leader ? 'is-ranking-leader' : ''} key={`${tab}-${item.playerId ?? name}-${item.ranking ?? ''}`}><button type="button" onClick={() => item?.playerId && onPlayerOpen?.(Number(item.playerId))}><b>{item.ranking ?? '—'}</b><span className="team-league-ranking-photo">{name.slice(0, 1)}{photo && <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}</span><span className="team-league-ranking-player"><strong>{name}</strong>{leader && <em className="team-league-ranking-leader" aria-label={leaderLabel}>🏆 {leaderLabel}</em>}</span><span className="team-league-ranking-team">{club.crest && <img src={club.crest} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}<em>{club.name}</em></span><span className="team-league-ranking-value">{item.value ?? 0}<small>{rankingLabel}</small></span></button></li>;
    })}</ol>}
    {(tab === 'goals' || tab === 'assists') && !state.loading && !rankingRows.length && <p className="team-league-ranking-empty">등록된 {rankingLabel} 랭킹이 없습니다.</p>}
    {tab === 'fixtures' && <LeagueUpcomingFixtures leagueCode={leagueCode} teams={teams} onFixtureOpen={fixtureId => navigate(`/fixtures/${fixtureId}`)} />}
  </section>;
}

export default function TeamsPage({ teams, error, sample, onPlayerOpen }) {
  const navigate = useNavigate();
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [search, setSearch] = useState('');

  const teamPool = useMemo(() => teams.filter(team => TEAM_COLLECTION_LEAGUES.some(([code]) => code === teamLeague(team))), [teams]);
  const counts = useMemo(() => {
    const result = new Map(TEAM_COLLECTION_LEAGUES.map(([code]) => [code, 0]));

    for (const team of teamPool) {
      result.set(
        teamLeague(team),
        (result.get(teamLeague(team)) || 0) + 1
      );
    }

    return result;
  }, [teamPool]);

  const filtered = teamPool.filter(item =>
    (leagueFilter === 'all' || teamLeague(item) === leagueFilter)
    && [item.teamName, item.teamNameKo].some(name => matchesClubSearch(name, search))
  );

  const allLeagueOptions = TEAM_COLLECTION_LEAGUES;
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
            {teamPool.length.toLocaleString()}
            </span>
          </h2>

          <p>
            주요 리그와 TeamCollectionLeague의 유럽 주요 리그 클럽을
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
            {teamPool.length}
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
