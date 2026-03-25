import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ConfigService from '../services/ConfigService';
import ConfiguracoesSkeleton from '../components/ui/ConfiguracoesSkeleton';
import CacheService from '../services/CacheService';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { FiMail, FiBell, FiClock, FiBarChart2, FiSave, FiRotateCcw } from 'react-icons/fi';
import { MdTranslate, MdLightMode } from 'react-icons/md';
const defaultConfig = {
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
function readConfigCacheSync() {
  try {
    const uid = sessionStorage.getItem('currentUserId');
    if (!uid) return null;
    return CacheService.get('configuracoes', uid);
  } catch (e) {
    return null;
  }
}
function Configuracoes() {
  const {
    t
  } = useLanguage();
  const { theme, setTheme } = useTheme();
  const cachedOnMount = readConfigCacheSync();
  const initialConfig = cachedOnMount ? {
    ...defaultConfig,
    ...cachedOnMount,
    hora_entrada_padrao: cachedOnMount.hora_entrada_padrao?.substring(0, 5) || defaultConfig.hora_entrada_padrao,
    hora_saida_padrao: cachedOnMount.hora_saida_padrao?.substring(0, 5) || defaultConfig.hora_saida_padrao
  } : defaultConfig;
  const [config, setConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(!cachedOnMount);
  const [showSkeleton, setShowSkeleton] = useState(!cachedOnMount);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showConfirmModal]);
  useEffect(() => {
    carregarConfiguracoes();
  }, []);
  const getCurrentUserId = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    return user?.id;
  };
  const carregarConfiguracoes = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      showToastMessage('Erro ao carregar usuário', 'error');
      setIsLoading(false);
      return;
    }
    const cachedConfig = CacheService.get('configuracoes', userId);
    if (cachedConfig) {
      setConfig(cachedConfig);
      setIsLoading(false);
      setShowSkeleton(false);
      carregarConfiguracoesFromDB(userId, true);
      return;
    }
    setIsLoading(true);
    setShowSkeleton(true);
    await carregarConfiguracoesFromDB(userId, false);
  };
  const carregarConfiguracoesFromDB = async (userId, isBackgroundUpdate = false) => {
    const result = await ConfigService.buscarConfiguracoes(userId);
    if (result.success && result.data) {
      const configData = {
        ...result.data,
        hora_entrada_padrao: result.data.hora_entrada_padrao?.substring(0, 5) || '09:00',
        hora_saida_padrao: result.data.hora_saida_padrao?.substring(0, 5) || '18:00'
      };
      setConfig(configData);
      CacheService.set('configuracoes', configData, userId, 10 * 60 * 1000);
    }
    if (!isBackgroundUpdate) {
      setIsLoading(false);
      setShowSkeleton(false);
    }
  };
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSalvar = async () => {
    setIsSaving(true);
    const userId = await getCurrentUserId();
    if (!userId) {
      showToastMessage('Erro ao salvar: usuário não encontrado', 'error');
      setIsSaving(false);
      return;
    }
    const configParaSalvar = {
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
    const result = await ConfigService.atualizarConfiguracoes(userId, configParaSalvar);
    if (result.success) {
      showToastMessage('Configurações salvas com sucesso!', 'success');
      CacheService.remove('configuracoes', userId);
    } else {
      showToastMessage('Erro ao salvar configurações', 'error');
    }
    setIsSaving(false);
  };
  const handleRestaurar = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    const userId = await getCurrentUserId();
    if (!userId) {
      showToastMessage('Erro: usuário não encontrado', 'error');
      setIsSaving(false);
      return;
    }
    const result = await ConfigService.restaurarPadroes(userId);
    if (result.success) {
      CacheService.remove('configuracoes', userId);
      await carregarConfiguracoes();
      setTheme('light');
      showToastMessage('✅ Configurações restauradas para os padrões', 'success');
    } else {
      showToastMessage('❌ Erro ao restaurar configurações', 'error');
    }
    setIsSaving(false);
  };
  if (showSkeleton && isLoading) {
    return <MainLayout title="Configurações" subtitle="Personalize suas preferências">
        <ConfiguracoesSkeleton />
      </MainLayout>;
  }
  return <MainLayout title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="max-w-4xl mx-auto">
        <div className="yt-card shadow-md p-4 sm:p-6 lg:p-8">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FiBell className="w-5 h-5" />
                {t('settings.notifications')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiMail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.emailReports')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('settings.emailReportsDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.email_relatorios} onChange={e => handleChange('email_relatorios', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiClock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.reminderRecord')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('settings.reminderRecordDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.lembrete_registro} onChange={e => handleChange('lembrete_registro', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                {t('settings.workSchedule')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('settings.startTime')}
                  </label>
                  <input type="time" value={config.hora_entrada_padrao} onChange={e => handleChange('hora_entrada_padrao', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('settings.endTime')}
                  </label>
                  <input type="time" value={config.hora_saida_padrao} onChange={e => handleChange('hora_saida_padrao', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('settings.weeklyHours')}
                  </label>
                  <input type="number" value={config.horas_semanais} onChange={e => handleChange('horas_semanais', parseInt(e.target.value))} min="1" max="60" className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('settings.timezone')}
                  </label>
                  <select value={config.fuso_horario} onChange={e => handleChange('fuso_horario', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2">
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
                {t('settings.reports')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{t('settings.includeCharts')}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('settings.includeChartsDesc')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={config.incluir_graficos_pdf} onChange={e => handleChange('incluir_graficos_pdf', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MdLightMode className="w-5 h-5" />
                {t('settings.appearance')}
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">{t('settings.themePreference')}</label>
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2"
                  >
                    <option value="light">{t('theme.light')}</option>
                    <option value="dark">{t('theme.dark')}</option>
                    <option value="system">{t('theme.system')}</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('settings.themePreferenceDesc')}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MdTranslate className="w-5 h-5" />
                {t('settings.language')}
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium yt-label mb-2">
                    {t('settings.interfaceLanguage')}
                  </label>
                  <select value={config.language} onChange={e => handleChange('language', e.target.value)} className="block w-full border rounded-md shadow-sm yt-field focus:ring-blue-500 focus:border-blue-500 p-2">
                    <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                    <option value="en-US">🇺🇸 English (United States)</option>
                    <option value="es-ES">🇪🇸 Español (España)</option>
                    <option value="fr-FR">🇫🇷 Français (France)</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('settings.languageDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center">
            <button type="button" onClick={handleSalvar} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
              {isSaving ? <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('settings.saving')}
                </> : <>
                  {t('common.save')}
                </>}
            </button>
            <button type="button" onClick={() => setShowConfirmModal(true)} disabled={isSaving} className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-gray-700 dark:text-gray-100 font-bold py-3 px-6 rounded-lg transition-colors text-center">
              {t('settings.restoreDefaults')}
            </button>
          </div>
        </div>
      </div>

      {showToast && <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
          <div className="flex items-center gap-2">
            <span>{toastMessage}</span>
            <button onClick={() => setShowToast(false)} className="ml-2 text-white hover:text-gray-200">
              ✕
            </button>
          </div>
        </div>}

      {showConfirmModal && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="yt-modal-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Confirmar Restauração
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tem certeza que deseja restaurar as configurações padrão?
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleRestaurar} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Ok
              </button>
            </div>
          </div>
        </div>}
    </MainLayout>;
}
export default Configuracoes;
