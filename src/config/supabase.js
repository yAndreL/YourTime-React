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

// Configurações de conexão
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  projectRef: 'gkikgvkapnyfhpwhngxw',
  region: 'us-east-1'
}

// Helper para testar conexão
export const testConnection = async () => {
  try {
    console.log('🔍 Testando conexão com Supabase...')
    console.log('📍 URL:', supabaseUrl)
    
    // Teste simples - verificar se consegue fazer uma query básica
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('⚠️ Erro na consulta:', error)
      
      // Se der erro de tabela não existir, a conexão está OK
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('✅ Conexão OK - Tabela não existe ainda')
        return {
          success: true,
          message: 'Conexão com Supabase estabelecida com sucesso!',
          details: 'Banco conectado, mas tabelas precisam ser criadas',
          needsSetup: true
        }
      }
      
      // Outros erros
      throw error
    }
    
    console.log('✅ Conexão e tabela OK')
    return {
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso!',
      recordCount: data || 0,
      needsSetup: false
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error)
    return {
      success: false,
      message: 'Erro ao conectar com Supabase',
      error: error.message,
      details: {
        code: error.code,
        hint: error.hint,
        message: error.message
      }
    }
  }
}

export default supabase
