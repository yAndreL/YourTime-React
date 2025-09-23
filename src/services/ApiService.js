// ApiService.js
// Service para comunicação com APIs

class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api'
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  /**
   * Realiza requisição HTTP
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções da requisição
   * @returns {Promise} - Promise com resposta
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: this.headers,
      ...options
    }

    // Adicionar token de autenticação se existir
    const token = this.getAuthToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    try {
      console.log(`📡 API Request: ${config.method || 'GET'} ${url}`)
      console.log('Request config:', config)

      const response = await fetch(url, config)
      
      console.log(`📊 API Response: ${response.status} ${response.statusText}`)

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      let data = null

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error: ${response.status}`)
      }

      return {
        success: true,
        data,
        status: response.status
      }

    } catch (error) {
      console.error('❌ API Error:', error)
      
      return {
        success: false,
        error: error.message,
        status: error.status || 500
      }
    }
  }

  /**
   * Requisição GET
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros da query
   * @returns {Promise} - Promise com resposta
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    
    return this.request(url, {
      method: 'GET'
    })
  }

  /**
   * Requisição POST
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a serem enviados
   * @returns {Promise} - Promise com resposta
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Requisição PUT
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a serem enviados
   * @returns {Promise} - Promise com resposta
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Requisição DELETE
   * @param {string} endpoint - Endpoint da API
   * @returns {Promise} - Promise com resposta
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    })
  }


  /**
   * Obtém token de autenticação
   * @returns {string|null} - Token ou null
   */
  getAuthToken() {
    return localStorage.getItem('authToken')
  }

  /**
   * Define token de autenticação
   * @param {string} token - Token de autenticação
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('authToken', token)
      this.headers['Authorization'] = `Bearer ${token}`
    } else {
      localStorage.removeItem('authToken')
      delete this.headers['Authorization']
    }
  }

  /**
   * Remove token de autenticação
   */
  clearAuthToken() {
    this.setAuthToken(null)
  }

  /**
   * Diagnóstico do servidor
   * @returns {Promise} - Promise com informações de diagnóstico
   */
  async getDiagnostics() {
    return this.get('/diagnostico', { action: 'check-server' })
  }

  /**
   * Configura URL base da API
   * @param {string} baseURL - Nova URL base
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL
  }

  /**
   * Obtém URL base atual
   * @returns {string} - URL base
   */
  getBaseURL() {
    return this.baseURL
  }
}

// Instância singleton
const apiService = new ApiService()

export default apiService
