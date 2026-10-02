# Transfer Tracker — 로컬 웹 화면

이적 현황을 선수별 카드 피드로 보여줍니다. 대표 카드에는 최신 이적을 표시하고, 카드를 누르면 별도 상세창에서 날짜순 이력을 볼 수 있습니다. 모든 이적 카드는 같은 높이입니다. 화면 폭에 따라 데스크톱 3열, 태블릿 2열, 모바일 1열로 정렬됩니다. 상단 탭에서 클럽 목록과 선수 목록을 확인할 수 있습니다. 클럽 카드에서는 전용 상세페이지로 이동하며, 선수 카드나 ID 조회 결과는 현재 위치의 상세창에 표시됩니다.

Node.js 18 이상이 필요합니다. 외부 패키지 설치는 필요 없습니다. 이전 화면이 보이면 기존 폴더를 새로 받은 폴더로 교체한 뒤 브라우저에서 새로고침하세요. 새 화면의 제목은 **축구의 다음 장면을 보다.**입니다.

```bash
# 백엔드를 먼저 실행한 다음, 이 폴더에서
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. 기본 백엔드 주소는 `http://localhost:8080`입니다. 다른 포트라면 다음과 같이 실행합니다.

```bash
BACKEND_URL=http://localhost:8081 npm run dev
```

Railway 백엔드에 연결하려면 실행 중인 프론트 서버를 Ctrl+C로 종료하고 다음 명령으로 다시 실행합니다. 백엔드 주소는 시작할 때 적용됩니다.

```bash
BACKEND_URL=https://transfertracker-back-v1-production.up.railway.app npm run dev
```

브라우저에서 `http://localhost:5173`을 열고 이적·선수·클럽·기자 목록과 팀 상세를 확인합니다. `npm` 대신 `node`로도 실행할 수 있습니다.

```bash
BACKEND_URL=https://transfertracker-back-v1-production.up.railway.app node server.js
```

프록시는 `GET /api/transfers/team/{teamId}`도 전달하며 쿼리 파라미터를 유지합니다. 현재 화면에서는 팀별 이적 API를 호출하지 않으므로, 이 경로 추가만으로 새로운 팀별 이적 UI가 생기지는 않습니다.

실제 데이터 모드는 백엔드의 `GET /api/transfers?page=0&keyWord=`, `GET /api/teams`, `GET /api/teams/league?leagueCode=EPL` 등 5대 리그별 조회, `GET /api/players?page=0&keyWord=`, `GET /api/team/test/{teamId}`, `GET /api/player/{playerId}`, `GET /api/player/transfer/{playerId}`를 호출합니다. 같은 로컬 서버가 API를 중계하므로 백엔드의 CORS 설정을 바꿀 필요가 없습니다. 백엔드가 꺼져 있거나 DB가 비어 있을 때는 상단의 **샘플 보기**를 눌러 레이아웃만 확인할 수 있습니다. 샘플 데이터는 실제 응답과 구분되어 표시됩니다.

**기자 소식** 탭은 백엔드 API `GET /api/transfer/posts/{source}`로 `FABRIZIO_ROMANO`, `DAVID_ORNSTEIN`, `MATTEO_MORETTO`를 각각 조회합니다. 응답의 `posts` 배열에는 `postId`, `externalPostId`, `content`, `source`, `postCreatedAt`, 이적 관련 여부가 포함됩니다. 세 기자를 합쳐 최신순으로 보거나 기자별로 필터링하고 본문을 검색할 수 있습니다. 게시물 ID가 유효하면 X의 원문 링크가 표시됩니다. 새로고침은 백엔드에 **이미 저장된 게시물**을 다시 읽으며 외부 X 동기화를 실행하지 않습니다. 기자 한 명의 조회가 실패해도 다른 기자의 게시물은 표시됩니다. 샘플 게시물은 실제 기자의 발언이 아닙니다.

‘전체 게시물 / 이적 관련만’은 커밋된 `TransferPostItemResponseDto`의 **`isRelateTransfer`** 불리언을 사용합니다. Lombok 불리언 getter의 JSON 직렬화로 응답 키가 `relateTransfer`가 될 수도 있어 두 이름을 모두 읽습니다. 값이 없는 응답은 정확히 분류할 수 없으므로 필터가 비활성화됩니다. 기존에 저장된 게시물의 플래그도 필요하면 백엔드에서 다시 분류해 주세요.

클럽별 소식은 **`GET /api/transfer/posts/team/{teamId}`**를 호출하며 `{teamId}`는 `/api/teams`의 DB `teamId`입니다. 현재는 EPL 클럽만 선택할 수 있고 다른 리그는 준비 중으로 표시됩니다. 서버가 다른 리그의 게시물 연결을 지원하게 되면 `app.js`의 `supportedPostLeagues`에 리그 코드를 추가하면 같은 UI에서 사용할 수 있습니다. 클럽 상세페이지에서도 EPL 클럽의 관련 게시물 필터로 이동할 수 있습니다. 팀별 응답에도 기존과 같은 `posts` 배열과 기자 `source`가 필요합니다. 한 게시물과 클럽의 관계는 백엔드에 저장된 값만 보여주며, 화면에서 텍스트를 검색해 임의로 팀을 배정하지 않습니다.

클럽 목록의 카드를 선택하면 전용 상세 화면에서 새 **`GET /api/team/test/{teamId}`** 응답을 사용합니다. 응답 구조는 `{ "teams": { "teamId": 1, "teamName": "...", "teamPlayerCount": 24, "logoUrl": "..." }, "players": { "teamPlayers": [...] }, "posts": { "posts": [...] } }`입니다. 팀 엠블럼과 선수 수, 소속 선수 사진, 연결된 기자 게시물을 한 화면에 표시합니다. EPL 팀은 게시물 섹션에서 기자별 필터 화면으로 이동할 수 있습니다. 샘플 모드에는 별도의 예시 상세 정보가 표시됩니다.

소속 선수는 상세 응답의 `players.teamPlayers` 배열을 사용합니다. 선수 사진이 없는 경우 이름 첫 글자를 보여줍니다. **샘플 보기**는 DB와 연결되지 않으며 일부 클럽의 예시 명단만 제공합니다. 실제 데이터에서 선수가 비어 있다면 `team_player` 관계 데이터를 확인하세요.

클럽 상세페이지의 배경에는 팀의 `logoUrl`을 흐린 엠블럼으로 보여줍니다. 엠블럼이 없거나 샘플 모드일 때는 팀 이름 첫 글자를 대신 표시합니다.

`application.properties`의 local 프로필에 필요한 DB/외부 API 설정은 백엔드에서 준비해야 합니다.

최신 백엔드의 선수 목록과 전체 이적 응답은 `photoUrl`을 제공하고 전체 이적 응답에는 `playerId`도 있습니다. API-Football에서 사진을 제공하지 않거나 이미지가 로드되지 않으면 이니셜이 표시됩니다. 샘플 모드는 실제 선수 ID를 참조하지 않으므로 이니셜이 표시됩니다.

최신 백엔드의 `GET /api/teams`와 `GET /api/team/test/{teamId}`는 각 팀의 `logoUrl`을 제공합니다. 실제 이미지가 없으면 팀 이름 첫 글자가 표시됩니다. 선수 목록 카드 옆의 팀 엠블럼은 **가장 최근에 기록된 이적의 도착 팀**을 클럽 목록과 대조한 결과입니다. 이 데이터만으로 실제 현재 소속을 확정할 수는 없습니다. 이적 기록이나 일치하는 팀이 없으면 팀 엠블럼 대신 정보 없음 문구가 표시됩니다.

5대 리그 화면은 최신 커밋의 `GET /api/teams/league?leagueCode=...` 응답을 5개 리그별로 조회하고 `GET /api/teams`의 팀 ID와 대조해 분류합니다. 백엔드 DTO에 `leagueCode` 필드를 추가할 필요가 없습니다. 값은 `EPL`, `LA_LIGA`, `BUNDESLIGA`, `LIGUE_1`, `SERIE_A`입니다. 어느 리그에도 속하지 않는 팀은 기타 팀으로 묶입니다. 리그 조회에 실패하면 화면에 안내가 표시됩니다. 현재 백엔드 동기화 코드는 API-Football의 2024 시즌 팀 목록을 사용하므로, 리그 분류는 현재 시즌 소속을 보증하지 않습니다.

이적료는 백엔드 응답의 `type` 문자열(예: `€20M`)을 읽어 `N/A`, `≤ €30M`, `€30–50M`, `€50–70M`, `€70–100M`, `€100M+` 범위로 묶습니다. `type`이 금액 문자열이 아니면 N/A로 취급합니다.

## 목록 페이징

이적 목록은 `/api/transfers?page={page}&keyWord={name}`로 20건씩 최신순, 선수 목록은 `/api/players?page={page}&keyWord={name}`로 50명씩 이름순 조회합니다. API 페이지는 0부터 시작하고 화면에는 1부터 표시합니다. 응답은 기존 배열과 `hasNext`, `hasPrevious` boolean을 포함해야 합니다. 전체 건수/전체 페이지 수는 제공되지 않으므로 현재 페이지의 건수만 표시합니다. 각 목록의 페이지를 독립적으로 유지하며 새로고침은 현재 페이지를 다시 조회합니다. 샘플 모드 전환 시 첫 페이지로 초기화합니다.

선수·이적 검색은 `keyWord`로 전체 DB의 선수 이름을 검색한 결과를 페이징합니다. 검색어가 없어도 `keyWord=`를 전달합니다. 검색어 변경 시 첫 페이지로 돌아가고, 이전·다음 페이지와 새로고침에서도 검색어를 유지합니다. 입력 완료 후 300ms에 조회하며 Enter로 즉시 조회할 수 있습니다. 한글 조합 중 조회를 미루고 늦게 도착한 이전 검색 응답을 무시합니다. 샘플 모드도 검색 후 페이지를 나눕니다. 이적료 필터는 현재 페이지 안에서 동작합니다. 이적 목록은 같은 페이지의 동일 선수를 한 카드로 묶고, 클릭 시 `/api/player/{id}` 및 `/api/player/transfer/{id}`로 전체 이력을 조회합니다. 현재 API는 이적 건 단위로 페이지를 자르므로 동일 선수가 다른 페이지에 다시 나올 수 있고, 카드 대표 기록은 해당 페이지에서 가장 최근인 이적입니다. 전체 목록에서 선수당 최신 이적 하나를 보장하려면 백엔드에서 선수별 최신 이적을 먼저 선택한 후 페이징해야 합니다. 전체 결과에 대한 이적료 필터는 추가 서버 파라미터 지원이 필요합니다. 현재 서버 검색은 선수 이름만 지원하며 클럽명·선수 ID 검색을 포함하지 않습니다. 선수 ID 조회는 별도 입력창을 사용합니다.

선수 DTO는 소속팀을 포함하지 않으므로 팀 엠블럼은 현재 불러온 이적 페이지에서 확인 가능한 팀에만 표시됩니다. 정확한 현재 소속팀 표시에는 선수 목록 DTO에 `teamId`, `teamName`, `logoUrl` 필드가 필요합니다.

## Vercel 공개 배포

이 프로젝트는 운영 환경에서 **Vercel 정적 프론트 + Railway Spring Boot 백엔드** 구조를 사용합니다. 브라우저의 `/api/...` 요청은 `vercel.json` rewrite를 통해 Railway 백엔드로 프록시됩니다. 따라서 `app.js`에 Railway 주소를 직접 하드코딩하지 않고 기존 상대경로 `fetch('/api/...')`를 그대로 사용합니다.

```text
사용자 브라우저
  ↓
Vercel (index.html / app.js / style.css)
  ↓  /api/** rewrite
Railway Spring Boot
  ↓
Railway MySQL
```

### 배포 순서

1. 이 폴더를 별도 GitHub 저장소에 push합니다.
2. Vercel에서 **Add New → Project**로 해당 저장소를 Import합니다.
3. Framework Preset은 **Other**를 선택합니다.
4. Root Directory는 저장소 루트 그대로 사용합니다.
5. Build Command와 Output Directory는 별도로 지정하지 않습니다.
6. Deploy를 누릅니다.

배포 후 발급된 `https://...vercel.app` 주소에 접속하면 됩니다. `/api/...` 요청은 `vercel.json`의 rewrite에 의해 다음 Railway 백엔드로 전달됩니다.

```text
https://transfertracker-back-v1-production.up.railway.app
```

현재 프론트는 공개 조회용 `GET /api/**`만 사용합니다. `/external/**` 운영 API는 프론트에서 호출하지 않으며, 기존처럼 관리자 Basic Auth를 사용해 Postman/curl에서만 호출합니다. 회원가입/로그인 API 역시 현재 백엔드 Security 설정에서 차단된 상태를 전제로 합니다.

### 로컬 개발

로컬에서는 기존 Node 프록시를 그대로 사용합니다. Railway 백엔드 데이터를 보려면:

```bash
BACKEND_URL=https://transfertracker-back-v1-production.up.railway.app npm run dev
```

그리고 브라우저에서 `http://localhost:5173`을 엽니다.

`railway.toml`은 프론트를 Railway에 배포하고 싶을 때 사용할 수 있는 대안 설정으로 남겨두었습니다. Vercel 배포에는 사용되지 않습니다.



## 기자 게시물 한국어 번역

백엔드 `TransferPostItemResponseDto`의 `translatedContent`를 사용합니다. 값이 있으면 한국어 번역문을 본문에 우선 표시하고, `원문 보기`에서 기존 `content`를 확인할 수 있습니다. `translatedContent`가 null 또는 빈 문자열이면 기존 `content`를 그대로 표시합니다. 게시물 검색은 번역문과 원문을 모두 대상으로 합니다.

## 클럽 한글 이름

클럽 이름은 `teamNameKo ?? teamName`으로 표시합니다. 클럽 목록·상세·기자 소식의 팀 선택과 배너·선수 카드의 팀 정보에 적용되며, 클럽 검색은 한글명과 기존 영문명을 모두 지원합니다. 클럽 정렬도 화면에 표시하는 이름 기준입니다.

이적 응답에는 한글 팀명이 없으므로 FROM/TO 및 선수 이적 이력은 클럽 목록의 기존 `teamName`을 대조해 일치하는 클럽의 한글 이름을 표시합니다. 클럽 목록에서 유일하게 식별되지 않거나 한글 이름이 null이면 기존 이름을 표시합니다. 영문 `teamName`과 팀 ID는 데이터 연결 기준으로 유지합니다.
