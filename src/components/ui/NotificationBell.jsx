import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiCalendar } from 'react-icons/fi';
import NotificationService from '../../services/NotificationService';
import { supabase } from '../../config/supabase';
import { useLanguage } from '../../hooks/useLanguage';

function NotificationBell({ showMenuLabel = false }) {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const [notificacoes, setNotificacoes] = useState([]);
  const [contagemNaoLidas, setContagemNaoLidas] = useState(0);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const refDropdown = useRef(null);
  const navigate = useNavigate();
  const traduzirNotificacao = notificacao => {
    const {
      titulo,
      mensagem,
      metadata
    } = notificacao;
    const tituloMap = {
      'Ponto Aguardando Aprovação': 'notificacoes.pendingApprovalTitle',
      'Ponto aguardando aprovação': 'notificacoes.pendingApprovalTitle',
      'Ponto aprovado': 'notificacoes.approvedTitle',
      'Ponto Aprovado': 'notificacoes.approvedTitle',
      'Ponto rejeitado': 'notificacoes.rejectedTitle',
      'Ponto Rejeitado': 'notificacoes.rejectedTitle',
      'Lembrete de Ponto': 'notificacoes.reminderTitle',
      'Lembrete de ponto': 'notificacoes.reminderTitle'
    };
    const mensagemMap = {
      'registrou um ponto e aguarda aprovação': 'notificacoes.pendingApprovalMessage',
      'Não esqueça de registrar sua entrada!': 'notificacoes.reminderStart',
      'Hora do intervalo! Registre sua saída e retorno.': 'notificacoes.reminderBreak',
      'Fim do expediente chegando. Lembre-se de registrar sua saída!': 'notificacoes.reminderEnd',
      'Lembre-se de registrar seu ponto.': 'notificacoes.reminderDefault'
    };
    let tituloTraduzido = titulo;
    let mensagemTraduzida = mensagem;
    if (tituloMap[titulo]) {
      tituloTraduzido = t(tituloMap[titulo]);
    }
    if (mensagemMap[mensagem]) {
      mensagemTraduzida = t(mensagemMap[mensagem]);
    } else if (mensagem.includes('foi aprovado') || mensagem.includes('has been approved')) {
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/);
      const data = dataMatch ? dataMatch[0] : metadata?.data || metadata?.data_formatada;
      if (data) {
        mensagemTraduzida = t('notificacoes.approvedMessage').replace('{date}', data);
      }
    } else if (mensagem.includes('foi rejeitado') || mensagem.includes('has been rejected')) {
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/);
      const data = dataMatch ? dataMatch[0] : metadata?.data;
      const motivo = metadata?.motivo || 'Não especificado';
      if (data) {
        mensagemTraduzida = t('notificacoes.rejectedMessage').replace('{date}', data).replace('{reason}', motivo);
      }
    } else if (mensagem.includes('Seu registro de ponto do dia')) {
      const dataMatch = mensagem.match(/\d{2}\/\d{2}\/\d{4}/) || mensagem.match(/\d{4}-\d{2}-\d{2}/);
      if (dataMatch) {
        mensagemTraduzida = t('notificacoes.approvedMessage').replace('{date}', dataMatch[0]);
      }
    }
    return {
      ...notificacao,
      titulo: tituloTraduzido,
      mensagem: mensagemTraduzida
    };
  };
  useEffect(() => {
    const inicializarNotificacoes = async () => {
      await carregarNotificacoes();
      const idUsuario = await getIdUsuarioAtual();
      if (idUsuario) {
        const channel = NotificationService.subscribeToNotifications(idUsuario, novaNotificacao => {
          setNotificacoes(prev => [traduzirNotificacao(novaNotificacao), ...prev]);
          setContagemNaoLidas(prev => prev + 1);
        });
        return () => {
          NotificationService.unsubscribeFromNotifications(channel);
        };
      }
    };
    inicializarNotificacoes();
  }, []);
  useEffect(() => {
    carregarNotificacoes();
  }, [currentLanguage]);
  useEffect(() => {
    function handleCliqueFora(event) {
      if (refDropdown.current && !refDropdown.current.contains(event.target)) {
        setDropdownAberto(false);
      }
    }
    if (dropdownAberto) {
      document.addEventListener('mousedown', handleCliqueFora);
      return () => document.removeEventListener('mousedown', handleCliqueFora);
    }
  }, [dropdownAberto]);
  const getIdUsuarioAtual = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      return null;
    }
  };
  const carregarNotificacoes = async () => {
    setCarregando(true);
    const idUsuario = await getIdUsuarioAtual();
    if (!idUsuario) {
      setCarregando(false);
      return;
    }
    const resultado = await NotificationService.buscarNotificacoes(idUsuario);
    if (resultado.success) {
      const notificacoesTraduzidas = (resultado.data || []).map(n => traduzirNotificacao(n));
      setNotificacoes(notificacoesTraduzidas);
      const resultadoContagem = await NotificationService.contarNaoLidas(idUsuario);
      if (resultadoContagem.success) {
        setContagemNaoLidas(resultadoContagem.count);
      }
    }
    setCarregando(false);
  };
  const handleAlternarDropdown = () => {
    setDropdownAberto(!dropdownAberto);
  };
  const handleMarcarComoLida = async (notificacaoId, event) => {
    event.stopPropagation();
    const resultado = await NotificationService.marcarComoLida(notificacaoId);
    if (resultado.success) {
      setNotificacoes(prev => prev.map(n => n.id === notificacaoId ? {
        ...n,
        lida: true
      } : n));
      setContagemNaoLidas(prev => Math.max(0, prev - 1));
    }
  };
  const handleMarcarTodasComoLidas = async () => {
    const idUsuario = await getIdUsuarioAtual();
    if (!idUsuario) return;
    const resultado = await NotificationService.marcarTodasComoLidas(idUsuario);
    if (resultado.success) {
      setNotificacoes(prev => prev.map(n => ({
        ...n,
        lida: true
      })));
      setContagemNaoLidas(0);
    }
  };
  const handleDeletarNotificacao = async (notificacaoId, event) => {
    event.stopPropagation();
    const resultado = await NotificationService.deletarNotificacao(notificacaoId);
    if (resultado.success) {
      const notificacaoEncontrada = notificacoes.find(n => n.id === notificacaoId);
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
      if (!notificacaoEncontrada?.lida) {
        setContagemNaoLidas(prev => Math.max(0, prev - 1));
      }
    }
  };
  const handleNotificacaoClick = async notificacao => {
    if (!notificacao.lida) {
      await handleMarcarComoLida(notificacao.id, {
        stopPropagation: () => {}
      });
    }
    if (notificacao.tipo === 'aprovacao_pendente') {
      if (notificacao.metadata?.data_ponto) {
        sessionStorage.setItem('filterDate', notificacao.metadata.data_ponto);
        sessionStorage.setItem('filterStatus', 'Pendente');
      }
      navigate('/painel-admin');
    } else if (notificacao.agendamento_id) {
      navigate('/historico');
    }
    setDropdownAberto(false);
  };
  const getIconeNotificacao = tipo => {
    const IconMap = {
      ponto_registrado: FiCheckCircle,
      ponto_aprovado: FiCheckCircle,
      ponto_rejeitado: FiXCircle,
      aprovacao_pendente: FiClock,
      lembrete_ponto: FiBell,
      relatorio: FiAlertCircle,
      sistema: FiInfo
    };
    const IconComponent = IconMap[tipo] || FiBell;
    return <IconComponent className="w-5 h-5 max-[620px]:w-4 max-[620px]:h-4" />;
  };
  const getCorNotificacao = tipo => {
    const cores = {
      ponto_registrado: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
      ponto_aprovado: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
      ponto_rejeitado: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
      aprovacao_pendente: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800',
      lembrete_ponto: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      relatorio: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
      sistema: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
    };
    return cores[tipo] || 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600';
  };
  const formatarTempo = timestamp => {
    if (!timestamp) return t('notificacoes.recent');
    const data = new Date(timestamp);
    const agora = new Date();
    const diffMs = agora - data;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);
    if (diffMins < 1) return t('notificacoes.now');
    if (diffMins === 1) return t('notificacoes.minuteAgo');
    if (diffMins < 60) return t('notificacoes.minutesAgo').replace('{minutes}', diffMins);
    if (diffHoras === 1) return t('notificacoes.hourAgo');
    if (diffHoras < 24) return t('notificacoes.hoursAgo').replace('{hours}', diffHoras);
    if (diffDias === 1) return t('notificacoes.dayAgo');
    if (diffDias < 7) return t('notificacoes.daysAgo').replace('{days}', diffDias);
    const locale = currentLanguage === 'en-US' ? 'en-US' : 'pt-BR';
    return data.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit'
    });
  };
  const labelNotificacoes = t('menuPrincipal.notifications');
  return <div className={showMenuLabel ? 'relative w-full' : 'relative'} ref={refDropdown}>
      <button
        type="button"
        onClick={handleAlternarDropdown}
        className={
          showMenuLabel
            ? 'flex w-full min-h-9 min-w-[11rem] items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left'
            : 'relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
        }
        aria-label={labelNotificacoes}
      >
        <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:block">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {contagemNaoLidas > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[1.125rem] items-center justify-center px-1 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
              {contagemNaoLidas > 99 ? '99+' : contagemNaoLidas}
            </span>
          )}
        </span>
        {showMenuLabel && (
          <span className="min-w-0 flex-1 truncate leading-none">{labelNotificacoes}</span>
        )}
      </button>

      {dropdownAberto && <div className="absolute right-0 mt-2 w-96 max-[620px]:w-[min(calc(100vw-1rem),250px)] max-[620px]:right-0 max-[620px]:mr-0.5 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[70] max-h-[600px] flex flex-col">
          <div className="px-3 max-[620px]:px-1.5 py-3 max-[620px]:py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/80 rounded-t-lg gap-2">
            <h3 className="text-base max-[620px]:text-xs font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">{t('notificacoes.title')}</h3>
            {contagemNaoLidas > 0 && <button type="button" onClick={handleMarcarTodasComoLidas} className="text-[10px] max-[620px]:text-[8px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium whitespace-nowrap flex-shrink-0">
                {t('notificacoes.markAllRead')}
              </button>}
          </div>

          <div className="overflow-y-auto flex-1">
            {carregando ? <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm">{t('notificacoes.loading')}</p>
              </div> : notificacoes.length === 0 ? <div className="p-8 max-[620px]:p-4 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 max-[620px]:w-12 max-[620px]:h-12 mx-auto mb-4 max-[620px]:mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm max-[620px]:text-xs">{t('notificacoes.noNotifications')}</p>
              </div> : notificacoes.map(notificacao => <div key={notificacao.id} onClick={() => handleNotificacaoClick(notificacao)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleNotificacaoClick(notificacao)} className={`px-4 max-[620px]:px-2 py-3 max-[620px]:py-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${!notificacao.lida ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <div className="flex items-start gap-3 max-[620px]:gap-2">
                    <div className={`flex-shrink-0 w-10 h-10 max-[620px]:w-8 max-[620px]:h-8 rounded-full flex items-center justify-center border ${getCorNotificacao(notificacao.tipo)}`}>
                      {getIconeNotificacao(notificacao.tipo)}
                    </div>                    {}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm max-[620px]:text-xs font-medium text-gray-900 dark:text-gray-100 ${!notificacao.lida ? 'font-semibold' : ''}`}>
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>}
                      </div>
                      <p className="text-sm max-[620px]:text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {notificacao.tipo === 'aprovacao_pendente' && notificacao.metadata?.funcionario ? <>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{notificacao.metadata.funcionario}</span> {notificacao.mensagem}
                          </> : notificacao.mensagem}
                      </p>
                      {notificacao.metadata?.data_formatada && <p className="text-xs max-[620px]:text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('notificacoes.date')} {notificacao.metadata.data_formatada}</p>}
                      <p className="text-xs max-[620px]:text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatarTempo(notificacao.created_at)}</p>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notificacao.lida && <button type="button" onClick={e => handleMarcarComoLida(notificacao.id, e)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" title="Marcar como lida">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>}
                      <button type="button" onClick={e => handleDeletarNotificacao(notificacao.id, e)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" title="Deletar">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>)}
          </div>

          {notificacoes.length > 0 && <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-lg">
              <button type="button" onClick={() => {
          navigate('/notificacoes');
          setDropdownAberto(false);
        }} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium w-full text-center">
                {t('notificacoes.viewAll')}
              </button>
            </div>}
        </div>}
    </div>;
}
export default NotificationBell;
