import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../ui/NotificationBell';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const quickActionsRef = useRef(null);
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useSecureCache();

  useEffect(() => {
    const cachedProfile = sessionStorage.getItem('userProfile');
    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch (e) {}
    }
    carregarPerfil();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async languageCode => {
    setLanguageDropdownOpen(false);
    await changeLanguage(languageCode);
  };

  const languages = [
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' }
  ];

  const carregarPerfil = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          sessionStorage.setItem('userProfile', JSON.stringify(data));
        }
      }
    } catch (error) {}
  };

  const IconeTemaAtual =
    theme === 'dark' ? MdDarkMode : theme === 'system' ? MdBrightnessAuto : MdLightMode;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col lg:ml-64">
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shrink-0"
                >
                  ☰
                </button>
                {title && (
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
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

              <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <div ref={quickActionsRef} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setToolbarExpanded(v => !v);
                      setLanguageDropdownOpen(false);
                      setThemeMenuOpen(false);
                    }}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title={toolbarExpanded ? t('header.collapseQuickActions') : t('header.expandQuickActions')}
                    aria-expanded={toolbarExpanded}
                    aria-label={toolbarExpanded ? t('header.collapseQuickActions') : t('header.expandQuickActions')}
                  >
                    {toolbarExpanded ? (
                      <MdExpandLess className="w-6 h-6" />
                    ) : (
                      <MdExpandMore className="w-6 h-6" />
                    )}
                  </button>

                  {toolbarExpanded && (
                    <div className="absolute top-full left-0 mt-1 z-50 flex flex-col gap-0.5 p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl animate-fadeIn min-w-[12rem]">
                      <NotificationBell showMenuLabel />

                      <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setLanguageDropdownOpen(o => !o);
                            setThemeMenuOpen(false);
                          }}
                          className="flex w-full min-h-9 min-w-[11rem] items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                          aria-label={t('header.languageLabel')}
                          aria-expanded={languageDropdownOpen}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:block">
                            <MdTranslate className="h-6 w-6" />
                          </span>
                          <span className="min-w-0 flex-1 truncate leading-none">{t('header.languageShort')}</span>
                        </button>

                        {languageDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[60] animate-fadeIn">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                {t('header.languageLabel')}
                              </p>
                            </div>
                            {languages.map(language => (
                              <button
                                key={language.code}
                                type="button"
                                onClick={() => handleLanguageChange(language.code)}
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
                            setThemeMenuOpen(o => !o);
                            setLanguageDropdownOpen(false);
                          }}
                          className="flex w-full min-h-9 min-w-[11rem] items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                          aria-label={t('theme.title')}
                          aria-expanded={themeMenuOpen}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:block">
                            <IconeTemaAtual className="h-6 w-6" />
                          </span>
                          <span className="min-w-0 flex-1 truncate leading-none">{t('theme.title')}</span>
                        </button>

                        {themeMenuOpen && (
                          <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[60] animate-fadeIn">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                {t('theme.title')}
                              </p>
                            </div>
                            {[
                              { id: 'light', label: t('theme.light'), Icon: MdLightMode },
                              { id: 'dark', label: t('theme.dark'), Icon: MdDarkMode },
                              { id: 'system', label: t('theme.system'), Icon: MdBrightnessAuto }
                            ].map(({ id, label, Icon }) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  setTheme(id);
                                  setThemeMenuOpen(false);
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

                {profile && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/perfil')}
                      className="min-w-0 flex-1 text-left rounded-lg py-1 px-1 sm:px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {profile.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {profile.cargo || 'Cargo não definido'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/perfil')}
                      className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      aria-label={t('profile.title')}
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-600 dark:border-blue-500"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
                          {(() => {
                            if (!profile.nome) return 'YT';
                            const parts = profile.nome.split(' ');
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
