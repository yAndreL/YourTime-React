import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiTrash2, FiCheck } from 'react-icons/fi'
import NotificationService from '../services/NotificationService'
import { supabase } from '../config/supabase'
import MainLayout from '../components/layout/MainLayout'

function Notificacoes() {
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, unread, read
  const navigate = useNavigate()

  useEffect(() => {
    carregarNotificacoes()
  }, [])

  const getCurrentUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id || null
    } catch (error) {

      return null
    }
  }

  const carregarNotificacoes = async () => {
    setIsLoading(true)
    const userId = await getCurrentUserId()
    
    if (!userId) {

      setIsLoading(false)
      return
    }

    const result = await NotificationService.buscarNotificacoes(userId)
    
    if (result.success) {
      setNotifications(result.data || [])
    }
    setIsLoading(false)
  }

  const handleMarcarComoLida = async (notificacaoId) => {
    const result = await NotificationService.marcarComoLida(notificacaoId)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificacaoId ? { ...n, lida: true } : n
        )
      )
    }
  }

  const handleMarcarTodasComoLidas = async () => {
    const userId = await getCurrentUserId()
    if (!userId) return

    const result = await NotificationService.marcarTodasComoLidas(userId)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, lida: true }))
      )
    }
  }

  const handleDeletarNotificacao = async (notificacaoId) => {
    const result = await NotificationService.deletarNotificacao(notificacaoId)
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== notificacaoId))
    }
  }

  const handleNotificacaoClick = async (notificacao) => {
    // Marcar como lida se ainda não foi
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id)
    }

    // Navegar baseado no tipo
    if (notificacao.tipo === 'aprovacao_pendente') {
      if (notificacao.metadata?.data_ponto) {
        sessionStorage.setItem('filterDate', notificacao.metadata.data_ponto)
        sessionStorage.setItem('filterStatus', 'Pendente')
      }
      navigate('/painel-admin')
    } else if (notificacao.agendamento_id) {
      navigate('/historico')
    }
  }

  const getIconeNotificacao = (tipo) => {
    const IconMap = {
      ponto_registrado: FiCheckCircle,
      ponto_aprovado: FiCheckCircle,
      ponto_rejeitado: FiXCircle,
      aprovacao_pendente: FiClock,
      lembrete_ponto: FiBell,
      relatorio: FiAlertCircle,
      sistema: FiInfo
    }
    return IconMap[tipo] || FiBell
  }

  const getCorNotificacao = (tipo) => {
    const cores = {
      ponto_registrado: 'border-green-300 bg-green-50',
      ponto_aprovado: 'border-green-300 bg-green-50',
      ponto_rejeitado: 'border-red-300 bg-red-50',
      aprovacao_pendente: 'border-yellow-300 bg-yellow-50',
      lembrete_ponto: 'border-blue-300 bg-blue-50',
      relatorio: 'border-purple-300 bg-purple-50',
      sistema: 'border-gray-300 bg-gray-50'
    }
    return cores[tipo] || 'border-gray-300 bg-gray-50'
  }

  const formatarTempo = (timestamp) => {
    if (!timestamp) return 'Recente'
    
    const data = new Date(timestamp)
    const agora = new Date()
    const diffMs = agora - data
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMins / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMins < 1) return 'Agora'
    if (diffMins === 1) return 'Há 1 minuto'
    if (diffMins < 60) return `Há ${diffMins} minutos`
    if (diffHoras === 1) return 'Há 1 hora'
    if (diffHoras < 24) return `Há ${diffHoras} horas`
    if (diffDias === 1) return 'Há 1 dia'
    if (diffDias < 7) return `Há ${diffDias} dias`
    
    return data.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.lida
    if (filter === 'read') return n.lida
    return true
  })

  const unreadCount = notifications.filter(n => !n.lida).length

  return (
    <MainLayout title="Notificações">
      <div className="max-w-4xl mx-auto">
        {/* Header com filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <FiBell className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Todas as Notificações</h2>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}` : 'Nenhuma notificação não lida'}
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Não lidas
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'read'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lidas
              </button>
            </div>
          </div>

          {/* Ação de marcar todas como lidas */}
          {unreadCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleMarcarTodasComoLidas}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>

        {/* Lista de notificações */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiBell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'Nenhuma notificação não lida' : 
               filter === 'read' ? 'Nenhuma notificação lida' : 
               'Nenhuma notificação'}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'Você não tem notificações ainda.' : 
               filter === 'unread' ? 'Todas as suas notificações já foram lidas.' :
               'Você não tem notificações lidas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notificacao) => {
              const IconComponent = getIconeNotificacao(notificacao.tipo)
              
              return (
                <div
                  key={notificacao.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 overflow-hidden transition-all hover:shadow-md ${
                    getCorNotificacao(notificacao.tipo)
                  } ${!notificacao.lida ? 'ring-2 ring-blue-100' : ''}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ícone */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        notificacao.tipo === 'aprovacao_pendente' ? 'bg-yellow-100 text-yellow-600' :
                        notificacao.tipo === 'ponto_aprovado' ? 'bg-green-100 text-green-600' :
                        notificacao.tipo === 'ponto_rejeitado' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className={`text-base font-semibold text-gray-900 ${!notificacao.lida ? 'font-bold' : ''}`}>
                            {notificacao.titulo}
                          </h3>
                          {!notificacao.lida && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {notificacao.tipo === 'aprovacao_pendente' && notificacao.metadata?.funcionario ? (
                            <>
                              <span className="font-semibold text-gray-900">{notificacao.metadata.funcionario}</span> {notificacao.mensagem}
                            </>
                          ) : (
                            notificacao.mensagem
                          )}
                        </p>

                        {notificacao.metadata?.data_formatada && (
                          <p className="text-xs text-gray-500 mb-2">
                            📅 Data do ponto: {notificacao.metadata.data_formatada}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatarTempo(notificacao.created_at)}
                          </p>

                          {/* Ações */}
                          <div className="flex gap-2">
                            {notificacao.tipo === 'aprovacao_pendente' && (
                              <button
                                onClick={() => handleNotificacaoClick(notificacao)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                              >
                                Ver ponto
                              </button>
                            )}
                            
                            {!notificacao.lida && (
                              <button
                                onClick={() => handleMarcarComoLida(notificacao.id)}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                title="Marcar como lida"
                              >
                                <FiCheck className="w-3 h-3" />
                                Marcar lida
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeletarNotificacao(notificacao.id)}
                              className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                              title="Deletar"
                            >
                              <FiTrash2 className="w-3 h-3" />
                              Deletar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Notificacoes
