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
        name: 'Ninja Dash',
        short_name: 'NinjaDash',
        start_url: './',
        display: 'standalone',
        background_color: '#10131c',
        theme_color: '#10131c',
        icons: [
          { src: '/assets/icon/nihatori_icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon/nihatori_icon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
