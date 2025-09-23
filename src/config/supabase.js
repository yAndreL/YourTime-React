// supabase.js
// Configuração do cliente Supabase

import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase usando variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkikgvkapnyfhpwhngxw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjYzNDcsImV4cCI6MjA3MTE0MjM0N30.8el8jBGOIgoNX5mANz9mRyCeLZZseK0kjkSvogxn-Jk'

// Criar cliente Supabase
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
    }
  }
})

// Exportar createClient para uso administrativo
export { createClient }

// Configurações de conexão
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  projectRef: 'gkikgvkapnyfhpwhngxw',
  region: 'us-east-1'
}


export default supabase
