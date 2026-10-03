export const demo = {
  transfers: [
    { playerId: 101, playerName: '김민재', outTeamName: 'SSC 나폴리', inTeamName: '바이에른 뮌헨', date: '2023-07-18', type: 'TRANSFER' },
    { playerId: 102, playerName: '해리 케인', outTeamName: '토트넘 홋스퍼', inTeamName: '바이에른 뮌헨', date: '2023-08-12', type: 'TRANSFER' },
    { playerId: 104, playerName: '주드 벨링엄', outTeamName: '보루시아 도르트문트', inTeamName: '레알 마드리드', date: '2023-07-01', type: 'TRANSFER' },
    { playerId: 105, playerName: '데클란 라이스', outTeamName: '웨스트햄 유나이티드', inTeamName: '아스널', date: '2023-07-15', type: 'TRANSFER' },
    { playerId: 103, playerName: '손흥민', outTeamName: '바이어 레버쿠젠', inTeamName: '토트넘 홋스퍼', date: '2015-08-28', type: 'TRANSFER' }
  ],
  teams: [
    ['바이에른 뮌헨', 'BUNDESLIGA'], ['토트넘 홋스퍼', 'EPL'], ['레알 마드리드', 'LA_LIGA'],
    ['아스널', 'EPL'], ['SSC 나폴리', 'SERIE_A'], ['보루시아 도르트문트', 'BUNDESLIGA'],
    ['웨스트햄 유나이티드', 'EPL'], ['바이어 레버쿠젠', 'BUNDESLIGA'],
    ['파리 생제르맹', 'LIGUE_1'], ['올랭피크 마르세유', 'LIGUE_1'],
    ['FC 바르셀로나', 'LA_LIGA'], ['인터 밀란', 'SERIE_A'], ['맨체스터 유나이티드', 'EPL']
  ].map(([teamName, leagueCode], index) => ({ teamId: index + 1, teamName, teamNameKo: teamName, leagueCode })),
  teamPlayers: {
    '바이에른 뮌헨': [{ playerId: 101, playerName: '김민재' }, { playerId: 102, playerName: '해리 케인' }],
    '토트넘 홋스퍼': [{ playerId: 103, playerName: '손흥민' }],
    '레알 마드리드': [{ playerId: 104, playerName: '주드 벨링엄' }],
    '아스널': [{ playerId: 105, playerName: '데클란 라이스' }],
    '맨체스터 유나이티드': [
      { playerId: 106, playerName: '브루노 페르난데스' },
      { playerId: 107, playerName: '코비 마이누' },
      { playerId: 108, playerName: '리산드로 마르티네스' },
      { playerId: 109, playerName: '아마드 디알로' }
    ]
  },
  posts: {
    FABRIZIO_ROMANO: [{ postId: 1, source: 'FABRIZIO_ROMANO', content: 'Sample transfer-related post. This is not an actual statement from the journalist.', translatedContent: '이적 관련 표시를 확인하는 샘플 게시물입니다. 실제 기자의 발언이 아닙니다.', postCreatedAt: '2026-09-27T05:00:00Z', isRelateTransfer: true }],
    DAVID_ORNSTEIN: [{ postId: 2, source: 'DAVID_ORNSTEIN', content: 'Sample general post. This is not an actual X post.', translatedContent: '일반 게시물 분류를 확인하는 샘플입니다. 실제 X 게시물이 아닙니다.', postCreatedAt: '2026-09-26T12:00:00Z', isRelateTransfer: false }],
    MATTEO_MORETTO: [{ postId: 3, source: 'MATTEO_MORETTO', content: 'Sample transfer-related post for a journalist. This is not an actual article or X post.', translatedContent: '새 기자의 이적 관련 샘플 게시물입니다. 실제 기사나 X 게시물이 아닙니다.', postCreatedAt: '2026-09-27T07:00:00Z', isRelateTransfer: true }]
  },
  teamPosts: {
    '아스널': [{ postId: 4, source: 'DAVID_ORNSTEIN', content: 'Sample Arsenal club post. This is not an actual post.', translatedContent: '아스널 클럽별 목록을 확인하는 예시입니다. 실제 게시물이 아닙니다.', postCreatedAt: '2026-09-27T08:00:00Z', isRelateTransfer: true }],
    '맨체스터 유나이티드': [{ postId: 5, source: 'FABRIZIO_ROMANO', content: 'Sample Manchester United club post. This is not an actual post.', translatedContent: '맨체스터 유나이티드 클럽별 목록 예시입니다. 실제 게시물이 아닙니다.', postCreatedAt: '2026-09-27T09:00:00Z', isRelateTransfer: true }]
  },
  players: [
    { playerId: 101, playerName: '김민재', teamNameKo: '바이에른 뮌헨' },
    { playerId: 102, playerName: '해리 케인', teamNameKo: '바이에른 뮌헨' },
    { playerId: 103, playerName: '손흥민', teamNameKo: '토트넘 홋스퍼' },
    { playerId: 104, playerName: '주드 벨링엄', teamNameKo: '레알 마드리드' },
    { playerId: 105, playerName: '데클란 라이스', teamNameKo: '아스널' }
  ]
};
