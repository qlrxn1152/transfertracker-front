import { LEAGUES } from '../constants';
import { teamDisplayName, teamLeague } from '../utils';

export default function LeagueTeamFilters({
  leagueCode,
  teamId,
  teams,
  onLeagueChange,
  onTeamChange,
  prefix
}) {
  const candidates = [...teams]
    .filter(team => !leagueCode || teamLeague(team) === leagueCode)
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

          {LEAGUES.filter(([code]) => code !== 'unclassified').map(([code, name]) => (
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
