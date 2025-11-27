import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from '../ui/NotificationBell'
import { supabase } from '../../config/supabase'
import { useSecureCache } from '../../hooks/useSecureCache'
import { useLanguage } from '../../hooks/useLanguage.jsx'
import { MdTranslate } from 'react-icons/md'

function MainLayout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const languageRef = useRef(null)
  const navigate = useNavigate()
  const { currentLanguage, changeLanguage, t } = useLanguage()
  
  // Ativa o gerenciamento seguro de cache
  useSecureCache()

  useEffect(() => {
    // Carregar do sessionStorage imediatamente (instantâneo)
    const cachedProfile = sessionStorage.getItem('userProfile')
    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile))
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Atualizar do banco em background
    carregarPerfil()
  }, [])

  // Fechar dropdown de idioma ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = async (languageCode) => {
    setLanguageDropdownOpen(false)
    await changeLanguage(languageCode)
  }

  const languages = [
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' }
  ]

  const carregarPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setProfile(data)
          // Salvar no sessionStorage para próximas navegações
          sessionStorage.setItem('userProfile', JSON.stringify(data))
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                >
                  ☰
                </button>
                {title && (
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications and User Profile */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Language Selector */}
                <div ref={languageRef} className="relative">
                  <button
                    onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
                    aria-label="Selecionar idioma"
                  >
                    <MdTranslate className="w-6 h-6" />
                  </button>

                  {/* Language Dropdown */}
                  {languageDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase">
                          Idioma / Language
                        </p>
                      </div>
                      
                      {languages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => handleLanguageChange(language.code)}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                            currentLanguage === language.code 
                              ? 'bg-blue-50 text-blue-600 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span className="text-lg">{language.flag}</span>
                          <span>{language.name}</span>
                          {currentLanguage === language.code && (
                            <span className="ml-auto text-blue-600">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile Header - Responsivo */}
                {profile && (
                  <div 
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 sm:p-2 transition-colors"
                    onClick={() => navigate('/perfil')}
                  >
                    {/* Nome e Cargo - Oculto em mobile */}
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-semibold text-gray-900">{profile.nome}</p>
                      <p className="text-xs text-gray-500">{profile.cargo || 'Cargo não definido'}</p>
                    </div>
                    
                    {/* Avatar - COMPLETAMENTE OCULTO em mobile (< 640px) */}
                    <div className="relative hidden sm:block">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.nome}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-600"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
                          {(() => {
                            if (!profile.nome) return 'YT'
                            const parts = profile.nome.split(' ')
                            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Nome reduzido apenas em mobile (< 640px) - SEM AVATAR */}
                    <div className="block sm:hidden">
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[70px]">
                        {profile.nome?.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[70px]">
                        {profile.cargo?.substring(0, 10) || 'Usuário'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-3 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
