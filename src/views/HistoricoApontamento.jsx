import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/ui/Icons'
import { supabase } from '../config/supabase.js'

function HistoricoApontamento() {
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    projeto: ''
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [apontamentos, setApontamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarApontamentos()
  }, [])

  const carregarApontamentos = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('agendamento')
        .select(`
          id,
          data,
          entrada1,
          saida1,
          entrada2,
          saida2,
          observacao,
          profiles (
            nome
          )
        `)
        .order('data', { ascending: false })

      // Aplicar filtros se houver
      if (filters.dataInicio) {
        query = query.gte('data', filters.dataInicio)
      }
      
      if (filters.dataFim) {
        query = query.lte('data', filters.dataFim)
      }

      const { data, error } = await query
      
      if (error) throw error
      
      // Mapear dados para o formato esperado
      const apontamentosMapeados = data.map(apt => ({
        id: apt.id,
        data: apt.data,
        projeto: apt.profiles?.nome || 'Projeto Padrão',
        entrada1: apt.entrada1,
        saida1: apt.saida1,
        entrada2: apt.entrada2,
        saida2: apt.saida2,
        horasTrabalhadas: calcularHorasTrabalhadas(apt),
        anotacoes: apt.observacao
      }))
      
      setApontamentos(apontamentosMapeados)
    } catch (error) {
      console.error('❌ Erro ao carregar apontamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularHorasTrabalhadas = (apontamento) => {
    let totalMinutos = 0
    
    // Jornada 1
    if (apontamento.entrada1 && apontamento.saida1) {
      const entrada1 = new Date(`2000-01-01T${apontamento.entrada1}`)
      const saida1 = new Date(`2000-01-01T${apontamento.saida1}`)
      totalMinutos += Math.floor((saida1 - entrada1) / (1000 * 60))
    }
    
    // Jornada 2
    if (apontamento.entrada2 && apontamento.saida2) {
      const entrada2 = new Date(`2000-01-01T${apontamento.entrada2}`)
      const saida2 = new Date(`2000-01-01T${apontamento.saida2}`)
      totalMinutos += Math.floor((saida2 - entrada2) / (1000 * 60))
    }
    
    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
  }

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    carregarApontamentos()
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
            <Link to="/" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🏠 Início
            </Link>
            <Link to="/formulario-ponto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              📝 Registrar Ponto
            </Link>
            <Link to="/painel-admin" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🏢 Painel Admin
            </Link>
            <Link to="/historico" className="block text-blue-600 font-medium">
              📊 Histórico
            </Link>
            <Link to="/projeto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🎯 Projeto
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
                <option value="Projeto Padrão">Projeto Padrão</option>
                <option value="YourTime">YourTime</option>
                <option value="Sistema Interno">Sistema Interno</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 disabled:opacity-50"
            >
              {loading ? 'Carregando...' : 'Pesquisar'}
            </button>
          </form>
        </div>

        {/* Lista de Apontamentos */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-300 p-8 text-center">
              <p className="text-gray-500 text-lg">Carregando apontamentos...</p>
            </div>
          ) : filteredApontamentos.length === 0 ? (
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
        {!loading && filteredApontamentos.length > 0 && (
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
