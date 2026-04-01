import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { supabase } from '../config/supabase.js';
import CacheService from '../services/CacheService';
import ConfigService from '../services/ConfigService';
import BatidaService from '../services/BatidaService';
import {
  FUSO_PADRAO_IANA,
  obterIntervaloUtcSemiabertoParaDiaCalendario,
  obterDiaAnteriorCalendarioYmd,
  obterProximoDiaCalendarioYmd
} from '../utils/fusoHorarioData';
import { useLanguage } from '../hooks/useLanguage';
import { FiCalendar, FiRotateCcw, FiClock } from 'react-icons/fi';
import { formatarData } from '../utils/dateUtils';
function HistoricoApontamento() {
  const {
    t
  } = useLanguage();
  const obterDadosEmCache = key => {
    try {
      const userId = sessionStorage.getItem('currentUserId');
      if (userId) {
        const cached = CacheService.get(key, userId);
        if (cached) {
          return cached;
        }
      }
    } catch (e) {}
    return null;
  };
  const obterFiltrosSalvos = () => {
    try {
      const saved = sessionStorage.getItem('historicoFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      dataInicio: '',
      dataFim: '',
      projeto: ''
    };
  };
  const [filtrosHistorico, setFiltrosHistorico] = useState(obterFiltrosSalvos());
  const [apontamentos, setApontamentos] = useState(obterDadosEmCache('apontamentos') || []);
  const [projetos, setProjetos] = useState(obterDadosEmCache('projetos_historico') || []);
  const [carregandoHistoricoApontamentos, setCarregandoHistoricoApontamentos] = useState(false);
  const [exibirSkeletonHistorico, setExibirSkeletonHistorico] = useState(false);
  useEffect(() => {
    carregarDados();
  }, []);
  const carregarDados = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      sessionStorage.setItem('currentUserId', user.id);
      const possuiDadosEmCache = apontamentos.length > 0 || projetos.length > 0;
      if (possuiDadosEmCache) {
        await Promise.all([carregarApontamentos(user.id, true), carregarProjetos(user.id, true)]);
        return;
      }
      setCarregandoHistoricoApontamentos(true);
      setExibirSkeletonHistorico(true);
      await Promise.all([carregarApontamentos(user.id, false), carregarProjetos(user.id, false)]);
    } catch (error) {} finally {
      setCarregandoHistoricoApontamentos(false);
      setExibirSkeletonHistorico(false);
    }
  };
  const carregarProjetos = async (userId, atualizacaoEmSegundoPlano = false) => {
    try {
      if (!atualizacaoEmSegundoPlano) {}
      const {
        data,
        error
      } = await supabase.from('projetos').select('id, nome').eq('status', 'ativo').order('nome');
      if (error) throw error;
      const projetos = data || [];
      setProjetos(projetos);
      if (userId) {
        CacheService.set('projetos_historico', projetos, userId, 10 * 60 * 1000);
      }
    } catch (error) {
      setProjetos([]);
    }
  };
  const carregarApontamentos = async (userId, atualizacaoEmSegundoPlano = false) => {
    try {
      if (!atualizacaoEmSegundoPlano) {
        setCarregandoHistoricoApontamentos(true);
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setApontamentos([]);
        return;
      }

      const resultadoFuso = await ConfigService.buscarConfiguracoes(user.id);
      const fusoUsuario =
        resultadoFuso.success && resultadoFuso.data?.fuso_horario
          ? resultadoFuso.data.fuso_horario
          : FUSO_PADRAO_IANA;

      let consulta = supabase.from('agendamento').select('*').eq('user_id', user.id).order('data', {
        ascending: false
      });
      if (filtrosHistorico.dataInicio) {
        consulta = consulta.gte('data', filtrosHistorico.dataInicio);
      }
      if (filtrosHistorico.dataFim) {
        consulta = consulta.lte('data', filtrosHistorico.dataFim);
      }
      const { data, error } = await consulta;
      if (error) {
        throw error;
      }

      let consultaBatidas = supabase
        .from('batidas')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp_servidor', { ascending: true });
      if (filtrosHistorico.dataInicio) {
        const margemInicio = obterDiaAnteriorCalendarioYmd(filtrosHistorico.dataInicio);
        const { inicioUtcIso } = obterIntervaloUtcSemiabertoParaDiaCalendario(margemInicio, fusoUsuario);
        consultaBatidas = consultaBatidas.gte('timestamp_servidor', inicioUtcIso);
      }
      if (filtrosHistorico.dataFim) {
        const margemFim = obterProximoDiaCalendarioYmd(filtrosHistorico.dataFim);
        const { exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaDiaCalendario(margemFim, fusoUsuario);
        consultaBatidas = consultaBatidas.lt('timestamp_servidor', exclusivoFimUtcIso);
      }
      const { data: dadosBatidas, error: erroBatidas } = await consultaBatidas;
      if (erroBatidas) {
        throw erroBatidas;
      }

      const porDiaOficial = BatidaService.agruparBatidasPorDiaOficialJornada(dadosBatidas || [], fusoUsuario);
      const linhasBatidas = [];
      for (const dataOficial of Object.keys(porDiaOficial)) {
        if (filtrosHistorico.dataInicio && dataOficial < filtrosHistorico.dataInicio) continue;
        if (filtrosHistorico.dataFim && dataOficial > filtrosHistorico.dataFim) continue;
        const lista = porDiaOficial[dataOficial];
        if (!lista?.length) continue;
        const horarios = BatidaService.formatarHorariosQuatroSlotsEstiloApontamento(lista);
        const comRetroativo = lista.some(b => b.retroativo === true);
        const projetoIdRef = lista.map(b => b.projeto_id).find(id => id != null && id !== '');
        linhasBatidas.push({
          id: `batidas-${dataOficial}`,
          data: dataOficial,
          origemLista: 'batidas',
          projetoIdRef,
          entrada1: horarios.entrada1,
          saida1: horarios.saida1,
          entrada2: horarios.entrada2,
          saida2: horarios.saida2,
          horasTrabalhadas: BatidaService.formatarHorasMinutosDecimalStringAPartirDasBatidas(lista),
          anotacoes: comRetroativo ? t('historico.retroactiveNote') : '',
          status: 'REG_APP'
        });
      }

      const idsProjetos = [
        ...new Set([
          ...(data || []).map(a => a.projeto_id).filter(Boolean),
          ...linhasBatidas.map(l => l.projetoIdRef).filter(Boolean)
        ])
      ];
      let mapaProjetos = {};
      if (idsProjetos.length > 0) {
        const { data: projetosData } = await supabase.from('projetos').select('id, nome').in('id', idsProjetos);
        if (projetosData) {
          mapaProjetos = Object.fromEntries(projetosData.map(p => [p.id, p.nome]));
        }
      }

      const apontamentosFormulario = (data || []).map(apontamento => ({
        id: apontamento.id,
        data: apontamento.data,
        origemLista: 'formulario',
        projeto: mapaProjetos[apontamento.projeto_id] || t('historico.noProjectLabel'),
        entrada1: apontamento.entrada1 || '--:--',
        saida1: apontamento.saida1 || '--:--',
        entrada2: apontamento.entrada2 || '--:--',
        saida2: apontamento.saida2 || '--:--',
        horasTrabalhadas: calcularHorasTrabalhadas(apontamento),
        anotacoes: apontamento.observacao,
        status: apontamento.status || 'P'
      }));

      const apontamentosBatidasMapeados = linhasBatidas.map(linha => ({
        ...linha,
        projeto: linha.projetoIdRef ? mapaProjetos[linha.projetoIdRef] || t('historico.noProjectLabel') : t('historico.noProjectLabel')
      }));

      const apontamentosMapeados = [...apontamentosFormulario, ...apontamentosBatidasMapeados].sort((a, b) =>
        String(b.data).localeCompare(String(a.data))
      );

      setApontamentos(apontamentosMapeados);
      if (userId) {
        CacheService.set('apontamentos', apontamentosMapeados, userId, 10 * 60 * 1000);
      }
    } catch (error) {
      setApontamentos([]);
    } finally {
      if (!atualizacaoEmSegundoPlano) {
        setCarregandoHistoricoApontamentos(false);
      }
    }
  };
  const calcularHorasTrabalhadas = apontamento => {
    let totalMinutos = 0;
    if (apontamento.entrada1 && apontamento.saida1) {
      const entrada1 = new Date(`2000-01-01T${apontamento.entrada1}`);
      const saida1 = new Date(`2000-01-01T${apontamento.saida1}`);
      totalMinutos += Math.floor((saida1 - entrada1) / (1000 * 60));
    }
    if (apontamento.entrada2 && apontamento.saida2) {
      const entrada2 = new Date(`2000-01-01T${apontamento.entrada2}`);
      const saida2 = new Date(`2000-01-01T${apontamento.saida2}`);
      totalMinutos += Math.floor((saida2 - entrada2) / (1000 * 60));
    }
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };
  const aoAlterarFiltroHistoricoApontamentos = e => {
    const {
      name,
      value
    } = e.target;
    const novosFiltros = {
      ...filtrosHistorico,
      [name]: value
    };
    setFiltrosHistorico(novosFiltros);
    try {
      sessionStorage.setItem('historicoFilters', JSON.stringify(novosFiltros));
    } catch (e) {}
  };
  const processarBuscaHistoricoApontamentos = async e => {
    e.preventDefault();
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      CacheService.remove('apontamentos', user.id);
      await carregarApontamentos(user.id, false);
    }
  };
  const limparFiltrosHistoricoApontamentos = async () => {
    const filtrosPadrao = {
      dataInicio: '',
      dataFim: '',
      projeto: ''
    };
    setFiltrosHistorico(filtrosPadrao);
    try {
      sessionStorage.removeItem('historicoFilters');
    } catch (e) {}
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        CacheService.remove('apontamentos', user.id);
        await carregarApontamentos(user.id, false);
      }
    } catch (error) {}
  };
  const limparFiltrosHistoricoApontamentosOLD = async () => {
    try {
      setCarregandoHistoricoApontamentos(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setApontamentos([]);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('agendamento').select('*').eq('user_id', user.id).order('data', {
        ascending: false
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        setApontamentos([]);
        return;
      }
      const idsProjetos = [...new Set(data.map(apontamento => apontamento.projeto_id).filter(id => id))];
      let mapaProjetos = {};
      if (idsProjetos.length > 0) {
        const {
          data: projetosData
        } = await supabase.from('projetos').select('id, nome').in('id', idsProjetos);
        if (projetosData) {
          mapaProjetos = Object.fromEntries(projetosData.map(p => [p.id, p.nome]));
        }
      }
    } catch (error) {}
  };
  const apontamentosFiltrados = apontamentos.filter(apontamento => {
    const correspondeProjeto = !filtrosHistorico.projeto || apontamento.projeto.toLowerCase().includes(filtrosHistorico.projeto.toLowerCase());
    return correspondeProjeto;
  });
  const obterInfoStatusHistorico = status => {
    switch (status) {
      case 'A':
        return {
          text: t('historico.approved'),
          color: 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
          icon: '✓'
        };
      case 'R':
        return {
          text: t('historico.rejected'),
          color: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
          icon: '✗'
        };
      case 'P':
        return {
          text: t('historico.pending'),
          color: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
          icon: <FiClock className="w-4 h-4" />
        };
      case 'REG_APP':
        return {
          text: t('historico.recordSourceApp'),
          color: 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
          icon: '⏱'
        };
      default:
        return {
          text: t('historico.noStatus'),
          color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
          icon: '?'
        };
    }
  };
  return <MainLayout title={t('historico.title')} subtitle={t('historico.subtitle')}>
      {!carregandoHistoricoApontamentos && apontamentosFiltrados.length > 0 && <div className="mb-4 yt-card p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('historico.periodSummary')}</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-4 text-center">
              <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{apontamentosFiltrados.length}</div>
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-200 font-medium">{t('historico.records')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-4 text-center">
              <div className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {apontamentosFiltrados.reduce((total, apontamento) => {
              const [h, m] = apontamento.horasTrabalhadas.split(':');
              return total + parseInt(h) + parseInt(m) / 60;
            }, 0).toFixed(1)}h
              </div>
              <div className="text-xs sm:text-sm text-green-700 dark:text-green-200 font-medium">{t('historico.totalWorked')}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg p-2 sm:p-4 text-center">
              <div className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(apontamentosFiltrados.map(apontamento => apontamento.projeto)).size}
              </div>
              <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-200 font-medium">Projetos</div>
            </div>
          </div>
        </div>}

      <div className="yt-card p-4">
          <form onSubmit={processarBuscaHistoricoApontamentos} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end mb-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium yt-label mb-1">
                {t('historico.startDate')}
              </label>
              <input type="date" id="dataInicio" name="dataInicio" value={filtrosHistorico.dataInicio} onChange={aoAlterarFiltroHistoricoApontamentos} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
            </div>
            <div>
              <label htmlFor="dataFim" className="block text-sm font-medium yt-label mb-1">
                {t('historico.endDate')}
              </label>
              <input type="date" id="dataFim" name="dataFim" value={filtrosHistorico.dataFim} onChange={aoAlterarFiltroHistoricoApontamentos} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
            </div>
            <div>
              <label htmlFor="projeto" className="block text-sm font-medium yt-label mb-1">
                Projeto:
              </label>
              <select id="projeto" name="projeto" value={filtrosHistorico.projeto} onChange={aoAlterarFiltroHistoricoApontamentos} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                <option value="">{t('historico.allProjects')}</option>
                {projetos.map(projeto => <option key={projeto.id} value={projeto.nome}>{projeto.nome}</option>)}
                <option value={t('historico.noProjectLabel')}>{t('historico.noProjectLabel')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={carregandoHistoricoApontamentos} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {carregandoHistoricoApontamentos ? t('comum.loading') : t('historico.search')}
              </button>
              <button type="button" onClick={limparFiltrosHistoricoApontamentos} disabled={carregandoHistoricoApontamentos} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50">
                {t('historico.clear')}
              </button>
            </div>
          </form>

        <div className="space-y-3">
          {exibirSkeletonHistorico ? <div className="yt-inset rounded-lg border border-gray-300 dark:border-gray-600 p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('historico.loadingRecords')}</p>
            </div> : apontamentosFiltrados.length === 0 ? <div className="yt-inset rounded-lg border border-gray-300 dark:border-gray-600 p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('historico.noRecordsForFilters')}</p>
            </div> : apontamentosFiltrados.map(apontamento => {
          const infoStatus = obterInfoStatusHistorico(apontamento.status);
          return <div key={apontamento.id} className="yt-card border-gray-300 dark:border-gray-700 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100">{formatarData(apontamento.data, 'DD/MM/YYYY')}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${infoStatus.color}`}>
                        {infoStatus.icon} {infoStatus.text}
                      </span>
                      {apontamento.origemLista === 'formulario' && (
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                          {t('historico.recordSourceForm')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{apontamento.projeto}</p>
                  </div>
                  <div className="sm:text-right flex-shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{apontamento.horasTrabalhadas}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('historico.hoursLabel')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded p-2">
                      <div className="text-xs text-green-700 dark:text-green-300 font-medium">{t('historico.entry1Label')}</div>
                      <div className="text-sm font-bold text-green-800 dark:text-green-200">{apontamento.entrada1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium">{t('historico.exit1Label')}</div>
                      <div className="text-sm font-bold text-red-800 dark:text-red-200">{apontamento.saida1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded p-2">
                      <div className="text-xs text-green-700 dark:text-green-300 font-medium">{t('historico.entry2Label')}</div>
                      <div className="text-sm font-bold text-green-800 dark:text-green-200">{apontamento.entrada2}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium">{t('historico.exit2Label')}</div>
                      <div className="text-sm font-bold text-red-800 dark:text-red-200">{apontamento.saida2}</div>
                    </div>
                  </div>
                </div>

                {apontamento.anotacoes && <div className="mt-2 yt-inset rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">{t('historico.notes')}</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{apontamento.anotacoes}</div>
                  </div>}
              </div>;
        })}
        </div>
      </div>
    </MainLayout>;
}
export default HistoricoApontamento;
