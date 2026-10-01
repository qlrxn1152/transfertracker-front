const demo = {
  transfers: [
    {playerName:'김민재',outTeamName:'SSC 나폴리',inTeamName:'바이에른 뮌헨',date:'2023-07-18',type:'TRANSFER'},
    {playerName:'해리 케인',outTeamName:'토트넘 홋스퍼',inTeamName:'바이에른 뮌헨',date:'2023-08-12',type:'TRANSFER'},
    {playerName:'주드 벨링엄',outTeamName:'보루시아 도르트문트',inTeamName:'레알 마드리드',date:'2023-07-01',type:'TRANSFER'},
    {playerName:'데클란 라이스',outTeamName:'웨스트햄 유나이티드',inTeamName:'아스널',date:'2023-07-15',type:'TRANSFER'},
    {playerName:'손흥민',outTeamName:'바이어 레버쿠젠',inTeamName:'토트넘 홋스퍼',date:'2015-08-28',type:'TRANSFER'}
  ],
  teams: [
    ['바이에른 뮌헨','BUNDESLIGA'],['토트넘 홋스퍼','EPL'],['레알 마드리드','LA_LIGA'],
    ['아스널','EPL'],['SSC 나폴리','SERIE_A'],['보루시아 도르트문트','BUNDESLIGA'],
    ['웨스트햄 유나이티드','EPL'],['바이어 레버쿠젠','BUNDESLIGA'],
    ['파리 생제르맹','LIGUE_1'],['올랭피크 마르세유','LIGUE_1'],
    ['FC 바르셀로나','LA_LIGA'],['인터 밀란','SERIE_A'],['맨체스터 유나이티드','EPL']
  ].map(([teamName, leagueCode], index) => ({teamId:index+1,teamName,leagueCode})),
  teamPlayers: {
    '바이에른 뮌헨': [{playerId:101,playerName:'김민재'},{playerId:102,playerName:'해리 케인'}],
    '토트넘 홋스퍼': [{playerId:103,playerName:'손흥민'}],
    '레알 마드리드': [{playerId:104,playerName:'주드 벨링엄'}],
    '아스널': [{playerId:105,playerName:'데클란 라이스'}],
    '맨체스터 유나이티드': [{playerId:106,playerName:'브루노 페르난데스'},{playerId:107,playerName:'코비 마이누'},{playerId:108,playerName:'리산드로 마르티네스'},{playerId:109,playerName:'아마드 디알로'}]
  },
  posts: {
    FABRIZIO_ROMANO: [{postId:1,source:'FABRIZIO_ROMANO',content:'이적 관련 표시를 확인하는 샘플 게시물입니다. 실제 기자의 발언이 아닙니다.',postCreatedAt:'2026-09-27T05:00:00Z',isRelateTransfer:true}],
    DAVID_ORNSTEIN: [{postId:2,source:'DAVID_ORNSTEIN',content:'일반 게시물 분류를 확인하는 샘플입니다. 실제 X 게시물이 아닙니다.',postCreatedAt:'2026-09-26T12:00:00Z',isRelateTransfer:false}],
    MATTEO_MORETTO: [{postId:3,source:'MATTEO_MORETTO',content:'새 기자의 이적 관련 샘플 게시물입니다. 실제 기사나 X 게시물이 아닙니다.',postCreatedAt:'2026-09-27T07:00:00Z',isRelateTransfer:true}]
  },
  teamPosts: {
    '아스널': [{postId:4,source:'DAVID_ORNSTEIN',content:'아스널 클럽별 목록을 확인하는 예시입니다. 실제 게시물이 아닙니다.',postCreatedAt:'2026-09-27T08:00:00Z',isRelateTransfer:true}],
    '맨체스터 유나이티드': [{postId:5,source:'FABRIZIO_ROMANO',content:'맨체스터 유나이티드 클럽별 목록 예시입니다. 실제 게시물이 아닙니다.',postCreatedAt:'2026-09-27T09:00:00Z',isRelateTransfer:true}]
  },
  players: ['김민재','해리 케인','주드 벨링엄','데클란 라이스','손흥민'].map((playerName, index) => ({playerId:index+1,playerName}))
};
let sample = false, transfers = [], teams = [], players = [], visibleHistories = [], feeFilter = 'all', leagueFilter = 'all', activeView = 'transfers';
let playerRequestId = 0, teamPageRequestId = 0, activeTeamId = null, reloadRequestId = 0;
let teamLoadError = '';
const listPages = {
  transfers: {page:0, hasNext:false, hasPrevious:false, loading:false, error:'', requestId:0, keyWord:''},
  players: {page:0, hasNext:false, hasPrevious:false, loading:false, error:'', requestId:0, keyWord:''}
};
const listSearchTimers = {transfers:null, players:null};
function renderPagination(kind) {
  const state = listPages[kind];
  const label = kind === 'transfers' ? '이적 목록' : '선수 목록';
  $(`#${kind}Pagination`).innerHTML = `<button type="button" data-list-page="${kind}" data-page="${state.page - 1}" ${state.loading || !state.hasPrevious ? 'disabled' : ''}>← 이전</button><span role="status">${state.loading ? '불러오는 중…' : `${state.page + 1} 페이지`}</span><button type="button" data-list-page="${kind}" data-page="${state.page + 1}" ${state.loading || !state.hasNext ? 'disabled' : ''}>다음 →</button>`;
  $(`#${kind === 'transfers' ? 'transfersBody' : 'playerGrid'}`).setAttribute('aria-busy', String(state.loading));
  $(`#${kind}Pagination`).setAttribute('aria-label', `${label} 페이지 이동`);
}
async function loadListPage(kind, page = listPages[kind].page) {
  const state = listPages[kind];
  if (!Number.isSafeInteger(page) || page < 0) return;
  clearTimeout(listSearchTimers[kind]);
  listSearchTimers[kind] = null;
  const requestId = ++state.requestId;
  const keyWord = state.keyWord;
  const sampleMode = sample;
  state.loading = true;
  state.error = '';
  renderPagination(kind);
  const body = $(kind === 'transfers' ? '#transfersBody' : '#playerGrid');
  body.innerHTML = '<div class="empty list-loading">목록을 불러오는 중…</div>';
  $(kind === 'transfers' ? '#transfersEmpty' : '#playersEmpty').classList.add('hidden');
  try {
    const size = kind === 'transfers' ? 20 : 50;
    const source = sampleMode ? demo[kind].filter(item => text(item.playerName).includes(text(keyWord))) : null;
    const params = new URLSearchParams({page:String(page), keyWord});
    const data = sampleMode ? {[kind]:source.slice(page * size, (page + 1) * size),hasNext:(page + 1) * size < source.length,hasPrevious:page > 0} : await getJson(`/api/${kind}?${params}`);
    if (sampleMode !== sample || requestId !== state.requestId) return;
    if (!Array.isArray(data[kind]) || typeof data.hasNext !== 'boolean' || typeof data.hasPrevious !== 'boolean') throw new Error('예상과 다른 페이징 응답 형식입니다. 최신 백엔드를 확인해 주세요.');
    if (page > 0 && !data[kind].length) {
      state.loading = false;
      return loadListPage(kind, page - 1);
    }
    state.page = page;
    state.hasNext = data.hasNext;
    state.hasPrevious = page > 0 && data.hasPrevious;
    if (kind === 'transfers') transfers = data.transfers;
    else players = data.players;
  } catch (error) {
    if (sampleMode !== sample || requestId !== state.requestId) return;
    state.error = error.message;
  }
  if (sampleMode !== sample || requestId !== state.requestId) return;
  state.loading = false;
  if (kind === 'transfers') { stats(); renderFilters(); renderTransfers(); renderPlayers(); }
  else renderPlayers();
  renderPagination(kind);
}

const postSources = [
  {code:'FABRIZIO_ROMANO',name:'Fabrizio Romano',handle:'FabrizioRomano',initials:'FR'},
  {code:'DAVID_ORNSTEIN',name:'David Ornstein',handle:'David_Ornstein',initials:'DO'},
  {code:'MATTEO_MORETTO',name:'Matteo Moretto',handle:'MatteMoretto',initials:'MM'}
];
let postsBySource = {}, postErrors = {}, postSourceFilter = 'all', postTypeFilter = 'all', postsLoaded = false, postsLoading = false, postsRequestId = 0;
const supportedPostLeagues = new Set(['EPL']);
let postTeamFilter = 'all', teamPosts = [], teamPostsLoading = false, teamPostsError = '', teamPostsRequestId = 0, teamPostsLoadedId = null;
const $ = selector => document.querySelector(selector);
const safe = value => String(value ?? '—').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text = value => String(value ?? '').toLocaleLowerCase();
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll('-', '.') : (value || '—');
const typeLabel = value => ({IN:'영입',OUT:'방출',LOAN:'임대',TRANSFER:'이적',FREE:'자유계약'}[String(value || '').toUpperCase()] || value || '—');
const photoUrl = value => typeof value === 'string' && /^https:\/\/media\.api-sports\.io\/football\/players\/\d+\.png$/.test(value) ? value : null;
const logoUrl = value => typeof value === 'string' && /^https:\/\/media\.api-sports\.io\/football\/teams\/\d+\.png$/.test(value) ? value : null;
const feeBands = [['all','전체'],['na','N/A'],['30','≤ €30M'],['50','€30–50M'],['70','€50–70M'],['100','€70–100M'],['over','€100M+']];
const leagues = [
  ['EPL','프리미어리그','잉글랜드'],['LA_LIGA','라리가','스페인'],
  ['BUNDESLIGA','분데스리가','독일'],['LIGUE_1','리그 1','프랑스'],
  ['SERIE_A','세리에 A','이탈리아'],['unclassified','기타 팀','리그 미분류']
];
const leagueName = code => leagues.find(([key]) => key === code)?.[1] || '기타 팀';
const knownLeagues = new Set(leagues.map(([code]) => code));
const teamLeague = team => knownLeagues.has(team.leagueCode) ? team.leagueCode : 'unclassified';
function feeMillions(item) {
  const raw = item.fee ?? item.transferFee ?? item.type;
  if (typeof raw !== 'string') return null;
  const match = raw.trim().replaceAll(',', '').match(/^(?:€|EUR\s*)?\s*(\d+(?:\.\d+)?)\s*(M|K|B|million|billion)(?:\s*(?:€|EUR))?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] || '').toUpperCase();
  return unit === 'B' || unit === 'BILLION' ? value * 1000 : unit === 'K' ? value / 1000 : value;
}
function feeBand(item) {
  const value = feeMillions(item);
  if (value === null) return 'na';
  if (value <= 30) return '30';
  if (value <= 50) return '50';
  if (value <= 70) return '70';
  if (value <= 100) return '100';
  return 'over';
}

async function getJson(path) {
  const response = await fetch(path, {cache:'no-store'});
  if (!response.ok) throw new Error(response.status === 502 ? '백엔드에 연결할 수 없습니다. 백엔드 실행과 포트를 확인해 주세요.' : `요청 실패 (${response.status})`);
  return response.json();
}
function status(message, state) { $('#connection').className = `connection ${state}`; $('#connection').innerHTML = `<i></i> ${safe(message)}`; }
function setView(view) {
  activeView = view;
  for (const id of ['transfers','posts','teams','teamPage','lookup']) $(`#${id}View`).classList.toggle('hidden', id !== view);
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === (view === 'teamPage' ? 'teams' : view)));
  document.querySelector('.tabs').scrollIntoView({behavior:'smooth',block:'start'});
  if (view === 'posts') {
    if (postTeamFilter !== 'all' && teamPostsLoadedId !== postTeamFilter && !teamPostsLoading) loadTeamPosts(postTeamFilter);
    else if (postTeamFilter === 'all' && !postsLoaded && !postsLoading) loadPosts();
    else renderPosts();
  }
}
function postTransferFlag(post) {
  for (const key of ['relateTransfer','isRelateTransfer','transferRelated']) {
    if (typeof post[key] === 'boolean') return post[key];
  }
  return undefined;
}
function postCardHtml(post) {
  const source = postSources.find(item => item.code === post.source);
  if (!source) return '';
  const posted = Date.parse(post.postCreatedAt);
  const when = Number.isFinite(posted) ? new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(posted) : '날짜 정보 없음';
  const original = !sample && /^\d{1,30}$/.test(String(post.externalPostId || '')) ? `https://x.com/${source.handle}/status/${post.externalPostId}` : null;
  return `<article class="post-card"><div class="post-card-head"><span class="post-avatar">${safe(source.initials)}</span><div class="post-author"><strong>${safe(source.name)}</strong><span>@${safe(source.handle)}</span></div><time ${Number.isFinite(posted) ? `datetime="${new Date(posted).toISOString()}"` : ''}>${safe(when)}</time></div><div class="post-meta">${postTransferFlag(post) === true ? '<span class="post-tag transfer">↗ 이적 관련</span>' : postTransferFlag(post) === false ? '<span class="post-tag">일반 게시물</span>' : '<span class="post-tag">분류 정보 없음</span>'}</div><p class="post-content">${safe(post.content || '').replace(/\r?\n/g,'<br>')}</p><div class="post-card-foot"><span>${sample ? '샘플 데이터' : 'X 게시물'}</span>${original ? `<a href="${original}" target="_blank" rel="noopener noreferrer" aria-label="${safe(source.name)}의 X 원문 새 창에서 보기">X에서 원문 보기 <span aria-hidden="true">↗</span></a>` : ''}</div></article>`;
}
function renderPosts() {
  const selectedTeam = postTeamFilter === 'all' ? null : teams.find(team => String(team.teamId) === postTeamFilter);
  const teamMode = postTeamFilter !== 'all';
  const loading = teamMode ? teamPostsLoading : postsLoading;
  const posts = teamMode ? teamPosts : postSources.flatMap(source => postsBySource[source.code] || []);
  const availableTeams = teams.filter(team => supportedPostLeagues.has(teamLeague(team))).sort((a,b) => a.teamName.localeCompare(b.teamName,'ko'));
  $('#postLeagues').innerHTML = leagues.filter(([code]) => code !== 'unclassified').map(([code,name]) => `<span class="post-league ${supportedPostLeagues.has(code) ? 'available' : ''}" ${supportedPostLeagues.has(code) ? '' : 'title="준비 중"'}>${safe(name)}${supportedPostLeagues.has(code) ? '' : ' · 준비 중'}</span>`).join('');
  $('#postTeams').innerHTML = `<option value="all">전체 기자 게시물</option>${availableTeams.map(team => `<option value="${Number(team.teamId)}">${safe(team.teamName)}</option>`).join('')}`;
  $('#postTeams').value = postTeamFilter;
  $('#postTeamBanner').innerHTML = selectedTeam ? `<span class="post-team-logo">${safe((selectedTeam.teamName || '?').slice(0,1))}${logoUrl(selectedTeam.logoUrl) ? `<img class="club-emblem" src="${safe(selectedTeam.logoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><div><small>${safe(leagueName(teamLeague(selectedTeam)))} / CLUB POSTS</small><strong>${safe(selectedTeam.teamName)}</strong><span>이 클럽에 연결된 게시물</span></div>` : '';
  $('#postTeamBanner').classList.toggle('hidden', !selectedTeam);
  const missingClassification = posts.some(post => typeof postTransferFlag(post) !== 'boolean');
  if (missingClassification) postTypeFilter = 'all';
  const query = text($('#postSearch').value.trim());
  const filtered = posts.filter(post => (postSourceFilter === 'all' || post.source === postSourceFilter) && (postTypeFilter === 'all' || postTransferFlag(post) === true) && text(post.content).includes(query))
    .sort((a,b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0) || String(b.externalPostId || b.postId || '').localeCompare(String(a.externalPostId || a.postId || '')));
  const currentSource = postSources.find(source => source.code === postSourceFilter);
  $('#postCount').textContent = loading ? '—' : posts.length.toLocaleString();
  $('#postsHeading').textContent = selectedTeam ? `${selectedTeam.teamName} · ${currentSource?.name || '전체 기자'}` : currentSource ? currentSource.name : '전체 소식';
  $('#postsShowing').textContent = loading ? '게시물을 불러오는 중' : `${filtered.length}건 표시 · 전체 ${posts.length}건`;
  $('#postSources').innerHTML = [{code:'all',name:'전체 기자',initials:'↗',count:posts.length},...postSources.map(source => ({...source,count:teamMode ? posts.filter(post => post.source === source.code).length : (postsBySource[source.code] || []).length}))].map(source => `<button type="button" class="post-source ${postSourceFilter === source.code ? 'selected' : ''}" data-post-source="${source.code}" aria-pressed="${postSourceFilter === source.code}"><span class="post-source-avatar">${safe(source.initials)}</span><span class="post-source-label"><strong>${safe(source.name)}</strong>${source.handle ? `<small>@${safe(source.handle)}</small>` : '<small>모든 기자의 게시물</small>'}</span><span class="post-source-count">${source.count}</span></button>`).join('');
  $('#postTypes').innerHTML = `<button type="button" class="post-type ${postTypeFilter === 'all' ? 'selected' : ''}" data-post-type="all" aria-pressed="${postTypeFilter === 'all'}">전체 게시물 <span>${posts.length}</span></button><button type="button" class="post-type ${postTypeFilter === 'transfer' ? 'selected' : ''}" data-post-type="transfer" aria-pressed="${postTypeFilter === 'transfer'}" ${missingClassification ? 'disabled title="게시물 응답에 이적 관련 여부가 필요합니다"' : ''}>이적 관련만 <span>${posts.filter(post => postTransferFlag(post) === true).length}</span></button>`;
  const failed = teamMode ? [] : postSources.filter(source => postErrors[source.code]).map(source => source.name);
  const notices = [];
  if (failed.length && posts.length) notices.push(`${failed.join(', ')}의 게시물을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요.`);
  if (missingClassification) notices.push('게시물 응답에 이적 관련 여부가 없어 필터를 사용할 수 없습니다. 최신 백엔드를 실행 중인지 확인해 주세요.');
  $('#postsNotice').textContent = notices.join(' ');
  $('#postsNotice').classList.toggle('hidden', !notices.length);
  $('#postsFeed').innerHTML = filtered.map(postCardHtml).join('');
  const error = teamMode ? teamPostsError : currentSource ? postErrors[currentSource.code] : failed.length === postSources.length ? '기자 게시물을 불러오지 못했습니다. 백엔드 연결을 확인한 뒤 새로고침해 주세요.' : '';
  $('#postsEmpty').textContent = loading ? '게시물을 불러오는 중...' : error || (query || postTypeFilter !== 'all' || postSourceFilter !== 'all' ? '선택한 조건에 맞는 게시물이 없습니다.' : teamMode ? '이 클럽에 연결된 게시물이 아직 없습니다.' : '아직 저장된 게시물이 없습니다.');
  $('#postsEmpty').classList.toggle('hidden', !!filtered.length);
  $('#postsEmpty').classList.toggle('error', !!error);
}
async function loadPosts() {
  const requestId = ++postsRequestId;
  postsLoading = true;
  postsLoaded = false;
  postErrors = {};
  postsBySource = {};
  renderPosts();
  if (sample) {
    postsBySource = demo.posts;
    postsLoading = false;
    postsLoaded = true;
    renderPosts();
    return;
  }
  const results = await Promise.allSettled(postSources.map(source => getJson(`/api/transfer/posts/${source.code}`)));
  if (requestId !== postsRequestId || sample) return;
  postSources.forEach((source,index) => {
    const result = results[index];
    if (result.status === 'fulfilled' && Array.isArray(result.value.posts)) postsBySource[source.code] = result.value.posts.map(post => ({...post,source:source.code}));
    else postErrors[source.code] = result.status === 'rejected' ? result.reason.message : '예상과 다른 게시물 응답 형식입니다.';
  });
  postsLoading = false;
  postsLoaded = true;
  renderPosts();
}
async function loadTeamPosts(teamId) {
  if (!/^\d+$/.test(String(teamId))) return;
  const requestId = ++teamPostsRequestId;
  teamPosts = [];
  teamPostsError = '';
  teamPostsLoading = true;
  teamPostsLoadedId = null;
  renderPosts();
  try {
    const team = teams.find(item => String(item.teamId) === String(teamId));
    const response = sample ? {posts:demo.teamPosts[team?.teamName] || []} : await getJson(`/api/transfer/posts/team/${teamId}`);
    if (requestId !== teamPostsRequestId || postTeamFilter !== String(teamId)) return;
    if (!Array.isArray(response.posts)) throw new Error('예상과 다른 클럽 게시물 응답 형식입니다.');
    teamPosts = response.posts;
  } catch (error) {
    if (requestId !== teamPostsRequestId || postTeamFilter !== String(teamId)) return;
    teamPostsError = error.message;
  }
  teamPostsLoading = false;
  teamPostsLoadedId = String(teamId);
  renderPosts();
}
function refreshPosts() {
  if (postTeamFilter === 'all') loadPosts();
  else loadTeamPosts(postTeamFilter);
}
function renderTeamPage(data) {
  const team = data.teams;
  if (!team || !Array.isArray(data.players?.teamPlayers) || !Array.isArray(data.posts?.posts)) throw new Error('예상과 다른 클럽 상세 응답 형식입니다.');
  const knownTeam = teams.find(item => String(item.teamId) === String(team.teamId));
  const league = knownTeam ? teamLeague(knownTeam) : 'unclassified';
  const roster = [...data.players.teamPlayers].sort((a,b) => String(a.playerName || '').localeCompare(String(b.playerName || ''),'ko'));
  const news = [...data.posts.posts].sort((a,b) => (Date.parse(b.postCreatedAt) || 0) - (Date.parse(a.postCreatedAt) || 0));
  const picture = logoUrl(team.logoUrl);
  const count = Number.isSafeInteger(team.teamPlayerCount) && team.teamPlayerCount >= 0 ? team.teamPlayerCount : roster.length;
  $('#teamPageBody').innerHTML = `<header class="team-page-hero"><div class="team-page-watermark" aria-hidden="true">${picture ? `<img src="${safe(picture)}" alt="" referrerpolicy="no-referrer" class="club-emblem">` : safe((team.teamName || '?').slice(0,1))}</div><div class="team-page-identity"><span class="team-page-emblem">${safe((team.teamName || '?').slice(0,1))}${picture ? `<img src="${safe(picture)}" class="club-emblem" alt="" referrerpolicy="no-referrer">` : ''}</span><div><p class="eyebrow">CLUB PROFILE ${sample ? '/ SAMPLE' : ''}</p><h2>${safe(team.teamName)}</h2><span>${league === 'unclassified' ? '리그 미분류' : safe(leagueName(league))} · 클럽 ID #${safe(team.teamId)}</span></div></div><div class="team-page-stats"><div><strong>${count.toLocaleString()}</strong><span>소속 선수</span></div><div><strong>${news.length.toLocaleString()}</strong><span>관련 게시물</span></div></div></header><div class="team-page-columns"><section class="team-page-panel"><div class="team-page-panel-head"><div><p class="eyebrow">THE SQUAD</p><h3>소속 선수 <span>${roster.length}</span></h3></div></div>${roster.length ? `<ul class="team-page-players">${roster.map(player => `<li><span class="roster-avatar" aria-hidden="true">${safe((player.playerName || '?').slice(0,1))}${photoUrl(player.photoUrl) ? `<img class="player-photo" src="${safe(player.photoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><strong>${safe(player.playerName)}</strong><small>#${safe(player.playerId)}</small></li>`).join('')}</ul>` : '<div class="team-page-empty">아직 등록된 소속 선수가 없습니다.</div>'}</section><section class="team-page-panel"><div class="team-page-panel-head"><div><p class="eyebrow">CLUB JOURNAL</p><h3>관련 게시물 <span>${news.length}</span></h3></div>${supportedPostLeagues.has(league) ? `<button class="team-page-posts-more" type="button" data-team-page-posts="${Number(team.teamId)}">필터로 보기 ↗</button>` : ''}</div>${news.length ? `<div class="team-page-feed">${news.map(postCardHtml).join('')}</div>` : '<div class="team-page-empty">이 클럽에 연결된 게시물이 아직 없습니다.</div>'}</section></div>`;
}
async function showTeamPage(id, scroll = true) {
  if (!Number.isSafeInteger(id) || id < 1) return;
  const requestId = ++teamPageRequestId;
  activeTeamId = id;
  $('#teamPageBody').innerHTML = '<div class="empty">클럽 정보를 불러오는 중...</div>';
  if (scroll || activeView !== 'teamPage') setView('teamPage');
  try {
    const selected = teams.find(team => Number(team.teamId) === id);
    const data = sample ? {teams:{...selected,teamPlayerCount:(demo.teamPlayers[selected?.teamName] || []).length},players:{teamPlayers:demo.teamPlayers[selected?.teamName] || []},posts:{posts:demo.teamPosts[selected?.teamName] || []}} : await getJson(`/api/team/test/${id}`);
    if (requestId !== teamPageRequestId || activeView !== 'teamPage') return;
    renderTeamPage(data);
  } catch (error) {
    if (requestId === teamPageRequestId && activeView === 'teamPage') $('#teamPageBody').innerHTML = `<div class="empty error">${safe(error.message)}</div>`;
  }
}
function stats() {
  $('#teamCount').textContent = teams.length.toLocaleString();
  const dates = transfers.map(item => item.date).filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  $('#latestDate').textContent = dates.length ? date(dates.sort().at(-1)) : '—';
}
function renderFilters() {
  $('#feeFilters').innerHTML = feeBands.map(([value,label]) => `<button class="filter ${feeFilter === value ? 'selected' : ''}" type="button" data-fee-filter="${value}" >${label}</button>`).join('');
  $('#feeNotice').classList.toggle('hidden', transfers.length === 0 || transfers.some(item => feeMillions(item) !== null));
}
function renderTransfers(error = listPages.transfers.error) {
  if (listPages.transfers.loading) return;
  const query = listPages.transfers.keyWord;
  const groups = new Map();
  for (const item of transfers) {
    const key = item.playerId != null ? `id:${item.playerId}` : `name:${item.playerName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const list = [...groups.values()].map(history => history.sort((a,b) => text(b.date).localeCompare(text(a.date)))).filter(history => (feeFilter === 'all' || feeBand(history[0]) === feeFilter)).sort((a,b) => text(b[0].date).localeCompare(text(a[0].date)));
  visibleHistories = list;
  $('#transferCount').textContent = `현재 페이지 ${groups.size.toLocaleString()}명`;
  $('#transfersBody').innerHTML = list.map((history, index) => {
    const item = history[0];
    const picture = photoUrl(item.photoUrl);
    const cover = `<div class="card-cover" aria-hidden="true"><span class="cover-lines"></span><span class="photo-fallback">${safe((item.playerName || '?').slice(0,1))}</span>${picture ? `<img class="player-photo" src="${safe(picture)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="cover-label">TRANSFER TRACKER</span></div>`;
    const content = `<div class="card-content"><div class="card-top"><span class="badge ${feeMillions(item) === null ? 'other' : ''}">${safe(feeMillions(item) === null ? typeLabel(item.type) : '이적료')}</span><time class="date-cell">${safe(date(item.date))}</time></div><h3>${safe(item.playerName)}</h3><div class="club-move"><div><small>FROM</small><strong>${safe(item.outTeamName)}</strong></div><span class="move-arrow" aria-hidden="true">→</span><div><small>TO</small><strong>${safe(item.inTeamName)}</strong></div></div>${feeMillions(item) !== null ? `<span class="card-fee">${safe(item.fee ?? item.transferFee ?? item.type)}</span>` : ''}<span class="expand-label">전체 이적 이력 보기 <span class="expand-chevron" aria-hidden="true">↗</span></span></div>`;
    return `<button class="transfer-card transfer-card-button" type="button" data-history-index="${index}" aria-label="${safe(item.playerName)} 전체 이적 이력 보기">${cover}${content}</button>`;
  }).join('');
  $('#transfersEmpty').textContent = error || (query || feeFilter !== 'all' ? '검색 조건에 맞는 이적 기록이 없습니다.' : '아직 등록된 이적 기록이 없습니다.');
  $('#transfersEmpty').classList.toggle('hidden', list.length > 0 && !error);
  $('#transfersEmpty').classList.toggle('error', !!error);
  $('#transferShowing').textContent = `${listPages.transfers.page + 1} 페이지 · ${list.length}명 표시 / 이적 ${transfers.length}건 · ${query ? `검색어 “${query}” · ` : ''}금액 필터는 현재 페이지에 적용됩니다.`;
}
function renderTeams(error = teamLoadError) {
  const query = text($('#teamSearch').value.trim());
  const counts = new Map(leagues.map(([code]) => [code, 0]));
  for (const team of teams) counts.set(teamLeague(team), counts.get(teamLeague(team)) + 1);
  $('#leagueFilters').innerHTML = `<button class="league-filter ${leagueFilter === 'all' ? 'selected' : ''}" data-league="all" type="button"><span class="league-filter-name">전체</span><strong>${teams.length}</strong></button>` + leagues.filter(([code]) => code !== 'unclassified' || counts.get(code)).map(([code,name,country]) => `<button class="league-filter ${leagueFilter === code ? 'selected' : ''}" data-league="${code}" type="button" ${counts.get(code) ? '' : 'disabled'}><span class="league-filter-meta">${country}</span><span class="league-filter-name">${name}</span><strong>${counts.get(code)}</strong></button>`).join('');
  const list = teams.filter(item => (leagueFilter === 'all' || teamLeague(item) === leagueFilter) && text(item.teamName).includes(query));
  const order = leagueFilter === 'all' ? leagues : leagues.filter(([code]) => code === leagueFilter);
  $('#teamGrid').innerHTML = order.map(([code,name,country]) => {
    const clubs = list.filter(item => teamLeague(item) === code).sort((a,b) => a.teamName.localeCompare(b.teamName,'ko'));
    if (!clubs.length) return '';
    return `<section class="league-section"><div class="league-heading"><div><span class="league-kicker">${safe(country)}</span><h3>${safe(name)} <span>${clubs.length}</span></h3></div></div><div class="team-grid">${clubs.map(item => `<button class="team-card" type="button" data-team-id="${Number(item.teamId)}"><span class="club-logo">${safe((item.teamName || '?').slice(0,1))}${logoUrl(item.logoUrl) ? `<img class="club-emblem" src="${safe(item.logoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><small>CLUB / #${safe(item.teamId)}</small><strong>${safe(item.teamName)}</strong><span class="arr">↗</span></button>`).join('')}</div></section>`;
  }).join('');
  $('#teamsEmpty').textContent = error || (query ? '검색 조건에 맞는 클럽이 없습니다.' : leagueFilter === 'all' ? '아직 등록된 클럽이 없습니다.' : '해당 리그에 등록된 클럽이 없습니다.');
  $('#teamsEmpty').classList.toggle('hidden', list.length > 0 && !error);
  $('#teamsEmpty').classList.toggle('error', !!error);
}
function renderPlayers(error = listPages.players.error) {
  if (listPages.players.loading) return;
  const query = listPages.players.keyWord;
  const list = players;
  const nameCounts = new Map();
  for (const player of players) nameCounts.set(player.playerName, (nameCounts.get(player.playerName) || 0) + 1);
  const latestByPlayer = new Map();
  for (const move of transfers) {
    const key = move.playerId != null ? `id:${move.playerId}` : `name:${move.playerName}`;
    if (!latestByPlayer.has(key) || text(move.date) > text(latestByPlayer.get(key).date)) latestByPlayer.set(key, move);
  }
  const teamsByName = new Map();
  for (const team of teams) {
    if (!teamsByName.has(team.teamName)) teamsByName.set(team.teamName, []);
    teamsByName.get(team.teamName).push(team);
  }
  $('#playerCount').textContent = `현재 페이지 ${players.length.toLocaleString()}명`;
  $('#playerGrid').innerHTML = list.map(item => {
    const latest = latestByPlayer.get(`id:${item.playerId}`) || (nameCounts.get(item.playerName) === 1 ? latestByPlayer.get(`name:${item.playerName}`) : null);
    const matches = teamsByName.get(latest?.inTeamName) || [];
    const team = matches.length === 1 ? matches[0] : null;
    const emblem = team ? `<span class="player-team-emblem" aria-label="현재 불러온 이적 기록의 도착 팀 ${safe(team.teamName)}" title="현재 불러온 이적 기록의 도착 팀: ${safe(team.teamName)}">${safe((team.teamName || '?').slice(0,1))}${logoUrl(team.logoUrl) ? `<img class="club-emblem" src="${safe(team.logoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>` : '';
    return `<button class="player-card" type="button" data-player-id="${Number(item.playerId)}"><span class="player-avatar" aria-hidden="true">${safe((item.playerName || '?').slice(0,1))}${photoUrl(item.photoUrl) ? `<img class="player-photo" src="${safe(item.photoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><span class="player-card-copy"><small>PLAYER / #${safe(item.playerId)}</small><span class="player-name-row"><strong>${safe(item.playerName)}</strong>${emblem}</span><span class="player-team-name">${team ? `이적 기록 · ${safe(team.teamName)}` : '소속팀 정보 없음'}</span></span><span class="player-card-arrow" aria-hidden="true">↗</span></button>`;
  }).join('');
  $('#playersEmpty').textContent = error || (query ? '검색 조건에 맞는 선수가 없습니다.' : '아직 등록된 선수가 없습니다.');
  $('#playersEmpty').classList.toggle('hidden', list.length > 0 && !error);
  $('#playersEmpty').classList.toggle('error', !!error);
}
async function reload() {
  const requestId = ++reloadRequestId;
  const listRequests = [loadListPage('transfers'), loadListPage('players')];
  if (sample) {
    teams = demo.teams; teamLoadError = ''; status('샘플 데이터', '');
    await Promise.allSettled(listRequests);
    stats(); renderTeams(); renderPlayers(); if (activeView === 'posts') renderPosts(); return;
  }
  status('불러오는 중', '');
  const codes = leagues.filter(([code]) => code !== 'unclassified').map(([code]) => code);
  const results = await Promise.allSettled([getJson('/api/teams'),...codes.map(code => getJson(`/api/teams/league?leagueCode=${encodeURIComponent(code)}`)),...listRequests]);
  if (sample || requestId !== reloadRequestId) return;
  const clubs = results[0];
  teams = clubs.status === 'fulfilled' && Array.isArray(clubs.value.teams) ? clubs.value.teams : [];
  const leagueById = new Map();
  const failedLeagues = [];
  codes.forEach((code, index) => {
    const result = results[index + 1];
    if (result.status !== 'fulfilled' || !Array.isArray(result.value.teams)) { failedLeagues.push(leagueName(code)); return; }
    result.value.teams.forEach(team => leagueById.set(String(team.teamId), code));
  });
  teams = teams.map(team => ({...team, leagueCode: leagueById.get(String(team.teamId)) || team.leagueCode}));
  teamLoadError = clubs.status === 'rejected' ? clubs.reason.message : !Array.isArray(clubs.value.teams) ? '예상과 다른 클럽 응답 형식입니다.' : failedLeagues.length ? `${failedLeagues.join(', ')} 팀 목록을 불러오지 못했습니다. 새로고침해 주세요.` : '';
  const failed = teamLoadError || listPages.transfers.error || listPages.players.error;
  status(failed ? '일부 연결 실패' : '로컬 API 연결됨', failed ? 'offline' : 'online');
  stats(); renderTeams(); renderPlayers(); if (activeView === 'posts') renderPosts();
}

function bindListSearch(kind, selector) {
  const input = $(selector);
  const schedule = (immediate = false) => {
    const state = listPages[kind];
    clearTimeout(listSearchTimers[kind]);
    state.keyWord = input.value.trim();
    state.page = 0;
    state.hasNext = false;
    state.hasPrevious = false;
    state.error = '';
    state.requestId++;
    state.loading = true;
    if (kind === 'transfers') { transfers = []; visibleHistories = []; }
    else players = [];
    $(kind === 'transfers' ? '#transfersBody' : '#playerGrid').innerHTML = '<div class="empty list-loading">검색 결과를 불러오는 중…</div>';
    $(kind === 'transfers' ? '#transfersEmpty' : '#playersEmpty').classList.add('hidden');
    renderPagination(kind);
    if (immediate) loadListPage(kind, 0);
    else listSearchTimers[kind] = setTimeout(() => loadListPage(kind, 0), 300);
  };
  input.addEventListener('input', event => { if (!event.isComposing) schedule(); });
  input.addEventListener('compositionend', () => schedule());
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); schedule(true); }
  });
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('#transferDialog').addEventListener('close', () => { playerRequestId++; });
document.addEventListener('error', event => { if (event.target.matches?.('img.player-photo, img.club-emblem, img.roster-mark')) event.target.remove(); }, true);
document.querySelectorAll('[data-refresh]').forEach(button => button.addEventListener('click', reload));
$('#postsView [data-post-refresh]').addEventListener('click', refreshPosts);
$('#modeButton').addEventListener('click', () => {
  sample = !sample;
  for (const state of Object.values(listPages)) {
    state.requestId++;
    state.page = 0; state.hasNext = false; state.hasPrevious = false; state.error = ''; state.loading = false;
  }
  transfers = []; players = []; visibleHistories = [];
  playerRequestId++;
  if ($('#transferDialog').open) $('#transferDialog').close();
  if (activeView === 'teamPage') { teamPageRequestId++; setView('teams'); }
  postsRequestId++;
  teamPostsRequestId++;
  postsLoaded = false;
  postsLoading = false;
  teamPostsLoadedId = null;
  teamPostsLoading = false;
  $('#modeButton').textContent = sample ? '실제 데이터 보기' : '샘플 보기';
  $('#sampleBanner').classList.toggle('hidden', !sample);
  status(sample ? '샘플 데이터' : '불러오는 중', sample ? '' : 'offline');
  reload();
  if (activeView === 'posts') refreshPosts();
});
$('#postSearch').addEventListener('input', renderPosts);
$('#postTeams').addEventListener('change', event => {
  const id = event.target.value;
  if (id !== 'all' && !teams.some(team => String(team.teamId) === id && supportedPostLeagues.has(teamLeague(team)))) return;
  postTeamFilter = id;
  if (id === 'all') {
    teamPostsRequestId++;
    teamPostsLoading = false;
    if (!postsLoaded && !postsLoading) loadPosts();
    else renderPosts();
  } else if (teamPostsLoadedId !== id) loadTeamPosts(id);
  else renderPosts();
});
$('#postTypes').addEventListener('click', event => {
  const button = event.target.closest('[data-post-type]');
  if (!button || button.disabled) return;
  postTypeFilter = button.dataset.postType;
  renderPosts();
});
$('#postSources').addEventListener('click', event => {
  const button = event.target.closest('[data-post-source]');
  if (!button) return;
  postSourceFilter = button.dataset.postSource;
  renderPosts();
});
bindListSearch('transfers', '#transferSearch');
$('#teamSearch').addEventListener('input', () => renderTeams());
$('#leagueFilters').addEventListener('click', event => {
  const button = event.target.closest('[data-league]');
  if (!button || button.disabled) return;
  leagueFilter = button.dataset.league;
  renderTeams();
});
bindListSearch('players', '#playerSearch');
$('#feeFilters').addEventListener('click', event => { const button = event.target.closest('[data-fee-filter]'); if (!button || button.disabled) return; feeFilter = button.dataset.feeFilter; renderFilters(); renderTransfers(); });
document.addEventListener('click', event => {
  const button = event.target.closest('[data-list-page]');
  if (!button || button.disabled) return;
  const kind = button.dataset.listPage;
  const state = listPages[kind];
  if (!state || state.loading) return;
  loadListPage(kind, Number(button.dataset.page)).then(() => {
    if (!state.error && activeView === (kind === 'transfers' ? 'transfers' : 'lookup')) $(kind === 'transfers' ? '#transfersView' : '#lookupView').scrollIntoView({behavior:'smooth',block:'start'});
  });
});
$('#transfersBody').addEventListener('click', event => {
  const card = event.target.closest('[data-history-index]');
  if (!card) return;
  const history = visibleHistories[Number(card.dataset.historyIndex)];
  if (!history) return;
  if (!sample && Number.isSafeInteger(history[0].playerId)) { showPlayer(history[0].playerId); return; }
  $('#transferDetail').innerHTML = `<p class="eyebrow">TRANSFER HISTORY</p><h3>${safe(history[0].playerName)}</h3><p class="dialog-subtitle">이적 이력 ${history.length}건 · 최신순</p><div class="transfer-history"><ol>${history.map(move => `<li><time>${safe(date(move.date))}</time><span class="history-route">${safe(move.outTeamName)} <span aria-hidden="true">→</span> ${safe(move.inTeamName)}</span><span class="history-type">${safe(typeLabel(move.type))}</span></li>`).join('')}</ol></div>`;
  $('#transferDialog').showModal();
});
$('#teamGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-team-id]');
  if (button) showTeamPage(Number(button.dataset.teamId));
});
$('#teamPageBack').addEventListener('click', () => { teamPageRequestId++; setView('teams'); });
$('#teamPageRefresh').addEventListener('click', () => { if (activeTeamId !== null) showTeamPage(activeTeamId, false); });
$('#teamPageBody').addEventListener('click', event => {
  const button = event.target.closest('[data-team-page-posts]');
  if (!button) return;
  const id = button.dataset.teamPagePosts;
  if (!teams.some(team => String(team.teamId) === id && supportedPostLeagues.has(teamLeague(team)))) return;
  postTeamFilter = id;
  postSourceFilter = 'all';
  setView('posts');
});
async function showPlayer(id) {
  if (!Number.isSafeInteger(id) || id < 1) return;
  const dialog = $('#transferDialog');
  const result = $('#transferDetail');
  const requestId = ++playerRequestId;
  result.innerHTML = '<div class="empty">선수 정보를 불러오는 중...</div>';
  if (!dialog.open) dialog.showModal();
  try {
    const player = sample ? demo.players.find(item => item.playerId === id) : await getJson(`/api/player/${id}`);
    if (!player) throw new Error('선수를 찾을 수 없습니다.');
    const history = sample ? {playerTransfers:demo.transfers.filter(item => item.playerName === player.playerName)} : await getJson(`/api/player/transfer/${id}`);
    if (!dialog.open || requestId !== playerRequestId) return;
    if (!Array.isArray(history.playerTransfers)) throw new Error('예상과 다른 이적 이력 응답 형식입니다.');
    const moves = [...history.playerTransfers].sort((a,b) => text(b.date).localeCompare(text(a.date)));
    result.innerHTML = `<p class="eyebrow">PLAYER PROFILE / #${safe(player.playerId)}</p><h3>${safe(player.playerName)}</h3><p class="dialog-subtitle">이적 이력 ${moves.length}건 · 최신순</p>${moves.length ? `<div class="transfer-history"><ol>${moves.map(item => `<li><time>${safe(date(item.date))}</time><span class="history-route">${safe(item.outTeamName)} <span aria-hidden="true">→</span> ${safe(item.inTeamName)}</span><span class="history-type">${safe(typeLabel(item.type))}</span></li>`).join('')}</ol></div>` : '<div class="empty">아직 이적 이력이 없습니다.</div>'}`;
  } catch (error) { if (dialog.open && requestId === playerRequestId) result.innerHTML = `<div class="empty error">${safe(error.message)}</div>`; }
}
$('#playerGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-player-id]');
  if (button) showPlayer(Number(button.dataset.playerId));
});
$('#playerForm').addEventListener('submit', event => {
  event.preventDefault();
  showPlayer(Number($('#playerId').value));
});
reload();
