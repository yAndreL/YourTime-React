import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiCheck, FiChevronDown, FiInfo } from 'react-icons/fi';
import { supabase } from '../config/supabase';
import Toast from './ui/Toast';
import { useLanguage } from '../hooks/useLanguage';
function ExportCSVModal({
  isOpen,
  onClose,
  isAdmin = false
}) {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const getWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const formatDate = date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      inicio: formatDate(monday),
      fim: formatDate(friday)
    };
  };
  const weekRange = getWeekRange();
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState([]);
  const [dataInicio, setDataInicio] = useState(weekRange.inicio);
  const [dataFim, setDataFim] = useState(weekRange.fim);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [modalError, setModalError] = useState({
    isOpen: false,
    message: '',
    code: ''
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [infoExpanded, setInfoExpanded] = useState(false);
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
        setLoading(true);
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        const {
          data: userProfile
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
        let query = supabase.from('profiles').select('id, nome, email, cargo, departamento, superior_empresa_id').order('nome');
        if (userProfile?.superior_empresa_id) {
          query = query.eq('superior_empresa_id', userProfile.superior_empresa_id);
        }
        if (!isAdmin) {
          query = query.eq('id', user.id);
        }
        const {
          data: funcionariosData,
          error
        } = await query;
        if (error) throw error;
        setFuncionarios(funcionariosData || []);
        if (!isAdmin && funcionariosData.length > 0) {
          setFuncionariosSelecionados([funcionariosData[0].id]);
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        setModalError({
          isOpen: true,
          message: t('export.errorLoadingEmployees'),
          code: error.message
        });
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) {
      carregarFuncionarios();
    }
  }, [isOpen, isAdmin]);
  const toggleFuncionario = id => {
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
  const formatarData = data => {
    const d = new Date(data + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };
  const getStatusTexto = status => {
    const statusMap = {
      'A': t('export.approved'),
      'P': t('export.pending'),
      'R': t('export.rejected')
    };
    return statusMap[status] || '-';
  };
  const escaparCSV = valor => {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const gerarCSV = async () => {
    if (funcionariosSelecionados.length === 0) {
      setModalError({
        isOpen: true,
        message: t('export.selectAtLeastOne'),
        code: ''
      });
      return;
    }
    if (!dataInicio || !dataFim) {
      setModalError({
        isOpen: true,
        message: t('export.selectPeriod'),
        code: ''
      });
      return;
    }
    try {
      setGerando(true);
      const csvLines = [];
      const BOM = '\uFEFF';
      const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
      csvLines.push(`,,,,,,,,,,,,${t('export.timeRecordsReport')}`);
      csvLines.push(`,,,,,,,,,,,,${t('export.period')} ${formatarData(dataInicio)} - ${formatarData(dataFim)}`);
      csvLines.push(`,,,,,,,,,,,,${t('export.generatedAt')} ${new Date().toLocaleString(locale)}`);
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
          csvLines.push(`${t('export.employee')} ${funcionario.nome}`);
          csvLines.push(t('export.noRecords'));
          csvLines.push('');
          csvLines.push('---');
          csvLines.push('');
          continue;
        }
        csvLines.push(`,,${t('common.employee').toUpperCase()}`);
        csvLines.push(`,,${t('common.field')},${t('common.value')}`);
        csvLines.push(`,,${t('profile.name')},${escaparCSV(funcionario.nome)}`);
        csvLines.push(`,,${t('profile.email')},${escaparCSV(funcionario.email)}`);
        csvLines.push(`,,${t('profile.position')},${escaparCSV(funcionario.cargo || t('export.notDefined'))}`);
        csvLines.push(`,,${t('profile.department')},${escaparCSV(funcionario.departamento || t('export.notDefined'))}`);
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
        csvLines.push(`,,${t('export.workedHoursPerDay').toUpperCase()} (${t('export.barChartTip').replace('💡 ', '')})`);
        csvLines.push(`,,${t('export.date')},${t('export.normalHoursUpTo8')},${t('export.extraHoursAbove8')},${t('export.total')},${t('export.status')}`);
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
        csvLines.push(`,,${t('export.barChartTip')}`);
        csvLines.push('');
        csvLines.push(`,,${t('export.timeRecordsReport')}`);
        csvLines.push(['', '', t('export.date'), t('export.entry1'), t('export.exit1'), t('export.breakStart'), t('export.breakEnd'), t('export.duration'), t('export.entry2'), t('export.exit2'), t('export.total'), t('export.status'), t('notifications.project'), t('export.observations')].map(escaparCSV).join(','));
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
      const nomeArquivo = funcionariosSelecionados.length === 1 ? `${t('export.fileName')}_${funcionarios.find(f => f.id === funcionariosSelecionados[0])?.nome.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.csv` : `${t('export.fileName')}_multiple_${dataInicio}_${dataFim}.csv`;
      link.setAttribute('download', nomeArquivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage(t('export.csvGenerated'));
      setShowToast(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setModalError({
        isOpen: true,
        message: t('export.errorGeneratingCSV'),
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
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('common.exportToCSV')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('export.selectEmployees')}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" disabled={gerando}>
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium yt-label mb-2">
                {isAdmin ? t('export.selectEmployees') : t('common.employee')}
              </label>
              
              {isAdmin && funcionarios.length > 1 && <button onClick={selecionarTodos} className="mb-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium" disabled={loading || gerando}>
                  {funcionariosSelecionados.length === funcionarios.length ? t('export.deselectAllEmployees') : t('export.selectAllEmployees')}
                </button>}

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto yt-inset">
                {loading ? <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('export.loadingEmployees')}
                  </div> : funcionarios.length === 0 ? <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {t('export.noEmployeesFound')}
                  </div> : funcionarios.map(funcionario => <label key={funcionario.id} className={`flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${!isAdmin ? 'cursor-default' : ''}`}>
                      <input type="checkbox" checked={funcionariosSelecionados.includes(funcionario.id)} onChange={() => isAdmin && toggleFuncionario(funcionario.id)} disabled={!isAdmin} className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{funcionario.nome}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {funcionario.cargo || t('export.positionNotDefined')} • {funcionario.email}
                        </div>
                      </div>
                      {funcionariosSelecionados.includes(funcionario.id) && <FiCheck className="text-green-500 ml-2" size={20} />}
                    </label>)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium yt-label mb-2">
                  {t('export.startDate')}
                </label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={gerando} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field" />
              </div>
              <div>
                <label className="block text-sm font-medium yt-label mb-2">
                  {t('export.endDate')}
                </label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} disabled={gerando} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field" />
              </div>
            </div>

            <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
              <button onClick={() => setInfoExpanded(!infoExpanded)} className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors flex items-center justify-between text-left" type="button">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <FiInfo className="flex-shrink-0" />
                  {t('export.csvIncludes')}
                </span>
                <div className={`text-blue-600 dark:text-blue-400 flex-shrink-0 transition-transform duration-300 ${infoExpanded ? 'rotate-180' : 'rotate-0'}`}>
                  <FiChevronDown />
                </div>
              </button>
              <div className={`transition-all duration-300 ease-in-out ${infoExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800">
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
                    <li>{t('export.csvIncludeEmployeeData')}</li>
                    <li>{t('export.csvIncludeStats')}</li>
                    <li>{t('export.csvIncludeGraphData')}</li>
                    <li>{t('export.csvIncludeDetailedTable')}</li>
                    <li>{t('export.csvIncludeIntervalProjects')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 flex justify-end gap-3">
            <button onClick={onClose} disabled={gerando} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t('export.cancel')}
            </button>
            <button onClick={gerarCSV} disabled={gerando || funcionariosSelecionados.length === 0 || !dataInicio || !dataFim} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {gerando ? <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  {t('export.generating')}...
                </> : <>
                  <FiDownload size={20} />
                  {t('common.exportToCSV')}
                </>}
            </button>
          </div>
          </div>
        </div>
      </div>

      {modalError.isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" style={{
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
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('export.errorMessage')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">{modalError.message}</p>
            {modalError.code && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Código: {modalError.code}</p>}
            <button onClick={() => setModalError({
            isOpen: false,
            message: '',
            code: ''
          })} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('export.closeButton')}
            </button>
            </div>
          </div>
        </div>}

      {showToast && <Toast message={toastMessage} type="success" onClose={() => setShowToast(false)} />}
    </>;
}
export default ExportCSVModal;
