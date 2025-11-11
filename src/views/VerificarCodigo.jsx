import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { FiArrowLeft, FiLoader, FiMail, FiAlertCircle } from 'react-icons/fi'
import { enviarCodigoRecuperacao } from '../services/EmailService'

function VerificarCodigo() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const codigoEnviado = location.state?.codigo
  
  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [mostrarReenvio, setMostrarReenvio] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    // Redirecionar se não houver email ou código
    if (!email || !codigoEnviado) {
      navigate('/esqueci-senha')
    }

    // Timer para mostrar opção de reenvio após 20 segundos
    const timer = setTimeout(() => {
      setMostrarReenvio(true)
    }, 20000)

    return () => clearTimeout(timer)
  }, [email, codigoEnviado, navigate])

  const handleChange = (index, value) => {
    // Apenas números
    if (!/^\d*$/.test(value)) return

    const newCodigo = [...codigo]
    newCodigo[index] = value

    setCodigo(newCodigo)
    setErro('')

    // Auto-focus próximo input
    if (value && index < 5) {
      inputRefs[index + 1].current.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Backspace - voltar para input anterior
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs[index - 1].current.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newCodigo = pastedData.split('')
      setCodigo(newCodigo)
      inputRefs[5].current.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const codigoDigitado = codigo.join('')

    if (codigoDigitado.length !== 6) {
      setErro('Por favor, preencha todos os 6 dígitos')
      setLoading(false)
      return
    }

    // Verificar se o código está correto
    if (codigoDigitado === codigoEnviado) {
      // Código correto, redirecionar para resetar senha
      navigate('/resetar-senha', { 
        state: { 
          email,
          codigoVerificado: true 
        } 
      })
    } else {
      setErro('Código inválido. Verifique e tente novamente.')
      setCodigo(['', '', '', '', '', ''])
      inputRefs[0].current.focus()
    }

    setLoading(false)
  }

  const handleReenviarCodigo = async () => {
    setReenviando(true)
    setMensagemSucesso('')
    setErro('')

    try {
      // Gerar novo código
      const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Enviar email
      await enviarCodigoRecuperacao(email, novoCodigo)
      
      // Atualizar código no state
      navigate('/verificar-codigo', { 
        state: { 
          email,
          codigo: novoCodigo
        },
        replace: true
      })
      
      setMensagemSucesso('Novo código enviado com sucesso!')
      setMostrarReenvio(false)
      
      // Resetar timer
      setTimeout(() => {
        setMostrarReenvio(true)
        setMensagemSucesso('')
      }, 20000)
    } catch (error) {
      setErro('Erro ao reenviar código. Tente novamente.')
    } finally {
      setReenviando(false)
    }
  }

  if (!email || !codigoEnviado) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificar Código</h1>
            <p className="text-gray-600 text-sm">
              Digite o código de 6 dígitos enviado para
            </p>
            <p className="text-blue-600 font-semibold text-sm mt-1">{email}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inputs do código */}
            <div>
              <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
                {codigo.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      erro ? 'border-red-500' : 'border-gray-300'
                    }`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              {erro && (
                <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-4 h-4" /> {erro}
                </p>
              )}

              {mensagemSucesso && (
                <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                  <FiMail className="w-4 h-4" /> {mensagemSucesso}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || codigo.some(d => !d)}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </button>
          </form>

          {/* Mensagem de reenvio */}
          {mostrarReenvio && (
            <div className="mt-6 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700">
                  Não recebeu o código? Confira sua caixa de spam ou{' '}
                  <button
                    onClick={handleReenviarCodigo}
                    disabled={reenviando}
                    className="text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {reenviando ? (
                      <>
                        <FiLoader className="w-3 h-3 animate-spin" />
                        reenviando...
                      </>
                    ) : (
                      'reenvie o código'
                    )}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Link voltar */}
          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="text-gray-600 hover:text-gray-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
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

export default VerificarCodigo
