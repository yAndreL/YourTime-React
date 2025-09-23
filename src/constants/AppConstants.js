// AppConstants.js
// Constantes utilizadas em toda a aplicação

export const APP_CONFIG = {
  NAME: 'YourTime',
  VERSION: '1.0.0',
  DESCRIPTION: 'Sistema de Registro de Ponto',
  AUTHOR: 'YourTime Team'
}

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
}

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/formulario-ponto',
  PAINEL_ADMIN: '/painel-admin',
  PROFILE: '/perfil',
  SETTINGS: '/configuracoes',
  HISTORY: '/historico',
  FORM: '/formulario-ponto',
  NOT_FINISHED: '/nao-finalizada',
  DATABASE_SETUP: '/database-setup'
}

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MANAGER: 'manager'
}

export const AGENDAMENTO_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const TIME_FORMATS = {
  TIME: 'HH:MM',
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:MM:SS',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:MM'
}

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 50,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100
}

export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login realizado com sucesso!',
    LOGOUT: 'Logout realizado com sucesso!',
    AGENDAMENTO_SAVED: 'Ponto registrado com sucesso!',
    AGENDAMENTO_DELETED: 'Agendamento removido com sucesso!',
    PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
    CONNECTION_OK: 'Conexão estabelecida com sucesso!'
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Email ou senha inválidos!',
    REQUIRED_FIELDS: 'Por favor, preencha todos os campos obrigatórios.',
    INVALID_EMAIL: 'Formato de email inválido.',
    INVALID_TIME: 'Formato de horário inválido (usar HH:MM).',
    INVALID_DATE: 'Formato de data inválido (usar DD/MM/YYYY).',
    CONNECTION_FAILED: 'Falha na conexão com o servidor.',
    GENERIC_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
    UNAUTHORIZED: 'Você não tem permissão para acessar este recurso.',
    NOT_FOUND: 'Recurso não encontrado.'
  },
  WARNING: {
    UNSAVED_CHANGES: 'Existem alterações não salvas. Deseja continuar?',
    DELETE_CONFIRMATION: 'Tem certeza que deseja excluir este item?'
  },
  INFO: {
    LOADING: 'Carregando...',
    NO_DATA: 'Nenhum dado encontrado.',
    CHOOSE_OPTION: 'Selecione uma opção...'
  }
}

export const STORAGE_KEYS = {
  USER: 'user',
  AUTH_TOKEN: 'authToken',
  IS_AUTHENTICATED: 'isAuthenticated',
  AGENDAMENTOS: 'agendamentos',
  SETTINGS: 'settings',
  THEME: 'theme'
}

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
}

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100]
}

export const FILE_TYPES = {
  EXPORT: {
    PDF: 'pdf',
    CSV: 'csv',
    EXCEL: 'xlsx'
  },
  IMPORT: {
    CSV: 'csv',
    EXCEL: 'xlsx'
  }
}

export const WORKING_HOURS = {
  STANDARD_DAILY: 8, // horas
  STANDARD_WEEKLY: 40, // horas
  MAX_DAILY: 12, // horas
  MIN_BREAK: 15, // minutos
  LUNCH_BREAK: 60 // minutos
}

export const SIDEBAR_MENU = [
  {
    icon: '🏠',
    label: 'Dashboard',
    route: ROUTES.HOME,
    roles: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  },
  {
    icon: '📝',
    label: 'Registrar Ponto',
    route: ROUTES.FORM,
    roles: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  },
  {
    icon: '🏢',
    label: 'Painel Administrativo',
    route: ROUTES.PAINEL_ADMIN,
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  },
  {
    icon: '📊',
    label: 'Histórico',
    route: ROUTES.HISTORY,
    roles: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  },
  {
    icon: '👤',
    label: 'Perfil',
    route: ROUTES.PROFILE,
    roles: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  },
  {
    icon: '⚙️',
    label: 'Configurações',
    route: ROUTES.SETTINGS,
    roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER]
  }
]

export default {
  APP_CONFIG,
  API_CONFIG,
  ROUTES,
  USER_ROLES,
  AGENDAMENTO_STATUS,
  TIME_FORMATS,
  VALIDATION_RULES,
  MESSAGES,
  STORAGE_KEYS,
  THEMES,
  PAGINATION,
  FILE_TYPES,
  WORKING_HOURS,
  SIDEBAR_MENU
}
