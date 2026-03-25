import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { supabase } from '../config/supabase.js';
import CacheService from '../services/CacheService';
import { useLanguage } from '../hooks/useLanguage';
import { FiCalendar, FiRotateCcw, FiClock } from 'react-icons/fi';
function HistoricoApontamento() {
  const {
    t
  } = useLanguage();
  const getCachedData = key => {
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
  const getSavedFilters = () => {
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
  const [filters, setFilters] = useState(getSavedFilters());
  const [apontamentos, setApontamentos] = useState(getCachedData('apontamentos') || []);
  const [projetos, setProjetos] = useState(getCachedData('projetos_historico') || []);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
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
      const hasCachedData = apontamentos.length > 0 || projetos.length > 0;
      if (hasCachedData) {
        await Promise.all([carregarApontamentos(user.id, true), carregarProjetos(user.id, true)]);
        return;
      }
      setLoading(true);
      setShowSkeleton(true);
      await Promise.all([carregarApontamentos(user.id, false), carregarProjetos(user.id, false)]);
    } catch (error) {} finally {
      setLoading(false);
      setShowSkeleton(false);
    }
  };
  const carregarProjetos = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {}
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
  const carregarApontamentos = async (userId, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
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
      let query = supabase.from('agendamento').select(`
          *
        `).eq('user_id', user.id).order('data', {
        ascending: false
      });
      if (filters.dataInicio) {
        query = query.gte('data', filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte('data', filters.dataFim);
      }
      const {
        data,
        error
      } = await query;
      if (error) {
        throw error;
      }
      if (!data || data.length === 0) {
        setApontamentos([]);
        return;
      }
      const projetoIds = [...new Set(data.map(apt => apt.projeto_id).filter(id => id))];
      let projetosMap = {};
      if (projetoIds.length > 0) {
        const {
          data: projetosData
        } = await supabase.from('projetos').select('id, nome').in('id', projetoIds);
        if (projetosData) {
          projetosMap = Object.fromEntries(projetosData.map(p => [p.id, p.nome]));
        }
      }
      const apontamentosMapeados = data.map(apt => ({
        id: apt.id,
        data: apt.data,
        projeto: projetosMap[apt.projeto_id] || 'Sem Projeto',
        entrada1: apt.entrada1 || '--:--',
        saida1: apt.saida1 || '--:--',
        entrada2: apt.entrada2 || '--:--',
        saida2: apt.saida2 || '--:--',
        horasTrabalhadas: calcularHorasTrabalhadas(apt),
        anotacoes: apt.observacao,
        status: apt.status || 'P'
      }));
      setApontamentos(apontamentosMapeados);
      if (userId) {
        CacheService.set('apontamentos', apontamentosMapeados, userId, 10 * 60 * 1000);
      }
    } catch (error) {
      setApontamentos([]);
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
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
  const handleFilterChange = e => {
    const {
      name,
      value
    } = e.target;
    const newFilters = {
      ...filters,
      [name]: value
    };
    setFilters(newFilters);
    try {
      sessionStorage.setItem('historicoFilters', JSON.stringify(newFilters));
    } catch (e) {}
  };
  const handleSearch = async e => {
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
  const handleClearFilters = async () => {
    const defaultFilters = {
      dataInicio: '',
      dataFim: '',
      projeto: ''
    };
    setFilters(defaultFilters);
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
  const handleClearFiltersOLD = async () => {
    try {
      setLoading(true);
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
      const projetoIds = [...new Set(data.map(apt => apt.projeto_id).filter(id => id))];
      let projetosMap = {};
      if (projetoIds.length > 0) {
        const {
          data: projetosData
        } = await supabase.from('projetos').select('id, nome').in('id', projetoIds);
        if (projetosData) {
          projetosMap = Object.fromEntries(projetosData.map(p => [p.id, p.nome]));
        }
      }
    } catch (error) {}
  };
  const filteredApontamentos = apontamentos.filter(apontamento => {
    const matchProjeto = !filters.projeto || apontamento.projeto.toLowerCase().includes(filters.projeto.toLowerCase());
    return matchProjeto;
  });
  const formatDate = dateString => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };
  const getStatusInfo = status => {
    switch (status) {
      case 'A':
        return {
          text: t('history.approved'),
          color: 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
          icon: '✓'
        };
      case 'R':
        return {
          text: t('history.rejected'),
          color: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
          icon: '✗'
        };
      case 'P':
        return {
          text: t('history.pending'),
          color: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
          icon: <FiClock className="w-4 h-4" />
        };
      default:
        return {
          text: t('history.noStatus'),
          color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
          icon: '?'
        };
    }
  };
  return <MainLayout title={t('history.title')} subtitle={t('history.subtitle')}>
      {!loading && filteredApontamentos.length > 0 && <div className="mb-4 yt-card p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('history.periodSummary')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{filteredApontamentos.length}</div>
              <div className="text-sm text-blue-700 dark:text-blue-200 font-medium">{t('history.records')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {filteredApontamentos.reduce((total, apt) => {
              const [h, m] = apt.horasTrabalhadas.split(':');
              return total + parseInt(h) + parseInt(m) / 60;
            }, 0).toFixed(1)}h
              </div>
              <div className="text-sm text-green-700 dark:text-green-200 font-medium">{t('history.totalWorked')}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(filteredApontamentos.map(apt => apt.projeto)).size}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-200 font-medium">Projetos</div>
            </div>
          </div>
        </div>}

      <div className="yt-card p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
            <div>
              <label htmlFor="dataInicio" className="block text-sm font-medium yt-label mb-1">
                {t('history.startDate')}
              </label>
              <input type="date" id="dataInicio" name="dataInicio" value={filters.dataInicio} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
            </div>
            <div>
              <label htmlFor="dataFim" className="block text-sm font-medium yt-label mb-1">
                {t('history.endDate')}
              </label>
              <input type="date" id="dataFim" name="dataFim" value={filters.dataFim} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
            </div>
            <div>
              <label htmlFor="projeto" className="block text-sm font-medium yt-label mb-1">
                Projeto:
              </label>
              <select id="projeto" name="projeto" value={filters.projeto} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                <option value="">{t('history.allProjects')}</option>
                {projetos.map(projeto => <option key={projeto.id} value={projeto.nome}>{projeto.nome}</option>)}
                <option value="Sem Projeto">Sem Projeto</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? t('common.loading') : t('history.search')}
              </button>
              <button type="button" onClick={handleClearFilters} disabled={loading} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50">
                {t('history.clear')}
              </button>
            </div>
          </form>

        <div className="space-y-3">
          {showSkeleton ? <div className="yt-inset rounded-lg border border-gray-300 dark:border-gray-600 p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('history.loadingRecords')}</p>
            </div> : filteredApontamentos.length === 0 ? <div className="yt-inset rounded-lg border border-gray-300 dark:border-gray-600 p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('history.noRecordsForFilters')}</p>
            </div> : filteredApontamentos.map(apontamento => {
          const statusInfo = getStatusInfo(apontamento.status);
          return <div key={apontamento.id} className="yt-card border-gray-300 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{formatDate(apontamento.data)}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{apontamento.projeto}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{apontamento.horasTrabalhadas}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('history.hoursLabel')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded p-2">
                      <div className="text-xs text-green-700 dark:text-green-300 font-medium">{t('history.entry1Label')}</div>
                      <div className="text-sm font-bold text-green-800 dark:text-green-200">{apontamento.entrada1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium">{t('history.exit1Label')}</div>
                      <div className="text-sm font-bold text-red-800 dark:text-red-200">{apontamento.saida1}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded p-2">
                      <div className="text-xs text-green-700 dark:text-green-300 font-medium">{t('history.entry2Label')}</div>
                      <div className="text-sm font-bold text-green-800 dark:text-green-200">{apontamento.entrada2}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded p-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium">{t('history.exit2Label')}</div>
                      <div className="text-sm font-bold text-red-800 dark:text-red-200">{apontamento.saida2}</div>
                    </div>
                  </div>
                </div>

                {apontamento.anotacoes && <div className="mt-2 yt-inset rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">{t('history.notes')}</div>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{apontamento.anotacoes}</div>
                  </div>}
              </div>;
        })}
        </div>
      </div>
    </MainLayout>;
}
export default HistoricoApontamento;
