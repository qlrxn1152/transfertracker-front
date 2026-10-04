import { useEffect, useMemo, useState } from 'react';
import { getPostsBySource, getPostsByTeam } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES, SUPPORTED_POST_LEAGUES } from '../constants';
import PostCard from '../components/PostCard';
import { logoUrl, postTransferFlag, teamDisplayName, teamLeague, text } from '../utils';
import './PostsPage.css';

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

          if (!Array.isArray(result.posts)) throw new Error('예상과 다른 클럽 게시물 응답 형식입니다.');

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

  const filtered = useMemo(() => [...posts]
    .filter(post => sourceFilter === 'all' || post.source === sourceFilter)
    .filter(post => typeFilter === 'all' || postTransferFlag(post) === true)
    .filter(post => text(post.translatedContent).includes(text(query)) || text(post.content).includes(text(query)))
    .sort((a, b) =>
      (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0)
      || String(b.externalPostId || b.postId || '').localeCompare(String(a.externalPostId || a.postId || ''))
    ), [posts, sourceFilter, typeFilter, query]);

  const availableTeams = [...teams]
    .filter(team => SUPPORTED_POST_LEAGUES.has(teamLeague(team)))
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b), 'ko'));

  const selectedTeam = teamMode
    ? teams.find(team => String(team.teamId) === String(selectedTeamId))
    : null;

  const failed = teamMode ? [] : POST_SOURCES.filter(source => errors[source.code]).map(source => source.name);
  const currentSource = POST_SOURCES.find(source => source.code === sourceFilter);

  const error = teamMode
    ? teamError
    : currentSource
      ? errors[currentSource.code]
      : failed.length === POST_SOURCES.length
        ? '기자 게시물을 불러오지 못했습니다. 백엔드 연결을 확인해 주세요.'
        : '';

  return (
    <section className="journal-page">
      <header className="journal-head">
        <div>
          <p className="eyebrow">TRANSFER JOURNAL</p>
          <h1>기자 소식</h1>
          <p>기자별 이적 소식을 한국어 번역과 함께 빠르게 훑어보세요.</p>
        </div>
        <strong>{loading ? '—' : posts.length.toLocaleString()}<span>게시물</span></strong>
      </header>

      <div className="journal-filters">
        <div className="journal-source-tabs">
          <button className={sourceFilter === 'all' ? 'active' : ''} type="button" onClick={() => setSourceFilter('all')}>전체</button>
          {POST_SOURCES.map(source => (
            <button
              key={source.code}
              className={sourceFilter === source.code ? 'active' : ''}
              type="button"
              onClick={() => setSourceFilter(source.code)}
            >
              {source.name}
            </button>
          ))}
        </div>

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
            disabled={missingClassification}
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
            {teamDisplayName(selectedTeam).slice(0,1)}
            {logoUrl(selectedTeam.logoUrl) && <img src={selectedTeam.logoUrl} alt="" referrerPolicy="no-referrer" />}
          </span>
          <div>
            <small>CLUB JOURNAL</small>
            <strong>{teamDisplayName(selectedTeam)}</strong>
          </div>
          <em>{filtered.length}건</em>
        </div>
      )}

      {(failed.length || missingClassification) && (
        <div className="posts-notice" role="status">
          {failed.length ? `${failed.join(', ')}의 게시물을 불러오지 못했습니다. ` : ''}
          {missingClassification ? '일부 게시물에 이적 관련 분류 정보가 없습니다.' : ''}
        </div>
      )}

      <div className="journal-feed-head">
        <div>
          <strong>{selectedTeam ? teamDisplayName(selectedTeam) : currentSource?.name || '전체 소식'}</strong>
          <span>{loading ? '불러오는 중' : `${filtered.length}건 표시`}</span>
        </div>
      </div>

      {filtered.length ? (
        <div className="journal-feed" aria-live="polite">
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
            : error || '선택한 조건에 맞는 게시물이 없습니다.'}
        </div>
      )}
    </section>
  );
}
