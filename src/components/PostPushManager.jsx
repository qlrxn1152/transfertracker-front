import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerFcmToken } from '../api/client';
import { listenForForegroundMessages } from '../firebase/messaging';

const FCM_TOKEN_KEY = 'transfertracker.fcm-test-token';

function registrationKey(memberId) {
  return `transfertracker.fcm-registered-for.${memberId}`;
}

function postIdFrom(payload) {
  const value = payload?.data?.postId ?? payload?.data?.post_id;
  return value && String(value).trim() ? String(value) : '';
}

/**
 * 로그인 이후 앱 전역에서 FCM을 수신합니다.
 * 권한 요청은 사용자가 내 정보 화면에서 직접 실행할 때만 수행합니다.
 */
export default function PostPushManager({ session }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!session?.accessToken || !session?.memberId) return undefined;

    const token = localStorage.getItem(FCM_TOKEN_KEY);
    const key = registrationKey(session.memberId);
    if (token && localStorage.getItem(key) !== token) {
      registerFcmToken(session.accessToken, token)
        .then(() => localStorage.setItem(key, token))
        .catch(() => {
          // 네트워크가 복구되면 다음 앱 진입 때 다시 연결한다.
        });
    }

    let unsubscribe = () => {};
    let disposed = false;

    listenForForegroundMessages((payload) => {
      const postId = postIdFrom(payload);
      const title = payload?.notification?.title || 'VEYRO';
      const body = payload?.notification?.body || '새 게시물이 등록됐습니다.';

      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const notification = new Notification(title, {
        body,
        data: { postId },
        tag: postId ? `post-${postId}` : undefined,
      });

      notification.onclick = () => {
        window.focus();
        if (postId) navigate(`/posts/${postId}`);
        notification.close();
      };
    }).then((stop) => {
      if (disposed) stop();
      else unsubscribe = stop;
    }).catch(() => {
      // Messaging을 지원하지 않는 브라우저에서는 앱의 나머지 기능을 그대로 제공한다.
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [navigate, session?.accessToken, session?.memberId]);

  return null;
}
