import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { FiLock, FiLoader, FiCheckCircle } from 'react-icons/fi'

function ResetarSenha() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar se há uma sessão de recuperação ativa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Se não há sessão, redirecionar para login
        navigate('/login')
      }
    }

    checkSession()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    // Validações
    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      setLoading(false)
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      setLoading(false)
      return
    }

    try {
      // Atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      })

      if (error) {
        setErro('Erro ao atualizar senha. Tente novamente.')
        setLoading(false)
        return
      }

      // Sucesso
      setSucesso(true)
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      setErro('Ocorreu um erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
            {/* Ícone de Sucesso */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Senha Alterada!</h1>
              <p className="text-gray-600 text-sm">
                Sua senha foi atualizada com sucesso
              </p>
            </div>

            {/* Mensagem */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 text-center">
                Redirecionando para o login em instantes...
              </p>
            </div>

            {/* Loading */}
            <div className="flex justify-center">
              <FiLoader className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Container Principal */}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          {/* Header com gradiente */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              YT
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova Senha</h1>
            <p className="text-gray-600 text-sm">
              Digite sua nova senha
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="novaSenha" className="block text-sm font-semibold text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="novaSenha"
                  name="novaSenha"
                  value={novaSenha}
                  onChange={(e) => {
                    setNovaSenha(e.target.value)
                    setErro('')
                  }}
                  disabled={loading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    erro ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirmarSenha"
                  name="confirmarSenha"
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value)
                    setErro('')
                  }}
                  disabled={loading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    erro ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {erro && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>❌</span> {erro}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetarSenha
