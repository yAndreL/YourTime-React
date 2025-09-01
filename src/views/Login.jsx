import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Credenciais válidas para teste
    const validCredentials = [
      { email: 'admin@yourtime.com', senha: '123456' },
      { email: 'jose@empresa.com', senha: 'senha123' },
      { email: 'teste@teste.com', senha: '123456' }
    ]
    
    // Verificar se as credenciais são válidas
    const isValid = validCredentials.some(
      cred => cred.email === email && cred.senha === senha
    )
    
    if (isValid) {
      // Login bem-sucedido
      console.log('Login realizado com sucesso!')
      navigate('/')
    } else {
      // Credenciais inválidas
      alert('Email ou senha inválidos!\n\nCredenciais de teste:\n• admin@yourtime.com / 123456\n• jose@empresa.com / senha123\n• teste@teste.com / 123456')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3))'}}>
      <div className="w-full max-w-md">
        {/* Container Principal */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">YourTime</h1>
            <p className="text-gray-600">Acesse sua conta</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email:
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                placeholder="Digite seu email"
                required
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha:
              </label>
              <input
                type="password"
                id="senha"
                name="senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-lg"
            >
              Entrar
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 space-y-4 text-center">
            <Link 
              to="/cadastro" 
              className="block text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              Não tem uma conta? Cadastre-se aqui
            </Link>
            <Link 
              to="/esqueci-senha" 
              className="block text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              Esqueceu sua senha?
            </Link>
          </div>

          {/* Credenciais de Teste */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🔐 Credenciais para Teste:</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>admin@yourtime.com</strong> / 123456</div>
              <div><strong>jose@empresa.com</strong> / senha123</div>
              <div><strong>teste@teste.com</strong> / 123456</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
