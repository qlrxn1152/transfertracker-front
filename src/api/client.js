const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function readErrorMessage(response, fallback) {
  const text = await response.text().catch(() => '');
  if (!text) return fallback;

  try {
    const body = JSON.parse(text);
    return body.message || fallback;
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `요청 실패 (${response.status})`));
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const getJson = (path, signal) => request(path, { signal });

export function getTransfers({ page, keyWord, leagueCode, teamId }, signal) {
  const params = new URLSearchParams({ page: String(page), keyWord: keyWord || '' });
  if (leagueCode) params.set('leagueCode', leagueCode);
  if (teamId) params.set('teamId', teamId);

  return getJson(`/api/transfers?${params}`, signal);
}

export function getPlayers({ page, keyWord, leagueCode, teamId }, signal) {
  const params = new URLSearchParams({ page: String(page), keyWord: keyWord || '' });
  if (leagueCode) params.set('leagueCode', leagueCode);
  if (teamId) params.set('teamId', teamId);

  return getJson(`/api/players?${params}`, signal);
}

export const getTeams = signal => getJson('/api/teams', signal);
export const getTeamsByLeague = (leagueCode, signal) =>
  getJson(`/api/teams/league?leagueCode=${encodeURIComponent(leagueCode)}`, signal);

export const getPlayer = (playerId, signal) => getJson(`/api/players/${playerId}`, signal);
export const getPlayerTransfers = (playerId, signal) =>
  getJson(`/api/players/${playerId}/transfers`, signal);

export const getTeamDetail = (teamId, signal) => getJson(`/api/teams/test/${teamId}`, signal);

export const getPostSources = signal => getJson('/api/transfer-posts/post-sources', signal);

export const getPosts = (signal, page = 0) =>
  getJson(`/api/transfer-posts?page=${page}`, signal);

export const getPostsBySource = (source, signal, page = 0) =>
  getJson(`/api/transfer-posts/source/${encodeURIComponent(source)}?page=${page}`, signal);

export const getPostsByTeam = (teamId, signal, page = 0) =>
  getJson(`/api/transfer-posts/team/${teamId}?page=${page}`, signal);

export const getPost = (postId, signal) => getJson(`/api/transfer-posts/${postId}`, signal);

export const signUpMember = ({ loginId, password }) => request('/api/members/signup', {
  method: 'POST',
  body: JSON.stringify({ loginId, password })
});

export const loginMember = ({ loginId, password }) => request('/api/members/login', {
  method: 'POST',
  body: JSON.stringify({ loginId, password })
});

export const getMyMemberId = (token, signal) => request('/api/members/me', { token, signal });
export const getFavoriteTeams = (token, signal) =>
  request('/api/members/favorite-teams?page=0', { token, signal });
export const addFavoriteTeams = (token, teamIds) => request('/api/members/favorite-teams', {
  method: 'POST',
  token,
  body: JSON.stringify({ teamIds })
});
export const deleteFavoriteTeam = (token, teamId) => request(`/api/members/favorite-teams/${teamId}`, {
  method: 'DELETE',
  token
});

export const getFollowedJournalists = (token, signal) =>
  request('/api/members/me/journalists/following', { token, signal });
export const followJournalist = (token, journalist) => request('/api/members/me/journalists/follow', {
  method: 'POST',
  token,
  body: JSON.stringify({ journalist })
});
export const unfollowJournalist = (token, journalist) => request('/api/members/me/journalists/follow', {
  method: 'DELETE',
  token,
  body: JSON.stringify({ journalist })
});
export const getFollowedJournalistPosts = (token, signal, page = 0) =>
  request(`/api/members/me/journalists/posts?page=${page}`, { token, signal });

// FCM 토큰은 로그인한 회원에게 귀속된다. 백엔드는 관심 팀에 새 게시물이
// 연결될 때 이 토큰으로 실제 알림을 보낸다.
export const registerFcmToken = (token, fcmToken) => request('/api/members/me/fcm-tokens', {
  method: 'POST',
  token,
  body: JSON.stringify({ platform: 'WEB', token: fcmToken })
});

// 운영자만 호출 가능한 실제 FCM 흐름 점검용 게시물 발행 API입니다.
export const publishNotificationTestPost = (token, teamId) => request(
  `/external/api/posts/notification-test/${encodeURIComponent(teamId)}`,
  { method: 'POST', token }
);

// 운영자가 DB에 이미 저장된 기자 게시물의 팔로워 푸시만 점검할 때 사용합니다.
export const publishJournalistNotificationTest = (token, postId) => request(
  `/external/api/posts/notification-test/journalist/${encodeURIComponent(postId)}`,
  { method: 'POST', token }
);

export const removeNotificationTestPosts = token => request('/external/api/posts/notification-test', {
  method: 'DELETE',
  token
});
