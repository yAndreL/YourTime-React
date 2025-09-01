import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    proxy: {
      // Configuração do proxy para API
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Erro no proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Enviando requisição ao servidor:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Resposta do servidor:', proxyRes.statusCode, req.url, 'Content-Type:', proxyRes.headers['content-type']);
            
            // Depuração adicional para resposta não-JSON
            if (proxyRes.headers['content-type'] && !proxyRes.headers['content-type'].includes('application/json')) {
              console.log('ALERTA: Resposta não-JSON detectada!');
              let responseData = '';
              
              proxyRes.on('data', (chunk) => {
                responseData += chunk;
              });
              
              proxyRes.on('end', () => {
                if (responseData.length < 1000) {
                  console.log('Conteúdo da resposta (primeiros 1000 caracteres):', responseData);
                } else {
                  console.log('Conteúdo da resposta (primeiros 1000 caracteres):', responseData.substring(0, 1000));
                }
              });
            }
          });
        }
      }
    }
  }
})
