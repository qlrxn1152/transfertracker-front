import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';
import GlobalSearch from './GlobalSearch';
import ClientPreferences from './ClientPreferences';

const navClass = ({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`;

export default function Layout({ sample, teams, onPlayerOpen, session, onLogout }) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink className="app-brand" to="/" aria-label="VEYRO 홈">
            <span className="app-brand-mark" aria-hidden="true"><i /><i /></span>
            <span className="app-brand-word">VEYRO</span>
            <small>TRANSFER INTELLIGENCE</small>
          </NavLink>

          <GlobalSearch sample={sample} teams={teams} onPlayerOpen={onPlayerOpen} />

          <nav className="app-nav" aria-label="주요 메뉴">
            <NavLink end className={navClass} to="/">홈</NavLink>
            <NavLink className={navClass} to="/transfers">이적 현황</NavLink>
            <NavLink className={navClass} to="/posts">기자 소식</NavLink>
            <NavLink className={navClass} to="/teams">팀</NavLink>
            <NavLink className={navClass} to="/players">선수</NavLink>
            {session && <NavLink className={navClass} to="/account">내 팀</NavLink>}
          </nav>

          <div className="app-header-actions">
            <ClientPreferences />
            {session ? (
              <>
                <NavLink className="app-account-link" to="/account">
                  <span className="app-account-label">내 이적 데스크</span>
                  <strong>{session.loginId}</strong>
                </NavLink>
                <button className="app-logout-button" type="button" onClick={onLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <NavLink className="app-account-link" to="/login">로그인</NavLink>
                <NavLink className="app-join-button" to="/signup">회원가입</NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      {sample && (
        <div className="app-sample-banner">
          <strong>샘플 데이터</strong>
          실제 백엔드 응답이 아닌 화면 확인용 데이터입니다.
        </div>
      )}

      <main className="container app-main">
        <Outlet />
        <footer className="app-footer">
          <span><b>VEYRO</b> · TransferTracker</span>
          <span>Football. Beyond the Game.</span>
        </footer>
      </main>
    </>
  );
}
