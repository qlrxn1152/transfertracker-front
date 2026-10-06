# 적용 방법

현재 `transfertracker-front` 프로젝트 루트에서 실행하세요.

```bash
python3 apply_apps_in_toss_frontend.py .
npm install
npm run build
npm run build:ait
```

자동으로 처리되는 것:
- Apps in Toss Web Framework 3.x 추가
- `.ait` 전용 build script 추가
- `apps-in-toss.config.ts` 생성
- AIT에서는 Railway API 직접 호출
- 기존 Vercel에서는 `/api` rewrite 유지
- AIT에서 Service Worker 비활성화
- 모바일 Safe Area 보정
- 기존 Vercel `npm run build` 유지

현재 `appName`은 `transfertracker`로 넣었습니다.
Apps in Toss 콘솔에서 다른 appName을 등록했다면 그 값만 바꾸면 됩니다.
