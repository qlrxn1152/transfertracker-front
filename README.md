# TransferTracker 모바일 레이아웃 수정

첨부한 모바일 화면에서 확인된 두 가지 레이아웃 문제를 수정합니다.

1. 이적 현황 카드
   - 선수 위/아래로 FROM/TO 팀이 흩어지는 문제 수정
   - FROM → TO가 카드 중앙의 한 줄에 균형 있게 배치
   - 긴 팀 이름은 최대 2줄로 표시

2. 홈의 최신 이적
   - 출발 팀 이름이 `토...`, `헐...`처럼 과도하게 잘리는 문제 수정
   - 팀 로고 / 팀명 / 화살표 / 도착 팀을 한 줄의 이적 경로로 정렬

3. 모바일 헤더
   - 로고/샘플 버튼 영역 높이를 조금 줄여 상단 공간 절약

## 적용

압축을 풀어서 `apply-mobile-fix.sh`를 프로젝트 루트에서 실행합니다.

```bash
bash apply-mobile-fix.sh .
npm run build
npm run dev
```

정상 확인 후:

```bash
git add src/pages/TransfersPage.css src/pages/HomePage.css src/components/Layout.css
git commit -m "fix: improve mobile transfer layouts"
git push
```

스크립트에는 마커가 들어 있어 같은 버전을 다시 실행해도 CSS가 중복 추가되지 않습니다.
