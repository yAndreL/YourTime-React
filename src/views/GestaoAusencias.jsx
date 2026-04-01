import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import AusenciaService from '../services/AusenciaService';
import { formatarData } from '../utils/dateUtils';
import { FiPlus, FiCheck, FiX, FiPaperclip, FiCalendar, FiFilter, FiFileText } from 'react-icons/fi';

function GestaoAusencias() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [carregandoGestaoAusencias, setCarregandoGestaoAusencias] = useState(true);
  const [ausencias, setAusencias] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [ehAdministrador, setEhAdministrador] = useState(false);
  const [idUsuario, setIdUsuario] = useState(null);
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('ausencias');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalRejeicao, setModalRejeicao] = useState({ isOpen: false, ausenciaId: null });
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [formAusencia, setFormAusencia] = useState({
    dataInicio: '', dataFim: '', tipo: '', justificativa: '', anexo: null
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (idUsuario) carregarAusencias();
  }, [filtroStatus]);

  const carregarDados = async () => {
    let idSuperiorParaGeracaoAutomatica = null;
    try {
      setCarregandoGestaoAusencias(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCarregandoGestaoAusencias(false);
        return;
      }

      setIdUsuario(session.user.id);

      const { data: perfil } = await supabase
        .from('profiles')
        .select('role, superior_empresa_id')
        .eq('id', session.user.id)
        .single();

      const admin = perfil?.role === 'admin';
      setEhAdministrador(admin);
      setSuperiorEmpresaId(perfil?.superior_empresa_id);

      if (admin && perfil?.superior_empresa_id) {
        const resultado = await AusenciaService.buscarAusenciasAdmin(perfil.superior_empresa_id, { status: filtroStatus || undefined });
        setAusencias(resultado.data);
        idSuperiorParaGeracaoAutomatica = perfil.superior_empresa_id;
      } else {
        const resultado = await AusenciaService.buscarAusencias(session.user.id, { status: filtroStatus || undefined });
        setAusencias(resultado.data);
      }

      const ano = new Date().getFullYear();
      const feriadosResult = await AusenciaService.buscarFeriados(ano, perfil?.superior_empresa_id);
      setFeriados(feriadosResult.data);
    } catch (error) {
      showError('Erro ao carregar dados');
    } finally {
      setCarregandoGestaoAusencias(false);
    }

    if (idSuperiorParaGeracaoAutomatica) {
      try {
        const resultadoGeracao = await AusenciaService.gerarAusenciasAutomaticas(idSuperiorParaGeracaoAutomatica);
        if (resultadoGeracao.success && resultadoGeracao.geradas > 0) {
          const listaAtualizada = await AusenciaService.buscarAusenciasAdmin(idSuperiorParaGeracaoAutomatica, { status: filtroStatus || undefined });
          setAusencias(listaAtualizada.data);
        }
      } catch {
        /* geração automática é opcional; falhas de RLS não devem travar a tela */
      }
    }
  };

  const carregarAusencias = async () => {
    if (ehAdministrador && superiorEmpresaId) {
      const resultado = await AusenciaService.buscarAusenciasAdmin(superiorEmpresaId, { status: filtroStatus || undefined });
      setAusencias(resultado.data);
    } else if (idUsuario) {
      const resultado = await AusenciaService.buscarAusencias(idUsuario, { status: filtroStatus || undefined });
      setAusencias(resultado.data);
    }
  };

  const processarEnvioFormularioAusencia = async (e) => {
    e.preventDefault();
    if (!formAusencia.dataInicio || !formAusencia.dataFim || !formAusencia.tipo) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }

    const resultado = await AusenciaService.criarAusencia({
      userId: idUsuario,
      dataInicio: formAusencia.dataInicio,
      dataFim: formAusencia.dataFim,
      tipo: formAusencia.tipo,
      justificativa: formAusencia.justificativa,
      anexoFile: formAusencia.anexo,
      superiorEmpresaId
    });

    if (resultado.success) {
      showSuccess('Ausência registrada com sucesso');
      setModalAberto(false);
      setFormAusencia({ dataInicio: '', dataFim: '', tipo: '', justificativa: '', anexo: null });
      carregarAusencias();
    } else {
      showError(resultado.error);
    }
  };

  const processarAprovacaoAusencia = async (ausenciaId) => {
    const resultado = await AusenciaService.aprovarAusencia(ausenciaId, idUsuario);
    if (resultado.success) {
      showSuccess('Ausência aprovada');
      carregarAusencias();
    } else {
      showError(resultado.error);
    }
  };

  const processarRejeicaoAusencia = async () => {
    if (!motivoRejeicao.trim()) {
      showError('Informe o motivo da rejeição');
      return;
    }

    const resultado = await AusenciaService.rejeitarAusencia(modalRejeicao.ausenciaId, idUsuario, motivoRejeicao);
    if (resultado.success) {
      showSuccess('Ausência rejeitada');
      setModalRejeicao({ isOpen: false, ausenciaId: null });
      setMotivoRejeicao('');
      carregarAusencias();
    } else {
      showError(resultado.error);
    }
  };

  const tiposAusencia = AusenciaService.getTiposAusencia();

  const obterSeloStatus = (status) => {
    const configuracoesPorStatus = {
      pendente: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300',
      aprovada: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300',
      rejeitada: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
    };
    const labels = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${configuracoesPorStatus[status]}`}>{labels[status]}</span>;
  };

  return (
    <MainLayout title="Gestão de Ausências" subtitle="Férias, atestados, licenças e justificativas">
      <div className="space-y-6">
        {/* Abas */}
        <div className="yt-card overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button type="button" onClick={() => setAbaAtiva('ausencias')}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${abaAtiva === 'ausencias' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <FiFileText className="w-4 h-4" /> Ausências
              </button>
              <button type="button" onClick={() => setAbaAtiva('feriados')}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${abaAtiva === 'feriados' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                <FiCalendar className="w-4 h-4" /> Feriados
              </button>
            </nav>
          </div>

          <div className="p-5">
            {abaAtiva === 'ausencias' ? (
              <div>
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FiFilter className="w-4 h-4 text-gray-500" />
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg yt-field text-sm">
                      <option value="">Todos</option>
                      <option value="pendente">Pendentes</option>
                      <option value="aprovada">Aprovadas</option>
                      <option value="rejeitada">Rejeitadas</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => setModalAberto(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <FiPlus className="w-4 h-4" /> Nova Ausência
                  </button>
                </div>

                {/* Lista */}
                {carregandoGestaoAusencias ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div></div>
                ) : ausencias.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">Nenhuma ausência encontrada</p>
                ) : (
                  <div className="space-y-3">
                    {ausencias.map(ausencia => (
                      <div key={ausencia.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {tiposAusencia[ausencia.tipo]?.label || ausencia.tipo}
                              </span>
                              {obterSeloStatus(ausencia.status)}
                            </div>
                            {ehAdministrador && ausencia.profiles && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {ausencia.profiles.nome} {ausencia.profiles.departamento ? `• ${ausencia.profiles.departamento}` : ''}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {formatarData(ausencia.data_inicio, 'DD/MM/YYYY')} a {formatarData(ausencia.data_fim, 'DD/MM/YYYY')}
                              <span className="ml-2 text-gray-400">
                                ({AusenciaService.calcularDiasAusencia(ausencia.data_inicio, ausencia.data_fim)} dias úteis)
                              </span>
                            </p>
                            {ausencia.justificativa && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ausencia.justificativa}</p>
                            )}
                            {ausencia.anexo_url && (
                              <a href={ausencia.anexo_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline">
                                <FiPaperclip className="w-3 h-3" /> Ver anexo
                              </a>
                            )}
                            {ausencia.motivo_rejeicao && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Motivo: {ausencia.motivo_rejeicao}</p>
                            )}
                          </div>
                          {ehAdministrador && ausencia.status === 'pendente' && (
                            <div className="flex items-start gap-2">
                              <button onClick={() => processarAprovacaoAusencia(ausencia.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1">
                                <FiCheck className="w-3 h-3" /> Aprovar
                              </button>
                              <button onClick={() => setModalRejeicao({ isOpen: true, ausenciaId: ausencia.id })}
                                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 flex items-center gap-1">
                                <FiX className="w-3 h-3" /> Rejeitar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Feriados {new Date().getFullYear()}</h3>
                {feriados.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">Nenhum feriado cadastrado</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {feriados.map(feriado => (
                      <div key={feriado.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{feriado.nome}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatarData(feriado.data, 'DD/MM/YYYY')}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            feriado.tipo === 'nacional' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' :
                            feriado.tipo === 'estadual' ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {feriado.tipo}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova Ausência */}
      {modalAberto && (
        <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} title="Registrar Ausência">
          <form onSubmit={processarEnvioFormularioAusencia} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={formAusencia.tipo} onChange={e => setFormAusencia(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg yt-field text-sm" required>
                <option value="">Selecione...</option>
                {Object.entries(tiposAusencia).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início *</label>
                <input type="date" value={formAusencia.dataInicio}
                  onChange={e => setFormAusencia(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg yt-field text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim *</label>
                <input type="date" value={formAusencia.dataFim}
                  onChange={e => setFormAusencia(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg yt-field text-sm" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Justificativa</label>
              <textarea value={formAusencia.justificativa}
                onChange={e => setFormAusencia(prev => ({ ...prev, justificativa: e.target.value }))}
                rows={3} className="w-full px-3 py-2 border rounded-lg yt-field text-sm" placeholder="Descreva o motivo..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anexo (atestado, documento)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFormAusencia(prev => ({ ...prev, anexo: e.target.files[0] }))}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModalAberto(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Registrar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Rejeição */}
      {modalRejeicao.isOpen && (
        <Modal isOpen={modalRejeicao.isOpen} onClose={() => setModalRejeicao({ isOpen: false, ausenciaId: null })} title="Rejeitar Ausência">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo da rejeição *</label>
              <textarea value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)}
                rows={3} className="w-full px-3 py-2 border rounded-lg yt-field text-sm" placeholder="Informe o motivo..." required />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModalRejeicao({ isOpen: false, ausenciaId: null })}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="button" onClick={processarRejeicaoAusencia}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}

export default GestaoAusencias;
