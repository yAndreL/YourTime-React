import DashboardCard from './DashboardCard'
import { useLanguage } from '../../hooks/useLanguage.jsx'
import { FiClock, FiCalendar, FiBriefcase } from 'react-icons/fi'

function DashboardCards({ 
  saldoHoras = '+12:30',
  horasHoje = '07:45',
  horasPendentes = '00:00',
  projetoAtual = 'YourTime v2.0',
  status = null,
  isWorking = true 
}) {
  const { t } = useLanguage()
  
  // Se status não foi passado, usar a tradução baseada em isWorking
  const displayStatus = status || (isWorking ? t('dashboard.working') : t('dashboard.offline'))
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {/* Card Saldo de Horas */}
      <DashboardCard 
        title={t('dashboard.hoursBalance')}
        value={saldoHoras}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
        bgColor="bg-green-100"
        textColor="text-green-600"
        valueColor="text-green-600"
      />
      
      {/* Card Horas Hoje */}
      <DashboardCard 
        title={t('dashboard.hoursToday')}
        value={horasHoje}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
        bgColor="bg-blue-100"
        textColor="text-blue-600"
        valueColor="text-blue-600"
      />

      {/* Card Horas Pendentes */}
      <DashboardCard 
        title={t('dashboard.pendingHours')}
        value={horasPendentes}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />}
        bgColor="bg-yellow-100"
        textColor="text-yellow-600"
        valueColor="text-yellow-600"
      />
      
      {/* Card Projeto Atual */}
      <DashboardCard 
        title={t('dashboard.currentProject')}
        value={projetoAtual}
        iconElement={<FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
        bgColor="bg-purple-100"
        textColor="text-purple-600"
        valueColor="text-gray-900"
      />
      
      {/* Card Status */}
      <DashboardCard 
        title={t('dashboard.status')}
        value={displayStatus}
        bgColor="bg-green-100"
        valueColor="text-green-600"
        iconElement={
          <div className={`w-3 h-3 rounded-full ${isWorking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        }
      />
    </div>
  )
}

export default DashboardCards
