import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { FiX, FiDownload, FiCalendar, FiUsers, FiAlertCircle } from 'react-icons/fi'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ConfigService from '../services/ConfigService'

function ExportPDFModal({ isOpen, onClose, isAdmin = false }) {
  const [funcionarios, setFuncionarios] = useState([])
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([])
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [modalError, setModalError] = useState({ isOpen: false, message: '', code: '' })
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      carregarFuncionarios()
      // Definir período padrão (mês atual)
      const hoje = new Date()
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      
      setDataInicio(primeiroDia.toISOString().split('T')[0])
      setDataFim(ultimoDia.toISOString().split('T')[0])
    }
  }, [isOpen])

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setFuncionarios([])
        return
      }

      let query = supabase
        .from('profiles')
        .select('id, nome, email, cargo, departamento')
        .eq('is_active', true)

      // Se não for admin, filtrar apenas o próprio usuário
      if (!isAdmin) {
        query = query.eq('id', user.id)
      }

      query = query.order('nome')

      const { data, error } = await query

      if (error) throw error
      
      const funcionariosData = data || []
      setFuncionarios(funcionariosData)
      
      // Se não for admin, selecionar automaticamente o próprio usuário
      if (!isAdmin && funcionariosData.length > 0) {
        setFuncionariosSelecionados([funcionariosData[0].id])
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const toggleFuncionario = (funcionarioId) => {
    setFuncionariosSelecionados(prev => {
      if (prev.includes(funcionarioId)) {
        return prev.filter(id => id !== funcionarioId)
      }
      return [...prev, funcionarioId]
    })
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
    const h = Math.floor(Math.abs(horas))
    const m = Math.round((Math.abs(horas) - h) * 60)
    return `${horas < 0 ? '-' : ''}${h}h ${m}m`
  }

  const gerarPDF = async () => {
    if (funcionariosSelecionados.length === 0) {
      setModalError({
        isOpen: true,
        message: 'Selecione pelo menos um funcionário para gerar o relatório.',
        code: 'EXP-001'
      })
      return
    }

    if (!dataInicio || !dataFim) {
      setModalError({
        isOpen: true,
        message: 'Selecione o período (data início e data fim) para gerar o relatório.',
        code: 'EXP-002'
      })
      return
    }

    if (new Date(dataInicio) > new Date(dataFim)) {
      setModalError({
        isOpen: true,
        message: 'A data de início não pode ser posterior à data fim.',
        code: 'EXP-003'
      })
      return
    }

    try {
      setGerando(true)

      // Buscar configurações do usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      const configResult = await ConfigService.buscarConfiguracoes(user.id)
      const incluirGraficos = configResult?.data?.incluir_graficos_pdf ?? false

      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId)
        
        // Buscar registros de ponto do funcionário no período
        const { data: registros, error } = await supabase
          .from('agendamento')
          .select('*')
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true })

        if (error) throw error

        // Gerar PDF para este funcionário
        const doc = new jsPDF()
        
        // Header
        doc.setFontSize(18)
        doc.setFont(undefined, 'bold')
        doc.text('RELATÓRIO DE PONTO', 105, 20, { align: 'center' })
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'normal')
        doc.text(`Funcionário: ${funcionario.nome}`, 20, 35)
        doc.text(`Cargo: ${funcionario.cargo || 'Não definido'}`, 20, 42)
        doc.text(`Departamento: ${funcionario.departamento || 'Não definido'}`, 20, 49)
        doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 56)

        // Calcular totais
        let totalHorasTrabalhadas = 0
        let totalHorasExtras = 0
        let diasUteis = 0

        const tableData = registros.map(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
          const totalDia = horasJornada1 + horasJornada2
          
          totalHorasTrabalhadas += totalDia
          
          // Calcular horas extras (acima de 8 horas/dia)
          if (totalDia > 8) {
            totalHorasExtras += (totalDia - 8)
          }
          
          diasUteis++

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

          return [
            formatarData(reg.data),
            reg.entrada1 || '--:--',
            reg.saida1 || '--:--',
            intervaloInicio,
            intervaloFim,
            duracaoIntervalo,
            reg.entrada2 || '--:--',
            reg.saida2 || '--:--',
            formatarHoras(totalDia),
            getStatusTexto(reg.status)
          ]
        })

        // Tabela de registros
        autoTable(doc, {
          startY: 65,
          head: [['Data', 'Entrada 1', 'Saída 1', 'Intervalo Início', 'Intervalo Fim', 'Duração', 'Entrada 2', 'Saída 2', 'Total', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [37, 99, 235],
            fontSize: 8,
            fontStyle: 'bold'
          },
          bodyStyles: { 
            fontSize: 7
          },
          styles: {
            cellPadding: 1.5,
            overflow: 'linebreak',
            fontSize: 7
          },
          columnStyles: {
            0: { cellWidth: 'auto' },  // Data
            1: { cellWidth: 'auto' },  // Entrada 1
            2: { cellWidth: 'auto' },  // Saída 1
            3: { cellWidth: 'auto' },  // Intervalo Início
            4: { cellWidth: 'auto' },  // Intervalo Fim
            5: { cellWidth: 'auto' },  // Duração
            6: { cellWidth: 'auto' },  // Entrada 2
            7: { cellWidth: 'auto' },  // Saída 2
            8: { cellWidth: 'auto' },  // Total
            9: { cellWidth: 'auto' }   // Status
          },
          tableWidth: 'auto',
          margin: { left: 10, right: 10 }
        })

        // Resumo - obter posição Y final da tabela
        let finalY = (doc.lastAutoTable?.finalY || 65) + 10
        
        // Se habilitado, adicionar gráfico
        if (incluirGraficos && registros.length > 0) {
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('GRAFICO DE HORAS TRABALHADAS', 20, finalY)
          
          // Calcular máximo de horas trabalhadas no período
          let maxHorasTrabalhadas = 0
          registros.forEach((reg) => {
            const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
            const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
            const totalDia = horasJornada1 + horasJornada2
            if (totalDia > maxHorasTrabalhadas) {
              maxHorasTrabalhadas = totalDia
            }
          })
          
          // Arredondar para cima: (max + 1) arredondado para o próximo inteiro
          const maxHoras = Math.ceil(maxHorasTrabalhadas + 1)
          
          // Desenhar gráfico de barras
          const graficoX = 25
          const graficoY = finalY + 10
          const graficoLargura = 165
          const graficoAltura = 60
          
          // Fundo do gráfico
          doc.setFillColor(245, 245, 245)
          doc.rect(graficoX, graficoY, graficoLargura, graficoAltura, 'F')
          
          // Calcular número de linhas de grade (mínimo 4, máximo 6)
          const numLinhas = Math.min(Math.max(4, maxHoras), 6)
          const intervaloHoras = maxHoras / numLinhas
          
          // Linhas de grade
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.1)
          for (let i = 0; i <= numLinhas; i++) {
            const y = graficoY + (graficoAltura * i / numLinhas)
            doc.line(graficoX, y, graficoX + graficoLargura, y)
            
            // Labels do eixo Y
            doc.setFontSize(7)
            doc.setTextColor(100, 100, 100)
            const horaLabel = Math.round((maxHoras - (i * intervaloHoras)) * 10) / 10
            doc.text(`${horaLabel}h`, graficoX - 5, y + 2, { align: 'right' })
          }
          
          // Desenhar barras
          const barWidth = Math.min(graficoLargura / registros.length - 2, 10)
          const barSpacing = graficoLargura / registros.length
          
          registros.forEach((reg, index) => {
            const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
            const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
            const totalDia = horasJornada1 + horasJornada2
            
            const barHeight = (totalDia / maxHoras) * graficoAltura
            const barX = graficoX + (index * barSpacing) + (barSpacing - barWidth) / 2
            const barY = graficoY + graficoAltura - barHeight
            
            // Cor da barra baseada nas horas
            if (totalDia >= 8) {
              doc.setFillColor(34, 197, 94) // Verde - >= 8h
            } else if (totalDia >= 6) {
              doc.setFillColor(251, 191, 36) // Amarelo - 6-8h
            } else {
              doc.setFillColor(239, 68, 68) // Vermelho - < 6h
            }
            
            doc.rect(barX, barY, barWidth, barHeight, 'F')
            
            // Label da data
            if (registros.length <= 15) {
              doc.setFontSize(6)
              doc.setTextColor(80, 80, 80)
              const dataLabel = formatarData(reg.data).substring(0, 5) // DD/MM
              const labelY = graficoY + graficoAltura + 4
              doc.text(dataLabel, barX + barWidth / 2, labelY, { align: 'center' })
            }
          })
          
          // Borda do gráfico
          doc.setDrawColor(150, 150, 150)
          doc.setLineWidth(0.5)
          doc.rect(graficoX, graficoY, graficoLargura, graficoAltura)
          
          // Legenda com quadrados maiores
          doc.setFontSize(8)
          doc.setTextColor(60, 60, 60)
          const legendaY = graficoY + graficoAltura + 12
          const legendaX = graficoX + 10
          
          // Verde - >= 8h
          doc.setFillColor(34, 197, 94)
          doc.rect(legendaX, legendaY, 4, 4, 'F')
          doc.setTextColor(60, 60, 60)
          doc.text('>= 8h', legendaX + 6, legendaY + 3)
          
          // Amarelo - 6-8h
          doc.setFillColor(251, 191, 36)
          doc.rect(legendaX + 30, legendaY, 4, 4, 'F')
          doc.setTextColor(60, 60, 60)
          doc.text('6-8h', legendaX + 36, legendaY + 3)
          
          // Vermelho - < 6h
          doc.setFillColor(239, 68, 68)
          doc.rect(legendaX + 55, legendaY, 4, 4, 'F')
          doc.setTextColor(60, 60, 60)
          doc.text('< 6h', legendaX + 61, legendaY + 3)
          
          finalY = legendaY + 12
        }
        
        // Calcular saldo de horas (assumindo 8h/dia)
        const horasEsperadas = diasUteis * 8
        const saldoHoras = totalHorasTrabalhadas - horasEsperadas

        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text('RESUMO DO PERÍODO', 20, finalY)
        
        doc.setFont(undefined, 'normal')
        doc.setFontSize(10)
        doc.text(`Total de dias trabalhados: ${diasUteis} dias`, 20, finalY + 10)
        doc.text(`Total de horas trabalhadas: ${formatarHoras(totalHorasTrabalhadas)}`, 20, finalY + 17)
        doc.text(`Horas esperadas (8h/dia): ${formatarHoras(horasEsperadas)}`, 20, finalY + 24)
        
        // Horas extras com cor laranja
        doc.setTextColor(255, 140, 0) // Laranja
        doc.text(`Horas extras: ${formatarHoras(totalHorasExtras)}`, 20, finalY + 31)
        
        // Saldo com cor
        doc.setFont(undefined, 'bold')
        if (saldoHoras >= 0) {
          doc.setTextColor(0, 128, 0) // Verde
          doc.text(`Saldo de horas: +${formatarHoras(saldoHoras)}`, 20, finalY + 38)
        } else {
          doc.setTextColor(255, 0, 0) // Vermelho
          doc.text(`Saldo de horas: ${formatarHoras(saldoHoras)}`, 20, finalY + 38)
        }

        // Footer
        doc.setTextColor(128, 128, 128)
        doc.setFontSize(8)
        doc.setFont(undefined, 'italic')
        doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' })

        // Salvar PDF
        const nomeArquivo = `relatorio-ponto-${funcionario.nome.replace(/\s+/g, '-')}-${dataInicio}-${dataFim}.pdf`
        doc.save(nomeArquivo)

        // Pequeno delay entre PDFs para não travar o navegador
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Sucesso - Mostrar toast
      setToastMessage('Relatório em PDF gerado!')
      setShowToast(true)
      
      setTimeout(() => {
        setShowToast(false)
        onClose()
      }, 2000)
    } catch (error) {

      let errorCode = 'EXP-004'
      let errorMessage = 'Erro ao gerar relatório PDF. Verifique sua conexão com o banco de dados e tente novamente.'
      
      if (error.message.includes('registros')) {
        errorCode = 'EXP-005'
        errorMessage = 'Nenhum registro de ponto encontrado para o período selecionado.'
      } else if (error.message.includes('autoTable') || error.message.includes('jspdf')) {
        errorCode = 'EXP-006'
        errorMessage = 'Erro ao formatar o PDF. Por favor, tente novamente.'
      } else if (error.code) {
        errorCode = 'DB-001'
        errorMessage = `Erro de conexão com o banco de dados: ${error.message}`
      }
      
      setModalError({
        isOpen: true,
        message: errorMessage,
        code: errorCode
      })
    } finally {
      setGerando(false)
    }
  }

  const formatarData = (dataString) => {
    const data = new Date(dataString + 'T00:00:00')
    return data.toLocaleDateString('pt-BR')
  }

  const getStatusTexto = (status) => {
    switch (status) {
      case 'A': return 'Aprovado'
      case 'P': return 'Pendente'
      case 'R': return 'Rejeitado'
      default: return 'Sem status'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FiDownload className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Exportar Relatório de Ponto</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Seleção de Período */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <FiCalendar className="w-4 h-4" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Seleção de Funcionários */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FiUsers className="w-4 h-4" />
                {isAdmin 
                  ? `Funcionários (${funcionariosSelecionados.length} selecionado${funcionariosSelecionados.length !== 1 ? 's' : ''})`
                  : 'Seus Dados'
                }
              </label>
              {isAdmin && funcionarios.length > 1 && (
                <button
                  onClick={selecionarTodos}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {funcionariosSelecionados.length === funcionarios.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : funcionarios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum dado encontrado</div>
              ) : (
                <div className="space-y-2">
                  {funcionarios.map((funcionario) => (
                    <label
                      key={funcionario.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors border ${
                        !isAdmin 
                          ? 'bg-blue-50 border-blue-200 cursor-default' 
                          : 'hover:bg-white cursor-pointer border-transparent hover:border-blue-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={funcionariosSelecionados.includes(funcionario.id)}
                        onChange={() => isAdmin && toggleFuncionario(funcionario.id)}
                        disabled={!isAdmin}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{funcionario.nome}</p>
                        <p className="text-xs text-gray-500">
                          {funcionario.cargo || 'Sem cargo'} • {funcionario.departamento || 'Sem departamento'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Informações */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Informações:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              {isAdmin ? (
                <>
                  <li>Será gerado um PDF para cada funcionário selecionado</li>
                  <li>Como administrador, você pode exportar dados de qualquer funcionário</li>
                </>
              ) : (
                <li>Será gerado um PDF com seus registros de ponto</li>
              )}
              <li>O relatório inclui: datas, horários, intervalos e saldo de horas</li>
              <li>Gráficos visuais são incluídos automaticamente se habilitados nas suas Configurações</li>
              <li>Saldo de horas é calculado considerando 8h/dia trabalhado</li>
              <li>Os arquivos serão baixados automaticamente</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={gerando}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={gerarPDF}
            disabled={gerando || funcionariosSelecionados.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {gerando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Gerando PDFs...
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4" />
                Gerar {funcionariosSelecionados.length > 0 ? `${funcionariosSelecionados.length} ` : ''}Relatório{funcionariosSelecionados.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Erro */}
      {modalError.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
                  <FiAlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900">
                    Erro ao Exportar
                  </h3>
                  <p className="text-sm text-red-600">
                    Código: {modalError.code}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">{modalError.message}</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong>💡 Dica:</strong> Se o erro persistir, verifique sua conexão com a internet e tente novamente. 
                  Para mais informações, consulte o código de erro na documentação.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setModalError({ isOpen: false, message: '', code: '' })}
                className="px-6 py-2 rounded-lg font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {showToast && (
        <div className="fixed bottom-4 right-4 px-6 py-3 bg-green-500 text-white rounded-lg shadow-lg z-[70] animate-slide-up">
          <div className="flex items-center gap-2">
            <FiDownload className="w-5 h-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportPDFModal
