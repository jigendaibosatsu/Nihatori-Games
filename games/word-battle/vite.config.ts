import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '英単語カードバトル',
        short_name: 'WordBattle',
        description: '英単語クイズ→パック→デッキ→バトル',
        start_url: './',
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#0b1220',
        icons: [
          { src: '/assets/icon/nihatori_icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon/nihatori_icon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
