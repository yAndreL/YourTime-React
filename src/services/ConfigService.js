// ConfigService.js
// Serviço para gerenciamento de configurações do usuário

import { supabase } from '../config/supabase'

class ConfigService {
  /**
   * Busca configurações do usuário
   */
  static async buscarConfiguracoes(userId) {
    try {
      // Buscar superior_empresa_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      let query = supabase
        .from('configuracoes')
        .select('*')
        .eq('user_id', userId)

      // Filtrar por empresa se o usuário tiver superior_empresa_id
      if (profile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', profile.superior_empresa_id)
      }

      const { data, error } = await query.single()

      // Se não existir configuração, criar uma padrão
      if (error && error.code === 'PGRST116') {
        return await this.criarConfiguracoesPadrao(userId)
      }

      if (error) throw error
      return { success: true, data }
    } catch (error) {

      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Cria configurações padrão para o usuário
   */
  static async criarConfiguracoesPadrao(userId) {
    try {
      // Buscar superior_empresa_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      const configuracoesPadrao = {
        user_id: userId,
        email_relatorios: true,
        lembrete_registro: true,
        hora_entrada_padrao: '09:00:00',
        hora_saida_padrao: '18:00:00',
        horas_semanais: 40,
        fuso_horario: 'America/Sao_Paulo',
        formato_exportacao: 'PDF',
        incluir_graficos_pdf: true,
        superior_empresa_id: profile?.superior_empresa_id
      }

      const { data, error } = await supabase
        .from('configuracoes')
        .insert([configuracoesPadrao])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {

      return { success: false, error: error.message, data: null }
    }
  }

  /**
   * Atualiza configurações do usuário
   */
  static async atualizarConfiguracoes(userId, configuracoes) {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .update(configuracoes)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Restaura configurações para os padrões
   */
  static async restaurarPadroes(userId) {
    try {
      const configuracoesPadrao = {
        email_relatorios: true,
        lembrete_registro: true,
        hora_entrada_padrao: '09:00:00',
        hora_saida_padrao: '18:00:00',
        horas_semanais: 40,
        fuso_horario: 'America/Sao_Paulo',
        formato_exportacao: 'PDF',
        incluir_graficos_pdf: true
      }

      return await this.atualizarConfiguracoes(userId, configuracoesPadrao)
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Verifica se lembretes estão habilitados
   */
  static async lembretesHabilitados(userId) {
    try {
      const result = await this.buscarConfiguracoes(userId)
      return result.success && result.data?.lembrete_registro === true
    } catch (error) {

      return false
    }
  }

  /**
   * Busca horários de trabalho do usuário
   */
  static async buscarHorarios(userId) {
    try {
      const result = await this.buscarConfiguracoes(userId)
      if (!result.success) return null

      return {
        entrada: result.data.hora_entrada_padrao,
        saida: result.data.hora_saida_padrao,
        horasSemanais: result.data.horas_semanais,
        fusoHorario: result.data.fuso_horario
      }
    } catch (error) {

      return null
    }
  }
}

export default ConfigService
