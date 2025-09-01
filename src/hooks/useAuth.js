// useAuth.js
// Custom hook para gerenciamento de autenticação

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthController from '../controllers/AuthController.js'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Verificar autenticação ao carregar o hook
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthController.isAuthenticated()
      const currentUser = AuthController.getCurrentUser()
      
      setIsAuthenticated(authenticated)
      setUser(currentUser)
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  // Função de login
  const login = useCallback(async (email, senha) => {
    setIsLoading(true)
    
    try {
      const result = await AuthController.login(email, senha, navigate)
      
      if (result.success) {
        setIsAuthenticated(true)
        setUser(result.user)
      }
      
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return {
        success: false,
        message: 'Erro durante o login',
        error: error.message
      }
    }
  }, [navigate])

  // Função de logout
  const logout = useCallback(() => {
    AuthController.logout(navigate)
    setIsAuthenticated(false)
    setUser(null)
  }, [navigate])

  // Verificar se o usuário tem uma role específica
  const hasRole = useCallback((role) => {
    return user?.role === role
  }, [user])

  // Verificar se é admin
  const isAdmin = useCallback(() => {
    return hasRole('admin')
  }, [hasRole])

  // Verificar se é manager
  const isManager = useCallback(() => {
    return hasRole('manager')
  }, [hasRole])

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    isAdmin,
    isManager
  }
}

export default useAuth
