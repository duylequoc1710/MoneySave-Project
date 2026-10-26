import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function appVersion() {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  let hash = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7)
  if (!hash) {
    try {
      hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      hash = 'local'
    }
  }
  // Giờ Việt Nam (UTC+7) để dễ đối chiếu
  const vn = new Date(Date.now() + 7 * 3600 * 1000).toISOString()
  const stamp = `${vn.slice(8, 10)}/${vn.slice(5, 7)}/${vn.slice(0, 4)} ${vn.slice(11, 16)}`
  return `${pkg.version} · ${stamp} · ${hash}`
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Tách thư viện nặng ra chunk riêng để tải song song & cache lâu dài
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
            return 'recharts'
          }
        },
      },
    },
  },
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Tự đăng ký SW trong main.tsx (virtual:pwa-register) để chủ động kiểm tra bản mới
      injectRegister: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // index.html luôn lấy từ mạng trước (fallback cache khi offline) -> không kẹt bản cũ
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
          },
        ],
      },
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'logo-moneysave.png',
        'logo-moneysave-text.png',
        'logo-moneysave-nav.png',
        'logo-moneysave-nav-light.png',
      ],
      manifest: {
        name: 'MoneySave',
        short_name: 'MoneySave',
        description: 'Ứng dụng quản lý tài chính cá nhân Offline-first',
        theme_color: '#0b9e63',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
