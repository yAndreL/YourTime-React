import { useEffect } from 'react'
import { supabase } from '../config/supabase'
import CacheService from '../services/CacheService'

/**
 * Hook para gerenciar cache com segurança
 * Limpa cache automaticamente no logout
 */
export const useSecureCache = () => {
  useEffect(() => {
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {

        CacheService.clearAll()
        // Limpar também filtros e outros dados do sessionStorage
        sessionStorage.removeItem('projectFilters')
        sessionStorage.removeItem('historicoFilters')
        sessionStorage.removeItem('currentUserId')
        sessionStorage.removeItem('user_is_admin')

      } else if (event === 'SIGNED_IN' && session?.user) {

        // Limpa caches expirados na inicialização
        CacheService.clearExpired()
      } else if (event === 'USER_UPDATED') {

      } else if (event === 'TOKEN_REFRESHED') {
        // Não faz nada, mantém o cache
      }
    })

    // Cleanup no unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Limpa caches expirados periodicamente (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      CacheService.clearExpired()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [])

  return {
    clearUserCache: (userId) => CacheService.clearUserCache(userId),
    clearAll: () => CacheService.clearAll(),
    getCacheInfo: () => CacheService.getInfo()
  }
}
