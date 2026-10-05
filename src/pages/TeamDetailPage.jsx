import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTeamDetail, getTransfers } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES, SUPPORTED_POST_LEAGUES } from '../constants';
import {
  displayDate,
  formatPostDate,
  leagueName,
  logoUrl,
  photoUrl,
  postTransferFlag,
  teamDisplayName,
  teamLeague,
  typeLabel
} from '../utils';
import './TeamDetailPage.css';
import './TeamTransfers.css';

const POSITION_ORDER = ['GK', 'DF', 'MF', 'FW'];

function getPostSource(post) {
  return POST_SOURCES.find(source => source.code === post.source);
}

function getPostText(post) {
  return post.translatedContent?.trim()
    || post.content?.trim()
    || '내용이 없습니다.';
}

function postOriginalUrl(post, sample) {
  const source = getPostSource(post);
  const externalId = String(post.externalPostId || '');

  if (sample || !source || !/^\d{1,30}$/.test(externalId)) return null;
  return `https://x.com/${source.handle}/status/${externalId}`;
}

function positionOf(player) {
  const raw = String(
    player.position
    ?? player.positionCode
    ?? player.playerPosition
    ?? ''
  ).toUpperCase();

  if (raw.includes('GOAL') || raw === 'G') return 'GK';
  if (raw.includes('DEF') || raw === 'D') return 'DF';
  if (raw.includes('MID') || raw === 'M') return 'MF';
  if (raw.includes('ATT') || raw.includes('FOR') || raw === 'F') return 'FW';
  return '';
}

function transferFee(move) {
  const raw = move?.fee ?? move?.transferFee;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '비공개';
}

function resolveTeamName(name, ko, teams) {
  if (ko) return ko;
  const found = teams.find(team => team.teamName === name);
  return found ? teamDisplayName(found) : (name || '—');
}

function FeaturedPost({ post, sample, index }) {
  const source = getPostSource(post);
  const original = postOriginalUrl(post, sample);
  const translated = Boolean(post.translatedContent?.trim());

  return (
    <article className={`team-news-feature ${index === 1 ? 'secondary' : ''}`}>
      <div className="team-news-feature-bg" aria-hidden="true">
        <span>{source?.initials || 'TT'}</span>
      </div>

      <div className="team-news-feature-overlay">
        <div className="team-news-feature-meta">
          <span className="team-news-chip">
            {postTransferFlag(post) === false ? '일반 소식' : '이적 소식'}
          </span>
          <time>{formatPostDate(post.postCreatedAt)}</time>
        </div>

        <div className="team-news-feature-copy">
          <div className="team-news-author">
            <span>{source?.name || 'TransferTracker'}</span>
            {source?.handle && <small>@{source.handle}</small>}
          </div>

          <h3>{getPostText(post)}</h3>

          <div className="team-news-feature-foot">
            {translated && <span>한국어 번역</span>}
            {original && (
              <a href={original} target="_blank" rel="noopener noreferrer">
                원문 보기 ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function NewsRow({ post, sample }) {
  const source = getPostSource(post);
  const original = postOriginalUrl(post, sample);

  return (
    <article className="team-news-row">
      <div className="team-news-row-source" aria-hidden="true">
        {source?.initials || 'TT'}
      </div>

      <div className="team-news-row-copy">
        <div className="team-news-row-meta">
          <strong>{source?.name || 'TransferTracker'}</strong>
          <time>{formatPostDate(post.postCreatedAt)}</time>
          {postTransferFlag(post) !== false && <span>이적 소식</span>}
        </div>

        <p>{getPostText(post)}</p>
      </div>

      {original && (
        <a
          className="team-news-row-link"
          href={original}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X 원문 보기"
        >
          ↗
        </a>
      )}
    </article>
  );
}

function TeamTransferRow({ move, direction, teams, currentTeamName, onPlayerOpen }) {
  const otherName = direction === 'in'
    ? resolveTeamName(move.outTeamName, move.outTeamNameKo, teams)
    : resolveTeamName(move.inTeamName, move.inTeamNameKo, teams);

  return (
    <button
      className="team-transfer-row"
      type="button"
      onClick={() => move.playerId && onPlayerOpen(Number(move.playerId))}
    >
      <span className="team-transfer-player">
        {(move.playerName || '?').slice(0, 1)}
        {photoUrl(move.photoUrl) && (
          <img src={move.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
        )}
      </span>

      <span className="team-transfer-copy">
        <strong>{move.playerName}</strong>
        <small>
          {direction === 'in'
            ? `${otherName} → ${currentTeamName}`
            : `${currentTeamName} → ${otherName}`}
        </small>
      </span>

      <span className="team-transfer-meta">
        <strong>{transferFee(move)}</strong>
        <small>{displayDate(move.date)} · {typeLabel(move.type)}</small>
      </span>
    </button>
  );
}

export default function TeamDetailPage({ sample, teams, onSelectTeamPosts, onPlayerOpen }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const id = Number(teamId);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setState({ loading: false, error: '올바르지 않은 클럽 ID입니다.', data: null });
      return;
    }

    const controller = new AbortController();

    async function load() {
      setState({ loading: true, error: '', data: null });

      try {
        let data;
        let transfers = [];

        if (sample) {
          const selected = teams.find(team => Number(team.teamId) === id);
          if (!selected) throw new Error('클럽을 찾을 수 없습니다.');

          data = {
            teams: {
              ...selected,
              teamPlayerCount: (demo.teamPlayers[selected.teamName] || []).length
            },
            players: { teamPlayers: demo.teamPlayers[selected.teamName] || [] },
            posts: { posts: demo.teamPosts[selected.teamName] || [] }
          };

          transfers = demo.transfers.filter(move =>
            move.inTeamName === selected.teamName
            || move.outTeamName === selected.teamName
          );
        } else {
          const [detailResult, transferResult] = await Promise.allSettled([
            getTeamDetail(id, controller.signal),
            getTransfers(
              { page: 0, keyWord: '', leagueCode: '', teamId: id },
              controller.signal
            )
          ]);

          if (detailResult.status !== 'fulfilled') throw detailResult.reason;

          data = detailResult.value;

          if (
            transferResult.status === 'fulfilled'
            && Array.isArray(transferResult.value.transfers)
          ) {
            transfers = transferResult.value.transfers;
          }
        }

        if (!data.teams || !Array.isArray(data.players?.teamPlayers) || !Array.isArray(data.posts?.posts)) {
          throw new Error('예상과 다른 클럽 상세 응답 형식입니다.');
        }

        setState({
          loading: false,
          error: '',
          data: { ...data, transfers }
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, error: error.message, data: null });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [id, sample, teams]);

  const content = useMemo(() => {
    if (!state.data) return null;

    const team = state.data.teams;
    const known = teams.find(item => String(item.teamId) === String(team.teamId));
    const league = known ? teamLeague(known) : teamLeague(team);

    const roster = [...state.data.players.teamPlayers]
      .sort((a, b) => String(a.playerName || '').localeCompare(String(b.playerName || ''), 'ko'));

    const news = [...state.data.posts.posts]
      .sort((a, b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0));

    const transfers = [...(state.data.transfers || [])]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    const inbound = transfers.filter(move =>
      String(move.inTeamId ?? '') === String(team.teamId)
      || move.inTeamName === team.teamName
    );

    const outbound = transfers.filter(move =>
      String(move.outTeamId ?? '') === String(team.teamId)
      || move.outTeamName === team.teamName
    );

    return { team, league, roster, news, transfers, inbound, outbound };
  }, [state.data, teams]);

  if (state.loading) {
    return (
      <section className="view">
        <div className="team-detail-back">
          <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
        </div>
        <div className="empty">클럽 정보를 불러오는 중...</div>
      </section>
    );
  }

  if (state.error || !content) {
    return (
      <section className="view">
        <div className="team-detail-back">
          <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
        </div>
        <div className="empty error">{state.error || '클럽 정보를 표시할 수 없습니다.'}</div>
      </section>
    );
  }

  const { team, league, roster, news, transfers, inbound, outbound } = content;
  const picture = logoUrl(team.logoUrl);
  const count = Number.isSafeInteger(team.teamPlayerCount) && team.teamPlayerCount >= 0
    ? team.teamPlayerCount
    : roster.length;

  const featured = news.slice(0, 2);
  const latest = news.slice(2, 8);

  const groupedPlayers = POSITION_ORDER
    .map(position => ({
      position,
      players: roster.filter(player => positionOf(player) === position)
    }))
    .filter(group => group.players.length);

  const unknownPlayers = roster.filter(player => !positionOf(player));

  return (
    <section className="view team-detail-view">
      <div className="team-detail-back">
        <button type="button" onClick={() => navigate('/teams')}>← 클럽 목록</button>
      </div>

      <header className="team-detail-hero">
        <div className="team-detail-hero-pattern" aria-hidden="true" />

        <div className="team-detail-brand">
          <div className="team-detail-logo">
            {teamDisplayName(team).slice(0, 1)}
            {picture && (
              <img
                src={picture}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div>
            <p className="team-detail-kicker">CLUB PROFILE {sample ? '/ SAMPLE' : ''}</p>
            <h1>{teamDisplayName(team)}</h1>
            <div className="team-detail-meta">
              <span>{league === 'unclassified' ? '리그 미분류' : leagueName(league)}</span>
              <span>클럽 ID #{team.teamId}</span>
              <span>선수 {count.toLocaleString()}명</span>
            </div>
          </div>
        </div>

        <div className="team-detail-hero-stat">
          <strong>{transfers.length.toLocaleString()}</strong>
          <span>최근 관련 이적</span>
        </div>
      </header>

      <section className="team-transfer-section">
        <div className="team-transfer-head">
          <div>
            <p className="eyebrow">RECENT TRANSFERS</p>
            <h2>관련 이적</h2>
            <p>{teamDisplayName(team)}의 최근 영입과 방출을 확인하세요.</p>
          </div>

          <Link to={`/transfers?teamId=${team.teamId}`}>
            전체 이적 보기 →
          </Link>
        </div>

        {transfers.length ? (
          <div className="team-transfer-columns">
            <div className="team-transfer-column inbound">
              <div className="team-transfer-column-head">
                <strong>영입</strong>
                <span>{inbound.length}</span>
              </div>

              <div className="team-transfer-list">
                {inbound.slice(0, 5).map((move, index) => (
                  <TeamTransferRow
                    key={`in-${move.playerId ?? move.playerName}-${move.date}-${index}`}
                    move={move}
                    direction="in"
                    teams={teams}
                    currentTeamName={teamDisplayName(team)}
                    onPlayerOpen={onPlayerOpen}
                  />
                ))}
                {!inbound.length && <p>최근 영입 기록이 없습니다.</p>}
              </div>
            </div>

            <div className="team-transfer-column outbound">
              <div className="team-transfer-column-head">
                <strong>방출</strong>
                <span>{outbound.length}</span>
              </div>

              <div className="team-transfer-list">
                {outbound.slice(0, 5).map((move, index) => (
                  <TeamTransferRow
                    key={`out-${move.playerId ?? move.playerName}-${move.date}-${index}`}
                    move={move}
                    direction="out"
                    teams={teams}
                    currentTeamName={teamDisplayName(team)}
                    onPlayerOpen={onPlayerOpen}
                  />
                ))}
                {!outbound.length && <p>최근 방출 기록이 없습니다.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="team-detail-empty">
            이 클럽에 연결된 최근 이적 기록이 없습니다.
          </div>
        )}
      </section>

      <div className="team-detail-layout">
        <main className="team-detail-main">
          <section className="team-news-section">
            <div className="team-detail-section-head">
              <div>
                <p className="eyebrow">TRANSFER JOURNAL</p>
                <h2>주요 이적 소식</h2>
                <p>{teamDisplayName(team)}에 연결된 최신 기자 소식입니다.</p>
              </div>

              {SUPPORTED_POST_LEAGUES.has(league) && (
                <button
                  className="team-detail-more"
                  type="button"
                  onClick={() => onSelectTeamPosts(String(team.teamId))}
                >
                  전체 소식 보기 ↗
                </button>
              )}
            </div>

            {featured.length ? (
              <div className={`team-news-feature-grid ${featured.length === 1 ? 'single' : ''}`}>
                {featured.map((post, index) => (
                  <FeaturedPost
                    key={post.postId ?? post.externalPostId ?? index}
                    post={post}
                    sample={sample}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="team-detail-empty">
                이 클럽에 연결된 이적 소식이 아직 없습니다.
              </div>
            )}

            {!!latest.length && (
              <>
                <div className="team-news-list-title">
                  <h3>최신 소식</h3>
                  <span>{Math.min(news.length, 8)}건 표시</span>
                </div>

                <div className="team-news-list">
                  {latest.map((post, index) => (
                    <NewsRow
                      key={post.postId ?? post.externalPostId ?? index}
                      post={post}
                      sample={sample}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </main>

        <aside className="team-detail-sidebar">
          <section className="team-roster-panel">
            <div className="team-roster-head">
              <div>
                <p className="eyebrow">THE SQUAD</p>
                <h2>선수 명단</h2>
              </div>
              <strong>{roster.length}</strong>
            </div>

            {roster.length ? (
              <div className="team-roster-content">
                {groupedPlayers.map(group => (
                  <div className="team-roster-group" key={group.position}>
                    <div className="team-roster-group-title">
                      <span>{group.position}</span>
                      <small>{group.players.length}</small>
                    </div>

                    {group.players.map(player => (
                      <button className="team-roster-player" type="button" key={player.playerId} onClick={() => onPlayerOpen(Number(player.playerId))}>
                        <span className="team-roster-avatar">
                          {(player.playerName || '?').slice(0, 1)}
                          {photoUrl(player.photoUrl) && (
                            <img
                              src={player.photoUrl}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </span>

                        <div>
                          <strong>{player.playerName}</strong>
                          <small>PLAYER #{player.playerId}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}

                {!!unknownPlayers.length && (
                  <div className="team-roster-group">
                    <div className="team-roster-group-title">
                      <span>선수</span>
                      <small>{unknownPlayers.length}</small>
                    </div>

                    {unknownPlayers.map(player => (
                      <button className="team-roster-player" type="button" key={player.playerId} onClick={() => onPlayerOpen(Number(player.playerId))}>
                        <span className="team-roster-avatar">
                          {(player.playerName || '?').slice(0, 1)}
                          {photoUrl(player.photoUrl) && (
                            <img
                              src={player.photoUrl}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </span>

                        <div>
                          <strong>{player.playerName}</strong>
                          <small>PLAYER #{player.playerId}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="team-detail-empty compact">
                아직 등록된 소속 선수가 없습니다.
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
