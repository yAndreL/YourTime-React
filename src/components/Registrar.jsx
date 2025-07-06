import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from './Icons'

function Registrar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Dados simulados dos pontos registrados
  const pontos = {
    data: '07/03/2025',
    saldo: '+01:30',
    registros: {
      entradas: ['08:00', '13:10'],
      saidas: ['12:00', '20:00']
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center pl-0 md:pl-24">
      {/* Menu Toggle Button */}
      <button 
        className="fixed top-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-white hover:text-gray-800 border hover:border-gray-800 transition-all duration-300"
        onClick={toggleMenu}
      >
        ☰ Menu
      </button>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-40 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Menu</h2>
          <nav className="space-y-4">
            <Link to="/registrar" className="block text-blue-600 font-medium">
              Registrar
            </Link>
            <Link to="/historico" className="block text-gray-700 hover:text-blue-600 transition-colors">
              Histórico
            </Link>
            <Link to="/projeto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              Projeto
            </Link>
            <button 
              onClick={toggleMenu}
              className="block text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
            >
              Fechar Menu
            </button>
            <Link to="/login" className="block text-red-600 hover:text-red-700 transition-colors mt-8 pt-4 border-t">
              &lt; Sair
            </Link>
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMenu}
        ></div>
      )}

      {/* Container Principal */}
      <div className="w-full max-w-4xl mx-auto p-5 md:p-8 border border-gray-300 rounded-lg bg-white shadow-md">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap mb-2">
          <div className="back-button">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <ArrowIcon className="w-6 h-6" />
            </Link>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Dia: <span className="font-medium">{pontos.data}</span></p>
            <p className="text-green-600 font-bold">
              Saldo: {pontos.saldo}
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-2 border-0 border-t-2 border-dashed border-gray-600" />

        {/* Content - Registros de Ponto */}
        <div className="flex gap-2 justify-between items-center flex-wrap">
          {/* Coluna Entrada */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {pontos.registros.entradas.map((hora, index) => (
              <div key={index} className="bg-white py-2 px-4 rounded-xl text-center font-bold border border-black italic w-full md:w-24 text-base md:text-lg">
                <div className="text-sm">Entrada</div>
                <div>{hora}</div>
              </div>
            ))}
          </div>

          {/* Linha Central */}
          <div className="w-0.5 bg-gray-600 h-full self-stretch"></div>

          {/* Coluna Saída */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {pontos.registros.saidas.map((hora, index) => (
              <div key={index} className="bg-white py-2 px-4 rounded-xl text-center font-bold border border-black italic w-full md:w-24 text-base md:text-lg">
                <div className="text-sm">Saída</div>
                <div>{hora}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão Registrar Ponto */}
        <Link 
          to="/formulario-ponto"
          className="block mx-auto mt-5 py-4 px-7 bg-gray-800 text-white border-2 border-black rounded-xl text-base font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-center w-full md:w-2/5"
        >
          Registrar Ponto
        </Link>
      </div>
    </div>
  )
}

export default Registrar
