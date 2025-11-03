import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { FiMail, FiLoader, FiCheckCircle, FiArrowLeft } from 'react-icons/fi'

function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      // Verificar se o email existe no banco de dados
      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()

      if (searchError || !profiles) {
        setErro('Email não encontrado. Verifique e tente novamente.')
        setLoading(false)
        return
      }

      // Email existe, enviar link de recuperação
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetar-senha`
      })

      if (resetError) {
        setErro('Erro ao enviar email. Tente novamente mais tarde.')
        setLoading(false)
        return
      }

      // Sucesso
      setEmailEnviado(true)
    } catch (error) {
      setErro('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (emailEnviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
            {/* Ícone de Sucesso */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Enviado!</h1>
              <p className="text-gray-600 text-sm">
                Verifique sua caixa de entrada e spam
              </p>
            </div>

            {/* Mensagem */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                Enviamos um link de recuperação de senha para:
              </p>
              <p className="text-sm font-semibold text-blue-700 mt-2">
                {email}
              </p>
              <p className="text-sm text-gray-600 mt-3">
                Clique no link recebido para criar uma nova senha. O link expira em 1 hora.
              </p>
            </div>

            {/* Botão Voltar */}
            <Link
              to="/login"
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FiArrowLeft className="w-5 h-5" />
              Voltar para o Login
            </Link>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Senha</h1>
            <p className="text-gray-600 text-sm">
              Informe seu email para enviarmos um link de recuperação de senha
            </p>
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
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErro('') // Limpar erro ao digitar
                  }}
                  disabled={loading}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    erro ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com"
                  required
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
                  Enviando...
                </>
              ) : (
                'Enviar Email'
              )}
            </button>
          </form>

          {/* Link voltar */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <FiArrowLeft className="w-4 h-4" />
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EsqueciSenha
