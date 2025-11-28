// dateUtils.js
// Utilitários para manipulação de datas e horários

/**
 * Formata data para exibição
 * @param {string|Date} date - Data a ser formatada
 * @param {string} format - Formato desejado (DD/MM/YYYY, YYYY-MM-DD, etc.)
 * @returns {string} - Data formatada
 */
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return ''
  
  let dateObj
  if (typeof date === 'string') {
    // Se a string está no formato YYYY-MM-DD, adicionar T00:00:00 para forçar timezone local
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dateObj = new Date(date + 'T00:00:00')
    } else {
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }
  
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return ''
  }

  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = dateObj.getFullYear()

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

/**
 * Formata horário para exibição
 * @param {string} time - Horário no formato HH:MM
 * @returns {string} - Horário formatado
 */
export const formatTime = (time) => {
  if (!time) return ''
  
  // Garantir formato HH:MM
  const [hours, minutes] = time.split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

/**
 * Converte horário para minutos
 * @param {string} time - Horário no formato HH:MM
 * @returns {number} - Total de minutos
 */
export const timeToMinutes = (time) => {
  if (!time) return 0
  
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Converte minutos para horário
 * @param {number} minutes - Total de minutos
 * @returns {string} - Horário no formato HH:MM
 */
export const minutesToTime = (minutes) => {
  if (!minutes || minutes < 0) return '00:00'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Formata duração em horas e minutos
 * @param {number} minutes - Total de minutos
 * @returns {string} - Duração formatada (ex: "8h 30m")
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0h 0m'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Obtém data atual no formato YYYY-MM-DD (usando timezone local)
 * @returns {string} - Data atual no formato YYYY-MM-DD
 */
export const getCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtém data local no formato YYYY-MM-DD (mesmo que getCurrentDate)
 * @returns {string} - Data local no formato YYYY-MM-DD
 */
export const getLocalDateString = () => {
  return getCurrentDate()
}

/**
 * Obtém horário atual no formato HH:MM
 * @returns {string} - Horário atual
 */
export const getCurrentTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * Adiciona dias a uma data
 * @param {string|Date} date - Data base
 * @param {number} days - Número de dias a adicionar
 * @returns {Date} - Nova data
 */
export const addDays = (date, days) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date)
  dateObj.setDate(dateObj.getDate() + days)
  return dateObj
}

/**
 * Subtrai dias de uma data
 * @param {string|Date} date - Data base
 * @param {number} days - Número de dias a subtrair
 * @returns {Date} - Nova data
 */
export const subtractDays = (date, days) => {
  return addDays(date, -days)
}

/**
 * Verifica se uma data está no passado
 * @param {string|Date} date - Data a verificar
 * @returns {boolean} - True se estiver no passado
 */
export const isDateInPast = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dateObj < today
}

/**
 * Verifica se uma data está no futuro
 * @param {string|Date} date - Data a verificar
 * @returns {boolean} - True se estiver no futuro
 */
export const isDateInFuture = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return dateObj > today
}

/**
 * Obtém o primeiro dia da semana
 * @param {string|Date} date - Data de referência
 * @returns {Date} - Primeiro dia da semana
 */
export const getStartOfWeek = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date)
  const day = dateObj.getDay()
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para segunda-feira
  return new Date(dateObj.setDate(diff))
}

/**
 * Obtém o último dia da semana
 * @param {string|Date} date - Data de referência
 * @returns {Date} - Último dia da semana
 */
export const getEndOfWeek = (date) => {
  const startOfWeek = getStartOfWeek(date)
  return addDays(startOfWeek, 6)
}

/**
 * Obtém array com datas da semana
 * @param {string|Date} date - Data de referência
 * @returns {Array} - Array com as 7 datas da semana
 */
export const getWeekDates = (date) => {
  const startOfWeek = getStartOfWeek(date)
  const dates = []
  
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startOfWeek, i))
  }
  
  return dates
}

/**
 * Obtém nome do dia da semana
 * @param {string|Date} date - Data
 * @param {boolean} short - Se deve retornar versão abreviada
 * @returns {string} - Nome do dia
 */
export const getDayName = (date, short = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const days = short 
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  
  return days[dateObj.getDay()]
}

/**
 * Obtém nome do mês
 * @param {string|Date} date - Data
 * @param {boolean} short - Se deve retornar versão abreviada
 * @returns {string} - Nome do mês
 */
export const getMonthName = (date, short = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const months = short
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  
  return months[dateObj.getMonth()]
}

/**
 * Calcula diferença entre duas datas em dias
 * @param {string|Date} date1 - Primeira data
 * @param {string|Date} date2 - Segunda data
 * @returns {number} - Diferença em dias
 */
export const daysDifference = (date1, date2) => {
  const firstDate = typeof date1 === 'string' ? new Date(date1) : new Date(date1)
  const secondDate = typeof date2 === 'string' ? new Date(date2) : new Date(date2)
  
  const timeDifference = secondDate.getTime() - firstDate.getTime()
  return Math.ceil(timeDifference / (1000 * 3600 * 24))
}

export default {
  formatDate,
  formatTime,
  timeToMinutes,
  minutesToTime,
  formatDuration,
  getCurrentDate,
  getLocalDateString,
  getCurrentTime,
  addDays,
  subtractDays,
  isDateInPast,
  isDateInFuture,
  getStartOfWeek,
  getEndOfWeek,
  getWeekDates,
  getDayName,
  getMonthName,
  daysDifference
}
