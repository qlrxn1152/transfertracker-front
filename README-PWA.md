# TransferTracker PWA patch

이 압축 파일의 내용을 기존 `transfertracker-web` 저장소 루트에 그대로 덮어쓰면 됩니다.

추가/변경 파일:

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/transfertracker-icon.svg`
- `index.html`
- `src/main.jsx`

의존성 추가는 없습니다.

적용 후:

```bash
npm run build
git add .
git commit -m "feat: add PWA support"
git push
```

Vercel 배포 후 Chrome/Edge에서는 설치 아이콘을 통해 앱처럼 설치할 수 있습니다.
macOS Safari에서는 공유 메뉴의 "Dock에 추가"를 사용할 수 있습니다.
iPhone/iPad에서는 Safari 공유 메뉴의 "홈 화면에 추가"를 사용할 수 있습니다.
