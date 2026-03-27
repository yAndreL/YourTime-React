import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
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
            session
          }
        } = await supabase.auth.getSession();
        const user = session?.user;
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
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        const dataLimite = trintaDiasAtras.toISOString();
        await supabase.from('notificacoes').delete().lt('created_at', dataLimite);
      } catch (error) {}
    };
    const verificarELimparNotificacoes = async () => {
      const {
        isAdmin,
        superiorEmpresaId
      } = await verificarSeEhAdmin();
      if (!isAdmin || !superiorEmpresaId) {
        return;
      }
      await limparNotificacoesAnteriorizadas();
      await deletarNotificacoesAntigas();
    };
    verificarELimparNotificacoes().then(() => {
      setInitialized(true);
    });
    intervalId = setInterval(verificarELimparNotificacoes, 60000);
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
