import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';
import GlobalSearch from './GlobalSearch';

const navClass = ({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`;

export default function Layout({ sample, teams, onPlayerOpen, onToggleSample, connection }) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink className="app-brand" to="/" aria-label="TransferTracker 홈">
            <span>Transfer</span><strong>Tracker</strong>
          </NavLink>

          <GlobalSearch sample={sample} teams={teams} onPlayerOpen={onPlayerOpen} />

          <nav className="app-nav" aria-label="주요 메뉴">
            <NavLink end className={navClass} to="/">홈</NavLink>
            <NavLink className={navClass} to="/transfers">이적 현황</NavLink>
            <NavLink className={navClass} to="/posts">기자 소식</NavLink>
            <NavLink className={navClass} to="/teams">팀</NavLink>
            <NavLink className={navClass} to="/players">선수</NavLink>
          </nav>

          <div className="app-header-actions">
            <span className={`app-connection ${connection.state || ''}`} role="status">
              <i /> {connection.message}
            </span>
            <button className="app-mode-button" type="button" onClick={onToggleSample}>
              {sample ? '실제 데이터' : '샘플'}
            </button>
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
          <span>TransferTracker</span>
          <span>Football transfer intelligence.</span>
        </footer>
      </main>
    </>
  );
}
