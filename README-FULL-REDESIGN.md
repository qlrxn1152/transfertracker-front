# TransferTracker full UI redesign

이번 패치는 한 번에 다음을 반영합니다.

1. PWA service worker 캐시 정책 수정
2. 네이비 기반 상단 헤더/내비게이션
3. `/` 홈 대시보드 신설
4. 기존 이적 현황을 `/transfers`로 분리
5. PC 가로형 / 모바일 카드형 이적 리스트
6. 기자 소식 페이지 텍스트 중심 리디자인
7. 선수 목록 페이지 리디자인
8. 선수 상세 대형 모달/모바일 전체 화면 리디자인
9. 팀 상세 리디자인 + 선수 클릭 시 선수 상세 연결
10. Vercel `/transfers` SPA rewrite 추가

## 적용

이 압축 파일을 기존 `transfertracker-web` 프로젝트 루트에 덮어씁니다.

```bash
npm run build
```

빌드가 성공하면 로컬에서:

```bash
npm run dev
```

다음 경로를 확인합니다.

- `/`
- `/transfers`
- `/posts`
- `/teams`
- `/teams/{id}`
- `/players`

배포 후 과거 PWA 캐시가 남은 브라우저에서는 한 번만:
DevTools → Application → Service Workers → Unregister,
Storage → Clear site data 후 새로고침합니다.

정상 확인 후:

```bash
git add .
git commit -m "refactor: redesign frontend experience"
git push
```

## 참고

기자 게시물과 특정 Transfer/Player 사이의 직접 관계 API는 아직 없으므로,
선수 상세에 '관련 기자 소식'을 억지로 연결하지 않았습니다.
이 부분은 백엔드에서 명시적인 관계를 만든 뒤 붙이는 것이 안전합니다.
