import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3001,
    open: false,
    allowedHosts: true,
    cors: {
      origin: [
        /^https?:\/\/([a-z0-9-]+\.)?aiolos\.com(?::\d+)?$/
      ],
      credentials: true
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8700',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        cookieDomainRewrite: 'localhost'
      }
    }
  }
})
