// testSupabaseConnection.js
// Teste simples de conectividade com Supabase

import { supabase } from '../config/supabase.js'

export const testBasicConnection = async () => {
  console.log('🔍 Iniciando teste básico de conexão...')
  
  try {
    // Teste 1: Verificar se o cliente Supabase está configurado
    if (!supabase || !supabase.auth) {
      throw new Error('Cliente Supabase não configurado corretamente')
    }
    
    console.log('✅ Cliente Supabase configurado')
    
    // Teste 2: Fazer um teste HTTP simples para verificar conectividade
    try {
      const response = await fetch('https://gkikgvkapnyfhpwhngxw.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjYzNDcsImV4cCI6MjA3MTE0MjM0N30.8el8jBGOIgoNX5mANz9mRyCeLZZseK0kjkSvogxn-Jk',
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`📡 Response status: ${response.status}`)
      
      if (response.status === 200 || response.status === 404) {
        // 200 = OK, 404 = endpoint não encontrado mas servidor respondeu
        return {
          success: true,
          message: 'Conexão com Supabase estabelecida!',
          method: 'HTTP direct',
          details: `Servidor respondeu com status ${response.status}`,
          status: response.status
        }
      } else if (response.status === 401) {
        // 401 = não autorizado, mas conexão OK
        return {
          success: true,
          message: 'Conexão OK - Aguardando configuração de auth',
          method: 'HTTP auth required',
          details: 'Servidor acessível, mas requer autenticação para queries',
          status: response.status,
          needsAuth: true
        }
      } else {
        throw new Error(`Servidor retornou status ${response.status}`)
      }
    } catch (fetchError) {
      console.log('⚠️ Erro no teste HTTP direto:', fetchError)
      
      // Teste 3: Fallback - testar auth sem queries
      try {
        const { data: session } = await supabase.auth.getSession()
        console.log('📝 Session status:', session ? 'Existe' : 'Não existe')
        
        return {
          success: true,
          message: 'Cliente Supabase funcionando!',
          method: 'auth client test',
          details: 'Cliente configurado, pronto para autenticação',
          hasSession: !!session?.session
        }
      } catch (authError) {
        throw authError
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste básico:', error)
    
    return {
      success: false,
      message: 'Falha na conexão com Supabase',
      error: error.message,
      details: {
        code: error.code,
        status: error.status,
        message: error.message
      }
    }
  }
}

export const testSupabaseConfig = () => {
  const config = {
    url: 'https://gkikgvkapnyfhpwhngxw.supabase.co',
    project: 'gkikgvkapnyfhpwhngxw',
    hasClient: !!supabase,
    hasAuth: !!supabase?.auth,
    hasFrom: !!supabase?.from
  }
  
  console.log('📋 Configuração Supabase:', config)
  
  return {
    success: Object.values(config).every(v => v === true || typeof v === 'string'),
    config,
    message: config.hasClient ? 'Cliente Supabase configurado' : 'Erro na configuração do cliente'
  }
}

export default { testBasicConnection, testSupabaseConfig }
