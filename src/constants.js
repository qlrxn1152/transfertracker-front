export const LEAGUES = [
  ['EPL', '프리미어리그', '잉글랜드'],
  ['LA_LIGA', '라리가', '스페인'],
  ['BUNDESLIGA', '분데스리가', '독일'],
  ['LIGUE_1', '리그 1', '프랑스'],
  ['SERIE_A', '세리에 A', '이탈리아'],
  ['unclassified', '기타 팀', '리그 미분류']
];

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
  { code: 'MATTEO_MORETTO', name: 'Matteo Moretto', handle: 'MatteMoretto', initials: 'MM' }
];

export const SUPPORTED_POST_LEAGUES = new Set(['EPL']);
