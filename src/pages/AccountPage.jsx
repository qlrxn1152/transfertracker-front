import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  addFavoriteTeams,
  deleteFavoriteTeam,
  getFollowedJournalistPosts,
  getFollowedJournalists,
  getFavoriteTeams,
  loginMember,
  signUpMember,
  unfollowJournalist
} from '../api/client';
import FcmTestPanel from '../components/FcmTestPanel';
import { trackAnalyticsEvent } from '../firebase/analytics';
import { POST_SOURCES } from '../constants';
import { logoUrl, teamDisplayName } from '../utils';
import './AccountPage.css';

export default function AccountPage({ mode, teams, session, onSessionChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [journalists, setJournalists] = useState([]);
  const [journalistPosts, setJournalistPosts] = useState([]);
  const [journalistLoading, setJournalistLoading] = useState(false);
  const returnTo = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/')
    ? location.state.returnTo
    : '/account';
  const authFlowState = location.state?.returnTo ? {
    returnTo,
    ...(location.state?.startFollow ? { startFollow: true, teamName: location.state.teamName } : {}),
    ...(typeof location.state?.followJournalist === 'string'
      ? { followJournalist: location.state.followJournalist, journalistName: location.state.journalistName }
      : {})
  } : undefined;

  useEffect(() => {
    if (mode !== 'account' || !session?.accessToken) return;

    const controller = new AbortController();
    getFavoriteTeams(session.accessToken, controller.signal)
      .then(data => {
        setFavorites(Array.isArray(data.teamDetails) ? data.teamDetails : []);
        setPosts(Array.isArray(data.postDetails) ? data.postDetails : []);
        setStatus('');
      })
      .catch(error => {
        if (error.name === 'AbortError') return;
        if (/401|403|인증|토큰/.test(error.message)) onSessionChange(null);
        setStatus(error.message || '관심팀을 불러오지 못했습니다.');
      });

    return () => controller.abort();
  }, [mode, onSessionChange, session?.accessToken]);

  useEffect(() => {
    if (mode !== 'account' || !session?.accessToken) return undefined;

    const controller = new AbortController();
    setJournalistLoading(true);

    Promise.all([
      getFollowedJournalists(session.accessToken, controller.signal),
      getFollowedJournalistPosts(session.accessToken, controller.signal)
    ])
      .then(([following, postsResponse]) => {
        const followed = Array.isArray(following?.memberFollowJournalists)
          ? following.memberFollowJournalists
          : [];
        const posts = Array.isArray(postsResponse?.allJournalistsPosts)
          ? postsResponse.allJournalistsPosts.flatMap(page => Array.isArray(page?.posts) ? page.posts : [])
          : [];

        setJournalists(followed);
        setJournalistPosts(posts.sort((a, b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0)));
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus(error.message || '팔로우한 기자 소식을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setJournalistLoading(false);
      });

    return () => controller.abort();
  }, [mode, session?.accessToken]);

  const availableTeams = useMemo(() => teams
    .filter(team => !favorites.some(favorite => String(favorite.teamId) === String(team.teamId)))
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b), 'ko')),
  [favorites, teams]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      if (mode === 'signup') {
        trackAnalyticsEvent('sign_up_submitted');
        await signUpMember({ loginId, password });
        trackAnalyticsEvent('sign_up_completed');
        setStatus('회원가입이 완료됐습니다. 로그인해 주세요.');
        setPassword('');
        return;
      }

      trackAnalyticsEvent('login_submitted');
      const nextSession = await loginMember({ loginId, password });
      trackAnalyticsEvent('login_completed');
      onSessionChange(nextSession);
      navigate(returnTo, { replace: true, state: authFlowState });
    } catch (error) {
      setStatus(error.message || '요청을 처리하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function addTeam() {
    if (!selectedTeamId || !session?.accessToken) return;
    setLoading(true);
    setStatus('');
    try {
      await addFavoriteTeams(session.accessToken, [Number(selectedTeamId)]);
      trackAnalyticsEvent('favorite_team_added');
      const data = await getFavoriteTeams(session.accessToken);
      setFavorites(Array.isArray(data.teamDetails) ? data.teamDetails : []);
      setPosts(Array.isArray(data.postDetails) ? data.postDetails : []);
      setSelectedTeamId('');
    } catch (error) {
      setStatus(error.message || '관심팀을 추가하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function removeTeam(teamId) {
    if (!session?.accessToken) return;
    setLoading(true);
    setStatus('');
    try {
      await deleteFavoriteTeam(session.accessToken, teamId);
      trackAnalyticsEvent('favorite_team_removed');
      setFavorites(current => current.filter(team => String(team.teamId) !== String(teamId)));
      setPosts(current => current.filter(post => String(post.teamId) !== String(teamId)));
    } catch (error) {
      setStatus(error.message || '관심팀을 삭제하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function removeJournalist(journalist) {
    if (!session?.accessToken) return;
    setLoading(true);
    setStatus('');
    try {
      await unfollowJournalist(session.accessToken, journalist);
      trackAnalyticsEvent('journalist_unfollowed');
      setJournalists(current => current.filter(item => item.journalist !== journalist));
      setJournalistPosts(current => current.filter(post => post.source !== journalist));
    } catch (error) {
      setStatus(error.message || '기자 팔로우를 해제하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function journalistProfile(value) {
    const code = typeof value === 'object' ? value?.journalist : value;
    const fallback = POST_SOURCES.find(source => source.code === code);

    return {
      ...(fallback || {
      code,
      name: String(code || '').replaceAll('_', ' '),
      initials: String(code || 'X').split('_').map(part => part[0]).join('').slice(0, 2)
      }),
      name: typeof value === 'object' && value?.displayName ? value.displayName : fallback?.name || String(code || '').replaceAll('_', ' ')
    };
  }

  if (mode === 'account') {
    if (!session) {
      return (
        <section className="account-page account-empty">
          <p className="eyebrow">MY TRANSFER DESK</p>
          <h1>로그인이 필요합니다.</h1>
          <Link className="account-primary" to="/login">로그인하기</Link>
        </section>
      );
    }

    return (
      <section className="account-page">
        <header className="account-hero">
          <p className="eyebrow">MY TRANSFER DESK</p>
          <h1>{session.loginId}님의 관심 팀</h1>
          <p>관심 팀의 관련 기자 소식을 한곳에서 확인합니다. <span className="account-grade">{session.memberGrade || 'USER'}</span></p>
        </header>

        <section className="account-card">
          <div className="account-card-head">
            <div><h2>관심 팀 추가</h2><p>팀을 선택하면 내 소식 목록에 반영됩니다.</p></div>
          </div>
          <div className="account-add-row">
            <select value={selectedTeamId} onChange={event => setSelectedTeamId(event.target.value)}>
              <option value="">팀 선택</option>
              {availableTeams.map(team => <option key={team.teamId} value={team.teamId}>{teamDisplayName(team)}</option>)}
            </select>
            <button type="button" className="account-primary" disabled={!selectedTeamId || loading} onClick={addTeam}>추가</button>
          </div>
        </section>

        <section className="account-card">
          <div className="account-card-head"><div><h2>내 팀</h2><p>{favorites.length}개 팀을 구독 중입니다.</p></div></div>
          <div className="account-team-grid">
            {favorites.map(team => (
              <article key={team.teamId} className="account-team">
                <Link to={`/teams/${team.teamId}`}>
                  <span>{team.teamName?.slice(0, 1)}{logoUrl(team.logoUrl) && <img src={team.logoUrl} alt="" referrerPolicy="no-referrer" />}</span>
                  <strong>{team.teamName}</strong>
                </Link>
                <button type="button" disabled={loading} onClick={() => removeTeam(team.teamId)} aria-label={`${team.teamName} 관심팀 해제`}>해제</button>
              </article>
            ))}
            {!favorites.length && <p className="account-muted">아직 관심 팀이 없습니다.</p>}
          </div>
        </section>

        <section className="account-card">
          <div className="account-card-head"><div><h2>내 팀 최신 소식</h2><p>관심 팀과 연결된 최신 기자 게시물입니다.</p></div></div>
          <div className="account-post-list">
            {posts.map(post => {
              const relatedTeam = favorites.find(team => String(team.teamId) === String(post.teamId))
                || teams.find(team => String(team.teamId) === String(post.teamId));
              const relatedTeamName = relatedTeam?.teamName || post.teamName || '관련 팀';

              return (
                <Link key={`${post.teamId}-${post.postId}`} to={`/posts?teamId=${post.teamId}`}>
                  <strong>{post.postContent}</strong>
                  <span className="account-post-related">
                    <span className="account-post-team-logo" aria-hidden="true">
                      {relatedTeamName.slice(0, 1)}
                      {logoUrl(relatedTeam?.logoUrl) && <img src={relatedTeam.logoUrl} alt="" referrerPolicy="no-referrer" />}
                    </span>
                    <span>{relatedTeamName}</span>
                    {post.sourcer && <small>{String(post.sourcer).replaceAll('_', ' ')}</small>}
                  </span>
                </Link>
              );
            })}
            {!posts.length && <p className="account-muted">표시할 새 소식이 없습니다.</p>}
          </div>
        </section>

        <section className="account-card">
          <div className="account-card-head">
            <div>
              <h2>팔로우한 기자</h2>
              <p>팔로우한 기자가 새 게시물을 등록하면 이 브라우저로 알림을 보냅니다.</p>
            </div>
            <Link className="account-inline-link" to="/posts">기자 찾기 →</Link>
          </div>
          <div className="account-journalist-grid">
            {journalists.map(item => {
              const profile = journalistProfile(item);
              return (
                <article key={item.journalist} className="account-journalist">
                  <span>{profile.initials}</span>
                  <strong>{profile.name}</strong>
                  <button type="button" disabled={loading} onClick={() => removeJournalist(item.journalist)}>해제</button>
                </article>
              );
            })}
            {!journalistLoading && !journalists.length && <p className="account-muted">아직 팔로우한 기자가 없습니다.</p>}
          </div>
        </section>

        <section className="account-card">
          <div className="account-card-head">
            <div><h2>팔로우 기자 최신 소식</h2><p>구독 중인 기자들의 최근 게시물을 모아봅니다.</p></div>
            <Link className="account-inline-link" to="/posts">전체 기자 소식 →</Link>
          </div>
          <div className="account-post-list">
            {journalistPosts.slice(0, 12).map(post => {
              const profile = journalistProfile(post.source);
              return (
                <Link key={`${post.source}-${post.postId}`} to="/posts">
                  <strong>{post.translatedContent || post.content || '내용이 없습니다.'}</strong>
                  <span className="account-post-related">
                    <span className="account-post-team-logo" aria-hidden="true">{profile.initials}</span>
                    <span>{profile.name}</span>
                    <small>팔로우 중</small>
                  </span>
                </Link>
              );
            })}
            {!journalistLoading && !journalistPosts.length && <p className="account-muted">팔로우한 기자의 새 소식이 없습니다.</p>}
            {journalistLoading && <p className="account-muted">팔로우한 기자 소식을 불러오는 중입니다.</p>}
          </div>
        </section>
        <FcmTestPanel
          accessToken={session.accessToken}
          memberId={session.memberId}
          isAdmin={session.memberGrade === 'ADMIN'}
          favoriteTeams={favorites}
        />
        {status && <p className="account-status" role="status">{status}</p>}
      </section>
    );
  }

  const isSignup = mode === 'signup';
  return (
    <section className="account-page account-auth">
      <p className="eyebrow">TRANSFERTRACKER ACCOUNT</p>
      <h1>{isSignup ? '회원가입' : '로그인'}</h1>
      <p>{isSignup ? '관심 팀과 관련 소식을 나만의 목록으로 관리하세요.' : '관심 팀과 내 소식 목록을 이어서 확인하세요.'}</p>
      <form className="account-form" onSubmit={submit}>
        <label>아이디<input value={loginId} onChange={event => setLoginId(event.target.value)} autoComplete="username" required /></label>
        <label>비밀번호<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} required /></label>
        <button className="account-primary" disabled={loading} type="submit">{loading ? '처리 중...' : isSignup ? '회원가입' : '로그인'}</button>
      </form>
      {status && <p className="account-status" role="status">{status}</p>}
      <p className="account-switch">{isSignup ? '이미 계정이 있나요?' : '아직 계정이 없나요?'} <Link to={isSignup ? '/login' : '/signup'} state={authFlowState}>{isSignup ? '로그인' : '회원가입'}</Link></p>
    </section>
  );
}
