import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPostDate, postTransferFlag } from '../utils';
import ContentActions from './ContentActions';
import JournalistAvatar from './JournalistAvatar';
import { isPostRead, markPostRead } from '../utils/clientStore';

function fallbackSource(post) {
  const name = String(post.source || post.journalist || 'Unknown').replaceAll('_', ' ');
  const initials = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();

  return { name, handle: '', initials: initials || 'X' };
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

function postCopy(post) {
  const content = String(post?.content || '').replace(/\s+/g, ' ').trim();
  const explicitHeadline = String(post?.headline || post?.title || '').trim();
  if (explicitHeadline) return { headline: explicitHeadline, summary: content === explicitHeadline ? '' : content };

  // 목록 API에는 제목/요약 필드가 아직 없으므로, 문장을 새로 쓰지 않고
  // 원문 첫 문장과 남은 문장으로만 시각적 계층을 만든다.
  const ending = content.search(/[.!?](?:\s|$)/);
  if (ending >= 0 && ending < content.length - 2) {
    return {
      headline: content.slice(0, ending + 1),
      summary: content.slice(ending + 1).trim()
    };
  }
  return { headline: content, summary: '' };
}

export default function PostCard({ post, sourceProfile, sample, onRead, onPlayerOpen }) {
  const navigate = useNavigate();
  const source = sourceProfile || fallbackSource(post);
  const readKey = `post:${post.postId ?? post.externalPostId ?? `${post.source}-${post.postCreatedAt}`}`;
  const [read, setRead] = useState(() => isPostRead(readKey));

  useEffect(() => {
    const refresh = () => setRead(isPostRead(readKey));
    window.addEventListener('veyro-client-store', refresh);
    return () => window.removeEventListener('veyro-client-store', refresh);
  }, [readKey]);

  const original = !sample && /^\d{1,30}$/.test(String(post.externalPostId || ''))
    ? `https://x.com/${source.handle}/status/${post.externalPostId}`
    : null;

  const flag = postTransferFlag(post);
  const photo = imageUrl(post);
  const displayContent = post.content || '';
  const postId = post.postId ?? post.id;
  const { headline, summary } = postCopy(post);

  function markRead() {
    if (read) return;
    markPostRead(readKey);
    setRead(true);
    onRead?.();
  }

  function openDetail(event) {
    markRead();

    // 원문·공유·북마크 같은 카드 내부 동작은 그대로 유지한다.
    if (event.target.closest('a, button, summary, details')) return;

    if (postId !== null && postId !== undefined && String(postId).trim()) {
      navigate(`/posts/${postId}`);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openDetail(event);
  }

  return (
    <article
      className={`post-card ${read ? 'is-read' : 'is-unread'}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`${source.name} 게시물 상세 보기`}
    >
      <div className="post-card-head">
        <span className={`post-status ${flag === true ? 'transfer' : ''}`}>
          {flag === true ? '이적 관련' : '기자 소식'}
        </span>
        <time>{formatPostDate(post.postCreatedAt)}</time>
        <span className={`post-read-badge ${read ? 'read' : 'unread'}`} aria-label={read ? '읽음' : '새 글'}><i aria-hidden="true" /></span>
      </div>

      {(post.playerName || post.teamName) && (
        <div className="post-subject">
          <span className="post-subject-mark" aria-hidden="true">{(post.playerName || post.teamName || 'V').slice(0, 1)}</span>
          <div>
            <strong>{post.playerName || post.teamName}</strong>
            {post.playerName && post.teamName && <span>{post.teamName} 관련 소식</span>}
          </div>
        </div>
      )}

      <div className="post-copy">
        {headline && <h2>{headline}</h2>}
        {summary && <p className="post-content">{summary}</p>}
      </div>

      {(post.teamName || post.playerName) && (
        <div className="post-related" aria-label="관련 대상">
          <span>관련</span>
          {post.teamName && (
            post.teamId ? (
              <Link to={`/teams/${post.teamId}`} className="post-related-chip team">
                <i aria-hidden="true">T</i>{post.teamName}
              </Link>
            ) : <span className="post-related-chip team"><i aria-hidden="true">T</i>{post.teamName}</span>
          )}
          {post.playerName && (
            post.playerId ? (
              <button
                type="button"
                className="post-related-chip player"
                onClick={() => onPlayerOpen?.(Number(post.playerId))}
              >
                <i aria-hidden="true">P</i>{post.playerName}
              </button>
            ) : <span className="post-related-chip player"><i aria-hidden="true">P</i>{post.playerName}</span>
          )}
        </div>
      )}

      {photo && (
        <figure className="post-media">
          <img src={photo} alt={`${source.name} 게시물 첨부 이미지`} loading="lazy" referrerPolicy="no-referrer" />
        </figure>
      )}

      <div className="post-card-foot">
        <span className="post-source"><JournalistAvatar source={source} className="post-avatar" /><b>{source.name}</b></span>
        <ContentActions
          compact
          item={{
            key: readKey,
            type: 'post',
            title: `${source.name} · ${post.content ?? '기자 소식'}`,
            summary: post.content ?? '',
            path: postId ? `/posts/${postId}` : '/posts'
          }}
          card
        />
        {original && (
          <a href={original} target="_blank" rel="noopener noreferrer">
            X에서 원문 보기 <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
