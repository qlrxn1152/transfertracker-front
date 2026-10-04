import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEAGUES } from '../constants';
import { logoUrl, teamDisplayName, teamLeague, text } from '../utils';

export default function TeamsPage({ teams, error }) {
  const navigate = useNavigate();
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const result = new Map(LEAGUES.map(([code]) => [code, 0]));

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
    && [item.teamName, item.teamNameKo].some(
      name => text(name).includes(text(search))
    )
  );

  const order = leagueFilter === 'all'
    ? LEAGUES
    : LEAGUES.filter(([code]) => code === leagueFilter);

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
            EPL · 라리가 · 분데스리가 · 리그 1 · 세리에 A · K리그의
            클럽을 살펴보세요.
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

        {LEAGUES
          .filter(
            ([code]) =>
              code !== 'unclassified' || counts.get(code)
          )
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
                        CLUB / #{item.teamId}
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