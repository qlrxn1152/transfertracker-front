import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueStandings } from '../api/client';
import { LEAGUES, OTHER_LEAGUE, STANDING_LEAGUE_CODES } from '../constants';
import { logoUrl, teamDisplayName, teamLeague, text } from '../utils';
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

function TeamLeagueStandings({ leagueCode, teams, onTeamOpen }) {
  const [state, setState] = useState({ loading: false, rows: [] });

  useEffect(() => {
    if (!STANDING_LEAGUE_CODES.has(leagueCode)) {
      setState({ loading: false, rows: [] });
      return undefined;
    }

    const controller = new AbortController();
    setState({ loading: true, rows: [] });
    getLeagueStandings({ leagueCode }, controller.signal)
      .then(data => {
        const rows = Array.isArray(data)
          ? data.flatMap(group => Array.isArray(group?.standings) ? group.standings : [])
          : [];
        setState({ loading: false, rows });
      })
      .catch(error => {
        if (error.name !== 'AbortError') setState({ loading: false, rows: [] });
      });
    return () => controller.abort();
  }, [leagueCode]);

  if (!STANDING_LEAGUE_CODES.has(leagueCode) || (!state.loading && !state.rows.length)) return null;

  const nameFor = row => {
    const team = teams.find(candidate => String(candidate.teamId) === String(row?.team?.teamId));
    return team ? teamDisplayName(team) : row?.team?.teamName || '팀 정보 없음';
  };

  return <section className="team-league-standings" aria-label="리그 순위표">
    <header><div><p className="eyebrow">LEAGUE TABLE</p><h3>현재 순위</h3></div><span>{state.loading ? '순위표를 불러오는 중' : `${state.rows.length}팀`}</span></header>
    {!state.loading && <div className="team-league-standings-head"><span>순위</span><span>클럽</span><span>경기</span><span>득실</span><span>승점</span></div>}
    <ol>{state.rows.map(row => <li key={row.leagueStandingId ?? row.team?.teamId}><button type="button" onClick={() => row?.team?.teamId && onTeamOpen(row.team.teamId)}><b>{row.ranking ?? '—'}</b><span className="team-league-standing-club">{row.team?.logoUrl && <img src={logoUrl(row.team.logoUrl)} alt="" referrerPolicy="no-referrer" />}{nameFor(row)}</span><small>{row.all?.played ?? 0}</small><small>{row.goalsDiff ?? 0}</small><strong>{row.points ?? 0}</strong></button></li>)}</ol>
  </section>;
}

export default function TeamsPage({ teams, error, sample }) {
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
