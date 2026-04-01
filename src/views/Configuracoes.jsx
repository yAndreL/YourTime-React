import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ConfigService from '../services/ConfigService';
import ConfiguracoesSkeleton from '../components/ui/ConfiguracoesSkeleton';
import CacheService from '../services/CacheService';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { FiMail, FiBell, FiClock, FiBarChart2, FiSave, FiRotateCcw } from 'react-icons/fi';
import { MdTranslate, MdLightMode } from 'react-icons/md';
const configuracaoPadraoUsuario = {
  email_relatorios: true,
  lembrete_registro: true,
  hora_entrada_padrao: '09:00',
  hora_saida_padrao: '18:00',
  horas_semanais: 40,
  fuso_horario: 'America/Sao_Paulo',
  formato_exportacao: 'PDF',
  incluir_graficos_pdf: true,
  language: 'pt-BR'
};
function lerConfiguracaoEmCacheSincrono() {
  try {
    const idUsuario = sessionStorage.getItem('currentUserId');
    if (!idUsuario) return null;
    return CacheService.get('configuracoes', idUsuario);
  } catch (e) {
    return null;
  }
}
function Configuracoes() {
  const {
    t
  } = useLanguage();
  const { recarregarFusoHorario } = useFusoHorario();
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const configuracaoEmCacheNaMontagem = lerConfiguracaoEmCacheSincrono();
  const configuracaoInicialFormulario = configuracaoEmCacheNaMontagem ? {
    ...configuracaoPadraoUsuario,
    ...configuracaoEmCacheNaMontagem,
    hora_entrada_padrao: configuracaoEmCacheNaMontagem.hora_entrada_padrao?.substring(0, 5) || configuracaoPadraoUsuario.hora_entrada_padrao,
    hora_saida_padrao: configuracaoEmCacheNaMontagem.hora_saida_padrao?.substring(0, 5) || configuracaoPadraoUsuario.hora_saida_padrao
  } : configuracaoPadraoUsuario;
  const [config, setConfig] = useState(configuracaoInicialFormulario);
  const [carregandoConfiguracoes, setCarregandoConfiguracoes] = useState(!configuracaoEmCacheNaMontagem);
  const [exibirSkeletonConfiguracoes, setExibirSkeletonConfiguracoes] = useState(!configuracaoEmCacheNaMontagem);
  const [salvandoConfiguracoes, setSalvandoConfiguracoes] = useState(false);
  const [modalConfirmacaoRestaurarVisivel, setModalConfirmacaoRestaurarVisivel] = useState(false);
  useEffect(() => {
    if (modalConfirmacaoRestaurarVisivel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalConfirmacaoRestaurarVisivel]);
  useEffect(() => {
    carregarConfiguracoes();
  }, []);
  const obterIdUsuarioAtual = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    return user?.id;
  };
  const carregarConfiguracoes = async () => {
    const idUsuario = await obterIdUsuarioAtual();
    if (!idUsuario) {
      showError('Erro ao carregar usuário');
      setCarregandoConfiguracoes(false);
      return;
    }
    const configuracaoEmCache = CacheService.get('configuracoes', idUsuario);
    if (configuracaoEmCache) {
      setConfig(configuracaoEmCache);
      setCarregandoConfiguracoes(false);
      setExibirSkeletonConfiguracoes(false);
      carregarConfiguracoesFromDB(idUsuario, true);
      return;
    }
    setCarregandoConfiguracoes(true);
    setExibirSkeletonConfiguracoes(true);
    await carregarConfiguracoesFromDB(idUsuario, false);
  };
  const carregarConfiguracoesFromDB = async (idUsuario, atualizacaoEmSegundoPlano = false) => {
    const resultado = await ConfigService.buscarConfiguracoes(idUsuario);
    if (resultado.success && resultado.data) {
      const dadosConfiguracao = {
        ...resultado.data,
        hora_entrada_padrao: resultado.data.hora_entrada_padrao?.substring(0, 5) || '09:00',
        hora_saida_padrao: resultado.data.hora_saida_padrao?.substring(0, 5) || '18:00'
      };
      setConfig(dadosConfiguracao);
      CacheService.set('configuracoes', dadosConfiguracao, idUsuario, 10 * 60 * 1000);
    }
    if (!atualizacaoEmSegundoPlano) {
      setCarregandoConfiguracoes(false);
      setExibirSkeletonConfiguracoes(false);
    }
  };
  const atualizarCampoConfiguracao = (campo, valor) => {
    setConfig(prev => ({
      ...prev,
      [campo]: valor
    }));
  };
  const processarSalvarConfiguracoes = async () => {
    setSalvandoConfiguracoes(true);
    const idUsuario = await obterIdUsuarioAtual();
    if (!idUsuario) {
      showError('Erro ao salvar: usuário não encontrado');
      setSalvandoConfiguracoes(false);
      return;
    }
    const payloadConfiguracaoParaPersistir = {
      email_relatorios: config.email_relatorios,
      lembrete_registro: config.lembrete_registro,
      hora_entrada_padrao: `${config.hora_entrada_padrao}:00`,
      hora_saida_padrao: `${config.hora_saida_padrao}:00`,
      horas_semanais: config.horas_semanais,
      fuso_horario: config.fuso_horario,
      formato_exportacao: config.formato_exportacao,
      incluir_graficos_pdf: config.incluir_graficos_pdf,
      language: config.language,
      preferencia_tema: theme
    };
    const resultadoSalvar = await ConfigService.atualizarConfiguracoes(idUsuario, payloadConfiguracaoParaPersistir);
    if (resultadoSalvar.success) {
      showSuccess('Configurações salvas com sucesso!');
      CacheService.remove('configuracoes', idUsuario);
      await recarregarFusoHorario();
    } else {
      showError('Erro ao salvar configurações');
    }
    setSalvandoConfiguracoes(false);
  };
  const processarRestaurarConfiguracoesPadrao = async () => {
    setModalConfirmacaoRestaurarVisivel(false);
    setSalvandoConfiguracoes(true);
    const idUsuario = await obterIdUsuarioAtual();
    if (!idUsuario) {
      showError('Erro: usuário não encontrado');
      setSalvandoConfiguracoes(false);
      return;
    }
    const resultadoRestaurar = await ConfigService.restaurarPadroes(idUsuario);
    if (resultadoRestaurar.success) {
      CacheService.remove('configuracoes', idUsuario);
      await carregarConfiguracoes();
      await recarregarFusoHorario();
      setTheme('light');
      showSuccess('Configurações restauradas para os padrões');
    } else {
      showError('Erro ao restaurar configurações');
    }
    setSalvandoConfiguracoes(false);
  };
  if (exibirSkeletonConfiguracoes && carregandoConfiguracoes) {
    return <MainLayout title="Configurações" subtitle="Personalize suas preferências">
        <ConfiguracoesSkeleton />
      </MainLayout>;
  }
  return <MainLayout title={t('configuracoes.title')} subtitle={t('configuracoes.subtitle')}>
      <div className="max-w-4xl mx-auto">
        <div className="yt-card shadow-md p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FiBell className="w-5 h-5" />
                {t('configuracoes.notifications')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiMail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('configuracoes.emailReports')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('configuracoes.emailReportsDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.email_relatorios} onChange={e => atualizarCampoConfiguracao('email_relatorios', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiClock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('configuracoes.reminderRecord')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('configuracoes.reminderRecordDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.lembrete_registro} onChange={e => atualizarCampoConfiguracao('lembrete_registro', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                {t('configuracoes.workSchedule')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('configuracoes.startTime')}
                  </label>
                  <input type="time" value={config.hora_entrada_padrao} onChange={e => atualizarCampoConfiguracao('hora_entrada_padrao', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('configuracoes.endTime')}
                  </label>
                  <input type="time" value={config.hora_saida_padrao} onChange={e => atualizarCampoConfiguracao('hora_saida_padrao', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('configuracoes.weeklyHours')}
                  </label>
                  <input type="number" value={config.horas_semanais} onChange={e => atualizarCampoConfiguracao('horas_semanais', parseInt(e.target.value))} min="1" max="60" className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('configuracoes.timezone')}
                  </label>
                  <select value={config.fuso_horario} onChange={e => atualizarCampoConfiguracao('fuso_horario', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2">
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5" />
                {t('configuracoes.reports')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('configuracoes.includeCharts')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('configuracoes.includeChartsDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.incluir_graficos_pdf} onChange={e => atualizarCampoConfiguracao('incluir_graficos_pdf', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MdLightMode className="w-5 h-5" />
                {t('configuracoes.appearance')}
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">{t('configuracoes.themePreference')}</label>
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2"
                  >
                    <option value="light">{t('tema.light')}</option>
                    <option value="dark">{t('tema.dark')}</option>
                    <option value="system">{t('tema.system')}</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('configuracoes.themePreferenceDesc')}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MdTranslate className="w-5 h-5" />
                {t('configuracoes.language')}
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('configuracoes.interfaceLanguage')}
                  </label>
                  <select value={config.language} onChange={e => atualizarCampoConfiguracao('language', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2">
                    <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                    <option value="en-US">🇺🇸 English (United States)</option>
                    <option value="es-ES">🇪🇸 Español (España)</option>
                    <option value="fr-FR">🇫🇷 Français (France)</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('configuracoes.languageDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center">
            <button type="button" onClick={processarSalvarConfiguracoes} disabled={salvandoConfiguracoes} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
              {salvandoConfiguracoes ? <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('configuracoes.saving')}
                </> : <>
                  {t('comum.save')}
                </>}
            </button>
            <button type="button" onClick={() => setModalConfirmacaoRestaurarVisivel(true)} disabled={salvandoConfiguracoes} className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-gray-700 dark:text-gray-100 font-bold py-3 px-6 rounded-lg transition-colors text-center">
              {t('configuracoes.restoreDefaults')}
            </button>
          </div>
        </div>
      </div>

      {modalConfirmacaoRestaurarVisivel && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="yt-modal-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Confirmar Restauração
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja restaurar as configurações padrão?
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setModalConfirmacaoRestaurarVisivel(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={processarRestaurarConfiguracoesPadrao} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Ok
              </button>
            </div>
          </div>
        </div>}
    </MainLayout>;
}
export default Configuracoes;
