const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function getJson(path, signal) {
  const response = await fetch(apiUrl(path), { cache: 'no-store', signal });

  if (!response.ok) {
    if (response.status === 502) {
      throw new Error('백엔드에 연결할 수 없습니다. 백엔드 상태를 확인해 주세요.');
    }
    throw new Error(`요청 실패 (${response.status})`);
  }

  return response.json();
}

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

export const getPlayer = (playerId, signal) => getJson(`/api/player/${playerId}`, signal);
export const getPlayerTransfers = (playerId, signal) =>
  getJson(`/api/player/transfer/${playerId}`, signal);

export const getTeamDetail = (teamId, signal) => getJson(`/api/team/test/${teamId}`, signal);

export const getPostsBySource = (source, signal) =>
  getJson(`/api/transfer/posts/${source}`, signal);

export const getPostsByTeam = (teamId, signal) =>
  getJson(`/api/transfer/posts/team/${teamId}`, signal);
