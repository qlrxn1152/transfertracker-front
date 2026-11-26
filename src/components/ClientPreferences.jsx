import { useEffect, useRef, useState } from 'react';
import { readPreferences, savePreferences } from '../utils/clientStore';

const DEFAULTS = { density: 'comfortable', textSize: 'standard', reduceMotion: false };

function applyPreferences(value) {
  const root = document.documentElement;
  root.dataset.veyroDensity = value.density;
  root.dataset.veyroText = value.textSize;
  root.dataset.veyroMotion = String(value.reduceMotion);
}

export default function ClientPreferences() {
  const dialogRef = useRef(null);
  const [preferences, setPreferences] = useState(() => ({ ...DEFAULTS, ...readPreferences() }));

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const openFromMenu = () => dialogRef.current?.showModal();
    window.addEventListener('veyro:open-preferences', openFromMenu);
    return () => window.removeEventListener('veyro:open-preferences', openFromMenu);
  }, []);

  function open() {
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button className="app-preferences-button" type="button" onClick={open}>보기 설정</button>
      <dialog className="client-preferences-dialog" ref={dialogRef} onClick={event => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}>
        <form method="dialog">
          <div className="client-preferences-head">
            <div><p className="eyebrow">PERSONAL VIEW</p><h2>보기 설정</h2></div>
            <button aria-label="보기 설정 닫기">×</button>
          </div>
          <p className="client-preferences-copy">이 설정은 현재 브라우저에만 저장됩니다.</p>
          <fieldset>
            <legend>화면 밀도</legend>
            {['comfortable', 'compact'].map(value => <label key={value}><input type="radio" name="density" checked={preferences.density === value} onChange={() => setPreferences(current => ({ ...current, density: value }))} />{value === 'comfortable' ? '여유 있게' : '조밀하게'}</label>)}
          </fieldset>
          <fieldset>
            <legend>글자 크기</legend>
            {['standard', 'large'].map(value => <label key={value}><input type="radio" name="text-size" checked={preferences.textSize === value} onChange={() => setPreferences(current => ({ ...current, textSize: value }))} />{value === 'standard' ? '기본' : '크게'}</label>)}
          </fieldset>
          <label className="client-preferences-toggle"><input type="checkbox" checked={preferences.reduceMotion} onChange={event => setPreferences(current => ({ ...current, reduceMotion: event.target.checked }))} />움직임 줄이기</label>
        </form>
      </dialog>
    </>
  );
}
