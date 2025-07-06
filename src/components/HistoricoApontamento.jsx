import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from './Icons'

function HistoricoApontamento() {
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    projeto: ''
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Dados simulados de apontamentos
  const [apontamentos] = useState([
    {
      id: 1,
      data: '2025-01-15',
      projeto: 'Madereira Ramos',
      entrada1: '08:00',
      saida1: '12:00',
      entrada2: '13:00',
      saida2: '17:00',
      horasTrabalhadas: '08:00',
      anotacoes: 'Desenvolvimento da tela de login'
    },
    {
      id: 2,
      data: '2025-01-16',
      projeto: 'Olívia Madeiras',
      entrada1: '08:30',
      saida1: '12:00',
      entrada2: '13:30',
      saida2: '17:30',
      horasTrabalhadas: '07:30',
      anotacoes: 'Implementação do cadastro de usuários'
    },
    {
      id: 3,
      data: '2025-01-17',
      projeto: 'Stone',
      entrada1: '09:00',
      saida1: '12:00',
      entrada2: '14:00',
      saida2: '18:00',
      horasTrabalhadas: '07:00',
      anotacoes: 'Correção de bugs na interface'
    }
  ])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    console.log('Filtros aplicados:', filters)
  }

  const filteredApontamentos = apontamentos.filter(apontamento => {
    const matchDataInicio = !filters.dataInicio || apontamento.data >= filters.dataInicio
    const matchDataFim = !filters.dataFim || apontamento.data <= filters.dataFim
    const matchProjeto = !filters.projeto || apontamento.projeto.toLowerCase().includes(filters.projeto.toLowerCase())
    
    return matchDataInicio && matchDataFim && matchProjeto
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pl-0 md:pl-24">
      {/* Menu Toggle Button */}
      <button 
        className="fixed top-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-white hover:text-gray-800 border hover:border-gray-800 transition-all duration-300"
        onClick={toggleMenu}
      >
        ☰ Menu
      </button>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-40 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Menu</h2>
          <nav className="space-y-4">
            <Link to="/registrar" className="block text-gray-700 hover:text-blue-600 transition-colors">
              Registrar
            </Link>
            <Link to="/historico" className="block text-blue-600 font-medium">
              Histórico
            </Link>
            <Link to="/projeto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              Projeto
            </Link>
            <button 
              onClick={toggleMenu}
              className="block text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
            >
              Fechar Menu
            </button>
            <Link to="/login" className="block text-red-600 hover:text-red-700 transition-colors mt-8 pt-4 border-t">
              &lt; Sair
            </Link>
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMenu}
        ></div>
      )}

      {/* Container Principal */}
      <div className="w-full max-w-7xl mx-auto p-5 md:p-8">
        {/* Header com Filtros */}
        <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <Link 
              to="/"
              className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <ArrowIcon className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Histórico de Apontamentos</h1>
            <div className="w-12"></div>
          </div>

          {/* Formulário de Filtros */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                Data Início:
              </label>
              <input
                type="date"
                id="dataInicio"
                name="dataInicio"
                value={filters.dataInicio}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim:
              </label>
              <input
                type="date"
                id="dataFim"
                name="dataFim"
                value={filters.dataFim}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="projeto" className="block text-sm font-medium text-gray-700 mb-1">
                Projeto:
              </label>
              <select
                id="projeto"
                name="projeto"
                value={filters.projeto}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="">Todos os Projetos</option>
                <option value="Madereira Ramos">Madereira Ramos</option>
                <option value="Olívia Madeiras">Olívia Madeiras</option>
                <option value="Stone">Stone</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105"
            >
              Pesquisar
            </button>
          </form>
        </div>

        {/* Lista de Apontamentos */}
        <div className="space-y-4">
          {filteredApontamentos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-300 p-8 text-center">
              <p className="text-gray-500 text-lg">Nenhum apontamento encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            filteredApontamentos.map(apontamento => (
              <div key={apontamento.id} className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
                {/* Header do Card */}
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{formatDate(apontamento.data)}</h3>
                    <p className="text-blue-600 font-medium">{apontamento.projeto}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{apontamento.horasTrabalhadas}</div>
                    <div className="text-sm text-gray-600">Horas Trabalhadas</div>
                  </div>
                </div>

                {/* Horários */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm text-green-700 font-medium">Entrada 1</div>
                      <div className="text-lg font-bold text-green-800">{apontamento.entrada1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm text-red-700 font-medium">Saída 1</div>
                      <div className="text-lg font-bold text-red-800">{apontamento.saida1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm text-green-700 font-medium">Entrada 2</div>
                      <div className="text-lg font-bold text-green-800">{apontamento.entrada2}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm text-red-700 font-medium">Saída 2</div>
                      <div className="text-lg font-bold text-red-800">{apontamento.saida2}</div>
                    </div>
                  </div>
                </div>

                {/* Anotações */}
                {apontamento.anotacoes && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-gray-600 font-medium mb-1">Anotações:</div>
                    <div className="text-gray-800">{apontamento.anotacoes}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Resumo */}
        {filteredApontamentos.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-300 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Resumo do Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-600">{filteredApontamentos.length}</div>
                <div className="text-blue-700 font-medium">Registros</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-600">
                  {filteredApontamentos.reduce((total, apt) => {
                    const [h, m] = apt.horasTrabalhadas.split(':')
                    return total + parseInt(h) + parseInt(m) / 60
                  }, 0).toFixed(1)}h
                </div>
                <div className="text-green-700 font-medium">Total Trabalhado</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-600">
                  {new Set(filteredApontamentos.map(apt => apt.projeto)).size}
                </div>
                <div className="text-purple-700 font-medium">Projetos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoricoApontamento
