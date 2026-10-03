import { POST_SOURCES } from '../constants';
import { formatPostDate, postTransferFlag } from '../utils';

export default function PostCard({ post, sample }) {
  const source = POST_SOURCES.find(item => item.code === post.source);
  if (!source) return null;

  const translated = typeof post.translatedContent === 'string' && post.translatedContent.trim()
    ? post.translatedContent
    : null;

  const original = !sample && /^\d{1,30}$/.test(String(post.externalPostId || ''))
    ? `https://x.com/${source.handle}/status/${post.externalPostId}`
    : null;

  const flag = postTransferFlag(post);

  return (
    <article className="post-card">
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

      {translated && post.content && (
        <details className="post-original">
          <summary>원문 보기</summary>
          <p>{post.content}</p>
        </details>
      )}

      <div className="post-card-foot">
        <span>{sample ? '샘플 데이터' : translated ? '번역된 X 게시물' : 'X 게시물'}</span>
        {original && (
          <a href={original} target="_blank" rel="noopener noreferrer">
            X에서 원문 보기 <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
