// useTimeTracking.js
// Hook personalizado para gerenciar dados de ponto do usuário

import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase.js'

export function useTimeTracking() {
  const [userData, setUserData] = useState(null)
  const [timeRecords, setTimeRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Buscar dados do usuário atual
  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Buscando dados do usuário...')

      // Buscar primeiro usuário disponível (para desenvolvimento)
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

      if (userError) {
        console.error('❌ Erro na consulta de usuários:', userError)
        throw userError
      }

      console.log('✅ Dados de usuários recebidos:', users)

      if (users && users.length > 0) {
        setUserData(users[0])
        console.log('👤 Usuário definido:', users[0])
      } else {
        console.log('⚠️ Nenhum usuário encontrado')
        setUserData(null)
      }
    } catch (err) {
      console.error('❌ Erro ao buscar dados do usuário:', err)
      setError(`Erro ao buscar dados do usuário: ${err.message}`)
      setUserData(null)
    } finally {
      setLoading(false)
    }
  }

  // Buscar registros de ponto da semana atual
  const fetchTimeRecords = async () => {
    try {
      if (!userData?.id) {
        console.log('⚠️ userData ou userData.id não disponível, pulando busca de registros')
        return
      }

      console.log('📊 Buscando registros de ponto para usuário:', userData.id)

      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay()) // Domingo
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Sábado
      endOfWeek.setHours(23, 59, 59, 999)

      console.log('📅 Período da semana:', startOfWeek.toISOString().split('T')[0], 'até', endOfWeek.toISOString().split('T')[0])

      const { data: records, error: recordsError } = await supabase
        .from('agendamento')
        .select('*')
        .eq('user_id', userData.id)
        .gte('data', startOfWeek.toISOString().split('T')[0])
        .lte('data', endOfWeek.toISOString().split('T')[0])
        .order('data', { ascending: true })

      if (recordsError) {
        console.error('❌ Erro na consulta de registros:', recordsError)
        throw recordsError
      }

      console.log('✅ Registros recebidos:', records?.length || 0, 'registros')
      setTimeRecords(records || [])
      setError(null) // Limpar erros anteriores se sucesso

    } catch (err) {
      console.error('❌ Erro ao buscar registros de ponto:', err)
      setError(`Erro ao buscar registros: ${err.message}`)
      setTimeRecords([]) // Definir array vazio em caso de erro
    }
  }

  // Calcular saldo de horas baseado nos registros
  const calculateTimeBalance = () => {
    if (!timeRecords.length) return '+00:00'

    let totalMinutes = 0

    timeRecords.forEach(record => {
      // Calcular horas trabalhadas por dia
      const workedMinutes = calculateDailyWorkedMinutes(record)
      totalMinutes += workedMinutes
    })

    const hours = Math.floor(Math.abs(totalMinutes) / 60)
    const minutes = Math.abs(totalMinutes) % 60

    const sign = totalMinutes >= 0 ? '+' : '-'
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Calcular horas trabalhadas em um dia específico
  const calculateDailyWorkedMinutes = (record) => {
    let totalMinutes = 0

    // Primeira jornada
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
      const saida1 = new Date(`2000-01-01T${record.saida1}`)
      totalMinutes += (saida1 - entrada1) / (1000 * 60)
    }

    // Segunda jornada
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
      const saida2 = new Date(`2000-01-01T${record.saida2}`)
      totalMinutes += (saida2 - entrada2) / (1000 * 60)
    }

    // Subtrair pausas
    totalMinutes -= (record.pausa_almoco || 0)
    totalMinutes -= (record.pausas_extras || 0)

    return totalMinutes
  }

  // Calcular horas de hoje
  const calculateTodayHours = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecord = timeRecords.find(record => record.data === today)

    if (!todayRecord) return '00:00'

    const minutes = calculateDailyWorkedMinutes(todayRecord)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Dados formatados para o dashboard
  const getDashboardData = () => {
    return {
      saldoHoras: calculateTimeBalance(),
      horasHoje: calculateTodayHours(),
      projetoAtual: userData?.cargo || 'Desenvolvimento',
      status: 'Trabalhando',
      isWorking: true,
      timeRecords: timeRecords
    }
  }

  // Dados semanais formatados para gráficos
  const getWeeklyChartData = () => {
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const today = new Date()
    const currentDay = today.getDay()

    return weekDays.map((day, index) => {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() - currentDay + index)

      const dateStr = targetDate.toISOString().split('T')[0]
      const record = timeRecords.find(r => r.data === dateStr)

      const minutes = record ? calculateDailyWorkedMinutes(record) : 0
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60

      return {
        dia: day,
        horas: minutes > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : '0:00',
        entrada: record?.entrada1 || '--:--',
        saida: record?.saida2 || record?.saida1 || '--:--',
        isToday: index === currentDay
      }
    })
  }

  // Registrar novo ponto
  const registerTimeRecord = async (timeData) => {
    try {
      if (!userData?.id) {
        throw new Error('Usuário não identificado')
      }

      const { data, error } = await supabase
        .from('agendamento')
        .insert([{
          user_id: userData.id,
          ...timeData
        }])
        .select()

      if (error) throw error

      // Recarregar dados após registro
      await fetchTimeRecords()
      return { success: true, data }
    } catch (err) {
      console.error('Erro ao registrar ponto:', err)
      return { success: false, error: err.message }
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (userData?.id) {
      fetchTimeRecords()
    }
  }, [userData])

  return {
    userData,
    timeRecords,
    loading,
    error,
    dashboardData: getDashboardData(),
    weeklyData: getWeeklyChartData(),
    registerTimeRecord,
    refetch: fetchTimeRecords
  }
}

export default useTimeTracking
