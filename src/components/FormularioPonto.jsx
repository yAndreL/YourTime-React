import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowIcon } from './Icons'

function FormularioPonto() {
  const [formData, setFormData] = useState({
    data: '',
    observacao: '',
    entrada1: '',
    saida1: '',
    entrada2: '',
    saida2: ''
  })
  const [erro, setErro] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setErro('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.data || !formData.entrada1) {
      setErro('Data e pelo menos uma entrada são obrigatórias')
      return
    }

    // Simular salvamento
    console.log('Dados do ponto:', formData)
    alert('Ponto registrado com sucesso!')
    navigate('/registrar')
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
            <Link to="/registrar" className="block text-gray-700 hover:text-blue-600 transition-colors">
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
      <div className="w-full max-w-2xl mx-auto p-5 md:p-8 border border-gray-300 rounded-lg bg-white shadow-md">
        {/* Header */}          <div className="flex justify-between items-center mb-4">
            <Link 
              to="/registrar" 
              className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <ArrowIcon className="w-6 h-6" />
            </Link>
          <h1 className="text-2xl font-bold text-gray-800">Registrar Ponto</h1>
          <div className="w-12"></div> {/* Spacer para centralizar */}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Linha 1 - Data e Observação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                Data:
              </label>
              <input
                type="date"
                id="data"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
                Observação:
              </label>
              <input
                type="text"
                id="observacao"
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                placeholder="Observação (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Linha 2 - Entrada 1 e Saída 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entrada1" className="block text-sm font-medium text-gray-700 mb-1">
                Entrada 1:
              </label>
              <input
                type="time"
                id="entrada1"
                name="entrada1"
                value={formData.entrada1}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="saida1" className="block text-sm font-medium text-gray-700 mb-1">
                Saída 1:
              </label>
              <input
                type="time"
                id="saida1"
                name="saida1"
                value={formData.saida1}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Linha 3 - Entrada 2 e Saída 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entrada2" className="block text-sm font-medium text-gray-700 mb-1">
                Entrada 2:
              </label>
              <input
                type="time"
                id="entrada2"
                name="entrada2"
                value={formData.entrada2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="saida2" className="block text-sm font-medium text-gray-700 mb-1">
                Saída 2:
              </label>
              <input
                type="time"
                id="saida2"
                name="saida2"
                value={formData.saida2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Feedback de erro */}
          {erro && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md">
              {erro}
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              type="submit"
              className="px-8 py-3 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-center"
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/registrar')}
              className="px-8 py-3 bg-white text-gray-800 border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-gray-800 hover:text-white hover:scale-105 text-center"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioPonto
