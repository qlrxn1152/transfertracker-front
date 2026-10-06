from pathlib import Path
import json
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f"파일을 찾을 수 없습니다: {path}")
    return path, path.read_text(encoding="utf-8")

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"수정 완료: {path.relative_to(root)}")

package_path, package_text = read("package.json")
package = json.loads(package_text)
package.setdefault("dependencies", {})
package["dependencies"]["@apps-in-toss/web-framework"] = "^3.5.0"
scripts = package.setdefault("scripts", {})
scripts["build:ait:web"] = "vite build --mode ait"
scripts["build:ait"] = "npm run build:ait:web && ait build"
scripts["deploy:ait"] = "ait deploy"
write(package_path, json.dumps(package, ensure_ascii=False, indent=2) + "\n")

client_path, client = read("src/api/client.js")
if "VITE_API_BASE_URL" not in client:
    client = """const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

""" + client
client = client.replace(
    "const response = await fetch(path, { cache: 'no-store', signal });",
    "const response = await fetch(apiUrl(path), { cache: 'no-store', signal });"
)
write(client_path, client)

main_path, main = read("src/main.jsx")
old = """if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}
"""
new = """const isAppsInToss = import.meta.env.VITE_APP_PLATFORM === 'toss';

if (!isAppsInToss && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}
"""
if old in main:
    main = main.replace(old, new, 1)
elif "const isAppsInToss" not in main:
    raise SystemExit("src/main.jsx의 Service Worker 코드를 찾지 못했습니다.")
write(main_path, main)

layout_path, layout = read("src/components/Layout.css")
marker = "/* APPS_IN_TOSS_SAFE_AREA_V1 */"
if marker not in layout:
    layout += """
/* APPS_IN_TOSS_SAFE_AREA_V1 */
.app-header{
  padding-top:env(safe-area-inset-top);
}

@media(max-width:760px){
  .app-nav{
    min-height:calc(61px + env(safe-area-inset-bottom));
    padding-bottom:max(8px, env(safe-area-inset-bottom));
  }

  .app-main{
    padding-bottom:calc(82px + env(safe-area-inset-bottom));
  }
}
"""
write(layout_path, layout)

config = """import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "transfertracker",
  brand: {
    primaryColor: "#EF3347",
  },
  webView: {},
  permissions: [],
  webBundleDir: "dist",
});
"""
write(root / "apps-in-toss.config.ts", config)

env_ait = """VITE_APP_PLATFORM=toss
VITE_API_BASE_URL=https://transfertracker-back-v1-production.up.railway.app
"""
write(root / ".env.ait", env_ait)

guide = """# TransferTracker — Apps in Toss 준비

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
"""
write(root / "README-APPS-IN-TOSS.md", guide)

print("프론트엔드 Apps in Toss 준비 완료")
