# Transfer list redesign

선택한 방향대로 구현한 프론트 패치입니다.

- PC: 가로형 이적 리스트
- 모바일: 카드형 반응형 레이아웃
- 기존 검색 / 리그 / 팀 / 이적료 / 페이지네이션 동작 유지
- 선수 클릭 시 기존 선수 상세 모달 유지
- 팀 로고는 기존 `teams` 데이터의 `logoUrl`을 재사용
- 기자 소식은 현재 transfer 응답과 직접 연결된 데이터가 없어서 이번 단계에서는 억지로 넣지 않음

## 적용

압축을 기존 `transfertracker-web` 루트에 덮어씁니다.

```bash
npm run build
```

정상 확인 후:

```bash
git add .
git commit -m "refactor: redesign transfer list"
git push
```
