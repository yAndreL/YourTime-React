import DashboardCard from './DashboardCard'
import { FiClock, FiCalendar, FiBriefcase } from 'react-icons/fi'

function DashboardCards({ 
  saldoHoras = '+12:30',
  horasHoje = '07:45',
  horasPendentes = '00:00',
  projetoAtual = 'YourTime v2.0',
  status = 'Trabalhando',
  isWorking = true 
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {/* Card Saldo de Horas */}
      <DashboardCard 
        title="Saldo de Horas"
        value={saldoHoras}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
        bgColor="bg-green-100"
        textColor="text-green-600"
        valueColor="text-green-600"
      />
      
      {/* Card Horas Hoje */}
      <DashboardCard 
        title="Horas Aprovadas"
        value={horasHoje}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
        bgColor="bg-blue-100"
        textColor="text-blue-600"
        valueColor="text-blue-600"
      />

      {/* Card Horas Pendentes */}
      <DashboardCard 
        title="Horas Pendentes"
        value={horasPendentes}
        iconElement={<FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />}
        bgColor="bg-yellow-100"
        textColor="text-yellow-600"
        valueColor="text-yellow-600"
      />
      
      {/* Card Projeto Atual */}
      <DashboardCard 
        title="Projeto Atual"
        value={projetoAtual}
        iconElement={<FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
        bgColor="bg-purple-100"
        textColor="text-purple-600"
        valueColor="text-gray-900"
      />
      
      {/* Card Status */}
      <DashboardCard 
        title="Status"
        value={status}
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
