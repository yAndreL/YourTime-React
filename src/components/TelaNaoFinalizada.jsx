import { Link } from 'react-router-dom'

function TelaNaoFinalizada() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Container Principal */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8 text-center">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/" 
              className="text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              ←
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Em Desenvolvimento</h1>
            <div className="w-12"></div> {/* Spacer para centralizar */}
          </div>

          {/* Ícone */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🚧</span>
            </div>
          </div>

          {/* Mensagem */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Ops! Tela em Desenvolvimento
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Esta funcionalidade ainda está sendo desenvolvida. Nossa equipe está trabalhando para disponibilizá-la em breve.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Para sugestões ou dúvidas, entre em contato conosco:
            </p>
          </div>

          {/* Contato */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📧 Contato</h3>
            <p className="text-blue-700">
              <strong>Email:</strong> suporte@yourtime.com
            </p>
            <p className="text-blue-700">
              <strong>WhatsApp:</strong> (11) 99999-9999
            </p>
          </div>

          {/* Status */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-800 mb-2">⏳ Status do Desenvolvimento</h3>
            <div className="w-full bg-orange-200 rounded-full h-2 mb-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{width: '65%'}}></div>
            </div>
            <p className="text-orange-700 text-sm">65% concluído</p>
          </div>

          {/* Botão Voltar */}
          <Link 
            to="/"
            className="w-full py-3 px-6 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-lg text-center block"
          >
            Voltar ao Início
          </Link>

          {/* Informação adicional */}
          <div className="mt-6 text-xs text-gray-500">
            <p>Previsão de lançamento: Próximas semanas</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TelaNaoFinalizada
