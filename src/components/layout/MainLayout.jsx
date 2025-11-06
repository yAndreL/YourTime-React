import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from '../ui/NotificationBell'
import { supabase } from '../../config/supabase'
import { useSecureCache } from '../../hooks/useSecureCache'

function MainLayout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()
  
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
