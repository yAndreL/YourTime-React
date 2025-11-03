// usePendingPointsNotifications.js
// Hook para gerenciar notificações de pontos pendentes automaticamente

import { useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import NotificationService from '../services/NotificationService'

export const usePendingPointsNotifications = () => {
  
  // Verificar se o usuário é admin
  const verificarSeEhAdmin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      return profile?.role === 'admin'
    } catch (error) {
      return false
    }
  }, [])
  
  const buscarPontosPendentes = useCallback(async () => {
    try {
      // Buscar TODOS os pontos pendentes com informações do usuário
      const { data: pontosPendentes, error } = await supabase
        .from('agendamento')
        .select(`
          id,
          data,
          user_id,
          profiles:user_id (
            id,
            nome,
            email
          )
        `)
        .eq('status', 'P')
        .order('data', { ascending: false })

      if (error) {

        return []
      }

      return pontosPendentes || []
    } catch (error) {

      return []
    }
  }, [])

  const criarNotificacoesParaPontosPendentes = useCallback(async () => {
    try {
      // 1. Buscar todos os pontos pendentes
      const pontosPendentes = await buscarPontosPendentes()

      if (pontosPendentes.length === 0) {
        return
      }

      // 2. Buscar notificações existentes para evitar duplicatas (verificar TODAS, não só não lidas)
      const { data: notificacoesExistentes } = await supabase
        .from('notificacoes')
        .select('agendamento_id, lida')
        .eq('tipo', 'aprovacao_pendente')
        .in('agendamento_id', pontosPendentes.map(p => p.id))

      const agendamentosComNotificacao = new Set(
        (notificacoesExistentes || []).map(n => n.agendamento_id)
      )

      // 3. Criar notificações apenas para pontos SEM notificação
      const pontosNovos = pontosPendentes.filter(
        ponto => !agendamentosComNotificacao.has(ponto.id)
      )

      if (pontosNovos.length === 0) {
        return
      }

      // 4. Criar notificação para cada ponto pendente (exceto para o próprio usuário)
      for (const ponto of pontosNovos) {
        const funcionarioNome = ponto.profiles?.nome || 'Funcionário'
        const dataPonto = ponto.data

        await NotificationService.notificarAdminsPontoPendente(
          ponto.id,
          funcionarioNome,
          dataPonto,
          ponto.user_id // Passa o ID do usuário que registrou para não notificar ele mesmo
        )
      }
    } catch (error) {

    }
  }, [buscarPontosPendentes])

  const limparNotificacoesAnteriorizadas = useCallback(async () => {
    try {
      // Buscar notificações de pontos que não estão mais pendentes
      const { data: notificacoesPendentes } = await supabase
        .from('notificacoes')
        .select('id, agendamento_id')
        .eq('tipo', 'aprovacao_pendente')
        .eq('lida', false)
        .not('agendamento_id', 'is', null)

      if (!notificacoesPendentes || notificacoesPendentes.length === 0) {
        return
      }

      // Verificar quais agendamentos ainda estão pendentes
      const agendamentoIds = notificacoesPendentes.map(n => n.agendamento_id)
      const { data: agendamentos } = await supabase
        .from('agendamento')
        .select('id, status')
        .in('id', agendamentoIds)

      const pendentesReais = new Set(
        agendamentos?.filter(a => a.status === 'P').map(a => a.id) || []
      )

      // Marcar como lidas as notificações de pontos já aprovados/rejeitados
      const notificacoesParaMarcar = notificacoesPendentes
        .filter(n => !pendentesReais.has(n.agendamento_id))
        .map(n => n.id)

      if (notificacoesParaMarcar.length > 0) {
        await supabase
          .from('notificacoes')
          .update({ lida: true, lida_em: new Date().toISOString() })
          .in('id', notificacoesParaMarcar)

      }
    } catch (error) {

    }
  }, [])

  useEffect(() => {
    let interval = null

    // Verificar pontos pendentes e criar notificações ao montar o componente
    const inicializar = async () => {
      // Só executar se for admin
      const ehAdmin = await verificarSeEhAdmin()
      if (!ehAdmin) {
        return
      }

      // Executar uma única vez ao montar
      await criarNotificacoesParaPontosPendentes()
      await limparNotificacoesAnteriorizadas()

      // Verificar periodicamente (a cada 60 segundos) - mudado para evitar duplicatas
      interval = setInterval(async () => {
        const ehAdmin = await verificarSeEhAdmin()
        if (ehAdmin) {
          await criarNotificacoesParaPontosPendentes()
          await limparNotificacoesAnteriorizadas()
        }
      }, 60000) // 60 segundos (1 minuto)
    }

    inicializar()

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, []) // Dependências vazias - executar apenas uma vez ao montar

  return {
    buscarPontosPendentes,
    criarNotificacoesParaPontosPendentes,
    limparNotificacoesAnteriorizadas
  }
}
