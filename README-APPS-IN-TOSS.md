# TransferTracker — Apps in Toss 준비

기존 Vercel 배포를 유지하면서 Apps in Toss 전용 빌드를 추가합니다.

## 기존 웹
- `npm run dev`
- `npm run build`
- API: `/api/*` → 기존 Vercel rewrite
- Service Worker: 사용

## Apps in Toss
- `npm run build:ait`
- API: Railway backend 직접 호출
- Service Worker: 비활성화
- Safe Area 대응
- 산출물: `.ait`

## 최초 1회

```bash
npm install
```

## 앱인토스 빌드

```bash
npm run build:ait
```

`apps-in-toss.config.ts`의 `appName: "transfertracker"`는
Apps in Toss 콘솔에 등록한 실제 appName과 반드시 같아야 합니다.

## 백엔드 확인 사항

AIT 빌드에서는 아래 백엔드를 WebView가 직접 호출합니다.

```text
https://transfertracker-back-v1-production.up.railway.app
```

Sandbox 테스트에서 CORS 오류가 발생하면 Spring Security/CORS에서
Apps in Toss WebView의 실제 Origin을 허용해야 합니다.
