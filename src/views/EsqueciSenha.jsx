import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { FiMail, FiLoader, FiArrowLeft } from 'react-icons/fi'
import { enviarCodigoRecuperacao } from '../services/EmailService'

function EsqueciSenha() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Gerar código de 6 dígitos
  const gerarCodigo = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      const emailFormatado = email.trim().toLowerCase()
      const codigo = gerarCodigo()

      // Enviar email com o código
      await enviarCodigoRecuperacao(emailFormatado, codigo)

      // Redirecionar para tela de verificação de código
      navigate('/verificar-codigo', { 
        state: { 
          email: emailFormatado,
          codigo,
          superiorEmpresaId: null
        } 
      })
    } catch (error) {
      console.error('Erro ao enviar email:', error)
      setErro('Erro ao enviar email. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Recuperar Senha</h1>
            <p className="text-gray-600 text-sm">
              Informe seu email para enviarmos um código de verificação
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
                    setErro('')
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
                  {erro}
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
                'Enviar Código'
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
