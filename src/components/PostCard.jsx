import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPostDate, postTransferFlag } from '../utils';
import ContentActions from './ContentActions';
import { isPostRead, markPostRead } from '../utils/clientStore';

function fallbackSource(post) {
  const name = String(post.source || 'Unknown').replaceAll('_', ' ');
  const initials = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();

  return { name, handle: '', initials: initials || 'X' };
}

function imageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function PostCard({ post, sourceProfile, sample, readingMode = 'translated', onRead }) {
  const navigate = useNavigate();
  const source = sourceProfile || fallbackSource(post);
  const readKey = `post:${post.postId ?? post.externalPostId ?? `${post.source}-${post.postCreatedAt}`}`;
  const [read, setRead] = useState(() => isPostRead(readKey));

  useEffect(() => {
    const refresh = () => setRead(isPostRead(readKey));
    window.addEventListener('veyro-client-store', refresh);
    return () => window.removeEventListener('veyro-client-store', refresh);
  }, [readKey]);

  const translated = typeof post.translatedContent === 'string' && post.translatedContent.trim()
    ? post.translatedContent
    : null;

  const original = !sample && /^\d{1,30}$/.test(String(post.externalPostId || ''))
    ? `https://x.com/${source.handle}/status/${post.externalPostId}`
    : null;

  const flag = postTransferFlag(post);
  const photo = imageUrl(post.photoUrl);
  const displayContent = readingMode === 'original'
    ? post.content || translated || ''
    : translated ?? post.content ?? '';

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

    const postId = post.postId ?? post.id;
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
      className={`post-card ${read ? 'is-read' : 'is-unread'} ${readingMode === 'original' ? 'original-mode' : ''}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`${source.name} 게시물 상세 보기`}
    >
      <div className="post-card-head">
        <span className="post-avatar">{source.initials}</span>
        <div className="post-author">
          <strong>{source.name}</strong>
          <span>@{source.handle}</span>
        </div>
        <time>{formatPostDate(post.postCreatedAt)}</time>
      </div>

      <div className="post-meta">
        <span className={`post-read-badge ${read ? 'read' : 'unread'}`}>
          <i aria-hidden="true" />{read ? '읽음' : '새 글'}
        </span>
        {flag === true ? (
          <span className="post-tag transfer">↗ 이적 관련</span>
        ) : flag === false ? (
          <span className="post-tag">일반 게시물</span>
        ) : (
          <span className="post-tag">분류 정보 없음</span>
        )}
        {translated && <span className="post-tag translated">{readingMode === 'original' ? '원문 보기' : '한국어 번역'}</span>}
      </div>

      <p className="post-content">{displayContent}</p>

      {photo && (
        <figure className="post-media">
          <img src={photo} alt={`${source.name} 게시물 첨부 이미지`} loading="lazy" referrerPolicy="no-referrer" />
        </figure>
      )}

      {readingMode !== 'original' && translated && post.content && (
        <details className="post-original">
          <summary>원문 보기</summary>
          <p>{post.content}</p>
        </details>
      )}

      <div className="post-card-foot">
        <span>{sample ? '샘플 데이터' : translated ? '번역된 X 게시물' : 'X 게시물'}</span>
        <ContentActions
          compact
          item={{
            key: readKey,
            type: 'post',
            title: `${source.name} · ${translated ?? post.content ?? '기자 소식'}`,
            summary: translated ?? post.content ?? '',
            path: '/posts'
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
