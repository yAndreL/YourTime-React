import { Link } from 'react-router-dom'
import { useState } from 'react'
import DashboardCards from './components/ui/DashboardCards'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Dados de exemplo para exportação
  const horasTrabalhadasData = [
    { dia: 'Segunda', horas: '8:00', entrada: '09:00', saida: '17:00' },
    { dia: 'Terça', horas: '7:12', entrada: '09:15', saida: '16:27' },
    { dia: 'Quarta', horas: '8:48', entrada: '08:30', saida: '17:18' },
    { dia: 'Quinta', horas: '7:36', entrada: '09:00', saida: '16:36' },
    { dia: 'Sexta', horas: '7:45', entrada: '09:15', saida: '17:00' }
  ]

  const showToastMessage = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const exportToPDF = () => {
    // Simulação de exportação para PDF
    const dataString = horasTrabalhadasData.map(item => 
      `${item.dia}: ${item.horas} (${item.entrada} - ${item.saida})`
    ).join('\n')
    
    showToastMessage('Relatório PDF gerado com sucesso!')
    console.log(`Exportando para PDF...\n\nRelatório de Horas da Semana:\n${dataString}\n\nTotal: 39h 21m`)
  }

  const exportToCSV = () => {
    // Criação do CSV
    const csvHeader = 'Dia,Horas Trabalhadas,Entrada,Saída\n'
    const csvData = horasTrabalhadasData.map(item => 
      `${item.dia},${item.horas},${item.entrada},${item.saida}`
    ).join('\n')
    
    const csvContent = csvHeader + csvData
    
    try {
      // Criar e baixar o arquivo CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'horas_trabalhadas.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToastMessage('Arquivo CSV baixado com sucesso!')
      } else {
        showToastMessage('CSV gerado - verificar console')
        console.log(`Dados CSV gerados:\n\n${csvContent}`)
      }
    } catch (error) {
      showToastMessage('Erro ao gerar CSV - dados no console')
      console.log(`Dados CSV:\n\n${csvContent}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">YourTime</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        
        <nav className="mt-6 px-6">
          <div className="space-y-2">
            <Link 
              to="/" 
              className="flex items-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm"
            >
              <span className="mr-3">🏠</span> Dashboard
            </Link>
            <Link 
              to="/formulario-ponto" 
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-3">📝</span> Registrar Ponto
            </Link>
            <Link 
              to="/painel-admin" 
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-3">🏢</span> Painel Administrativo
            </Link>
            <Link 
              to="/historico" 
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-3">📊</span> Histórico
            </Link>
            <Link 
              to="/projeto" 
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-3">🏗️</span> Projetos
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
              Configurações
            </div>
            <div className="space-y-2">
              <Link 
                to="/perfil" 
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="mr-3">👤</span> Perfil
              </Link>
              <Link 
                to="/configuracoes" 
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="mr-3">⚙️</span> Configurações
              </Link>
              <Link 
                to="/verificar-conexao" 
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="mr-3">🔌</span> Verificar BD
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                >
                  ☰
                </button>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    JS
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">José da Silva Lemos</h2>
                    <p className="text-sm text-gray-500">Desenvolvedor Frontend</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Último registro</p>
                <p className="text-sm font-medium text-gray-900">Hoje, 09:15</p>
              </div>
            </div>
          </div>
        </div>
        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Dashboard
          </h1>
        
          {/* Cards componentizados */}
          <DashboardCards 
            saldoHoras="+12:30"
            horasHoje="07:45"
            projetoAtual="YourTime v2.0"
            status="Trabalhando"
            isWorking={true}
          />
          
          {/* Seção principal com gráfico e ações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Gráfico de Horas */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Horas da Semana</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Segunda</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">8:00h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Terça</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">7:12h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quarta</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">8:48h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quinta</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">7:36h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sexta</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '97%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-green-600">7:45h (hoje)</span>
                </div>
              </div>
            </div>

            {/* Menu de Ações Rápidas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <Link 
                  to="/formulario-ponto" 
                  className="flex items-center p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white mr-3">
                    📝
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-red-700">Registrar Ponto</p>
                    <p className="text-sm text-gray-500">Registrar horários de trabalho</p>
                  </div>
                </Link>
                
                <Link 
                  to="/painel-admin" 
                  className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white mr-3">
                    🏢
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-green-700">Painel Administrativo</p>
                    <p className="text-sm text-gray-500">Gerencie funcionários e horas</p>
                  </div>
                </Link>
                
                <Link 
                  to="/historico" 
                  className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white mr-3">
                    📊
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-purple-700">Histórico</p>
                    <p className="text-sm text-gray-500">Ver registros</p>
                  </div>
                </Link>
              </div>
              
              {/* Seção de Exportação */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Exportar Relatórios</h4>
                <div className="space-y-2">
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center w-full p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      📄
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Exportar PDF</p>
                      <p className="text-xs text-gray-500">Relatório completo</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center w-full p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      📊
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">Exportar CSV</p>
                      <p className="text-xs text-gray-500">Dados brutos</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Atividades Recentes */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">Entrada registrada</span>
                </div>
                <span className="text-sm text-gray-500">Hoje, 09:15</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">Projeto YourTime v2.0 atualizado</span>
                </div>
                <span className="text-sm text-gray-500">Ontem, 17:30</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-900">Saída registrada</span>
                </div>
                <span className="text-sm text-gray-500">Ontem, 18:00</span>
              </div>
            </div>
          </div>

          {/* Botão adicional para projetos */}
          <div className="mb-6">
            <Link 
              to="/projeto" 
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg text-center transition-colors block w-full"
            >
              🏗️ Gerenciar Projetos
            </Link>
          </div>

          {/* Footer com resumo */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">32h 15m</p>
                <p className="text-sm text-gray-500">Horas esta semana</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">156h 30m</p>
                <p className="text-sm text-gray-500">Horas este mês</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">95%</p>
                <p className="text-sm text-gray-500">Meta do mês</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast de Notificação */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center">
            <span className="mr-2">✅</span>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
