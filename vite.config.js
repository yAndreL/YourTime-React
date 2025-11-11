import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carregar env vars baseado no mode atual
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
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
          ws: true
        }
      }
    },
    // Definir explicitamente as variáveis de ambiente
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_RESEND_API_KEY': JSON.stringify(env.VITE_RESEND_API_KEY),
    }
  }
})
