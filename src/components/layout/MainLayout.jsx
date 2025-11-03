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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                >
                  ☰
                </button>
                {title && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-gray-500">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications and User Profile */}
              <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile Header */}
                {profile && (
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                    onClick={() => navigate('/perfil')}
                  >
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{profile.nome}</p>
                      <p className="text-xs text-gray-500">{profile.cargo || 'Cargo não definido'}</p>
                    </div>
                    <div className="relative">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.nome}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-600"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                          {(() => {
                            if (!profile.nome) return 'YT'
                            const parts = profile.nome.split(' ')
                            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
