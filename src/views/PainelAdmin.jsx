import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import GerenciamentoEmpresas from '../components/GerenciamentoEmpresas'
import Modal from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import { useLanguage } from '../hooks/useLanguage'
import { supabase } from '../config/supabase.js'
import NotificationService from '../services/NotificationService'
import { getLocalDateString, formatDate } from '../utils/dateUtils'
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
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSelecionada, setDataSelecionada] = useState('')
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
      const hoje = getLocalDateString()
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

      // Buscar pontos pendentes apenas da empresa do usuário logado
      const { data: agendamentos, error } = await supabase
        .from('agendamento')
        .select('data, status, user_id, superior_empresa_id')
        .eq('status', 'P')
        .eq('superior_empresa_id', superiorEmpresaId)
        .order('data', { ascending: false })

      if (error) throw error

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
      case 'completed': return t('admin.approved')
      case 'pending': return t('admin.pending')
      case 'rejected': return t('history.rejected')
      case 'ausente': return t('admin.noRecord')
      default: return 'Indefinido'
    }
  }

  const formatarData = (dataString) => {
    if (!dataString) return '-'
    return formatDate(dataString, 'DD/MM/YYYY')
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

    return matchTexto
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

      showSuccess(t('admin.employeeRemoved'))
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

      showSuccess(t('admin.employeeReactivated'))
    } catch (error) {
      showError(`${t('admin.errorReactivating')}: ${error.message || t('admin.unknownError')}`)
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
      showSuccess(t('admin.timeEntryApproved'))
    } catch (error) {
      showError(`${t('admin.errorApproving')}: ${error.message || t('admin.unknownError')}`)
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
      showError(t('admin.timeEntryDisapproved'))
    } catch (error) {
      showError(`${t('admin.errorDisapproving')}: ${error.message || t('admin.unknownError')}`)
    }
  }

  return (
    <MainLayout title={t('common.adminPanelTitle')} subtitle={t('common.systemManagement')}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs de Navegação */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setAbaAtiva('funcionarios')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                abaAtiva === 'funcionarios'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiUsers className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.employees')}
            </button>
            <button
              onClick={() => setAbaAtiva('removidos')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                abaAtiva === 'removidos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiLock className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.removed')}
            </button>
            <button
              onClick={() => setAbaAtiva('empresas')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                abaAtiva === 'empresas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiBriefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.companies')}
            </button>
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-3 sm:p-6">
          {abaAtiva === 'funcionarios' ? (
            <div>
              {/* Estatísticas Rápidas */}
              <div className="mb-6 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiUsers className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-blue-800 truncate">{t('admin.employees')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 truncate">{funcionarios.filter(f => f.is_active !== false).length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-green-800 truncate">{t('admin.approved')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 truncate">
                        {funcionarios.filter(f => f.is_active !== false && f.statusPonto === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiClock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-yellow-800 truncate">{t('admin.pending')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900 truncate">
                        {totalPontosPendentes}
                      </p>
                   
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiLock className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-red-800 truncate">{t('admin.noRecord')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 truncate">
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
                          ? t('admin.pendingForDay') 
                          : t('admin.pendingForDays')}
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
                            title={`${t('admin.filterByDate')} ${formatarData(data)}`}
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
                                + {diasComPontosPendentes.length - 5} {t('admin.moreDates')}
                              </button>
                              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-yellow-300 rounded-lg shadow-lg p-3 z-10 hidden group-hover:block">
                                <p className="text-xs font-semibold text-gray-700 mb-2">{t('admin.otherPendingDates')}</p>
                                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                  {diasComPontosPendentes.slice(5).map((data) => (
                                    <button
                                      key={data}
                                      onClick={() => selecionarData(data)}
                                      className="px-2 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 rounded text-xs"
                                      title={`${t('admin.filterByDate')} ${formatarData(data)}`}
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
              <div className="mb-4 sm:mb-6 p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 compact:gap-1 items-stretch lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 compact:gap-1 items-stretch sm:items-center">
                    {/* Busca por texto */}
                    <div className="flex items-center gap-1 sm:gap-2 compact:gap-1">
                      <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 whitespace-nowrap">{t('admin.searchLabel')}</label>
                      <input
                        type="text"
                        value={buscaTexto}
                        onChange={(e) => setBuscaTexto(e.target.value)}
                        placeholder={t('admin.searchPlaceholder')}
                        className="w-full sm:w-40 md:w-48 lg:w-56 xl:w-64 px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs lg:text-sm"
                      />
                    </div>

                    {/* Data para pontos */}
                    <div className="flex items-center gap-1 sm:gap-2 compact:gap-1">
                      <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 flex items-center gap-1 whitespace-nowrap">
                        {t('admin.dateLabel')}
                        {diasComPontosPendentes.length > 0 && !diasComPontosPendentes.includes(dataSelecionada) && (
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-yellow-400 text-yellow-900 rounded-full text-[9px] sm:text-xs font-bold" title={t('admin.pendingInOtherDates')}>
                            {diasComPontosPendentes.length}
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={dataSelecionada}
                        onChange={(e) => setDataSelecionada(e.target.value)}
                        className="w-full sm:w-auto px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs lg:text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/cadastro')}
                    className="w-full sm:w-auto px-2 sm:px-3 lg:px-4 compact:px-3 py-1 sm:py-1.5 lg:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1 sm:gap-2 compact:gap-1 text-[10px] sm:text-xs lg:text-sm whitespace-nowrap"
                  >
                    <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> 
                    <span className="hidden md:inline">{t('admin.addEmployee')}</span>
                    <span className="inline md:hidden">{t('common.new')}</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Funcionários */}
              <div className="overflow-x-auto mt-6 -mx-3 sm:-mx-4 lg:mx-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">{t('admin.loading')}</p>
                  </div>
                ) : (
                  <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-0 sm:px-1 lg:px-2 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider w-6 sm:w-8 lg:w-10">
                          
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.name')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.timeRecord')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.admission')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.hours')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {funcionariosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-1 sm:px-2 md:px-4 lg:px-6 py-4 text-center text-gray-500 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                            {buscaTexto ? t('admin.noEmployeesFiltered') : t('admin.noEmployees')}
                          </td>
                        </tr>
                      ) : (
                        funcionariosFiltrados.map((funcionario) => (
                          <tr key={funcionario.id} className="hover:bg-gray-50">
                            {/* Menu de 3 pontos */}
                            <td className="px-0 sm:px-1 lg:px-2 py-2 sm:py-3 lg:py-4 whitespace-nowrap relative">
                              <button
                                onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)}
                                className="p-0.5 sm:p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Opções"
                              >
                                <FiMoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
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
                                        <FiUser className="w-4 h-4" /> {t('admin.viewProfile')}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setModalConfirmarExclusao({ isOpen: true, funcionario })
                                          setMenuAberto(null)
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <FiTrash2 className="w-4 h-4" /> {t('admin.removeEmployee')}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-500">{funcionario.email}</div>
                                <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-400">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <span className={`inline-flex px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 text-[8px] sm:text-[9px] md:text-xs font-semibold rounded-full ${getStatusColor(funcionario.statusPonto)}`}>
                                {getStatusText(funcionario.statusPonto)}
                              </span>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900 font-medium">
                              {calcularHorasTrabalhadas(funcionario.pontoHoje)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium">
                              {funcionario.pontoHoje ? (
                                <div className="flex items-center gap-2">
                                  {funcionario.statusPonto === 'pending' && (
                                    <>
                                      <button 
                                        onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                        className="text-green-600 hover:text-green-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-green-50 transition-colors text-[9px] sm:text-[10px] md:text-xs"
                                        title="Aprovar ponto"
                                      >
                                        <FiCheck className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.approve')}</span>
                                      </button>
                                      <button 
                                        onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                        className="text-red-600 hover:text-red-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-red-50 transition-colors text-[9px] sm:text-[10px] md:text-xs"
                                        title="Desaprovar ponto"
                                      >
                                        <FiXCircle className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.disapprove')}</span>
                                      </button>
                                    </>
                                  )}
                                  {funcionario.statusPonto === 'completed' && (
                                    <button 
                                      onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-red-50 transition-colors text-[9px] sm:text-[10px] md:text-xs"
                                      title="Desaprovar ponto"
                                    >
                                      <FiXCircle className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.disapprove')}</span>
                                    </button>
                                  )}
                                  {funcionario.statusPonto === 'rejected' && (
                                    <button 
                                      onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)}
                                      className="text-green-600 hover:text-green-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-green-50 transition-colors text-[9px] sm:text-[10px] md:text-xs"
                                      title="Aprovar ponto"
                                    >
                                      <FiCheck className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.approve')}</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[9px] sm:text-[10px] md:text-xs">{t('admin.noTimeEntry')}</span>
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
             

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">{t('common.loading')}</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.actionsColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.nameColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.roleColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.admissionColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.removalColumn')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {funcionarios.filter(f => f.is_active === false).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-0.5 sm:px-2 md:px-4 lg:px-6 py-12 text-center text-gray-500 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                            {t('admin.noRemovedEmployees')}
                          </td>
                        </tr>
                      ) : (
                        funcionarios.filter(f => f.is_active === false).map((funcionario) => (
                          <tr key={funcionario.id} className="hover:bg-gray-50">
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div className="relative">
                                <button
                                  onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)}
                                  className="p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 rounded-full transition-colors"
                                  title="Opções"
                                >
                                  <FiMoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
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
                                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                      >
                                        <FiRefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('admin.reactivate')}
                                      </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-500">{funcionario.email}</div>
                                <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-400">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                {!funcionario.cargo && !funcionario.departamento ? (
                                  <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-400">---</div>
                                ) : (
                                  <>
                                    <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900">
                                      {funcionario.cargo || '---'}
                                    </div>
                                    {funcionario.departamento && (
                                      <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-500">{funcionario.departamento}</div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900">
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
          title={t('admin.confirmRemoval')}
          type="warning"
          confirmText={t('admin.yesRemove')}
          cancelText={t('admin.cancel')}
          showCancel={true}
          onConfirm={() => {
            excluirFuncionario(modalConfirmarExclusao.funcionario.id)
            setModalConfirmarExclusao({ isOpen: false, funcionario: null })
          }}
        >
          <div className="space-y-3">
            <p className="text-gray-700">
              {t('admin.confirmRemovalMessage')}{' '}
              <span className="font-bold">{modalConfirmarExclusao.funcionario?.nome}</span>?
            </p>
          </div>
        </Modal>
      )}
    </MainLayout>
  )
}

export default PainelAdministrativo
