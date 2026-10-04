# Team Detail News UI Patch

현재 React 프론트의 팀 상세 페이지를 다음 구조로 변경합니다.

- 상단 클럽 히어로 영역
- 팀에 연결된 이적 소식 2개를 대형 카드로 노출
- 나머지 최신 소식을 리스트로 노출
- 우측 사이드바에 팀 선수 명단 노출
- `position`, `positionCode`, `playerPosition` 중 하나가 응답에 있으면 GK/DF/MF/FW로 자동 그룹화
- 포지션 값이 없으면 일반 `선수` 그룹으로 표시
- 기존 팀별 게시물 API와 팀 상세 API를 그대로 사용

## 적용

이 압축 파일 내용을 기존 `transfertracker-web` 루트에 덮어쓴 뒤:

```bash
npm run build
```

정상 확인 후:

```bash
git add .
git commit -m "feat: redesign team detail page"
git push
```
