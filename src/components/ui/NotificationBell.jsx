import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'
import NotificationService from '../../services/NotificationService'
import { supabase } from '../../config/supabase'

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const initNotifications = async () => {
      await carregarNotificacoes()
      
      // Subscribe para novas notificações em tempo real
      const userId = await getCurrentUserId()
      if (userId) {
        const channel = NotificationService.subscribeToNotifications(userId, (novaNotificacao) => {
          setNotifications(prev => [novaNotificacao, ...prev])
          setUnreadCount(prev => prev + 1)
        })

        return () => {
          NotificationService.unsubscribeFromNotifications(channel)
        }
      }
    }

    initNotifications()
  }, [])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
      
      // Contar não lidas
      const countResult = await NotificationService.contarNaoLidas(userId)
      if (countResult.success) {
        setUnreadCount(countResult.count)
      }
    }
    setIsLoading(false)
  }

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleMarcarComoLida = async (notificacaoId, event) => {
    event.stopPropagation()
    
    const result = await NotificationService.marcarComoLida(notificacaoId)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificacaoId ? { ...n, lida: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
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
      setUnreadCount(0)
    }
  }

  const handleDeletarNotificacao = async (notificacaoId, event) => {
    event.stopPropagation()
    
    const result = await NotificationService.deletarNotificacao(notificacaoId)
    if (result.success) {
      const notificacao = notifications.find(n => n.id === notificacaoId)
      setNotifications(prev => prev.filter(n => n.id !== notificacaoId))
      
      if (!notificacao?.lida) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }
  }

  const handleNotificacaoClick = async (notificacao) => {
    // Marcar como lida se ainda não foi
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id, { stopPropagation: () => {} })
    }

    // Navegar baseado no tipo
    if (notificacao.tipo === 'aprovacao_pendente') {
      // Redirecionar para painel admin com filtro de data
      if (notificacao.metadata?.data_ponto) {
        // Salvar data no sessionStorage para o PainelAdmin usar
        sessionStorage.setItem('filterDate', notificacao.metadata.data_ponto)
        sessionStorage.setItem('filterStatus', 'Pendente')
      }
      navigate('/painel-admin')
    } else if (notificacao.agendamento_id) {
      navigate('/historico')
    }

    setIsOpen(false)
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
    const IconComponent = IconMap[tipo] || FiBell
    return <IconComponent className="w-5 h-5 max-[620px]:w-4 max-[620px]:h-4" />
  }

  const getCorNotificacao = (tipo) => {
    const cores = {
      ponto_registrado: 'bg-green-50 border-green-200',
      ponto_aprovado: 'bg-green-50 border-green-200',
      ponto_rejeitado: 'bg-red-50 border-red-200',
      aprovacao_pendente: 'bg-yellow-50 border-yellow-200',
      lembrete_ponto: 'bg-blue-50 border-blue-200',
      relatorio: 'bg-purple-50 border-purple-200',
      sistema: 'bg-gray-50 border-gray-200'
    }
    return cores[tipo] || 'bg-gray-50 border-gray-200'
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
    
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sino */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificações"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-[620px]:w-[min(calc(100vw-1rem),250px)] max-[620px]:right-0 max-[620px]:mr-0.5 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-3 max-[620px]:px-1.5 py-3 max-[620px]:py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg gap-2">
            <h3 className="text-base max-[620px]:text-xs font-semibold text-gray-900 flex-shrink-0">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarcarTodasComoLidas}
                className="text-[10px] max-[620px]:text-[8px] text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap flex-shrink-0"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 max-[620px]:p-4 text-center text-gray-500">
                <svg className="w-16 h-16 max-[620px]:w-12 max-[620px]:h-12 mx-auto mb-4 max-[620px]:mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm max-[620px]:text-xs">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notificacao) => (
                  <div
                  key={notificacao.id}
                  onClick={() => handleNotificacaoClick(notificacao)}
                  className={`px-4 max-[620px]:px-2 py-3 max-[620px]:py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notificacao.lida ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 max-[620px]:gap-2">
                    {/* Ícone */}
                    <div className={`flex-shrink-0 w-10 h-10 max-[620px]:w-8 max-[620px]:h-8 rounded-full flex items-center justify-center border ${getCorNotificacao(notificacao.tipo)}`}>
                      {getIconeNotificacao(notificacao.tipo)}
                    </div>                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm max-[620px]:text-xs font-medium text-gray-900 ${!notificacao.lida ? 'font-semibold' : ''}`}>
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-sm max-[620px]:text-xs text-gray-600 mt-1">
                        {notificacao.tipo === 'aprovacao_pendente' && notificacao.metadata?.funcionario ? (
                          <>
                            <span className="font-semibold text-gray-900">{notificacao.metadata.funcionario}</span> {notificacao.mensagem}
                          </>
                        ) : (
                          notificacao.mensagem
                        )}
                      </p>
                      {notificacao.metadata?.data_formatada && (
                        <p className="text-xs max-[620px]:text-[10px] text-gray-500 mt-1">Data: {notificacao.metadata.data_formatada}</p>
                      )}
                      <p className="text-xs max-[620px]:text-[10px] text-gray-400 mt-1">{formatarTempo(notificacao.created_at)}</p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notificacao.lida && (
                        <button
                          onClick={(e) => handleMarcarComoLida(notificacao.id, e)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Marcar como lida"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeletarNotificacao(notificacao.id, e)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Deletar"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  navigate('/notificacoes')
                  setIsOpen(false)
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
