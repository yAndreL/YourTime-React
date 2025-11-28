// AgendamentoController.js
// Controller responsável por gerenciar registros de ponto (agendamento)

class AgendamentoController {

  /**
   * Valida os dados do formulário de ponto
   * @param {Object} formData - Dados do formulário
   * @returns {Object} - Resultado da validação
   */
  static validateAgendamentoData(formData) {
    const errors = []

    // Validações obrigatórias
    if (!formData.data) {
      errors.push('Data é obrigatória')
    }

    if (!formData.entrada1) {
      errors.push('Pelo menos uma entrada é obrigatória')
    }

    // Validar formato de data
    if (formData.data) {
      const dataRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dataRegex.test(formData.data)) {
        errors.push('Formato de data inválido (usar YYYY-MM-DD)')
      }
    }

    // Validar horários
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    const timeFields = ['entrada1', 'saida1', 'entrada2', 'saida2']
    
    timeFields.forEach(field => {
      if (formData[field] && !timeRegex.test(formData[field])) {
        errors.push(`Formato de horário inválido para ${field} (usar HH:MM)`)
      }
    })

    // Validar lógica de horários
    if (formData.entrada1 && formData.saida1) {
      if (formData.entrada1 >= formData.saida1) {
        errors.push('Horário de saída deve ser posterior ao de entrada')
      }
    }

    if (formData.entrada2 && formData.saida2) {
      if (formData.entrada2 >= formData.saida2) {
        errors.push('Horário de segunda saída deve ser posterior à segunda entrada')
      }
    }

    if (formData.entrada2 && formData.saida1) {
      if (formData.entrada2 <= formData.saida1) {
        errors.push('Segunda entrada deve ser posterior à primeira saída')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calcula as horas trabalhadas
   * @param {Object} agendamento - Dados do agendamento
   * @returns {Object} - Horas calculadas
   */
  static calculateWorkingHours(agendamento) {
    let totalMinutes = 0

    // Período 1
    if (agendamento.entrada1 && agendamento.saida1) {
      const [entradaH1, entradaM1] = agendamento.entrada1.split(':').map(Number)
      const [saidaH1, saidaM1] = agendamento.saida1.split(':').map(Number)
      
      const entrada1Minutes = entradaH1 * 60 + entradaM1
      const saida1Minutes = saidaH1 * 60 + saidaM1
      
      totalMinutes += saida1Minutes - entrada1Minutes
    }

    // Período 2
    if (agendamento.entrada2 && agendamento.saida2) {
      const [entradaH2, entradaM2] = agendamento.entrada2.split(':').map(Number)
      const [saidaH2, saidaM2] = agendamento.saida2.split(':').map(Number)
      
      const entrada2Minutes = entradaH2 * 60 + entradaM2
      const saida2Minutes = saidaH2 * 60 + saidaM2
      
      totalMinutes += saida2Minutes - entrada2Minutes
    }

    // Descontar pausa se especificada
    if (agendamento.pausa && !isNaN(agendamento.pausa)) {
      totalMinutes -= parseInt(agendamento.pausa)
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return {
      totalMinutes,
      hours,
      minutes,
      formatted: `${hours}h ${minutes}m`
    }
  }

  /**
   * Salva um novo registro de ponto
   * @param {Object} agendamentoData - Dados do agendamento
   * @returns {Object} - Resultado da operação
   */
  static async saveAgendamento(agendamentoData) {
    try {
      // Validar dados
      const validation = this.validateAgendamentoData(agendamentoData)
      
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors
        }
      }

      // Calcular horas trabalhadas
      const workingHours = this.calculateWorkingHours(agendamentoData)

      // Preparar dados para salvar
      const agendamento = {
        id: Date.now(), // Simulação de ID
        ...agendamentoData,
        workingHours,
        createdAt: new Date().toISOString(),
        userId: this.getCurrentUserId()
      }

      // Salvar no localStorage (simulação - em produção seria API)
      const existingRecords = this.getAllAgendamentos()
      existingRecords.push(agendamento)
      localStorage.setItem('agendamentos', JSON.stringify(existingRecords))

      return {
        success: true,
        message: 'timeRecordForm.saved', // Translation key to be used with t() function
        agendamento
      }

    } catch (error) {
      return {
        success: false,
        message: 'Erro interno do sistema',
        error: error.message
      }
    }
  }

  /**
   * Obtém todos os agendamentos do usuário atual
   * @returns {Array} - Lista de agendamentos
   */
  static getAllAgendamentos() {
    try {
      const records = localStorage.getItem('agendamentos')
      return records ? JSON.parse(records) : []
    } catch {
      return []
    }
  }

  /**
   * Obtém agendamentos filtrados por data
   * @param {string} startDate - Data início (YYYY-MM-DD)
   * @param {string} endDate - Data fim (YYYY-MM-DD)
   * @returns {Array} - Lista filtrada de agendamentos
   */
  static getAgendamentosByDateRange(startDate, endDate) {
    const allRecords = this.getAllAgendamentos()
    const userId = this.getCurrentUserId()

    return allRecords.filter(record => {
      const recordDate = record.data
      const matchesUser = record.userId === userId
      const withinRange = recordDate >= startDate && recordDate <= endDate
      
      return matchesUser && withinRange
    })
  }

  /**
   * Obtém ID do usuário atual
   * @returns {string|null} - ID do usuário
   */
  static getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      return user?.email || null
    } catch {
      return null
    }
  }

  /**
   * Remove um agendamento
   * @param {number} id - ID do agendamento
   * @returns {Object} - Resultado da operação
   */
  static deleteAgendamento(id) {
    try {
      const allRecords = this.getAllAgendamentos()
      const filteredRecords = allRecords.filter(record => record.id !== id)
      
      localStorage.setItem('agendamentos', JSON.stringify(filteredRecords))
      
      return {
        success: true,
        message: 'Agendamento removido com sucesso!'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao remover agendamento',
        error: error.message
      }
    }
  }
}

export default AgendamentoController
