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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(value);
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
  if (!value) return '시간 미정';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '시간 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: KST
  }).format(timestamp);
}

function updatedLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '동기화 시각 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: KST
  }).format(new Date(value));
}

function statusLabel(fixture) {
  const status = String(fixture?.status || '');
  if (LIVE.has(status)) {
    if (status === 'HALF_TIME') return '하프타임';
    const suffix = fixture?.extra ? `+${fixture.extra}` : '';
    return fixture?.elapsed != null ? `${fixture.elapsed}${suffix}' LIVE` : '경기 진행 중';
  }
  if (FINISHED.has(status)) return status === 'AFTER_PENALTY' ? '승부차기 종료' : '경기 종료';
  return ({ POSTPONED: '경기 연기', CANCELLED: '경기 취소', SUSPENDED: '경기 중단', INTERRUPTED: '경기 일시 중단', TIME_TO_BE_DEFINED: '일정 미정' }[status] || '경기 예정');
}

function scoreLabel(fixture) {
  if (fixture?.homeScore != null && fixture?.awayScore != null) return `${fixture.homeScore} : ${fixture.awayScore}`;
  return timeLabel(fixture?.kickoffAt);
}

function leagueLabel(code) {
  return LEAGUES.find(([value]) => value === code)?.[1] || code || '기타 대회';
}

function teamMeta(team, teams) {
  const registered = teams.find(value => String(value.teamId) === String(team?.teamId));
  return {
    name: team?.teamName || teamDisplayName(registered) || '팀 정보 없음',
    logo: logoUrl(registered?.logoUrl)
  };
}

function TeamBadge({ team, teams, side }) {
  const data = teamMeta(team, teams);
  return (
    <span className={`fixture-team fixture-team-${side}`}>
      {side === 'home' && <strong>{data.name}</strong>}
      <span className="fixture-team-logo" aria-hidden="true">
        {data.logo ? <img src={data.logo} alt="" referrerPolicy="no-referrer" /> : data.name.slice(0, 1)}
      </span>
      {side === 'away' && <strong>{data.name}</strong>}
    </span>
  );
}

function FixtureRow({ fixture, teams, selected, onSelect }) {
  return (
    <button type="button" className={`fixture-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(fixture.fixtureId)}>
      <TeamBadge team={fixture.homeTeam} teams={teams} side="home" />
      <span className="fixture-score">
        <strong>{scoreLabel(fixture)}</strong>
        <small className={LIVE.has(fixture.status) ? 'live' : ''}>{statusLabel(fixture)}</small>
      </span>
      <TeamBadge team={fixture.awayTeam} teams={teams} side="away" />
    </button>
  );
}

function FixtureDetail({ fixture, teams, loading, error, onClose }) {
  if (loading) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">경기 정보를 불러오는 중입니다.</p></aside>;
  if (error) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">{error}</p></aside>;
  if (!fixture) return <aside className="fixture-detail-panel"><p className="fixture-detail-muted">목록에서 경기를 선택하면 상세 정보가 여기에 표시됩니다.</p></aside>;

  return (
    <aside className="fixture-detail-panel">
      <div className="fixture-detail-head">
        <div>
          <p className="eyebrow">MATCH CENTRE</p>
          <h2>{leagueLabel(fixture.leagueCode)}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="경기 상세 닫기">×</button>
      </div>
      <p className="fixture-round">{fixture.season ? `${fixture.season} 시즌` : '시즌 정보 없음'} · {fixture.round || '라운드 정보 없음'}</p>
      <div className="fixture-detail-score">
        <TeamBadge team={fixture.homeTeam} teams={teams} side="home" />
        <div>
          <strong>{scoreLabel(fixture)}</strong>
          <small className={LIVE.has(fixture.status) ? 'live' : ''}>{statusLabel(fixture)}</small>
        </div>
        <TeamBadge team={fixture.awayTeam} teams={teams} side="away" />
      </div>
      <dl className="fixture-info-list">
        <div><dt>경기 시작</dt><dd>{fixture.kickoffAt ? `${dateLabel(kstDate(new Date(fixture.kickoffAt)))} ${timeLabel(fixture.kickoffAt)}` : '시간 미정'}</dd></div>
        <div><dt>경기장</dt><dd>{fixture.venueName || '경기장 정보 없음'}</dd></div>
        <div><dt>마지막 동기화</dt><dd>{updatedLabel(fixture.updatedAt)}</dd></div>
      </dl>
      <div className="fixture-detail-links">
        {fixture.homeTeam?.teamId && <Link to={`/teams/${fixture.homeTeam.teamId}`}>홈팀 보기</Link>}
        {fixture.awayTeam?.teamId && <Link to={`/teams/${fixture.awayTeam.teamId}`}>원정팀 보기</Link>}
      </div>
    </aside>
  );
}

export default function FixturesPage({ teams }) {
  const navigate = useNavigate();
  const { fixtureId } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date') || kstDate();
  const selectedLeague = params.get('leagueCode') || '';
  const [state, setState] = useState({ loading: true, error: '', fixtures: [] });
  const [detail, setDetail] = useState({ loading: false, error: '', fixture: null });

  useEffect(() => {
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: '' }));
    getFixtures({ date: selectedDate, leagueCode: selectedLeague || undefined }, controller.signal)
      .then(data => {
        if (!Array.isArray(data)) throw new Error('예상과 다른 경기 목록 응답입니다.');
        setState({ loading: false, error: '', fixtures: data });
      })
      .catch(error => {
        if (error.name !== 'AbortError') setState({ loading: false, error: error.message || '경기 정보를 불러오지 못했습니다.', fixtures: [] });
      });
    return () => controller.abort();
  }, [selectedDate, selectedLeague]);

  useEffect(() => {
    const id = Number(fixtureId);
    if (!Number.isSafeInteger(id) || id < 1) {
      setDetail({ loading: false, error: '', fixture: null });
      return;
    }
    const fromList = state.fixtures.find(item => Number(item.fixtureId) === id);
    if (fromList) setDetail({ loading: false, error: '', fixture: fromList });
    const controller = new AbortController();
    setDetail(current => ({ ...current, loading: true, error: '' }));
    getFixture(id, controller.signal)
      .then(data => setDetail({ loading: false, error: '', fixture: data }))
      .catch(error => {
        if (error.name !== 'AbortError') setDetail(current => ({ ...current, loading: false, error: error.message || '경기 상세를 불러오지 못했습니다.' }));
      });
    return () => controller.abort();
  }, [fixtureId, state.fixtures]);

  const grouped = useMemo(() => state.fixtures.reduce((result, fixture) => {
    const key = fixture.leagueCode || 'OTHER';
    result[key] = [...(result[key] || []), fixture];
    return result;
  }, {}), [state.fixtures]);

  function updateFilter(nextDate, nextLeague = selectedLeague) {
    const next = new URLSearchParams();
    next.set('date', nextDate);
    if (nextLeague) next.set('leagueCode', nextLeague);
    setParams(next);
  }

  function selectFixture(id) { navigate(`/fixtures/${id}?${params.toString()}`); }
  function closeDetail() { navigate(`/fixtures?${params.toString()}`); }
  const dateStrip = [-2, -1, 0, 1, 2].map(offset => shiftDate(selectedDate, offset));

  return (
    <section className="view fixture-page">
      <header className="fixture-page-head">
        <div><p className="eyebrow">MATCH CENTRE</p><h1>경기</h1><p>저장된 일정과 결과를 한국 시간 기준으로 확인하세요.</p></div>
      </header>
      <div className="fixture-toolbar">
        <button type="button" onClick={() => updateFilter(shiftDate(selectedDate, -1))} aria-label="이전 날짜">‹</button>
        <div className="fixture-date-strip">
          {dateStrip.map(date => <button type="button" key={date} className={date === selectedDate ? 'active' : ''} onClick={() => updateFilter(date)}>{dateLabel(date, true)}</button>)}
        </div>
        <button type="button" onClick={() => updateFilter(shiftDate(selectedDate, 1))} aria-label="다음 날짜">›</button>
        <label className="fixture-date-picker">날짜 선택<input type="date" value={selectedDate} onChange={event => updateFilter(event.target.value)} /></label>
      </div>
      <div className="fixture-league-filter" aria-label="리그 필터">
        <button type="button" className={!selectedLeague ? 'active' : ''} onClick={() => updateFilter(selectedDate, '')}>전체</button>
        {LEAGUES.filter(([code]) => code !== 'unclassified').map(([code, name]) => <button key={code} type="button" className={selectedLeague === code ? 'active' : ''} onClick={() => updateFilter(selectedDate, code)}>{name}</button>)}
      </div>
      <div className="fixture-layout">
        <main className="fixture-list-panel">
          <div className="fixture-list-title"><div><p className="eyebrow">{selectedDate}</p><h2>{dateLabel(selectedDate)}</h2></div><span>{state.fixtures.length}경기</span></div>
          {state.loading && <div className="fixture-empty">경기 정보를 불러오는 중입니다.</div>}
          {!state.loading && state.error && <div className="fixture-empty error">{state.error}<button type="button" onClick={() => updateFilter(selectedDate, selectedLeague)}>다시 시도</button></div>}
          {!state.loading && !state.error && !state.fixtures.length && <div className="fixture-empty">선택한 날짜에 저장된 경기가 없습니다.</div>}
          {!state.loading && !state.error && Object.entries(grouped).map(([leagueCode, fixtures]) => <section className="fixture-league-group" key={leagueCode}><h3>{leagueLabel(leagueCode)} <small>{fixtures.length}</small></h3>{fixtures.map(fixture => <FixtureRow key={fixture.fixtureId} fixture={fixture} teams={teams} selected={String(fixture.fixtureId) === String(fixtureId)} onSelect={selectFixture} />)}</section>)}
        </main>
        <FixtureDetail {...detail} teams={teams} onClose={closeDetail} />
      </div>
    </section>
  );
}
