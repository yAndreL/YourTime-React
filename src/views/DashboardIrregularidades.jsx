import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useLanguage } from '../hooks/useLanguage';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import CalculoTrabalhistaService from '../services/CalculoTrabalhistaService';
import BatidaService from '../services/BatidaService';
import { obterDataCalendarioIsoNoFuso } from '../utils/fusoHorarioData';
import { FiAlertTriangle, FiClock, FiUserX, FiTrendingDown, FiFilter, FiUsers, FiArrowDown, FiArrowUp } from 'react-icons/fi';

function DashboardIrregularidades() {
  const { t } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const { showError } = useToast();
  const [carregandoIrregularidades, setCarregandoIrregularidades] = useState(true);
  const [funcionarios, setFuncionarios] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [resumo, setResumo] = useState({ atrasos: 0, faltas: 0, saidasAntecipadas: 0, horasExtras: 0, totalMinutosAtraso: 0 });
  const [rankingFaltas, setRankingFaltas] = useState([]);
  const [rankingAtrasos, setRankingAtrasos] = useState([]);
  const [semPontoHoje, setSemPontoHoje] = useState([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [departamentos, setDepartamentos] = useState([]);

  useEffect(() => {
    const hojeYmd = obterDataCalendarioIsoNoFuso(new Date(), fusoHorario);
    const [ano, mes] = hojeYmd.split('-');
    setPeriodoInicio(`${ano}-${mes}-01`);
    setPeriodoFim(hojeYmd);
  }, [fusoHorario]);

  useEffect(() => {
    if (periodoInicio && periodoFim) {
      carregarDados();
    }
  }, [periodoInicio, periodoFim, filtroDepartamento, fusoHorario]);

  const carregarDados = async () => {
    try {
      setCarregandoIrregularidades(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: perfil } = await supabase
        .from('profiles')
        .select('superior_empresa_id')
        .eq('id', session.user.id)
        .single();

      if (!perfil?.superior_empresa_id) return;
      const empresaId = perfil.superior_empresa_id;

      let consultaFuncionarios = supabase
        .from('profiles')
        .select('id, nome, email, cargo, departamento, carga_horaria, is_active')
        .eq('superior_empresa_id', empresaId)
        .eq('is_active', true);

      if (filtroDepartamento) {
        consultaFuncionarios = consultaFuncionarios.eq('departamento', filtroDepartamento);
      }

      const { data: listaFuncionarios } = await consultaFuncionarios;
      setFuncionarios(listaFuncionarios || []);

      const deptos = [...new Set((listaFuncionarios || []).map(f => f.departamento).filter(Boolean))];
      setDepartamentos(deptos);

      const { data: dadosJornadas } = await supabase
        .from('jornadas')
        .select('*')
        .eq('superior_empresa_id', empresaId)
        .gte('data', periodoInicio)
        .lte('data', periodoFim);

      setJornadas(dadosJornadas || []);

      calcularMetricas(listaFuncionarios || [], dadosJornadas || []);
      calcularSemPontoHoje(listaFuncionarios || [], dadosJornadas || []);
    } catch (error) {
      showError('Erro ao carregar dados');
    } finally {
      setCarregandoIrregularidades(false);
    }
  };

  const calcularMetricas = (listaFuncionarios, dadosJornadas) => {
    let totalAtrasos = 0;
    let totalFaltas = 0;
    let totalSaidasAntecipadas = 0;
    let totalHorasExtras = 0;
    let totalMinutosAtraso = 0;

    const faltasPorFuncionario = {};
    const atrasosPorFuncionario = {};

    for (const funcionario of listaFuncionarios) {
      faltasPorFuncionario[funcionario.id] = { nome: funcionario.nome, departamento: funcionario.departamento, faltas: 0 };
      atrasosPorFuncionario[funcionario.id] = { nome: funcionario.nome, departamento: funcionario.departamento, atrasos: 0, totalMinutosAtraso: 0 };
    }

    const diasNoPeriodo = obterDiasUteisPeriodo(periodoInicio, periodoFim);

    for (const funcionario of listaFuncionarios) {
      const jornadasFunc = dadosJornadas.filter(j => j.user_id === funcionario.id);
      const datasComJornada = new Set(jornadasFunc.map(j => j.data));

      for (const dia of diasNoPeriodo) {
        if (!datasComJornada.has(dia)) {
          totalFaltas++;
          faltasPorFuncionario[funcionario.id].faltas++;
        }
      }

      for (const jornada of jornadasFunc) {
        if (jornada.atraso_minutos > 0) {
          totalAtrasos++;
          totalMinutosAtraso += jornada.atraso_minutos;
          atrasosPorFuncionario[funcionario.id].atrasos++;
          atrasosPorFuncionario[funcionario.id].totalMinutosAtraso += jornada.atraso_minutos;
        }
        if (jornada.saida_antecipada_minutos > 0) {
          totalSaidasAntecipadas++;
        }
        if (jornada.horas_extras_minutos > 0) {
          totalHorasExtras += jornada.horas_extras_minutos;
        }
      }
    }

    setResumo({
      atrasos: totalAtrasos,
      faltas: totalFaltas,
      saidasAntecipadas: totalSaidasAntecipadas,
      horasExtras: totalHorasExtras,
      totalMinutosAtraso
    });

    const ranking = Object.values(faltasPorFuncionario)
      .sort((a, b) => b.faltas - a.faltas)
      .filter(f => f.faltas > 0)
      .slice(0, 10);
    setRankingFaltas(ranking);

    const rankingAtrasos = Object.values(atrasosPorFuncionario)
      .sort((a, b) => b.atrasos - a.atrasos)
      .filter(f => f.atrasos > 0)
      .slice(0, 10);
    setRankingAtrasos(rankingAtrasos);
  };

  const calcularSemPontoHoje = (listaFuncionarios, dadosJornadas) => {
    const hoje = obterDataCalendarioIsoNoFuso(new Date(), fusoHorario);
    const jornadasHoje = dadosJornadas.filter(j => j.data === hoje);
    const idsComPonto = new Set(jornadasHoje.map(j => j.user_id));

    const semPonto = listaFuncionarios.filter(f => !idsComPonto.has(f.id));
    setSemPontoHoje(semPonto);
  };

  const obterDiasUteisPeriodo = (inicio, fim) => {
    const dias = [];
    const current = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');

    while (current <= end) {
      const diaSemana = current.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dias.push(`${y}-${m}-${d}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dias;
  };

  return (
    <MainLayout title={t('irregularidades.titulo')} subtitle={t('irregularidades.subtitulo')}>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="yt-card p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('exportacao.startDate')}</label>
              <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="px-3 py-2 border rounded-lg yt-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('exportacao.endDate')}</label>
              <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="px-3 py-2 border rounded-lg yt-field text-sm" />
            </div>
            {departamentos.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('perfil.department')}</label>
                <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className="px-3 py-2 border rounded-lg yt-field text-sm">
                  <option value="">Todos</option>
                  {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="yt-card p-4 border-l-4 border-yellow-400">
            <div className="flex items-center gap-3">
              <FiClock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('irregularidades.atrasos')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{resumo.atrasos}</p>
                {resumo.totalMinutosAtraso > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">{BatidaService.formatarMinutosDescritivo(resumo.totalMinutosAtraso)} total</p>
                )}
              </div>
            </div>
          </div>
          <div className="yt-card p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <FiUserX className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('irregularidades.faltas')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{resumo.faltas}</p>
              </div>
            </div>
          </div>
          <div className="yt-card p-4 border-l-4 border-orange-400">
            <div className="flex items-center gap-3">
              <FiTrendingDown className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('irregularidades.saidasAntecipadas')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{resumo.saidasAntecipadas}</p>
              </div>
            </div>
          </div>
          <div className="yt-card p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <FiArrowUp className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('irregularidades.horasExtras')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{BatidaService.formatarMinutosDescritivo(resumo.horasExtras)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sem ponto hoje */}
          <div className="yt-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-red-500" />
              {t('irregularidades.semPontoHoje')} ({semPontoHoje.length})
            </h3>
            {carregandoIrregularidades ? (
              <div className="text-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : semPontoHoje.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('irregularidades.todosComPonto')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {semPontoHoje.map(funcionario => (
                  <div key={funcionario.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{funcionario.nome}</span>
                      {funcionario.departamento && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{funcionario.departamento}</span>}
                    </div>
                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-2 py-1 rounded">{t('irregularidades.semRegistro')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ranking de faltas */}
          <div className="yt-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiUserX className="w-4 h-4 text-red-500" />
              {t('irregularidades.rankingFaltas')}
            </h3>
            {rankingFaltas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('irregularidades.semFaltas')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rankingFaltas.map((funcionario, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{funcionario.nome}</span>
                        {funcionario.departamento && <span className="text-xs text-gray-500 dark:text-gray-400 block">{funcionario.departamento}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{funcionario.faltas} {funcionario.faltas === 1 ? t('irregularidades.faltaSingular') : t('irregularidades.faltaPlural')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ranking de atrasos */}
          <div className="yt-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiClock className="w-4 h-4 text-yellow-500" />
              {t('irregularidades.rankingAtrasos')}
            </h3>
            {rankingAtrasos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('irregularidades.semAtrasos')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rankingAtrasos.map((funcionario, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{funcionario.nome}</span>
                        {funcionario.departamento && <span className="text-xs text-gray-500 dark:text-gray-400 block">{funcionario.departamento}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 block">{funcionario.atrasos}x</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{BatidaService.formatarMinutosDescritivo(funcionario.totalMinutosAtraso)} total</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default DashboardIrregularidades;
