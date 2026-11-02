import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const ACCEPT_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp',
  'application/hwp+zip', 'application/vnd.hancom.hwpx', 'application/octet-stream',
  'text/*', 'image/*',
]

export default defineConfig({
  base: './',
  // hwp.js 안의 Node 전용 'fs' 참조를 빈 모듈로 대체
  resolve: { alias: { fs: '/src/lib/empty.ts' } },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,bcmap,pfb,ttf}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        id: './',
        name: '문서뷰어 - 광고 없는 문서 보기',
        short_name: '문서뷰어',
        description: 'PDF·한글·워드·엑셀·PPT를 광고 없이 빠르게 보는 뷰어',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f5f7',
        theme_color: '#2563eb',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // 안드로이드: 카톡/파일앱 '공유' 목록에 문서뷰어가 뜸
        share_target: {
          action: './share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: 'file', accept: [...ACCEPT_MIME, '.pdf', '.hwp', '.hwpx', '.docx', '.xlsx', '.xls', '.csv', '.pptx', '.txt'] }] },
        },
        // PC 크롬/엣지: 파일 우클릭 → 연결 프로그램
        file_handlers: [
          {
            action: './',
            accept: {
              'application/pdf': ['.pdf'],
              'application/x-hwp': ['.hwp'],
              'application/vnd.hancom.hwpx': ['.hwpx'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
              'text/csv': ['.csv'],
              'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
              'text/plain': ['.txt'],
            },
          },
        ],
      } as any,
    }),
  ],
})
