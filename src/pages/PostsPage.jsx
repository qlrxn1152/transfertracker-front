import { useEffect, useMemo, useState } from 'react';
import { getPostsBySource, getPostsByTeam } from '../api/client';
import { demo } from '../demo';
import { LEAGUES, POST_SOURCES, SUPPORTED_POST_LEAGUES } from '../constants';
import PostCard from '../components/PostCard';
import { postTransferFlag, teamDisplayName, teamLeague, text } from '../utils';

export default function PostsPage({ sample, teams, selectedTeamId, onSelectedTeamChange }) {
  const [postsBySource, setPostsBySource] = useState({});
  const [errors, setErrors] = useState({});
  const [teamPosts, setTeamPosts] = useState([]);
  const [teamError, setTeamError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const teamMode = selectedTeamId !== 'all';

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      if (teamMode) {
        try {
          const selected = teams.find(team => String(team.teamId) === String(selectedTeamId));
          const result = sample
            ? { posts: demo.teamPosts[selected?.teamName] || [] }
            : await getPostsByTeam(selectedTeamId, controller.signal);

          if (!Array.isArray(result.posts)) {
            throw new Error('예상과 다른 클럽 게시물 응답 형식입니다.');
          }

          setTeamPosts(result.posts);
          setTeamError('');
        } catch (error) {
          if (error.name !== 'AbortError') {
            setTeamPosts([]);
            setTeamError(error.message);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      if (sample) {
        setPostsBySource(demo.posts);
        setErrors({});
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        POST_SOURCES.map(source => getPostsBySource(source.code, controller.signal))
      );

      if (controller.signal.aborted) return;

      const next = {};
      const nextErrors = {};

      POST_SOURCES.forEach((source, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && Array.isArray(result.value.posts)) {
          next[source.code] = result.value.posts.map(post => ({ ...post, source: source.code }));
        } else {
          nextErrors[source.code] = result.status === 'rejected'
            ? result.reason.message
            : '예상과 다른 게시물 응답 형식입니다.';
        }
      });

      setPostsBySource(next);
      setErrors(nextErrors);
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [sample, teamMode, selectedTeamId, teams]);

  const posts = teamMode
    ? teamPosts
    : POST_SOURCES.flatMap(source => postsBySource[source.code] || []);

  const missingClassification = posts.some(post => typeof postTransferFlag(post) !== 'boolean');

  useEffect(() => {
    if (missingClassification && typeFilter !== 'all') setTypeFilter('all');
  }, [missingClassification, typeFilter]);

  const filtered = useMemo(() => {
    return [...posts]
      .filter(post => sourceFilter === 'all' || post.source === sourceFilter)
      .filter(post => typeFilter === 'all' || postTransferFlag(post) === true)
      .filter(post =>
        text(post.translatedContent).includes(text(query))
        || text(post.content).includes(text(query))
      )
      .sort((a, b) =>
        (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0)
        || String(b.externalPostId || b.postId || '').localeCompare(String(a.externalPostId || a.postId || ''))
      );
  }, [posts, sourceFilter, typeFilter, query]);

  const availableTeams = [...teams]
    .filter(team => SUPPORTED_POST_LEAGUES.has(teamLeague(team)))
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b), 'ko'));

  const selectedTeam = teamMode
    ? teams.find(team => String(team.teamId) === String(selectedTeamId))
    : null;

  const failed = teamMode
    ? []
    : POST_SOURCES.filter(source => errors[source.code]).map(source => source.name);

  const currentSource = POST_SOURCES.find(source => source.code === sourceFilter);
  const error = teamMode
    ? teamError
    : currentSource
      ? errors[currentSource.code]
      : failed.length === POST_SOURCES.length
        ? '기자 게시물을 불러오지 못했습니다. 백엔드 연결을 확인해 주세요.'
        : '';

  return (
    <section className="view">
      <div className="section-head">
        <div>
          <p className="eyebrow">TRANSFER JOURNAL</p>
          <h2>기자 소식 <span className="count">{loading ? '—' : posts.length.toLocaleString()}</span></h2>
          <p>기자별 게시물과 클럽별 이적 소식을 한국어 번역과 함께 최신순으로 확인하세요.</p>
        </div>
      </div>

      <div className="posts-layout">
        <aside className="posts-sidebar">
          <p className="posts-sidebar-title">기자 선택</p>
          <div className="post-sources" aria-label="기자 필터">
            {[
              { code: 'all', name: '전체 기자', initials: '↗', count: posts.length },
              ...POST_SOURCES.map(source => ({
                ...source,
                count: teamMode
                  ? posts.filter(post => post.source === source.code).length
                  : (postsBySource[source.code] || []).length
              }))
            ].map(source => (
              <button
                key={source.code}
                type="button"
                className={`post-source ${sourceFilter === source.code ? 'selected' : ''}`}
                onClick={() => setSourceFilter(source.code)}
              >
                <span className="post-source-avatar">{source.initials}</span>
                <span className="post-source-label">
                  <strong>{source.name}</strong>
                  <small>{source.handle ? `@${source.handle}` : '모든 기자의 게시물'}</small>
                </span>
                <span className="post-source-count">{source.count}</span>
              </button>
            ))}
          </div>

          <div className="post-club-picker">
            <p className="posts-sidebar-title">클럽별 소식</p>
            <div className="post-leagues">
              {LEAGUES.filter(([code]) => code !== 'unclassified').map(([code, name]) => (
                <span
                  key={code}
                  className={`post-league ${SUPPORTED_POST_LEAGUES.has(code) ? 'available' : ''}`}
                  title={SUPPORTED_POST_LEAGUES.has(code) ? '' : '준비 중'}
                >
                  {name}{SUPPORTED_POST_LEAGUES.has(code) ? '' : ' · 준비 중'}
                </span>
              ))}
            </div>

            <label htmlFor="postTeams">클럽 선택</label>
            <select
              id="postTeams"
              value={selectedTeamId}
              onChange={event => onSelectedTeamChange(event.target.value)}
            >
              <option value="all">전체 기자 게시물</option>
              {availableTeams.map(team => (
                <option value={team.teamId} key={team.teamId}>{teamDisplayName(team)}</option>
              ))}
            </select>
            <p>현재 EPL 클럽의 연결된 게시물을 볼 수 있습니다.</p>
          </div>

          <p className="posts-help">게시물은 백엔드에 저장된 기록입니다.</p>
        </aside>

        <div className="posts-main">
          {selectedTeam && (
            <div className="post-team-banner">
              <span className="post-team-logo">{teamDisplayName(selectedTeam).slice(0, 1)}</span>
              <div>
                <small>CLUB POSTS</small>
                <strong>{teamDisplayName(selectedTeam)}</strong>
                <span>이 클럽에 연결된 게시물</span>
              </div>
            </div>
          )}

          <div className="posts-toolbar">
            <div>
              <strong>{selectedTeam ? `${teamDisplayName(selectedTeam)} · ${currentSource?.name || '전체 기자'}` : currentSource?.name || '전체 소식'}</strong>
              <span>{loading ? '게시물을 불러오는 중' : `${filtered.length}건 표시 · 전체 ${posts.length}건`}</span>
            </div>

            <label className="search posts-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="게시물 내용 검색"
                aria-label="게시물 검색"
              />
            </label>
          </div>

          <div className="post-types">
            <button
              type="button"
              className={`post-type ${typeFilter === 'all' ? 'selected' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              전체 게시물 <span>{posts.length}</span>
            </button>
            <button
              type="button"
              className={`post-type ${typeFilter === 'transfer' ? 'selected' : ''}`}
              disabled={missingClassification}
              title={missingClassification ? '게시물 응답에 이적 관련 여부가 필요합니다' : ''}
              onClick={() => setTypeFilter('transfer')}
            >
              이적 관련만 <span>{posts.filter(post => postTransferFlag(post) === true).length}</span>
            </button>
          </div>

          {(failed.length || missingClassification) && (
            <div className="posts-notice" role="status">
              {failed.length ? `${failed.join(', ')}의 게시물을 불러오지 못했습니다. ` : ''}
              {missingClassification ? '게시물 응답에 이적 관련 여부가 없어 필터를 사용할 수 없습니다.' : ''}
            </div>
          )}

          {filtered.length ? (
            <div className="posts-feed" aria-live="polite">
              {filtered.map(post => (
                <PostCard
                  key={`${post.source}-${post.postId ?? post.externalPostId}`}
                  post={post}
                  sample={sample}
                />
              ))}
            </div>
          ) : (
            <div className={`empty ${error ? 'error' : ''}`}>
              {loading
                ? '게시물을 불러오는 중...'
                : error || (query || typeFilter !== 'all' || sourceFilter !== 'all'
                  ? '선택한 조건에 맞는 게시물이 없습니다.'
                  : teamMode
                    ? '이 클럽에 연결된 게시물이 아직 없습니다.'
                    : '아직 저장된 게시물이 없습니다.')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
