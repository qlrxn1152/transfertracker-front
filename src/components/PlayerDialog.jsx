import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { followPlayer, getFollowedPlayers, getPlayer, getPlayerTransfers, getPostsByPlayer, unfollowPlayer } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES } from '../constants';
import { displayDate, formatPostDate, logoUrl, photoUrl, teamDisplayName, typeLabel } from '../utils';
import ContentActions from './ContentActions';
import JournalistAvatar from './JournalistAvatar';
import { rememberRecent } from '../utils/clientStore';
import './PlayerDialog.css';

function feeText(move) {
  const raw = move?.fee ?? move?.transferFee;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '비공개';
}

export default function PlayerDialog({ playerId, sample, teams, session, onClose, onFavoriteChange }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, error: '', player: null, moves: [], relatedPosts: [] });
  const [favorite, setFavorite] = useState({ loading: false, following: false, busy: false, status: '' });

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
    setState({ loading: true, error: '', player: null, moves: [], relatedPosts: [] });

    async function run() {
      try {
        let player;
        let moves;
        let relatedPosts;

        if (sample) {
          player = demo.players.find(item => item.playerId === playerId);
          moves = demo.transfers.filter(item => item.playerId === playerId);
          relatedPosts = Object.values(demo.posts)
            .flat()
            .filter(item => String(item.playerId) === String(playerId));
        } else {
          const [playerResponse, history, postsResponse] = await Promise.all([
            getPlayer(playerId, controller.signal),
            getPlayerTransfers(playerId, controller.signal),
            getPostsByPlayer(playerId, controller.signal)
          ]);
          player = playerResponse;

          if (!Array.isArray(history.playerTransfers)) {
            throw new Error('예상과 다른 이적 이력 응답 형식입니다.');
          }

          moves = history.playerTransfers;
          relatedPosts = Array.isArray(postsResponse?.posts) ? postsResponse.posts : [];
        }

        if (!player) throw new Error('선수를 찾을 수 없습니다.');

        setState({
          loading: false,
          error: '',
          player,
          moves: [...moves].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
          relatedPosts
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, error: error.message, player: null, moves: [], relatedPosts: [] });
        }
      }
    }

    run();
    return () => controller.abort();
  }, [playerId, sample]);

  useEffect(() => {
    if (!playerId || sample || !session?.accessToken) {
      setFavorite({ loading: false, following: false, busy: false, status: '' });
      return undefined;
    }

    const controller = new AbortController();
    setFavorite({ loading: true, following: false, busy: false, status: '' });

    getFollowedPlayers(session.accessToken, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        const players = Array.isArray(data?.memberFollowPlayers) ? data.memberFollowPlayers : [];
        setFavorite({
          loading: false,
          following: players.some(player => String(player.playerId) === String(playerId)),
          busy: false,
          status: ''
        });
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          setFavorite({ loading: false, following: false, busy: false, status: '관심 선수 상태를 불러오지 못했습니다.' });
        }
      });

    return () => controller.abort();
  }, [playerId, sample, session?.accessToken]);

  useEffect(() => {
    if (!state.player?.playerId) return;
    rememberRecent({
      key: `player:${state.player.playerId}`,
      type: 'player',
      title: state.player.playerName || '선수 상세',
      path: `/players?player=${state.player.playerId}`
    });
  }, [state.player]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (playerId) {
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
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

  const sourceProfile = post => {
    const code = post?.source || post?.journalist || '';
    const matched = POST_SOURCES.find(source => source.code === code);
    return matched || {
      name: String(code || '기자 소식').replaceAll('_', ' '),
      handle: '',
      initials: String(code || 'X').slice(0, 2)
    };
  };

  function requestLoginForFavorite() {
    navigate('/login', {
      state: { returnTo: `${location.pathname}${location.search}` }
    });
  }

  async function toggleFavoritePlayer() {
    const favoritePlayerId = Number(state.player?.playerId ?? playerId);
    if (!Number.isSafeInteger(favoritePlayerId) || favoritePlayerId <= 0 || sample) {
      setFavorite(current => ({
        ...current,
        status: '선수 정보를 다시 불러온 뒤 관심 선수 등록을 시도해 주세요.'
      }));
      return;
    }
    if (!session?.accessToken) {
      requestLoginForFavorite();
      return;
    }

    const nextFollowing = !favorite.following;
    setFavorite(current => ({ ...current, busy: true, status: '' }));

    try {
      if (nextFollowing) {
        await followPlayer(session.accessToken, favoritePlayerId);
      } else {
        await unfollowPlayer(session.accessToken, favoritePlayerId);
      }

      setFavorite(current => ({
        ...current,
        following: nextFollowing,
        busy: false,
        status: nextFollowing ? '관심 선수로 등록했습니다.' : '관심 선수에서 해제했습니다.'
      }));
      onFavoriteChange?.();
    } catch (error) {
      setFavorite(current => ({
        ...current,
        busy: false,
        status: error.message || '관심 선수 설정을 변경하지 못했습니다.'
      }));
    }
  }


  return (
    <dialog
      ref={ref}
      className="player-detail-dialog"
      onClose={() => {
        if (playerId) onClose();
      }}
      onCancel={event => {
        event.preventDefault();
        if (playerId) onClose();
      }}
    >
      <form method="dialog" className="player-detail-close-wrap">
        <button className="player-detail-close" aria-label="닫기">×</button>
      </form>

      {playerId && state.loading && <div className="empty player-detail-state">선수 정보를 불러오는 중...</div>}
      {playerId && state.error && <div className="empty error player-detail-state">{state.error}</div>}

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
              <div className="player-detail-actions">
                <button
                  type="button"
                  className={`player-follow-button ${favorite.following ? 'is-following' : ''}`}
                  onClick={toggleFavoritePlayer}
                  disabled={favorite.busy || favorite.loading}
                >
                  {favorite.busy
                    ? '처리 중...'
                    : favorite.loading
                      ? '확인 중...'
                      : favorite.following
                        ? '★ 관심 선수'
                        : session?.accessToken
                          ? '☆ 관심 선수 등록'
                          : '로그인하고 관심 선수 등록'}
                </button>
                <ContentActions
                  compact
                  card
                  item={{
                    key: `player:${state.player.playerId}`,
                    type: 'player',
                    title: `${state.player.playerName} 선수 정보`,
                    summary: currentTeam?.name ? `${currentTeam.name} 소속 · 이적 기록 ${state.moves.length}건` : '선수 이적 정보',
                    path: `/players?player=${state.player.playerId}`
                  }}
                />
              </div>
              {favorite.status && <p className="player-follow-status" role="status">{favorite.status}</p>}
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

          <section className="player-detail-news">
            <div className="player-detail-section-head">
              <div>
                <p className="eyebrow">PLAYER JOURNAL</p>
                <h3>선수 관련 소식</h3>
              </div>
              <span>{state.relatedPosts.length}건</span>
            </div>

            {state.relatedPosts.length ? (
              <div className="player-detail-news-list">
                {state.relatedPosts.map(post => {
                  const source = sourceProfile(post);
                  return (
                    <button
                      type="button"
                      className="player-detail-news-row"
                      key={post.postId ?? post.externalPostId}
                      onClick={() => post.postId && navigate(`/posts/${post.postId}`)}
                    >
                      <JournalistAvatar source={source} className="player-detail-news-avatar" />
                      <span className="player-detail-news-copy">
                        <span className="player-detail-news-meta">
                          <strong>{source.name}</strong>
                          <time>{formatPostDate(post.postCreatedAt)}</time>
                        </span>
                        <span className="player-detail-news-content">{post.content}</span>
                        {(post.teamName || post.playerName) && (
                          <span className="player-detail-news-related">
                            {post.teamName && <em>팀 · {post.teamName}</em>}
                            {post.playerName && <em>선수 · {post.playerName}</em>}
                          </span>
                        )}
                      </span>
                      <span className="player-detail-news-arrow" aria-hidden="true">→</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty player-detail-empty">등록된 관련 소식이 없습니다.</div>
            )}
          </section>
        </div>
      )}
    </dialog>
  );
}
