import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTransfers } from '../api/client';
import { demo } from '../demo';
import { FEE_BANDS } from '../constants';
import {
  displayDate,
  feeBand,
  feeMillions,
  leagueName,
  logoUrl,
  photoUrl,
  teamDisplayName,
  typeLabel
} from '../utils';
import LeagueTeamFilters from '../components/LeagueTeamFilters';
import Pagination from '../components/Pagination';
import './TransfersPage.css';

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

function feeText(item) {
  const raw = item?.fee ?? item?.transferFee;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return '비공개';
}

function transferStatus(item) {
  const label = typeLabel(item?.type);
  const upper = String(item?.type || '').toUpperCase();

  if (upper === 'LOAN') return { label, tone: 'loan' };
  if (upper === 'FREE') return { label, tone: 'free' };
  if (upper === 'OUT') return { label, tone: 'out' };
  return { label, tone: 'default' };
}

function readFilterParams(params) {
  return {
    page: Math.max(0, Number(params.get('page') || 0) || 0),
    keyWord: params.get('q') || '',
    leagueCode: params.get('league') || '',
    teamId: params.get('teamId') || '',
    fee: params.get('fee') || 'all'
  };
}

export default function TransfersPage({ sample, teams, refreshKey, onPlayerOpen }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const first = readFilterParams(searchParams);

  const [state, setState] = useState({
    ...initial,
    page: first.page,
    keyWord: first.keyWord,
    leagueCode: first.leagueCode,
    teamId: first.teamId
  });
  const [search, setSearch] = useState(first.keyWord);
  const [transfers, setTransfers] = useState([]);
  const [feeFilter, setFeeFilter] = useState(first.fee);

  // URL을 필터 상태의 기준(source of truth)으로 사용한다.
  // 브라우저 뒤로가기/앞으로가기로 URL이 바뀌면 화면 상태도 같이 복원된다.
  useEffect(() => {
    const params = new URLSearchParams(paramsKey);
    const next = readFilterParams(params);

    setSearch(current => current === next.keyWord ? current : next.keyWord);
    setFeeFilter(current => current === next.fee ? current : next.fee);

    setState(current => {
      if (
        current.page === next.page
        && current.keyWord === next.keyWord
        && current.leagueCode === next.leagueCode
        && current.teamId === next.teamId
      ) {
        return current;
      }

      return {
        ...current,
        page: next.page,
        keyWord: next.keyWord,
        leagueCode: next.leagueCode,
        teamId: next.teamId
      };
    });
  }, [paramsKey]);

  // 검색어 변경은 debounce 후 새 history entry로 남긴다.
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = search.trim();
      const current = new URLSearchParams(paramsKey);
      const currentValue = current.get('q') || '';

      if (currentValue === value) return;

      if (value) current.set('q', value);
      else current.delete('q');

      current.delete('page');
      setSearchParams(current);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, paramsKey, setSearchParams]);

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
    const dates = transfers
      .map(item => item.date)
      .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || ''));

    return dates.length ? displayDate([...dates].sort().at(-1)) : '—';
  }, [transfers]);

  const findTeam = name => {
    const matches = teams.filter(team => team.teamName === name);
    return matches.length === 1 ? matches[0] : null;
  };

  const transferName = (name, ko) => {
    if (ko) return ko;
    const team = findTeam(name);
    return team ? teamDisplayName(team) : name;
  };

  const teamLogo = name => {
    const team = findTeam(name);
    return team ? logoUrl(team.logoUrl) : null;
  };

  const pushFilterParams = mutate => {
    const params = new URLSearchParams(paramsKey);
    mutate(params);
    setSearchParams(params);
  };

  const changeLeague = leagueCode => {
    pushFilterParams(params => {
      if (leagueCode) params.set('league', leagueCode);
      else params.delete('league');

      params.delete('teamId');
      params.delete('page');
    });
  };

  const changeTeam = teamId => {
    pushFilterParams(params => {
      if (teamId) params.set('teamId', teamId);
      else params.delete('teamId');

      params.delete('page');
    });
  };

  const changeFee = value => {
    pushFilterParams(params => {
      if (value !== 'all') params.set('fee', value);
      else params.delete('fee');

      params.delete('page');
    });
  };

  const changePage = page => {
    pushFilterParams(params => {
      if (page > 0) params.set('page', String(page));
      else params.delete('page');
    });
  };

  const selectedTeam = state.teamId
    ? teams.find(team => String(team.teamId) === String(state.teamId))
    : null;

  const emptyText = state.error
    || (state.keyWord || feeFilter !== 'all'
      ? '검색 조건에 맞는 이적 기록이 없습니다.'
      : '아직 등록된 이적 기록이 없습니다.');

  return (
    <section className="view transfer-market-view">
      <div className="transfer-market-head">
        <div>
          <p className="eyebrow">TRANSFER MARKET</p>
          <h2>이적 현황</h2>
          <p>
            선수의 최신 이적을 한눈에 비교하세요.
            <span> 페이지 최근 기록 {latest}</span>
          </p>
        </div>

        <div className="transfer-market-count">
          <strong>{groups.length.toLocaleString()}</strong>
          <span>현재 페이지 선수</span>
        </div>
      </div>

      <div className="transfer-market-toolbar">
        <label className="search transfer-market-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="선수 이름 검색"
            aria-label="이적 검색"
          />
        </label>
      </div>

      <LeagueTeamFilters
        prefix="transfers"
        leagueCode={state.leagueCode}
        teamId={state.teamId}
        teams={teams}
        onLeagueChange={changeLeague}
        onTeamChange={changeTeam}
      />

      <div className="transfer-market-fees">
        <span>이적료</span>
        <div className="filter-group" aria-label="이적료 범위">
          {FEE_BANDS.map(([value, label]) => (
            <button
              key={value}
              className={`filter ${feeFilter === value ? 'selected' : ''}`}
              type="button"
              onClick={() => changeFee(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.loading ? (
        <div className="empty list-loading">목록을 불러오는 중…</div>
      ) : groups.length ? (
        <div className="transfer-market-board" aria-live="polite">
          <div className="transfer-market-columns" aria-hidden="true">
            <span>날짜</span>
            <span>선수</span>
            <span>이전 팀</span>
            <span />
            <span>새 팀</span>
            <span>유형</span>
            <span>이적료</span>
            <span />
          </div>

          <div className="transfer-market-list">
            {groups.map((history, index) => {
              const item = history[0];
              const picture = photoUrl(item.photoUrl);
              const fromLogo = teamLogo(item.outTeamName);
              const toLogo = teamLogo(item.inTeamName);
              const status = transferStatus(item);

              return (
                <article
                  className="transfer-market-row"
                  key={`${item.playerId ?? item.playerName}-${index}`}
                >
                  <time className="transfer-market-date">{displayDate(item.date)}</time>

                  <button
                    className="transfer-market-player transfer-market-player-button"
                    type="button"
                    onClick={() => item.playerId && onPlayerOpen(Number(item.playerId))}
                  >
                    <span className="transfer-market-avatar">
                      {(item.playerName || '?').slice(0, 1)}
                      {picture && (
                        <img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      )}
                    </span>

                    <span className="transfer-market-player-copy">
                      <strong>{item.playerName}</strong>
                      <small>
                        {history.length > 1 ? `이적 기록 ${history.length}건` : `PLAYER #${item.playerId ?? '—'}`}
                      </small>
                    </span>
                  </button>

                  {findTeam(item.outTeamName) ? (
                    <Link className="transfer-market-team transfer-market-team-link" to={`/teams/${findTeam(item.outTeamName).teamId}`}>
                      <span className="transfer-market-team-logo">
                        {(item.outTeamName || '?').slice(0, 1)}
                        {fromLogo && <img src={fromLogo} alt="" referrerPolicy="no-referrer" />}
                      </span>
                      <span>
                        <strong>{transferName(item.outTeamName, item.outTeamNameKo)}</strong>
                        <small>FROM</small>
                      </span>
                    </Link>
                  ) : (
                    <span className="transfer-market-team">
                      <span className="transfer-market-team-logo">{(item.outTeamName || '?').slice(0, 1)}</span>
                      <span>
                        <strong>{transferName(item.outTeamName, item.outTeamNameKo)}</strong>
                        <small>FROM</small>
                      </span>
                    </span>
                  )}

                  <span className="transfer-market-arrow" aria-hidden="true">→</span>

                  {findTeam(item.inTeamName) ? (
                    <Link className="transfer-market-team transfer-market-team-link" to={`/teams/${findTeam(item.inTeamName).teamId}`}>
                      <span className="transfer-market-team-logo">
                        {(item.inTeamName || '?').slice(0, 1)}
                        {toLogo && <img src={toLogo} alt="" referrerPolicy="no-referrer" />}
                      </span>
                      <span>
                        <strong>{transferName(item.inTeamName, item.inTeamNameKo)}</strong>
                        <small>TO</small>
                      </span>
                    </Link>
                  ) : (
                    <span className="transfer-market-team">
                      <span className="transfer-market-team-logo">{(item.inTeamName || '?').slice(0, 1)}</span>
                      <span>
                        <strong>{transferName(item.inTeamName, item.inTeamNameKo)}</strong>
                        <small>TO</small>
                      </span>
                    </span>
                  )}

                  <span className={`transfer-market-status ${status.tone}`}>{status.label}</span>

                  <span className="transfer-market-fee">
                    <strong>{feeText(item)}</strong>
                    <small>{feeMillions(item) === null ? '금액 정보 없음' : 'TRANSFER FEE'}</small>
                  </span>

                  <button
                    className="transfer-market-open"
                    type="button"
                    onClick={() => item.playerId && onPlayerOpen(Number(item.playerId))}
                    aria-label={`${item.playerName} 상세 보기`}
                  >
                    ↗
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`empty ${state.error ? 'error' : ''}`}>{emptyText}</div>
      )}

      <p className="showing transfer-market-showing">
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
        onPage={changePage}
      />
    </section>
  );
}
