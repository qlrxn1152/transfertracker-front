import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const capture = event => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);

  if (dismissed || standalone || (!installEvent && !ios)) return null;

  async function install() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <section className="pwa-install-prompt">
      <div><p className="eyebrow">QUICK ACCESS</p><h2>VEYRO를 홈 화면에 추가하세요</h2><p>{ios ? '공유 버튼에서 “홈 화면에 추가”를 선택하면 앱처럼 바로 열 수 있어요.' : '자주 확인하는 이적 소식을 앱처럼 한 번에 열 수 있어요.'}</p></div>
      <div>{ios ? <span>Safari 공유 → 홈 화면에 추가</span> : <button type="button" onClick={install}>홈 화면에 추가</button>}<button className="pwa-dismiss" type="button" onClick={() => setDismissed(true)}>나중에</button></div>
    </section>
  );
}
