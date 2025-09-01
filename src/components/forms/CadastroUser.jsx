import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowIcon } from '../ui/Icons'

function CadastroUser() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  })
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpar erro quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória'
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres'
    }

    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'Senhas não conferem'
    }

    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length === 0) {
      // Simular cadastro bem-sucedido
      console.log('Dados do cadastro:', formData)
      alert('Cadastro realizado com sucesso!')
      navigate('/login')
    } else {
      setErrors(newErrors)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Container Principal */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/login" 
              className="text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Cadastro</h1>
            <div className="w-12"></div> {/* Spacer para centralizar */}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo:
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${
                  errors.nome ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Digite seu nome completo"
              />
              {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email:
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Digite seu email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha:
              </label>
              <input
                type="password"
                id="senha"
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${
                  errors.senha ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Digite sua senha (min. 6 caracteres)"
              />
              {errors.senha && <p className="mt-1 text-sm text-red-600">{errors.senha}</p>}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha:
              </label>
              <input
                type="password"
                id="confirmarSenha"
                name="confirmarSenha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${
                  errors.confirmarSenha ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Confirme sua senha"
              />
              {errors.confirmarSenha && <p className="mt-1 text-sm text-red-600">{errors.confirmarSenha}</p>}
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                className="w-full py-3 px-6 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-lg"
              >
                Cadastrar
              </button>
              
              <Link 
                to="/login"
                className="w-full py-3 px-6 bg-white text-gray-800 border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-gray-800 hover:text-white hover:scale-105 text-lg text-center block"
              >
                Voltar ao Login
              </Link>
            </div>
          </form>

          {/* Informações de Segurança */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-800 mb-2">🔒 Suas informações estão seguras</h3>
            <p className="text-xs text-green-700">
              Utilizamos criptografia para proteger seus dados pessoais e garantir a segurança de suas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CadastroUser
