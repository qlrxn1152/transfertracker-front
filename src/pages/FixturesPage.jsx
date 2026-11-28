import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getFixture, getFixturePlayerStatistics, getFixtureStatistics, getFixtures, getLeagueStandings } from '../api/client';
import { LEAGUE_GROUPS, LEAGUES, OTHER_LEAGUE_CODE, SERVER_LEAGUE_CODES } from '../constants';
import { logoUrl, photoUrl, teamDisplayName } from '../utils';
import './FixturesPage.css';

const KST = 'Asia/Seoul';
const FINISHED = new Set(['FINISHED', 'AFTER_EXTRA_TIME', 'AFTER_PENALTY']);
const LIVE = new Set(['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'EXTRA_TIME', 'BREAK_TIME', 'PENALTY_IN_PROGRESS', 'LIVE']);

function kstDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const read = type => parts.find(part => part.type === type)?.value;
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function shiftDate(date, offset) {
  const value = new Date(`${date}T12:00:00+09:00`);
  value.setDate(value.getDate() + offset);
  return kstDate(value);
}

function dateLabel(date, compact = false) {
  const value = new Date(`${date}T12:00:00+09:00`);
  return new Intl.DateTimeFormat('ko-KR', compact
    ? { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: KST }
    : { month: 'long', day: 'numeric', weekday: 'long', timeZone: KST }
  ).format(value);
}

function timeLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '시간 미정';
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: KST }).format(new Date(value));
}

function updatedLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '동기화 시각 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: KST }).format(new Date(value));
}

function statusLabel(fixture) {
  const status = String(fixture?.status || '');
  if (LIVE.has(status)) {
    if (status === 'HALF_TIME') return '하프타임';
    return fixture?.elapsed != null ? `${fixture.elapsed}${fixture.extra ? `+${fixture.extra}` : ''}' LIVE` : '경기 진행 중';
  }
  if (FINISHED.has(status)) return status === 'AFTER_PENALTY' ? '승부차기 종료' : '경기 종료';
  return ({ POSTPONED: '경기 연기', CANCELLED: '경기 취소', SUSPENDED: '경기 중단', INTERRUPTED: '경기 일시 중단', ABANDONED: '경기 중단 및 종료', TIME_TO_BE_DEFINED: '일정 미정', TECHNICAL_LOSS: '규정 패배', WALKOVER: '부전승' }[status] || '경기 예정');
}

function scoreLabel(fixture) {
  return fixture?.homeScore != null && fixture?.awayScore != null ? `${fixture.homeScore} : ${fixture.awayScore}` : timeLabel(fixture?.kickoffAt);
}

function leagueLabel(code) {
  return LEAGUES.find(([value]) => value === code)?.[1] || code || '기타 대회';
}

function teamMeta(team, teams) {
  const registered = teams.find(value => String(value.teamId) === String(team?.teamId));
  return { name: team?.teamName || teamDisplayName(registered) || '팀 정보 없음', logo: logoUrl(registered?.logoUrl) };
}

function TeamBadge({ team, teams, side, large = false }) {
  const data = teamMeta(team, teams);
  return <span className={`fixture-team fixture-team-${side} ${large ? 'large' : ''}`}>
    {side === 'home' && <strong>{data.name}</strong>}
    <span className="fixture-team-logo" aria-hidden="true">{data.logo ? <img src={data.logo} alt="" referrerPolicy="no-referrer" /> : data.name.slice(0, 1)}</span>
    {side === 'away' && <strong>{data.name}</strong>}
  </span>;
}

function FixtureRow({ fixture, teams, selected, onSelect }) {
  return <button type="button" className={`fixture-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(fixture.fixtureId)}>
    <TeamBadge team={fixture.homeTeam} teams={teams} side="home" />
    <span className="fixture-score"><strong>{scoreLabel(fixture)}</strong><small className={LIVE.has(fixture.status) ? 'live' : ''}>{statusLabel(fixture)}</small></span>
    <TeamBadge team={fixture.awayTeam} teams={teams} side="away" />
  </button>;
}

function eventMeta(event) {
  const type = String(event?.type || '');
  if (type === 'GOAL') return { label: '득점' };
  if (type === 'CARD') return { label: /red/i.test(event.detail || '') ? '퇴장' : '경고' };
  if (type === 'SUBSTITUTION') return { label: '교체 투입' };
  if (type === 'VAR') return { label: 'VAR 판정' };
  return { label: event.detail || '경기 이벤트' };
}

function goalInfo(event) {
  const detail = String(event?.detail || '').toLowerCase();
  if (detail.includes('own')) return { label: '자책골', scored: true, assistApplies: false };
  if (detail.includes('missed')) return { label: 'PK 실축', scored: false, assistApplies: false };
  if (detail.includes('penalty')) return { label: 'PK 득점', scored: true, assistApplies: true };
  return { label: '일반 득점', scored: true, assistApplies: true };
}

function eventStyle(event) {
  if (event?.type !== 'CARD') return '';
  return /red/i.test(event?.detail || '') ? 'card-red' : 'card-yellow';
}

function eventPlayerName(player) {
  return player?.displayName || player?.playerName || '';
}

function PlayerAvatar({ player, className = '' }) {
  const name = eventPlayerName(player) || '선수';
  const image = photoUrl(player?.photoUrl);
  return <span className={`fixture-player-avatar ${className}`} aria-label={name}>
    <span aria-hidden="true">{name.slice(0, 1)}</span>
    {image && <img src={image} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.remove(); }} />}
  </span>;
}

function EventParticipant({ player, label, fallbackName, role = '' }) {
  const name = eventPlayerName(player) || fallbackName || '선수 정보 없음';
  return <span className={`fixture-event-person ${role}`}><PlayerAvatar player={player} /><span><small className="fixture-event-label">{label}</small><strong>{name}</strong></span></span>;
}

function FixtureGoalSummary({ events, teamId, side }) {
  const goals = events
    .filter(event => event?.type === 'GOAL' && goalInfo(event).scored && String(event?.team?.teamId) === String(teamId))
    .map(event => ({
      minute: event.elapsed == null ? '' : `${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`,
      scorer: eventPlayerName(event.player),
      assist: eventPlayerName(event.relatedPlayer),
      kind: goalInfo(event)
    }))
    .filter(goal => goal.scorer);

  if (!goals.length) return null;
  return <div className={`fixture-goals fixture-goals-${side}`} aria-label={`${side === 'home' ? '홈팀' : '원정팀'} 득점 기록`}>
    {goals.map((goal, index) => <p key={`${goal.scorer}-${goal.minute}-${index}`}><span>{goal.scorer} {goal.minute}</span><small>{goal.kind.label}{goal.assist ? ` · 도움 ${goal.assist}` : goal.kind.assistApplies ? ' · 도움 기록 없음' : ''}</small></p>)}
  </div>;
}

function FixtureEventRow({ event, fixture }) {
  const meta = eventMeta(event);
  const home = String(event?.team?.teamId) === String(fixture?.homeTeam?.teamId);
  const type = String(event?.type || '');
  const isSubstitution = type === 'SUBSTITUTION';
  // API의 교체 이벤트는 player=OUT, relatedPlayer=IN이다. 득점 이벤트의
  // relatedPlayer는 도움으로 쓰이므로 교체일 때만 화면 표시 순서를 바꾼다.
  const primaryParticipant = isSubstitution ? event?.relatedPlayer : event?.player;
  const relatedParticipant = isSubstitution ? event?.player : event?.relatedPlayer;
  const player = eventPlayerName(primaryParticipant) || event?.team?.teamName || '선수 정보 없음';
  const relatedPlayer = eventPlayerName(relatedParticipant);
  const goal = type === 'GOAL' ? goalInfo(event) : null;
  const labels = type === 'GOAL'
    ? { primary: goal.scored ? `득점 · ${goal.label}` : goal.label, related: '도움' }
    : type === 'SUBSTITUTION'
      ? { primary: '↑ 투입', related: '↓ 교체 아웃' }
      : { primary: meta.label, related: '' };
  const detail = type === 'GOAL' && !relatedPlayer
    ? (goal.assistApplies ? '도움 기록 없음' : '도움 적용 없음')
    : !relatedPlayer ? (event?.comments || (type === 'CARD' ? event.detail : '')) : '';
  const minute = event?.elapsed == null ? '—' : `${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`;
  return <article className={`fixture-event ${home ? 'home' : 'away'} ${type.toLowerCase()} ${eventStyle(event)}`}>
    <div className="fixture-event-copy">
      <div className="fixture-event-participants"><EventParticipant player={primaryParticipant} label={labels.primary} fallbackName={player} role={isSubstitution ? 'substitution-in' : ''} />{relatedPlayer && <EventParticipant player={relatedParticipant} label={labels.related} fallbackName={relatedPlayer} role={isSubstitution ? 'substitution-out' : ''} />}</div>
      {detail && <small className="fixture-event-note">{detail}</small>}
    </div>
    <time>{minute}</time>
  </article>;
}

function FixtureInformation({ fixture, teams }) {
  return <>
    <dl className="fixture-info-list">
      <div><dt>대회</dt><dd>{leagueLabel(fixture.leagueCode)}</dd></div>
      <div><dt>시즌 · 라운드</dt><dd>{fixture.season ? `${fixture.season} 시즌` : '시즌 정보 없음'} · {fixture.round || '라운드 정보 없음'}</dd></div>
      <div><dt>경기 시작</dt><dd>{fixture.kickoffAt ? `${dateLabel(kstDate(new Date(fixture.kickoffAt)))} ${timeLabel(fixture.kickoffAt)}` : '시간 미정'}</dd></div>
      <div><dt>경기장</dt><dd>{fixture.venueName || '경기장 정보 없음'}</dd></div>
      <div><dt>마지막 동기화</dt><dd>{updatedLabel(fixture.updatedAt)}</dd></div>
    </dl>
    <div className="fixture-detail-links">
      {fixture.homeTeam?.teamId && <Link to={`/teams/${fixture.homeTeam.teamId}`}>{teamMeta(fixture.homeTeam, teams).name}</Link>}
      {fixture.awayTeam?.teamId && <Link to={`/teams/${fixture.awayTeam.teamId}`}>{teamMeta(fixture.awayTeam, teams).name}</Link>}
    </div>
  </>;
}

function fixtureLineupName(player) {
  return player?.displayName || player?.playerName || '선수 정보 없음';
}

function lineupPlayerKey(player) {
  return String(player?.playerId ?? player?.apiFootballId ?? '');
}

function lineupMinute(event) {
  return event?.elapsed == null ? '' : `${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`;
}

function lineupSubstitution(player, events, teamId, role) {
  const key = lineupPlayerKey(player);
  if (!key) return null;
  const event = events.find(item => item?.type === 'SUBSTITUTION'
    && String(item?.team?.teamId) === String(teamId)
    && String(role === 'starter' ? lineupPlayerKey(item?.player) : lineupPlayerKey(item?.relatedPlayer)) === key);
  if (!event) return null;
  const paired = role === 'starter' ? event?.relatedPlayer : event?.player;
  const pairedName = eventPlayerName(paired) || '선수 정보 없음';
  const minute = lineupMinute(event);
  return role === 'starter'
    ? { type: 'out', text: `${minute} 교체 아웃 · ${pairedName} 투입` }
    : { type: 'in', text: `${minute} 투입 · ${pairedName} 교체 아웃` };
}

function formationRows(starters, formation) {
  const fromGrid = starters.map((player, index) => {
    const [row, column] = String(player?.grid || '').split(':').map(Number);
    return Number.isFinite(row) && row > 0 && Number.isFinite(column) && column > 0
      ? { player, index, row, column }
      : null;
  });

  if (fromGrid.every(Boolean)) {
    const rows = [...new Set(fromGrid.map(item => item.row))].sort((a, b) => a - b);
    return rows.map(row => fromGrid.filter(item => item.row === row).sort((a, b) => a.column - b.column));
  }

  const counts = String(formation || '').match(/\d+/g)?.map(Number) || [];
  const layout = counts.reduce((sum, count) => sum + count, 0) === starters.length
    ? counts
    : [1, 4, 3, Math.max(1, starters.length - 8)];
  let cursor = 0;
  return layout.map(count => starters.slice(cursor, cursor += count).map((player, index) => ({ player, index, row: 0, column: index + 1 }))).filter(row => row.length);
}

function FormationPlayer({ player, position, event, side }) {
  const name = fixtureLineupName(player);
  const image = photoUrl(player?.photoUrl);
  return <li className={`fixture-formation-player ${side}`} style={{ '--formation-x': `${position.x}%`, '--formation-y': `${position.y}%` }}>
    <span className="fixture-lineup-photo">{name.slice(0, 1)}{image && <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={loadEvent => loadEvent.currentTarget.remove()} />}</span>
    <strong><small>{player?.number != null ? `${player.number} ` : ''}</small>{name}</strong>
    {event && <em className={`fixture-lineup-change ${event.type}`}>{event.type === 'out' ? '↓' : '↑'} {event.text}</em>}
  </li>;
}

function LineupSubstitute({ player, event }) {
  const name = fixtureLineupName(player);
  const image = photoUrl(player?.photoUrl);
  return <li className="fixture-lineup-player">
    <span className="fixture-lineup-photo">{name.slice(0, 1)}{image && <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={loadEvent => loadEvent.currentTarget.remove()} />}</span>
    <span><strong>{player?.number != null ? `${player.number}. ` : ''}{name}</strong><small className={event ? `fixture-lineup-change ${event.type}` : ''}>{event ? `${event.type === 'in' ? '↑ 투입' : '↓ 교체 아웃'} · ${event.text.replace(/^.*?\s투입\s·\s|^.*?\s교체 아웃\s·\s/, '')}` : '대기 명단'}</small></span>
  </li>;
}

function FixtureFormation({ homeLineup, awayLineup, teams, events }) {
  const renderTeam = (lineup, side) => {
    if (!lineup) return null;
    const starters = Array.isArray(lineup.startXI) ? lineup.startXI : [];
    const rows = formationRows(starters, lineup.formation);
    const team = lineup.team || {};
    const name = teamMeta(team, teams).name;
    return <>{starters.length > 0 && <span className={`fixture-formation-team-name ${side}`}><strong>{name}</strong><small>{lineup.formation ? `${lineup.formation} 포메이션` : '포메이션 정보 없음'}</small></span>}{rows.flatMap((row, rowIndex) => row.map((item, index) => <FormationPlayer
      key={`${side}-${item.player.playerId ?? `${item.player.number}-${item.player.playerName}`}`}
      side={side}
      player={item.player}
      event={lineupSubstitution(item.player, events, team.teamId, 'starter')}
      position={{ x: ((index + 1) / (row.length + 1)) * 100, y: rows.length === 1 ? 50 : side === 'home' ? 11 + (rowIndex / (rows.length - 1)) * 32 : 89 - (rowIndex / (rows.length - 1)) * 32 }}
    />))}</>;
  };
  return <section className="fixture-formation-match" aria-label="양 팀 선발 포메이션">
    <div className="fixture-formation-match-head"><span>선발 포메이션</span><strong>{(homeLineup?.startXI?.length || 0) + (awayLineup?.startXI?.length || 0)}명</strong></div>
    <div className="fixture-formation-pitch">
      <span className="fixture-formation-mark fixture-formation-mark-top" aria-hidden="true" />
      <span className="fixture-formation-mark fixture-formation-mark-middle" aria-hidden="true" />
      <span className="fixture-formation-mark fixture-formation-mark-bottom" aria-hidden="true" />
      <ol>{renderTeam(homeLineup, 'home')}{renderTeam(awayLineup, 'away')}</ol>
    </div>
  </section>;
}

function FixtureLineups({ lineups, fixture, teams, events }) {
  if (!lineups.length) return <div className="fixture-events-empty">등록된 선발 명단과 포메이션이 없습니다.</div>;
  const ordered = [...lineups].sort((a, b) => String(a?.team?.teamId) === String(fixture?.homeTeam?.teamId) ? -1 : String(b?.team?.teamId) === String(fixture?.homeTeam?.teamId) ? 1 : 0);
  const homeLineup = ordered.find(lineup => String(lineup?.team?.teamId) === String(fixture?.homeTeam?.teamId)) || ordered[0];
  const awayLineup = ordered.find(lineup => String(lineup?.team?.teamId) === String(fixture?.awayTeam?.teamId)) || ordered.find(lineup => lineup !== homeLineup);
  return <><FixtureFormation homeLineup={homeLineup} awayLineup={awayLineup} teams={teams} events={events} /><div className="fixture-lineups">{ordered.map(lineup => {
    const team = lineup.team || {};
    const name = teamMeta(team, teams).name;
    const substitutes = Array.isArray(lineup.substitutes) ? lineup.substitutes : [];
    return <section className="fixture-lineup-team" key={lineup.fixtureLineupId ?? team.teamId}>
      <header><strong>{name}</strong><span>대기 명단 {substitutes.length}명</span></header>
      {substitutes.length > 0 && <details className="fixture-lineup-substitutes"><summary>대기 명단 {substitutes.length}명</summary><ul>{substitutes.map(player => <LineupSubstitute key={player.playerId ?? `${player.number}-${player.playerName}`} player={player} event={lineupSubstitution(player, events, team.teamId, 'substitute')} />)}</ul></details>}
    </section>;
  })}</div></>;
}

const TEAM_STAT_ROWS = [
  ['ballPossession', '점유율', value => value == null ? '—' : `${value}%`],
  ['expectedGoals', '기대 득점', value => value == null ? '—' : Number(value).toFixed(2)],
  ['totalShots', '슈팅', value => value ?? '—'],
  ['shotsOnGoal', '유효 슈팅', value => value ?? '—'],
  ['passesAccurate', '패스 성공', value => value ?? '—'],
  ['cornerKicks', '코너킥', value => value ?? '—'],
  ['fouls', '파울', value => value ?? '—'],
  ['yellowCards', '경고', value => value ?? '—'],
  ['redCards', '퇴장', value => value ?? '—']
];

function FixtureTeamStatistics({ statistics, fixture }) {
  if (!statistics.length) return <div className="fixture-events-empty">등록된 팀 기록이 없습니다.</div>;
  const home = statistics.find(item => String(item.teamId) === String(fixture?.homeTeam?.teamId));
  const away = statistics.find(item => String(item.teamId) === String(fixture?.awayTeam?.teamId));
  if (!home && !away) return <div className="fixture-events-empty">팀 기록을 경기 팀과 연결하지 못했습니다.</div>;
  return <div className="fixture-statistics"><div className="fixture-statistics-head"><strong>{fixture?.homeTeam?.teamName || home?.teamName || '홈팀'}</strong><span>경기 기록</span><strong>{fixture?.awayTeam?.teamName || away?.teamName || '원정팀'}</strong></div>{TEAM_STAT_ROWS.map(([key, label, format]) => <div className="fixture-stat-row" key={key}><strong>{format(home?.[key])}</strong><span>{label}</span><strong>{format(away?.[key])}</strong></div>)}</div>;
}

function FixturePlayerStatistics({ statistics, fixture }) {
  if (!statistics.length) return <div className="fixture-events-empty">등록된 선수 기록이 없습니다.</div>;
  const teamName = id => String(id) === String(fixture?.homeTeam?.teamId) ? fixture?.homeTeam?.teamName : String(id) === String(fixture?.awayTeam?.teamId) ? fixture?.awayTeam?.teamName : '선수 기록';
  const grouped = statistics.reduce((result, item) => ({ ...result, [item.teamId]: [...(result[item.teamId] || []), item] }), {});
  return <div className="fixture-player-statistics">{Object.entries(grouped).map(([teamId, players]) => <section key={teamId}><h3>{teamName(teamId)}</h3>{[...players].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).map(player => {
    const image = photoUrl(player.photoUrl);
    const name = player.playerName || '선수 정보 없음';
    return <article className="fixture-player-stat" key={player.id ?? player.playerId}><span className="fixture-player-stat-photo">{name.slice(0, 1)}{image && <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => event.currentTarget.remove()} />}</span><div><strong>{name}</strong><small>{player.position || '—'} · {player.minutes ?? '—'}분</small></div><div className="fixture-player-stat-numbers"><span>평점 <b>{player.rating ?? '—'}</b></span><span>득점 <b>{player.goals ?? 0}</b></span><span>도움 <b>{player.assists ?? 0}</b></span></div></article>;
  })}</section>)}</div>;
}

function LeagueStandings({ leagueCode }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    getLeagueStandings({ leagueCode }, controller.signal)
      .then(data => setRows(Array.isArray(data) ? data.flatMap(group => Array.isArray(group?.standings) ? group.standings : []) : []))
      .catch(error => { if (error.name !== 'AbortError') setRows([]); });
    return () => controller.abort();
  }, [leagueCode]);
  if (!rows.length) return null;
  return <section className="fixture-standings"><header><div><p className="eyebrow">LEAGUE TABLE</p><h2>{leagueLabel(leagueCode)} 순위</h2></div><span>상위 {Math.min(rows.length, 5)}팀</span></header><div>{rows.slice(0, 5).map(row => <Link to={`/teams/${row.team?.teamId}`} key={row.leagueStandingId ?? row.team?.teamId}><b>{row.ranking}</b><span className="fixture-standing-team">{row.team?.logoUrl && <img src={logoUrl(row.team.logoUrl)} alt="" referrerPolicy="no-referrer" />}{row.team?.teamName || '팀 정보 없음'}</span><small>{row.all?.played ?? 0}경기</small><strong>{row.points ?? 0}</strong></Link>)}</div></section>;
}

function FixtureDetail({ fixture, events, lineups, statistics, playerStatistics, teams, loading, error, onClose }) {
  const [tab, setTab] = useState('events');
  useEffect(() => setTab(Array.isArray(events) && events.length ? 'events' : 'info'), [fixture?.fixtureId, events?.length]);
  if (loading) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">경기 정보를 불러오는 중입니다.</p></aside>;
  if (error) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">{error}</p></aside>;
  if (!fixture) return <aside className="fixture-detail-panel fixture-detail-empty"><p>목록에서 경기를 선택하면 경기 상세와 이벤트를 확인할 수 있습니다.</p></aside>;
  const orderedEvents = [...events].sort((a, b) => Number(a.elapsed || 0) - Number(b.elapsed || 0) || Number(a.extra || 0) - Number(b.extra || 0) || Number(a.fixtureEventId || 0) - Number(b.fixtureEventId || 0));
  return <aside className="fixture-detail-panel">
    <div className="fixture-detail-head"><button type="button" onClick={onClose} aria-label="경기 목록으로 돌아가기">‹</button><div><p className="eyebrow">MATCH DETAIL</p><h2>{leagueLabel(fixture.leagueCode)}</h2><p>{fixture.round || '라운드 정보 없음'}</p></div><span className={`fixture-status-pill ${LIVE.has(fixture.status) ? 'live' : ''}`}>{statusLabel(fixture)}</span></div>
    <div className="fixture-detail-score">
      <div className="fixture-detail-side fixture-detail-side-home"><TeamBadge team={fixture.homeTeam} teams={teams} side="home" large /><FixtureGoalSummary events={orderedEvents} teamId={fixture.homeTeam?.teamId} side="home" /></div>
      <div className="fixture-detail-result"><strong>{scoreLabel(fixture)}</strong><small className={LIVE.has(fixture.status) ? 'live' : ''}>{statusLabel(fixture)}</small></div>
      <div className="fixture-detail-side fixture-detail-side-away"><TeamBadge team={fixture.awayTeam} teams={teams} side="away" large /><FixtureGoalSummary events={orderedEvents} teamId={fixture.awayTeam?.teamId} side="away" /></div>
    </div>
    <div className="fixture-detail-tabs" role="tablist" aria-label="경기 상세 탭"><button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>이벤트 {orderedEvents.length ? `(${orderedEvents.length})` : ''}</button><button type="button" role="tab" aria-selected={tab === 'lineups'} className={tab === 'lineups' ? 'active' : ''} onClick={() => setTab('lineups')}>라인업</button><button type="button" role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>기록</button><button type="button" role="tab" aria-selected={tab === 'players'} className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>선수</button><button type="button" role="tab" aria-selected={tab === 'info'} className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>기본</button></div>
    {tab === 'events' && (orderedEvents.length ? <div className="fixture-events" aria-label="경기 이벤트 타임라인">{orderedEvents.map(event => <FixtureEventRow key={event.fixtureEventId} event={event} fixture={fixture} />)}</div> : <div className="fixture-events-empty">등록된 경기 이벤트가 없습니다.</div>)}
    {tab === 'lineups' && <FixtureLineups lineups={lineups} fixture={fixture} teams={teams} events={orderedEvents} />}
    {tab === 'stats' && <FixtureTeamStatistics statistics={statistics} fixture={fixture} />}
    {tab === 'players' && <FixturePlayerStatistics statistics={playerStatistics} fixture={fixture} />}
    {tab === 'info' && <FixtureInformation fixture={fixture} teams={teams} />}
  </aside>;
}

export default function FixturesPage({ teams }) {
  const navigate = useNavigate();
  const { fixtureId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date') || kstDate();
  const selectedLeague = params.get('leagueCode') || '';
  const [state, setState] = useState({ loading: true, error: '', fixtures: [] });
  const [detail, setDetail] = useState({ loading: false, error: '', fixture: null, events: [], lineups: [], statistics: [], playerStatistics: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    getFixtures({ date: selectedDate, leagueCode: SERVER_LEAGUE_CODES.has(selectedLeague) ? selectedLeague : undefined }, controller.signal)
      .then(data => { if (!Array.isArray(data)) throw new Error('예상과 다른 경기 목록 응답입니다.'); setState({ loading: false, error: '', fixtures: data }); })
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, error: error.message || '경기 정보를 불러오지 못했습니다.', fixtures: [] }); });
    return () => controller.abort();
  }, [selectedDate, selectedLeague]);

  useEffect(() => {
    const id = Number(fixtureId);
    if (!Number.isSafeInteger(id) || id < 1) { setDetail({ loading: false, error: '', fixture: null, events: [], lineups: [], statistics: [], playerStatistics: [] }); return; }
    const fromList = state.fixtures.find(item => Number(item.fixtureId) === id);
    // 목록에서 이미 선택한 경기라면 점수판을 먼저 보여 주고, 상세·이벤트만 이어서 갱신한다.
    setDetail({ loading: !fromList, error: '', fixture: fromList || null, events: [], lineups: [], statistics: [], playerStatistics: [] });
    const controller = new AbortController();
    Promise.allSettled([getFixture(id, controller.signal), getFixtureStatistics(id, controller.signal), getFixturePlayerStatistics(id, controller.signal)])
      .then(([detailResponse, statisticsResponse, playerStatisticsResponse]) => {
        if (detailResponse.status !== 'fulfilled') throw detailResponse.reason;
        const data = detailResponse.value;
        if (!data.fixture?.fixtureId) throw new Error('예상과 다른 경기 상세 응답입니다.');
        setDetail({ loading: false, error: '', fixture: data.fixture, events: data.events, lineups: data.lineups, statistics: statisticsResponse.status === 'fulfilled' && Array.isArray(statisticsResponse.value) ? statisticsResponse.value : [], playerStatistics: playerStatisticsResponse.status === 'fulfilled' && Array.isArray(playerStatisticsResponse.value) ? playerStatisticsResponse.value : [] });
      })
      .catch(error => { if (error.name !== 'AbortError') setDetail(current => ({ ...current, loading: false, error: error.message || '경기 상세를 불러오지 못했습니다.' })); });
    return () => controller.abort();
  }, [fixtureId, state.fixtures]);

  const visibleFixtures = useMemo(() => state.fixtures.filter(fixture => {
    if (!selectedLeague) return true;
    const fixtureLeague = LEAGUES.some(([code]) => code === fixture?.leagueCode) ? fixture.leagueCode : OTHER_LEAGUE_CODE;
    return fixtureLeague === selectedLeague;
  }), [selectedLeague, state.fixtures]);
  const grouped = useMemo(() => visibleFixtures.reduce((result, fixture) => { const key = fixture.leagueCode || OTHER_LEAGUE_CODE; result[key] = [...(result[key] || []), fixture]; return result; }, {}), [visibleFixtures]);
  const updateFilter = (nextDate, nextLeague = selectedLeague) => { const next = new URLSearchParams(); next.set('date', nextDate); if (nextLeague) next.set('leagueCode', nextLeague); setParams(next); };
  const selectFixture = id => navigate(`/fixtures/${id}?${params.toString()}`);
  const closeDetail = () => navigate(`/fixtures?${params.toString()}`);
  const dateStrip = [-2, -1, 0, 1, 2].map(offset => shiftDate(selectedDate, offset));

  return <section className={`view fixture-page ${fixtureId ? 'fixture-page-detail-open' : ''}`}>
    <header className="fixture-page-head"><p className="eyebrow">MATCH CENTRE</p><h1>경기</h1></header>
    <div className="fixture-toolbar"><button type="button" onClick={() => updateFilter(shiftDate(selectedDate, -1))} aria-label="이전 날짜">‹</button><div className="fixture-date-heading">{dateLabel(selectedDate)}</div><button type="button" onClick={() => updateFilter(shiftDate(selectedDate, 1))} aria-label="다음 날짜">›</button></div>
    <div className="fixture-date-strip" aria-label="날짜 선택">{dateStrip.map(date => <button type="button" key={date} className={date === selectedDate ? 'active' : ''} onClick={() => updateFilter(date)}>{dateLabel(date, true)}</button>)}<label className="fixture-date-picker">날짜 선택<input type="date" value={selectedDate} onChange={event => updateFilter(event.target.value)} /></label></div>
    <div className="fixture-league-filter" aria-label="리그 필터"><button type="button" className={!selectedLeague ? 'active' : ''} onClick={() => updateFilter(selectedDate, '')}>전체</button>{LEAGUE_GROUPS.map(group => <div className="fixture-league-filter-group" key={group.code}><span>{group.name}</span>{group.leagues.map(([code, name]) => <button key={code} type="button" className={selectedLeague === code ? 'active' : ''} onClick={() => updateFilter(selectedDate, code)}>{name}</button>)}</div>)}<button type="button" className={selectedLeague === OTHER_LEAGUE_CODE ? 'active' : ''} onClick={() => updateFilter(selectedDate, OTHER_LEAGUE_CODE)}>기타 리그</button></div>
    {selectedLeague && SERVER_LEAGUE_CODES.has(selectedLeague) && <LeagueStandings leagueCode={selectedLeague} />}
    <div className="fixture-layout"><main className="fixture-list-panel"><div className="fixture-list-title"><div><p className="eyebrow">{selectedDate}</p><h2>{dateLabel(selectedDate)}</h2></div><span>{visibleFixtures.length}경기</span></div>{state.loading && <div className="fixture-empty">경기 정보를 불러오는 중입니다.</div>}{!state.loading && state.error && <div className="fixture-empty error">{state.error}<button type="button" onClick={() => updateFilter(selectedDate, selectedLeague)}>다시 시도</button></div>}{!state.loading && !state.error && !visibleFixtures.length && <div className="fixture-empty"><strong>선택한 조건에 저장된 경기가 없습니다.</strong><span>날짜 또는 리그를 바꾸거나, 경기 데이터 동기화 후 다시 확인해 주세요.</span></div>}{!state.loading && !state.error && Object.entries(grouped).map(([leagueCode, fixtures]) => <section className="fixture-league-group" key={leagueCode}><h3><span>{leagueLabel(leagueCode)}</span><small>{fixtures.length}경기</small></h3>{fixtures.map(fixture => <FixtureRow key={fixture.fixtureId} fixture={fixture} teams={teams} selected={String(fixture.fixtureId) === String(fixtureId)} onSelect={selectFixture} />)}</section>)}</main><FixtureDetail {...detail} teams={teams} onClose={closeDetail} /></div>
  </section>;
}
