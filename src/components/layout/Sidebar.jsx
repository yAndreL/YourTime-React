import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { FiHome, FiFileText, FiCalendar, FiTarget, FiSettings, FiUserCheck, FiUser, FiX, FiLogOut, FiClock, FiAlertTriangle, FiClipboard, FiUserMinus } from 'react-icons/fi';
function Sidebar({
  sidebarOpen,
  setSidebarOpen
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const getCachedRole = () => {
    const cached = sessionStorage.getItem('userRole');
    return cached === 'admin';
  };
  const [isAdmin, setIsAdmin] = useState(getCachedRole());
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          setIsAdmin(false);
          sessionStorage.removeItem('userRole');
          return;
        }
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (error) {
          setIsAdmin(false);
          sessionStorage.removeItem('userRole');
          return;
        }
        const adminStatus = profile?.role === 'admin';
        if (adminStatus) {
          sessionStorage.setItem('userRole', 'admin');
        } else {
          sessionStorage.setItem('userRole', 'user');
        }
        if (isAdmin !== adminStatus) {
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        setIsAdmin(false);
        sessionStorage.removeItem('userRole');
      }
    };
    checkAdminRole();
  }, []);
  const isActive = path => {
    return location.pathname === path;
  };
  const menuItems = [{
    path: '/',
    icon: FiHome,
    label: t('menu.dashboard')
  }, {
    path: '/batida-ponto',
    icon: FiClock,
    label: t('menu.timeRecord')
  }, {
    path: '/painel-admin',
    icon: FiUserCheck,
    label: t('menu.adminPanel'),
    adminOnly: true
  }, {
    path: '/irregularidades',
    icon: FiAlertTriangle,
    label: t('menu.irregularidades'),
    adminOnly: true
  }, {
    path: '/historico',
    icon: FiCalendar,
    label: t('menu.history')
  }, {
    path: '/espelho-ponto',
    icon: FiClipboard,
    label: t('menu.espelhoPonto')
  }, {
    path: '/ausencias',
    icon: FiUserMinus,
    label: t('menu.ausencias')
  }, {
    path: '/projeto',
    icon: FiTarget,
    label: t('menu.projects')
  }];
  const settingsItems = [{
    path: '/perfil',
    icon: FiUser,
    label: t('menu.profile')
  }, {
    path: '/configuracoes',
    icon: FiSettings,
    label: t('menu.settings')
  }];
  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      navigate('/login');
    }
  };
  return <>
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform lg:translate-x-0 lg:fixed flex flex-col border-r border-gray-200 dark:border-gray-800`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">YourTime</h1>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto mt-6 px-6 pb-6">
          <div className="space-y-2">
            {menuItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const active = isActive(item.path);
            return <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active ? 'text-white bg-blue-600 dark:bg-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <Icon className="mr-3 w-5 h-5" /> {item.label}
                </Link>;
          })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-3">
              {t('menu.personal')}
            </div>
            <div className="space-y-2">
              {settingsItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active ? 'text-white bg-blue-600 dark:bg-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <Icon className="mr-3 w-5 h-5" /> {item.label}
                  </Link>;
            })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors">
              <FiLogOut className="mr-3 w-5 h-5" /> {t('menu.logout')}
            </button>
          </div>
        </nav>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </>;
}
export default Sidebar;
