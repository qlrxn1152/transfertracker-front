import { useEffect, useState } from 'react';
import {
  publishNotificationTestPost,
  registerFcmToken,
  removeNotificationTestPosts
} from '../api/client';
import { listenForForegroundMessages, requestFcmToken } from '../firebase/messaging';
import { trackAnalyticsEvent } from '../firebase/analytics';

const FCM_GRANTED_AT_KEY = 'transfertracker.fcm-permission-granted-at';
const FCM_TOKEN_KEY = 'transfertracker.fcm-test-token';
const FCM_TOKEN_ISSUED_AT_KEY = 'transfertracker.fcm-token-issued-at';

function registrationKey(memberId) {
  return `transfertracker.fcm-registered-for.${memberId}`;
}

function notificationPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

function formatGrantedAt(value) {
  if (!value) return '기록 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '기록 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  }).format(date);
}

/** 로그인한 사용자가 현재 브라우저의 FCM 수신을 확인하는 테스트 패널입니다. */
export default function FcmTestPanel({ accessToken, memberId, isAdmin = false, favoriteTeams = [] }) {
  const [token, setToken] = useState(() => localStorage.getItem(FCM_TOKEN_KEY) || '');
  const [permission, setPermission] = useState(notificationPermission);
  const [grantedAt, setGrantedAt] = useState(() => localStorage.getItem(FCM_GRANTED_AT_KEY));
  const [tokenIssuedAt, setTokenIssuedAt] = useState(() => localStorage.getItem(FCM_TOKEN_ISSUED_AT_KEY));
  const [status, setStatus] = useState('알림 권한 상태를 확인하는 중입니다.');
  const [issuing, setIssuing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [testTeamId, setTestTeamId] = useState('');
  const [publishingTest, setPublishingTest] = useState(false);
  const [removingTests, setRemovingTests] = useState(false);

  useEffect(() => {
    if (!testTeamId && favoriteTeams.length) {
      setTestTeamId(String(favoriteTeams[0].teamId));
    }
  }, [favoriteTeams, testTeamId]);

useEffect(() => {
  let cancelled = false;
  let unsubscribe = () => {};

  listenForForegroundMessages((payload) => {
    if (!cancelled) {
      console.log("FCM 수신 메시지:", payload);

      const title = payload.notification?.title || "제목 없음";
      const body = payload.notification?.body || "내용 없음";

      setStatus(`포그라운드 메시지 수신: ${title} - ${body}`);
    }
  })
    .then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    })
    .catch((error) => {
      if (!cancelled) {
        setStatus(`메시지 리스너 오류: ${error.message}`);
      }
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}, []);

  async function saveToken(value) {
    if (!accessToken || !memberId || !value) return;

    const key = registrationKey(memberId);
    if (localStorage.getItem(key) === value) return;

    setRegistering(true);
    try {
      await registerFcmToken(accessToken, value);
      trackAnalyticsEvent('push_device_registered');
      localStorage.setItem(key, value);
      setStatus('이 기기의 푸시 수신이 계정에 연결됐습니다. 관심 팀의 새 소식이 등록되면 알림이 옵니다.');
    } catch (error) {
      setStatus(`푸시 수신 등록 실패: ${error.message}`);
    } finally {
      setRegistering(false);
    }
  }

  useEffect(() => {
    saveToken(token);
  // 저장된 토큰을 로그인 회원에게 한 번만 연결한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, memberId, token]);

  useEffect(() => {
    const currentPermission = notificationPermission();
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
      setStatus(`이 브라우저의 알림 권한은 이미 허용되어 있습니다. 최초 허용: ${formatGrantedAt(grantedAt)}`);
    } else if (currentPermission === 'denied') {
      setStatus('브라우저에서 알림 권한을 차단했습니다. 사이트 설정에서 알림을 허용해 주세요.');
    } else if (currentPermission === 'unsupported') {
      setStatus('현재 브라우저에서는 웹 푸시 알림을 지원하지 않습니다.');
    } else {
      setStatus('아직 알림 권한을 허용하지 않았습니다.');
    }
  }, [grantedAt]);

  async function handleRegister() {
    setIssuing(true);
    trackAnalyticsEvent('push_permission_requested');
    try {
      const beforePermission = notificationPermission();
      const value = await requestFcmToken();
      const afterPermission = notificationPermission();

      if (afterPermission === 'granted' && beforePermission !== 'granted') {
        trackAnalyticsEvent('push_permission_granted');
        const now = new Date().toISOString();
        localStorage.setItem(FCM_GRANTED_AT_KEY, now);
        setGrantedAt(now);
      }

      const issuedAt = new Date().toISOString();
      localStorage.setItem(FCM_TOKEN_KEY, value);
      localStorage.setItem(FCM_TOKEN_ISSUED_AT_KEY, issuedAt);

      setPermission(afterPermission);
      setToken(value);
      setTokenIssuedAt(issuedAt);
      await saveToken(value);
    } catch (error) {
      setStatus(`실패: ${error.message}`);
    } finally {
      setIssuing(false);
    }
  }

  async function handlePublishTestPost() {
    if (!accessToken || !testTeamId) return;

    setPublishingTest(true);
    try {
      await publishNotificationTestPost(accessToken, testTeamId);
      trackAnalyticsEvent('admin_push_test_published');
      setStatus('테스트 게시물을 발행했습니다. 이 페이지를 열어 둔 상태에서 잠시 뒤 수신 메시지를 확인해 주세요.');
    } catch (error) {
      setStatus(`테스트 게시물 발행 실패: ${error.message}`);
    } finally {
      setPublishingTest(false);
    }
  }

  async function handleRemoveTestPosts() {
    if (!accessToken || !window.confirm('푸시 수신 확인용 테스트 게시물만 모두 삭제할까요? 실제 기자 게시물은 삭제되지 않습니다.')) {
      return;
    }

    setRemovingTests(true);
    try {
      const removed = await removeNotificationTestPosts(accessToken);
      trackAnalyticsEvent('admin_push_test_cleaned', { removed_count: removed || 0 });
      setStatus(`테스트 게시물 ${removed || 0}건을 정리했습니다.`);
    } catch (error) {
      setStatus(`테스트 게시물 정리 실패: ${error.message}`);
    } finally {
      setRemovingTests(false);
    }
  }

  return (
    <section className="fcm-test-panel" aria-label="FCM 테스트">
      <div>
        <p className="eyebrow">PUSH TEST</p>
        <h2>웹 푸시 수신 확인</h2>
        <p>이 브라우저를 계정에 연결합니다. 관심 팀의 새 소식이 등록되면 푸시 알림을 받습니다.</p>
      </div>
      <div className={`fcm-permission-state ${permission}`}>
        <span>{permission === 'granted' ? '알림 권한 허용됨' : permission === 'denied' ? '알림 권한 차단됨' : '알림 권한 요청 전'}</span>
        {permission === 'granted' && <time>최초 허용: {formatGrantedAt(grantedAt)}</time>}
        {token && <time>수신 준비: {formatGrantedAt(tokenIssuedAt)}</time>}
      </div>
      {!token && (
        <button
          type="button"
          className="account-primary"
          onClick={handleRegister}
          disabled={issuing || permission === 'denied' || permission === 'unsupported'}
        >
          {issuing ? '수신 준비 중...' : permission === 'granted' ? '푸시 수신 준비' : '알림 허용 및 수신 준비'}
        </button>
      )}
      <p role="status">{status}</p>
      {token && (
        <div className="fcm-test-actions">
          <span className="fcm-linked-state">{registering ? '계정에 연결 중...' : '이 기기의 푸시 수신 준비가 완료됐습니다.'}</span>
        </div>
      )}
      {isAdmin && token && (
        <div className="fcm-admin-test">
          <div>
            <strong>관리자 발송 점검</strong>
            <p>선택한 관심 팀에 테스트 게시물을 연결해 실제 푸시 발송 흐름을 확인합니다.</p>
          </div>
          {favoriteTeams.length ? (
            <div className="fcm-admin-test-actions">
              <select value={testTeamId} onChange={event => setTestTeamId(event.target.value)}>
                {favoriteTeams.map(team => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
              </select>
              <button type="button" className="account-primary" onClick={handlePublishTestPost} disabled={publishingTest}>
                {publishingTest ? '테스트 발행 중...' : '테스트 게시물 발행'}
              </button>
              <button type="button" className="fcm-cleanup-button" onClick={handleRemoveTestPosts} disabled={removingTests}>
                {removingTests ? '정리 중...' : '테스트 게시물 정리'}
              </button>
            </div>
          ) : <p>먼저 관심 팀을 하나 이상 추가해 주세요.</p>}
        </div>
      )}
    </section>
  );
}
