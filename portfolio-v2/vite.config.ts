import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/portfolio/',  //  important
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    outDir: 'dist'
  },
  server: {
      host: '0.0.0.0', // Binds to all available network interfaces
      port: 5174,      // Optional: Specify the port explicitly
      allowedHosts: [
           'tobias-livadariu.online',
           'www.tobias-livadariu.online'
      ]
   },
})
