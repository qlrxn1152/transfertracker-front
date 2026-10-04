# Player detail redesign

선수 상세 모달을 이적 페이지와 같은 디자인 톤으로 리디자인합니다.

- PC: 대형 중앙 모달
- 모바일: 전체 화면 상세
- 선수 사진 / 현재 팀 / 최근 이적 강조
- 최근 이적: 이전 팀 → 새 팀 / 유형 / 이적료 / 날짜
- 전체 이적 기록: 최신순 리스트
- 기존 API 그대로 사용
- 관련 기자 소식은 현재 Player ↔ TransferPost 직접 연결 API가 없어 이번 단계에서는 제외

## 적용

압축 파일 내용을 기존 `transfertracker-web` 루트에 덮어씁니다.

```bash
npm run build
```

정상 확인 후:

```bash
git add .
git commit -m "refactor: redesign player detail"
git push
```
