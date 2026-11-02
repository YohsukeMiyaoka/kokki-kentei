import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // ホスティング先が決まっていないので、どのパスに置いても動くよう相対パスにする
  base: './',
  // 国旗画像と問題データを1つにまとめているため大きめになる（オフライン用にすべてキャッシュする）
  build: { chunkSizeWarningLimit: 2000 },
  // iPad実機の確認用に、cloudflared の一時トンネル（https://〜.trycloudflare.com）から見られるようにする
  preview: { allowedHosts: ['.trycloudflare.com'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '国旗検定 練習',
        short_name: '国旗検定',
        description: '国旗検定1級・2級の練習アプリ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        background_color: '#eaf4ff',
        theme_color: '#2f7de1',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 国旗のSVGもふくめて、すべてキャッシュしてオフラインで動かす
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
