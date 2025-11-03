/**
 * Serviço de Cache Seguro
 * Gerencia cache de dados com validação de segurança e expiração
 */

class CacheService {
  constructor() {
    this.prefix = 'yourtime_'
    this.defaultTTL = 5 * 60 * 1000 // 5 minutos padrão
  }

  /**
   * Gera uma chave de cache baseada no usuário
   */
  generateKey(key, userId) {
    if (!userId) {

      return `${this.prefix}${key}`
    }
    return `${this.prefix}${userId}_${key}`
  }

  /**
   * Salva dados no cache com validação de segurança
   */
  set(key, data, userId, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateKey(key, userId)
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        userId, // Armazena o userId para validação
        version: '1.0' // Versão do cache para invalidação futura
      }
      
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
      return true
    } catch (error) {

      // Se o storage estiver cheio, limpa caches antigos
      if (error.name === 'QuotaExceededError') {
        this.clearExpired()
      }
      return false
    }
  }

  /**
   * Recupera dados do cache com validação de segurança
   */
  get(key, userId, validateUser = true) {
    try {
      const cacheKey = this.generateKey(key, userId)
      const cached = sessionStorage.getItem(cacheKey)
      
      if (!cached) return null

      const cacheData = JSON.parse(cached)

      // Validação de segurança: verifica se o userId corresponde
      if (validateUser && cacheData.userId !== userId) {

        this.remove(key, userId)
        return null
      }

      // Verifica expiração
      if (Date.now() > cacheData.expiresAt) {

        this.remove(key, userId)
        return null
      }

      return cacheData.data
    } catch (error) {

      return null
    }
  }

  /**
   * Remove item do cache
   */
  remove(key, userId) {
    try {
      const cacheKey = this.generateKey(key, userId)
      sessionStorage.removeItem(cacheKey)
      return true
    } catch (error) {

      return false
    }
  }

  /**
   * Limpa todo o cache do usuário
   */
  clearUserCache(userId) {
    try {
      const keys = Object.keys(sessionStorage)
      const userPrefix = `${this.prefix}${userId}_`
      
      keys.forEach(key => {
        if (key.startsWith(userPrefix)) {
          sessionStorage.removeItem(key)
        }
      })

      return true
    } catch (error) {

      return false
    }
  }

  /**
   * Limpa caches expirados
   */
  clearExpired() {
    try {
      const keys = Object.keys(sessionStorage)
      let cleared = 0
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          try {
            const cached = sessionStorage.getItem(key)
            const cacheData = JSON.parse(cached)
            
            if (Date.now() > cacheData.expiresAt) {
              sessionStorage.removeItem(key)
              cleared++
            }
          } catch (e) {
            // Se houver erro ao parsear, remove o item
            sessionStorage.removeItem(key)
            cleared++
          }
        }
      })
      
      return cleared
    } catch (error) {

      return 0
    }
  }

  /**
   * Limpa todo o cache da aplicação
   */
  clearAll() {
    try {
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key)
        }
      })

      return true
    } catch (error) {

      return false
    }
  }

  /**
   * Verifica se existe cache válido
   */
  has(key, userId) {
    return this.get(key, userId) !== null
  }

  /**
   * Obtém informações sobre o cache
   */
  getInfo() {
    try {
      const keys = Object.keys(sessionStorage)
      const cacheKeys = keys.filter(k => k.startsWith(this.prefix))
      
      const info = {
        total: cacheKeys.length,
        expired: 0,
        valid: 0,
        size: 0
      }

      cacheKeys.forEach(key => {
        try {
          const cached = sessionStorage.getItem(key)
          info.size += cached.length
          
          const cacheData = JSON.parse(cached)
          if (Date.now() > cacheData.expiresAt) {
            info.expired++
          } else {
            info.valid++
          }
        } catch (e) {
          info.expired++
        }
      })

      return info
    } catch (error) {

      return null
    }
  }
}

// Exporta instância única (Singleton)
export default new CacheService()
