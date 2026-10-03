import { LEAGUES } from './constants';

export const text = value => String(value ?? '').toLocaleLowerCase();

export const displayDate = value =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.replaceAll('-', '.')
    : (value || '—');

export const typeLabel = value =>
  ({ IN: '영입', OUT: '방출', LOAN: '임대', TRANSFER: '이적', FREE: '자유계약' }[
    String(value || '').toUpperCase()
  ] || value || '—');

export const photoUrl = value =>
  typeof value === 'string' && /^https:\/\/media\.api-sports\.io\/football\/players\/\d+\.png$/.test(value)
    ? value
    : null;

export const logoUrl = value =>
  typeof value === 'string' && /^https:\/\/media\.api-sports\.io\/football\/teams\/\d+\.png$/.test(value)
    ? value
    : null;

export const leagueName = code => LEAGUES.find(([key]) => key === code)?.[1] || '기타 팀';

const knownLeagues = new Set(LEAGUES.map(([code]) => code));
export const teamLeague = team => knownLeagues.has(team?.leagueCode) ? team.leagueCode : 'unclassified';
export const teamDisplayName = team => team?.teamNameKo ?? team?.teamName ?? '—';

export function feeMillions(item) {
  const raw = item?.fee ?? item?.transferFee ?? item?.type;
  if (typeof raw !== 'string') return null;

  const match = raw.trim().replaceAll(',', '').match(
    /^(?:€|EUR\s*)?\s*(\d+(?:\.\d+)?)\s*(M|K|B|million|billion)(?:\s*(?:€|EUR))?$/i
  );
  if (!match) return null;

  const value = Number(match[1]);
  const unit = (match[2] || '').toUpperCase();

  if (unit === 'B' || unit === 'BILLION') return value * 1000;
  if (unit === 'K') return value / 1000;
  return value;
}

export function feeBand(item) {
  const value = feeMillions(item);
  if (value === null) return 'na';
  if (value <= 30) return '30';
  if (value <= 50) return '50';
  if (value <= 70) return '70';
  if (value <= 100) return '100';
  return 'over';
}

export function postTransferFlag(post) {
  for (const key of ['relateTransfer', 'isRelateTransfer', 'transferRelated']) {
    if (typeof post?.[key] === 'boolean') return post[key];
  }
  return undefined;
}

export function formatPostDate(value) {
  const posted = Date.parse(value);
  if (!Number.isFinite(posted)) return '날짜 정보 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul'
  }).format(posted);
}
