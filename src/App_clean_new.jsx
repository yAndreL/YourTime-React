import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MainLayout from './components/layout/MainLayout';
import DashboardCards from './components/ui/DashboardCards';
import TimeRecordsSummary from './components/TimeRecordsSummary';
import ExportPDFModal from './components/ExportPDFModal';
import ExportDataModal from './components/ExportDataModal';
import ProjectsLoadingSkeleton from './components/ui/ProjectCardSkeleton';
import CacheService from './services/CacheService';
import { useTimeTracking } from './hooks/useTimeTracking';
import { useLanguage } from './hooks/useLanguage.jsx';
import { useFusoHorario } from './hooks/useFusoHorario.jsx';
import { supabase } from './config/supabase';
import { formatarData } from './utils/dateUtils';
import { FiTarget, FiBarChart2, FiTrendingUp, FiFile, FiFileText, FiGrid, FiCheckCircle, FiChevronLeft, FiChevronRight, FiLoader, FiX, FiUser, FiUserCheck, FiCalendar, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import BatidaService from './services/BatidaService';
function erroRedeEhTransienteOuAbort(erro) {
  if (!erro) return false;
  const nomeErro = String(erro.name || '');
  const mensagem = String(erro.message || erro).toLowerCase();
  return nomeErro === 'AbortError' || nomeErro === 'TypeError' && mensagem.includes('failed to fetch') || mensagem.includes('failed to fetch') || mensagem.includes('network') || mensagem.includes('load failed');
}
function erroEmbedAmbiguoRelacionamento(erro) {
  if (!erro) return false;
  const mensagem = String(erro.message || erro).toLowerCase();
  return mensagem.includes('could not embed') || mensagem.includes('more than one relationship');
}
function App() {
  const {
    t
  } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const obterProjetosEmCacheDashboard = () => {
    try {
      const idUsuario = sessionStorage.getItem('currentUserId');
      if (idUsuario) {
        const dadosEmCache = CacheService.get('dashboard_projects', idUsuario);
        if (dadosEmCache) {
          return dadosEmCache;
        }
      }
    } catch (e) {}
    return [];
  };
  const obterStatusAdminEmCache = () => {
    try {
      const idUsuario = sessionStorage.getItem('currentUserId');
      if (idUsuario) {
        const dadosEmCache = CacheService.get('user_is_admin', idUsuario);
        if (dadosEmCache !== null && dadosEmCache !== undefined) {
          return dadosEmCache;
        }
      }
    } catch (e) {}
    return false;
  };
  const projetosIniciaisDoCache = obterProjetosEmCacheDashboard();
  const [exibirToastConfirmacao, setExibirToastConfirmacao] = useState(false);
  const [textoToastConfirmacao, setTextoToastConfirmacao] = useState('');
  const [projetoSelecionadoDashboard, setProjetoSelecionadoDashboard] = useState(null);
  const [listaProjetosBrutos, setListaProjetosBrutos] = useState([]);
  const [projetosComHorasCalculadas, setProjetosComHorasCalculadas] = useState(projetosIniciaisDoCache);
  const [carregandoListaProjetos, setCarregandoListaProjetos] = useState(projetosIniciaisDoCache.length === 0);
  const [exibirSkeletonProjetos, setExibirSkeletonProjetos] = useState(false);
  const [idUsuarioAtualSessao, setIdUsuarioAtualSessao] = useState(null);
  const [paginaAtualGradeProjetos, setPaginaAtualGradeProjetos] = useState(0);
  const [transicaoFadePaginaProjetos, setTransicaoFadePaginaProjetos] = useState(false);
  const [sessaoUsuarioAutenticada, setSessaoUsuarioAutenticada] = useState(null);
  const [usuarioEhAdministrador, setUsuarioEhAdministrador] = useState(obterStatusAdminEmCache());
  const [modalExportacaoPdfAberto, setModalExportacaoPdfAberto] = useState(false);
  const [modalExportacaoCsvAberto, setModalExportacaoCsvAberto] = useState(false);
  const geracaoCarregamentoProjetosRef = useRef(0);
  const [mensagemErroConsultaProjetos, setMensagemErroConsultaProjetos] = useState(null);
  const [quantidadeBatidasSemProjetoNoMes, setQuantidadeBatidasSemProjetoNoMes] = useState(0);
  useEffect(() => {
    const verificarSessaoEPerfilUsuario = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        const usuario = session?.user;
        setSessaoUsuarioAutenticada(!!usuario);
        if (!usuario) {
          window.location.href = '/login';
          return;
        }
        setIdUsuarioAtualSessao(usuario.id);
        sessionStorage.setItem('currentUserId', usuario.id);
        const haProjetosEmCache = projetosComHorasCalculadas && projetosComHorasCalculadas.length > 0;
        if (haProjetosEmCache) {
          setCarregandoListaProjetos(false);
          setExibirSkeletonProjetos(false);
        }
        const {
          data: perfilUsuario
        } = await supabase.from('profiles').select('role').eq('id', usuario.id).maybeSingle();
        const perfilEhAdmin = perfilUsuario?.role === 'admin';
        setUsuarioEhAdministrador(perfilEhAdmin);
        CacheService.set('user_is_admin', perfilEhAdmin, usuario.id, 10 * 60 * 1000);
      } catch (erroVerificacao) {
        setCarregandoListaProjetos(false);
        setExibirSkeletonProjetos(false);
      }
    };
    verificarSessaoEPerfilUsuario();
  }, []);
  const {
    dadosResumoDashboard,
    dadosGraficoSemanal,
    carregandoDadosApontamento,
    mensagemErroApontamento,
    mensagemErroPerfilUsuario,
    mensagemErroRegistros,
    dadosPerfilUsuario,
    registrosApontamento,
    recarregarRegistrosApontamento
  } = useTimeTracking();
  useEffect(() => {
    if (!idUsuarioAtualSessao) return;
    const geracao = ++geracaoCarregamentoProjetosRef.current;
    carregarProjetosComHorasCalculadas(geracao);
  }, [idUsuarioAtualSessao, fusoHorario]);
  useEffect(() => {
    if (!idUsuarioAtualSessao) return;
    const carregarContagemBatidasSemProjeto = async () => {
      const { dataInicio, dataFim } = BatidaService.obterIntervaloMesCorrenteFormatado(fusoHorario);
      const resultado = await BatidaService.contarBatidasSemProjetoNoPeriodo(
        [idUsuarioAtualSessao],
        dataInicio,
        dataFim,
        fusoHorario
      );
      if (resultado.success) {
        setQuantidadeBatidasSemProjetoNoMes(resultado.count);
      }
    };
    carregarContagemBatidasSemProjeto();
  }, [idUsuarioAtualSessao, fusoHorario]);
  const carregarProjetosComHorasCalculadas = async geracaoEsperada => {
    const geracaoCarregamentoAindaEhAtual = () => geracaoEsperada === geracaoCarregamentoProjetosRef.current;
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const usuario = session?.user;
      if (!usuario) return;
      if (geracaoCarregamentoAindaEhAtual()) {
        setMensagemErroConsultaProjetos(null);
      }
      const haDadosEmCache = projetosComHorasCalculadas && projetosComHorasCalculadas.length > 0;
      if (haDadosEmCache) {} else if (!carregandoListaProjetos) {
        setCarregandoListaProjetos(true);
        setExibirSkeletonProjetos(true);
      }
      const {
        data: perfilUsuarioEmpresa
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', usuario.id).maybeSingle();
      if (!geracaoCarregamentoAindaEhAtual()) return;
      const idEmpresaSuperior = perfilUsuarioEmpresa?.superior_empresa_id;
      const montarConsultaProjetos = incluirJoinEmpresa => {
        const selecao = incluirJoinEmpresa ? `*, empresas!empresa_id ( nome )` : '*';
        let consulta = supabase.from('projetos').select(selecao).eq('status', 'ativo').order('nome');
        if (idEmpresaSuperior) {
          consulta = consulta.or(`superior_empresa_id.eq.${idEmpresaSuperior},superior_empresa_id.is.null`);
        }
        return consulta;
      };
      const [projetosResult, horasResult, batidasComProjetoResult] = await Promise.all([
        (async () => {
          let { data, error } = await montarConsultaProjetos(true);
          if (error && (erroRedeEhTransienteOuAbort(error) || erroEmbedAmbiguoRelacionamento(error))) {
            const segundaTentativa = await montarConsultaProjetos(false);
            if (!segundaTentativa.error) { data = segundaTentativa.data; error = null; }
          }
          return { data, error };
        })(),
        supabase
          .from('agendamento')
          .select('id, data, entrada1, saida1, entrada2, saida2, user_id, projeto_id, status')
          .eq('user_id', usuario.id),
        BatidaService.listarBatidasOrdenadasDoUsuarioParaCalculoProjetos(usuario.id)
      ]);
      if (!geracaoCarregamentoAindaEhAtual()) return;
      let { data: dadosProjetos, error: erroConsultaProjetos } = projetosResult;
      const { data: dadosApontamentosHoras, error: erroApontamentosHoras } = horasResult;
      if (erroConsultaProjetos) {
        if (geracaoCarregamentoAindaEhAtual()) {
          setMensagemErroConsultaProjetos(String(erroConsultaProjetos.message || erroConsultaProjetos));
        }
        return;
      }
      setListaProjetosBrutos(dadosProjetos || []);
      if (erroApontamentosHoras) {
        setProjetosComHorasCalculadas(dadosProjetos || []);
        return;
      }
      const mapaHorasBatidasPorProjeto =
        batidasComProjetoResult.success && batidasComProjetoResult.data?.length
          ? BatidaService.calcularHorasTrabalhadasPorProjetoAPartirDasBatidas(
              batidasComProjetoResult.data,
              fusoHorario
            )
          : {};

      if (!dadosApontamentosHoras || dadosApontamentosHoras.length === 0) {
        const listaSoProjetos = (dadosProjetos || []).map(projeto => {
          const horasBatidasProjeto = mapaHorasBatidasPorProjeto[projeto.id] ?? 0;
          const horasTotaisCalculadas = horasBatidasProjeto;
          const horasRestantes = (projeto.horas_estimadas || 0) - horasTotaisCalculadas;
          return {
            ...projeto,
            horasTrabalhadas: horasBatidasProjeto.toFixed(1),
            horasPendentesAprovacao: '0.0',
            horasTotais: horasTotaisCalculadas.toFixed(1),
            horasPendentes: horasRestantes > 0 ? horasRestantes.toFixed(1) : '0.0'
          };
        });
        setProjetosComHorasCalculadas(listaSoProjetos);
        return;
      }
      const calcularHorasTotaisApontamento = apontamento => {
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
        return totalMinutos / 60;
      };
      const listaProjetosComHorasCalculadas = (dadosProjetos || []).map(projeto => {
        const apontamentosDoProjeto = dadosApontamentosHoras.filter(apt => apt.projeto_id === projeto.id);
        const horasAprovadas = apontamentosDoProjeto.filter(apt => apt.status === 'A').reduce((acum, apt) => acum + calcularHorasTotaisApontamento(apt), 0);
        const horasPendentesAprovacao = apontamentosDoProjeto.filter(apt => apt.status === 'P').reduce((acum, apt) => acum + calcularHorasTotaisApontamento(apt), 0);
        const horasBatidasProjeto = mapaHorasBatidasPorProjeto[projeto.id] ?? 0;
        const horasTotaisCalculadas = horasAprovadas + horasPendentesAprovacao + horasBatidasProjeto;
        const horasRestantes = (projeto.horas_estimadas || 0) - horasTotaisCalculadas;
        return {
          ...projeto,
          horasTrabalhadas: (horasAprovadas + horasBatidasProjeto).toFixed(1),
          horasPendentesAprovacao: horasPendentesAprovacao.toFixed(1),
          horasTotais: horasTotaisCalculadas.toFixed(1),
          horasPendentes: horasRestantes > 0 ? horasRestantes.toFixed(1) : '0.0'
        };
      });
      if (!geracaoCarregamentoAindaEhAtual()) return;
      setProjetosComHorasCalculadas(listaProjetosComHorasCalculadas);
      if (usuario && usuario.id) {
        CacheService.set('dashboard_projects', listaProjetosComHorasCalculadas, usuario.id, 10 * 60 * 1000);
      }
    } catch (erroCarregamento) {
      if (geracaoCarregamentoAindaEhAtual()) {
        setMensagemErroConsultaProjetos(String(erroCarregamento.message || erroCarregamento));
      }
    } finally {
      if (geracaoCarregamentoAindaEhAtual()) {
        setCarregandoListaProjetos(false);
        setExibirSkeletonProjetos(false);
      }
    }
  };
  useEffect(() => {
    const projetoSerializadoLocalStorage = localStorage.getItem('selectedProject');
    if (projetoSerializadoLocalStorage) {
      setProjetoSelecionadoDashboard(JSON.parse(projetoSerializadoLocalStorage));
    }
  }, []);
  useEffect(() => {
    if (carregandoListaProjetos) return;
    if (!projetoSelecionadoDashboard) return;
    if (projetosComHorasCalculadas.length === 0) {
      setProjetoSelecionadoDashboard(null);
      localStorage.removeItem('selectedProject');
      return;
    }
    const projetoAtualizadoDaLista = projetosComHorasCalculadas.find(p => p.id === projetoSelecionadoDashboard.id);
    if (projetoAtualizadoDaLista) {
      const horasIguais = projetoAtualizadoDaLista.horasTrabalhadas === projetoSelecionadoDashboard.horasTrabalhadas && projetoAtualizadoDaLista.horasPendentesAprovacao === projetoSelecionadoDashboard.horasPendentesAprovacao && projetoAtualizadoDaLista.horasTotais === projetoSelecionadoDashboard.horasTotais && projetoAtualizadoDaLista.horasPendentes === projetoSelecionadoDashboard.horasPendentes;
      if (!horasIguais) {
        setProjetoSelecionadoDashboard(projetoAtualizadoDaLista);
        localStorage.setItem('selectedProject', JSON.stringify(projetoAtualizadoDaLista));
      }
    } else {
      setProjetoSelecionadoDashboard(null);
      localStorage.removeItem('selectedProject');
    }
  }, [projetosComHorasCalculadas, carregandoListaProjetos, projetoSelecionadoDashboard]);
  const aoSelecionarProjetoNoDashboard = projeto => {
    setProjetoSelecionadoDashboard(projeto);
    localStorage.setItem('selectedProject', JSON.stringify(projeto));
    exibirMensagemToastConfirmacao(t('painel.projectSelected').replace('{name}', projeto.nome));
  };
  const limparProjetoSelecionadoNoDashboard = () => {
    setProjetoSelecionadoDashboard(null);
    localStorage.removeItem('selectedProject');
    exibirMensagemToastConfirmacao(t('painel.projectDeselected'));
  };
  const exibirMensagemToastConfirmacao = textoMensagem => {
    setTextoToastConfirmacao(textoMensagem);
    setExibirToastConfirmacao(true);
    setTimeout(() => setExibirToastConfirmacao(false), 3000);
  };
  const CARTOES_POR_PAGINA_PROJETOS = 4;
  const totalPaginasGradeProjetos = Math.ceil(projetosComHorasCalculadas.length / CARTOES_POR_PAGINA_PROJETOS);
  const indiceInicioFatiaProjetos = paginaAtualGradeProjetos * CARTOES_POR_PAGINA_PROJETOS;
  const indiceFimFatiaProjetos = indiceInicioFatiaProjetos + CARTOES_POR_PAGINA_PROJETOS;
  const projetosCartoesPaginaAtual = projetosComHorasCalculadas.slice(indiceInicioFatiaProjetos, indiceFimFatiaProjetos);
  const irParaProximaPaginaProjetos = () => {
    if (paginaAtualGradeProjetos < totalPaginasGradeProjetos - 1) {
      setTransicaoFadePaginaProjetos(true);
      setTimeout(() => {
        setPaginaAtualGradeProjetos(paginaAtualGradeProjetos + 1);
        setTransicaoFadePaginaProjetos(false);
      }, 150);
    }
  };
  const irParaPaginaAnteriorProjetos = () => {
    if (paginaAtualGradeProjetos > 0) {
      setTransicaoFadePaginaProjetos(true);
      setTimeout(() => {
        setPaginaAtualGradeProjetos(paginaAtualGradeProjetos - 1);
        setTransicaoFadePaginaProjetos(false);
      }, 150);
    }
  };
  return <MainLayout title="Dashboard" subtitle={t('comum.systemManagement')}>
      <div className="space-y-6">
        {mensagemErroApontamento && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center">
                <FiX className="mr-2 w-5 h-5" />
                <div>
                  <div className="font-medium">Erro ao carregar dados</div>
                  <div className="text-sm mt-1">{mensagemErroApontamento}</div>
                </div>
              </div>
            </div>}

        {quantidadeBatidasSemProjetoNoMes > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">
                {t('batidaProjeto.painelBanner').replace('{count}', String(quantidadeBatidasSemProjetoNoMes))}
              </p>
            </div>
            <Link
              to="/batidas-sem-projeto"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#8231D3] hover:bg-[#6b28b0] text-white text-sm font-semibold whitespace-nowrap"
            >
              {t('batidaProjeto.painelCta')}
            </Link>
          </div>
        )}

          {!mensagemErroPerfilUsuario && <>
              <DashboardCards saldoHoras={dadosResumoDashboard?.saldoHoras || '+00:00'} horasHoje={dadosResumoDashboard?.horasHoje || '00:00'} horasPendentes={(() => {
          const horasDecimais = parseFloat(projetoSelecionadoDashboard?.horasPendentesAprovacao || '0');
          const horas = Math.floor(horasDecimais);
          const minutos = Math.round((horasDecimais - horas) * 60);
          return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        })()} projetoAtual={projetoSelecionadoDashboard?.nome || t('painel.noProjectSelected')} status={dadosResumoDashboard?.status || 'Offline'} isWorking={dadosResumoDashboard?.isWorking || false} />
              
              {projetoSelecionadoDashboard && projetoSelecionadoDashboard.horas_estimadas && <div className="yt-card p-4 sm:p-6 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{t('painel.hoursProgress')}</h3>
                    <div className="sm:text-right">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-blue-600 font-semibold">{projetoSelecionadoDashboard.horasTrabalhadas || '0.0'}h {t('painel.hoursCountedTowardGoal')}</span>
                        {parseFloat(projetoSelecionadoDashboard.horasPendentesAprovacao || '0') > 0 && <> + <span className="text-yellow-600 font-semibold">{projetoSelecionadoDashboard.horasPendentesAprovacao}h {t('painel.pending').toLowerCase()}</span></>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('projetos.goal')}: {projetoSelecionadoDashboard.horas_estimadas}h
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    {(() => {
              const horasAprovadas = parseFloat(projetoSelecionadoDashboard.horasTrabalhadas || '0');
              const horasPendentes = parseFloat(projetoSelecionadoDashboard.horasPendentesAprovacao || '0');
              const horasEstimadas = parseFloat(projetoSelecionadoDashboard.horas_estimadas || 1);
              const porcentagemAprovada = Math.min(horasAprovadas / horasEstimadas * 100, 100);
              const porcentagemPendente = Math.min(horasPendentes / horasEstimadas * 100, 100 - porcentagemAprovada);
              return <div className="flex h-full w-full">
                          {porcentagemAprovada > 0 && <div className="bg-blue-500 h-3 transition-all duration-500" style={{
                  width: `${porcentagemAprovada}%`
                }} title={`${horasAprovadas}h ${t('painel.hoursCountedTowardGoal')}`}></div>}
                          {porcentagemPendente > 0 && <div className="bg-yellow-500 h-3 transition-all duration-500" style={{
                  width: `${porcentagemPendente}%`
                }} title={`${horasPendentes}h ${t('painel.pending').toLowerCase()}`}></div>}
                        </div>;
            })()}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-300">{t('painel.hoursCountedLegend')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-300">{t('painel.pending')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-300">{t('painel.remaining')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {(() => {
                const horasTotais = parseFloat(projetoSelecionadoDashboard.horasTotais || '0');
                const horasEstimadas = parseFloat(projetoSelecionadoDashboard.horas_estimadas || 1);
                const porcentagem = Math.round(horasTotais / horasEstimadas * 100);
                return `${porcentagem}% ${t('painel.ofTotal')}`;
              })()}
                    </p>
                  </div>
                </div>}
            </>}

          <div className="yt-card p-4 sm:p-6 mb-6">
            {mensagemErroConsultaProjetos && <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                {t('painel.errorLoadingProjects')} ({mensagemErroConsultaProjetos}). {t('painel.checkInternetConnection')}
              </div>}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FiTarget className="w-5 h-5" />
                {t('painel.selectProject')}
              </h3>
              {!carregandoListaProjetos && projetosComHorasCalculadas.length > CARTOES_POR_PAGINA_PROJETOS && <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('painel.page')} {paginaAtualGradeProjetos + 1} {t('painel.of')} {totalPaginasGradeProjetos}
                </div>}
            </div>
            
            {exibirSkeletonProjetos ? <ProjectsLoadingSkeleton count={4} /> : projetosCartoesPaginaAtual.length > 0 ? <>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-150 ${transicaoFadePaginaProjetos ? 'opacity-0' : 'opacity-100'}`}>
                  {projetosCartoesPaginaAtual.map(project => <div key={project.id} onClick={() => aoSelecionarProjetoNoDashboard(project)} className={`cursor-pointer border-2 rounded-lg p-4 transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md relative ${projetoSelecionadoDashboard?.id === project.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-md' : 'border-gray-200 dark:border-gray-700'}`}>
                          <div className="absolute top-3 right-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${projetoSelecionadoDashboard?.id === project.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                              {projetoSelecionadoDashboard?.id === project.id && <FiCheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3 pr-8">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                  backgroundColor: project.cor_identificacao || '#3B82F6'
                }}></div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate flex-1">
                              {project.nome}
                            </h4>
                          </div>
                          
                          {project.descricao && <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                              {project.descricao}
                            </p>}
                          
                          {project.empresas?.nome && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {project.empresas.nome}
                            </p>}
                          
                          <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 dark:text-gray-300">{t('projetos.workedHours')}:</span>
                              <span className="font-semibold text-green-600">{project.horasTrabalhadas || '0.0'}h</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 dark:text-gray-300">{t('projetos.pendingHours')}:</span>
                              <span className="font-semibold text-orange-600">{project.horasPendentes || '0.0'}h</span>
                            </div>
                            {project.horas_estimadas && <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600 dark:text-gray-300">{t('projetos.totalGoal')}:</span>
                                <span className="font-semibold text-blue-600">{project.horas_estimadas}h</span>
                              </div>}
                          </div>
                        </div>)}
                </div>

                {projetosComHorasCalculadas.length > CARTOES_POR_PAGINA_PROJETOS && <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
                    <button type="button" onClick={irParaPaginaAnteriorProjetos} disabled={paginaAtualGradeProjetos === 0} className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${paginaAtualGradeProjetos === 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}>
                      <FiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({
                length: totalPaginasGradeProjetos
              }).map((_, index) => <button key={index} onClick={() => {
                setTransicaoFadePaginaProjetos(true);
                setTimeout(() => {
                  setPaginaAtualGradeProjetos(index);
                  setTransicaoFadePaginaProjetos(false);
                }, 200);
              }} className={`w-2 h-2 rounded-full transition-all ${paginaAtualGradeProjetos === index ? 'bg-blue-600 w-8' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`} />)}
                    </div>

                    <button type="button" onClick={irParaProximaPaginaProjetos} disabled={paginaAtualGradeProjetos === totalPaginasGradeProjetos - 1} className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${paginaAtualGradeProjetos === totalPaginasGradeProjetos - 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}>
                      <span className="hidden sm:inline">{t('painel.next')}</span>
                      <FiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>}
              </> : <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiTarget className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p className="mb-2">{t('painel.noActiveProjects')}</p>
                <Link to="/projeto" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  {t('painel.createNewProject')}
                </Link>
              </div>}
          </div>

          <TimeRecordsSummary registrosApontamento={registrosApontamento} aoRecarregar={recarregarRegistrosApontamento} carregandoResumo={carregandoDadosApontamento} mensagemErro={mensagemErroApontamento} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div className="lg:col-span-2 yt-card p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('painel.weekHours')}</h3>

              {mensagemErroApontamento ? <div className="flex items-center justify-center h-32 text-red-500 dark:text-red-400">
                  <span>Erro ao carregar gráfico</span>
                </div> : dadosGraficoSemanal && dadosGraficoSemanal.length > 0 ? <>
                  <div className="space-y-3 mb-4">
                    {(() => {
                const maxHoursInWeek = Math.max(...dadosGraficoSemanal.map(item => {
                  const [hours, mins] = item.horas.split(':');
                  return parseInt(hours) + parseInt(mins) / 60;
                }), 1);
                return dadosGraficoSemanal.map((item, index) => {
                  const [hours, mins] = item.horas.split(':');
                  const totalHours = parseInt(hours) + parseInt(mins) / 60;
                  if (totalHours === 0) {
                    return <div key={index} className="flex items-center gap-2 sm:gap-4">
                              <div className="w-14 sm:w-20 flex-shrink-0">
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{item.dia}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2"></div>
                              </div>
                              <div className="w-12 flex-shrink-0 text-right">
                                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">0:00h</span>
                              </div>
                            </div>;
                  }
                  const normalWorkHours = 8;
                  const workedHours = Math.min(totalHours, normalWorkHours);
                  const overtimeHours = Math.max(totalHours - normalWorkHours, 0);
                  const underHours = Math.max(normalWorkHours - totalHours, 0);
                  const workedPercent = workedHours / maxHoursInWeek * 100;
                  const overtimePercent = overtimeHours / maxHoursInWeek * 100;
                  const underPercent = underHours / maxHoursInWeek * 100;
                  const isPending = item.status === 'P';
                  const isBelowTarget = totalHours < normalWorkHours;
                  let normalBarColor = 'bg-blue-500';
                  if (isPending) {
                    normalBarColor = 'bg-yellow-500';
                  } else if (item.isToday) {
                    normalBarColor = 'bg-green-500';
                  }
                  return <div key={index} className="flex items-center gap-2 sm:gap-4">
                            <div className="w-14 sm:w-20 flex-shrink-0">
                              <span className={`text-xs sm:text-sm ${isPending ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : item.isToday ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                {item.dia} {item.isToday && `(${t('painel.today').toLowerCase()})`}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden flex">
                                {workedHours > 0 && <div className={`h-2 ${normalBarColor}`} style={{
                          width: `${workedPercent}%`
                        }} title={`${workedHours.toFixed(1)}h trabalhadas`}></div>}
                                
                                {overtimeHours > 0 && <div className="h-2 bg-orange-500" style={{
                          width: `${overtimePercent}%`
                        }} title={`${overtimeHours.toFixed(1)}h extras`}></div>}
                                
                                {isBelowTarget && underHours > 0 && <div className="h-2" style={{
                          width: `${underPercent}%`,
                          backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        ${isPending ? '#eab308' : item.isToday ? '#22c55e' : '#3b82f6'},
                                        ${isPending ? '#eab308' : item.isToday ? '#22c55e' : '#3b82f6'} 2px,
                                        transparent 2px,
                                        transparent 5px
                                      )`
                        }} title={`${underHours.toFixed(1)}h abaixo da meta`}></div>}
                              </div>
                            </div>

                            <div className="w-12 flex-shrink-0 text-right">
                              <span className={`text-xs sm:text-sm font-medium ${isPending ? 'text-yellow-600 dark:text-yellow-400' : item.isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                {item.horas}h
                              </span>
                            </div>
                          </div>;
                });
              })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('painel.approved')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('painel.pending')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('painel.today')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('painel.overtime')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{
                  backgroundImage: `repeating-linear-gradient(
                            45deg,
                            #3b82f6,
                            #3b82f6 2px,
                            transparent 2px,
                            transparent 5px
                          )`
                }}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('painel.belowGoal')}</span>
                    </div>
                  </div>
                </> : <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <FiTrendingUp className="text-gray-400 dark:text-gray-500 w-12 h-12 mx-auto mb-2" />
                    <div>{t('painel.noHoursData')}</div>
                    <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('painel.registerFirstEntry')}</div>
                  </div>
                </div>}
            </div>

            <div className="yt-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('painel.quickActions')}</h3>
              <div className="space-y-3">
                <Link to="/formulario-ponto" className="flex items-center p-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors group border border-transparent dark:border-red-900/30">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white mr-3">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-red-700 dark:group-hover:text-red-400">{t('painel.registerTime')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('painel.registerTimeDesc')}</p>
                  </div>
                </Link>
                
                {usuarioEhAdministrador && <Link to="/painel-admin" className="flex items-center p-3 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 rounded-lg transition-colors group border border-transparent dark:border-green-900/30">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white mr-3">
                      <FiUserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-green-700 dark:group-hover:text-green-400">{t('menuPrincipal.adminPanel')}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('painel.adminPanelDesc')}</p>
                    </div>
                  </Link>}
                
                <Link to="/historico" className="flex items-center p-3 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 rounded-lg transition-colors group border border-transparent dark:border-purple-900/30">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white mr-3">
                    <FiCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">{t('menuPrincipal.history')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('painel.historyDesc')}</p>
                  </div>
                </Link>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('painel.exportReports')}</h4>
                <div className="space-y-2">
                  <button type="button" onClick={() => setModalExportacaoPdfAberto(true)} className="flex items-center w-full p-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg transition-colors group border border-transparent dark:border-blue-900/30">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      <FiDownload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{t('painel.exportPDF')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('painel.exportPDFDesc')}</p>
                    </div>
                  </button>
                  
                  <button type="button" onClick={() => setModalExportacaoCsvAberto(true)} className="flex items-center w-full p-2 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 rounded-lg transition-colors group border border-transparent dark:border-green-900/30">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      <FiGrid className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-green-700 dark:group-hover:text-green-400">{t('painel.exportCSV')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('painel.exportCSVDesc')}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="yt-card p-4 sm:p-6 mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('painel.recentActivities')}</h3>

            {!mensagemErroPerfilUsuario && registrosApontamento?.length > 0 ? <div className="space-y-3">
                {registrosApontamento.slice(-5).reverse().map((record, index) => <div key={record.id || index} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${record.entrada1 ? 'bg-green-500' : record.saida1 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                        {record.entrada1 ? t('painel.newEntry') : record.saida1 ? t('painel.exitRegistered') : record.entrada2 ? t('painel.entry2Registered') : record.saida2 ? t('painel.exit2Registered') : t('painel.timeEntryRegistered')}
                        {record.observacao && ` - ${record.observacao}`}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatarData(record.data, 'DD/MM/YYYY')}
                    </span>
                  </div>)}

                {registrosApontamento.length === 0 && <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {t('painel.noTimeRecordsFound')}
                  </div>}
              </div> : <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                {carregandoDadosApontamento ? t('painel.loadingActivities') : t('painel.noActivitiesRegistered')}
              </div>}
          </div>

          <div className="yt-card p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {(() => {
                const totalMinutes = dadosGraficoSemanal?.reduce((total, item) => {
                  const [hours, minutes] = item.horas.split(':').map(Number);
                  return total + hours * 60 + minutes;
                }, 0) || 0;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours}h ${minutes}m`;
              })()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('painel.hoursThisWeek')}</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {dadosPerfilUsuario?.carga_horaria ? `${dadosPerfilUsuario.carga_horaria}h${t('painel.perWeek')}` : `40h${t('painel.perWeek')}`}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('painel.workload')}</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {(() => {
                const totalMinutes = dadosGraficoSemanal?.reduce((total, item) => {
                  const [hours, minutes] = item.horas.split(':').map(Number);
                  return total + hours * 60 + minutes;
                }, 0) || 0;
                const expectedMinutes = (dadosPerfilUsuario?.carga_horaria || 40) * 60;
                const percentage = expectedMinutes > 0 ? Math.round(totalMinutes / expectedMinutes * 100) : 0;
                return `${percentage}%`;
              })()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('painel.weekGoal')}</p>
              </div>
            </div>
          </div>
        
        {exibirToastConfirmacao && <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              {textoToastConfirmacao}
            </div>
          </div>}

        <ExportPDFModal isOpen={modalExportacaoPdfAberto} onClose={() => setModalExportacaoPdfAberto(false)} isAdmin={usuarioEhAdministrador} />

        <ExportDataModal isOpen={modalExportacaoCsvAberto} onClose={() => setModalExportacaoCsvAberto(false)} isAdmin={usuarioEhAdministrador} />
      </div>
    </MainLayout>;
}
export default App;
