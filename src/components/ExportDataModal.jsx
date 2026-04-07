import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import { supabase } from '../config/supabase';
import BatidaService from '../services/BatidaService';
import { useLanguage } from '../hooks/useLanguage';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useToast } from '../hooks/useToast';
import { formatarData } from '../utils/dateUtils';
import Modal from './ui/Modal';
import { montarCaminhoAssociacaoBatidasComPeriodo } from '../utils/intervaloUrlBatidasSemProjeto';
import { registrarMetricaProdutoBatidas } from '../utils/metricaProdutoBatidas';
const gerarGraficoQuickChart = async config => {
  const url = 'https://quickchart.io/chart';
  const params = new URLSearchParams({
    c: JSON.stringify(config),
    backgroundColor: 'white',
    width: 600,
    height: 400,
    devicePixelRatio: 2.0
  });
  try {
    const response = await fetch(`${url}?${params.toString()}`);
    if (!response.ok) throw new Error('Erro ao gerar gráfico');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    return null;
  }
};
function ExportDataModal({
  isOpen,
  onClose,
  isAdmin = false
}) {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const { showSuccess, showError, showWarning } = useToast();
  const obterIntervaloSemana = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return {
      inicio: formatarData(monday, 'YYYY-MM-DD'),
      fim: formatarData(friday, 'YYYY-MM-DD')
    };
  };
  const intervaloSemana = obterIntervaloSemana();
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([]);
  const [dataInicio, setDataInicio] = useState(intervaloSemana.inicio);
  const [dataFim, setDataFim] = useState(intervaloSemana.fim);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [avisoBatidasSemProjeto, setAvisoBatidasSemProjeto] = useState({
    aberto: false,
    quantidade: 0,
    proximaAcao: null
  });
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  useEffect(() => {
    const carregarFuncionarios = async () => {
      try {
        setCarregando(true);
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        const {
          data: perfilUsuario
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
        let consulta = supabase.from('profiles').select('id, nome, email, cargo, departamento, superior_empresa_id').order('nome');
        if (perfilUsuario?.superior_empresa_id) {
          consulta = consulta.eq('superior_empresa_id', perfilUsuario.superior_empresa_id);
        }
        if (!isAdmin) {
          consulta = consulta.eq('id', user.id);
        }
        const {
          data: dadosFuncionarios,
          error
        } = await consulta;
        if (error) throw error;
        setFuncionarios(dadosFuncionarios || []);
        if (!isAdmin && dadosFuncionarios.length > 0) {
          setFuncionariosSelecionados([dadosFuncionarios[0].id]);
        }
      } catch (error) {
        showError(`${t('exportacao.errorLoadingEmployees')}: ${error.message}`);
      } finally {
        setCarregando(false);
      }
    };
    if (isOpen) {
      carregarFuncionarios();
    }
  }, [isOpen, isAdmin]);
  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return 0;
    const [h1, m1] = entrada.split(':').map(Number);
    const [h2, m2] = saida.split(':').map(Number);
    const minutos = h2 * 60 + m2 - (h1 * 60 + m1);
    return minutos / 60;
  };
  const formatarHoras = horas => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  };
  const formatarStringIsoParaExibicao = data => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const escaparCSV = valor => {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const traduzirStatus = status => {
    const mapaStatus = {
      'A': t('exportacao.approved'),
      'P': t('exportacao.pending'),
      'R': t('exportacao.rejected')
    };
    return mapaStatus[status] || status;
  };
  const gerarCSVSimples = async (opcoes = {}) => {
    if (funcionariosSelecionados.length === 0) {
      showWarning(t('exportacao.selectAtLeastOne'));
      return;
    }
    if (!dataInicio || !dataFim) {
      showWarning(t('exportacao.selectPeriod'));
      return;
    }
    if (!opcoes.ignorarPreCheckBatidas) {
      const verificacao = await BatidaService.verificarBatidasSemProjetoAntesExportacao(
        funcionariosSelecionados,
        dataInicio,
        dataFim,
        fusoHorario
      );
      if (!verificacao.success) {
        showError(verificacao.error || t('comum.error'));
        return;
      }
      if (verificacao.deveBloquear) {
        showError(t('batidaProjeto.exportTexto').replace('{count}', String(verificacao.quantidadePendencias)));
        return;
      }
      if (verificacao.possuiPendencias) {
        registrarMetricaProdutoBatidas('export_aviso_batidas_sem_projeto', {
          quantidade: verificacao.quantidadePendencias,
          formato: 'csv'
        });
        setAvisoBatidasSemProjeto({
          aberto: true,
          quantidade: verificacao.quantidadePendencias,
          proximaAcao: 'csv'
        });
        return;
      }
    }
    try {
      setGerando(true);
      const csvLines = [];
      const BOM = '\uFEFF';
      const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
      csvLines.push(`${t('exportacao.timeRecordsReport')} - ${t('exportacao.rawData').toUpperCase()}`);
      csvLines.push(`${t('exportacao.period')}: ${formatarStringIsoParaExibicao(dataInicio)} ${t('painel.of')} ${formatarStringIsoParaExibicao(dataFim)}`);
      csvLines.push(`${t('exportacao.generatedAt')}: ${new Date().toLocaleString(locale)}`);
      csvLines.push('');
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        if (!funcionario) continue;
        const {
          data: registros,
          error
        } = await supabase.from('agendamento').select(`
            *,
            projetos:projeto_id (
              nome
            )
          `).eq('user_id', funcionarioId).gte('data', dataInicio).lte('data', dataFim).order('data', {
          ascending: true
        });
        if (error) throw error;
        if (registros.length === 0) {
          csvLines.push(`${t('exportacao.employee')}: ${funcionario.nome} - ${t('exportacao.noRecords')}`);
          csvLines.push('');
          continue;
        }
        csvLines.push(`${t('exportacao.employee')}: ${escaparCSV(funcionario.nome)}`);
        csvLines.push(`${t('perfil.email')}: ${escaparCSV(funcionario.email)}`);
        csvLines.push(`${t('perfil.position')}: ${escaparCSV(funcionario.cargo || t('exportacao.notDefined'))}`);
        csvLines.push(`${t('perfil.department')}: ${escaparCSV(funcionario.departamento || t('exportacao.notDefined'))}`);
        csvLines.push('');
        csvLines.push([t('exportacao.date'), t('exportacao.entry1'), t('exportacao.exit1'), t('exportacao.entry2'), t('exportacao.exit2'), t('exportacao.totalHours'), t('exportacao.status'), t('notificacoes.project')].join(','));
        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
          const totalDia = horasJornada1 + horasJornada2;
          csvLines.push([formatarStringIsoParaExibicao(reg.data), reg.entrada1 || '', reg.saida1 || '', reg.entrada2 || '', reg.saida2 || '', formatarHoras(totalDia), traduzirStatus(reg.status), escaparCSV(reg.projetos?.nome || '')].join(','));
        });
        csvLines.push('');
        csvLines.push('---');
        csvLines.push('');
      }
      const csvContent = BOM + csvLines.join('\n');
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nomeArquivo = funcionariosSelecionados.length === 1 ? `${t('exportacao.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarStringIsoParaExibicao(dataInicio)}_a_${formatarStringIsoParaExibicao(dataFim)}.csv` : `${t('exportacao.fileName')}_multiple_${formatarStringIsoParaExibicao(dataInicio)}_a_${formatarStringIsoParaExibicao(dataFim)}.csv`;
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(t('exportacao.csvGenerated'));
    } catch (error) {
      showError(`${t('exportacao.errorGeneratingCSV')}: ${error.message}`);
    } finally {
      setGerando(false);
    }
  };
  const gerarXLSX = async (opcoes = {}) => {
    if (funcionariosSelecionados.length === 0) {
      showWarning(t('exportacao.selectAtLeastOne'));
      return;
    }
    if (!dataInicio || !dataFim) {
      showWarning(t('exportacao.selectPeriod'));
      return;
    }
    if (!opcoes.ignorarPreCheckBatidas) {
      const verificacao = await BatidaService.verificarBatidasSemProjetoAntesExportacao(
        funcionariosSelecionados,
        dataInicio,
        dataFim,
        fusoHorario
      );
      if (!verificacao.success) {
        showError(verificacao.error || t('comum.error'));
        return;
      }
      if (verificacao.deveBloquear) {
        showError(t('batidaProjeto.exportTexto').replace('{count}', String(verificacao.quantidadePendencias)));
        return;
      }
      if (verificacao.possuiPendencias) {
        registrarMetricaProdutoBatidas('export_aviso_batidas_sem_projeto', {
          quantidade: verificacao.quantidadePendencias,
          formato: 'xlsx'
        });
        setAvisoBatidasSemProjeto({
          aberto: true,
          quantidade: verificacao.quantidadePendencias,
          proximaAcao: 'xlsx'
        });
        return;
      }
    }
    try {
      setGerando(true);
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        if (!funcionario) continue;
        const {
          data: registros,
          error
        } = await supabase.from('agendamento').select(`
            *,
            projetos:projeto_id (
              nome
            )
          `).eq('user_id', funcionarioId).gte('data', dataInicio).lte('data', dataFim).order('data', {
          ascending: true
        });
        if (error) throw error;
        if (registros.length === 0) continue;
        let totalHorasTrabalhadas = 0;
        let totalHorasExtras = 0;
        let diasUteis = 0;
        let diasPendentes = 0;
        let diasAprovados = 0;
        let diasRejeitados = 0;
        const horasPorDia = [];
        const registrosDetalhados = [];
        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
          const totalDia = horasJornada1 + horasJornada2;
          totalHorasTrabalhadas += totalDia;
          if (totalDia > 8) {
            totalHorasExtras += totalDia - 8;
          }
          diasUteis++;
          if (reg.status === 'A') diasAprovados++;else if (reg.status === 'P') diasPendentes++;else if (reg.status === 'R') diasRejeitados++;
          const horasNormais = Math.min(totalDia, 8);
          const horasExtras = Math.max(totalDia - 8, 0);
          horasPorDia.push({
            data: formatarStringIsoParaExibicao(reg.data),
            horasNormais: horasNormais.toFixed(2),
            horasExtras: horasExtras.toFixed(2),
            total: totalDia.toFixed(2),
            status: traduzirStatus(reg.status)
          });
          const intervaloInicio = reg.saida1 || '--:--';
          const intervaloFim = reg.entrada2 || '--:--';
          const duracaoIntervalo = reg.saida1 && reg.entrada2 ? formatarHoras(calcularHoras(reg.saida1, reg.entrada2)) : '--';
          registrosDetalhados.push({
            data: formatarStringIsoParaExibicao(reg.data),
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
          });
        });
        const worksheet = workbook.addWorksheet(t('exportacao.reportTitle'));
        const headerStyle = {
          font: {
            bold: true,
            size: 16,
            color: {
              argb: 'FFFFFFFF'
            }
          },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FF1e3a8a'
            }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'center'
          },
          border: {
            top: {
              style: 'thin'
            },
            bottom: {
              style: 'thin'
            },
            left: {
              style: 'thin'
            },
            right: {
              style: 'thin'
            }
          }
        };
        const sectionStyle = {
          font: {
            bold: true,
            size: 12,
            color: {
              argb: 'FFFFFFFF'
            }
          },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FF3b82f6'
            }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'left'
          },
          border: {
            top: {
              style: 'thin'
            },
            bottom: {
              style: 'thin'
            },
            left: {
              style: 'thin'
            },
            right: {
              style: 'thin'
            }
          }
        };
        const tableHeaderStyle = {
          font: {
            bold: true,
            color: {
              argb: 'FFFFFFFF'
            }
          },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FF60a5fa'
            }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'center'
          },
          border: {
            top: {
              style: 'thin'
            },
            bottom: {
              style: 'thin'
            },
            left: {
              style: 'thin'
            },
            right: {
              style: 'thin'
            }
          }
        };
        const cellStyle = {
          alignment: {
            vertical: 'middle',
            horizontal: 'left'
          },
          border: {
            top: {
              style: 'thin'
            },
            bottom: {
              style: 'thin'
            },
            left: {
              style: 'thin'
            },
            right: {
              style: 'thin'
            }
          }
        };
        worksheet.columns = [{
          width: 3
        }, {
          width: 20
        }, {
          width: 25
        }, {
          width: 3
        }, {
          width: 3
        }, {
          width: 15
        }, {
          width: 12
        }, {
          width: 12
        }, {
          width: 12
        }, {
          width: 15
        }, {
          width: 15
        }, {
          width: 30
        }];
        let row = 1;
        worksheet.mergeCells(`B${row}:H${row}`);
        const headerCell = worksheet.getCell(`B${row}`);
        headerCell.value = t('exportacao.timeRecordsReport').toUpperCase();
        headerCell.style = headerStyle;
        worksheet.getRow(row).height = 30;
        row++;
        worksheet.mergeCells(`B${row}:H${row}`);
        worksheet.getCell(`B${row}`).value = `${t('exportacao.period')}: ${formatarStringIsoParaExibicao(dataInicio)} ${t('painel.of')} ${formatarStringIsoParaExibicao(dataFim)}`;
        worksheet.getCell(`B${row}`).style = {
          ...cellStyle,
          alignment: {
            horizontal: 'center'
          }
        };
        row += 2;
        worksheet.mergeCells(`B${row}:C${row}`);
        worksheet.getCell(`B${row}`).value = t('comum.employee').toUpperCase();
        worksheet.getCell(`B${row}`).style = sectionStyle;
        row++;
        worksheet.getCell(`B${row}`).value = t('comum.field');
        worksheet.getCell(`B${row}`).style = tableHeaderStyle;
        worksheet.getCell(`C${row}`).value = t('comum.value');
        worksheet.getCell(`C${row}`).style = tableHeaderStyle;
        row++;
        const dadosFuncionario = [[t('perfil.name'), funcionario.nome], [t('perfil.email'), funcionario.email], [t('perfil.position'), funcionario.cargo || t('exportacao.notDefined')], [t('perfil.department'), funcionario.departamento || t('exportacao.notDefined')]];
        dadosFuncionario.forEach(([campo, valor]) => {
          worksheet.getCell(`B${row}`).value = campo;
          worksheet.getCell(`B${row}`).style = cellStyle;
          worksheet.getCell(`C${row}`).value = valor;
          worksheet.getCell(`C${row}`).style = cellStyle;
          row++;
        });
        row += 2;
        worksheet.mergeCells(`B${row}:C${row}`);
        worksheet.getCell(`B${row}`).value = t('exportacao.statistics').toUpperCase();
        worksheet.getCell(`B${row}`).style = sectionStyle;
        worksheet.mergeCells(`F${row}:H${row}`);
        worksheet.getCell(`F${row}`).value = `📈 ${t('exportacao.statusDistribution').toUpperCase()}`;
        worksheet.getCell(`F${row}`).style = sectionStyle;
        row++;
        worksheet.getCell(`B${row}`).value = t('exportacao.metric');
        worksheet.getCell(`B${row}`).style = tableHeaderStyle;
        worksheet.getCell(`C${row}`).value = t('comum.value');
        worksheet.getCell(`C${row}`).style = tableHeaderStyle;
        worksheet.getCell(`F${row}`).value = t('exportacao.status');
        worksheet.getCell(`F${row}`).style = tableHeaderStyle;
        worksheet.getCell(`G${row}`).value = t('exportacao.quantity');
        worksheet.getCell(`G${row}`).style = tableHeaderStyle;
        worksheet.getCell(`H${row}`).value = t('exportacao.percentage');
        worksheet.getCell(`H${row}`).style = tableHeaderStyle;
        row++;
        const startRow = row;
        const stats = [[t('exportacao.totalHours'), formatarHoras(totalHorasTrabalhadas)], [t('exportacao.overtimeHours'), formatarHoras(totalHorasExtras)], [t('exportacao.workedDays'), diasUteis.toString()], [t('exportacao.averagePerDay'), formatarHoras(totalHorasTrabalhadas / diasUteis)]];
        stats.forEach(([metrica, valor]) => {
          worksheet.getCell(`B${row}`).value = metrica;
          worksheet.getCell(`B${row}`).style = cellStyle;
          worksheet.getCell(`C${row}`).value = valor;
          worksheet.getCell(`C${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          row++;
        });
        row = startRow;
        const statusDist = [[t('exportacao.approved'), diasAprovados, (diasAprovados / diasUteis * 100).toFixed(1) + '%', 'FF dcfce7', 'FF166534'], [t('exportacao.pending'), diasPendentes, (diasPendentes / diasUteis * 100).toFixed(1) + '%', 'FFfef3c7', 'FF92400e'], [t('exportacao.rejected'), diasRejeitados, (diasRejeitados / diasUteis * 100).toFixed(1) + '%', 'FFfee2e2', 'FF991b1b']].filter(([, qtd]) => qtd > 0);
        statusDist.forEach(([status, qtd, perc, bg, fg]) => {
          const statusCell = worksheet.getCell(`F${row}`);
          statusCell.value = status;
          statusCell.style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: bg.replace(' ', '')
              }
            },
            font: {
              color: {
                argb: fg.replace(' ', '')
              }
            }
          };
          worksheet.getCell(`G${row}`).value = qtd;
          worksheet.getCell(`G${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`H${row}`).value = perc;
          worksheet.getCell(`H${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          row++;
        });
        row = Math.max(row, startRow + 4) + 2;
        worksheet.mergeCells(`B${row}:H${row}`);
        worksheet.getCell(`B${row}`).value = t('exportacao.workedHoursPerDay').toUpperCase();
        worksheet.getCell(`B${row}`).style = sectionStyle;
        row++;
        const horasHeaders = [t('exportacao.date'), t('exportacao.normalHours'), t('exportacao.extraHours'), t('exportacao.total'), t('exportacao.status')];
        horasHeaders.forEach((header, idx) => {
          const col = String.fromCharCode(66 + idx);
          worksheet.getCell(`${col}${row}`).value = header;
          worksheet.getCell(`${col}${row}`).style = tableHeaderStyle;
        });
        row++;
        horasPorDia.forEach(dia => {
          worksheet.getCell(`B${row}`).value = dia.data;
          worksheet.getCell(`B${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`C${row}`).value = parseFloat(dia.horasNormais);
          worksheet.getCell(`C${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'right'
            },
            numFmt: '0.00'
          };
          worksheet.getCell(`D${row}`).value = parseFloat(dia.horasExtras);
          worksheet.getCell(`D${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'right'
            },
            numFmt: '0.00'
          };
          worksheet.getCell(`E${row}`).value = parseFloat(dia.total);
          worksheet.getCell(`E${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'right'
            },
            numFmt: '0.00'
          };
          const statusCell = worksheet.getCell(`F${row}`);
          statusCell.value = dia.status;
          const statusColor = dia.status === t('exportacao.approved') ? ['FFdcfce7', 'FF166534'] : dia.status === t('exportacao.pending') ? ['FFfef3c7', 'FF92400e'] : ['FFfee2e2', 'FF991b1b'];
          statusCell.style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: statusColor[0]
              }
            },
            font: {
              color: {
                argb: statusColor[1]
              }
            }
          };
          row++;
        });
        row += 2;
        worksheet.mergeCells(`B${row}:K${row}`);
        worksheet.getCell(`B${row}`).value = `📝 ${t('exportacao.detailedRecords').toUpperCase()}`;
        worksheet.getCell(`B${row}`).style = sectionStyle;
        row++;
        const detailHeaders = [t('exportacao.date'), t('exportacao.entry1'), t('exportacao.exit1'), t('exportacao.breakStart'), t('exportacao.breakEnd'), t('exportacao.duration'), t('exportacao.entry2'), t('exportacao.exit2'), t('exportacao.total'), t('exportacao.status'), t('notificacoes.project')];
        detailHeaders.forEach((header, idx) => {
          const col = String.fromCharCode(66 + idx);
          worksheet.getCell(`${col}${row}`).value = header;
          worksheet.getCell(`${col}${row}`).style = tableHeaderStyle;
        });
        row++;
        registrosDetalhados.forEach(reg => {
          worksheet.getCell(`B${row}`).value = reg.data;
          worksheet.getCell(`B${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`C${row}`).value = reg.entrada1;
          worksheet.getCell(`C${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`D${row}`).value = reg.saida1;
          worksheet.getCell(`D${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`E${row}`).value = reg.intervaloInicio;
          worksheet.getCell(`E${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`F${row}`).value = reg.intervaloFim;
          worksheet.getCell(`F${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`G${row}`).value = reg.duracaoIntervalo;
          worksheet.getCell(`G${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`H${row}`).value = reg.entrada2;
          worksheet.getCell(`H${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`I${row}`).value = reg.saida2;
          worksheet.getCell(`I${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          worksheet.getCell(`J${row}`).value = reg.totalHoras;
          worksheet.getCell(`J${row}`).style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            }
          };
          const statusCell = worksheet.getCell(`K${row}`);
          statusCell.value = reg.status;
          const statusColor = reg.status === t('exportacao.approved') ? ['FFdcfce7', 'FF166534'] : reg.status === t('exportacao.pending') ? ['FFfef3c7', 'FF92400e'] : ['FFfee2e2', 'FF991b1b'];
          statusCell.style = {
            ...cellStyle,
            alignment: {
              horizontal: 'center'
            },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: statusColor[0]
              }
            },
            font: {
              color: {
                argb: statusColor[1]
              }
            }
          };
          worksheet.getCell(`L${row}`).value = reg.projeto;
          worksheet.getCell(`L${row}`).style = cellStyle;
          row++;
        });
      }
      const mainWorksheet = workbook.getWorksheet(1);
      mainWorksheet.getColumn(9).width = 3;
      mainWorksheet.getColumn(10).width = 10;
      mainWorksheet.getColumn(11).width = 10;
      mainWorksheet.getColumn(12).width = 10;
      mainWorksheet.getColumn(13).width = 10;
      mainWorksheet.getColumn(14).width = 10;
      mainWorksheet.getColumn(15).width = 10;
      let graficosData = [];
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        if (!funcionario) continue;
        const {
          data: registros,
          error
        } = await supabase.from('agendamento').select(`
            *,
            projetos:projeto_id (
              nome
            )
          `).eq('user_id', funcionarioId).gte('data', dataInicio).lte('data', dataFim).order('data', {
          ascending: true
        });
        if (error || !registros || registros.length === 0) continue;
        let totalHorasTrabalhadas = 0;
        let totalHorasExtras = 0;
        let diasAprovados = 0;
        let diasPendentes = 0;
        let diasRejeitados = 0;
        const horasPorDia = [];
        registros.forEach(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
          const totalDia = horasJornada1 + horasJornada2;
          totalHorasTrabalhadas += totalDia;
          if (totalDia > 8) totalHorasExtras += totalDia - 8;
          if (reg.status === 'A') diasAprovados++;else if (reg.status === 'P') diasPendentes++;else if (reg.status === 'R') diasRejeitados++;
          const horasNormais = Math.min(totalDia, 8);
          const horasExtras = Math.max(totalDia - 8, 0);
          horasPorDia.push({
            data: formatarStringIsoParaExibicao(reg.data),
            horasNormais: parseFloat(horasNormais.toFixed(2)),
            horasExtras: parseFloat(horasExtras.toFixed(2))
          });
        });
        graficosData.push({
          funcionario: funcionario.nome,
          horasPorDia,
          statusDistribution: {
            diasAprovados,
            diasPendentes,
            diasRejeitados
          },
          totalHorasTrabalhadas,
          totalHorasExtras
        });
      }
      if (graficosData.length > 0) {
        const primeiroFuncionario = graficosData[0];
        const labels = primeiroFuncionario.horasPorDia.map(d => d.data).slice(0, 15);
        const horasNormais = primeiroFuncionario.horasPorDia.map(d => d.horasNormais).slice(0, 15);
        const horasExtras = primeiroFuncionario.horasPorDia.map(d => d.horasExtras).slice(0, 15);
        const barChartConfig = {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: t('exportacao.normalHours'),
              data: horasNormais,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1
            }, {
              label: t('exportacao.extraHours'),
              data: horasExtras,
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              borderColor: 'rgba(245, 158, 11, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `📊 ${t('exportacao.workedHoursPerDay')}`,
                font: {
                  size: 18,
                  weight: 'bold'
                },
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
                title: {
                  display: true,
                  text: t('exportacao.date'),
                  font: {
                    size: 12
                  }
                }
              },
              y: {
                stacked: true,
                beginAtZero: true,
                title: {
                  display: true,
                  text: t('painel.hours'),
                  font: {
                    size: 12
                  }
                },
                ticks: {
                  stepSize: 2
                }
              }
            }
          }
        };
        const barChartImage = await gerarGraficoQuickChart(barChartConfig);
        if (barChartImage) {
          const imageId1 = workbook.addImage({
            buffer: barChartImage,
            extension: 'png'
          });
          mainWorksheet.addImage(imageId1, {
            tl: {
              col: 8.5,
              row: 3
            },
            ext: {
              width: 600,
              height: 400
            }
          });
        }
        const {
          diasAprovados,
          diasPendentes,
          diasRejeitados
        } = primeiroFuncionario.statusDistribution;
        const total = diasAprovados + diasPendentes + diasRejeitados;
        if (total > 0) {
          const pieChartConfig = {
            type: 'doughnut',
            data: {
              labels: [t('exportacao.approved'), t('exportacao.pending'), t('exportacao.rejected')],
              datasets: [{
                data: [diasAprovados, diasPendentes, diasRejeitados],
                backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                borderColor: ['rgba(16, 185, 129, 1)', 'rgba(251, 191, 36, 1)', 'rgba(239, 68, 68, 1)'],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: '📈 Distribuição por Status',
                  font: {
                    size: 18,
                    weight: 'bold'
                  },
                  color: '#1e3a8a'
                },
                legend: {
                  display: true,
                  position: 'bottom'
                },
                datalabels: {
                  formatter: (value, ctx) => {
                    const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = (value * 100 / sum).toFixed(1) + '%';
                    return percentage;
                  },
                  color: '#fff',
                  font: {
                    size: 14,
                    weight: 'bold'
                  }
                }
              }
            }
          };
          const pieChartImage = await gerarGraficoQuickChart(pieChartConfig);
          if (pieChartImage) {
            const imageId2 = workbook.addImage({
              buffer: pieChartImage,
              extension: 'png'
            });
            mainWorksheet.addImage(imageId2, {
              tl: {
                col: 8.5,
                row: 28
              },
              ext: {
                width: 500,
                height: 400
              }
            });
          }
        }
        const summaryChartConfig = {
          type: 'bar',
          data: {
            labels: ['Total Trabalhadas', 'Horas Extras'],
            datasets: [{
              label: 'Horas',
              data: [parseFloat(primeiroFuncionario.totalHorasTrabalhadas.toFixed(2)), parseFloat(primeiroFuncionario.totalHorasExtras.toFixed(2))],
              backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)'],
              borderColor: ['rgba(59, 130, 246, 1)', 'rgba(245, 158, 11, 1)'],
              borderWidth: 2
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `${t('exportacao.totalHoursSummary')}`,
                font: {
                  size: 18,
                  weight: 'bold'
                },
                color: '#1e3a8a'
              },
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Horas',
                  font: {
                    size: 12
                  }
                }
              }
            }
          }
        };
        const summaryChartImage = await gerarGraficoQuickChart(summaryChartConfig);
        if (summaryChartImage) {
          const imageId3 = workbook.addImage({
            buffer: summaryChartImage,
            extension: 'png'
          });
          mainWorksheet.addImage(imageId3, {
            tl: {
              col: 8.5,
              row: 53
            },
            ext: {
              width: 500,
              height: 300
            }
          });
        }
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nomeArquivo = funcionariosSelecionados.length === 1 ? `${t('exportacao.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome?.replace(/\s+/g, '_')}_${formatarStringIsoParaExibicao(dataInicio)}_a_${formatarStringIsoParaExibicao(dataFim)}.xlsx` : `${t('exportacao.fileName')}_multiple_${formatarStringIsoParaExibicao(dataInicio)}_a_${formatarStringIsoParaExibicao(dataFim)}.xlsx`;
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(t('exportacao.excelGenerated'));
    } catch (error) {
      showError(`${t('exportacao.errorGeneratingExcel')}: ${error.message}`);
    } finally {
      setGerando(false);
    }
  };
  const alternarFuncionario = id => {
    setFuncionariosSelecionados(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };
  const alternarTodos = () => {
    if (funcionariosSelecionados.length === funcionarios.length) {
      setFuncionariosSelecionados([]);
    } else {
      setFuncionariosSelecionados(funcionarios.map(f => f.id));
    }
  };
  if (!isOpen) return null;
  return <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-0" style={{
      position: 'fixed',
      margin: 0,
      padding: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }} onClick={onClose}>
        <div className="p-4 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="yt-modal-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto pointer-events-auto" style={{
          marginTop: 0
        }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('comum.exportTitle')}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" disabled={gerando}>
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {carregando ? <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">{t('comum.carregando')}</p>
                </div> : <>
                  {isAdmin && <div>
                      <label className="block text-sm font-medium yt-label mb-2">
                        {t('administracao.employees')}
                      </label>
                      
                      <div className="mb-3">
                        <input type="text" placeholder={t('administracao.searchPlaceholder')} value={termoBusca} onChange={e => setTermoBusca(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 yt-field" />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 space-y-2 yt-inset">
                        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 p-2 rounded">
                          <input type="checkbox" checked={funcionariosSelecionados.length === funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).length && funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).length > 0} onChange={alternarTodos} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" />
                          <span className="font-medium yt-label">{t('exportacao.selectAll')}</span>
                        </label>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        {funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).map(func => <label key={func.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 p-2 rounded">
                            <input type="checkbox" checked={funcionariosSelecionados.includes(func.id)} onChange={() => alternarFuncionario(func.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" />
                            <span className="yt-label">{func.nome}</span>
                          </label>)}
                        {funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('exportacao.noEmployeesFound')}</p>}
                      </div>
                    </div>}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium yt-label mb-2">
                        {t('exportacao.startDate')}
                      </label>
                      <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 yt-field" disabled={gerando} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium yt-label mb-2">
                        {t('exportacao.endDate')}
                      </label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 yt-field" disabled={gerando} />
                    </div>
                  </div>
                </>}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
              <button onClick={gerarCSVSimples} disabled={gerando || carregando} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium">
                {gerando ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('exportacao.generating')}...</span>
                  </> : <>
                    <FiFile className="w-5 h-5" />
                    <span>{t('exportacao.csvButtonLabel')}</span>
                  </>}
              </button>

              <button onClick={gerarXLSX} disabled={gerando || carregando} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium">
                {gerando ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('exportacao.generating')}...</span>
                  </> : <>
                    <FiFileText className="w-5 h-5" />
                    <span>{t('exportacao.excelButtonLabel')}</span>
                  </>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={avisoBatidasSemProjeto.aberto}
        onClose={() => setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0, proximaAcao: null })}
        title={t('batidaProjeto.exportTitulo')}
        type="warning"
        showCancel
        cancelText={t('comum.close')}
        confirmText={t('batidaProjeto.exportContinuar')}
        onConfirm={() => {
          const acao = avisoBatidasSemProjeto.proximaAcao;
          const quantidade = avisoBatidasSemProjeto.quantidade;
          registrarMetricaProdutoBatidas('export_aviso_continuou_sem_corrigir', {
            quantidade,
            formato: acao || 'desconhecido'
          });
          setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0, proximaAcao: null });
          if (acao === 'csv') void gerarCSVSimples({ ignorarPreCheckBatidas: true });
          if (acao === 'xlsx') void gerarXLSX({ ignorarPreCheckBatidas: true });
        }}
      >
        <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          {t('batidaProjeto.exportModalDestaque').replace('{count}', String(avisoBatidasSemProjeto.quantidade))}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
          {t('batidaProjeto.exportTexto').replace('{count}', String(avisoBatidasSemProjeto.quantidade))}
        </p>
        <Link
          to={montarCaminhoAssociacaoBatidasComPeriodo(dataInicio, dataFim)}
          onClick={() => {
            registrarMetricaProdutoBatidas('export_aviso_escolheu_corrigir', {
              quantidade: avisoBatidasSemProjeto.quantidade,
              formato: avisoBatidasSemProjeto.proximaAcao || null
            });
            setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0, proximaAcao: null });
          }}
          className="inline-flex text-sm font-semibold text-[#8231D3] dark:text-purple-300 hover:underline"
        >
          {t('batidaProjeto.exportIrResolver')}
        </Link>
      </Modal>

    </>;
}
export default ExportDataModal;
