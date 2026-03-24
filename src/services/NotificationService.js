import { supabase } from '../config/supabase';
import { translations } from '../i18n/translations';
import { formatDate } from '../utils/dateUtils';
const t = (language, key) => {
  const keys = key.split('.');
  let value = translations[language] || translations['pt-BR'];
  for (const k of keys) {
    value = value?.[k];
    if (!value) return key;
  }
  return value || key;
};
class NotificationService {
  static async criarNotificacao({
    userId,
    titulo,
    mensagem,
    tipo,
    agendamentoId = null,
    metadata = {}
  }) {
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', userId).single();
      const notificacao = {
        user_id: userId,
        titulo,
        mensagem,
        tipo,
        lida: false,
        created_at: new Date().toISOString(),
        superior_empresa_id: profile?.superior_empresa_id
      };
      if (agendamentoId) {
        notificacao.agendamento_id = agendamentoId;
      }
      if (metadata && Object.keys(metadata).length > 0) {
        notificacao.metadata = metadata;
      }
      const {
        data,
        error
      } = await supabase.from('notificacoes').insert([notificacao]).select().single();
      if (error) {
        throw error;
      }
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
  static async buscarNotificacoes(userId, apenasNaoLidas = false) {
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', userId).single();
      let query = supabase.from('notificacoes').select('*').eq('user_id', userId);
      if (profile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', profile.superior_empresa_id);
      }
      query = query.order('created_at', {
        ascending: false
      });
      if (apenasNaoLidas) {
        query = query.eq('lida', false);
      }
      const {
        data,
        error
      } = await query;
      if (error) {
        throw error;
      }
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
  static async marcarComoLida(notificacaoId) {
    try {
      const {
        error
      } = await supabase.from('notificacoes').update({
        lida: true,
        lida_em: new Date().toISOString()
      }).eq('id', notificacaoId);
      if (error) throw error;
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async marcarTodasComoLidas(userId) {
    try {
      const {
        error
      } = await supabase.from('notificacoes').update({
        lida: true,
        lida_em: new Date().toISOString()
      }).eq('user_id', userId).eq('lida', false);
      if (error) throw error;
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async deletarNotificacao(notificacaoId) {
    try {
      const {
        error
      } = await supabase.from('notificacoes').delete().eq('id', notificacaoId);
      if (error) throw error;
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async contarNaoLidas(userId) {
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', userId).single();
      let query = supabase.from('notificacoes').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', userId).eq('lida', false);
      if (profile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', profile.superior_empresa_id);
      }
      const {
        count,
        error
      } = await query;
      if (error) throw error;
      return {
        success: true,
        count: count || 0
      };
    } catch (error) {
      return {
        success: false,
        count: 0
      };
    }
  }
  static async notificarAdminsPontoPendente(agendamentoId, funcionarioNome, dataPonto, userId = null) {
    try {
      const {
        data: funcionarioProfile,
        error: profileError
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', userId).single();
      if (profileError) {
        throw profileError;
      }
      const superiorEmpresaId = funcionarioProfile?.superior_empresa_id;
      if (!superiorEmpresaId) {
        return {
          success: false,
          error: 'Funcionário sem empresa definida'
        };
      }
      const {
        data: admins,
        error: adminsError
      } = await supabase.from('profiles').select('id, nome, email, superior_empresa_id').eq('role', 'admin').eq('superior_empresa_id', superiorEmpresaId);
      if (adminsError) {
        throw adminsError;
      }
      if (!admins || admins.length === 0) {
        return {
          success: true,
          warning: 'Nenhum admin encontrado nesta empresa'
        };
      }
      const adminsParaNotificar = userId ? admins.filter(admin => admin.id !== userId) : admins;
      if (adminsParaNotificar.length === 0) {
        return {
          success: true
        };
      }
      const dataFormatada = formatDate(dataPonto, 'DD/MM/YYYY');
      const promises = adminsParaNotificar.map(async admin => {
        const {
          data: adminConfig
        } = await supabase.from('configuracoes').select('language').eq('user_id', admin.id).single();
        const language = adminConfig?.language || 'pt-BR';
        const result = await this.criarNotificacao({
          userId: admin.id,
          titulo: t(language, 'notifications.pendingApprovalTitle'),
          mensagem: t(language, 'notifications.pendingApprovalMessage'),
          tipo: 'aprovacao_pendente',
          agendamentoId,
          metadata: {
            funcionario: funcionarioNome,
            data_ponto: dataPonto,
            data_formatada: dataFormatada
          }
        });
        return result;
      });
      const results = await Promise.all(promises);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  static async notificarPontoAprovado(userId, agendamentoId, data) {
    const {
      data: config
    } = await supabase.from('configuracoes').select('language').eq('user_id', userId).single();
    const language = config?.language || 'pt-BR';
    return await this.criarNotificacao({
      userId,
      titulo: t(language, 'notifications.approvedTitle'),
      mensagem: t(language, 'notifications.approvedMessage').replace('{date}', data),
      tipo: 'ponto_aprovado',
      agendamentoId,
      metadata: {
        data
      }
    });
  }
  static async notificarPontoRejeitado(userId, agendamentoId, data, motivo) {
    const {
      data: config
    } = await supabase.from('configuracoes').select('language').eq('user_id', userId).single();
    const language = config?.language || 'pt-BR';
    return await this.criarNotificacao({
      userId,
      titulo: t(language, 'notifications.rejectedTitle'),
      mensagem: t(language, 'notifications.rejectedMessage').replace('{date}', data).replace('{reason}', motivo),
      tipo: 'ponto_rejeitado',
      agendamentoId,
      metadata: {
        data,
        motivo
      }
    });
  }
  static async enviarLembretePonto(userId, momento) {
    const {
      data: config
    } = await supabase.from('configuracoes').select('language').eq('user_id', userId).single();
    const language = config?.language || 'pt-BR';
    const mensagens = {
      inicio: t(language, 'notifications.reminderStart'),
      intervalo: t(language, 'notifications.reminderBreak'),
      fim: t(language, 'notifications.reminderEnd')
    };
    return await this.criarNotificacao({
      userId,
      titulo: t(language, 'notifications.reminderTitle'),
      mensagem: mensagens[momento] || t(language, 'notifications.reminderDefault'),
      tipo: 'lembrete_ponto',
      metadata: {
        momento
      }
    });
  }
  static async enviarEmail({
    para,
    assunto,
    mensagem,
    html
  }) {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-email', {
        body: {
          to: para,
          subject: assunto,
          message: mensagem,
          html: html
        }
      });
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
    `;
    return await this.enviarEmail({
      para: userEmail,
      assunto: 'Relatório Semanal - YourTime',
      mensagem: `Relatório semanal com ${relatorio.totalHoras} horas trabalhadas`,
      html
    });
  }
  static subscribeToNotifications(userId, callback) {
    const channel = supabase.channel(`notificacoes-${userId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notificacoes',
      filter: `user_id=eq.${userId}`
    }, payload => {
      callback(payload.new);
    }).subscribe();
    return channel;
  }
  static unsubscribeFromNotifications(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
}
export default NotificationService;
