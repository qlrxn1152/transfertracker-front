import { useEffect, useMemo, useState } from 'react';
import { getPlayerTransfers } from '../api/client';
import { demo } from '../demo';
import { displayDate, typeLabel } from '../utils';

function latestTransfer(value) {
  const moves = Array.isArray(value) ? value : [];
  return [...moves].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
}

export default function PlayerCompare({ players, sample, onPlayerOpen }) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [history, setHistory] = useState({});
  const selected = useMemo(() => [first, second]
    .filter(Boolean)
    .map(id => players.find(player => String(player.playerId) === id))
    .filter(Boolean), [first, second, players]);

  useEffect(() => {
    if (selected.length !== 2) return undefined;
    const controller = new AbortController();
    Promise.all(selected.map(async player => {
      if (sample) return [player.playerId, demo.transfers.filter(item => String(item.playerId) === String(player.playerId))];
      const response = await getPlayerTransfers(player.playerId, controller.signal);
      return [player.playerId, Array.isArray(response?.playerTransfers) ? response.playerTransfers : []];
    })).then(rows => {
      if (!controller.signal.aborted) setHistory(Object.fromEntries(rows));
    }).catch(() => {
      if (!controller.signal.aborted) setHistory({});
    });
    return () => controller.abort();
  }, [sample, selected]);

  if (players.length < 2) return null;

  return (
    <section className="player-compare" aria-label="선수 빠른 비교">
      <div><p className="eyebrow">PLAYER MATCHUP</p><h2>선수 빠른 비교</h2><p>현재 페이지의 선수 두 명을 골라 최근 이적 이력을 비교하세요.</p></div>
      <div className="player-compare-selects">
        {[first, second].map((value, index) => <select key={index} value={value} onChange={event => index === 0 ? setFirst(event.target.value) : setSecond(event.target.value)}>
          <option value="">{index === 0 ? '첫 번째 선수 선택' : '비교할 선수 선택'}</option>
          {players.filter(player => String(player.playerId) !== (index === 0 ? second : first)).map(player => <option key={player.playerId} value={player.playerId}>{player.playerNameKo || player.playerName}</option>)}
        </select>)}
      </div>
      {selected.length === 2 && <div className="player-compare-result">{selected.map(player => {
        const moves = history[player.playerId] || [];
        const latest = latestTransfer(moves);
        return <article key={player.playerId}>
          <small>PLAYER #{player.playerId}</small><strong>{player.playerNameKo || player.playerName}</strong>
          <span>{player.teamNameKo || player.teamName || '소속팀 정보 없음'}</span>
          <span>이적 기록 {moves.length || '—'}건</span>
          <span>{latest ? `최근 ${displayDate(latest.date)} · ${typeLabel(latest.type)}` : '이적 이력 확인 중'}</span>
          <button type="button" onClick={() => onPlayerOpen(Number(player.playerId))}>상세 보기 →</button>
        </article>;
      })}</div>}
    </section>
  );
}
