import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiDownload, FiCheck, FiChevronDown, FiInfo } from 'react-icons/fi';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useToast } from '../hooks/useToast';
import { formatarData } from '../utils/dateUtils';
import BatidaService from '../services/BatidaService';
import Modal from './ui/Modal';
import { montarCaminhoAssociacaoBatidasComPeriodo } from '../utils/intervaloUrlBatidasSemProjeto';
import { registrarMetricaProdutoBatidas } from '../utils/metricaProdutoBatidas';
function ExportCSVModal({
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
  const [erroModal, setErroModal] = useState({
    isOpen: false,
    message: '',
    code: ''
  });
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
        console.error('Erro ao carregar funcionários:', error);
        setErroModal({
          isOpen: true,
          message: t('exportacao.errorLoadingEmployees'),
          code: error.message
        });
      } finally {
        setCarregando(false);
      }
    };
    if (isOpen) {
      carregarFuncionarios();
    }
  }, [isOpen, isAdmin]);
  const alternarFuncionario = id => {
    setFuncionariosSelecionados(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
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
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  };
  const formatarStringIsoParaExibicao = data => {
    const d = new Date(data + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };
  const obterTextoStatus = status => {
    const mapaStatus = {
      'A': t('exportacao.approved'),
      'P': t('exportacao.pending'),
      'R': t('exportacao.rejected')
    };
    return mapaStatus[status] || '-';
  };
  const escaparCSV = valor => {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const gerarCSV = async (opcoes = {}) => {
    if (funcionariosSelecionados.length === 0) {
      setErroModal({
        isOpen: true,
        message: t('exportacao.selectAtLeastOne'),
        code: ''
      });
      return;
    }
    if (!dataInicio || !dataFim) {
      setErroModal({
        isOpen: true,
        message: t('exportacao.selectPeriod'),
        code: ''
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
          code: ''
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
          formato: 'csv_modal'
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
      const csvLines = [];
      const BOM = '\uFEFF';
      const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
      csvLines.push(`,,,,,,,,,,,,${t('exportacao.timeRecordsReport')}`);
      csvLines.push(`,,,,,,,,,,,,${t('exportacao.period')} ${formatarStringIsoParaExibicao(dataInicio)} - ${formatarStringIsoParaExibicao(dataFim)}`);
      csvLines.push(`,,,,,,,,,,,,${t('exportacao.generatedAt')} ${new Date().toLocaleString(locale)}`);
      csvLines.push('');
      csvLines.push('');
      for (const funcionarioId of funcionariosSelecionados) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        if (!funcionario) continue;
        const {
          data: registros,
          error
        } = await supabase.from('agendamento').select('*').eq('user_id', funcionarioId).gte('data', dataInicio).lte('data', dataFim).order('data', {
          ascending: true
        });
        if (error) throw error;
        if (registros.length === 0) {
          csvLines.push(`${t('exportacao.employee')} ${funcionario.nome}`);
          csvLines.push(t('exportacao.noRecords'));
          csvLines.push('');
          csvLines.push('---');
          csvLines.push('');
          continue;
        }
        csvLines.push(`,,${t('comum.employee').toUpperCase()}`);
        csvLines.push(`,,${t('comum.field')},${t('comum.value')}`);
        csvLines.push(`,,${t('perfil.name')},${escaparCSV(funcionario.nome)}`);
        csvLines.push(`,,${t('perfil.email')},${escaparCSV(funcionario.email)}`);
        csvLines.push(`,,${t('perfil.position')},${escaparCSV(funcionario.cargo || t('exportacao.notDefined'))}`);
        csvLines.push(`,,${t('perfil.department')},${escaparCSV(funcionario.departamento || t('exportacao.notDefined'))}`);
        csvLines.push('');
        csvLines.push('');
        let totalHorasTrabalhadas = 0;
        let totalHorasExtras = 0;
        let diasUteis = 0;
        let diasPendentes = 0;
        let diasAprovados = 0;
        let diasRejeitados = 0;
        const dadosDetalhados = registros.map(reg => {
          const horasJornada1 = calcularHoras(reg.entrada1, reg.saida1);
          const horasJornada2 = calcularHoras(reg.entrada2, reg.saida2);
          const totalDia = horasJornada1 + horasJornada2;
          totalHorasTrabalhadas += totalDia;
          if (totalDia > 8) {
            totalHorasExtras += totalDia - 8;
          }
          diasUteis++;
          if (reg.status === 'A') diasAprovados++;else if (reg.status === 'P') diasPendentes++;else if (reg.status === 'R') diasRejeitados++;
          let intervaloInicio = '--:--';
          let intervaloFim = '--:--';
          let duracaoIntervalo = '--';
          if (reg.saida1 && reg.entrada2) {
            intervaloInicio = reg.saida1;
            intervaloFim = reg.entrada2;
            const duracaoMin = calcularHoras(reg.saida1, reg.entrada2) * 60;
            duracaoIntervalo = `${Math.floor(duracaoMin)}min`;
          }
          return {
            data: formatarStringIsoParaExibicao(reg.data),
            entrada1: reg.entrada1 || '--:--',
            saida1: reg.saida1 || '--:--',
            intervaloInicio,
            intervaloFim,
            duracaoIntervalo,
            entrada2: reg.entrada2 || '--:--',
            saida2: reg.saida2 || '--:--',
            totalHoras: formatarHoras(totalDia),
            status: obterTextoStatus(reg.status),
            projeto: reg.projeto_nome || 'Não definido',
            observacoes: reg.observacoes || ''
          };
        });
        csvLines.push(',,ESTATÍSTICAS DO PERÍODO,,,,,DISTRIBUIÇÃO POR STATUS (Selecione para Gráfico Pizza)');
        csvLines.push(',,Métrica,Valor,,,Status,Quantidade,Percentual');
        csvLines.push(`,,Total de Horas Trabalhadas,${formatarHoras(totalHorasTrabalhadas)},,,Aprovados,${diasAprovados},${(diasAprovados / diasUteis * 100).toFixed(1)}%`);
        csvLines.push(`,,Total de Horas Extras,${formatarHoras(totalHorasExtras)},,,Pendentes,${diasPendentes},${(diasPendentes / diasUteis * 100).toFixed(1)}%`);
        csvLines.push(`,,Dias Úteis Trabalhados,${diasUteis},,,Rejeitados,${diasRejeitados},${(diasRejeitados / diasUteis * 100).toFixed(1)}%`);
        csvLines.push(`,,Média Diária,${formatarHoras(totalHorasTrabalhadas / diasUteis)}`);
        csvLines.push('');
        csvLines.push(',,💡 Dica: Selecione as colunas Status e Quantidade acima e crie um Gráfico de Pizza!');
        csvLines.push('');
        csvLines.push(`,,${t('exportacao.workedHoursPerDay').toUpperCase()} (${t('exportacao.barChartTip').replace('💡 ', '')})`);
        csvLines.push(`,,${t('exportacao.date')},${t('exportacao.normalHoursUpTo8')},${t('exportacao.extraHoursAbove8')},${t('exportacao.total')},${t('exportacao.status')}`);
        dadosDetalhados.forEach(dia => {
          const match = dia.totalHoras.match(/(\d+)h\s*(\d+)min/);
          const horas = match ? parseInt(match[1]) : 0;
          const minutos = match ? parseInt(match[2]) : 0;
          const totalHoras = horas + minutos / 60;
          const horasNormais = Math.min(totalHoras, 8);
          const horasExtras = Math.max(totalHoras - 8, 0);
          csvLines.push(`,,${dia.data},${horasNormais.toFixed(2)},${horasExtras.toFixed(2)},${totalHoras.toFixed(2)},${dia.status}`);
        });
        csvLines.push('');
        csvLines.push(`,,${t('exportacao.barChartTip')}`);
        csvLines.push('');
        csvLines.push(`,,${t('exportacao.timeRecordsReport')}`);
        csvLines.push(['', '', t('exportacao.date'), t('exportacao.entry1'), t('exportacao.exit1'), t('exportacao.breakStart'), t('exportacao.breakEnd'), t('exportacao.duration'), t('exportacao.entry2'), t('exportacao.exit2'), t('exportacao.total'), t('exportacao.status'), t('notificacoes.project'), t('exportacao.observations')].map(escaparCSV).join(','));
        dadosDetalhados.forEach(dia => {
          csvLines.push(['', '', dia.data, dia.entrada1, dia.saida1, dia.intervaloInicio, dia.intervaloFim, dia.duracaoIntervalo, dia.entrada2, dia.saida2, dia.totalHoras, dia.status, dia.projeto, dia.observacoes].map(escaparCSV).join(','));
        });
        csvLines.push('');
        csvLines.push('');
        csvLines.push('═════════════════════════════════════════════════════════════════════');
        csvLines.push('');
        csvLines.push('');
      }
      const csvContent = BOM + csvLines.join('\n');
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const nomeArquivo = funcionariosSelecionados.length === 1 ? `${t('exportacao.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.csv` : `${t('exportacao.fileName')}_multiple_${dataInicio}_${dataFim}.csv`;
      link.setAttribute('download', nomeArquivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(t('exportacao.csvGenerated'));
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (error) {
      setErroModal({
        isOpen: true,
        message: t('exportacao.errorGeneratingCSV'),
        code: error.message
      });
    } finally {
      setGerando(false);
    }
  };
  if (!isOpen) return null;
  return <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      position: 'fixed',
      margin: 0,
      padding: 0
    }}>
        <div className="p-4 w-full h-full flex items-center justify-center" style={{
        padding: '1rem'
      }}>
          <div className="yt-modal-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[10000]" style={{
          marginTop: 0,
          marginBottom: 0
        }}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('comum.exportToCSV')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('exportacao.selectEmployees')}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" disabled={gerando}>
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium yt-label mb-2">
                {isAdmin ? t('exportacao.selectEmployees') : t('comum.employee')}
              </label>
              
              {isAdmin && funcionarios.length > 1 && <button onClick={selecionarTodos} className="mb-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium" disabled={carregando || gerando}>
                  {funcionariosSelecionados.length === funcionarios.length ? t('exportacao.deselectAllEmployees') : t('exportacao.selectAllEmployees')}
                </button>}

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto yt-inset">
                {carregando ? <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('exportacao.carregandoEmployees')}
                  </div> : funcionarios.length === 0 ? <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('exportacao.noEmployeesFound')}
                  </div> : funcionarios.map(funcionario => <label key={funcionario.id} className={`flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${!isAdmin ? 'cursor-default' : ''}`}>
                      <input type="checkbox" checked={funcionariosSelecionados.includes(funcionario.id)} onChange={() => isAdmin && alternarFuncionario(funcionario.id)} disabled={!isAdmin} className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{funcionario.nome}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {funcionario.cargo || t('exportacao.positionNotDefined')} • {funcionario.email}
                        </div>
                      </div>
                      {funcionariosSelecionados.includes(funcionario.id) && <FiCheck className="text-green-500 ml-2" size={20} />}
                    </label>)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium yt-label mb-2">
                  {t('exportacao.startDate')}
                </label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={gerando} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field" />
              </div>
              <div>
                <label className="block text-sm font-medium yt-label mb-2">
                  {t('exportacao.endDate')}
                </label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} disabled={gerando} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field" />
              </div>
            </div>

            <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
              <button onClick={() => setInformacoesExpandidas(!informacoesExpandidas)} className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors flex items-center justify-between text-left" type="button">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <FiInfo className="flex-shrink-0" />
                  {t('exportacao.csvIncludes')}
                </span>
                <div className={`text-blue-600 dark:text-blue-400 flex-shrink-0 transition-transform duration-300 ${informacoesExpandidas ? 'rotate-180' : 'rotate-0'}`}>
                  <FiChevronDown />
                </div>
              </button>
              <div className={`transition-all duration-300 ease-in-out ${informacoesExpandidas ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800">
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
                    <li>{t('exportacao.csvIncludeEmployeeData')}</li>
                    <li>{t('exportacao.csvIncludeStats')}</li>
                    <li>{t('exportacao.csvIncludeGraphData')}</li>
                    <li>{t('exportacao.csvIncludeDetailedTable')}</li>
                    <li>{t('exportacao.csvIncludeIntervalProjects')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 flex justify-end gap-3">
            <button onClick={onClose} disabled={gerando} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t('exportacao.cancel')}
            </button>
            <button onClick={gerarCSV} disabled={gerando || funcionariosSelecionados.length === 0 || !dataInicio || !dataFim} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {gerando ? <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  {t('exportacao.generating')}...
                </> : <>
                  <FiDownload size={20} />
                  {t('comum.exportToCSV')}
                </>}
            </button>
          </div>
          </div>
        </div>
      </div>

      {erroModal.isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" style={{
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      position: 'fixed',
      margin: 0,
      padding: 0
    }}>
          <div className="p-4 w-full h-full flex items-center justify-center">
            <div className="yt-modal-surface rounded-lg shadow-xl max-w-md w-full p-6 relative z-[10001]">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('exportacao.errorMessage')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">{erroModal.message}</p>
            {erroModal.code && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Código: {erroModal.code}</p>}
            <button onClick={() => setErroModal({
            isOpen: false,
            message: '',
            code: ''
          })} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('exportacao.closeButton')}
            </button>
            </div>
          </div>
        </div>}

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
            formato: 'csv'
          });
          setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0 });
          void gerarCSV({ ignorarPreCheckBatidas: true });
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
              formato: 'csv'
            });
            setAvisoBatidasSemProjeto({ aberto: false, quantidade: 0 });
          }}
          className="inline-flex text-sm font-semibold text-[#8231D3] dark:text-purple-300 hover:underline"
        >
          {t('batidaProjeto.exportIrResolver')}
        </Link>
      </Modal>

    </>;
}
export default ExportCSVModal;
