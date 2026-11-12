import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { firebaseApp } from './config';

/**
 * 브라우저에서 알림 권한을 요청하고 FCM 등록 토큰을 발급합니다.
 * 기존 PWA Service Worker(/sw.js)와 별도로 FCM 전용 Worker를 등록합니다.
 */
export async function requestFcmToken() {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('Notification' in window)) {
    throw new Error('FCM 웹 푸시는 HTTPS 또는 localhost의 지원 브라우저에서 사용할 수 있습니다.');
  }
  if (!(await isSupported())) {
    throw new Error('현재 브라우저에서는 Firebase Messaging이 지원되지 않습니다.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 허용되지 않았습니다.');
  }

  const workerRegistration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/fcm-push/' },
  );

  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: workerRegistration,
  });

  if (!token) {
    throw new Error('FCM 등록 토큰이 발급되지 않았습니다.');
  }
  return token;
}

/** 포그라운드 메시지 수신을 등록하고 구독 해제 함수를 반환합니다. */
export async function listenForForegroundMessages(handler) {
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(firebaseApp), handler);
}
