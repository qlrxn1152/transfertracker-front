const CURRENT_PRODUCTION_API_URL = 'https://transfertracker-api-production.up.railway.app';
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
// 초기 Railway 서비스 주소가 로컬 환경 파일에 남아 있어도 현재 운영 API를 사용한다.
const API_BASE_URL = configuredApiBaseUrl.includes('transfertracker-back-v1-production.up.railway.app')
  ? CURRENT_PRODUCTION_API_URL
  : configuredApiBaseUrl;

function apiUrl(path, baseUrl = API_BASE_URL) {
  return `${baseUrl}${path}`;
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
  const response = await fetch(apiUrl(path, options.baseUrl), {
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

function normalizePost(post, fallbackSource = '') {
  if (!post || typeof post !== 'object') return post;

  return {
    ...post,
    source: post.source ?? post.journalist ?? post.sourcer ?? fallbackSource,
    content: post.content ?? post.postContent ?? '',
    photoUrl: post.photoUrl ?? post.postPhotoUrl ?? null,
    postCreatedAt: post.postCreatedAt ?? post.contentCreatedAt ?? post.createdAt ?? post.publishedAt ?? null
  };
}

function normalizePostsResponse(response, fallbackSource = '') {
  if (!response || typeof response !== 'object') return response;

  return {
    ...response,
    posts: Array.isArray(response.posts)
      ? response.posts.map(post => normalizePost(post, fallbackSource))
      : response.posts
  };
}

function normalizeFavoriteTeamsResponse(response) {
  if (!response || typeof response !== 'object') return response;

  return {
    ...response,
    postDetails: Array.isArray(response.postDetails)
      ? response.postDetails.map(post => normalizePost(post))
      : response.postDetails
  };
}

function normalizeFollowedJournalistPostsResponse(response) {
  if (!response || typeof response !== 'object') return response;

  return {
    ...response,
    allJournalistsPosts: Array.isArray(response.allJournalistsPosts)
      ? response.allJournalistsPosts.map(page => normalizePostsResponse(page))
      : response.allJournalistsPosts
  };
}

export const getTeamDetail = (teamId, signal) => getJson(`/api/teams/test/${teamId}`, signal)
  .then(response => ({ ...response, posts: normalizePostsResponse(response?.posts) }));

export const getPostSources = signal => getJson('/api/posts/sources', signal);

export const getPosts = (signal, page = 0) =>
  getJson(`/api/posts?page=${page}`, signal).then(normalizePostsResponse);

export const getPostsBySource = (source, signal, page = 0) =>
  getJson(`/api/posts/journalists/${encodeURIComponent(source)}?page=${page}`, signal)
    .then(response => normalizePostsResponse(response, source));

export const getPostsByTeam = (teamId, signal, page = 0) =>
  getJson(`/api/posts/teams/${teamId}?page=${page}`, signal).then(normalizePostsResponse);

export const getPost = (postId, signal) => getJson(`/api/posts/${postId}`, signal)
  .then(response => {
    if (response?.post) return { ...response, post: normalizePost(response.post) };
    return normalizePost(response);
  });

export const signUpMember = ({ loginId, password }) => request('/api/members/signup', {
  method: 'POST',
  body: JSON.stringify({ loginId, password })
});

export const loginMember = ({ loginId, password }) => request('/api/members/login', {
  method: 'POST',
  body: JSON.stringify({ loginId, password })
});

// 카카오 인증은 서버가 client secret으로 인가 코드를 교환해야 하므로,
// 브라우저는 이 시작 URL로만 이동한다.
export const getKakaoLoginUrl = () => apiUrl('/api/auth/kakao/authorize');

export const getMyMemberId = (token, signal) => request('/api/members/me', { token, signal });
export const getFavoriteTeams = (token, signal) =>
  request('/api/members/favorite-teams?page=0', { token, signal }).then(normalizeFavoriteTeamsResponse);
export const addFavoriteTeams = (token, teamIds) => request('/api/members/favorite-teams', {
  method: 'POST',
  token,
  body: JSON.stringify({ teamIds })
});
export const deleteFavoriteTeam = (token, teamId) => request(`/api/members/favorite-teams/${teamId}`, {
  method: 'DELETE',
  token
});

export const getFollowedPlayers = (token, signal) =>
  request('/api/members/me/players/following', { token, signal });

export const followPlayer = (token, playerId) => request('/api/members/me/players/follow', {
  method: 'POST',
  token,
  body: JSON.stringify({ playerId })
});

export const unfollowPlayer = (token, playerId) => request('/api/members/me/players/unfollow', {
  method: 'DELETE',
  token,
  body: JSON.stringify({ playerId })
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
  request(`/api/members/me/journalists/posts?page=${page}`, { token, signal })
    .then(normalizeFollowedJournalistPostsResponse);

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

// 개발 환경 관리자용: 선택한 기자의 최신 게시물을 동기화한다.
export const syncPosts = (token, source) => request(
  `/external/api/posts/${encodeURIComponent(source)}`,
  {
    method: 'POST',
    token
  }
);
