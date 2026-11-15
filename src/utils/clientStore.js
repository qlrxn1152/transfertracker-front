const PREFIX = 'veyro.client.';
const LIMIT = 120;

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(`${PREFIX}${key}`) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    window.dispatchEvent(new Event('veyro-client-store'));
  } catch {
    // 브라우저 저장소가 막혀 있어도 기본 탐색 기능은 계속 사용할 수 있다.
  }
}

export function readBookmarks() {
  const value = read('bookmarks', []);
  return Array.isArray(value) ? value : [];
}

export function isBookmarked(key) {
  return readBookmarks().some(item => item.key === key);
}

export function toggleBookmark(item) {
  const current = readBookmarks();
  const exists = current.some(bookmark => bookmark.key === item.key);
  const next = exists
    ? current.filter(bookmark => bookmark.key !== item.key)
    : [{ ...item, savedAt: new Date().toISOString() }, ...current].slice(0, LIMIT);

  write('bookmarks', next);
  return !exists;
}

export function readPosts() {
  const value = read('read-posts', []);
  return Array.isArray(value) ? value : [];
}

export function isPostRead(key) {
  return readPosts().includes(key);
}

export function markPostRead(key) {
  const current = readPosts();
  if (current.includes(key)) return;
  write('read-posts', [key, ...current].slice(0, 500));
}

export function readSavedSearches(scope) {
  const value = read(`searches.${scope}`, []);
  return Array.isArray(value) ? value : [];
}

export function saveSearch(scope, item) {
  const current = readSavedSearches(scope);
  const withoutSamePath = current.filter(search => search.path !== item.path);
  write(`searches.${scope}`, [{ ...item, savedAt: new Date().toISOString() }, ...withoutSamePath].slice(0, 8));
}

export function removeSavedSearch(scope, path) {
  write(`searches.${scope}`, readSavedSearches(scope).filter(item => item.path !== path));
}

export function hasDismissed(key) {
  return Boolean(read(`dismissed.${key}`, false));
}

export function dismiss(key) {
  write(`dismissed.${key}`, true);
}
