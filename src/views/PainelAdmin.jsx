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

  // Dados estáticos de funcionários para demonstração
  const funcionariosEstaticos = [
    {
      id: 1,
      nome: 'João Silva',
      email: 'joao.silva@empresa.com',
      telefone: '(11) 99999-1111',
      cargo: 'Desenvolvedor Senior',
      departamento: 'Tecnologia',
      data_admissao: '2023-01-15',
      carga_horaria: 40,
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      is_active: true,
      role: 'funcionario',
      created_at: '2023-01-15T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: {
        entrada1: '09:00',
        saida1: '12:00',
        entrada2: '13:00',
        saida2: '17:00',
        status: 'completed'
      },
      statusPonto: 'completed'
    },
    {
      id: 2,
      nome: 'Maria Santos',
      email: 'maria.santos@empresa.com',
      telefone: '(11) 99999-2222',
      cargo: 'Analista de RH',
      departamento: 'Recursos Humanos',
      data_admissao: '2023-03-20',
      carga_horaria: 40,
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      is_active: true,
      role: 'funcionario',
      created_at: '2023-03-20T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: {
        entrada1: '08:30',
        saida1: '12:30',
        entrada2: '13:30',
        saida2: '17:30',
        status: 'pending'
      },
      statusPonto: 'pending'
    },
    {
      id: 3,
      nome: 'Pedro Costa',
      email: 'pedro.costa@empresa.com',
      telefone: '(11) 99999-3333',
      cargo: 'Designer UX/UI',
      departamento: 'Design',
      data_admissao: '2023-06-10',
      carga_horaria: 40,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      is_active: true,
      role: 'funcionario',
      created_at: '2023-06-10T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: null,
      statusPonto: 'ausente'
    },
    {
      id: 4,
      nome: 'Ana Oliveira',
      email: 'ana.oliveira@empresa.com',
      telefone: '(11) 99999-4444',
      cargo: 'Gerente de Projetos',
      departamento: 'Gestão',
      data_admissao: '2022-11-05',
      carga_horaria: 44,
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      is_active: false,
      role: 'gerente',
      created_at: '2022-11-05T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: null,
      statusPonto: 'ausente'
    },
    {
      id: 5,
      nome: 'Carlos Ferreira',
      email: 'carlos.ferreira@empresa.com',
      telefone: '(11) 99999-5555',
      cargo: 'Desenvolvedor Junior',
      departamento: 'Tecnologia',
      data_admissao: '2024-01-08',
      carga_horaria: 40,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      is_active: true,
      role: 'funcionario',
      created_at: '2024-01-08T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: {
        entrada1: '09:15',
        saida1: '12:15',
        entrada2: '13:15',
        saida2: '17:15',
        status: 'completed'
      },
      statusPonto: 'completed'
    },
    {
      id: 6,
      nome: 'Lucia Mendes',
      email: 'lucia.mendes@empresa.com',
      telefone: '(11) 99999-6666',
      cargo: 'Analista Financeiro',
      departamento: 'Financeiro',
      data_admissao: '2023-09-12',
      carga_horaria: 40,
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      is_active: true,
      role: 'funcionario',
      created_at: '2023-09-12T08:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      pontoHoje: {
        entrada1: '08:45',
        saida1: '12:45',
        entrada2: '13:45',
        saida2: '17:45',
        status: 'rejected'
      },
      statusPonto: 'rejected'
    }
  ]

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
      
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Usar dados estáticos para demonstração
      setFuncionarios(funcionariosEstaticos)
      
      console.log('✅ Funcionários carregados (dados estáticos):', funcionariosEstaticos.length)
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
      funcionario.cargo?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.departamento?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.telefone?.includes(buscaTexto)

    // Filtro por status ativo/inativo
    const matchStatus = filtroAtivo === 'todos' || 
      (filtroAtivo === 'ativos' && funcionario.is_active !== false) ||
      (filtroAtivo === 'inativos' && funcionario.is_active === false)

    return matchTexto && matchStatus
  })

  const toggleStatusFuncionario = async (funcionarioId, novoStatus) => {
    try {
      // Atualizar status nos dados estáticos
      setFuncionarios(prevFuncionarios => 
        prevFuncionarios.map(funcionario => 
          funcionario.id === funcionarioId 
            ? { ...funcionario, is_active: novoStatus }
            : funcionario
        )
      )
      
      console.log(`✅ Status do funcionário ${funcionarioId} alterado para:`, novoStatus ? 'Ativo' : 'Inativo')
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
                  {funcionarios.filter(f => f.is_active !== false).length}
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
                  placeholder="Nome, email, cargo, departamento ou telefone..."
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

            <div className="flex gap-2">
              <button
                onClick={() => navigate('/cadastro')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                ➕ Cadastrar Novo Funcionário
              </button>
              <button
                onClick={carregarFuncionarios}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Atualizar
              </button>
            </div>
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
                    Cargo / Departamento
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
                          <div className="text-xs text-gray-400">{funcionario.telefone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          funcionario.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {funcionario.is_active !== false ? '✅ Ativo' : '❌ Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(funcionario.statusPonto)}`}>
                          {getStatusText(funcionario.statusPonto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{funcionario.cargo || 'Não informado'}</div>
                          <div className="text-xs text-gray-500">{funcionario.departamento || 'Sem departamento'}</div>
                        </div>
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
                          onClick={() => toggleStatusFuncionario(funcionario.id, !funcionario.is_active)}
                          className={`${funcionario.is_active !== false ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {funcionario.is_active !== false ? '🚫 Desativar' : '✅ Ativar'}
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
