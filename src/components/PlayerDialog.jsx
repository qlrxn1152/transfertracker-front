import { useEffect, useMemo, useRef, useState } from 'react';
import { getPlayer, getPlayerTransfers } from '../api/client';
import { demo } from '../demo';
import { displayDate, logoUrl, photoUrl, teamDisplayName, typeLabel } from '../utils';
import './PlayerDialog.css';

function feeText(move) {
  const raw = move?.fee ?? move?.transferFee;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '비공개';
}

export default function PlayerDialog({ playerId, sample, teams, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: true, error: '', player: null, moves: [] });

  const resolveTeam = name => {
    const matches = teams.filter(team => team.teamName === name);
    return matches.length === 1 ? matches[0] : null;
  };

  const teamName = transfer => {
    const resolve = (name, ko) => {
      if (ko) return ko;
      const team = resolveTeam(name);
      return team ? teamDisplayName(team) : name;
    };

    return {
      out: resolve(transfer.outTeamName, transfer.outTeamNameKo),
      in: resolve(transfer.inTeamName, transfer.inTeamNameKo)
    };
  };

  const teamLogo = name => {
    const team = resolveTeam(name);
    return team ? logoUrl(team.logoUrl) : null;
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

  const latest = state.moves[0] ?? null;
  const picture = state.player ? photoUrl(state.player.photoUrl) : null;

  const currentTeam = useMemo(() => {
    if (latest?.inTeamName) {
      return {
        name: teamName(latest).in,
        logo: teamLogo(latest.inTeamName)
      };
    }

    const name = state.player?.teamName;
    const team = name ? resolveTeam(name) : null;

    return name
      ? {
          name: state.player.teamNameKo || (team ? teamDisplayName(team) : name),
          logo: team ? logoUrl(team.logoUrl) : null
        }
      : null;
  }, [latest, state.player, teams]);

  if (!playerId) return null;

  return (
    <dialog
      ref={ref}
      className="player-detail-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      <form method="dialog" className="player-detail-close-wrap">
        <button className="player-detail-close" aria-label="닫기">×</button>
      </form>

      {state.loading && <div className="empty player-detail-state">선수 정보를 불러오는 중...</div>}
      {state.error && <div className="empty error player-detail-state">{state.error}</div>}

      {state.player && (
        <div className="player-detail">
          <section className="player-detail-hero">
            <div className="player-detail-hero-bg" aria-hidden="true" />

            <div className="player-detail-photo">
              <span>{(state.player.playerName || '?').slice(0, 1)}</span>
              {picture && (
                <img
                  src={picture}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="player-detail-profile">
              <p>PLAYER PROFILE · #{state.player.playerId}</p>
              <h2>{state.player.playerName}</h2>

              <div className="player-detail-meta">
                {currentTeam && (
                  <span className="player-detail-current-team">
                    {currentTeam.logo && <img src={currentTeam.logo} alt="" referrerPolicy="no-referrer" />}
                    {currentTeam.name}
                  </span>
                )}
                <span>이적 기록 {state.moves.length}건</span>
              </div>
            </div>

            {latest && (
              <div className="player-detail-latest">
                <small>최근 이적</small>
                <strong>{displayDate(latest.date)}</strong>
                <span>{typeLabel(latest.type)}</span>
              </div>
            )}
          </section>

          {latest && (() => {
            const names = teamName(latest);
            const outLogo = teamLogo(latest.outTeamName);
            const inLogo = teamLogo(latest.inTeamName);

            return (
              <section className="player-detail-highlight">
                <div className="player-detail-highlight-head">
                  <div>
                    <p className="eyebrow">LATEST MOVE</p>
                    <h3>최근 이적</h3>
                  </div>
                  <span>{displayDate(latest.date)}</span>
                </div>

                <div className="player-detail-route">
                  <div className="player-detail-club">
                    <span className="player-detail-club-logo">
                      {(latest.outTeamName || '?').slice(0, 1)}
                      {outLogo && <img src={outLogo} alt="" referrerPolicy="no-referrer" />}
                    </span>
                    <small>FROM</small>
                    <strong>{names.out}</strong>
                  </div>

                  <div className="player-detail-route-arrow" aria-hidden="true">→</div>

                  <div className="player-detail-club">
                    <span className="player-detail-club-logo">
                      {(latest.inTeamName || '?').slice(0, 1)}
                      {inLogo && <img src={inLogo} alt="" referrerPolicy="no-referrer" />}
                    </span>
                    <small>TO</small>
                    <strong>{names.in}</strong>
                  </div>
                </div>

                <div className="player-detail-summary">
                  <div>
                    <span>이적 유형</span>
                    <strong>{typeLabel(latest.type)}</strong>
                  </div>
                  <div>
                    <span>이적료</span>
                    <strong>{feeText(latest)}</strong>
                  </div>
                  <div>
                    <span>날짜</span>
                    <strong>{displayDate(latest.date)}</strong>
                  </div>
                </div>
              </section>
            );
          })()}

          <section className="player-detail-history">
            <div className="player-detail-section-head">
              <div>
                <p className="eyebrow">TRANSFER HISTORY</p>
                <h3>이적 기록</h3>
              </div>
              <span>최신순</span>
            </div>

            {state.moves.length ? (
              <div className="player-detail-history-list">
                {state.moves.map((move, index) => {
                  const names = teamName(move);
                  const outLogo = teamLogo(move.outTeamName);
                  const inLogo = teamLogo(move.inTeamName);

                  return (
                    <article className="player-detail-history-row" key={`${move.date}-${index}`}>
                      <time>{displayDate(move.date)}</time>

                      <div className="player-detail-history-club">
                        <span>
                          {(move.outTeamName || '?').slice(0, 1)}
                          {outLogo && <img src={outLogo} alt="" referrerPolicy="no-referrer" />}
                        </span>
                        <strong>{names.out}</strong>
                      </div>

                      <span className="player-detail-history-arrow">→</span>

                      <div className="player-detail-history-club">
                        <span>
                          {(move.inTeamName || '?').slice(0, 1)}
                          {inLogo && <img src={inLogo} alt="" referrerPolicy="no-referrer" />}
                        </span>
                        <strong>{names.in}</strong>
                      </div>

                      <span className="player-detail-history-type">{typeLabel(move.type)}</span>
                      <strong className="player-detail-history-fee">{feeText(move)}</strong>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty player-detail-empty">아직 이적 이력이 없습니다.</div>
            )}
          </section>
        </div>
      )}
    </dialog>
  );
}
