import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import { useModal } from '../hooks/useModal'
import { supabase } from '../config/supabase'
import { FiMail, FiLock, FiLoader } from 'react-icons/fi'

function Login() {
  const { modalState, showError, closeModal: closeNotificationModal } = useModal()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Tentar login com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      })

      if (error) {
        showError(
          'Email ou senha inválidos!\n\nVerifique suas credenciais e tente novamente.',
          'Erro de Autenticação'
        )
        setLoading(false)
        return
      }

      if (data?.user) {
        
        // Buscar o role e status do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single()
        
        if (profileError) {
          showError(
            'Erro ao carregar informações do usuário.',
            'Erro'
          )
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Verificar se o usuário está ativo
        if (profile && profile.is_active === false) {
          showError(
            'Sua conta foi desativada.\n\nEntre em contato com o administrador do sistema para mais informações.',
            'Acesso Negado'
          )
          // Fazer logout e redirecionar para acesso negado
          await supabase.auth.signOut()
          setLoading(false)
          navigate('/acesso-negado')
          return
        }
        
        if (profile) {
          sessionStorage.setItem('isAdmin', (profile.role === 'admin').toString())
        }
        
        // Redirecionar para o dashboard
        navigate('/')
      }
    } catch (error) {
      showError(
        'Ocorreu um erro ao tentar fazer login. Tente novamente.',
        'Erro'
      )
      setLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">YourTime</h1>
            <p className="text-gray-600">Sistema de Gestão de Tempo</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="senha"
                  name="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <Link 
              to="/esqueci-senha" 
              className="block text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Notificações */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeNotificationModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={modalState.onConfirm}
      />
    </div>
  )
}

export default Login
