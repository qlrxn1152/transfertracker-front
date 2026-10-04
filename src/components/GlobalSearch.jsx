import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayers } from '../api/client';
import { demo } from '../demo';
import { logoUrl, photoUrl, teamDisplayName, text } from '../utils';
import './GlobalSearch.css';

export default function GlobalSearch({ sample, teams, onPlayerOpen }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const teamResults = useMemo(() => {
    const q = text(query.trim());
    if (!q) return [];
    return teams
      .filter(team => text(team.teamName).includes(q) || text(team.teamNameKo).includes(q))
      .slice(0, 5);
  }, [query, teams]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (sample) {
          setPlayers(
            demo.players
              .filter(player => text(player.playerName).includes(text(q)))
              .slice(0, 5)
          );
        } else {
          const result = await getPlayers(
            { page: 0, keyWord: q, leagueCode: '', teamId: '' },
            controller.signal
          );
          setPlayers(Array.isArray(result.players) ? result.players.slice(0, 5) : []);
        }
      } catch (error) {
        if (error.name !== 'AbortError') setPlayers([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, sample]);

  useEffect(() => {
    const close = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function selectTeam(teamId) {
    setOpen(false);
    setQuery('');
    navigate(`/teams/${teamId}`);
  }

  function selectPlayer(playerId) {
    setOpen(false);
    setQuery('');
    onPlayerOpen(Number(playerId));
  }

  return (
    <div className="global-search" ref={rootRef}>
      <label className="global-search-box">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="선수 또는 팀 검색"
          aria-label="선수 또는 팀 전체 검색"
        />
        {loading && <i aria-hidden="true" />}
      </label>

      {open && query.trim() && (
        <div className="global-search-panel">
          {!!teamResults.length && (
            <section>
              <h3>팀</h3>
              {teamResults.map(team => (
                <button type="button" key={team.teamId} onClick={() => selectTeam(team.teamId)}>
                  <span className="global-search-icon">
                    {teamDisplayName(team).slice(0, 1)}
                    {logoUrl(team.logoUrl) && (
                      <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />
                    )}
                  </span>
                  <span>
                    <strong>{teamDisplayName(team)}</strong>
                    <small>팀 상세 보기</small>
                  </span>
                  <em>→</em>
                </button>
              ))}
            </section>
          )}

          {!!players.length && (
            <section>
              <h3>선수</h3>
              {players.map(player => (
                <button type="button" key={player.playerId} onClick={() => selectPlayer(player.playerId)}>
                  <span className="global-search-icon player">
                    {(player.playerName || '?').slice(0, 1)}
                    {photoUrl(player.photoUrl) && (
                      <img src={player.photoUrl} alt="" referrerPolicy="no-referrer" />
                    )}
                  </span>
                  <span>
                    <strong>{player.playerName}</strong>
                    <small>{player.teamNameKo ?? player.teamName ?? '소속팀 정보 없음'}</small>
                  </span>
                  <em>→</em>
                </button>
              ))}
            </section>
          )}

          {!loading && !teamResults.length && !players.length && (
            <div className="global-search-empty">“{query.trim()}” 검색 결과가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
