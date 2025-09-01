import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from '../components/ui/Icons'
import { supabase } from '../config/supabase.js'

function GerenciamentoProjetos() {
  const [projetos, setProjetos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [filters, setFilters] = useState({
    status: 'todos',
    prioridade: 'todas',
    cliente: '',
    responsavel: ''
  })
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cliente: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    prioridade: 'media',
    orcamento: '',
    horas_estimadas: '',
    cor: '#3B82F6',
    responsavel_id: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      await Promise.all([
        carregarProjetos(),
        carregarFuncionarios()
      ])
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          *,
          responsavel:profiles(id, nome, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjetos(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar projetos:', error)
    }
  }

  const carregarFuncionarios = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setFuncionarios(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar funcionários:', error)
    }
  }

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const openModal = (projeto = null) => {
    if (projeto) {
      setEditingProject(projeto)
      setFormData({
        nome: projeto.nome || '',
        descricao: projeto.descricao || '',
        cliente: projeto.cliente || '',
        data_inicio: projeto.data_inicio || '',
        data_fim: projeto.data_fim || '',
        status: projeto.status || 'ativo',
        prioridade: projeto.prioridade || 'media',
        orcamento: projeto.orcamento || '',
        horas_estimadas: projeto.horas_estimadas || '',
        cor: projeto.cor || '#3B82F6',
        responsavel_id: projeto.responsavel_id || ''
      })
    } else {
      setEditingProject(null)
      setFormData({
        nome: '',
        descricao: '',
        cliente: '',
        data_inicio: '',
        data_fim: '',
        status: 'ativo',
        prioridade: 'media',
        orcamento: '',
        horas_estimadas: '',
        cor: '#3B82F6',
        responsavel_id: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      const projectData = {
        ...formData,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        horas_estimadas: formData.horas_estimadas ? parseInt(formData.horas_estimadas) : null,
        responsavel_id: formData.responsavel_id || null,
        updated_at: new Date().toISOString()
      }

      let result
      if (editingProject) {
        // Atualizar projeto existente
        result = await supabase
          .from('projetos')
          .update(projectData)
          .eq('id', editingProject.id)
          .select()
      } else {
        // Criar novo projeto
        result = await supabase
          .from('projetos')
          .insert([projectData])
          .select()
      }

      if (result.error) throw result.error

      await carregarProjetos()
      closeModal()
    } catch (error) {
      console.error('❌ Erro ao salvar projeto:', error)
      alert('Erro ao salvar projeto: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projetoId) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', projetoId)

      if (error) throw error

      await carregarProjetos()
    } catch (error) {
      console.error('❌ Erro ao excluir projeto:', error)
      alert('Erro ao excluir projeto: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800 border-green-200'
      case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'concluido': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'ativo': return '🟢 Ativo'
      case 'pausado': return '🟡 Pausado'
      case 'concluido': return '🔵 Concluído'
      case 'cancelado': return '🔴 Cancelado'
      default: return '❓ Indefinido'
    }
  }

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-100 text-gray-700'
      case 'media': return 'bg-blue-100 text-blue-700'
      case 'alta': return 'bg-orange-100 text-orange-700'
      case 'urgente': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPrioridadeText = (prioridade) => {
    switch (prioridade) {
      case 'baixa': return '🔹 Baixa'
      case 'media': return '🔸 Média'
      case 'alta': return '🔶 Alta'
      case 'urgente': return '🔺 Urgente'
      default: return '❓ Indefinida'
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const projetosFiltrados = projetos.filter(projeto => {
    const matchStatus = filters.status === 'todos' || projeto.status === filters.status
    const matchPrioridade = filters.prioridade === 'todas' || projeto.prioridade === filters.prioridade
    const matchCliente = !filters.cliente || projeto.cliente?.toLowerCase().includes(filters.cliente.toLowerCase())
    const matchResponsavel = !filters.responsavel || projeto.responsavel_id === filters.responsavel

    return matchStatus && matchPrioridade && matchCliente && matchResponsavel
  })

  const estatisticas = {
    total: projetos.length,
    ativos: projetos.filter(p => p.status === 'ativo').length,
    concluidos: projetos.filter(p => p.status === 'concluido').length,
    pausados: projetos.filter(p => p.status === 'pausado').length,
    cancelados: projetos.filter(p => p.status === 'cancelado').length
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pl-0 md:pl-24">
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
            <Link to="/formulario-ponto" className="block text-gray-700 hover:text-blue-600 transition-colors">
              📝 Registrar Ponto
            </Link>
            <Link to="/painel-admin" className="block text-gray-700 hover:text-blue-600 transition-colors">
              🏢 Painel Admin
            </Link>
            <Link to="/historico" className="block text-gray-700 hover:text-blue-600 transition-colors">
              📊 Histórico
            </Link>
            <Link to="/projeto" className="block text-blue-600 font-medium">
              🎯 Projetos
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
      <div className="w-full max-w-7xl mx-auto p-5 md:p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <Link 
              to="/"
              className="flex items-center space-x-2 text-2xl no-underline py-2 px-3 rounded-md bg-transparent hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <ArrowIcon className="w-6 h-6" />
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">🎯 Gerenciamento de Projetos</h1>
              <p className="text-lg text-gray-600">Controle e organize seus projetos</p>
            </div>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Novo Projeto
            </button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
              <div className="text-sm text-blue-700">📋 Total</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
              <div className="text-sm text-green-700">🟢 Ativos</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{estatisticas.concluidos}</div>
              <div className="text-sm text-blue-700">🔵 Concluídos</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.pausados}</div>
              <div className="text-sm text-yellow-700">🟡 Pausados</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{estatisticas.cancelados}</div>
              <div className="text-sm text-red-700">🔴 Cancelados</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">🟢 Ativo</option>
                <option value="pausado">🟡 Pausado</option>
                <option value="concluido">🔵 Concluído</option>
                <option value="cancelado">🔴 Cancelado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade:</label>
              <select
                name="prioridade"
                value={filters.prioridade}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas as Prioridades</option>
                <option value="baixa">🔹 Baixa</option>
                <option value="media">🔸 Média</option>
                <option value="alta">🔶 Alta</option>
                <option value="urgente">🔺 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
              <input
                type="text"
                name="cliente"
                value={filters.cliente}
                onChange={handleFilterChange}
                placeholder="Filtrar por cliente..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável:</label>
              <select
                name="responsavel"
                value={filters.responsavel}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Responsáveis</option>
                {funcionarios.map(func => (
                  <option key={func.id} value={func.id}>{func.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Projetos */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando projetos...</p>
            </div>
          ) : projetosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-300 p-8 text-center">
              <p className="text-gray-500 text-lg">📭 Nenhum projeto encontrado</p>
              <p className="text-gray-400 text-sm mt-2">Crie um novo projeto ou ajuste os filtros</p>
            </div>
          ) : (
            projetosFiltrados.map(projeto => (
              <div key={projeto.id} className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: projeto.cor }}
                      ></div>
                      <h3 className="text-xl font-bold text-gray-800">{projeto.nome}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(projeto.status)}`}>
                        {getStatusText(projeto.status)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(projeto.prioridade)}`}>
                        {getPrioridadeText(projeto.prioridade)}
                      </span>
                    </div>
                    
                    {projeto.descricao && (
                      <p className="text-gray-600 mb-3">{projeto.descricao}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Cliente:</span>
                        <p className="text-gray-600">{projeto.cliente || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Responsável:</span>
                        <p className="text-gray-600">{projeto.responsavel?.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Período:</span>
                        <p className="text-gray-600">
                          {formatDate(projeto.data_inicio)} - {formatDate(projeto.data_fim)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Orçamento:</span>
                        <p className="text-gray-600">{formatCurrency(projeto.orcamento)}</p>
                      </div>
                    </div>

                    {projeto.horas_estimadas && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">Progresso das Horas:</span>
                          <span className="text-gray-600">
                            {projeto.horas_trabalhadas || 0} / {projeto.horas_estimadas}h
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${Math.min(((projeto.horas_trabalhadas || 0) / projeto.horas_estimadas) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openModal(projeto)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(projeto.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingProject ? '✏️ Editar Projeto' : '➕ Novo Projeto'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Projeto: *
                      </label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente:
                      </label>
                      <input
                        type="text"
                        name="cliente"
                        value={formData.cliente}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição:
                    </label>
                    <textarea
                      name="descricao"
                      value={formData.descricao}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Início:
                      </label>
                      <input
                        type="date"
                        name="data_inicio"
                        value={formData.data_inicio}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Fim:
                      </label>
                      <input
                        type="date"
                        name="data_fim"
                        value={formData.data_fim}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status:
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ativo">🟢 Ativo</option>
                        <option value="pausado">🟡 Pausado</option>
                        <option value="concluido">🔵 Concluído</option>
                        <option value="cancelado">🔴 Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridade:
                      </label>
                      <select
                        name="prioridade"
                        value={formData.prioridade}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="baixa">🔹 Baixa</option>
                        <option value="media">🔸 Média</option>
                        <option value="alta">🔶 Alta</option>
                        <option value="urgente">🔺 Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cor:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="cor"
                          value={formData.cor}
                          onChange={handleInputChange}
                          className="w-12 h-10 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={formData.cor}
                          onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orçamento (R$):
                      </label>
                      <input
                        type="number"
                        name="orcamento"
                        value={formData.orcamento}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horas Estimadas:
                      </label>
                      <input
                        type="number"
                        name="horas_estimadas"
                        value={formData.horas_estimadas}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsável:
                      </label>
                      <select
                        name="responsavel_id"
                        value={formData.responsavel_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um responsável</option>
                        {funcionarios.map(func => (
                          <option key={func.id} value={func.id}>{func.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : (editingProject ? '✏️ Atualizar' : '➕ Criar')}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GerenciamentoProjetos
