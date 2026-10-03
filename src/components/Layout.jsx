import { NavLink, Outlet } from 'react-router-dom';

const navClass = ({ isActive }) => `nav-item ${isActive ? 'active' : ''}`;

export default function Layout({ sample, onToggleSample, connection }) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand" to="/" aria-label="Transfer Tracker 홈">
            <span className="brand-icon">↗</span>transfer<span>tracker</span>
          </NavLink>
          <div className="header-actions">
            <span className={`connection ${connection.state || ''}`} role="status">
              <i /> {connection.message}
            </span>
            <button className="mode-button" type="button" onClick={onToggleSample}>
              {sample ? '실제 데이터 보기' : '샘플 보기'}
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <div className="intro-icon" aria-hidden="true">⚽</div>
          <p className="eyebrow">FOOTBALL TRANSFER DESK</p>
          <h1>축구의 다음 장면을 보다.</h1>
          <p className="intro-sub">선수의 새로운 출발과 클럽의 움직임을 한곳에서 확인하세요.</p>
        </section>

        <nav className="tabs" aria-label="메뉴">
          <NavLink end className={navClass} to="/">↗ <span>이적 현황</span></NavLink>
          <NavLink className={navClass} to="/posts">▤ <span>기자 소식</span></NavLink>
          <NavLink className={navClass} to="/teams">◇ <span>클럽 목록</span></NavLink>
          <NavLink className={navClass} to="/players">⌕ <span>선수 조회</span></NavLink>
        </nav>

        {sample && (
          <div className="sample-banner">
            <strong>샘플 데이터</strong> 화면 확인용 예시입니다. 실제 백엔드 응답이 아닙니다.
          </div>
        )}

        <Outlet />

        <footer>
          transfertracker <span>Made for the love of football.</span>
        </footer>
      </main>
    </>
  );
}
