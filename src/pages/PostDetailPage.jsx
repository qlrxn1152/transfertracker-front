import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPost, getPostSources } from '../api/client';
import { demo } from '../demo';
import { POST_SOURCES } from '../constants';
import { formatPostDate, logoUrl, postTransferFlag, teamDisplayName } from '../utils';
import { markPostRead } from '../utils/clientStore';
import ContentActions from '../components/ContentActions';
import JournalistAvatar from '../components/JournalistAvatar';
import LoadingPlaceholder from '../components/LoadingPlaceholder';
import './PostDetailPage.css';

function fallbackSource(post) {
  const raw = String(post?.source || 'Unknown').replaceAll('_', ' ');
  const initials = raw.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();
  return { name: raw, handle: '', initials: initials || 'X' };
}

function imageUrl(post) {
  try {
    const value = [
      post?.photoUrl,
      post?.mediaUrl,
      post?.imageUrl,
      post?.image?.url,
      post?.media?.url,
      ...(Array.isArray(post?.photoUrls) ? post.photoUrls : []),
      ...(Array.isArray(post?.mediaUrls) ? post.mediaUrls : [])
    ].find(candidate => typeof candidate === 'string' && candidate.trim());
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function findSamplePost(postId) {
  return [...Object.entries(demo.posts || {}), ...Object.entries(demo.teamPosts || {})]
    .flatMap(([source, posts]) => posts.map(post => ({ ...post, source: post.source || source })))
    .find(post => String(post.postId) === String(postId)) || null;
}

export default function PostDetailPage({ sample, teams }) {
  const { postId } = useParams();
  const [state, setState] = useState({ loading: true, post: null, sources: POST_SOURCES, error: '' });

  useEffect(() => {
    const post = state.post;
    if (!post) return;

    markPostRead(`post:${post.postId ?? post.externalPostId ?? `${post.source}-${post.postCreatedAt}`}`);
  }, [state.post]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (sample) {
        setState({ loading: false, post: findSamplePost(postId), sources: POST_SOURCES, error: '' });
        return;
      }

      setState(current => ({ ...current, loading: true, error: '' }));

      try {
        const [postResult, sourceResult] = await Promise.allSettled([
          getPost(postId, controller.signal),
          getPostSources(controller.signal)
        ]);

        if (postResult.status !== 'fulfilled') throw postResult.reason;
        const post = postResult.value?.post ?? postResult.value;
        if (!post || typeof post !== 'object') throw new Error('게시물을 찾을 수 없습니다.');

        const sourceList = sourceResult.status === 'fulfilled' && Array.isArray(sourceResult.value?.sources)
          ? sourceResult.value.sources
          : [];
        const sources = sourceList.length
          ? sourceList.map(item => {
            const code = item.source || item.code;
            const fallback = POST_SOURCES.find(source => source.code === code);
            return {
              code,
              name: item.displayName || fallback?.name || item.xUsername || String(code || '').replaceAll('_', ' '),
              handle: item.xUsername || fallback?.handle || '',
              initials: fallback?.initials || String(code || 'X').split('_').map(value => value[0]).join('').slice(0, 2),
              profileImageUrl: item.profileImageUrl ?? item.profilePhotoUrl ?? item.avatarUrl ?? item.imageUrl ?? item.photoUrl
            };
          })
          : POST_SOURCES;

        setState({ loading: false, post, sources, error: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({ loading: false, post: null, sources: POST_SOURCES, error: error.message || '게시물을 불러오지 못했습니다.' });
        }
      }
    }

    load();
    return () => controller.abort();
  }, [postId, sample]);

  if (state.loading) return <LoadingPlaceholder label="기자 소식을 불러오는 중입니다." />;
  if (!state.post) {
    return <section className="post-detail-empty"><p>{state.error || '게시물을 찾을 수 없습니다.'}</p><Link to="/posts">기자 소식 목록으로 돌아가기 →</Link></section>;
  }

  const post = state.post;
  const source = state.sources.find(item => item.code === post.source) || fallbackSource(post);
  const translated = typeof post.translatedContent === 'string' && post.translatedContent.trim() ? post.translatedContent.trim() : null;
  const original = typeof post.content === 'string' && post.content.trim() ? post.content.trim() : null;
  const photo = imageUrl(post);
  const externalId = String(post.externalPostId || '');
  const xUrl = !sample && source.handle && /^\d{1,30}$/.test(externalId)
    ? `https://x.com/${source.handle}/status/${externalId}`
    : null;
  const team = teams.find(item => String(item.teamId) === String(post.teamId));
  const teamName = team ? teamDisplayName(team) : post.teamName;
  const readKey = `post:${post.postId ?? post.externalPostId ?? `${post.source}-${post.postCreatedAt}`}`;

  return (
    <article className="post-detail-page">
      <Link className="post-detail-back" to="/posts">← 기자 소식 목록</Link>
      <header className="post-detail-head">
        <div className="post-detail-source"><JournalistAvatar source={source} className="post-detail-avatar" /><div><b>{source.name}</b>{source.handle && <small>@{source.handle}</small>}</div></div>
        <time>{formatPostDate(post.postCreatedAt)}</time>
      </header>
      <div className="post-detail-tags">
        <span className={postTransferFlag(post) === true ? 'transfer' : ''}>{postTransferFlag(post) === true ? '↗ 이적 관련' : '일반 게시물'}</span>
        {translated && <span>한국어 번역</span>}
        <span className="read">✓ 읽음</span>
      </div>
      <h1>{translated || original || '내용이 없습니다.'}</h1>
      {photo && <figure className="post-detail-media"><img src={photo} alt={`${source.name} 게시물 첨부 이미지`} referrerPolicy="no-referrer" /></figure>}
      {translated && original && <section className="post-detail-original"><p>원문</p><blockquote>{original}</blockquote></section>}
      <footer className="post-detail-foot">
        <span>{translated ? '번역된 X 게시물' : 'X 게시물'}</span>
        {teamName && (
          <Link className="post-detail-team" to={team ? `/teams/${team.teamId}` : '/teams'}>
            <i>{teamName.slice(0, 1)}{team && logoUrl(team.logoUrl) && <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />}</i>{teamName} 관련 팀 보기 →
          </Link>
        )}
        <ContentActions compact item={{ key: readKey, type: 'post', title: `${source.name} · ${translated || original || '기자 소식'}`, summary: translated || original || '', path: `/posts/${postId}` }} />
        {xUrl && <a href={xUrl} target="_blank" rel="noreferrer">X에서 원문 보기 ↗</a>}
      </footer>
    </article>
  );
}
