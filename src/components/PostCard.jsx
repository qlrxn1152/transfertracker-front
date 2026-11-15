import { useState } from 'react';
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

export default function PostCard({ post, sourceProfile, sample }) {
  const source = sourceProfile || fallbackSource(post);
  const readKey = `post:${post.postId ?? post.externalPostId ?? `${post.source}-${post.postCreatedAt}`}`;
  const [read, setRead] = useState(() => isPostRead(readKey));

  const translated = typeof post.translatedContent === 'string' && post.translatedContent.trim()
    ? post.translatedContent
    : null;

  const original = !sample && /^\d{1,30}$/.test(String(post.externalPostId || ''))
    ? `https://x.com/${source.handle}/status/${post.externalPostId}`
    : null;

  const flag = postTransferFlag(post);
  const photo = imageUrl(post.photoUrl);

  function markRead() {
    markPostRead(readKey);
    setRead(true);
  }

  return (
    <article className={`post-card ${read ? 'is-read' : ''}`} onClick={markRead}>
      <div className="post-card-head">
        <span className="post-avatar">{source.initials}</span>
        <div className="post-author">
          <strong>{source.name}</strong>
          <span>@{source.handle}</span>
        </div>
        <time>{formatPostDate(post.postCreatedAt)}</time>
      </div>

      <div className="post-meta">
        {flag === true ? (
          <span className="post-tag transfer">↗ 이적 관련</span>
        ) : flag === false ? (
          <span className="post-tag">일반 게시물</span>
        ) : (
          <span className="post-tag">분류 정보 없음</span>
        )}
        {translated && <span className="post-tag translated">한국어 번역</span>}
      </div>

      <p className="post-content">{translated ?? post.content ?? ''}</p>

      {photo && (
        <figure className="post-media">
          <img src={photo} alt={`${source.name} 게시물 첨부 이미지`} loading="lazy" referrerPolicy="no-referrer" />
        </figure>
      )}

      {translated && post.content && (
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
