import { useEffect, useRef, useState } from 'react';
import { getPlayer, getPlayerTransfers } from '../api/client';
import { demo } from '../demo';
import { displayDate, typeLabel } from '../utils';

export default function PlayerDialog({ playerId, sample, teams, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: true, error: '', player: null, moves: [] });

  const teamName = transfer => {
    const resolve = (name, ko) => {
      if (ko) return ko;
      const matches = teams.filter(team => team.teamName === name);
      return matches.length === 1 ? (matches[0].teamNameKo ?? matches[0].teamName) : name;
    };

    return {
      out: resolve(transfer.outTeamName, transfer.outTeamNameKo),
      in: resolve(transfer.inTeamName, transfer.inTeamNameKo)
    };
  };

  useEffect(() => {
    if (!playerId) return;

    const controller = new AbortController();
    setState({ loading: true, error: '', player: null, moves: [] });

    async function run() {
      try {
        let player;
        let moves;

        if (sample) {
          player = demo.players.find(item => item.playerId === playerId);
          moves = demo.transfers.filter(item => item.playerId === playerId);
        } else {
          player = await getPlayer(playerId, controller.signal);
          const history = await getPlayerTransfers(playerId, controller.signal);
          if (!Array.isArray(history.playerTransfers)) {
            throw new Error('예상과 다른 이적 이력 응답 형식입니다.');
          }
          moves = history.playerTransfers;
        }

        if (!player) throw new Error('선수를 찾을 수 없습니다.');

        setState({
          loading: false,
          error: '',
          player,
          moves: [...moves].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, error: error.message, player: null, moves: [] });
        }
      }
    }

    run();
    return () => controller.abort();
  }, [playerId, sample]);

  useEffect(() => {
    if (playerId && ref.current && !ref.current.open) ref.current.showModal();
  }, [playerId]);

  if (!playerId) return null;

  return (
    <dialog
      ref={ref}
      className="transfer-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      <form method="dialog">
        <button className="close" aria-label="닫기">×</button>
      </form>

      <div>
        {state.loading && <div className="empty">선수 정보를 불러오는 중...</div>}
        {state.error && <div className="empty error">{state.error}</div>}

        {state.player && (
          <>
            <p className="eyebrow">PLAYER PROFILE / #{state.player.playerId}</p>
            <h3>{state.player.playerName}</h3>
            <p className="dialog-subtitle">이적 이력 {state.moves.length}건 · 최신순</p>

            {state.moves.length ? (
              <div className="transfer-history">
                <ol>
                  {state.moves.map((move, index) => {
                    const names = teamName(move);
                    return (
                      <li key={`${move.date}-${index}`}>
                        <time>{displayDate(move.date)}</time>
                        <span className="history-route">
                          {names.out} <span aria-hidden="true">→</span> {names.in}
                        </span>
                        <span className="history-type">{typeLabel(move.type)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <div className="empty">아직 이적 이력이 없습니다.</div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
