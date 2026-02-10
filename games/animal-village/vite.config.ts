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
        name: 'Animal Village',
        short_name: 'Village',
        start_url: './',
        display: 'standalone',
        background_color: '#e5f7e1',
        theme_color: '#e5f7e1',
        icons: [
          { src: '/assets/icon/nihatori_icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon/nihatori_icon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
