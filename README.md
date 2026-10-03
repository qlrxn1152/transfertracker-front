# TransferTracker React

기존 바닐라 HTML/CSS/JavaScript 프론트를 **React + Vite + React Router** 구조로 이전한 버전입니다.

## 포함된 기능

- 이적 현황
  - 선수 검색
  - 리그 필터
  - 팀 필터 (`teamId`)
  - 이적료 필터
  - 페이징
  - 선수 상세/이적 이력 모달
- 기자 소식
  - 기자별 필터
  - 이적 관련 필터
  - EPL 클럽별 게시물
  - 한국어 번역 표시
- 클럽
  - 5대 리그 분류
  - 검색
  - 클럽 상세
  - 브라우저 뒤로가기/앞으로가기
- 선수
  - 검색
  - 리그 필터
  - 팀 필터
  - 페이징
- 샘플 데이터 모드
- Vercel Web Analytics
- Vite 개발 서버의 Railway API 프록시

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저:

```text
http://localhost:5173
```

Vite가 `/api/**` 요청을 Railway 백엔드로 프록시합니다.

## 빌드 확인

```bash
npm run build
npm run preview
```

## Vercel 배포

Vercel에서 Framework Preset은 `Vite`로 잡으면 됩니다.

- Build Command: `npm run build`
- Output Directory: `dist`

`vercel.json`에 `/api/**` Railway 프록시와 React Router 경로 rewrite를 넣어두었습니다.

## Analytics

`@vercel/analytics/react`의 `<Analytics />`가 `App.jsx`에 포함되어 있습니다.

Vercel 프로젝트에서 Web Analytics가 활성화되어 있으면 배포 후 방문/페이지뷰 데이터를 확인할 수 있습니다.

## 구조

```text
src/
├── api/
│   └── client.js
├── components/
│   ├── Layout.jsx
│   ├── LeagueTeamFilters.jsx
│   ├── Pagination.jsx
│   ├── PlayerDialog.jsx
│   └── PostCard.jsx
├── pages/
│   ├── TransfersPage.jsx
│   ├── PostsPage.jsx
│   ├── TeamsPage.jsx
│   ├── TeamDetailPage.jsx
│   └── PlayersPage.jsx
├── App.jsx
├── constants.js
├── demo.js
├── main.jsx
├── styles.css
└── utils.js
```

백엔드 API 스펙이 변경될 때는 대부분 `src/api/client.js`와 해당 Page만 보면 됩니다.
