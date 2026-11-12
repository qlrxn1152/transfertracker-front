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

// notification(title/body) 메시지는 Firebase SDK에서 백그라운드 표시를 처리합니다.
// 필요 시 추후 onBackgroundMessage()로 별도 처리할 수 있습니다.
firebase.messaging();
