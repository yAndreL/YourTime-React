import { supabase } from '../config/supabase';

class AuditoriaService {
  static async registrar({ userId, acao, tabela, registroId, dadosAnteriores, dadosNovos }) {
    try {
      const { error } = await supabase
        .from('audit_log')
        .insert([{
          user_id: userId,
          acao,
          tabela,
          registro_id: registroId || null,
          dados_anteriores: dadosAnteriores || null,
          dados_novos: dadosNovos || null,
          user_agent: navigator.userAgent?.substring(0, 500) || null
        }]);

      if (error) {
        console.error('Erro ao registrar auditoria:', error);
      }
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  }

  static async buscarLogs({ tabela, registroId, userId, limite = 50, offset = 0 } = {}) {
    try {
      let query = supabase
        .from('audit_log')
        .select('*, profiles:user_id(nome, email)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limite - 1);

      if (tabela) query = query.eq('tabela', tabela);
      if (registroId) query = query.eq('registro_id', registroId);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async buscarHistoricoRegistro(tabela, registroId) {
    return this.buscarLogs({ tabela, registroId, limite: 100 });
  }

  static formatarAcao(acao) {
    const acoes = {
      'aprovar_ponto': 'Aprovação de ponto',
      'rejeitar_ponto': 'Rejeição de ponto',
      'aprovar_ausencia': 'Aprovação de ausência',
      'rejeitar_ausencia': 'Rejeição de ausência',
      'criar_batida': 'Registro de batida',
      'editar_perfil': 'Edição de perfil',
      'desativar_usuario': 'Desativação de usuário',
      'criar_projeto': 'Criação de projeto',
      'editar_projeto': 'Edição de projeto',
      'criar_ausencia': 'Registro de ausência',
      'fechamento_mensal': 'Fechamento mensal'
    };
    return acoes[acao] || acao;
  }
}

export default AuditoriaService;
