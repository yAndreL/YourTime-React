import { createContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
const NotificationContext = createContext({});
export const NotificationProvider = ({
  children
}) => {
  const [inicializado, setInicializado] = useState(false);
  useEffect(() => {
    let idIntervalo;
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
          data: profile,
          error: erroPerfil
        } = await supabase.from('profiles').select('role, superior_empresa_id').eq('id', user.id).maybeSingle();
        if (erroPerfil && import.meta.env.DEV) {
          console.warn('[NotificationProvider] profiles:', erroPerfil.message);
        }
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
          data: notificacoesPendentes,
          error: erroNotificacoes
        } = await supabase.from('notificacoes').select('id, agendamento_id').eq('tipo', 'aprovacao_pendente').eq('lida', false).not('agendamento_id', 'is', null);
        if (erroNotificacoes) return;
        if (!notificacoesPendentes || notificacoesPendentes.length === 0) return;
        const agendamentoIds = notificacoesPendentes.map(n => n.agendamento_id).filter(Boolean);
        if (agendamentoIds.length === 0) return;
        const {
          data: agendamentos,
          error: erroAgendamentos
        } = await supabase.from('agendamento').select('id, status').in('id', agendamentoIds);
        if (erroAgendamentos) return;
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
      setInicializado(true);
    });
    idIntervalo = setInterval(verificarELimparNotificacoes, 60000);
    return () => {
      if (idIntervalo) {
        clearInterval(idIntervalo);
      }
    };
  }, []);
  return <NotificationContext.Provider value={{
    inicializado
  }}>
      {children}
    </NotificationContext.Provider>;
};
