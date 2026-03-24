import { supabase, SUPABASE_CONFIG } from '../config/supabase.js';
class SupabaseService {
  async testHttpConnectivity() {
    try {
      const baseUrl = SUPABASE_CONFIG?.url;
      const anonKey = SUPABASE_CONFIG?.anonKey;
      if (!baseUrl || !anonKey) {
        return {
          success: false,
          error: 'VITE_SUPABASE_URL ou chave pública ausente (VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY)',
          message: 'Configure o .env antes de testar a conexão'
        };
      }
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: anonKey
        }
      });
      if (response.status === 200 || response.status === 404 || response.status === 401) {
        return {
          success: true,
          status: response.status,
          message: 'Servidor Supabase acessível'
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Falha na conectividade HTTP'
      };
    }
  }
  async signUp(email, password, userData = {}) {
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      if (error) throw error;
      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Usuário criado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar usuário',
        error: error.message
      };
    }
  }
  async signIn(email, password) {
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Login realizado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao fazer login',
        error: error.message
      };
    }
  }
  async signOut() {
    try {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) throw error;
      return {
        success: true,
        message: 'Logout realizado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao fazer logout',
        error: error.message
      };
    }
  }
  async getCurrentUser() {
    try {
      const {
        data: {
          user
        },
        error
      } = await supabase.auth.getUser();
      if (error) throw error;
      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async createAgendamento(agendamentoData) {
    try {
      const {
        data,
        error
      } = await supabase.from('agendamento').insert([agendamentoData]).select();
      if (error) throw error;
      return {
        success: true,
        data: data[0],
        message: 'Agendamento criado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar agendamento',
        error: error.message
      };
    }
  }
  async getAgendamentos(userId = null, filters = {}) {
    try {
      let query = supabase.from('agendamento').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (filters.startDate) {
        query = query.gte('data', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('data', filters.endDate);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      query = query.order('data', {
        ascending: false
      });
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return {
        success: true,
        data,
        count: data.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar agendamentos',
        error: error.message
      };
    }
  }
  async updateAgendamento(id, updates) {
    try {
      const {
        data,
        error
      } = await supabase.from('agendamento').update(updates).eq('id', id).select();
      if (error) throw error;
      return {
        success: true,
        data: data[0],
        message: 'Agendamento atualizado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar agendamento',
        error: error.message
      };
    }
  }
  async deleteAgendamento(id) {
    try {
      const {
        error
      } = await supabase.from('agendamento').delete().eq('id', id);
      if (error) throw error;
      return {
        success: true,
        message: 'Agendamento removido com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao remover agendamento',
        error: error.message
      };
    }
  }
  async createUserProfile(userId, profileData) {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').insert([{
        id: userId,
        ...profileData
      }]).select();
      if (error) throw error;
      return {
        success: true,
        data: data[0],
        message: 'Perfil criado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar perfil',
        error: error.message
      };
    }
  }
  async getUserProfile(userId) {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar perfil',
        error: error.message
      };
    }
  }
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
  async executeRawQuery(query, params = []) {
    try {
      const {
        data,
        error
      } = await supabase.rpc(query, params);
      if (error) throw error;
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async fixRLSPerformance() {
    return {
      success: true,
      message: 'Nenhuma chamada remota: DDL/RLS não é aplicado pelo navegador (sem exec_sql).',
      results: [],
      improvements: ['Políticas RLS: definidas em database/schema_supabase.sql — aplique ou altere no SQL Editor do Supabase.', 'O fluxo antigo de “otimizar RLS” dependia de exec_sql (removido por segurança).', 'Para políticas por usuário (auth.uid()), mantenha um script SQL versionado no repositório e rode no painel.']
    };
  }
}
const supabaseService = new SupabaseService();
export default supabaseService;
