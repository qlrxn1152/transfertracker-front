import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LEAGUE_GROUPS, STANDING_LEAGUE_CODES } from '../constants';
import { teamLeague } from '../utils';
import { LeagueCentre } from './TeamsPage';
import './LeaguesPage.css';

const LEAGUE_CENTRE_GROUPS = LEAGUE_GROUPS
  .map(group => ({ ...group, leagues: group.leagues.filter(([code]) => STANDING_LEAGUE_CODES.has(code)) }))
  .filter(group => group.leagues.length);

export default function LeaguesPage({ teams, onPlayerOpen }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const leagueOptions = useMemo(() => LEAGUE_CENTRE_GROUPS.flatMap(group => group.leagues), []);
  const requestedLeague = params.get('league');
  const selectedLeague = leagueOptions.some(([code]) => code === requestedLeague)
    ? requestedLeague
    : leagueOptions[0]?.[0] || 'EPL';
  const selected = leagueOptions.find(([code]) => code === selectedLeague) || ['EPL', '프리미어리그', '잉글랜드'];
  const teamCount = teams.filter(team => teamLeague(team) === selectedLeague).length;

  const selectLeague = code => {
    setParams({ league: code });
  };

  return <section className="view leagues-page">
    <div className="section-head league-page-head">
      <div>
        <p className="eyebrow">LEAGUE CENTRE</p>
        <h2>리그</h2>
        <p>리그를 고르면 순위, 득점·도움 랭킹, 다가오는 경기까지 한 화면에서 확인합니다.</p>
      </div>
      <Link className="league-page-schedule-link" to={`/fixtures?leagueCode=${encodeURIComponent(selectedLeague)}`}>전체 경기 일정 →</Link>
    </div>

    <section className="league-discovery" aria-label="리그 탐색">
      <div className="league-discovery-head">
        <div><p className="eyebrow">POPULAR & SUPPORTED</p><h3>리그 선택</h3></div>
        <span>지원 리그 {leagueOptions.length}</span>
      </div>
      <div className="league-discovery-groups">
        {LEAGUE_CENTRE_GROUPS.map(group => <div className="league-discovery-group" key={group.code}>
          <span>{group.name}</span>
          <div>{group.leagues.map(([code, name, country]) => <button key={code} type="button" className={selectedLeague === code ? 'active' : ''} aria-pressed={selectedLeague === code} onClick={() => selectLeague(code)}><small>{country}</small>{name}</button>)}</div>
        </div>)}
      </div>
    </section>

    <section className="league-selected-summary" aria-label="선택한 리그">
      <div><span>{selected[2]}</span><h3>{selected[1]}</h3><p>{teamCount ? `${teamCount}개 클럽의 기록을 기준으로 제공합니다.` : '저장된 리그 기록을 기준으로 제공합니다.'}</p></div>
      <button type="button" onClick={() => navigate(`/fixtures?leagueCode=${encodeURIComponent(selectedLeague)}`)}>경기 일정 보기 <b>→</b></button>
    </section>

    <div className="league-centre-panel">
      <LeagueCentre
        leagueCode={selectedLeague}
        teams={teams}
        onTeamOpen={teamId => navigate(`/teams/${teamId}`)}
        onPlayerOpen={onPlayerOpen}
      />
    </div>
  </section>;
}
