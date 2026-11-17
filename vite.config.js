import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localApiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
  const externalApiTarget = env.VITE_EXTERNAL_API_PROXY_TARGET || 'https://transfertracker-api-production.up.railway.app';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: localApiTarget,
          changeOrigin: true
        },
        // 동기화 기능은 로컬 관리자 화면에서만 노출한다. 프록시를 통해 운영 API에 안전하게 전달한다.
        '/external': {
          target: externalApiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
