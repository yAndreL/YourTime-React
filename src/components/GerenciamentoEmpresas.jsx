import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import Modal from './ui/Modal'
import { useModal } from '../hooks/useModal'
import { useToast } from '../hooks/useToast'
import { useLanguage } from '../hooks/useLanguage'
import { 
  FiBriefcase, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiCheck, 
  FiX, 
  FiMail, 
  FiPhone, 
  FiMapPin 
} from 'react-icons/fi'

function GerenciamentoEmpresas() {
  const { t } = useLanguage()
  const { modalState, showModal: showModalConfirm, closeModal } = useModal()
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editando, setEditando] = useState(false)
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null)
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: ''
  })

  useEffect(() => {
    carregarSuperiorEmpresaId()
  }, [])

  useEffect(() => {
    if (superiorEmpresaId !== null) {
      carregarEmpresas()
    }
  }, [superiorEmpresaId])

  const carregarSuperiorEmpresaId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setSuperiorEmpresaId(profile?.superior_empresa_id || null)
    } catch (error) {
      setSuperiorEmpresaId(null)
    }
  }

  const carregarEmpresas = async () => {
    try {
      setLoading(true)
      
      // Filtrar empresas pela superior_empresa_id do usuário logado
      let query = supabase
        .from('empresas')
        .select('*')
        .order('nome')

      if (superiorEmpresaId) {
        // Mostrar a empresa principal OU empresas que pertencem a ela
        // Isso permite ver: 
        // 1. A própria empresa (id = superiorEmpresaId)
        // 2. Sub-empresas/filiais (superior_empresa_id = superiorEmpresaId)
        query = query.or(`id.eq.${superiorEmpresaId},superior_empresa_id.eq.${superiorEmpresaId}`)
      }

      const { data, error } = await query

      if (error) throw error
      setEmpresas(data || [])
    } catch (error) {
      toast.showError('Erro ao carregar empresas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Aplicar máscara de CNPJ
    if (name === 'cnpj') {
      const cnpjMask = value
        .replace(/\D/g, '') // Remove tudo que não é número
        .replace(/^(\d{2})(\d)/, '$1.$2') // Adiciona ponto após os 2 primeiros dígitos
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3') // Adiciona ponto após os 3 próximos
        .replace(/\.(\d{3})(\d)/, '.$1/$2') // Adiciona barra após os 3 próximos
        .replace(/(\d{4})(\d)/, '$1-$2') // Adiciona hífen após os 4 próximos
        .substring(0, 18) // Limita o tamanho (XX.XXX.XXX/XXXX-XX)
      
      setFormData(prev => ({ ...prev, [name]: cnpjMask }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const abrirModalNovo = () => {
    setEditando(false)
    setEmpresaSelecionada(null)
    setFormData({
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: ''
    })
    setShowFormModal(true)
  }

  const abrirModalEditar = (empresa) => {
    setEditando(true)
    setEmpresaSelecionada(empresa)
    setFormData({
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || '',
      email: empresa.email || ''
    })
    setShowFormModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editando && empresaSelecionada) {
        // Atualizar empresa existente
        const { error } = await supabase
          .from('empresas')
          .update({
            nome: formData.nome,
            cnpj: formData.cnpj || null,
            endereco: formData.endereco || null,
            telefone: formData.telefone || null,
            email: formData.email || null
          })
          .eq('id', empresaSelecionada.id)

        if (error) throw error
        toast.showSuccess(t('companies.companyUpdated'))
      } else {
        // Criar nova empresa vinculada ao superior_empresa_id do usuário
        const { error } = await supabase
          .from('empresas')
          .insert({
            nome: formData.nome,
            cnpj: formData.cnpj || null,
            endereco: formData.endereco || null,
            telefone: formData.telefone || null,
            email: formData.email || null,
            superior_empresa_id: superiorEmpresaId, // Vincular à empresa do usuário
            is_active: true
          })

        if (error) throw error
        toast.showSuccess(t('companies.companyRegistered'))
      }

      setShowFormModal(false)
      carregarEmpresas()
    } catch (error) {
      toast.showError('Erro ao salvar empresa: ' + error.message)
    }
  }

  const handleToggleStatus = async (empresa) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ is_active: !empresa.is_active })
        .eq('id', empresa.id)

      if (error) throw error

      // Toast amarelo para desativação, verde para ativação
      if (empresa.is_active) {
        toast.showWarning(t('companies.companyDeactivated'))
      } else {
        toast.showSuccess(t('companies.companyActivated'))
      }
      
      carregarEmpresas()
    } catch (error) {
      toast.showError('Erro ao alterar status: ' + error.message)
    }
  }

  const handleExcluir = (empresa) => {
    // Abrir modal de confirmação com tipo "delete"
    showModalConfirm({
      title: 'Confirmar Exclusão',
      message: `${t('companies.confirmDelete')} "${empresa.nome}"?\n\n${t('companies.deleteWarning')}`,
      type: 'delete',
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', empresa.id)

          if (error) throw error
          
          toast.showError(t('companies.companyDeleted'))
          closeModal()
          carregarEmpresas()
        } catch (error) {
          toast.showError('Erro ao excluir empresa: ' + error.message)
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('companies.loadingCompanies')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
            {t('admin.companyManagement')}
          </h2>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
        >
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('admin.addCompany')}
        </button>
      </div>

      {/* Lista de Empresas */}
      {empresas.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <FiBriefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">{t('companies.noCompaniesRegistered')}</p>
          <p className="text-gray-500 mb-6">{t('companies.firstCompanyPrompt')}</p>
          <button
            onClick={abrirModalNovo}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            {t('companies.registerFirstCompany')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                empresa.is_active
                  ? 'border-green-200 hover:border-green-400'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    empresa.is_active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <FiBriefcase className={`w-6 h-6 ${
                      empresa.is_active ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{empresa.nome}</h3>
                    {empresa.cnpj && (
                      <p className="text-sm text-gray-500">CNPJ: {empresa.cnpj}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  empresa.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {empresa.is_active ? t('admin.active') : t('admin.inactive')}
                </span>
              </div>

              {/* Informações */}
              <div className="space-y-2 mb-4">
                {empresa.endereco && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{empresa.endereco}</span>
                  </div>
                )}
                {empresa.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiPhone className="w-4 h-4" />
                    <span>{empresa.telefone}</span>
                  </div>
                )}
                {empresa.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMail className="w-4 h-4" />
                    <span className="truncate">{empresa.email}</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => abrirModalEditar(empresa)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <FiEdit2 className="w-4 h-4" />
                  {t('admin.edit')}
                </button>
                <button
                  onClick={() => handleToggleStatus(empresa)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    empresa.is_active
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  title={empresa.is_active ? 'Desativar' : 'Ativar'}
                >
                  {empresa.is_active ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleExcluir(empresa)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  title="Excluir"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editando ? t('companies.editCompany') : t('companies.registerCompany')}
        type="info"
        showCancel={false}
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('companies.companyName')} *
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('companies.companyNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('companies.cnpj')}
            </label>
            <input
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('companies.cnpjPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('companies.address')}
            </label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('companies.addressPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('companies.phone')}
            </label>
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('companies.phonePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('companies.email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('companies.emailPlaceholder')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              {t('companies.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {editando ? t('companies.update') : t('companies.register')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação (apenas para delete) */}
      {modalState.showCancel && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
          onConfirm={modalState.onConfirm}
        />
      )}
    </div>
  )
}

export default GerenciamentoEmpresas
