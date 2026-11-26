import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function openClientTool(name) {
  window.dispatchEvent(new Event(name));
}

export default function AppMenu({ session, onLogout }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <button
        className={`app-menu-trigger ${open ? 'active' : ''}`}
        type="button"
        aria-expanded={open}
        aria-controls="veyro-app-menu"
        onClick={() => setOpen(current => !current)}
      >
        <span className="app-nav-icon" aria-hidden="true">☰</span>
        <span>더보기</span>
      </button>

      {open && <button className="app-menu-backdrop" type="button" aria-label="더보기 메뉴 닫기" onClick={close} />}

      {open && (
        <aside className="app-menu" id="veyro-app-menu" aria-label="더보기 메뉴">
          <div className="app-menu-head">
            <div><p className="eyebrow">VEYRO MENU</p><h2>더보기</h2></div>
            <button type="button" aria-label="더보기 메뉴 닫기" onClick={close}>×</button>
          </div>

          {session && (
            <section>
              <p className="app-menu-label">내 관심</p>
              <div className="app-menu-shortcuts">
                <Link to="/account#favorite-teams" onClick={close}><b>♥</b><span>관심 팀</span></Link>
                <Link to="/account#favorite-players" onClick={close}><b>★</b><span>관심 선수</span></Link>
                <Link to="/account#followed-journalists" onClick={close}><b>◎</b><span>팔로우 기자</span></Link>
              </div>
            </section>
          )}

          <section className="app-menu-section">
            <p className="app-menu-label">내 VEYRO</p>
            {session ? (
              <>
                <Link className="app-menu-row" to="/account" onClick={close}><span>♥</span><b>내 관심 전체 보기</b><i>›</i></Link>
                <button className="app-menu-row" type="button" onClick={() => { close(); onLogout(); }}><span>↪</span><b>로그아웃</b><i>›</i></button>
              </>
            ) : (
              <>
                <Link className="app-menu-row" to="/login" onClick={close}><span>↪</span><b>로그인하고 관심 목록 보기</b><i>›</i></Link>
                <Link className="app-menu-row" to="/signup" onClick={close}><span>＋</span><b>회원가입</b><i>›</i></Link>
              </>
            )}
          </section>

          <section className="app-menu-section">
            <p className="app-menu-label">환경</p>
            <button className="app-menu-row" type="button" onClick={() => { close(); openClientTool('veyro:open-preferences'); }}><span>◉</span><b>보기 설정</b><i>›</i></button>
            <button className="app-menu-row" type="button" onClick={() => { close(); openClientTool('veyro:open-shortcuts'); }}><span>⌨</span><b>키보드 단축키</b><i>›</i></button>
          </section>
        </aside>
      )}
    </>
  );
}
