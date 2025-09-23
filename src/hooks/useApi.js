// useApi.js
// Custom hook para gerenciamento de chamadas de API

import { useState, useCallback } from 'react'
import apiService from '../services/ApiService.js'

const useApi = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Função genérica para chamadas de API
  const request = useCallback(async (apiCall) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await apiCall()
      
      if (result.success) {
        setData(result.data)
        return result
      } else {
        setError(result.error || 'Erro na requisição')
        return result
      }
    } catch (err) {
      const errorMessage = err.message || 'Erro inesperado'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // GET request
  const get = useCallback(async (endpoint, params = {}) => {
    return request(() => apiService.get(endpoint, params))
  }, [request])

  // POST request
  const post = useCallback(async (endpoint, data = {}) => {
    return request(() => apiService.post(endpoint, data))
  }, [request])

  // PUT request
  const put = useCallback(async (endpoint, data = {}) => {
    return request(() => apiService.put(endpoint, data))
  }, [request])

  // DELETE request
  const del = useCallback(async (endpoint) => {
    return request(() => apiService.delete(endpoint))
  }, [request])


  // Diagnóstico
  const getDiagnostics = useCallback(async () => {
    return request(() => apiService.getDiagnostics())
  }, [request])

  // Limpar dados
  const clearData = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    data,
    get,
    post,
    put,
    delete: del,
    getDiagnostics,
    clearData,
    clearError
  }
}

export default useApi
