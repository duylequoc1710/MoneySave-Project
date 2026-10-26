import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
