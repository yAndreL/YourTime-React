import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase.js';
import MainLayout from '../layout/MainLayout';
import NotificationService from '../../services/NotificationService';
import { useLanguage } from '../../hooks/useLanguage';
import { obterTextoDataLocal } from '../../utils/dateUtils';
import { FiFileText, FiClock, FiSave, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
function FormularioPonto() {
  const {
    t
  } = useLanguage();
  const [dadosFormulario, setDadosFormulario] = useState({
    data: '',
    observacao: '',
    entrada1: '',
    saida1: '',
    entrada2: '',
    saida2: ''
  });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviandoFormularioPonto, setEnviandoFormularioPonto] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    carregarUsuarioAtual();
    carregarProjetoSelecionado();
    definirDataPadrao();
  }, []);
  const carregarProjetoSelecionado = () => {
    try {
      const projetoSalvo = localStorage.getItem('selectedProject');
      if (projetoSalvo) {
        const project = JSON.parse(projetoSalvo);
        setProjetoSelecionado(project);
      }
    } catch (error) {}
  };
  const carregarUsuarioAtual = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setErro(t('validacao.userNotAuthenticated'));
        return;
      }
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('id, nome, email').eq('id', user.id).single();
      if (error) throw error;
      if (profile) {
        setUsuarioAtual(profile);
      }
    } catch (error) {
      setErro(t('validacao.errorLoadingUser'));
    }
  };
  const definirDataPadrao = () => {
    const hoje = obterTextoDataLocal();
    setDadosFormulario(prev => ({
      ...prev,
      data: hoje
    }));
  };
  const aoAlterarCampoFormularioPonto = e => {
    const {
      name,
      value
    } = e.target;
    if (name.includes('entrada') || name.includes('saida')) {
      const sanitized = value.replace(/[^\d:]/g, '');
      if (sanitized.length === 2 && !sanitized.includes(':')) {
        setDadosFormulario(prev => ({
          ...prev,
          [name]: sanitized + ':'
        }));
        return;
      }
      if (sanitized.length <= 5) {
        const parts = sanitized.split(':');
        if (parts[0] && parseInt(parts[0]) > 23) {
          parts[0] = '23';
        }
        if (parts[1] && parseInt(parts[1]) > 59) {
          parts[1] = '59';
        }
        setDadosFormulario(prev => ({
          ...prev,
          [name]: parts.join(':')
        }));
        return;
      }
    }
    setDadosFormulario(prev => ({
      ...prev,
      [name]: value
    }));
    setErro('');
    setSucesso('');
  };
  const validarHorarios = () => {
    const {
      entrada1,
      saida1,
      entrada2,
      saida2
    } = dadosFormulario;
    if (!entrada1) {
      setErro(t('validacao.entry1Required'));
      return false;
    }
    if (!saida1) {
      setErro(t('validacao.exit1Required'));
      return false;
    }
    if (!entrada2) {
      setErro(t('validacao.entry2Required'));
      return false;
    }
    if (!saida2) {
      setErro(t('validacao.exit2Required'));
      return false;
    }
    if (entrada1 >= saida1) {
      setErro(t('validacao.exit1AfterEntry1'));
      return false;
    }
    if (entrada2 <= saida1) {
      setErro(t('validacao.entry2AfterExit1'));
      return false;
    }
    if (saida2 <= entrada2) {
      setErro(t('validacao.exit2AfterEntry2'));
      return false;
    }
    return true;
  };
  const calcularPausaAlmoco = () => {
    const {
      entrada1,
      saida1,
      entrada2
    } = dadosFormulario;
    if (!saida1 || !entrada2) return 0;
    const saida1Time = new Date(`2000-01-01T${saida1}`);
    const entrada2Time = new Date(`2000-01-01T${entrada2}`);
    const diffMs = entrada2Time - saida1Time;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes;
  };
  const calcularPausasExtras = () => {
    return 0;
  };
  const calcularTotalTrabalhado = () => {
    const {
      entrada1,
      saida1,
      entrada2,
      saida2
    } = dadosFormulario;
    let totalMinutos = 0;
    if (entrada1 && saida1) {
      const entrada1Time = new Date(`2000-01-01T${entrada1}`);
      const saida1Time = new Date(`2000-01-01T${saida1}`);
      const diff1 = saida1Time - entrada1Time;
      totalMinutos += Math.floor(diff1 / (1000 * 60));
    }
    if (entrada2 && saida2) {
      const entrada2Time = new Date(`2000-01-01T${entrada2}`);
      const saida2Time = new Date(`2000-01-01T${saida2}`);
      const diff2 = saida2Time - entrada2Time;
      totalMinutos += Math.floor(diff2 / (1000 * 60));
    }
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    if (horas === 0) {
      return `${minutos}min`;
    } else if (minutos === 0) {
      return `${horas}h`;
    } else {
      return `${horas}h${minutos}min`;
    }
  };
  const processarEnvioFormularioPonto = async e => {
    e.preventDefault();
    if (!validarHorarios()) return;
    if (!usuarioAtual) {
      setErro('Usuário não identificado. Faça login novamente.');
      return;
    }
    const hoje = obterTextoDataLocal();
    if (dadosFormulario.data > hoje) {
      setErro(t('validacao.futureDate'));
      return;
    }
    setEnviandoFormularioPonto(true);
    setErro('');
    setSucesso('');
    try {
      const {
        data: registrosExistentes,
        error: errVerificacao
      } = await supabase.from('agendamento').select('id, entrada1, saida1, entrada2, saida2, data, created_at, status').eq('user_id', usuarioAtual.id).eq('data', dadosFormulario.data);
      if (errVerificacao) throw errVerificacao;
      if (registrosExistentes && registrosExistentes.length > 0) {
        const registro = registrosExistentes[0];
        const horarios = `${registro.entrada1 || '--'} - ${registro.saida1 || '--'}${registro.entrada2 ? ` | ${registro.entrada2} - ${registro.saida2 || '--'}` : ''}`;
        const statusTexto = registro.status === 'P' ? t('historico.pending') : registro.status === 'A' ? t('historico.approved') : t('historico.rejected');
        setErro(t('validacao.duplicateRecord').replace('{date}', dadosFormulario.data).replace('{times}', horarios).replace('{status}', statusTexto));
        setEnviandoFormularioPonto(false);
        return;
      }
      const {
        data: profileData,
        error: profileError
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', usuarioAtual.id).single();
      if (profileError) {}
      let empresaIdDoProjeto = null;
      if (projetoSelecionado?.id) {
        const {
          data: projetoData
        } = await supabase.from('projetos').select('empresa_id').eq('id', projetoSelecionado.id).single();
        empresaIdDoProjeto = projetoData?.empresa_id || null;
      }
      const pontoData = {
        user_id: usuarioAtual.id,
        data: dadosFormulario.data,
        entrada1: dadosFormulario.entrada1,
        saida1: dadosFormulario.saida1 || null,
        entrada2: dadosFormulario.entrada2 || null,
        saida2: dadosFormulario.saida2 || null,
        observacao: dadosFormulario.observacao || null,
        pausa_almoco: calcularPausaAlmoco(),
        pausas_extras: calcularPausasExtras(),
        status: 'P',
        projeto_id: projetoSelecionado?.id || null,
        empresa_id: empresaIdDoProjeto,
        superior_empresa_id: profileData?.superior_empresa_id || null
      };
      const {
        data,
        error
      } = await supabase.from('agendamento').insert([pontoData]).select();
      if (error) {
        throw error;
      }
      if (data && data.length > 0) {
        await NotificationService.notificarAdminsPontoPendente(data[0].id, usuarioAtual.nome, dadosFormulario.data, usuarioAtual.id);
      }
      sessionStorage.removeItem('cachedTimeRecords');
      setSucesso(t('formularioPonto.saved'));
      setTimeout(() => {
        navigate('/');
      }, 400);
    } catch (error) {
      setErro(t('validacao.errorSavingRecord').replace('{error}', error.message));
    } finally {
      setEnviandoFormularioPonto(false);
    }
  };
  return <MainLayout title={t('formularioPonto.title')} subtitle={usuarioAtual ? `${t('formularioPonto.hello')}, ${usuarioAtual.nome}` : ''}>
      {projetoSelecionado && <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{
          backgroundColor: projetoSelecionado.cor_identificacao
        }}></div>
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('formularioPonto.title')}:</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{projetoSelecionado.nome}</div>
            </div>
          </div>
        </div>}

      {!projetoSelecionado && <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100">{t('formularioPonto.noProjectSelected')}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">{t('formularioPonto.selectProjectMsg')}</div>
          </div>
        </div>}

      <div className="max-w-4xl mx-auto">
        <div className="yt-card p-5">
            <form onSubmit={processarEnvioFormularioPonto} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="data" className="block text-sm font-semibold yt-label mb-1">
                    {t('formularioPonto.date')} <span className="text-red-500">*</span>
                  </label>
                  <input type="date" id="data" name="data" value={dadosFormulario.data} onChange={aoAlterarCampoFormularioPonto} max={obterTextoDataLocal()} className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm" required />
                </div>
                <div>
                  <label htmlFor="observacao" className="block text-sm font-semibold yt-label mb-1">
                    {t('formularioPonto.observation')}
                  </label>
                  <input type="text" id="observacao" name="observacao" value={dadosFormulario.observacao} onChange={aoAlterarCampoFormularioPonto} placeholder={t('formularioPonto.observationPlaceholder')} className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm" />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4" />
                  {t('formularioPonto.shift1')} <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="entrada1" className="block text-xs font-medium yt-label mb-1">
                      {t('formularioPonto.entry')} <span className="text-red-500">*</span>
                    </label>
                    <input type="time" id="entrada1" name="entrada1" value={dadosFormulario.entrada1} onChange={aoAlterarCampoFormularioPonto} placeholder="HH:MM" className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="saida1" className="block text-xs font-medium yt-label mb-1">
                      {t('formularioPonto.exit')}
                    </label>
                    <input type="time" id="saida1" name="saida1" value={dadosFormulario.saida1} onChange={aoAlterarCampoFormularioPonto} placeholder="HH:MM" className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2 text-sm">
                  <FiClock className="w-4 h-4" />
                  {t('formularioPonto.shift2')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="entrada2" className="block text-xs font-medium yt-label mb-1">
                      {t('formularioPonto.entry')}
                    </label>
                    <input type="time" id="entrada2" name="entrada2" value={dadosFormulario.entrada2} onChange={aoAlterarCampoFormularioPonto} placeholder="HH:MM" className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm text-sm" />
                  </div>
                  <div>
                    <label htmlFor="saida2" className="block text-xs font-medium yt-label mb-1">
                      {t('formularioPonto.exit')}
                    </label>
                    <input type="time" id="saida2" name="saida2" value={dadosFormulario.saida2} onChange={aoAlterarCampoFormularioPonto} placeholder="HH:MM" className="w-full px-3 py-2 border rounded-lg yt-field focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2 text-sm">
                  <FiCheckCircle className="w-4 h-4" />
                  {t('formularioPonto.summary')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800/80 rounded-lg p-2 shadow-sm border border-blue-100 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{t('formularioPonto.lunchBreak')}</span>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {calcularPausaAlmoco()} min
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/80 rounded-lg p-2 shadow-sm border border-blue-100 dark:border-gray-700">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{t('formularioPonto.totalWorked')}</span>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-0.5">
                      {calcularTotalTrabalhado()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-800">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t('formularioPonto.shift1')}:</span>
                      <span className="text-blue-700 dark:text-blue-300">
                        {dadosFormulario.entrada1 && dadosFormulario.saida1 ? `${dadosFormulario.entrada1} - ${dadosFormulario.saida1}` : t('formularioPonto.notDefined')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{t('formularioPonto.shift2')}:</span>
                      <span className="text-green-700 dark:text-green-300">
                        {dadosFormulario.entrada2 && dadosFormulario.saida2 ? `${dadosFormulario.entrada2} - ${dadosFormulario.saida2}` : t('formularioPonto.notDefined')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {erro && <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{erro}</span>
                </div>}

              {sucesso && <div className="bg-green-50 dark:bg-green-950/40 border-l-4 border-green-500 text-green-700 dark:text-green-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{sucesso}</span>
                </div>}

              <div className="flex flex-col-reverse md:flex-row gap-2 pt-2">
                <button type="button" onClick={() => navigate('/')} className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-sm">
                  <FiX className="w-4 h-4" />
                  {t('formularioPonto.cancel')}
                </button>
                <button type="submit" disabled={enviandoFormularioPonto || !usuarioAtual} className="flex-1 px-4 py-2.5 bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-700 hover:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                  {enviandoFormularioPonto ? <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </> : <>
                      {t('formularioPonto.register')}
                    </>}
                </button>
              </div>
            </form>
          </div>
        </div>
    </MainLayout>;
}
export default FormularioPonto;
