import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';
import GlobalSearch from './GlobalSearch';
import ClientPreferences from './ClientPreferences';
import KeyboardShortcuts from './KeyboardShortcuts';
import AppMenu from './AppMenu';

const navClass = ({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`;

function NavItem({ to, children, icon, end = false, className = '' }) {
  return (
    <NavLink end={end} className={({ isActive }) => `${navClass({ isActive })} ${className}`.trim()} to={to}>
      <span className="app-nav-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}

export default function Layout({ sample, teams, onPlayerOpen, session, onLogout }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <aside className="app-sidebar" aria-label="VEYRO 주요 메뉴">
        <NavLink className="app-brand" to="/" aria-label="VEYRO 홈">
          <span className="app-brand-mark" aria-hidden="true"><i /><i /></span>
          <span className="app-brand-word">VEYRO</span>
        </NavLink>
        <nav className="app-nav app-side-nav" aria-label="주요 메뉴">
          <NavItem end to="/" icon="⌂">홈</NavItem>
          <NavItem to="/posts" icon="↔">이적 소식</NavItem>
          <NavItem to="/transfers" icon="✓">공식 이적 기록</NavItem>
          <NavItem to="/fixtures" icon="♜">경기</NavItem>
          <NavItem to="/leagues" icon="▦">리그</NavItem>
          <NavItem to="/teams" icon="◇">팀</NavItem>
          <NavItem to="/players" icon="♙">선수</NavItem>
          <NavItem to="/account#favorite-teams" icon="☆">관심</NavItem>
        </nav>
        <div className="app-side-account">
          {session ? (
            <NavLink to="/account"><small>MY VEYRO</small><strong>{session.loginId}</strong></NavLink>
          ) : (
            <NavLink to="/login"><small>MY VEYRO</small><strong>로그인</strong></NavLink>
          )}
        </div>
      </aside>

      <header className="app-header">
        <div className="app-header-inner">
          <NavLink className="app-mobile-brand" to="/" aria-label="VEYRO 홈">VEYRO</NavLink>
          <GlobalSearch sample={sample} teams={teams} onPlayerOpen={onPlayerOpen} />
          <div className="app-header-actions">
            <ClientPreferences />
            {session ? <NavLink className="app-account-link" to="/account">{session.loginId}</NavLink> : <NavLink className="app-account-link" to="/login">로그인</NavLink>}
            <AppMenu session={session} onLogout={onLogout} />
          </div>
        </div>
      </header>

      {sample && (
        <div className="app-sample-banner">
          <strong>샘플 데이터</strong>
          실제 백엔드 응답이 아닌 화면 확인용 데이터입니다.
        </div>
      )}

      <main id="main-content" className="container app-main" tabIndex="-1">
        <Outlet />
        <footer className="app-footer">
          <span><b>VEYRO</b> · TransferTracker</span>
          <span>Football. Beyond the Game.</span>
        </footer>
      </main>
      <nav className="app-mobile-nav" aria-label="모바일 주요 메뉴">
        <NavItem end to="/" icon="⌂">홈</NavItem>
        <NavItem to="/posts" icon="↔">이적</NavItem>
        <NavItem to="/fixtures" icon="♜">경기</NavItem>
        <NavItem to="/leagues" icon="▦">리그</NavItem>
        <NavItem to="/account#favorite-teams" icon="☆">관심</NavItem>
        <NavItem to="/account" icon="♙">MY</NavItem>
      </nav>
      <KeyboardShortcuts />
    </div>
  );
}
