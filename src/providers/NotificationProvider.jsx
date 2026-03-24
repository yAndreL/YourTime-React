import { createContext, useContext, useEffect, useState } from 'react';
import NotificationService from '../services/NotificationService';
import { supabase } from '../config/supabase';
import { formatDate } from '../utils/dateUtils';
const NotificationContext = createContext({});
export const useNotificationContext = () => useContext(NotificationContext);
export const NotificationProvider = ({
  children
}) => {
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    let intervalId;
    const verificarSeEhAdmin = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return {
          isAdmin: false,
          superiorEmpresaId: null
        };
        const {
          data: profile
        } = await supabase.from('profiles').select('role, superior_empresa_id').eq('id', user.id).single();
        return {
          isAdmin: profile?.role === 'admin',
          superiorEmpresaId: profile?.superior_empresa_id
        };
      } catch (error) {
        return {
          isAdmin: false,
          superiorEmpresaId: null
        };
      }
    };
    const buscarPontosPendentes = async superiorEmpresaId => {
      try {
        const {
          data: pontos,
          error
        } = await supabase.from('agendamento').select('id, data, entrada1, saida1, entrada2, saida2, user_id, superior_empresa_id, status').eq('status', 'P').eq('superior_empresa_id', superiorEmpresaId).order('data', {
          ascending: false
        });
        if (error) throw error;
        if (!pontos || pontos.length === 0) return [];
        const userIds = [...new Set(pontos.map(p => p.user_id))];
        const {
          data: profiles
        } = await supabase.from('profiles').select('id, nome').in('id', userIds);
        const profilesMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);
        return pontos.map(ponto => ({
          id: ponto.id,
          data: ponto.data,
          entrada1: ponto.entrada1,
          user_id: ponto.user_id,
          funcionario_nome: profilesMap.get(ponto.user_id) || 'Funcionário',
          superior_empresa_id: ponto.superior_empresa_id
        }));
      } catch (error) {
        return [];
      }
    };
    const criarNotificacoesParaPontosPendentes = async (pontosPendentes, superiorEmpresaId) => {
      if (pontosPendentes.length === 0) return;
      try {
        const {
          data: admins
        } = await supabase.from('profiles').select('id, superior_empresa_id').eq('role', 'admin').eq('superior_empresa_id', superiorEmpresaId);
        if (!admins || admins.length === 0) return;
        const {
          data: notificacoesExistentes
        } = await supabase.from('notificacoes').select('agendamento_id, user_id').eq('tipo', 'aprovacao_pendente').in('agendamento_id', pontosPendentes.map(p => p.id));
        const existentes = new Set(notificacoesExistentes?.map(n => `${n.agendamento_id}-${n.user_id}`) || []);
        const notificacoesParaCriar = [];
        for (const ponto of pontosPendentes) {
          for (const admin of admins) {
            if (admin.id === ponto.user_id) {
              continue;
            }
            const chave = `${ponto.id}-${admin.id}`;
            if (!existentes.has(chave)) {
              const dataFormatada = formatDate(ponto.data, 'DD/MM/YYYY');
              notificacoesParaCriar.push({
                user_id: admin.id,
                tipo: 'aprovacao_pendente',
                titulo: 'Ponto Aguardando Aprovação',
                mensagem: `${ponto.funcionario_nome} registrou um ponto e aguarda aprovação`,
                agendamento_id: ponto.id,
                superior_empresa_id: superiorEmpresaId,
                metadata: {
                  funcionario: ponto.funcionario_nome,
                  data_ponto: ponto.data,
                  data_formatada: dataFormatada
                },
                lida: false,
                created_at: new Date().toISOString()
              });
            }
          }
        }
        if (notificacoesParaCriar.length > 0) {
          const {
            error
          } = await supabase.from('notificacoes').insert(notificacoesParaCriar);
          if (error) throw error;
        }
      } catch (error) {}
    };
    const limparNotificacoesAnteriorizadas = async () => {
      try {
        const {
          data: notificacoesPendentes
        } = await supabase.from('notificacoes').select('id, agendamento_id').eq('tipo', 'aprovacao_pendente').eq('lida', false).not('agendamento_id', 'is', null);
        if (!notificacoesPendentes || notificacoesPendentes.length === 0) return;
        const agendamentoIds = notificacoesPendentes.map(n => n.agendamento_id);
        const {
          data: agendamentos
        } = await supabase.from('agendamento').select('id, status').in('id', agendamentoIds);
        const notificacoesParaMarcar = notificacoesPendentes.filter(n => {
          const agendamento = agendamentos?.find(a => a.id === n.agendamento_id);
          return agendamento && agendamento.status !== 'P';
        }).map(n => n.id);
        if (notificacoesParaMarcar.length > 0) {
          await supabase.from('notificacoes').update({
            lida: true,
            lida_em: new Date().toISOString()
          }).in('id', notificacoesParaMarcar);
        }
      } catch (error) {}
    };
    const deletarNotificacoesAntigas = async () => {
      try {
        const doisDiasAtras = new Date();
        doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
        const dataLimite = doisDiasAtras.toISOString();
        const {
          data,
          error
        } = await supabase.from('notificacoes').delete().lt('created_at', dataLimite);
        if (error) throw error;
      } catch (error) {}
    };
    const verificarECriarNotificacoes = async () => {
      const {
        isAdmin,
        superiorEmpresaId
      } = await verificarSeEhAdmin();
      if (!isAdmin || !superiorEmpresaId) {
        return;
      }
      const pontosPendentes = await buscarPontosPendentes(superiorEmpresaId);
      await criarNotificacoesParaPontosPendentes(pontosPendentes, superiorEmpresaId);
      await limparNotificacoesAnteriorizadas();
      await deletarNotificacoesAntigas();
    };
    verificarECriarNotificacoes().then(() => {
      setInitialized(true);
    });
    intervalId = setInterval(verificarECriarNotificacoes, 60000);
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);
  return <NotificationContext.Provider value={{
    initialized
  }}>
      {children}
    </NotificationContext.Provider>;
};
