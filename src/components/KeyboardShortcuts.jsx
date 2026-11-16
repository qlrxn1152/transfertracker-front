import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const shortcuts = [
  ['g, h', '홈으로 이동'],
  ['g, t', '이적 현황으로 이동'],
  ['g, j', '기자 소식으로 이동'],
  ['g, c', '팀 목록으로 이동'],
  ['g, p', '선수 목록으로 이동'],
  ['/', '전체 검색'],
  ['?', '단축키 안내 열기']
];

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pending = false;
    const handler = event => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') { setOpen(false); pending = false; return; }
      if (event.key === '?') { event.preventDefault(); setOpen(current => !current); return; }
      if (pending) {
        const routes = { h: '/', t: '/transfers', j: '/posts', c: '/teams', p: '/players' };
        if (routes[event.key.toLowerCase()]) {
          event.preventDefault();
          navigate(routes[event.key.toLowerCase()]);
        }
        pending = false;
        return;
      }
      if (event.key.toLowerCase() === 'g') pending = true;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  if (!open) return null;
  return <dialog className="keyboard-shortcuts" open onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}><div><div className="keyboard-shortcuts-head"><div><p className="eyebrow">QUICK NAVIGATION</p><h2>키보드 단축키</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="단축키 안내 닫기">×</button></div><ul>{shortcuts.map(([key, label]) => <li key={key}><kbd>{key}</kbd><span>{label}</span></li>)}</ul></div></dialog>;
}
