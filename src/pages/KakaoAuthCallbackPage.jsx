import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackAnalyticsEvent } from '../firebase/analytics';
import './AccountPage.css';

const RETURN_STATE_KEY = 'transfertracker.kakao.return-state';

function readReturnState() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RETURN_STATE_KEY) || 'null');
    sessionStorage.removeItem(RETURN_STATE_KEY);
    return value && typeof value.returnTo === 'string' && value.returnTo.startsWith('/')
      ? value
      : { returnTo: '/account', state: undefined };
  } catch {
    return { returnTo: '/account', state: undefined };
  }
}

export default function KakaoAuthCallbackPage({ onSessionChange }) {
  const navigate = useNavigate();
  const handled = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const values = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = values.get('accessToken');
    const memberId = Number(values.get('memberId'));
    const loginId = values.get('loginId');
    const memberGrade = values.get('memberGrade') || 'USER';

    if (!accessToken || !Number.isSafeInteger(memberId) || memberId < 1 || !loginId) {
      setError('카카오 로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
      return;
    }

    const returnState = readReturnState();
    onSessionChange({ accessToken, memberId, loginId, memberGrade });
    trackAnalyticsEvent('kakao_login_completed');
    navigate(returnState.returnTo, { replace: true, state: returnState.state });
  }, [navigate, onSessionChange]);

  return (
    <section className="account-page account-auth kakao-callback">
      <p className="eyebrow">KAKAO LOGIN</p>
      <h1>{error ? '로그인을 완료하지 못했습니다.' : '카카오 로그인 처리 중'}</h1>
      <p>{error || '안전하게 계정을 연결하고 있습니다.'}</p>
      {error && <Link className="account-primary" to="/login">로그인으로 돌아가기</Link>}
    </section>
  );
}
