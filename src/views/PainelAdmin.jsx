import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import GerenciamentoEmpresas from '../components/GerenciamentoEmpresas';
import Modal from '../components/ui/Modal';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../config/supabase.js';
import NotificationService from '../services/NotificationService';
import AuditoriaService from '../services/AuditoriaService';
import { getLocalDateString, formatDate } from '../utils/dateUtils';
import { FiUsers, FiCheckCircle, FiClock, FiLock, FiEye, FiX, FiRefreshCw, FiCheck, FiXCircle, FiPlus, FiBriefcase, FiMoreVertical, FiTrash2, FiUser } from 'react-icons/fi';
function PainelAdministrativo() {
  const {
    t
  } = useLanguage();
  const {
    showSuccess,
    showError
  } = useToast();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('funcionarios');
  const [diasComPontosPendentes, setDiasComPontosPendentes] = useState([]);
  const [totalPontosPendentes, setTotalPontosPendentes] = useState(0);
  const [menuAberto, setMenuAberto] = useState(null);
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState({
    isOpen: false,
    funcionario: null
  });
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const [contextoEmpresaCarregado, setContextoEmpresaCarregado] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    definirDataPadrao();
    aplicarFiltrosDaNotificacao();
    carregarSuperiorEmpresaId();
  }, []);
  useEffect(() => {
    if (!dataSelecionada || !contextoEmpresaCarregado) return;
    carregarFuncionarios();
  }, [dataSelecionada, superiorEmpresaId, contextoEmpresaCarregado]);
  useEffect(() => {
    if (superiorEmpresaId) {
      carregarDiasComPontosPendentes();
    }
  }, [superiorEmpresaId]);
  const carregarSuperiorEmpresaId = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSuperiorEmpresaId(null);
        return;
      }
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
      if (error) throw error;
      setSuperiorEmpresaId(profile?.superior_empresa_id || null);
    } catch (error) {
      setSuperiorEmpresaId(null);
    } finally {
      setContextoEmpresaCarregado(true);
    }
  };
  const definirDataPadrao = () => {
    if (!dataSelecionada) {
      const hoje = getLocalDateString();
      setDataSelecionada(hoje);
    }
  };
  const aplicarFiltrosDaNotificacao = () => {
    const filterDate = sessionStorage.getItem('filterDate');
    const filterStatus = sessionStorage.getItem('filterStatus');
    if (filterDate) {
      setDataSelecionada(filterDate);
      sessionStorage.removeItem('filterDate');
    }
    if (filterStatus) {
      sessionStorage.removeItem('filterStatus');
    }
  };
  const dataLimitePendenciasParaCalendario = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 18);
    return d.toISOString().slice(0, 10);
  };
  const carregarDiasComPontosPendentes = async () => {
    try {
      if (!superiorEmpresaId) {
        return;
      }
      const desde = dataLimitePendenciasParaCalendario();
      const [{
        count: totalPendentes,
        error: errCount
      }, {
        data: amostraDatas,
        error: errDatas
      }] = await Promise.all([supabase.from('agendamento').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'P').eq('superior_empresa_id', superiorEmpresaId), supabase.from('agendamento').select('data').eq('status', 'P').eq('superior_empresa_id', superiorEmpresaId).gte('data', desde).order('data', {
        ascending: false
      }).limit(600)]);
      if (errCount) throw errCount;
      if (errDatas) throw errDatas;
      const total = totalPendentes ?? 0;
      if (total > 0 && amostraDatas && amostraDatas.length > 0) {
        const datasUnicas = [...new Set(amostraDatas.map(item => item.data))];
        setDiasComPontosPendentes(datasUnicas);
        setTotalPontosPendentes(total);
      } else {
        setDiasComPontosPendentes([]);
        setTotalPontosPendentes(0);
      }
    } catch (error) {
      setDiasComPontosPendentes([]);
      setTotalPontosPendentes(0);
    }
  };
  const selecionarData = data => {
    setDataSelecionada(data);
  };
  const carregarFuncionarios = async () => {
    try {
      setLoading(true);
      if (!superiorEmpresaId) {
        setFuncionarios([]);
        return;
      }
      const {
        data: funcionariosData,
        error: funcionariosError
      } = await supabase.from('profiles').select(`
          id,
          nome,
          email,
          telefone,
          cargo,
          departamento,
          data_admissao,
          carga_horaria,
          avatar_url,
          is_active,
          role,
          created_at,
          updated_at,
          superior_empresa_id
        `).eq('superior_empresa_id', superiorEmpresaId).order('nome');
      if (funcionariosError) throw funcionariosError;
      if (!funcionariosData || funcionariosData.length === 0) {
        setFuncionarios([]);
        return;
      }
      const funcionarioIds = new Set(funcionariosData.map(f => f.id));
      const {
        data: pontosDoDiaTenant
      } = await supabase.from('agendamento').select('id, user_id, data, entrada1, saida1, entrada2, saida2, status').eq('data', dataSelecionada).eq('superior_empresa_id', superiorEmpresaId);
      const pontosFiltrados = (pontosDoDiaTenant || []).filter(p => funcionarioIds.has(p.user_id));
      const funcionariosComPonto = funcionariosData.map(funcionario => {
        const pontoData = pontosFiltrados.find(p => p.user_id === funcionario.id);
        return {
          ...funcionario,
          pontoHoje: pontoData || null,
          statusPonto: pontoData ? pontoData.status === 'A' ? 'completed' : pontoData.status === 'R' ? 'rejected' : 'pending' : 'ausente'
        };
      });
      setFuncionarios(funcionariosComPonto);
    } catch (error) {
      setFuncionarios([]);
    } finally {
      setLoading(false);
    }
  };
  const calcularHorasTrabalhadas = ponto => {
    if (!ponto) return '0h';
    let totalMinutos = 0;
    if (ponto.entrada1 && ponto.saida1) {
      const entrada1 = new Date(`2000-01-01T${ponto.entrada1}`);
      const saida1 = new Date(`2000-01-01T${ponto.saida1}`);
      totalMinutos += Math.floor((saida1 - entrada1) / (1000 * 60));
    }
    if (ponto.entrada2 && ponto.saida2) {
      const entrada2 = new Date(`2000-01-01T${ponto.entrada2}`);
      const saida2 = new Date(`2000-01-01T${ponto.saida2}`);
      totalMinutos += Math.floor((saida2 - entrada2) / (1000 * 60));
    }
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    if (horas === 0) return `${minutos}min`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h${minutos}min`;
  };
  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200';
      case 'ausente':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };
  const getStatusText = status => {
    switch (status) {
      case 'completed':
        return t('admin.approved');
      case 'pending':
        return t('admin.pending');
      case 'rejected':
        return t('history.rejected');
      case 'ausente':
        return t('admin.noRecord');
      default:
        return 'Indefinido';
    }
  };
  const formatarData = dataString => {
    if (!dataString) return '-';
    return formatDate(dataString, 'DD/MM/YYYY');
  };
  const funcionariosFiltrados = funcionarios.filter(funcionario => {
    if (abaAtiva === 'funcionarios' && funcionario.is_active === false) {
      return false;
    }
    const matchTexto = !buscaTexto || funcionario.nome?.toLowerCase().includes(buscaTexto.toLowerCase()) || funcionario.email?.toLowerCase().includes(buscaTexto.toLowerCase()) || funcionario.departamento?.toLowerCase().includes(buscaTexto.toLowerCase()) || funcionario.telefone?.includes(buscaTexto) || funcionario.role === 'admin' && 'administrador'.includes(buscaTexto.toLowerCase()) || funcionario.role === 'usuario' && 'usuario'.includes(buscaTexto.toLowerCase());
    return matchTexto;
  });
  const toggleStatusFuncionario = async (funcionarioId, novoStatus) => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        is_active: novoStatus
      }).eq('id', funcionarioId);
      if (error) throw error;
      setFuncionarios(prevFuncionarios => prevFuncionarios.map(funcionario => funcionario.id === funcionarioId ? {
        ...funcionario,
        is_active: novoStatus
      } : funcionario));
    } catch (error) {
      alert('Erro ao atualizar status do funcionário');
    }
  };
  const excluirFuncionario = async funcionarioId => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        is_active: false
      }).eq('id', funcionarioId);
      if (error) throw error;
      setFuncionarios(prevFuncionarios => prevFuncionarios.map(funcionario => funcionario.id === funcionarioId ? {
        ...funcionario,
        is_active: false
      } : funcionario));
      setModalConfirmarExclusao({
        isOpen: false,
        funcionario: null
      });
      showSuccess(t('admin.employeeRemoved'));
    } catch (error) {
      showError(error.message || 'Erro ao remover funcionário');
    }
  };
  const reativarFuncionario = async funcionarioId => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        is_active: true
      }).eq('id', funcionarioId);
      if (error) throw error;
      setFuncionarios(prevFuncionarios => prevFuncionarios.map(funcionario => funcionario.id === funcionarioId ? {
        ...funcionario,
        is_active: true
      } : funcionario));
      showSuccess(t('admin.employeeReactivated'));
    } catch (error) {
      showError(`${t('admin.errorReactivating')}: ${error.message || t('admin.unknownError')}`);
    }
  };
  const verPerfilFuncionario = funcionarioId => {
    navigate(`/perfil/${funcionarioId}`);
  };
  const aprovarPonto = async (funcionarioId, agendamentoId) => {
    try {
      const {
        data: agendamento,
        error: fetchError
      } = await supabase.from('agendamento').select('*').eq('id', agendamentoId).single();
      if (fetchError) throw fetchError;

      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;

      const {
        error
      } = await supabase.from('agendamento').update({
        status: 'A',
        aprovado_por: adminId,
        aprovado_em: new Date().toISOString()
      }).eq('id', agendamentoId);
      if (error) throw error;

      await AuditoriaService.registrar({
        userId: adminId,
        acao: 'aprovar_ponto',
        tabela: 'agendamento',
        registroId: agendamentoId,
        dadosAnteriores: { status: agendamento.status },
        dadosNovos: { status: 'A', aprovado_por: adminId }
      });

      await NotificationService.notificarPontoAprovado(funcionarioId, agendamentoId, agendamento.data);
      await carregarFuncionarios();
      await carregarDiasComPontosPendentes();
      showSuccess(t('admin.timeEntryApproved'));
    } catch (error) {
      showError(`${t('admin.errorApproving')}: ${error.message || t('admin.unknownError')}`);
    }
  };
  const desaprovarPonto = async (funcionarioId, agendamentoId) => {
    try {
      const {
        data: agendamento,
        error: fetchError
      } = await supabase.from('agendamento').select('*').eq('id', agendamentoId).single();
      if (fetchError) throw fetchError;

      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;

      const {
        error
      } = await supabase.from('agendamento').update({
        status: 'R',
        aprovado_por: adminId,
        aprovado_em: new Date().toISOString(),
        motivo_rejeicao: 'Ponto rejeitado pelo administrador'
      }).eq('id', agendamentoId);
      if (error) throw error;

      await AuditoriaService.registrar({
        userId: adminId,
        acao: 'rejeitar_ponto',
        tabela: 'agendamento',
        registroId: agendamentoId,
        dadosAnteriores: { status: agendamento.status },
        dadosNovos: { status: 'R', motivo_rejeicao: 'Ponto rejeitado pelo administrador' }
      });

      await NotificationService.notificarPontoRejeitado(funcionarioId, agendamentoId, agendamento.data, 'Ponto rejeitado pelo administrador');
      await carregarFuncionarios();
      await carregarDiasComPontosPendentes();
      showError(t('admin.timeEntryDisapproved'));
    } catch (error) {
      showError(`${t('admin.errorDisapproving')}: ${error.message || t('admin.unknownError')}`);
    }
  };
  return <MainLayout title={t('common.adminPanelTitle')} subtitle={t('common.systemManagement')}>
      <div className="yt-card overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button type="button" onClick={() => setAbaAtiva('funcionarios')} className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${abaAtiva === 'funcionarios' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <FiUsers className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.employees')}
            </button>
            <button type="button" onClick={() => setAbaAtiva('removidos')} className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${abaAtiva === 'removidos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <FiLock className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.removed')}
            </button>
            <button type="button" onClick={() => setAbaAtiva('empresas')} className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${abaAtiva === 'empresas' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <FiBriefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('admin.companies')}
            </button>
          </nav>
        </div>

        <div className="p-3 sm:p-6">
          {abaAtiva === 'funcionarios' ? <div>
              <div className="mb-6 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiUsers className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 truncate">{t('admin.employees')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 truncate">{funcionarios.filter(f => f.is_active !== false).length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200 truncate">{t('admin.approved')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100 truncate">
                        {funcionarios.filter(f => f.is_active !== false && f.statusPonto === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiClock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-200 truncate">{t('admin.pending')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-100 truncate">
                        {totalPontosPendentes}
                      </p>
                   
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 min-h-[80px] sm:min-h-[90px]">
                  <div className="flex items-center h-full">
                    <div className="flex-shrink-0">
                      <FiLock className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200 truncate">{t('admin.noRecord')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100 truncate">
                        {funcionarios.filter(f => f.is_active !== false && !f.pontoHoje).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {diasComPontosPendentes.length > 0 && <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiClock className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-100 mb-2">
                        {diasComPontosPendentes.length === 1 ? t('admin.pendingForDay') : t('admin.pendingForDays')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {diasComPontosPendentes.slice(0, 5).map((data, index) => <button type="button" key={data} onClick={() => selecionarData(data)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dataSelecionada === data ? 'bg-yellow-600 text-white' : 'bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-950/50 border border-yellow-300 dark:border-yellow-700'}`} title={`${t('admin.filterByDate')} ${formatarData(data)}`}>
                            {formatarData(data)}
                          </button>)}
                        {diasComPontosPendentes.length > 5 && <>
                            <span className="px-3 py-1.5 text-sm text-yellow-700 dark:text-yellow-300">...</span>
                            <div className="relative group">
                              <button type="button" className="px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors">
                                + {diasComPontosPendentes.length - 5} {t('admin.moreDates')}
                              </button>
                              <div className="absolute left-0 top-full mt-2 w-64 yt-modal-surface border-yellow-300 dark:border-yellow-700 rounded-lg shadow-lg p-3 z-10 hidden group-hover:block">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('admin.otherPendingDates')}</p>
                                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                  {diasComPontosPendentes.slice(5).map(data => <button type="button" key={data} onClick={() => selecionarData(data)} className="px-2 py-1 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs" title={`${t('admin.filterByDate')} ${formatarData(data)}`}>
                                      {formatarData(data)}
                                    </button>)}
                                </div>
                              </div>
                            </div>
                          </>}
                      </div>
                    </div>
                  </div>
                </div>}

              <div className="mb-4 sm:mb-6 p-2 sm:p-3 lg:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 compact:gap-1 items-stretch lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 compact:gap-1 items-stretch sm:items-center">
                    <div className="flex items-center gap-1 sm:gap-2 compact:gap-1">
                      <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('admin.searchLabel')}</label>
                      <input type="text" value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="w-full sm:w-40 md:w-48 lg:w-56 xl:w-64 px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs lg:text-sm" />
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 compact:gap-1">
                      <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap">
                        {t('admin.dateLabel')}
                        {diasComPontosPendentes.length > 0 && !diasComPontosPendentes.includes(dataSelecionada) && <span className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-yellow-400 text-yellow-900 rounded-full text-[9px] sm:text-xs font-bold" title={t('admin.pendingInOtherDates')}>
                            {diasComPontosPendentes.length}
                          </span>}
                      </label>
                      <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} className="w-full sm:w-auto px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs lg:text-sm" />
                    </div>
                  </div>

                  <button type="button" onClick={() => navigate('/cadastro')} className="w-full sm:w-auto px-2 sm:px-3 lg:px-4 compact:px-3 py-1 sm:py-1.5 lg:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1 sm:gap-2 compact:gap-1 text-[10px] sm:text-xs lg:text-sm whitespace-nowrap">
                    <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> 
                    <span className="hidden md:inline">{t('admin.addEmployee')}</span>
                    <span className="inline md:hidden">{t('common.new')}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto mt-6 -mx-3 sm:-mx-4 lg:mx-0">
                {loading ? <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{t('admin.loading')}</p>
                  </div> : <table className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 dark:bg-gray-800/90">
                      <tr>
                        <th className="px-0 sm:px-1 lg:px-2 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-6 sm:w-8 lg:w-10">
                          
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.name')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.timeRecord')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.admission')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.hours')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="yt-table-body">
                      {funcionariosFiltrados.length === 0 ? <tr>
                          <td colSpan="7" className="px-1 sm:px-2 md:px-4 lg:px-6 py-4 text-center text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                            {buscaTexto ? t('admin.noEmployeesFiltered') : t('admin.noEmployees')}
                          </td>
                        </tr> : funcionariosFiltrados.map(funcionario => <tr key={funcionario.id} className="yt-row-hover">
                            <td className="px-0 sm:px-1 lg:px-2 py-2 sm:py-3 lg:py-4 whitespace-nowrap relative">
                              <button type="button" onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)} className="p-0.5 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Opções">
                                <FiMoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-400" />
                              </button>
                              
                              {menuAberto === funcionario.id && <>
                                  <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
                                  <div className="absolute left-8 top-0 z-20 mt-2 w-48 yt-modal-surface rounded-md shadow-lg whitespace-normal">
                                    <div className="flex flex-col py-1">
                                      <button type="button" onClick={() => {
                            verPerfilFuncionario(funcionario.id);
                            setMenuAberto(null);
                          }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 shrink-0">
                                        <FiUser className="w-4 h-4" /> {t('admin.viewProfile')}
                                      </button>
                                      <button type="button" onClick={() => {
                            setModalConfirmarExclusao({
                              isOpen: true,
                              funcionario
                            });
                            setMenuAberto(null);
                          }} className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 shrink-0">
                                        <FiTrash2 className="w-4 h-4" /> {t('admin.removeEmployee')}
                                      </button>
                                    </div>
                                  </div>
                                </>}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-500">{funcionario.email}</div>
                                <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-400">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <span className={`inline-flex px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 text-[8px] sm:text-[9px] md:text-xs font-semibold rounded-full ${getStatusColor(funcionario.statusPonto)}`}>
                                {getStatusText(funcionario.statusPonto)}
                              </span>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {calcularHorasTrabalhadas(funcionario.pontoHoje)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium">
                              {funcionario.pontoHoje ? <div className="flex items-center gap-2">
                                  {funcionario.statusPonto === 'pending' && <>
                                      <button onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)} className="text-green-600 hover:text-green-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors text-[9px] sm:text-[10px] md:text-xs" title="Aprovar ponto">
                                        <FiCheck className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.approve')}</span>
                                      </button>
                                      <button onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-[9px] sm:text-[10px] md:text-xs" title="Desaprovar ponto">
                                        <FiXCircle className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.disapprove')}</span>
                                      </button>
                                    </>}
                                  {funcionario.statusPonto === 'completed' && <button onClick={() => desaprovarPonto(funcionario.id, funcionario.pontoHoje.id)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-[9px] sm:text-[10px] md:text-xs" title="Desaprovar ponto">
                                      <FiXCircle className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.disapprove')}</span>
                                    </button>}
                                  {funcionario.statusPonto === 'rejected' && <button onClick={() => aprovarPonto(funcionario.id, funcionario.pontoHoje.id)} className="text-green-600 hover:text-green-900 inline-flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors text-[9px] sm:text-[10px] md:text-xs" title="Aprovar ponto">
                                      <FiCheck className="w-3 h-3 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">{t('admin.approve')}</span>
                                    </button>}
                                </div> : <span className="text-gray-400 text-[9px] sm:text-[10px] md:text-xs">{t('admin.noTimeEntry')}</span>}
                            </td>
                          </tr>)}
                    </tbody>
                  </table>}
              </div>
            </div> : abaAtiva === 'removidos' ? <div>
             

              <div className="overflow-x-auto">
                {loading ? <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
                  </div> : <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/90">
                      <tr>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.actionsColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.nameColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.roleColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.admissionColumn')}
                        </th>
                        <th className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-[9px] sm:text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('admin.removalColumn')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="yt-table-body">
                      {funcionarios.filter(f => f.is_active === false).length === 0 ? <tr>
                          <td colSpan="5" className="px-0.5 sm:px-2 md:px-4 lg:px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                            {t('admin.noRemovedEmployees')}
                          </td>
                        </tr> : funcionarios.filter(f => f.is_active === false).map(funcionario => <tr key={funcionario.id} className="yt-row-hover">
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div className="relative">
                                <button type="button" onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)} className="p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" title="Opções">
                                  <FiMoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-400" />
                                </button>

                                {menuAberto === funcionario.id && <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)}></div>
                                    <div className="absolute left-8 top-0 z-20 mt-2 w-48 yt-modal-surface rounded-md shadow-lg whitespace-normal">
                                      <div className="flex flex-col py-1">
                                        <button type="button" onClick={() => {
                              reativarFuncionario(funcionario.id);
                              setMenuAberto(null);
                            }} className="w-full px-4 py-2 text-left text-xs sm:text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 flex items-center gap-2 shrink-0">
                                        <FiRefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('admin.reactivate')}
                                      </button>
                                      </div>
                                    </div>
                                  </>}
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{funcionario.nome || 'Nome não informado'}</div>
                                <div className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-500 dark:text-gray-400">{funcionario.email}</div>
                                <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-400 dark:text-gray-500">{funcionario.telefone}</div>
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap">
                              <div>
                                {!funcionario.cargo && !funcionario.departamento ? <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-400 dark:text-gray-500">---</div> : <>
                                    <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {funcionario.cargo || '---'}
                                    </div>
                                    {funcionario.departamento && <div className="text-[8px] sm:text-[9px] md:text-xs text-gray-500 dark:text-gray-400">{funcionario.departamento}</div>}
                                  </>}
                              </div>
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                              {formatarData(funcionario.created_at)}
                            </td>
                            <td className="px-0 sm:px-2 md:px-3 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-4 whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                              {formatarData(funcionario.updated_at)}
                            </td>
                          </tr>)}
                    </tbody>
                  </table>}
              </div>
            </div> : <GerenciamentoEmpresas />}
        </div>
      </div>

      {modalConfirmarExclusao.isOpen && <Modal isOpen={modalConfirmarExclusao.isOpen} onClose={() => setModalConfirmarExclusao({
      isOpen: false,
      funcionario: null
    })} title={t('admin.confirmRemoval')} type="warning" confirmText={t('admin.yesRemove')} cancelText={t('admin.cancel')} showCancel={true} onConfirm={() => {
      excluirFuncionario(modalConfirmarExclusao.funcionario.id);
      setModalConfirmarExclusao({
        isOpen: false,
        funcionario: null
      });
    }}>
          <div className="space-y-3">
            <p className="text-gray-700 dark:text-gray-200">
              {t('admin.confirmRemovalMessage')}{' '}
              <span className="font-bold">{modalConfirmarExclusao.funcionario?.nome}</span>?
            </p>
          </div>
        </Modal>}
    </MainLayout>;
}
export default PainelAdministrativo;
