import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', '');
  const backendUrl = environment.NORMBUILD_BACKEND_URL
    ?? environment.VITE_NORMBUILD_API_URL
    ?? 'http://127.0.0.1:8080';
  const proxy = {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
      proxyTimeout: 185_000,
      configure: (instance: import('vite').HttpProxy.Server) => {
        // Browser traffic stays same-origin; the upstream request is server-to-server.
        instance.on('proxyReq', (request) => request.removeHeader('origin'));
      },
    },
  };
  return {
    plugins: [vue()],
    server: {
      port: 5173,
      strictPort: false,
      proxy,
    },
    preview: { proxy },
  };
});
