// supabase.js
// Configuração do cliente Supabase

import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase usando variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar configuradas no arquivo .env')
}

// Criar cliente Supabase com headers explícitos para evitar erro 406
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'yourtime-app@1.0.0'
      // NÃO definir Content-Type aqui! Deixar o Supabase detectar automaticamente
      // Cada requisição (upload, query) usará o Content-Type apropriado
    }
  },
  // Configurações adicionais para evitar problemas de cache
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Exportar createClient para uso administrativo
export { createClient }

// Configurações de conexão
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  projectRef: supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || '',
  region: 'us-east-1'
}


export default supabase
