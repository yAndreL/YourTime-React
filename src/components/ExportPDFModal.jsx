import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { FiX, FiDownload, FiCalendar, FiUsers, FiAlertCircle, FiInfo, FiChevronDown } from 'react-icons/fi';
import ConfigService from '../services/ConfigService';
import BatidaService from '../services/BatidaService';
import { useLanguage } from '../hooks/useLanguage';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useToast } from '../hooks/useToast';
import Modal from './ui/Modal';
import { montarCaminhoAssociacaoBatidasComPeriodo } from '../utils/intervaloUrlBatidasSemProjeto';
import { registrarMetricaProdutoBatidas } from '../utils/metricaProdutoBatidas';
function ExportPDFModal({
  isOpen,
  onClose,
  isAdmin = false
}) {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const { showSuccess } = useToast();
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erroModal, setErroModal] = useState({
    isOpen: false,
    message: '',
    code: ''
  });
  const [termoBusca, setTermoBusca] = useState('');
  const [informacoesExpandidas, setInformacoesExpandidas] = useState(false);
  const [avisoBatidasSemProjeto, setAvisoBatidasSemProjeto] = useState({
    aberto: false,
    quantidade: 0
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
    if (isOpen) {
      carregarFuncionarios();
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const formatarData = d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setDataInicio(formatarData(primeiroDia));
      setDataFim(formatarData(ultimoDia));
    }
  }, [isOpen]);
  const carregarFuncionarios = async () => {
    try {
      setCarregando(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setFuncionarios([]);
        return;
      }
      const {
        data: perfilUsuario
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
      let consulta = supabase.from('profiles').select('id, nome, email, cargo, departamento, superior_empresa_id').eq('is_active', true);
      if (perfilUsuario?.superior_empresa_id) {
        consulta = consulta.eq('superior_empresa_id', perfilUsuario.superior_empresa_id);
      }
      if (!isAdmin) {
        consulta = consulta.eq('id', user.id);
      }
      consulta = consulta.order('nome');
      const {
        data,
        error
      } = await consulta;
      if (error) throw error;
      const dadosFuncionarios = data || [];
      setFuncionarios(dadosFuncionarios);
      if (!isAdmin && dadosFuncionarios.length > 0) {
        setFuncionariosSelecionados([dadosFuncionarios[0].id]);
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setCarregando(false);
    }
  };
  const alternarFuncionario = funcionarioId => {
    setFuncionariosSelecionados(prev => {
      if (prev.includes(funcionarioId)) {
        return prev.filter(id => id !== funcionarioId);
      }
      return [...prev, funcionarioId];
    });
  };
  const selecionarTodos = () => {
    if (funcionariosSelecionados.length === funcionarios.length) {
      setFuncionariosSelecionados([]);
    } else {
      setFuncionariosSelecionados(funcionarios.map(f => f.id));
    }
  };
  const calcularHoras = (entrada, saida) => {
    if (!entrada || !saida) return 0;
    const [h1, m1] = entrada.split(':').map(Number);
    const [h2, m2] = saida.split(':').map(Number);
    return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
  };
  const formatarHoras = horas => {
    const h = Math.floor(Math.abs(horas));
    const m = Math.round((Math.abs(horas) - h) * 60);
    return `${horas < 0 ? '-' : ''}${h}h ${m}m`;
  };
  const gerarPDF = async (opcoes = {}) => {
    if (funcionariosSelecionados.length === 0) {
      setErroModal({
        isOpen: true,
        message: t('exportacao.noEmployees'),
        code: 'EXP-001'
      });
      return;
    }
    if (!dataInicio || !dataFim) {
      setErroModal({
        isOpen: true,
        message: t('validacao.periodRequired'),
        code: 'EXP-002'
      });
      return;
    }
    if (new Date(dataInicio) > new Date(dataFim)) {
      setErroModal({
        isOpen: true,
        message: 'A data de início não pode ser posterior à data fim.',
        code: 'EXP-003'
      });
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
        setErroModal({
          isOpen: true,
          message: verificacao.error || t('comum.error'),
          code: 'EXP-BAT'
        });
        return;
      }
      if (verificacao.deveBloquear) {
        setErroModal({
          isOpen: true,
          message: t('batidaProjeto.exportTexto').replace('{count}', String(verificacao.quantidadePendencias)),
          code: 'BAT-EXPORT'
        });
        return;
      }
      if (verificacao.possuiPendencias) {
        registrarMetricaProdutoBatidas('export_aviso_batidas_sem_projeto', {
          quantidade: verificacao.quantidadePendencias,
          formato: 'pdf'
        });
        setAvisoBatidasSemProjeto({
          aberto: true,
          quantidade: verificacao.quantidadePendencias
        });
        return;
      }
    }
    try {
      setGerando(true);
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const resultadoConfiguracao = await ConfigService.buscarConfiguracoes(user.id);
      const incluirGraficos = resultadoConfiguracao?.data?.incluir_graficos_pdf ?? false;
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        const {
          data: registros,
          error
        } = await supabase.from('agendamento').select('*').eq('user_id', funcionarioId).gte('data', dataInicio).lte('data', dataFim).order('data', {
          ascending: true
        });
        if (error) throw error;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(t('exportacao.reportTitle'), 105, 20, {
          align: 'center'
        });
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`${t('exportacao.employee')} ${funcionario.nome}`, 20, 35);
        doc.text(`${t('exportacao.position')} ${funcionario.cargo || t('exportacao.notDefined')}`, 20, 42);
        doc.text(`${t('exportacao.department')} ${funcionario.departamento || t('exportacao.notDefined')}`, 20, 49);
        doc.text(`${t('exportacao.period')} ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, 20, 56);
        let totalHorasTrabalhadas = 0;
        let totalHorasExtras = 0;
        let diasUteis = 0;
        const dadosTabela = registros.map(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
          const totalDia = horasJornada1 + horasJornada2;
          totalHorasTrabalhadas += totalDia;
          if (totalDia > 8) {
            totalHorasExtras += totalDia - 8;
          }
          diasUteis++;
          let intervaloInicio = '--:--';
          let intervaloFim = '--:--';
          let duracaoIntervalo = '--';
          if (reg.saida1 && reg.entrada2) {
            intervaloInicio = reg.saida1;
            intervaloFim = reg.entrada2;
            const duracaoMin = calcularHoras(reg.saida1, reg.entrada2) * 60;
            duracaoIntervalo = `${Math.floor(duracaoMin)}min`;
          }
          return [formatarData(reg.data), reg.entrada1 || '--:--', reg.saida1 || '--:--', intervaloInicio, intervaloFim, duracaoIntervalo, reg.entrada2 || '--:--', reg.saida2 || '--:--', formatarHoras(totalDia), obterTextoStatus(reg.status)];
        });
        autoTable(doc, {
          startY: 65,
          head: [[t('exportacao.date'), t('exportacao.entry1'), t('exportacao.exit1'), t('exportacao.breakStart'), t('exportacao.breakEnd'), t('exportacao.duration'), t('exportacao.entry2'), t('exportacao.exit2'), t('exportacao.total'), t('exportacao.status')]],
          body: dadosTabela,
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
            0: {
              cellWidth: 'auto'
            },
            1: {
              cellWidth: 'auto'
            },
            2: {
              cellWidth: 'auto'
            },
            3: {
              cellWidth: 'auto'
            },
            4: {
              cellWidth: 'auto'
            },
            5: {
              cellWidth: 'auto'
            },
            6: {
              cellWidth: 'auto'
            },
            7: {
              cellWidth: 'auto'
            },
            8: {
              cellWidth: 'auto'
            },
            9: {
              cellWidth: 'auto'
            }
          },
          tableWidth: 'auto',
          margin: {
            left: 10,
            right: 10
          }
        });
        let finalY = (doc.lastAutoTable?.finalY || 65) + 10;
        if (incluirGraficos && registros.length > 0) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(t('exportacao.workedHoursChart'), 20, finalY);
          let maxHorasTrabalhadas = 0;
          registros.forEach(reg => {
            const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
            const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
            const totalDia = horasJornada1 + horasJornada2;
            if (totalDia > maxHorasTrabalhadas) {
              maxHorasTrabalhadas = totalDia;
            }
          });
          const maxHoras = Math.ceil(maxHorasTrabalhadas + 1);
          const graficoX = 25;
          const graficoY = finalY + 10;
          const graficoLargura = 165;
          const graficoAltura = 60;
          doc.setFillColor(245, 245, 245);
          doc.rect(graficoX, graficoY, graficoLargura, graficoAltura, 'F');
          const numLinhas = Math.min(Math.max(4, maxHoras), 6);
          const intervaloHoras = maxHoras / numLinhas;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          for (let i = 0; i <= numLinhas; i++) {
            const y = graficoY + graficoAltura * i / numLinhas;
            doc.line(graficoX, y, graficoX + graficoLargura, y);
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            const horaLabel = Math.round((maxHoras - i * intervaloHoras) * 10) / 10;
            doc.text(`${horaLabel}h`, graficoX - 5, y + 2, {
              align: 'right'
            });
          }
          const barWidth = Math.min(graficoLargura / registros.length - 2, 10);
          const barSpacing = graficoLargura / registros.length;
          registros.forEach((reg, index) => {
            const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
            const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
            const totalDia = horasJornada1 + horasJornada2;
            const barHeight = totalDia / maxHoras * graficoAltura;
            const barX = graficoX + index * barSpacing + (barSpacing - barWidth) / 2;
            const barY = graficoY + graficoAltura - barHeight;
            if (totalDia >= 8) {
              doc.setFillColor(34, 197, 94);
            } else if (totalDia >= 6) {
              doc.setFillColor(251, 191, 36);
            } else {
              doc.setFillColor(239, 68, 68);
            }
            doc.rect(barX, barY, barWidth, barHeight, 'F');
            if (registros.length <= 15) {
              doc.setFontSize(6);
              doc.setTextColor(80, 80, 80);
              const dataLabel = formatarData(reg.data).substring(0, 5);
              const labelY = graficoY + graficoAltura + 4;
              doc.text(dataLabel, barX + barWidth / 2, labelY, {
                align: 'center'
              });
            }
          });
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.5);
          doc.rect(graficoX, graficoY, graficoLargura, graficoAltura);
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          const legendaY = graficoY + graficoAltura + 12;
          const legendaX = graficoX + 10;
          doc.setFillColor(34, 197, 94);
          doc.rect(legendaX, legendaY, 4, 4, 'F');
          doc.setTextColor(60, 60, 60);
          doc.text('>= 8h', legendaX + 6, legendaY + 3);
          doc.setFillColor(251, 191, 36);
          doc.rect(legendaX + 30, legendaY, 4, 4, 'F');
          doc.setTextColor(60, 60, 60);
          doc.text('6-8h', legendaX + 36, legendaY + 3);
          doc.setFillColor(239, 68, 68);
          doc.rect(legendaX + 55, legendaY, 4, 4, 'F');
          doc.setTextColor(60, 60, 60);
          doc.text('< 6h', legendaX + 61, legendaY + 3);
          finalY = legendaY + 12;
        }
        const horasEsperadas = diasUteis * 8;
        const saldoHoras = totalHorasTrabalhadas - horasEsperadas;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(t('exportacao.summary').toUpperCase(), 20, finalY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`${t('exportacao.workedDays')}: ${diasUteis}`, 20, finalY + 10);
        doc.text(`${t('exportacao.totalHours')}: ${formatarHoras(totalHorasTrabalhadas)}`, 20, finalY + 17);
        doc.text(`${t('exportacao.averagePerDay')}: ${formatarHoras(horasEsperadas)}`, 20, finalY + 24);
        doc.setTextColor(255, 140, 0);
        doc.text(`${t('exportacao.overtimeHours')}: ${formatarHoras(totalHorasExtras)}`, 20, finalY + 31);
        doc.setFont(undefined, 'bold');
        if (saldoHoras >= 0) {
          doc.setTextColor(0, 128, 0);
          doc.text(`Saldo de horas: +${formatarHoras(saldoHoras)}`, 20, finalY + 38);
        } else {
          doc.setTextColor(255, 0, 0);
          doc.text(`Saldo de horas: ${formatarHoras(saldoHoras)}`, 20, finalY + 38);
        }
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
        doc.text(`${t('exportacao.generatedAt')}: ${new Date().toLocaleString(locale)}`, 105, 285, {
          align: 'center'
        });
        const nomeArquivo = `${t('exportacao.fileName')}-${funcionario.nome.replace(/\s+/g, '-')}-${dataInicio}-${dataFim}.pdf`;
        doc.save(nomeArquivo);
      }
      showSuccess('Relatório em PDF gerado!');
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (error) {
      let errorCode = 'EXP-004';
      let errorMessage = t('exportacao.errorGenerating');
      if (error.message.includes('registros')) {
        errorCode = 'EXP-005';
        errorMessage = t('exportacao.noRecords');
      } else if (error.message.includes('autoTable') || error.message.includes('jspdf')) {
        errorCode = 'EXP-006';
        errorMessage = t('validacao.tryAgain');
      } else if (error.code) {
        errorCode = 'DB-001';
        errorMessage = `${t('validacao.databaseError')}: ${error.message}`;
      }
      setErroModal({
        isOpen: true,
        message: errorMessage,
        code: errorCode
      });
    } finally {
      setGerando(false);
    }
  };
  const formatarData = dataString => {
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
  };
  const obterTextoStatus = status => {
    switch (status) {
      case 'A':
        return t('exportacao.approved');
      case 'P':
        return t('exportacao.pending');
      case 'R':
        return t('exportacao.rejected');
      default:
        return '-';
    }
  };
  if (!isOpen) return null;
  return <Fragment>
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style={{
    margin: 0,
    padding: '1rem'
  }}>
      <div className="yt-modal-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" style={{
      marginTop: 0,
      marginBottom: 0
    }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FiDownload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('comum.exportTitle')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold yt-label mb-3">
              <FiCalendar className="w-4 h-4" />
              {t('exportacao.period')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs yt-label mb-1">{t('exportacao.startDate')}</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 yt-field" />
              </div>
              <div>
                <label className="block text-xs yt-label mb-1">{t('exportacao.endDate')}</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 yt-field" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold yt-label">
                <FiUsers className="w-4 h-4" />
                {isAdmin ? `${t('exportacao.selectEmployees')} (${funcionariosSelecionados.length})` : t('perfil.myData')}
              </label>
              {isAdmin && funcionarios.length > 1 && <button onClick={selecionarTodos} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  {funcionariosSelecionados.length === funcionarios.length ? t('exportacao.deselectAll') : t('exportacao.selectAll')}
                </button>}
            </div>

            {isAdmin && funcionarios.length > 0 && <div className="mb-3">
                <input type="text" placeholder={t('administracao.searchPlaceholder')} value={termoBusca} onChange={e => setTermoBusca(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 yt-field" />
              </div>}

            <div className="yt-inset border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
              {carregando ? <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('comum.carregando')}...</div> : funcionarios.length === 0 ? <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('exportacao.noEmployees')}</div> : <div className="space-y-2">
                  {funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).map(func => <label key={func.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors border ${!isAdmin ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer border-transparent hover:border-blue-200 dark:hover:border-blue-700'}`}>
                      <input type="checkbox" checked={funcionariosSelecionados.includes(func.id)} onChange={() => isAdmin && alternarFuncionario(func.id)} disabled={!isAdmin} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50 bg-white dark:bg-gray-800" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{func.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {func.cargo || t('exportacao.noPosition')} • {func.departamento || t('exportacao.noDepartment')}
                        </p>
                      </div>
                    </label>)}
                  {funcionarios.filter(f => f.nome.toLowerCase().includes(termoBusca.toLowerCase())).length === 0 && <div className="text-center py-4 text-gray-500 dark:text-gray-400">{t('exportacao.noEmployeesFound')}</div>}
                </div>}
            </div>
          </div>

          <div className="mt-6 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
            <button onClick={() => setInformacoesExpandidas(!informacoesExpandidas)} className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors flex items-center justify-between text-left" type="button">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <FiInfo className="flex-shrink-0" />
                {t('exportacao.informationTitle')}
              </span>
              <div className={`text-blue-600 dark:text-blue-400 flex-shrink-0 transition-transform duration-300 ${informacoesExpandidas ? 'rotate-180' : 'rotate-0'}`}>
                <FiChevronDown />
              </div>
            </button>
            <div className={`transition-all duration-300 ease-in-out ${informacoesExpandidas ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800">
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
                  {isAdmin ? <>
                      <li>{t('exportacao.infoPdfPerEmployee')}</li>
                      <li>{t('exportacao.infoAdminExport')}</li>
                    </> : <li>{t('exportacao.infoPdfMyRecords')}</li>}
                  <li>{t('exportacao.infoReportIncludes')}</li>
                  <li>{t('exportacao.infoGraphics')}</li>
                  <li>{t('exportacao.infoHoursBalance')}</li>
                  <li>{t('exportacao.infoAutoDownload')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
          <button onClick={onClose} disabled={gerando} className="px-6 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={gerarPDF} disabled={gerando || funcionariosSelecionados.length === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {gerando ? <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {t('exportacao.generating')}...
              </> : <>
                <FiDownload className="w-4 h-4" />
                {t('exportacao.generateReport')}
              </>}
          </button>
        </div>
      </div>

      {erroModal.isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="yt-modal-surface rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-red-200 dark:border-red-900/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-950/50">
                  <FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
                    Erro ao Exportar
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Código: {erroModal.code}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">{erroModal.message}</p>
              <div className="yt-inset border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>💡 Dica:</strong> Se o erro persistir, verifique sua conexão com a internet e tente novamente. 
                  Para mais informações, consulte o código de erro na documentação.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
              <button onClick={() => setErroModal({
            isOpen: false,
            message: '',
            code: ''
          })} className="px-6 py-2 rounded-lg font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700">
                Entendi
              </button>
            </div>
          </div>
        </div>}

    </div>

      <Modal
        isOpen={avisoBatidasSemProjeto.aberto}
        onClose={() => setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0 })}
        title={t('batidaProjeto.exportTitulo')}
        type="warning"
        showCancel
        cancelText={t('comum.close')}
        confirmText={t('batidaProjeto.exportContinuar')}
        onConfirm={() => {
          const quantidade = avisoBatidasSemProjeto.quantidade;
          registrarMetricaProdutoBatidas('export_aviso_continuou_sem_corrigir', {
            quantidade,
            formato: 'pdf'
          });
          setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0 });
          void gerarPDF({ ignorarPreCheckBatidas: true });
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
              formato: 'pdf'
            });
            setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0 });
          }}
          className="inline-flex text-sm font-semibold text-[#8231D3] dark:text-purple-300 hover:underline"
        >
          {t('batidaProjeto.exportIrResolver')}
        </Link>
      </Modal>
    </Fragment>;
}
export default ExportPDFModal;
