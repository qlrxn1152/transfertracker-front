import { initializeAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { firebaseApp } from './config';

let analyticsPromise;

async function getSupportedAnalytics() {
  // measurementId가 아직 배포 환경에 없다면 분석 기능만 조용히 비활성화합니다.
  // FCM, 로그인, 일반 화면 동작에는 영향을 주지 않습니다.
  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) return null;

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      // React Router의 화면 전환을 직접 기록하므로 SDK의 최초 자동 page_view는 끕니다.
      .then(supported => supported ? initializeAnalytics(firebaseApp, {
        config: { send_page_view: false }
      }) : null)
      .catch(() => null);
  }

  return analyticsPromise;
}

/**
 * Firebase Analytics에 개인 식별 정보 없이 사용자 행동만 기록합니다.
 * 이벤트 이름은 GA4 대시보드에서 그대로 검색할 수 있습니다.
 */
export function trackAnalyticsEvent(name, parameters = {}) {
  getSupportedAnalytics().then(analytics => {
    if (analytics) logEvent(analytics, name, parameters);
  });
}

export function trackPageView({ path, pageName }) {
  trackAnalyticsEvent('page_view', {
    page_location: `${window.location.origin}${path}`,
    page_path: path,
    page_title: document.title,
    page_name: pageName
  });
}
