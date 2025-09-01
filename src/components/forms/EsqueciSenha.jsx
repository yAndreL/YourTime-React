import { Link } from 'react-router-dom'

function EsqueciSenha() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Container Principal */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8 text-center">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/login" 
              className="text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Recuperar Senha</h1>
            <div className="w-12"></div> {/* Spacer para centralizar */}
          </div>

          {/* Ícone */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          </div>

          {/* Mensagem */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Esqueceu sua senha?
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Para recuperar sua senha, entre em contato com o administrador do sistema através do email:
            </p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-semibold">
                admin@yourtime.com
              </p>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">📋 Informações necessárias:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Seu nome completo</li>
              <li>• Email cadastrado no sistema</li>
              <li>• Motivo da solicitação</li>
            </ul>
          </div>

          {/* Botão Voltar */}
          <Link 
            to="/login"
            className="w-full py-3 px-6 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-lg text-center block"
          >
            Voltar ao Login
          </Link>

          {/* Informação adicional */}
          <div className="mt-6 text-xs text-gray-500">
            <p>Resposta em até 24 horas úteis</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EsqueciSenha
