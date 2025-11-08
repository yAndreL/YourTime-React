import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import ConfigService from '../services/ConfigService'
import ConfiguracoesSkeleton from '../components/ui/ConfiguracoesSkeleton'
import CacheService from '../services/CacheService'
import { supabase } from '../config/supabase'
import { FiMail, FiBell, FiClock, FiBarChart2, FiSave, FiRotateCcw } from 'react-icons/fi'

function Configuracoes() {
  const [config, setConfig] = useState({
    email_relatorios: true,
    lembrete_registro: true,
    hora_entrada_padrao: '09:00',
    hora_saida_padrao: '18:00',
    horas_semanais: 40,
    fuso_horario: 'America/Sao_Paulo',
    formato_exportacao: 'PDF',
    incluir_graficos_pdf: true
  })
  const [isLoading, setIsLoading] = useState(false) // Inicia como false
  const [showSkeleton, setShowSkeleton] = useState(false) // Controla skeleton
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  }

  const carregarConfiguracoes = async () => {
    let skeletonTimeout = null
    const userId = await getCurrentUserId()
    
    if (!userId) {
      showToastMessage('Erro ao carregar usuário', 'error')
      setIsLoading(false)
      return
    }

    // Tentar carregar do cache primeiro
    const cachedConfig = CacheService.get('configuracoes', userId)
    if (cachedConfig) {

      setConfig(cachedConfig)
      setIsLoading(false)
      setShowSkeleton(false)
      // Atualiza em background
      carregarConfiguracoesFromDB(userId, true)
      return
    }

    // Se não tem cache, mostra skeleton apenas após 300ms
    setIsLoading(true)
    skeletonTimeout = setTimeout(() => {
      setShowSkeleton(true)
    }, 300)
    
    try {
      await carregarConfiguracoesFromDB(userId, false)
    } finally {
      if (skeletonTimeout) clearTimeout(skeletonTimeout)
    }
  }

  const carregarConfiguracoesFromDB = async (userId, isBackgroundUpdate = false) => {
    const result = await ConfigService.buscarConfiguracoes(userId)
    if (result.success && result.data) {
      const configData = {
        ...result.data,
        hora_entrada_padrao: result.data.hora_entrada_padrao?.substring(0, 5) || '09:00',
        hora_saida_padrao: result.data.hora_saida_padrao?.substring(0, 5) || '18:00'
      }
      setConfig(configData)
      
      // Salvar no cache (TTL de 10 minutos)
      CacheService.set('configuracoes', configData, userId, 10 * 60 * 1000)
    }
    
    if (!isBackgroundUpdate) {
      setIsLoading(false)
      setShowSkeleton(false)
    }
  }

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSalvar = async () => {
    setIsSaving(true)
    const userId = await getCurrentUserId()

    if (!userId) {
      showToastMessage('Erro ao salvar: usuário não encontrado', 'error')
      setIsSaving(false)
      return
    }

    // Preparar dados para salvar
    const configParaSalvar = {
      email_relatorios: config.email_relatorios,
      lembrete_registro: config.lembrete_registro,
      hora_entrada_padrao: `${config.hora_entrada_padrao}:00`,
      hora_saida_padrao: `${config.hora_saida_padrao}:00`,
      horas_semanais: config.horas_semanais,
      fuso_horario: config.fuso_horario,
      formato_exportacao: config.formato_exportacao,
      incluir_graficos_pdf: config.incluir_graficos_pdf
    }

    const result = await ConfigService.atualizarConfiguracoes(userId, configParaSalvar)
    
    if (result.success) {
      showToastMessage('Configurações salvas com sucesso!', 'success')

      // Invalidar cache para forçar reload na próxima vez
      CacheService.remove('configuracoes', userId)
    } else {
      showToastMessage('Erro ao salvar configurações', 'error')

    }
    
    setIsSaving(false)
  }

  const handleRestaurar = async () => {
    setShowConfirmModal(false)
    setIsSaving(true)
    const userId = await getCurrentUserId()

    if (!userId) {
      showToastMessage('Erro: usuário não encontrado', 'error')
      setIsSaving(false)
      return
    }

    const result = await ConfigService.restaurarPadroes(userId)
    
    if (result.success) {
      // Invalidar cache
      CacheService.remove('configuracoes', userId)
      await carregarConfiguracoes()
      showToastMessage('✅ Configurações restauradas para os padrões', 'success')
    } else {
      showToastMessage('❌ Erro ao restaurar configurações', 'error')
    }
    
    setIsSaving(false)
  }

  // Mostra skeleton apenas se estiver demorando
  if (showSkeleton && isLoading) {
    return (
      <MainLayout title="Configurações" subtitle="Personalize suas preferências">
        <ConfiguracoesSkeleton />
      </MainLayout>
    )
  }

  // Se está carregando mas não deve mostrar skeleton ainda, não renderiza (evita flash)
  if (isLoading && !showSkeleton) {
    return null
  }

  return (
    <MainLayout title="Configurações" subtitle="Personalize suas preferências">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-8">
            {/* Configurações de Notificação */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBell className="w-5 h-5" />
                Notificações
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiMail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email de Relatórios</p>
                      <p className="text-sm text-gray-500">Receber relatórios semanais por email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.email_relatorios}
                      onChange={(e) => handleChange('email_relatorios', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FiClock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Lembrete de Registro</p>
                      <p className="text-sm text-gray-500">Receber lembretes para marcar ponto (início, intervalo e fim do expediente)</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.lembrete_registro}
                      onChange={(e) => handleChange('lembrete_registro', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Configurações de Jornada */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                Jornada de Trabalho
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Entrada Padrão
                  </label>
                  <input 
                    type="time" 
                    value={config.hora_entrada_padrao}
                    onChange={(e) => handleChange('hora_entrada_padrao', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Saída Padrão
                  </label>
                  <input 
                    type="time" 
                    value={config.hora_saida_padrao}
                    onChange={(e) => handleChange('hora_saida_padrao', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Semanais
                  </label>
                  <input 
                    type="number" 
                    value={config.horas_semanais}
                    onChange={(e) => handleChange('horas_semanais', parseInt(e.target.value))}
                    min="1"
                    max="60"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuso Horário
                  </label>
                  <select 
                    value={config.fuso_horario}
                    onChange={(e) => handleChange('fuso_horario', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  >
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Configurações de Relatórios */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5" />
                Relatórios
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FiBarChart2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Incluir gráficos nos relatórios PDF</p>
                      <p className="text-sm text-gray-500">Adiciona gráficos visuais ao exportar relatórios em PDF</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluir_graficos_pdf}
                      onChange={(e) => handleChange('incluir_graficos_pdf', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4 justify-center">
            <button 
              onClick={handleSalvar}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  Salvar
                </>
              )}
            </button>
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={isSaving}
              className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Restaurar Padrões
            </button>
          </div>
        </div>
      </div>

      {/* Toast de Notificação */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
          toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className="flex items-center gap-2">
            <span>{toastMessage}</span>
            <button 
              onClick={() => setShowToast(false)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Confirmar Restauração
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja restaurar as configurações padrão?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestaurar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default Configuracoes
