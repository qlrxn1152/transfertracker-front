// 백엔드의 LeagueCode와 대규모 팀 수집 대상(TeamCollectionLeague)을 함께
// 표현한다. 지원 범위 밖의 대회는 OTHER로 모아 언제든 목록에서 확인할 수 있다.
export const LEAGUE_GROUPS = [
  {
    code: 'CORE',
    name: '주요 리그',
    leagues: [
      ['EPL', '프리미어리그', '잉글랜드'],
      ['LA_LIGA', '라리가', '스페인'],
      ['BUNDESLIGA', '분데스리가', '독일'],
      ['SERIE_A', '세리에 A', '이탈리아'],
      ['LIGUE_1', '리그 1', '프랑스'],
      ['K_LEAGUE', 'K리그', '대한민국']
    ]
  },
  {
    code: 'EUROPEAN_COMPETITIONS',
    name: '유럽 클럽 대항전',
    leagues: [
      ['CHAMPIONS_LEAGUE', 'UEFA 챔피언스리그', '유럽'],
      ['EUROPA_LEAGUE', 'UEFA 유로파리그', '유럽'],
      ['CONFERENCE_LEAGUE', 'UEFA 컨퍼런스리그', '유럽']
    ]
  },
  {
    code: 'DOMESTIC_CUPS',
    name: '국내 컵대회',
    leagues: [
      ['FA_CUP', 'FA컵', '잉글랜드'],
      ['EFL_CUP', 'EFL컵', '잉글랜드']
    ]
  },
  {
    code: 'EUROPEAN_MAJOR',
    name: '유럽 주요 리그',
    leagues: [
      ['PRIMEIRA_LIGA', '프리메이라리가', '포르투갈'],
      ['EREDIVISIE', '에레디비시', '네덜란드'],
      ['BELGIAN_PRO_LEAGUE', '벨기에 프로 리그', '벨기에'],
      ['SUPER_LIG', '쉬페르리그', '튀르키예'],
      ['AUSTRIAN_BUNDESLIGA', '오스트리아 분데스리가', '오스트리아'],
      ['SWISS_SUPER_LEAGUE', '스위스 슈퍼리그', '스위스'],
      ['SCOTTISH_PREMIERSHIP', '스코티시 프리미어십', '스코틀랜드'],
      ['GREEK_SUPER_LEAGUE', '그리스 슈퍼리그', '그리스'],
      ['CZECH_LIGA', '체코 리그', '체코'],
      ['DANISH_SUPERLIGA', '덴마크 수페르리가', '덴마크'],
      ['ELITESERIEN', '엘리테세리엔', '노르웨이'],
      ['ALLSVENSKAN', '알스벤스칸', '스웨덴']
    ]
  },
  {
    code: 'JAPAN',
    name: 'J리그',
    leagues: [['J_LEAGUE', 'J리그', '일본']]
  }
];

export const LEAGUES = LEAGUE_GROUPS.flatMap(group => group.leagues);
// 팀 탐색은 리그 소속이 안정적으로 관리되는 정규 리그만 다룬다.
// 대항전과 컵대회는 같은 팀이 여러 대회에 중복되므로 경기/리그 화면에서 본다.
export const TEAM_COLLECTION_LEAGUES = LEAGUE_GROUPS
  .filter(group => ['CORE', 'EUROPEAN_MAJOR', 'JAPAN'].includes(group.code))
  .flatMap(group => group.leagues);
export const OTHER_LEAGUE_CODE = 'OTHER';
export const OTHER_LEAGUE = [OTHER_LEAGUE_CODE, '기타 리그', '기타'];
export const STANDING_LEAGUE_CODES = new Set(
  LEAGUE_GROUPS
    .filter(group => ['CORE', 'EUROPEAN_MAJOR', 'JAPAN', 'EUROPEAN_COMPETITIONS'].includes(group.code))
    .flatMap(group => group.leagues.map(([code]) => code))
);

// 경기·선수·이적 API가 직접 지원하는 대회다. 수집 리그 기반 팀 목록은
// TEAM_COLLECTION_LEAGUES와 별도 API에서 조회한다.
export const SERVER_LEAGUE_CODES = new Set([
  'EPL', 'LA_LIGA', 'BUNDESLIGA', 'SERIE_A', 'LIGUE_1', 'K_LEAGUE',
  'CHAMPIONS_LEAGUE', 'EUROPA_LEAGUE', 'CONFERENCE_LEAGUE', 'FA_CUP', 'EFL_CUP'
]);
export const CORE_SERVER_LEAGUE_CODES = new Set([
  'EPL', 'LA_LIGA', 'BUNDESLIGA', 'SERIE_A', 'LIGUE_1', 'K_LEAGUE'
]);

export const FEE_BANDS = [
  ['all', '전체'],
  ['na', 'N/A'],
  ['30', '≤ €30M'],
  ['50', '€30–50M'],
  ['70', '€50–70M'],
  ['100', '€70–100M'],
  ['over', '€100M+']
];

export const POST_SOURCES = [
  { code: 'FABRIZIO_ROMANO', name: 'Fabrizio Romano', handle: 'FabrizioRomano', initials: 'FR' },
  { code: 'DAVID_ORNSTEIN', name: 'David Ornstein', handle: 'David_Ornstein', initials: 'DO' },
  { code: 'MATTEO_MORETTO', name: 'Matteo Moretto', handle: 'MatteMoretto', initials: 'MM' },
  { code: 'FLORIAN_PLETTENBERG', name: 'Florian Plettenberg', handle: 'Plettigoal', initials: 'FP' },
  { code: 'SANTI_AOUNA', name: 'Santi Aouna', handle: 'Santi_J_FM', initials: 'SA' },
  { code: 'DI_MARZIO', name: 'Gianluca Di Marzio', handle: 'DiMarzio', initials: 'DM' }
];

export const SUPPORTED_POST_LEAGUES = new Set(['EPL']);
