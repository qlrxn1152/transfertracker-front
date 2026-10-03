import { useEffect, useMemo, useState } from 'react';
import { getTransfers } from '../api/client';
import { demo } from '../demo';
import { FEE_BANDS } from '../constants';
import {
  displayDate,
  feeBand,
  feeMillions,
  leagueName,
  photoUrl,
  teamDisplayName,
  typeLabel
} from '../utils';
import LeagueTeamFilters from '../components/LeagueTeamFilters';
import Pagination from '../components/Pagination';

const initial = {
  page: 0,
  keyWord: '',
  leagueCode: '',
  teamId: '',
  hasNext: false,
  hasPrevious: false,
  loading: true,
  error: ''
};

export default function TransfersPage({ sample, teams, refreshKey, onPlayerOpen }) {
  const [state, setState] = useState(initial);
  const [search, setSearch] = useState('');
  const [transfers, setTransfers] = useState([]);
  const [feeFilter, setFeeFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setState(current => current.keyWord === search.trim()
        ? current
        : { ...current, page: 0, keyWord: search.trim() });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState(current => ({ ...current, loading: true, error: '' }));

      try {
        let data;

        if (sample) {
          let source = demo.transfers.filter(item =>
            String(item.playerName || '').toLowerCase().includes(state.keyWord.toLowerCase())
          );

          if (state.leagueCode) {
            const allowed = new Set(
              demo.teams.filter(team => team.leagueCode === state.leagueCode).map(team => team.teamName)
            );
            source = source.filter(item => allowed.has(item.inTeamName) || allowed.has(item.outTeamName));
          }

          if (state.teamId) {
            const selected = demo.teams.find(team => String(team.teamId) === String(state.teamId));
            source = source.filter(item =>
              item.inTeamName === selected?.teamName || item.outTeamName === selected?.teamName
            );
          }

          const size = 20;
          data = {
            transfers: source.slice(state.page * size, (state.page + 1) * size),
            hasNext: (state.page + 1) * size < source.length,
            hasPrevious: state.page > 0
          };
        } else {
          data = await getTransfers(state, controller.signal);
        }

        if (!Array.isArray(data.transfers)) {
          throw new Error('예상과 다른 이적 목록 응답 형식입니다.');
        }

        setTransfers(data.transfers);
        setState(current => ({
          ...current,
          hasNext: Boolean(data.hasNext),
          hasPrevious: current.page > 0 && Boolean(data.hasPrevious),
          loading: false,
          error: ''
        }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setTransfers([]);
          setState(current => ({ ...current, loading: false, error: error.message }));
        }
      }
    }

    load();
    return () => controller.abort();
  }, [sample, state.page, state.keyWord, state.leagueCode, state.teamId, refreshKey]);

  const groups = useMemo(() => {
    const map = new Map();

    for (const item of transfers) {
      const key = item.playerId != null ? `id:${item.playerId}` : `name:${item.playerName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }

    return [...map.values()]
      .map(history => [...history].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))))
      .filter(history => feeFilter === 'all' || feeBand(history[0]) === feeFilter)
      .sort((a, b) => String(b[0]?.date || '').localeCompare(String(a[0]?.date || '')));
  }, [transfers, feeFilter]);

  const latest = useMemo(() => {
    const dates = transfers.map(item => item.date).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || ''));
    return dates.length ? displayDate([...dates].sort().at(-1)) : '—';
  }, [transfers]);

  const transferName = (name, ko) => {
    if (ko) return ko;
    const matches = teams.filter(team => team.teamName === name);
    return matches.length === 1 ? teamDisplayName(matches[0]) : name;
  };

  const selectedTeam = state.teamId
    ? teams.find(team => String(team.teamId) === String(state.teamId))
    : null;

  const emptyText = state.error
    || (state.keyWord || feeFilter !== 'all'
      ? '검색 조건에 맞는 이적 기록이 없습니다.'
      : '아직 등록된 이적 기록이 없습니다.');

  return (
    <section className="view">
      <div className="section-head">
        <div>
          <p className="eyebrow">LATEST MOVES</p>
          <h2>이적 현황 <span className="count">현재 페이지 {groups.length.toLocaleString()}명</span></h2>
          <p>
            최신순으로 이적 기록을 살펴보세요.
            <span className="latest-note"> 페이지 최근 기록 <span>{latest}</span></span>
          </p>
        </div>
      </div>

      <div className="toolbar">
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="전체 선수 이름 검색"
            aria-label="이적 검색"
          />
        </label>
      </div>

      <LeagueTeamFilters
        prefix="transfers"
        leagueCode={state.leagueCode}
        teamId={state.teamId}
        teams={teams}
        onLeagueChange={leagueCode =>
          setState(current => ({ ...current, page: 0, leagueCode, teamId: '' }))
        }
        onTeamChange={teamId =>
          setState(current => ({ ...current, page: 0, teamId }))
        }
      />

      <div className="fee-toolbar">
        <span>이적료</span>
        <div className="filter-group" aria-label="이적료 범위">
          {FEE_BANDS.map(([value, label]) => (
            <button
              key={value}
              className={`filter ${feeFilter === value ? 'selected' : ''}`}
              type="button"
              onClick={() => setFeeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!!transfers.length && !transfers.some(item => feeMillions(item) !== null) && (
        <p className="fee-notice">
          숫자로 표시된 이적료가 없습니다. 금액 미공개 기록은 N/A로 볼 수 있습니다.
        </p>
      )}

      {state.loading ? (
        <div className="empty list-loading">목록을 불러오는 중…</div>
      ) : groups.length ? (
        <div className="transfer-grid" aria-live="polite">
          {groups.map((history, index) => {
            const item = history[0];
            const picture = photoUrl(item.photoUrl);
            const fee = feeMillions(item);

            return (
              <button
                className="transfer-card transfer-card-button"
                type="button"
                key={`${item.playerId ?? item.playerName}-${index}`}
                onClick={() => item.playerId && onPlayerOpen(Number(item.playerId))}
              >
                <div className="card-cover" aria-hidden="true">
                  <span className="cover-lines" />
                  <span className="photo-fallback">{(item.playerName || '?').slice(0, 1)}</span>
                  {picture && <img className="player-photo" src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                  <span className="cover-label">TRANSFER TRACKER</span>
                </div>

                <div className="card-content">
                  <div className="card-top">
                    <span className={`badge ${fee === null ? 'other' : ''}`}>
                      {fee === null ? typeLabel(item.type) : '이적료'}
                    </span>
                    <time className="date-cell">{displayDate(item.date)}</time>
                  </div>

                  <h3>{item.playerName}</h3>

                  <div className="club-move">
                    <div>
                      <small>FROM</small>
                      <strong>{transferName(item.outTeamName, item.outTeamNameKo)}</strong>
                    </div>
                    <span className="move-arrow" aria-hidden="true">→</span>
                    <div>
                      <small>TO</small>
                      <strong>{transferName(item.inTeamName, item.inTeamNameKo)}</strong>
                    </div>
                  </div>

                  {fee !== null && <span className="card-fee">{item.fee ?? item.transferFee ?? item.type}</span>}
                  <span className="expand-label">전체 이적 이력 보기 <span className="expand-chevron">↗</span></span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={`empty ${state.error ? 'error' : ''}`}>{emptyText}</div>
      )}

      <p className="showing">
        {state.page + 1} 페이지 · {groups.length}명 표시 / 이적 {transfers.length}건 ·
        {' '}{state.leagueCode ? leagueName(state.leagueCode) : '전체 리그'}
        {selectedTeam ? ` · ${teamDisplayName(selectedTeam)}` : ''}
        {state.keyWord ? ` · 검색어 “${state.keyWord}”` : ''}
        {' '}· 금액 필터는 현재 페이지에 적용됩니다.
      </p>

      <Pagination
        page={state.page}
        hasPrevious={state.hasPrevious}
        hasNext={state.hasNext}
        loading={state.loading}
        onPage={page => setState(current => ({ ...current, page }))}
      />
    </section>
  );
}
