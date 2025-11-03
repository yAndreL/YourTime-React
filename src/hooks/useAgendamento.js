// useAgendamento.js
// Custom hook para gerenciamento de agendamentos

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AgendamentoController from '../controllers/AgendamentoController.js'

const useAgendamento = () => {
  const [agendamentos, setAgendamentos] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Carregar todos os agendamentos
  const loadAgendamentos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = AgendamentoController.getAllAgendamentos()
      setAgendamentos(data)
    } catch (err) {
      setError('Erro ao carregar agendamentos')

    } finally {
      setIsLoading(false)
    }
  }, [])

  // Carregar agendamentos por período
  const loadAgendamentosByDateRange = useCallback(async (startDate, endDate) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = AgendamentoController.getAgendamentosByDateRange(startDate, endDate)
      setAgendamentos(data)
    } catch (err) {
      setError('Erro ao carregar agendamentos por período')

    } finally {
      setIsLoading(false)
    }
  }, [])

  // Salvar novo agendamento
  const saveAgendamento = useCallback(async (agendamentoData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await AgendamentoController.saveAgendamento(agendamentoData)
      
      if (result.success) {
        // Recarregar lista de agendamentos
        await loadAgendamentos()
        
        // Navegar para página de sucesso ou lista
        navigate('/historico')
      }
      
      return result
    } catch (err) {
      const errorResult = {
        success: false,
        message: 'Erro ao salvar agendamento',
        error: err.message
      }
      setError(errorResult.message)
      return errorResult
    } finally {
      setIsLoading(false)
    }
  }, [loadAgendamentos, navigate])

  // Deletar agendamento
  const deleteAgendamento = useCallback(async (id) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = AgendamentoController.deleteAgendamento(id)
      
      if (result.success) {
        // Recarregar lista de agendamentos
        await loadAgendamentos()
      }
      
      return result
    } catch (err) {
      const errorResult = {
        success: false,
        message: 'Erro ao deletar agendamento',
        error: err.message
      }
      setError(errorResult.message)
      return errorResult
    } finally {
      setIsLoading(false)
    }
  }, [loadAgendamentos])

  // Validar dados do agendamento
  const validateAgendamento = useCallback((agendamentoData) => {
    return AgendamentoController.validateAgendamentoData(agendamentoData)
  }, [])

  // Calcular horas trabalhadas
  const calculateWorkingHours = useCallback((agendamentoData) => {
    return AgendamentoController.calculateWorkingHours(agendamentoData)
  }, [])

  // Carregar agendamentos na inicialização
  useEffect(() => {
    loadAgendamentos()
  }, [loadAgendamentos])

  // Estatísticas dos agendamentos
  const statistics = {
    total: agendamentos.length,
    pending: agendamentos.filter(a => a.status === 'pending').length,
    approved: agendamentos.filter(a => a.status === 'approved').length,
    rejected: agendamentos.filter(a => a.status === 'rejected').length,
    totalHours: agendamentos.reduce((total, a) => {
      return total + (a.workingHours?.totalMinutes || 0)
    }, 0)
  }

  return {
    agendamentos,
    isLoading,
    error,
    statistics,
    loadAgendamentos,
    loadAgendamentosByDateRange,
    saveAgendamento,
    deleteAgendamento,
    validateAgendamento,
    calculateWorkingHours,
    setError
  }
}

export default useAgendamento
