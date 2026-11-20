import { useEffect, useState } from 'react';
import { registerFcmToken } from '../api/client';
import { requestFcmToken } from '../firebase/messaging';
import { trackAnalyticsEvent } from '../firebase/analytics';

const FCM_GRANTED_AT_KEY = 'transfertracker.fcm-permission-granted-at';
const FCM_TOKEN_KEY = 'transfertracker.fcm-test-token';
const FCM_TOKEN_ISSUED_AT_KEY = 'transfertracker.fcm-token-issued-at';

function registrationKey(memberId) {
  return `transfertracker.fcm-registered-for.${memberId}`;
}

function permission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

function formatDate(value) {
  if (!value) return '기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '기록 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul'
  }).format(date);
}

export default function PostPushSettings({ session }) {
  const [currentPermission, setCurrentPermission] = useState(permission);
  const [grantedAt, setGrantedAt] = useState(() => localStorage.getItem(FCM_GRANTED_AT_KEY));
  const [status, setStatus] = useState('관심 팀·선수·기자의 새 게시물을 이 기기에서 받아볼 수 있습니다.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = permission();
    setCurrentPermission(value);
    if (value === 'granted') {
      setStatus(`알림 권한이 허용되어 있습니다. 최초 허용: ${formatDate(grantedAt)}`);
    } else if (value === 'denied') {
      setStatus('브라우저 설정에서 이 사이트의 알림을 허용한 뒤 다시 시도해 주세요.');
    }
  }, [grantedAt]);

  async function enablePush() {
    if (!session?.accessToken || !session?.memberId) return;
    setLoading(true);
    trackAnalyticsEvent('push_permission_requested');
    try {
      const before = permission();
      const token = await requestFcmToken();
      const now = new Date().toISOString();
      if (before !== 'granted') {
        localStorage.setItem(FCM_GRANTED_AT_KEY, now);
        setGrantedAt(now);
        trackAnalyticsEvent('push_permission_granted');
      }
      localStorage.setItem(FCM_TOKEN_KEY, token);
      localStorage.setItem(FCM_TOKEN_ISSUED_AT_KEY, now);
      await registerFcmToken(session.accessToken, token);
      localStorage.setItem(registrationKey(session.memberId), token);
      setCurrentPermission(permission());
      setStatus('이 기기의 푸시 수신이 연결됐습니다. 새 관련 게시물이 등록되면 바로 알려드릴게요.');
      trackAnalyticsEvent('push_device_registered');
    } catch (error) {
      setCurrentPermission(permission());
      setStatus(`알림 연결 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const alreadyEnabled = currentPermission === 'granted';
  return (
    <section className="post-push-settings" aria-labelledby="post-push-heading">
      <p className="eyebrow">POST ALERTS</p>
      <h2 id="post-push-heading">새 소식 알림</h2>
      <p>관심 팀, 관심 선수, 팔로우 기자의 새 게시물이 등록되면 이 기기로 알려드립니다.</p>
      <div className={`fcm-permission-state ${currentPermission}`}>
        <span>{alreadyEnabled ? '알림 권한 허용됨' : currentPermission === 'denied' ? '알림 권한 차단됨' : '알림 권한 요청 전'}</span>
        {alreadyEnabled && <time>최초 허용: {formatDate(grantedAt)}</time>}
      </div>
      <button className="account-primary" type="button" disabled={loading || alreadyEnabled} onClick={enablePush}>
        {loading ? '연결 중...' : alreadyEnabled ? '이 기기에서 수신 중' : '알림 허용 및 수신 준비'}
      </button>
      <p className="post-push-status" role="status">{status}</p>
    </section>
  );
}
