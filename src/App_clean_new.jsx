import { Link } from 'react-router-dom'
import { useState } from 'react'
import DashboardCards from './components/ui/DashboardCards'
import TimeRecordsSummary from './components/TimeRecordsSummary'
import jsPDF from 'jspdf'
import { useTimeTracking } from './hooks/useTimeTracking'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Hook personalizado para dados de ponto
  const {
    dashboardData,
    weeklyData,
    loading,
    error,
    userData,
    timeRecords,
    refetch
  } = useTimeTracking()

  // Dados para exportação usando dados reais
  const horasTrabalhadasData = weeklyData || []

  const showToastMessage = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Adiciona título
    doc.setFontSize(16)
    doc.text('Relatório de Horas Trabalhadas', 20, 20)
    
    // Adiciona os dados
    doc.setFontSize(12)
    horasTrabalhadasData.forEach((item, index) => {
      const yPos = 40 + (index * 10)
      const texto = `${item.dia}: ${item.horas} (${item.entrada} - ${item.saida})`
      doc.text(texto, 20, yPos)
    })
    
    // Adiciona total
    doc.text('Total: 39h 21m', 20, 40 + (horasTrabalhadasData.length * 10))
    
    // Salva o PDF
    doc.save('relatorio-horas.pdf')
    showToastMessage('Relatório PDF gerado com sucesso!')
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
                    {loading ? '...' : (userData?.nome ? userData.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'US')}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {loading ? 'Carregando...' : (userData?.nome || 'Usuário')}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {loading ? 'Carregando...' : (userData?.cargo || 'Funcionário')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Último registro</p>
                <p className="text-sm font-medium text-gray-900">
                  {loading ? 'Carregando...' : (
                    dashboardData?.horasHoje && dashboardData.horasHoje !== '00:00'
                      ? `Hoje, ${dashboardData.horasHoje}`
                      : 'Nenhum registro hoje'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Dashboard
          </h1>

          {/* Indicadores de loading e erro */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6">
              ⏳ Carregando dados do banco de dados...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center">
                <span className="mr-2">❌</span>
                <div>
                  <div className="font-medium">Erro ao carregar dados</div>
                  <div className="text-sm mt-1">{error}</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards componentizados com dados reais */}
          {(!loading && !error) && (
            <DashboardCards
              saldoHoras={dashboardData?.saldoHoras || '+00:00'}
              horasHoje={dashboardData?.horasHoje || '00:00'}
              projetoAtual={dashboardData?.projetoAtual || 'Nenhum projeto'}
              status={dashboardData?.status || 'Offline'}
              isWorking={dashboardData?.isWorking || false}
            />
          )}

          {/* Resumo detalhado de registros */}
          <TimeRecordsSummary
            timeRecords={timeRecords}
            onRefresh={refetch}
            loading={loading}
            error={error}
          />

          {/* Seção principal com gráfico e ações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Gráfico de Horas */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Horas da Semana</h3>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Carregando gráfico...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-32 text-red-500">
                  <span>Erro ao carregar gráfico</span>
                </div>
              ) : weeklyData && weeklyData.length > 0 ? (
                <div className="space-y-3">
                  {weeklyData.map((item, index) => {
                    // Calcular largura da barra baseada nas horas
                    const hours = parseInt(item.horas.split(':')[0]) || 0
                    const maxHours = 10 // Máximo esperado de horas
                    const widthPercent = Math.min((hours / maxHours) * 100, 100)

                    return (
                      <div key={index} className="flex items-center gap-4">
                        {/* Dia da semana - largura fixa */}
                        <div className="w-20 flex-shrink-0">
                          <span className={`text-sm ${item.isToday ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                            {item.dia} {item.isToday && '(hoje)'}
                          </span>
                        </div>

                        {/* Barra de progresso - ocupa todo espaço disponível */}
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${item.isToday ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${widthPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Horas - largura fixa */}
                        <div className="w-12 flex-shrink-0 text-right">
                          <span className={`text-sm font-medium ${item.isToday ? 'text-green-600' : 'text-gray-900'}`}>
                            {item.horas}h
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <div className="text-gray-400 text-3xl mb-2">📈</div>
                    <div>Nenhum dado de horas disponível</div>
                    <div className="text-sm text-gray-400 mt-1">Registre seu primeiro ponto para ver o gráfico</div>
                  </div>
                </div>
              )}
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

            {!loading && !error && timeRecords?.length > 0 ? (
              <div className="space-y-3">
                {timeRecords.slice(-5).reverse().map((record, index) => (
                  <div key={record.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        record.entrada1 ? 'bg-green-500' :
                        record.saida1 ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="text-sm text-gray-900">
                        {record.entrada1 ? 'Entrada registrada' :
                         record.saida1 ? 'Saída registrada' :
                         record.entrada2 ? 'Entrada 2 registrada' :
                         record.saida2 ? 'Saída 2 registrada' : 'Registro de ponto'}
                        {record.observacao && ` - ${record.observacao}`}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(record.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}

                {timeRecords.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Nenhum registro de ponto encontrado
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                {loading ? 'Carregando atividades...' : 'Nenhuma atividade registrada'}
              </div>
            )}
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
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const totalMinutes = weeklyData?.reduce((total, item) => {
                      const [hours, minutes] = item.horas.split(':').map(Number)
                      return total + (hours * 60) + minutes
                    }, 0) || 0

                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60
                    return `${hours}h ${minutes}m`
                  })()}
                </p>
                <p className="text-sm text-gray-500">Horas esta semana</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {userData?.carga_horaria ? `${userData.carga_horaria}h/semana` : '40h/semana'}
                </p>
                <p className="text-sm text-gray-500">Carga horária</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {(() => {
                    const totalMinutes = weeklyData?.reduce((total, item) => {
                      const [hours, minutes] = item.horas.split(':').map(Number)
                      return total + (hours * 60) + minutes
                    }, 0) || 0

                    const expectedMinutes = (userData?.carga_horaria || 40) * 60
                    const percentage = expectedMinutes > 0 ? Math.round((totalMinutes / expectedMinutes) * 100) : 0

                    return `${percentage}%`
                  })()}
                </p>
                <p className="text-sm text-gray-500">Meta da semana</p>
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
