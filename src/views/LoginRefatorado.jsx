// LoginRefatorado.jsx
// Exemplo de como o Login ficaria usando a nova estrutura

import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { MESSAGES } from '../constants/AppConstants'

function LoginRefatorado() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showError, setShowError] = useState('')
  
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setShowError('')
    
    const result = await login(email, senha)
    
    if (!result.success) {
      setShowError(result.message)
      if (result.suggestions) {
        alert(result.suggestions)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" 
         style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3))'}}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">YourTime</h1>
            <p className="text-gray-600">Acesse sua conta</p>
          </div>
          
          {/* Error Message */}
          {showError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {showError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email:
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite seu email"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha:
              </label>
              <input
                type="password"
                id="senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite sua senha"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            <Link 
              to="/esqueci-senha" 
              className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
            >
              Esqueci minha senha
            </Link>
            <div className="text-gray-600 text-sm">
              Não tem uma conta?{' '}
              <Link 
                to="/cadastro" 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginRefatorado
