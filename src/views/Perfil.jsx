import { Link } from 'react-router-dom'

function Perfil() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center mb-6">
            <Link 
              to="/" 
              className="text-blue-600 hover:text-blue-800 mr-4"
            >
              ← Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Perfil do Usuário</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mr-4">
                  JS
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">José da Silva Lemos</h2>
                  <p className="text-gray-600">Desenvolvedor Frontend</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">jose.lemos@empresa.com</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <p className="text-gray-900">Desenvolvedor Frontend</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <p className="text-gray-900">Tecnologia da Informação</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Admissão</label>
                  <p className="text-gray-900">15 de janeiro de 2023</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas do Mês</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Horas Trabalhadas</p>
                  <p className="text-2xl font-bold text-blue-600">156h 30m</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Saldo de Horas</p>
                  <p className="text-2xl font-bold text-green-600">+12h 30m</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-purple-600">3</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4">
              Editar Perfil
            </button>
            <button className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded">
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Perfil
