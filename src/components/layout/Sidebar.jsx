import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { 
  FiHome, 
  FiFileText, 
  FiCalendar, 
  FiTarget, 
  FiSettings, 
  FiUserCheck,
  FiUser,
  FiX,
  FiLogOut
} from 'react-icons/fi'

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Carregar do cache IMEDIATAMENTE (sem delay)
  const getCachedRole = () => {
    const cached = sessionStorage.getItem('userRole')
    return cached === 'admin'
  }
  
  const [isAdmin, setIsAdmin] = useState(getCachedRole())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsAdmin(false)
          sessionStorage.removeItem('userRole')
          return
        }

        // Buscar do banco em background (não bloqueia a UI)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (error) {

          setIsAdmin(false)
          sessionStorage.removeItem('userRole')
          return
        }

        const adminStatus = profile?.role === 'admin'
        
        // Salvar no cache para próxima vez
        if (adminStatus) {
          sessionStorage.setItem('userRole', 'admin')
        } else {
          sessionStorage.setItem('userRole', 'user')
        }
        
        // Atualizar estado apenas se mudou
        if (isAdmin !== adminStatus) {
          setIsAdmin(adminStatus)
        }
      } catch (error) {

        setIsAdmin(false)
        sessionStorage.removeItem('userRole')
      }
    }
    
    // Executar verificação em background (não bloqueia renderização)
    checkAdminRole()
    
  }, []) // Executar apenas uma vez ao montar

  const isActive = (path) => {
    return location.pathname === path
  }

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/formulario-ponto', icon: FiFileText, label: 'Registrar Ponto' },
    { path: '/painel-admin', icon: FiUserCheck, label: 'Painel Administrativo', adminOnly: true },
    { path: '/historico', icon: FiCalendar, label: 'Histórico' },
    { path: '/projeto', icon: FiTarget, label: 'Projetos' }
  ]

  const settingsItems = [
    { path: '/perfil', icon: FiUser, label: 'Perfil' },
    { path: '/configuracoes', icon: FiSettings, label: 'Configurações' }
  ]

  const handleLogout = async () => {
    try {
      // ✅ LIMPAR TODO O CACHE antes de fazer logout
      sessionStorage.clear()
      localStorage.clear()
      
      // Limpar cache do navegador (service workers, cache API)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      // Fazer logout do Supabase
      await supabase.auth.signOut()
      
      // Redirecionar para login
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, redireciona para login
      navigate('/login')
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:fixed flex flex-col`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">YourTime</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto mt-6 px-6 pb-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              // Ocultar itens admin para não-admin
              if (item.adminOnly && !isAdmin) return null
              
              const Icon = item.icon
              const active = isActive(item.path)
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    active 
                      ? 'text-white bg-blue-600 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 w-5 h-5" /> {item.label}
                </Link>
              )
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
              Configurações
            </div>
            <div className="space-y-2">
              {settingsItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                
                return (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      active 
                        ? 'text-white bg-blue-600 shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="mr-3 w-5 h-5" /> {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Botão de Logout */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut className="mr-3 w-5 h-5" /> Sair
            </button>
          </div>
        </nav>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  )
}

export default Sidebar
