import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase.js'
import MainLayout from '../layout/MainLayout'
import NotificationService from '../../services/NotificationService'
import { useLanguage } from '../../hooks/useLanguage'
import { 
  FiFileText,
  FiClock,
  FiSave,
  FiX,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi'

function FormularioPonto() {
  const { t } = useLanguage()
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
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  const [projetoSelecionado, setProjetoSelecionado] = useState(null)
  const navigate = useNavigate()

  // Carregar usuário atual e data padrão
  useEffect(() => {
    carregarUsuarioAtual()
    carregarProjetoSelecionado()
    definirDataPadrao()
  }, [])

  const carregarProjetoSelecionado = () => {
    try {
      const savedProject = localStorage.getItem('selectedProject')
      if (savedProject) {
        const project = JSON.parse(savedProject)
        setProjetoSelecionado(project)
      }
    } catch (error) {
    }
  }

  const carregarUsuarioAtual = async () => {
    try {
      // Pegar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setErro(t('validation.userNotAuthenticated'))
        return
      }

      // Buscar dados do perfil do usuário autenticado
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      if (profile) {
        setUsuarioAtual(profile)
      }
    } catch (error) {
      setErro(t('validation.errorLoadingUser'))
    }
  }

  const definirDataPadrao = () => {
    const hoje = new Date().toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, data: hoje }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Se for campo de horário, validar formato e permitir digitação
    if (name.includes('entrada') || name.includes('saida')) {
      // Permitir apenas números e :
      const sanitized = value.replace(/[^\d:]/g, '')
      
      // Auto-formatar enquanto digita
      if (sanitized.length === 2 && !sanitized.includes(':')) {
        setFormData(prev => ({
          ...prev,
          [name]: sanitized + ':'
        }))
        return
      }
      
      // Validar formato HH:MM
      if (sanitized.length <= 5) {
        const parts = sanitized.split(':')
        if (parts[0] && parseInt(parts[0]) > 23) {
          parts[0] = '23'
        }
        if (parts[1] && parseInt(parts[1]) > 59) {
          parts[1] = '59'
        }
        
        setFormData(prev => ({
          ...prev,
          [name]: parts.join(':')
        }))
        return
      }
    }
    
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
      setErro(t('validation.entry1Required'))
      return false
    }

    // Se tem saída 1, deve ser depois da entrada 1
    if (saida1 && entrada1 >= saida1) {
      setErro(t('validation.exit1AfterEntry1'))
      return false
    }

    // Se tem entrada 2, deve ser depois da saída 1
    if (entrada2 && saida1 && entrada2 <= saida1) {
      setErro(t('validation.entry2AfterExit1'))
      return false
    }

    // Se tem saída 2, deve ser depois da entrada 2
    if (saida2 && entrada2 && saida2 <= entrada2) {
      setErro(t('validation.exit2AfterEntry2'))
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

    // Validar se a data não está no futuro
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataSelecionada = new Date(formData.data + 'T00:00:00')
    
    if (dataSelecionada > hoje) {
      setErro(t('validation.futureDate'))
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')

    try {

      
      // ✅ PRIMEIRO: Verificar se já existe registro para esta data

      const { data: registrosExistentes, error: errVerificacao } = await supabase
        .from('agendamento')
        .select('id, entrada1, saida1, entrada2, saida2, data, created_at, status')
        .eq('user_id', usuarioAtual.id)
        .eq('data', formData.data)

      if (errVerificacao) throw errVerificacao
      
      if (registrosExistentes && registrosExistentes.length > 0) {
        const registro = registrosExistentes[0]
        const horarios = `${registro.entrada1 || '--'} - ${registro.saida1 || '--'}${registro.entrada2 ? ` | ${registro.entrada2} - ${registro.saida2 || '--'}` : ''}`
        const statusTexto = registro.status === 'P' ? t('history.pending') : registro.status === 'A' ? t('history.approved') : t('history.rejected')
        setErro(t('validation.duplicateRecord')
          .replace('{date}', formData.data)
          .replace('{times}', horarios)
          .replace('{status}', statusTexto))
        setLoading(false)
        return
      }

      // ✅ SEGUNDO: Buscar empresa_id e superior_empresa_id do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', usuarioAtual.id)
        .single()

      if (profileError) {
        console.warn('Erro ao buscar superior_empresa_id do usuário:', profileError)
      }

      // ✅ TERCEIRO: Buscar empresa_id do projeto (se houver)
      let empresaIdDoProjeto = null
      if (projetoSelecionado?.id) {
        const { data: projetoData } = await supabase
          .from('projetos')
          .select('empresa_id')
          .eq('id', projetoSelecionado.id)
          .single()
        
        empresaIdDoProjeto = projetoData?.empresa_id || null
      }

      // ✅ QUARTO: Salvar novo registro COM multitenancy
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
        status: 'P', // P = Pendente, A = Aprovado, R = Rejeitado
        projeto_id: projetoSelecionado?.id || null,
        empresa_id: empresaIdDoProjeto, // ✅ Empresa do projeto
        superior_empresa_id: profileData?.superior_empresa_id || null // ✅ Empresa do usuário
      }

      console.log('📝 Salvando ponto com multitenancy:', {
        user_id: pontoData.user_id,
        projeto_id: pontoData.projeto_id,
        empresa_id: pontoData.empresa_id,
        superior_empresa_id: pontoData.superior_empresa_id
      })

      const { data, error } = await supabase
        .from('agendamento')
        .insert([pontoData])
        .select()

      if (error) {
        throw error
      }

      // Notificar admins sobre o novo ponto pendente (exceto o próprio usuário)
      if (data && data.length > 0) {
        await NotificationService.notificarAdminsPontoPendente(
          data[0].id,
          usuarioAtual.nome,
          formData.data,
          usuarioAtual.id // Passa o ID do usuário para não notificar ele mesmo
        )
      }

      // Limpar cache para forçar atualização no dashboard
      sessionStorage.removeItem('cachedTimeRecords')

      setSucesso('Ponto registrado com sucesso!')

      // Redirecionar para dashboard
      setTimeout(() => {
        navigate('/')
      }, 2000)
      
    } catch (error) {

      setErro(t('validation.errorSavingRecord').replace('{error}', error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title={t('timeRecordForm.title')} subtitle={usuarioAtual ? `${t('timeRecordForm.hello')}, ${usuarioAtual.nome}` : ''}>
      {/* Projeto Selecionado */}
      {projetoSelecionado && (
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: projetoSelecionado.cor_identificacao }}
            ></div>
            <div>
              <div className="text-sm font-medium text-blue-900">{t('timeRecordForm.title')}:</div>
              <div className="text-lg font-bold text-blue-700">{projetoSelecionado.nome}</div>
            </div>
          </div>
        </div>
      )}

      {!projetoSelecionado && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-yellow-900">{t('timeRecordForm.noProjectSelected')}</div>
            <div className="text-xs text-yellow-700 mt-0.5">{t('timeRecordForm.selectProjectMsg')}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Linha 1 - Data e Observação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="data" className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('timeRecordForm.date')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="data"
                    name="data"
                    value={formData.data}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="observacao" className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('timeRecordForm.observation')}
                  </label>
                  <input
                    type="text"
                    id="observacao"
                    name="observacao"
                    value={formData.observacao}
                    onChange={handleChange}
                    placeholder={t('timeRecordForm.observationPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-gray-400 text-sm"
                  />
                </div>
              </div>

              {/* Card de Jornada 1 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4" />
                  {t('timeRecordForm.shift1')} <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="entrada1" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('timeRecordForm.entry')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="entrada1"
                      name="entrada1"
                      value={formData.entrada1}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="saida1" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('timeRecordForm.exit')}
                    </label>
                    <input
                      type="time"
                      id="saida1"
                      name="saida1"
                      value={formData.saida1}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Card de Jornada 2 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4" />
                  {t('timeRecordForm.shift2')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="entrada2" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('timeRecordForm.entry')}
                    </label>
                    <input
                      type="time"
                      id="entrada2"
                      name="entrada2"
                      value={formData.entrada2}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="saida2" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('timeRecordForm.exit')}
                    </label>
                    <input
                      type="time"
                      id="saida2"
                      name="saida2"
                      value={formData.saida2}
                      onChange={handleChange}
                      placeholder="HH:MM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo do Ponto */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm">
                  <FiCheckCircle className="w-4 h-4" />
                  {t('timeRecordForm.summary')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <span className="text-xs text-gray-600">{t('timeRecordForm.lunchBreak')}</span>
                    <p className="text-lg font-bold text-blue-600 mt-0.5">
                      {calcularPausaAlmoco()} min
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <span className="text-xs text-gray-600">{t('timeRecordForm.totalWorked')}</span>
                    <p className="text-lg font-bold text-green-600 mt-0.5">
                      {calcularTotalTrabalhado()}
                    </p>
                  </div>
                </div>
                
                {/* Detalhes das jornadas */}
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{t('timeRecordForm.shift1')}:</span>
                      <span className="text-blue-700">
                        {formData.entrada1 && formData.saida1 
                          ? `${formData.entrada1} - ${formData.saida1}` 
                          : t('timeRecordForm.notDefined')
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{t('timeRecordForm.shift2')}:</span>
                      <span className="text-green-700">
                        {formData.entrada2 && formData.saida2 
                          ? `${formData.entrada2} - ${formData.saida2}` 
                          : t('timeRecordForm.notDefined')
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback de erro/sucesso */}
              {erro && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{sucesso}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex flex-col-reverse md:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 px-4 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <FiX className="w-4 h-4" />
                  {t('timeRecordForm.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !usuarioAtual}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-700 hover:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      {t('timeRecordForm.register')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
    </MainLayout>
  )
}

export default FormularioPonto
