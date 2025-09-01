// databaseSetup.js
// Utilitários para configuração inicial do banco de dados

import supabaseService from '../services/SupabaseService.js'
import { supabase } from '../config/supabase.js'

export class DatabaseSetup {
  
  /**
   * Verifica se o banco está configurado
   */
  static async checkDatabaseSetup() {
    try {
      // Verificar se tabelas principais existem
      const tables = ['profiles', 'agendamento', 'projetos', 'empresas']
      const results = {}
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
        
        results[table] = {
          exists: !error,
          error: error?.message,
          count: data || 0
        }
      }
      
      return {
        success: true,
        tables: results,
        isSetup: Object.values(results).every(r => r.exists)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Criação manual das tabelas essenciais (se o SQL não puder ser executado diretamente)
   */
  static async createEssentialTables() {
    const operations = []
    
    try {
      // 1. Verificar se profiles já existe (criada pelo Supabase Auth)
      console.log('📋 Verificando tabela profiles...')
      
      // 2. Criar tabela de empresas
      console.log('🏢 Criando tabela empresas...')
      operations.push(await this.createEmpresasTable())
      
      // 3. Criar tabela de projetos
      console.log('📊 Criando tabela projetos...')
      operations.push(await this.createProjetosTable())
      
      // 4. Criar tabela principal de agendamento
      console.log('⏰ Criando tabela agendamento...')
      operations.push(await this.createAgendamentoTable())
      
      // 5. Inserir dados iniciais
      console.log('📝 Inserindo dados iniciais...')
      operations.push(await this.insertInitialData())
      
      return {
        success: true,
        message: 'Banco de dados configurado com sucesso!',
        operations
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao configurar banco de dados',
        error: error.message,
        operations
      }
    }
  }

  /**
   * Criar tabela de empresas via SQL direto
   */
  static async createEmpresasTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS empresas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        cnpj VARCHAR(18) UNIQUE,
        endereco TEXT,
        telefone VARCHAR(20),
        email VARCHAR(255),
        logo_url TEXT,
        configuracoes JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql })
      
      if (error) throw error
      
      return {
        table: 'empresas',
        success: true,
        message: 'Tabela empresas criada'
      }
    } catch (error) {
      return {
        table: 'empresas',
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Inserir dados iniciais
   */
  static async insertInitialData() {
    try {
      // Empresa padrão
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .insert([{
          nome: 'YourTime Solutions',
          cnpj: '00.000.000/0001-00',
          email: 'contato@yourtime.com'
        }])
        .select()
        .single()
      
      if (empresaError && empresaError.code !== '23505') { // 23505 = unique violation
        throw empresaError
      }

      // Projeto padrão
      const { error: projetoError } = await supabase
        .from('projetos')
        .insert([{
          nome: 'Projeto Geral',
          descricao: 'Projeto padrão para registros gerais',
          empresa_id: empresa?.id
        }])
      
      if (projetoError && projetoError.code !== '23505') {
        throw projetoError
      }

      return {
        success: true,
        message: 'Dados iniciais inseridos'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Configurar perfil do usuário atual
   */
  static async setupUserProfile(userData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert([{
          id: user.id,
          nome: userData.nome || user.user_metadata?.full_name || 'Usuário',
          email: user.email,
          telefone: userData.telefone || '',
          cargo: userData.cargo || '',
          departamento: userData.departamento || '',
          carga_horaria_semanal: userData.carga_horaria_semanal || 40,
          role: userData.role || 'user'
        }])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data,
        message: 'Perfil configurado com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Verificar e criar estrutura mínima necessária
   */
  static async ensureMinimalStructure() {
    try {
      // Tentar criar registros de teste para verificar se as tabelas existem
      const checks = {
        canCreateAgendamento: false,
        canCreateProfile: false,
        hasEmpresa: false,
        hasProjeto: false
      }

      // Verificar agendamento
      try {
        const { data, error } = await supabase
          .from('agendamento')
          .select('id')
          .limit(1)
        checks.canCreateAgendamento = !error
      } catch (e) {
        checks.canCreateAgendamento = false
      }

      // Verificar profiles
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
        checks.canCreateProfile = !error
      } catch (e) {
        checks.canCreateProfile = false
      }

      // Verificar empresa
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('id')
          .limit(1)
        checks.hasEmpresa = !error && data && data.length > 0
      } catch (e) {
        checks.hasEmpresa = false
      }

      return {
        success: true,
        checks,
        needsSetup: !Object.values(checks).every(Boolean)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default DatabaseSetup
