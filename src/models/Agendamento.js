// Agendamento.js
// Model para representar registros de ponto no sistema

class Agendamento {
  constructor(data = {}) {
    this.id = data.id || null
    this.userId = data.userId || null
    this.data = data.data || ''
    this.entrada1 = data.entrada1 || ''
    this.saida1 = data.saida1 || ''
    this.entrada2 = data.entrada2 || ''
    this.saida2 = data.saida2 || ''
    this.pausa = data.pausa || 0
    this.observacao = data.observacao || ''
    this.workingHours = data.workingHours || null
    this.status = data.status || 'pending' // pending, approved, rejected
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  /**
   * Valida os dados do agendamento
   * @returns {Object} - Resultado da validação
   */
  validate() {
    const errors = []

    // Validar data
    if (!this.data) {
      errors.push('Data é obrigatória')
    } else if (!this.isValidDate(this.data)) {
      errors.push('Formato de data inválido (usar YYYY-MM-DD)')
    }

    // Validar entrada obrigatória
    if (!this.entrada1) {
      errors.push('Pelo menos uma entrada é obrigatória')
    }

    // Validar formatos de horário
    const timeFields = [
      { field: 'entrada1', label: 'Primeira entrada' },
      { field: 'saida1', label: 'Primeira saída' },
      { field: 'entrada2', label: 'Segunda entrada' },
      { field: 'saida2', label: 'Segunda saída' }
    ]

    timeFields.forEach(({ field, label }) => {
      if (this[field] && !this.isValidTime(this[field])) {
        errors.push(`Formato de horário inválido para ${label} (usar HH:MM)`)
      }
    })

    // Validar lógica de horários
    if (this.entrada1 && this.saida1) {
      if (this.entrada1 >= this.saida1) {
        errors.push('Horário de saída deve ser posterior ao de entrada')
      }
    }

    if (this.entrada2 && this.saida2) {
      if (this.entrada2 >= this.saida2) {
        errors.push('Horário da segunda saída deve ser posterior à segunda entrada')
      }
    }

    if (this.entrada2 && this.saida1) {
      if (this.entrada2 <= this.saida1) {
        errors.push('Segunda entrada deve ser posterior à primeira saída')
      }
    }

    // Validar pausa
    if (this.pausa && (isNaN(this.pausa) || this.pausa < 0)) {
      errors.push('Pausa deve ser um número válido maior ou igual a zero')
    }

    // Validar status
    const validStatuses = ['pending', 'approved', 'rejected']
    if (!validStatuses.includes(this.status)) {
      errors.push('Status inválido')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Valida formato de data
   * @param {string} date - Data a ser validada
   * @returns {boolean} - True se válida
   */
  isValidDate(date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false
    
    const dateObj = new Date(date)
    return dateObj instanceof Date && !isNaN(dateObj)
  }

  /**
   * Valida formato de horário
   * @param {string} time - Horário a ser validado
   * @returns {boolean} - True se válido
   */
  isValidTime(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  /**
   * Calcula as horas trabalhadas
   * @returns {Object} - Horas calculadas
   */
  calculateWorkingHours() {
    let totalMinutes = 0

    // Período 1
    if (this.entrada1 && this.saida1) {
      const entrada1Minutes = this.timeToMinutes(this.entrada1)
      const saida1Minutes = this.timeToMinutes(this.saida1)
      totalMinutes += saida1Minutes - entrada1Minutes
    }

    // Período 2
    if (this.entrada2 && this.saida2) {
      const entrada2Minutes = this.timeToMinutes(this.entrada2)
      const saida2Minutes = this.timeToMinutes(this.saida2)
      totalMinutes += saida2Minutes - entrada2Minutes
    }

    // Descontar pausa
    if (this.pausa) {
      totalMinutes -= parseInt(this.pausa)
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const workingHours = {
      totalMinutes,
      hours,
      minutes,
      formatted: `${hours}h ${minutes}m`
    }

    this.workingHours = workingHours
    return workingHours
  }

  /**
   * Converte horário para minutos
   * @param {string} time - Horário no formato HH:MM
   * @returns {number} - Minutos
   */
  timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Converte para objeto simples (para JSON)
   * @returns {Object} - Dados do agendamento
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      data: this.data,
      entrada1: this.entrada1,
      saida1: this.saida1,
      entrada2: this.entrada2,
      saida2: this.saida2,
      pausa: this.pausa,
      observacao: this.observacao,
      workingHours: this.workingHours,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Atualiza timestamp de modificação
   */
  touch() {
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Cria instância a partir de dados externos
   * @param {Object} data - Dados do agendamento
   * @returns {Agendamento} - Nova instância
   */
  static fromJSON(data) {
    const agendamento = new Agendamento(data)
    
    // Calcular horas se não existirem
    if (!agendamento.workingHours && agendamento.entrada1) {
      agendamento.calculateWorkingHours()
    }
    
    return agendamento
  }

  /**
   * Aprova o agendamento
   */
  approve() {
    this.status = 'approved'
    this.touch()
  }

  /**
   * Rejeita o agendamento
   */
  reject() {
    this.status = 'rejected'
    this.touch()
  }

  /**
   * Verifica se está pendente
   * @returns {boolean} - True se pendente
   */
  isPending() {
    return this.status === 'pending'
  }

  /**
   * Verifica se está aprovado
   * @returns {boolean} - True se aprovado
   */
  isApproved() {
    return this.status === 'approved'
  }

  /**
   * Verifica se está rejeitado
   * @returns {boolean} - True se rejeitado
   */
  isRejected() {
    return this.status === 'rejected'
  }
}

export default Agendamento
