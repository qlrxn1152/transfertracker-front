import { useEffect, useState } from 'react';
import { isBookmarked, toggleBookmark } from '../utils/clientStore';

function absoluteUrl(path) {
  if (typeof window === 'undefined') return path;
  return new URL(path || `${window.location.pathname}${window.location.search}`, window.location.origin).toString();
}

export default function ContentActions({ item, compact = false }) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(item.key));
  const [status, setStatus] = useState('');

  useEffect(() => {
    const refresh = () => setBookmarked(isBookmarked(item.key));
    window.addEventListener('veyro-client-store', refresh);
    return () => window.removeEventListener('veyro-client-store', refresh);
  }, [item.key]);

  function save(event) {
    event.stopPropagation();
    const next = toggleBookmark(item);
    setBookmarked(next);
    setStatus(next ? '저장됨' : '저장 해제');
  }

  function undo(event) {
    save(event);
    setStatus('변경 취소됨');
  }

  async function share(event) {
    event.stopPropagation();
    const url = absoluteUrl(item.path);
    const data = { title: item.title, text: item.summary || item.title, url };

    try {
      if (navigator.share) {
        await navigator.share(data);
        setStatus('공유 완료');
      } else {
        await navigator.clipboard.writeText(url);
        setStatus('링크 복사됨');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setStatus('공유하지 못했습니다');
    }
  }

  return (
    <div className={`content-actions ${compact ? 'compact' : ''}`} onClick={event => event.stopPropagation()}>
      <button type="button" onClick={save} aria-pressed={bookmarked} aria-label={bookmarked ? '저장 해제' : '나중에 보기 저장'}>
        {bookmarked ? '저장됨' : '저장'}
      </button>
      <button type="button" onClick={share} aria-label="공유 또는 링크 복사">공유</button>
      {status && <><span role="status">{status}</span>{status === '저장됨' && <button className="content-actions-undo" type="button" onClick={undo}>실행 취소</button>}</>}
    </div>
  );
}
