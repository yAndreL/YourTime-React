export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  let dateObj;
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return '';
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
};
export const formatTime = time => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};
export const timeToMinutes = time => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
export const minutesToTime = minutes => {
  if (!minutes || minutes < 0) return '00:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};
export const formatDuration = minutes => {
  if (!minutes || minutes <= 0) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};
export const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const getLocalDateString = () => {
  return getCurrentDate();
};
export const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
export const addDays = (date, days) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};
export const subtractDays = (date, days) => {
  return addDays(date, -days);
};
export const isDateInPast = date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj < today;
};
export const isDateInFuture = date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return dateObj > today;
};
export const getStartOfWeek = date => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dateObj.setDate(diff));
};
export const getEndOfWeek = date => {
  const startOfWeek = getStartOfWeek(date);
  return addDays(startOfWeek, 6);
};
export const getWeekDates = date => {
  const startOfWeek = getStartOfWeek(date);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startOfWeek, i));
  }
  return dates;
};
export const getDayName = (date, short = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const days = short ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[dateObj.getDay()];
};
export const getMonthName = (date, short = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const months = short ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[dateObj.getMonth()];
};
export const daysDifference = (date1, date2) => {
  const firstDate = typeof date1 === 'string' ? new Date(date1) : new Date(date1);
  const secondDate = typeof date2 === 'string' ? new Date(date2) : new Date(date2);
  const timeDifference = secondDate.getTime() - firstDate.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24));
};
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
};
