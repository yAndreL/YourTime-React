// useReminderSystem.js
// Hook para sistema de lembretes automáticos de ponto

import { useEffect, useRef } from 'react'
import NotificationService from '../services/NotificationService'
import ConfigService from '../services/ConfigService'
import { supabase } from '../config/supabase'
import { getLocalDateString } from '../utils/dateUtils'

/**
 * Hook que gerencia lembretes automáticos para registro de ponto
 * Verifica a cada minuto se está na hora de enviar lembretes
 */
function useReminderSystem() {
  const intervalRef = useRef(null)
  const lastCheckRef = useRef({
    entrada: null,
    intervalo_saida: null,
    intervalo_retorno: null,
    saida: null
  })

  useEffect(() => {
    // Iniciar verificação a cada minuto
    intervalRef.current = setInterval(checkReminders, 60000)
    
    // Verificar imediatamente ao montar
    checkReminders()

    // Limpar interval ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  }

  const getCurrentUserProfile = async () => {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data } = await supabase
      .from('profiles')
      .select('id, nome, email')
      .eq('id', userId)
      .single()

    return data
  }

  const checkReminders = async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Verificar se lembretes estão habilitados
      const lembretesAtivos = await ConfigService.lembretesHabilitados(userId)
      if (!lembretesAtivos) return

      // Buscar configurações de horários
      const horarios = await ConfigService.buscarHorarios(userId)
      if (!horarios) return

      const agora = new Date()
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
      const hoje = getLocalDateString()

      // Horário de entrada
      if (horaAtual === horarios.entrada && lastCheckRef.current.entrada !== hoje) {
        await enviarLembrete(userId, 'inicio')
        lastCheckRef.current.entrada = hoje
      }

      // Horário de saída para intervalo (12:00)
      if (horaAtual === '12:00' && lastCheckRef.current.intervalo_saida !== hoje) {
        await enviarLembrete(userId, 'intervalo')
        lastCheckRef.current.intervalo_saida = hoje
      }

      // Horário de retorno do intervalo (13:00)
      if (horaAtual === '13:00' && lastCheckRef.current.intervalo_retorno !== hoje) {
        await enviarLembrete(userId, 'intervalo')
        lastCheckRef.current.intervalo_retorno = hoje
      }

      // Horário de saída
      if (horaAtual === horarios.saida && lastCheckRef.current.saida !== hoje) {
        await enviarLembrete(userId, 'fim')
        lastCheckRef.current.saida = hoje
      }

      // 15 minutos antes da saída
      const horaSaidaParts = horarios.saida.split(':')
      const minutosSaida = parseInt(horaSaidaParts[0]) * 60 + parseInt(horaSaidaParts[1])
      const minutosAtual = agora.getHours() * 60 + agora.getMinutes()
      
      if (minutosSaida - minutosAtual === 15 && lastCheckRef.current.saida !== hoje) {
        await enviarLembrete(userId, 'fim', true)
      }

    } catch (error) {

    }
  }

  const enviarLembrete = async (userId, momento, isPreAviso = false) => {
    try {
      // Buscar perfil para email
      const profile = await getCurrentUserProfile()
      if (!profile) return

      // Criar notificação in-app
      await NotificationService.enviarLembretePonto(userId, momento)

      // Verificar se deve enviar email
      const config = await ConfigService.buscarConfiguracoes(userId)
      if (config.success && config.data?.email_relatorios) {
        await enviarEmailLembrete(profile, momento, isPreAviso)
      }
    } catch (error) {

    }
  }

  const enviarEmailLembrete = async (profile, momento, isPreAviso) => {
    const assuntos = {
      inicio: 'Lembrete: Hora de Registrar Entrada',
      intervalo: 'Lembrete: Registrar Intervalo',
      fim: isPreAviso 
        ? 'Lembrete: Fim do Expediente em 15 minutos' 
        : 'Lembrete: Hora de Registrar Saída'
    }

    const mensagens = {
      inicio: `
        <h2>🕐 Hora de Registrar sua Entrada!</h2>
        <p>Olá ${profile.nome},</p>
        <p>Este é um lembrete automático para registrar sua entrada no sistema.</p>
        <p><strong>Acesse agora:</strong> <a href="${window.location.origin}">YourTime</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Para desativar estes lembretes, acesse Configurações no sistema.
        </p>
      `,
      intervalo: `
        <h2>🍽️ Hora do Intervalo!</h2>
        <p>Olá ${profile.nome},</p>
        <p>Lembre-se de registrar sua saída e retorno do intervalo.</p>
        <p><strong>Acesse agora:</strong> <a href="${window.location.origin}">YourTime</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Para desativar estes lembretes, acesse Configurações no sistema.
        </p>
      `,
      fim: isPreAviso ? `
        <h2>⏰ Fim do Expediente em 15 minutos!</h2>
        <p>Olá ${profile.nome},</p>
        <p>O fim do seu expediente está próximo. Não esqueça de registrar sua saída!</p>
        <p><strong>Acesse agora:</strong> <a href="${window.location.origin}">YourTime</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Para desativar estes lembretes, acesse Configurações no sistema.
        </p>
      ` : `
        <h2>🏁 Hora de Registrar sua Saída!</h2>
        <p>Olá ${profile.nome},</p>
        <p>Fim do expediente! Lembre-se de registrar sua saída.</p>
        <p><strong>Acesse agora:</strong> <a href="${window.location.origin}">YourTime</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Para desativar estes lembretes, acesse Configurações no sistema.
        </p>
      `
    }

    await NotificationService.enviarEmail({
      para: profile.email,
      assunto: assuntos[momento],
      html: mensagens[momento],
      mensagem: `Lembrete de ponto - ${momento}`
    })
  }

  // Retornar função para disparar lembrete manualmente se necessário
  return {
    checkReminders,
    triggerManualReminder: (momento) => {
      const userId = getCurrentUserId()
      if (userId) {
        enviarLembrete(userId, momento)
      }
    }
  }
}

export default useReminderSystem
