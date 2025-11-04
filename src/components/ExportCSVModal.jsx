import { useState, useEffect } from 'react'
import { FiX, FiDownload, FiCheck } from 'react-icons/fi'
import { supabase } from '../config/supabase'
import Toast from './ui/Toast'

function ExportCSVModal({ isOpen, onClose, isAdmin = false }) {
  // Função para calcular a semana atual (Segunda a Sexta)
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    
    // Calcular a segunda-feira da semana
    const monday = new Date(today)
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Se domingo, volta 6 dias, senão calcula diferença para segunda
    monday.setDate(today.getDate() + diff)
    
    // Calcular a sexta-feira da semana
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4) // Segunda + 4 dias = Sexta
    
    // Formatar as datas para YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return {
      inicio: formatDate(monday),
      fim: formatDate(friday)
    }
  }

  const weekRange = getWeekRange()
  
  const [funcionarios, setFuncionarios] = useState([])
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([])
  const [dataInicio, setDataInicio] = useState(weekRange.inicio)
  const [dataFim, setDataFim] = useState(weekRange.fim)
  const [loading, setLoading] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [modalError, setModalError] = useState({ isOpen: false, message: '', code: '' })
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Carregar funcionários
  useEffect(() => {
    const carregarFuncionarios = async () => {
      try {
        setLoading(true)
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        // Buscar o superior_empresa_id do usuário logado
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('superior_empresa_id')
          .eq('id', user.id)
          .single()

        let query = supabase
          .from('profiles')
          .select('id, nome, email, cargo, departamento, superior_empresa_id')
          .order('nome')

        // ✅ FILTRO MULTITENANCY: Mostrar apenas usuários da mesma empresa
        if (userProfile?.superior_empresa_id) {
          query = query.eq('superior_empresa_id', userProfile.superior_empresa_id)
        }

        // Se não é admin, buscar apenas o próprio usuário
        if (!isAdmin) {
          query = query.eq('id', user.id)
        }

        const { data: funcionariosData, error } = await query

        if (error) throw error

        setFuncionarios(funcionariosData || [])
        
        // Selecionar automaticamente se não é admin
        if (!isAdmin && funcionariosData.length > 0) {
          setFuncionariosSelecionados([funcionariosData[0].id])
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
        setModalError({
          isOpen: true,
          message: 'Erro ao carregar funcionários',
          code: error.message
        })
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      carregarFuncionarios()
    }
  }, [isOpen, isAdmin])

  const toggleFuncionario = (id) => {
    setFuncionariosSelecionados(prev => 
      prev.includes(id) 
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    )
  }

  const selecionarTodos = () => {
    if (funcionariosSelecionados.length === funcionarios.length) {
      setFuncionariosSelecionados([])
    } else {
      setFuncionariosSelecionados(funcionarios.map(f => f.id))
    }
  }

  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return 0
    const [h1, m1] = entrada.split(':').map(Number)
    const [h2, m2] = saida.split(':').map(Number)
    return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
  }

  const formatarHoras = (horas) => {
    const h = Math.floor(horas)
    const m = Math.round((horas - h) * 60)
    return `${h}h ${m.toString().padStart(2, '0')}min`
  }

  const formatarData = (data) => {
    const d = new Date(data + 'T12:00:00')
    return d.toLocaleDateString('pt-BR')
  }

  const getStatusTexto = (status) => {
    const statusMap = {
      'A': 'Aprovado',
      'P': 'Pendente',
      'R': 'Rejeitado'
    }
    return statusMap[status] || status
  }

  const escaparCSV = (valor) => {
    if (valor === null || valor === undefined) return ''
    const str = String(valor)
    // Se contém vírgula, aspas ou quebra de linha, envolver em aspas
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const gerarCSV = async () => {
    if (funcionariosSelecionados.length === 0) {
      setModalError({
        isOpen: true,
        message: 'Selecione pelo menos um funcionário',
        code: ''
      })
      return
    }

    if (!dataInicio || !dataFim) {
      setModalError({
        isOpen: true,
        message: 'Selecione o período',
        code: ''
      })
      return
    }

    try {
      setGerando(true)

      // Array para armazenar todas as linhas CSV
      const csvLines = []
      
      // BOM para compatibilidade com Excel
      const BOM = '\uFEFF'
      
      // Cabeçalho do relatório - bem centralizado
      csvLines.push(',,,,,,,,,,,,RELATÓRIO DE REGISTROS DE PONTO')
      csvLines.push(`,,,,,,,,,,,,Período: ${formatarData(dataInicio)} até ${formatarData(dataFim)}`)
      csvLines.push(`,,,,,,,,,,,,Gerado em: ${new Date().toLocaleString('pt-BR')}`)
      csvLines.push('')
      csvLines.push('')

      // Processar cada funcionário selecionado
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId)
        if (!funcionario) continue

        // Buscar registros do funcionário
        const { data: registros, error } = await supabase
          .from('agendamento')
          .select('*')
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true })

        if (error) throw error

        if (registros.length === 0) {
          csvLines.push(`Funcionário: ${funcionario.nome}`)
          csvLines.push('Nenhum registro encontrado no período selecionado')
          csvLines.push('')
          csvLines.push('---')
          csvLines.push('')
          continue
        }

        // ============ SEÇÃO 1: DADOS DO FUNCIONÁRIO (TABELA CENTRALIZADA) ============
        csvLines.push(',,DADOS DO FUNCIONÁRIO')
        csvLines.push(',,Campo,Valor')
        csvLines.push(`,,Nome,${escaparCSV(funcionario.nome)}`)
        csvLines.push(`,,Email,${escaparCSV(funcionario.email)}`)
        csvLines.push(`,,Cargo,${escaparCSV(funcionario.cargo || 'Não definido')}`)
        csvLines.push(`,,Departamento,${escaparCSV(funcionario.departamento || 'Não definido')}`)
        csvLines.push('')
        csvLines.push('')

        // Calcular estatísticas
        let totalHorasTrabalhadas = 0
        let totalHorasExtras = 0
        let diasUteis = 0
        let diasPendentes = 0
        let diasAprovados = 0
        let diasRejeitados = 0

        const dadosDetalhados = registros.map(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
          const totalDia = horasJornada1 + horasJornada2
          
          totalHorasTrabalhadas += totalDia
          
          // Calcular horas extras (acima de 8 horas/dia)
          if (totalDia > 8) {
            totalHorasExtras += (totalDia - 8)
          }
          
          diasUteis++

          // Contar por status
          if (reg.status === 'A') diasAprovados++
          else if (reg.status === 'P') diasPendentes++
          else if (reg.status === 'R') diasRejeitados++

          // Calcular intervalo
          let intervaloInicio = '--:--'
          let intervaloFim = '--:--'
          let duracaoIntervalo = '--'

          if (reg.saida1 && reg.entrada2) {
            intervaloInicio = reg.saida1
            intervaloFim = reg.entrada2
            const duracaoMin = calcularHoras(reg.saida1, reg.entrada2) * 60
            duracaoIntervalo = `${Math.floor(duracaoMin)}min`
          }

          return {
            data: formatarData(reg.data),
            entrada1: reg.entrada1 || '--:--',
            saida1: reg.saida1 || '--:--',
            intervaloInicio,
            intervaloFim,
            duracaoIntervalo,
            entrada2: reg.entrada2 || '--:--',
            saida2: reg.saida2 || '--:--',
            totalHoras: formatarHoras(totalDia),
            status: getStatusTexto(reg.status),
            projeto: reg.projeto_nome || 'Não definido',
            observacoes: reg.observacoes || ''
          }
        })

        // ============ SEÇÃO 2: ESTATÍSTICAS LADO A LADO COM GRÁFICO DE PIZZA ============
        csvLines.push(',,ESTATÍSTICAS DO PERÍODO,,,,,DISTRIBUIÇÃO POR STATUS (Selecione para Gráfico Pizza)')
        csvLines.push(',,Métrica,Valor,,,Status,Quantidade,Percentual')
        csvLines.push(`,,Total de Horas Trabalhadas,${formatarHoras(totalHorasTrabalhadas)},,,Aprovados,${diasAprovados},${((diasAprovados/diasUteis)*100).toFixed(1)}%`)
        csvLines.push(`,,Total de Horas Extras,${formatarHoras(totalHorasExtras)},,,Pendentes,${diasPendentes},${((diasPendentes/diasUteis)*100).toFixed(1)}%`)
        csvLines.push(`,,Dias Úteis Trabalhados,${diasUteis},,,Rejeitados,${diasRejeitados},${((diasRejeitados/diasUteis)*100).toFixed(1)}%`)
        csvLines.push(`,,Média Diária,${formatarHoras(totalHorasTrabalhadas / diasUteis)}`)
        csvLines.push('')
        csvLines.push(',,💡 Dica: Selecione as colunas Status e Quantidade acima e crie um Gráfico de Pizza!')
        csvLines.push('')

        // ============ SEÇÃO 3: GRÁFICO DE BARRAS - HORAS POR DIA ============
        csvLines.push(',,HORAS TRABALHADAS POR DIA (Selecione para Gráfico de Barras)')
        csvLines.push(',,Data,Horas Normais (até 8h),Horas Extras (acima de 8h),Total,Status')
        dadosDetalhados.forEach(dia => {
          // Extrair número de horas do formato "Xh YYmin"
          const match = dia.totalHoras.match(/(\d+)h\s*(\d+)min/)
          const horas = match ? parseInt(match[1]) : 0
          const minutos = match ? parseInt(match[2]) : 0
          const totalHoras = horas + (minutos / 60)
          
          const horasNormais = Math.min(totalHoras, 8)
          const horasExtras = Math.max(totalHoras - 8, 0)
          
          csvLines.push(`,,${dia.data},${horasNormais.toFixed(2)},${horasExtras.toFixed(2)},${totalHoras.toFixed(2)},${dia.status}`)
        })
        csvLines.push('')
        csvLines.push(',,💡 Dica: Selecione os dados acima e crie um Gráfico de Barras Empilhadas!')
        csvLines.push('')

        // ============ SEÇÃO 4: TABELA DETALHADA DE REGISTROS ============
        csvLines.push(',,REGISTROS DETALHADOS - PONTO POR PONTO')
        csvLines.push([
          '',
          '',
          'Data',
          'Entrada 1',
          'Saída 1',
          'Intervalo Início',
          'Intervalo Fim',
          'Duração',
          'Entrada 2',
          'Saída 2',
          'Total',
          'Status',
          'Projeto',
          'Observações'
        ].map(escaparCSV).join(','))

        dadosDetalhados.forEach(dia => {
          csvLines.push([
            '',
            '',
            dia.data,
            dia.entrada1,
            dia.saida1,
            dia.intervaloInicio,
            dia.intervaloFim,
            dia.duracaoIntervalo,
            dia.entrada2,
            dia.saida2,
            dia.totalHoras,
            dia.status,
            dia.projeto,
            dia.observacoes
          ].map(escaparCSV).join(','))
        })

        csvLines.push('')
        csvLines.push('')
        csvLines.push('═════════════════════════════════════════════════════════════════════')
        csvLines.push('')
        csvLines.push('')
      }

      // Montar o conteúdo final do CSV
      const csvContent = BOM + csvLines.join('\n')

      // Criar Blob e fazer download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      const nomeArquivo = funcionariosSelecionados.length === 1
        ? `relatorio_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.csv`
        : `relatorio_multiplos_funcionarios_${dataInicio}_${dataFim}.csv`
      
      link.setAttribute('download', nomeArquivo)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setToastMessage('CSV gerado com sucesso!')
      setShowToast(true)
      
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error) {

      setModalError({
        isOpen: true,
        message: 'Erro ao gerar CSV',
        code: error.message
      })
    } finally {
      setGerando(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', margin: 0, padding: 0 }}
      >
        <div className="p-4 w-full h-full flex items-center justify-center" style={{ padding: '1rem' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[10000]" style={{ marginTop: 0, marginBottom: 0 }}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Exportar para CSV</h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecione os funcionários e o período para gerar o relatório
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={gerando}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Seleção de Funcionários */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isAdmin 
                  ? 'Selecione os funcionários' 
                  : 'Funcionário'
                }
              </label>
              
              {isAdmin && funcionarios.length > 1 && (
                <button
                  onClick={selecionarTodos}
                  className="mb-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  disabled={loading || gerando}
                >
                  {funcionariosSelecionados.length === funcionarios.length 
                    ? 'Desmarcar todos' 
                    : 'Selecionar todos'
                  }
                </button>
              )}

              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    Carregando funcionários...
                  </div>
                ) : funcionarios.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum funcionário encontrado
                  </div>
                ) : (
                  funcionarios.map((funcionario) => (
                    <label
                      key={funcionario.id}
                      className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        !isAdmin ? 'cursor-default' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={funcionariosSelecionados.includes(funcionario.id)}
                        onChange={() => isAdmin && toggleFuncionario(funcionario.id)}
                        disabled={!isAdmin}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{funcionario.nome}</div>
                        <div className="text-sm text-gray-500">
                          {funcionario.cargo || 'Cargo não definido'} • {funcionario.email}
                        </div>
                      </div>
                      {funcionariosSelecionados.includes(funcionario.id) && (
                        <FiCheck className="text-green-500 ml-2" size={20} />
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={gerando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={gerando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Informações sobre o CSV */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">O arquivo CSV incluirá:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Dados do(s) funcionário(s) selecionado(s)</li>
                <li>• Estatísticas do período (total de horas, extras, média)</li>
                <li>• Dados estruturados para gráficos</li>
                <li>• Tabela detalhada de todos os registros</li>
                <li>• Informações de intervalo e projetos</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={gerando}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={gerarCSV}
              disabled={gerando || funcionariosSelecionados.length === 0 || !dataInicio || !dataFim}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {gerando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Gerando CSV...
                </>
              ) : (
                <>
                  <FiDownload size={20} />
                  Exportar CSV
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Modal de Erro */}
      {modalError.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', margin: 0, padding: 0 }}
        >
          <div className="p-4 w-full h-full flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-[10001]">
            <h3 className="text-lg font-bold text-red-600 mb-2">Erro</h3>
            <p className="text-gray-700 mb-2">{modalError.message}</p>
            {modalError.code && (
              <p className="text-sm text-gray-500 mb-4">Código: {modalError.code}</p>
            )}
            <button
              onClick={() => setModalError({ isOpen: false, message: '', code: '' })}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}

export default ExportCSVModal
