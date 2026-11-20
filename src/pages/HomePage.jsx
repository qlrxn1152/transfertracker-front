import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavoriteTeams, getPostSources, getPostsBySource, getTransfers } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES } from '../constants';
import { clearBookmarks, clearRecentItems, dismiss, hasDismissed, readBookmarks, readRecentItems, removeBookmark } from '../utils/clientStore';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import {
  displayDate,
  formatPostDate,
  logoUrl,
  photoUrl,
  teamDisplayName
} from '../utils';
import './HomePage.css';
import './HomeFeature.css';

function normalizeSources(values) {
  return values.map(item => {
    const code = item.source || item.code;
    const fallback = POST_SOURCES.find(source => source.code === code);
    return {
      code,
      name: item.displayName || fallback?.name || item.xUsername || String(code || '').replaceAll('_', ' '),
      handle: item.xUsername || fallback?.handle || '',
      initials: fallback?.initials || String(code || 'TT').split('_').map(value => value[0]).join('').slice(0, 2)
    };
  }).filter(source => source.code);
}

const RECENT_TEAMS_KEY = 'veyro.recent-teams';

function readRecentTeams() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_TEAMS_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export default function HomePage({ sample, teams, refreshKey, session, onPlayerOpen }) {
  const [state, setState] = useState({
    loading: true,
    transfers: [],
    posts: [],
    sources: POST_SOURCES,
    error: ''
  });
  const [desk, setDesk] = useState({ loading: Boolean(session), favorites: [], posts: [], recent: readRecentTeams() });
  const [bookmarks, setBookmarks] = useState(() => readBookmarks());
  const [recentItems, setRecentItems] = useState(() => readRecentItems());
  const [showStarter, setShowStarter] = useState(() => !hasDismissed('starter-guide'));

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState(current => ({ ...current, loading: true, error: '' }));

      try {
        if (sample) {
          const posts = Object.entries(demo.posts || {})
            .flatMap(([source, values]) => values.map(post => ({ ...post, source })));

          setState({
            loading: false,
            transfers: demo.transfers.slice(0, 6),
            posts: posts.slice(0, 6),
            sources: POST_SOURCES,
            error: ''
          });
          return;
        }

        const [transferResult, sourceResult] = await Promise.allSettled([
          getTransfers({ page: 0, keyWord: '', leagueCode: '', teamId: '' }, controller.signal),
          getPostSources(controller.signal)
        ]);

        const sources = sourceResult.status === 'fulfilled' && Array.isArray(sourceResult.value.sources)
          ? normalizeSources(sourceResult.value.sources)
          : POST_SOURCES;
        const postResults = await Promise.allSettled(
          sources.map(source => getPostsBySource(source.code, controller.signal))
        );

        const transfers = transferResult.status === 'fulfilled' && Array.isArray(transferResult.value.transfers)
          ? transferResult.value.transfers
          : [];

        const posts = sources.flatMap((source, index) => {
          const result = postResults[index];
          if (result?.status !== 'fulfilled' || !Array.isArray(result.value.posts)) return [];
          return result.value.posts.map(post => ({
            ...post,
            source: post.source || post.journalist || source.code,
            postCreatedAt: post.postCreatedAt || post.contentCreatedAt || null
          }));
        }).sort((a, b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0));

        setState({
          loading: false,
          transfers,
          posts,
          sources,
          error: transferResult.status === 'rejected' && sourceResult.status === 'rejected'
            ? '홈 데이터를 불러오지 못했습니다.'
            : ''
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, transfers: [], posts: [], error: error.message });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [sample, refreshKey]);

  useEffect(() => {
    if (!session?.accessToken || sample) {
      setDesk(current => ({ ...current, loading: false, favorites: [], posts: [], recent: readRecentTeams() }));
      return undefined;
    }

    const controller = new AbortController();
    setDesk(current => ({ ...current, loading: true, recent: readRecentTeams() }));

    getFavoriteTeams(session.accessToken, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        setDesk({
          loading: false,
          favorites: Array.isArray(data?.teamDetails) ? data.teamDetails : [],
          posts: Array.isArray(data?.postDetails) ? data.postDetails : [],
          recent: readRecentTeams()
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDesk(current => ({ ...current, loading: false, recent: readRecentTeams() }));
        }
      });

    return () => controller.abort();
  }, [sample, session?.accessToken]);

  useEffect(() => {
    const refresh = () => {
      setBookmarks(readBookmarks());
      setRecentItems(readRecentItems());
    };
    window.addEventListener('veyro-client-store', refresh);
    return () => window.removeEventListener('veyro-client-store', refresh);
  }, []);

  const transferGroups = useMemo(() => {
    const seen = new Set();
    return state.transfers
      .filter(item => {
        const key = item.playerId ?? item.playerName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [state.transfers]);

  const findTeam = name => {
    const matches = teams.filter(team => team.teamName === name);
    return matches.length === 1 ? matches[0] : null;
  };

  const teamName = (name, ko) => {
    if (ko) return ko;
    const team = findTeam(name);
    return team ? teamDisplayName(team) : name;
  };

  const top = transferGroups[0];
  const topFrom = top ? findTeam(top.outTeamName) : null;
  const topTo = top ? findTeam(top.inTeamName) : null;
  const briefing = useMemo(() => {
    const newestTransfer = state.transfers
      .map(item => item.date)
      .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || ''))
      .sort()
      .at(-1);
    const newestPosts = state.posts
      .map(item => item.postCreatedAt)
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)));
    const recentMoves = newestTransfer
      ? state.transfers.filter(item => item.date === newestTransfer).length
      : 0;
    const linkedTeams = new Set(state.transfers.flatMap(item => [item.inTeamName, item.outTeamName]).filter(Boolean));
    return { newestTransfer, newestPost: newestPosts[0], recentMoves, linkedTeams: linkedTeams.size, posts: state.posts.length };
  }, [state.posts, state.transfers]);

  return (
    <section className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-live">VEYRO · TRANSFER DESK</span>
          <h1>축구 이적의 흐름을<br />가장 먼저, 더 깊게.</h1>
          <p>이적 기록과 신뢰할 수 있는 기자 소식을 한곳에서 읽는 축구 인텔리전스.</p>

          <div className="home-hero-actions">
            <Link className="home-primary-link" to="/transfers">이적 현황 보기 →</Link>
            <Link className="home-secondary-link" to="/posts">기자 소식 보기</Link>
          </div>
        </div>

        <div className="home-hero-feature home-feature-shell">
          {top ? (
            <button
              className="home-feature-card"
              type="button"
              onClick={() => top.playerId && onPlayerOpen(Number(top.playerId))}
            >
              <div className="home-feature-top">
                <span>Latest transfer</span>
                <time>{displayDate(top.date)}</time>
              </div>

              <div className="home-feature-profile">
                <span className="home-feature-portrait">
                  {(top.playerName || '?').slice(0, 1)}
                  {photoUrl(top.photoUrl) && (
                    <img src={top.photoUrl} alt="" referrerPolicy="no-referrer" />
                  )}
                </span>

                <div>
                  <small>PLAYER #{top.playerId ?? '—'}</small>
                  <h2>{top.playerName}</h2>
                  <p>최근 등록된 선수 이동</p>
                </div>
              </div>

              <div className="home-feature-club-route">
                <span className="home-feature-club">
                  <i>
                    {(top.outTeamName || '?').slice(0, 1)}
                    {topFrom && logoUrl(topFrom.logoUrl) && (
                      <img src={topFrom.logoUrl} alt="" referrerPolicy="no-referrer" />
                    )}
                  </i>
                  <small>FROM</small>
                  <strong>{teamName(top.outTeamName, top.outTeamNameKo)}</strong>
                </span>

                <b aria-hidden="true">→</b>

                <span className="home-feature-club">
                  <i>
                    {(top.inTeamName || '?').slice(0, 1)}
                    {topTo && logoUrl(topTo.logoUrl) && (
                      <img src={topTo.logoUrl} alt="" referrerPolicy="no-referrer" />
                    )}
                  </i>
                  <small>TO</small>
                  <strong>{teamName(top.inTeamName, top.inTeamNameKo)}</strong>
                </span>
              </div>

              <div className="home-feature-bottom">
                <span>이적 기록 보기</span>
                <strong>↗</strong>
              </div>
            </button>
          ) : (
            <div className="home-feature-empty">최신 이적 데이터를 불러오는 중입니다.</div>
          )}
        </div>
      </section>

      <section className="home-briefing" aria-label="현재 이적 브리핑">
        <div className="home-briefing-copy"><p className="eyebrow">TRANSFER BRIEFING</p><h2>지금 확인할 이적 흐름</h2><p>현재 불러온 최신 기록을 기준으로 빠르게 훑어보세요.</p></div>
        <div className="home-briefing-stats">
          <Link to="/transfers"><strong>{briefing.recentMoves}</strong><span>최근 날짜 이적</span><small>{briefing.newestTransfer ? displayDate(briefing.newestTransfer) : '기록 확인 중'}</small></Link>
          <Link to="/posts"><strong>{briefing.posts}</strong><span>최신 기자 소식</span><small>{briefing.newestPost ? formatPostDate(briefing.newestPost) : '소식 확인 중'}</small></Link>
          <Link to="/teams"><strong>{briefing.linkedTeams}</strong><span>이적 관련 클럽</span><small>현재 목록 기준</small></Link>
        </div>
      </section>

      {showStarter && (
        <section className="home-starter" aria-label="VEYRO 시작 안내">
          <div>
            <p className="eyebrow">START HERE</p>
            <h2>처음이신가요? 1분이면 준비돼요.</h2>
            <p>관심 있는 팀과 기자를 먼저 등록하면 필요한 소식만 빠르게 확인할 수 있습니다.</p>
          </div>
          <ol>
            <li><span>01</span><Link to="/teams">팀을 찾아 상세 보기</Link></li>
            <li><span>02</span>{session ? <Link to="/account">관심 팀 추가하기</Link> : <Link to="/signup">무료 계정 만들기</Link>}</li>
            <li><span>03</span><Link to="/posts">기자 팔로우와 알림 준비</Link></li>
          </ol>
          <button type="button" onClick={() => { dismiss('starter-guide'); setShowStarter(false); }}>안내 닫기</button>
        </section>
      )}

      <PwaInstallPrompt />

      {state.error && <div className="posts-notice">{state.error}</div>}

      {session && (
        <section className="home-desk" aria-label="내 이적 데스크">
          <div className="home-desk-head">
            <div>
              <p className="eyebrow">MY TRANSFER DESK</p>
              <h2>{session.loginId}님, 오늘 확인할 소식</h2>
              <p>관심 팀과 최근 본 클럽의 업데이트를 빠르게 이어서 확인하세요.</p>
            </div>
            <Link to="/account">내 데스크 열기 →</Link>
          </div>

          <div className="home-desk-grid">
            <div className="home-desk-block">
              <div className="home-desk-block-head"><strong>관심 팀</strong><span>{desk.favorites.length}</span></div>
              {desk.loading ? (
                <p className="home-desk-muted">내 팀을 불러오는 중입니다.</p>
              ) : desk.favorites.length ? (
                <div className="home-desk-teams">
                  {desk.favorites.slice(0, 4).map(team => (
                    <Link to={`/teams/${team.teamId}`} key={team.teamId}>
                      <span>
                        {(team.teamName || '?').slice(0, 1)}
                        {logoUrl(team.logoUrl) && <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />}
                      </span>
                      <strong>{team.teamName}</strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="home-desk-muted">관심 팀을 추가하면 관련 소식이 이곳에 모입니다. <Link to="/teams">팀 찾기 →</Link></p>
              )}
            </div>

            <div className="home-desk-block">
              <div className="home-desk-block-head"><strong>새 팀 소식</strong><span>{desk.posts.length}</span></div>
              {desk.posts.length ? (
                <div className="home-desk-posts">
                  {desk.posts.slice(0, 3).map(post => (
                    <Link to={`/posts?teamId=${post.teamId}`} key={`${post.teamId}-${post.postId}`}>
                      <strong>{post.postContent}</strong>
                      <small>{post.teamName || '관련 팀 소식'} · 상세 보기 →</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="home-desk-muted">새 소식이 도착하면 여기에서 바로 이어볼 수 있어요.</p>
              )}
            </div>

            <div className="home-desk-block">
              <div className="home-desk-block-head"><strong>최근 본 팀</strong><span>{desk.recent.length}</span></div>
              {desk.recent.length ? (
                <div className="home-desk-recent">
                  {desk.recent.map(team => <Link to={`/teams/${team.teamId}`} key={team.teamId}>{team.teamName}</Link>)}
                </div>
              ) : (
                <p className="home-desk-muted">팀 상세를 둘러보면 최근 본 팀이 여기에 표시됩니다.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {!!bookmarks.length && (
        <section className="home-saved" aria-label="나중에 보기">
          <div className="home-panel-head">
            <div>
              <p className="eyebrow">READ LATER</p>
              <h2>나중에 보기</h2>
            </div>
            <span>{bookmarks.length}개 저장됨</span>
            <button className="home-saved-clear" type="button" onClick={() => clearBookmarks()}>모두 비우기</button>
          </div>
          <div className="home-saved-list">
            {bookmarks.slice(0, 4).map(item => (
              <article key={item.key}>
                <Link to={item.path || '/posts'}>
                  <small>{item.type === 'post' ? '기자 소식' : '저장한 콘텐츠'}</small>
                  <strong>{item.title}</strong>
                  <span>다시 보기 →</span>
                </Link>
                <button type="button" onClick={() => removeBookmark(item.key)}>삭제</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {!!recentItems.length && (
        <section className="home-recent-items" aria-label="최근 본 콘텐츠">
          <div className="home-panel-head"><div><p className="eyebrow">CONTINUE EXPLORING</p><h2>최근 본 콘텐츠</h2></div><span>{recentItems.length}개</span><button className="home-saved-clear" type="button" onClick={() => clearRecentItems()}>비우기</button></div>
          <div>{recentItems.slice(0, 6).map(item => <Link to={item.path || '/'} key={item.key}><small>{item.type === 'team' ? '팀' : item.type === 'player' ? '선수' : '콘텐츠'}</small><strong>{item.title}</strong><span>이어 보기 →</span></Link>)}</div>
        </section>
      )}

      <div className="home-grid">
        <section className="home-panel">
          <div className="home-panel-head">
            <div>
              <p className="eyebrow">LATEST TRANSFERS</p>
              <h2>최신 이적</h2>
            </div>
            <Link to="/transfers">전체 보기 →</Link>
          </div>

          <div className="home-transfer-list">
            {transferGroups.length ? transferGroups.map(item => {
              const from = findTeam(item.outTeamName);
              const to = findTeam(item.inTeamName);

              return (
                <button
                  type="button"
                  key={`${item.playerId}-${item.date}-${item.inTeamName}`}
                  onClick={() => item.playerId && onPlayerOpen(Number(item.playerId))}
                >
                  <div className="home-transfer-player">
                    <span>{(item.playerName || '?').slice(0,1)}</span>
                    {photoUrl(item.photoUrl) && <img src={item.photoUrl} alt="" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="home-transfer-name">
                    <strong>{item.playerName}</strong>
                    <small>{displayDate(item.date)}</small>
                  </div>
                  <div className="home-transfer-club">
                    {from && logoUrl(from.logoUrl) && <img src={from.logoUrl} alt="" referrerPolicy="no-referrer" />}
                    <span>{teamName(item.outTeamName, item.outTeamNameKo)}</span>
                  </div>
                  <span className="home-transfer-arrow">→</span>
                  <div className="home-transfer-club">
                    {to && logoUrl(to.logoUrl) && <img src={to.logoUrl} alt="" referrerPolicy="no-referrer" />}
                    <span>{teamName(item.inTeamName, item.inTeamNameKo)}</span>
                  </div>
                </button>
              );
            }) : (
              <div className="home-empty">{state.loading ? '불러오는 중...' : '이적 데이터가 없습니다.'}</div>
            )}
          </div>
        </section>

        <section className="home-panel home-news-panel">
          <div className="home-panel-head">
            <div>
              <p className="eyebrow">TRANSFER JOURNAL</p>
              <h2>최신 기자 소식</h2>
            </div>
            <Link to="/posts">전체 보기 →</Link>
          </div>

          <div className="home-news-list">
            {state.posts.slice(0,5).map((post, index) => {
              const source = state.sources.find(item => item.code === post.source);
              return (
                <article key={`${post.source}-${post.postId ?? post.externalPostId ?? index}`}>
                  <span className="home-news-avatar">{source?.initials || 'TT'}</span>
                  <div>
                    <div className="home-news-meta">
                      <strong>{source?.name || 'TransferTracker'}</strong>
                      <time>{formatPostDate(post.postCreatedAt)}</time>
                    </div>
                    <p>{post.content || ''}</p>
                  </div>
                </article>
              );
            })}
            {!state.posts.length && (
              <div className="home-empty">{state.loading ? '불러오는 중...' : '기자 소식이 없습니다.'}</div>
            )}
          </div>
        </section>
      </div>

      <section className="home-clubs">
        <div className="home-panel-head">
          <div>
            <p className="eyebrow">CLUB DIRECTORY</p>
            <h2>클럽 바로가기</h2>
          </div>
          <Link to="/teams">전체 팀 보기 →</Link>
        </div>
        <div className="home-club-list">
          {teams.slice(0,8).map(team => (
            <Link to={`/teams/${team.teamId}`} key={team.teamId}>
              <span>
                {teamDisplayName(team).slice(0,1)}
                {logoUrl(team.logoUrl) && <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />}
              </span>
              <strong>{teamDisplayName(team)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
