import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import GerenciamentoEmpresas from '../components/GerenciamentoEmpresas'
import Modal from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import { supabase } from '../config/supabase.js'
import NotificationService from '../services/NotificationService'
import { 
  FiUsers,
  FiCheckCircle, 
  FiClock,
  FiLock,
  FiEye, 
  FiX,
  FiRefreshCw,
  FiCheck,
  FiXCircle,
  FiPlus,
  FiBriefcase,
  FiMoreVertical,
  FiTrash2,
  FiUser
} from 'react-icons/fi'

function PainelAdministrativo() {
  const { showSuccess, showError } = useToast()
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('todos') // todos, ativos, inativos
  const [buscaTexto, setBuscaTexto] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('funcionarios') // 'funcionarios', 'removidos' ou 'empresas'
  const [modalError, setModalError] = useState({ isOpen: false, message: '', code: '' })
  const [modalSuccess, setModalSuccess] = useState({ isOpen: false, message: '' })
  const [diasComPontosPendentes, setDiasComPontosPendentes] = useState([])
  const [totalPontosPendentes, setTotalPontosPendentes] = useState(0) // Total de pontos pendentes (todas as datas)
  const [menuAberto, setMenuAberto] = useState(null) // ID do funcionário com menu aberto
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState({ isOpen: false, funcionario: null })
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null) // Multitenancy
  const navigate = useNavigate()

  useEffect(() => {
    definirDataPadrao()
    aplicarFiltrosDaNotificacao()
    carregarSuperiorEmpresaId()
  }, [])

  useEffect(() => {
    if (dataSelecionada && superiorEmpresaId) {
      carregarFuncionarios()
    }
  }, [dataSelecionada, superiorEmpresaId])

  useEffect(() => {
    if (superiorEmpresaId) {
      carregarDiasComPontosPendentes()
    }
  }, [superiorEmpresaId])

  const carregarSuperiorEmpresaId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setSuperiorEmpresaId(profile?.superior_empresa_id || null)
    } catch (error) {
      setSuperiorEmpresaId(null)
    }
  }

  const definirDataPadrao = () => {
    if (!dataSelecionada) {
      const hoje = new Date().toISOString().split('T')[0]
      setDataSelecionada(hoje)
    }
  }

  const aplicarFiltrosDaNotificacao = () => {
    // Verificar se há filtros salvos pela notificação
    const filterDate = sessionStorage.getItem('filterDate')
    const filterStatus = sessionStorage.getItem('filterStatus')
    
    if (filterDate) {
      setDataSelecionada(filterDate)
      sessionStorage.removeItem('filterDate') // Limpar após uso
    }
    
    if (filterStatus) {
      // O filtro de status pode ser usado se você tiver um filtro de status na UI
      sessionStorage.removeItem('filterStatus')
    }
  }

  const carregarDiasComPontosPendentes = async () => {
    try {
      if (!superiorEmpresaId) {
        console.warn('⚠️ superiorEmpresaId não definido no PainelAdmin')
        return
      }

      console.log('🔍 Buscando pontos pendentes para superior_empresa_id:', superiorEmpresaId)

      // Buscar pontos pendentes apenas da empresa do usuário logado
      const { data: agendamentos, error } = await supabase
        .from('agendamento')
        .select('data, status, user_id, superior_empresa_id')
        .eq('status', 'P')
        .eq('superior_empresa_id', superiorEmpresaId)
        .order('data', { ascending: false })

      if (error) throw error

      console.log('📊 Pontos pendentes encontrados:', agendamentos?.length || 0, agendamentos)

      if (agendamentos && agendamentos.length > 0) {
        const datasUnicas = [...new Set(agendamentos.map(item => item.data))]
        setDiasComPontosPendentes(datasUnicas)
        setTotalPontosPendentes(agendamentos.length)
      } else {
        setDiasComPontosPendentes([])
        setTotalPontosPendentes(0)
      }
    } catch (error) {
      console.error('Erro ao carregar dias com pontos pendentes:', error)
      setDiasComPontosPendentes([])
      setTotalPontosPendentes(0)
    }
  }

  const selecionarData = (data) => {
    setDataSelecionada(data)
  }

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      
      if (!superiorEmpresaId) {
        setFuncionarios([])
        return
      }
      
      // Buscar funcionários do banco de dados FILTRADOS por superior_empresa_id
      const { data: funcionariosData, error: funcionariosError } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          telefone,
          cargo,
          departamento,
          data_admissao,
          carga_horaria,
          avatar_url,
          is_active,
          role,
          created_at,
          updated_at,
          superior_empresa_id
        `)
        .eq('superior_empresa_id', superiorEmpresaId)
        .order('nome')

      if (funcionariosError) throw funcionariosError

      if (!funcionariosData || funcionariosData.length === 0) {
        setFuncionarios([])
        return
      }

      // Buscar pontos do dia apenas dos funcionários da mesma empresa
      const funcionarioIds = funcionariosData.map(f => f.id)
      const { data: todosPontosDia } = await supabase
        .from('agendamento')
        .select('*')
        .eq('data', dataSelecionada)
        .in('user_id', funcionarioIds)

      // Mapear pontos para funcionários (filtro no cliente)
      const funcionariosComPonto = funcionariosData.map((funcionario) => {
        const pontoData = todosPontosDia?.find(p => p.user_id === funcionario.id)

        return {
          ...funcionario,
          pontoHoje: pontoData || null,
          statusPonto: pontoData 
            ? (pontoData.status === 'A' ? 'completed' 
              : pontoData.status === 'R' ? 'rejected' 
              : 'pending')
            : 'ausente'
        }
      })

      setFuncionarios(funcionariosComPonto)

    } catch (error) {
      setFuncionarios([])
    } finally {
      setLoading(false)
    }
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
      case 'completed': return 'Aprovado'
      case 'pending': return 'Pendente'
      case 'rejected': return 'Rejeitado'
      case 'ausente': return 'Sem Registro'
      default: return 'Indefinido'
    }
  }

  const formatarData = (dataString) => {
    if (!dataString) return '-'
    return new Date(dataString).toLocaleDateString('pt-BR')
  }

  const funcionariosFiltrados = funcionarios.filter(funcionario => {
    // Na aba de funcionários, mostrar apenas ativos
    if (abaAtiva === 'funcionarios' && funcionario.is_active === false) {
      return false
    }

    // Filtro de busca por texto
    const matchTexto = !buscaTexto || 
      funcionario.nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.email?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.departamento?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      funcionario.telefone?.includes(buscaTexto) ||
      (funcionario.role === 'admin' && 'administrador'.includes(buscaTexto.toLowerCase())) ||
      (funcionario.role === 'usuario' && 'usuario'.includes(buscaTexto.toLowerCase()))

    // Filtro por status ativo/inativo
    const matchStatus = filtroAtivo === 'todos' || 
      (filtroAtivo === 'ativos' && funcionario.is_active !== false) ||
      (filtroAtivo === 'inativos' && funcionario.is_active === false)

    return matchTexto && matchStatus
  })

  const toggleStatusFuncionario = async (funcionarioId, novoStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: novoStatus })
        .eq('id', funcionarioId)

      if (error) throw error

      // Atualizar localmente
      setFuncionarios(prevFuncionarios => 
        prevFuncionarios.map(funcionario => 
          funcionario.id === funcionarioId 
            ? { ...funcionario, is_active: novoStatus }
            : funcionario
        )
      )
    } catch (error) {
      alert('Erro ao atualizar status do funcionário')
    }
  }

  const excluirFuncionario = async (funcionarioId) => {
    try {
      // Inativar o funcionário ao invés de deletar
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', funcionarioId)

      if (error) throw error

      // Atualizar a lista local
      setFuncionarios(prevFuncionarios => 
        prevFuncionarios.map(funcionario => 
          funcionario.id === funcionarioId 
            ? { ...funcionario, is_active: false }
            : funcionario
        )
      )

      // Fechar modal de confirmação
      setModalConfirmarExclusao({ isOpen: false, funcionarioId: null, funcionarioNome: '' })

      showSuccess('Funcionário removido!')
    } catch (error) {
      setModalError({ 
        isOpen: true, 
        message: error.message || 'Erro ao remover funcionário', 
        code: 'PA-004' 
      })
    }
  }

  const reativarFuncionario = async (funcionarioId) => {
    try {
      // Reativar o funcionário
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', funcionarioId)

      if (error) throw error

      // Atualizar a lista local
      setFuncionarios(prevFuncionarios => 
        prevFuncionarios.map(funcionario => 
          funcionario.id === funcionarioId 
            ? { ...funcionario, is_active: true }
            : funcionario
        )
      )

      showSuccess('Funcionário reativado!')
    } catch (error) {
      showError(`Erro ao reativar funcionário: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const verPerfilFuncionario = (funcionarioId) => {
    // Navegar para o perfil passando o ID do funcionário
    navigate(`/perfil/${funcionarioId}`)
  }

  const aprovarPonto = async (funcionarioId, agendamentoId) => {
    try {
      // Buscar dados do agendamento antes de atualizar
      const { data: agendamento, error: fetchError } = await supabase
        .from('agendamento')
        .select('data')
        .eq('id', agendamentoId)
        .single()

      if (fetchError) throw fetchError

      // Atualizar status para aprovado
      const { error } = await supabase
        .from('agendamento')
        .update({ status: 'A' })
        .eq('id', agendamentoId)

      if (error) throw error

      // Notificar o funcionário sobre a aprovação
      await NotificationService.notificarPontoAprovado(
        funcionarioId,
        agendamentoId,
        agendamento.data
      )

      // Recarregar funcionários e dias com pontos pendentes
      await carregarFuncionarios()
      await carregarDiasComPontosPendentes()
      showSuccess('Ponto aprovado')
    } catch (error) {
      showError(`Erro ao aprovar ponto: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const desaprovarPonto = async (funcionarioId, agendamentoId) => {
    try {
      // Buscar dados do agendamento antes de atualizar
      const { data: agendamento, error: fetchError } = await supabase
        .from('agendamento')
        .select('data')
        .eq('id', agendamentoId)
        .single()

      if (fetchError) throw fetchError

      // Atualizar status para rejeitado
      const { error } = await supabase
        .from('agendamento')
        .update({ status: 'R' })
        .eq('id', agendamentoId)

      if (error) throw error

      // Notificar o funcionário sobre a rejeição
      await NotificationService.notificarPontoRejeitado(
        funcionarioId,
        agendamentoId,
        agendamento.data,
        'Ponto rejeitado pelo administrador' // Motivo padrão
      )

      // Recarregar funcionários e dias com pontos pendentes
      await carregarFuncionarios()
      await carregarDiasComPontosPendentes()
      showError('Ponto desaprovado')
    } catch (error) {
      showError(`Erro ao desaprovar ponto: ${error.message || 'Erro desconhecido'}`)
    }
  }

  return (
    <MainLayout title="Painel Administrativo" subtitle="Gerenciamento do Sistema">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs de Navegação */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setAbaAtiva('funcionarios')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === 'funcionarios'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiUsers className="w-5 h-5" />
              Funcionários
            </button>
            <button
              onClick={() => setAbaAtiva('removidos')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === 'removidos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiLock className="w-5 h-5" />
              Removidos
            </button>
            <button
              onClick={() => setAbaAtiva('empresas')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === 'empresas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiBriefcase className="w-5 h-5" />
              Empresas
            </button>
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {abaAtiva === 'funcionarios' ? (
            <div>
              {/* Estatísticas Rápidas */}
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FiUsers className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-blue-800">Funcionários</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900">{funcionarios.filter(f => f.is_active !== false).length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-green-800 truncate">Aprovados</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900">
                        {funcionarios.filter(f => f.is_active !== false && f.statusPonto === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FiClock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-yellow-800 truncate">Pendentes</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900">
                        {totalPontosPendentes}
                      </p>
                   
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FiLock className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-red-800 truncate">Sem Registro</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900">
                        {funcionarios.filter(f => f.is_active !== false && !f.pontoHoje).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta de Pontos Pendentes em Outras Datas */}
              {diasComPontosPendentes.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiClock className="w-6 h-6 text-yellow-600 mt-0.5" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                        {diasComPontosPendentes.length === 1 
                          ? 'Há pontos pendentes de aprovação para o dia:' 
                          : 'Há pontos pendentes de aprovação para os dias:'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {diasComPontosPendentes.slice(0, 5).map((data, index) => (
                          <button
                            key={data}
                            onClick={() => selecionarData(data)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              dataSelecionada === data
                                ? 'bg-yellow-600 text-white'
                                : 'bg-white text-yellow-700 hover:bg-yellow-100 border border-yellow-300'
                            }`}
                            title={`Filtrar pontos do dia ${formatarData(data)}`}
                          >
                            {formatarData(data)}
                          </button>
                        ))}
                        {diasComPontosPendentes.length > 5 && (
                          <>
                            <span className="px-3 py-1.5 text-sm text-yellow-700">...</span>
                            <div className="relative group">
                              <button
                                className="px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
                              >
                                + {diasComPontosPendentes.length - 5} outros
                              </button>
                              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-yellow-300 rounded-lg shadow-lg p-3 z-10 hidden group-hover:block">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Outras datas com pontos pendentes:</p>
                                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                  {diasComPontosPendentes.slice(5).map((data) => (
                                    <button
                                      key={data}
                                      onClick={() => selecionarData(data)}
                                      className="px-2 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 rounded text-xs"
                                      title={`Filtrar pontos do dia ${formatarData(data)}`}
                                    >
                                      {formatarData(data)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtros e Busca */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Busca por texto */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Buscar:</label>
                      <input
                        type="text"
                        value={buscaTexto}
                        onChange={(e) => setBuscaTexto(e.target.value)}
                        placeholder="Nome, email, departamento ou telefone..."
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
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Data:
                        {diasComPontosPendentes.length > 0 && !diasComPontosPendentes.includes(dataSelecionada) && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold" title="Há pontos pendentes em outras datas">
                            {diasComPontosPendentes.length}
                          </span>
                        )}
                      </label>
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
                      <FiPlus className="w-5 h-5" /> Cadastrar Novo Funcionário
                    </button>
                    <button
                      onClick={carregarFuncionarios}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FiRefreshCw className="w-5 h-5" /> Atualizar
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela de Funcionários */}
              <div className="overflow-x-auto mt-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando funcionários...</p>
                  </div>
                ) : (
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                          
                        </th>
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
                          Ações Ponto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {funcionariosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                            {buscaTexto ? 'Nenhum funcionário encontrado com os filtros aplicados' : 'Nenhum funcionário cadastrado'}
                          </td>
                        </tr>
                      ) : (
                        funcionariosFiltrados.map((funcionario) => (
                          <tr key={funcionario.id} className="hover:bg-gray-50">
                            {/* Menu de 3 pontos */}
                            <td className="px-2 py-4 whitespace-nowrap relative">
                              <button
                                onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Opções"
                              >
                                <FiMoreVertical className="w-5 h-5 text-gray-600" />
                              </button>
                              
                              {/* Dropdown Menu */}
                              {menuAberto === funcionario.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setMenuAberto(null)}
                                  />
                                  <div className="absolute left-8 top-0 z-20 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          verPerfilFuncionario(funcionario.id)
                                          setMenuAberto(null)
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <FiUser className="w-4 h-4" /> Ver Perfil
                                      </button>
                                      <button
                                        onClick={() => {
                                          setModalConfirmarExclusao({ isOpen: true, funcionario })
                                          setMenuAberto(null)
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <FiTrash2 className="w-4 h-4" /> Remover Funcionário
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="text-sm text-gray-500">{funcionario.email}</div>
                                <div className="text-xs text-gray-400">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                funcionario.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {funcionario.is_active !== false ? (
                                  <>
                                    <FiCheckCircle className="w-3 h-3" /> Ativo
                                  </>
                                ) : (
                                  <>
                                    <FiXCircle className="w-3 h-3" /> Inativo
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(funcionario.statusPonto)}`}>
                                {getStatusText(funcionario.statusPonto)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {funcionario.cargo || 'Sem cargo'}
                                </div>
                                <div className="text-xs text-gray-500">{funcionario.departamento || 'Sem departamento'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {calcularHorasTrabalhadas(funcionario.pontoHoje)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {funcionario.pontoHoje ? (
                                <div className="flex items-center gap-2">
                                  {funcionario.statusPonto === 'pending' && (
                                    <>
                                      <button 
                                        onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                        className="text-green-600 hover:text-green-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                        title="Aprovar ponto"
                                      >
                                        <FiCheck className="w-4 h-4" /> Aprovar
                                      </button>
                                      <button 
                                        onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                        className="text-red-600 hover:text-red-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                        title="Desaprovar ponto"
                                      >
                                        <FiXCircle className="w-4 h-4" /> Desaprovar
                                      </button>
                                    </>
                                  )}
                                  {funcionario.statusPonto === 'completed' && (
                                    <button 
                                      onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                      title="Desaprovar ponto"
                                    >
                                      <FiXCircle className="w-4 h-4" /> Desaprovar
                                    </button>
                                  )}
                                  {funcionario.statusPonto === 'rejected' && (
                                    <button 
                                      onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                      className="text-green-600 hover:text-green-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                      title="Aprovar ponto"
                                    >
                                      <FiCheck className="w-4 h-4" /> Aprovar
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Sem ponto</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : abaAtiva === 'removidos' ? (
            <div>
              {/* Lista de Funcionários Removidos */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Removidos</h3>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando...</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Funcionário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo / Departamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Remoção
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {funcionarios.filter(f => f.is_active === false).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                            Nenhum funcionário removido
                          </td>
                        </tr>
                      ) : (
                        funcionarios.filter(f => f.is_active === false).map((funcionario) => (
                          <tr key={funcionario.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="relative">
                                <button
                                  onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)}
                                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                  title="Opções"
                                >
                                  <FiMoreVertical className="w-5 h-5 text-gray-600" />
                                </button>

                                {menuAberto === funcionario.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setMenuAberto(null)}
                                    ></div>
                                    <div className="absolute left-8 top-0 z-20 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            reativarFuncionario(funcionario.id)
                                            setMenuAberto(null)
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                        >
                                          <FiRefreshCw className="w-4 h-4" /> Reativar Funcionário
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="text-sm text-gray-500">{funcionario.email}</div>
                                <div className="text-xs text-gray-400">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {funcionario.cargo || 'Sem cargo'}
                                </div>
                                <div className="text-xs text-gray-500">{funcionario.departamento || 'Sem departamento'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatarData(funcionario.updated_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <GerenciamentoEmpresas />
          )}
        </div>
      </div>

      {/* Modal de Erro */}
      {modalError.isOpen && (
        <Modal
          isOpen={modalError.isOpen}
          onClose={() => setModalError({ isOpen: false, message: '', code: '' })}
          title="Erro"
          type="error"
        >
          <div className="space-y-2">
            <p className="text-gray-700 whitespace-pre-line">{modalError.message}</p>
          </div>
        </Modal>
      )}

      {/* Modal de Sucesso */}
      {modalSuccess.isOpen && (
        <Modal
          isOpen={modalSuccess.isOpen}
          onClose={() => setModalSuccess({ isOpen: false, message: '' })}
          title="Sucesso"
          type="success"
        >
          <p className="text-gray-700">{modalSuccess.message}</p>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalConfirmarExclusao.isOpen && (
        <Modal
          isOpen={modalConfirmarExclusao.isOpen}
          onClose={() => setModalConfirmarExclusao({ isOpen: false, funcionario: null })}
          title="Confirmar Remoção"
          type="warning"
          confirmText="Sim, Remover"
          cancelText="Cancelar"
          showCancel={true}
          onConfirm={() => {
            excluirFuncionario(modalConfirmarExclusao.funcionario.id)
            setModalConfirmarExclusao({ isOpen: false, funcionario: null })
          }}
        >
          <div className="space-y-3">
            <p className="text-gray-700">
              Tem certeza que deseja remover o funcionário{' '}
              <span className="font-bold">{modalConfirmarExclusao.funcionario?.nome}</span>?
            </p>
          </div>
        </Modal>
      )}
    </MainLayout>
  )
}

export default PainelAdministrativo
