// useTimeTracking.js
// Hook personalizado para gerenciar dados de ponto do usuário

import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase.js'

export function useTimeTracking() {
  const [userData, setUserData] = useState(null)
  const [timeRecords, setTimeRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carregar dados do cache imediatamente
  useEffect(() => {
    const cachedTimeRecords = sessionStorage.getItem('cachedTimeRecords')
    if (cachedTimeRecords) {
      try {
        const parsed = JSON.parse(cachedTimeRecords)
        setTimeRecords(parsed)
        setLoading(false) // Marca como não carregando se temos cache
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Buscar dados do usuário atual
  const fetchUserData = async () => {
    try {
      // Não mostrar loading se já temos dados em cache
      const hasCache = sessionStorage.getItem('cachedTimeRecords')
      if (!hasCache) {
        setLoading(true)
      }
      setError(null)

      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Buscar perfil do usuário autenticado
      const { data: profile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) {
        throw userError
      }

      if (profile) {
        setUserData(profile)
      } else {
        setUserData(null)
      }
    } catch (err) {
      setError(`Erro ao buscar dados do usuário: ${err.message}`)
      setUserData(null)
    } finally {
      setLoading(false)
    }
  }

  // Buscar registros de ponto (últimos 90 dias para capturar todos os pendentes)
  const fetchTimeRecords = async () => {
    try {
      if (!userData?.id) {
        return
      }

      const today = new Date()
      
      // Buscar registros dos últimos 90 dias para capturar todos os pendentes
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)



      const { data: records, error: recordsError } = await supabase
        .from('agendamento')
        .select('*')
        .eq('user_id', userData.id)
        .gte('data', startDate.toISOString().split('T')[0])
        .order('data', { ascending: true })

      if (recordsError) {

        throw recordsError
      }

      setTimeRecords(records || [])
      // Salvar no cache para próximas navegações
      sessionStorage.setItem('cachedTimeRecords', JSON.stringify(records || []))
      setError(null) // Limpar erros anteriores se sucesso

    } catch (err) {

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

    // Primeira jornada (ex: 08:00 - 12:00 = 4h)
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
      const saida1 = new Date(`2000-01-01T${record.saida1}`)
      totalMinutes += (saida1 - entrada1) / (1000 * 60)
    }

    // Segunda jornada (ex: 13:00 - 18:00 = 5h)
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
      const saida2 = new Date(`2000-01-01T${record.saida2}`)
      totalMinutes += (saida2 - entrada2) / (1000 * 60)
    }

    // NÃO subtrair pausas - o intervalo de almoço JÁ está fora do cálculo
    // O tempo entre saida1 (12:00) e entrada2 (13:00) não é contabilizado
    // Exemplo: 08-12 (4h) + 13-18 (5h) = 9h trabalhadas (o almoço 12-13 já está excluído)

    return totalMinutes
  }

  // Calcular horas aprovadas de hoje (status 'A')
  const calculateTodayApprovedHours = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = timeRecords.filter(record => record.data === today && record.status === 'A')

    if (!todayRecords.length) return '00:00'

    const totalMinutes = todayRecords.reduce((sum, record) => sum + calculateDailyWorkedMinutes(record), 0)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Calcular TOTAL de horas pendentes (status 'P') - não apenas hoje
  const calculateTodayPendingHours = () => {
    // Filtra TODOS os registros pendentes, não apenas de hoje
    const pendingRecords = timeRecords.filter(record => record.status === 'P')

    if (!pendingRecords.length) return '00:00'

    const totalMinutes = pendingRecords.reduce((sum, record) => sum + calculateDailyWorkedMinutes(record), 0)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Dados formatados para o dashboard
  const getDashboardData = () => {
    return {
      saldoHoras: calculateTimeBalance(),
      horasHoje: calculateTodayApprovedHours(),
      horasPendentes: calculateTodayPendingHours(),
      projetoAtual: userData?.cargo || 'Desenvolvimento',
      status: 'Trabalhando',
      isWorking: true,
      timeRecords: timeRecords
    }
  }

  // Dados semanais formatados para gráficos (apenas semana atual e registros aprovados)
  const getWeeklyChartData = () => {
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    // Calcular início da semana (segunda-feira)
    const startOfWeek = new Date(today)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(today.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    // Calcular fim da semana (domingo)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Filtrar registros da semana atual com status APROVADO ('A') ou PENDENTE ('P')
    const weekRecords = timeRecords.filter(r => {
      const recordDate = new Date(r.data + 'T00:00:00')
      const isInWeek = recordDate >= startOfWeek && recordDate <= endOfWeek
      const isApprovedOrPending = r.status === 'A' || r.status === 'P'
      
      return isInWeek && isApprovedOrPending
    })

    return weekDays.map((day, index) => {
      const targetDate = new Date(startOfWeek)
      targetDate.setDate(startOfWeek.getDate() + index)

      const dateStr = targetDate.toISOString().split('T')[0]
      const record = weekRecords.find(r => r.data === dateStr)

      const minutes = record ? calculateDailyWorkedMinutes(record) : 0
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60

      // Verificar se é hoje
      const todayStr = today.toISOString().split('T')[0]
      const isToday = dateStr === todayStr

      return {
        dia: day,
        horas: minutes > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : '0:00',
        entrada: record?.entrada1 || '--:--',
        saida: record?.saida2 || record?.saida1 || '--:--',
        isToday: isToday,
        status: record?.status || null // Adicionar status para usar no gráfico
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
