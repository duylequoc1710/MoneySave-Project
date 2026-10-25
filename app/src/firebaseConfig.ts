/**
 * Cấu hình Firebase chính thức của dự án MoneySave
 * Tự động tích hợp sẵn, người dùng cuối không cần cấu hình thủ công.
 */
/**
 * Cấu hình Firebase của dự án MoneySave
 * Tự động đọc từ biến môi trường Vite (.env.local hoặc Vercel / Netlify / Hosting)
 * Hoàn toàn an toàn khi chia sẻ mã nguồn mở (Open Source) lên GitHub.
 */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || '',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || '',
  databaseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_URL) || '',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || '',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || '',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '',
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || '',
} as const
