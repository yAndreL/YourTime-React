import { useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import NotificationService from '../services/NotificationService';
export const usePendingPointsNotifications = () => {
  const verificarSeEhAdmin = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return false;
      const {
        data: profile
      } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return profile?.role === 'admin';
    } catch (error) {
      return false;
    }
  }, []);
  const buscarPontosPendentes = useCallback(async () => {
    try {
      const {
        data: pontosPendentes,
        error
      } = await supabase.from('agendamento').select(`
          id,
          data,
          user_id,
          profiles!agendamento_user_id_fkey (
            id,
            nome,
            email
          )
        `).eq('status', 'P').order('data', {
        ascending: false
      });
      if (error) {
        console.error('Erro ao buscar pontos pendentes:', error);
        return [];
      }
      return pontosPendentes || [];
    } catch (error) {
      console.error('Erro na busca de pontos pendentes:', error);
      return [];
    }
  }, []);
  const criarNotificacoesParaPontosPendentes = useCallback(async () => {
    try {
      const pontosPendentes = await buscarPontosPendentes();
      if (pontosPendentes.length === 0) {
        return;
      }
      const {
        data: notificacoesExistentes
      } = await supabase.from('notificacoes').select('agendamento_id, lida').eq('tipo', 'aprovacao_pendente').in('agendamento_id', pontosPendentes.map(p => p.id));
      const agendamentosComNotificacao = new Set((notificacoesExistentes || []).map(n => n.agendamento_id));
      const pontosNovos = pontosPendentes.filter(ponto => !agendamentosComNotificacao.has(ponto.id));
      if (pontosNovos.length === 0) {
        return;
      }
      for (const ponto of pontosNovos) {
        const funcionarioNome = ponto.profiles?.nome || 'Funcionário';
        const dataPonto = ponto.data;
        await NotificationService.notificarAdminsPontoPendente(ponto.id, funcionarioNome, dataPonto, ponto.user_id);
      }
    } catch (error) {}
  }, [buscarPontosPendentes]);
  const limparNotificacoesAnteriorizadas = useCallback(async () => {
    try {
      const {
        data: notificacoesPendentes
      } = await supabase.from('notificacoes').select('id, agendamento_id').eq('tipo', 'aprovacao_pendente').eq('lida', false).not('agendamento_id', 'is', null);
      if (!notificacoesPendentes || notificacoesPendentes.length === 0) {
        return;
      }
      const agendamentoIds = notificacoesPendentes.map(n => n.agendamento_id);
      const {
        data: agendamentos
      } = await supabase.from('agendamento').select('id, status').in('id', agendamentoIds);
      const pendentesReais = new Set(agendamentos?.filter(a => a.status === 'P').map(a => a.id) || []);
      const notificacoesParaMarcar = notificacoesPendentes.filter(n => !pendentesReais.has(n.agendamento_id)).map(n => n.id);
      if (notificacoesParaMarcar.length > 0) {
        await supabase.from('notificacoes').update({
          lida: true,
          lida_em: new Date().toISOString()
        }).in('id', notificacoesParaMarcar);
      }
    } catch (error) {}
  }, []);
  useEffect(() => {
    let interval = null;
    const inicializar = async () => {
      const ehAdmin = await verificarSeEhAdmin();
      if (!ehAdmin) {
        return;
      }
      await criarNotificacoesParaPontosPendentes();
      await limparNotificacoesAnteriorizadas();
      interval = setInterval(async () => {
        const ehAdmin = await verificarSeEhAdmin();
        if (ehAdmin) {
          await criarNotificacoesParaPontosPendentes();
          await limparNotificacoesAnteriorizadas();
        }
      }, 60000);
    };
    inicializar();
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);
  return {
    buscarPontosPendentes,
    criarNotificacoesParaPontosPendentes,
    limparNotificacoesAnteriorizadas
  };
};
