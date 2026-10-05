import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPostsBySource, getTransfers } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES } from '../constants';
import {
  displayDate,
  formatPostDate,
  logoUrl,
  photoUrl,
  teamDisplayName
} from '../utils';
import './HomePage.css';
import './HomeFeature.css';

export default function HomePage({ sample, teams, refreshKey, onPlayerOpen }) {
  const [state, setState] = useState({
    loading: true,
    transfers: [],
    posts: [],
    error: ''
  });

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
            error: ''
          });
          return;
        }

        const [transferResult, ...postResults] = await Promise.allSettled([
          getTransfers({ page: 0, keyWord: '', leagueCode: '', teamId: '' }, controller.signal),
          ...POST_SOURCES.map(source => getPostsBySource(source.code, controller.signal))
        ]);

        const transfers = transferResult.status === 'fulfilled' && Array.isArray(transferResult.value.transfers)
          ? transferResult.value.transfers
          : [];

        const posts = POST_SOURCES.flatMap((source, index) => {
          const result = postResults[index];
          if (result?.status !== 'fulfilled' || !Array.isArray(result.value.posts)) return [];
          return result.value.posts.map(post => ({ ...post, source: source.code }));
        }).sort((a, b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0));

        setState({
          loading: false,
          transfers,
          posts,
          error: !transfers.length && !posts.length ? '홈 데이터를 불러오지 못했습니다.' : ''
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

  return (
    <section className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-live">TRANSFER DESK</span>
          <h1>축구 이적시장의<br />다음 움직임을 한곳에서.</h1>
          <p>이적 기록, 팀별 이동, 기자 소식과 선수 정보를 하나의 흐름으로 확인하세요.</p>

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

      {state.error && <div className="posts-notice">{state.error}</div>}

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
              const source = POST_SOURCES.find(item => item.code === post.source);
              return (
                <article key={`${post.source}-${post.postId ?? post.externalPostId ?? index}`}>
                  <span className="home-news-avatar">{source?.initials || 'TT'}</span>
                  <div>
                    <div className="home-news-meta">
                      <strong>{source?.name || 'TransferTracker'}</strong>
                      <time>{formatPostDate(post.postCreatedAt)}</time>
                    </div>
                    <p>{post.translatedContent || post.content || ''}</p>
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
