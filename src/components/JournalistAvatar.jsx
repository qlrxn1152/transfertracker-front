import { useState } from 'react';

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function journalistProfilePhoto(source) {
  const supplied = safeUrl(
    source?.profileImageUrl
    ?? source?.profilePhotoUrl
    ?? source?.avatarUrl
    ?? source?.imageUrl
    ?? source?.photoUrl
  );

  if (supplied) return supplied;

  // 기존 기자 데이터도 X 계정 사진을 시도하고, 실패하면 이니셜을 그대로 보여준다.
  const handle = String(source?.handle || source?.xUsername || '').replace(/^@/, '').trim();
  return handle ? `https://unavatar.io/x/${encodeURIComponent(handle)}` : null;
}

export default function JournalistAvatar({ source, className = '' }) {
  const [failed, setFailed] = useState(false);
  const photo = journalistProfilePhoto(source);

  return (
    <span className={`journalist-avatar ${className}`.trim()} aria-hidden="true">
      {source?.initials || 'X'}
      {photo && !failed && (
        <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
