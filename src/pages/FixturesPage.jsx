import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getFixture, getFixtures } from '../api/client';
import { LEAGUES } from '../constants';
import { logoUrl, teamDisplayName } from '../utils';
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
  if (type === 'GOAL') return { icon: '⚽', label: '득점' };
  if (type === 'CARD') return { icon: '■', label: event.detail || '카드' };
  if (type === 'SUBSTITUTION') return { icon: '⇄', label: '교체 투입' };
  if (type === 'VAR') return { icon: 'VAR', label: event.detail || 'VAR 판정' };
  return { icon: '•', label: event.detail || '경기 이벤트' };
}

function FixtureEventRow({ event, fixture }) {
  const meta = eventMeta(event);
  const home = String(event?.team?.teamId) === String(fixture?.homeTeam?.teamId);
  const player = event?.player?.playerName || event?.team?.teamName || '선수 정보 없음';
  const description = event?.relatedPlayer?.playerName ? `${meta.label} · ${event.relatedPlayer.playerName}` : event?.comments || meta.label;
  const minute = event?.elapsed == null ? '—' : `${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`;
  return <article className={`fixture-event ${home ? 'home' : 'away'} ${String(event?.type || '').toLowerCase()}`}>
    <div className="fixture-event-copy"><span className="fixture-event-icon" aria-hidden="true">{meta.icon}</span><span><strong>{player}</strong><small>{description}</small></span></div>
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

function FixtureDetail({ fixture, events, teams, loading, error, onClose }) {
  const [tab, setTab] = useState('events');
  useEffect(() => setTab(Array.isArray(events) && events.length ? 'events' : 'info'), [fixture?.fixtureId, events?.length]);
  if (loading) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">경기 정보를 불러오는 중입니다.</p></aside>;
  if (error) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">{error}</p></aside>;
  if (!fixture) return <aside className="fixture-detail-panel fixture-detail-empty"><p>목록에서 경기를 선택하면 경기 상세와 이벤트를 확인할 수 있습니다.</p></aside>;
  const orderedEvents = [...events].sort((a, b) => Number(a.elapsed || 0) - Number(b.elapsed || 0) || Number(a.extra || 0) - Number(b.extra || 0) || Number(a.fixtureEventId || 0) - Number(b.fixtureEventId || 0));
  return <aside className="fixture-detail-panel">
    <div className="fixture-detail-head"><button type="button" onClick={onClose} aria-label="경기 목록으로 돌아가기">‹</button><div><p className="eyebrow">MATCH DETAIL</p><h2>{leagueLabel(fixture.leagueCode)}</h2><p>{fixture.round || '라운드 정보 없음'}</p></div><span className={`fixture-status-pill ${LIVE.has(fixture.status) ? 'live' : ''}`}>{statusLabel(fixture)}</span></div>
    <div className="fixture-detail-score"><TeamBadge team={fixture.homeTeam} teams={teams} side="home" large /><div><strong>{scoreLabel(fixture)}</strong><small className={LIVE.has(fixture.status) ? 'live' : ''}>{statusLabel(fixture)}</small></div><TeamBadge team={fixture.awayTeam} teams={teams} side="away" large /></div>
    <div className="fixture-detail-tabs" role="tablist" aria-label="경기 상세 탭"><button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>이벤트 {orderedEvents.length ? `(${orderedEvents.length})` : ''}</button><button type="button" role="tab" aria-selected={tab === 'info'} className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>기본 정보</button></div>
    {tab === 'events' && (orderedEvents.length ? <div className="fixture-events" aria-label="경기 이벤트 타임라인">{orderedEvents.map(event => <FixtureEventRow key={event.fixtureEventId} event={event} fixture={fixture} />)}</div> : <div className="fixture-events-empty">등록된 경기 이벤트가 없습니다.</div>)}
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
  const [detail, setDetail] = useState({ loading: false, error: '', fixture: null, events: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    getFixtures({ date: selectedDate, leagueCode: selectedLeague || undefined }, controller.signal)
      .then(data => { if (!Array.isArray(data)) throw new Error('예상과 다른 경기 목록 응답입니다.'); setState({ loading: false, error: '', fixtures: data }); })
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, error: error.message || '경기 정보를 불러오지 못했습니다.', fixtures: [] }); });
    return () => controller.abort();
  }, [selectedDate, selectedLeague]);

  useEffect(() => {
    const id = Number(fixtureId);
    if (!Number.isSafeInteger(id) || id < 1) { setDetail({ loading: false, error: '', fixture: null, events: [] }); return; }
    const fromList = state.fixtures.find(item => Number(item.fixtureId) === id);
    // 목록에서 이미 선택한 경기라면 점수판을 먼저 보여 주고, 상세·이벤트만 이어서 갱신한다.
    setDetail({ loading: !fromList, error: '', fixture: fromList || null, events: [] });
    const controller = new AbortController();
    getFixture(id, controller.signal)
      .then(data => { if (!data.fixture?.fixtureId) throw new Error('예상과 다른 경기 상세 응답입니다.'); setDetail({ loading: false, error: '', fixture: data.fixture, events: data.events }); })
      .catch(error => { if (error.name !== 'AbortError') setDetail(current => ({ ...current, loading: false, error: error.message || '경기 상세를 불러오지 못했습니다.' })); });
    return () => controller.abort();
  }, [fixtureId, state.fixtures]);

  const grouped = useMemo(() => state.fixtures.reduce((result, fixture) => { const key = fixture.leagueCode || 'OTHER'; result[key] = [...(result[key] || []), fixture]; return result; }, {}), [state.fixtures]);
  const updateFilter = (nextDate, nextLeague = selectedLeague) => { const next = new URLSearchParams(); next.set('date', nextDate); if (nextLeague) next.set('leagueCode', nextLeague); setParams(next); };
  const selectFixture = id => navigate(`/fixtures/${id}?${params.toString()}`);
  const closeDetail = () => navigate(`/fixtures?${params.toString()}`);
  const dateStrip = [-2, -1, 0, 1, 2].map(offset => shiftDate(selectedDate, offset));

  return <section className={`view fixture-page ${fixtureId ? 'fixture-page-detail-open' : ''}`}>
    <header className="fixture-page-head"><p className="eyebrow">MATCH CENTRE</p><h1>경기</h1></header>
    <div className="fixture-toolbar"><button type="button" onClick={() => updateFilter(shiftDate(selectedDate, -1))} aria-label="이전 날짜">‹</button><div className="fixture-date-heading">{dateLabel(selectedDate)}</div><button type="button" onClick={() => updateFilter(shiftDate(selectedDate, 1))} aria-label="다음 날짜">›</button></div>
    <div className="fixture-date-strip" aria-label="날짜 선택">{dateStrip.map(date => <button type="button" key={date} className={date === selectedDate ? 'active' : ''} onClick={() => updateFilter(date)}>{dateLabel(date, true)}</button>)}<label className="fixture-date-picker">날짜 선택<input type="date" value={selectedDate} onChange={event => updateFilter(event.target.value)} /></label></div>
    <div className="fixture-league-filter" aria-label="리그 필터"><button type="button" className={!selectedLeague ? 'active' : ''} onClick={() => updateFilter(selectedDate, '')}>전체</button>{LEAGUES.filter(([code]) => code !== 'unclassified').map(([code, name]) => <button key={code} type="button" className={selectedLeague === code ? 'active' : ''} onClick={() => updateFilter(selectedDate, code)}>{name}</button>)}</div>
    <div className="fixture-layout"><main className="fixture-list-panel"><div className="fixture-list-title"><div><p className="eyebrow">{selectedDate}</p><h2>{dateLabel(selectedDate)}</h2></div><span>{state.fixtures.length}경기</span></div>{state.loading && <div className="fixture-empty">경기 정보를 불러오는 중입니다.</div>}{!state.loading && state.error && <div className="fixture-empty error">{state.error}<button type="button" onClick={() => updateFilter(selectedDate, selectedLeague)}>다시 시도</button></div>}{!state.loading && !state.error && !state.fixtures.length && <div className="fixture-empty"><strong>선택한 날짜에 저장된 경기가 없습니다.</strong><span>날짜를 바꾸거나, 경기 데이터 동기화 후 다시 확인해 주세요.</span></div>}{!state.loading && !state.error && Object.entries(grouped).map(([leagueCode, fixtures]) => <section className="fixture-league-group" key={leagueCode}><h3><span>{leagueLabel(leagueCode)}</span><small>{fixtures.length}경기</small></h3>{fixtures.map(fixture => <FixtureRow key={fixture.fixtureId} fixture={fixture} teams={teams} selected={String(fixture.fixtureId) === String(fixtureId)} onSelect={selectFixture} />)}</section>)}</main><FixtureDetail {...detail} teams={teams} onClose={closeDetail} /></div>
  </section>;
}
