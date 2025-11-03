import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

function AcessoNegado() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Imagem Ilustrativa */}
          <div className="mb-8 flex justify-center">
            <svg
              className="w-64 h-64"
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Computador */}
              <rect x="150" y="180" width="200" height="140" rx="8" fill="#3B82F6" />
              <rect x="160" y="190" width="180" height="100" fill="#1E40AF" />
              
              {/* Sinal de Proibido */}
              <circle cx="250" cy="240" r="40" fill="#EF4444" />
              <rect x="220" y="235" width="60" height="10" fill="white" transform="rotate(0 250 240)" />
              
              {/* Base do Monitor */}
              <rect x="230" y="320" width="40" height="10" rx="2" fill="#3B82F6" />
              <rect x="210" y="330" width="80" height="15" rx="4" fill="#3B82F6" />
              
              {/* Pessoa com capacete */}
              <circle cx="380" cy="280" r="25" fill="#F59E0B" />
              <rect x="355" y="305" width="50" height="60" rx="8" fill="#EC4899" />
              <rect x="345" y="320" width="20" height="45" rx="4" fill="#EC4899" />
              <rect x="385" y="320" width="20" height="45" rx="4" fill="#EC4899" />
              
              {/* Cones de Trânsito */}
              <path d="M100 370 L120 340 L80 340 Z" fill="#F59E0B" />
              <rect x="95" y="370" width="10" height="5" fill="#374151" />
              
              <path d="M420 370 L440 340 L400 340 Z" fill="#F59E0B" />
              <rect x="415" y="370" width="10" height="5" fill="#374151" />
              
              {/* Faixas de Isolamento */}
              <rect x="50" y="390" width="400" height="4" fill="#F59E0B" opacity="0.5" />
              <rect x="50" y="410" width="400" height="4" fill="#F59E0B" opacity="0.5" />
            </svg>
          </div>

          {/* Título */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Acesso Negado
          </h1>

          {/* Mensagem */}
          <p className="text-lg text-gray-600 mb-8">
            Você não tem permissão para acessar esta área.
          </p>

          {/* Botão Voltar */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
            >
              <FiArrowLeft className="w-5 h-5" />
              Voltar
            </button>
          </div>

          {/* Informação de Contato */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Precisa de ajuda? Entre em contato com{' '}
              <a href="mailto:admin@yourtime.com" className="text-blue-600 hover:text-blue-700 font-medium">
                admin@yourtime.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AcessoNegado
