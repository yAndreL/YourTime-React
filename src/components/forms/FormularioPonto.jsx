import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowIcon } from '../ui/Icons'
import { supabase } from '../../config/supabase.js'

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
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  const navigate = useNavigate()

  // Carregar usuário atual e data padrão
  useEffect(() => {
    carregarUsuarioAtual()
    definirDataPadrao()
  }, [])

  const carregarUsuarioAtual = async () => {
    try {
      // Pegar primeiro usuário disponível (para teste)
      const { data: usuarios, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .limit(1)
      
      if (error) throw error
      
      if (usuarios && usuarios.length > 0) {
        setUsuarioAtual(usuarios[0])
        console.log('👤 Usuário carregado:', usuarios[0])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuário:', error)
      setErro('Erro ao carregar dados do usuário')
    }
  }

  const definirDataPadrao = () => {
    const hoje = new Date().toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, data: hoje }))
  }

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
    setSucesso('')
  }

  // Validar horários
  const validarHorarios = () => {
    const { entrada1, saida1, entrada2, saida2 } = formData
    
    // Entrada 1 é obrigatória
    if (!entrada1) {
      setErro('Entrada 1 é obrigatória')
      return false
    }

    // Se tem saída 1, deve ser depois da entrada 1
    if (saida1 && entrada1 >= saida1) {
      setErro('Saída 1 deve ser depois da Entrada 1')
      return false
    }

    // Se tem entrada 2, deve ser depois da saída 1
    if (entrada2 && saida1 && entrada2 <= saida1) {
      setErro('Entrada 2 deve ser depois da Saída 1')
      return false
    }

    // Se tem saída 2, deve ser depois da entrada 2
    if (saida2 && entrada2 && saida2 <= entrada2) {
      setErro('Saída 2 deve ser depois da Entrada 2')
      return false
    }

    return true
  }

  // Calcular pausa do almoço
  const calcularPausaAlmoco = () => {
    const { entrada1, saida1, entrada2 } = formData
    
    if (!saida1 || !entrada2) return 0
    
    const saida1Time = new Date(`2000-01-01T${saida1}`)
    const entrada2Time = new Date(`2000-01-01T${entrada2}`)
    
    const diffMs = entrada2Time - saida1Time
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    return diffMinutes
  }

  // Calcular pausas extras
  const calcularPausasExtras = () => {
    // Implementar lógica para pausas extras se necessário
    return 0
  }

  // ✅ CORREÇÃO: Mover função para dentro do componente
  const calcularTotalTrabalhado = () => {
    const { entrada1, saida1, entrada2, saida2 } = formData
    
    let totalMinutos = 0
    
    // Calcular primeira jornada (entrada1 -> saida1)
    if (entrada1 && saida1) {
      const entrada1Time = new Date(`2000-01-01T${entrada1}`)
      const saida1Time = new Date(`2000-01-01T${saida1}`)
      const diff1 = saida1Time - entrada1Time
      totalMinutos += Math.floor(diff1 / (1000 * 60))
    }
    
    // Calcular segunda jornada (entrada2 -> saida2)
    if (entrada2 && saida2) {
      const entrada2Time = new Date(`2000-01-01T${entrada2}`)
      const saida2Time = new Date(`2000-01-01T${saida2}`)
      const diff2 = saida2Time - entrada2Time
      totalMinutos += Math.floor(diff2 / (1000 * 60))
    }
    
    // Converter minutos para horas e minutos
    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60
    
    if (horas === 0) {
      return `${minutos}min`
    } else if (minutos === 0) {
      return `${horas}h`
    } else {
      return `${horas}h${minutos}min`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validarHorarios()) return
    
    if (!usuarioAtual) {
      setErro('Usuário não identificado. Faça login novamente.')
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')

    try {
      console.log('📝 Salvando ponto...')
      
      // ✅ PRIMEIRO: Verificar se já existe registro para esta data
      const { data: registrosExistentes, error: errVerificacao } = await supabase
        .from('agendamento')
        .select('id, entrada1, saida1')
        .eq('user_id', usuarioAtual.id)
        .eq('data', formData.data)
      
      if (errVerificacao) throw errVerificacao
      
      if (registrosExistentes && registrosExistentes.length > 0) {
        setErro(`Já existe um registro para ${formData.data}. Use a data de amanhã ou edite o registro existente.`)
        setLoading(false)
        return
      }
      
      // ✅ SEGUNDO: Salvar novo registro
      const pontoData = {
        user_id: usuarioAtual.id,
        data: formData.data,
        entrada1: formData.entrada1,
        saida1: formData.saida1 || null,
        entrada2: formData.entrada2 || null,
        saida2: formData.saida2 || null,
        observacao: formData.observacao || null,
        pausa_almoco: calcularPausaAlmoco(),
        pausas_extras: calcularPausasExtras(),
        status: 'pending'
      }

      console.log('📊 Dados do ponto:', pontoData)

      const { data, error } = await supabase
        .from('agendamento')
        .insert([pontoData])
        .select()

      if (error) {
        throw error
      }

      console.log('✅ Ponto registrado com sucesso:', data[0])
      setSucesso('Ponto registrado com sucesso!')
      
      // Limpar formulário
      setTimeout(() => {
        navigate('/registrar')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Erro ao registrar ponto:', error)
      setErro(`Erro ao registrar ponto: ${error.message}`)
    } finally {
      setLoading(false)
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
            <Link to="/" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🏠 Início
            </Link>
            <Link to="/formulario-ponto" className="block text-blue-600 font-medium">
              📝 Registrar Ponto
            </Link>
            <Link to="/painel-admin" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🏢 Painel Admin
            </Link>
            <Link to="/historico" className="block text-gray-700 hover:text-blue-600 transition-colors">
              📊 Histórico
            </Link>
            <Link to="/projeto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🎯 Projeto
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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link 
            to="/registrar" 
            className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
          >
            <ArrowIcon className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">Registrar Ponto</h1>
            {usuarioAtual && (
              <p className="text-sm text-gray-600">Usuário: {usuarioAtual.nome}</p>
            )}
          </div>
          <div className="w-12"></div> {/* Spacer para centralizar */}
        </div>

        {/* Status do Usuário */}
        {!usuarioAtual && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
            ⚠️ Carregando dados do usuário...
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Linha 1 - Data e Observação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                Data: *
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
                Entrada 1: *
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

          {/* Resumo do Ponto */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2"> Resumo do Ponto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Pausa Almoço:</span>
                <span className="ml-2 text-blue-600">
                  {calcularPausaAlmoco()} min
                </span>
              </div>
              <div>
                <span className="font-medium">Total Trabalhado:</span>
                <span className="ml-2 text-blue-600">
                  {calcularTotalTrabalhado()}
                </span>
              </div>
            </div>
            
            {/* Detalhes das jornadas */}
            <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Jornada 1:</span>
                  <span className="ml-2">
                    {formData.entrada1 && formData.saida1 
                      ? `${formData.entrada1} - ${formData.saida1}` 
                      : 'Não definida'
                    }
                  </span>
                </div>
                <div>
                  <span className="font-medium">Jornada 2:</span>
                  <span className="ml-2">
                    {formData.entrada2 && formData.saida2 
                      ? `${formData.entrada2} - ${formData.saida2}` 
                      : 'Não definida'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback de erro/sucesso */}
          {erro && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md">
              ❌ {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-md">
              ✅ {sucesso}
            </div>
          )}

          {/* Botões - ORDEM INVERTIDA */}
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              type="submit"
              disabled={loading || !usuarioAtual}
              className="px-8 py-3 bg-gray-800 text-white border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-white hover:text-gray-800 hover:scale-105 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Salvando...' : '📝 Registrar Ponto'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/registrar')}
              className="px-8 py-3 bg-white text-gray-800 border-2 border-black rounded-xl font-bold italic cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:bg-gray-800 hover:text-white hover:scale-105 text-center"
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioPonto
