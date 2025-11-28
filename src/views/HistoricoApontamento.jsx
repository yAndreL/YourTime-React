import { useState, useEffect } from 'react'
import MainLayout from '../components/layout/MainLayout'
import { supabase } from '../config/supabase.js'
import CacheService from '../services/CacheService'
import { useLanguage } from '../hooks/useLanguage'
import { FiCalendar, FiRotateCcw, FiClock } from 'react-icons/fi'

function HistoricoApontamento() {
  const { t } = useLanguage()
  // Funções auxiliares de cache
  const getCachedData = (key) => {
    try {
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

  // Inicializar filtros do sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('historicoFilters')
      if (saved) {

        return JSON.parse(saved)
      }
    } catch (e) {

    }
    return {
      dataInicio: '',
      dataFim: '',
      projeto: ''
    }
  }

  const [filters, setFilters] = useState(getSavedFilters())
  const [apontamentos, setApontamentos] = useState(getCachedData('apontamentos') || [])
  const [projetos, setProjetos] = useState(getCachedData('projetos_historico') || [])
  const [loading, setLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    let skeletonTimeout = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Salvar userId para próximas inicializações
      sessionStorage.setItem('currentUserId', user.id)

      // Verificar se tem dados em cache
      const hasCachedData = apontamentos.length > 0 || projetos.length > 0
      
      if (hasCachedData) {

        // Atualiza em background
        await Promise.all([
          carregarApontamentos(user.id, true),
          carregarProjetos(user.id, true)
        ])
        return
      }

      // Se não tem cache, mostra skeleton apenas após 300ms
      setLoading(true)
      skeletonTimeout = setTimeout(() => {
        setShowSkeleton(true)
      }, 300)

      await Promise.all([
        carregarApontamentos(user.id, false),
        carregarProjetos(user.id, false)
      ])
    } catch (error) {

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

      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome')

      if (error) throw error
      
      const projetos = data || []
      setProjetos(projetos)
      
      // Salvar no cache (TTL de 10 minutos)
      if (userId) {
        CacheService.set('projetos_historico', projetos, userId, 10 * 60 * 1000)
      }
    } catch (error) {

      setProjetos([])
    }
  }

  const carregarApontamentos = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {

        setLoading(true)
      }
      
      // Buscar o usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setApontamentos([])
        return
      }

      let query = supabase
        .from('agendamento')
        .select(`
          *
        `)
        .eq('user_id', user.id)
        .order('data', { ascending: false })

      // Aplicar filtros se houver
      if (filters.dataInicio) {
        query = query.gte('data', filters.dataInicio)
      }
      
      if (filters.dataFim) {
        query = query.lte('data', filters.dataFim)
      }

      const { data, error } = await query
      
      if (error) {

        throw error
      }

      if (!data || data.length === 0) {
        setApontamentos([])
        return
      }

      // Buscar nomes dos projetos separadamente se necessário
      const projetoIds = [...new Set(data.map(apt => apt.projeto_id).filter(id => id))]
      let projetosMap = {}
      
      if (projetoIds.length > 0) {
        const { data: projetosData } = await supabase
          .from('projetos')
          .select('id, nome')
          .in('id', projetoIds)
        
        if (projetosData) {
          projetosMap = Object.fromEntries(projetosData.map(p => [p.id, p.nome]))
        }
      }

      // Mapear dados para o formato esperado
      const apontamentosMapeados = data.map(apt => ({
        id: apt.id,
        data: apt.data,
        projeto: projetosMap[apt.projeto_id] || 'Sem Projeto',
        entrada1: apt.entrada1 || '--:--',
        saida1: apt.saida1 || '--:--',
        entrada2: apt.entrada2 || '--:--',
        saida2: apt.saida2 || '--:--',
        horasTrabalhadas: calcularHorasTrabalhadas(apt),
        anotacoes: apt.observacao,
        status: apt.status || 'P' // 'A' = Aprovado, 'P' = Pendente, 'R' = Rejeitado
      }))

      setApontamentos(apontamentosMapeados)
      
      // Salvar no cache (TTL de 10 minutos)
      if (userId) {
        CacheService.set('apontamentos', apontamentosMapeados, userId, 10 * 60 * 1000)
      }
    } catch (error) {

      setApontamentos([])
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false)
      }
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const newFilters = {
      ...filters,
      [name]: value
    }
    setFilters(newFilters)
    
    // Salvar filtros no sessionStorage
    try {
      sessionStorage.setItem('historicoFilters', JSON.stringify(newFilters))

    } catch (e) {

    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Invalida cache e recarrega com filtros
      CacheService.remove('apontamentos', user.id)
      await carregarApontamentos(user.id, false)
    }
  }

  const handleClearFilters = async () => {
    // Limpa os filtros
    const defaultFilters = {
      dataInicio: '',
      dataFim: '',
      projeto: ''
    }
    setFilters(defaultFilters)
    
    // Limpar filtros do sessionStorage
    try {
      sessionStorage.removeItem('historicoFilters')

    } catch (e) {

    }
    
    // Recarrega todos os apontamentos sem filtros
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Invalida cache e recarrega
        CacheService.remove('apontamentos', user.id)
        await carregarApontamentos(user.id, false)
      }
    } catch (error) {

    }
  }

  // Remover código duplicado abaixo
  const handleClearFiltersOLD = async () => {
    // FUNÇÃO REMOVIDA - usar handleClearFilters acima
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setApontamentos([])
        return
      }

      const { data, error } = await supabase
        .from('agendamento')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
      
      if (error) throw error

      if (!data || data.length === 0) {
        setApontamentos([])
        return
      }

      // Buscar nomes dos projetos
      const projetoIds = [...new Set(data.map(apt => apt.projeto_id).filter(id => id))]
      let projetosMap = {}
      
      if (projetoIds.length > 0) {
        const { data: projetosData } = await supabase
          .from('projetos')
          .select('id, nome')
          .in('id', projetoIds)
        
        if (projetosData) {
          projetosMap = Object.fromEntries(projetosData.map(p => [p.id, p.nome]))
        }
      }

      // Este código não será executado pois foi substituído pela função handleClearFilters acima
    } catch (error) {

    }
  }

  // Aplicar apenas filtro de projeto no frontend (já que data é filtrada na query)
  const filteredApontamentos = apontamentos.filter(apontamento => {
    const matchProjeto = !filters.projeto || apontamento.projeto.toLowerCase().includes(filters.projeto.toLowerCase())
    return matchProjeto
  })

  const formatDate = (dateString) => {
    // Adiciona 'T00:00:00' para garantir que a data seja interpretada no timezone local
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'A':
        return { 
          text: t('history.approved'), 
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '✓'
        }
      case 'R':
        return { 
          text: t('history.rejected'), 
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: '✗'
        }
      case 'P':
        return { 
          text: t('history.pending'), 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <FiClock className="w-4 h-4" />
        }
      default:
        return { 
          text: t('history.noStatus'), 
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '?'
        }
    }
  }

  return (
    <MainLayout title={t('history.title')} subtitle={t('history.subtitle')}>
      {/* Resumo do Período */}
      {!loading && filteredApontamentos.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('history.periodSummary')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{filteredApontamentos.length}</div>
              <div className="text-sm text-blue-700 font-medium">{t('history.records')}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {filteredApontamentos.reduce((total, apt) => {
                  const [h, m] = apt.horasTrabalhadas.split(':')
                  return total + parseInt(h) + parseInt(m) / 60
                }, 0).toFixed(1)}h
              </div>
              <div className="text-sm text-green-700 font-medium">{t('history.totalWorked')}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {new Set(filteredApontamentos.map(apt => apt.projeto)).size}
              </div>
              <div className="text-sm text-purple-700 font-medium">Projetos</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Formulário de Filtros */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                {t('history.startDate')}
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
                {t('history.endDate')}
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
                <option value="">{t('history.allProjects')}</option>
                {projetos.map(projeto => (
                  <option key={projeto.id} value={projeto.nome}>{projeto.nome}</option>
                ))}
                <option value="Sem Projeto">Sem Projeto</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? t('common.loading') : t('history.search')}
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('history.clear')}
              </button>
            </div>
          </form>

        {/* Lista de Apontamentos */}
        <div className="space-y-3">
          {showSkeleton ? (
            <div className="bg-gray-50 rounded-lg border border-gray-300 p-6 text-center">
              <p className="text-gray-500">{t('history.loadingRecords')}</p>
            </div>
          ) : filteredApontamentos.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-gray-300 p-6 text-center">
              <p className="text-gray-500">{t('history.noRecordsForFilters')}</p>
            </div>
          ) : (
            filteredApontamentos.map(apontamento => {
              const statusInfo = getStatusInfo(apontamento.status)
              return (
              <div key={apontamento.id} className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
                {/* Header do Card */}
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-800">{formatDate(apontamento.data)}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 font-medium">{apontamento.projeto}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">{apontamento.horasTrabalhadas}</div>
                    <div className="text-xs text-gray-600">{t('history.hoursLabel')}</div>
                  </div>
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="text-xs text-green-700 font-medium">{t('history.entry1Label')}</div>
                      <div className="text-sm font-bold text-green-800">{apontamento.entrada1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="text-xs text-red-700 font-medium">{t('history.exit1Label')}</div>
                      <div className="text-sm font-bold text-red-800">{apontamento.saida1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="text-xs text-green-700 font-medium">{t('history.entry2Label')}</div>
                      <div className="text-sm font-bold text-green-800">{apontamento.entrada2}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="text-xs text-red-700 font-medium">{t('history.exit2Label')}</div>
                      <div className="text-sm font-bold text-red-800">{apontamento.saida2}</div>
                    </div>
                  </div>
                </div>

                {/* Anotações */}
                {apontamento.anotacoes && (
                  <div className="mt-2 bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-600 font-medium mb-1">{t('history.notes')}</div>
                    <div className="text-sm text-gray-800">{apontamento.anotacoes}</div>
                  </div>
                )}
              </div>
            )})
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default HistoricoApontamento
