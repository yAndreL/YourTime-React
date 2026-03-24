import { supabase } from '../config/supabase.js';
export class DatabaseSetup {
  static async checkDatabaseSetup() {
    try {
      const tables = ['profiles', 'agendamento', 'projetos', 'empresas', 'user_empresas', 'configuracoes', 'notificacoes'];
      const results = {};
      for (const table of tables) {
        const {
          data,
          error
        } = await supabase.from(table).select('count', {
          count: 'exact',
          head: true
        });
        results[table] = {
          exists: !error,
          error: error?.message,
          count: data || 0
        };
      }
      return {
        success: true,
        tables: results,
        isSetup: Object.values(results).every(r => r.exists)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async createEssentialTables() {
    const operations = [];
    try {
      const check = await this.checkDatabaseSetup();
      if (!check.success) {
        return {
          success: false,
          message: 'Não foi possível verificar o banco.',
          error: check.error,
          operations
        };
      }
      if (!check.isSetup) {
        operations.push({
          step: 'schema',
          success: false,
          message: 'Faltam tabelas. No Supabase: SQL Editor → cole e execute database/schema_supabase.sql'
        });
        return {
          success: false,
          message: 'Primeiro execute database/schema_supabase.sql no painel do Supabase (SQL Editor). O app no navegador não executa DDL por segurança.',
          operations
        };
      }
      operations.push({
        step: 'tabelas',
        success: true,
        message: 'Tabelas principais encontradas.'
      });
      const initial = await this.insertInitialData();
      operations.push({
        step: 'dados_iniciais',
        success: initial.success,
        message: initial.success ? initial.message : initial.error
      });
      return {
        success: initial.success,
        message: initial.success ? 'Estrutura OK; dados iniciais processados (empresa/projeto padrão, se ainda não existirem).' : initial.error || 'Falha ao inserir dados iniciais.',
        operations
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao configurar banco de dados',
        error: error.message,
        operations
      };
    }
  }
  static async insertInitialData() {
    try {
      const {
        data: empresa,
        error: empresaError
      } = await supabase.from('empresas').insert([{
        nome: 'YourTime Solutions',
        cnpj: '00.000.000/0001-00',
        email: 'contato@yourtime.com'
      }]).select().single();
      if (empresaError && empresaError.code !== '23505') {
        throw empresaError;
      }
      const {
        error: projetoError
      } = await supabase.from('projetos').insert([{
        nome: 'Projeto Geral',
        descricao: 'Projeto padrão para registros gerais',
        empresa_id: empresa?.id
      }]);
      if (projetoError && projetoError.code !== '23505') {
        throw projetoError;
      }
      return {
        success: true,
        message: 'Dados iniciais gravados'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async setupUserProfile(userData) {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      const {
        data,
        error
      } = await supabase.from('profiles').upsert([{
        id: user.id,
        nome: userData.nome || user.user_metadata?.full_name || 'Usuário',
        email: user.email,
        telefone: userData.telefone || '',
        cargo: userData.cargo || '',
        departamento: userData.departamento || '',
        carga_horaria: userData.carga_horaria ?? userData.carga_horaria_semanal ?? 40,
        role: userData.role || 'user'
      }]).select().single();
      if (error) throw error;
      return {
        success: true,
        data,
        message: 'Perfil configurado com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async ensureMinimalStructure() {
    try {
      const checks = {
        canCreateAgendamento: false,
        canCreateProfile: false,
        hasEmpresa: false,
        hasProjeto: false
      };
      try {
        const {
          data,
          error
        } = await supabase.from('agendamento').select('id').limit(1);
        checks.canCreateAgendamento = !error;
      } catch (e) {
        checks.canCreateAgendamento = false;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('profiles').select('id').limit(1);
        checks.canCreateProfile = !error;
      } catch (e) {
        checks.canCreateProfile = false;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('empresas').select('id').limit(1);
        checks.hasEmpresa = !error && data && data.length > 0;
      } catch (e) {
        checks.hasEmpresa = false;
      }
      return {
        success: true,
        checks,
        needsSetup: !Object.values(checks).every(Boolean)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default DatabaseSetup;
