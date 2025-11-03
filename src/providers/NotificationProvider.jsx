import { createContext, useContext, useEffect, useState } from 'react';
import NotificationService from '../services/NotificationService';
import { supabase } from '../config/supabase';

const NotificationContext = createContext({});

export const useNotificationContext = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {

    let intervalId;

    const verificarSeEhAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        return profile?.role === 'admin';
      } catch (error) {

        return false;
      }
    };

    const buscarPontosPendentes = async () => {
      try {
        const { data, error } = await supabase
          .from('agendamento')
          .select(`
            id,
            data,
            hora_entrada,
            user_id,
            profiles:user_id (
              id,
              nome
            )
          `)
          .eq('status', 'P')
          .order('data', { ascending: false });

        if (error) throw error;

        return data?.map(ponto => ({
          id: ponto.id,
          data: ponto.data,
          hora_entrada: ponto.hora_entrada,
          user_id: ponto.user_id,
          funcionario_nome: ponto.profiles?.nome || 'Funcionário'
        })) || [];
      } catch (error) {

        return [];
      }
    };

    const criarNotificacoesParaPontosPendentes = async (pontosPendentes) => {
      if (pontosPendentes.length === 0) return;

      try {
        // Buscar todos os admins
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        if (!admins || admins.length === 0) return;

        // Verificar quais notificações já existem para estes pontos
        const { data: notificacoesExistentes } = await supabase
          .from('notificacoes')
          .select('agendamento_id, user_id')
          .eq('tipo', 'aprovacao_pendente')
          .in('agendamento_id', pontosPendentes.map(p => p.id));

        // Criar um Set com as combinações já existentes
        const existentes = new Set(
          notificacoesExistentes?.map(n => `${n.agendamento_id}-${n.user_id}`) || []
        );

        // Criar notificações apenas para combinações que não existem
        const notificacoesParaCriar = [];
        for (const ponto of pontosPendentes) {
          for (const admin of admins) {
            // NÃO criar notificação para o próprio usuário que registrou o ponto
            if (admin.id === ponto.user_id) {
              continue; // Pula este admin (que é o próprio funcionário)
            }

            const chave = `${ponto.id}-${admin.id}`;
            if (!existentes.has(chave)) {
              const dataFormatada = new Date(ponto.data).toLocaleDateString('pt-BR');
              notificacoesParaCriar.push({
                user_id: admin.id,
                tipo: 'aprovacao_pendente',
                titulo: 'Ponto Aguardando Aprovação',
                mensagem: `${ponto.funcionario_nome} registrou um ponto e aguarda aprovação`,
                agendamento_id: ponto.id,
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
          const { error } = await supabase
            .from('notificacoes')
            .insert(notificacoesParaCriar);

          if (error) throw error;
        }
      } catch (error) {

      }
    };

    const limparNotificacoesAnteriorizadas = async () => {
      try {
        // Buscar notificações de aprovação pendente não lidas
        const { data: notificacoesPendentes } = await supabase
          .from('notificacoes')
          .select('id, agendamento_id')
          .eq('tipo', 'aprovacao_pendente')
          .eq('lida', false)
          .not('agendamento_id', 'is', null);

        if (!notificacoesPendentes || notificacoesPendentes.length === 0) return;

        // Buscar status atual dos agendamentos
        const agendamentoIds = notificacoesPendentes.map(n => n.agendamento_id);
        const { data: agendamentos } = await supabase
          .from('agendamento')
          .select('id, status')
          .in('id', agendamentoIds);

        // Marcar como lida notificações cujos pontos não estão mais pendentes
        const notificacoesParaMarcar = notificacoesPendentes
          .filter(n => {
            const agendamento = agendamentos?.find(a => a.id === n.agendamento_id);
            return agendamento && agendamento.status !== 'P';
          })
          .map(n => n.id);

        if (notificacoesParaMarcar.length > 0) {
          await supabase
            .from('notificacoes')
            .update({ lida: true, lida_em: new Date().toISOString() })
            .in('id', notificacoesParaMarcar);
        }
      } catch (error) {

      }
    };

    const deletarNotificacoesAntigas = async () => {
      try {
        // Calcular data de 2 dias atrás
        const doisDiasAtras = new Date();
        doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
        const dataLimite = doisDiasAtras.toISOString();

        // Deletar notificações criadas há mais de 2 dias
        const { data, error } = await supabase
          .from('notificacoes')
          .delete()
          .lt('created_at', dataLimite);

        if (error) throw error;
      } catch (error) {

      }
    };

    const verificarECriarNotificacoes = async () => {
      const ehAdmin = await verificarSeEhAdmin();
      if (!ehAdmin) {

        return;
      }

      const pontosPendentes = await buscarPontosPendentes();
      await criarNotificacoesParaPontosPendentes(pontosPendentes);
      await limparNotificacoesAnteriorizadas();
      await deletarNotificacoesAntigas();
    };

    // Executar imediatamente ao montar
    verificarECriarNotificacoes().then(() => {
      setInitialized(true);

    });

    // Configurar intervalo de 60 segundos
    intervalId = setInterval(verificarECriarNotificacoes, 60000);

    // Cleanup ao desmontar
    return () => {
      if (intervalId) {
        clearInterval(intervalId);

      }
    };
  }, []); // Dependency array vazio - executa apenas uma vez

  return (
    <NotificationContext.Provider value={{ initialized }}>
      {children}
    </NotificationContext.Provider>
  );
};
