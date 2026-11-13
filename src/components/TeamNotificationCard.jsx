import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addFavoriteTeams,
  getFavoriteTeams,
  registerFcmToken
} from '../api/client';
import { requestFcmToken } from '../firebase/messaging';
import { trackAnalyticsEvent } from '../firebase/analytics';

const FCM_TOKEN_KEY = 'transfertracker.fcm-test-token';
const FCM_TOKEN_ISSUED_AT_KEY = 'transfertracker.fcm-token-issued-at';
const FCM_GRANTED_AT_KEY = 'transfertracker.fcm-permission-granted-at';

function permissionLabel() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

function registrationKey(memberId) {
  return `transfertracker.fcm-registered-for.${memberId}`;
}

export default function TeamNotificationCard({ team, session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(Boolean(session?.accessToken));
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');
  const returnedFromLogin = Boolean(location.state?.startFollow);
  const teamName = team.teamNameKo || team.teamName || '이 팀';

  useEffect(() => {
    if (!session?.accessToken || !team?.teamId) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    getFavoriteTeams(session.accessToken, controller.signal)
      .then(data => {
        const favorites = Array.isArray(data.teamDetails) ? data.teamDetails : [];
        setFollowing(favorites.some(item => String(item.teamId) === String(team.teamId)));
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus('관심 팀 상태를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [session?.accessToken, team?.teamId]);

  function openLogin() {
    trackAnalyticsEvent('team_follow_login_prompt_clicked', { team_id: String(team.teamId) });
    navigate('/login', {
      state: {
        returnTo: `${location.pathname}${location.search}`,
        startFollow: true,
        teamName
      }
    });
  }

  async function registerForPush(token) {
    if (!session?.accessToken || !session.memberId || !token) return;

    const key = registrationKey(session.memberId);
    if (localStorage.getItem(key) === token) return;

    await registerFcmToken(session.accessToken, token);
    localStorage.setItem(key, token);
  }

  async function followAndEnablePush() {
    if (!session?.accessToken) {
      openLogin();
      return;
    }

    setWorking(true);
    setStatus('');

    try {
      if (!following) {
        await addFavoriteTeams(session.accessToken, [Number(team.teamId)]);
        setFollowing(true);
        trackAnalyticsEvent('team_follow_added_from_detail', { team_id: String(team.teamId) });
      }

      const beforePermission = permissionLabel();
      if (beforePermission === 'denied') {
        setStatus('관심 팀으로 등록했습니다. 알림은 브라우저 사이트 설정에서 허용하면 받을 수 있습니다.');
        return;
      }

      const token = await requestFcmToken();
      const afterPermission = permissionLabel();
      const now = new Date().toISOString();
      localStorage.setItem(FCM_TOKEN_KEY, token);
      localStorage.setItem(FCM_TOKEN_ISSUED_AT_KEY, now);
      if (afterPermission === 'granted' && beforePermission !== 'granted') {
        localStorage.setItem(FCM_GRANTED_AT_KEY, now);
        trackAnalyticsEvent('push_permission_granted_from_team', { team_id: String(team.teamId) });
      }

      await registerForPush(token);
      trackAnalyticsEvent('team_push_subscription_ready', { team_id: String(team.teamId) });
      setStatus(`${teamName}을(를) 관심 팀으로 등록했고, 이 브라우저의 알림 수신도 준비했습니다.`);
    } catch (error) {
      setStatus(`관심 팀은 등록됐지만 알림 준비에 실패했습니다. ${error.message || ''}`.trim());
    } finally {
      setWorking(false);
    }
  }

  if (!session) {
    return (
      <section className="team-notification-card team-notification-guest">
        <div>
          <p className="eyebrow">TEAM ALERT</p>
          <h2>{teamName}의 새 소식 알림</h2>
          <p>새 이적·기자 소식이 등록되면 바로 받아보세요. 관심 팀과 알림은 로그인 후 저장됩니다.</p>
        </div>
        <button type="button" className="team-notification-action" onClick={openLogin}>
          로그인하고 알림 받기 →
        </button>
      </section>
    );
  }

  return (
    <section className={`team-notification-card ${returnedFromLogin ? 'is-returned' : ''}`}>
      <div>
        <p className="eyebrow">TEAM ALERT</p>
        <h2>{teamName}의 새 소식 알림</h2>
        <p>{returnedFromLogin
          ? '로그인됐습니다. 관심 팀 등록과 알림 설정을 이어가세요.'
          : following
            ? '관심 팀으로 등록되어 있습니다. 이 브라우저에서 새 소식 알림을 받을 수 있어요.'
            : '관심 팀으로 등록하면 관련 기자 소식을 내 팀에서 모아볼 수 있어요.'}</p>
      </div>
      <div className="team-notification-actions">
        <span className={following ? 'is-following' : ''}>{loading ? '확인 중...' : following ? '관심 팀 등록됨' : '관심 팀 미등록'}</span>
        <button
          type="button"
          className="team-notification-action"
          onClick={followAndEnablePush}
          disabled={loading || working}
          autoFocus={returnedFromLogin}
        >
          {working ? '설정 중...' : following ? '이 브라우저에서 알림 받기' : '관심 팀 등록하고 알림 받기'}
        </button>
      </div>
      {status && <p className="team-notification-status" role="status">{status}</p>}
    </section>
  );
}
