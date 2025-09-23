// SupabaseService.js
// Service para gerenciar operações com Supabase

import { supabase } from '../config/supabase.js'

class SupabaseService {

  /**
   * Testa conectividade HTTP direta
   */
  async testHttpConnectivity() {
    try {
      const response = await fetch('https://gkikgvkapnyfhpwhngxw.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjYzNDcsImV4cCI6MjA3MTE0MjM0N30.8el8jBGOIgoNX5mANz9mRyCeLZZseK0kjkSvogxn-Jk'
        }
      })
      
      if (response.status === 200 || response.status === 404 || response.status === 401) {
        return {
          success: true,
          status: response.status,
          message: 'Servidor Supabase acessível'
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Falha na conectividade HTTP'
      }
    }
  }

  /**
   * Operações de Autenticação
   */
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) throw error
      
      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Usuário criado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar usuário',
        error: error.message
      }
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Login realizado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao fazer login',
        error: error.message
      }
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      return {
        success: true,
        message: 'Logout realizado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao fazer logout',
        error: error.message
      }
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      return {
        success: true,
        user
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Operações CRUD para Agendamentos
   */
  async createAgendamento(agendamentoData) {
    try {
      const { data, error } = await supabase
        .from('agendamento')
        .insert([agendamentoData])
        .select()
      
      if (error) throw error
      
      return {
        success: true,
        data: data[0],
        message: 'Agendamento criado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar agendamento',
        error: error.message
      }
    }
  }

  async getAgendamentos(userId = null, filters = {}) {
    try {
      let query = supabase.from('agendamento').select('*')
      
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      if (filters.startDate) {
        query = query.gte('data', filters.startDate)
      }
      
      if (filters.endDate) {
        query = query.lte('data', filters.endDate)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      query = query.order('data', { ascending: false })
      
      const { data, error } = await query
      
      if (error) throw error
      
      return {
        success: true,
        data,
        count: data.length
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar agendamentos',
        error: error.message
      }
    }
  }

  async updateAgendamento(id, updates) {
    try {
      const { data, error } = await supabase
        .from('agendamento')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      return {
        success: true,
        data: data[0],
        message: 'Agendamento atualizado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar agendamento',
        error: error.message
      }
    }
  }

  async deleteAgendamento(id) {
    try {
      const { error } = await supabase
        .from('agendamento')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return {
        success: true,
        message: 'Agendamento removido com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao remover agendamento',
        error: error.message
      }
    }
  }

  /**
   * Operações de Usuário
   */
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          ...profileData
        }])
        .select()
      
      if (error) throw error
      
      return {
        success: true,
        data: data[0],
        message: 'Perfil criado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar perfil',
        error: error.message
      }
    }
  }

  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar perfil',
        error: error.message
      }
    }
  }

  /**
   * Utilitários
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }

  async executeRawQuery(query, params = []) {
    try {
      const { data, error } = await supabase.rpc(query, params)
      
      if (error) throw error
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Aplica correções de performance nas políticas RLS
   */
  async fixRLSPerformance() {
    const fixes = [
      // Fix 1: Users can view own profile
      `DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
       CREATE POLICY "Users can view own profile" 
       ON public.profiles FOR SELECT 
       USING ((SELECT auth.uid()) = id);`,
      
      // Fix 2: Users can update own profile  
      `DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
       CREATE POLICY "Users can update own profile" 
       ON public.profiles FOR UPDATE 
       USING ((SELECT auth.uid()) = id);`,
      
      // Fix 3: Users can view own agendamento
      `DROP POLICY IF EXISTS "Users can view own agendamento" ON public.agendamento;
       CREATE POLICY "Users can view own agendamento" 
       ON public.agendamento FOR SELECT 
       USING ((SELECT auth.uid()) = user_id);`,
      
      // Fix 4: Users can insert own agendamento
      `DROP POLICY IF EXISTS "Users can insert own agendamento" ON public.agendamento;
       CREATE POLICY "Users can insert own agendamento" 
       ON public.agendamento FOR INSERT 
       WITH CHECK ((SELECT auth.uid()) = user_id);`,
      
      // Fix 5: Users can update own agendamento
      `DROP POLICY IF EXISTS "Users can update own agendamento" ON public.agendamento;
       CREATE POLICY "Users can update own agendamento" 
       ON public.agendamento FOR UPDATE 
       USING ((SELECT auth.uid()) = user_id);`
    ]

    const results = []
    
    for (let i = 0; i < fixes.length; i++) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: fixes[i] })
        
        results.push({
          fix: i + 1,
          success: !error,
          error: error?.message
        })
      } catch (error) {
        results.push({
          fix: i + 1,
          success: false,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    
    return {
      success: successCount === fixes.length,
      message: `${successCount}/${fixes.length} políticas RLS corrigidas`,
      results,
      improvements: [
        '⚡ Performance otimizada: auth.uid() calculado 1x por query',
        '📈 Escalabilidade melhorada para tabelas grandes',
        '🔒 Segurança mantida com funcionalidade idêntica'
      ]
    }
  }
}

// Instância singleton
const supabaseService = new SupabaseService()

export default supabaseService
