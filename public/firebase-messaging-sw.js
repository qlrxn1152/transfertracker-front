/*
 * FCM 전용 Service Worker (classic script).
 * 주의: 아래 firebaseConfig의 YOUR_* 값을 Firebase 웹 앱 설정값으로 변경하세요.
 * 서비스 계정 JSON 또는 개인키를 이 파일에 넣으면 안 됩니다.
 * 이 파일은 기존 /sw.js(PWA)와 다른 scope('/fcm-push/')로 등록됩니다.
 */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDQYbjSVW-E4KpGnQvoqF9PZh2AHlqY0qw',
  authDomain: 'transfertracker-369f4.firebaseapp.com',
  projectId: 'transfertracker-369f4',
  messagingSenderId: '352590126652',
  appId: '1:352590126652:web:8431bc0a95e5e734ec6d39',
});

const messaging = firebase.messaging();

// 백그라운드 알림에도 게시물 PK를 함께 보관해, 알림을 누르면 바로 해당 게시물로 이동한다.
messaging.onBackgroundMessage((payload) => {
  const postId = payload.data?.postId || payload.data?.post_id || '';
  return self.registration.showNotification(payload.notification?.title || 'VEYRO', {
    body: payload.notification?.body || '새 게시물이 등록됐습니다.',
    data: { postId },
    tag: postId ? `post-${postId}` : undefined,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const postId = event.notification.data?.postId;
  const url = new URL(postId ? `/posts/${postId}` : '/', self.location.origin).href;

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus().then(() => existing.navigate(url));
    return clients.openWindow(url);
  }));
});
