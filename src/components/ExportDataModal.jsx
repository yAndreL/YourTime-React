import { useState, useEffect } from 'react'
import { FiX, FiDownload, FiFileText, FiFile, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi'
import { supabase } from '../config/supabase'
import ExcelJS from 'exceljs'
import { useLanguage } from '../hooks/useLanguage'

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
  const { t, currentLanguage } = useLanguage()
  
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
  const [searchTerm, setSearchTerm] = useState('') // Estado para pesquisa

  // Bloquear scroll do body quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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

        mostrarToast(`${t('export.errorLoadingEmployees')}: ${error.message}`, 'error')
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
    const statusMap = { 
      'A': t('export.approved'), 
      'P': t('export.pending'), 
      'R': t('export.rejected') 
    }
    return statusMap[status] || status
  }

  // ========== GERAR CSV SIMPLES (DADOS BRUTOS) ==========
  const gerarCSVSimples = async () => {
    if (funcionariosSelecionados.length === 0) {
      mostrarToast(t('export.selectAtLeastOne'), 'warning')
      return
    }

    if (!dataInicio || !dataFim) {
      mostrarToast(t('export.selectPeriod'), 'warning')
      return
    }

    try {
      setGerando(true)

      const csvLines = []
      const BOM = '\uFEFF'
      
      const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US'
      
      // Header simples
      csvLines.push(`${t('export.timeRecordsReport')} - ${t('export.rawData').toUpperCase()}`)
      csvLines.push(`${t('export.period')}: ${formatarData(dataInicio)} ${t('dashboard.of')} ${formatarData(dataFim)}`)
      csvLines.push(`${t('export.generatedAt')}: ${new Date().toLocaleString(locale)}`)
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
          csvLines.push(`${t('export.employee')}: ${funcionario.nome} - ${t('export.noRecords')}`)
          csvLines.push('')
          continue
        }

        // Dados do funcionário
        csvLines.push(`${t('export.employee')}: ${escaparCSV(funcionario.nome)}`)
        csvLines.push(`${t('profile.email')}: ${escaparCSV(funcionario.email)}`)
        csvLines.push(`${t('profile.position')}: ${escaparCSV(funcionario.cargo || t('export.notDefined'))}`)
        csvLines.push(`${t('profile.department')}: ${escaparCSV(funcionario.departamento || t('export.notDefined'))}`)
        csvLines.push('')

        // Tabela de registros
        csvLines.push([
          t('export.date'),
          t('export.entry1'),
          t('export.exit1'),
          t('export.entry2'),
          t('export.exit2'),
          t('export.totalHours'),
          t('export.status'),
          t('notifications.project')
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
        ? `${t('export.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.csv`
        : `${t('export.fileName')}_multiple_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.csv`
      
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      mostrarToast(t('export.csvGenerated'), 'success')

    } catch (error) {

      mostrarToast(`${t('export.errorGeneratingCSV')}: ${error.message}`, 'error')
    } finally {
      setGerando(false)
    }
  }

  // ========== GERAR XLSX FORMATADO COM EXCELJS (100% JAVASCRIPT) ==========
  const gerarXLSX = async () => {
    if (funcionariosSelecionados.length === 0) {
      mostrarToast(t('export.selectAtLeastOne'), 'warning')
      return
    }

    if (!dataInicio || !dataFim) {
      mostrarToast(t('export.selectPeriod'), 'warning')
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
        const worksheet = workbook.addWorksheet(t('export.reportTitle'))

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
        headerCell.value = t('export.timeRecordsReport').toUpperCase()
        headerCell.style = headerStyle
        worksheet.getRow(row).height = 30
        row++

        worksheet.mergeCells(`B${row}:H${row}`)
        worksheet.getCell(`B${row}`).value = `${t('export.period')}: ${formatarData(dataInicio)} ${t('dashboard.of')} ${formatarData(dataFim)}`
        worksheet.getCell(`B${row}`).style = { ...cellStyle, alignment: { horizontal: 'center' } }
        row += 2

        // Seção 1: Dados do Funcionário
        worksheet.mergeCells(`B${row}:C${row}`)
        worksheet.getCell(`B${row}`).value = `📋 ${t('common.employee').toUpperCase()}`
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        worksheet.getCell(`B${row}`).value = t('common.field')
        worksheet.getCell(`B${row}`).style = tableHeaderStyle
        worksheet.getCell(`C${row}`).value = t('common.value')
        worksheet.getCell(`C${row}`).style = tableHeaderStyle
        row++

        const dadosFuncionario = [
          [t('profile.name'), funcionario.nome],
          [t('profile.email'), funcionario.email],
          [t('profile.position'), funcionario.cargo || t('export.notDefined')],
          [t('profile.department'), funcionario.departamento || t('export.notDefined')]
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
        worksheet.getCell(`B${row}`).value = `📊 ${t('export.statistics').toUpperCase()}`
        worksheet.getCell(`B${row}`).style = sectionStyle
        
        worksheet.mergeCells(`F${row}:H${row}`)
        worksheet.getCell(`F${row}`).value = `📈 ${t('export.statusDistribution').toUpperCase()}`
        worksheet.getCell(`F${row}`).style = sectionStyle
        row++

        // Headers estatísticas
        worksheet.getCell(`B${row}`).value = t('export.metric')
        worksheet.getCell(`B${row}`).style = tableHeaderStyle
        worksheet.getCell(`C${row}`).value = t('common.value')
        worksheet.getCell(`C${row}`).style = tableHeaderStyle

        worksheet.getCell(`F${row}`).value = t('export.status')
        worksheet.getCell(`F${row}`).style = tableHeaderStyle
        worksheet.getCell(`G${row}`).value = t('export.quantity')
        worksheet.getCell(`G${row}`).style = tableHeaderStyle
        worksheet.getCell(`H${row}`).value = t('export.percentage')
        worksheet.getCell(`H${row}`).style = tableHeaderStyle
        row++

        const startRow = row

        // Dados estatísticas
        const stats = [
          [t('export.totalHours'), formatarHoras(totalHorasTrabalhadas)],
          [t('export.overtimeHours'), formatarHoras(totalHorasExtras)],
          [t('export.workedDays'), diasUteis.toString()],
          [t('export.averagePerDay'), formatarHoras(totalHorasTrabalhadas / diasUteis)]
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
          [t('export.approved'), diasAprovados, ((diasAprovados / diasUteis) * 100).toFixed(1) + '%', 'FF dcfce7', 'FF166534'],
          [t('export.pending'), diasPendentes, ((diasPendentes / diasUteis) * 100).toFixed(1) + '%', 'FFfef3c7', 'FF92400e'],
          [t('export.rejected'), diasRejeitados, ((diasRejeitados / diasUteis) * 100).toFixed(1) + '%', 'FFfee2e2', 'FF991b1b']
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
        worksheet.getCell(`B${row}`).value = `📊 ${t('export.workedHoursPerDay').toUpperCase()}`
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        const horasHeaders = [t('export.date'), t('export.normalHours'), t('export.extraHours'), t('export.total'), t('export.status')]
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
          const statusColor = dia.status === t('export.approved') ? ['FFdcfce7', 'FF166534'] :
                             dia.status === t('export.pending') ? ['FFfef3c7', 'FF92400e'] :
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
        worksheet.getCell(`B${row}`).value = `📝 ${t('export.detailedRecords').toUpperCase()}`
        worksheet.getCell(`B${row}`).style = sectionStyle
        row++

        const detailHeaders = [t('export.date'), t('export.entry1'), t('export.exit1'), t('export.breakStart'), t('export.breakEnd'), 
                              t('export.duration'), t('export.entry2'), t('export.exit2'), t('export.total'), t('export.status'), t('notifications.project')]
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
          const statusColor = reg.status === t('export.approved') ? ['FFdcfce7', 'FF166534'] :
                             reg.status === t('export.pending') ? ['FFfef3c7', 'FF92400e'] :
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
                label: t('export.normalHours'),
                data: horasNormais,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
              },
              {
                label: t('export.extraHours'),
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
                text: `📊 ${t('export.workedHoursPerDay')}`,
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
                title: { display: true, text: t('export.date'), font: { size: 12 } }
              },
              y: {
                stacked: true,
                beginAtZero: true,
                title: { display: true, text: t('dashboard.hours'), font: { size: 12 } },
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
              labels: [`✅ ${t('export.approved')}`, `⏳ ${t('export.pending')}`, `❌ ${t('export.rejected')}`],
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

      // Second worksheet removed - graphs are now embedded in main sheet only      // Gerar arquivo e fazer download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const nomeArquivo = funcionariosSelecionados.length === 1
        ? `${t('export.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.xlsx`
        : `${t('export.fileName')}_multiple_${formatarData(dataInicio)}_a_${formatarData(dataFim)}.xlsx`
      
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      mostrarToast(t('export.excelGenerated'), 'success')

    } catch (error) {

      mostrarToast(`${t('export.errorGeneratingExcel')}: ${error.message}`, 'error')
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
            style={{ marginTop: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">{t('common.exportTitle')}</h2>
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
                  <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
              ) : (
                <>
                  {/* Seleção de Funcionários */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.employees')}
                      </label>
                      
                      {/* Campo de Pesquisa */}
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder={t('admin.searchPlaceholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={funcionariosSelecionados.length === funcionarios.filter(f => 
                              f.nome.toLowerCase().includes(searchTerm.toLowerCase())
                            ).length && funcionarios.filter(f => 
                              f.nome.toLowerCase().includes(searchTerm.toLowerCase())
                            ).length > 0}
                            onChange={toggleTodos}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-700">{t('export.selectAll')}</span>
                        </label>
                        <div className="border-t border-gray-200 my-2"></div>
                        {funcionarios
                          .filter(f => f.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(func => (
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
                        {funcionarios.filter(f => f.nome.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                          <p className="text-center text-gray-500 py-4">{t('export.noEmployeesFound')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Período */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('export.startDate')}
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
                        {t('export.endDate')}
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
                    <span>{t('export.generating')}...</span>
                  </>
                ) : (
                  <>
                    <FiFile className="w-5 h-5" />
                    <span>{t('export.csvButtonLabel')}</span>
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
                    <span>{t('export.generating')}...</span>
                  </>
                ) : (
                  <>
                    <FiFileText className="w-5 h-5" />
                    <span>{t('export.excelButtonLabel')}</span>
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
