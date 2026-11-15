import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readSavedSearches, removeSavedSearch, saveSearch } from '../utils/clientStore';

export default function SavedSearches({ scope, label, path, disabled = false }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => readSavedSearches(scope));

  useEffect(() => {
    const refresh = () => setSaved(readSavedSearches(scope));
    window.addEventListener('veyro-client-store', refresh);
    return () => window.removeEventListener('veyro-client-store', refresh);
  }, [scope]);

  function add() {
    if (disabled) return;
    saveSearch(scope, { label, path });
    setSaved(readSavedSearches(scope));
  }

  return (
    <div className="saved-searches">
      <button className="saved-search-add" type="button" onClick={add} disabled={disabled}>현재 검색 저장</button>
      {!!saved.length && (
        <div className="saved-search-list" aria-label="저장한 검색">
          {saved.map(item => (
            <span key={item.path}>
              <button type="button" onClick={() => navigate(item.path)}>{item.label}</button>
              <button type="button" onClick={() => removeSavedSearch(scope, item.path)} aria-label={`${item.label} 삭제`}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
