import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  followJournalist,
  getFollowedJournalists,
  getPostSources,
  getPosts,
  getPostsBySource,
  getPostsByTeam,
  unfollowJournalist
} from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES } from '../constants';
import Pagination from '../components/Pagination';
import PostCard from '../components/PostCard';
import { logoUrl, postTransferFlag, teamDisplayName, text } from '../utils';
import { trackAnalyticsEvent } from '../firebase/analytics';
import './PostsPage.css';

const EMPTY_PAGE = {
  posts: [],
  totalPostCount: 0,
  totalPageCount: 0,
  hasNext: false,
  hasPrevious: false
};

function sourceInitials(name, code) {
  const initials = String(name || code || '')
    .split(/\s+|_/)
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .slice(0, 2);

  return initials.toUpperCase() || 'X';
}

function normalizeSources(values) {
  return values.map(item => {
    const code = item.source || item.code;
    const fallback = POST_SOURCES.find(source => source.code === code);
    const name = fallback?.name || item.xUsername || String(code || '').replaceAll('_', ' ');

    return {
      code,
      name,
      handle: fallback?.handle || item.xUsername || '',
      initials: fallback?.initials || sourceInitials(name, code)
    };
  }).filter(source => source.code);
}

function normalizePage(response, source) {
  if (!Array.isArray(response?.posts)) {
    throw new Error('예상과 다른 게시물 응답 형식입니다.');
  }

  return {
    posts: response.posts.map(post => ({ ...post, source: post.source || source })),
    totalPostCount: Number(response.totalPostCount) || response.posts.length,
    totalPageCount: Number(response.totalPageCount) || 0,
    hasNext: Boolean(response.hasNext),
    hasPrevious: Boolean(response.hasPrevious)
  };
}

function samplePage(posts, page) {
  const pageSize = 50;
  const start = page * pageSize;

  return {
    posts: posts.slice(start, start + pageSize),
    totalPostCount: posts.length,
    totalPageCount: Math.ceil(posts.length / pageSize),
    hasNext: start + pageSize < posts.length,
    hasPrevious: page > 0
  };
}

export default function PostsPage({ sample, teams, selectedTeamId, onSelectedTeamChange, session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pageData, setPageData] = useState(EMPTY_PAGE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sources, setSources] = useState(() => normalizeSources(POST_SOURCES));
  const [followingCodes, setFollowingCodes] = useState([]);
  const [followBusyCode, setFollowBusyCode] = useState('');
  const [followStatus, setFollowStatus] = useState('');
  const teamMode = selectedTeamId !== 'all';

  useEffect(() => {
    if (sample) {
      setSources(normalizeSources(POST_SOURCES));
      return;
    }

    const controller = new AbortController();

    getPostSources(controller.signal)
      .then(response => {
        const nextSources = Array.isArray(response?.sources) ? normalizeSources(response.sources) : [];
        setSources(nextSources.length ? nextSources : normalizeSources(POST_SOURCES));
      })
      .catch(nextError => {
        if (nextError.name !== 'AbortError') setSources(normalizeSources(POST_SOURCES));
      });

    return () => controller.abort();
  }, [sample]);

  useEffect(() => {
    if (!session?.accessToken || sample) {
      setFollowingCodes([]);
      return undefined;
    }

    const controller = new AbortController();
    getFollowedJournalists(session.accessToken, controller.signal)
      .then(data => setFollowingCodes(
        Array.isArray(data?.memberFollowJournalists)
          ? data.memberFollowJournalists.map(item => item.journalist)
          : []
      ))
      .catch(error => {
        if (error.name !== 'AbortError') setFollowStatus('팔로우 상태를 불러오지 못했습니다.');
      });

    return () => controller.abort();
  }, [sample, session?.accessToken]);

  useEffect(() => {
    setPage(0);
  }, [sample, selectedTeamId, sourceFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');

      try {
        let response;

        if (sample) {
          const selected = teams.find(team => String(team.teamId) === String(selectedTeamId));
          const allSamplePosts = teamMode
            ? demo.teamPosts[selected?.teamName] || []
            : Object.values(demo.posts).flat();
          const filteredSamplePosts = sourceFilter === 'all'
            ? allSamplePosts
            : allSamplePosts.filter(post => post.source === sourceFilter);

          response = samplePage(filteredSamplePosts, page);
        } else if (teamMode) {
          response = normalizePage(await getPostsByTeam(selectedTeamId, controller.signal, page));
        } else if (sourceFilter === 'all') {
          response = normalizePage(await getPosts(controller.signal, page));
        } else {
          response = normalizePage(await getPostsBySource(sourceFilter, controller.signal, page), sourceFilter);
        }

        if (!controller.signal.aborted) setPageData(response);
      } catch (nextError) {
        if (nextError.name !== 'AbortError') {
          setPageData(EMPTY_PAGE);
          setError(nextError.message || '게시물을 불러오지 못했습니다.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [sample, teamMode, selectedTeamId, sourceFilter, page, teams]);

  const filtered = useMemo(() => pageData.posts
    .filter(post => typeFilter === 'all' || postTransferFlag(post) === true)
    .filter(post => text(post.translatedContent).includes(text(query)) || text(post.content).includes(text(query)))
    .sort((a, b) =>
      (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0)
      || String(b.externalPostId || b.postId || '').localeCompare(String(a.externalPostId || a.postId || ''))
    ), [pageData.posts, typeFilter, query]);

  const availableTeams = [...teams]
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b), 'ko'));
  const selectedTeam = teamMode
    ? teams.find(team => String(team.teamId) === String(selectedTeamId))
    : null;
  const currentSource = sources.find(source => source.code === sourceFilter);
  const hasPagination = pageData.hasNext || pageData.hasPrevious || pageData.totalPageCount > 1;

  function changeSource(nextSource) {
    setSourceFilter(nextSource);
    setTypeFilter('all');
  }

  function requestLoginForFollow(source) {
    navigate('/login', {
      state: {
        returnTo: `${location.pathname}${location.search}`,
        followJournalist: source.code,
        journalistName: source.name
      }
    });
  }

  async function toggleFollow(source) {
    if (!session?.accessToken) {
      requestLoginForFollow(source);
      return;
    }

    const followed = followingCodes.includes(source.code);
    setFollowBusyCode(source.code);
    setFollowStatus('');
    try {
      if (followed) {
        await unfollowJournalist(session.accessToken, source.code);
        setFollowingCodes(current => current.filter(code => code !== source.code));
        trackAnalyticsEvent('journalist_unfollowed', { journalist: source.code });
      } else {
        await followJournalist(session.accessToken, source.code);
        setFollowingCodes(current => [...new Set([...current, source.code])]);
        trackAnalyticsEvent('journalist_followed', { journalist: source.code });
      }
    } catch (error) {
      setFollowStatus(error.message || '기자 팔로우 설정을 변경하지 못했습니다.');
    } finally {
      setFollowBusyCode('');
    }
  }

  return (
    <section className="journal-page">
      <header className="journal-head">
        <div>
          <p className="eyebrow">TRANSFER JOURNAL</p>
          <h1>기자 소식</h1>
          <p>기자별 이적 소식을 한국어 번역과 함께 빠르게 훑어보세요.</p>
        </div>
        <strong>{loading ? '—' : pageData.totalPostCount.toLocaleString()}<span>게시물</span></strong>
      </header>

      <div className="journal-filters">
        <div className="journal-source-tabs">
          <button className={sourceFilter === 'all' ? 'active' : ''} type="button" onClick={() => changeSource('all')}>전체</button>
          {sources.map(source => (
            <button
              key={source.code}
              className={sourceFilter === source.code ? 'active' : ''}
              type="button"
              onClick={() => changeSource(source.code)}
            >
              {source.name}
            </button>
          ))}
        </div>

        {!sample && (
          <section className={`journal-follow-panel ${location.state?.followJournalist ? 'is-returned' : ''}`}>
            <div className="journal-follow-copy">
              <p className="eyebrow">REPORTER ALERT</p>
              <h2>기자 팔로우</h2>
              <p>{session
                ? '팔로우한 기자가 새 게시물을 등록하면 이 브라우저로 알림을 보냅니다.'
                : '로그인하면 신뢰하는 기자를 팔로우하고 새 소식 알림을 받을 수 있어요.'}</p>
            </div>
            <div className="journal-follow-list">
              {sources.map(source => {
                const followed = followingCodes.includes(source.code);
                const busy = followBusyCode === source.code;
                return (
                  <article className="journal-follow-source" key={source.code}>
                    <span>{source.initials}</span>
                    <strong>{source.name}</strong>
                    <button
                      type="button"
                      className={followed ? 'following' : ''}
                      onClick={() => toggleFollow(source)}
                      disabled={busy}
                      autoFocus={location.state?.followJournalist === source.code}
                    >
                      {busy ? '처리 중...' : followed ? '팔로우 중' : '팔로우'}
                    </button>
                  </article>
                );
              })}
            </div>
            {followStatus && <p className="journal-follow-status" role="status">{followStatus}</p>}
          </section>
        )}

        <div className="journal-filter-row">
          <label className="journal-team-select">
            <span>팀</span>
            <select value={selectedTeamId} onChange={event => onSelectedTeamChange(event.target.value)}>
              <option value="all">전체 팀</option>
              {availableTeams.map(team => (
                <option value={team.teamId} key={team.teamId}>{teamDisplayName(team)}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={`journal-transfer-only ${typeFilter === 'transfer' ? 'active' : ''}`}
            onClick={() => setTypeFilter(current => current === 'transfer' ? 'all' : 'transfer')}
          >
            이적 관련만
          </button>

          <label className="search journal-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="소식 검색" />
          </label>
        </div>
      </div>

      {selectedTeam && (
        <div className="journal-team-banner">
          <span>
            {teamDisplayName(selectedTeam).slice(0, 1)}
            {logoUrl(selectedTeam.logoUrl) && <img src={selectedTeam.logoUrl} alt="" referrerPolicy="no-referrer" />}
          </span>
          <div>
            <small>CLUB JOURNAL</small>
            <strong>{teamDisplayName(selectedTeam)}</strong>
          </div>
          <em>{pageData.totalPostCount}건</em>
        </div>
      )}

      <div className="journal-feed-head">
        <div>
          <strong>{selectedTeam ? teamDisplayName(selectedTeam) : currentSource?.name || '전체 소식'}</strong>
          <span>{loading ? '불러오는 중' : `${filtered.length}건 표시 · ${page + 1} / ${Math.max(pageData.totalPageCount, 1)} 페이지`}</span>
        </div>
      </div>

      {filtered.length ? (
        <div className="journal-feed" aria-live="polite">
          {filtered.map(post => (
            <PostCard
              key={`${post.source}-${post.postId ?? post.externalPostId}`}
              post={post}
              sourceProfile={sources.find(source => source.code === post.source)}
              sample={sample}
            />
          ))}
        </div>
      ) : (
        <div className={`empty ${error ? 'error' : ''}`}>
          {loading ? '게시물을 불러오는 중...' : error || '선택한 조건에 맞는 게시물이 없습니다.'}
        </div>
      )}

      {hasPagination && (
        <Pagination
          page={page}
          hasPrevious={pageData.hasPrevious}
          hasNext={pageData.hasNext}
          loading={loading}
          onPage={setPage}
        />
      )}
    </section>
  );
}
