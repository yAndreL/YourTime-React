// NotificationService.js
// Serviço para gerenciamento de notificações in-app e emails

import { supabase } from '../config/supabase'

class NotificationService {
  /**
   * Cria uma nova notificação no banco
   */
  static async criarNotificacao({ userId, titulo, mensagem, tipo, agendamentoId = null, metadata = {} }) {
    try {
      // Buscar superior_empresa_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      const notificacao = {
        user_id: userId,
        titulo,
        mensagem,
        tipo,
        lida: false,
        created_at: new Date().toISOString(),
        superior_empresa_id: profile?.superior_empresa_id
      }

      // Adicionar campos opcionais apenas se existirem
      if (agendamentoId) {
        notificacao.agendamento_id = agendamentoId
      }

      if (metadata && Object.keys(metadata).length > 0) {
        notificacao.metadata = metadata
      }

      const { data, error } = await supabase
        .from('notificacoes')
        .insert([notificacao])
        .select()
        .single()

      if (error) {

        throw error
      }

      return { success: true, data }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Busca todas as notificações do usuário
   */
  static async buscarNotificacoes(userId, apenasNaoLidas = false) {
    try {
      // Buscar superior_empresa_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      let query = supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', userId)

      // Filtrar por empresa se o usuário tiver superior_empresa_id
      if (profile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', profile.superior_empresa_id)
      }

      query = query.order('created_at', { ascending: false })

      if (apenasNaoLidas) {
        query = query.eq('lida', false)
      }

      const { data, error } = await query

      if (error) {

        throw error
      }
      
      return { success: true, data: data || [] }
    } catch (error) {

      return { success: false, error: error.message, data: [] }
    }
  }

  /**
   * Marca uma notificação como lida
   */
  static async marcarComoLida(notificacaoId) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', notificacaoId)

      if (error) throw error
      return { success: true }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  static async marcarTodasComoLidas(userId) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('lida', false)

      if (error) throw error
      return { success: true }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Deleta uma notificação
   */
  static async deletarNotificacao(notificacaoId) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacaoId)

      if (error) throw error
      return { success: true }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Conta notificações não lidas
   */
  static async contarNaoLidas(userId) {
    try {
      // Buscar superior_empresa_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      let query = supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('lida', false)

      // Filtrar por empresa se o usuário tiver superior_empresa_id
      if (profile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', profile.superior_empresa_id)
      }

      const { count, error } = await query

      if (error) throw error
      return { success: true, count: count || 0 }
    } catch (error) {

      return { success: false, count: 0 }
    }
  }

  /**
   * Notifica admins sobre ponto pendente de aprovação
   */
  static async notificarAdminsPontoPendente(agendamentoId, funcionarioNome, dataPonto, userId = null) {
    try {

      // Buscar superior_empresa_id do funcionário que registrou o ponto
      const { data: funcionarioProfile, error: profileError } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', userId)
        .single()

      if (profileError) {

        throw profileError
      }

      const superiorEmpresaId = funcionarioProfile?.superior_empresa_id

      if (!superiorEmpresaId) {

        return { success: false, error: 'Funcionário sem empresa definida' }
      }

      // Buscar apenas admins da MESMA empresa
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, nome, email, superior_empresa_id')
        .eq('role', 'admin')
        .eq('superior_empresa_id', superiorEmpresaId)

      if (adminsError) {

        throw adminsError
      }

      if (!admins || admins.length === 0) {

        return { success: true, warning: 'Nenhum admin encontrado nesta empresa' }
      }

      // Filtrar para NÃO notificar o próprio usuário que registrou o ponto
      const adminsParaNotificar = userId 
        ? admins.filter(admin => admin.id !== userId)
        : admins;

      if (adminsParaNotificar.length === 0) {
        return { success: true }
      }

      // Formatar data
      const dataFormatada = new Date(dataPonto + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      // Criar notificação para cada admin (exceto o próprio usuário)
      const promises = adminsParaNotificar.map(async (admin) => {

        const result = await this.criarNotificacao({
          userId: admin.id,
          titulo: 'Ponto Aguardando Aprovação',
          mensagem: `registrou um ponto e aguarda aprovação`,
          tipo: 'aprovacao_pendente',
          agendamentoId,
          metadata: { 
            funcionario: funcionarioNome,
            data_ponto: dataPonto,
            data_formatada: dataFormatada
          }
        })

        return result
      })

      const results = await Promise.all(promises)
      return { success: true }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  /**
   * Notifica usuário sobre aprovação de ponto
   */
  static async notificarPontoAprovado(userId, agendamentoId, data) {
    return await this.criarNotificacao({
      userId,
      titulo: 'Ponto aprovado',
      mensagem: `Seu registro de ponto do dia ${data} foi aprovado.`,
      tipo: 'ponto_aprovado',
      agendamentoId,
      metadata: { data }
    })
  }

  /**
   * Notifica usuário sobre rejeição de ponto
   */
  static async notificarPontoRejeitado(userId, agendamentoId, data, motivo) {
    return await this.criarNotificacao({
      userId,
      titulo: 'Ponto rejeitado',
      mensagem: `Seu registro de ponto do dia ${data} foi rejeitado. Motivo: ${motivo}`,
      tipo: 'ponto_rejeitado',
      agendamentoId,
      metadata: { data, motivo }
    })
  }

  /**
   * Envia lembrete para registrar ponto
   */
  static async enviarLembretePonto(userId, momento) {
    const mensagens = {
      inicio: 'Não esqueça de registrar sua entrada!',
      intervalo: 'Hora do intervalo! Registre sua saída e retorno.',
      fim: 'Fim do expediente chegando. Lembre-se de registrar sua saída!'
    }

    return await this.criarNotificacao({
      userId,
      titulo: 'Lembrete de Ponto',
      mensagem: mensagens[momento] || 'Lembre-se de registrar seu ponto.',
      tipo: 'lembrete_ponto',
      metadata: { momento }
    })
  }

  /**
   * Envia email via Supabase Edge Function
   * Nota: Requer configuração de Edge Function no Supabase
   */
  static async enviarEmail({ para, assunto, mensagem, html }) {
    try {
      // Chamar Edge Function do Supabase
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: para,
          subject: assunto,
          message: mensagem,
          html: html
        }
      })

      if (error) throw error
      return { success: true, data }
    } catch (error) {

      // Se não houver Edge Function configurada, apenas loga

      return { success: false, error: error.message }
    }
  }

  /**
   * Envia relatório semanal por email
   */
  static async enviarRelatorioSemanal(userEmail, userName, relatorio) {
    const html = `
      <h2>Relatório Semanal - YourTime</h2>
      <p>Olá ${userName},</p>
      <p>Segue seu relatório de horas da semana:</p>
      <div style="margin: 20px 0;">
        <p><strong>Total de horas:</strong> ${relatorio.totalHoras}</p>
        <p><strong>Dias trabalhados:</strong> ${relatorio.diasTrabalhados}</p>
        <p><strong>Média diária:</strong> ${relatorio.mediaDiaria}</p>
      </div>
      <p>Acesse o sistema para mais detalhes.</p>
      <hr>
      <p style="font-size: 12px; color: #666;">YourTime - Sistema de Gestão de Tempo</p>
    `

    return await this.enviarEmail({
      para: userEmail,
      assunto: 'Relatório Semanal - YourTime',
      mensagem: `Relatório semanal com ${relatorio.totalHoras} horas trabalhadas`,
      html
    })
  }

  /**
   * Subscribe para notificações em tempo real
   */
  static subscribeToNotifications(userId, callback) {
    const channel = supabase
      .channel(`notificacoes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {

          callback(payload.new)
        }
      )
      .subscribe()

    return channel
  }

  /**
   * Unsubscribe de notificações
   */
  static unsubscribeFromNotifications(channel) {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}

export default NotificationService
