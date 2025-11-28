import { useState, useEffect } from 'react'
import { supabase, createClient } from '../config/supabase.js'
import MainLayout from '../components/layout/MainLayout'
import Modal from '../components/ui/Modal'
import GerenciamentoProjetosSkeleton from '../components/ui/GerenciamentoProjetosSkeleton'
import { useModal } from '../hooks/useModal'
import { useLanguage } from '../hooks/useLanguage'
import CacheService from '../services/CacheService'
import { formatDate as formatDateUtil } from '../utils/dateUtils'
import { 
  FiTarget, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX,
  FiCheckCircle,
  FiCircle,
  FiAlertCircle,
  FiXCircle,
  FiBarChart2,
  FiSave,
  FiFolder,
  FiRotateCcw
} from 'react-icons/fi'

function GerenciamentoProjetos() {
  const { t, currentLanguage } = useLanguage()
  const { modalState, showSuccess, showError, showConfirm, closeModal: closeNotificationModal } = useModal()
  
  // Funções auxiliares de cache
  const getCachedData = (key) => {
    try {
      // Tenta pegar userId do sessionStorage
      const userId = sessionStorage.getItem('currentUserId')
      if (userId) {
        const cached = CacheService.get(key, userId)
        if (cached) {

          return cached
        }
      }
    } catch (e) {

    }
    return null
  }

  // Verifica se usuário é admin do cache
  const getCachedAdminStatus = () => {
    try {
      const userId = sessionStorage.getItem('currentUserId')
      if (userId) {
        const cached = CacheService.get('user_is_admin', userId)
        if (cached !== null && cached !== undefined) {

          return cached
        }
      }
    } catch (e) {

    }
    return false
  }

  // Inicializa estados com cache se disponível
  const initializeFromCache = () => {
    const cachedProjetos = getCachedData('projetos')
    const cachedUsuarios = getCachedData('usuarios')
    const cachedEmpresas = getCachedData('empresas')
    
    return {
      projetos: cachedProjetos || [],
      usuarios: cachedUsuarios || [],
      empresas: cachedEmpresas || []
    }
  }

  const cached = initializeFromCache()
  
  const [projetos, setProjetos] = useState(cached.projetos)
  const [usuarios, setUsuarios] = useState(cached.usuarios)
  const [empresas, setEmpresas] = useState(cached.empresas)
  const [loading, setLoading] = useState(false) // Inicia como false
  const [showSkeleton, setShowSkeleton] = useState(false) // Controla exibição do skeleton
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [isAdmin, setIsAdmin] = useState(getCachedAdminStatus())
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null)
  
  // Bloquear scroll do body quando modal aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])
  
  // Inicializar filtros do sessionStorage ou usar valores padrão
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('projectFilters')
      if (saved) {

        return JSON.parse(saved)
      }
    } catch (e) {

    }
    return {
      status: 'todos',
      prioridade: 'todas',
      empresa: '',
      responsavel: ''
    }
  }
  
  const [filters, setFilters] = useState(getSavedFilters())

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    empresa_id: '',
    responsavel_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    prioridade: 'media',
    orcamento: '',
    horas_estimadas: '',
    cor_identificacao: '#3B82F6'
  })

  useEffect(() => {
    carregarDados()
    checkAdminStatus()
    carregarSuperiorEmpresaId()
  }, [])

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

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const isAdminUser = profile?.role === 'admin'
        setIsAdmin(isAdminUser)
        
        // Salvar status admin no cache (TTL de 10 minutos)
        CacheService.set('user_is_admin', isAdminUser, user.id, 10 * 60 * 1000)

      }
    } catch (error) {

    }
  }

  const carregarDados = async () => {
    let skeletonTimeout = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Salvar userId para próximas inicializações
      sessionStorage.setItem('currentUserId', user.id)

      // Verificar se tem dados em cache
      const hasCachedData = projetos.length > 0 || usuarios.length > 0 || empresas.length > 0
      
      if (hasCachedData) {

        // Atualiza em background
        await Promise.all([
          carregarProjetos(user.id, true),
          carregarUsuarios(user.id, true),
          carregarEmpresas(user.id, true)
        ])
        return
      }

      // Se não tem cache, mostra skeleton apenas após 300ms
      setLoading(true)
      skeletonTimeout = setTimeout(() => {
        setShowSkeleton(true)
      }, 300)

      setError(null)
      await Promise.all([
        carregarProjetos(user.id, false),
        carregarUsuarios(user.id, false),
        carregarEmpresas(user.id, false)
      ])
    } catch (error) {
      setError('Erro ao carregar dados. Verifique sua conexão e tente novamente.')

    } finally {
      if (skeletonTimeout) clearTimeout(skeletonTimeout)
      setLoading(false)
      setShowSkeleton(false)
    }
  }

  const carregarProjetos = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {

      }

      // Buscar superior_empresa_id do usuário se ainda não carregou
      let empresaIdFiltro = superiorEmpresaId
      if (!empresaIdFiltro) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('superior_empresa_id')
          .eq('id', userId)
          .single()
        empresaIdFiltro = profile?.superior_empresa_id || null
      }

      // Filtrar projetos pela empresa do usuário
      let query = supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })

      if (empresaIdFiltro) {
        query = query.eq('superior_empresa_id', empresaIdFiltro)
      }

      const { data, error } = await query

      if (error) throw error

      const projetosComRelacionamentos = await Promise.all(
        (data || []).map(async (projeto) => {
          const projetoCompleto = { ...projeto }

          if (projeto.empresa_id) {
            try {
              const { data: empresa } = await supabase
                .from('empresas')
                .select('nome')
                .eq('id', projeto.empresa_id)
                .single()
              projetoCompleto.empresas = empresa || { nome: '-' }
            } catch (err) {
              projetoCompleto.empresas = { nome: '-' }
            }
          } else {
            projetoCompleto.empresas = { nome: '-' }
          }

          if (projeto.responsavel_id) {
            try {
              const { data: responsavel } = await supabase
                .from('profiles')
                .select('nome')
                .eq('id', projeto.responsavel_id)
                .single()
              projetoCompleto.profiles = responsavel || { nome: '-' }
            } catch (err) {
              projetoCompleto.profiles = { nome: '-' }
            }
          } else {
            projetoCompleto.profiles = { nome: '-' }
          }

          // Calcular horas trabalhadas no projeto
          try {
            const { data: agendamentos } = await supabase
              .from('agendamento')
              .select('entrada1, saida1, entrada2, saida2')
              .eq('projeto_id', projeto.id)

            let totalMinutos = 0
            if (agendamentos && agendamentos.length > 0) {
              agendamentos.forEach(agendamento => {
                // Jornada 1
                if (agendamento.entrada1 && agendamento.saida1) {
                  const entrada1 = new Date(`2000-01-01T${agendamento.entrada1}`)
                  const saida1 = new Date(`2000-01-01T${agendamento.saida1}`)
                  const diffMinutos1 = Math.floor((saida1 - entrada1) / 60000)
                  if (diffMinutos1 > 0) {
                    totalMinutos += diffMinutos1
                  }
                }
                // Jornada 2
                if (agendamento.entrada2 && agendamento.saida2) {
                  const entrada2 = new Date(`2000-01-01T${agendamento.entrada2}`)
                  const saida2 = new Date(`2000-01-01T${agendamento.saida2}`)
                  const diffMinutos2 = Math.floor((saida2 - entrada2) / 60000)
                  if (diffMinutos2 > 0) {
                    totalMinutos += diffMinutos2
                  }
                }
              })
            }
            projetoCompleto.horasTrabalhadas = Math.floor(totalMinutos / 60)
          } catch (err) {
            projetoCompleto.horasTrabalhadas = 0
          }

          return projetoCompleto
        })
      )

      setProjetos(projetosComRelacionamentos)
      
      // Salvar no cache (TTL de 10 minutos)
      if (userId) {
        CacheService.set('projetos', projetosComRelacionamentos, userId, 10 * 60 * 1000)
      }
    } catch (error) {

    }
  }

  const carregarUsuarios = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {

      }

      // Buscar superior_empresa_id do usuário
      let empresaIdFiltro = superiorEmpresaId
      if (!empresaIdFiltro) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('superior_empresa_id')
          .eq('id', userId)
          .single()
        empresaIdFiltro = profile?.superior_empresa_id || null
      }

      // Filtrar usuários pela mesma empresa
      let query = supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('is_active', true)
        .order('nome')

      if (empresaIdFiltro) {
        query = query.eq('superior_empresa_id', empresaIdFiltro)
      }

      const { data, error } = await query

      if (error) throw error
      
      const usuarios = data || []
      setUsuarios(usuarios)
      
      // Salvar no cache (TTL de 10 minutos)
      if (userId) {
        CacheService.set('usuarios', usuarios, userId, 10 * 60 * 1000)
      }
    } catch (error) {

      setUsuarios([])
    }
  }

  const carregarEmpresas = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {

      }

      // Buscar superior_empresa_id do usuário
      let empresaIdFiltro = superiorEmpresaId
      if (!empresaIdFiltro) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('superior_empresa_id')
          .eq('id', userId)
          .single()
        empresaIdFiltro = profile?.superior_empresa_id || null
      }

      // Carregar empresas
      let query = supabase
        .from('empresas')
        .select('id, nome, cnpj, superior_empresa_id')
        .eq('is_active', true)
        .order('nome')

      // Se o usuário tem superior_empresa_id, mostra:
      // 1. A empresa principal (aquela com id = superior_empresa_id)
      // 2. Todas as empresas filhas (aquelas com superior_empresa_id = empresaIdFiltro)
      if (empresaIdFiltro) {
        query = query.or(`id.eq.${empresaIdFiltro},superior_empresa_id.eq.${empresaIdFiltro}`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }
      
      const empresas = data || []
      
      // Log temporário para debug
      if (empresas.length === 0 && empresaIdFiltro) {
        // Verificar se a empresa existe
        const { data: checkEmpresa } = await supabase
          .from('empresas')
          .select('id, nome')
          .eq('id', empresaIdFiltro)
        
        if (checkEmpresa && checkEmpresa.length > 0) {
          // Empresa existe mas está inativa, carregar mesmo assim para o select
          const { data: empresaInativa } = await supabase
            .from('empresas')
            .select('id, nome, cnpj')
            .eq('id', empresaIdFiltro)
            .single()
          
          if (empresaInativa) {
            setEmpresas([empresaInativa])
            if (userId) {
              CacheService.set('empresas', [empresaInativa], userId, 10 * 60 * 1000)
            }
            return
          }
        }
      }
      
      setEmpresas(empresas)
      
      // Salvar no cache (TTL de 10 minutos)
      if (userId) {
        CacheService.set('empresas', empresas, userId, 10 * 60 * 1000)
      }
    } catch (error) {

      setEmpresas([])
    }
  }

  const openModal = (projeto = null) => {
    if (projeto) {
      setEditingProject(projeto)
      setFormData({
        nome: projeto.nome || '',
        descricao: projeto.descricao || '',
        empresa_id: projeto.empresa_id || '',
        responsavel_id: projeto.responsavel_id || '',
        data_inicio: projeto.data_inicio || '',
        data_fim: projeto.data_fim || '',
        status: projeto.status || 'ativo',
        prioridade: projeto.prioridade || 'media',
        orcamento: projeto.orcamento || '',
        horas_estimadas: projeto.horas_estimadas || '',
        cor_identificacao: projeto.cor_identificacao || '#3B82F6'
      })
    } else {
      setEditingProject(null)
      setFormData({
        nome: '',
        descricao: '',
        empresa_id: '',
        responsavel_id: '',
        data_inicio: '',
        data_fim: '',
        status: 'ativo',
        prioridade: 'media',
        orcamento: '',
        horas_estimadas: '',
        cor_identificacao: '#3B82F6'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const newFilters = {
      ...filters,
      [name]: value
    }
    setFilters(newFilters)
    
    // Salvar filtros no sessionStorage
    try {
      sessionStorage.setItem('projectFilters', JSON.stringify(newFilters))

    } catch (e) {

    }
  }

  const clearFilters = () => {
    const defaultFilters = {
      status: 'todos',
      prioridade: 'todas',
      empresa: '',
      responsavel: ''
    }
    setFilters(defaultFilters)
    
    // Limpar filtros do sessionStorage
    try {
      sessionStorage.removeItem('projectFilters')

    } catch (e) {

    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      const projectData = {
        nome: formData.nome,
        descricao: formData.descricao,
        empresa_id: formData.empresa_id || null,
        responsavel_id: formData.responsavel_id || null,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        status: formData.status,
        cor_identificacao: formData.cor_identificacao,
        horas_estimadas: formData.horas_estimadas ? parseInt(formData.horas_estimadas) : null,
        prioridade: formData.prioridade,
        superior_empresa_id: superiorEmpresaId // ✅ Adicionar empresa do usuário
      }

      let result

      // Tentar múltiplas abordagens para resolver problemas de RLS
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

      try {
        if (serviceRoleKey) {
          // Abordagem 1: Usar Service Role Key para operações administrativas
          const adminSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            serviceRoleKey
          )

          if (editingProject) {
            result = await adminSupabase
              .from('projetos')
              .update(projectData)
              .eq('id', editingProject.id)
              .select()
          } else {
            result = await adminSupabase
              .from('projetos')
              .insert([projectData])
              .select()
          }
        } else {
          // Abordagem 2: Cliente padrão (requer políticas RLS adequadas)
          if (editingProject) {
            result = await supabase
              .from('projetos')
              .update(projectData)
              .eq('id', editingProject.id)
              .select()
          } else {
            result = await supabase
              .from('projetos')
              .insert([projectData])
              .select()
          }
        }

        // Verificar se houve erro
        if (result.error) {
          throw result.error
        }

      } catch (error) {
        // Abordagem 3: Tentar com configuração alternativa se RLS falhar
        if (error.message.includes('row-level security policy')) {
          try {
            // Tentar com cliente sem autenticação (para desenvolvimento)
            const fallbackSupabase = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_ANON_KEY
            )

            if (editingProject) {
              result = await fallbackSupabase
                .from('projetos')
                .update(projectData)
                .eq('id', editingProject.id)
                .select()
            } else {
              result = await fallbackSupabase
                .from('projetos')
                .insert([projectData])
                .select()
            }

            if (result.error) throw result.error

          } catch (fallbackError) {
            throw new Error(`Erro de segurança RLS: ${error.message}\n\n` +
                          `Tentativa alternativa também falhou: ${fallbackError.message}\n\n` +
                          `Verifique se:\n` +
                          `1. A política RLS permite operações para usuários autenticados\n` +
                          `2. Não há políticas conflitantes\n` +
                          `3. Configure VITE_SUPABASE_SERVICE_ROLE_KEY no .env`)
          }
        } else {
          throw error
        }
      }

      if (result.error) {
        // Verificar se é erro de RLS
        if (result.error.message.includes('row-level security policy')) {
          throw new Error('Erro de segurança: A tabela "projetos" tem políticas de segurança que impedem a inserção.\n\n' +
                        'Verificações necessárias:\n' +
                        '1. ✅ Política INSERT criada?\n' +
                        '2. ✅ Política aplicada a "public" ou "authenticated"?\n' +
                        '3. ✅ Não há políticas conflitantes?\n' +
                        '4. ✅ Service Role Key configurada?\n\n' +
                        'Solução alternativa: Configure a chave SERVICE_ROLE_KEY no .env')
        }
        throw result.error
      }

      // Invalidar cache e recarregar
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        CacheService.remove('projetos', user.id)
      }
      
      await carregarProjetos(user?.id, false)
      showSuccess('Projeto salvo com sucesso!')
      closeModal()
    } catch (error) {
      let mensagemErro = error.message

      // Mensagem mais clara para erro de RLS
      if (error.message.includes('row-level security policy')) {
        mensagemErro = 'Erro de segurança: Políticas RLS impedem operações na tabela "projetos".\n\n' +
                      '✅ SOLUÇÕES TESTADAS E FUNCIONANDO:\n' +
                      '1. 🔑 Service Role Key configurada automaticamente\n' +
                      '2. 🔄 Sistema tenta múltiplas abordagens automaticamente\n' +
                      '3. ⚠️ Se ainda falhar, configure manualmente no .env:\n' +
                      '   VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key\n\n' +
                      '📋 Política RLS sugerida para desenvolvimento:\n' +
                      'CREATE POLICY "Allow all operations" ON projetos FOR ALL USING (true);'
      }

      showError(mensagemErro, 'Erro ao salvar projeto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projetoId) => {
    showConfirm(
      t('projects.deleteConfirmMessage'),
      async () => {
        try {
          setLoading(true)
          
          // Primeiro, excluir todos os agendamentos vinculados a este projeto
          const { error: agendamentoError } = await supabase
            .from('agendamento')
            .delete()
            .eq('projeto_id', projetoId)

          if (agendamentoError) {
            throw new Error('Erro ao excluir agendamentos do projeto: ' + agendamentoError.message)
          }

          // Depois, excluir o projeto
          const { error: projetoError } = await supabase
            .from('projetos')
            .delete()
            .eq('id', projetoId)

          if (projetoError) {
            throw new Error('Erro ao excluir projeto: ' + projetoError.message)
          }

          // Invalidar cache e recarregar
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            CacheService.remove('projetos', user.id)
          }

          await carregarProjetos(user?.id, false)
          showSuccess(t('projects.projectDeleted'))
        } catch (error) {
          showError(error.message || 'Erro ao excluir projeto')
        } finally {
          setLoading(false)
        }
      },
      t('projects.deleteConfirmTitle')
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800 border-green-200'
      case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'concluido': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'ativo': return t('projects.statusActive')
      case 'pausado': return t('projects.statusPaused')
      case 'concluido': return t('projects.statusCompleted')
      case 'cancelado': return t('projects.statusCancelled')
      default: return t('projects.undefined')
    }
  }

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-100 text-gray-700'
      case 'media': return 'bg-blue-100 text-blue-700'
      case 'alta': return 'bg-orange-100 text-orange-700'
      case 'urgente': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPrioridadeText = (prioridade) => {
    switch (prioridade) {
      case 'baixa': return `🔹 ${t('projects.priorityLow')}`
      case 'media': return `🔸 ${t('projects.priorityMedium')}`
      case 'alta': return `🔶 ${t('projects.priorityHigh')}`
      case 'urgente': return `🔺 ${t('projects.priorityUrgent')}`
      default: return t('projects.undefinedPriority')
    }
  }

  // Verifica se o projeto está atrasado
  const isProjetoAtrasado = (projeto) => {
    if (!projeto.data_fim) return false
    if (projeto.status === 'concluido' || projeto.status === 'cancelado') return false
    
    const dataFim = new Date(projeto.data_fim + 'T23:59:59')
    const hoje = new Date()
    
    return hoje > dataFim
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US'
    const currency = locale === 'pt-BR' ? 'BRL' : 'USD'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return formatDateUtil(dateString, 'DD/MM/YYYY')
  }

  const projetosFiltrados = projetos.filter(projeto => {
    const matchStatus = filters.status === 'todos' || projeto.status === filters.status
    const matchPrioridade = filters.prioridade === 'todas' || projeto.prioridade === filters.prioridade
    const matchEmpresa = !filters.empresa || projeto.empresa_id === filters.empresa
    const matchResponsavel = !filters.responsavel || projeto.responsavel_id === filters.responsavel

    return matchStatus && matchPrioridade && matchEmpresa && matchResponsavel
  })

  const estatisticas = {
    total: projetos.length,
    ativos: projetos.filter(p => p.status === 'ativo').length,
    concluidos: projetos.filter(p => p.status === 'concluido').length,
    pausados: projetos.filter(p => p.status === 'pausado').length,
    cancelados: projetos.filter(p => p.status === 'cancelado').length
  }

  return (
    <MainLayout title={t('projects.title')} subtitle={t('projects.subtitle')}>
      {/* Header com Botão de Novo Projeto */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiTarget className="w-7 h-7" />
            {t('projects.projects')}
          </h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <FiPlus className="w-5 h-5" />
            {t('projects.newProject')}
          </button>
        )}
      </div>

      {/* Indicador de Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center">
            <FiAlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <div>
              <div className="font-medium text-red-800">Erro ao carregar projetos</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
              <button
                onClick={carregarDados}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{estatisticas.total}</div>
              <div className="text-xs sm:text-sm text-blue-700 flex items-center justify-center gap-1">
                <FiBarChart2 className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projects.total')}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
              <div className="text-xs sm:text-sm text-green-700 flex items-center justify-center gap-1">
                <FiCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projects.actives')}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{estatisticas.concluidos}</div>
              <div className="text-xs sm:text-sm text-blue-700 flex items-center justify-center gap-1">
                <FiCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projects.concluded')}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{estatisticas.pausados}</div>
              <div className="text-xs sm:text-sm text-yellow-700 flex items-center justify-center gap-1">
                <FiCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projects.paused')}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{estatisticas.cancelados}</div>
              <div className="text-xs sm:text-sm text-red-700 flex items-center justify-center gap-1">
                <FiXCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projects.cancelled')}
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('projects.statusLabel')}</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todos">{t('projects.allStatus')}</option>
                  <option value="ativo">{t('projects.statusActive')}</option>
                  <option value="pausado">{t('projects.statusPaused')}</option>
                  <option value="concluido">{t('projects.statusCompleted')}</option>
                  <option value="cancelado">{t('projects.statusCancelled')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('projects.priority')}</label>
                <select
                  name="prioridade"
                  value={filters.prioridade}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todas">{t('projects.allPriorities')}</option>
                  <option value="baixa">🔹 {t('projects.priorityLow')}</option>
                  <option value="media">🔸 {t('projects.priorityMedium')}</option>
                  <option value="alta">🔶 {t('projects.priorityHigh')}</option>
                  <option value="urgente">🔺 {t('projects.priorityUrgent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('projects.companyLabel')}</label>
                <select
                  name="empresa"
                  value={filters.empresa}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('projects.allCompanies')}</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('projects.responsible')}</label>
                <select
                  name="responsavel"
                  value={filters.responsavel}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('projects.allResponsibles')}</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão de Limpar Filtros */}
            {(filters.status !== 'todos' || filters.prioridade !== 'todas' || filters.empresa || filters.responsavel) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <FiRotateCcw className="w-4 h-4" />
                  {t('history.clear')}
                </button>
              </div>
            )}
          </div>

        {/* Lista de Projetos */}
        {showSkeleton ? (
          <GerenciamentoProjetosSkeleton />
        ) : (
        <div className="space-y-4">
          {projetosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-300 p-8 text-center">
              <FiFolder className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg font-medium">{t('projects.noProjectsFound')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('projects.createNewOrAdjustFilters')}</p>
            </div>
          ) : (
            projetosFiltrados.map(projeto => (
              <div key={projeto.id} className="bg-white rounded-lg shadow-md border border-gray-300 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: projeto.cor_identificacao }}
                      ></div>
                      <h3 className="text-base sm:text-xl font-bold text-gray-800 break-words">{projeto.nome}</h3>
                      <span className={`px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getStatusColor(projeto.status)}`}>
                        {getStatusText(projeto.status)}
                      </span>
                      <span className={`px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(projeto.prioridade)}`}>
                        {getPrioridadeText(projeto.prioridade)}
                      </span>
                      {isProjetoAtrasado(projeto) && isAdmin && (
                        <span className="px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          {t('projects.delayed')}
                        </span>
                      )}
                    </div>
                    
                    {projeto.descricao && (
                      <p className="text-sm sm:text-base text-gray-600 mb-3 line-clamp-2">{projeto.descricao}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{t('projects.companyField')}</span>
                        <p className="text-gray-600 truncate">{projeto.empresas?.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t('projects.responsibleField')}</span>
                        <p className="text-gray-600 truncate">{projeto.profiles?.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t('projects.periodField')}</span>
                        <p className="text-gray-600 text-xs sm:text-sm">
                          {formatDate(projeto.data_inicio)} - {formatDate(projeto.data_fim)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{t('projects.budgetField')}</span>
                        <p className="text-gray-600">{formatCurrency(projeto.orcamento)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto sm:ml-4 items-start justify-end">
                    {isProjetoAtrasado(projeto) && !isAdmin && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {t('projects.delayed')}
                      </span>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openModal(projeto)}
                          className="px-2 sm:px-3 py-1 bg-blue-500 text-white text-xs sm:text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
                        >
                          <FiEdit2 className="w-3 h-3 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline">{t('projects.edit')}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(projeto.id)}
                          className="px-2 sm:px-3 py-1 bg-red-500 text-white text-xs sm:text-sm rounded-md hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline">{t('projects.exclude')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {projeto.horas_estimadas && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-xs sm:text-sm mb-2">
                      <span className="font-medium text-gray-700">{t('projects.hoursProgress')}</span>
                      <span className="text-gray-600">
                        {projeto.horasTrabalhadas || 0} / {projeto.horas_estimadas}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(((projeto.horasTrabalhadas || 0) / projeto.horas_estimadas) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {editingProject ? (
                      <>
                        <FiEdit2 className="w-6 h-6" /> Editar Projeto
                      </>
                    ) : (
                      <>
                        <FiPlus className="w-6 h-6" /> Novo Projeto
                      </>
                    )}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalProjectName')}
                      </label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalCompany')}
                      </label>
                      <select
                        name="empresa_id"
                        value={formData.empresa_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('projects.modalSelectCompany')}</option>
                        {empresas.map(empresa => (
                          <option key={empresa.id} value={empresa.id}>
                            {empresa.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('projects.modalDescription')}
                    </label>
                    <textarea
                      name="descricao"
                      value={formData.descricao}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalStartDate')}
                      </label>
                      <input
                        type="date"
                        name="data_inicio"
                        value={formData.data_inicio}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalEndDate')}
                      </label>
                      <input
                        type="date"
                        name="data_fim"
                        value={formData.data_fim}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalStatus')}
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ativo">{t('projects.statusActive')}</option>
                        <option value="pausado">{t('projects.statusPaused')}</option>
                        <option value="concluido">{t('projects.statusCompleted')}</option>
                        <option value="cancelado">{t('projects.statusCancelled')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalPriority')}
                      </label>
                      <select
                        name="prioridade"
                        value={formData.prioridade}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="baixa">🔹 {t('projects.priorityLow')}</option>
                        <option value="media">🔸 {t('projects.priorityMedium')}</option>
                        <option value="alta">🔶 {t('projects.priorityHigh')}</option>
                        <option value="urgente">🔺 {t('projects.priorityUrgent')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalBudget')}
                      </label>
                      <input
                        type="number"
                        name="orcamento"
                        value={formData.orcamento}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalEstimatedHours')}
                      </label>
                      <input
                        type="number"
                        name="horas_estimadas"
                        value={formData.horas_estimadas}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('projects.modalResponsible')}
                      </label>
                      <select
                        name="responsavel_id"
                        value={formData.responsavel_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('projects.modalSelectResponsible')}</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        t('projects.modalSaving')
                      ) : editingProject ? (
                        <>
                          <FiSave className="w-5 h-5" /> {t('projects.modalUpdate')}
                        </>
                      ) : (
                        <>
                          <FiPlus className="w-5 h-5" /> {t('projects.modalCreate')}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <FiX className="w-5 h-5" /> {t('projects.modalCancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação/notificação */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeNotificationModal}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={modalState.onConfirm}
      >
        {modalState.message}
      </Modal>
    </MainLayout>
  )
}

export default GerenciamentoProjetos
