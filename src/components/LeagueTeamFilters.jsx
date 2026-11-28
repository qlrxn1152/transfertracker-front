import { CORE_SERVER_LEAGUE_CODES, LEAGUE_GROUPS, OTHER_LEAGUE_CODE } from '../constants';
import { teamDisplayName, teamLeague } from '../utils';

const TRANSFER_RELATED_GROUPS = new Set(['EUROPEAN_COMPETITIONS', 'DOMESTIC_CUPS']);

export default function LeagueTeamFilters({
  leagueCode,
  teamId,
  teams,
  onLeagueChange,
  onTeamChange,
  prefix
}) {
  // 대항전·컵은 팀의 소속 리그가 아니므로 이적/선수 디렉터리의 기준에서 뺀다.
  // 경기 센터는 모든 대회를 그대로 보여 준다.
  const groups = LEAGUE_GROUPS.filter(group =>
    prefix === 'fixtures' || !TRANSFER_RELATED_GROUPS.has(group.code)
  );
  const supportsCoreView = ['players', 'transfers'].includes(prefix);
  const isCorePlayerView = supportsCoreView && leagueCode === 'CORE';
  const candidates = [...teams]
    .filter(team => !leagueCode || (isCorePlayerView ? CORE_SERVER_LEAGUE_CODES.has(teamLeague(team)) : teamLeague(team) === leagueCode))
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b), 'ko'));

  return (
    <div className={prefix === 'transfers' ? 'transfer-api-filters' : 'player-api-filters'}>
      <div className="list-filter-toolbar">
        <span>리그</span>
        <div className="compact-filters" aria-label={`${prefix} 리그 필터`}>
          <button
            type="button"
            className={`compact-filter ${!leagueCode ? 'selected' : ''}`}
            aria-pressed={!leagueCode}
            onClick={() => onLeagueChange('')}
          >
            전체
          </button>
          {supportsCoreView && <button
            type="button"
            className={`compact-filter ${isCorePlayerView ? 'selected' : ''}`}
            aria-pressed={isCorePlayerView}
            onClick={() => onLeagueChange('CORE')}
          >
            주요 리그
          </button>}

          {groups.map(group => (
            <div className="compact-filter-group" key={group.code}>
              <span>{group.name}</span>
              {group.leagues.map(([code, name]) => (
                <button
                  key={code}
                  type="button"
                  className={`compact-filter ${leagueCode === code ? 'selected' : ''}`}
                  aria-pressed={leagueCode === code}
                  onClick={() => onLeagueChange(code)}
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
          <button
            type="button"
            className={`compact-filter ${leagueCode === OTHER_LEAGUE_CODE ? 'selected' : ''}`}
            aria-pressed={leagueCode === OTHER_LEAGUE_CODE}
            onClick={() => onLeagueChange(OTHER_LEAGUE_CODE)}
          >
            기타 리그
          </button>
        </div>
      </div>

      <label className="team-select-filter">
        <span>클럽</span>
        <select
          aria-label={`${prefix} 클럽 필터`}
          value={teamId}
          onChange={event => onTeamChange(event.target.value)}
        >
          <option value="">전체 클럽</option>
          {candidates.map(team => (
            <option key={team.teamId} value={team.teamId}>
              {teamDisplayName(team)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
