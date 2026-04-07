import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../ui/NotificationBell';
import StatusWidget from '../ui/StatusWidget';
import { supabase } from '../../config/supabase';
import { useSecureCache } from '../../hooks/useSecureCache';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import {
  MdTranslate,
  MdExpandMore,
  MdExpandLess,
  MdLightMode,
  MdDarkMode,
  MdBrightnessAuto
} from 'react-icons/md';

function MainLayout({ children, title, subtitle }) {
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [barraAcoesRapidasExpandida, setBarraAcoesRapidasExpandida] = useState(false);
  const [menuIdiomaAberto, setMenuIdiomaAberto] = useState(false);
  const [menuTemaAberto, setMenuTemaAberto] = useState(false);
  const refAcoesRapidas = useRef(null);
  const navigate = useNavigate();
  const { currentLanguage, alterarIdioma, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useSecureCache();

  useEffect(() => {
    const perfilEmCache = sessionStorage.getItem('userProfile');
    if (perfilEmCache) {
      try {
        setPerfilUsuario(JSON.parse(perfilEmCache));
      } catch (e) {}
    }
    carregarPerfil();
  }, []);

  useEffect(() => {
    function aoDetectarCliqueForaMenuCabecalho(event) {
      if (refAcoesRapidas.current && !refAcoesRapidas.current.contains(event.target)) {
        setMenuIdiomaAberto(false);
        setMenuTemaAberto(false);
      }
    }
    document.addEventListener('mousedown', aoDetectarCliqueForaMenuCabecalho);
    return () => document.removeEventListener('mousedown', aoDetectarCliqueForaMenuCabecalho);
  }, []);

  const aoAlterarIdiomaPreferido = async codigoIdioma => {
    setMenuIdiomaAberto(false);
    await alterarIdioma(codigoIdioma);
  };

  const idiomas = [
    { code: 'pt-BR', name: 'Português' },
    { code: 'en-US', name: 'English' },
    { code: 'es-ES', name: 'Español' },
    { code: 'fr-FR', name: 'Français' }
  ];

  const carregarPerfil = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setPerfilUsuario(data);
          sessionStorage.setItem('userProfile', JSON.stringify(data));
        }
      }
    } catch (error) {}
  };

  const IconeTemaAtual =
    theme === 'dark' ? MdDarkMode : theme === 'system' ? MdBrightnessAuto : MdLightMode;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors">
      <Sidebar menuLateralAberto={menuLateralAberto} setMenuLateralAberto={setMenuLateralAberto} />

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0 overflow-x-hidden">
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setMenuLateralAberto(true)}
                  className="lg:hidden p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shrink-0"
                >
                  ☰
                </button>
                {title && (
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
                <StatusWidget />
                <div ref={refAcoesRapidas} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBarraAcoesRapidasExpandida(v => !v);
                      setMenuIdiomaAberto(false);
                      setMenuTemaAberto(false);
                    }}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title={barraAcoesRapidasExpandida ? t('cabecalho.collapseQuickActions') : t('cabecalho.expandQuickActions')}
                    aria-expanded={barraAcoesRapidasExpandida}
                    aria-label={barraAcoesRapidasExpandida ? t('cabecalho.collapseQuickActions') : t('cabecalho.expandQuickActions')}
                  >
                    {barraAcoesRapidasExpandida ? (
                      <MdExpandLess className="w-6 h-6" />
                    ) : (
                      <MdExpandMore className="w-6 h-6" />
                    )}
                  </button>

                  {barraAcoesRapidasExpandida && (
                    <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 z-50 flex flex-col gap-0.5 p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl animate-fadeIn min-w-[12rem]">
                      <NotificationBell showMenuLabel />

                      <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuIdiomaAberto(o => !o);
                            setMenuTemaAberto(false);
                          }}
                          className="flex w-full min-h-9 min-w-[11rem] items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                          aria-label={t('cabecalho.languageLabel')}
                          aria-expanded={menuIdiomaAberto}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:block">
                            <MdTranslate className="h-6 w-6" />
                          </span>
                          <span className="min-w-0 flex-1 truncate leading-none">{t('cabecalho.languageShort')}</span>
                        </button>

                        {menuIdiomaAberto && (
                          <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[60] animate-fadeIn">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                {t('cabecalho.languageLabel')}
                              </p>
                            </div>
                            {idiomas.map(language => (
                              <button
                                key={language.code}
                                type="button"
                                onClick={() => aoAlterarIdiomaPreferido(language.code)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                                  currentLanguage === language.code
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                <span className="text-lg">{language.flag}</span>
                                <span>{language.name}</span>
                                {currentLanguage === language.code && (
                                  <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuTemaAberto(o => !o);
                            setMenuIdiomaAberto(false);
                          }}
                          className="flex w-full min-h-9 min-w-[11rem] items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                          aria-label={t('tema.title')}
                          aria-expanded={menuTemaAberto}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:block">
                            <IconeTemaAtual className="h-6 w-6" />
                          </span>
                          <span className="min-w-0 flex-1 truncate leading-none">{t('tema.title')}</span>
                        </button>

                        {menuTemaAberto && (
                          <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[60] animate-fadeIn">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                {t('tema.title')}
                              </p>
                            </div>
                            {[
                              { id: 'light', label: t('tema.light'), Icon: MdLightMode },
                              { id: 'dark', label: t('tema.dark'), Icon: MdDarkMode },
                              { id: 'system', label: t('tema.system'), Icon: MdBrightnessAuto }
                            ].map(({ id, label, Icon }) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  setTheme(id);
                                  setMenuTemaAberto(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                                  theme === id
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-700 dark:text-gray-200'
                                }`}
                              >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span>{label}</span>
                                {theme === id && <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {perfilUsuario && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/perfil')}
                      className="hidden sm:block min-w-0 text-left rounded-lg py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px] md:max-w-[180px]">
                        {perfilUsuario.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] md:max-w-[180px]">
                        {perfilUsuario.cargo || 'Cargo não definido'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/perfil')}
                      className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      aria-label={t('perfil.title')}
                    >
                      {perfilUsuario.avatar_url ? (
                        <img
                          src={perfilUsuario.avatar_url}
                          alt=""
                          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-600 dark:border-blue-500"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-base shadow-md">
                          {(() => {
                            if (!perfilUsuario.nome) return 'YT';
                            const parts = perfilUsuario.nome.split(' ');
                            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          })()}
                        </div>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 transition-colors">
          <div className="p-3 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
