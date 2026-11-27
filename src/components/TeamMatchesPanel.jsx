import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeamRecentFixtures, getTeamUpcomingFixtures } from '../api/client';
import { logoUrl, teamDisplayName } from '../utils';

const FINISHED = new Set(['FINISHED', 'AFTER_EXTRA_TIME', 'AFTER_PENALTY']);
const LIVE = new Set(['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'EXTRA_TIME', 'BREAK_TIME', 'PENALTY_IN_PROGRESS', 'LIVE']);

function clock(value) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return '시간 미정';
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(stamp);
}

function day(value) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return '날짜 미정';
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(stamp);
}

function score(fixture) {
  return fixture.homeScore != null && fixture.awayScore != null
    ? `${fixture.homeScore} : ${fixture.awayScore}`
    : clock(fixture.kickoffAt);
}

function status(fixture) {
  if (LIVE.has(fixture.status)) return fixture.elapsed != null ? `${fixture.elapsed}${fixture.extra ? `+${fixture.extra}` : ''}' LIVE` : '경기 진행 중';
  return FINISHED.has(fixture.status) ? '경기 종료' : '경기 예정';
}

function TeamMark({ team, directory }) {
  const match = directory.find(item => String(item.teamId) === String(team?.teamId));
  const name = team?.teamName || teamDisplayName(match);
  const logo = logoUrl(match?.logoUrl);
  return <span className="team-match-mark">{logo ? <img src={logo} alt="" referrerPolicy="no-referrer" /> : name.slice(0, 1)}</span>;
}

function MatchLine({ fixture, directory, teamId }) {
  const home = fixture.homeTeam || {};
  const away = fixture.awayTeam || {};
  const isHome = String(home.teamId) === String(teamId);
  return <Link className="team-match-line" to={`/fixtures/${fixture.fixtureId}`}>
    <time>{day(fixture.kickoffAt)}</time>
    <span className="team-match-club home"><TeamMark team={home} directory={directory} /><strong>{home.teamName || '홈팀'}</strong></span>
    <span className="team-match-score"><b>{score(fixture)}</b><small className={LIVE.has(fixture.status) ? 'live' : ''}>{status(fixture)}</small></span>
    <span className="team-match-club away"><strong>{away.teamName || '원정팀'}</strong><TeamMark team={away} directory={directory} /></span>
    {FINISHED.has(fixture.status) && fixture.homeScore != null && fixture.awayScore != null && <em className={`team-match-result ${(isHome ? fixture.homeScore : fixture.awayScore) > (isHome ? fixture.awayScore : fixture.homeScore) ? 'win' : (isHome ? fixture.homeScore : fixture.awayScore) === (isHome ? fixture.awayScore : fixture.homeScore) ? 'draw' : 'lose'}`}>{(isHome ? fixture.homeScore : fixture.awayScore) > (isHome ? fixture.awayScore : fixture.homeScore) ? '승' : (isHome ? fixture.homeScore : fixture.awayScore) === (isHome ? fixture.awayScore : fixture.homeScore) ? '무' : '패'}</em>}
  </Link>;
}

export default function TeamMatchesPanel({ teamId, teams }) {
  const [state, setState] = useState({ loading: true, upcoming: [], recent: [] });
  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      getTeamUpcomingFixtures(teamId, controller.signal),
      getTeamRecentFixtures(teamId, controller.signal)
    ]).then(([upcoming, recent]) => {
      if (controller.signal.aborted) return;
      setState({
        loading: false,
        upcoming: upcoming.status === 'fulfilled' && Array.isArray(upcoming.value) ? upcoming.value : [],
        recent: recent.status === 'fulfilled' && Array.isArray(recent.value) ? recent.value : []
      });
    });
    return () => controller.abort();
  }, [teamId]);

  if (state.loading) return <section className="team-matches-panel"><p>경기 정보를 불러오는 중입니다.</p></section>;
  if (!state.upcoming.length && !state.recent.length) return null;
  return <section className="team-matches-panel" id="team-matches">
    <div className="team-detail-section-head"><div><p className="eyebrow">MATCH CENTRE</p><h2>경기 일정 및 결과</h2><p>서버에 저장된 최신 경기 정보입니다.</p></div><Link className="team-detail-more" to="/fixtures">경기 센터 →</Link></div>
    {state.upcoming.length > 0 && <div className="team-matches-block"><h3>다가오는 경기</h3>{state.upcoming.slice(0, 4).map(fixture => <MatchLine key={fixture.fixtureId} fixture={fixture} directory={teams} teamId={teamId} />)}</div>}
    {state.recent.length > 0 && <div className="team-matches-block"><h3>최근 경기 결과</h3>{state.recent.slice(0, 4).map(fixture => <MatchLine key={fixture.fixtureId} fixture={fixture} directory={teams} teamId={teamId} />)}</div>}
  </section>;
}
