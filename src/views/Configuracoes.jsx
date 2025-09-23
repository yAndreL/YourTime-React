import { Link } from 'react-router-dom'

function Configuracoes() {
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
            <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>
          </div>
          
          <div className="space-y-8">
            {/* Configurações de Notificação */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notificações</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Email de Relatórios</p>
                    <p className="text-sm text-gray-500">Receber relatórios semanais por email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Lembrete de Registro</p>
                    <p className="text-sm text-gray-500">Lembrar de registrar ponto ao final do dia</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Notificações Push</p>
                    <p className="text-sm text-gray-500">Receber notificações no navegador</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Configurações de Jornada */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Jornada de Trabalho</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Entrada Padrão
                  </label>
                  <input 
                    type="time" 
                    defaultValue="09:00"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Saída Padrão
                  </label>
                  <input 
                    type="time" 
                    defaultValue="18:00"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Semanais
                  </label>
                  <input 
                    type="number" 
                    defaultValue="40"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuso Horário
                  </label>
                  <select className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>Brasília (GMT-3)</option>
                    <option>São Paulo (GMT-3)</option>
                    <option>Manaus (GMT-4)</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Configurações de Relatórios */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Relatórios</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Exportação Padrão
                  </label>
                  <select className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>PDF</option>
                    <option>Excel (.xlsx)</option>
                    <option>CSV</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 mr-2" />
                  <label className="text-sm text-gray-900">
                    Incluir gráficos nos relatórios
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4">
              Salvar Configurações
            </button>
            <button className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded">
              Restaurar Padrões
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuracoes
