import { useState, useEffect } from 'react'
import { FiX, FiDownload, FiFileText, FiFile, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi'
import { supabase } from '../config/supabase'
import ExcelJS from 'exceljs'

// Função auxiliar para gerar gráficos via QuickChart
const gerarGraficoQuickChart = async (config) => {
  const url = 'https://quickchart.io/chart'
  const params = new URLSearchParams({
    c: JSON.stringify(config),
    backgroundColor: 'white',
    width: 600,
    height: 400,
    devicePixelRatio: 2.0
  })
  
  try {
    const response = await fetch(`${url}?${params.toString()}`)
    if (!response.ok) throw new Error('Erro ao gerar gráfico')
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    return arrayBuffer
  } catch (error) {

    return null
  }
}

function ExportDataModal({ isOpen, onClose, isAdmin = false }) {
  // Função para calcular a semana atual (Segunda a Sexta)
  const getWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    const monday = new Date(today)
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    monday.setDate(today.getDate() + diff)
    
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    
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
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success') // 'success', 'error', 'warning'

  // Função auxiliar para mostrar toast
  const mostrarToast = (mensagem, tipo = 'success') => {
    setToastMessage(mensagem)
    setToastType(tipo)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // Carregar funcionários
  useEffect(() => {
    const carregarFuncionarios = async () => {
      try {
        setLoading(true)
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        let query = supabase
          .from('profiles')
          .select('id, nome, email, cargo, departamento')
          .order('nome')

        if (!isAdmin) {
          query = query.eq('id', user.id)
        }

        const { data: funcionariosData, error } = await query

        if (error) throw error

        setFuncionarios(funcionariosData || [])
        
        if (!isAdmin && funcionariosData.length > 0) {
          setFuncionariosSelecionados([funcionariosData[0].id])
        }
      } catch (error) {

        mostrarToast(`Erro ao carregar funcionários: ${error.message}`, 'error')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      carregarFuncionarios()
    }
  }, [isOpen, isAdmin])

  // Funções auxiliares
  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return 0
    const [h1, m1] = entrada.split(':').map(Number)
    const [h2, m2] = saida.split(':').map(Number)
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
    return minutos / 60
  }

  const formatarHoras = (horas) => {
    const h = Math.floor(horas)
    const m = Math.round((horas - h) * 60)
    return `${h}h ${m.toString().padStart(2, '0')}min`
  }

  const formatarData = (data) => {
    if (!data) return ''
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const escaparCSV = (valor) => {
    if (valor === null || valor === undefined) return ''
    const str = String(valor)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const traduzirStatus = (status) => {
    const statusMap = { 'A': 'Aprovado', 'P': 'Pendente', 'R': 'Rejeitado' }
    return statusMap[status] || status
  }

  // ========== GERAR CSV SIMPLES (DADOS BRUTOS) ==========
  const gerarCSVSimples = async () => {
    if (funcionariosSelecionados.length === 0) {
      mostrarToast('Selecione pelo menos um funcionário', 'warning')
      return
    }

    if (!dataInicio || !dataFim) {
      mostrarToast('Selecione o período', 'warning')
      return
    }

    try {
      setGerando(true)

      const csvLines = []
      const BOM = '\uFEFF'
      
      // Header simples
      csvLines.push('RELATÓRIO DE REGISTROS DE PONTO - DADOS BRUTOS')
      csvLines.push(`Período: ${formatarData(dataInicio)} até ${formatarData(dataFim)}`)
      csvLines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`)
      csvLines.push('')

      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId)
        if (!funcionario) continue

        const { data: registros, error } = await supabase
          .from('agendamento')
          .select(`
            *,
            projetos:projeto_id (
              nome
            )
          `)
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true })

        if (error) throw error

        if (registros.length === 0) {
          csvLines.push(`Funcionário: ${funcionario.nome} - Nenhum registro encontrado`)
          csvLines.push('')
          continue
        }

        // Dados do funcionário
        csvLines.push(`Funcionário: ${escaparCSV(funcionario.nome)}`)
        csvLines.push(`Email: ${escaparCSV(funcionario.email)}`)
        csvLines.push(`Cargo: ${escaparCSV(funcionario.cargo || 'Não definido')}`)
        csvLines.push(`Departamento: ${escaparCSV(funcionario.departamento || 'Não definido')}`)
        csvLines.push('')

        // Tabela de registros
        csvLines.push([
          'Data',
          'Entrada 1',
          'Saída 1',
          'Entrada 2',
          'Saída 2',
          'Total Horas',
          'Status',
          'Projeto'
        ].join(','))

        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
          const totalDia = horasJornada1 + horasJornada2

          csvLines.push([
            formatarData(reg.data),
            reg.entrada1 || '',
            reg.saida1 || '',
            reg.entrada2 || '',
            reg.saida2 || '',
            formatarHoras(totalDia),
            traduzirStatus(reg.status),
            escaparCSV(reg.projetos?.nome || '')
          ].join(','))
        })

        csvLines.push('')
        csvLines.push('---')
        csvLines.push('')
      }

      // Download
      const csvContent = BOM + csvLines.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const nomeArquivo = funcionariosSelecionados.length === 1
        ? `registros_ponto_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.csv`
        : `registros_ponto_multiplos_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.csv`
      
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      mostrarToast('CSV gerado com sucesso!', 'success')

    } catch (error) {

      mostrarToast(`Erro ao gerar CSV: ${error.message}`, 'error')
    } finally {
      setGerando(false)
    }
  }

  // ========== GERAR XLSX FORMATADO COM EXCELJS (100% JAVASCRIPT) ==========
  const gerarXLSX = async () => {
    if (funcionariosSelecionados.length === 0) {
      mostrarToast('Selecione pelo menos um funcionário', 'warning')
      return
    }

    if (!dataInicio || !dataFim) {
      mostrarToast('Selecione o período', 'warning')
      return
    }

    try {
      setGerando(true)

      // Criar workbook
      const workbook = new ExcelJS.Workbook()

      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId)
        if (!funcionario) continue

        const { data: registros, error } = await supabase
          .from('agendamento')
          .select(`
            *,
            projetos:projeto_id (
              nome
            )
          `)
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true })

        if (error) throw error

        if (registros.length === 0) continue

        // Calcular estatísticas
        let totalHorasTrabalhadas = 0
        let totalHorasExtras = 0
        let diasUteis = 0
        let diasPendentes = 0
        let diasAprovados = 0
        let diasRejeitados = 0

        const horasPorDia = []
        const registrosDetalhados = []

        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
          const totalDia = horasJornada1 + horasJornada2
          
          totalHorasTrabalhadas += totalDia
          
          if (totalDia > 8) {
            totalHorasExtras += (totalDia - 8)
          }
          
          diasUteis++

          if (reg.status === 'A') diasAprovados++
          else if (reg.status === 'P') diasPendentes++
          else if (reg.status === 'R') diasRejeitados++

          // Horas por dia (para gráfico de barras)
          const horasNormais = Math.min(totalDia, 8)
          const horasExtras = Math.max(totalDia - 8, 0)
          
          horasPorDia.push({
            data: formatarData(reg.data),
            horasNormais: horasNormais.toFixed(2),
            horasExtras: horasExtras.toFixed(2),
            total: totalDia.toFixed(2),
            status: traduzirStatus(reg.status)
          })

          // Registros detalhados
          const intervaloInicio = reg.saida1 || '--:--'
          const intervaloFim = reg.entrada2 || '--:--'
          const duracaoIntervalo = (reg.saida1 && reg.entrada2) 
            ? formatarHoras(calcularHoras(reg.saida1, reg.entrada2))
            : '--'

          registrosDetalhados.push({
            data: formatarData(reg.data),
            entrada1: reg.entrada1 || '--:--',
            saida1: reg.saida1 || '--:--',
            intervaloInicio,
            intervaloFim,
            duracaoIntervalo,
            entrada2: reg.entrada2 || '--:--',
            saida2: reg.saida2 || '--:--',
            totalHoras: formatarHoras(totalDia),
            status: traduzirStatus(reg.status),
            projeto: reg.projetos?.nome || ''
          })
        })

        // ==================== CRIAR PLANILHA COM EXCELJS ====================
        const worksheet = workbook.addWorksheet('Relatório de Ponto')

        // Estilos
        const headerStyle = {
          font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a8a' } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }

        const sectionStyle = {
          font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } },
          alignment: { vertical: 'middle', horizontal: 'left' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }

        const tableHeaderStyle = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF60a5fa' } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }

        const cellStyle = {
          alignment: { vertical: 'middle', horizontal: 'left' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }

        // Configurar larguras
        worksheet.columns = [
          { width: 3 }, // A - margem
          { width: 20 }, // B
          { width: 25 }, // C
          { width: 3 }, // D - espaço
          { width: 3 }, // E - espaço
          { width: 15 }, // F
          { width: 12 }, // G
          { width: 12 }, // H
          { width: 12 }, // I
          { width: 15 }, // J
          { width: 15 }, // K
          { width: 30 } // L
        ]

        let row = 1

        // Header Principal
        worksheet.mergeCells(`B${row}:H${row}`)
        const headerCell = worksheet.getCell(`B${row}`)
        headerCell.value = 'RELATÓRIO DE REGISTROS DE PONTO'
        headerCell.style = headerStyle
        worksheet.getRow(row).height = 30
        row++

        worksheet.mergeCells(`B${row}:H${row}`)
        worksheet.getCell(`B${row}`).value = `Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`
        worksheet.getCell(`B${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
        row += 2

        // Seção 1: Dados do Funcionário
        worksheet.mergeCells(`B${row}:C${row}`)
        worksheet.getCell(`B${row}`).value = '📋 DADOS DO FUNCIONÁRIO'
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        worksheet.getCell(`B${row}`).value = 'Campo'
        worksheet.getCell(`B${row}`).style = tableHeaderStyle
        worksheet.getCell(`C${row}`).value = 'Valor'
        worksheet.getCell(`C${row}`).style = tableHeaderStyle
        row++

        const dadosFuncionario = [
          ['Nome', funcionario.nome],
          ['E-mail', funcionario.email],
          ['Cargo', funcionario.cargo || 'Não definido'],
          ['Departamento', funcionario.departamento || 'Não definido']
        ]

        dadosFuncionario.forEach(([campo, valor]) => {
          worksheet.getCell(`B${row}`).value = campo
          worksheet.getCell(`B${row}`).style = cellStyle
          worksheet.getCell(`C${row}`).value = valor
          worksheet.getCell(`C${row}`).style = cellStyle
          row++
        })

        row += 2

        // Seção 2: Estatísticas
        worksheet.mergeCells(`B${row}:C${row}`)
        worksheet.getCell(`B${row}`).value = '📊 ESTATÍSTICAS DO PERÍODO'
        worksheet.getCell(`B${row}`).style = sectionStyle
        
        worksheet.mergeCells(`F${row}:H${row}`)
        worksheet.getCell(`F${row}`).value = '📈 DISTRIBUIÇÃO POR STATUS'
        worksheet.getCell(`F${row}`).style = sectionStyle
        row++

        // Headers estatísticas
        worksheet.getCell(`B${row}`).value = 'Métrica'
        worksheet.getCell(`B${row}`).style = tableHeaderStyle
        worksheet.getCell(`C${row}`).value = 'Valor'
        worksheet.getCell(`C${row}`).style = tableHeaderStyle

        worksheet.getCell(`F${row}`).value = 'Status'
        worksheet.getCell(`F${row}`).style = tableHeaderStyle
        worksheet.getCell(`G${row}`).value = 'Quantidade'
        worksheet.getCell(`G${row}`).style = tableHeaderStyle
        worksheet.getCell(`H${row}`).value = 'Percentual'
        worksheet.getCell(`H${row}`).style = tableHeaderStyle
        row++

        const startRow = row

        // Dados estatísticas
        const stats = [
          ['Total de Horas Trabalhadas', formatarHoras(totalHorasTrabalhadas)],
          ['Total de Horas Extras', formatarHoras(totalHorasExtras)],
          ['Dias Úteis Trabalhados', diasUteis.toString()],
          ['Média Diária', formatarHoras(totalHorasTrabalhadas / diasUteis)]
        ]

        stats.forEach(([metrica, valor]) => {
          worksheet.getCell(`B${row}`).value = metrica
          worksheet.getCell(`B${row}`).style = cellStyle
          worksheet.getCell(`C${row}`).value = valor
          worksheet.getCell(`C${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          row++
        })

        // Dados status
        row = startRow
        const statusDist = [
          ['Aprovado', diasAprovados, ((diasAprovados / diasUteis) * 100).toFixed(1) + '%', 'FF dcfce7', 'FF166534'],
          ['Pendente', diasPendentes, ((diasPendentes / diasUteis) * 100).toFixed(1) + '%', 'FFfef3c7', 'FF92400e'],
          ['Rejeitado', diasRejeitados, ((diasRejeitados / diasUteis) * 100).toFixed(1) + '%', 'FFfee2e2', 'FF991b1b']
        ].filter(([, qtd]) => qtd > 0)

        statusDist.forEach(([status, qtd, perc, bg, fg]) => {
          const statusCell = worksheet.getCell(`F${row}`)
          statusCell.value = status
          statusCell.style = {
            ...cellStyle,
            alignment: { horizontal: 'center' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg.replace(' ', '') } },
            font: { color: { argb: fg.replace(' ', '') } }
          }

          worksheet.getCell(`G${row}`).value = qtd
          worksheet.getCell(`G${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`H${row}`).value = perc
          worksheet.getCell(`H${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          row++
        })

        row = Math.max(row, startRow + 4) + 2

        // Seção 3: Horas por Dia
        worksheet.mergeCells(`B${row}:H${row}`)
        worksheet.getCell(`B${row}`).value = '📊 HORAS TRABALHADAS POR DIA'
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        const horasHeaders = ['Data', 'Horas Normais', 'Horas Extras', 'Total', 'Status']
        horasHeaders.forEach((header, idx) => {
          const col = String.fromCharCode(66 + idx) // B, C, D, E, F
          worksheet.getCell(`${col}${row}`).value = header
          worksheet.getCell(`${col}${row}`).style = tableHeaderStyle
        })
        row++

        horasPorDia.forEach(dia => {
          worksheet.getCell(`B${row}`).value = dia.data
          worksheet.getCell(`B${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`C${row}`).value = parseFloat(dia.horasNormais)
          worksheet.getCell(`C${row}`).style = { ...cellStyle, alignment: { horizontal: 'right' }, numFmt: '0.00' }
          worksheet.getCell(`D${row}`).value = parseFloat(dia.horasExtras)
          worksheet.getCell(`D${row}`).style = { ...cellStyle, alignment: { horizontal: 'right' }, numFmt: '0.00' }
          worksheet.getCell(`E${row}`).value = parseFloat(dia.total)
          worksheet.getCell(`E${row}`).style = { ...cellStyle, alignment: { horizontal: 'right' }, numFmt: '0.00' }

          const statusCell = worksheet.getCell(`F${row}`)
          statusCell.value = dia.status
          const statusColor = dia.status === 'Aprovado' ? ['FFdcfce7', 'FF166534'] :
                             dia.status === 'Pendente' ? ['FFfef3c7', 'FF92400e'] :
                             ['FFfee2e2', 'FF991b1b']
          statusCell.style = {
            ...cellStyle,
            alignment: { horizontal: 'center' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor[0] } },
            font: { color: { argb: statusColor[1] } }
          }
          row++
        })

        row += 2

        // Seção 4: Registros Detalhados
        worksheet.mergeCells(`B${row}:K${row}`)
        worksheet.getCell(`B${row}`).value = '📝 REGISTROS DETALHADOS - PONTO POR PONTO'
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        const detailHeaders = ['Data', 'Entrada 1', 'Saída 1', 'Intervalo Início', 'Intervalo Fim', 
                              'Duração', 'Entrada 2', 'Saída 2', 'Total', 'Status', 'Projeto']
        detailHeaders.forEach((header, idx) => {
          const col = String.fromCharCode(66 + idx)
          worksheet.getCell(`${col}${row}`).value = header
          worksheet.getCell(`${col}${row}`).style = tableHeaderStyle
        })
        row++

        registrosDetalhados.forEach(reg => {
          worksheet.getCell(`B${row}`).value = reg.data
          worksheet.getCell(`B${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`C${row}`).value = reg.entrada1
          worksheet.getCell(`C${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`D${row}`).value = reg.saida1
          worksheet.getCell(`D${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`E${row}`).value = reg.intervaloInicio
          worksheet.getCell(`E${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`F${row}`).value = reg.intervaloFim
          worksheet.getCell(`F${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`G${row}`).value = reg.duracaoIntervalo
          worksheet.getCell(`G${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`H${row}`).value = reg.entrada2
          worksheet.getCell(`H${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`I${row}`).value = reg.saida2
          worksheet.getCell(`I${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
          worksheet.getCell(`J${row}`).value = reg.totalHoras
          worksheet.getCell(`J${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }

          const statusCell = worksheet.getCell(`K${row}`)
          statusCell.value = reg.status
          const statusColor = reg.status === 'Aprovado' ? ['FFdcfce7', 'FF166534'] :
                             reg.status === 'Pendente' ? ['FFfef3c7', 'FF92400e'] :
                             ['FFfee2e2', 'FF991b1b']
          statusCell.style = {
            ...cellStyle,
            alignment: { horizontal: 'center' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor[0] } },
            font: { color: { argb: statusColor[1] } }
          }

          worksheet.getCell(`L${row}`).value = reg.projeto
          worksheet.getCell(`L${row}`).style = cellStyle
          row++
        })
      }

      // ==================== INSERIR GRÁFICOS NA COLUNA I ====================
      // Vamos adicionar os gráficos na primeira aba (worksheet principal)
      const mainWorksheet = workbook.getWorksheet(1)
      
      // Ajustar larguras das colunas para gráficos (colunas I, J, K, L, M, N, O)
      mainWorksheet.getColumn(9).width = 3  // I - espaço
      mainWorksheet.getColumn(10).width = 10 // J
      mainWorksheet.getColumn(11).width = 10 // K
      mainWorksheet.getColumn(12).width = 10 // L
      mainWorksheet.getColumn(13).width = 10 // M
      mainWorksheet.getColumn(14).width = 10 // N
      mainWorksheet.getColumn(15).width = 10 // O

      // Coletar dados para gráficos
      let graficosData = []
      
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId)
        if (!funcionario) continue

        const { data: registros, error } = await supabase
          .from('agendamento')
          .select(`
            *,
            projetos:projeto_id (
              nome
            )
          `)
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data', { ascending: true })

        if (error || !registros || registros.length === 0) continue

        // Processar dados
        let totalHorasTrabalhadas = 0
        let totalHorasExtras = 0
        let diasAprovados = 0
        let diasPendentes = 0
        let diasRejeitados = 0
        const horasPorDia = []

        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1)
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2)
          const totalDia = horasJornada1 + horasJornada2
          
          totalHorasTrabalhadas += totalDia
          if (totalDia > 8) totalHorasExtras += (totalDia - 8)

          if (reg.status === 'A') diasAprovados++
          else if (reg.status === 'P') diasPendentes++
          else if (reg.status === 'R') diasRejeitados++

          const horasNormais = Math.min(totalDia, 8)
          const horasExtras = Math.max(totalDia - 8, 0)
          
          horasPorDia.push({
            data: formatarData(reg.data),
            horasNormais: parseFloat(horasNormais.toFixed(2)),
            horasExtras: parseFloat(horasExtras.toFixed(2))
          })
        })

        graficosData.push({
          funcionario: funcionario.nome,
          horasPorDia,
          statusDistribution: { diasAprovados, diasPendentes, diasRejeitados },
          totalHorasTrabalhadas,
          totalHorasExtras
        })
      }

      // Gerar e inserir gráficos
      if (graficosData.length > 0) {
        const primeiroFuncionario = graficosData[0]
        
        // === GRÁFICO 1: Horas por Dia (Barras Empilhadas) ===
        const labels = primeiroFuncionario.horasPorDia.map(d => d.data).slice(0, 15) // Limitar a 15 dias
        const horasNormais = primeiroFuncionario.horasPorDia.map(d => d.horasNormais).slice(0, 15)
        const horasExtras = primeiroFuncionario.horasPorDia.map(d => d.horasExtras).slice(0, 15)

        const barChartConfig = {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Horas Normais',
                data: horasNormais,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
              },
              {
                label: 'Horas Extras',
                data: horasExtras,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: '📊 Horas Trabalhadas por Dia',
                font: { size: 18, weight: 'bold' },
                color: '#1e3a8a'
              },
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              x: {
                stacked: true,
                title: { display: true, text: 'Data', font: { size: 12 } }
              },
              y: {
                stacked: true,
                beginAtZero: true,
                title: { display: true, text: 'Horas', font: { size: 12 } },
                ticks: { stepSize: 2 }
              }
            }
          }
        }

        const barChartImage = await gerarGraficoQuickChart(barChartConfig)
        
        if (barChartImage) {
          const imageId1 = workbook.addImage({
            buffer: barChartImage,
            extension: 'png'
          })
          
          mainWorksheet.addImage(imageId1, {
            tl: { col: 8.5, row: 3 },  // Coluna I, linha 4
            ext: { width: 600, height: 400 }
          })
        }

        // === GRÁFICO 2: Status (Pizza) ===
        const { diasAprovados, diasPendentes, diasRejeitados } = primeiroFuncionario.statusDistribution
        const total = diasAprovados + diasPendentes + diasRejeitados

        if (total > 0) {
          const pieChartConfig = {
            type: 'doughnut',
            data: {
              labels: ['✅ Aprovados', '⏳ Pendentes', '❌ Rejeitados'],
              datasets: [{
                data: [diasAprovados, diasPendentes, diasRejeitados],
                backgroundColor: [
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(251, 191, 36, 0.8)',
                  'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                  'rgba(16, 185, 129, 1)',
                  'rgba(251, 191, 36, 1)',
                  'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: '📈 Distribuição por Status',
                  font: { size: 18, weight: 'bold' },
                  color: '#1e3a8a'
                },
                legend: {
                  display: true,
                  position: 'bottom'
                },
                datalabels: {
                  formatter: (value, ctx) => {
                    const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
                    const percentage = ((value * 100) / sum).toFixed(1) + '%'
                    return percentage
                  },
                  color: '#fff',
                  font: { size: 14, weight: 'bold' }
                }
              }
            }
          }

          const pieChartImage = await gerarGraficoQuickChart(pieChartConfig)
          
          if (pieChartImage) {
            const imageId2 = workbook.addImage({
              buffer: pieChartImage,
              extension: 'png'
            })
            
            mainWorksheet.addImage(imageId2, {
              tl: { col: 8.5, row: 28 },  // Coluna I, mais abaixo
              ext: { width: 500, height: 400 }
            })
          }
        }

        // === GRÁFICO 3: Resumo de Horas (Barras Horizontais) ===
        const summaryChartConfig = {
          type: 'bar',
          data: {
            labels: ['Total Trabalhadas', 'Horas Extras'],
            datasets: [{
              label: 'Horas',
              data: [
                parseFloat(primeiroFuncionario.totalHorasTrabalhadas.toFixed(2)),
                parseFloat(primeiroFuncionario.totalHorasExtras.toFixed(2))
              ],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(245, 158, 11, 0.8)'
              ],
              borderColor: [
                'rgba(59, 130, 246, 1)',
                'rgba(245, 158, 11, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: '⏰ Resumo Total de Horas',
                font: { size: 18, weight: 'bold' },
                color: '#1e3a8a'
              },
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                title: { display: true, text: 'Horas', font: { size: 12 } }
              }
            }
          }
        }

        const summaryChartImage = await gerarGraficoQuickChart(summaryChartConfig)
        
        if (summaryChartImage) {
          const imageId3 = workbook.addImage({
            buffer: summaryChartImage,
            extension: 'png'
          })
          
          mainWorksheet.addImage(imageId3, {
            tl: { col: 8.5, row: 53 },  // Coluna I, ainda mais abaixo
            ext: { width: 500, height: 300 }
          })
        }
      }

      // ==================== CRIAR PLANILHA DE GRÁFICOS ====================
      const chartSheet = workbook.addWorksheet('📊 Gráficos')
      
      chartSheet.columns = [
        { width: 3 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 3 }
      ]

      let chartRow = 2

      // Título
      chartSheet.mergeCells(`B${chartRow}:D${chartRow}`)
      const chartTitle = chartSheet.getCell(`B${chartRow}`)
      chartTitle.value = '✅ GRÁFICOS INCLUÍDOS AUTOMATICAMENTE'
      chartTitle.style = {
        font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10b981' } },
        alignment: { vertical: 'middle', horizontal: 'center' }
      }
      chartSheet.getRow(chartRow).height = 30
      chartRow += 2

      // Instruções
      const instructions = [
        '🎉 Os gráficos já foram inseridos automaticamente na coluna I!',
        '',
        '📊 Gráficos incluídos:',
        '   1. Horas Trabalhadas por Dia (Barras Empilhadas)',
        '   2. Distribuição por Status (Pizza/Donut)',
        '   3. Resumo Total de Horas (Barras Horizontais)',
        '',
        '📍 Localização:',
        '   • Vá para a aba "Relatório de Ponto"',
        '   • Role para a direita até a coluna I',
        '   • Os gráficos estão posicionados ao lado das tabelas de dados',
        '',
        '💡 DICA: Os gráficos são imagens PNG de alta qualidade!',
        '💡 Você pode redimensioná-los ou movê-los conforme necessário.',
        '',
        '� Se precisar criar gráficos adicionais:',
        '   • Os dados estão nas tabelas formatadas',
        '   • Use Inserir > Gráfico no Excel/LibreOffice',
        '   • Selecione os dados da tabela desejada'
      ]

      instructions.forEach(instruction => {
        chartSheet.getCell(`B${chartRow}`).value = instruction
        chartSheet.getCell(`B${chartRow}`).style = {
          alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
          font: { size: 11 }
        }
        chartSheet.getRow(chartRow).height = 20
        chartRow++
      })

      chartRow += 2

      // Resumo Visual Colorido
      chartSheet.mergeCells(`B${chartRow}:D${chartRow}`)
      chartSheet.getCell(`B${chartRow}`).value = '📈 RESUMO VISUAL'
      chartSheet.getCell(`B${chartRow}`).style = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } },
        alignment: { vertical: 'middle', horizontal: 'center' }
      }
      chartRow++

      // Coletar dados totais de todos os funcionários
      let totalGeralHoras = 0
      let totalGeralExtras = 0
      let totalGeralAprovados = 0
      let totalGeralPendentes = 0
      let totalGeralRejeitados = 0

      // Reprocessar para obter totais gerais (já temos os dados, vamos somar)
      for (const funcionarioId of funcionariosSelecionados) {
        const { data: registros } = await supabase
          .from('agendamento')
          .select('*')
          .eq('user_id', funcionarioId)
          .gte('data', dataInicio)
          .lte('data', dataFim)

        if (registros) {
          registros.forEach(reg => {
            const totalDia = calcularHoras(reg.entrada1, reg.saida1) + calcularHoras(reg.entrada2, reg.saida2)
            totalGeralHoras += totalDia
            if (totalDia > 8) totalGeralExtras += (totalDia - 8)
            
            if (reg.status === 'A') totalGeralAprovados++
            else if (reg.status === 'P') totalGeralPendentes++
            else if (reg.status === 'R') totalGeralRejeitados++
          })
        }
      }

      chartRow++
      
      // Cards visuais
      const cards = [
        { label: '⏰ Total de Horas', value: formatarHoras(totalGeralHoras), color: 'FF3b82f6', textColor: 'FFFFFFFF' },
        { label: '⚡ Horas Extras', value: formatarHoras(totalGeralExtras), color: 'FFf59e0b', textColor: 'FFFFFFFF' },
        { label: '✅ Aprovados', value: totalGeralAprovados, color: 'FF10b981', textColor: 'FFFFFFFF' },
        { label: '⏳ Pendentes', value: totalGeralPendentes, color: 'FFfbbf24', textColor: 'FF000000' },
        { label: '❌ Rejeitados', value: totalGeralRejeitados, color: 'FFef4444', textColor: 'FFFFFFFF' }
      ]

      cards.forEach(card => {
        chartSheet.getCell(`B${chartRow}`).value = card.label
        chartSheet.getCell(`B${chartRow}`).style = {
          font: { bold: true, color: { argb: card.textColor } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: card.color } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }
        chartSheet.getRow(chartRow).height = 30

        chartSheet.mergeCells(`C${chartRow}:D${chartRow}`)
        chartSheet.getCell(`C${chartRow}`).value = card.value
        chartSheet.getCell(`C${chartRow}`).style = {
          font: { bold: true, size: 14, color: { argb: card.textColor } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: card.color } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          }
        }
        chartRow++
      })

      // Gerar arquivo e fazer download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const nomeArquivo = funcionariosSelecionados.length === 1
        ? `relatorio_ponto_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.xlsx`
        : `relatorio_ponto_multiplos_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.xlsx`
      
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      mostrarToast('XLSX gerado com sucesso!', 'success')

    } catch (error) {

      mostrarToast(`Erro ao gerar XLSX: ${error.message}`, 'error')
    } finally {
      setGerando(false)
    }
  }

  // Toggle seleção de funcionário
  const toggleFuncionario = (id) => {
    setFuncionariosSelecionados(prev =>
      prev.includes(id)
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    )
  }

  // Selecionar/Desselecionar todos
  const toggleTodos = () => {
    if (funcionariosSelecionados.length === funcionarios.length) {
      setFuncionariosSelecionados([])
    } else {
      setFuncionariosSelecionados(funcionarios.map(f => f.id))
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-0"
        style={{ position: 'fixed', margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      >
        {/* Modal Container - Wrapper com padding */}
        <div className="p-4 w-full h-full flex items-center justify-center pointer-events-none">
          {/* Modal Content */}
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Exportar Registros</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={gerando}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
              ) : (
                <>
                  {/* Seleção de Funcionários */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Funcionários
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={funcionariosSelecionados.length === funcionarios.length}
                            onChange={toggleTodos}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-700">Selecionar Todos</span>
                        </label>
                        <div className="border-t border-gray-200 my-2"></div>
                        {funcionarios.map(func => (
                          <label
                            key={func.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={funcionariosSelecionados.includes(func.id)}
                              onChange={() => toggleFuncionario(func.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{func.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={gerando}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={gerando}
                      />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="font-medium text-blue-900 mb-2">📄 Escolha o formato:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>CSV</strong> - Dados brutos, para análise/integração</li>
                      <li>• <strong>XLSX</strong> - Relatório visual com tabelas, cores e gráficos</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer com 2 botões */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={gerarCSVSimples}
                disabled={gerando || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {gerando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FiFile className="w-5 h-5" />
                    <span>Exportar CSV (Dados Brutos)</span>
                  </>
                )}
              </button>

              <button
                onClick={gerarXLSX}
                disabled={gerando || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {gerando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FiFileText className="w-5 h-5" />
                    <span>Exportar XLSX (Relatório)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-[10001] animate-slide-up ${
          toastType === 'success' ? 'bg-green-500 text-white' :
          toastType === 'error' ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toastType === 'success' && <FiCheckCircle className="w-5 h-5" />}
            {toastType === 'error' && <FiXCircle className="w-5 h-5" />}
            {toastType === 'warning' && <FiAlertTriangle className="w-5 h-5" />}
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default ExportDataModal
