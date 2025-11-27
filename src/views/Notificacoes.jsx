import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiTrash2, FiCheck, FiCalendar } from 'react-icons/fi'
import NotificationService from '../services/NotificationService'
import { supabase } from '../config/supabase'
import MainLayout from '../components/layout/MainLayout'
import { useLanguage } from '../hooks/useLanguage'

function Notificacoes() {
  const { t, currentLanguage } = useLanguage()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, unread, read
  const navigate = useNavigate()

  // Função para traduzir notificações antigas
  const translateNotification = (notification) => {
    const { titulo, mensagem, metadata } = notification
    
    // Mapear títulos conhecidos para chaves de tradução
    const tituloMap = {
      'Ponto Aguardando Aprovação': 'notifications.pendingApprovalTitle',
      'Ponto aguardando aprovação': 'notifications.pendingApprovalTitle',
      'Ponto aprovado': 'notifications.approvedTitle',
      'Ponto Aprovado': 'notifications.approvedTitle',
      'Ponto rejeitado': 'notifications.rejectedTitle',
      'Ponto Rejeitado': 'notifications.rejectedTitle',
      'Lembrete de Ponto': 'notifications.reminderTitle',
      'Lembrete de ponto': 'notifications.reminderTitle',
    }
    
    const mensagemMap = {
      'registrou um ponto e aguarda aprovação': 'notifications.pendingApprovalMessage',
      'Não esqueça de registrar sua entrada!': 'notifications.reminderStart',
      'Hora do intervalo! Registre sua saída e retorno.': 'notifications.reminderBreak',
      'Fim do expediente chegando. Lembre-se de registrar sua saída!': 'notifications.reminderEnd',
      'Lembre-se de registrar seu ponto.': 'notifications.reminderDefault',
    }
    
    let tituloTraduzido = titulo
    let mensagemTraduzida = mensagem
    
    // Traduzir título se encontrado no mapa
    if (tituloMap[titulo]) {
      tituloTraduzido = t(tituloMap[titulo])
    }
    
    // Traduzir mensagem se encontrada no mapa
    if (mensagemMap[mensagem]) {
      mensagemTraduzida = t(mensagemMap[mensagem])
    } else if (mensagem.includes('foi aprovado') || mensagem.includes('has been approved')) {
      // Mensagem de aprovação com data - extrair data da mensagem
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/)
      const data = dataMatch ? dataMatch[0] : (metadata?.data || metadata?.data_formatada)
      if (data) {
        mensagemTraduzida = t('notifications.approvedMessage').replace('{date}', data)
      }
    } else if (mensagem.includes('foi rejeitado') || mensagem.includes('has been rejected')) {
      // Mensagem de rejeição com data e motivo
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/)
      const data = dataMatch ? dataMatch[0] : metadata?.data
      const motivo = metadata?.motivo || 'Não especificado'
      if (data) {
        mensagemTraduzida = t('notifications.rejectedMessage')
          .replace('{date}', data)
          .replace('{reason}', motivo)
      }
    } else if (mensagem.includes('Seu registro de ponto do dia')) {
      // Padrão específico das notificações antigas de aprovação
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/)
      if (dataMatch) {
        mensagemTraduzida = t('notifications.approvedMessage').replace('{date}', dataMatch[0])
      }
    }
    
    return {
      ...notification,
      titulo: tituloTraduzido,
      mensagem: mensagemTraduzida
    }
  }

  useEffect(() => {
    carregarNotificacoes()
  }, [])

  // Recarregar e traduzir notificações quando o idioma mudar
  useEffect(() => {
    carregarNotificacoes()
  }, [currentLanguage])

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
      // Traduzir todas as notificações ao carregar
      const notificacoesTraduzidas = (result.data || []).map(n => translateNotification(n))
      setNotifications(notificacoesTraduzidas)
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
    if (!timestamp) return t('notifications.recent')
    
    const data = new Date(timestamp)
    const agora = new Date()
    const diffMs = agora - data
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMins / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMins < 1) return t('notifications.now')
    if (diffMins === 1) return t('notifications.minuteAgo')
    if (diffMins < 60) return t('notifications.minutesAgo').replace('{minutes}', diffMins)
    if (diffHoras === 1) return t('notifications.hourAgo')
    if (diffHoras < 24) return t('notifications.hoursAgo').replace('{hours}', diffHoras)
    if (diffDias === 1) return t('notifications.dayAgo')
    if (diffDias < 7) return t('notifications.daysAgo').replace('{days}', diffDias)
    
    const locale = currentLanguage === 'en-US' ? 'en-US' : 'pt-BR'
    return data.toLocaleDateString(locale, { 
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
    <MainLayout title={t('notifications.title')}>
      <div className="max-w-4xl mx-auto">
        {/* Header com filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <FiBell className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('notifications.allNotifications')}</h2>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} ${unreadCount !== 1 ? t('notifications.unreadCountPlural') : t('notifications.unreadCount')}` : t('notifications.noUnreadNotifications')}
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
                {t('notifications.all')}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('notifications.unread')}
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'read'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('notifications.read')}
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
                {t('notifications.markAllRead')}
              </button>
            </div>
          )}
        </div>

        {/* Lista de notificações */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('notifications.loadingNotifications')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiBell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? t('notifications.noUnreadFound') : 
               filter === 'read' ? t('notifications.noReadFound') : 
               t('notifications.noNotifications')}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? t('notifications.noNotificationsYet') : 
               filter === 'unread' ? t('notifications.allRead') :
               t('notifications.noReadNotifications')}
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
                          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            {t('notifications.timeEntryDate')} {notificacao.metadata.data_formatada}
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
                                {t('notifications.viewTimeEntry')}
                              </button>
                            )}
                            
                            {!notificacao.lida && (
                              <button
                                onClick={() => handleMarcarComoLida(notificacao.id)}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                title={t('notifications.markRead')}
                              >
                                <FiCheck className="w-3 h-3" />
                                {t('notifications.markRead')}
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeletarNotificacao(notificacao.id)}
                              className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                              title={t('notifications.delete')}
                            >
                              <FiTrash2 className="w-3 h-3" />
                              {t('notifications.delete')}
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
