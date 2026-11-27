import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTransfers } from '../api/client';
import { demo } from '../demo';
import {
  displayDate,
  leagueName,
  logoUrl,
  photoUrl,
  teamLeague,
  teamDisplayName,
  typeLabel
} from '../utils';
import { OTHER_LEAGUE_CODE, SERVER_LEAGUE_CODES } from '../constants';
import LeagueTeamFilters from '../components/LeagueTeamFilters';
import Pagination from '../components/Pagination';
import SavedSearches from '../components/SavedSearches';
import LoadingPlaceholder from '../components/LoadingPlaceholder';
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
    teamId: params.get('teamId') || ''
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

  // URL을 필터 상태의 기준(source of truth)으로 사용한다.
  // 브라우저 뒤로가기/앞으로가기로 URL이 바뀌면 화면 상태도 같이 복원된다.
  useEffect(() => {
    const params = new URLSearchParams(paramsKey);
    const next = readFilterParams(params);

    setSearch(current => current === next.keyWord ? current : next.keyWord);
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
          data = await getTransfers({
            ...state,
            // 확장 수집 리그·기타는 팀의 리그 정보로 현재 페이지에서 거른다.
            // 서버가 직접 지원하는 LeagueCode만 API 필터로 전달한다.
            leagueCode: SERVER_LEAGUE_CODES.has(state.leagueCode) ? state.leagueCode : ''
          }, controller.signal);
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

  // 한 선수의 여러 이적도 별개의 사건으로 모두 보여 준다. 카드 하나가 이적 한 건이다.
  const clientFilteredTransfers = useMemo(() => {
    if (!state.leagueCode || SERVER_LEAGUE_CODES.has(state.leagueCode)) return transfers;
    const leagueForTeam = name => teamLeague(teams.find(team => team.teamName === name || teamDisplayName(team) === name));
    return transfers.filter(item => {
      const leagues = [leagueForTeam(item.inTeamName), leagueForTeam(item.outTeamName)];
      return state.leagueCode === OTHER_LEAGUE_CODE
        ? leagues.some(code => code === OTHER_LEAGUE_CODE)
        : leagues.includes(state.leagueCode);
    });
  }, [state.leagueCode, teams, transfers]);

  const transferCards = useMemo(() => [...clientFilteredTransfers]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [clientFilteredTransfers]);

  const latest = useMemo(() => {
    const dates = clientFilteredTransfers
      .map(item => item.date)
      .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || ''));

    return dates.length ? displayDate([...dates].sort().at(-1)) : '—';
  }, [clientFilteredTransfers]);

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
    || (state.keyWord
      ? '검색 조건에 맞는 이적 기록이 없습니다.'
      : '아직 등록된 이적 기록이 없습니다.');

  return (
    <section className="view transfer-market-view">
      <div className="transfer-market-head">
        <div>
          <p className="eyebrow">TRANSFER MARKET</p>
          <h2>공식 이적 기록</h2>
          <p>
            구단과 선수의 이동이 확인된 기록입니다.
            <span> 페이지 최근 기록 {latest}</span>
          </p>
        </div>

        <div className="transfer-market-count">
          <strong>{transferCards.length.toLocaleString()}</strong>
          <span>현재 페이지 이적</span>
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

      <SavedSearches
        scope="transfers"
        label={state.keyWord || selectedTeam ? `${state.keyWord || teamDisplayName(selectedTeam) || '전체'} 이적` : '전체 이적'}
        path={`/transfers${paramsKey ? `?${paramsKey}` : ''}`}
      />

      <LeagueTeamFilters
        prefix="transfers"
        leagueCode={state.leagueCode}
        teamId={state.teamId}
        teams={teams}
        onLeagueChange={changeLeague}
        onTeamChange={changeTeam}
      />

      {state.loading ? (
        <LoadingPlaceholder label="이적 기록을 불러오는 중입니다." />
      ) : transferCards.length ? (
        <div className="transfer-story-feed" aria-live="polite">
          {transferCards.map((item, index) => {
              const picture = photoUrl(item.photoUrl);
              const fromLogo = teamLogo(item.outTeamName);
              const toLogo = teamLogo(item.inTeamName);
              const status = transferStatus(item);
              const fromTeam = findTeam(item.outTeamName);
              const toTeam = findTeam(item.inTeamName);

              return (
                <article
                  className="transfer-story-card"
                  key={`${item.playerId ?? item.playerName}-${item.date}-${item.inTeamId ?? item.inTeamName}-${index}`}
                >
                  <div className="transfer-story-meta">
                    <span className={`transfer-market-status ${status.tone}`}>{status.label}</span>
                    <time>{displayDate(item.date)}</time>
                  </div>

                  <button
                    className="transfer-story-player"
                    type="button"
                    onClick={() => item.playerId && onPlayerOpen(Number(item.playerId), item)}
                  >
                    <span className="transfer-story-avatar">
                      {(item.playerName || '?').slice(0, 1)}
                      {picture && (
                        <img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      )}
                    </span>

                    <span className="transfer-story-player-copy">
                      <strong>{item.playerName}</strong>
                      <small>공식 이적 기록</small>
                    </span>
                  </button>

                  <div className="transfer-story-route" aria-label={`${transferName(item.outTeamName, item.outTeamNameKo)}에서 ${transferName(item.inTeamName, item.inTeamNameKo)}으로 이적`}>
                    {fromTeam ? (
                      <Link className="transfer-story-club" to={`/teams/${fromTeam.teamId}`}>
                        <span className="transfer-story-club-logo">
                        {(item.outTeamName || '?').slice(0, 1)}
                        {fromLogo && <img src={fromLogo} alt="" referrerPolicy="no-referrer" />}
                        </span>
                        <span><small>이전 팀</small><strong>{transferName(item.outTeamName, item.outTeamNameKo)}</strong></span>
                      </Link>
                    ) : (
                      <span className="transfer-story-club">
                        <span className="transfer-story-club-logo">{(item.outTeamName || '?').slice(0, 1)}</span>
                        <span><small>이전 팀</small><strong>{transferName(item.outTeamName, item.outTeamNameKo)}</strong></span>
                      </span>
                    )}
                    <span className="transfer-story-arrow" aria-hidden="true">→</span>
                    {toTeam ? (
                      <Link className="transfer-story-club" to={`/teams/${toTeam.teamId}`}>
                        <span className="transfer-story-club-logo">
                        {(item.inTeamName || '?').slice(0, 1)}
                        {toLogo && <img src={toLogo} alt="" referrerPolicy="no-referrer" />}
                        </span>
                        <span><small>새 팀</small><strong>{transferName(item.inTeamName, item.inTeamNameKo)}</strong></span>
                      </Link>
                    ) : (
                      <span className="transfer-story-club">
                        <span className="transfer-story-club-logo">{(item.inTeamName || '?').slice(0, 1)}</span>
                        <span><small>새 팀</small><strong>{transferName(item.inTeamName, item.inTeamNameKo)}</strong></span>
                      </span>
                    )}
                  </div>

                  <div className="transfer-story-actions">
                    <span>{status.label} · {displayDate(item.date)}</span>
                    <button type="button" onClick={() => item.playerId && onPlayerOpen(Number(item.playerId), item)}>
                      이적 상세 보기 →
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      ) : (
        <div className={`empty ${state.error ? 'error' : ''}`}>{emptyText}</div>
      )}

      <p className="showing transfer-market-showing">
        {state.page + 1} 페이지 · 이적 {transferCards.length}건 ·
        {' '}{state.leagueCode ? leagueName(state.leagueCode) : '전체 리그'}
        {selectedTeam ? ` · ${teamDisplayName(selectedTeam)}` : ''}
        {state.keyWord ? ` · 검색어 “${state.keyWord}”` : ''}
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
