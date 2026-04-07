import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import GerenciamentoProjetosSkeleton from '../components/ui/GerenciamentoProjetosSkeleton';
import GeocercaSelector from '../components/GeocercaSelector';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import CacheService from '../services/CacheService';
import { formatarData } from '../utils/dateUtils';
import { FiTarget, FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle, FiCircle, FiAlertCircle, FiXCircle, FiBarChart2, FiSave, FiFolder, FiRotateCcw } from 'react-icons/fi';
function GerenciamentoProjetos() {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { modalState, showConfirm, closeModal: closeNotificationModal } = useModal();
  const obterDadosEmCache = key => {
    try {
      const idUsuario = sessionStorage.getItem('currentUserId');
      if (idUsuario) {
        const dadosEmCache = CacheService.get(key, idUsuario);
        if (dadosEmCache) {
          return dadosEmCache;
        }
      }
    } catch (e) {}
    return null;
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
  const inicializarDoCache = () => {
    const cachedProjetos = obterDadosEmCache('projetos');
    const cachedUsuarios = obterDadosEmCache('usuarios');
    const cachedEmpresas = obterDadosEmCache('empresas');
    return {
      projetos: cachedProjetos || [],
      usuarios: cachedUsuarios || [],
      empresas: cachedEmpresas || []
    };
  };
  const dadosEmCache = inicializarDoCache();
  const [projetos, setProjetos] = useState(dadosEmCache.projetos);
  const [usuarios, setUsuarios] = useState(dadosEmCache.usuarios);
  const [empresas, setEmpresas] = useState(dadosEmCache.empresas);
  const [carregandoGerenciamentoProjetos, setCarregandoGerenciamentoProjetos] = useState(false);
  const [exibirSkeletonProjetos, setExibirSkeletonProjetos] = useState(false);
  const [erro, setErro] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [projetoEmEdicao, setProjetoEmEdicao] = useState(null);
  const [ehAdministrador, setEhAdministrador] = useState(obterStatusAdminEmCache());
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  useEffect(() => {
    if (modalAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalAberto]);
  const obterFiltrosSalvosProjetos = () => {
    try {
      const saved = sessionStorage.getItem('projectFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      status: 'todos',
      prioridade: 'todas',
      empresa: '',
      responsavel: ''
    };
  };
  const [filtrosProjetos, setFiltrosProjetos] = useState(obterFiltrosSalvosProjetos());
  const [dadosFormulario, setDadosFormulario] = useState({
    nome: '',
    descricao: '',
    empresa_id: '',
    responsavel_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo',
    prioridade: 'media',
    orcamento: '',
    horas_estimadas: '',
    cor_identificacao: '#3B82F6'
  });
  useEffect(() => {
    carregarDados();
    checkAdminStatus();
    carregarSuperiorEmpresaId();
  }, []);
  const carregarSuperiorEmpresaId = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: perfil,
        error
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
      if (error) throw error;
      setSuperiorEmpresaId(perfil?.superior_empresa_id || null);
    } catch (error) {
      setSuperiorEmpresaId(null);
    }
  };
  const checkAdminStatus = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: perfil
        } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const ehAdministradorUser = perfil?.role === 'admin';
        setEhAdministrador(ehAdministradorUser);
        CacheService.set('user_is_admin', ehAdministradorUser, user.id, 10 * 60 * 1000);
      }
    } catch (error) {}
  };
  const carregarDados = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      sessionStorage.setItem('currentUserId', user.id);
      const possuiDadosEmCache = projetos.length > 0 || usuarios.length > 0 || empresas.length > 0;
      if (possuiDadosEmCache) {
        await Promise.all([carregarProjetos(user.id, true), carregarUsuarios(user.id, true), carregarEmpresas(user.id, true)]);
        return;
      }
      setCarregandoGerenciamentoProjetos(true);
      setExibirSkeletonProjetos(true);
      setErro(null);
      await Promise.all([carregarProjetos(user.id, false), carregarUsuarios(user.id, false), carregarEmpresas(user.id, false)]);
    } catch (error) {
      setErro('Erro ao carregar dados. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregandoGerenciamentoProjetos(false);
      setExibirSkeletonProjetos(false);
    }
  };
  const carregarProjetos = async (idUsuario, atualizacaoEmSegundoPlano = false) => {
    try {
      if (!atualizacaoEmSegundoPlano) {}
      let empresaIdFiltro = superiorEmpresaId;
      if (!empresaIdFiltro) {
        const {
          data: perfil
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', idUsuario).single();
        empresaIdFiltro = perfil?.superior_empresa_id || null;
      }
      let consulta = supabase.from('projetos').select('*').is('deleted_at', null).order('created_at', {
        ascending: false
      });
      if (empresaIdFiltro) {
        consulta = consulta.eq('superior_empresa_id', empresaIdFiltro);
      }
      const {
        data,
        error
      } = await consulta;
      if (error) throw error;
      const projetosComRelacionamentos = await Promise.all((data || []).map(async projeto => {
        const projetoCompleto = {
          ...projeto
        };
        if (projeto.empresa_id) {
          try {
            const {
              data: empresa
            } = await supabase.from('empresas').select('nome').eq('id', projeto.empresa_id).single();
            projetoCompleto.empresas = empresa || {
              nome: '-'
            };
          } catch (err) {
            projetoCompleto.empresas = {
              nome: '-'
            };
          }
        } else {
          projetoCompleto.empresas = {
            nome: '-'
          };
        }
        if (projeto.responsavel_id) {
          try {
            const {
              data: responsavel
            } = await supabase.from('profiles').select('nome').eq('id', projeto.responsavel_id).single();
            projetoCompleto.profiles = responsavel || {
              nome: '-'
            };
          } catch (err) {
            projetoCompleto.profiles = {
              nome: '-'
            };
          }
        } else {
          projetoCompleto.profiles = {
            nome: '-'
          };
        }
        try {
          const {
            data: agendamentos
          } = await supabase.from('agendamento').select('entrada1, saida1, entrada2, saida2').eq('projeto_id', projeto.id);
          let totalMinutos = 0;
          if (agendamentos && agendamentos.length > 0) {
            agendamentos.forEach(agendamento => {
              if (agendamento.entrada1 && agendamento.saida1) {
                const entrada1 = new Date(`2000-01-01T${agendamento.entrada1}`);
                const saida1 = new Date(`2000-01-01T${agendamento.saida1}`);
                const diffMinutos1 = Math.floor((saida1 - entrada1) / 60000);
                if (diffMinutos1 > 0) {
                  totalMinutos += diffMinutos1;
                }
              }
              if (agendamento.entrada2 && agendamento.saida2) {
                const entrada2 = new Date(`2000-01-01T${agendamento.entrada2}`);
                const saida2 = new Date(`2000-01-01T${agendamento.saida2}`);
                const diffMinutos2 = Math.floor((saida2 - entrada2) / 60000);
                if (diffMinutos2 > 0) {
                  totalMinutos += diffMinutos2;
                }
              }
            });
          }
          projetoCompleto.horasTrabalhadas = Math.floor(totalMinutos / 60);
        } catch (err) {
          projetoCompleto.horasTrabalhadas = 0;
        }
        return projetoCompleto;
      }));
      setProjetos(projetosComRelacionamentos);
      if (idUsuario) {
        CacheService.set('projetos', projetosComRelacionamentos, idUsuario, 10 * 60 * 1000);
      }
    } catch (error) {}
  };
  const carregarUsuarios = async (idUsuario, atualizacaoEmSegundoPlano = false) => {
    try {
      if (!atualizacaoEmSegundoPlano) {}
      let empresaIdFiltro = superiorEmpresaId;
      if (!empresaIdFiltro) {
        const {
          data: perfil
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', idUsuario).single();
        empresaIdFiltro = perfil?.superior_empresa_id || null;
      }
      let consulta = supabase.from('profiles').select('id, nome, email').eq('is_active', true).order('nome');
      if (empresaIdFiltro) {
        consulta = consulta.eq('superior_empresa_id', empresaIdFiltro);
      }
      const {
        data,
        error
      } = await consulta;
      if (error) throw error;
      const usuarios = data || [];
      setUsuarios(usuarios);
      if (idUsuario) {
        CacheService.set('usuarios', usuarios, idUsuario, 10 * 60 * 1000);
      }
    } catch (error) {
      setUsuarios([]);
    }
  };
  const carregarEmpresas = async (idUsuario, atualizacaoEmSegundoPlano = false) => {
    try {
      if (!atualizacaoEmSegundoPlano) {}
      let empresaIdFiltro = superiorEmpresaId;
      if (!empresaIdFiltro) {
        const {
          data: perfil
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', idUsuario).single();
        empresaIdFiltro = perfil?.superior_empresa_id || null;
      }
      let consulta = supabase.from('empresas').select('id, nome, cnpj, superior_empresa_id').eq('is_active', true).order('nome');
      if (empresaIdFiltro) {
        consulta = consulta.or(`id.eq.${empresaIdFiltro},superior_empresa_id.eq.${empresaIdFiltro}`);
      }
      const {
        data,
        error
      } = await consulta;
      if (error) {
        throw error;
      }
      const empresas = data || [];
      if (empresas.length === 0 && empresaIdFiltro) {
        const {
          data: verificarEmpresa
        } = await supabase.from('empresas').select('id, nome').eq('id', empresaIdFiltro);
        if (verificarEmpresa && verificarEmpresa.length > 0) {
          const {
            data: empresaInativa
          } = await supabase.from('empresas').select('id, nome, cnpj').eq('id', empresaIdFiltro).single();
          if (empresaInativa) {
            setEmpresas([empresaInativa]);
            if (idUsuario) {
              CacheService.set('empresas', [empresaInativa], idUsuario, 10 * 60 * 1000);
            }
            return;
          }
        }
      }
      setEmpresas(empresas);
      if (idUsuario) {
        CacheService.set('empresas', empresas, idUsuario, 10 * 60 * 1000);
      }
    } catch (error) {
      setEmpresas([]);
    }
  };
  const abrirModal = (projeto = null) => {
    if (projeto) {
      setProjetoEmEdicao(projeto);
      setDadosFormulario({
        nome: projeto.nome || '',
        descricao: projeto.descricao || '',
        empresa_id: projeto.empresa_id || '',
        responsavel_id: projeto.responsavel_id || '',
        data_inicio: projeto.data_inicio || '',
        data_fim: projeto.data_fim || '',
        status: projeto.status || 'ativo',
        prioridade: projeto.prioridade || 'media',
        orcamento: projeto.orcamento || '',
        horas_estimadas: projeto.horas_estimadas || '',
        cor_identificacao: projeto.cor_identificacao || '#3B82F6',
        geocerca_latitude: projeto.geocerca_latitude || '',
        geocerca_longitude: projeto.geocerca_longitude || '',
        geocerca_raio_metros: projeto.geocerca_raio_metros || '100'
      });
    } else {
      setProjetoEmEdicao(null);
      setDadosFormulario({
        nome: '',
        descricao: '',
        empresa_id: '',
        responsavel_id: '',
        data_inicio: '',
        data_fim: '',
        status: 'ativo',
        prioridade: 'media',
        orcamento: '',
        horas_estimadas: '',
        cor_identificacao: '#3B82F6'
      });
    }
    setModalAberto(true);
  };
  const fecharModal = () => {
    setModalAberto(false);
    setProjetoEmEdicao(null);
  };
  const aoAlterarCampoFormularioProjeto = e => {
    const {
      name,
      value
    } = e.target;
    setDadosFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const aoAlterarFiltroListaProjetos = e => {
    const {
      name,
      value
    } = e.target;
    const novosFiltros = {
      ...filtrosProjetos,
      [name]: value
    };
    setFiltrosProjetos(novosFiltros);
    try {
      sessionStorage.setItem('projectFilters', JSON.stringify(novosFiltros));
    } catch (e) {}
  };
  const limparFiltros = () => {
    const filtrosPadrao = {
      status: 'todos',
      prioridade: 'todas',
      empresa: '',
      responsavel: ''
    };
    setFiltrosProjetos(filtrosPadrao);
    try {
      sessionStorage.removeItem('projectFilters');
    } catch (e) {}
  };
  const processarEnvioFormularioProjeto = async e => {
    e.preventDefault();
    try {
      setCarregandoGerenciamentoProjetos(true);

      // Validacao do orcamento
      const orcamentoVal = dadosFormulario.orcamento ? parseFloat(dadosFormulario.orcamento) : null;
      if (orcamentoVal !== null && (isNaN(orcamentoVal) || orcamentoVal < 0 || orcamentoVal > 999999999)) {
        showError(t('projetos.invalidBudget'));
        setCarregandoGerenciamentoProjetos(false);
        return;
      }

      const dadosProjeto = {
        nome: dadosFormulario.nome,
        descricao: dadosFormulario.descricao,
        empresa_id: dadosFormulario.empresa_id || null,
        responsavel_id: dadosFormulario.responsavel_id || null,
        data_inicio: dadosFormulario.data_inicio || null,
        data_fim: dadosFormulario.data_fim || null,
        orcamento: orcamentoVal,
        status: dadosFormulario.status,
        cor_identificacao: dadosFormulario.cor_identificacao,
        horas_estimadas: dadosFormulario.horas_estimadas ? parseInt(dadosFormulario.horas_estimadas) : null,
        prioridade: dadosFormulario.prioridade,
        superior_empresa_id: superiorEmpresaId,
        geocerca_latitude: dadosFormulario.geocerca_latitude ? parseFloat(dadosFormulario.geocerca_latitude) : null,
        geocerca_longitude: dadosFormulario.geocerca_longitude ? parseFloat(dadosFormulario.geocerca_longitude) : null,
        geocerca_raio_metros: dadosFormulario.geocerca_raio_metros ? parseInt(dadosFormulario.geocerca_raio_metros, 10) : 100
      };
      let result;
      if (projetoEmEdicao) {
        result = await supabase.from('projetos').update(dadosProjeto).eq('id', projetoEmEdicao.id).select();
      } else {
        result = await supabase.from('projetos').insert([dadosProjeto]).select();
      }
      if (result.error) {
        throw result.error;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        CacheService.remove('projetos', user.id);
      }
      await carregarProjetos(user?.id, false);
      showSuccess('Projeto salvo com sucesso!');
      fecharModal();
    } catch {
      showError(t('projetos.errorSaveProject'));
    } finally {
      setCarregandoGerenciamentoProjetos(false);
    }
  };
  const processarExclusaoProjeto = async projetoId => {
    showConfirm(t('projetos.deleteConfirmMessage'), async () => {
      try {
        setCarregandoGerenciamentoProjetos(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Nao autenticado');

        const { data: perfil } = await supabase
          .from('profiles')
          .select('role, superior_empresa_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfil?.role !== 'admin') {
          showError(t('comum.accessDenied'));
          return;
        }

        const { data: projeto } = await supabase
          .from('projetos')
          .select('id, superior_empresa_id')
          .eq('id', projetoId)
          .maybeSingle();

        if (!projeto || projeto.superior_empresa_id !== perfil.superior_empresa_id) {
          showError(t('comum.accessDenied'));
          return;
        }

        setCarregandoGerenciamentoProjetos(true);

        // Soft-delete: preserva batidas e jornadas (CLT Art. 74)
        const { error: erroProjeto } = await supabase
          .from('projetos')
          .update({ status: 'cancelado', deleted_at: new Date().toISOString() })
          .eq('id', projetoId);
        if (erroProjeto) {
          throw erroProjeto;
        }

        CacheService.remove('projetos', session.user.id);
        await carregarProjetos(session.user.id, false);
        showSuccess(t('projetos.projectDeleted'));
      } catch {
        showError(t('projetos.errorDeleteProject'));
      } finally {
        setCarregandoGerenciamentoProjetos(false);
      }
    }, t('projetos.deleteConfirmTitle'));
  };
  const obterCorStatus = status => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'pausado':
        return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'concluido':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'cancelado':
        return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };
  const obterTextoStatus = status => {
    switch (status) {
      case 'ativo':
        return t('projetos.statusActive');
      case 'pausado':
        return t('projetos.statusPaused');
      case 'concluido':
        return t('projetos.statusCompleted');
      case 'cancelado':
        return t('projetos.statusCancelled');
      default:
        return t('projetos.undefined');
    }
  };
  const obterCorPrioridade = prioridade => {
    switch (prioridade) {
      case 'baixa':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200';
      case 'media':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300';
      case 'alta':
        return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300';
      case 'urgente':
        return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200';
    }
  };
  const obterTextoPrioridade = prioridade => {
    switch (prioridade) {
      case 'baixa':
        return t('projetos.priorityLow');
      case 'media':
        return t('projetos.priorityMedium');
      case 'alta':
        return t('projetos.priorityHigh');
      case 'urgente':
        return t('projetos.priorityUrgent');
      default:
        return t('projetos.undefinedPriority');
    }
  };
  const isProjetoAtrasado = projeto => {
    if (!projeto.data_fim) return false;
    if (projeto.status === 'concluido' || projeto.status === 'cancelado') return false;
    const dataFim = new Date(projeto.data_fim + 'T23:59:59');
    const hoje = new Date();
    return hoje > dataFim;
  };
  const formatarMoeda = value => {
    if (!value) return '-';
    const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
    const currency = locale === 'pt-BR' ? 'BRL' : 'USD';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(value);
  };
  const formatarDataExibicao = textoData => {
    if (!textoData) return '-';
    return formatarData(textoData, 'DD/MM/YYYY');
  };
  const projetosFiltrados = projetos.filter(projeto => {
    const correspondeStatus = filtrosProjetos.status === 'todos' || projeto.status === filtrosProjetos.status;
    const correspondePrioridade = filtrosProjetos.prioridade === 'todas' || projeto.prioridade === filtrosProjetos.prioridade;
    const correspondeEmpresa = !filtrosProjetos.empresa || projeto.empresa_id === filtrosProjetos.empresa;
    const correspondeResponsavel = !filtrosProjetos.responsavel || projeto.responsavel_id === filtrosProjetos.responsavel;
    return correspondeStatus && correspondePrioridade && correspondeEmpresa && correspondeResponsavel;
  });
  const estatisticas = {
    total: projetos.length,
    ativos: projetos.filter(p => p.status === 'ativo').length,
    concluidos: projetos.filter(p => p.status === 'concluido').length,
    pausados: projetos.filter(p => p.status === 'pausado').length,
    cancelados: projetos.filter(p => p.status === 'cancelado').length
  };
  return <MainLayout title={t('projetos.title')} subtitle={t('projetos.subtitle')}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FiTarget className="w-6 h-6 sm:w-7 sm:h-7" />
          {t('projetos.projects')}
        </h2>
        {ehAdministrador && <button onClick={() => abrirModal()} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            <FiPlus className="w-5 h-5" />
            {t('projetos.newProject')}
          </button>}
      </div>

      {erro && <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 dark:border-red-600 rounded-lg">
          <div className="flex items-center">
            <FiAlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-3 flex-shrink-0" />
            <div>
              <div className="font-medium text-red-800 dark:text-red-200">Erro ao carregar projetos</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">{erro}</div>
            </div>
          </div>
        </div>}

      <div className="yt-card p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.total}</div>
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-200 flex items-center justify-center gap-1">
                <FiBarChart2 className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projetos.total')}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{estatisticas.ativos}</div>
              <div className="text-xs sm:text-sm text-green-700 dark:text-green-200 flex items-center justify-center gap-1">
                <FiCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projetos.actives')}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.concluidos}</div>
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-200 flex items-center justify-center gap-1">
                <FiCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projetos.concluded')}
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estatisticas.pausados}</div>
              <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-200 flex items-center justify-center gap-1">
                <FiCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projetos.paused')}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{estatisticas.cancelados}</div>
              <div className="text-xs sm:text-sm text-red-700 dark:text-red-200 flex items-center justify-center gap-1">
                <FiXCircle className="w-3 h-3 sm:w-4 sm:h-4" /> {t('projetos.cancelled')}
              </div>
            </div>
          </div>

          <div className="yt-card p-3 sm:p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium yt-label mb-2">{t('projetos.statusLabel')}</label>
                <select name="status" value={filtrosProjetos.status} onChange={aoAlterarFiltroListaProjetos} className="w-full px-4 py-2.5 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="todos">{t('projetos.allStatus')}</option>
                  <option value="ativo">{t('projetos.statusActive')}</option>
                  <option value="pausado">{t('projetos.statusPaused')}</option>
                  <option value="concluido">{t('projetos.statusCompleted')}</option>
                  <option value="cancelado">{t('projetos.statusCancelled')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium yt-label mb-2">{t('projetos.priority')}</label>
                <select name="prioridade" value={filtrosProjetos.prioridade} onChange={aoAlterarFiltroListaProjetos} className="w-full px-4 py-2.5 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="todas">{t('projetos.allPriorities')}</option>
                  <option value="baixa">{t('projetos.priorityLow')}</option>
                  <option value="media">{t('projetos.priorityMedium')}</option>
                  <option value="alta">{t('projetos.priorityHigh')}</option>
                  <option value="urgente">{t('projetos.priorityUrgent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium yt-label mb-2">{t('projetos.companyLabel')}</label>
                <select name="empresa" value={filtrosProjetos.empresa} onChange={aoAlterarFiltroListaProjetos} className="w-full px-4 py-2.5 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">{t('projetos.allCompanies')}</option>
                  {empresas.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium yt-label mb-2">{t('projetos.responsible')}</label>
                <select name="responsavel" value={filtrosProjetos.responsavel} onChange={aoAlterarFiltroListaProjetos} className="w-full px-4 py-2.5 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">{t('projetos.allResponsibles')}</option>
                  {usuarios.map(usuario => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
                </select>
              </div>
            </div>

            {(filtrosProjetos.status !== 'todos' || filtrosProjetos.prioridade !== 'todas' || filtrosProjetos.empresa || filtrosProjetos.responsavel) && <div className="mt-4 flex justify-end">
                <button type="button" onClick={limparFiltros} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                  <FiRotateCcw className="w-4 h-4" />
                  {t('historico.clear')}
                </button>
              </div>}
          </div>

        {exibirSkeletonProjetos ? <GerenciamentoProjetosSkeleton /> : <div className="space-y-4">
          {projetosFiltrados.length === 0 ? <div className="yt-card border-gray-300 dark:border-gray-700 p-8 text-center">
              <FiFolder className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('projetos.noProjectsFound')}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t('projetos.createNewOrAdjustFilters')}</p>
            </div> : projetosFiltrados.map(projeto => <div key={projeto.id} className="yt-card border-gray-300 dark:border-gray-700 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{
                  backgroundColor: projeto.cor_identificacao
                }}></div>
                      <h3 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-100 break-words">{projeto.nome}</h3>
                      <span className={`px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${obterCorStatus(projeto.status)}`}>
                        {obterTextoStatus(projeto.status)}
                      </span>
                      <span className={`px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${obterCorPrioridade(projeto.prioridade)}`}>
                        {obterTextoPrioridade(projeto.prioridade)}
                      </span>
                      {isProjetoAtrasado(projeto) && ehAdministrador && <span className="px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          {t('projetos.delayed')}
                        </span>}
                    </div>
                    
                    {projeto.descricao && <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{projeto.descricao}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('projetos.companyField')}</span>
                        <p className="text-gray-600 dark:text-gray-400 truncate">{projeto.empresas?.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('projetos.responsibleField')}</span>
                        <p className="text-gray-600 dark:text-gray-400 truncate">{projeto.profiles?.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('projetos.periodField')}</span>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                          {formatarDataExibicao(projeto.data_inicio)} - {formatarDataExibicao(projeto.data_fim)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('projetos.budgetField')}</span>
                        <p className="text-gray-600 dark:text-gray-400">{formatarMoeda(projeto.orcamento)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto sm:ml-4 items-start justify-end">
                    {isProjetoAtrasado(projeto) && !ehAdministrador && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3" />
                        {t('projetos.delayed')}
                      </span>}
                    {ehAdministrador && <>
                        <button onClick={() => abrirModal(projeto)} className="px-2 sm:px-3 py-1 bg-blue-500 text-white text-xs sm:text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1">
                          <FiEdit2 className="w-3 h-3 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline">{t('projetos.edit')}</span>
                        </button>
                        <button onClick={() => processarExclusaoProjeto(projeto.id)} className="px-2 sm:px-3 py-1 bg-red-500 text-white text-xs sm:text-sm rounded-md hover:bg-red-600 transition-colors flex items-center gap-1">
                          <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline">{t('projetos.exclude')}</span>
                        </button>
                      </>}
                  </div>
                </div>

                {projeto.horas_estimadas && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-xs sm:text-sm mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t('projetos.hoursProgress')}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {projeto.horasTrabalhadas || 0} / {projeto.horas_estimadas}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{
                width: `${Math.min((projeto.horasTrabalhadas || 0) / projeto.horas_estimadas * 100, 100)}%`
              }}></div>
                    </div>
                  </div>}
              </div>)}
        </div>}

        {modalAberto && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="yt-modal-surface rounded-t-lg sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {projetoEmEdicao ? <>
                        <FiEdit2 className="w-6 h-6" /> Editar Projeto
                      </> : <>
                        <FiPlus className="w-6 h-6" /> Novo Projeto
                      </>}
                  </h2>
                  <button type="button" onClick={fecharModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={processarEnvioFormularioProjeto} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalProjectName')}
                      </label>
                      <input type="text" name="nome" value={dadosFormulario.nome} onChange={aoAlterarCampoFormularioProjeto} required className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalCompany')}
                      </label>
                      <select name="empresa_id" value={dadosFormulario.empresa_id} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">{t('projetos.modalSelectCompany')}</option>
                        {empresas.map(empresa => <option key={empresa.id} value={empresa.id}>
                            {empresa.nome}
                          </option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium yt-label mb-1">
                      {t('projetos.modalDescription')}
                    </label>
                    <textarea name="descricao" value={dadosFormulario.descricao} onChange={aoAlterarCampoFormularioProjeto} rows={3} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalStartDate')}
                      </label>
                      <input type="date" name="data_inicio" value={dadosFormulario.data_inicio} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalEndDate')}
                      </label>
                      <input type="date" name="data_fim" value={dadosFormulario.data_fim} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalStatus')}
                      </label>
                      <select name="status" value={dadosFormulario.status} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="ativo">{t('projetos.statusActive')}</option>
                        <option value="pausado">{t('projetos.statusPaused')}</option>
                        <option value="concluido">{t('projetos.statusCompleted')}</option>
                        <option value="cancelado">{t('projetos.statusCancelled')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalPriority')}
                      </label>
                      <select name="prioridade" value={dadosFormulario.prioridade} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="baixa">🔹 {t('projetos.priorityLow')}</option>
                        <option value="media">🔸 {t('projetos.priorityMedium')}</option>
                        <option value="alta">🔶 {t('projetos.priorityHigh')}</option>
                        <option value="urgente">🔺 {t('projetos.priorityUrgent')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalBudget')}
                      </label>
                      <input type="number" name="orcamento" value={dadosFormulario.orcamento} onChange={aoAlterarCampoFormularioProjeto} step="0.01" min="0" className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalEstimatedHours')}
                      </label>
                      <input type="number" name="horas_estimadas" value={dadosFormulario.horas_estimadas} onChange={aoAlterarCampoFormularioProjeto} min="0" className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium yt-label mb-1">
                        {t('projetos.modalResponsible')}
                      </label>
                      <select name="responsavel_id" value={dadosFormulario.responsavel_id} onChange={aoAlterarCampoFormularioProjeto} className="w-full px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">{t('projetos.modalSelectResponsible')}</option>
                        {usuarios.map(usuario => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium yt-label mb-1">
                      Geocerca do Projeto (opcional)
                    </label>
                    <GeocercaSelector
                      latitude={dadosFormulario.geocerca_latitude ? parseFloat(dadosFormulario.geocerca_latitude) : null}
                      longitude={dadosFormulario.geocerca_longitude ? parseFloat(dadosFormulario.geocerca_longitude) : null}
                      raio={dadosFormulario.geocerca_raio_metros ? parseInt(dadosFormulario.geocerca_raio_metros, 10) : 100}
                      onChange={(lat, lon, raio) => setDadosFormulario(prev => ({
                        ...prev,
                        geocerca_latitude: lat.toString(),
                        geocerca_longitude: lon.toString(),
                        geocerca_raio_metros: raio.toString()
                      }))}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button type="submit" disabled={carregandoGerenciamentoProjetos} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {carregandoGerenciamentoProjetos ? t('projetos.modalSaving') : projetoEmEdicao ? <>
                          <FiSave className="w-5 h-5" /> {t('projetos.modalUpdate')}
                        </> : <>
                          <FiPlus className="w-5 h-5" /> {t('projetos.modalCreate')}
                        </>}
                    </button>
                    <button type="button" onClick={fecharModal} className="px-4 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                      <FiX className="w-5 h-5" /> {t('projetos.modalCancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>}
      </div>

      <Modal isOpen={modalState.isOpen} onClose={closeNotificationModal} title={modalState.title} type={modalState.type} confirmText={modalState.confirmText} cancelText={modalState.cancelText} showCancel={modalState.showCancel} onConfirm={modalState.onConfirm}>
        {modalState.message}
      </Modal>
    </MainLayout>;
}
export default GerenciamentoProjetos;
