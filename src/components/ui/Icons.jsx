// Componente de ícone de usuário reutilizável
export const UserIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg 
    className={className}
    fill={color} 
    viewBox="0 0 24 24"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
)

// Componente de ícone de seta (para botões voltar)
export const ArrowIcon = ({ className = "w-6 h-6", direction = "left" }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
    style={{ transform: direction === 'right' ? 'rotate(180deg)' : 'none' }}
  >
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>
)

// Componente de ícone de clock
export const ClockIcon = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
  </svg>
)

// Componente de ícone de histórico
export const HistoryIcon = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3"/>
  </svg>
)

// Componente de ícone de projeto/pasta
export const ProjectIcon = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
  </svg>
)

// Componente de ícone de logout
export const LogoutIcon = ({ className = "w-6 h-6" }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
  </svg>
)
