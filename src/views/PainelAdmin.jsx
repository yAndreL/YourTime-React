import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowIcon } from '../components/ui/Icons.jsx'
import { supabase } from '../config/supabase.js'

function PainelAdministrativo() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('todos') // todos, ativos, inativos
  const [buscaTexto, setBuscaTexto] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    definirDataPadrao()
    carregarFuncionarios()
  }, [dataSelecionada])

  const definirDataPadrao = () => {
    if (!dataSelecionada) {
      const hoje = new Date().toISOString().split('T')[0]
      setDataSelecionada(hoje)
    }
  }

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      
      // Buscar TODOS os funcionários e seus pontos do dia selecionado
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          ativo,
          cargo,
          data_admissao,
          created_at,
          agendamento(
            id,
            data,
            entrada1,
            saida1,
            entrada2,
            saida2,
            pausa_almoco,
            status
          )
        `)
        .eq('agendamento.data', dataSelecionada)
        .order('nome')
      
      if (error) throw error
      
      // Também buscar funcionários que NÃO registraram ponto hoje
      const { data: todosFuncionarios, error: error2 } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          ativo,
          cargo,
          data_admissao,
          created_at
        `)
        .order('nome')
      
      if (error2) throw error2
      
      // Combinar dados - funcionários com ponto + funcionários sem ponto
      const funcionariosCompletos = todosFuncionarios.map(funcionario => {
        const pontoHoje = data?.find(f => f.id === funcionario.id)?.agendamento?.[0]
        return {
          ...funcionario,
          pontoHoje: pontoHoje || null,
          statusPonto: pontoHoje ? pontoHoje.status : 'ausente'
        }
      })
      
      setFuncionarios(funcionariosCompletos)
    } catch (error) {
      console.error('❌ Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const calcularHorasTrabalhadas = (ponto) => {
    if (!ponto) return '0h'
    
    let totalMinutos = 0
    
    // Jornada 1
    if (ponto.entrada1 && ponto.saida1) {
      const entrada1 = new Date(`2000-01-01T${ponto.entrada1}`)
      const saida1 = new Date(`2000-01-01T${ponto.saida1}`)
      totalMinutos += Math.floor((saida1 - entrada1) / (1000 * 60))
    }
    
    // Jornada 2
    if (ponto.entrada2 && ponto.saida2) {
      const entrada2 = new Date(`2000-01-01T${ponto.entrada2}`)
      const saida2 = new Date(`2000-01-01T${ponto.saida2}`)
      totalMinutos += Math.floor((saida2 - entrada2) / (1000 * 60))
    }
    
    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60
    
    if (horas === 0) return `${minutos}min`
    if (minutos === 0) return `${horas}h`
    return `${horas}h${minutos}min`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'ausente': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '✅ Aprovado'
      case 'pending': return '⏳ Pendente'
      case 'rejected': return '❌ Rejeitado'
      case 'ausente': return '🚫 Sem Registro'
      default: return '❓ Indefinido'
    }
  }

  const formatarData = (dataString) => {
    if (!dataString) return '-'
    return new Date(dataString).toLocaleDateString('pt-BR')
  }

  const funcionariosFiltrados = funcionarios.filter(funcionario => {
    // Filtro de busca por texto
    const matchTexto = !buscaTexto || 
      funcionario.nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.email?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.cargo?.toLowerCase().includes(buscaTexto.toLowerCase())

    // Filtro por status ativo/inativo
    const matchStatus = filtroAtivo === 'todos' || 
      (filtroAtivo === 'ativos' && funcionario.ativo !== false) ||
      (filtroAtivo === 'inativos' && funcionario.ativo === false)

    return matchTexto && matchStatus
  })

  const toggleStatusFuncionario = async (funcionarioId, novoStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: novoStatus })
        .eq('id', funcionarioId)

      if (error) throw error

      // Recarregar lista
      carregarFuncionarios()
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center pl-0 md:pl-24">
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
            <Link to="/painel-admin" className="block text-blue-600 font-medium">
              🏢 Painel Admin
            </Link>
            <Link to="/historico" className="block text-gray-700 hover:text-blue-600 transition-colors">
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
      <div className="w-full max-w-7xl mx-auto p-5 md:p-8 border border-gray-300 rounded-lg bg-white shadow-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
          >
            <ArrowIcon className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">👥 Gestão de Funcionários</h1>
            <p className="text-lg text-gray-600">Painel Administrativo</p>
          </div>
          <div className="w-12"></div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  👥
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Total Funcionários</p>
                <p className="text-2xl font-bold text-blue-900">{funcionarios.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✅
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Funcionários Ativos</p>
                <p className="text-2xl font-bold text-green-900">
                  {funcionarios.filter(f => f.ativo !== false).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm">
                  ⏳
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">Pontos Hoje</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {funcionarios.filter(f => f.pontoHoje).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                  🚫
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Sem Registro</p>
                <p className="text-2xl font-bold text-red-900">
                  {funcionarios.filter(f => !f.pontoHoje).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Busca por texto */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">🔍 Buscar:</label>
                <input
                  type="text"
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Nome, email ou cargo..."
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtro por status */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filtroAtivo}
                  onChange={(e) => setFiltroAtivo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="ativos">Somente Ativos</option>
                  <option value="inativos">Somente Inativos</option>
                </select>
              </div>

              {/* Data para pontos */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Data:</label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={carregarFuncionarios}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Funcionários */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando funcionários...</p>
            </div>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funcionário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Conta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Ponto Hoje
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Admissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas Trabalhadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {funcionariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      {buscaTexto ? 'Nenhum funcionário encontrado com os filtros aplicados' : 'Nenhum funcionário cadastrado'}
                    </td>
                  </tr>
                ) : (
                  funcionariosFiltrados.map((funcionario) => (
                    <tr key={funcionario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{funcionario.nome || 'Nome não informado'}</div>
                          <div className="text-sm text-gray-500">{funcionario.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          funcionario.ativo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {funcionario.ativo !== false ? '✅ Ativo' : '❌ Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(funcionario.statusPonto)}`}>
                          {getStatusText(funcionario.statusPonto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {funcionario.cargo || 'Não informado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatarData(funcionario.data_admissao)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {calcularHorasTrabalhadas(funcionario.pontoHoje)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => navigate(`/funcionario/${funcionario.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          👁️ Ver
                        </button>
                        {funcionario.pontoHoje && (
                          <button className="text-green-600 hover:text-green-900">
                            ✅ Aprovar
                          </button>
                        )}
                        <button 
                          onClick={() => toggleStatusFuncionario(funcionario.id, !funcionario.ativo)}
                          className={`${funcionario.ativo !== false ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {funcionario.ativo !== false ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default PainelAdministrativo
